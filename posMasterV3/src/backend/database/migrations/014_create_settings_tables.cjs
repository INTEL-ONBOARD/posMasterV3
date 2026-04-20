/**
 * Migration: Create Settings Tables
 *
 * Creates user_settings and app_settings tables for storing
 * user preferences and application configuration.
 */

module.exports = {
    version: 14,
    name: '014_create_settings_tables',

    up(db) {
        // ============================================
        // USER SETTINGS TABLE
        // Stores per-user preferences like permissions, profile image
        // ============================================
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                profile_image TEXT,
                permissions TEXT DEFAULT '{}',
                theme TEXT DEFAULT 'light',
                language TEXT DEFAULT 'en',
                notifications_enabled INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
        `);

        // ============================================
        // APP SETTINGS TABLE
        // Stores global application settings
        // ============================================
        db.exec(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id TEXT PRIMARY KEY,
                setting_key TEXT NOT NULL UNIQUE,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string',
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key)
        `);

        // Insert default app settings - all settings enabled by default
        const now = new Date().toISOString();
        const defaultSettings = [
            { key: 'auto_logout', value: 'true', type: 'boolean', description: 'Enable automatic logout' },
            { key: 'auto_logout_minutes', value: '15', type: 'number', description: 'Auto logout timeout in minutes' },
            { key: 'notifications', value: 'true', type: 'boolean', description: 'Enable Windows built-in notifications' },
            { key: 'cloud_sync', value: 'false', type: 'boolean', description: 'Enable automatic cloud synchronization' },
            { key: 'temp_system', value: 'true', type: 'boolean', description: 'Enable application temp system' },
            { key: 'run_on_startup', value: 'true', type: 'boolean', description: 'Allow app to run on startup' },
            { key: 'maximize_window', value: 'true', type: 'boolean', description: 'Allow app to start maximized' },
            { key: 'temp_path', value: 'C:\\POS Master\\temp', type: 'string', description: 'Path for temp files' },
            { key: 'db_config_path', value: 'C:\\POS Master\\config', type: 'string', description: 'Path for db configuration file' },
            { key: 'default_outlet', value: 'Main Branch', type: 'string', description: 'Default outlet setup' }
        ];

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO app_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const setting of defaultSettings) {
            const id = `setting_${setting.key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            insertStmt.run(id, setting.key, setting.value, setting.type, setting.description, now, now);
        }

        console.log('[Migration 014] Created settings tables with defaults');
    },

    down(db) {
        db.exec('DROP TABLE IF EXISTS user_settings');
        db.exec('DROP TABLE IF EXISTS app_settings');
        console.log('[Migration 014] Dropped settings tables');
    }
};
