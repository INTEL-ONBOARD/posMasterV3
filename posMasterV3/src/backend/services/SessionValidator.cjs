/**
 * Session Validator Service
 *
 * Provides fast, real-time session validation with cloud sync.
 * Uses worker threads for non-blocking cloud sync operations.
 */

const { getDatabase } = require('../database/connection.cjs');
const { getSessionRepository, getActiveSessionRepository } = require('../repositories/index.cjs');
const SettingsService = require('./SettingsService.cjs');
const crypto = require('crypto');
const { broadcastSessionKicked } = require('../utils/eventBroadcaster.cjs');

// Cache for session validation to reduce DB hits
const sessionCache = new Map();
const CACHE_TTL = 2000; // 2 seconds cache (reduced for faster kick detection)

// Periodic cleanup: evict entries that have been in the cache longer than CACHE_TTL
// to prevent unbounded Map growth on long-running app instances.
setInterval(() => {
    const cutoff = Date.now() - CACHE_TTL;
    for (const [key, entry] of sessionCache) {
        if (entry.timestamp < cutoff) sessionCache.delete(key);
    }
}, 5 * 1000); // run every 5 seconds (CACHE_TTL is 2s, so 60s caused 58s stale entries)

// Track tokens for which a kick broadcast has already been emitted, to prevent
// multiple modals firing when validateSessionFast is called repeatedly.
const kickBroadcastSent = new Set();

// Track last cloud sync time
let lastCloudSyncTime = 0;
const CLOUD_SYNC_INTERVAL = 3000; // Sync from cloud every 3 seconds max (faster for real-time)

// Cloud sync in progress flag
let cloudSyncInProgress = false;

// Event emitter for session events
const EventEmitter = require('events');
const sessionEvents = new EventEmitter();

/**
 * Fast session validation with caching
 * @param {string} token - Session token
 * @returns {Object} { valid: boolean, user?: Object, forcedLogout?: boolean, message?: string }
 */
function validateSessionFast(token) {
    if (!token) {
        return { valid: false, message: 'No token provided' };
    }

    // Check cache first
    const cached = sessionCache.get(token);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // If it was cached as valid, also verify the session hasn't expired since caching
        if (cached.result?.valid && cached.result?.session?.expires_at) {
            const expiresAt = new Date(cached.result.session.expires_at).getTime();
            if (Date.now() > expiresAt) {
                sessionCache.delete(token); // Expired — force re-validation
                // fall through to DB lookup below
            } else {
                return cached.result;
            }
        } else {
            return cached.result; // Invalid cached result — return as-is (no expiry concern)
        }
    }

    try {
        const sessionRepo = getSessionRepository();
        const activeSessionRepo = getActiveSessionRepository();
        const settingsService = new SettingsService();

        // Validate token
        const validation = sessionRepo.validateToken(token);
        if (!validation.valid) {
            const result = { valid: false, message: validation.reason };
            sessionCache.set(token, { result, timestamp: Date.now() });
            return result;
        }

        // Get user
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(validation.session.user_id);

        if (!user || !user.is_active) {
            const result = { valid: false, message: 'User not found or inactive' };
            sessionCache.set(token, { result, timestamp: Date.now() });
            return result;
        }

        // Check if another device has taken over
        const deviceId = settingsService.getDeviceId();
        const sessionTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const activeSession = db.prepare(`
            SELECT * FROM active_sessions
            WHERE user_id = ? AND is_active = 1
            LIMIT 1
        `).get(user.id);

        if (activeSession) {
            // Check if this device's session is still the active one
            if (activeSession.device_id !== deviceId ||
                activeSession.session_token_hash !== sessionTokenHash) {
                // Another device has logged in!
                console.log(`[SessionValidator] Session kicked - active device: ${activeSession.device_id}, current: ${deviceId}`);

                // Invalidate local session
                sessionRepo.invalidateByToken(token);

                const result = {
                    valid: false,
                    forcedLogout: true,
                    message: 'Session ended - logged in from another device',
                    otherDevice: activeSession.device_name
                };
                sessionCache.set(token, { result, timestamp: Date.now() });

                // Emit session kicked event (internal)
                sessionEvents.emit('session-kicked', { userId: user.id, deviceName: activeSession.device_name });

                // Broadcast session kicked to UI — but only once per token to prevent
                // multiple modals if validateSessionFast is called repeatedly after kick.
                if (!kickBroadcastSent.has(token)) {
                    kickBroadcastSent.add(token);
                    broadcastSessionKicked({
                        userId: user.id,
                        deviceName: activeSession.device_name,
                        message: 'Session ended - logged in from another device'
                    });
                }

                return result;
            }
        }

        // Parse user data
        const sanitizedUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            roles: (() => { try { return user.roles ? JSON.parse(user.roles) : []; } catch { return user.roles ? [user.roles] : []; } })(),
            branch_id: user.branch_id,
            is_active: !!user.is_active
        };

        const result = {
            valid: true,
            user: sanitizedUser,
            session: validation.session,
            deviceId
        };
        sessionCache.set(token, { result, timestamp: Date.now() });
        return result;

    } catch (error) {
        console.error('[SessionValidator] Validation error:', error.message);
        return { valid: false, message: 'Session validation failed' };
    }
}

/**
 * Trigger background cloud sync for active_sessions
 *
 * NOTE: This is intentionally a no-op. RealTimeSyncService owns active_sessions
 * polling at 1-second intervals via checkActiveSessionsFromCloud(). Running a
 * second concurrent pull from SessionValidator would:
 *   1. Toggle foreign_keys ON/OFF concurrently with the batch sync (FK pragma race)
 *   2. Clear sessionCache during the middle of validation loops
 *   3. Double the pull frequency with no benefit
 *
 * If you need to force an immediate re-validation, call clearCache() directly.
 */
async function triggerCloudSync() {
    // Delegated to RealTimeSyncService — no-op here to avoid concurrent pull races
}

/**
 * Validate session with cloud sync
 * This is the main validation function that should be called on every operation
 */
async function validateSessionWithSync(token) {
    // First do fast local validation
    const localResult = validateSessionFast(token);

    // If invalid locally, return immediately
    if (!localResult.valid) {
        return localResult;
    }

    // Trigger background cloud sync (non-blocking)
    triggerCloudSync();

    return localResult;
}

/**
 * Force immediate cloud sync and revalidate
 * Use this for critical operations
 */
async function validateSessionStrict(token) {
    try {
        const { getCloudSyncService } = require('./CloudSyncService.cjs');
        const cloudSync = getCloudSyncService();

        if (cloudSync.isOnline && cloudSync.mysqlInitialized) {
            // Force sync active_sessions (skipFkPragma to avoid concurrent FK toggle race)
            await cloudSync.pullFromCloud('active_sessions', { skipFkPragma: true });
            sessionCache.clear();
        }
    } catch (error) {
        console.log('[SessionValidator] Strict sync error:', error.message);
    }

    return validateSessionFast(token);
}

/**
 * Invalidate session cache for a token
 */
function invalidateCache(token) {
    if (token) {
        sessionCache.delete(token);
    }
}

/**
 * Clear all session cache
 */
function clearCache() {
    sessionCache.clear();
    kickBroadcastSent.clear();
}

/**
 * Subscribe to session events
 */
function onSessionKicked(callback) {
    sessionEvents.on('session-kicked', callback);
}

/**
 * Create a session validation wrapper for IPC handlers
 * Wraps any handler to validate session first
 */
function withSessionValidation(handler) {
    return async (event, payload) => {
        const token = payload?.token || payload?.sessionToken;

        if (token) {
            const validation = await validateSessionWithSync(token);
            if (!validation.valid) {
                return {
                    success: false,
                    status: 'session_invalid',
                    message: validation.message,
                    forcedLogout: validation.forcedLogout,
                    requiresReauth: true
                };
            }
        }

        return handler(event, payload);
    };
}

module.exports = {
    validateSessionFast,
    validateSessionWithSync,
    validateSessionStrict,
    invalidateCache,
    clearCache,
    onSessionKicked,
    withSessionValidation,
    triggerCloudSync,
    sessionEvents
};
