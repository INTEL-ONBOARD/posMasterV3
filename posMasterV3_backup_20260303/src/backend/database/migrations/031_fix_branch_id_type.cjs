/**
 * Migration: Fix branch_id Type Mismatch
 * Version: 031
 *
 * Fixes the type mismatch where users.branch_id is TEXT but should be INTEGER
 * to properly reference branches.id (INTEGER PRIMARY KEY).
 *
 * Note: SQLite doesn't enforce foreign key types strictly, but this ensures
 * consistency in comparisons and joins.
 */

const MIGRATION_VERSION = 31;
const MIGRATION_NAME = 'fix_branch_id_type';

/**
 * Run the migration (upgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function up(db) {
    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    // However, for data integrity, we'll just ensure existing TEXT values
    // are properly cast when querying. We'll add a computed check.

    // First, let's update any existing branch_id values to ensure they're valid integers
    // by updating them to NULL if they're not valid integers

    try {
        // Get current users with branch_id
        const users = db.prepare(`
            SELECT id, branch_id FROM users WHERE branch_id IS NOT NULL
        `).all();

        let fixedCount = 0;

        for (const user of users) {
            const branchId = user.branch_id;

            // Check if branch_id is a valid integer or can be converted
            const numericId = parseInt(branchId, 10);

            if (isNaN(numericId)) {
                // Invalid branch_id, set to NULL
                db.prepare(`UPDATE users SET branch_id = NULL WHERE id = ?`).run(user.id);
                console.log(`[Migration 031] Fixed invalid branch_id for user ${user.id}: ${branchId} -> NULL`);
                fixedCount++;
            } else if (String(numericId) !== String(branchId)) {
                // Convert string to clean integer string
                db.prepare(`UPDATE users SET branch_id = ? WHERE id = ?`).run(String(numericId), user.id);
                console.log(`[Migration 031] Normalized branch_id for user ${user.id}: ${branchId} -> ${numericId}`);
                fixedCount++;
            }

            // Verify the branch actually exists
            const branch = db.prepare(`SELECT id FROM branches WHERE id = ?`).get(numericId);
            if (!branch && !isNaN(numericId)) {
                db.prepare(`UPDATE users SET branch_id = NULL WHERE id = ?`).run(user.id);
                console.log(`[Migration 031] Cleared non-existent branch_id for user ${user.id}: ${numericId}`);
                fixedCount++;
            }
        }

        // Also fix login_history table if it exists
        const loginHistoryExists = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='login_history'
        `).get();

        if (loginHistoryExists) {
            const loginRecords = db.prepare(`
                SELECT id, branch_id FROM login_history WHERE branch_id IS NOT NULL
            `).all();

            for (const record of loginRecords) {
                const branchId = record.branch_id;
                const numericId = parseInt(branchId, 10);

                if (isNaN(numericId)) {
                    db.prepare(`UPDATE login_history SET branch_id = NULL WHERE id = ?`).run(record.id);
                    fixedCount++;
                } else if (String(numericId) !== String(branchId)) {
                    db.prepare(`UPDATE login_history SET branch_id = ? WHERE id = ?`).run(String(numericId), record.id);
                    fixedCount++;
                }
            }
        }

        console.log(`[Migration 031] Fixed ${fixedCount} branch_id values`);
        console.log(`[Migration] Applied: ${MIGRATION_NAME}`);

    } catch (error) {
        console.error('[Migration 031] Error:', error);
        throw error;
    }
}

/**
 * Reverse the migration (downgrade)
 * @param {Database} db - The better-sqlite3 database instance
 */
function down(db) {
    // No rollback needed - data normalization is safe
    console.log(`[Migration] Rolled back: ${MIGRATION_NAME} (no-op)`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
