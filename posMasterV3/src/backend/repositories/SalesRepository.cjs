/**
 * Sales Repository
 *
 * Handles database operations for sales transactions.
 * Branch-aware: Supports filtering by branch_id.
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
     * Find all sales with optional branch filter
     * Includes member name from both members and tea_coop_members tables
     * @param {Object} options - Query options including branchId
     * @returns {Array}
     */
    findAll(options = {}) {
        const {
            limit = 100,
            offset = 0,
            orderBy = 'created_at',
            order = 'DESC',
            branchId = null
        } = options;

        let sql = `
            SELECT
                s.*,
                COALESCE(m.full_name, tcm.full_name, 'Guest') as member_name,
                CASE
                    WHEN m.id IS NOT NULL THEN 'regular'
                    WHEN tcm.id IS NOT NULL THEN 'tea_coop'
                    ELSE NULL
                END as member_type
            FROM ${this.tableName} s
            LEFT JOIN members m ON s.member_id = m.id
            LEFT JOIN tea_coop_members tcm ON s.member_id = tcm.id
        `;
        const params = [];

        if (branchId) {
            sql += ` WHERE s.branch_id = ?`;
            params.push(branchId);
        }

        const safeOrderBy = this.sanitizeOrderColumn(orderBy);
        const safeOrder = this.sanitizeOrderDirection(order);
        sql += ` ORDER BY s.${safeOrderBy} ${safeOrder} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
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
     * Find sales by member (with optional branch filter)
     * @param {number} memberId - Member ID
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findByMemberId(memberId, branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE member_id = ? AND branch_id = ?
                ORDER BY created_at DESC
            `);
            return stmt.all(memberId, branchId);
        }
        return this.findWhere({ member_id: memberId });
    }

    /**
     * Find sales by cashier (with optional branch filter)
     * @param {string} cashierId - Cashier user ID
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findByCashierId(cashierId, branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE cashier_id = ? AND branch_id = ?
                ORDER BY created_at DESC
            `);
            return stmt.all(cashierId, branchId);
        }
        return this.findWhere({ cashier_id: cashierId });
    }

    /**
     * Find held orders with optional branch filter
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findHeldOrders(branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE is_held = 1 AND branch_id = ?
            `);
            return stmt.all(branchId);
        }
        return this.findWhere({ is_held: 1 });
    }

    /**
     * Find sales by date range (with optional branch filter)
     * Includes member name from both members and tea_coop_members tables
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findByDateRange(startDate, endDate, branchId = null) {
        let sql = `
            SELECT
                s.*,
                COALESCE(m.full_name, tcm.full_name, 'Guest') as member_name,
                CASE
                    WHEN m.id IS NOT NULL THEN 'regular'
                    WHEN tcm.id IS NOT NULL THEN 'tea_coop'
                    ELSE NULL
                END as member_type
            FROM ${this.tableName} s
            LEFT JOIN members m ON s.member_id = m.id
            LEFT JOIN tea_coop_members tcm ON s.member_id = tcm.id
            WHERE s.created_at >= ? AND s.created_at <= ?
            AND s.is_held = 0
        `;
        const params = [startDate, endDate];

        if (branchId) {
            sql += ` AND s.branch_id = ?`;
            params.push(branchId);
        }

        sql += ` ORDER BY s.created_at DESC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
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

        // Get member info - check both members and tea_coop_members tables
        let member = null;
        if (sale.member_id) {
            // First check regular members table
            member = this.db.prepare(`
                SELECT *, 'regular' as member_type FROM members WHERE id = ?
            `).get(sale.member_id);

            // If not found, check tea_coop_members table
            if (!member) {
                member = this.db.prepare(`
                    SELECT *, 'tea_coop' as member_type FROM tea_coop_members WHERE id = ?
                `).get(sale.member_id);
            }
        }

        // Get cashier info
        const cashier = sale.cashier_id ? this.db.prepare(`
            SELECT id, username, full_name FROM users WHERE id = ?
        `).get(sale.cashier_id) : null;

        return {
            ...sale,
            member,
            member_name: member?.full_name || 'Guest',
            member_type: member?.member_type || null,
            cashier,
            cashier_name: cashier?.full_name || cashier?.username || null,
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
            // Validate FK references — null them out if they don't exist locally
            // to prevent FOREIGN KEY constraint failures (e.g. cloud-synced IDs)
            let safeMemberId = data.member_id || null;
            if (safeMemberId) {
                const memberExists = this.db.prepare('SELECT id FROM members WHERE id = ?').get(safeMemberId);
                if (!memberExists) safeMemberId = null;
            }

            let safeCreatedBy = data.created_by || null;
            if (safeCreatedBy) {
                const userExists = this.db.prepare('SELECT id FROM users WHERE id = ?').get(safeCreatedBy);
                if (!userExists) safeCreatedBy = null;
            }

            let safeBranchId = data.branch_id || null;
            if (safeBranchId) {
                const branchExists = this.db.prepare('SELECT id FROM branches WHERE id = ?').get(safeBranchId);
                if (!branchExists) safeBranchId = null;
            }

            // Create main transaction
            const saleData = {
                invoice_no: data.invoice_no,
                member_id: safeMemberId,
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
                updated_at: nowISO(),
                sync_status: 'pending',
                // Branch and audit fields
                branch_id: safeBranchId,
                created_by: safeCreatedBy
            };

            const saleStmt = this.db.prepare(`
                INSERT INTO sales_transactions
                (invoice_no, member_id, cashier_id, payment_method, credit_duration,
                subtotal, discount, total_amount, cash_received, change_amount,
                status, is_held, created_at, updated_at, sync_status, branch_id, created_by)
                VALUES (@invoice_no, @member_id, @cashier_id, @payment_method, @credit_duration,
                @subtotal, @discount, @total_amount, @cash_received, @change_amount,
                @status, @is_held, @created_at, @updated_at, @sync_status, @branch_id, @created_by)
            `);

            const result = saleStmt.run(saleData);
            const saleId = result.lastInsertRowid;

            // Insert sale items and update stock
            const addItemStmt = this.db.prepare(`
                INSERT INTO sales_items (sale_id, item_id, stock_id, batch_code, quantity, unit_price, discount, total_price, sync_status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `);

            const decreaseStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ?, sync_status = 'pending'
                WHERE id = ?
            `);

            for (const item of items) {
                // Validate quantity before any DB operation
                if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
                    throw new Error(`Invalid quantity ${item.quantity} for item_id=${item.item_id}`);
                }

                // Validate item FK references exist locally
                const itemExists = this.db.prepare('SELECT id FROM items WHERE id = ?').get(item.item_id);
                if (!itemExists) throw new Error(`Item not found locally: item_id=${item.item_id}`);

                const stockExists = this.db.prepare('SELECT id FROM stock WHERE id = ?').get(item.stock_id);
                if (!stockExists) throw new Error(`Stock not found locally: stock_id=${item.stock_id}`);

                addItemStmt.run(
                    saleId,
                    item.item_id,
                    item.stock_id,
                    item.batch_code,
                    item.quantity,
                    item.unit_price,
                    item.discount || 0,
                    item.total_price,
                    nowISO()
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
            if (safeMemberId && !data.is_held) {
                const updateMemberStmt = this.db.prepare(`
                    UPDATE members SET
                        total_income = total_income + ?,
                        updated_at = ?,
                        sync_status = 'pending'
                    WHERE id = ?
                `);
                updateMemberStmt.run(data.total_amount, nowISO(), safeMemberId);

                // Handle credit payments
                if (data.payment_method === 'credit') {
                    const updateCreditsStmt = this.db.prepare(`
                        UPDATE members SET
                            total_credits = total_credits + ?,
                            updated_at = ?,
                            sync_status = 'pending'
                        WHERE id = ?
                    `);
                    updateCreditsStmt.run(data.total_amount, nowISO(), safeMemberId);
                }
            }

            const fullSale = this.getFullDetails(saleId);
            if (!fullSale) {
                throw new Error(`Failed to retrieve sale details after creation (id=${saleId})`);
            }

            // Notify CloudSync of the new sale
            notifyDataChange('sales_transactions', 'INSERT', fullSale, saleId);

            // Broadcast to UI for immediate update
            broadcastDataChange('sales_transactions', 'INSERT', saleId, fullSale);

            // Also notify for each sale item
            for (const item of fullSale.items) {
                notifyDataChange('sales_items', 'INSERT', item, item.id);
            }

            // Notify CloudSync for each stock change and broadcast a single batch event to UI
            if (!data.is_held && items.length > 0) {
                for (const item of items) {
                    const updatedStock = this.db.prepare('SELECT * FROM stock WHERE id = ?').get(item.stock_id);
                    if (updatedStock) {
                        notifyDataChange('stock', 'UPDATE', updatedStock, item.stock_id);
                    }
                }
                broadcastBatchChange('stock', items.length, 'SALE');
            }

            // Notify CloudSync and broadcast member update if member was involved
            if (data.member_id && !data.is_held) {
                // Get updated member data for CloudSync
                const updatedMember = this.db.prepare('SELECT * FROM members WHERE id = ?').get(data.member_id);
                if (updatedMember) {
                    // Notify CloudSync to sync member credit changes to cloud
                    notifyDataChange('members', 'UPDATE', updatedMember, data.member_id);
                    // Broadcast updated member data to UI (not null — cache needs the actual record)
                    broadcastDataChange('members', 'UPDATE', data.member_id, updatedMember);
                }
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
                UPDATE stock SET quantity = MAX(0, quantity - ?), updated_at = ?, sync_status = 'pending'
                WHERE id = ?
            `);

            for (const item of items) {
                if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
                    throw new Error(`Invalid quantity ${item.quantity} for stock_id=${item.stock_id} in held order ${id}`);
                }
                decreaseStockStmt.run(
                    item.quantity,
                    nowISO(),
                    item.stock_id
                );
            }

            const completedSale = this.getFullDetails(id);
            if (!completedSale) {
                throw new Error(`Failed to retrieve sale details after completion (id=${id})`);
            }

            // Update member income and credits when completing held order
            if (completedSale.member_id) {
                const updateMemberStmt = this.db.prepare(`
                    UPDATE members SET
                        total_income = total_income + ?,
                        updated_at = ?,
                        sync_status = 'pending'
                    WHERE id = ?
                `);
                updateMemberStmt.run(completedSale.total_amount, nowISO(), completedSale.member_id);

                // Handle credit payments
                if (completedSale.payment_method === 'credit') {
                    const updateCreditsStmt = this.db.prepare(`
                        UPDATE members SET
                            total_credits = total_credits + ?,
                            updated_at = ?,
                            sync_status = 'pending'
                        WHERE id = ?
                    `);
                    updateCreditsStmt.run(completedSale.total_amount, nowISO(), completedSale.member_id);
                }

                // Get updated member data for CloudSync
                const updatedMember = this.db.prepare('SELECT * FROM members WHERE id = ?').get(completedSale.member_id);
                if (updatedMember) {
                    notifyDataChange('members', 'UPDATE', updatedMember, completedSale.member_id);
                    broadcastDataChange('members', 'UPDATE', completedSale.member_id, updatedMember);
                }
            }

            // Notify CloudSync of sale update
            notifyDataChange('sales_transactions', 'UPDATE', completedSale, id);

            // Broadcast the sale update
            broadcastDataChange('sales_transactions', 'UPDATE', id, completedSale);

            // Notify CloudSync for each stock change, broadcast single batch event to UI
            if (items.length > 0) {
                for (const item of items) {
                    const updatedStock = this.db.prepare('SELECT * FROM stock WHERE id = ?').get(item.stock_id);
                    if (updatedStock) {
                        notifyDataChange('stock', 'UPDATE', updatedStock, item.stock_id);
                    }
                }
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
                UPDATE stock SET quantity = quantity + ?, updated_at = ?, sync_status = 'pending'
                WHERE id = ?
            `);

            for (const item of sale.items) {
                restoreStockStmt.run(
                    item.quantity,
                    nowISO(),
                    item.stock_id
                );
            }

            // Reverse member income and credits if applicable (only for non-held completed sales)
            if (sale.member_id && !sale.is_held) {
                const reverseMemberStmt = this.db.prepare(`
                    UPDATE members SET
                        total_income = total_income - ?,
                        updated_at = ?,
                        sync_status = 'pending'
                    WHERE id = ?
                `);
                reverseMemberStmt.run(sale.total_amount, nowISO(), sale.member_id);

                // Reverse credit if it was a credit payment
                if (sale.payment_method === 'credit') {
                    const reverseCreditsStmt = this.db.prepare(`
                        UPDATE members SET
                            total_credits = total_credits - ?,
                            updated_at = ?,
                            sync_status = 'pending'
                        WHERE id = ?
                    `);
                    reverseCreditsStmt.run(sale.total_amount, nowISO(), sale.member_id);
                }

                // Notify CloudSync and broadcast member update
                const updatedMember = this.db.prepare('SELECT * FROM members WHERE id = ?').get(sale.member_id);
                if (updatedMember) {
                    notifyDataChange('members', 'UPDATE', updatedMember, sale.member_id);
                    broadcastDataChange('members', 'UPDATE', sale.member_id, updatedMember);
                }
            }

            // Update sale status (this.update already broadcasts via BaseRepository)
            this.update(id, { status: 'cancelled' });

            // Notify CloudSync for each stock restore, broadcast single batch event to UI
            if (sale.items.length > 0) {
                for (const item of sale.items) {
                    const updatedStock = this.db.prepare('SELECT * FROM stock WHERE id = ?').get(item.stock_id);
                    if (updatedStock) {
                        notifyDataChange('stock', 'UPDATE', updatedStock, item.stock_id);
                    }
                }
                broadcastBatchChange('stock', sale.items.length, 'SALE_CANCEL');
            }

            return true;
        });

        return transaction();
    }

    /**
     * Return specific items from a completed sale
     * Restores stock and records return entries atomically.
     * @param {number} saleId - Sale ID
     * @param {Array} itemsToReturn - [{ sale_item_id, stock_id, item_id, batch_code, quantity, unit_price }]
     * @param {string|null} reason - Return reason
     * @param {string|null} returnedBy - Username
     * @returns {Array} - Inserted return records
     */
    returnSaleItems(saleId, itemsToReturn, reason, returnedBy) {
        const ReturnRepository = require('./ReturnRepository.cjs');
        const returnRepo = new ReturnRepository();

        const returnedAt = nowISO();
        const insertedReturns = [];

        const transaction = this.db.transaction(() => {
            const restoreStockStmt = this.db.prepare(`
                UPDATE stock SET quantity = quantity + ?, updated_at = ?, sync_status = 'pending'
                WHERE id = ?
            `);

            for (const item of itemsToReturn) {
                // Restore stock
                restoreStockStmt.run(item.quantity, returnedAt, item.stock_id);

                // Insert return record with explicit timestamps for incremental cloud sync
                const result = this.db.prepare(`
                    INSERT INTO returned_items
                        (sale_id, item_id, stock_id, batch_code, quantity, unit_price, reason, returned_by, returned_at, sync_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                `).run(
                    saleId,
                    item.item_id,
                    item.stock_id,
                    item.batch_code,
                    item.quantity,
                    item.unit_price || 0,
                    reason || null,
                    returnedBy || null,
                    returnedAt,
                    returnedAt,
                    returnedAt
                );

                const inserted = returnRepo.findById(result.lastInsertRowid);
                insertedReturns.push(inserted);

                // Notify CloudSync and broadcast to UI for the new return record
                if (inserted) {
                    notifyDataChange('returned_items', 'INSERT', inserted, inserted.id);
                    broadcastDataChange('returned_items', 'INSERT', inserted.id, inserted);
                }

                // Notify CloudSync for the restored stock
                const updatedStock = this.db.prepare('SELECT * FROM stock WHERE id = ?').get(item.stock_id);
                if (updatedStock) {
                    notifyDataChange('stock', 'UPDATE', updatedStock, item.stock_id);
                }
            }

            // Determine new sale status
            const sale = this.getFullDetails(saleId);
            if (sale) {
                const totalOriginalQty = sale.items.reduce((sum, i) => sum + i.quantity, 0);
                const totalReturnedQty = itemsToReturn.reduce((sum, i) => sum + i.quantity, 0);
                // Check existing returns
                const existingReturns = returnRepo.findBySaleId(saleId);
                const previouslyReturned = existingReturns
                    .filter(r => !insertedReturns.some(ir => ir.id === r.id))
                    .reduce((sum, r) => sum + r.quantity, 0);
                const allReturned = previouslyReturned + totalReturnedQty >= totalOriginalQty;
                this.update(saleId, { status: allReturned ? 'returned' : 'partial_return' });
            }

            // Broadcast stock update to UI
            broadcastBatchChange('stock', itemsToReturn.length, 'SALE_RETURN');
        });

        transaction();
        return insertedReturns;
    }

    /**
     * Get sales summary by date (with optional branch filter)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Object}
     */
    getSummary(startDate, endDate, branchId = null) {
        let sql = `
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
     * Get daily sales totals (with optional branch filter)
     * @param {number} days - Number of days
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    getDailySales(days = 30, branchId = null) {
        let sql = `
            SELECT
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                SUM(total_amount) as total_sales
            FROM ${this.tableName}
            WHERE created_at >= DATE('now', '-' || ? || ' days')
            AND status = 'completed' AND is_held = 0
        `;
        const params = [days];

        if (branchId) {
            sql += ` AND branch_id = ?`;
            params.push(branchId);
        }

        sql += ` GROUP BY DATE(created_at) ORDER BY date DESC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
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
