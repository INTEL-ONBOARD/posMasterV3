/**
 * Migration: Add updated_at column to restock_transactions table
 * Version: 024
 *
 * This column is required for version-based conflict resolution during cloud sync.
 * Without updated_at, the sync system cannot compare timestamps to determine
 * which record (local or cloud) is newer.
 */

const MIGRATION_VERSION = 24;
const MIGRATION_NAME = 'add_updated_at_to_restocks';

function up(db) {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(restock_transactions)").all();
    const hasColumn = tableInfo.some(col => col.name === 'updated_at');

    if (!hasColumn) {
        db.exec(`
            ALTER TABLE restock_transactions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
        `);

        // Update existing records to have updated_at = created_at
        db.exec(`
            UPDATE restock_transactions SET updated_at = created_at WHERE updated_at IS NULL;
        `);

        // Create index for faster sync queries
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_restock_transactions_updated_at ON restock_transactions(updated_at);
        `);

        console.log(`[Migration] Applied: ${MIGRATION_NAME} - Added updated_at column to restock_transactions`);
    } else {
        console.log(`[Migration] Skipped: ${MIGRATION_NAME} - Column already exists`);
    }
}

function down(db) {
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    // For safety, we won't implement down migration for this
    console.log(`[Migration] Down migration not implemented for ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
