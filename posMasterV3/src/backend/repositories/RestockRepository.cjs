/**
 * Restock Repository
 *
 * Handles database operations for restock transactions.
 * Branch-aware: Supports filtering by branch_id.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { broadcastDataChange, broadcastBatchChange } = require('../utils/eventBroadcaster.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class RestockRepository extends BaseRepository {
    constructor() {
        super('restock_transactions');
    }

    /**
     * Find all restocks with supplier info (with optional branch filter)
     * @param {Object} options - Query options including branchId
     * @returns {Array}
     */
    findAllWithSupplier(options = {}) {
        const limit = options.limit || 100;
        const offset = options.offset || 0;
        const orderBy = options.orderBy || 'created_at';
        const order = options.order || 'DESC';
        const branchId = options.branchId || null;

        let sql = `
            SELECT rt.*, s.basic_info as supplier_basic_info
            FROM ${this.tableName} rt
            LEFT JOIN suppliers s ON rt.supplier_id = s.id
        `;
        const params = [];

        if (branchId) {
            sql += ` WHERE rt.branch_id = ?`;
            params.push(branchId);
        }

        sql += ` ORDER BY rt.${orderBy} ${order} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        return rows.map(row => {
            const { supplier_basic_info, ...restockData } = row;
            let supplier = null;

            if (supplier_basic_info) {
                supplier = {
                    basic_info: typeof supplier_basic_info === 'string'
                        ? JSON.parse(supplier_basic_info)
                        : supplier_basic_info
                };
            }

            return {
                ...restockData,
                supplier
            };
        });
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
     * Find restocks by supplier (with optional branch filter)
     * @param {number} supplierId - Supplier ID
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findBySupplierId(supplierId, branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE supplier_id = ? AND branch_id = ?
                ORDER BY created_at DESC
            `);
            return stmt.all(supplierId, branchId);
        }
        return this.findWhere({ supplier_id: supplierId });
    }

    /**
     * Find restocks by date range (with optional branch filter)
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findByDateRange(startDate, endDate, branchId = null) {
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE created_at >= ? AND created_at <= ?
        `;
        const params = [startDate, endDate];

        if (branchId) {
            sql += ` AND branch_id = ?`;
            params.push(branchId);
        }

        sql += ` ORDER BY created_at DESC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Get restock with full details
     * @param {number} id - Restock ID
     * @returns {Object|null}
     */
    getFullDetails(id) {
        const restock = this.findById(id);
        if (!restock) return null;

        // Get restock items with all fields
        const restockItems = this.db.prepare(`
            SELECT
                ri.id,
                ri.restock_id,
                ri.item_id,
                ri.batch_code,
                ri.quantity,
                ri.stock_price,
                ri.retail_price,
                ri.expiry_date,
                i.sku,
                i.item_name
            FROM restock_items ri
            JOIN items i ON ri.item_id = i.id
            WHERE ri.restock_id = ?
        `).all(id);

        // Get return items with all fields
        const returnItems = this.db.prepare(`
            SELECT
                rt.id,
                rt.restock_id,
                rt.item_id,
                rt.batch_code,
                rt.quantity,
                rt.description,
                i.sku,
                i.item_name
            FROM return_items rt
            JOIN items i ON rt.item_id = i.id
            WHERE rt.restock_id = ?
        `).all(id);

        // Resolve prepared_by to username
        let preparedByName = restock.prepared_by;
        if (restock.prepared_by) {
            const prepUser = this.db.prepare(`SELECT username, full_name FROM users WHERE id = ?`).get(restock.prepared_by);
            if (prepUser) {
                preparedByName = prepUser.full_name || prepUser.username;
            }
        }

        // Resolve authorized_by to username
        let authorizedByName = restock.authorized_by;
        if (restock.authorized_by) {
            const authUser = this.db.prepare(`SELECT username, full_name FROM users WHERE id = ?`).get(restock.authorized_by);
            if (authUser) {
                authorizedByName = authUser.full_name || authUser.username;
            }
        }

        // Get supplier info
        let supplier = null;
        if (restock.supplier_id) {
            const supplierRow = this.db.prepare(`
                SELECT * FROM suppliers WHERE id = ?
            `).get(restock.supplier_id);

            if (supplierRow) {
                // Parse JSON fields if stored as strings
                supplier = {
                    id: supplierRow.id,
                    basic_info: typeof supplierRow.basic_info === 'string'
                        ? JSON.parse(supplierRow.basic_info)
                        : supplierRow.basic_info,
                    contact_info: typeof supplierRow.contact_info === 'string'
                        ? JSON.parse(supplierRow.contact_info)
                        : supplierRow.contact_info,
                    financial_info: typeof supplierRow.financial_info === 'string'
                        ? JSON.parse(supplierRow.financial_info)
                        : supplierRow.financial_info
                };
            }
        }

        return {
            ...restock,
            prepared_by_name: preparedByName,
            authorized_by_name: authorizedByName,
            supplier,
            added_items: restockItems,
            return_items: returnItems
        };
    }

    /**
     * Create full restock transaction with items (branch-aware)
     * @param {Object} data - Restock transaction data including branch_id
     * @param {Array} addedItems - Items to add
     * @param {Array} returnItems - Items to return
     * @returns {Object}
     */
    createWithItems(data, addedItems = [], returnItems = []) {
        const transaction = this.db.transaction(() => {
            // Create main transaction
            const now = nowISO();
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
                created_at: now,
                updated_at: now,
                sync_status: 'pending',
                // Branch and audit fields
                branch_id: data.branch_id || null,
                created_by: data.created_by || null
            };

            const restockStmt = this.db.prepare(`
                INSERT INTO restock_transactions
                (invoice_no, bill_no, supplier_id, prepared_by, authorized_by, payment_method,
                discount, expenses, total_amount, cash_amount, change_amount, execution_level,
                status, created_at, updated_at, sync_status, branch_id, created_by)
                VALUES (@invoice_no, @bill_no, @supplier_id, @prepared_by, @authorized_by, @payment_method,
                @discount, @expenses, @total_amount, @cash_amount, @change_amount, @execution_level,
                @status, @created_at, @updated_at, @sync_status, @branch_id, @created_by)
            `);

            const result = restockStmt.run(restockData);
            const restockId = result.lastInsertRowid;

            // Insert added items and update stock
            const addItemStmt = this.db.prepare(`
                INSERT INTO restock_items (restock_id, item_id, batch_code, quantity, stock_price, retail_price, expiry_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const findItemStmt = this.db.prepare(`SELECT id FROM items WHERE sku = ?`);
            const branchId = data.branch_id || null;
            const upsertStockStmt = this.db.prepare(`
                INSERT INTO stock (item_id, batch_code, quantity, stock_price, retail_price, expiry_date, availability, branch_id, created_at, updated_at, sync_status)
                VALUES (@item_id, @batch_code, @quantity, @stock_price, @retail_price, @expiry_date, 1, @branch_id, @created_at, @updated_at, 'pending')
                ON CONFLICT(item_id, batch_code) DO UPDATE SET
                    quantity = quantity + @quantity,
                    stock_price = @stock_price,
                    retail_price = @retail_price,
                    expiry_date = COALESCE(@expiry_date, expiry_date),
                    branch_id = COALESCE(@branch_id, branch_id),
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

                // Update stock with branch_id
                const now = nowISO();
                upsertStockStmt.run({
                    item_id: itemRecord.id,
                    batch_code: item.batch_code,
                    quantity: item.qty,
                    stock_price: item.stock_price,
                    retail_price: item.retail_price,
                    expiry_date: item.exp_date,
                    branch_id: branchId,
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

            // Broadcast to UI for immediate update
            broadcastDataChange('restock_transactions', 'INSERT', restockId, fullRestock);

            // Also notify for each restock item and stock update
            for (const item of fullRestock.added_items) {
                notifyDataChange('restock_items', 'INSERT', item, item.id);
            }
            for (const item of fullRestock.return_items) {
                notifyDataChange('return_items', 'INSERT', item, item.id);
            }

            // Broadcast a SINGLE batch stock update instead of individual broadcasts per item
            // This prevents UI refresh storms when restocking many items
            const totalStockChanges = addedItems.length + returnItems.length;
            if (totalStockChanges > 0) {
                broadcastBatchChange('stock', totalStockChanges, 'RESTOCK');
            }

            return fullRestock;
        });

        return transaction();
    }

    /**
     * Get restock summary by date (with optional branch filter)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Object}
     */
    getSummary(startDate, endDate, branchId = null) {
        let sql = `
            SELECT
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_amount,
                SUM(discount) as total_discount,
                SUM(expenses) as total_expenses
            FROM ${this.tableName}
            WHERE created_at >= ? AND created_at <= ?
        `;
        const params = [startDate, endDate];

        if (branchId) {
            sql += ` AND branch_id = ?`;
            params.push(branchId);
        }

        const stmt = this.db.prepare(sql);
        return stmt.get(...params);
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
