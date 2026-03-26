/**
 * Migration: Add sync columns to restock_items table
 * Version: 040
 *
 * Aligns local SQLite restock_items schema with cloud MySQL which already
 * has sync_status, cloud_id, and updated_at columns.
 */

const MIGRATION_VERSION = 40;
const MIGRATION_NAME = 'add_sync_columns_to_restock_items';

function up(db) {
    const tableInfo = db.prepare('PRAGMA table_info(restock_items)').all();
    const cols = tableInfo.map(c => c.name);

    if (!cols.includes('sync_status')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE restock_items SET sync_status = 'synced';`);
    }

    if (!cols.includes('cloud_id')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN cloud_id TEXT;`);
    }

    if (!cols.includes('updated_at')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN updated_at TEXT;`);
        // Avoid referencing created_at — it may not exist on older schema devices
        db.exec(`UPDATE restock_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
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
