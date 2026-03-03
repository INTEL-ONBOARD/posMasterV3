/**
 * Migration: Create Suppliers Table
 * Version: 007
 */

const MIGRATION_VERSION = 7;
const MIGRATION_NAME = 'create_suppliers_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            supplier_name TEXT NOT NULL,
            contact TEXT,
            type TEXT,
            supplier_address TEXT,
            status INTEGER DEFAULT 1,
            current_amount REAL DEFAULT 0,
            previous_amount REAL DEFAULT 0,
            account_number TEXT,
            account_bank TEXT,
            account_branch TEXT,
            account_name TEXT,
            account_nickname TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
        CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
        CREATE INDEX IF NOT EXISTS idx_suppliers_sync_status ON suppliers(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_suppliers_sync_status;
        DROP INDEX IF EXISTS idx_suppliers_status;
        DROP INDEX IF EXISTS idx_suppliers_name;
        DROP TABLE IF EXISTS suppliers;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
