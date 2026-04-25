/**
 * Migration: Create active_sessions table
 * Version: 025
 *
 * This table tracks the currently active session for each user across the app.
 * It supports single-device enforcement and session visibility.
 *
 * When a user logs in:
 * 1. Local session is created in 'sessions' table
 * 2. Active session record is created/updated in 'active_sessions' table
 * 3. The online service reflects the active session state
 * 4. Other sessions can detect takeover on validation
 */

const MIGRATION_VERSION = 25;
const MIGRATION_NAME = 'create_active_sessions_table';

function up(db) {
    db.exec(`
        -- Active sessions table (SYNCED to cloud for cross-device awareness)
        CREATE TABLE IF NOT EXISTS active_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            user_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            device_name TEXT,
            session_token_hash TEXT,
            login_at TEXT NOT NULL,
            last_activity_at TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',

            UNIQUE(user_id)
        );

        -- Indexes for fast lookups
        CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_active_sessions_device_id ON active_sessions(device_id);
        CREATE INDEX IF NOT EXISTS idx_active_sessions_sync_status ON active_sessions(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP TABLE IF EXISTS active_sessions;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
