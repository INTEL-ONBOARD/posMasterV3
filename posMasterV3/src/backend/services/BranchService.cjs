/**
 * Branch Service
 *
 * Business logic for branch (inventory/outlet) operations.
 */

const branchRepository = require('../repositories/BranchRepository.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class BranchService {
    /**
     * Get all branches
     * @returns {Object}
     */
    getAll() {
        try {
            const branches = branchRepository.findAll({ limit: 1000, orderBy: 'name', order: 'ASC' });
            return {
                status: 'success',
                data: branches.map(b => this.formatBranch(b))
            };
        } catch (error) {
            console.error('[BranchService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get active branches only
     * @returns {Object}
     */
    getActive() {
        try {
            const branches = branchRepository.findActive();
            return {
                status: 'success',
                data: branches.map(b => this.formatBranch(b))
            };
        } catch (error) {
            console.error('[BranchService] getActive error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get branch by ID
     * @param {number} id - Branch ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const branch = branchRepository.findById(id);
            if (!branch) {
                return {
                    status: 'error',
                    message: 'Branch not found'
                };
            }
            return {
                status: 'success',
                data: this.formatBranch(branch)
            };
        } catch (error) {
            console.error('[BranchService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search branches
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const branches = branchRepository.search(searchTerm);
            return {
                status: 'success',
                data: branches.map(b => this.formatBranch(b))
            };
        } catch (error) {
            console.error('[BranchService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new branch
     * @param {Object} data - Branch data
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.name) {
                return {
                    status: 'error',
                    message: 'Branch name is required'
                };
            }

            const branchData = {
                name: data.name,
                address: data.address || null,
                contact: data.contact || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
                created_at: nowISO(),
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            const branch = branchRepository.create(branchData);
            return {
                status: 'success',
                data: this.formatBranch(branch),
                message: 'Branch created successfully'
            };
        } catch (error) {
            console.error('[BranchService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a branch
     * @param {number} id - Branch ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = branchRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Branch not found'
                };
            }

            const updateData = {};
            if (data.name) updateData.name = data.name;
            if (data.address !== undefined) updateData.address = data.address;
            if (data.contact !== undefined) updateData.contact = data.contact;
            if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
            updateData.sync_status = 'pending';

            const branch = branchRepository.update(id, updateData);
            return {
                status: 'success',
                data: this.formatBranch(branch),
                message: 'Branch updated successfully'
            };
        } catch (error) {
            console.error('[BranchService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete a branch
     * @param {number} id - Branch ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = branchRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Branch not found'
                };
            }

            branchRepository.delete(id);
            return {
                status: 'success',
                message: 'Branch deleted successfully'
            };
        } catch (error) {
            console.error('[BranchService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format branch for frontend (matches inventories API)
     * @param {Object} branch - Raw branch
     * @returns {Object}
     */
    formatBranch(branch) {
        return {
            id: branch.id,
            _id: branch.cloud_id || branch.id.toString(),
            name: branch.name,
            address: branch.address,
            contact: branch.contact,
            is_active: branch.is_active === 1,
            created_at: branch.created_at,
            updated_at: branch.updated_at,
            __v: 0
        };
    }
}

module.exports = new BranchService();
