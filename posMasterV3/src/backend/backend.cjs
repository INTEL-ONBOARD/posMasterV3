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
 * │  ├── AuthController    - Authentication endpoints               │
 * │  ├── UserController    - User management endpoints              │
 * │  └── SyncController    - Cloud sync endpoints                   │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Services (Business Logic)                                      │
 * │  ├── AuthService       - Login, register, session management    │
 * │  ├── UserService       - User CRUD, search, roles               │
 * │  └── SyncService       - Offline-first sync with cloud          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Repositories (Data Access)                                     │
 * │  ├── UserRepository    - User database operations               │
 * │  ├── SessionRepository - Session database operations            │
 * │  └── SyncQueueRepository - Sync queue operations                │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Database (SQLite with better-sqlite3)                          │
 * │  ├── Connection        - Database connection manager            │
 * │  └── Migrations        - Schema version control                 │
 * └─────────────────────────────────────────────────────────────────┘
 */

const { initializeDatabase, closeDatabase, getDatabasePath } = require('./database/connection.cjs');
const { runMigrations, getStatus } = require('./database/migrator.cjs');
const { runSeeders } = require('./database/seeder.cjs');
const { registerAllHandlers, unregisterAllHandlers } = require('./controllers/index.cjs');
const { getSessionRepository } = require('./repositories/index.cjs');

// Note: CloudSyncService and AppSettingsService are imported lazily to avoid
// importing Electron modules (like BrowserWindow) before app is ready

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

        // Step 3: Run seeders (create default admin if no users exist)
        console.log('[Backend] Step 3: Running database seeders...');
        runSeeders();

        // Step 4: Register IPC handlers
        console.log('[Backend] Step 4: Registering IPC handlers...');
        registerAllHandlers();

        // Step 5: Start session cleanup interval
        console.log('[Backend] Step 5: Starting maintenance tasks...');
        startMaintenanceTasks();

        // Step 6: Initialize cloud sync service (only if enabled in settings)
        console.log('[Backend] Step 6: Checking cloud sync setting...');
        try {
            // Lazy import to avoid importing Electron modules before app is ready
            const { getAppSettingsService } = require('./services/AppSettingsService.cjs');
            const { initializeCloudSync } = require('./services/CloudSyncService.cjs');

            const appSettingsService = getAppSettingsService();
            const cloudSyncEnabled = appSettingsService.isCloudSyncEnabled();

            if (cloudSyncEnabled) {
                console.log('[Backend] Cloud sync is enabled, initializing...');
                initializeCloudSync().catch(err => {
                    console.error('[Backend] Cloud sync initialization error:', err.message);
                });

                // Step 6b: Initialize real-time sync service for faster sync
                console.log('[Backend] Step 6b: Initializing real-time sync service...');
                const { initializeRealTimeSync } = require('./services/RealTimeSyncService.cjs');
                initializeRealTimeSync().catch(err => {
                    console.error('[Backend] Real-time sync initialization error:', err.message);
                });
            } else {
                console.log('[Backend] Cloud sync is disabled in settings, skipping initialization');
            }
        } catch (err) {
            console.log('[Backend] Could not check cloud sync setting, initializing by default:', err.message);
            const { initializeCloudSync } = require('./services/CloudSyncService.cjs');
            initializeCloudSync().catch(err => {
                console.error('[Backend] Cloud sync initialization error:', err.message);
            });

            // Also initialize real-time sync
            const { initializeRealTimeSync } = require('./services/RealTimeSyncService.cjs');
            initializeRealTimeSync().catch(err => {
                console.error('[Backend] Real-time sync initialization error:', err.message);
            });
        }

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
        // Stop maintenance tasks
        stopMaintenanceTasks();

        // Cleanup real-time sync service
        try {
            const { getRealTimeSyncService } = require('./services/RealTimeSyncService.cjs');
            const realTimeSync = getRealTimeSyncService();
            realTimeSync.stop();
        } catch (err) {
            console.error('[Backend] Real-time sync cleanup error:', err.message);
        }

        // Cleanup cloud sync service
        try {
            const { getCloudSyncService } = require('./services/CloudSyncService.cjs');
            const cloudSyncService = getCloudSyncService();
            await cloudSyncService.cleanup();
        } catch (err) {
            console.error('[Backend] Cloud sync cleanup error:', err.message);
        }

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

// Maintenance task interval
let maintenanceInterval = null;

/**
 * Start background maintenance tasks
 */
function startMaintenanceTasks() {
    // Clean up expired sessions every hour
    maintenanceInterval = setInterval(() => {
        try {
            const sessionRepo = getSessionRepository();
            const cleaned = sessionRepo.cleanupExpired();
            if (cleaned > 0) {
                console.log(`[Backend] Cleaned up ${cleaned} expired sessions`);
            }
        } catch (error) {
            console.error('[Backend] Maintenance task error:', error.message);
        }
    }, 60 * 60 * 1000); // 1 hour

    console.log('[Backend] Maintenance tasks started');
}

/**
 * Stop background maintenance tasks
 */
function stopMaintenanceTasks() {
    if (maintenanceInterval) {
        clearInterval(maintenanceInterval);
        maintenanceInterval = null;
        console.log('[Backend] Maintenance tasks stopped');
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
