/**
 * Migration: Fix missing sync columns on return_items and disposed_items
 * Version: 044
 *
 * Migration 042 attempted to add these columns but was silently skipped on
 * devices where returned_items did not yet exist — the transaction rolled back
 * before reaching return_items and disposed_items. This migration re-applies
 * those changes idempotently using PRAGMA table_info guards.
 */

const MIGRATION_VERSION = 44;
const MIGRATION_NAME = 'fix_missing_sync_columns';

function up(db) {
    // ── return_items ─────────────────────────────────────────────────────────
    const returnCols = db.prepare('PRAGMA table_info(return_items)').all().map(c => c.name);

    if (!returnCols.includes('cloud_id')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN cloud_id TEXT;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added cloud_id to return_items`);
    }
    if (!returnCols.includes('sync_status')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE return_items SET sync_status = 'pending' WHERE sync_status IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_return_items_sync_status ON return_items(sync_status);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added sync_status to return_items`);
    }
    if (!returnCols.includes('updated_at')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE return_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_return_items_updated_at ON return_items(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to return_items`);
    }
    if (!returnCols.includes('created_at')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE return_items SET created_at = datetime('now') WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to return_items`);
    }

    // ── disposed_items ───────────────────────────────────────────────────────
    const disposedCols = db.prepare('PRAGMA table_info(disposed_items)').all().map(c => c.name);

    if (!disposedCols.includes('updated_at')) {
        db.exec(`ALTER TABLE disposed_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE disposed_items SET updated_at = disposed_at WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_disposed_items_updated_at ON disposed_items(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to disposed_items`);
    }
    if (!disposedCols.includes('created_at')) {
        db.exec(`ALTER TABLE disposed_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE disposed_items SET created_at = disposed_at WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to disposed_items`);
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
