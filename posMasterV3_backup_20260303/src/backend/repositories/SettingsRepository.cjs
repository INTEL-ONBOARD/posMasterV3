/**
 * Settings Repository
 *
 * Handles database operations for user_settings and app_settings tables.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { generateUUID, nowISO } = require('../utils/helpers.cjs');

class UserSettingsRepository extends BaseRepository {
    constructor() {
        super('user_settings');
    }

    /**
     * Find settings by user ID
     * @param {string} userId - User ID
     * @returns {Object|null}
     */
    findByUserId(userId) {
        const settings = this.findOneWhere({ user_id: userId });
        return settings ? this._parseSettings(settings) : null;
    }

    /**
     * Create or update user settings
     * @param {string} userId - User ID
     * @param {Object} settingsData - Settings data
     * @returns {Object}
     */
    upsert(userId, settingsData) {
        const existing = this.findByUserId(userId);
        const now = nowISO();

        if (existing) {
            // Update existing settings
            const updateData = {
                ...settingsData,
                updated_at: now
            };

            // Handle permissions as JSON
            if (settingsData.permissions && typeof settingsData.permissions === 'object') {
                updateData.permissions = JSON.stringify(settingsData.permissions);
            }

            return this._parseSettings(this.update(existing.id, updateData));
        } else {
            // Create new settings
            const newSettings = {
                id: generateUUID(),
                user_id: userId,
                profile_image: settingsData.profile_image || null,
                permissions: JSON.stringify(settingsData.permissions || {}),
                theme: settingsData.theme || 'light',
                language: settingsData.language || 'en',
                notifications_enabled: settingsData.notifications_enabled !== undefined
                    ? (settingsData.notifications_enabled ? 1 : 0) : 1,
                created_at: now,
                updated_at: now
            };

            return this._parseSettings(super.create(newSettings));
        }
    }

    /**
     * Update permissions for a user
     * @param {string} userId - User ID
     * @param {Object} permissions - Permissions object
     * @returns {Object}
     */
    updatePermissions(userId, permissions) {
        return this.upsert(userId, { permissions });
    }

    /**
     * Update profile image for a user
     * @param {string} userId - User ID
     * @param {string} profileImage - Base64 encoded image or path
     * @returns {Object}
     */
    updateProfileImage(userId, profileImage) {
        return this.upsert(userId, { profile_image: profileImage });
    }

    /**
     * Delete settings for a user
     * @param {string} userId - User ID
     * @returns {boolean}
     */
    deleteByUserId(userId) {
        const stmt = this.db.prepare('DELETE FROM user_settings WHERE user_id = ?');
        const result = stmt.run(userId);
        return result.changes > 0;
    }

    /**
     * Parse settings from database
     * @private
     */
    _parseSettings(settings) {
        if (!settings) return null;

        return {
            ...settings,
            permissions: settings.permissions ? JSON.parse(settings.permissions) : {},
            notifications_enabled: !!settings.notifications_enabled
        };
    }
}

class AppSettingsRepository extends BaseRepository {
    constructor() {
        super('app_settings');
    }

    /**
     * Get a setting by key
     * @param {string} key - Setting key
     * @returns {any} Parsed setting value
     */
    get(key) {
        const setting = this.findOneWhere({ setting_key: key });
        if (!setting) return null;
        return this._parseValue(setting.setting_value, setting.setting_type);
    }

    /**
     * Get all settings as a key-value object
     * @returns {Object}
     */
    getAllAsObject() {
        const settings = this.findAll({ limit: 1000 });
        const result = {};

        for (const setting of settings) {
            result[setting.setting_key] = this._parseValue(
                setting.setting_value,
                setting.setting_type
            );
        }

        return result;
    }

    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @param {string} type - Value type (string, boolean, number, json)
     * @param {string} description - Optional description
     * @returns {Object}
     */
    set(key, value, type = 'string', description = null) {
        const existing = this.findOneWhere({ setting_key: key });
        const now = nowISO();
        const stringValue = this._stringifyValue(value, type);

        if (existing) {
            return this.update(existing.id, {
                setting_value: stringValue,
                setting_type: type,
                description: description || existing.description,
                updated_at: now
            });
        } else {
            return super.create({
                id: generateUUID(),
                setting_key: key,
                setting_value: stringValue,
                setting_type: type,
                description: description,
                created_at: now,
                updated_at: now
            });
        }
    }

    /**
     * Set multiple settings at once
     * @param {Object} settings - Key-value pairs of settings
     * @returns {Object} All settings after update
     */
    setMany(settings) {
        return this.transaction(() => {
            for (const [key, value] of Object.entries(settings)) {
                const type = this._inferType(value);
                this.set(key, value, type);
            }
            return this.getAllAsObject();
        });
    }

    /**
     * Delete a setting
     * @param {string} key - Setting key
     * @returns {boolean}
     */
    deleteByKey(key) {
        const stmt = this.db.prepare('DELETE FROM app_settings WHERE setting_key = ?');
        const result = stmt.run(key);
        return result.changes > 0;
    }

    /**
     * Reset settings to defaults
     * All settings are enabled by default for new users
     * @returns {Object}
     */
    resetToDefaults() {
        const defaults = {
            auto_logout: true,
            auto_logout_minutes: 15,
            notifications: true,
            cloud_sync: true,
            temp_system: true,
            run_on_startup: true,
            maximize_window: true,
            temp_path: 'C:\\POS Master\\temp',
            db_config_path: 'C:\\POS Master\\config',
            default_outlet: 'Main Branch'
        };

        return this.setMany(defaults);
    }

    /**
     * Parse string value to proper type
     * @private
     */
    _parseValue(value, type) {
        if (value === null || value === undefined) return null;

        switch (type) {
            case 'boolean':
                return value === 'true' || value === '1';
            case 'number':
                return Number(value);
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    /**
     * Convert value to string for storage
     * @private
     */
    _stringifyValue(value, type) {
        if (value === null || value === undefined) return null;

        switch (type) {
            case 'boolean':
                return value ? 'true' : 'false';
            case 'number':
                return String(value);
            case 'json':
                return JSON.stringify(value);
            default:
                return String(value);
        }
    }

    /**
     * Infer the type of a value
     * @private
     */
    _inferType(value) {
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'object') return 'json';
        return 'string';
    }
}

module.exports = {
    UserSettingsRepository,
    AppSettingsRepository
};
