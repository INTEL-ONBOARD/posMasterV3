/**
 * Offers & Discounts Repository
 *
 * Handles database operations for the offers_discounts table.
 * Synced to cloud via BaseRepository.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { getDatabase } = require('../database/connection.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class OffersDiscountsRepository extends BaseRepository {
    constructor() {
        super('offers_discounts');
    }

    /**
     * Find all currently active offers
     * Active = is_active=1 AND (end_date is null OR end_date >= today)
     * @returns {Array}
     */
    findActive() {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE is_active = 1
              AND (end_date IS NULL OR end_date >= date('now'))
            ORDER BY created_at DESC
        `);
        return stmt.all();
    }

    /**
     * Toggle the is_active flag for an offer
     * @param {number} id
     * @returns {Object|null}
     */
    toggleActive(id) {
        const db = getDatabase();
        const stmt = db.prepare(`
            UPDATE ${this.tableName}
            SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                updated_at = ?,
                sync_status = 'pending'
            WHERE id = ?
        `);
        stmt.run(nowISO(), id);
        return this.findById(id);
    }
}

module.exports = OffersDiscountsRepository;
