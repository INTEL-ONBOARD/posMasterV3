const { ipcMain } = require('electron');
const { getOnlineModeService } = require('../services/OnlineModeService.cjs');
const { wrapIpcHandler, successResponse } = require('../utils/helpers.cjs');

function registerHandlers() {
    // Tracks every channel this function registers so unregisterHandlers()
    // (see controllers/index.cjs) can remove exactly what was added, without
    // maintaining a second, separately-drifting list of channel names.
    const registeredChannels = [];
    const handle = (channel, listener) => {
        registeredChannels.push(channel);
        ipcMain.handle(channel, listener);
    };

    const service = getOnlineModeService();
    const collectionHandler = (collection) => ({
        list: (query = {}) => service.list(collection, query || {}),
        get: (id) => service.get(collection, id),
        create: (data = {}) => service.create(collection, data || {}),
        update: (id, data = {}) => service.update(collection, id, data || {}),
        delete: (id) => service.delete(collection, id)
    });
    const categories = collectionHandler('categories');
    const uom = collectionHandler('units_of_measurement');
    const branches = collectionHandler('branches');
    const suppliers = collectionHandler('suppliers');
    const items = collectionHandler('items');
    const stock = collectionHandler('stock_batches');
    const restocks = collectionHandler('restock_transactions');
    const members = collectionHandler('members');
    const offers = collectionHandler('offers');
    const disposed = collectionHandler('disposed_items');
    const paymentMethods = collectionHandler('payment_methods');
    const users = collectionHandler('users');
    const loginHistory = collectionHandler('login_history');
    const teaCoopMembers = collectionHandler('tea_coop_members');
    const teaCoopPayments = collectionHandler('tea_coop_payments');

    handle('online:get-config', wrapIpcHandler(async () => {
        return successResponse(service.getConfig());
    }));

    handle('online:health', wrapIpcHandler(async () => {
        return service.health();
    }));

    handle('online:ready', wrapIpcHandler(async () => {
        return service.ready();
    }));

    handle('online:login', wrapIpcHandler(async (event, payload) => {
        const { email, password, deviceInfo } = payload || {};
        return service.login(email, password, deviceInfo);
    }));

    handle('online:register', wrapIpcHandler(async (event, payload) => {
        return service.register(payload || {});
    }));

    handle('online:logout', wrapIpcHandler(async () => {
        return service.logout();
    }));

    handle('online:validate-session', wrapIpcHandler(async (event, payload) => {
        return service.validateSession(payload?.token || null);
    }));

    handle('online:set-token', wrapIpcHandler(async (event, payload) => {
        return service.setToken(payload?.token || null);
    }));

    handle('online:realtime-status', wrapIpcHandler(async () => {
        return successResponse(service.getRealtimeStatus());
    }));

    handle('online:list', wrapIpcHandler(async (event, payload) => {
        const { collection, query } = payload || {};
        return service.list(collection, query || {});
    }));

    handle('online:get', wrapIpcHandler(async (event, payload) => {
        const { collection, id } = payload || {};
        return service.get(collection, id);
    }));

    handle('online:create', wrapIpcHandler(async (event, payload) => {
        const { collection, data } = payload || {};
        return service.create(collection, data || {});
    }));

    handle('online:update', wrapIpcHandler(async (event, payload) => {
        const { collection, id, data } = payload || {};
        return service.update(collection, id, data || {});
    }));

    handle('online:delete', wrapIpcHandler(async (event, payload) => {
        const { collection, id } = payload || {};
        return service.delete(collection, id);
    }));

    handle('online:sales:create', wrapIpcHandler(async (event, payload) => {
        return service.createSale(payload || {});
    }));

    handle('online:sales:complete-held', wrapIpcHandler(async (event, payload) => {
        return service.completeHeldSale(payload?.id || payload?.saleId || payload?._id, payload || {});
    }));

    handle('online:sales:cancel', wrapIpcHandler(async (event, payload) => {
        return service.cancelSale(payload?.id || payload?.saleId || payload?._id, payload || {});
    }));

    handle('online:sales:return-items', wrapIpcHandler(async (event, payload) => {
        return service.returnSaleItems(payload?.id || payload?.saleId || payload?._id, payload || {});
    }));

    handle('online:sales:invoice-no', wrapIpcHandler(async (event, payload) => {
        return service.generateInvoiceNo(payload?.type || 'SALE', payload?.branchId || payload?.branch_id || null);
    }));

    handle('online:sales:get-summary', wrapIpcHandler(async (event, payload) => {
        return service.getSalesSummary(payload?.startDate, payload?.endDate);
    }));

    handle('online:sales:get-daily', wrapIpcHandler(async (event, payload) => {
        return service.getSalesDaily(payload?.days || 30);
    }));

    handle('online:login-history:get-active-sessions', wrapIpcHandler(async (event, payload) => {
        return service.getActiveSessions(payload?.limit, payload?.skip);
    }));

    handle('online:login-history:count-active-sessions', wrapIpcHandler(async () => {
        return service.countActiveSessions();
    }));

    handle('online:auth:change-password', wrapIpcHandler(async (event, payload) => {
        return service.changePassword(payload?.currentPassword || payload?.current_password || '', payload?.newPassword || payload?.new_password || payload?.password || '');
    }));

    handle('online:users:reset-password', wrapIpcHandler(async (event, payload) => {
        return service.resetPassword(payload?.userId || payload?.user_id || payload?.id, payload?.newPassword || payload?.new_password || payload?.password || '');
    }));

    handle('online:inventory-transfers:accept', wrapIpcHandler(async (event, payload) => {
        return service.acceptInventoryTransfer(payload?.id || payload?.transferId || payload?._id, payload || {});
    }));

    handle('online:inventory-transfers:reject', wrapIpcHandler(async (event, payload) => {
        return service.rejectInventoryTransfer(payload?.id || payload?.transferId || payload?._id, payload || {});
    }));

    // Compatibility handlers for older renderer paths. They are intentionally
    // backed by the online service so stale UI imports cannot hit missing local
    // SQLite-era IPC channels.
    handle('auth:login', wrapIpcHandler(async (event, payload) => service.login(payload?.email, payload?.password, payload?.deviceInfo)));
    handle('auth:register', wrapIpcHandler(async (event, payload) => service.register(payload || {})));
    handle('auth:logout', wrapIpcHandler(async () => service.logout()));
    handle('auth:validate-session', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));
    handle('auth:get-current-user', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));
    handle('auth:change-password', wrapIpcHandler(async (event, payload) => service.changePassword(payload?.currentPassword || '', payload?.newPassword || payload?.password || '')));
    handle('auth:import-from-cloud', wrapIpcHandler(async () => ({ status: 'error', message: 'Cloud import is disabled in online-only mode' })));
    handle('auth:check-session-with-sync', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));
    handle('auth:validate-session-fast', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));

    handle('users:get-all', wrapIpcHandler(async (event, options) => users.list(options)));
    handle('users:get-by-id', wrapIpcHandler(async (event, payload) => users.get(payload?.userId || payload?.id)));
    handle('users:update', wrapIpcHandler(async (event, payload) => users.update(payload?.userId || payload?.id, payload?.data || {})));
    handle('users:delete', wrapIpcHandler(async (event, payload) => users.delete(payload?.userId || payload?.id)));
    handle('users:search', wrapIpcHandler(async (event, payload) => users.list({ search: (payload?.query ?? payload) || '' })));
    handle('users:get-by-role', wrapIpcHandler(async (event, payload) => users.list({ role: payload?.role })));
    handle('users:update-roles', wrapIpcHandler(async (event, payload) => users.update(payload?.userId || payload?.id, { roles: payload?.roles || [] })));
    handle('users:statistics', wrapIpcHandler(async () => service.list('users', {})));
    handle('users:reset-password', wrapIpcHandler(async (event, payload) => service.resetPassword(payload?.userId || payload?.id, payload?.newPassword || payload?.password || '')));

    handle('categories:get-all', wrapIpcHandler(async () => categories.list({})));
    handle('categories:get-by-id', wrapIpcHandler(async (event, id) => categories.get(id)));
    handle('categories:get-types', wrapIpcHandler(async () => categories.list({})));
    handle('categories:search', wrapIpcHandler(async (event, searchTerm) => categories.list({ search: searchTerm || '' })));
    handle('categories:create', wrapIpcHandler(async (event, data) => categories.create(data)));
    handle('categories:update', wrapIpcHandler(async (event, id, data) => categories.update(id, data)));
    handle('categories:delete', wrapIpcHandler(async (event, id) => categories.delete(id)));

    handle('uom:get-all', wrapIpcHandler(async () => uom.list({})));
    handle('uom:get-by-id', wrapIpcHandler(async (event, id) => uom.get(id)));
    handle('uom:search', wrapIpcHandler(async (event, searchTerm) => uom.list({ search: searchTerm || '' })));
    handle('uom:create', wrapIpcHandler(async (event, data) => uom.create(data)));
    handle('uom:update', wrapIpcHandler(async (event, id, data) => uom.update(id, data)));
    handle('uom:delete', wrapIpcHandler(async (event, id) => uom.delete(id)));

    handle('branches:get-all', wrapIpcHandler(async () => branches.list({})));
    handle('branches:get-active', wrapIpcHandler(async () => branches.list({})));
    handle('branches:get-by-id', wrapIpcHandler(async (event, id) => branches.get(id)));
    handle('branches:search', wrapIpcHandler(async (event, searchTerm) => branches.list({ search: searchTerm || '' })));
    handle('branches:create', wrapIpcHandler(async (event, data) => branches.create(data)));
    handle('branches:update', wrapIpcHandler(async (event, id, data) => branches.update(id, data)));
    handle('branches:delete', wrapIpcHandler(async (event, id) => branches.delete(id)));

    handle('suppliers:get-all', wrapIpcHandler(async () => suppliers.list({})));
    handle('suppliers:get-active', wrapIpcHandler(async () => suppliers.list({})));
    handle('suppliers:get-by-id', wrapIpcHandler(async (event, id) => suppliers.get(id)));
    handle('suppliers:search', wrapIpcHandler(async (event, searchTerm) => suppliers.list({ search: searchTerm || '' })));
    handle('suppliers:create', wrapIpcHandler(async (event, data) => suppliers.create(data)));
    handle('suppliers:update', wrapIpcHandler(async (event, id, data) => suppliers.update(id, data)));
    handle('suppliers:delete', wrapIpcHandler(async (event, id) => suppliers.delete(id)));
    handle('suppliers:update-amounts', wrapIpcHandler(async (event, id, currentAmount, previousAmount) => suppliers.update(id, { current_amount: currentAmount, previous_amount: previousAmount })));

    handle('items:get-all', wrapIpcHandler(async () => items.list({})));
    handle('items:get-all-extended', wrapIpcHandler(async () => items.list({})));
    handle('items:get-by-id', wrapIpcHandler(async (event, id) => items.get(id)));
    handle('items:get-by-id-extended', wrapIpcHandler(async (event, id) => items.get(id)));
    handle('items:get-by-sku', wrapIpcHandler(async (event, sku) => items.list({ sku })));
    handle('items:search', wrapIpcHandler(async (event, searchTerm) => items.list({ search: searchTerm || '' })));
    handle('items:create', wrapIpcHandler(async (event, data) => items.create(data)));
    handle('items:update', wrapIpcHandler(async (event, id, data) => items.update(id, data)));
    handle('items:delete', wrapIpcHandler(async (event, id) => items.delete(id)));

    handle('stock:get-all', wrapIpcHandler(async () => stock.list({})));
    handle('stock:get-all-with-items', wrapIpcHandler(async () => stock.list({})));
    handle('stock:get-by-id', wrapIpcHandler(async (event, id) => stock.get(id)));
    handle('stock:get-by-sku', wrapIpcHandler(async (event, sku) => stock.list({ sku })));
    handle('stock:get-low-stock', wrapIpcHandler(async () => stock.list({})));
    handle('stock:get-expiring', wrapIpcHandler(async (event, days) => stock.list({ days })));
    handle('stock:get-value', wrapIpcHandler(async () => stock.list({})));
    handle('stock:upsert', wrapIpcHandler(async (event, data) => stock.create(data)));
    handle('stock:update-quantity', wrapIpcHandler(async (event, id, quantity) => stock.update(id, { quantity })));
    handle('stock:update-prices', wrapIpcHandler(async (event, id, stockPrice, retailPrice, changedBy, reason) => stock.update(id, { stock_price: stockPrice, retail_price: retailPrice, changedBy, reason })));
    handle('stock:delete', wrapIpcHandler(async (event, id) => stock.delete(id)));

    handle('restocks:get-all', wrapIpcHandler(async (event, options) => restocks.list(options || {})));
    handle('restocks:get-by-id', wrapIpcHandler(async (event, id) => restocks.get(id)));
    handle('restocks:get-by-invoice', wrapIpcHandler(async (event, invoiceNo) => restocks.list({ invoiceNo, invoice_no: invoiceNo })));
    handle('restocks:get-by-supplier', wrapIpcHandler(async (event, supplierId) => restocks.list({ supplierId, supplier_id: supplierId })));
    handle('restocks:get-by-date-range', wrapIpcHandler(async (event, startDate, endDate) => restocks.list({ startDate, endDate })));
    handle('restocks:get-stock-data', wrapIpcHandler(async (event, sku) => stock.list({ sku })));
    handle('restocks:get-stock-items', wrapIpcHandler(async () => stock.list({})));
    handle('restocks:create', wrapIpcHandler(async (event, data) => restocks.create(data)));
    handle('restocks:get-summary', wrapIpcHandler(async (event, startDate, endDate) => restocks.list({ startDate, endDate })));

    handle('members:get-all', wrapIpcHandler(async () => members.list({})));
    handle('members:get-active', wrapIpcHandler(async () => members.list({})));
    handle('members:get-by-id', wrapIpcHandler(async (event, id) => members.get(id)));
    handle('members:get-by-member-no', wrapIpcHandler(async (event, memberNo) => members.list({ memberNo, member_no: memberNo })));
    handle('members:get-with-transactions', wrapIpcHandler(async (event, id) => members.get(id)));
    handle('members:search', wrapIpcHandler(async (event, searchTerm) => members.list({ search: searchTerm || '' })));
    handle('members:create', wrapIpcHandler(async (event, data) => members.create(data)));
    handle('members:update', wrapIpcHandler(async (event, id, data) => members.update(id, data)));
    handle('members:delete', wrapIpcHandler(async (event, id) => members.delete(id)));
    handle('members:get-top', wrapIpcHandler(async () => members.list({})));
    handle('members:get-debtors', wrapIpcHandler(async () => members.list({})));

    handle('offers:get-all', wrapIpcHandler(async () => offers.list({})));
    handle('offers:get-active', wrapIpcHandler(async () => offers.list({})));
    handle('offers:create', wrapIpcHandler(async (event, data) => offers.create(data)));
    handle('offers:update', wrapIpcHandler(async (event, id, data) => offers.update(id, data)));
    handle('offers:delete', wrapIpcHandler(async (event, id) => offers.delete(id)));
    handle('offers:toggle-active', wrapIpcHandler(async (event, id) => {
        // The frontend only sends the id (see OffersDiscountView.jsx), expecting
        // a true toggle — read the current state and flip it, since an empty
        // update body leaves is_active untouched entirely.
        const current = await offers.get(id);
        const isActive = Boolean(current?.data?.is_active ?? current?.data?.isActive);
        return offers.update(id, { is_active: !isActive, isActive: !isActive });
    }));

    handle('disposed:get-all', wrapIpcHandler(async () => disposed.list({})));
    handle('disposed:create', wrapIpcHandler(async (event, data) => disposed.create(data)));
    handle('disposed:get-by-date-range', wrapIpcHandler(async (event, startDate, endDate) => disposed.list({ startDate, endDate })));

    handle('sales:get-all', wrapIpcHandler(async (event, options) => service.list('sales', options || {})));
    handle('sales:get-by-id', wrapIpcHandler(async (event, id) => service.get('sales', id)));
    handle('sales:get-by-invoice', wrapIpcHandler(async (event, invoiceNo) => service.list('sales', { invoiceNo, invoice_no: invoiceNo })));
    handle('sales:get-by-member', wrapIpcHandler(async (event, memberId) => service.list('sales', { memberId, member_id: memberId })));
    handle('sales:get-by-date-range', wrapIpcHandler(async (event, startDate, endDate) => service.list('sales', { startDate, endDate })));
    handle('sales:get-held-orders', wrapIpcHandler(async () => service.list('sales', { status: 'held' })));
    handle('sales:create', wrapIpcHandler(async (event, data) => service.createSale(data || {})));
    handle('sales:hold', wrapIpcHandler(async (event, data) => service.createSale({ ...(data || {}), is_held: true, isHeld: true })));

    handle('payment-methods:get-all', wrapIpcHandler(async () => paymentMethods.list({})));
    handle('payment-methods:get-active', wrapIpcHandler(async () => paymentMethods.list({})));
    handle('payment-methods:get-for-members', wrapIpcHandler(async () => paymentMethods.list({})));
    handle('payment-methods:get-for-non-members', wrapIpcHandler(async () => paymentMethods.list({})));
    handle('payment-methods:get-by-id', wrapIpcHandler(async (event, id) => paymentMethods.get(id)));
    handle('payment-methods:search', wrapIpcHandler(async (event, searchTerm) => paymentMethods.list({ search: searchTerm || '' })));
    handle('payment-methods:create', wrapIpcHandler(async (event, data) => paymentMethods.create(data)));
    handle('payment-methods:update', wrapIpcHandler(async (event, id, data) => paymentMethods.update(id, data)));
    handle('payment-methods:toggle-active', wrapIpcHandler(async (event, id) => {
        // Same fix as offers:toggle-active above — SalesConfig.jsx only sends
        // the id, expecting a true toggle rather than a no-op empty update.
        const current = await paymentMethods.get(id);
        const isActive = Boolean(current?.data?.is_active ?? current?.data?.isActive);
        return paymentMethods.update(id, { is_active: !isActive, isActive: !isActive });
    }));
    handle('payment-methods:delete', wrapIpcHandler(async (event, id) => paymentMethods.delete(id)));

    handle('loginHistory:getAll', wrapIpcHandler(async (event, options) => loginHistory.list(options || {})));
    handle('loginHistory:getByUser', wrapIpcHandler(async (event, userId) => loginHistory.list({ userId, user_id: userId })));
    handle('loginHistory:getByDateRange', wrapIpcHandler(async (event, startDate, endDate) => loginHistory.list({ startDate, endDate })));
    handle('loginHistory:getUserStats', wrapIpcHandler(async () => loginHistory.list({})));
    handle('loginHistory:getDailyStats', wrapIpcHandler(async () => loginHistory.list({})));
    handle('loginHistory:getUserActivitySummary', wrapIpcHandler(async () => loginHistory.list({})));
    handle('loginHistory:getActiveSessions', wrapIpcHandler(async () => service.getActiveSessions()));
    handle('loginHistory:markStaleSessions', wrapIpcHandler(async () => ({ status: 'success', data: { onlineOnly: true } })));

    handle('teacoop:initialize', wrapIpcHandler(async () => ({ status: 'success', data: { onlineOnly: true } })));
    handle('teacoop:members:getAll', wrapIpcHandler(async () => teaCoopMembers.list({})));
    handle('teacoop:members:getById', wrapIpcHandler(async (event, memberId) => teaCoopMembers.get(memberId)));
    handle('teacoop:members:search', wrapIpcHandler(async (event, searchTerm) => teaCoopMembers.list({ search: searchTerm })));
    handle('teacoop:payments:getHistory', wrapIpcHandler(async (event, payload) => {
        const memberId = payload?.memberId || payload?.member_id || payload;
        return teaCoopPayments.list({ memberId, member_id: memberId });
    }));
    handle('teacoop:sync:members', wrapIpcHandler(async () => service.syncTeaCoop({})));
    handle('teacoop:sync:payments', wrapIpcHandler(async (event, payload) => {
        const memberId = payload?.memberId || payload?.member_id || null;
        return service.syncTeaCoopPayments(memberId, payload?.options || payload || {});
    }));
    handle('teacoop:members:refresh', wrapIpcHandler(async (event, memberId) => teaCoopMembers.get(memberId)));
    handle('teacoop:status', wrapIpcHandler(async () => service.getTeaCoopStatus()));

    console.log('[OnlineController] Online-only IPC handlers registered');
    return registeredChannels;
}

module.exports = { registerHandlers };
