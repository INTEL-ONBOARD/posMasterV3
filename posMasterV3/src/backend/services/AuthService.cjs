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
const { getUserRepository, getSessionRepository, getSyncQueueRepository } = require('../repositories/index.cjs');
const UserRepository = require('../repositories/UserRepository.cjs');

const SALT_ROUNDS = 10;

class AuthService {
    constructor() {
        this.userRepo = getUserRepository();
        this.sessionRepo = getSessionRepository();
        this.syncQueueRepo = getSyncQueueRepository();
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
                // Verify password locally
                const passwordValid = await bcrypt.compare(password, user.password_hash);

                if (!passwordValid) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Invalid credentials'
                    };
                }

                if (!user.is_active) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Account is deactivated'
                    };
                }

                // Create session
                const session = this.sessionRepo.create({
                    user_id: user.id,
                    device_info: deviceInfo
                });

                // Update last login
                this.userRepo.updateLastLogin(user.id);

                return {
                    success: true,
                    status: 'success',
                    message: 'Login successful',
                    data: UserRepository.sanitize(user),
                    token: session.token,
                    sessionId: session.id
                };
            }

            // User not found locally
            return {
                success: false,
                status: 'error',
                message: 'User not found. Please sync with cloud or register.',
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
        const { username, email, password, full_name, roles } = userData;

        // Validation
        if (!username || !email || !password) {
            return {
                success: false,
                status: 'error',
                message: 'Username, email, and password are required'
            };
        }

        if (password.length < 6) {
            return {
                success: false,
                status: 'error',
                message: 'Password must be at least 6 characters'
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
                    // Note: We don't sync the password hash - cloud should handle its own auth
                    password: password  // Send plain password to cloud (over HTTPS)
                },
                priority: 10
            });

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
     * @returns {Object} Logout result
     */
    async logout(token) {
        if (!token) {
            return {
                success: false,
                status: 'error',
                message: 'No session token provided'
            };
        }

        try {
            const invalidated = this.sessionRepo.invalidateByToken(token);

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

        return {
            valid: true,
            user: UserRepository.sanitize(user),
            session: validation.session
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

            if (newPassword.length < 6) {
                return {
                    success: false,
                    status: 'error',
                    message: 'New password must be at least 6 characters'
                };
            }

            // Hash new password
            const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password
            this.userRepo.update(userId, { password_hash });

            // Invalidate all sessions (force re-login)
            this.sessionRepo.invalidateAllForUser(userId);

            // Queue password change for cloud sync
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: userId,
                operation: 'password_change',
                payload: {
                    user_id: user.cloud_id || userId,
                    new_password: newPassword
                },
                priority: 10
            });

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
                    synced_at: new Date().toISOString()
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
                synced_at: new Date().toISOString()
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
