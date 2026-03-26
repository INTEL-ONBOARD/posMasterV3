/**
 * Migration: Add updated_at to offers_discounts and login_history
 * Version: 041
 *
 * Without updated_at, the cloud sync does a full SELECT * on every 1-second poll,
 * which is expensive. Adding updated_at enables incremental pulls (only fetch rows
 * changed since last pull) and also allows proper conflict resolution.
 */

const MIGRATION_VERSION = 41;
const MIGRATION_NAME = 'add_updated_at_to_offers_and_login_history';

function up(db) {
    // --- offers_discounts ---
    const offersInfo = db.prepare('PRAGMA table_info(offers_discounts)').all();
    if (!offersInfo.some(col => col.name === 'updated_at')) {
        db.exec(`ALTER TABLE offers_discounts ADD COLUMN updated_at TEXT;`);
        // Backfill: set updated_at = created_at so first sync doesn't re-fetch everything
        db.exec(`UPDATE offers_discounts SET updated_at = created_at WHERE updated_at IS NULL;`);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_offers_discounts_updated_at
            ON offers_discounts(updated_at);
        `);
        console.log(`[Migration] Applied: ${MIGRATION_NAME} - Added updated_at to offers_discounts`);
    } else {
        console.log(`[Migration] Skipped offers_discounts.updated_at - column already exists`);
    }

    // --- login_history ---
    const loginInfo = db.prepare('PRAGMA table_info(login_history)').all();
    if (!loginInfo.some(col => col.name === 'updated_at')) {
        db.exec(`ALTER TABLE login_history ADD COLUMN updated_at TEXT;`);
        // Backfill: use logout_at when available (last meaningful change), else login_at
        db.exec(`
            UPDATE login_history
            SET updated_at = COALESCE(logout_at, login_at)
            WHERE updated_at IS NULL;
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_login_history_updated_at
            ON login_history(updated_at);
        `);
        console.log(`[Migration] Applied: ${MIGRATION_NAME} - Added updated_at to login_history`);
    } else {
        console.log(`[Migration] Skipped login_history.updated_at - column already exists`);
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
