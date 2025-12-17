/**
 * Session Repository
 *
 * Handles all database operations related to user sessions.
 * Manages authentication tokens and session lifecycle.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { generateUUID } = require('../utils/helpers.cjs');

class SessionRepository extends BaseRepository {
    constructor() {
        super('sessions');
    }

    /**
     * Create a new session
     * @param {Object} sessionData - Session data
     * @returns {Object} The created session
     */
    create(sessionData) {
        const session = {
            id: sessionData.id || generateUUID(),
            user_id: sessionData.user_id,
            token: sessionData.token || this._generateToken(),
            device_info: sessionData.device_info || null,
            ip_address: sessionData.ip_address || null,
            is_active: 1,
            expires_at: sessionData.expires_at || this._getDefaultExpiry(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        return super.create(session);
    }

    /**
     * Find session by token
     * @param {string} token - Session token
     * @returns {Object|null}
     */
    findByToken(token) {
        return this.findOneWhere({ token });
    }

    /**
     * Find active session by token
     * @param {string} token - Session token
     * @returns {Object|null}
     */
    findActiveByToken(token) {
        const stmt = this.db.prepare(`
            SELECT * FROM sessions
            WHERE token = ?
            AND is_active = 1
            AND expires_at > datetime('now')
            LIMIT 1
        `);

        return stmt.get(token) || null;
    }

    /**
     * Find all sessions for a user
     * @param {string} userId - User ID
     * @returns {Array}
     */
    findByUserId(userId) {
        return this.findWhere({ user_id: userId });
    }

    /**
     * Find active sessions for a user
     * @param {string} userId - User ID
     * @returns {Array}
     */
    findActiveByUserId(userId) {
        const stmt = this.db.prepare(`
            SELECT * FROM sessions
            WHERE user_id = ?
            AND is_active = 1
            AND expires_at > datetime('now')
            ORDER BY created_at DESC
        `);

        return stmt.all(userId);
    }

    /**
     * Invalidate a session
     * @param {string} sessionId - Session ID
     * @returns {Object|null}
     */
    invalidate(sessionId) {
        return this.update(sessionId, { is_active: 0 });
    }

    /**
     * Invalidate session by token
     * @param {string} token - Session token
     * @returns {boolean}
     */
    invalidateByToken(token) {
        const stmt = this.db.prepare(`
            UPDATE sessions
            SET is_active = 0, updated_at = ?
            WHERE token = ?
        `);

        const result = stmt.run(new Date().toISOString(), token);
        return result.changes > 0;
    }

    /**
     * Invalidate all sessions for a user
     * @param {string} userId - User ID
     * @returns {number} Number of sessions invalidated
     */
    invalidateAllForUser(userId) {
        const stmt = this.db.prepare(`
            UPDATE sessions
            SET is_active = 0, updated_at = ?
            WHERE user_id = ?
        `);

        const result = stmt.run(new Date().toISOString(), userId);
        return result.changes;
    }

    /**
     * Extend session expiry
     * @param {string} token - Session token
     * @param {string} newExpiry - New expiry datetime
     * @returns {Object|null}
     */
    extendSession(token, newExpiry) {
        const session = this.findByToken(token);
        if (!session) return null;

        return this.update(session.id, {
            expires_at: newExpiry || this._getDefaultExpiry()
        });
    }

    /**
     * Clean up expired sessions
     * @returns {number} Number of sessions deleted
     */
    cleanupExpired() {
        const stmt = this.db.prepare(`
            DELETE FROM sessions
            WHERE expires_at < datetime('now')
            OR is_active = 0
        `);

        const result = stmt.run();
        return result.changes;
    }

    /**
     * Validate a session token
     * @param {string} token - Session token
     * @returns {Object} Validation result
     */
    validateToken(token) {
        const session = this.findActiveByToken(token);

        if (!session) {
            return {
                valid: false,
                reason: 'Session not found or inactive'
            };
        }

        const expiresAt = new Date(session.expires_at);
        if (expiresAt < new Date()) {
            return {
                valid: false,
                reason: 'Session expired'
            };
        }

        return {
            valid: true,
            session
        };
    }

    /**
     * Generate a secure token
     * @returns {string}
     * @private
     */
    _generateToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Get default session expiry (24 hours from now)
     * @returns {string}
     * @private
     */
    _getDefaultExpiry() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        return expiry.toISOString();
    }
}

module.exports = SessionRepository;
