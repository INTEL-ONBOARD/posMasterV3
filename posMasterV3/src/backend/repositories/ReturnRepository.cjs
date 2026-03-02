/**
 * Return Repository
 *
 * Handles database operations for returned_items table.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { getDatabase } = require('../database/connection.cjs');

class ReturnRepository extends BaseRepository {
    constructor() {
        super('returned_items');
    }

    /**
     * Find all return records for a given sale with item details
     * @param {number} saleId
     * @returns {Array}
     */
    findBySaleId(saleId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT ri.*, i.item_name, i.sku
            FROM returned_items ri
            LEFT JOIN items i ON ri.item_id = i.id
            WHERE ri.sale_id = ?
            ORDER BY ri.returned_at DESC
        `).all(saleId);
    }

    /**
     * Find return records within a date range
     * @param {string} startDate - ISO date string
     * @param {string} endDate - ISO date string
     * @returns {Array}
     */
    findByDateRange(startDate, endDate) {
        const db = getDatabase();
        return db.prepare(`
            SELECT ri.*, i.item_name, i.sku, st.invoice_no
            FROM returned_items ri
            LEFT JOIN items i ON ri.item_id = i.id
            LEFT JOIN sales_transactions st ON ri.sale_id = st.id
            WHERE ri.returned_at BETWEEN ? AND ?
            ORDER BY ri.returned_at DESC
        `).all(startDate, endDate);
    }
}

module.exports = ReturnRepository;
