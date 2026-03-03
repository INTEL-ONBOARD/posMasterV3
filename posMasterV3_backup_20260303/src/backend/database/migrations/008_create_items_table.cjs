/**
 * Migration: Create Items (Item Registry) Table
 * Version: 008
 */

const MIGRATION_VERSION = 8;
const MIGRATION_NAME = 'create_items_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            sku TEXT UNIQUE NOT NULL,
            item_name TEXT NOT NULL,
            item_image_url TEXT,
            maximum_capacity INTEGER DEFAULT 0,
            category_id INTEGER,
            uom_id INTEGER,
            branch_id INTEGER,
            availability INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (uom_id) REFERENCES units_of_measurement(id) ON DELETE SET NULL,
            FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name);
        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_uom ON items(uom_id);
        CREATE INDEX IF NOT EXISTS idx_items_branch ON items(branch_id);
        CREATE INDEX IF NOT EXISTS idx_items_availability ON items(availability);
        CREATE INDEX IF NOT EXISTS idx_items_sync_status ON items(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_items_sync_status;
        DROP INDEX IF EXISTS idx_items_availability;
        DROP INDEX IF EXISTS idx_items_branch;
        DROP INDEX IF EXISTS idx_items_uom;
        DROP INDEX IF EXISTS idx_items_category;
        DROP INDEX IF EXISTS idx_items_name;
        DROP INDEX IF EXISTS idx_items_sku;
        DROP TABLE IF EXISTS items;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
