/**
 * Offers & Discounts Service
 *
 * Business logic for managing discount offers.
 */

const offersRepo = require('../repositories/OffersDiscountsRepository.cjs');
const { notifyDataChange } = require('./CloudSyncService.cjs');

class OffersDiscountsService {
    getAll() {
        try {
            return { status: 'success', data: offersRepo.findAll({ limit: 10000, orderBy: 'created_at', order: 'DESC' }) };
        } catch (error) {
            console.error('[OffersDiscountsService] getAll error:', error);
            return { status: 'error', message: error.message };
        }
    }

    getActive() {
        try {
            return { status: 'success', data: offersRepo.findActive() };
        } catch (error) {
            console.error('[OffersDiscountsService] getActive error:', error);
            return { status: 'error', message: error.message };
        }
    }

    create(data) {
        try {
            if (!data.name || !data.name.trim()) {
                return { status: 'error', message: 'Name is required' };
            }
            if (data.discount_value === undefined || data.discount_value === null || Number(data.discount_value) <= 0) {
                return { status: 'error', message: 'Discount value must be greater than 0' };
            }
            if (data.start_date && data.end_date && data.start_date > data.end_date) {
                return { status: 'error', message: 'Start date must be before end date' };
            }

            const record = offersRepo.create({
                name: data.name.trim(),
                description: data.description || null,
                discount_type: data.discount_type || 'percentage',
                discount_value: Number(data.discount_value),
                min_purchase: Number(data.min_purchase) || 0,
                start_date: data.start_date || null,
                end_date: data.end_date || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
                applies_to: data.applies_to || 'all',
                target_id: data.target_id || null,
                sync_status: 'pending'
            });
            try { notifyDataChange('offers_discounts', 'INSERT', record, record.id); } catch (e) { console.error('[OffersDiscountsService] Cloud sync error (non-fatal):', e.message); }
            return { status: 'success', data: record, message: 'Discount created successfully' };
        } catch (error) {
            console.error('[OffersDiscountsService] create error:', error);
            return { status: 'error', message: error.message };
        }
    }

    update(id, data) {
        try {
            const existing = offersRepo.findById(id);
            if (!existing) {
                return { status: 'error', message: 'Discount not found' };
            }

            if (data.discount_value !== undefined && Number(data.discount_value) <= 0) {
                return { status: 'error', message: 'Discount value must be greater than 0' };
            }
            if (data.start_date && data.end_date && data.start_date > data.end_date) {
                return { status: 'error', message: 'Start date must be before end date' };
            }

            const updates = {};
            if (data.name !== undefined) updates.name = data.name.trim();
            if (data.description !== undefined) updates.description = data.description;
            if (data.discount_type !== undefined) updates.discount_type = data.discount_type;
            if (data.discount_value !== undefined) updates.discount_value = Number(data.discount_value);
            if (data.min_purchase !== undefined) updates.min_purchase = Number(data.min_purchase);
            if (data.start_date !== undefined) updates.start_date = data.start_date;
            if (data.end_date !== undefined) updates.end_date = data.end_date;
            if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;
            if (data.applies_to !== undefined) updates.applies_to = data.applies_to;
            if (data.target_id !== undefined) updates.target_id = data.target_id;
            updates.sync_status = 'pending';

            const updated = offersRepo.update(id, updates);
            try { notifyDataChange('offers_discounts', 'UPDATE', updated, updated.id); } catch (e) { console.error('[OffersDiscountsService] Cloud sync error (non-fatal):', e.message); }
            return { status: 'success', data: updated, message: 'Discount updated successfully' };
        } catch (error) {
            console.error('[OffersDiscountsService] update error:', error);
            return { status: 'error', message: error.message };
        }
    }

    delete(id) {
        try {
            const existing = offersRepo.findById(id);
            if (!existing) {
                return { status: 'error', message: 'Discount not found' };
            }
            offersRepo.delete(id);
            try { notifyDataChange('offers_discounts', 'DELETE', {}, id); } catch (e) { console.error('[OffersDiscountsService] Cloud sync error (non-fatal):', e.message); }
            return { status: 'success', message: 'Discount deleted successfully' };
        } catch (error) {
            console.error('[OffersDiscountsService] delete error:', error);
            return { status: 'error', message: error.message };
        }
    }

    toggleActive(id) {
        try {
            const existing = offersRepo.findById(id);
            if (!existing) {
                return { status: 'error', message: 'Discount not found' };
            }
            const updated = offersRepo.toggleActive(id);
            try { notifyDataChange('offers_discounts', 'UPDATE', updated, updated.id); } catch (e) { console.error('[OffersDiscountsService] Cloud sync error (non-fatal):', e.message); }
            return { status: 'success', data: updated, message: `Discount ${updated.is_active ? 'activated' : 'disabled'}` };
        } catch (error) {
            console.error('[OffersDiscountsService] toggleActive error:', error);
            return { status: 'error', message: error.message };
        }
    }
}

module.exports = new OffersDiscountsService();
