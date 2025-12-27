/**
 * App Settings Service
 *
 * Manages application-wide settings that affect system behavior.
 * Handles reading, applying, and syncing app settings.
 */

const { AppSettingsRepository } = require('../repositories/SettingsRepository.cjs');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Auto-launch package for Windows startup
let AutoLaunch;
try {
    AutoLaunch = require('auto-launch');
} catch (e) {
    console.warn('[AppSettingsService] auto-launch package not available');
}

class AppSettingsService {
    constructor() {
        this.appSettingsRepo = new AppSettingsRepository();
        this.autoLauncher = null;
        this.inactivityTimer = null;
        this.inactivityTimeoutMs = 15 * 60 * 1000; // 15 minutes default
        this.onAutoLogoutCallback = null;

        // Initialize auto-launcher if available
        this._initAutoLauncher();
    }

    /**
     * Initialize the auto-launcher for Windows startup
     * @private
     */
    _initAutoLauncher() {
        if (!AutoLaunch) return;

        try {
            const appName = app?.getName() || 'POS Master';
            const appPath = app?.getPath('exe') || process.execPath;

            this.autoLauncher = new AutoLaunch({
                name: appName,
                path: appPath,
                isHidden: false
            });
        } catch (error) {
            console.error('[AppSettingsService] Failed to initialize auto-launcher:', error.message);
        }
    }

    // ============================================
    // SETTINGS RETRIEVAL
    // ============================================

    /**
     * Get all app settings
     * @returns {Object} All settings as key-value pairs
     */
    getAllSettings() {
        try {
            return this.appSettingsRepo.getAllAsObject();
        } catch (error) {
            console.error('[AppSettingsService] Get all settings error:', error);
            return this._getDefaults();
        }
    }

    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @returns {any} Setting value
     */
    getSetting(key) {
        try {
            return this.appSettingsRepo.get(key);
        } catch (error) {
            console.error(`[AppSettingsService] Get setting '${key}' error:`, error);
            return this._getDefaults()[key];
        }
    }

    /**
     * Get default settings
     * All settings are enabled by default for new users
     * @private
     */
    _getDefaults() {
        return {
            auto_logout: true,
            auto_logout_minutes: 15,
            notifications: true,
            cloud_sync: true,
            temp_system: true,
            run_on_startup: true,
            maximize_window: true,
            temp_path: 'C:\\POS Master\\temp',
            db_config_path: 'C:\\POS Master\\config',
            default_outlet: ''
        };
    }

    // ============================================
    // AUTO LOGOUT FUNCTIONALITY
    // ============================================

    /**
     * Start auto-logout monitoring
     * @param {Function} onLogout - Callback when auto-logout triggers
     */
    startAutoLogoutMonitoring(onLogout) {
        const settings = this.getAllSettings();

        if (!settings.auto_logout) {
            console.log('[AppSettingsService] Auto-logout is disabled');
            return;
        }

        this.onAutoLogoutCallback = onLogout;
        const timeoutMinutes = settings.auto_logout_minutes || 15;
        this.inactivityTimeoutMs = timeoutMinutes * 60 * 1000;

        console.log(`[AppSettingsService] Auto-logout enabled with ${timeoutMinutes} minute timeout`);
        this.resetInactivityTimer();
    }

    /**
     * Stop auto-logout monitoring
     */
    stopAutoLogoutMonitoring() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        this.onAutoLogoutCallback = null;
        console.log('[AppSettingsService] Auto-logout monitoring stopped');
    }

    /**
     * Reset the inactivity timer (call on user activity)
     */
    resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        if (!this.onAutoLogoutCallback) return;

        this.inactivityTimer = setTimeout(() => {
            console.log('[AppSettingsService] Inactivity timeout reached, triggering auto-logout');
            if (this.onAutoLogoutCallback) {
                this.onAutoLogoutCallback();
            }
        }, this.inactivityTimeoutMs);
    }

    /**
     * Update auto-logout setting
     * @param {boolean} enabled - Whether auto-logout is enabled
     * @param {number} minutes - Timeout in minutes
     */
    updateAutoLogout(enabled, minutes = 15) {
        this.appSettingsRepo.set('auto_logout', enabled, 'boolean');
        this.appSettingsRepo.set('auto_logout_minutes', minutes, 'number');

        if (enabled && this.onAutoLogoutCallback) {
            this.inactivityTimeoutMs = minutes * 60 * 1000;
            this.resetInactivityTimer();
        } else {
            this.stopAutoLogoutMonitoring();
        }
    }

    // ============================================
    // RUN ON STARTUP FUNCTIONALITY
    // ============================================

    /**
     * Set whether app runs on Windows startup
     * @param {boolean} enabled - Whether to run on startup
     * @returns {Promise<Object>} Result
     */
    async setRunOnStartup(enabled) {
        try {
            // Save setting to database
            this.appSettingsRepo.set('run_on_startup', enabled, 'boolean');

            // Apply to system if auto-launcher is available
            if (this.autoLauncher) {
                if (enabled) {
                    await this.autoLauncher.enable();
                    console.log('[AppSettingsService] App registered to run on startup');
                } else {
                    await this.autoLauncher.disable();
                    console.log('[AppSettingsService] App unregistered from startup');
                }
            } else {
                console.warn('[AppSettingsService] Auto-launcher not available, setting saved but not applied');
            }

            return { success: true, message: enabled ? 'App will run on startup' : 'App will not run on startup' };
        } catch (error) {
            console.error('[AppSettingsService] Set run on startup error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Check if app is set to run on startup
     * @returns {Promise<boolean>}
     */
    async isRunOnStartupEnabled() {
        if (this.autoLauncher) {
            try {
                return await this.autoLauncher.isEnabled();
            } catch (error) {
                console.error('[AppSettingsService] Check startup status error:', error);
            }
        }
        // Fallback to database setting
        return this.getSetting('run_on_startup') ?? true;
    }

    // ============================================
    // MAXIMIZE WINDOW FUNCTIONALITY
    // ============================================

    /**
     * Get maximize window setting
     * @returns {boolean}
     */
    getMaximizeOnStart() {
        return this.getSetting('maximize_window') ?? true;
    }

    /**
     * Set maximize window setting
     * @param {boolean} enabled
     */
    setMaximizeOnStart(enabled) {
        this.appSettingsRepo.set('maximize_window', enabled, 'boolean');
    }

    // ============================================
    // CLOUD SYNC TOGGLE
    // ============================================

    /**
     * Get cloud sync enabled setting
     * @returns {boolean}
     */
    isCloudSyncEnabled() {
        return this.getSetting('cloud_sync') ?? false;
    }

    /**
     * Set cloud sync enabled
     * @param {boolean} enabled
     */
    setCloudSyncEnabled(enabled) {
        this.appSettingsRepo.set('cloud_sync', enabled, 'boolean');
    }

    // ============================================
    // NOTIFICATIONS FUNCTIONALITY
    // ============================================

    /**
     * Check if notifications are enabled
     * @returns {boolean}
     */
    areNotificationsEnabled() {
        return this.getSetting('notifications') ?? true;
    }

    /**
     * Set notifications enabled
     * @param {boolean} enabled
     */
    setNotificationsEnabled(enabled) {
        this.appSettingsRepo.set('notifications', enabled, 'boolean');
    }

    /**
     * Send a system notification (Windows toast)
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} options - Additional options
     */
    sendNotification(title, body, options = {}) {
        if (!this.areNotificationsEnabled()) {
            console.log('[AppSettingsService] Notifications disabled, skipping');
            return;
        }

        try {
            const { Notification } = require('electron');

            if (Notification.isSupported()) {
                const notification = new Notification({
                    title: title,
                    body: body,
                    icon: options.icon || undefined,
                    silent: options.silent || false
                });

                notification.show();

                if (options.onClick) {
                    notification.on('click', options.onClick);
                }
            } else {
                console.warn('[AppSettingsService] System notifications not supported');
            }
        } catch (error) {
            console.error('[AppSettingsService] Send notification error:', error);
        }
    }

    // ============================================
    // TEMP FILE SYSTEM
    // ============================================

    /**
     * Check if temp file system is enabled
     * @returns {boolean}
     */
    isTempSystemEnabled() {
        return this.getSetting('temp_system') ?? false;
    }

    /**
     * Get temp file path
     * @returns {string}
     */
    getTempPath() {
        return this.getSetting('temp_path') || 'C:\\POS Master\\temp';
    }

    /**
     * Ensure temp directory exists
     */
    ensureTempDirectory() {
        if (!this.isTempSystemEnabled()) return;

        const tempPath = this.getTempPath();
        try {
            if (!fs.existsSync(tempPath)) {
                fs.mkdirSync(tempPath, { recursive: true });
                console.log('[AppSettingsService] Created temp directory:', tempPath);
            }
        } catch (error) {
            console.error('[AppSettingsService] Failed to create temp directory:', error);
        }
    }

    // ============================================
    // APPLY ALL SETTINGS
    // ============================================

    /**
     * Apply all settings at once (called on app start or user login)
     * @param {Object} options - Options
     * @param {BrowserWindow} options.mainWindow - Main browser window
     * @param {Function} options.onAutoLogout - Auto logout callback
     * @returns {Promise<Object>} Applied settings
     */
    async applyAllSettings(options = {}) {
        const settings = this.getAllSettings();
        console.log('[AppSettingsService] Applying all settings:', settings);

        // Apply maximize window
        if (options.mainWindow && settings.maximize_window) {
            options.mainWindow.maximize();
        }

        // Apply run on startup
        await this.setRunOnStartup(settings.run_on_startup);

        // Start auto-logout if enabled
        if (settings.auto_logout && options.onAutoLogout) {
            this.startAutoLogoutMonitoring(options.onAutoLogout);
        }

        // Ensure temp directory
        if (settings.temp_system) {
            this.ensureTempDirectory();
        }

        return settings;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopAutoLogoutMonitoring();
    }
}

// Singleton instance
let appSettingsServiceInstance = null;

function getAppSettingsService() {
    if (!appSettingsServiceInstance) {
        appSettingsServiceInstance = new AppSettingsService();
    }
    return appSettingsServiceInstance;
}

module.exports = {
    AppSettingsService,
    getAppSettingsService
};
