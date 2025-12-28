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

// New controllers for complete backend
const CategoryController = require('./CategoryController.cjs');
const UomController = require('./UomController.cjs');
const BranchController = require('./BranchController.cjs');
const SupplierController = require('./SupplierController.cjs');
const ItemController = require('./ItemController.cjs');
const StockController = require('./StockController.cjs');
const RestockController = require('./RestockController.cjs');
const MemberController = require('./MemberController.cjs');
const SalesController = require('./SalesController.cjs');
const SettingsController = require('./SettingsController.cjs');
const CloudSyncController = require('./CloudSyncController.cjs');
const LoginHistoryController = require('./LoginHistoryController.cjs');
const AppSettingsController = require('./AppSettingsController.cjs');
const PaymentMethodController = require('./PaymentMethodController.cjs');

/**
 * Register all IPC handlers
 * Call this during app initialization after database is ready
 */
function registerAllHandlers() {
    console.log('[Controllers] Registering all IPC handlers...');

    // Core handlers
    registerAuthHandlers();
    registerUserHandlers();
    registerSyncHandlers();

    // Inventory & Catalog handlers
    CategoryController.registerHandlers();
    UomController.registerHandlers();
    BranchController.registerHandlers();
    ItemController.registerHandlers();
    StockController.registerHandlers();

    // Supplier & Restock handlers
    SupplierController.registerHandlers();
    RestockController.registerHandlers();

    // Sales & Members handlers
    MemberController.registerHandlers();
    SalesController.registerHandlers();
    PaymentMethodController.registerHandlers();

    // Settings handlers
    const settingsController = new SettingsController();
    settingsController.registerHandlers();

    // Cloud Sync handlers
    const cloudSyncController = new CloudSyncController();
    cloudSyncController.registerHandlers();

    // Login History handlers
    const loginHistoryController = new LoginHistoryController();
    loginHistoryController.registerHandlers();

    // App Settings handlers (auto-logout, notifications, startup, etc.)
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

    unregisterAuthHandlers();
    unregisterUserHandlers();
    unregisterSyncHandlers();

    // Note: New controllers use static methods that don't need explicit unregister
    // The ipcMain handlers are automatically cleaned up when the app closes

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
    unregisterSyncHandlers,
    // Export new controllers for direct access if needed
    CategoryController,
    UomController,
    BranchController,
    SupplierController,
    ItemController,
    StockController,
    RestockController,
    MemberController,
    SalesController,
    SettingsController,
    CloudSyncController,
    LoginHistoryController,
    AppSettingsController,
    PaymentMethodController
};
