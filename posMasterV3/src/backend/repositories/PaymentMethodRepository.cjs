/**
 * Payment Method Repository
 *
 * Handles database operations for payment methods.
 */

const BaseRepository = require('./BaseRepository.cjs');

class PaymentMethodRepository extends BaseRepository {
    constructor() {
        super('payment_methods');
    }

    /**
     * Find payment methods by type (cash, credit, special)
     * @param {string} type - Payment method type
     * @returns {Array}
     */
    findByType(type) {
        return this.findWhere({ type });
    }

    /**
     * Get all active payment methods
     * @returns {Array}
     */
    findActive() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE is_active = 1
            ORDER BY display_order ASC
        `);
        return stmt.all();
    }

    /**
     * Get payment methods available for non-members (cash only)
     * @returns {Array}
     */
    findForNonMembers() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE is_active = 1 AND is_member_only = 0
            ORDER BY display_order ASC
        `);
        return stmt.all();
    }

    /**
     * Get all payment methods available for members
     * @returns {Array}
     */
    findForMembers() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE is_active = 1
            ORDER BY display_order ASC
        `);
        return stmt.all();
    }

    /**
     * Get credit payment methods
     * @returns {Array}
     */
    findCreditMethods() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE type = 'credit' AND is_active = 1
            ORDER BY credit_months ASC
        `);
        return stmt.all();
    }

    /**
     * Toggle active status
     * @param {number} id - Payment method ID
     * @param {boolean} isActive - New active status
     * @returns {Object}
     */
    toggleActive(id, isActive) {
        return this.update(id, { is_active: isActive ? 1 : 0 });
    }

    /**
     * Update display order
     * @param {number} id - Payment method ID
     * @param {number} order - New display order
     * @returns {Object}
     */
    updateDisplayOrder(id, order) {
        return this.update(id, { display_order: order });
    }

    /**
     * Search payment methods by name or description
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE name LIKE ? OR description LIKE ?
            ORDER BY display_order ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term);
    }

    /**
     * Find payment methods pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }

    /**
     * Update sync status
     * @param {number} id - Payment method ID
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

module.exports = new PaymentMethodRepository();
