/**
 * Migration: Create Sessions Table
 * Version: 002
 *
 * Creates the sessions table for managing user authentication sessions.
 * Used for local session tracking and logout-on-close behavior.
 */

const MIGRATION_VERSION = 2;
const MIGRATION_NAME = 'create_sessions_table';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            device_info TEXT,
            ip_address TEXT,
            is_active INTEGER DEFAULT 1,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

/**
 * Rollback the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_sessions_is_active;
        DROP INDEX IF EXISTS idx_sessions_token;
        DROP INDEX IF EXISTS idx_sessions_user_id;
        DROP TABLE IF EXISTS sessions;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
