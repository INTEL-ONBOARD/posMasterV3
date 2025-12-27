/**
 * Service Index
 *
 * Central export for all services.
 * Services contain business logic and orchestrate repository operations.
 */

const AuthService = require('./AuthService.cjs');
const UserService = require('./UserService.cjs');
const SyncService = require('./SyncService.cjs');
const SessionValidator = require('./SessionValidator.cjs');

// CloudSyncService is lazily imported to avoid importing Electron modules
// (like BrowserWindow) before the app is ready
let _cloudSyncModule = null;
function getCloudSyncModule() {
    if (!_cloudSyncModule) {
        _cloudSyncModule = require('./CloudSyncService.cjs');
    }
    return _cloudSyncModule;
}

// Singleton instances
let authService = null;
let userService = null;
let syncService = null;

/**
 * Get Auth Service instance (singleton)
 * @returns {AuthService}
 */
function getAuthService() {
    if (!authService) {
        authService = new AuthService();
    }
    return authService;
}

/**
 * Get User Service instance (singleton)
 * @returns {UserService}
 */
function getUserService() {
    if (!userService) {
        userService = new UserService();
    }
    return userService;
}

/**
 * Get Sync Service instance (singleton)
 * @param {string} cloudUrl - Optional cloud URL override
 * @returns {SyncService}
 */
function getSyncService(cloudUrl) {
    if (!syncService) {
        syncService = new SyncService(cloudUrl);
    }
    return syncService;
}

/**
 * Reset all service instances (useful for testing)
 */
function resetServices() {
    authService = null;
    userService = null;
    syncService = null;
}

module.exports = {
    AuthService,
    UserService,
    SyncService,
    SessionValidator,
    // CloudSyncService exports are proxied through lazy loader
    get CloudSyncService() { return getCloudSyncModule().CloudSyncService; },
    get getCloudSyncService() { return getCloudSyncModule().getCloudSyncService; },
    get initializeCloudSync() { return getCloudSyncModule().initializeCloudSync; },
    get notifyDataChange() { return getCloudSyncModule().notifyDataChange; },
    getAuthService,
    getUserService,
    getSyncService,
    resetServices
};
