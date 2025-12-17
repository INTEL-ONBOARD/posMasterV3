/**
 * Sync Queue Repository
 *
 * Handles all database operations for the sync queue.
 * Manages offline operations that need to be synced with the cloud.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { generateUUID } = require('../utils/helpers.cjs');

class SyncQueueRepository extends BaseRepository {
    constructor() {
        super('sync_queue');
    }

    /**
     * Add an operation to the sync queue
     * @param {Object} data - Queue item data
     * @returns {Object} The created queue item
     */
    enqueue(data) {
        const item = {
            id: data.id || generateUUID(),
            entity_type: data.entity_type,
            entity_id: data.entity_id,
            operation: data.operation,
            payload: typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload),
            priority: data.priority || 0,
            retry_count: 0,
            max_retries: data.max_retries || 3,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        return super.create(item);
    }

    /**
     * Get next pending items to process
     * @param {number} limit - Maximum items to return
     * @returns {Array}
     */
    getNextPending(limit = 10) {
        const stmt = this.db.prepare(`
            SELECT * FROM sync_queue
            WHERE status = 'pending'
            AND retry_count < max_retries
            ORDER BY priority DESC, created_at ASC
            LIMIT ?
        `);

        return stmt.all(limit).map(item => this._parseItem(item));
    }

    /**
     * Get all pending items for an entity
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity ID
     * @returns {Array}
     */
    findByEntity(entityType, entityId) {
        const items = this.findWhere({
            entity_type: entityType,
            entity_id: entityId
        });

        return items.map(item => this._parseItem(item));
    }

    /**
     * Mark item as processing
     * @param {string} id - Queue item ID
     * @returns {Object|null}
     */
    markProcessing(id) {
        return this.update(id, { status: 'processing' });
    }

    /**
     * Mark item as completed
     * @param {string} id - Queue item ID
     * @returns {Object|null}
     */
    markCompleted(id) {
        return this.update(id, {
            status: 'completed',
            processed_at: new Date().toISOString()
        });
    }

    /**
     * Mark item as failed
     * @param {string} id - Queue item ID
     * @param {string} errorMessage - Error message
     * @returns {Object|null}
     */
    markFailed(id, errorMessage) {
        const item = this.findById(id);
        if (!item) return null;

        return this.update(id, {
            status: item.retry_count + 1 >= item.max_retries ? 'failed' : 'pending',
            retry_count: item.retry_count + 1,
            error_message: errorMessage
        });
    }

    /**
     * Retry failed items
     * @returns {number} Number of items reset for retry
     */
    retryFailed() {
        const stmt = this.db.prepare(`
            UPDATE sync_queue
            SET status = 'pending',
                retry_count = 0,
                error_message = NULL,
                updated_at = ?
            WHERE status = 'failed'
            AND retry_count >= max_retries
        `);

        const result = stmt.run(new Date().toISOString());
        return result.changes;
    }

    /**
     * Get queue statistics
     * @returns {Object}
     */
    getStats() {
        const stmt = this.db.prepare(`
            SELECT
                status,
                COUNT(*) as count
            FROM sync_queue
            GROUP BY status
        `);

        const rows = stmt.all();
        const stats = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total: 0
        };

        for (const row of rows) {
            stats[row.status] = row.count;
            stats.total += row.count;
        }

        return stats;
    }

    /**
     * Clean up old completed items
     * @param {number} daysOld - Delete items older than this many days
     * @returns {number} Number of items deleted
     */
    cleanupCompleted(daysOld = 7) {
        const stmt = this.db.prepare(`
            DELETE FROM sync_queue
            WHERE status = 'completed'
            AND processed_at < datetime('now', '-' || ? || ' days')
        `);

        const result = stmt.run(daysOld);
        return result.changes;
    }

    /**
     * Remove all pending items for an entity
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity ID
     * @returns {number} Number of items deleted
     */
    removeByEntity(entityType, entityId) {
        const stmt = this.db.prepare(`
            DELETE FROM sync_queue
            WHERE entity_type = ?
            AND entity_id = ?
            AND status = 'pending'
        `);

        const result = stmt.run(entityType, entityId);
        return result.changes;
    }

    /**
     * Check if entity has pending operations
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity ID
     * @returns {boolean}
     */
    hasPendingOperations(entityType, entityId) {
        const stmt = this.db.prepare(`
            SELECT 1 FROM sync_queue
            WHERE entity_type = ?
            AND entity_id = ?
            AND status IN ('pending', 'processing')
            LIMIT 1
        `);

        return !!stmt.get(entityType, entityId);
    }

    /**
     * Parse queue item (deserialize payload)
     * @param {Object} item - Raw item from DB
     * @returns {Object}
     * @private
     */
    _parseItem(item) {
        if (!item) return null;

        return {
            ...item,
            payload: item.payload ? JSON.parse(item.payload) : null
        };
    }
}

module.exports = SyncQueueRepository;
