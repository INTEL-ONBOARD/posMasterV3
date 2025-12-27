/**
 * Active Session Repository
 *
 * Handles database operations for tracking active sessions across devices.
 * This table IS synced to cloud (unlike the 'sessions' table).
 */

const BaseRepository = require('./BaseRepository.cjs');
const crypto = require('crypto');
const { nowISO } = require('../utils/helpers.cjs');

class ActiveSessionRepository extends BaseRepository {
    constructor() {
        super('active_sessions');
    }

    /**
     * Create or update active session for a user
     * Each user can only have ONE active session at a time
     * @param {Object} data - Session data
     * @param {string} data.user_id - User ID
     * @param {string} data.device_id - Device ID
     * @param {string} data.device_name - Device name
     * @param {string} data.session_token - Session token (will be hashed)
     * @returns {Object} The active session record
     */
    upsertActiveSession(data) {
        const { user_id, device_id, device_name, session_token } = data;

        // Hash the session token for security (we don't need the actual token)
        const session_token_hash = session_token
            ? crypto.createHash('sha256').update(session_token).digest('hex').substring(0, 32)
            : null;

        const now = nowISO();

        // Check if record exists for this user
        const existing = this.findOneWhere({ user_id });

        if (existing) {
            // Update existing record
            return this.update(existing.id, {
                device_id,
                device_name,
                session_token_hash,
                login_at: now,
                last_activity_at: now,
                is_active: 1,
                sync_status: 'pending'
            });
        }

        // Create new record
        return super.create({
            user_id,
            device_id,
            device_name,
            session_token_hash,
            login_at: now,
            last_activity_at: now,
            is_active: 1,
            created_at: now,
            updated_at: now,
            sync_status: 'pending'
        });
    }

    /**
     * Get active session for a user
     * @param {string} userId - User ID
     * @returns {Object|null}
     */
    findByUserId(userId) {
        return this.findOneWhere({ user_id: userId, is_active: 1 });
    }

    /**
     * Check if user has active session on a different device
     * @param {string} userId - User ID
     * @param {string} currentDeviceId - Current device's ID
     * @returns {Object|null} Returns the other device's session if exists
     */
    findActiveOnOtherDevice(userId, currentDeviceId) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE user_id = ?
            AND device_id != ?
            AND is_active = 1
            LIMIT 1
        `);

        return stmt.get(userId, currentDeviceId) || null;
    }

    /**
     * Check if this device's session is still the active one
     * (Used to detect if another device has logged in)
     * @param {string} userId - User ID
     * @param {string} deviceId - This device's ID
     * @param {string} sessionToken - This session's token
     * @returns {boolean} True if this device's session is still active
     */
    isSessionStillActive(userId, deviceId, sessionToken) {
        const session_token_hash = crypto
            .createHash('sha256')
            .update(sessionToken)
            .digest('hex')
            .substring(0, 32);

        const stmt = this.db.prepare(`
            SELECT 1 FROM ${this.tableName}
            WHERE user_id = ?
            AND device_id = ?
            AND session_token_hash = ?
            AND is_active = 1
            LIMIT 1
        `);

        return !!stmt.get(userId, deviceId, session_token_hash);
    }

    /**
     * Deactivate session for a user
     * @param {string} userId - User ID
     * @returns {number} Number of rows updated
     */
    deactivateForUser(userId) {
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET is_active = 0, updated_at = ?, sync_status = 'pending'
            WHERE user_id = ?
        `);

        const result = stmt.run(nowISO(), userId);
        return result.changes;
    }

    /**
     * Update last activity timestamp
     * @param {string} userId - User ID
     * @param {string} deviceId - Device ID
     * @returns {Object|null}
     */
    updateLastActivity(userId, deviceId) {
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET last_activity_at = ?, updated_at = ?, sync_status = 'pending'
            WHERE user_id = ? AND device_id = ?
        `);

        const now = nowISO();
        stmt.run(now, now, userId, deviceId);

        return this.findOneWhere({ user_id: userId, device_id: deviceId });
    }

    /**
     * Get all active sessions (for admin view)
     * @returns {Array}
     */
    getAllActive() {
        const stmt = this.db.prepare(`
            SELECT as_tbl.*, u.username, u.full_name, u.email
            FROM ${this.tableName} as_tbl
            LEFT JOIN users u ON as_tbl.user_id = u.id
            WHERE as_tbl.is_active = 1
            ORDER BY as_tbl.last_activity_at DESC
        `);

        return stmt.all();
    }
}

module.exports = ActiveSessionRepository;
