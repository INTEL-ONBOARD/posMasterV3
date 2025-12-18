/**
 * Migration: Create Stock Table
 * Version: 009
 */

const MIGRATION_VERSION = 9;
const MIGRATION_NAME = 'create_stock_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            item_id INTEGER NOT NULL,
            batch_code TEXT NOT NULL,
            quantity REAL DEFAULT 0,
            threshold_limit REAL DEFAULT 0,
            stock_price REAL DEFAULT 0,
            retail_price REAL DEFAULT 0,
            discount_price REAL DEFAULT 0,
            expiry_date TEXT,
            availability INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            UNIQUE (item_id, batch_code)
        );

        CREATE INDEX IF NOT EXISTS idx_stock_item ON stock(item_id);
        CREATE INDEX IF NOT EXISTS idx_stock_batch ON stock(batch_code);
        CREATE INDEX IF NOT EXISTS idx_stock_availability ON stock(availability);
        CREATE INDEX IF NOT EXISTS idx_stock_expiry ON stock(expiry_date);
        CREATE INDEX IF NOT EXISTS idx_stock_sync_status ON stock(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_stock_sync_status;
        DROP INDEX IF EXISTS idx_stock_expiry;
        DROP INDEX IF EXISTS idx_stock_availability;
        DROP INDEX IF EXISTS idx_stock_batch;
        DROP INDEX IF EXISTS idx_stock_item;
        DROP TABLE IF EXISTS stock;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
