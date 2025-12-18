/**
 * Migration: Create Members (Customers) Table
 * Version: 011
 */

const MIGRATION_VERSION = 11;
const MIGRATION_NAME = 'create_members_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            member_no TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            contact TEXT,
            address TEXT,
            member_type TEXT DEFAULT 'regular',
            total_income REAL DEFAULT 0,
            total_credits REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_members_no ON members(member_no);
        CREATE INDEX IF NOT EXISTS idx_members_name ON members(full_name);
        CREATE INDEX IF NOT EXISTS idx_members_type ON members(member_type);
        CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active);
        CREATE INDEX IF NOT EXISTS idx_members_sync_status ON members(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_members_sync_status;
        DROP INDEX IF EXISTS idx_members_active;
        DROP INDEX IF EXISTS idx_members_type;
        DROP INDEX IF EXISTS idx_members_name;
        DROP INDEX IF EXISTS idx_members_no;
        DROP TABLE IF EXISTS members;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
