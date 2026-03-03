/**
 * Migration: Create Branches (Inventories/Outlets) Table
 * Version: 006
 */

const MIGRATION_VERSION = 6;
const MIGRATION_NAME = 'create_branches_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            name TEXT NOT NULL,
            address TEXT,
            contact TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
        CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);
        CREATE INDEX IF NOT EXISTS idx_branches_sync_status ON branches(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_branches_sync_status;
        DROP INDEX IF EXISTS idx_branches_is_active;
        DROP INDEX IF EXISTS idx_branches_name;
        DROP TABLE IF EXISTS branches;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
