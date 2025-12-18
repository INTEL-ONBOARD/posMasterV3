/**
 * Migration: Create Sales Transactions Tables
 * Version: 012
 */

const MIGRATION_VERSION = 12;
const MIGRATION_NAME = 'create_sales_table';

function up(db) {
    db.exec(`
        -- Main sales transactions table
        CREATE TABLE IF NOT EXISTS sales_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            invoice_no TEXT UNIQUE NOT NULL,
            member_id INTEGER,
            cashier_id TEXT,
            payment_method TEXT DEFAULT 'cash',
            credit_duration TEXT,
            subtotal REAL DEFAULT 0,
            discount REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            cash_received REAL DEFAULT 0,
            change_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'completed',
            is_held INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales_transactions(invoice_no);
        CREATE INDEX IF NOT EXISTS idx_sales_member ON sales_transactions(member_id);
        CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales_transactions(cashier_id);
        CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_sales_status ON sales_transactions(status);
        CREATE INDEX IF NOT EXISTS idx_sales_held ON sales_transactions(is_held);
        CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales_transactions(sync_status);

        -- Sales items table
        CREATE TABLE IF NOT EXISTS sales_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            stock_id INTEGER NOT NULL,
            batch_code TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            discount REAL DEFAULT 0,
            total_price REAL NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sales_items_sale ON sales_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_sales_items_item ON sales_items(item_id);
        CREATE INDEX IF NOT EXISTS idx_sales_items_stock ON sales_items(stock_id);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_sales_items_stock;
        DROP INDEX IF EXISTS idx_sales_items_item;
        DROP INDEX IF EXISTS idx_sales_items_sale;
        DROP TABLE IF EXISTS sales_items;

        DROP INDEX IF EXISTS idx_sales_sync_status;
        DROP INDEX IF EXISTS idx_sales_held;
        DROP INDEX IF EXISTS idx_sales_status;
        DROP INDEX IF EXISTS idx_sales_date;
        DROP INDEX IF EXISTS idx_sales_cashier;
        DROP INDEX IF EXISTS idx_sales_member;
        DROP INDEX IF EXISTS idx_sales_invoice;
        DROP TABLE IF EXISTS sales_transactions;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
