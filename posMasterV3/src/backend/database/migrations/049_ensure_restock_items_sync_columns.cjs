/**
 * Migration: Ensure restock_items has all required sync columns
 * Version: 049
 *
 * Safety-net migration for devices where migrations 040/043 were recorded
 * as applied but the columns were never actually added (e.g., due to a
 * migration failure that still recorded the version). Uses PRAGMA table_info
 * to check idempotently before altering.
 *
 * Columns ensured: sync_status, cloud_id, updated_at, created_at
 */

const MIGRATION_VERSION = 49;
const MIGRATION_NAME = 'ensure_restock_items_sync_columns';

function up(db) {
    const cols = db.prepare('PRAGMA table_info(restock_items)').all().map(c => c.name);

    if (!cols.includes('sync_status')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE restock_items SET sync_status = 'synced' WHERE sync_status IS NULL;`);
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

    if (!cols.includes('created_at')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE restock_items SET created_at = COALESCE(updated_at, datetime('now')) WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to restock_items`);
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
