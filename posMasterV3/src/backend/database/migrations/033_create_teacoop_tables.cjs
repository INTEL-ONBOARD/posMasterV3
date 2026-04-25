/**
 * Migration: Create Tea Coop Members and Payments Tables
 * Version: 033
 *
 * Stores data fetched from Tea Coop API for online branch access
 */

const MIGRATION_VERSION = 33;
const MIGRATION_NAME = 'create_teacoop_tables';

function up(db) {
    // Tea Coop Members table - stores member data from external API
    db.exec(`
        CREATE TABLE IF NOT EXISTS tea_coop_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            member_id TEXT UNIQUE NOT NULL,
            member_no TEXT,
            full_name TEXT NOT NULL,
            contact TEXT,
            address TEXT,
            factory_id INTEGER,
            green_leaf_value REAL DEFAULT 0,
            loans REAL DEFAULT 0,
            net_amount REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            last_fetched_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_teacoop_member_id ON tea_coop_members(member_id);
        CREATE INDEX IF NOT EXISTS idx_teacoop_member_no ON tea_coop_members(member_no);
        CREATE INDEX IF NOT EXISTS idx_teacoop_member_name ON tea_coop_members(full_name);
        CREATE INDEX IF NOT EXISTS idx_teacoop_member_factory ON tea_coop_members(factory_id);
        CREATE INDEX IF NOT EXISTS idx_teacoop_member_sync ON tea_coop_members(sync_status);
    `);

    // Tea Coop Payment History table - stores monthly payment data
    db.exec(`
        CREATE TABLE IF NOT EXISTS tea_coop_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            member_id TEXT NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            green_leaf_value REAL DEFAULT 0,
            loans REAL DEFAULT 0,
            net_amount REAL DEFAULT 0,
            payment_date TEXT,
            factory_id INTEGER,
            last_fetched_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            UNIQUE(member_id, year, month),
            FOREIGN KEY (member_id) REFERENCES tea_coop_members(member_id)
        );

        CREATE INDEX IF NOT EXISTS idx_teacoop_payment_member ON tea_coop_payments(member_id);
        CREATE INDEX IF NOT EXISTS idx_teacoop_payment_date ON tea_coop_payments(year, month);
        CREATE INDEX IF NOT EXISTS idx_teacoop_payment_sync ON tea_coop_payments(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_teacoop_payment_sync;
        DROP INDEX IF EXISTS idx_teacoop_payment_date;
        DROP INDEX IF EXISTS idx_teacoop_payment_member;
        DROP TABLE IF EXISTS tea_coop_payments;

        DROP INDEX IF EXISTS idx_teacoop_member_sync;
        DROP INDEX IF EXISTS idx_teacoop_member_factory;
        DROP INDEX IF EXISTS idx_teacoop_member_name;
        DROP INDEX IF EXISTS idx_teacoop_member_no;
        DROP INDEX IF EXISTS idx_teacoop_member_id;
        DROP TABLE IF EXISTS tea_coop_members;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
