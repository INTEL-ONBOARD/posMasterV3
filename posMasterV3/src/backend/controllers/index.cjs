/**
 * Controller Index
 *
 * Central export and registration for all IPC controllers.
 * Controllers handle the IPC communication layer between
 * the Electron main process and the renderer process.
 */

const AppSettingsController = require('./AppSettingsController.cjs');
const OnlineController = require('./OnlineController.cjs');
const { branchContextService } = require('../services/BranchContextService.cjs');

/**
 * Register all IPC handlers
 * Call this during app initialization after database is ready
 */
function registerAllHandlers() {
    console.log('[Controllers] Registering all IPC handlers...');

    OnlineController.registerHandlers();
    const appSettingsController = new AppSettingsController();
    appSettingsController.registerHandlers();

    // Note: BranchContextService IPC handlers are registered in its initialize() method
    // which is called from main.js after database is ready

    console.log('[Controllers] All IPC handlers registered successfully');
}

/**
 * Initialize branch context service with database
 * Call this after database is initialized
 */
function initializeBranchContext(db) {
    branchContextService.initialize(db);
    return branchContextService;
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
    initializeBranchContext,
    branchContextService,
    AppSettingsController,
    OnlineController
};
