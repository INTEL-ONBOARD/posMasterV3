/**
 * Tea Coop Controller
 *
 * Handles IPC communication for Tea Coop member and payment operations.
 */

const { ipcMain } = require('electron');
const { getTeaCoopService } = require('../services/TeaCoopService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class TeaCoopController {
    constructor() {
        this.service = null;
    }

    /**
     * Get service instance (lazy initialization)
     */
    getService() {
        if (!this.service) {
            this.service = getTeaCoopService();
        }
        return this.service;
    }

    /**
     * Register all IPC handlers
     */
    registerHandlers() {
        // Initialize service
        ipcMain.handle('teacoop:initialize', wrapIpcHandler(async () => {
            try {
                const service = this.getService();
                await service.initialize();
                return { status: 'success', message: 'TeaCoop service initialized' };
            } catch (error) {
                console.error('[TeaCoopController] Initialize error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Get all members
        ipcMain.handle('teacoop:members:getAll', wrapIpcHandler(async () => {
            try {
                const service = this.getService();
                return service.getAllMembers();
            } catch (error) {
                console.error('[TeaCoopController] Get all members error:', error);
                return { status: 'error', message: error.message, data: [] };
            }
        }));

        // Get member by ID
        ipcMain.handle('teacoop:members:getById', wrapIpcHandler(async (event, memberId) => {
            try {
                const service = this.getService();
                return service.getMemberById(memberId);
            } catch (error) {
                console.error('[TeaCoopController] Get member error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Search members
        ipcMain.handle('teacoop:members:search', wrapIpcHandler(async (event, searchTerm) => {
            try {
                const service = this.getService();
                return service.searchMembers(searchTerm);
            } catch (error) {
                console.error('[TeaCoopController] Search error:', error);
                return { status: 'error', message: error.message, data: [] };
            }
        }));

        // Get payment history (fetches from API first, then returns from local DB)
        ipcMain.handle('teacoop:payments:getHistory', wrapIpcHandler(async (event, { memberId, months = 6 }) => {
            try {
                const service = this.getService();
                return await service.getPaymentHistory(memberId, months);
            } catch (error) {
                console.error('[TeaCoopController] Get payment history error:', error);
                return { status: 'error', message: error.message, data: [] };
            }
        }));

        // Sync members from API
        ipcMain.handle('teacoop:sync:members', wrapIpcHandler(async () => {
            try {
                const service = this.getService();
                const result = await service.syncMembersFromApi();
                return {
                    status: result.success ? 'success' : 'error',
                    data: result
                };
            } catch (error) {
                console.error('[TeaCoopController] Sync members error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Sync payments for a member
        ipcMain.handle('teacoop:sync:payments', wrapIpcHandler(async (event, { memberId, options = {} }) => {
            try {
                const service = this.getService();
                const result = await service.syncMemberPayments(memberId, options);
                return {
                    status: result.success ? 'success' : 'error',
                    data: result
                };
            } catch (error) {
                console.error('[TeaCoopController] Sync payments error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Refresh member data (force fetch from API)
        ipcMain.handle('teacoop:members:refresh', wrapIpcHandler(async (event, memberId) => {
            try {
                const service = this.getService();
                return await service.refreshMemberData(memberId);
            } catch (error) {
                console.error('[TeaCoopController] Refresh member error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Get sync status
        ipcMain.handle('teacoop:status', wrapIpcHandler(async () => {
            try {
                const service = this.getService();
                return {
                    status: 'success',
                    data: service.getStatus()
                };
            } catch (error) {
                console.error('[TeaCoopController] Get status error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        console.log('[TeaCoopController] IPC handlers registered');
    }
}

module.exports = TeaCoopController;
