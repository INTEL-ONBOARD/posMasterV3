/**
 * Migration: Add missing created_at to restock_items
 * Version: 048
 *
 * restock_items was originally created without created_at (migration 010).
 * Migration 040 added sync_status/cloud_id/updated_at but not created_at.
 * The cloud MySQL schema already has created_at — this adds it locally
 * so the columns match and sync stops failing with "Unknown column" errors.
 */

const MIGRATION_VERSION = 48;
const MIGRATION_NAME = 'fix_restock_items_created_at';

function up(db) {
    const cols = db.prepare('PRAGMA table_info(restock_items)').all().map(c => c.name);

    if (!cols.includes('created_at')) {
        db.exec(`ALTER TABLE restock_items ADD COLUMN created_at TEXT;`);
        db.exec(`UPDATE restock_items SET created_at = updated_at WHERE created_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added created_at to restock_items`);
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
