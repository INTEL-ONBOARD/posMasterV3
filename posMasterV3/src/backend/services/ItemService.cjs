/**
 * Item Service
 *
 * Business logic for item (registry) operations.
 * Items are GLOBAL - shared across all branches.
 * Stock quantities are branch-specific.
 */

const itemRepository = require('../repositories/ItemRepository.cjs');
const { nowISO } = require('../utils/helpers.cjs');
const { notifyDataChange } = require('./CloudSyncService.cjs');

class ItemService {
    /**
     * Get all items (global - not filtered by branch)
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
     * Items are global, but stock data is branch-filtered
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
     * Create a new item (global - not branch-specific)
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

            // SKU is required and must be user-provided
            if (!data.sku || !data.sku.trim()) {
                return {
                    status: 'error',
                    message: 'SKU is required'
                };
            }
            const sku = data.sku.trim();

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
                item_code: data.item_code || null,
                item_image_url: data.item_image_url || null,
                item_image_blob: data.item_image_blob || null,
                maximum_capacity: data.maximum_capacity || 0,
                category_id: data.category_id || null,
                uom_id: data.uom_id || null,
                branch_id: data.inventory_id || data.branch_id || null, // Optional - items are global
                availability: data.availability !== undefined ? (data.availability ? 1 : 0) : 1,
                created_at: nowISO(),
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            const item = itemRepository.create(itemData);
            try { notifyDataChange('items', 'INSERT', item, item.id); } catch (e) { console.error('[ItemService] Cloud sync error (non-fatal):', e.message); }
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
            if (data.item_image_blob !== undefined) updateData.item_image_blob = data.item_image_blob;
            if (data.maximum_capacity !== undefined) updateData.maximum_capacity = data.maximum_capacity;
            if (data.category_id !== undefined) updateData.category_id = data.category_id;
            if (data.uom_id !== undefined) updateData.uom_id = data.uom_id;
            if (data.inventory_id !== undefined) updateData.branch_id = data.inventory_id;
            if (data.branch_id !== undefined) updateData.branch_id = data.branch_id;
            if (data.availability !== undefined) updateData.availability = data.availability ? 1 : 0;
            if (data.item_code !== undefined) updateData.item_code = data.item_code;
            if (data.sku !== undefined && data.sku.trim()) {
                const trimmedSku = data.sku.trim();
                if (trimmedSku !== existing.sku) {
                    const skuConflict = itemRepository.findBySku(trimmedSku);
                    if (skuConflict) {
                        return {
                            status: 'error',
                            message: 'SKU already exists'
                        };
                    }
                }
                updateData.sku = trimmedSku;
            }
            updateData.sync_status = 'pending';

            const item = itemRepository.update(id, updateData);
            try { notifyDataChange('items', 'UPDATE', item, item.id); } catch (e) { console.error('[ItemService] Cloud sync error (non-fatal):', e.message); }
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

            // Check if item has stock quantity > 0
            const stockQuantity = itemRepository.getItemStockQuantity(id);
            if (stockQuantity > 0) {
                return {
                    status: 'error',
                    message: `Cannot delete item. There are ${stockQuantity} units in stock. Please clear stock first.`
                };
            }

            itemRepository.delete(id);
            try { notifyDataChange('items', 'DELETE', {}, id); } catch (e) { console.error('[ItemService] Cloud sync error (non-fatal):', e.message); }
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
            item_code: item.item_code || null,
            item_name: item.item_name,
            item_image_url: item.item_image_url,
            item_image_blob: item.item_image_blob,
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
