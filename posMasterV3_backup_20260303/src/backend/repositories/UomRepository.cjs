/**
 * Unit of Measurement Repository
 *
 * Handles database operations for units of measurement.
 */

const BaseRepository = require('./BaseRepository.cjs');

class UomRepository extends BaseRepository {
    constructor() {
        super('units_of_measurement');
    }

    /**
     * Find UOM by symbol
     * @param {string} symbol - UOM symbol
     * @returns {Object|null}
     */
    findBySymbol(symbol) {
        return this.findOneWhere({ symbol });
    }

    /**
     * Find UOM by unit name
     * @param {string} unitName - Unit name
     * @returns {Object|null}
     */
    findByUnitName(unitName) {
        return this.findOneWhere({ unit_name: unitName });
    }

    /**
     * Search UOMs
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE symbol LIKE ? OR unit_name LIKE ?
            ORDER BY unit_name ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term);
    }

    /**
     * Find UOMs pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }

    /**
     * Update sync status
     * @param {number} id - UOM ID
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

module.exports = new UomRepository();
