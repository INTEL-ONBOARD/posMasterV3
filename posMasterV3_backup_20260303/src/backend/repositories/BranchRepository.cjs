/**
 * Branch Repository
 *
 * Handles database operations for branches (inventories/outlets).
 */

const BaseRepository = require('./BaseRepository.cjs');

class BranchRepository extends BaseRepository {
    constructor() {
        super('branches');
    }

    /**
     * Find active branches
     * @returns {Array}
     */
    findActive() {
        return this.findWhere({ is_active: 1 });
    }

    /**
     * Find branch by name
     * @param {string} name - Branch name
     * @returns {Object|null}
     */
    findByName(name) {
        return this.findOneWhere({ name });
    }

    /**
     * Search branches
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE name LIKE ? OR address LIKE ?
            ORDER BY name ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term);
    }

    /**
     * Activate/Deactivate a branch
     * @param {number} id - Branch ID
     * @param {boolean} isActive - Active status
     * @returns {Object}
     */
    setActiveStatus(id, isActive) {
        return this.update(id, { is_active: isActive ? 1 : 0 });
    }

    /**
     * Find branches pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }

    /**
     * Update sync status
     * @param {number} id - Branch ID
     * @param {string} status - New sync status
     * @param {string} cloudId - Cloud ID if synced
     * @returns {Object}
     */
    updateSyncStatus(id, status, cloudId = null) {
        const data = { sync_status: status };
        if (cloudId) {
            data.cloud_id = cloudId;
        }
        return this.update(id, data);
    }
}

module.exports = new BranchRepository();
