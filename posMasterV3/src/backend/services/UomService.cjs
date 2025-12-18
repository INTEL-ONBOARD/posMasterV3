/**
 * UOM Service
 *
 * Business logic for unit of measurement operations.
 */

const uomRepository = require('../repositories/UomRepository.cjs');

class UomService {
    /**
     * Get all UOMs
     * @returns {Object}
     */
    getAll() {
        try {
            const uoms = uomRepository.findAll({ limit: 1000, orderBy: 'unit_name', order: 'ASC' });
            return {
                status: 'success',
                data: uoms.map(u => this.formatUom(u))
            };
        } catch (error) {
            console.error('[UomService] getAll error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get UOM by ID
     * @param {number} id - UOM ID
     * @returns {Object}
     */
    getById(id) {
        try {
            const uom = uomRepository.findById(id);
            if (!uom) {
                return {
                    status: 'error',
                    message: 'UOM not found'
                };
            }
            return {
                status: 'success',
                data: this.formatUom(uom)
            };
        } catch (error) {
            console.error('[UomService] getById error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Search UOMs
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    search(searchTerm) {
        try {
            const uoms = uomRepository.search(searchTerm);
            return {
                status: 'success',
                data: uoms.map(u => this.formatUom(u))
            };
        } catch (error) {
            console.error('[UomService] search error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Create a new UOM
     * @param {Object} data - UOM data
     * @returns {Object}
     */
    create(data) {
        try {
            if (!data.symbol || !data.unit_name) {
                return {
                    status: 'error',
                    message: 'Symbol and unit name are required'
                };
            }

            // Check if symbol already exists
            const existing = uomRepository.findBySymbol(data.symbol);
            if (existing) {
                return {
                    status: 'error',
                    message: 'UOM with this symbol already exists'
                };
            }

            const uomData = {
                symbol: data.symbol,
                unit_name: data.unit_name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sync_status: 'pending'
            };

            const uom = uomRepository.create(uomData);
            return {
                status: 'success',
                data: this.formatUom(uom),
                message: 'UOM created successfully'
            };
        } catch (error) {
            console.error('[UomService] create error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Update a UOM
     * @param {number} id - UOM ID
     * @param {Object} data - Update data
     * @returns {Object}
     */
    update(id, data) {
        try {
            const existing = uomRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'UOM not found'
                };
            }

            const updateData = {};
            if (data.symbol) updateData.symbol = data.symbol;
            if (data.unit_name) updateData.unit_name = data.unit_name;
            updateData.sync_status = 'pending';

            const uom = uomRepository.update(id, updateData);
            return {
                status: 'success',
                data: this.formatUom(uom),
                message: 'UOM updated successfully'
            };
        } catch (error) {
            console.error('[UomService] update error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Delete a UOM
     * @param {number} id - UOM ID
     * @returns {Object}
     */
    delete(id) {
        try {
            const existing = uomRepository.findById(id);
            if (!existing) {
                return {
                    status: 'error',
                    message: 'UOM not found'
                };
            }

            uomRepository.delete(id);
            return {
                status: 'success',
                message: 'UOM deleted successfully'
            };
        } catch (error) {
            console.error('[UomService] delete error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Format UOM for frontend
     * @param {Object} uom - Raw UOM
     * @returns {Object}
     */
    formatUom(uom) {
        return {
            id: uom.id,
            _id: uom.cloud_id || uom.id.toString(),
            symbol: uom.symbol,
            unit_name: uom.unit_name,
            created_at: uom.created_at,
            updated_at: uom.updated_at,
            __v: 0
        };
    }
}

module.exports = new UomService();
