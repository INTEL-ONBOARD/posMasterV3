/**
 * Real-Time Sync Service
 *
 * Provides fast, real-time synchronization between local SQLite and cloud MySQL.
 * Optimized for immediate sync when online with aggressive polling.
 *
 * Features:
 * - Immediate sync on data changes (no queueing when online)
 * - Fast polling for active_sessions (2-3 seconds)
 * - Broadcasts UI updates instantly
 * - Connection status monitoring with fast recovery
 */

const { getDatabase } = require('../database/connection.cjs');
const {
    broadcastDataChange,
    broadcastSyncStatus,
    broadcastEvent,
    broadcastSyncComplete
} = require('../utils/eventBroadcaster.cjs');
const EventEmitter = require('events');

// Configuration for real-time sync
const CONFIG = {
    // Active sessions polling (critical for single-device enforcement)
    ACTIVE_SESSIONS_POLL_INTERVAL: 3000,  // 3 seconds

    // General sync intervals
    FAST_SYNC_INTERVAL: 5000,             // 5 seconds when online
    SLOW_SYNC_INTERVAL: 30000,            // 30 seconds for less critical tables

    // Network check
    NETWORK_CHECK_INTERVAL: 5000,         // 5 seconds

    // Retry settings
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,

    // Cache settings
    SESSION_CACHE_TTL: 2000,              // 2 seconds for session cache
};

// Tables that need fast sync (critical for real-time features)
const FAST_SYNC_TABLES = ['active_sessions', 'users', 'user_settings'];

// All other tables sync at normal speed
const NORMAL_SYNC_TABLES = [
    'categories', 'units_of_measurement', 'branches', 'suppliers',
    'items', 'stock', 'restock_transactions', 'restock_items',
    'return_items', 'members', 'sales_transactions', 'sales_items',
    'disposed_items', 'offers_discounts', 'login_history'
];

class RealTimeSyncService extends EventEmitter {
    constructor() {
        super();
        this.isOnline = false;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncStatus = 'idle';
        this.connectionQuality = 'unknown'; // 'excellent', 'good', 'poor', 'offline'

        // Polling intervals
        this.activeSessionsInterval = null;
        this.fastSyncInterval = null;
        this.networkCheckInterval = null;

        // Change queue for offline mode
        this.pendingChanges = [];

        // Session monitoring
        this.lastActiveSessionCheck = 0;
        this.sessionCheckInProgress = false;

        // Per-interval guard flags to prevent async overlap (Fix 25)
        this.isNetworkCheckRunning = false;
        this.isFastSyncRunning = false;
        // Note: sessionCheckInProgress already serves as the sessions guard

        // CloudSync reference (lazy loaded)
        this._cloudSync = null;

        // Debounce map for sync operations
        this.syncDebounce = new Map();
    }

    /**
     * Get CloudSyncService (lazy loaded)
     */
    getCloudSync() {
        if (!this._cloudSync) {
            const { getCloudSyncService } = require('./CloudSyncService.cjs');
            this._cloudSync = getCloudSyncService();
        }
        return this._cloudSync;
    }

    /**
     * Initialize real-time sync service
     */
    async initialize() {
        console.log('[RealTimeSync] Initializing real-time sync service...');

        // Get initial connection status
        const cloudSync = this.getCloudSync();
        this.isOnline = cloudSync.isOnline && cloudSync.mysqlInitialized;

        // Start monitoring
        this.startNetworkMonitoring();
        this.startActiveSessionsPolling();
        this.startFastSync();

        // Broadcast initial status
        this.broadcastStatus();

        console.log('[RealTimeSync] Real-time sync service initialized');
        console.log(`[RealTimeSync] Status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

        return this;
    }

    /**
     * Start fast network monitoring
     */
    startNetworkMonitoring() {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
        }

        this.networkCheckInterval = setInterval(async () => {
            // Guard: prevent concurrent overlapping runs (Fix 25)
            if (this.isNetworkCheckRunning) return;
            this.isNetworkCheckRunning = true;
            try {
                const wasOnline = this.isOnline;
                const cloudSync = this.getCloudSync();

                this.isOnline = cloudSync.isOnline && cloudSync.mysqlInitialized;

                // Connection restored
                if (!wasOnline && this.isOnline) {
                    console.log('[RealTimeSync] Connection restored! Syncing immediately...');
                    this.connectionQuality = 'good';
                    this.broadcastStatus();

                    // Sync pending changes immediately
                    await this.syncPendingChanges();

                    // Pull latest active_sessions immediately
                    await this.pullActiveSessionsNow();
                }

                // Connection lost
                if (wasOnline && !this.isOnline) {
                    console.log('[RealTimeSync] Connection lost. Queueing changes.');
                    this.connectionQuality = 'offline';
                    this.broadcastStatus();
                }
            } catch (e) {
                console.error('[RealTimeSync] Network monitoring error:', e.message);
            } finally {
                this.isNetworkCheckRunning = false;
            }
        }, CONFIG.NETWORK_CHECK_INTERVAL);

        console.log('[RealTimeSync] Network monitoring started (every 5s)');
    }

    /**
     * Start aggressive active_sessions polling
     * This is critical for single-device enforcement
     */
    startActiveSessionsPolling() {
        if (this.activeSessionsInterval) {
            clearInterval(this.activeSessionsInterval);
        }

        this.activeSessionsInterval = setInterval(async () => {
            if (!this.isOnline) return;
            if (this.sessionCheckInProgress) return;

            this.sessionCheckInProgress = true;
            try {
                await this.checkActiveSessionsFromCloud();
            } catch (e) {
                console.error('[RealTimeSync] Active sessions polling error:', e.message);
            } finally {
                this.sessionCheckInProgress = false;
            }
        }, CONFIG.ACTIVE_SESSIONS_POLL_INTERVAL);

        console.log('[RealTimeSync] Active sessions polling started (every 3s)');
    }

    /**
     * Check active_sessions from cloud for session kicks
     */
    async checkActiveSessionsFromCloud() {
        try {
            const cloudSync = this.getCloudSync();
            if (!cloudSync.isOnline || !cloudSync.mysqlInitialized) return;

            // Pull active_sessions from cloud
            const pullResult = await cloudSync.pullFromCloud('active_sessions');

            // Clear session cache to force revalidation
            const { clearCache, validateSessionFast } = require('./SessionValidator.cjs');
            clearCache();

            this.lastActiveSessionCheck = Date.now();

            // If there were ACTUAL changes (not just synced same data), validate session
            // This triggers the kick detection if another device logged in
            if (pullResult.actuallyChanged > 0) {
                console.log('[RealTimeSync] Active sessions changed, validating current session...');

                // Get current token from main process storage or try to validate
                // The validation will trigger broadcastSessionKicked if kicked
                const { getDatabase } = require('../database/connection.cjs');
                const db = getDatabase();

                // Get all active local sessions and validate them
                const sessions = db.prepare('SELECT token FROM sessions WHERE is_active = 1').all();
                for (const session of sessions) {
                    const result = validateSessionFast(session.token);
                    if (!result.valid && result.forcedLogout) {
                        console.log('[RealTimeSync] Session kicked detected after cloud sync');
                        // The broadcastSessionKicked is already called inside validateSessionFast
                        // Do NOT break — continue processing all sessions so all kicked users are notified (Fix 23)
                    }
                }
            }

        } catch (error) {
            console.log('[RealTimeSync] Active sessions check failed:', error.message);
        }
    }

    /**
     * Pull active_sessions immediately (called on connection restore)
     */
    async pullActiveSessionsNow() {
        try {
            const cloudSync = this.getCloudSync();
            if (!cloudSync.isOnline || !cloudSync.mysqlInitialized) return;

            console.log('[RealTimeSync] Pulling active_sessions immediately...');
            await cloudSync.pullFromCloud('active_sessions');

            // Clear session cache
            const { clearCache } = require('./SessionValidator.cjs');
            clearCache();

            // Broadcast that sessions were updated
            broadcastEvent('sync:active-sessions-updated', {
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[RealTimeSync] Immediate active_sessions pull failed:', error.message);
        }
    }

    /**
     * Start fast sync for critical tables
     */
    startFastSync() {
        if (this.fastSyncInterval) {
            clearInterval(this.fastSyncInterval);
        }

        this.fastSyncInterval = setInterval(async () => {
            if (!this.isOnline || this.isSyncing) return;
            // Guard: prevent concurrent overlapping runs (Fix 25)
            if (this.isFastSyncRunning) return;
            this.isFastSyncRunning = true;
            this.isSyncing = true;
            try {
                await this.performFastSync();
            } catch (e) {
                console.error('[RealTimeSync] Fast sync error:', e.message);
            } finally {
                this.isSyncing = false;
                this.isFastSyncRunning = false;
            }
        }, CONFIG.FAST_SYNC_INTERVAL);

        console.log('[RealTimeSync] Fast sync started (every 5s)');
    }

    /**
     * Perform fast sync of critical tables
     */
    async performFastSync() {
        const cloudSync = this.getCloudSync();
        if (!cloudSync.isOnline || !cloudSync.mysqlInitialized) return;

        const startTime = Date.now();

        try {
            // Sync fast tables (users, user_settings - but NOT active_sessions as it has its own polling)
            for (const table of FAST_SYNC_TABLES) {
                if (table === 'active_sessions') continue; // Handled by dedicated polling

                await cloudSync.pullFromCloud(table);
            }

            const elapsed = Date.now() - startTime;
            this.lastSyncTime = new Date().toISOString();

            // Update connection quality based on sync speed
            if (elapsed < 500) {
                this.connectionQuality = 'excellent';
            } else if (elapsed < 2000) {
                this.connectionQuality = 'good';
            } else {
                this.connectionQuality = 'poor';
            }

        } catch (error) {
            console.log('[RealTimeSync] Fast sync error:', error.message);
            this.connectionQuality = 'poor';
        }
    }

    /**
     * Sync a data change immediately
     * Called when data is modified locally
     */
    async syncChangeNow(tableName, operation, record, recordId) {
        if (!this.isOnline) {
            // Queue for later
            this.pendingChanges.push({ tableName, operation, record, recordId, timestamp: new Date().toISOString() });
            console.log(`[RealTimeSync] Queued change: ${operation} on ${tableName}`);
            return { queued: true };
        }

        try {
            const cloudSync = this.getCloudSync();

            // Use cloud sync's queue mechanism for immediate sync
            await cloudSync.queueChange(tableName, operation, record, recordId);

            // Broadcast the change to UI
            broadcastDataChange(tableName, operation, recordId, record);

            console.log(`[RealTimeSync] Synced immediately: ${operation} on ${tableName}`);
            return { success: true };

        } catch (error) {
            console.error(`[RealTimeSync] Immediate sync failed:`, error.message);
            this.pendingChanges.push({ tableName, operation, record, recordId, timestamp: new Date().toISOString() });
            return { queued: true, error: error.message };
        }
    }

    /**
     * Sync all pending changes
     */
    async syncPendingChanges() {
        if (this.pendingChanges.length === 0) return { synced: 0 };
        if (!this.isOnline) return { synced: 0, reason: 'offline' };

        console.log(`[RealTimeSync] Syncing ${this.pendingChanges.length} pending changes...`);

        const cloudSync = this.getCloudSync();
        let synced = 0;
        const failed = [];

        while (this.pendingChanges.length > 0) {
            const change = this.pendingChanges.shift();

            try {
                await cloudSync.queueChange(change.tableName, change.operation, change.record, change.recordId);
                synced++;

                // Broadcast each change
                broadcastDataChange(change.tableName, change.operation, change.recordId, change.record);

            } catch (error) {
                failed.push(change);
            }
        }

        // Re-queue failed changes
        this.pendingChanges = [...failed];

        console.log(`[RealTimeSync] Pending sync complete. Synced: ${synced}, Failed: ${failed.length}`);

        // Broadcast sync completion to update UI
        if (synced > 0) {
            broadcastSyncComplete({
                success: failed.length === 0,
                recordsUpdated: synced,
                uploaded: synced,
                downloaded: 0,
                errors: failed.length > 0 ? [{ count: failed.length }] : []
            });
        }

        return { synced, failed: failed.length };
    }

    /**
     * Broadcast current sync status to UI
     */
    broadcastStatus() {
        broadcastSyncStatus({
            status: this.syncStatus,
            isOnline: this.isOnline,
            connectionQuality: this.connectionQuality,
            pendingCount: this.pendingChanges.length,
            lastSyncTime: this.lastSyncTime
        });
    }

    /**
     * Get current sync status
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            syncStatus: this.syncStatus,
            connectionQuality: this.connectionQuality,
            pendingCount: this.pendingChanges.length,
            lastSyncTime: this.lastSyncTime,
            lastActiveSessionCheck: this.lastActiveSessionCheck
        };
    }

    /**
     * Force an immediate full sync
     */
    async forceFullSync() {
        if (!this.isOnline) {
            return { success: false, reason: 'offline' };
        }

        console.log('[RealTimeSync] Forcing full sync...');
        this.syncStatus = 'full_sync';
        this.broadcastStatus();

        try {
            const cloudSync = this.getCloudSync();
            const result = await cloudSync.performFullSync();

            this.syncStatus = 'completed';
            this.lastSyncTime = new Date().toISOString();
            this.broadcastStatus();

            return { success: true, ...result };

        } catch (error) {
            this.syncStatus = 'error';
            this.broadcastStatus();
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop all sync intervals
     */
    stop() {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
            this.networkCheckInterval = null;
        }
        if (this.activeSessionsInterval) {
            clearInterval(this.activeSessionsInterval);
            this.activeSessionsInterval = null;
        }
        if (this.fastSyncInterval) {
            clearInterval(this.fastSyncInterval);
            this.fastSyncInterval = null;
        }

        console.log('[RealTimeSync] All sync intervals stopped');
    }
}

// Singleton instance
let realTimeSyncInstance = null;

/**
 * Get or create the RealTimeSync service instance
 */
function getRealTimeSyncService() {
    if (!realTimeSyncInstance) {
        realTimeSyncInstance = new RealTimeSyncService();
    }
    return realTimeSyncInstance;
}

/**
 * Initialize the RealTimeSync service
 */
async function initializeRealTimeSync() {
    const service = getRealTimeSyncService();
    await service.initialize();
    return service;
}

/**
 * Sync a change immediately (called from repositories)
 */
async function syncNow(tableName, operation, record, recordId) {
    const service = getRealTimeSyncService();
    return service.syncChangeNow(tableName, operation, record, recordId);
}

module.exports = {
    RealTimeSyncService,
    getRealTimeSyncService,
    initializeRealTimeSync,
    syncNow
};
