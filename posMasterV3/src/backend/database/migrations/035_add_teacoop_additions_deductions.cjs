/**
 * Migration: Add additions and deductions columns to Tea Coop tables
 * Version: 035
 *
 * Adds additions and deductions fields to tea_coop_members and tea_coop_payments
 * These fields track additional income and deductions for tea coop member payments.
 */

const MIGRATION_VERSION = 35;
const MIGRATION_NAME = 'add_teacoop_additions_deductions';

function up(db) {
    // Check and add columns to tea_coop_members
    const membersTableInfo = db.prepare("PRAGMA table_info(tea_coop_members)").all();
    const membersHasAdditions = membersTableInfo.some(col => col.name === 'additions');
    const membersHasDeductions = membersTableInfo.some(col => col.name === 'deductions');

    if (!membersHasAdditions) {
        db.exec(`ALTER TABLE tea_coop_members ADD COLUMN additions REAL DEFAULT 0;`);
        console.log(`[Migration] Added additions column to tea_coop_members`);
    }

    if (!membersHasDeductions) {
        db.exec(`ALTER TABLE tea_coop_members ADD COLUMN deductions REAL DEFAULT 0;`);
        console.log(`[Migration] Added deductions column to tea_coop_members`);
    }

    // Check and add columns to tea_coop_payments
    const paymentsTableInfo = db.prepare("PRAGMA table_info(tea_coop_payments)").all();
    const paymentsHasAdditions = paymentsTableInfo.some(col => col.name === 'additions');
    const paymentsHasDeductions = paymentsTableInfo.some(col => col.name === 'deductions');

    if (!paymentsHasAdditions) {
        db.exec(`ALTER TABLE tea_coop_payments ADD COLUMN additions REAL DEFAULT 0;`);
        console.log(`[Migration] Added additions column to tea_coop_payments`);
    }

    if (!paymentsHasDeductions) {
        db.exec(`ALTER TABLE tea_coop_payments ADD COLUMN deductions REAL DEFAULT 0;`);
        console.log(`[Migration] Added deductions column to tea_coop_payments`);
    }

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    // SQLite doesn't support DROP COLUMN directly in older versions
    // For safety, we'll log that columns are preserved
    console.log(`[Migration] Rolled back: ${MIGRATION_NAME} (columns preserved - SQLite limitation)`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
