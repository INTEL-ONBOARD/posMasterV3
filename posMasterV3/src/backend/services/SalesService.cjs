/**
 * Sales Service
 *
 * Business logic for sales transaction operations.
 */

const salesRepository = require('../repositories/SalesRepository.cjs');

class SalesService {
    /**
     * Get all sales
     * @param {Object} options - Query options
     * @returns {Object}
     */
    getAll(options = {}) {
        try {
            const sales = salesRepository.findAll({
                limit: options.limit || 100,
                orderBy: 'created_at',
                order: 'DESC'
            });
            return {
                status: 'success',
                data: sales
            };
        } catch (error) {
            console.error('[SalesService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get sale by ID with full details
     * @param {number} id - Sale ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const sale = salesRepository.getFullDetails(id);
            if (!sale) {
                return {
                    status: 'error',
                    message: 'Sale not found'
                };
            }
            return {
                status: 'success',
                data: sale
            };
        } catch (error) {
            console.error('[SalesService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get sale by invoice number
     * @param {string} invoiceNo - Invoice number
     * @returns {Object}
     */
    getByInvoiceNo(invoiceNo) {
        try {
            const sale = salesRepository.findByInvoiceNo(invoiceNo);
            if (!sale) {
                return {
                    status: 'error',
                    message: 'Sale not found'
                };
            }
            return {
                status: 'success',
                data: salesRepository.getFullDetails(sale.id)
            };
        } catch (error) {
            console.error('[SalesService] getByInvoiceNo error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get sales by member
     * @param {number} memberId - Member ID
     * @returns {Object}
     */
    getByMemberId(memberId) {
        try {
            const sales = salesRepository.findByMemberId(memberId);
            return {
                status: 'success',
                data: sales
            };
        } catch (error) {
            console.error('[SalesService] getByMemberId error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get sales by date range
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getByDateRange(startDate, endDate) {
        try {
            const sales = salesRepository.findByDateRange(startDate, endDate);
            return {
                status: 'success',
                data: sales
            };
        } catch (error) {
            console.error('[SalesService] getByDateRange error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get held orders
     * @returns {Object}
     */
    getHeldOrders() {
        try {
            const heldOrders = salesRepository.findHeldOrders();
            return {
                status: 'success',
                data: heldOrders.map(order => salesRepository.getFullDetails(order.id))
            };
        } catch (error) {
            console.error('[SalesService] getHeldOrders error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new sale
     * @param {Object} data - Sale data including items
     * @returns {Object}
     */
    create(data) {
        try {
            // Generate invoice number if not provided
            const invoiceNo = data.invoice_no || salesRepository.generateInvoiceNo();

            // Check if invoice already exists
            const existingInvoice = salesRepository.findByInvoiceNo(invoiceNo);
            if (existingInvoice) {
                return {
                    status: 'error',
                    message: 'Invoice number already exists'
                };
            }

            const saleData = {
                invoice_no: invoiceNo,
                member_id: data.member_id || null,
                cashier_id: data.cashier_id,
                payment_method: data.payment_method || 'cash',
                credit_duration: data.credit_duration,
                subtotal: data.subtotal || 0,
                discount: data.discount || 0,
                total_amount: data.total_amount || 0,
                cash_received: data.cash_received || 0,
                change_amount: data.change_amount || 0,
                status: data.status || 'completed',
                is_held: data.is_held || false
            };

            const items = data.items || [];

            const sale = salesRepository.createWithItems(saleData, items);

            return {
                status: 'success',
                data: sale,
                message: data.is_held ? 'Order held successfully' : 'Sale completed successfully'
            };
        } catch (error) {
            console.error('[SalesService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Hold an order
     * @param {Object} data - Order data
     * @returns {Object}
     */
    holdOrder(data) {
        return this.create({ ...data, is_held: true, status: 'held' });
    }

    /**
     * Complete a held order
     * @param {number} id - Sale ID
     * @param {Object} updateData - Update data
     * @returns {Object}
     */
    completeHeldOrder(id, updateData = {}) {
        try {
            const sale = salesRepository.completeHeldOrder(id, updateData);
            if (!sale) {
                return {
                    status: 'error',
                    message: 'Held order not found or already completed'
                };
            }
            return {
                status: 'success',
                data: sale,
                message: 'Order completed successfully'
            };
        } catch (error) {
            console.error('[SalesService] completeHeldOrder error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Cancel a sale
     * @param {number} id - Sale ID
     * @returns {Object}
     */
    cancel(id) {
        try {
            const result = salesRepository.cancelSale(id);
            if (!result) {
                return {
                    status: 'error',
                    message: 'Sale not found'
                };
            }
            return {
                status: 'success',
                message: 'Sale cancelled successfully'
            };
        } catch (error) {
            console.error('[SalesService] cancel error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get sales summary
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getSummary(startDate, endDate) {
        try {
            const summary = salesRepository.getSummary(startDate, endDate);
            return {
                status: 'success',
                data: summary
            };
        } catch (error) {
            console.error('[SalesService] getSummary error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get daily sales
     * @param {number} days - Number of days
     * @returns {Object}
     */
    getDailySales(days = 30) {
        try {
            const dailySales = salesRepository.getDailySales(days);
            return {
                status: 'success',
                data: dailySales
            };
        } catch (error) {
            console.error('[SalesService] getDailySales error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Generate invoice number
     * @returns {Object}
     */
    generateInvoiceNo() {
        try {
            const invoiceNo = salesRepository.generateInvoiceNo();
            return {
                status: 'success',
                data: { invoice_no: invoiceNo }
            };
        } catch (error) {
            console.error('[SalesService] generateInvoiceNo error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = new SalesService();
