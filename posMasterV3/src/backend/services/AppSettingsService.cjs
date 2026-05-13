/**
 * App Settings Service
 *
 * Manages application-wide settings that affect system behavior.
 * Handles reading and applying desktop-only app preferences.
 */

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
        this.autoLauncher = null;
        this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
        this.settings = this._loadSettings();

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
        return { ...this._getDefaults(), ...this.settings };
    }

    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @returns {any} Setting value
     */
    getSetting(key) {
        return this.getAllSettings()[key];
    }

    /**
     * Get default settings
     * All settings are enabled by default for new users
     * @private
     */
    _getDefaults() {
        return {
            logout_on_close: true,
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

    _loadSettings() {
        try {
            if (!fs.existsSync(this.settingsPath)) return {};
            const parsed = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('[AppSettingsService] Failed to load app settings, using defaults:', error.message);
            return {};
        }
    }

    _setSetting(key, value) {
        this.settings = { ...this.settings, [key]: value };
        try {
            fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
        } catch (error) {
            console.error('[AppSettingsService] Failed to save app settings:', error.message);
        }
    }

    // ============================================
    // LOGOUT ON CLOSE FUNCTIONALITY
    // ============================================

    /**
     * Check if logout on close is enabled
     * @returns {boolean}
     */
    isLogoutOnCloseEnabled() {
        return this.getSetting('logout_on_close') ?? true;
    }

    /**
     * Set logout on close setting
     * @param {boolean} enabled - Whether to logout when app closes
     */
    setLogoutOnClose(enabled) {
        this._setSetting('logout_on_close', Boolean(enabled));
        console.log(`[AppSettingsService] Logout on close ${enabled ? 'enabled' : 'disabled'}`);
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
            this._setSetting('run_on_startup', Boolean(enabled));

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
        this._setSetting('maximize_window', Boolean(enabled));
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
        this._setSetting('notifications', Boolean(enabled));
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
        // No longer needed for logout on close, but kept for future cleanup needs
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
