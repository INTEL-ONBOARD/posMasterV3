/**
 * Migration: Create Users Table
 * Version: 001
 *
 * Creates the users table with all necessary fields for authentication
 * and user management.
 */

const MIGRATION_VERSION = 1;
const MIGRATION_NAME = 'create_users_table';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            cloud_id TEXT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            roles TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            last_login_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            synced_at TEXT,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_cloud_id ON users(cloud_id);
        CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

/**
 * Rollback the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_users_sync_status;
        DROP INDEX IF EXISTS idx_users_cloud_id;
        DROP INDEX IF EXISTS idx_users_username;
        DROP INDEX IF EXISTS idx_users_email;
        DROP TABLE IF EXISTS users;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
