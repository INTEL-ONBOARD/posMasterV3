/**
 * Sync Controller
 *
 * Handles IPC communication for synchronization operations.
 */

const { getSyncService } = require('../services/index.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');
const { broadcastSyncStatus } = require('../utils/eventBroadcaster.cjs');

// Lazy load ipcMain to ensure electron is ready
let _ipcMain = null;
function getIpcMain() {
    if (!_ipcMain) {
        _ipcMain = require('electron').ipcMain;
    }
    return _ipcMain;
}

/**
 * Register all sync IPC handlers
 */
function registerSyncHandlers() {
    const ipcMain = getIpcMain();
    const syncService = getSyncService();

    /**
     * Get sync status
     * Channel: 'sync:status'
     * Payload: none
     * Response: { isOnline: boolean, isSyncing: boolean, queue: Object }
     */
    ipcMain.handle('sync:status', wrapIpcHandler(async (event) => {
        try {
            return syncService.getSyncStatus();

        } catch (error) {
            console.error('[SyncController] Get status error:', error.message);
            return {
                success: false,
                message: 'Failed to get sync status: ' + error.message
            };
        }
    }));

    /**
     * Check connectivity to cloud
     * Channel: 'sync:check-connectivity'
     * Payload: none
     * Response: { online: boolean }
     */
    ipcMain.handle('sync:check-connectivity', wrapIpcHandler(async (event) => {
        try {
            const online = await syncService.checkConnectivity();
            return { online };

        } catch (error) {
            console.error('[SyncController] Check connectivity error:', error.message);
            return { online: false };
        }
    }));

    /**
     * Process sync queue (pull from cloud first, then push to cloud)
     * Channel: 'sync:process-queue'
     * Payload: { token?: string }
     * Response: { success: boolean, pulled: number, processed: number, succeeded: number, failed: number }
     */
    ipcMain.handle('sync:process-queue', wrapIpcHandler(async (event, payload = {}) => {
        console.log('[SyncController] Process queue request received');

        try {
            const { token } = payload;
            const result = await syncService.processSyncQueue(token);

            // Emit status update to all renderer windows after sync completes
            const status = syncService.getSyncStatus();
            broadcastSyncStatus({
                isOnline: status.isOnline,
                isSyncing: status.isSyncing,
                pendingCount: status.queue?.pending ?? 0,
                lastSyncTime: new Date().toISOString()
            });

            return result;

        } catch (error) {
            console.error('[SyncController] Process queue error:', error.message);
            return {
                success: false,
                message: 'Sync failed: ' + error.message
            };
        }
    }));

    /**
     * Pull data from cloud
     * Channel: 'sync:pull'
     * Payload: { entityType: string, token?: string }
     * Response: { success: boolean, updated: number, imported: number }
     */
    ipcMain.handle('sync:pull', wrapIpcHandler(async (event, payload) => {
        console.log('[SyncController] Pull request received');

        try {
            const { entityType, token } = payload;
            const result = await syncService.pullFromCloud(entityType, token);

            // Emit status update to all renderer windows after pull completes
            const status = syncService.getSyncStatus();
            broadcastSyncStatus({
                isOnline: status.isOnline,
                isSyncing: status.isSyncing,
                pendingCount: status.queue?.pending ?? 0,
                lastSyncTime: new Date().toISOString()
            });

            return result;

        } catch (error) {
            console.error('[SyncController] Pull error:', error.message);
            return {
                success: false,
                message: 'Pull failed: ' + error.message
            };
        }
    }));

    /**
     * Retry failed sync items
     * Channel: 'sync:retry-failed'
     * Payload: none
     * Response: { success: boolean, message: string }
     */
    ipcMain.handle('sync:retry-failed', wrapIpcHandler(async (event) => {
        try {
            const result = syncService.retryFailed();

            // Emit status update to all renderer windows after retry completes
            const status = syncService.getSyncStatus();
            broadcastSyncStatus({
                isOnline: status.isOnline,
                isSyncing: status.isSyncing,
                pendingCount: status.queue?.pending ?? 0,
                lastSyncTime: new Date().toISOString()
            });

            return result;

        } catch (error) {
            console.error('[SyncController] Retry failed error:', error.message);
            return {
                success: false,
                message: 'Retry failed: ' + error.message
            };
        }
    }));

    /**
     * Clean up old sync items
     * Channel: 'sync:cleanup'
     * Payload: { daysOld?: number }
     * Response: { success: boolean, message: string }
     */
    ipcMain.handle('sync:cleanup', wrapIpcHandler(async (event, payload = {}) => {
        try {
            const { daysOld = 7 } = payload;
            return syncService.cleanup(daysOld);

        } catch (error) {
            console.error('[SyncController] Cleanup error:', error.message);
            return {
                success: false,
                message: 'Cleanup failed: ' + error.message
            };
        }
    }));

    /**
     * Set cloud URL
     * Channel: 'sync:set-cloud-url'
     * Payload: { url: string }
     * Response: { success: boolean }
     */
    ipcMain.handle('sync:set-cloud-url', wrapIpcHandler(async (event, payload) => {
        try {
            const { url } = payload;
            syncService.setCloudUrl(url);
            return { success: true };

        } catch (error) {
            console.error('[SyncController] Set cloud URL error:', error.message);
            return {
                success: false,
                message: 'Failed to set cloud URL: ' + error.message
            };
        }
    }));

    console.log('[SyncController] Sync handlers registered');
}

/**
 * Unregister all sync IPC handlers
 */
function unregisterSyncHandlers() {
    const ipcMain = getIpcMain();
    const channels = [
        'sync:status',
        'sync:check-connectivity',
        'sync:process-queue',
        'sync:pull',
        'sync:retry-failed',
        'sync:cleanup',
        'sync:set-cloud-url'
    ];

    channels.forEach(channel => {
        ipcMain.removeHandler(channel);
    });

    console.log('[SyncController] Sync handlers unregistered');
}

module.exports = {
    registerSyncHandlers,
    unregisterSyncHandlers
};
