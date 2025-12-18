/**
 * Item Service
 *
 * Business logic for item (registry) operations.
 */

const itemRepository = require('../repositories/ItemRepository.cjs');

class ItemService {
    /**
     * Get all items
     * @returns {Object}
     */
    getAll() {
        try {
            const items = itemRepository.findAll({ limit: 10000, orderBy: 'item_name', order: 'ASC' });
            return {
                status: 'success',
                data: items.map(i => this.formatItem(i))
            };
        } catch (error) {
            console.error('[ItemService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get all items with extended data (category, uom, stock)
     * @returns {Object}
     */
    getAllExtended() {
        try {
            const items = itemRepository.getAllExtended();
            return {
                status: 'success',
                data: items
            };
        } catch (error) {
            console.error('[ItemService] getAllExtended error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get item by ID
     * @param {number} id - Item ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const item = itemRepository.findById(id);
            if (!item) {
                return {
                    status: 'error',
                    message: 'Item not found'
                };
            }
            return {
                status: 'success',
                data: this.formatItem(item)
            };
        } catch (error) {
            console.error('[ItemService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get item by ID with extended data
     * @param {number} id - Item ID
     * @returns {Object}
     */
    getByIdExtended(id) {
        try {
            const item = itemRepository.getExtendedById(id);
            if (!item) {
                return {
                    status: 'error',
                    message: 'Item not found'
                };
            }
            return {
                status: 'success',
                data: item
            };
        } catch (error) {
            console.error('[ItemService] getByIdExtended error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get item by SKU
     * @param {string} sku - Item SKU
     * @returns {Object}
     */
    getBySku(sku) {
        try {
            const item = itemRepository.findBySku(sku);
            if (!item) {
                return {
                    status: 'error',
                    message: 'Item not found'
                };
            }
            return {
                status: 'success',
                data: this.formatItem(item)
            };
        } catch (error) {
            console.error('[ItemService] getBySku error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search items
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const items = itemRepository.search(searchTerm);
            return {
                status: 'success',
                data: items.map(i => this.formatItem(i))
            };
        } catch (error) {
            console.error('[ItemService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new item
     * @param {Object} data - Item data
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.item_name) {
                return {
                    status: 'error',
                    message: 'Item name is required'
                };
            }

            // Generate SKU if not provided
            const sku = data.sku || itemRepository.generateSku();

            // Check if SKU already exists
            const existingSku = itemRepository.findBySku(sku);
            if (existingSku) {
                return {
                    status: 'error',
                    message: 'SKU already exists'
                };
            }

            const itemData = {
                sku: sku,
                item_name: data.item_name,
                item_image_url: data.item_image_url || null,
                maximum_capacity: data.maximum_capacity || 0,
                category_id: data.category_id || null,
                uom_id: data.uom_id || null,
                branch_id: data.inventory_id || data.branch_id || null,
                availability: data.availability !== undefined ? (data.availability ? 1 : 0) : 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sync_status: 'pending'
            };

            const item = itemRepository.create(itemData);
            return {
                status: 'success',
                data: this.formatItem(item),
                message: 'Item created successfully'
            };
        } catch (error) {
            console.error('[ItemService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update an item
     * @param {number} id - Item ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = itemRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Item not found'
                };
            }

            const updateData = {};
            if (data.item_name) updateData.item_name = data.item_name;
            if (data.item_image_url !== undefined) updateData.item_image_url = data.item_image_url;
            if (data.maximum_capacity !== undefined) updateData.maximum_capacity = data.maximum_capacity;
            if (data.category_id !== undefined) updateData.category_id = data.category_id;
            if (data.uom_id !== undefined) updateData.uom_id = data.uom_id;
            if (data.inventory_id !== undefined) updateData.branch_id = data.inventory_id;
            if (data.branch_id !== undefined) updateData.branch_id = data.branch_id;
            if (data.availability !== undefined) updateData.availability = data.availability ? 1 : 0;
            updateData.sync_status = 'pending';

            const item = itemRepository.update(id, updateData);
            return {
                status: 'success',
                data: this.formatItem(item),
                message: 'Item updated successfully'
            };
        } catch (error) {
            console.error('[ItemService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete an item
     * @param {number} id - Item ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = itemRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Item not found'
                };
            }

            itemRepository.delete(id);
            return {
                status: 'success',
                message: 'Item deleted successfully'
            };
        } catch (error) {
            console.error('[ItemService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format item for frontend
     * @param {Object} item - Raw item
     * @returns {Object}
     */
    formatItem(item) {
        return {
            id: item.id,
            _id: item.cloud_id || item.id.toString(),
            sku: item.sku,
            item_name: item.item_name,
            item_image_url: item.item_image_url,
            maximum_capacity: item.maximum_capacity,
            category_id: item.category_id,
            uom_id: item.uom_id,
            inventory_id: item.branch_id,
            availability: item.availability === 1,
            item_created_datetime: item.created_at,
            item_update_datetime: item.updated_at,
            stock_trace: [],
            __v: 0
        };
    }
}

module.exports = new ItemService();
