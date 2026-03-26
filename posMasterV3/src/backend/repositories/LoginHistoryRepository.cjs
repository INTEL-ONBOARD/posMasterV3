/**
 * Login History Repository
 *
 * Handles database operations for tracking user login/logout events.
 * Provides methods for recording sessions and calculating durations.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { nowISO, getSriLankanDate } = require('../utils/helpers.cjs');

class LoginHistoryRepository extends BaseRepository {
    constructor() {
        super('login_history');
    }

    /**
     * Override update to handle updated_at (migration 041 adds this column)
     * @param {string} id - The record ID
     * @param {Object} data - The data to update
     * @returns {Object|null} The updated record
     */
    update(id, data) {
        const { notifyDataChange } = require('../services/CloudSyncService.cjs');
        const { broadcastDataChange } = require('../utils/eventBroadcaster.cjs');
        const { nowISO } = require('../utils/helpers.cjs');

        // Inject updated_at and sync_status so CloudSync picks up this change
        const dataWithTimestamp = { ...data, updated_at: nowISO(), sync_status: 'pending' };
        const keys = Object.keys(dataWithTimestamp);
        const values = Object.values(dataWithTimestamp);

        if (keys.length === 0) {
            return this.findById(id);
        }

        const setClause = keys.map(k => `${k} = ?`).join(', ');

        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET ${setClause}
            WHERE id = ?
        `);

        stmt.run(...values, id);


        // Get the updated record and notify CloudSync + broadcast to UI
        const updatedRecord = this.findById(id);
        if (updatedRecord) {
            notifyDataChange(this.tableName, 'UPDATE', updatedRecord, id);
            broadcastDataChange(this.tableName, 'UPDATE', id, updatedRecord);
        }

        return updatedRecord;
    }

    /**
     * Record a new login event
     * @param {Object} data - Login data
     * @param {string} data.user_id - User ID
     * @param {string} data.session_id - Session ID
     * @param {string} data.username - Username
     * @param {string} [data.full_name] - User's full name
     * @param {string} [data.device_info] - Device information
     * @param {string} [data.ip_address] - IP address
     * @param {number} [data.branch_id] - Branch ID
     * @param {string} [data.branch_name] - Branch name
     * @returns {Object} Created login history record
     */
    recordLogin(data) {
        const loginAt = nowISO();
        const loginData = {
            user_id: data.user_id,
            session_id: data.session_id,
            username: data.username,
            full_name: data.full_name || null,
            login_at: loginAt,
            device_info: data.device_info || null,
            ip_address: data.ip_address || null,
            branch_id: data.branch_id || null,
            branch_name: data.branch_name || null,
            status: 'active',
            sync_status: 'pending',
            updated_at: loginAt  // Required for incremental cloud sync (migration 041)
        };

        return this.create(loginData);
    }

    /**
     * Record logout for a session
     * @param {string} sessionId - Session ID
     * @param {string} [reason='manual'] - Logout reason (manual, timeout, forced, app_close)
     * @returns {Object|null} Updated login history record
     */
    recordLogout(sessionId, reason = 'manual') {
        const record = this.findBySessionId(sessionId);
        if (!record) return null;

        const logoutAt = nowISO();
        const loginAt = new Date(record.login_at);
        const logoutDate = new Date(logoutAt);
        const durationSeconds = Math.floor((logoutDate - loginAt) / 1000);

        return this.update(record.id, {
            logout_at: logoutAt,
            duration_seconds: durationSeconds,
            logout_reason: reason,
            status: 'completed'
        });
    }

    /**
     * Record logout by user ID (for all active sessions)
     * @param {string} userId - User ID
     * @param {string} [reason='manual'] - Logout reason
     * @returns {number} Number of sessions logged out
     */
    recordLogoutByUserId(userId, reason = 'manual') {
        const activeSessions = this.findActiveByUserId(userId);
        let count = 0;

        for (const session of activeSessions) {
            this.recordLogout(session.session_id, reason);
            count++;
        }

        return count;
    }

    /**
     * Find login history by session ID
     * @param {string} sessionId - Session ID
     * @returns {Object|null}
     */
    findBySessionId(sessionId) {
        return this.findOneWhere({ session_id: sessionId });
    }

    /**
     * Find active login sessions for a user
     * @param {string} userId - User ID
     * @returns {Array}
     */
    findActiveByUserId(userId) {
        return this.findWhere({ user_id: userId, status: 'active' });
    }

    /**
     * Get login history for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @param {number} [options.limit=50] - Maximum records
     * @param {number} [options.offset=0] - Records to skip
     * @returns {Array}
     */
    getByUserId(userId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE user_id = ?
            ORDER BY login_at DESC
            LIMIT ? OFFSET ?
        `);

        return stmt.all(userId, limit, offset);
    }

    /**
     * Get all login history with pagination
     * @param {Object} options - Query options
     * @param {number} [options.limit=50] - Maximum records
     * @param {number} [options.offset=0] - Records to skip
     * @param {string} [options.startDate] - Filter by start date
     * @param {string} [options.endDate] - Filter by end date
     * @returns {Array}
     */
    getAll(options = {}) {
        const { limit = 50, offset = 0, startDate, endDate } = options;

        let query = `SELECT * FROM ${this.tableName}`;
        const params = [];

        if (startDate || endDate) {
            const conditions = [];
            if (startDate) {
                conditions.push('login_at >= ?');
                params.push(startDate);
            }
            if (endDate) {
                conditions.push('login_at <= ?');
                params.push(endDate);
            }
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY login_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    /**
     * Get login history by date range
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @returns {Array}
     */
    getByDateRange(startDate, endDate) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE login_at >= ? AND login_at <= ?
            ORDER BY login_at DESC
        `);

        return stmt.all(startDate, endDate);
    }

    /**
     * Get login statistics for a user
     * @param {string} userId - User ID
     * @returns {Object}
     */
    getUserStats(userId) {
        const stmt = this.db.prepare(`
            SELECT
                COUNT(*) as total_logins,
                SUM(duration_seconds) as total_duration_seconds,
                AVG(duration_seconds) as avg_duration_seconds,
                MAX(login_at) as last_login,
                MIN(login_at) as first_login
            FROM ${this.tableName}
            WHERE user_id = ? AND status = 'completed'
        `);

        return stmt.get(userId);
    }

    /**
     * Get daily login statistics
     * @param {number} days - Number of days to look back
     * @returns {Array}
     */
    getDailyStats(days = 30) {
        const stmt = this.db.prepare(`
            SELECT
                DATE(login_at) as date,
                COUNT(*) as login_count,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(duration_seconds) as total_duration_seconds,
                AVG(duration_seconds) as avg_duration_seconds
            FROM ${this.tableName}
            WHERE login_at >= DATE('now', '-' || ? || ' days')
            GROUP BY DATE(login_at)
            ORDER BY date DESC
        `);

        return stmt.all(days);
    }

    /**
     * Get user activity summary
     * @param {number} days - Number of days to look back
     * @returns {Array}
     */
    getUserActivitySummary(days = 30) {
        const stmt = this.db.prepare(`
            SELECT
                user_id,
                username,
                full_name,
                COUNT(*) as login_count,
                SUM(duration_seconds) as total_duration_seconds,
                AVG(duration_seconds) as avg_duration_seconds,
                MAX(login_at) as last_login
            FROM ${this.tableName}
            WHERE login_at >= DATE('now', '-' || ? || ' days')
            GROUP BY user_id
            ORDER BY login_count DESC
        `);

        return stmt.all(days);
    }

    /**
     * Mark stale sessions as timed out
     * Called during cleanup to close sessions that weren't properly logged out
     * @param {number} hoursThreshold - Hours after which to consider session stale
     * @returns {number} Number of sessions marked as timed out
     */
    markStaleSessions(hoursThreshold = 24) {
        const threshold = getSriLankanDate();
        threshold.setHours(threshold.getHours() - hoursThreshold);

        const year = threshold.getFullYear();
        const month = String(threshold.getMonth() + 1).padStart(2, '0');
        const day = String(threshold.getDate()).padStart(2, '0');
        const hours = String(threshold.getHours()).padStart(2, '0');
        const minutes = String(threshold.getMinutes()).padStart(2, '0');
        const seconds = String(threshold.getSeconds()).padStart(2, '0');
        const thresholdISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;

        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET
                status = 'timeout',
                logout_at = ?,
                logout_reason = 'stale_session',
                duration_seconds = CAST(
                    (julianday(?) - julianday(login_at)) * 86400 AS INTEGER
                ),
                sync_status = 'pending'
            WHERE status = 'active'
            AND login_at < ?
        `);

        const currentTime = nowISO();
        const result = stmt.run(currentTime, currentTime, thresholdISO);
        return result.changes;
    }

    /**
     * Get currently active sessions
     * @returns {Array}
     */
    getActiveSessions() {
        return this.findWhere({ status: 'active' });
    }

    /**
     * Count active sessions
     * @returns {number}
     */
    countActiveSessions() {
        return this.countWhere({ status: 'active' });
    }

    /**
     * Close all active login_history records on startup.
     * Marks any session that survived a crash/force-quit as 'app_crashed'.
     * Called once by startupSessionCleanup() in backend.cjs before IPC handlers
     * are registered, so notifyDataChange is intentionally NOT triggered here —
     * CloudSyncService will pick up the sync_status='pending' records on its
     * first sync cycle.
     * @returns {number} Number of records closed
     */
    closeAllActiveSessions() {
        const currentTime = nowISO();
        const stmt = this.db.prepare(`
            UPDATE login_history
            SET
                status           = 'app_crashed',
                logout_at        = ?,
                logout_reason    = 'app_crashed',
                duration_seconds = CAST(
                    (julianday(?) - julianday(login_at)) * 86400 AS INTEGER
                ),
                sync_status      = 'pending'
            WHERE status = 'active'
        `);
        const result = stmt.run(currentTime, currentTime);
        return result.changes;
    }
}

module.exports = LoginHistoryRepository;
