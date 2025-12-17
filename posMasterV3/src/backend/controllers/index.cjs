/**
 * Controller Index
 *
 * Central export and registration for all IPC controllers.
 * Controllers handle the IPC communication layer between
 * the Electron main process and the renderer process.
 */

const { registerAuthHandlers, unregisterAuthHandlers } = require('./AuthController.cjs');
const { registerUserHandlers, unregisterUserHandlers } = require('./UserController.cjs');
const { registerSyncHandlers, unregisterSyncHandlers } = require('./SyncController.cjs');

/**
 * Register all IPC handlers
 * Call this during app initialization after database is ready
 */
function registerAllHandlers() {
    console.log('[Controllers] Registering all IPC handlers...');

    registerAuthHandlers();
    registerUserHandlers();
    registerSyncHandlers();

    console.log('[Controllers] All IPC handlers registered successfully');
}

/**
 * Unregister all IPC handlers
 * Call this during app cleanup/shutdown
 */
function unregisterAllHandlers() {
    console.log('[Controllers] Unregistering all IPC handlers...');

    unregisterAuthHandlers();
    unregisterUserHandlers();
    unregisterSyncHandlers();

    console.log('[Controllers] All IPC handlers unregistered');
}

module.exports = {
    registerAllHandlers,
    unregisterAllHandlers,
    registerAuthHandlers,
    unregisterAuthHandlers,
    registerUserHandlers,
    unregisterUserHandlers,
    registerSyncHandlers,
    unregisterSyncHandlers
};
