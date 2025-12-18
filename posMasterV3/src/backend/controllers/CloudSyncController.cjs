/**
 * Cloud Sync Controller
 *
 * Handles IPC communication for cloud synchronization operations.
 */

const { ipcMain } = require('electron');
const { getCloudSyncService } = require('../services/CloudSyncService.cjs');

class CloudSyncController {
    constructor() {
        this.service = null;
    }

    /**
     * Register all IPC handlers for cloud sync
     */
    registerHandlers() {
        // Get sync status
        ipcMain.handle('cloudSync:getStatus', async () => {
            try {
                const service = getCloudSyncService();
                return {
                    status: 'success',
                    data: service.getStatus()
                };
            } catch (error) {
                console.error('[CloudSyncController] Get status error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Trigger manual sync
        ipcMain.handle('cloudSync:syncNow', async () => {
            try {
                const service = getCloudSyncService();
                const result = await service.syncNow();
                return {
                    status: 'success',
                    data: result
                };
            } catch (error) {
                console.error('[CloudSyncController] Sync now error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Enable/disable auto-sync
        ipcMain.handle('cloudSync:setAutoSync', async (event, enabled) => {
            try {
                const service = getCloudSyncService();
                service.setAutoSync(enabled);
                return {
                    status: 'success',
                    data: { autoSyncEnabled: enabled }
                };
            } catch (error) {
                console.error('[CloudSyncController] Set auto sync error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Check network status
        ipcMain.handle('cloudSync:checkNetwork', async () => {
            try {
                const service = getCloudSyncService();
                const isOnline = await service.checkNetworkStatus();
                return {
                    status: 'success',
                    data: { isOnline }
                };
            } catch (error) {
                console.error('[CloudSyncController] Check network error:', error);
                return { status: 'error', message: error.message };
            }
        });

        console.log('[CloudSyncController] IPC handlers registered');
    }
}

module.exports = CloudSyncController;
