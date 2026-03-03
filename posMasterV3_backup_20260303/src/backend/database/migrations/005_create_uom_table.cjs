/**
 * Migration: Create Units of Measurement Table
 * Version: 005
 */

const MIGRATION_VERSION = 5;
const MIGRATION_NAME = 'create_uom_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS units_of_measurement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            symbol TEXT NOT NULL,
            unit_name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_uom_symbol ON units_of_measurement(symbol);
        CREATE INDEX IF NOT EXISTS idx_uom_sync_status ON units_of_measurement(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_uom_sync_status;
        DROP INDEX IF EXISTS idx_uom_symbol;
        DROP TABLE IF EXISTS units_of_measurement;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
