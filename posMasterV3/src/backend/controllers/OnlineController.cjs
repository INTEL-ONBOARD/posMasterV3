const { ipcMain } = require('electron');
const { getOnlineModeService } = require('../services/OnlineModeService.cjs');
const { wrapIpcHandler, successResponse } = require('../utils/helpers.cjs');

function registerHandlers() {
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

    ipcMain.handle('online:get-config', wrapIpcHandler(async () => {
        return successResponse(service.getConfig());
    }));

    ipcMain.handle('online:health', wrapIpcHandler(async () => {
        return service.health();
    }));

    ipcMain.handle('online:ready', wrapIpcHandler(async () => {
        return service.ready();
    }));

    ipcMain.handle('online:login', wrapIpcHandler(async (event, payload) => {
        const { email, password, deviceInfo } = payload || {};
        return service.login(email, password, deviceInfo);
    }));

    ipcMain.handle('online:register', wrapIpcHandler(async (event, payload) => {
        return service.register(payload || {});
    }));

    ipcMain.handle('online:logout', wrapIpcHandler(async () => {
        return service.logout();
    }));

    ipcMain.handle('online:validate-session', wrapIpcHandler(async (event, payload) => {
        return service.validateSession(payload?.token || null);
    }));

    ipcMain.handle('online:set-token', wrapIpcHandler(async (event, payload) => {
        return service.setToken(payload?.token || null);
    }));

    ipcMain.handle('online:realtime-status', wrapIpcHandler(async () => {
        return successResponse(service.getRealtimeStatus());
    }));

    ipcMain.handle('online:list', wrapIpcHandler(async (event, payload) => {
        const { collection, query } = payload || {};
        return service.list(collection, query || {});
    }));

    ipcMain.handle('online:get', wrapIpcHandler(async (event, payload) => {
        const { collection, id } = payload || {};
        return service.get(collection, id);
    }));

    ipcMain.handle('online:create', wrapIpcHandler(async (event, payload) => {
        const { collection, data } = payload || {};
        return service.create(collection, data || {});
    }));

    ipcMain.handle('online:update', wrapIpcHandler(async (event, payload) => {
        const { collection, id, data } = payload || {};
        return service.update(collection, id, data || {});
    }));

    ipcMain.handle('online:delete', wrapIpcHandler(async (event, payload) => {
        const { collection, id } = payload || {};
        return service.delete(collection, id);
    }));

    ipcMain.handle('online:sales:create', wrapIpcHandler(async (event, payload) => {
        return service.createSale(payload || {});
    }));

    ipcMain.handle('online:sales:complete-held', wrapIpcHandler(async (event, payload) => {
        return service.completeHeldSale(payload?.id || payload?.saleId || payload?._id, payload || {});
    }));

    ipcMain.handle('online:sales:cancel', wrapIpcHandler(async (event, payload) => {
        return service.cancelSale(payload?.id || payload?.saleId || payload?._id, payload || {});
    }));

    ipcMain.handle('online:sales:return-items', wrapIpcHandler(async (event, payload) => {
        return service.returnSaleItems(payload?.id || payload?.saleId || payload?._id, payload || {});
    }));

    ipcMain.handle('online:sales:invoice-no', wrapIpcHandler(async (event, payload) => {
        return service.generateInvoiceNo(payload?.type || 'SALE', payload?.branchId || payload?.branch_id || null);
    }));

    ipcMain.handle('online:sales:get-summary', wrapIpcHandler(async (event, payload) => {
        return service.getSalesSummary(payload?.startDate, payload?.endDate);
    }));

    ipcMain.handle('online:sales:get-daily', wrapIpcHandler(async (event, payload) => {
        return service.getSalesDaily(payload?.days || 30);
    }));

    ipcMain.handle('online:sales:get-daily-report', wrapIpcHandler(async (event, payload) => {
        return service.getDailyTransactionReport(payload || {});
    }));

    ipcMain.handle('online:reports:get-petty-cash', wrapIpcHandler(async (event, payload) => {
        return service.getPettyCashReport(payload || {});
    }));

    ipcMain.handle('online:login-history:get-active-sessions', wrapIpcHandler(async () => {
        return service.getActiveSessions();
    }));

    ipcMain.handle('online:login-history:count-active-sessions', wrapIpcHandler(async () => {
        return service.countActiveSessions();
    }));

    ipcMain.handle('online:auth:change-password', wrapIpcHandler(async (event, payload) => {
        return service.changePassword(payload?.currentPassword || payload?.current_password || '', payload?.newPassword || payload?.new_password || payload?.password || '');
    }));

    ipcMain.handle('online:users:reset-password', wrapIpcHandler(async (event, payload) => {
        return service.resetPassword(payload?.userId || payload?.user_id || payload?.id, payload?.newPassword || payload?.new_password || payload?.password || '');
    }));

    ipcMain.handle('online:inventory-transfers:accept', wrapIpcHandler(async (event, payload) => {
        return service.acceptInventoryTransfer(payload?.id || payload?.transferId || payload?._id, payload || {});
    }));

    ipcMain.handle('online:inventory-transfers:reject', wrapIpcHandler(async (event, payload) => {
        return service.rejectInventoryTransfer(payload?.id || payload?.transferId || payload?._id, payload || {});
    }));

    // Compatibility handlers for older renderer paths. They are intentionally
    // backed by the online service so stale UI imports cannot hit missing local
    // SQLite-era IPC channels.
    ipcMain.handle('auth:login', wrapIpcHandler(async (event, payload) => service.login(payload?.email, payload?.password, payload?.deviceInfo)));
    ipcMain.handle('auth:register', wrapIpcHandler(async (event, payload) => service.register(payload || {})));
    ipcMain.handle('auth:logout', wrapIpcHandler(async () => service.logout()));
    ipcMain.handle('auth:validate-session', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));
    ipcMain.handle('auth:get-current-user', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));
    ipcMain.handle('auth:change-password', wrapIpcHandler(async (event, payload) => service.changePassword(payload?.currentPassword || '', payload?.newPassword || payload?.password || '')));
    ipcMain.handle('auth:import-from-cloud', wrapIpcHandler(async () => ({ status: 'error', message: 'Cloud import is disabled in online-only mode' })));
    ipcMain.handle('auth:check-session-with-sync', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));
    ipcMain.handle('auth:validate-session-fast', wrapIpcHandler(async (event, payload) => service.validateSession(payload?.token || null)));

    ipcMain.handle('users:get-all', wrapIpcHandler(async (event, options) => users.list(options)));
    ipcMain.handle('users:get-by-id', wrapIpcHandler(async (event, payload) => users.get(payload?.userId || payload?.id)));
    ipcMain.handle('users:update', wrapIpcHandler(async (event, payload) => users.update(payload?.userId || payload?.id, payload?.data || {})));
    ipcMain.handle('users:delete', wrapIpcHandler(async (event, payload) => users.delete(payload?.userId || payload?.id)));
    ipcMain.handle('users:search', wrapIpcHandler(async () => users.list({})));
    ipcMain.handle('users:get-by-role', wrapIpcHandler(async (event, payload) => users.list({ role: payload?.role })));
    ipcMain.handle('users:update-roles', wrapIpcHandler(async (event, payload) => users.update(payload?.userId || payload?.id, { roles: payload?.roles || [] })));
    ipcMain.handle('users:statistics', wrapIpcHandler(async () => service.list('users', {})));
    ipcMain.handle('users:reset-password', wrapIpcHandler(async (event, payload) => service.resetPassword(payload?.userId || payload?.id, payload?.newPassword || payload?.password || '')));

    ipcMain.handle('categories:get-all', wrapIpcHandler(async () => categories.list({})));
    ipcMain.handle('categories:get-by-id', wrapIpcHandler(async (event, id) => categories.get(id)));
    ipcMain.handle('categories:get-types', wrapIpcHandler(async () => categories.list({})));
    ipcMain.handle('categories:search', wrapIpcHandler(async () => categories.list({})));
    ipcMain.handle('categories:create', wrapIpcHandler(async (event, data) => categories.create(data)));
    ipcMain.handle('categories:update', wrapIpcHandler(async (event, id, data) => categories.update(id, data)));
    ipcMain.handle('categories:delete', wrapIpcHandler(async (event, id) => categories.delete(id)));

    ipcMain.handle('uom:get-all', wrapIpcHandler(async () => uom.list({})));
    ipcMain.handle('uom:get-by-id', wrapIpcHandler(async (event, id) => uom.get(id)));
    ipcMain.handle('uom:search', wrapIpcHandler(async () => uom.list({})));
    ipcMain.handle('uom:create', wrapIpcHandler(async (event, data) => uom.create(data)));
    ipcMain.handle('uom:update', wrapIpcHandler(async (event, id, data) => uom.update(id, data)));
    ipcMain.handle('uom:delete', wrapIpcHandler(async (event, id) => uom.delete(id)));

    ipcMain.handle('branches:get-all', wrapIpcHandler(async () => branches.list({})));
    ipcMain.handle('branches:get-active', wrapIpcHandler(async () => branches.list({})));
    ipcMain.handle('branches:get-by-id', wrapIpcHandler(async (event, id) => branches.get(id)));
    ipcMain.handle('branches:search', wrapIpcHandler(async () => branches.list({})));
    ipcMain.handle('branches:create', wrapIpcHandler(async (event, data) => branches.create(data)));
    ipcMain.handle('branches:update', wrapIpcHandler(async (event, id, data) => branches.update(id, data)));
    ipcMain.handle('branches:delete', wrapIpcHandler(async (event, id) => branches.delete(id)));

    ipcMain.handle('suppliers:get-all', wrapIpcHandler(async () => suppliers.list({})));
    ipcMain.handle('suppliers:get-active', wrapIpcHandler(async () => suppliers.list({})));
    ipcMain.handle('suppliers:get-by-id', wrapIpcHandler(async (event, id) => suppliers.get(id)));
    ipcMain.handle('suppliers:search', wrapIpcHandler(async () => suppliers.list({})));
    ipcMain.handle('suppliers:create', wrapIpcHandler(async (event, data) => suppliers.create(data)));
    ipcMain.handle('suppliers:update', wrapIpcHandler(async (event, id, data) => suppliers.update(id, data)));
    ipcMain.handle('suppliers:delete', wrapIpcHandler(async (event, id) => suppliers.delete(id)));
    ipcMain.handle('suppliers:update-amounts', wrapIpcHandler(async (event, id, currentAmount, previousAmount) => suppliers.update(id, { current_amount: currentAmount, previous_amount: previousAmount })));

    ipcMain.handle('items:get-all', wrapIpcHandler(async () => items.list({})));
    ipcMain.handle('items:get-all-extended', wrapIpcHandler(async () => items.list({})));
    ipcMain.handle('items:get-by-id', wrapIpcHandler(async (event, id) => items.get(id)));
    ipcMain.handle('items:get-by-id-extended', wrapIpcHandler(async (event, id) => items.get(id)));
    ipcMain.handle('items:get-by-sku', wrapIpcHandler(async (event, sku) => items.list({ sku })));
    ipcMain.handle('items:search', wrapIpcHandler(async () => items.list({})));
    ipcMain.handle('items:create', wrapIpcHandler(async (event, data) => items.create(data)));
    ipcMain.handle('items:update', wrapIpcHandler(async (event, id, data) => items.update(id, data)));
    ipcMain.handle('items:delete', wrapIpcHandler(async (event, id) => items.delete(id)));

    ipcMain.handle('stock:get-all', wrapIpcHandler(async () => stock.list({})));
    ipcMain.handle('stock:get-all-with-items', wrapIpcHandler(async () => stock.list({})));
    ipcMain.handle('stock:get-by-id', wrapIpcHandler(async (event, id) => stock.get(id)));
    ipcMain.handle('stock:get-by-sku', wrapIpcHandler(async (event, sku) => stock.list({ sku })));
    ipcMain.handle('stock:get-low-stock', wrapIpcHandler(async () => stock.list({})));
    ipcMain.handle('stock:get-expiring', wrapIpcHandler(async () => stock.list({})));
    ipcMain.handle('stock:get-value', wrapIpcHandler(async () => stock.list({})));
    ipcMain.handle('stock:upsert', wrapIpcHandler(async (event, data) => stock.create(data)));
    ipcMain.handle('stock:update-quantity', wrapIpcHandler(async (event, id, quantity) => stock.update(id, { quantity })));
    ipcMain.handle('stock:update-prices', wrapIpcHandler(async (event, id, stockPrice, retailPrice, changedBy, reason) => stock.update(id, { stock_price: stockPrice, retail_price: retailPrice, changedBy, reason })));
    ipcMain.handle('stock:delete', wrapIpcHandler(async (event, id) => stock.delete(id)));

    ipcMain.handle('restocks:get-all', wrapIpcHandler(async (event, options) => restocks.list(options || {})));
    ipcMain.handle('restocks:get-by-id', wrapIpcHandler(async (event, id) => restocks.get(id)));
    ipcMain.handle('restocks:get-by-invoice', wrapIpcHandler(async (event, invoiceNo) => restocks.list({ invoiceNo, invoice_no: invoiceNo })));
    ipcMain.handle('restocks:get-by-supplier', wrapIpcHandler(async (event, supplierId) => restocks.list({ supplierId, supplier_id: supplierId })));
    ipcMain.handle('restocks:get-by-date-range', wrapIpcHandler(async () => restocks.list({})));
    ipcMain.handle('restocks:get-stock-data', wrapIpcHandler(async (event, sku) => stock.list({ sku })));
    ipcMain.handle('restocks:get-stock-items', wrapIpcHandler(async () => stock.list({})));
    ipcMain.handle('restocks:create', wrapIpcHandler(async (event, data) => restocks.create(data)));
    ipcMain.handle('restocks:get-summary', wrapIpcHandler(async () => restocks.list({})));

    ipcMain.handle('members:get-all', wrapIpcHandler(async () => members.list({})));
    ipcMain.handle('members:get-active', wrapIpcHandler(async () => members.list({})));
    ipcMain.handle('members:get-by-id', wrapIpcHandler(async (event, id) => members.get(id)));
    ipcMain.handle('members:get-by-member-no', wrapIpcHandler(async (event, memberNo) => members.list({ memberNo, member_no: memberNo })));
    ipcMain.handle('members:get-with-transactions', wrapIpcHandler(async (event, id) => members.get(id)));
    ipcMain.handle('members:search', wrapIpcHandler(async () => members.list({})));
    ipcMain.handle('members:create', wrapIpcHandler(async (event, data) => members.create(data)));
    ipcMain.handle('members:update', wrapIpcHandler(async (event, id, data) => members.update(id, data)));
    ipcMain.handle('members:delete', wrapIpcHandler(async (event, id) => members.delete(id)));
    ipcMain.handle('members:get-top', wrapIpcHandler(async () => members.list({})));
    ipcMain.handle('members:get-debtors', wrapIpcHandler(async () => members.list({})));

    ipcMain.handle('offers:get-all', wrapIpcHandler(async () => offers.list({})));
    ipcMain.handle('offers:get-active', wrapIpcHandler(async () => offers.list({})));
    ipcMain.handle('offers:create', wrapIpcHandler(async (event, data) => offers.create(data)));
    ipcMain.handle('offers:update', wrapIpcHandler(async (event, id, data) => offers.update(id, data)));
    ipcMain.handle('offers:delete', wrapIpcHandler(async (event, id) => offers.delete(id)));
    ipcMain.handle('offers:toggle-active', wrapIpcHandler(async (event, id) => offers.update(id, {})));

    ipcMain.handle('disposed:get-all', wrapIpcHandler(async () => disposed.list({})));
    ipcMain.handle('disposed:create', wrapIpcHandler(async (event, data) => disposed.create(data)));
    ipcMain.handle('disposed:get-by-date-range', wrapIpcHandler(async () => disposed.list({})));

    ipcMain.handle('sales:get-all', wrapIpcHandler(async (event, options) => service.list('sales', options || {})));
    ipcMain.handle('sales:get-by-id', wrapIpcHandler(async (event, id) => service.get('sales', id)));
    ipcMain.handle('sales:get-by-invoice', wrapIpcHandler(async (event, invoiceNo) => service.list('sales', { invoiceNo, invoice_no: invoiceNo })));
    ipcMain.handle('sales:get-by-member', wrapIpcHandler(async (event, memberId) => service.list('sales', { memberId, member_id: memberId })));
    ipcMain.handle('sales:get-by-date-range', wrapIpcHandler(async () => service.list('sales', {})));
    ipcMain.handle('sales:get-held-orders', wrapIpcHandler(async () => service.list('sales', { status: 'held' })));
    ipcMain.handle('sales:create', wrapIpcHandler(async (event, data) => service.createSale(data || {})));
    ipcMain.handle('sales:hold', wrapIpcHandler(async (event, data) => service.createSale({ ...(data || {}), is_held: true, isHeld: true })));

    ipcMain.handle('payment-methods:get-all', wrapIpcHandler(async () => paymentMethods.list({})));
    ipcMain.handle('payment-methods:get-active', wrapIpcHandler(async () => paymentMethods.list({})));
    ipcMain.handle('payment-methods:get-for-members', wrapIpcHandler(async () => paymentMethods.list({})));
    ipcMain.handle('payment-methods:get-for-non-members', wrapIpcHandler(async () => paymentMethods.list({})));
    ipcMain.handle('payment-methods:get-by-id', wrapIpcHandler(async (event, id) => paymentMethods.get(id)));
    ipcMain.handle('payment-methods:search', wrapIpcHandler(async () => paymentMethods.list({})));
    ipcMain.handle('payment-methods:create', wrapIpcHandler(async (event, data) => paymentMethods.create(data)));
    ipcMain.handle('payment-methods:update', wrapIpcHandler(async (event, id, data) => paymentMethods.update(id, data)));
    ipcMain.handle('payment-methods:toggle-active', wrapIpcHandler(async (event, id) => paymentMethods.update(id, {})));
    ipcMain.handle('payment-methods:delete', wrapIpcHandler(async (event, id) => paymentMethods.delete(id)));

    ipcMain.handle('loginHistory:getAll', wrapIpcHandler(async (event, options) => loginHistory.list(options || {})));
    ipcMain.handle('loginHistory:getByUser', wrapIpcHandler(async (event, userId) => loginHistory.list({ userId, user_id: userId })));
    ipcMain.handle('loginHistory:getByDateRange', wrapIpcHandler(async () => loginHistory.list({})));
    ipcMain.handle('loginHistory:getUserStats', wrapIpcHandler(async () => loginHistory.list({})));
    ipcMain.handle('loginHistory:getDailyStats', wrapIpcHandler(async () => loginHistory.list({})));
    ipcMain.handle('loginHistory:getUserActivitySummary', wrapIpcHandler(async () => loginHistory.list({})));
    ipcMain.handle('loginHistory:getActiveSessions', wrapIpcHandler(async () => service.getActiveSessions()));
    ipcMain.handle('loginHistory:markStaleSessions', wrapIpcHandler(async () => ({ status: 'success', data: { onlineOnly: true } })));

    ipcMain.handle('teacoop:initialize', wrapIpcHandler(async () => ({ status: 'success', data: { onlineOnly: true } })));
    ipcMain.handle('teacoop:members:getAll', wrapIpcHandler(async () => teaCoopMembers.list({})));
    ipcMain.handle('teacoop:members:getById', wrapIpcHandler(async (event, memberId) => teaCoopMembers.get(memberId)));
    ipcMain.handle('teacoop:members:search', wrapIpcHandler(async (event, searchTerm) => teaCoopMembers.list({ search: searchTerm })));
    ipcMain.handle('teacoop:payments:getHistory', wrapIpcHandler(async (event, payload) => {
        const memberId = payload?.memberId || payload?.member_id || payload;
        return teaCoopPayments.list({ memberId, member_id: memberId });
    }));
    ipcMain.handle('teacoop:sync:members', wrapIpcHandler(async () => service.syncTeaCoop({})));
    ipcMain.handle('teacoop:sync:payments', wrapIpcHandler(async (event, payload) => {
        const memberId = payload?.memberId || payload?.member_id || null;
        return service.syncTeaCoopPayments(memberId, payload?.options || payload || {});
    }));
    ipcMain.handle('teacoop:members:refresh', wrapIpcHandler(async (event, memberId) => teaCoopMembers.get(memberId)));
    ipcMain.handle('teacoop:status', wrapIpcHandler(async () => service.getTeaCoopStatus()));

    console.log('[OnlineController] Online-only IPC handlers registered');
}

module.exports = { registerHandlers };
