/**
 * Controller Index
 *
 * Central export and registration for all IPC controllers.
 * Controllers handle the IPC communication layer between
 * the Electron main process and the renderer process.
 */

const { ipcMain } = require('electron');
const AppSettingsController = require('./AppSettingsController.cjs');
const OnlineController = require('./OnlineController.cjs');

// Populated by registerAllHandlers() with every channel name the two
// controllers registered, so unregisterAllHandlers() can remove exactly
// those channels instead of being a no-op.
let registeredChannels = [];

/**
 * Register all IPC handlers
 * Call this during Electron backend bridge initialization.
 */
function registerAllHandlers() {
    console.log('[Controllers] Registering all IPC handlers...');

    registeredChannels = [];
    registeredChannels.push(...OnlineController.registerHandlers());
    const appSettingsController = new AppSettingsController();
    registeredChannels.push(...appSettingsController.registerHandlers());

    console.log('[Controllers] All IPC handlers registered successfully');
}

/**
 * Unregister all IPC handlers
 * Call this during app cleanup/shutdown
 */
function unregisterAllHandlers() {
    console.log('[Controllers] Unregistering all IPC handlers...');

    for (const channel of registeredChannels) {
        ipcMain.removeHandler(channel);
    }
    registeredChannels = [];

    console.log('[Controllers] All IPC handlers unregistered');
}

module.exports = {
    registerAllHandlers,
    unregisterAllHandlers,
    AppSettingsController,
    OnlineController
};
