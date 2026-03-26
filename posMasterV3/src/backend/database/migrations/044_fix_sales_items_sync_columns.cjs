/**
 * Migration: Fix sales_items sync columns (safety net)
 * Version: 044
 *
 * Migration 039 was recorded as applied but sales_items is missing
 * sync_status, cloud_id, and updated_at columns. This migration
 * re-applies them idempotently.
 */

const MIGRATION_VERSION = 44;
const MIGRATION_NAME = 'fix_sales_items_sync_columns';

function up(db) {
    const tableInfo = db.prepare('PRAGMA table_info(sales_items)').all();
    const cols = tableInfo.map(c => c.name);

    if (!cols.includes('sync_status')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE sales_items SET sync_status = 'synced';`);
        console.log(`[Migration] ${MIGRATION_NAME}: added sync_status to sales_items`);
    }

    if (!cols.includes('cloud_id')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN cloud_id TEXT;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added cloud_id to sales_items`);
    }

    if (!cols.includes('updated_at')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE sales_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_items_sync_status ON sales_items(sync_status);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to sales_items`);
    }

    if (!cols.includes('created_at')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE sales_items SET created_at = datetime('now') WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to sales_items`);
    }

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
