/**
 * Category Service
 *
 * Business logic for category operations.
 */

const categoryRepository = require('../repositories/CategoryRepository.cjs');
const { nowISO } = require('../utils/helpers.cjs');
const { notifyDataChange } = require('./CloudSyncService.cjs');

class CategoryService {
    /**
     * Get all categories
     * @returns {Object}
     */
    getAll() {
        try {
            const categories = categoryRepository.findAll({ limit: 1000, orderBy: 'type', order: 'ASC' });
            return {
                status: 'success',
                data: categories.map(c => this.formatCategory(c))
            };
        } catch (error) {
            console.error('[CategoryService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get category by ID
     * @param {number} id - Category ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const category = categoryRepository.findById(id);
            if (!category) {
                return {
                    status: 'error',
                    message: 'Category not found'
                };
            }
            return {
                status: 'success',
                data: this.formatCategory(category)
            };
        } catch (error) {
            console.error('[CategoryService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get unique category types
     * @returns {Object}
     */
    getUniqueTypes() {
        try {
            const types = categoryRepository.getUniqueTypes();
            return {
                status: 'success',
                data: types
            };
        } catch (error) {
            console.error('[CategoryService] getUniqueTypes error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search categories
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const categories = categoryRepository.search(searchTerm);
            return {
                status: 'success',
                data: categories.map(c => this.formatCategory(c))
            };
        } catch (error) {
            console.error('[CategoryService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new category
     * @param {Object} data - Category data
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.brand || !data.type) {
                return {
                    status: 'error',
                    message: 'Brand and type are required'
                };
            }

            const categoryData = {
                brand: data.brand,
                type: data.type,
                created_at: nowISO(),
                updated_at: nowISO(),
                sync_status: 'pending'
            };

            const category = categoryRepository.create(categoryData);
            try { notifyDataChange('categories', 'INSERT', category, category.id); } catch (e) { console.error('[CategoryService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                data: this.formatCategory(category),
                message: 'Category created successfully'
            };
        } catch (error) {
            console.error('[CategoryService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a category
     * @param {number} id - Category ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = categoryRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Category not found'
                };
            }

            const updateData = {};
            if (data.brand) updateData.brand = data.brand;
            if (data.type) updateData.type = data.type;
            updateData.sync_status = 'pending';

            const category = categoryRepository.update(id, updateData);
            try { notifyDataChange('categories', 'UPDATE', category, category.id); } catch (e) { console.error('[CategoryService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                data: this.formatCategory(category),
                message: 'Category updated successfully'
            };
        } catch (error) {
            console.error('[CategoryService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete a category
     * @param {number} id - Category ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = categoryRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'Category not found'
                };
            }

            categoryRepository.delete(id);
            try { notifyDataChange('categories', 'DELETE', {}, id); } catch (e) { console.error('[CategoryService] Cloud sync error (non-fatal):', e.message); }
            return {
                status: 'success',
                message: 'Category deleted successfully'
            };
        } catch (error) {
            console.error('[CategoryService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format category for frontend
     * @param {Object} category - Raw category
     * @returns {Object}
     */
    formatCategory(category) {
        return {
            id: category.id,
            _id: category.cloud_id || category.id.toString(),
            brand: category.brand,
            type: category.type,
            created_at: category.created_at,
            updated_at: category.updated_at,
            __v: 0
        };
    }
}

module.exports = new CategoryService();
