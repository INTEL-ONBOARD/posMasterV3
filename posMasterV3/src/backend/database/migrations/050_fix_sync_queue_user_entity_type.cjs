/**
 * Migration: Fix sync_queue entity_type 'user' → 'users'
 * Version: 050
 *
 * Stale sync_queue records were created with entity_type='user' (singular)
 * from an older schema. The cloud MySQL table is named 'users', so these
 * records fail every sync attempt. Rename them to match.
 */

const MIGRATION_VERSION = 50;
const MIGRATION_NAME = 'fix_sync_queue_user_entity_type';

function up(db) {
    const result = db.prepare(`
        UPDATE sync_queue
        SET entity_type = 'users'
        WHERE entity_type = 'user'
    `).run();

    if (result.changes > 0) {
        console.log(`[Migration] ${MIGRATION_NAME}: fixed ${result.changes} stale sync_queue record(s)`);
    }

    console.log(`[Migration] Applied: ${MIGRATION_NAME}`);
}

function down(db) {
    db.prepare(`
        UPDATE sync_queue
        SET entity_type = 'user'
        WHERE entity_type = 'users'
          AND processed_at IS NULL
    `).run();

    console.log(`[Migration] Rolled back: ${MIGRATION_NAME}`);
}

module.exports = {
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    up,
    down
};
