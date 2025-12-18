/**
 * Supplier Repository
 *
 * Handles database operations for suppliers.
 */

const BaseRepository = require('./BaseRepository.cjs');

class SupplierRepository extends BaseRepository {
    constructor() {
        super('suppliers');
    }

    /**
     * Find active suppliers
     * @returns {Array}
     */
    findActive() {
        return this.findWhere({ status: 1 });
    }

    /**
     * Find supplier by name
     * @param {string} name - Supplier name
     * @returns {Object|null}
     */
    findByName(name) {
        return this.findOneWhere({ supplier_name: name });
    }

    /**
     * Find suppliers by type
     * @param {string} type - Supplier type
     * @returns {Array}
     */
    findByType(type) {
        return this.findWhere({ type });
    }

    /**
     * Search suppliers
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE supplier_name LIKE ? OR contact LIKE ? OR supplier_address LIKE ?
            ORDER BY supplier_name ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term, term);
    }

    /**
     * Get all suppliers formatted for frontend
     * @returns {Array}
     */
    getAllFormatted() {
        const suppliers = this.findAll({ limit: 1000 });
        return suppliers.map(s => this.formatForFrontend(s));
    }

    /**
     * Format supplier for frontend (matches cloud API response)
     * @param {Object} supplier - Raw supplier data
     * @returns {Object}
     */
    formatForFrontend(supplier) {
        return {
            id: supplier.id,
            _id: supplier.cloud_id || supplier.id.toString(),
            basic_info: {
                supplier_name: supplier.supplier_name,
                contact: supplier.contact,
                type: supplier.type,
                supplier_address: supplier.supplier_address,
                status: supplier.status === 1
            },
            financial_info: {
                current_amount: supplier.current_amount,
                previous_amount: supplier.previous_amount
            },
            account_info: {
                account_number: supplier.account_number,
                account_bank: supplier.account_bank,
                account_branch: supplier.account_branch,
                account_name: supplier.account_name,
                account_nickname: supplier.account_nickname
            },
            created_at: supplier.created_at,
            updated_at: supplier.updated_at
        };
    }

    /**
     * Update supplier amounts
     * @param {number} id - Supplier ID
     * @param {number} currentAmount - New current amount
     * @param {number} previousAmount - New previous amount
     * @returns {Object}
     */
    updateAmounts(id, currentAmount, previousAmount) {
        return this.update(id, {
            current_amount: currentAmount,
            previous_amount: previousAmount
        });
    }

    /**
     * Activate/Deactivate a supplier
     * @param {number} id - Supplier ID
     * @param {boolean} isActive - Active status
     * @returns {Object}
     */
    setActiveStatus(id, isActive) {
        return this.update(id, { status: isActive ? 1 : 0 });
    }

    /**
     * Find suppliers pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }
}

module.exports = new SupplierRepository();
