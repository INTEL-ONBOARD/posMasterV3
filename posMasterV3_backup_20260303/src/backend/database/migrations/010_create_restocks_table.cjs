/**
 * Migration: Create Restock Transactions Tables
 * Version: 010
 */

const MIGRATION_VERSION = 10;
const MIGRATION_NAME = 'create_restocks_table';

function up(db) {
    db.exec(`
        -- Main restock transactions table
        CREATE TABLE IF NOT EXISTS restock_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            invoice_no TEXT UNIQUE NOT NULL,
            bill_no TEXT,
            supplier_id INTEGER,
            prepared_by TEXT,
            authorized_by TEXT,
            payment_method TEXT,
            discount REAL DEFAULT 0,
            expenses REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            cash_amount REAL DEFAULT 0,
            change_amount REAL DEFAULT 0,
            execution_level TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'completed',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_restock_invoice ON restock_transactions(invoice_no);
        CREATE INDEX IF NOT EXISTS idx_restock_supplier ON restock_transactions(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_restock_date ON restock_transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_restock_sync_status ON restock_transactions(sync_status);

        -- Restock items (items added in restock)
        CREATE TABLE IF NOT EXISTS restock_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restock_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            batch_code TEXT NOT NULL,
            quantity REAL NOT NULL,
            stock_price REAL NOT NULL,
            retail_price REAL NOT NULL,
            expiry_date TEXT,
            FOREIGN KEY (restock_id) REFERENCES restock_transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_restock_items_restock ON restock_items(restock_id);
        CREATE INDEX IF NOT EXISTS idx_restock_items_item ON restock_items(item_id);

        -- Return items (items returned in restock)
        CREATE TABLE IF NOT EXISTS return_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restock_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            batch_code TEXT NOT NULL,
            quantity REAL NOT NULL,
            description TEXT,
            FOREIGN KEY (restock_id) REFERENCES restock_transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_return_items_restock ON return_items(restock_id);
        CREATE INDEX IF NOT EXISTS idx_return_items_item ON return_items(item_id);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_return_items_item;
        DROP INDEX IF EXISTS idx_return_items_restock;
        DROP TABLE IF EXISTS return_items;

        DROP INDEX IF EXISTS idx_restock_items_item;
        DROP INDEX IF EXISTS idx_restock_items_restock;
        DROP TABLE IF EXISTS restock_items;

        DROP INDEX IF EXISTS idx_restock_sync_status;
        DROP INDEX IF EXISTS idx_restock_date;
        DROP INDEX IF EXISTS idx_restock_supplier;
        DROP INDEX IF EXISTS idx_restock_invoice;
        DROP TABLE IF EXISTS restock_transactions;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
