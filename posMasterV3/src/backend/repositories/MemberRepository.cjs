/**
 * Member Repository
 *
 * Handles database operations for members (customers).
 */

const BaseRepository = require('./BaseRepository.cjs');

class MemberRepository extends BaseRepository {
    constructor() {
        super('members');
    }

    /**
     * Find member by member number
     * @param {string} memberNo - Member number
     * @returns {Object|null}
     */
    findByMemberNo(memberNo) {
        return this.findOneWhere({ member_no: memberNo });
    }

    /**
     * Find active members
     * @returns {Array}
     */
    findActive() {
        return this.findWhere({ is_active: 1 });
    }

    /**
     * Find members by type
     * @param {string} memberType - Member type (regular/premium)
     * @returns {Array}
     */
    findByType(memberType) {
        return this.findWhere({ member_type: memberType });
    }

    /**
     * Search members
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE member_no LIKE ? OR full_name LIKE ? OR contact LIKE ?
            ORDER BY full_name ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term, term);
    }

    /**
     * Generate unique member number
     * @param {string} prefix - Optional prefix
     * @returns {string}
     */
    generateMemberNo(prefix = 'MEM') {
        const count = this.count();
        const padded = String(count + 1).padStart(6, '0');
        return `${prefix}${padded}`;
    }

    /**
     * Update member income (atomic operation to prevent race conditions)
     * @param {number} id - Member ID
     * @param {number} amount - Amount to add
     * @returns {Object}
     */
    addIncome(id, amount) {
        // Validate amount is a positive number
        if (typeof amount !== 'number' || amount < 0) {
            return null;
        }

        // Use atomic SQL UPDATE to prevent race conditions
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET total_income = total_income + ?,
                updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(amount, new Date().toISOString(), id);

        if (result.changes === 0) return null;
        return this.findById(id);
    }

    /**
     * Update member credits (atomic operation to prevent race conditions)
     * @param {number} id - Member ID
     * @param {number} amount - Amount to add/subtract
     * @returns {Object}
     */
    updateCredits(id, amount) {
        // Validate amount is a number
        if (typeof amount !== 'number') {
            return null;
        }

        // Use atomic SQL UPDATE to prevent race conditions
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET total_credits = total_credits + ?,
                updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(amount, new Date().toISOString(), id);

        if (result.changes === 0) return null;
        return this.findById(id);
    }

    /**
     * Get member with transaction history
     * @param {number} id - Member ID
     * @returns {Object|null}
     */
    getWithTransactions(id) {
        const member = this.findById(id);
        if (!member) return null;

        const transactions = this.db.prepare(`
            SELECT * FROM sales_transactions
            WHERE member_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(id);

        return {
            ...member,
            transactions
        };
    }

    /**
     * Get top members by income
     * @param {number} limit - Number of members to return
     * @returns {Array}
     */
    getTopByIncome(limit = 10) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE is_active = 1
            ORDER BY total_income DESC
            LIMIT ?
        `);
        return stmt.all(limit);
    }

    /**
     * Get members with credits (debtors)
     * @returns {Array}
     */
    getDebtors() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE total_credits > 0 AND is_active = 1
            ORDER BY total_credits DESC
        `);
        return stmt.all();
    }

    /**
     * Activate/Deactivate a member
     * @param {number} id - Member ID
     * @param {boolean} isActive - Active status
     * @returns {Object}
     */
    setActiveStatus(id, isActive) {
        return this.update(id, { is_active: isActive ? 1 : 0 });
    }

    /**
     * Find members pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }
}

module.exports = new MemberRepository();
