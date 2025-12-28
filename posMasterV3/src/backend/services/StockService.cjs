/**
 * Stock Service
 *
 * Business logic for stock/inventory operations.
 * Branch-aware: Stock is managed per branch/outlet.
 */

const stockRepository = require('../repositories/StockRepository.cjs');
const itemRepository = require('../repositories/ItemRepository.cjs');
const { branchContextService } = require('./BranchContextService.cjs');

class StockService {
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
     * Get all stock (filtered by current branch)
     * @returns {Object}
     */
    getAll() {
        try {
            const branchId = this.getCurrentBranchId();
            const stock = stockRepository.findAll({ limit: 10000, branchId });
            return {
                status: 'success',
                data: stock
            };
        } catch (error) {
            console.error('[StockService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get all stock with item details (filtered by current branch)
     * @returns {Object}
     */
    getAllWithItems() {
        try {
            const branchId = this.getCurrentBranchId();
            const stock = stockRepository.getAllWithItems(branchId);
            return {
                status: 'success',
                data: stock.map(s => this.formatStockWithItem(s))
            };
        } catch (error) {
            console.error('[StockService] getAllWithItems error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get stock by item SKU
     * @param {string} sku - Item SKU
     * @returns {Object}
     */
    getByItemSku(sku) {
        try {
            const stockData = stockRepository.getStockDataBySku(sku);
            return {
                status: 'success',
                data: stockData
            };
        } catch (error) {
            console.error('[StockService] getByItemSku error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get stock by ID
     * @param {number} id - Stock ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const stock = stockRepository.findById(id);
            if (!stock) {
                return {
                    status: 'error',
                    message: 'Stock not found'
                };
            }
            return {
                status: 'success',
                data: stock
            };
        } catch (error) {
            console.error('[StockService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get low stock items (filtered by current branch)
     * @returns {Object}
     */
    getLowStock() {
        try {
            const branchId = this.getCurrentBranchId();
            const lowStock = stockRepository.getLowStock(branchId);
            return {
                status: 'success',
                data: lowStock
            };
        } catch (error) {
            console.error('[StockService] getLowStock error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get expiring stock (filtered by current branch)
     * @param {number} days - Days until expiry
     * @returns {Object}
     */
    getExpiringStock(days = 30) {
        try {
            const branchId = this.getCurrentBranchId();
            const expiringStock = stockRepository.getExpiringStock(days, branchId);
            return {
                status: 'success',
                data: expiringStock
            };
        } catch (error) {
            console.error('[StockService] getExpiringStock error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get stock value summary (filtered by current branch)
     * @returns {Object}
     */
    getStockValue() {
        try {
            const branchId = this.getCurrentBranchId();
            const value = stockRepository.getTotalStockValue(branchId);
            return {
                status: 'success',
                data: value
            };
        } catch (error) {
            console.error('[StockService] getStockValue error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create or update stock (branch-aware)
     * @param {Object} data - Stock data
     * @returns {Object}
     */
    upsert(data) {
        try {
            const branchContext = this.getBranchContext();

            // Require branch selection for creating/updating stock
            if (!branchContext.branchId) {
                return {
                    status: 'error',
                    message: 'Please select a branch/outlet before updating stock'
                };
            }

            if (!data.item_id && !data.sku) {
                return {
                    status: 'error',
                    message: 'Item ID or SKU is required'
                };
            }

            if (!data.batch_code) {
                return {
                    status: 'error',
                    message: 'Batch code is required'
                };
            }

            // Get item_id from SKU if not provided
            let itemId = data.item_id;
            if (!itemId && data.sku) {
                const item = itemRepository.findBySku(data.sku);
                if (!item) {
                    return {
                        status: 'error',
                        message: 'Item not found'
                    };
                }
                itemId = item.id;
            }

            const stockData = {
                item_id: itemId,
                batch_code: data.batch_code,
                quantity: data.quantity || data.qty || 0,
                stock_price: data.stock_price || 0,
                retail_price: data.retail_price || 0,
                discount_price: data.discount_price || 0,
                expiry_date: data.expiry_date || data.exp_date || null,
                threshold_limit: data.threshold_limit || 0,
                availability: data.availability !== undefined ? data.availability : 1,
                // Branch assignment
                branch_id: branchContext.branchId
            };

            const stock = stockRepository.upsertStock(stockData);

            // Log audit entry
            branchContextService.logAudit('stock', stock.id, 'UPSERT', null, stockData);

            return {
                status: 'success',
                data: stock,
                message: 'Stock updated successfully'
            };
        } catch (error) {
            console.error('[StockService] upsert error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update stock quantity
     * @param {number} id - Stock ID
     * @param {number} quantity - New quantity
     * @returns {Object}
     */
    updateQuantity(id, quantity) {
        try {
            const existing = stockRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Stock not found'
                };
            }

            const stock = stockRepository.updateQuantity(id, quantity);
            return {
                status: 'success',
                data: stock,
                message: 'Stock quantity updated successfully'
            };
        } catch (error) {
            console.error('[StockService] updateQuantity error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update stock prices
     * @param {number} id - Stock ID
     * @param {number} stockPrice - New stock price
     * @param {number} retailPrice - New retail price
     * @returns {Object}
     */
    updatePrices(id, stockPrice, retailPrice) {
        try {
            const existing = stockRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Stock not found'
                };
            }

            const stock = stockRepository.updatePrices(id, stockPrice, retailPrice);
            return {
                status: 'success',
                data: stock,
                message: 'Stock prices updated successfully'
            };
        } catch (error) {
            console.error('[StockService] updatePrices error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete stock
     * @param {number} id - Stock ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = stockRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Stock not found'
                };
            }

            stockRepository.delete(id);
            return {
                status: 'success',
                message: 'Stock deleted successfully'
            };
        } catch (error) {
            console.error('[StockService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format stock with item details for frontend
     * @param {Object} stock - Raw stock with item data
     * @returns {Object}
     */
    formatStockWithItem(stock) {
        return {
            id: stock.id,
            _id: stock.cloud_id || stock.id.toString(),
            batch_code: stock.batch_code,
            quantity: stock.quantity,
            stock_price: stock.stock_price,
            retail_price: stock.retail_price,
            discount_price: stock.discount_price,
            expiry_date: stock.expiry_date,
            threshold_limit: stock.threshold_limit,
            availability: stock.availability === 1,
            item: {
                id: stock.item_id,
                sku: stock.sku,
                item_name: stock.item_name,
                item_image_url: stock.item_image_url,
                maximum_capacity: stock.maximum_capacity,
                category: stock.category_brand ? {
                    brand: stock.category_brand,
                    type: stock.category_type
                } : null,
                uom: stock.uom_symbol ? {
                    symbol: stock.uom_symbol,
                    unit_name: stock.uom_unit_name
                } : null
            }
        };
    }
}

module.exports = new StockService();
