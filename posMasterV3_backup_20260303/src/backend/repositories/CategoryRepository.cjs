/**
 * Category Repository
 *
 * Handles database operations for categories.
 */

const BaseRepository = require('./BaseRepository.cjs');

class CategoryRepository extends BaseRepository {
    constructor() {
        super('categories');
    }

    /**
     * Find categories by type
     * @param {string} type - Category type
     * @returns {Array}
     */
    findByType(type) {
        return this.findWhere({ type });
    }

    /**
     * Find categories by brand
     * @param {string} brand - Brand name
     * @returns {Array}
     */
    findByBrand(brand) {
        return this.findWhere({ brand });
    }

    /**
     * Get unique category types
     * @returns {Array}
     */
    getUniqueTypes() {
        const stmt = this.db.prepare(`
            SELECT DISTINCT type FROM ${this.tableName} ORDER BY type ASC
        `);
        return stmt.all().map(row => row.type);
    }

    /**
     * Search categories by brand or type
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE brand LIKE ? OR type LIKE ?
            ORDER BY type ASC, brand ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term);
    }

    /**
     * Find categories pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }

    /**
     * Update sync status
     * @param {number} id - Category ID
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

module.exports = new CategoryRepository();
