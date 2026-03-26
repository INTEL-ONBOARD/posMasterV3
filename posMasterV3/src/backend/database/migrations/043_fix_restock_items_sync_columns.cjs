/**
 * Migration: Fix restock_items sync columns (safety net)
 * Version: 043
 *
 * Migration 040 added sync columns to restock_items but was blocked
 * from running due to migration 037 missing the 'name' field.
 * This migration re-applies the same changes idempotently.
 */

const MIGRATION_VERSION = 43;
const MIGRATION_NAME = 'fix_restock_items_sync_columns';

function up(db) {
    const tableInfo = db.prepare('PRAGMA table_info(restock_items)').all();
    const cols = tableInfo.map(c => c.name);

    if (!cols.includes('sync_status')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE restock_items SET sync_status = 'synced';`);
        console.log(`[Migration] ${MIGRATION_NAME}: added sync_status to restock_items`);
    }

    if (!cols.includes('cloud_id')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN cloud_id TEXT;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added cloud_id to restock_items`);
    }

    if (!cols.includes('updated_at')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE restock_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to restock_items`);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_restock_items_sync_status
        ON restock_items(sync_status);
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
