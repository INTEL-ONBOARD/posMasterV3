/**
 * Controller Index
 *
 * Central export and registration for all IPC controllers.
 * Controllers handle the IPC communication layer between
 * the Electron main process and the renderer process.
 */

const AppSettingsController = require('./AppSettingsController.cjs');
const OnlineController = require('./OnlineController.cjs');

/**
 * Register all IPC handlers
 * Call this during Electron backend bridge initialization.
 */
function registerAllHandlers() {
    console.log('[Controllers] Registering all IPC handlers...');

    OnlineController.registerHandlers();
    const appSettingsController = new AppSettingsController();
    appSettingsController.registerHandlers();

    console.log('[Controllers] All IPC handlers registered successfully');
}

/**
 * Unregister all IPC handlers
 * Call this during app cleanup/shutdown
 */
function unregisterAllHandlers() {
    console.log('[Controllers] Unregistering all IPC handlers...');

    console.log('[Controllers] All IPC handlers unregistered');
}

module.exports = {
    registerAllHandlers,
    unregisterAllHandlers,
    AppSettingsController,
    OnlineController
};
