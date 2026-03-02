/**
 * Disposed Items Service
 *
 * Business logic for recording stock disposals.
 * Each disposal atomically decrements the stock quantity.
 */

const DisposedItemsRepository = require('../repositories/DisposedItemsRepository.cjs');
const stockRepository = require('../repositories/StockRepository.cjs');
const { branchContextService } = require('./BranchContextService.cjs');
const { getDatabase } = require('../database/connection.cjs');
const { nowISO } = require('../utils/helpers.cjs');

const disposedRepo = new DisposedItemsRepository();

class DisposedItemsService {
    getCurrentBranchId() {
        return branchContextService.getCurrentBranchId();
    }

    /**
     * Get all disposed items (filtered by current branch)
     * @returns {Object}
     */
    getAll() {
        try {
            const branchId = this.getCurrentBranchId();
            const items = disposedRepo.getAllWithDetails(branchId);
            return { status: 'success', data: items };
        } catch (error) {
            console.error('[DisposedItemsService] getAll error:', error);
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Record a new disposal and decrement stock atomically
     * @param {Object} data - { stock_id, quantity, reason, disposed_by }
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.stock_id) {
                return { status: 'error', message: 'stock_id is required' };
            }
            const qty = parseFloat(data.quantity);
            if (!qty || qty <= 0) {
                return { status: 'error', message: 'Quantity must be greater than 0' };
            }

            const stock = stockRepository.findById(data.stock_id);
            if (!stock) {
                return { status: 'error', message: 'Stock record not found' };
            }
            if (stock.quantity < qty) {
                return {
                    status: 'error',
                    message: `Cannot dispose ${qty} units — only ${stock.quantity} available`
                };
            }

            const db = getDatabase();
            let disposedRecord;

            const transaction = db.transaction(() => {
                // Decrement stock
                db.prepare(`
                    UPDATE stock SET quantity = quantity - ?, updated_at = ?, sync_status = 'pending'
                    WHERE id = ?
                `).run(qty, nowISO(), data.stock_id);

                // Insert disposal record
                const result = db.prepare(`
                    INSERT INTO disposed_items
                        (item_id, stock_id, batch_code, quantity, reason, disposed_by, disposed_at, sync_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
                `).run(
                    stock.item_id,
                    data.stock_id,
                    stock.batch_code,
                    qty,
                    data.reason || null,
                    data.disposed_by || null,
                    nowISO()
                );

                disposedRecord = disposedRepo.findById(result.lastInsertRowid);
            });

            transaction();

            return {
                status: 'success',
                data: disposedRecord,
                message: 'Disposal recorded successfully'
            };
        } catch (error) {
            console.error('[DisposedItemsService] create error:', error);
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Get disposed items by date range (filtered by current branch)
     * @param {string} startDate
     * @param {string} endDate
     * @returns {Object}
     */
    getByDateRange(startDate, endDate) {
        try {
            const branchId = this.getCurrentBranchId();
            const items = disposedRepo.findByDateRange(startDate, endDate, branchId);
            return { status: 'success', data: items };
        } catch (error) {
            console.error('[DisposedItemsService] getByDateRange error:', error);
            return { status: 'error', message: error.message };
        }
    }
}

module.exports = new DisposedItemsService();
