/**
 * Migration: Create Payment Methods Table
 * Version: 028
 *
 * Stores payment method configurations like Cash, Credit (3/6/9 months),
 * Welfare, Society, etc.
 */

const MIGRATION_VERSION = 28;
const MIGRATION_NAME = 'create_payment_methods_table';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS payment_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cloud_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL DEFAULT 'cash',
            credit_months INTEGER DEFAULT 0,
            interest_rate REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            is_member_only INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            icon TEXT,
            color TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
        CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
        CREATE INDEX IF NOT EXISTS idx_payment_methods_sync_status ON payment_methods(sync_status);
    `);

    // Insert default payment methods
    const insertStmt = db.prepare(`
        INSERT INTO payment_methods (name, description, type, credit_months, is_active, is_member_only, display_order, icon, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultMethods = [
        { name: 'Cash', description: 'Pay with cash', type: 'cash', credit_months: 0, is_active: 1, is_member_only: 0, display_order: 1, icon: 'Wallet', color: 'emerald' },
        { name: 'Credit 3 Months', description: '3 months credit payment', type: 'credit', credit_months: 3, is_active: 1, is_member_only: 1, display_order: 2, icon: 'CreditCard', color: 'blue' },
        { name: 'Credit 6 Months', description: '6 months credit payment', type: 'credit', credit_months: 6, is_active: 1, is_member_only: 1, display_order: 3, icon: 'CreditCard', color: 'indigo' },
        { name: 'Credit 9 Months', description: '9 months credit payment', type: 'credit', credit_months: 9, is_active: 1, is_member_only: 1, display_order: 4, icon: 'CreditCard', color: 'purple' },
        { name: 'Welfare', description: 'Welfare payment scheme', type: 'special', credit_months: 0, is_active: 1, is_member_only: 1, display_order: 5, icon: 'Heart', color: 'pink' },
        { name: 'Society', description: 'Society payment scheme', type: 'special', credit_months: 0, is_active: 1, is_member_only: 1, display_order: 6, icon: 'Users', color: 'amber' }
    ];

    for (const method of defaultMethods) {
        insertStmt.run(
            method.name,
            method.description,
            method.type,
            method.credit_months,
            method.is_active,
            method.is_member_only,
            method.display_order,
            method.icon,
            method.color
        );
    }

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.exec(`
        DROP INDEX IF EXISTS idx_payment_methods_sync_status;
        DROP INDEX IF EXISTS idx_payment_methods_is_active;
        DROP INDEX IF EXISTS idx_payment_methods_type;
        DROP TABLE IF EXISTS payment_methods;
    `);

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
