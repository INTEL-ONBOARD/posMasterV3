/**
 * Authentication Service
 *
 * Handles all authentication business logic including:
 * - User login (local + cloud fallback)
 * - User registration
 * - Session management
 * - Password hashing/verification
 */

const bcrypt = require('bcryptjs');
const { getUserRepository, getSessionRepository, getSyncQueueRepository, getLoginHistoryRepository, getActiveSessionRepository } = require('../repositories/index.cjs');
const UserRepository = require('../repositories/UserRepository.cjs');
const BranchRepository = require('../repositories/BranchRepository.cjs');
const SettingsService = require('./SettingsService.cjs');
const { nowISO } = require('../utils/helpers.cjs');

const SALT_ROUNDS = 10;

// In-memory brute-force tracker (keyed by userId or email for pre-lookup attempts).
// Resets on successful login; survives only for the process lifetime (intentional —
// a full app restart is a reasonable reset for a desktop POS).
const failedAttempts = new Map(); // key → { count, lockedUntil }
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000; // 30 seconds

function _recordFailedAttempt(key) {
    const entry = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
        entry.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    failedAttempts.set(key, entry);
}

function _isLockedOut(key) {
    const entry = failedAttempts.get(key);
    if (!entry) return false;
    if (entry.lockedUntil > Date.now()) return true;
    if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
        // Lockout expired — reset
        failedAttempts.delete(key);
    }
    return false;
}

function _clearFailedAttempts(key) {
    failedAttempts.delete(key);
}

class AuthService {
    constructor() {
        this.userRepo = getUserRepository();
        this.sessionRepo = getSessionRepository();
        this.syncQueueRepo = getSyncQueueRepository();
        this.loginHistoryRepo = getLoginHistoryRepository();
        this.activeSessionRepo = getActiveSessionRepository();
        this.settingsService = new SettingsService();
    }

    /**
     * Login user with email/username and password
     * @param {Object} credentials - Login credentials
     * @param {string} credentials.email - Email or username
     * @param {string} credentials.password - Password
     * @param {Object} options - Additional options
     * @param {string} options.deviceInfo - Device information
     * @returns {Object} Login result
     */
    async login(credentials, options = {}) {
        const { email, password } = credentials;
        const { deviceInfo } = options;

        if (!email || !password) {
            return {
                success: false,
                status: 'error',
                message: 'Email and password are required'
            };
        }

        try {
            // Try to find user locally first
            let user = this.userRepo.findByEmailOrUsername(email);

            if (user) {
                // Brute-force check (keyed by user id so lockout is per-account)
                if (_isLockedOut(user.id)) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Too many failed attempts. Please wait 30 seconds and try again.'
                    };
                }

                // Verify password locally
                const passwordValid = await bcrypt.compare(password, user.password_hash);

                if (!passwordValid) {
                    _recordFailedAttempt(user.id);
                    return {
                        success: false,
                        status: 'error',
                        message: 'Invalid email or password'
                    };
                }

                if (!user.is_active) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Account is deactivated'
                    };
                }

                // Successful auth — clear any failed attempt counter
                _clearFailedAttempts(user.id);

                // SINGLE-DEVICE ENFORCEMENT:
                // Invalidate all existing sessions for this user before creating a new one
                // This ensures only one device can be logged in at a time
                const existingSessions = this.sessionRepo.findActiveByUserId(user.id);
                if (existingSessions.length > 0) {
                    console.log(`[AuthService] User ${user.username} has ${existingSessions.length} active session(s). Invalidating for single-device enforcement.`);

                    // Record forced logout for each existing session
                    for (const existingSession of existingSessions) {
                        try {
                            this.loginHistoryRepo.recordLogout(existingSession.id, 'forced_new_login');
                        } catch (historyError) {
                            console.error('[AuthService] Failed to record forced logout:', historyError.message);
                        }
                    }

                    // Invalidate all sessions for this user
                    const invalidatedCount = this.sessionRepo.invalidateAllForUser(user.id);
                    console.log(`[AuthService] Invalidated ${invalidatedCount} session(s) for user ${user.username}`);

                    // Immediately clear cache for each forced-out session token
                    try {
                        const { invalidateCache } = require('./SessionValidator.cjs');
                        for (const existingSession of existingSessions) {
                            invalidateCache(existingSession.token);
                        }
                    } catch (e) {
                        // SessionValidator not available — harmless, cache will expire normally
                    }
                }

                // Create new session (this will be the only active session)
                const session = this.sessionRepo.create({
                    user_id: user.id,
                    device_info: deviceInfo
                });

                // Update last login
                this.userRepo.updateLastLogin(user.id);

                // Record login history with branch info
                try {
                    // Get branch info if user has a branch_id
                    let branchId = null;
                    let branchName = null;

                    if (user.branch_id) {
                        const branch = BranchRepository.findById(user.branch_id);
                        if (branch) {
                            branchId = branch.id;
                            branchName = branch.name;
                        }
                    }

                    this.loginHistoryRepo.recordLogin({
                        user_id: user.id,
                        session_id: session.id,
                        username: user.username,
                        full_name: user.full_name,
                        device_info: deviceInfo,
                        ip_address: options.ipAddress || null,
                        branch_id: branchId,
                        branch_name: branchName
                    });
                } catch (historyError) {
                    console.error('[AuthService] Failed to record login history:', historyError.message);
                }

                // Track active session for cloud sync (enables cross-device session awareness)
                try {
                    const deviceData = this.settingsService.getDeviceInfo();
                    this.activeSessionRepo.upsertActiveSession({
                        user_id: user.id,
                        device_id: deviceData.device_id,
                        device_name: deviceData.device_name || deviceData.hostname,
                        session_token: session.token
                    });
                    console.log(`[AuthService] Active session recorded for user ${user.username} on device ${deviceData.device_id}`);

                    // Immediately sync active_sessions to cloud (for single-device enforcement)
                    // This ensures other devices get notified ASAP
                    setImmediate(async () => {
                        try {
                            const { getCloudSyncService } = require('./CloudSyncService.cjs');
                            const cloudSync = getCloudSyncService();
                            if (cloudSync.isOnline && cloudSync.mysqlInitialized) {
                                await cloudSync.syncTable('active_sessions');
                                console.log('[AuthService] Synced active_sessions to cloud after login');
                            }
                        } catch (syncError) {
                            console.log('[AuthService] Could not sync active_sessions:', syncError.message);
                        }
                    });
                } catch (activeSessionError) {
                    console.error('[AuthService] Failed to record active session:', activeSessionError.message);
                }

                return {
                    success: true,
                    status: 'success',
                    message: 'Login successful',
                    data: UserRepository.sanitize(user),
                    token: session.token,
                    sessionId: session.id,
                    deviceId: this.settingsService.getDeviceId()
                };
            }

            // User not found locally — use generic message to avoid username enumeration
            return {
                success: false,
                status: 'error',
                message: 'Invalid email or password',
                requiresCloudSync: true
            };

        } catch (error) {
            console.error('[AuthService] Login error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Login failed: ' + error.message
            };
        }
    }

    /**
     * Register a new user locally
     * @param {Object} userData - User registration data
     * @returns {Object} Registration result
     */
    async register(userData) {
        const { username, email, password, full_name, roles, branch_id } = userData;

        // Validation
        if (!username || !email || !password) {
            return {
                success: false,
                status: 'error',
                message: 'Username, email, and password are required'
            };
        }

        if (password.length < 8) {
            return {
                success: false,
                status: 'error',
                message: 'Password must be at least 8 characters'
            };
        }

        try {
            // Check for existing user
            if (this.userRepo.emailExists(email)) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Email already registered'
                };
            }

            if (this.userRepo.usernameExists(username)) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Username already taken'
                };
            }

            // Hash password
            const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

            // Create user
            const user = this.userRepo.create({
                username,
                email: email.toLowerCase(),
                password_hash,
                full_name,
                roles: roles || ['user'],
                branch_id: branch_id || null,
                sync_status: 'pending'
            });

            // Queue for cloud sync
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: user.id,
                operation: 'create',
                payload: {
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    roles: user.roles,
                    branch_id: user.branch_id
                },
                priority: 10
            });

            // Real-time cloud push
            try {
                const { notifyDataChange } = require('./CloudSyncService.cjs');
                notifyDataChange('users', 'INSERT', user, user.id);
            } catch (e) { console.error('[AuthService] Cloud sync error (non-fatal):', e.message); }

            return {
                success: true,
                status: 'success',
                message: 'User registered successfully',
                data: UserRepository.sanitize(user)
            };

        } catch (error) {
            console.error('[AuthService] Registration error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Registration failed: ' + error.message
            };
        }
    }

    /**
     * Logout user (invalidate session)
     * @param {string} token - Session token
     * @param {string} [reason='manual'] - Logout reason
     * @returns {Object} Logout result
     */
    async logout(token, reason = 'manual') {
        if (!token) {
            return {
                success: false,
                status: 'error',
                message: 'No session token provided'
            };
        }

        try {
            // Get session before invalidating
            const session = this.sessionRepo.findByToken(token);

            // Record logout in history and deactivate cloud-synced active session
            if (session) {
                try {
                    this.loginHistoryRepo.recordLogout(session.id, reason);
                } catch (historyError) {
                    console.error('[AuthService] Failed to record logout history:', historyError.message);
                }

                // Deactivate the cloud-synced active session
                try {
                    this.activeSessionRepo.deactivateForUser(session.user_id);

                    // Immediately sync deactivation to cloud so other devices detect logout ASAP
                    setImmediate(async () => {
                        try {
                            const { getCloudSyncService } = require('./CloudSyncService.cjs');
                            const cloudSync = getCloudSyncService();
                            if (cloudSync.isOnline && cloudSync.mysqlInitialized) {
                                await cloudSync.syncTable('active_sessions');
                                console.log('[AuthService] Synced active_sessions to cloud after logout');
                            }
                        } catch (syncError) {
                            console.log('[AuthService] Could not sync active_sessions on logout:', syncError.message);
                        }
                    });
                } catch (activeSessionError) {
                    console.error('[AuthService] Failed to deactivate active session:', activeSessionError.message);
                }
            }

            const invalidated = this.sessionRepo.invalidateByToken(token);

            // Immediately clear the session cache so the token is rejected at once
            try {
                const { invalidateCache } = require('./SessionValidator.cjs');
                invalidateCache(token);
            } catch (e) {
                // SessionValidator not available — harmless, cache will expire normally
            }

            // Clear pending cloud sync changes to prevent data leaks to next user
            try {
                const { getCloudSyncService } = require('./CloudSyncService.cjs');
                const cloudSync = getCloudSyncService();
                cloudSync.clearPendingChanges();
            } catch (e) {
                // CloudSyncService not available — harmless
            }

            return {
                success: true,
                status: 'success',
                message: invalidated ? 'Logged out successfully' : 'Session not found'
            };

        } catch (error) {
            console.error('[AuthService] Logout error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Logout failed: ' + error.message
            };
        }
    }

    /**
     * Validate session token
     * Also checks if another device has logged in (via active_sessions cloud sync)
     * @param {string} token - Session token
     * @returns {Object} Validation result
     */
    validateSession(token) {
        if (!token) {
            return {
                valid: false,
                message: 'No token provided'
            };
        }

        const validation = this.sessionRepo.validateToken(token);

        if (!validation.valid) {
            return {
                valid: false,
                message: validation.reason
            };
        }

        // Get user info
        const user = this.userRepo.findById(validation.session.user_id);

        if (!user || !user.is_active) {
            return {
                valid: false,
                message: 'User not found or inactive'
            };
        }

        // Check if another device has taken over (via cloud-synced active_sessions)
        try {
            const deviceId = this.settingsService.getDeviceId();
            const isStillActive = this.activeSessionRepo.isSessionStillActive(
                user.id,
                deviceId,
                token
            );

            if (!isStillActive) {
                // Another device has logged in, invalidate this session
                console.log(`[AuthService] Session invalidated - another device logged in for user ${user.username}`);
                this.sessionRepo.invalidateByToken(token);
                return {
                    valid: false,
                    message: 'Session ended - logged in from another device',
                    forcedLogout: true
                };
            }
        } catch (activeSessionError) {
            // If active session check fails, fall back to local validation only
            console.error('[AuthService] Active session check failed:', activeSessionError.message);
        }

        return {
            valid: true,
            user: UserRepository.sanitize(user),
            session: validation.session,
            deviceId: this.settingsService.getDeviceId()
        };
    }

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Object} Result
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = this.userRepo.findById(userId);

            if (!user) {
                return {
                    success: false,
                    status: 'error',
                    message: 'User not found'
                };
            }

            // Verify current password
            const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);

            if (!passwordValid) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Current password is incorrect'
                };
            }

            if (newPassword.length < 8) {
                return {
                    success: false,
                    status: 'error',
                    message: 'New password must be at least 8 characters'
                };
            }

            // Hash new password
            const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password
            this.userRepo.update(userId, { password_hash });

            // Invalidate all sessions (force re-login)
            this.sessionRepo.invalidateAllForUser(userId);

            // Deactivate cloud-synced active session so other devices detect the change
            try {
                this.activeSessionRepo.deactivateForUser(userId);
            } catch (activeSessionError) {
                console.error('[AuthService] Failed to deactivate active session on password change:', activeSessionError.message);
            }

            // Queue password change for cloud sync
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: userId,
                operation: 'password_change',
                payload: {
                    user_id: user.cloud_id || userId,
                    new_password_hash: password_hash   // Send hash, never plaintext
                },
                priority: 10
            });

            // Real-time cloud push
            try {
                const { notifyDataChange } = require('./CloudSyncService.cjs');
                const updatedUser = this.userRepo.findById(userId);
                if (updatedUser) notifyDataChange('users', 'UPDATE', updatedUser, userId);
            } catch (e) { console.error('[AuthService] Cloud sync error (non-fatal):', e.message); }

            return {
                success: true,
                status: 'success',
                message: 'Password changed successfully'
            };

        } catch (error) {
            console.error('[AuthService] Password change error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Password change failed: ' + error.message
            };
        }
    }

    /**
     * Import user from cloud (for sync)
     * @param {Object} cloudUser - User data from cloud
     * @param {string} plainPassword - Plain password for local storage
     * @returns {Object} Import result
     */
    async importFromCloud(cloudUser, plainPassword) {
        try {
            // Check if user already exists
            let existingUser = this.userRepo.findByCloudId(cloudUser._id);

            if (!existingUser && cloudUser.email) {
                existingUser = this.userRepo.findByEmail(cloudUser.email);
            }

            const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

            if (existingUser) {
                // Update existing user
                const updated = this.userRepo.update(existingUser.id, {
                    cloud_id: cloudUser._id,
                    username: cloudUser.username,
                    email: cloudUser.email,
                    full_name: cloudUser.full_name,
                    roles: cloudUser.roles,
                    password_hash,
                    sync_status: 'synced',
                    synced_at: nowISO()
                });

                return {
                    success: true,
                    status: 'success',
                    message: 'User updated from cloud',
                    data: UserRepository.sanitize(updated),
                    isNew: false
                };
            }

            // Create new user
            const user = this.userRepo.create({
                cloud_id: cloudUser._id,
                username: cloudUser.username,
                email: cloudUser.email,
                password_hash,
                full_name: cloudUser.full_name,
                roles: cloudUser.roles || ['user'],
                sync_status: 'synced',
                synced_at: nowISO()
            });

            return {
                success: true,
                status: 'success',
                message: 'User imported from cloud',
                data: UserRepository.sanitize(user),
                isNew: true
            };

        } catch (error) {
            console.error('[AuthService] Import error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Import failed: ' + error.message
            };
        }
    }

    /**
     * Get current user by session token
     * @param {string} token - Session token
     * @returns {Object|null}
     */
    getCurrentUser(token) {
        const validation = this.validateSession(token);
        return validation.valid ? validation.user : null;
    }
}

module.exports = AuthService;
