/**
 * Migration: Add sync columns to sales_items table
 * Version: 039
 *
 * Aligns local SQLite sales_items schema with cloud MySQL which already
 * has sync_status, cloud_id, and updated_at columns.
 */

const MIGRATION_VERSION = 39;
const MIGRATION_NAME = 'add_sync_columns_to_sales_items';

function up(db) {
    const tableInfo = db.prepare('PRAGMA table_info(sales_items)').all();
    const cols = tableInfo.map(c => c.name);

    if (!cols.includes('sync_status')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE sales_items SET sync_status = 'synced';`);
    }

    if (!cols.includes('cloud_id')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN cloud_id TEXT;`);
    }

    if (!cols.includes('updated_at')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE sales_items SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL;`);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sales_items_sync_status
        ON sales_items(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    console.log(`[Migration] Down migration not implemented for ${MIGRATION_NAME} (SQLite limitation)`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
