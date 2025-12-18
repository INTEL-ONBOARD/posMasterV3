/**
 * Supplier Service
 *
 * Business logic for supplier operations.
 */

const supplierRepository = require('../repositories/SupplierRepository.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class SupplierService {
    /**
     * Get all suppliers
     * @returns {Object}
     */
    getAll() {
        try {
            const suppliers = supplierRepository.getAllFormatted();
            return {
                status: 'success',
                data: suppliers
            };
        } catch (error) {
            console.error('[SupplierService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get active suppliers only
     * @returns {Object}
     */
    getActive() {
        try {
            const suppliers = supplierRepository.findActive();
            return {
                status: 'success',
                data: suppliers.map(s => supplierRepository.formatForFrontend(s))
            };
        } catch (error) {
            console.error('[SupplierService] getActive error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get supplier by ID
     * @param {number} id - Supplier ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const supplier = supplierRepository.findById(id);
            if (!supplier) {
                return {
                    status: 'error',
                    message: 'Supplier not found'
                };
            }
            return {
                status: 'success',
                data: supplierRepository.formatForFrontend(supplier)
            };
        } catch (error) {
            console.error('[SupplierService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search suppliers
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const suppliers = supplierRepository.search(searchTerm);
            return {
                status: 'success',
                data: suppliers.map(s => supplierRepository.formatForFrontend(s))
            };
        } catch (error) {
            console.error('[SupplierService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new supplier
     * @param {Object} data - Supplier data
     * @returns {Object}
     */
    create(data) {
        try {
            // Handle nested structure from frontend
            const basicInfo = data.basic_info || data;
            const financialInfo = data.financial_info || {};
            const accountInfo = data.account_info || {};

            if (!basicInfo.supplier_name) {
                return {
                    status: 'error',
                    message: 'Supplier name is required'
                };
            }

            const supplierData = {
                supplier_name: basicInfo.supplier_name,
                contact: basicInfo.contact || null,
                type: basicInfo.type || null,
                supplier_address: basicInfo.supplier_address || null,
                status: basicInfo.status !== undefined ? (basicInfo.status ? 1 : 0) : 1,
                current_amount: financialInfo.current_amount || 0,
                previous_amount: financialInfo.previous_amount || 0,
                account_number: accountInfo.account_number || null,
                account_bank: accountInfo.account_bank || null,
                account_branch: accountInfo.account_branch || null,
                account_name: accountInfo.account_name || null,
                account_nickname: accountInfo.account_nickname || null,
                created_at: nowISO(),
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            const supplier = supplierRepository.create(supplierData);
            return {
                status: 'success',
                data: supplierRepository.formatForFrontend(supplier),
                message: 'Supplier created successfully'
            };
        } catch (error) {
            console.error('[SupplierService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a supplier
     * @param {number} id - Supplier ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = supplierRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Supplier not found'
                };
            }

            // Handle nested structure from frontend
            const basicInfo = data.basic_info || data;
            const financialInfo = data.financial_info || {};
            const accountInfo = data.account_info || {};

            const updateData = {};

            // Basic info
            if (basicInfo.supplier_name) updateData.supplier_name = basicInfo.supplier_name;
            if (basicInfo.contact !== undefined) updateData.contact = basicInfo.contact;
            if (basicInfo.type !== undefined) updateData.type = basicInfo.type;
            if (basicInfo.supplier_address !== undefined) updateData.supplier_address = basicInfo.supplier_address;
            if (basicInfo.status !== undefined) updateData.status = basicInfo.status ? 1 : 0;

            // Financial info
            if (financialInfo.current_amount !== undefined) updateData.current_amount = financialInfo.current_amount;
            if (financialInfo.previous_amount !== undefined) updateData.previous_amount = financialInfo.previous_amount;

            // Account info
            if (accountInfo.account_number !== undefined) updateData.account_number = accountInfo.account_number;
            if (accountInfo.account_bank !== undefined) updateData.account_bank = accountInfo.account_bank;
            if (accountInfo.account_branch !== undefined) updateData.account_branch = accountInfo.account_branch;
            if (accountInfo.account_name !== undefined) updateData.account_name = accountInfo.account_name;
            if (accountInfo.account_nickname !== undefined) updateData.account_nickname = accountInfo.account_nickname;

            updateData.sync_status = 'pending';

            const supplier = supplierRepository.update(id, updateData);
            return {
                status: 'success',
                data: supplierRepository.formatForFrontend(supplier),
                message: 'Supplier updated successfully'
            };
        } catch (error) {
            console.error('[SupplierService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete a supplier
     * @param {number} id - Supplier ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = supplierRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Supplier not found'
                };
            }

            supplierRepository.delete(id);
            return {
                status: 'success',
                message: 'Supplier deleted successfully'
            };
        } catch (error) {
            console.error('[SupplierService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update supplier amounts
     * @param {number} id - Supplier ID
     * @param {number} currentAmount - New current amount
     * @param {number} previousAmount - New previous amount
     * @returns {Object}
     */
    updateAmounts(id, currentAmount, previousAmount) {
        try {
            const existing = supplierRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Supplier not found'
                };
            }

            const supplier = supplierRepository.updateAmounts(id, currentAmount, previousAmount);
            return {
                status: 'success',
                data: supplierRepository.formatForFrontend(supplier),
                message: 'Supplier amounts updated successfully'
            };
        } catch (error) {
            console.error('[SupplierService] updateAmounts error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = new SupplierService();
