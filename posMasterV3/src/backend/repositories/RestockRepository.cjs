/**
 * Restock Repository
 *
 * Handles database operations for restock transactions.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class RestockRepository extends BaseRepository {
    constructor() {
        super('restock_transactions');
    }

    /**
     * Find restock by invoice number
     * @param {string} invoiceNo - Invoice number
     * @returns {Object|null}
     */
    findByInvoiceNo(invoiceNo) {
        return this.findOneWhere({ invoice_no: invoiceNo });
    }

    /**
     * Find restocks by supplier
     * @param {number} supplierId - Supplier ID
     * @returns {Array}
     */
    findBySupplierId(supplierId) {
        return this.findWhere({ supplier_id: supplierId });
    }

    /**
     * Find restocks by date range
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @returns {Array}
     */
    findByDateRange(startDate, endDate) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE created_at >= ? AND created_at <= ?
            ORDER BY created_at DESC
        `);
        return stmt.all(startDate, endDate);
    }

    /**
     * Get restock with full details
     * @param {number} id - Restock ID
     * @returns {Object|null}
     */
    getFullDetails(id) {
        const restock = this.findById(id);
        if (!restock) return null;

        // Get restock items
        const restockItems = this.db.prepare(`
            SELECT
                ri.*,
                i.sku,
                i.item_name
            FROM restock_items ri
            JOIN items i ON ri.item_id = i.id
            WHERE ri.restock_id = ?
        `).all(id);

        // Get return items
        const returnItems = this.db.prepare(`
            SELECT
                rt.*,
                i.sku,
                i.item_name
            FROM return_items rt
            JOIN items i ON rt.item_id = i.id
            WHERE rt.restock_id = ?
        `).all(id);

        // Get supplier info
        const supplier = restock.supplier_id ? this.db.prepare(`
            SELECT * FROM suppliers WHERE id = ?
        `).get(restock.supplier_id) : null;

        return {
            ...restock,
            supplier,
            added_items: restockItems,
            return_items: returnItems
        };
    }

    /**
     * Create full restock transaction with items
     * @param {Object} data - Restock transaction data
     * @param {Array} addedItems - Items to add
     * @param {Array} returnItems - Items to return
     * @returns {Object}
     */
    createWithItems(data, addedItems = [], returnItems = []) {
        const transaction = this.db.transaction(() => {
            // Create main transaction
            const restockData = {
                invoice_no: data.invoice_no,
                bill_no: data.bill_no,
                supplier_id: data.supplier_id,
                prepared_by: data.prepared_by,
                authorized_by: data.authorized_by,
                payment_method: data.payment_method,
                discount: data.discount || 0,
                expenses: data.expenses || 0,
                total_amount: data.total_amount || 0,
                cash_amount: data.cash_amount || 0,
                change_amount: data.change_amount || 0,
                execution_level: data.execution_level || 'medium',
                status: 'completed',
                created_at: nowISO(),
                sync_status: 'pending'
            };

            const restockStmt = this.db.prepare(`
                INSERT INTO restock_transactions
                (invoice_no, bill_no, supplier_id, prepared_by, authorized_by, payment_method,
                discount, expenses, total_amount, cash_amount, change_amount, execution_level,
                status, created_at, sync_status)
                VALUES (@invoice_no, @bill_no, @supplier_id, @prepared_by, @authorized_by, @payment_method,
                @discount, @expenses, @total_amount, @cash_amount, @change_amount, @execution_level,
                @status, @created_at, @sync_status)
            `);

            const result = restockStmt.run(restockData);
            const restockId = result.lastInsertRowid;

            // Insert added items and update stock
            const addItemStmt = this.db.prepare(`
                INSERT INTO restock_items (restock_id, item_id, batch_code, quantity, stock_price, retail_price, expiry_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const findItemStmt = this.db.prepare(`SELECT id FROM items WHERE sku = ?`);
            const upsertStockStmt = this.db.prepare(`
                INSERT INTO stock (item_id, batch_code, quantity, stock_price, retail_price, expiry_date, availability, created_at, updated_at, sync_status)
                VALUES (@item_id, @batch_code, @quantity, @stock_price, @retail_price, @expiry_date, 1, @created_at, @updated_at, 'pending')
                ON CONFLICT(item_id, batch_code) DO UPDATE SET
                    quantity = quantity + @quantity,
                    stock_price = @stock_price,
                    retail_price = @retail_price,
                    expiry_date = COALESCE(@expiry_date, expiry_date),
                    updated_at = @updated_at
            `);

            for (const item of addedItems) {
                const itemRecord = findItemStmt.get(item.sku);
                if (!itemRecord) continue;

                addItemStmt.run(
                    restockId,
                    itemRecord.id,
                    item.batch_code,
                    item.qty,
                    item.stock_price,
                    item.retail_price,
                    item.exp_date
                );

                // Update stock
                const now = nowISO();
                upsertStockStmt.run({
                    item_id: itemRecord.id,
                    batch_code: item.batch_code,
                    quantity: item.qty,
                    stock_price: item.stock_price,
                    retail_price: item.retail_price,
                    expiry_date: item.exp_date,
                    created_at: now,
                    updated_at: now
                });
            }

            // Insert return items and update stock (decrease quantity)
            const returnItemStmt = this.db.prepare(`
                INSERT INTO return_items (restock_id, item_id, batch_code, quantity, description)
                VALUES (?, ?, ?, ?, ?)
            `);

            const decreaseStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ?
                WHERE item_id = ? AND batch_code = ?
            `);

            for (const item of returnItems) {
                const itemRecord = findItemStmt.get(item.sku);
                if (!itemRecord) continue;

                returnItemStmt.run(
                    restockId,
                    itemRecord.id,
                    item.batch_code,
                    item.qty,
                    item.description
                );

                // Decrease stock
                decreaseStockStmt.run(
                    item.qty,
                    nowISO(),
                    itemRecord.id,
                    item.batch_code
                );
            }

            const fullRestock = this.getFullDetails(restockId);

            // Notify CloudSync of the new restock
            notifyDataChange('restock_transactions', 'INSERT', fullRestock, restockId);

            // Also notify for each restock item and stock update
            for (const item of fullRestock.added_items) {
                notifyDataChange('restock_items', 'INSERT', item, item.id);
            }
            for (const item of fullRestock.return_items) {
                notifyDataChange('return_items', 'INSERT', item, item.id);
            }

            return fullRestock;
        });

        return transaction();
    }

    /**
     * Get restock summary by date
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Object}
     */
    getSummary(startDate, endDate) {
        const stmt = this.db.prepare(`
            SELECT
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_amount,
                SUM(discount) as total_discount,
                SUM(expenses) as total_expenses
            FROM ${this.tableName}
            WHERE created_at >= ? AND created_at <= ?
        `);
        return stmt.get(startDate, endDate);
    }

    /**
     * Find restocks pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }
}

module.exports = new RestockRepository();
