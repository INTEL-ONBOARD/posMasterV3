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
        this._ensureRestockItemsColumns();
    }

    /**
     * Self-heal: add missing sync columns to restock_items if absent.
     * Runs at construction time so the INSERT never fails regardless of
     * which migrations ran on this device.
     */
    _ensureRestockItemsColumns() {
        try {
            const cols = this.db.prepare('PRAGMA table_info(restock_items)').all().map(c => c.name);

            if (!cols.includes('sync_status')) {
                this.db.exec(`ALTER TABLE restock_items ADD COLUMN sync_status TEXT DEFAULT 'pending';`);
                this.db.exec(`UPDATE restock_items SET sync_status = 'synced' WHERE sync_status IS NULL;`);
                console.log('[RestockRepository] Self-healed: added sync_status to restock_items');
            }
            if (!cols.includes('cloud_id')) {
                this.db.exec(`ALTER TABLE restock_items ADD COLUMN cloud_id TEXT;`);
                console.log('[RestockRepository] Self-healed: added cloud_id to restock_items');
            }
            if (!cols.includes('updated_at')) {
                this.db.exec(`ALTER TABLE restock_items ADD COLUMN updated_at TEXT;`);
                this.db.exec(`UPDATE restock_items SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
                console.log('[RestockRepository] Self-healed: added updated_at to restock_items');
            }
            if (!cols.includes('created_at')) {
                this.db.exec(`ALTER TABLE restock_items ADD COLUMN created_at TEXT;`);
                this.db.exec(`UPDATE restock_items SET created_at = COALESCE(updated_at, datetime('now')) WHERE created_at IS NULL;`);
                console.log('[RestockRepository] Self-healed: added created_at to restock_items');
            }
        } catch (e) {
            // Non-fatal — will still fail at INSERT time with original error if truly broken
            console.error('[RestockRepository] Column self-heal failed:', e.message);
        }
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
            SELECT rt.*, s.supplier_name, s.contact as supplier_contact, s.supplier_address
            FROM ${this.tableName} rt
            LEFT JOIN suppliers s ON rt.supplier_id = s.id
        `;
        const params = [];

        if (branchId) {
            // Include restocks for this branch OR restocks without a branch (backwards compatibility)
            sql += ` WHERE (rt.branch_id = ? OR rt.branch_id IS NULL)`;
            params.push(branchId);
        }

        const safeOrderBy = this.sanitizeOrderColumn(orderBy);
        const safeOrder = this.sanitizeOrderDirection(order);
        sql += ` ORDER BY rt.${safeOrderBy} ${safeOrder} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        return rows.map(row => {
            const { supplier_name, supplier_contact, supplier_address, ...restockData } = row;
            let supplier = null;

            if (supplier_name) {
                supplier = {
                    basic_info: {
                        supplier_name: supplier_name,
                        contact: supplier_contact,
                        supplier_address: supplier_address
                    }
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
                // Map actual supplier columns to expected structure
                supplier = {
                    id: supplierRow.id,
                    basic_info: {
                        supplier_name: supplierRow.supplier_name,
                        contact: supplierRow.contact,
                        supplier_address: supplierRow.supplier_address,
                        type: supplierRow.type,
                        status: supplierRow.status
                    },
                    contact_info: {
                        contact: supplierRow.contact
                    },
                    financial_info: {
                        current_amount: supplierRow.current_amount,
                        previous_amount: supplierRow.previous_amount,
                        account_number: supplierRow.account_number,
                        account_bank: supplierRow.account_bank,
                        account_branch: supplierRow.account_branch,
                        account_name: supplierRow.account_name,
                        account_nickname: supplierRow.account_nickname
                    }
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
            const insertPreparedRecord = (tableName, recordData) => {
                const preparedData = this.prepareCreateData(recordData, tableName);
                const columns = Object.keys(preparedData);
                const values = columns.map(col => `@${col}`).join(', ');
                const stmt = this.db.prepare(`
                    INSERT INTO ${tableName} (${columns.join(', ')})
                    VALUES (${values})
                `);
                const insertResult = stmt.run(preparedData);
                return {
                    preparedData,
                    result: insertResult,
                    recordId: preparedData.id ?? insertResult.lastInsertRowid
                };
            };

            // Create main transaction
            const now = nowISO();

            // DEBUG: Log incoming data to help identify FK issues
            console.log('[RestockRepository] Creating restock with data:', {
                supplier_id: data.supplier_id,
                branch_id: data.branch_id,
                created_by: data.created_by,
                prepared_by: data.prepared_by,
                authorized_by: data.authorized_by,
                addedItemsCount: addedItems.length,
                returnItemsCount: returnItems.length
            });

            // Validate foreign keys before insert
            if (data.supplier_id) {
                const supplier = this.db.prepare('SELECT id FROM suppliers WHERE id = ?').get(data.supplier_id);
                if (!supplier) {
                    console.error('[RestockRepository] FK ERROR: supplier_id', data.supplier_id, 'does not exist in suppliers table');
                    throw new Error(`Supplier with id ${data.supplier_id} not found`);
                }
            }
            if (data.branch_id) {
                const branch = this.db.prepare('SELECT id FROM branches WHERE id = ?').get(data.branch_id);
                if (!branch) {
                    console.error('[RestockRepository] FK ERROR: branch_id', data.branch_id, 'does not exist in branches table');
                    throw new Error(`Branch with id ${data.branch_id} not found`);
                }
            }
            if (data.created_by) {
                const user = this.db.prepare('SELECT id FROM users WHERE id = ?').get(data.created_by);
                if (!user) {
                    console.error('[RestockRepository] FK ERROR: created_by', data.created_by, 'does not exist in users table');
                    throw new Error(`User with id ${data.created_by} not found`);
                }
            }

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

            console.log('[RestockRepository] Inserting restock transaction:', restockData);
            const { recordId: restockId } = insertPreparedRecord('restock_transactions', restockData);
            console.log('[RestockRepository] Restock transaction inserted, id:', restockId);

            const findItemStmt = this.db.prepare(`SELECT id FROM items WHERE sku = ?`);
            const branchId = data.branch_id || null;
            const stockInsertTemplate = this.prepareCreateData({
                item_id: 0,
                batch_code: '',
                quantity: 0,
                stock_price: 0,
                retail_price: 0,
                expiry_date: null,
                availability: 1,
                branch_id: null,
                created_at: now,
                updated_at: now,
                sync_status: 'pending'
            }, 'stock');
            const stockInsertColumns = Object.keys(stockInsertTemplate);
            const stockUpsertStmt = this.db.prepare(`
                INSERT INTO stock (${stockInsertColumns.join(', ')})
                VALUES (${stockInsertColumns.map(col => `@${col}`).join(', ')})
                ON CONFLICT(item_id, batch_code) DO UPDATE SET
                    quantity = quantity + excluded.quantity,
                    stock_price = excluded.stock_price,
                    retail_price = excluded.retail_price,
                    expiry_date = COALESCE(excluded.expiry_date, expiry_date),
                    branch_id = COALESCE(excluded.branch_id, branch_id),
                    updated_at = excluded.updated_at,
                    sync_status = 'pending'
            `);

            for (const item of addedItems) {
                const itemRecord = findItemStmt.get(item.sku);
                if (!itemRecord) continue;

                insertPreparedRecord('restock_items', {
                    restock_id: restockId,
                    item_id: itemRecord.id,
                    batch_code: item.batch_code,
                    quantity: item.qty,
                    stock_price: item.stock_price,
                    retail_price: item.retail_price,
                    expiry_date: item.exp_date,
                    sync_status: 'pending',
                    created_at: nowISO(),
                    updated_at: nowISO()
                });

                // Update stock with branch_id
                const stockNow = nowISO();
                const stockData = this.prepareCreateData({
                    item_id: itemRecord.id,
                    batch_code: item.batch_code,
                    quantity: item.qty,
                    stock_price: item.stock_price,
                    retail_price: item.retail_price,
                    expiry_date: item.exp_date,
                    availability: 1,
                    branch_id: branchId,
                    created_at: stockNow,
                    updated_at: stockNow,
                    sync_status: 'pending'
                }, 'stock');
                stockUpsertStmt.run(stockData);
            }

            // Insert return items and update stock (decrease quantity)
            const decreaseStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ?, sync_status = 'pending'
                WHERE item_id = ? AND batch_code = ?
            `);

            for (const item of returnItems) {
                const itemRecord = findItemStmt.get(item.sku);
                if (!itemRecord) continue;

                const returnNow = nowISO();
                insertPreparedRecord('return_items', {
                    restock_id: restockId,
                    item_id: itemRecord.id,
                    batch_code: item.batch_code,
                    quantity: item.qty,
                    description: item.description,
                    sync_status: 'pending',
                    created_at: returnNow,
                    updated_at: returnNow
                });

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

            // Notify CloudSync for each stock change (added items → increased, return items → decreased)
            // Batch the UI broadcast to avoid refresh storms
            const stockIdsNotified = new Set();
            for (const item of fullRestock.added_items) {
                const updatedStock = this.db.prepare(
                    'SELECT * FROM stock WHERE item_id = ? AND batch_code = ?'
                ).get(item.item_id, item.batch_code);
                if (updatedStock && !stockIdsNotified.has(updatedStock.id)) {
                    notifyDataChange('stock', 'UPDATE', updatedStock, updatedStock.id);
                    stockIdsNotified.add(updatedStock.id);
                }
            }
            for (const item of fullRestock.return_items) {
                const updatedStock = this.db.prepare(
                    'SELECT * FROM stock WHERE item_id = ? AND batch_code = ?'
                ).get(item.item_id, item.batch_code);
                if (updatedStock && !stockIdsNotified.has(updatedStock.id)) {
                    notifyDataChange('stock', 'UPDATE', updatedStock, updatedStock.id);
                    stockIdsNotified.add(updatedStock.id);
                }
            }

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
