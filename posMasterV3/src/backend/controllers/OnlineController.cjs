const { ipcMain } = require('electron');
const { getOnlineModeService } = require('../services/OnlineModeService.cjs');
const { wrapIpcHandler, successResponse } = require('../utils/helpers.cjs');

function registerHandlers() {
    const service = getOnlineModeService();

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

    ipcMain.handle('online:validate-session', wrapIpcHandler(async () => {
        return service.validateSession();
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

    ipcMain.handle('online:sales:invoice-no', wrapIpcHandler(async (event, payload) => {
        return service.generateInvoiceNo(payload?.type || 'SALE');
    }));

    ipcMain.handle('online:sales:get-summary', wrapIpcHandler(async (event, payload) => {
        return service.getSalesSummary(payload?.startDate, payload?.endDate);
    }));

    ipcMain.handle('online:sales:get-daily', wrapIpcHandler(async (event, payload) => {
        return service.getSalesDaily(payload?.days || 30);
    }));

    ipcMain.handle('online:login-history:get-active-sessions', wrapIpcHandler(async () => {
        return service.getActiveSessions();
    }));

    ipcMain.handle('online:login-history:count-active-sessions', wrapIpcHandler(async () => {
        return service.countActiveSessions();
    }));

    console.log('[OnlineController] Online-only IPC handlers registered');
}

module.exports = { registerHandlers };
