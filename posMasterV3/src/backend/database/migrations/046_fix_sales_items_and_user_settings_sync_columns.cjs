/**
 * Migration: Fix missing sync columns on sales_items and user_settings
 * Version: 046
 *
 * Migration 039 added sync columns to sales_items but was recorded as
 * applied on some devices without the ALTER TABLE statements executing
 * (silent rollback due to earlier migration failures in the same session).
 * user_settings never had cloud_id or sync_status added.
 */

const MIGRATION_VERSION = 46;
const MIGRATION_NAME = 'fix_sales_items_and_user_settings_sync_columns';

function up(db) {
    // ── sales_items ───────────────────────────────────────────────────────────
    const salesItemsCols = db.prepare('PRAGMA table_info(sales_items)').all().map(c => c.name);

    if (!salesItemsCols.includes('sync_status')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE sales_items SET sync_status = 'synced';`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_items_sync_status ON sales_items(sync_status);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added sync_status to sales_items`);
    }
    if (!salesItemsCols.includes('cloud_id')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN cloud_id TEXT;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added cloud_id to sales_items`);
    }
    if (!salesItemsCols.includes('updated_at')) {
        db.exec(`ALTER TABLE sales_items ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE sales_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to sales_items`);
    }

    // ── user_settings ─────────────────────────────────────────────────────────
    const userSettingsCols = db.prepare('PRAGMA table_info(user_settings)').all().map(c => c.name);

    if (!userSettingsCols.includes('cloud_id')) {
        db.exec(`ALTER TABLE user_settings ADD COLUMN cloud_id TEXT;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added cloud_id to user_settings`);
    }
    if (!userSettingsCols.includes('sync_status')) {
        db.exec(`ALTER TABLE user_settings ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
        db.exec(`UPDATE user_settings SET sync_status = 'pending' WHERE sync_status IS NULL;`);
        console.log(`[Migration] ${MIGRATION_NAME}: added sync_status to user_settings`);
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
