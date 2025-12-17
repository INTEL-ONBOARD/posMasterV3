/**
 * User Repository
 *
 * Handles all database operations related to users.
 * Extends BaseRepository with user-specific queries.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { generateUUID } = require('../utils/helpers.cjs');

class UserRepository extends BaseRepository {
    constructor() {
        super('users');
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Object} The created user
     */
    create(userData) {
        const user = {
            id: userData.id || generateUUID(),
            cloud_id: userData.cloud_id || userData._id || null,
            username: userData.username,
            email: userData.email,
            password_hash: userData.password_hash,
            full_name: userData.full_name || null,
            roles: JSON.stringify(userData.roles || []),
            is_active: userData.is_active !== undefined ? userData.is_active : 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: userData.sync_status || 'pending'
        };

        return super.create(user);
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Object|null}
     */
    findByEmail(email) {
        const user = this.findOneWhere({ email: email.toLowerCase() });
        return user ? this._parseUser(user) : null;
    }

    /**
     * Find user by username
     * @param {string} username - Username
     * @returns {Object|null}
     */
    findByUsername(username) {
        const user = this.findOneWhere({ username });
        return user ? this._parseUser(user) : null;
    }

    /**
     * Find user by email or username (for login)
     * @param {string} identifier - Email or username
     * @returns {Object|null}
     */
    findByEmailOrUsername(identifier) {
        const stmt = this.db.prepare(`
            SELECT * FROM users
            WHERE email = ? OR username = ?
            LIMIT 1
        `);

        const user = stmt.get(identifier.toLowerCase(), identifier);
        return user ? this._parseUser(user) : null;
    }

    /**
     * Find user by cloud ID (for sync)
     * @param {string} cloudId - The cloud/remote ID
     * @returns {Object|null}
     */
    findByCloudId(cloudId) {
        const user = this.findOneWhere({ cloud_id: cloudId });
        return user ? this._parseUser(user) : null;
    }

    /**
     * Find user by ID with parsed fields
     * @param {string} id - User ID
     * @returns {Object|null}
     */
    findById(id) {
        const user = super.findById(id);
        return user ? this._parseUser(user) : null;
    }

    /**
     * Update user's last login time
     * @param {string} userId - User ID
     * @returns {Object|null}
     */
    updateLastLogin(userId) {
        return this.update(userId, {
            last_login_at: new Date().toISOString()
        });
    }

    /**
     * Update user's sync status
     * @param {string} userId - User ID
     * @param {string} status - Sync status ('pending', 'synced', 'error')
     * @param {string} cloudId - Optional cloud ID to update
     * @returns {Object|null}
     */
    updateSyncStatus(userId, status, cloudId = null) {
        const data = {
            sync_status: status,
            synced_at: status === 'synced' ? new Date().toISOString() : null
        };

        if (cloudId) {
            data.cloud_id = cloudId;
        }

        return this.update(userId, data);
    }

    /**
     * Get users pending sync
     * @returns {Array}
     */
    findPendingSync() {
        const users = this.findWhere({ sync_status: 'pending' });
        return users.map(u => this._parseUser(u));
    }

    /**
     * Get all active users
     * @returns {Array}
     */
    findAllActive() {
        const users = this.findWhere({ is_active: 1 });
        return users.map(u => this._parseUser(u));
    }

    /**
     * Check if email exists
     * @param {string} email - Email to check
     * @param {string} excludeId - Optional ID to exclude (for updates)
     * @returns {boolean}
     */
    emailExists(email, excludeId = null) {
        let sql = 'SELECT 1 FROM users WHERE email = ?';
        const params = [email.toLowerCase()];

        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }

        sql += ' LIMIT 1';

        const stmt = this.db.prepare(sql);
        return !!stmt.get(...params);
    }

    /**
     * Check if username exists
     * @param {string} username - Username to check
     * @param {string} excludeId - Optional ID to exclude (for updates)
     * @returns {boolean}
     */
    usernameExists(username, excludeId = null) {
        let sql = 'SELECT 1 FROM users WHERE username = ?';
        const params = [username];

        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }

        sql += ' LIMIT 1';

        const stmt = this.db.prepare(sql);
        return !!stmt.get(...params);
    }

    /**
     * Deactivate user
     * @param {string} userId - User ID
     * @returns {Object|null}
     */
    deactivate(userId) {
        return this.update(userId, { is_active: 0 });
    }

    /**
     * Activate user
     * @param {string} userId - User ID
     * @returns {Object|null}
     */
    activate(userId) {
        return this.update(userId, { is_active: 1 });
    }

    /**
     * Parse user data (deserialize JSON fields)
     * @param {Object} user - Raw user data from DB
     * @returns {Object} Parsed user
     * @private
     */
    _parseUser(user) {
        if (!user) return null;

        return {
            ...user,
            roles: user.roles ? JSON.parse(user.roles) : [],
            is_active: !!user.is_active
        };
    }

    /**
     * Get user without password hash (for responses)
     * @param {Object} user - User object
     * @returns {Object} User without password
     */
    static sanitize(user) {
        if (!user) return null;

        const { password_hash, ...sanitized } = user;
        return sanitized;
    }
}

module.exports = UserRepository;
