/**
 * Migration: Add sync columns to returned_items, disposed_items, and return_items
 * Version: 042
 *
 * These three tables were missing updated_at (and in the case of return_items,
 * also sync_status and cloud_id). Without updated_at, CloudSync falls back to a
 * full SELECT * every 1-second poll instead of an incremental WHERE updated_at > ?
 * query, causing unnecessary DB load and missed update detection.
 *
 * return_items also lacked sync_status/cloud_id, meaning sync completion could
 * never be tracked for supplier return records.
 */

const MIGRATION_VERSION = 42;
const MIGRATION_NAME = 'add_sync_columns_to_missing_tables';

function up(db) {
    // ── returned_items ──────────────────────────────────────────────────────
    const returnedInfo = db.prepare('PRAGMA table_info(returned_items)').all();
    const returnedCols = returnedInfo.map(c => c.name);

    if (!returnedCols.includes('updated_at')) {
        db.exec(`ALTER TABLE returned_items ADD COLUMN updated_at TEXT;`);
        // Backfill: use returned_at as the last-changed timestamp
        db.exec(`UPDATE returned_items SET updated_at = returned_at WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_returned_items_updated_at ON returned_items(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to returned_items`);
    }

    if (!returnedCols.includes('created_at')) {
        db.exec(`ALTER TABLE returned_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE returned_items SET created_at = returned_at WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to returned_items`);
    }

    // ── disposed_items ───────────────────────────────────────────────────────
    const disposedInfo = db.prepare('PRAGMA table_info(disposed_items)').all();
    const disposedCols = disposedInfo.map(c => c.name);

    if (!disposedCols.includes('updated_at')) {
        db.exec(`ALTER TABLE disposed_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE disposed_items SET updated_at = disposed_at WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_disposed_items_updated_at ON disposed_items(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to disposed_items`);
    }

    // ── return_items (restock supplier returns) ──────────────────────────────
    const returnInfo = db.prepare('PRAGMA table_info(return_items)').all();
    const returnCols = returnInfo.map(c => c.name);

    if (!returnCols.includes('cloud_id')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN cloud_id TEXT;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added cloud_id to return_items`);
    }

    if (!returnCols.includes('sync_status')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        // Mark all existing records as pending so they get picked up by cloud sync
        db.exec(`UPDATE return_items SET sync_status = 'pending' WHERE sync_status IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_return_items_sync_status ON return_items(sync_status);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added sync_status to return_items`);
    }

    if (!returnCols.includes('updated_at')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN updated_at TEXT;`);
        // No date column to backfill from — use current time so these get a one-time full sync
        db.exec(`UPDATE return_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_return_items_updated_at ON return_items(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to return_items`);
    }

    if (!returnCols.includes('created_at')) {
        db.exec(`ALTER TABLE return_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE return_items SET created_at = datetime('now') WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to return_items`);
    }
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
