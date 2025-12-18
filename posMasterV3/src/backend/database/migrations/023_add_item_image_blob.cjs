/**
 * Migration: Add item_image_blob column to items table
 * Version: 023
 *
 * Adds a BLOB column to store item images directly in the database
 * as base64-encoded data for offline support.
 */

const MIGRATION_VERSION = 23;
const MIGRATION_NAME = 'add_item_image_blob';

function up(db) {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(items)").all();
    const hasColumn = tableInfo.some(col => col.name === 'item_image_blob');

    if (!hasColumn) {
        db.exec(`
            ALTER TABLE items ADD COLUMN item_image_blob TEXT;
        `);
        console.log(`[Migration] Applied: ${MIGRATION_NAME} - Added item_image_blob column`);
    } else {
        console.log(`[Migration] Skipped: ${MIGRATION_NAME} - Column already exists`);
    }
}

function down(db) {
    // SQLite doesn't support DROP COLUMN directly in older versions
    // We'll create a new table without the column and migrate data
    db.exec(`
        CREATE TABLE IF NOT EXISTS items_backup AS SELECT
            id, cloud_id, sku, item_name, item_image_url, maximum_capacity,
            category_id, uom_id, branch_id, availability, created_at, updated_at, sync_status
        FROM items;

        DROP TABLE items;

        CREATE TABLE items (
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

        INSERT INTO items SELECT * FROM items_backup;
        DROP TABLE items_backup;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name);
        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_uom ON items(uom_id);
        CREATE INDEX IF NOT EXISTS idx_items_branch ON items(branch_id);
        CREATE INDEX IF NOT EXISTS idx_items_availability ON items(availability);
        CREATE INDEX IF NOT EXISTS idx_items_sync_status ON items(sync_status);
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
