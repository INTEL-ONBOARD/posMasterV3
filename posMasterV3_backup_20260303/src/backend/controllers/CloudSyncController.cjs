/**
 * Cloud Sync Controller
 *
 * Handles IPC communication for cloud synchronization operations.
 */

const { ipcMain } = require('electron');
const { getCloudSyncService } = require('../services/CloudSyncService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class CloudSyncController {
    constructor() {
        this.service = null;
    }

    /**
     * Register all IPC handlers for cloud sync
     */
    registerHandlers() {
        // Get sync status
        ipcMain.handle('cloudSync:getStatus', wrapIpcHandler(async () => {
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
        }));

        // Trigger manual sync
        ipcMain.handle('cloudSync:syncNow', wrapIpcHandler(async () => {
            try {
                const service = getCloudSyncService();

                // Auto-initialize if not yet online (e.g., cloud sync disabled on startup)
                if (!service.isOnline || !service.mysqlInitialized) {
                    console.log('[CloudSyncController] Service not initialized, initializing before sync...');
                    await service.initialize();
                }

                const result = await service.syncNow();

                // Surface "skipped" as a meaningful error instead of false success
                if (result?.status === 'skipped') {
                    const reason = result.reason || 'unknown';
                    const messages = {
                        'offline': 'Cannot sync: not connected to cloud database. Check your network or enable cloud sync in settings.',
                        'already_syncing': 'Sync already in progress, please wait.',
                        'lock_timeout': 'Sync could not start (lock timeout). Please try again.',
                        'connection_failed': 'Cannot sync: cloud database connection failed.'
                    };
                    return {
                        status: 'error',
                        message: messages[reason] || `Sync skipped: ${reason}`
                    };
                }

                return {
                    status: 'success',
                    data: result
                };
            } catch (error) {
                console.error('[CloudSyncController] Sync now error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Enable/disable auto-sync
        ipcMain.handle('cloudSync:setAutoSync', wrapIpcHandler(async (event, enabled) => {
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
        }));

        // Check network status
        ipcMain.handle('cloudSync:checkNetwork', wrapIpcHandler(async () => {
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
        }));

        // Pull users from cloud (cloud is the primary source for users)
        ipcMain.handle('cloudSync:pullUsers', wrapIpcHandler(async () => {
            try {
                const service = getCloudSyncService();
                const result = await service.pullUsers();
                return {
                    status: 'success',
                    data: result
                };
            } catch (error) {
                console.error('[CloudSyncController] Pull users error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Push a user to cloud
        ipcMain.handle('cloudSync:pushUser', wrapIpcHandler(async (event, user) => {
            try {
                const service = getCloudSyncService();
                const result = await service.pushUser(user);
                return {
                    status: 'success',
                    data: result
                };
            } catch (error) {
                console.error('[CloudSyncController] Push user error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Force ensure MySQL schema (creates tables if they don't exist)
        ipcMain.handle('cloudSync:ensureSchema', wrapIpcHandler(async () => {
            try {
                const service = getCloudSyncService();
                const result = await service.ensureMySQLSchema();
                return {
                    status: result.success ? 'success' : 'error',
                    data: result
                };
            } catch (error) {
                console.error('[CloudSyncController] Ensure schema error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Initialize MySQL manually (useful for reconnection)
        ipcMain.handle('cloudSync:initializeMySQL', wrapIpcHandler(async () => {
            try {
                const service = getCloudSyncService();
                const initialized = await service.initializeMySQL();
                return {
                    status: initialized ? 'success' : 'error',
                    data: { initialized }
                };
            } catch (error) {
                console.error('[CloudSyncController] Initialize MySQL error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Force full sync immediately (for real-time requirements)
        ipcMain.handle('cloudSync:forceFullSync', wrapIpcHandler(async () => {
            try {
                const service = getCloudSyncService();
                console.log('[CloudSyncController] Force full sync requested');
                const result = await service.performFullSync({ force: true });
                return {
                    status: 'success',
                    data: result
                };
            } catch (error) {
                console.error('[CloudSyncController] Force full sync error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Force sync active_sessions immediately (for single-device enforcement)
        ipcMain.handle('cloudSync:syncActiveSessions', wrapIpcHandler(async () => {
            try {
                const service = getCloudSyncService();
                console.log('[CloudSyncController] Syncing active_sessions immediately');

                // Pull active_sessions from cloud first
                const pullResult = await service.pullFromCloud('active_sessions');

                // Then push local active_sessions to cloud
                const pushResult = await service.syncTable('active_sessions');

                // Clear session cache to force revalidation
                const { clearCache } = require('../services/SessionValidator.cjs');
                clearCache();

                return {
                    status: 'success',
                    data: {
                        pulled: pullResult.downloaded || 0,
                        pushed: pushResult.uploaded || 0
                    }
                };
            } catch (error) {
                console.error('[CloudSyncController] Sync active sessions error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Get real-time sync status
        ipcMain.handle('cloudSync:getRealTimeStatus', wrapIpcHandler(async () => {
            try {
                const { getRealTimeSyncService } = require('../services/RealTimeSyncService.cjs');
                const realTimeSync = getRealTimeSyncService();
                return {
                    status: 'success',
                    data: realTimeSync.getStatus()
                };
            } catch (error) {
                console.error('[CloudSyncController] Get real-time status error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        console.log('[CloudSyncController] IPC handlers registered');
    }
}

module.exports = CloudSyncController;
