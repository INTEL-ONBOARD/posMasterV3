/**
 * Migration: Fix Profile Image Column
 *
 * Changes profile_image column from TEXT to BLOB to support larger images.
 * SQLite TEXT has a limit of ~65535 characters which truncates base64 images.
 */

module.exports = {
    version: 20,
    name: '020_fix_profile_image_column',

    up(db) {
        console.log('[Migration 020] Starting profile_image column fix...');

        // SQLite doesn't support ALTER COLUMN, so we need to:
        // 1. Create a new table with BLOB column
        // 2. Copy data from old table
        // 3. Drop old table
        // 4. Rename new table

        // Check if user_settings table exists
        const tableExists = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
        ).get();

        if (!tableExists) {
            console.log('[Migration 020] user_settings table does not exist, creating with BLOB column');
            db.exec(`
                CREATE TABLE user_settings (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE,
                    profile_image BLOB,
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
            console.log('[Migration 020] Created user_settings table with BLOB column');
            return;
        }

        // Create new table with BLOB column
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings_new (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                profile_image BLOB,
                permissions TEXT DEFAULT '{}',
                theme TEXT DEFAULT 'light',
                language TEXT DEFAULT 'en',
                notifications_enabled INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Copy data from old table to new table
        db.exec(`
            INSERT INTO user_settings_new (id, user_id, profile_image, permissions, theme, language, notifications_enabled, created_at, updated_at)
            SELECT id, user_id, profile_image, permissions, theme, language, notifications_enabled, created_at, updated_at
            FROM user_settings
        `);

        // Drop old table
        db.exec('DROP TABLE user_settings');

        // Rename new table to original name
        db.exec('ALTER TABLE user_settings_new RENAME TO user_settings');

        // Recreate index
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
        `);

        console.log('[Migration 020] Successfully converted profile_image column to BLOB');
    },

    down(db) {
        // Revert to TEXT column (note: this may cause data loss for large images)
        console.log('[Migration 020] Reverting profile_image column to TEXT...');

        db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings_old (
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
            INSERT INTO user_settings_old (id, user_id, profile_image, permissions, theme, language, notifications_enabled, created_at, updated_at)
            SELECT id, user_id, profile_image, permissions, theme, language, notifications_enabled, created_at, updated_at
            FROM user_settings
        `);

        db.exec('DROP TABLE user_settings');
        db.exec('ALTER TABLE user_settings_old RENAME TO user_settings');
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
        `);

        console.log('[Migration 020] Reverted profile_image column to TEXT');
    }
};
