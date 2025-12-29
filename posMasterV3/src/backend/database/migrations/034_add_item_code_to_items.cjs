/**
 * Migration: Add item_code column to items table
 * Version: 034
 *
 * This adds a product code field that is separate from SKU.
 * SKU is the stock-keeping unit (internal identifier)
 * item_code is the product code (often from manufacturer/supplier)
 */

const MIGRATION_VERSION = 34;
const MIGRATION_NAME = 'add_item_code_to_items';

function up(db) {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(items)").all();
    const hasItemCode = tableInfo.some(col => col.name === 'item_code');

    if (!hasItemCode) {
        db.exec(`
            ALTER TABLE items ADD COLUMN item_code TEXT;
        `);

        // Create index for item_code searches
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_items_item_code ON items(item_code);
        `);

        console.log(`[Migration] Added item_code column to items table`);
    } else {
        console.log(`[Migration] item_code column already exists, skipping`);
    }

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    // SQLite doesn't support DROP COLUMN directly, would need table recreation
    // For safety, we'll just drop the index
    db.exec(`
        DROP INDEX IF EXISTS idx_items_item_code;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME} (index only, column preserved)`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
