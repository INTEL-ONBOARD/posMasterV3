/**
 * Migration: Add branch_id to Users Table
 * Version: 021
 *
 * Adds branch_id column to users table to associate users with branches.
 */

const MIGRATION_VERSION = 21;
const MIGRATION_NAME = 'add_branch_id_to_users';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    // Check if column already exists
    const tableInfo = db.pragma('table_info(users)');
    const hasBranchId = tableInfo.some(col => col.name === 'branch_id');

    if (!hasBranchId) {
        // Add branch_id column to users table
        db.exec(`
            ALTER TABLE users ADD COLUMN branch_id TEXT;
        `);

        // Create index for branch_id
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
        `);

        console.log('[Migration 021] Added branch_id column to users table');
    } else {
        console.log('[Migration 021] branch_id column already exists, skipping');
    }
}

/**
 * Reverse the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    // SQLite doesn't support DROP COLUMN directly
    // We would need to recreate the table, but for now just log
    console.log('[Migration 021] Downgrade: branch_id column removal not supported in SQLite');
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
