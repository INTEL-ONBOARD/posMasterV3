/**
 * Migration: Add updated_at column to sales_transactions table
 * Version: 038
 *
 * Required for version-based conflict resolution during cloud sync.
 * Without updated_at, the sync system falls back to created_at, which
 * is a fixed insertion timestamp and cannot detect updates.
 */

const MIGRATION_VERSION = 38;
const MIGRATION_NAME = 'add_updated_at_to_sales_transactions';

function up(db) {
    const tableInfo = db.prepare('PRAGMA table_info(sales_transactions)').all();
    const hasColumn = tableInfo.some(col => col.name === 'updated_at');

    if (!hasColumn) {
        db.exec(`
            ALTER TABLE sales_transactions ADD COLUMN updated_at TEXT;
        `);

        // Backfill existing rows: set updated_at = created_at so they are not
        // treated as infinitely old during the first sync after this migration
        db.exec(`
            UPDATE sales_transactions SET updated_at = created_at WHERE updated_at IS NULL;
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_sales_transactions_updated_at
            ON sales_transactions(updated_at);
        `);

        console.log(`[Migration] Applied: ${MIGRATION_NAME} - Added updated_at to sales_transactions`);
    } else {
        console.log(`[Migration] Skipped: ${MIGRATION_NAME} - Column already exists`);
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
