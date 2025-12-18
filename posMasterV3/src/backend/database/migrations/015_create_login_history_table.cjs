/**
 * Migration: Create Login History Table
 * Version: 015
 *
 * Creates the login_history table for tracking user login/logout events with duration.
 * Used for audit trails and reporting on user activity.
 */

const MIGRATION_VERSION = 15;
const MIGRATION_NAME = 'create_login_history_table';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS login_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            session_id TEXT,
            username TEXT NOT NULL,
            full_name TEXT,
            login_at TEXT NOT NULL,
            logout_at TEXT,
            duration_seconds INTEGER,
            logout_reason TEXT,
            device_info TEXT,
            ip_address TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);
        CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status);
        CREATE INDEX IF NOT EXISTS idx_login_history_session_id ON login_history(session_id);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

/**
 * Rollback the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_login_history_session_id;
        DROP INDEX IF EXISTS idx_login_history_status;
        DROP INDEX IF EXISTS idx_login_history_login_at;
        DROP INDEX IF EXISTS idx_login_history_user_id;
        DROP TABLE IF EXISTS login_history;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
