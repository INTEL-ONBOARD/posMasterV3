/**
 * Offers & Discounts Repository
 *
 * Handles database operations for the offers_discounts table.
 * Synced to cloud via BaseRepository.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { getDatabase } = require('../database/connection.cjs');
const { nowISO } = require('../utils/helpers.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { broadcastDataChange } = require('../utils/eventBroadcaster.cjs');

class OffersDiscountsRepository extends BaseRepository {
    constructor() {
        super('offers_discounts');
    }

    /**
     * Override create() to ensure sync columns are always populated.
     * BaseRepository.create() does not inject sync_status/updated_at defaults.
     * @param {Object} data - Offer/discount data
     * @returns {Object} The created record
     */
    create(data) {
        const now = nowISO();
        // Inject sync columns before passing to BaseRepository.create(), which
        // will call notifyDataChange + broadcastDataChange automatically.
        const enriched = {
            sync_status: 'pending',
            created_at: now,
            updated_at: now,
            ...data,
        };
        return super.create(enriched);
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
        const updated = this.findById(id);
        if (updated) {
            notifyDataChange(this.tableName, 'UPDATE', updated, id);
            broadcastDataChange(this.tableName, 'UPDATE', id, updated);
        }
        return updated;
    }
}

module.exports = new OffersDiscountsRepository();
