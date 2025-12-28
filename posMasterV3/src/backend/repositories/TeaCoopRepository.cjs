/**
 * Tea Coop Repository
 *
 * Handles database operations for Tea Coop members and payments.
 * Data is fetched from external API and stored locally for offline access.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { broadcastDataChange } = require('../utils/eventBroadcaster.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { getDatabase } = require('../database/connection.cjs');
const { nowISO, generateUUID } = require('../utils/helpers.cjs');

class TeaCoopMemberRepository extends BaseRepository {
    constructor() {
        super('tea_coop_members');
    }

    /**
     * Find member by external member_id
     * @param {string} memberId - External member ID from Tea Coop API
     * @returns {Object|null}
     */
    findByMemberId(memberId) {
        return this.findOneWhere({ member_id: memberId });
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
     * Search members
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE member_id LIKE ? OR member_no LIKE ? OR full_name LIKE ? OR contact LIKE ?
            ORDER BY full_name ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term, term, term);
    }

    /**
     * Upsert member from API data
     * @param {Object} apiData - Member data from Tea Coop API
     * @param {boolean} skipBroadcast - Skip broadcasting (for bulk operations)
     * @returns {Object} Upserted member
     */
    upsertFromApi(apiData, skipBroadcast = false) {
        const existing = this.findByMemberId(apiData.memberId || apiData.member_id);
        const now = nowISO();

        const memberData = {
            member_id: apiData.memberId || apiData.member_id,
            member_no: apiData.memberNo || apiData.member_no || apiData.memberId,
            full_name: apiData.fullName || apiData.full_name || apiData.name || 'Unknown',
            contact: apiData.contact || apiData.phone || null,
            address: apiData.address || null,
            factory_id: apiData.factoryId || apiData.factory_id || apiData.factory || 1,
            green_leaf_value: parseFloat(apiData.greenLeafValue) || 0,
            loans: parseFloat(apiData.loans) || 0,
            net_amount: parseFloat(apiData.netAmount) || 0,
            is_active: 1,
            last_fetched_at: now
        };

        if (existing) {
            // Check if data actually changed (only compare relevant fields)
            const dataChanged =
                existing.member_no !== memberData.member_no ||
                existing.full_name !== memberData.full_name ||
                existing.contact !== memberData.contact ||
                existing.address !== memberData.address ||
                existing.factory_id !== memberData.factory_id ||
                parseFloat(existing.green_leaf_value) !== memberData.green_leaf_value ||
                parseFloat(existing.loans) !== memberData.loans ||
                parseFloat(existing.net_amount) !== memberData.net_amount;

            if (dataChanged) {
                // Data changed - update with new timestamp and pending sync status
                memberData.updated_at = now;
                memberData.sync_status = 'pending';
                const updated = this.update(existing.id, memberData);
                if (!skipBroadcast) {
                    notifyDataChange(this.tableName, 'UPDATE', updated, existing.id);
                    broadcastDataChange(this.tableName, 'UPDATE', existing.id, updated);
                }
                return updated;
            } else {
                // Data unchanged - only update last_fetched_at (don't trigger sync)
                this.db.prepare(`UPDATE ${this.tableName} SET last_fetched_at = ? WHERE id = ?`)
                    .run(now, existing.id);
                return existing;
            }
        } else {
            // Create new
            memberData.created_at = now;
            memberData.updated_at = now;
            memberData.sync_status = 'pending';
            const created = this.create(memberData);
            if (!skipBroadcast) {
                notifyDataChange(this.tableName, 'INSERT', created, created.id);
                broadcastDataChange(this.tableName, 'INSERT', created.id, created);
            }
            return created;
        }
    }

    /**
     * Bulk upsert members from API
     * @param {Array} members - Array of member data from API
     * @returns {Object} Result with counts
     */
    bulkUpsertFromApi(members) {
        const result = { inserted: 0, updated: 0, unchanged: 0, errors: [] };

        // Ensure members is an array
        if (!Array.isArray(members)) {
            console.error('[TeaCoopMemberRepository] bulkUpsertFromApi received non-array:', typeof members);
            if (members && typeof members === 'object') {
                members = [members];
            } else {
                return result;
            }
        }

        for (const member of members) {
            try {
                const existing = this.findByMemberId(member.memberId || member.member_id);
                // Skip individual broadcasts during bulk operation
                const upsertResult = this.upsertFromApi(member, true);
                if (!existing) {
                    result.inserted++;
                } else if (upsertResult.updated_at !== existing.updated_at) {
                    // Check if updated_at changed (meaning data was actually updated)
                    result.updated++;
                } else {
                    result.unchanged++;
                }
            } catch (error) {
                result.errors.push({ member: member.memberId, error: error.message });
            }
        }

        // Broadcast single batch update after all operations complete (only if actual changes)
        if (result.inserted > 0 || result.updated > 0) {
            broadcastDataChange(this.tableName, 'BATCH', null, {
                inserted: result.inserted,
                updated: result.updated,
                unchanged: result.unchanged
            });
        }

        return result;
    }

    /**
     * Get all members with their latest payment summary
     * @returns {Array}
     */
    getAllWithPaymentSummary() {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT
                m.*,
                p.green_leaf_value as latest_green_leaf,
                p.loans as latest_loans,
                p.net_amount as latest_net,
                p.year as latest_year,
                p.month as latest_month
            FROM ${this.tableName} m
            LEFT JOIN (
                SELECT member_id, green_leaf_value, loans, net_amount, year, month
                FROM tea_coop_payments
                WHERE (member_id, year, month) IN (
                    SELECT member_id, MAX(year * 100 + month) / 100, MAX(year * 100 + month) % 100
                    FROM tea_coop_payments
                    GROUP BY member_id
                )
            ) p ON m.member_id = p.member_id
            WHERE m.is_active = 1
            ORDER BY m.full_name ASC
        `);
        return stmt.all();
    }
}

class TeaCoopPaymentRepository extends BaseRepository {
    constructor() {
        super('tea_coop_payments');
    }

    /**
     * Find payments by member ID
     * @param {string} memberId - Member ID
     * @param {number} limit - Number of months to fetch
     * @returns {Array}
     */
    findByMemberId(memberId, limit = 6) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE member_id = ?
            ORDER BY year DESC, month DESC
            LIMIT ?
        `);
        return stmt.all(memberId, limit);
    }

    /**
     * Find payment by member, year and month
     * @param {string} memberId - Member ID
     * @param {number} year - Year
     * @param {number} month - Month
     * @returns {Object|null}
     */
    findByMemberYearMonth(memberId, year, month) {
        return this.findOneWhere({ member_id: memberId, year, month });
    }

    /**
     * Upsert payment from API data
     * @param {string} memberId - Member ID
     * @param {Object} apiData - Payment data from API
     * @returns {Object} Upserted payment
     */
    upsertFromApi(memberId, apiData) {
        const year = parseInt(apiData.year) || new Date().getFullYear();
        const month = parseInt(apiData.month) || new Date().getMonth() + 1;
        const existing = this.findByMemberYearMonth(memberId, year, month);
        const now = nowISO();

        const paymentData = {
            member_id: memberId,
            year,
            month,
            green_leaf_value: parseFloat(apiData.greenLeafValue) || 0,
            loans: parseFloat(apiData.loans) || 0,
            net_amount: parseFloat(apiData.netAmount) || 0,
            payment_date: apiData.paymentDate || apiData.payment_date || null,
            factory_id: apiData.factoryId || apiData.factory_id || 1,
            last_fetched_at: now
        };

        if (existing) {
            // Check if data actually changed
            const dataChanged =
                parseFloat(existing.green_leaf_value) !== paymentData.green_leaf_value ||
                parseFloat(existing.loans) !== paymentData.loans ||
                parseFloat(existing.net_amount) !== paymentData.net_amount ||
                existing.payment_date !== paymentData.payment_date ||
                existing.factory_id !== paymentData.factory_id;

            if (dataChanged) {
                // Data changed - update with new timestamp
                paymentData.updated_at = now;
                paymentData.sync_status = 'pending';
                const updated = this.update(existing.id, paymentData);
                notifyDataChange(this.tableName, 'UPDATE', updated, existing.id);
                return updated;
            } else {
                // Data unchanged - only update last_fetched_at
                this.db.prepare(`UPDATE ${this.tableName} SET last_fetched_at = ? WHERE id = ?`)
                    .run(now, existing.id);
                return existing;
            }
        } else {
            paymentData.created_at = now;
            paymentData.updated_at = now;
            paymentData.sync_status = 'pending';
            const created = this.create(paymentData);
            notifyDataChange(this.tableName, 'INSERT', created, created.id);
            return created;
        }
    }

    /**
     * Bulk upsert payments from API
     * @param {string} memberId - Member ID
     * @param {Array} payments - Array of payment data
     * @returns {Object} Result with counts
     */
    bulkUpsertFromApi(memberId, payments) {
        const result = { inserted: 0, updated: 0, unchanged: 0, errors: [] };

        for (const payment of payments) {
            try {
                const year = parseInt(payment.year) || new Date().getFullYear();
                const month = parseInt(payment.month) || new Date().getMonth() + 1;
                const existing = this.findByMemberYearMonth(memberId, year, month);
                const upsertResult = this.upsertFromApi(memberId, payment);
                if (!existing) {
                    result.inserted++;
                } else if (upsertResult.updated_at !== existing.updated_at) {
                    result.updated++;
                } else {
                    result.unchanged++;
                }
            } catch (error) {
                result.errors.push({ payment, error: error.message });
            }
        }

        return result;
    }

    /**
     * Get payment history for last N months
     * @param {string} memberId - Member ID
     * @param {number} months - Number of months
     * @returns {Array}
     */
    getRecentHistory(memberId, months = 6) {
        const now = new Date();
        const startYear = now.getFullYear();
        const startMonth = now.getMonth() + 1;

        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE member_id = ?
            AND (year * 100 + month) >= ?
            ORDER BY year DESC, month DESC
            LIMIT ?
        `);

        // Calculate start date (months ago)
        const startDate = new Date(startYear, startMonth - months - 1, 1);
        const startValue = startDate.getFullYear() * 100 + (startDate.getMonth() + 1);

        return stmt.all(memberId, startValue, months);
    }
}

// Singleton instances
let teaCoopMemberRepo = null;
let teaCoopPaymentRepo = null;

function getTeaCoopMemberRepository() {
    if (!teaCoopMemberRepo) {
        teaCoopMemberRepo = new TeaCoopMemberRepository();
    }
    return teaCoopMemberRepo;
}

function getTeaCoopPaymentRepository() {
    if (!teaCoopPaymentRepo) {
        teaCoopPaymentRepo = new TeaCoopPaymentRepository();
    }
    return teaCoopPaymentRepo;
}

module.exports = {
    TeaCoopMemberRepository,
    TeaCoopPaymentRepository,
    getTeaCoopMemberRepository,
    getTeaCoopPaymentRepository
};
