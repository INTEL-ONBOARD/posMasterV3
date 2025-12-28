/**
 * Migration 029: Add branch_id to transaction tables
 *
 * This migration adds branch tracking to:
 * - sales_transactions: To know which branch made the sale
 * - restock_transactions: To know which branch received the stock
 * - stock: To directly associate stock with branches
 *
 * Also adds audit fields for tracking who made changes and when
 */

const up = (db) => {
    console.log('[Migration 029] Adding branch_id to transaction tables...');

    // Add branch_id to sales_transactions
    const salesColumns = db.pragma('table_info(sales_transactions)');
    const salesHasBranchId = salesColumns.some(col => col.name === 'branch_id');

    if (!salesHasBranchId) {
        db.exec(`
            ALTER TABLE sales_transactions ADD COLUMN branch_id INTEGER REFERENCES branches(id);
        `);
        console.log('[Migration 029] Added branch_id to sales_transactions');

        // Create index for branch_id
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_sales_transactions_branch_id
            ON sales_transactions(branch_id);
        `);
    }

    // Add created_by (user who created the sale) to sales_transactions
    const salesHasCreatedBy = salesColumns.some(col => col.name === 'created_by');
    if (!salesHasCreatedBy) {
        db.exec(`
            ALTER TABLE sales_transactions ADD COLUMN created_by TEXT REFERENCES users(id);
        `);
        console.log('[Migration 029] Added created_by to sales_transactions');
    }

    // Add branch_id to restock_transactions
    const restockColumns = db.pragma('table_info(restock_transactions)');
    const restockHasBranchId = restockColumns.some(col => col.name === 'branch_id');

    if (!restockHasBranchId) {
        db.exec(`
            ALTER TABLE restock_transactions ADD COLUMN branch_id INTEGER REFERENCES branches(id);
        `);
        console.log('[Migration 029] Added branch_id to restock_transactions');

        // Create index for branch_id
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_restock_transactions_branch_id
            ON restock_transactions(branch_id);
        `);
    }

    // Add created_by to restock_transactions
    const restockHasCreatedBy = restockColumns.some(col => col.name === 'created_by');
    if (!restockHasCreatedBy) {
        db.exec(`
            ALTER TABLE restock_transactions ADD COLUMN created_by TEXT REFERENCES users(id);
        `);
        console.log('[Migration 029] Added created_by to restock_transactions');
    }

    // Add branch_id to stock table for direct branch association
    const stockColumns = db.pragma('table_info(stock)');
    const stockHasBranchId = stockColumns.some(col => col.name === 'branch_id');

    if (!stockHasBranchId) {
        db.exec(`
            ALTER TABLE stock ADD COLUMN branch_id INTEGER REFERENCES branches(id);
        `);
        console.log('[Migration 029] Added branch_id to stock');

        // Create index for branch_id
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_stock_branch_id
            ON stock(branch_id);
        `);
    }

    // Add branch_id to members (customers can be branch-specific or shared)
    const membersColumns = db.pragma('table_info(members)');
    const membersHasBranchId = membersColumns.some(col => col.name === 'branch_id');

    if (!membersHasBranchId) {
        // NULL branch_id means shared across all branches
        db.exec(`
            ALTER TABLE members ADD COLUMN branch_id INTEGER REFERENCES branches(id);
        `);
        console.log('[Migration 029] Added branch_id to members');

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_members_branch_id
            ON members(branch_id);
        `);
    }

    console.log('[Migration 029] Migration completed successfully');
};

const down = (db) => {
    console.log('[Migration 029] Rolling back branch_id additions...');

    // SQLite doesn't support DROP COLUMN easily
    // Would need to recreate tables, so leaving this as a no-op for safety
    console.log('[Migration 029] Rollback not implemented - columns will remain');
};

module.exports = {
    version: 29,
    name: '029_add_branch_to_transactions',
    up,
    down
};
