/**
 * Restock Service
 *
 * Business logic for restock transaction operations.
 * Branch-aware: All restock operations are filtered by the current branch context.
 */

const restockRepository = require('../repositories/RestockRepository.cjs');
const stockRepository = require('../repositories/StockRepository.cjs');
const { branchContextService } = require('./BranchContextService.cjs');

class RestockService {
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
     * Get all restock transactions (filtered by current branch)
     * @param {Object} options - Query options
     * @returns {Object}
     */
    getAll(options = {}) {
        try {
            const branchId = this.getCurrentBranchId();
            const restocks = restockRepository.findAllWithSupplier({
                limit: options.limit || 100,
                orderBy: 'created_at',
                order: 'DESC',
                branchId: branchId
            });
            return {
                status: 'success',
                data: restocks
            };
        } catch (error) {
            console.error('[RestockService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get restock by ID with full details
     * @param {number} id - Restock ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const restock = restockRepository.getFullDetails(id);
            if (!restock) {
                return {
                    status: 'error',
                    message: 'Restock transaction not found'
                };
            }
            return {
                status: 'success',
                data: restock
            };
        } catch (error) {
            console.error('[RestockService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get restock by invoice number
     * @param {string} invoiceNo - Invoice number
     * @returns {Object}
     */
    getByInvoiceNo(invoiceNo) {
        try {
            const restock = restockRepository.findByInvoiceNo(invoiceNo);
            if (!restock) {
                return {
                    status: 'error',
                    message: 'Restock transaction not found'
                };
            }
            return {
                status: 'success',
                data: restockRepository.getFullDetails(restock.id)
            };
        } catch (error) {
            console.error('[RestockService] getByInvoiceNo error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get restocks by supplier (filtered by current branch)
     * @param {number} supplierId - Supplier ID
     * @returns {Object}
     */
    getBySupplierId(supplierId) {
        try {
            const branchId = this.getCurrentBranchId();
            const restocks = restockRepository.findBySupplierId(supplierId, branchId);
            return {
                status: 'success',
                data: restocks
            };
        } catch (error) {
            console.error('[RestockService] getBySupplierId error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get restocks by date range (filtered by current branch)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getByDateRange(startDate, endDate) {
        try {
            const branchId = this.getCurrentBranchId();
            const restocks = restockRepository.findByDateRange(startDate, endDate, branchId);
            return {
                status: 'success',
                data: restocks
            };
        } catch (error) {
            console.error('[RestockService] getByDateRange error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get stock data by SKU (for restock form, filtered by current branch)
     * @param {string} sku - Item SKU
     * @returns {Object}
     */
    getStockDataBySku(sku) {
        try {
            const branchId = this.getCurrentBranchId();
            const stockData = stockRepository.getStockDataBySku(sku, branchId);
            return {
                status: 'success',
                data: stockData
            };
        } catch (error) {
            console.error('[RestockService] getStockDataBySku error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new restock transaction (branch-aware)
     * @param {Object} data - Restock data including items
     * @returns {Object}
     */
    create(data) {
        try {
            const branchContext = this.getBranchContext();

            // Require branch selection for creating restocks
            if (!branchContext.branchId) {
                return {
                    status: 'error',
                    message: 'Please select a branch/outlet before creating a restock transaction'
                };
            }

            if (!data.invoice_no) {
                return {
                    status: 'error',
                    message: 'Invoice number is required'
                };
            }

            // Check if invoice already exists
            const existingInvoice = restockRepository.findByInvoiceNo(data.invoice_no);
            if (existingInvoice) {
                return {
                    status: 'error',
                    message: 'Invoice number already exists'
                };
            }

            const transactionData = {
                invoice_no: data.invoice_no,
                bill_no: data.bill_no,
                supplier_id: data.sup_id || data.supplier_id,
                prepared_by: data.prep_agent_id || data.prepared_by,
                authorized_by: data.auth_agent_id || data.authorized_by,
                payment_method: data.payment_method,
                discount: data.discount || 0,
                expenses: data.expenses || 0,
                total_amount: data.total_amount || 0,
                cash_amount: data.cash_amount || 0,
                change_amount: data.change_amount || 0,
                execution_level: data.exe_level || data.execution_level || 'medium',
                // Branch and audit fields
                branch_id: branchContext.branchId,
                created_by: branchContext.userId // Must be user ID (UUID), not username
            };

            const addedItems = data.added_items || [];
            const returnItems = data.return_items || [];

            const restock = restockRepository.createWithItems(
                transactionData,
                addedItems,
                returnItems
            );

            // Log audit entry
            branchContextService.logAudit('restock_transactions', restock.id, 'INSERT', null, transactionData);

            return {
                status: 'success',
                data: restock,
                message: 'Restock transaction created successfully'
            };
        } catch (error) {
            console.error('[RestockService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get restock summary (filtered by current branch)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getSummary(startDate, endDate) {
        try {
            const branchId = this.getCurrentBranchId();
            const summary = restockRepository.getSummary(startDate, endDate, branchId);
            return {
                status: 'success',
                data: summary
            };
        } catch (error) {
            console.error('[RestockService] getSummary error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get all stock with items (filtered by current branch)
     * @returns {Object}
     */
    getStockItems() {
        try {
            const branchId = this.getCurrentBranchId();
            const stockItems = stockRepository.getAllWithItems(branchId);
            return {
                status: 'success',
                data: stockItems
            };
        } catch (error) {
            console.error('[RestockService] getStockItems error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = new RestockService();
