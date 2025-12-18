/**
 * Item Repository
 *
 * Handles database operations for items (item registry).
 */

const BaseRepository = require('./BaseRepository.cjs');

class ItemRepository extends BaseRepository {
    constructor() {
        super('items');
    }

    /**
     * Find item by SKU
     * @param {string} sku - Item SKU
     * @returns {Object|null}
     */
    findBySku(sku) {
        return this.findOneWhere({ sku });
    }

    /**
     * Find items by category
     * @param {number} categoryId - Category ID
     * @returns {Array}
     */
    findByCategory(categoryId) {
        return this.findWhere({ category_id: categoryId });
    }

    /**
     * Find items by branch
     * @param {number} branchId - Branch ID
     * @returns {Array}
     */
    findByBranch(branchId) {
        return this.findWhere({ branch_id: branchId });
    }

    /**
     * Find available items
     * @returns {Array}
     */
    findAvailable() {
        return this.findWhere({ availability: 1 });
    }

    /**
     * Search items
     * @param {string} searchTerm - Search term
     * @returns {Array}
     */
    search(searchTerm) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE item_name LIKE ? OR sku LIKE ?
            ORDER BY item_name ASC
        `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term);
    }

    /**
     * Get all items with extended data (category, uom, stock info)
     * @returns {Array}
     */
    getAllExtended() {
        const stmt = this.db.prepare(`
            SELECT
                i.*,
                c.id as category_local_id,
                c.cloud_id as category_cloud_id,
                c.brand as category_brand,
                c.type as category_type,
                u.id as uom_local_id,
                u.cloud_id as uom_cloud_id,
                u.symbol as uom_symbol,
                u.unit_name as uom_unit_name,
                b.id as branch_local_id,
                b.cloud_id as branch_cloud_id,
                b.name as branch_name,
                COALESCE(s.total_quantity, 0) as current_quantity,
                s.latest_batch_code,
                s.latest_stock_price,
                s.latest_retail_price,
                s.latest_expiry_date,
                s.latest_threshold_limit
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN units_of_measurement u ON i.uom_id = u.id
            LEFT JOIN branches b ON i.branch_id = b.id
            LEFT JOIN (
                SELECT
                    item_id,
                    SUM(quantity) as total_quantity,
                    MAX(batch_code) as latest_batch_code,
                    MAX(stock_price) as latest_stock_price,
                    MAX(retail_price) as latest_retail_price,
                    MAX(expiry_date) as latest_expiry_date,
                    MAX(threshold_limit) as latest_threshold_limit
                FROM stock
                WHERE availability = 1
                GROUP BY item_id
            ) s ON i.id = s.item_id
            ORDER BY i.item_name ASC
        `);

        const items = stmt.all();
        return items.map(item => this.formatExtended(item));
    }

    /**
     * Get single item with extended data
     * @param {number} id - Item ID
     * @returns {Object|null}
     */
    getExtendedById(id) {
        const stmt = this.db.prepare(`
            SELECT
                i.*,
                c.id as category_local_id,
                c.cloud_id as category_cloud_id,
                c.brand as category_brand,
                c.type as category_type,
                u.id as uom_local_id,
                u.cloud_id as uom_cloud_id,
                u.symbol as uom_symbol,
                u.unit_name as uom_unit_name,
                b.id as branch_local_id,
                b.cloud_id as branch_cloud_id,
                b.name as branch_name,
                COALESCE(s.total_quantity, 0) as current_quantity,
                s.latest_batch_code,
                s.latest_stock_price,
                s.latest_retail_price,
                s.latest_expiry_date,
                s.latest_threshold_limit
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN units_of_measurement u ON i.uom_id = u.id
            LEFT JOIN branches b ON i.branch_id = b.id
            LEFT JOIN (
                SELECT
                    item_id,
                    SUM(quantity) as total_quantity,
                    MAX(batch_code) as latest_batch_code,
                    MAX(stock_price) as latest_stock_price,
                    MAX(retail_price) as latest_retail_price,
                    MAX(expiry_date) as latest_expiry_date,
                    MAX(threshold_limit) as latest_threshold_limit
                FROM stock
                WHERE availability = 1
                GROUP BY item_id
            ) s ON i.id = s.item_id
            WHERE i.id = ?
        `);

        const item = stmt.get(id);
        return item ? this.formatExtended(item) : null;
    }

    /**
     * Format extended item for frontend
     * @param {Object} item - Raw item data with joins
     * @returns {Object}
     */
    formatExtended(item) {
        return {
            id: item.id,
            _id: item.cloud_id || item.id.toString(),
            sku: item.sku,
            item_name: item.item_name,
            item_image_url: item.item_image_url,
            item_image_blob: item.item_image_blob,
            maximum_capacity: item.maximum_capacity,
            availability: item.availability === 1,
            category_id: item.category_id,
            uom_id: item.uom_id,
            inventory_id: item.branch_id,
            item_created_datetime: item.created_at,
            item_update_datetime: item.updated_at,
            stock_trace: [],
            category: item.category_local_id ? {
                id: item.category_local_id,
                _id: item.category_cloud_id || item.category_local_id.toString(),
                brand: item.category_brand,
                type: item.category_type
            } : null,
            uom: item.uom_local_id ? {
                id: item.uom_local_id,
                _id: item.uom_cloud_id || item.uom_local_id.toString(),
                symbol: item.uom_symbol,
                unit_name: item.uom_unit_name
            } : null,
            inventory: item.branch_local_id ? {
                id: item.branch_local_id,
                _id: item.branch_cloud_id || item.branch_local_id.toString(),
                name: item.branch_name
            } : null,
            // Stock-related data
            quantity: item.current_quantity || 0,
            batch_code: item.latest_batch_code || '',
            stock_price: item.latest_stock_price || 0,
            retail_price: item.latest_retail_price || 0,
            expired_datetime: item.latest_expiry_date,
            threshold_limit: item.latest_threshold_limit || 0
        };
    }

    /**
     * Update item availability
     * @param {number} id - Item ID
     * @param {boolean} availability - Availability status
     * @returns {Object}
     */
    setAvailability(id, availability) {
        return this.update(id, { availability: availability ? 1 : 0 });
    }

    /**
     * Find items pending sync
     * @returns {Array}
     */
    findPendingSync() {
        return this.findWhere({ sync_status: 'pending' });
    }

    /**
     * Generate a unique SKU
     * @param {string} prefix - Optional prefix
     * @returns {string}
     */
    generateSku(prefix = 'SKU') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Get total stock quantity for an item
     * @param {number} itemId - Item ID
     * @returns {number} Total quantity in stock
     */
    getItemStockQuantity(itemId) {
        try {
            const stmt = this.db.prepare(`
                SELECT COALESCE(SUM(quantity), 0) as total_quantity
                FROM stock
                WHERE item_id = ? AND availability = 1
            `);
            const result = stmt.get(itemId);
            return result ? result.total_quantity : 0;
        } catch (error) {
            console.error('[ItemRepository] getItemStockQuantity error:', error);
            return 0;
        }
    }
}

module.exports = new ItemRepository();
