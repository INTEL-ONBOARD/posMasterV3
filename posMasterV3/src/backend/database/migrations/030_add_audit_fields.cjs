/**
 * Migration 030: Add audit tracking fields
 *
 * Adds created_by and updated_by fields to key tables to track
 * who made changes and from which branch.
 *
 * Also adds branch_id tracking where appropriate.
 */

const up = (db) => {
    console.log('[Migration 030] Adding audit tracking fields...');

    // Tables that need audit fields
    const auditTables = [
        'items',
        'categories',
        'units_of_measurement',
        'suppliers',
        'payment_methods'
    ];

    for (const table of auditTables) {
        try {
            const columns = db.pragma(`table_info(${table})`);

            // Add created_by if not exists
            const hasCreatedBy = columns.some(col => col.name === 'created_by');
            if (!hasCreatedBy) {
                db.exec(`ALTER TABLE ${table} ADD COLUMN created_by TEXT;`);
                console.log(`[Migration 030] Added created_by to ${table}`);
            }

            // Add updated_by if not exists
            const hasUpdatedBy = columns.some(col => col.name === 'updated_by');
            if (!hasUpdatedBy) {
                db.exec(`ALTER TABLE ${table} ADD COLUMN updated_by TEXT;`);
                console.log(`[Migration 030] Added updated_by to ${table}`);
            }

            // Add created_at_branch (branch where record was created) if not exists
            const hasCreatedAtBranch = columns.some(col => col.name === 'created_at_branch');
            if (!hasCreatedAtBranch) {
                db.exec(`ALTER TABLE ${table} ADD COLUMN created_at_branch INTEGER REFERENCES branches(id);`);
                console.log(`[Migration 030] Added created_at_branch to ${table}`);
            }

        } catch (error) {
            console.error(`[Migration 030] Error adding audit fields to ${table}:`, error.message);
        }
    }

    // Create audit_log table for detailed change tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
            user_id TEXT,
            user_name TEXT,
            branch_id INTEGER,
            branch_name TEXT,
            old_values TEXT,
            new_values TEXT,
            changed_fields TEXT,
            timestamp TEXT DEFAULT (datetime('now')),
            device_info TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (branch_id) REFERENCES branches(id)
        );
    `);

    // Create indexes for audit_log
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
        CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_branch_id ON audit_log(branch_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    `);

    console.log('[Migration 030] Created audit_log table');

    console.log('[Migration 030] Migration completed successfully');
};

const down = (db) => {
    console.log('[Migration 030] Rolling back audit fields...');

    // Drop audit_log table
    db.exec('DROP TABLE IF EXISTS audit_log;');

    console.log('[Migration 030] Dropped audit_log table');
};

module.exports = {
    version: 30,
    name: '030_add_audit_fields',
    up,
    down
};
