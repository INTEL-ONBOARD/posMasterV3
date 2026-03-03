/**
 * Member Service
 *
 * Business logic for member (customer) operations.
 */

const memberRepository = require('../repositories/MemberRepository.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class MemberService {
    /**
     * Get all members
     * @returns {Object}
     */
    getAll() {
        try {
            const members = memberRepository.findAll({ limit: 10000, orderBy: 'full_name', order: 'ASC' });
            return {
                status: 'success',
                data: members.map(m => this.formatMember(m))
            };
        } catch (error) {
            console.error('[MemberService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get active members only
     * @returns {Object}
     */
    getActive() {
        try {
            const members = memberRepository.findActive();
            return {
                status: 'success',
                data: members.map(m => this.formatMember(m))
            };
        } catch (error) {
            console.error('[MemberService] getActive error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get member by ID
     * @param {number} id - Member ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const member = memberRepository.findById(id);
            if (!member) {
                return {
                    status: 'error',
                    message: 'Member not found'
                };
            }
            return {
                status: 'success',
                data: this.formatMember(member)
            };
        } catch (error) {
            console.error('[MemberService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get member by member number
     * @param {string} memberNo - Member number
     * @returns {Object}
     */
    getByMemberNo(memberNo) {
        try {
            const member = memberRepository.findByMemberNo(memberNo);
            if (!member) {
                return {
                    status: 'error',
                    message: 'Member not found'
                };
            }
            return {
                status: 'success',
                data: this.formatMember(member)
            };
        } catch (error) {
            console.error('[MemberService] getByMemberNo error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get member with transaction history
     * @param {number} id - Member ID
     * @returns {Object}
     */
    getWithTransactions(id) {
        try {
            const memberWithTx = memberRepository.getWithTransactions(id);
            if (!memberWithTx) {
                return {
                    status: 'error',
                    message: 'Member not found'
                };
            }
            return {
                status: 'success',
                data: {
                    ...this.formatMember(memberWithTx),
                    transactions: memberWithTx.transactions
                }
            };
        } catch (error) {
            console.error('[MemberService] getWithTransactions error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search members
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const members = memberRepository.search(searchTerm);
            return {
                status: 'success',
                data: members.map(m => this.formatMember(m))
            };
        } catch (error) {
            console.error('[MemberService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new member
     * @param {Object} data - Member data
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.full_name) {
                return {
                    status: 'error',
                    message: 'Full name is required'
                };
            }

            // Generate member number if not provided
            const memberNo = data.member_no || memberRepository.generateMemberNo();

            // Check if member number already exists
            const existingMember = memberRepository.findByMemberNo(memberNo);
            if (existingMember) {
                return {
                    status: 'error',
                    message: 'Member number already exists'
                };
            }

            const memberData = {
                member_no: memberNo,
                full_name: data.full_name,
                contact: data.contact || null,
                address: data.address || null,
                member_type: data.member_type || 'regular',
                total_income: data.total_income || 0,
                total_credits: data.total_credits || 0,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
                created_at: nowISO(),
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            const member = memberRepository.create(memberData);
            return {
                status: 'success',
                data: this.formatMember(member),
                message: 'Member created successfully'
            };
        } catch (error) {
            console.error('[MemberService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a member
     * @param {number} id - Member ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = memberRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Member not found'
                };
            }

            const updateData = {};
            if (data.full_name) updateData.full_name = data.full_name;
            if (data.contact !== undefined) updateData.contact = data.contact;
            if (data.address !== undefined) updateData.address = data.address;
            if (data.member_type) updateData.member_type = data.member_type;
            if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
            updateData.sync_status = 'pending';

            const member = memberRepository.update(id, updateData);
            return {
                status: 'success',
                data: this.formatMember(member),
                message: 'Member updated successfully'
            };
        } catch (error) {
            console.error('[MemberService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete a member
     * @param {number} id - Member ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = memberRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Member not found'
                };
            }

            memberRepository.delete(id);
            return {
                status: 'success',
                message: 'Member deleted successfully'
            };
        } catch (error) {
            console.error('[MemberService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get top members by income
     * @param {number} limit - Number of members
     * @returns {Object}
     */
    getTopMembers(limit = 10) {
        try {
            const members = memberRepository.getTopByIncome(limit);
            return {
                status: 'success',
                data: members.map(m => this.formatMember(m))
            };
        } catch (error) {
            console.error('[MemberService] getTopMembers error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get members with credits (debtors)
     * @returns {Object}
     */
    getDebtors() {
        try {
            const debtors = memberRepository.getDebtors();
            return {
                status: 'success',
                data: debtors.map(m => this.formatMember(m))
            };
        } catch (error) {
            console.error('[MemberService] getDebtors error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format member for frontend
     * @param {Object} member - Raw member
     * @returns {Object}
     */
    formatMember(member) {
        return {
            id: member.id,
            _id: member.cloud_id || member.id.toString(),
            member_no: member.member_no,
            full_name: member.full_name,
            contact: member.contact,
            address: member.address,
            member_type: member.member_type,
            total_income: member.total_income,
            total_credits: member.total_credits,
            // Frontend compatibility aliases
            credit_limit: member.total_income || 0,
            credit_balance: member.total_credits || 0,
            is_active: member.is_active === 1,
            created_at: member.created_at,
            updated_at: member.updated_at,
            __v: 0
        };
    }
}

module.exports = new MemberService();
