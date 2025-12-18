/**
 * Migration: Add Branch Info to Login History
 * Version: 022
 *
 * Adds branch_id and branch_name columns to login_history table
 * to track which branch the user logged in from.
 */

const MIGRATION_VERSION = 22;
const MIGRATION_NAME = 'add_branch_to_login_history';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    // Check if columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(login_history)").all();
    const existingColumns = tableInfo.map(col => col.name);

    if (!existingColumns.includes('branch_id')) {
        db.exec(`ALTER TABLE login_history ADD COLUMN branch_id INTEGER`);
        console.log('[Migration 022] Added branch_id column to login_history');
    }

    if (!existingColumns.includes('branch_name')) {
        db.exec(`ALTER TABLE login_history ADD COLUMN branch_name TEXT`);
        console.log('[Migration 022] Added branch_name column to login_history');
    }

    // Create index for branch_id
    db.exec(`CREATE INDEX IF NOT EXISTS idx_login_history_branch_id ON login_history(branch_id)`);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

/**
 * Rollback the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    db.exec(`
        DROP INDEX IF EXISTS idx_login_history_branch_id;

        CREATE TABLE login_history_backup AS SELECT
            id, user_id, session_id, username, full_name,
            login_at, logout_at, duration_seconds, logout_reason,
            device_info, ip_address, status, created_at, sync_status
        FROM login_history;

        DROP TABLE login_history;

        CREATE TABLE login_history (
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

        INSERT INTO login_history SELECT * FROM login_history_backup;
        DROP TABLE login_history_backup;

        CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);
        CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status);
        CREATE INDEX IF NOT EXISTS idx_login_history_session_id ON login_history(session_id);
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
