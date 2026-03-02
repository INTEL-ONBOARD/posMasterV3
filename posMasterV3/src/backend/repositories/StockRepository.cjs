/**
 * Stock Repository
 *
 * Handles database operations for stock/inventory tracking.
 * Branch-aware: Supports filtering by branch_id.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { broadcastDataChange } = require('../utils/eventBroadcaster.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { nowISO, getSriLankanDate } = require('../utils/helpers.cjs');

class StockRepository extends BaseRepository {
    constructor() {
        super('stock');
    }

    /**
     * Find all stock with optional branch filter
     * @param {Object} options - Query options including branchId
     * @returns {Array}
     */
    findAll(options = {}) {
        const {
            limit = 10000,
            offset = 0,
            orderBy = 'created_at',
            order = 'DESC',
            branchId = null
        } = options;

        let sql = `SELECT * FROM ${this.tableName}`;
        const params = [];

        if (branchId) {
            sql += ` WHERE branch_id = ?`;
            params.push(branchId);
        }

        const safeOrderBy = this.sanitizeOrderColumn(orderBy);
        const safeOrder = this.sanitizeOrderDirection(order);
        sql += ` ORDER BY ${safeOrderBy} ${safeOrder} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Find stock by item ID (with optional branch filter)
     * Stock is branch-specific, but we include NULL branch_id for backwards compatibility
     * @param {number} itemId - Item ID
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findByItemId(itemId, branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE item_id = ? AND (branch_id = ? OR branch_id IS NULL)
            `);
            return stmt.all(itemId, branchId);
        }
        return this.findWhere({ item_id: itemId });
    }

    /**
     * Find stock by batch code (with optional branch filter)
     * Stock is branch-specific, but we include NULL branch_id for backwards compatibility
     * @param {string} batchCode - Batch code
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findByBatchCode(batchCode, branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE batch_code = ? AND (branch_id = ? OR branch_id IS NULL)
            `);
            return stmt.all(batchCode, branchId);
        }
        return this.findWhere({ batch_code: batchCode });
    }

    /**
     * Find stock by item and batch (with optional branch filter)
     * @param {number} itemId - Item ID
     * @param {string} batchCode - Batch code
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Object|null}
     */
    findByItemAndBatch(itemId, batchCode, branchId = null) {
        if (branchId) {
            const stmt = this.db.prepare(`
                SELECT * FROM ${this.tableName}
                WHERE item_id = ? AND batch_code = ? AND branch_id = ?
                LIMIT 1
            `);
            return stmt.get(itemId, batchCode, branchId) || null;
        }
        return this.findOneWhere({ item_id: itemId, batch_code: batchCode });
    }

    /**
     * Find available stock for an item (with optional branch filter)
     * @param {number} itemId - Item ID
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    findAvailableByItemId(itemId, branchId = null) {
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE item_id = ? AND availability = 1 AND quantity > 0
        `;
        const params = [itemId];

        if (branchId) {
            sql += ` AND branch_id = ?`;
            params.push(branchId);
        }

        sql += ` ORDER BY expiry_date ASC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Get stock data by SKU (for restock form, with optional branch filter)
     * @param {string} sku - Item SKU
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    getStockDataBySku(sku, branchId = null) {
        let sql = `
            SELECT
                s.id,
                s.batch_code,
                s.quantity as qty,
                s.stock_price,
                s.retail_price,
                s.discount_price,
                s.expiry_date as exp_date,
                s.threshold_limit,
                s.availability,
                i.sku
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE i.sku = ?
        `;
        const params = [sku];

        if (branchId) {
            sql += ` AND (s.branch_id = ? OR s.branch_id IS NULL)`;
            params.push(branchId);
        }

        sql += ` ORDER BY s.created_at DESC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Get all stock with item details (with optional branch filter)
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    getAllWithItems(branchId = null) {
        let sql = `
            SELECT
                s.*,
                i.sku,
                i.item_code,
                i.item_name,
                i.item_image_url,
                i.maximum_capacity,
                i.category_id,
                i.uom_id,
                c.brand as category_brand,
                c.type as category_type,
                u.symbol as uom_symbol,
                u.unit_name as uom_unit_name
            FROM stock s
            JOIN items i ON s.item_id = i.id
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN units_of_measurement u ON i.uom_id = u.id
        `;
        const params = [];

        if (branchId) {
            sql += ` WHERE (s.branch_id = ? OR s.branch_id IS NULL)`;
            params.push(branchId);
        }

        sql += ` ORDER BY i.item_name ASC, s.expiry_date ASC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Get low stock items (quantity below threshold, with optional branch filter)
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    getLowStock(branchId = null) {
        let sql = `
            SELECT
                s.*,
                i.sku,
                i.item_name,
                i.maximum_capacity
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE s.quantity <= (i.maximum_capacity * s.threshold_limit / 100)
            AND s.availability = 1
        `;
        const params = [];

        if (branchId) {
            sql += ` AND (s.branch_id = ? OR s.branch_id IS NULL)`;
            params.push(branchId);
        }

        sql += ` ORDER BY s.quantity ASC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Get expiring stock (within specified days, with optional branch filter)
     * @param {number} days - Days until expiry
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Array}
     */
    getExpiringStock(days = 30, branchId = null) {
        const futureDate = getSriLankanDate();
        futureDate.setDate(futureDate.getDate() + days);
        const futureDateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}T23:59:59.999Z`;

        let sql = `
            SELECT
                s.*,
                i.sku,
                i.item_name
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE s.expiry_date IS NOT NULL
            AND s.expiry_date <= ?
            AND s.quantity > 0
            AND s.availability = 1
        `;
        const params = [futureDateStr];

        if (branchId) {
            sql += ` AND (s.branch_id = ? OR s.branch_id IS NULL)`;
            params.push(branchId);
        }

        sql += ` ORDER BY s.expiry_date ASC`;

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Update stock quantity
     * @param {number} id - Stock ID
     * @param {number} quantity - New quantity
     * @returns {Object}
     */
    updateQuantity(id, quantity) {
        return this.update(id, { quantity });
    }

    /**
     * Increment stock quantity (atomic operation to prevent race conditions)
     * @param {number} id - Stock ID
     * @param {number} amount - Amount to add
     * @returns {Object}
     */
    incrementQuantity(id, amount) {
        // Validate amount is a positive number
        if (typeof amount !== 'number' || amount < 0) {
            return null;
        }

        // Use atomic SQL UPDATE to prevent race conditions
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET quantity = quantity + ?,
                updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(amount, new Date().toISOString(), id);

        if (result.changes === 0) return null;

        const updatedStock = this.findById(id);

        // Notify CloudSync and broadcast to UI
        if (updatedStock) {
            notifyDataChange(this.tableName, 'UPDATE', updatedStock, id);
            broadcastDataChange(this.tableName, 'UPDATE', id, updatedStock);
        }

        return updatedStock;
    }

    /**
     * Decrement stock quantity (atomic operation to prevent race conditions)
     * @param {number} id - Stock ID
     * @param {number} amount - Amount to subtract
     * @returns {Object}
     */
    decrementQuantity(id, amount) {
        // Validate amount is a positive number
        if (typeof amount !== 'number' || amount < 0) {
            return null;
        }

        // Use atomic SQL UPDATE with CASE to prevent negative stock
        // Using CASE instead of MAX() for better SQLite compatibility
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET quantity = CASE
                    WHEN quantity - ? < 0 THEN 0
                    ELSE quantity - ?
                END,
                updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(amount, amount, new Date().toISOString(), id);

        if (result.changes === 0) return null;

        const updatedStock = this.findById(id);

        // Notify CloudSync and broadcast to UI
        if (updatedStock) {
            notifyDataChange(this.tableName, 'UPDATE', updatedStock, id);
            broadcastDataChange(this.tableName, 'UPDATE', id, updatedStock);
        }

        return updatedStock;
    }

    /**
     * Update stock prices
     * @param {number} id - Stock ID
     * @param {number} stockPrice - New stock price
     * @param {number} retailPrice - New retail price
     * @returns {Object}
     */
    updatePrices(id, stockPrice, retailPrice) {
        return this.update(id, {
            stock_price: stockPrice,
            retail_price: retailPrice
        });
    }

    /**
     * Create or update stock for item and batch (branch-aware)
     * @param {Object} data - Stock data including branch_id
     * @returns {Object}
     */
    upsertStock(data) {
        // When branch_id is provided, look for existing stock in that branch
        const existing = this.findByItemAndBatch(data.item_id, data.batch_code, data.branch_id);

        if (existing) {
            // Update existing - add quantity
            return this.update(existing.id, {
                quantity: existing.quantity + (data.quantity || 0),
                stock_price: data.stock_price || existing.stock_price,
                retail_price: data.retail_price || existing.retail_price,
                discount_price: data.discount_price || existing.discount_price,
                expiry_date: data.expiry_date || existing.expiry_date,
                threshold_limit: data.threshold_limit || existing.threshold_limit,
                availability: data.availability !== undefined ? data.availability : existing.availability
            });
        }

        // Create new
        return this.create({
            item_id: data.item_id,
            batch_code: data.batch_code,
            quantity: data.quantity || 0,
            stock_price: data.stock_price || 0,
            retail_price: data.retail_price || 0,
            discount_price: data.discount_price || 0,
            expiry_date: data.expiry_date,
            threshold_limit: data.threshold_limit || 0,
            availability: data.availability !== undefined ? data.availability : 1,
            branch_id: data.branch_id || null,
            created_at: nowISO(),
            updated_at: nowISO(),
            sync_status: 'pending'
        });
    }

    /**
     * Get total stock value (with optional branch filter)
     * @param {number|null} branchId - Optional branch ID filter
     * @returns {Object}
     */
    getTotalStockValue(branchId = null) {
        let sql = `
            SELECT
                SUM(quantity * stock_price) as total_stock_value,
                SUM(quantity * retail_price) as total_retail_value,
                SUM(quantity) as total_quantity,
                COUNT(DISTINCT item_id) as total_items
            FROM stock
            WHERE availability = 1
        `;
        const params = [];

        if (branchId) {
            sql += ` AND branch_id = ?`;
            params.push(branchId);
        }

        const stmt = this.db.prepare(sql);
        return stmt.get(...params);
    }

    /**
     * Find stock pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }
}

module.exports = new StockRepository();
