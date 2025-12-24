/**
 * Stock Repository
 *
 * Handles database operations for stock/inventory tracking.
 */

const BaseRepository = require('./BaseRepository.cjs');
const { nowISO, getSriLankanDate } = require('../utils/helpers.cjs');

class StockRepository extends BaseRepository {
    constructor() {
        super('stock');
    }

    /**
     * Find stock by item ID
     * @param {number} itemId - Item ID
     * @returns {Array}
     */
    findByItemId(itemId) {
        return this.findWhere({ item_id: itemId });
    }

    /**
     * Find stock by batch code
     * @param {string} batchCode - Batch code
     * @returns {Array}
     */
    findByBatchCode(batchCode) {
        return this.findWhere({ batch_code: batchCode });
    }

    /**
     * Find stock by item and batch
     * @param {number} itemId - Item ID
     * @param {string} batchCode - Batch code
     * @returns {Object|null}
     */
    findByItemAndBatch(itemId, batchCode) {
        return this.findOneWhere({ item_id: itemId, batch_code: batchCode });
    }

    /**
     * Find available stock for an item
     * @param {number} itemId - Item ID
     * @returns {Array}
     */
    findAvailableByItemId(itemId) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE item_id = ? AND availability = 1 AND quantity > 0
            ORDER BY expiry_date ASC
        `);
        return stmt.all(itemId);
    }

    /**
     * Get stock data by SKU (for restock form)
     * @param {string} sku - Item SKU
     * @returns {Array}
     */
    getStockDataBySku(sku) {
        const stmt = this.db.prepare(`
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
            ORDER BY s.created_at DESC
        `);
        return stmt.all(sku);
    }

    /**
     * Get all stock with item details
     * @returns {Array}
     */
    getAllWithItems() {
        const stmt = this.db.prepare(`
            SELECT
                s.*,
                i.sku,
                i.item_name,
                i.item_image_url,
                i.maximum_capacity,
                i.category_id,
                i.uom_id,
                i.branch_id,
                c.brand as category_brand,
                c.type as category_type,
                u.symbol as uom_symbol,
                u.unit_name as uom_unit_name
            FROM stock s
            JOIN items i ON s.item_id = i.id
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN units_of_measurement u ON i.uom_id = u.id
            ORDER BY i.item_name ASC, s.expiry_date ASC
        `);
        return stmt.all();
    }

    /**
     * Get low stock items (quantity below threshold)
     * @returns {Array}
     */
    getLowStock() {
        const stmt = this.db.prepare(`
            SELECT
                s.*,
                i.sku,
                i.item_name,
                i.maximum_capacity
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE s.quantity <= (i.maximum_capacity * s.threshold_limit / 100)
            AND s.availability = 1
            ORDER BY s.quantity ASC
        `);
        return stmt.all();
    }

    /**
     * Get expiring stock (within specified days)
     * @param {number} days - Days until expiry
     * @returns {Array}
     */
    getExpiringStock(days = 30) {
        const futureDate = getSriLankanDate();
        futureDate.setDate(futureDate.getDate() + days);
        const futureDateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}T23:59:59.999Z`;

        const stmt = this.db.prepare(`
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
            ORDER BY s.expiry_date ASC
        `);
        return stmt.all(futureDateStr);
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
        return this.findById(id);
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

        // Use atomic SQL UPDATE with MAX to prevent negative stock
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET quantity = MAX(0, quantity - ?),
                updated_at = ?
            WHERE id = ?
        `);
        const result = stmt.run(amount, new Date().toISOString(), id);

        if (result.changes === 0) return null;
        return this.findById(id);
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
     * Create or update stock for item and batch
     * @param {Object} data - Stock data
     * @returns {Object}
     */
    upsertStock(data) {
        const existing = this.findByItemAndBatch(data.item_id, data.batch_code);

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
            created_at: nowISO(),
            updated_at: nowISO(),
            sync_status: 'pending'
        });
    }

    /**
     * Get total stock value
     * @returns {Object}
     */
    getTotalStockValue() {
        const stmt = this.db.prepare(`
            SELECT
                SUM(quantity * stock_price) as total_stock_value,
                SUM(quantity * retail_price) as total_retail_value,
                SUM(quantity) as total_quantity,
                COUNT(DISTINCT item_id) as total_items
            FROM stock
            WHERE availability = 1
        `);
        return stmt.get();
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
