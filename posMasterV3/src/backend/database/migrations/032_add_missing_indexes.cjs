/**
 * Migration: Add Missing Indexes
 * Version: 032
 *
 * Adds indexes for commonly queried columns to improve performance.
 * These indexes are based on common query patterns in the application.
 */

const MIGRATION_VERSION = 32;
const MIGRATION_NAME = 'add_missing_indexes';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    console.log('[Migration 032] Adding missing database indexes...');

    const indexes = [
        // Stock table indexes
        { table: 'stock', name: 'idx_stock_item_id', columns: 'item_id' },
        { table: 'stock', name: 'idx_stock_branch_id', columns: 'branch_id' },
        { table: 'stock', name: 'idx_stock_batch_code', columns: 'batch_code' },
        { table: 'stock', name: 'idx_stock_availability', columns: 'availability' },
        { table: 'stock', name: 'idx_stock_expiry_date', columns: 'expiry_date' },
        { table: 'stock', name: 'idx_stock_item_branch', columns: 'item_id, branch_id' },

        // Items table indexes
        { table: 'items', name: 'idx_items_category_id', columns: 'category_id' },
        { table: 'items', name: 'idx_items_uom_id', columns: 'uom_id' },
        { table: 'items', name: 'idx_items_availability', columns: 'availability' },
        { table: 'items', name: 'idx_items_sync_status', columns: 'sync_status' },

        // Sales transactions indexes
        { table: 'sales_transactions', name: 'idx_sales_branch_id', columns: 'branch_id' },
        { table: 'sales_transactions', name: 'idx_sales_member_id', columns: 'member_id' },
        { table: 'sales_transactions', name: 'idx_sales_cashier_id', columns: 'cashier_id' },
        { table: 'sales_transactions', name: 'idx_sales_created_at', columns: 'created_at' },
        { table: 'sales_transactions', name: 'idx_sales_is_held', columns: 'is_held' },
        { table: 'sales_transactions', name: 'idx_sales_sync_status', columns: 'sync_status' },

        // Sales items indexes
        { table: 'sales_items', name: 'idx_sales_items_sale_id', columns: 'sale_id' },
        { table: 'sales_items', name: 'idx_sales_items_item_id', columns: 'item_id' },
        { table: 'sales_items', name: 'idx_sales_items_stock_id', columns: 'stock_id' },

        // Restock transactions indexes
        { table: 'restock_transactions', name: 'idx_restock_branch_id', columns: 'branch_id' },
        { table: 'restock_transactions', name: 'idx_restock_supplier_id', columns: 'supplier_id' },
        { table: 'restock_transactions', name: 'idx_restock_created_at', columns: 'created_at' },
        { table: 'restock_transactions', name: 'idx_restock_sync_status', columns: 'sync_status' },

        // Restock items indexes
        { table: 'restock_items', name: 'idx_restock_items_restock_id', columns: 'restock_id' },
        { table: 'restock_items', name: 'idx_restock_items_item_id', columns: 'item_id' },

        // Members table indexes
        { table: 'members', name: 'idx_members_branch_id', columns: 'branch_id' },
        { table: 'members', name: 'idx_members_is_active', columns: 'is_active' },
        { table: 'members', name: 'idx_members_sync_status', columns: 'sync_status' },

        // Users table indexes
        { table: 'users', name: 'idx_users_branch_id', columns: 'branch_id' },
        { table: 'users', name: 'idx_users_is_active', columns: 'is_active' },
        { table: 'users', name: 'idx_users_sync_status', columns: 'sync_status' },

        // Login history indexes
        { table: 'login_history', name: 'idx_login_history_user_id', columns: 'user_id' },
        { table: 'login_history', name: 'idx_login_history_branch_id', columns: 'branch_id' },
        { table: 'login_history', name: 'idx_login_history_login_at', columns: 'login_at' },
        { table: 'login_history', name: 'idx_login_history_status', columns: 'status' },

        // Active sessions indexes
        { table: 'active_sessions', name: 'idx_active_sessions_user_id', columns: 'user_id' },
        { table: 'active_sessions', name: 'idx_active_sessions_device_id', columns: 'device_id' },
        { table: 'active_sessions', name: 'idx_active_sessions_is_active', columns: 'is_active' },

        // Audit log indexes
        { table: 'audit_log', name: 'idx_audit_log_table_name', columns: 'table_name' },
        { table: 'audit_log', name: 'idx_audit_log_record_id', columns: 'record_id' },
        { table: 'audit_log', name: 'idx_audit_log_user_id', columns: 'user_id' },
        { table: 'audit_log', name: 'idx_audit_log_branch_id', columns: 'branch_id' },
        { table: 'audit_log', name: 'idx_audit_log_timestamp', columns: 'timestamp' },

        // Categories indexes
        { table: 'categories', name: 'idx_categories_sync_status', columns: 'sync_status' },

        // Suppliers indexes
        { table: 'suppliers', name: 'idx_suppliers_status', columns: 'status' },
        { table: 'suppliers', name: 'idx_suppliers_sync_status', columns: 'sync_status' },

        // Units of measurement indexes
        { table: 'units_of_measurement', name: 'idx_uom_sync_status', columns: 'sync_status' },

        // Branches indexes
        { table: 'branches', name: 'idx_branches_is_active', columns: 'is_active' },
        { table: 'branches', name: 'idx_branches_sync_status', columns: 'sync_status' },

        // Payment methods indexes
        { table: 'payment_methods', name: 'idx_payment_methods_is_active', columns: 'is_active' },
        { table: 'payment_methods', name: 'idx_payment_methods_type', columns: 'type' }
    ];

    let created = 0;
    let skipped = 0;

    for (const idx of indexes) {
        try {
            // Check if table exists
            const tableExists = db.prepare(`
                SELECT name FROM sqlite_master
                WHERE type='table' AND name = ?
            `).get(idx.table);

            if (!tableExists) {
                console.log(`[Migration 032] Table ${idx.table} does not exist, skipping index ${idx.name}`);
                skipped++;
                continue;
            }

            // Check if index already exists
            const indexExists = db.prepare(`
                SELECT name FROM sqlite_master
                WHERE type='index' AND name = ?
            `).get(idx.name);

            if (indexExists) {
                skipped++;
                continue;
            }

            // Create the index
            db.prepare(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (${idx.columns})`).run();
            created++;
            console.log(`[Migration 032] Created index: ${idx.name} on ${idx.table}(${idx.columns})`);
        } catch (error) {
            console.error(`[Migration 032] Failed to create index ${idx.name}:`, error.message);
        }
    }

    console.log(`[Migration 032] Created ${created} indexes, skipped ${skipped}`);
    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

/**
 * Reverse the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    console.log('[Migration 032] Dropping indexes...');

    // List all indexes we created
    const indexNames = [
        'idx_stock_item_id', 'idx_stock_branch_id', 'idx_stock_batch_code',
        'idx_stock_availability', 'idx_stock_expiry_date', 'idx_stock_item_branch',
        'idx_items_category_id', 'idx_items_uom_id', 'idx_items_availability', 'idx_items_sync_status',
        'idx_sales_branch_id', 'idx_sales_member_id', 'idx_sales_cashier_id',
        'idx_sales_created_at', 'idx_sales_is_held', 'idx_sales_sync_status',
        'idx_sales_items_sale_id', 'idx_sales_items_item_id', 'idx_sales_items_stock_id',
        'idx_restock_branch_id', 'idx_restock_supplier_id', 'idx_restock_created_at', 'idx_restock_sync_status',
        'idx_restock_items_restock_id', 'idx_restock_items_item_id',
        'idx_members_branch_id', 'idx_members_is_active', 'idx_members_sync_status',
        'idx_users_branch_id', 'idx_users_is_active', 'idx_users_sync_status',
        'idx_login_history_user_id', 'idx_login_history_branch_id', 'idx_login_history_login_at', 'idx_login_history_status',
        'idx_active_sessions_user_id', 'idx_active_sessions_device_id', 'idx_active_sessions_is_active',
        'idx_audit_log_table_name', 'idx_audit_log_record_id', 'idx_audit_log_user_id', 'idx_audit_log_branch_id', 'idx_audit_log_timestamp',
        'idx_categories_sync_status', 'idx_suppliers_status', 'idx_suppliers_sync_status',
        'idx_uom_sync_status', 'idx_branches_is_active', 'idx_branches_sync_status',
        'idx_payment_methods_is_active', 'idx_payment_methods_type'
    ];

    for (const name of indexNames) {
        try {
            db.prepare(`DROP INDEX IF EXISTS ${name}`).run();
        } catch (error) {
            console.error(`[Migration 032] Failed to drop index ${name}:`, error.message);
        }
    }

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
