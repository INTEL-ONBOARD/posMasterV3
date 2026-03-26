module.exports = {
    version: 37,
    name: 'create_returned_items_table',
    description: 'Create returned_items table for customer return/refund workflow',
    up(db) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS returned_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cloud_id TEXT,
                sale_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                stock_id INTEGER NOT NULL,
                batch_code TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL DEFAULT 0,
                reason TEXT,
                returned_by TEXT,
                returned_at TEXT DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                FOREIGN KEY (sale_id) REFERENCES sales_transactions(id),
                FOREIGN KEY (item_id) REFERENCES items(id),
                FOREIGN KEY (stock_id) REFERENCES stock(id)
            );
            CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returned_items(sale_id);
            CREATE INDEX IF NOT EXISTS idx_returns_returned_at ON returned_items(returned_at);
            CREATE INDEX IF NOT EXISTS idx_returns_sync_status ON returned_items(sync_status);
        `);
    },
    down(db) {
        db.exec(`
            DROP INDEX IF EXISTS idx_returns_sync_status;
            DROP INDEX IF EXISTS idx_returns_returned_at;
            DROP INDEX IF EXISTS idx_returns_sale_id;
            DROP TABLE IF EXISTS returned_items;
        `);
    }
};
