/**
 * Migration: Create Miscellaneous Tables (Dispose, Offers, Price History)
 * Version: 013
 */

const MIGRATION_VERSION = 13;
const MIGRATION_NAME = 'create_misc_tables';

function up(db) {
    db.exec(`
        -- Disposed items table
        CREATE TABLE IF NOT EXISTS disposed_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            item_id INTEGER NOT NULL,
            stock_id INTEGER NOT NULL,
            batch_code TEXT NOT NULL,
            quantity REAL NOT NULL,
            reason TEXT,
            disposed_by TEXT,
            disposed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_disposed_item ON disposed_items(item_id);
        CREATE INDEX IF NOT EXISTS idx_disposed_stock ON disposed_items(stock_id);
        CREATE INDEX IF NOT EXISTS idx_disposed_date ON disposed_items(disposed_at);
        CREATE INDEX IF NOT EXISTS idx_disposed_sync ON disposed_items(sync_status);

        -- Offers and discounts table
        CREATE TABLE IF NOT EXISTS offers_discounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            discount_type TEXT DEFAULT 'percentage',
            discount_value REAL NOT NULL,
            min_purchase REAL DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            is_active INTEGER DEFAULT 1,
            applies_to TEXT DEFAULT 'all',
            target_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_offers_active ON offers_discounts(is_active);
        CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers_discounts(start_date, end_date);
        CREATE INDEX IF NOT EXISTS idx_offers_sync ON offers_discounts(sync_status);

        -- Price change history table
        CREATE TABLE IF NOT EXISTS price_change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_id INTEGER NOT NULL,
            old_stock_price REAL,
            new_stock_price REAL,
            old_retail_price REAL,
            new_retail_price REAL,
            changed_by TEXT,
            reason TEXT,
            changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_price_history_stock ON price_change_history(stock_id);
        CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_change_history(changed_at);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_price_history_date;
        DROP INDEX IF EXISTS idx_price_history_stock;
        DROP TABLE IF EXISTS price_change_history;

        DROP INDEX IF EXISTS idx_offers_sync;
        DROP INDEX IF EXISTS idx_offers_dates;
        DROP INDEX IF EXISTS idx_offers_active;
        DROP TABLE IF EXISTS offers_discounts;

        DROP INDEX IF EXISTS idx_disposed_sync;
        DROP INDEX IF EXISTS idx_disposed_date;
        DROP INDEX IF EXISTS idx_disposed_stock;
        DROP INDEX IF EXISTS idx_disposed_item;
        DROP TABLE IF EXISTS disposed_items;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
