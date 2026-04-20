/**
 * App Settings Controller
 *
 * Handles IPC communication for app-wide settings.
 * Manages settings that affect system behavior like auto-logout, notifications, etc.
 */

const { ipcMain, BrowserWindow } = require('electron');
const { getAppSettingsService } = require('../services/AppSettingsService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class AppSettingsController {
    constructor() {
        this.service = null;
    }

    /**
     * Register all IPC handlers for app settings
     */
    registerHandlers() {
        this.service = getAppSettingsService();

        // Get all app settings with their applied status
        ipcMain.handle('appSettings:getAll', wrapIpcHandler(async () => {
            try {
                const settings = this.service.getAllSettings();
                const isRunOnStartup = await this.service.isRunOnStartupEnabled();

                return {
                    status: 'success',
                    data: {
                        ...settings,
                        _applied: {
                            run_on_startup_system: isRunOnStartup
                        }
                    }
                };
            } catch (error) {
                console.error('[AppSettingsController] Get all error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Set logout on close configuration
        ipcMain.handle('appSettings:setLogoutOnClose', wrapIpcHandler(async (event, enabled) => {
            try {
                this.service.setLogoutOnClose(enabled);
                return {
                    status: 'success',
                    message: enabled ? 'Logout on close enabled' : 'Logout on close disabled'
                };
            } catch (error) {
                console.error('[AppSettingsController] Set logout on close error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Set run on startup
        ipcMain.handle('appSettings:setRunOnStartup', wrapIpcHandler(async (event, enabled) => {
            try {
                const result = await this.service.setRunOnStartup(enabled);
                return {
                    status: result.success ? 'success' : 'error',
                    message: result.message
                };
            } catch (error) {
                console.error('[AppSettingsController] Set run on startup error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Set maximize on start
        ipcMain.handle('appSettings:setMaximizeOnStart', wrapIpcHandler(async (event, enabled) => {
            try {
                this.service.setMaximizeOnStart(enabled);
                return {
                    status: 'success',
                    message: enabled ? 'App will maximize on start' : 'App will not maximize on start'
                };
            } catch (error) {
                console.error('[AppSettingsController] Set maximize error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Set notifications enabled
        ipcMain.handle('appSettings:setNotifications', wrapIpcHandler(async (event, enabled) => {
            try {
                this.service.setNotificationsEnabled(enabled);
                return {
                    status: 'success',
                    message: enabled ? 'Notifications enabled' : 'Notifications disabled'
                };
            } catch (error) {
                console.error('[AppSettingsController] Set notifications error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Set cloud sync enabled
        ipcMain.handle('appSettings:setCloudSync', wrapIpcHandler(async (event, enabled) => {
            try {
                this.service.setCloudSyncEnabled(enabled);

                const { getCloudSyncService, initializeCloudSync } = require('../services/CloudSyncService.cjs');
                const cloudSync = getCloudSyncService();

                if (enabled) {
                    // Enable cloud sync - initialize and start auto-sync
                    console.log('[AppSettingsController] Enabling cloud sync...');
                    cloudSync.setAutoSync(true);
                    await cloudSync.initialize();
                    console.log('[AppSettingsController] Cloud sync enabled and started');
                } else {
                    // Disable cloud sync - stop auto-sync (but don't cleanup, so pending changes are preserved)
                    console.log('[AppSettingsController] Disabling cloud sync...');
                    cloudSync.setAutoSync(false);
                    console.log('[AppSettingsController] Cloud sync disabled');
                }

                return {
                    status: 'success',
                    message: enabled ? 'Cloud sync enabled' : 'Cloud sync disabled'
                };
            } catch (error) {
                console.error('[AppSettingsController] Set cloud sync error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Send test notification
        ipcMain.handle('appSettings:testNotification', wrapIpcHandler(async () => {
            try {
                this.service.sendNotification(
                    'POS Master',
                    'Test notification - System notifications are working!',
                    { silent: false }
                );
                return { status: 'success', message: 'Test notification sent' };
            } catch (error) {
                console.error('[AppSettingsController] Test notification error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Apply all settings (called after login)
        ipcMain.handle('appSettings:applyAll', wrapIpcHandler(async () => {
            try {
                const mainWindow = BrowserWindow.getAllWindows()[0];
                const settings = await this.service.applyAllSettings({
                    mainWindow
                });

                return {
                    status: 'success',
                    data: settings,
                    message: 'Settings applied'
                };
            } catch (error) {
                console.error('[AppSettingsController] Apply all error:', error);
                return { status: 'error', message: error.message };
            }
        }));

        // Check if cloud sync should be enabled
        ipcMain.handle('appSettings:isCloudSyncEnabled', wrapIpcHandler(async () => {
            try {
                const enabled = this.service.isCloudSyncEnabled();
                return { status: 'success', data: { enabled } };
            } catch (error) {
                return { status: 'error', message: error.message };
            }
        }));

        console.log('[AppSettingsController] IPC handlers registered');
    }
}

module.exports = AppSettingsController;
