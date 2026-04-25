/**
 * Migration: Create Sync Queue Table
 * Version: 003
 *
 * Creates the sync_queue table used by the legacy offline sync system.
 * It is retained for historical compatibility only.
 */

const MIGRATION_VERSION = 3;
const MIGRATION_NAME = 'create_sync_queue_table';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            priority INTEGER DEFAULT 0,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            processed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

/**
 * Rollback the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_sync_queue_priority;
        DROP INDEX IF EXISTS idx_sync_queue_entity;
        DROP INDEX IF EXISTS idx_sync_queue_status;
        DROP TABLE IF EXISTS sync_queue;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
