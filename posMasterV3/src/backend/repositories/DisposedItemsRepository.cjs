/**
 * Disposed Items Repository
 *
 * Handles database operations for the disposed_items table.
 * Synced to cloud via BaseRepository.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { getDatabase } = require('../database/connection.cjs');

class DisposedItemsRepository extends BaseRepository {
    constructor() {
        super('disposed_items');
    }

    /**
     * Find all disposed items with item and batch details, filtered by branch
     * @param {number|null} branchId
     * @returns {Array}
     */
    getAllWithDetails(branchId = null) {
        const db = getDatabase();
        let sql = `
            SELECT di.*,
                   i.item_name, i.sku,
                   s.batch_code AS stock_batch_code,
                   s.branch_id
            FROM disposed_items di
            LEFT JOIN items i ON di.item_id = i.id
            LEFT JOIN stock s ON di.stock_id = s.id
        `;
        if (branchId) {
            sql += ` WHERE s.branch_id = ? ORDER BY di.disposed_at DESC`;
            return db.prepare(sql).all(branchId);
        }
        sql += ` ORDER BY di.disposed_at DESC`;
        return db.prepare(sql).all();
    }

    /**
     * Find disposed items within a date range, optionally filtered by branch
     * @param {string} startDate - ISO date string
     * @param {string} endDate - ISO date string
     * @param {number|null} branchId
     * @returns {Array}
     */
    findByDateRange(startDate, endDate, branchId = null) {
        const db = getDatabase();
        let sql = `
            SELECT di.*,
                   i.item_name, i.sku,
                   s.batch_code AS stock_batch_code
            FROM disposed_items di
            LEFT JOIN items i ON di.item_id = i.id
            LEFT JOIN stock s ON di.stock_id = s.id
            WHERE di.disposed_at BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];
        if (branchId) {
            sql += ` AND s.branch_id = ?`;
            params.push(branchId);
        }
        sql += ` ORDER BY di.disposed_at DESC`;
        return db.prepare(sql).all(...params);
    }
}

module.exports = DisposedItemsRepository;
