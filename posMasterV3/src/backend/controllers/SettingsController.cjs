/**
 * Settings Controller
 *
 * Handles IPC communication for user settings and app settings.
 */

const { ipcMain } = require('electron');
const SettingsService = require('../services/SettingsService.cjs');

class SettingsController {
    constructor() {
        this.service = new SettingsService();
    }

    /**
     * Register all IPC handlers for settings
     */
    registerHandlers() {
        // ============================================
        // USER SETTINGS HANDLERS
        // ============================================

        // Get user settings
        ipcMain.handle('settings:get-user-settings', async (event, userId) => {
            try {
                return this.service.getUserSettings(userId);
            } catch (error) {
                console.error('[SettingsController] Get user settings error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get current user with settings
        ipcMain.handle('settings:get-current-user-with-settings', async (event, userId) => {
            try {
                return this.service.getCurrentUserWithSettings(userId);
            } catch (error) {
                console.error('[SettingsController] Get current user error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Update user profile
        ipcMain.handle('settings:update-user-profile', async (event, { userId, profileData }) => {
            try {
                return this.service.updateUserProfile(userId, profileData);
            } catch (error) {
                console.error('[SettingsController] Update profile error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Update user permissions
        ipcMain.handle('settings:update-user-permissions', async (event, { userId, permissions }) => {
            try {
                return this.service.updateUserPermissions(userId, permissions);
            } catch (error) {
                console.error('[SettingsController] Update permissions error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Update profile image
        ipcMain.handle('settings:update-profile-image', async (event, { userId, profileImage }) => {
            try {
                return this.service.updateProfileImage(userId, profileImage);
            } catch (error) {
                console.error('[SettingsController] Update profile image error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // ============================================
        // APP SETTINGS HANDLERS
        // ============================================

        // Get all app settings
        ipcMain.handle('settings:get-app-settings', async () => {
            try {
                return this.service.getAppSettings();
            } catch (error) {
                console.error('[SettingsController] Get app settings error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get a single app setting
        ipcMain.handle('settings:get-app-setting', async (event, key) => {
            try {
                return this.service.getAppSetting(key);
            } catch (error) {
                console.error('[SettingsController] Get app setting error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Update app settings (multiple)
        ipcMain.handle('settings:update-app-settings', async (event, settings) => {
            try {
                return this.service.updateAppSettings(settings);
            } catch (error) {
                console.error('[SettingsController] Update app settings error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Update a single app setting
        ipcMain.handle('settings:update-app-setting', async (event, { key, value }) => {
            try {
                return this.service.updateAppSetting(key, value);
            } catch (error) {
                console.error('[SettingsController] Update app setting error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Reset app settings to defaults
        ipcMain.handle('settings:reset-app-settings', async () => {
            try {
                return this.service.resetAppSettings();
            } catch (error) {
                console.error('[SettingsController] Reset app settings error:', error);
                return { status: 'error', message: error.message };
            }
        });

        console.log('[SettingsController] IPC handlers registered');
    }
}

module.exports = SettingsController;
