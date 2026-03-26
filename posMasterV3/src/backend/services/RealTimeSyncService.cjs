/**
 * Real-Time Sync Service
 *
 * Thin status broadcaster and connection-restore handler.
 * MySQL polling (active_sessions + incremental table pulls) now lives exclusively
 * in CloudSyncService to prevent the connection-flood that exhausted
 * max_user_connections on the shared MySQL host.
 *
 * Responsibilities:
 * - Mirror CloudSyncService online/offline state to the UI
 * - Flush pending offline changes to CloudSyncService when connection is restored
 * - Expose getStatus() / forceFullSync() / syncChangeNow() as a stable API
 *   (called by repositories and controllers — do NOT change the exports)
 */

const {
    broadcastSyncStatus,
    broadcastEvent
} = require('../utils/eventBroadcaster.cjs');
const EventEmitter = require('events');

// Network status check interval (reads CloudSync state — no MySQL queries here)
const NETWORK_CHECK_INTERVAL_MS = 2000;

class RealTimeSyncService extends EventEmitter {
    constructor() {
        super();
        this.isOnline = false;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncStatus = 'idle';
        this.connectionQuality = 'unknown'; // 'excellent', 'good', 'poor', 'offline'

        // Network check interval (reads CloudSync.isOnline — no direct MySQL)
        this.networkCheckInterval = null;

        // Legacy in-memory change queue (drained into CloudSync DB queue on restore)
        this.pendingChanges = [];

        // CloudSync reference (lazy loaded)
        this._cloudSync = null;
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
        console.log('[RealTimeSync] Initializing (status bridge mode)...');

        const cloudSync = this.getCloudSync();
        this.isOnline = cloudSync.isOnline && cloudSync.mysqlInitialized;

        this.startNetworkMonitoring();
        this.broadcastStatus();

        console.log('[RealTimeSync] Initialized');
        console.log(`[RealTimeSync] Status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

        return this;
    }

    /**
     * Monitor connection status by reading CloudSyncService state.
     * No MySQL queries here — CloudSyncService owns the connection check.
     */
    startNetworkMonitoring() {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
        }

        this.networkCheckInterval = setInterval(async () => {
            const wasOnline = this.isOnline;
            const cloudSync = this.getCloudSync();

            this.isOnline = cloudSync.isOnline && cloudSync.mysqlInitialized;

            // Connection restored — flush any in-memory pending changes
            if (!wasOnline && this.isOnline) {
                console.log('[RealTimeSync] Connection restored — flushing pending changes...');
                this.connectionQuality = 'good';
                this.broadcastStatus();
                await this.syncPendingChanges();
            }

            // Connection lost
            if (wasOnline && !this.isOnline) {
                console.log('[RealTimeSync] Connection lost. Changes will be queued.');
                this.connectionQuality = 'offline';
                this.broadcastStatus();
            }
        }, NETWORK_CHECK_INTERVAL_MS);

        console.log('[RealTimeSync] Network monitoring started (every 2s, reads CloudSync state)');
    }

    /**
     * Queue a local data change for sync.
     * Delegates to CloudSyncService which owns the DB-backed sync_queue.
     */
    async syncChangeNow(tableName, operation, record, recordId) {
        try {
            const cloudSync = this.getCloudSync();
            await cloudSync.queueChange(tableName, operation, record, recordId);
            console.log(`[RealTimeSync] Queued change via CloudSync: ${operation} on ${tableName}`);
            return { success: true };
        } catch (error) {
            console.error(`[RealTimeSync] Failed to queue change:`, error.message);
            return { queued: false, error: error.message };
        }
    }

    /**
     * Flush any legacy in-memory pending changes into the CloudSync DB queue,
     * then trigger CloudSync to sync them.
     */
    async syncPendingChanges() {
        if (this.pendingChanges.length > 0) {
            console.log(`[RealTimeSync] Draining ${this.pendingChanges.length} in-memory pending changes to CloudSync queue...`);
            const cloudSync = this.getCloudSync();
            const leftovers = [...this.pendingChanges];
            this.pendingChanges = [];
            for (const change of leftovers) {
                try {
                    await cloudSync.queueChange(change.tableName, change.operation, change.record, change.recordId);
                } catch (err) {
                    console.error('[RealTimeSync] Failed to drain pending change:', err.message);
                }
            }
        }

        const cloudSync = this.getCloudSync();
        return cloudSync.syncPendingChanges ? cloudSync.syncPendingChanges() : { synced: 0 };
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
            lastSyncTime: this.lastSyncTime
        };
    }

    /**
     * Force an immediate full sync via CloudSyncService
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
     * Stop all intervals
     */
    stop() {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
            this.networkCheckInterval = null;
        }
        console.log('[RealTimeSync] Stopped');
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
