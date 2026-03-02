/**
 * Sales Service
 *
 * Business logic for sales transaction operations.
 * Branch-aware: All sales operations are filtered by the current branch context.
 */

const salesRepository = require('../repositories/SalesRepository.cjs');
const { branchContextService } = require('./BranchContextService.cjs');

class SalesService {
    /**
     * Get the current branch ID from context
     * @returns {number|null}
     */
    getCurrentBranchId() {
        return branchContextService.getCurrentBranchId();
    }

    /**
     * Get full branch context for audit logging
     * @returns {Object}
     */
    getBranchContext() {
        return branchContextService.getBranchContext();
    }
    /**
     * Get all sales (filtered by current branch)
     * @param {Object} options - Query options
     * @returns {Object}
     */
    getAll(options = {}) {
        try {
            const branchId = this.getCurrentBranchId();
            const sales = salesRepository.findAll({
                limit: options.limit || 100,
                orderBy: 'created_at',
                order: 'DESC',
                branchId: branchId // Filter by branch
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
     * Get sales by member (filtered by current branch)
     * @param {number} memberId - Member ID
     * @returns {Object}
     */
    getByMemberId(memberId) {
        try {
            const branchId = this.getCurrentBranchId();
            const sales = salesRepository.findByMemberId(memberId, branchId);
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
     * Get sales by date range (filtered by current branch)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getByDateRange(startDate, endDate) {
        try {
            const branchId = this.getCurrentBranchId();
            const sales = salesRepository.findByDateRange(startDate, endDate, branchId);
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
     * Get held orders (filtered by current branch)
     * @returns {Object}
     */
    getHeldOrders() {
        try {
            const branchId = this.getCurrentBranchId();
            const heldOrders = salesRepository.findHeldOrders(branchId);
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
            const branchContext = this.getBranchContext();

            // Require branch selection for creating sales
            if (!branchContext.branchId) {
                return {
                    status: 'error',
                    message: 'Please select a branch/outlet before creating a sale'
                };
            }

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
                is_held: data.is_held || false,
                // Branch and audit fields
                branch_id: branchContext.branchId,
                created_by: branchContext.userId // Must be user ID (UUID), not username
            };

            const items = data.items || [];

            const sale = salesRepository.createWithItems(saleData, items);

            // Log audit entry
            branchContextService.logAudit('sales_transactions', sale.id, 'INSERT', null, saleData);

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
     * Return items from a completed sale
     * @param {number} saleId - Sale ID
     * @param {Array} items - Items to return: [{ sale_item_id, stock_id, item_id, batch_code, quantity, unit_price }]
     * @param {string|null} reason - Return reason
     * @returns {Object}
     */
    returnItems(saleId, items, reason) {
        try {
            const sale = salesRepository.getFullDetails(saleId);
            if (!sale) {
                return { status: 'error', message: 'Sale not found' };
            }
            if (!['completed', 'partial_return'].includes(sale.status)) {
                return { status: 'error', message: `Cannot return items from a sale with status: ${sale.status}` };
            }
            if (!items || items.length === 0) {
                return { status: 'error', message: 'No items specified for return' };
            }

            // Validate quantities don't exceed what was originally sold
            for (const returnItem of items) {
                const originalItem = sale.items.find(
                    si => si.stock_id === returnItem.stock_id && si.item_id === returnItem.item_id
                );
                if (!originalItem) {
                    return { status: 'error', message: `Item not found in original sale` };
                }
                if (returnItem.quantity <= 0) {
                    return { status: 'error', message: 'Return quantity must be greater than 0' };
                }
                if (returnItem.quantity > originalItem.quantity) {
                    return {
                        status: 'error',
                        message: `Cannot return ${returnItem.quantity} units — only ${originalItem.quantity} were sold`
                    };
                }
            }

            const returnedBy = null; // Caller can pass via items payload if needed
            const returnedRecords = salesRepository.returnSaleItems(saleId, items, reason, returnedBy);

            return {
                status: 'success',
                data: returnedRecords,
                message: 'Return processed successfully'
            };
        } catch (error) {
            console.error('[SalesService] returnItems error:', error);
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Get sales summary (filtered by current branch)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getSummary(startDate, endDate) {
        try {
            const branchId = this.getCurrentBranchId();
            const summary = salesRepository.getSummary(startDate, endDate, branchId);
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
     * Get daily sales (filtered by current branch)
     * @param {number} days - Number of days
     * @returns {Object}
     */
    getDailySales(days = 30) {
        try {
            const branchId = this.getCurrentBranchId();
            const dailySales = salesRepository.getDailySales(days, branchId);
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
