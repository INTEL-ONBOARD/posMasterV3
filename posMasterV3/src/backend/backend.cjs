/**
 * Backend Initialization
 *
 * Main entry point for the layered backend architecture.
 * Initializes database, runs migrations, and registers controllers.
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
 * │  ├── AppSettingsService - Desktop preferences and startup       │
 * │  └── BranchContextService - Selected branch state               │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Database (SQLite with better-sqlite3)                          │
 * │  └── Migrations        - Local app settings / branch context    │
 * └─────────────────────────────────────────────────────────────────┘
 */

const { initializeDatabase, closeDatabase, getDatabasePath } = require('./database/connection.cjs');
const { runMigrations, getStatus } = require('./database/migrator.cjs');
const { registerAllHandlers, unregisterAllHandlers, initializeBranchContext } = require('./controllers/index.cjs');

let isInitialized = false;

/**
 * Initialize the backend
 * @param {string} configPath - Path to store database file
 * @returns {Object} Initialization result
 */
function initializeBackend(configPath) {
    if (isInitialized) {
        console.log('[Backend] Already initialized');
        return {
            success: true,
            message: 'Backend already initialized',
            dbPath: getDatabasePath()
        };
    }

    console.log('[Backend] Initializing backend...');

    try {
        // Step 1: Initialize database connection
        console.log('[Backend] Step 1: Initializing database connection...');
        initializeDatabase(configPath);

        // Step 2: Run migrations
        console.log('[Backend] Step 2: Running database migrations...');
        const migrationResult = runMigrations(require('./database/connection.cjs').getDatabase());

        if (migrationResult.errors.length > 0) {
            console.error('[Backend] Migration errors:', migrationResult.errors);
        }

        // Step 3: Register IPC handlers
        console.log('[Backend] Step 4: Registering IPC handlers...');
        registerAllHandlers();

        // Step 4: Initialize branch context service
        console.log('[Backend] Step 4b: Initializing branch context service...');
        initializeBranchContext(require('./database/connection.cjs').getDatabase());

        isInitialized = true;

        console.log('[Backend] ✓ Backend initialized successfully');

        return {
            success: true,
            message: 'Backend initialized successfully',
            dbPath: getDatabasePath(),
            migrations: migrationResult
        };

    } catch (error) {
        console.error('[Backend] ✗ Initialization failed:', error.message);
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

        // Close database
        closeDatabase();

        isInitialized = false;

        console.log('[Backend] ✓ Backend shutdown complete');
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

    try {
        const migrationStatus = getStatus(require('./database/connection.cjs').getDatabase());

        return {
            initialized: true,
            dbPath: getDatabasePath(),
            migrations: migrationStatus
        };

    } catch (error) {
        return {
            initialized: isInitialized,
            error: error.message
        };
    }
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
