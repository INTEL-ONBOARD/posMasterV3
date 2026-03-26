/**
 * Migration: Fix missing updated_at columns (safety net)
 * Version: 045
 *
 * Migrations 038 and 041 were recorded as applied but several tables
 * are still missing updated_at. This migration re-applies them idempotently.
 */

const MIGRATION_VERSION = 45;
const MIGRATION_NAME = 'fix_missing_updated_at_columns';

function up(db) {
    // --- sales_transactions ---
    const salesTxInfo = db.prepare('PRAGMA table_info(sales_transactions)').all();
    const salesTxCols = salesTxInfo.map(c => c.name);

    if (!salesTxCols.includes('updated_at')) {
        db.exec(`ALTER TABLE sales_transactions ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE sales_transactions SET updated_at = created_at WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_transactions_updated_at ON sales_transactions(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to sales_transactions`);
    }

    // --- offers_discounts ---
    const offersInfo = db.prepare('PRAGMA table_info(offers_discounts)').all();
    const offersCols = offersInfo.map(c => c.name);

    if (!offersCols.includes('updated_at')) {
        db.exec(`ALTER TABLE offers_discounts ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE offers_discounts SET updated_at = created_at WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_offers_discounts_updated_at ON offers_discounts(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to offers_discounts`);
    }

    // --- login_history ---
    const loginInfo = db.prepare('PRAGMA table_info(login_history)').all();
    const loginCols = loginInfo.map(c => c.name);

    if (!loginCols.includes('updated_at')) {
        db.exec(`ALTER TABLE login_history ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE login_history SET updated_at = COALESCE(logout_at, login_at) WHERE updated_at IS NULL;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_login_history_updated_at ON login_history(updated_at);`);
        console.log(`[Migration] ${MIGRATION_NAME}: added updated_at to login_history`);
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
