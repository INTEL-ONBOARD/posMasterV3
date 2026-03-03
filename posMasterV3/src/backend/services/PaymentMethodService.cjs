/**
 * Payment Method Service
 *
 * Business logic for payment method operations.
 */

const paymentMethodRepository = require('../repositories/PaymentMethodRepository.cjs');
const { nowISO } = require('../utils/helpers.cjs');
const { notifyDataChange } = require('./CloudSyncService.cjs');

class PaymentMethodService {
    /**
     * Get all payment methods
     * @returns {Object}
     */
    getAll() {
        try {
            const methods = paymentMethodRepository.findAll({ limit: 100, orderBy: 'display_order', order: 'ASC' });
            return {
                status: 'success',
                data: methods.map(m => this.formatPaymentMethod(m))
            };
        } catch (error) {
            console.error('[PaymentMethodService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get active payment methods
     * @returns {Object}
     */
    getActive() {
        try {
            const methods = paymentMethodRepository.findActive();
            return {
                status: 'success',
                data: methods.map(m => this.formatPaymentMethod(m))
            };
        } catch (error) {
            console.error('[PaymentMethodService] getActive error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get payment methods for members
     * @returns {Object}
     */
    getForMembers() {
        try {
            const methods = paymentMethodRepository.findForMembers();
            return {
                status: 'success',
                data: methods.map(m => this.formatPaymentMethod(m))
            };
        } catch (error) {
            console.error('[PaymentMethodService] getForMembers error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get payment methods for non-members (cash only)
     * @returns {Object}
     */
    getForNonMembers() {
        try {
            const methods = paymentMethodRepository.findForNonMembers();
            return {
                status: 'success',
                data: methods.map(m => this.formatPaymentMethod(m))
            };
        } catch (error) {
            console.error('[PaymentMethodService] getForNonMembers error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get payment method by ID
     * @param {number} id - Payment method ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const method = paymentMethodRepository.findById(id);
            if (!method) {
                return {
                    status: 'error',
                    message: 'Payment method not found'
                };
            }
            return {
                status: 'success',
                data: this.formatPaymentMethod(method)
            };
        } catch (error) {
            console.error('[PaymentMethodService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search payment methods
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const methods = paymentMethodRepository.search(searchTerm);
            return {
                status: 'success',
                data: methods.map(m => this.formatPaymentMethod(m))
            };
        } catch (error) {
            console.error('[PaymentMethodService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new payment method
     * @param {Object} data - Payment method data
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.name || !data.type) {
                return {
                    status: 'error',
                    message: 'Name and type are required'
                };
            }

            const methodData = {
                name: data.name,
                description: data.description || '',
                type: data.type,
                credit_months: data.credit_months || 0,
                interest_rate: data.interest_rate || 0,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
                is_member_only: data.is_member_only ? 1 : 0,
                display_order: data.display_order || 0,
                icon: data.icon || 'CreditCard',
                color: data.color || 'gray',
                created_at: nowISO(),
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            const method = paymentMethodRepository.create(methodData);
            try { notifyDataChange('payment_methods', 'INSERT', method, method.id); } catch (e) { console.error('[PaymentMethodService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                data: this.formatPaymentMethod(method),
                message: 'Payment method created successfully'
            };
        } catch (error) {
            console.error('[PaymentMethodService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a payment method
     * @param {number} id - Payment method ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = paymentMethodRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Payment method not found'
                };
            }

            const updateData = {
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            if (data.name !== undefined) updateData.name = data.name;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.type !== undefined) updateData.type = data.type;
            if (data.credit_months !== undefined) updateData.credit_months = data.credit_months;
            if (data.interest_rate !== undefined) updateData.interest_rate = data.interest_rate;
            if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
            if (data.is_member_only !== undefined) updateData.is_member_only = data.is_member_only ? 1 : 0;
            if (data.display_order !== undefined) updateData.display_order = data.display_order;
            if (data.icon !== undefined) updateData.icon = data.icon;
            if (data.color !== undefined) updateData.color = data.color;

            const method = paymentMethodRepository.update(id, updateData);
            try { notifyDataChange('payment_methods', 'UPDATE', method, method.id); } catch (e) { console.error('[PaymentMethodService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                data: this.formatPaymentMethod(method),
                message: 'Payment method updated successfully'
            };
        } catch (error) {
            console.error('[PaymentMethodService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Toggle active status
     * @param {number} id - Payment method ID
     * @returns {Object}
     */
    toggleActive(id) {
        try {
            const existing = paymentMethodRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Payment method not found'
                };
            }

            const method = paymentMethodRepository.toggleActive(id, !existing.is_active);
            try { notifyDataChange('payment_methods', 'UPDATE', method, method.id); } catch (e) { console.error('[PaymentMethodService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                data: this.formatPaymentMethod(method),
                message: `Payment method ${method.is_active ? 'activated' : 'deactivated'} successfully`
            };
        } catch (error) {
            console.error('[PaymentMethodService] toggleActive error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete a payment method
     * @param {number} id - Payment method ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = paymentMethodRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Payment method not found'
                };
            }

            paymentMethodRepository.delete(id);
            try { notifyDataChange('payment_methods', 'DELETE', {}, id); } catch (e) { console.error('[PaymentMethodService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                message: 'Payment method deleted successfully'
            };
        } catch (error) {
            console.error('[PaymentMethodService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format payment method for frontend
     * @param {Object} method - Raw payment method
     * @returns {Object}
     */
    formatPaymentMethod(method) {
        return {
            id: method.id,
            _id: method.cloud_id || method.id.toString(),
            name: method.name,
            description: method.description,
            type: method.type,
            credit_months: method.credit_months,
            interest_rate: method.interest_rate,
            is_active: Boolean(method.is_active),
            is_member_only: Boolean(method.is_member_only),
            display_order: method.display_order,
            icon: method.icon,
            color: method.color,
            created_at: method.created_at,
            updated_at: method.updated_at,
            __v: 0
        };
    }
}

module.exports = new PaymentMethodService();
