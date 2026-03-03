/**
 * Price Change History Repository
 *
 * Records every price update for audit purposes.
 * LOCAL_ONLY — not synced to cloud.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { getDatabase } = require('../database/connection.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class PriceChangeHistoryRepository extends BaseRepository {
    constructor() {
        super('price_change_history');
    }

    /**
     * Find all history records for a given stock entry
     * @param {number} stockId
     * @returns {Array}
     */
    findByStockId(stockId) {
        return this.findWhere({ stock_id: stockId });
    }

    /**
     * Find history records within a date range
     * @param {string} startDate - ISO date string
     * @param {string} endDate - ISO date string
     * @returns {Array}
     */
    findByDateRange(startDate, endDate) {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT pch.*, s.batch_code, i.item_name, i.sku
            FROM price_change_history pch
            LEFT JOIN stock s ON pch.stock_id = s.id
            LEFT JOIN items i ON s.item_id = i.id
            WHERE pch.changed_at BETWEEN ? AND ?
            ORDER BY pch.changed_at DESC
        `);
        return stmt.all(startDate, endDate);
    }
}

module.exports = PriceChangeHistoryRepository;
