/**
 * Sales Repository
 *
 * Handles database operations for sales transactions.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { broadcastDataChange, broadcastBatchChange } = require('../utils/eventBroadcaster.cjs');
const { nowISO, getSriLankanDate } = require('../utils/helpers.cjs');

class SalesRepository extends BaseRepository {
    constructor() {
        super('sales_transactions');
    }

    /**
     * Find sale by invoice number
     * @param {string} invoiceNo - Invoice number
     * @returns {Object|null}
     */
    findByInvoiceNo(invoiceNo) {
        return this.findOneWhere({ invoice_no: invoiceNo });
    }

    /**
     * Find sales by member
     * @param {number} memberId - Member ID
     * @returns {Array}
     */
    findByMemberId(memberId) {
        return this.findWhere({ member_id: memberId });
    }

    /**
     * Find sales by cashier
     * @param {string} cashierId - Cashier user ID
     * @returns {Array}
     */
    findByCashierId(cashierId) {
        return this.findWhere({ cashier_id: cashierId });
    }

    /**
     * Find held orders
     * @returns {Array}
     */
    findHeldOrders() {
        return this.findWhere({ is_held: 1 });
    }

    /**
     * Find sales by date range
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @returns {Array}
     */
    findByDateRange(startDate, endDate) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE created_at >= ? AND created_at <= ?
            AND is_held = 0
            ORDER BY created_at DESC
        `);
        return stmt.all(startDate, endDate);
    }

    /**
     * Get sale with full details
     * @param {number} id - Sale ID
     * @returns {Object|null}
     */
    getFullDetails(id) {
        const sale = this.findById(id);
        if (!sale) return null;

        // Get sale items
        const saleItems = this.db.prepare(`
            SELECT
                si.*,
                i.sku,
                i.item_name,
                i.item_image_url
            FROM sales_items si
            JOIN items i ON si.item_id = i.id
            WHERE si.sale_id = ?
        `).all(id);

        // Get member info
        const member = sale.member_id ? this.db.prepare(`
            SELECT * FROM members WHERE id = ?
        `).get(sale.member_id) : null;

        // Get cashier info
        const cashier = sale.cashier_id ? this.db.prepare(`
            SELECT id, username, full_name FROM users WHERE id = ?
        `).get(sale.cashier_id) : null;

        return {
            ...sale,
            member,
            cashier,
            items: saleItems
        };
    }

    /**
     * Create full sale transaction with items
     * @param {Object} data - Sale transaction data
     * @param {Array} items - Sale items
     * @returns {Object}
     */
    createWithItems(data, items = []) {
        const transaction = this.db.transaction(() => {
            // Create main transaction
            const saleData = {
                invoice_no: data.invoice_no,
                member_id: data.member_id,
                cashier_id: data.cashier_id,
                payment_method: data.payment_method || 'cash',
                credit_duration: data.credit_duration,
                subtotal: data.subtotal || 0,
                discount: data.discount || 0,
                total_amount: data.total_amount || 0,
                cash_received: data.cash_received || 0,
                change_amount: data.change_amount || 0,
                status: data.status || 'completed',
                is_held: data.is_held ? 1 : 0,
                created_at: nowISO(),
                sync_status: 'pending'
            };

            const saleStmt = this.db.prepare(`
                INSERT INTO sales_transactions
                (invoice_no, member_id, cashier_id, payment_method, credit_duration,
                subtotal, discount, total_amount, cash_received, change_amount,
                status, is_held, created_at, sync_status)
                VALUES (@invoice_no, @member_id, @cashier_id, @payment_method, @credit_duration,
                @subtotal, @discount, @total_amount, @cash_received, @change_amount,
                @status, @is_held, @created_at, @sync_status)
            `);

            const result = saleStmt.run(saleData);
            const saleId = result.lastInsertRowid;

            // Insert sale items and update stock
            const addItemStmt = this.db.prepare(`
                INSERT INTO sales_items (sale_id, item_id, stock_id, batch_code, quantity, unit_price, discount, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const decreaseStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ?
                WHERE id = ?
            `);

            for (const item of items) {
                addItemStmt.run(
                    saleId,
                    item.item_id,
                    item.stock_id,
                    item.batch_code,
                    item.quantity,
                    item.unit_price,
                    item.discount || 0,
                    item.total_price
                );

                // Decrease stock if not a held order
                if (!data.is_held) {
                    decreaseStockStmt.run(
                        item.quantity,
                        nowISO(),
                        item.stock_id
                    );
                }
            }

            // Update member income if applicable
            if (data.member_id && !data.is_held) {
                const updateMemberStmt = this.db.prepare(`
                    UPDATE members SET
                        total_income = total_income + ?,
                        updated_at = ?
                    WHERE id = ?
                `);
                updateMemberStmt.run(data.total_amount, nowISO(), data.member_id);

                // Handle credit payments
                if (data.payment_method === 'credit') {
                    const updateCreditsStmt = this.db.prepare(`
                        UPDATE members SET
                            total_credits = total_credits + ?,
                            updated_at = ?
                        WHERE id = ?
                    `);
                    updateCreditsStmt.run(data.total_amount, nowISO(), data.member_id);
                }
            }

            const fullSale = this.getFullDetails(saleId);

            // Notify CloudSync of the new sale
            notifyDataChange('sales_transactions', 'INSERT', fullSale, saleId);

            // Broadcast to UI for immediate update
            broadcastDataChange('sales_transactions', 'INSERT', saleId, fullSale);

            // Also notify for each sale item
            for (const item of fullSale.items) {
                notifyDataChange('sales_items', 'INSERT', item, item.id);
            }

            // Broadcast a SINGLE batch stock update instead of individual broadcasts per item
            // This prevents UI refresh storms when selling many items
            if (!data.is_held && items.length > 0) {
                broadcastBatchChange('stock', items.length, 'SALE');
            }

            // Broadcast member update if member was involved
            if (data.member_id && !data.is_held) {
                broadcastDataChange('members', 'UPDATE', data.member_id, null);
            }

            return fullSale;
        });

        return transaction();
    }

    /**
     * Complete a held order
     * @param {number} id - Sale ID
     * @param {Object} updateData - Update data
     * @returns {Object}
     */
    completeHeldOrder(id, updateData = {}) {
        const transaction = this.db.transaction(() => {
            const sale = this.findById(id);
            if (!sale || !sale.is_held) return null;

            // Update sale
            this.update(id, {
                ...updateData,
                is_held: 0,
                status: 'completed'
            });

            // Decrease stock for all items
            const items = this.db.prepare(`
                SELECT * FROM sales_items WHERE sale_id = ?
            `).all(id);

            const decreaseStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ?
                WHERE id = ?
            `);

            for (const item of items) {
                decreaseStockStmt.run(
                    item.quantity,
                    nowISO(),
                    item.stock_id
                );
            }

            const completedSale = this.getFullDetails(id);

            // Broadcast the sale update
            broadcastDataChange('sales_transactions', 'UPDATE', id, completedSale);

            // Broadcast a SINGLE batch stock update instead of per-item
            if (items.length > 0) {
                broadcastBatchChange('stock', items.length, 'SALE_COMPLETE');
            }

            return completedSale;
        });

        return transaction();
    }

    /**
     * Cancel a sale
     * @param {number} id - Sale ID
     * @returns {boolean}
     */
    cancelSale(id) {
        const transaction = this.db.transaction(() => {
            const sale = this.getFullDetails(id);
            if (!sale) return false;

            // Restore stock
            const restoreStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = quantity + ?, updated_at = ?
                WHERE id = ?
            `);

            for (const item of sale.items) {
                restoreStockStmt.run(
                    item.quantity,
                    nowISO(),
                    item.stock_id
                );
            }

            // Update sale status (this.update already broadcasts via BaseRepository)
            this.update(id, { status: 'cancelled' });

            // Broadcast a SINGLE batch stock update instead of per-item
            if (sale.items.length > 0) {
                broadcastBatchChange('stock', sale.items.length, 'SALE_CANCEL');
            }

            return true;
        });

        return transaction();
    }

    /**
     * Get sales summary by date
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getSummary(startDate, endDate) {
        const stmt = this.db.prepare(`
            SELECT
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_sales,
                SUM(discount) as total_discount,
                SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_sales,
                SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END) as credit_sales,
                AVG(total_amount) as average_sale
            FROM ${this.tableName}
            WHERE created_at >= ? AND created_at <= ?
            AND status = 'completed' AND is_held = 0
        `);
        return stmt.get(startDate, endDate);
    }

    /**
     * Get daily sales totals
     * @param {number} days - Number of days
     * @returns {Array}
     */
    getDailySales(days = 30) {
        const stmt = this.db.prepare(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                SUM(total_amount) as total_sales
            FROM ${this.tableName}
            WHERE created_at >= DATE('now', '-' || ? || ' days')
            AND status = 'completed' AND is_held = 0
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        return stmt.all(days);
    }

    /**
     * Generate unique invoice number
     * @param {string} prefix - Optional prefix
     * @returns {string}
     */
    generateInvoiceNo(prefix = 'INV') {
        const today = getSriLankanDate();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const count = this.countWhere({}) + 1;
        const padded = String(count).padStart(6, '0');
        return `${prefix}${dateStr}${padded}`;
    }

    /**
     * Find sales pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }
}

module.exports = new SalesRepository();
