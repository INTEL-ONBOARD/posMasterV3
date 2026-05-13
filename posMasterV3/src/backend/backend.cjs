/**
 * Backend Initialization
 *
 * Main entry point for the Electron backend bridge.
 * Registers online-only IPC controllers. Business data lives in MongoDB.
 *
 * Architecture Overview:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    Electron Main Process                        │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Controllers (IPC Handlers)                                     │
 * │  ├── OnlineController  - Online API bridge                      │
 * │  └── AppSettingsController - Local app settings                 │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Services (Business Logic)                                      │
 * │  ├── OnlineModeService - MongoDB-backed online API bridge       │
 * │  └── AppSettingsService - Desktop preferences                   │
 * └─────────────────────────────────────────────────────────────────┘
 */

const { registerAllHandlers, unregisterAllHandlers } = require('./controllers/index.cjs');

let isInitialized = false;

/**
 * Initialize the backend bridge
 * @param {string} _configPath - Kept for call-site compatibility; not used.
 * @returns {Object} Initialization result
 */
function initializeBackend(_configPath) {
    if (isInitialized) {
        console.log('[Backend] Already initialized');
        return {
            success: true,
            message: 'Backend already initialized',
            onlineOnly: true
        };
    }

    console.log('[Backend] Initializing online-only backend bridge...');

    try {
        console.log('[Backend] Registering online-only IPC handlers...');
        registerAllHandlers();

        isInitialized = true;

        console.log('[Backend] Online-only backend bridge initialized successfully');

        return {
            success: true,
            message: 'Online-only backend bridge initialized successfully',
            onlineOnly: true
        };

    } catch (error) {
        console.error('[Backend] Initialization failed:', error.message);
        return {
            success: false,
            message: 'Backend initialization failed: ' + error.message
        };
    }
}

/**
 * Shutdown the backend
 */
async function shutdownBackend() {
    console.log('[Backend] Shutting down...');

    try {
        // Unregister IPC handlers
        unregisterAllHandlers();

        isInitialized = false;

        console.log('[Backend] Backend bridge shutdown complete');
        return { success: true };

    } catch (error) {
        console.error('[Backend] ✗ Shutdown error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Get backend status
 * @returns {Object}
 */
function getBackendStatus() {
    if (!isInitialized) {
        return {
            initialized: false,
            message: 'Backend not initialized'
        };
    }

    return {
        initialized: true,
        onlineOnly: true,
        message: 'Online-only backend bridge initialized'
    };
}

/**
 * Check if backend is initialized
 * @returns {boolean}
 */
function isBackendInitialized() {
    return isInitialized;
}

module.exports = {
    initializeBackend,
    shutdownBackend,
    getBackendStatus,
    isBackendInitialized
};
