/**
 * Migration: Create Categories Table
 * Version: 004
 */

const MIGRATION_VERSION = 4;
const MIGRATION_NAME = 'create_categories_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            brand TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_categories_brand ON categories(brand);
        CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
        CREATE INDEX IF NOT EXISTS idx_categories_sync_status ON categories(sync_status);
    `);

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_categories_sync_status;
        DROP INDEX IF EXISTS idx_categories_type;
        DROP INDEX IF EXISTS idx_categories_brand;
        DROP TABLE IF EXISTS categories;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
