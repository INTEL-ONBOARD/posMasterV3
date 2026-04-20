/**
 * Cloud Sync Service
 * Handles real-time synchronization between local SQLite and cloud MySQL
 *
 * Features:
 * - Pull-first-then-push strategy: Always pull incoming changes from cloud FIRST,
 *   then push local changes to cloud
 * - Real-time sync when online
 * - Offline queue for pending changes
 * - Auto-sync pending changes when internet is restored
 * - Network connectivity monitoring
 * - Version-based conflict resolution (newer timestamp wins)
 */

const { getDatabase } = require('../database/connection.cjs');
const {
    initializeMySQLPool,
    testConnection,
    executeQuery,
    closeMySQLPool
} = require('../database/mysql-connection.cjs');
const dns = require('dns');
const { nowISO } = require('../utils/helpers.cjs');
const SyncQueueRepository = require('../repositories/SyncQueueRepository.cjs');
const {
    broadcastDataChange,
    broadcastSyncStatus,
    broadcastConnectionStatus,
    broadcastSyncComplete,
    broadcastBatchChange,
    broadcastMultiTableChange,
    broadcastEvent
} = require('../utils/eventBroadcaster.cjs');

// Sync configuration
const NETWORK_CHECK_INTERVAL_MS = 2000; // Check network every 2 seconds
const PENDING_SYNC_INTERVAL_MS = 1000;  // Flush pending (offline) changes every 1 second

// Sync identity model:
// - `id` remains the primary key replicated to MySQL so existing foreign-key links keep working.
// - `cloud_id` is populated locally for cross-device identity and future migrations away from
//   integer-only PK replication.
// - BaseRepository also allocates sparse random integer IDs for synced tables to reduce
//   collision risk when multiple devices create records offline before a sync occurs.
const TABLES_TO_SYNC = [
    'users',
    'categories',
    'units_of_measurement',
    'branches',
    'suppliers',
    'items',
    'stock',
    'restock_transactions',
    'restock_items',
    'return_items',
    'members',
    'sales_transactions',
    'sales_items',
    'disposed_items',
    'offers_discounts',
    'returned_items',    // Customer return/refund records (migration 037)
    // NOTE: app_settings is intentionally NOT synced - it's device-specific
    'user_settings',
    'login_history',
    'active_sessions',  // For single-device enforcement across devices
    'payment_methods',  // Payment method configurations
    'tea_coop_members', // Tea Coop member data from external API
    'tea_coop_payments' // Tea Coop payment history from external API
];

// Tables that shouldn't sync (local only) - each device has its own settings
const LOCAL_ONLY_TABLES = ['sessions', 'sync_queue', 'migrations', 'price_change_history', 'app_settings', 'sync_metadata', 'audit_log'];

// Columns that exist ONLY in local SQLite and should NOT be synced to cloud MySQL
// These columns are either:
// 1. Added by local migrations that aren't in cloud schema (e.g., item_image_blob)
// 2. Virtual columns from JOINs that get added when fetching full details (e.g., sku, item_name, member, cashier)
// 3. Object/nested data that's embedded for convenience but shouldn't be synced as columns
const LOCAL_ONLY_COLUMNS = [
    // Binary/blob data stored locally for offline support
    'item_image_blob',

    // NOTE: 'sku', 'item_name', 'item_image_url' are REAL columns in the 'items' table
    // They should NOT be in this list! They are only "virtual" when JOINed into sales_items/restock_items
    // The filtering should be table-aware, not global. These are handled in TABLE_SPECIFIC_EXCLUSIONS below.

    // Nested objects that get embedded for convenience (not actual DB columns)
    'member',               // Embedded member object in sales
    'cashier',              // Embedded cashier object in sales
    'cashier_name',         // Computed from cashier.full_name or cashier.username in sales
    'items',                // Embedded items array in transactions
    'category',             // Embedded category object
    'uom',                  // Embedded unit of measurement object
    'inventory',            // Embedded inventory object
    'supplier',             // Embedded supplier object

    // Restock-specific virtual fields (from RestockRepository.getFullDetails)
    'added_items',          // Embedded array of restock items
    'return_items',         // Embedded array of return items
    'prepared_by_name',     // Resolved username from prepared_by ID
    'authorized_by_name',   // Resolved username from authorized_by ID
    'supplier_basic_info',  // JOINed supplier info

    // Other virtual/computed fields
    'uom_symbol',           // From JOINed uom data
    'uom_unit_name',        // From JOINed uom data
    'category_brand',       // From JOINed category data
    'category_type',        // From JOINed category data

    // Virtual member fields (computed from JOINs, not actual columns)
    'member_name',          // Computed from member.full_name in sales
    'member_type'           // Computed from member.member_type in sales
];

// Table-specific column exclusions (columns that are virtual/JOINed only for specific tables)
// These columns exist as real columns in some tables but are virtual JOINs in others
const TABLE_SPECIFIC_EXCLUSIONS = {
    // For sales_items, exclude JOINed item columns (from items table JOIN)
    'sales_items': ['sku', 'item_name', 'item_image_url'],
    // For restock_items, exclude JOINed item columns
    'restock_items': ['sku', 'item_name', 'item_image_url'],
    // For return_items, exclude JOINed item columns
    'return_items': ['sku', 'item_name', 'item_image_url']
};

// Tables that use "pull-first-then-push" strategy
// For these tables: Pull cloud updates to local FIRST, then push local changes to cloud
// This ensures we have the latest cloud data before pushing local changes.
const PULL_FIRST_TABLES = ['users', 'user_settings', 'items', 'stock'];

// Maximum retry attempts for failed sync operations
const MAX_RETRY_ATTEMPTS = 3;

const SL_UTC_OFFSET = '+05:30'; // Sri Lanka Standard Time (UTC+5:30)
const INCREMENTAL_SYNC_SKEW_MS = 10 * 1000; // 10-second clock-skew buffer for incremental pull

class CloudSyncService {
    constructor() {
        this.networkCheckInterval = null;
        this.pendingSyncInterval = null;
        this.activeSessionsPollInterval = null;  // Dedicated active_sessions poll (5s)
        this.incrementalPullInterval = null;      // Batched incremental pull for all tables (7s)
        this._pullTableIndex = 0;                 // Round-robin index for incremental pull batches
        this.isOnline = false;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncStatus = 'idle';
        this.syncError = null;
        this.autoSyncEnabled = false;
        this.pendingChanges = []; // Queue of changes to sync when online
        this.mysqlInitialized = false;
        this.wasOffline = false; // Track if we were offline before
        this.initialized = false;

        // Track pending changes by key to prevent duplicates; Map allows updating stale record data
        this._pendingChangeKeys = new Set();
        this._pendingChangeRecords = new Map(); // key -> latest record data

        // Track retry counts for failed operations
        this._retryCountMap = new Map();

        // Sync lock to prevent concurrent syncs
        this._syncLock = false;
        this._syncLockQueue = [];

        // Persistent queue repository - lazily initialized on first use after DB is ready
        this._syncQueueRepo = null;
    }

    /**
     * Get the sync queue repository, lazily initializing if DB is ready.
     * Returns null if DB is not yet available (changes are held in memory).
     */
    get syncQueueRepo() {
        if (!this._syncQueueRepo) {
            try {
                const db = getDatabase();
                if (db) {
                    this._syncQueueRepo = new SyncQueueRepository();
                }
            } catch (e) {
                // DB not ready yet
            }
        }
        return this._syncQueueRepo;
    }

    set syncQueueRepo(value) {
        this._syncQueueRepo = value;
    }

    /**
     * Clear all pending changes (call on user logout to prevent data leaks)
     */
    clearPendingChanges() {
        console.log('[CloudSyncService] Skipping memory wipe on logout ensuring offline queues endure device lifecycle blocks.');
        if (this.syncQueueRepo) {
            try {
                // Delete all completed records immediately
                this.syncQueueRepo.clearCompleted();
            } catch (err) {
                console.warn('[CloudSync] Failed to clean up completed DB queue records:', err.message);
            }
        }
    }

    /**
     * Recover pending changes from the DB queue on startup (crash recovery)
     * Reloads any unprocessed queue records into memory so they are not lost.
     */
    recoverPendingFromDB() {
        try {
            const pending = this.syncQueueRepo.getNextPending(10000);
            if (pending.length > 0) {
                const existingIds = new Set(this.pendingChanges.map(c => c.queueId).filter(Boolean));
                let recovered = 0;
                for (const r of pending) {
                    if (!existingIds.has(r.id)) {
                        this.pendingChanges.push({
                            tableName: r.entity_type,
                            operation: r.operation,
                            record: r.payload,
                            recordId: r.entity_id,
                            timestamp: r.created_at,
                            queueId: r.id
                        });
                        // Also update the deduplication key set
                        this._addPendingKey(r.entity_type, r.operation, r.entity_id);
                        // Seed the retry count map so existing retries are not forgotten
                        if (r.retry_count > 0) {
                            const key = `${r.entity_type}:${r.entity_id}`;
                            this._retryCountMap.set(key, r.retry_count);
                        }
                        recovered++;
                    }
                }
                if (recovered > 0) {
                    console.log(`[CloudSync] Recovered ${recovered} pending changes from DB queue`);
                }
            }
        } catch (err) {
            console.warn('[CloudSync] Failed to recover pending changes:', err.message);
        }
    }

    /**
     * Acquire sync lock with optional timeout
     * @param {number} timeout - Max time to wait in ms (default: 30000)
     * @returns {Promise<boolean>} Whether lock was acquired
     */
    async _acquireSyncLock(timeout = 30000) {
        if (!this._syncLock) {
            this._syncLock = true;
            return true;
        }

        // Wait for lock to be released
        return new Promise((resolve) => {
            // resolver must be declared BEFORE setTimeout so it's in scope for indexOf()
            let timeoutId;
            const resolver = () => {
                clearTimeout(timeoutId);
                this._syncLock = true;
                resolve(true);
            };

            timeoutId = setTimeout(() => {
                // Remove from queue and return false
                const idx = this._syncLockQueue.indexOf(resolver);
                if (idx >= 0) this._syncLockQueue.splice(idx, 1);
                resolve(false);
            }, timeout);

            this._syncLockQueue.push(resolver);
        });
    }

    /**
     * Release sync lock
     */
    _releaseSyncLock() {
        if (this._syncLockQueue.length > 0) {
            const nextResolver = this._syncLockQueue.shift();
            nextResolver();
        } else {
            this._syncLock = false;
        }
    }

    /**
     * Generate a unique key for a pending change (for deduplication)
     */
    _getChangeKey(tableName, operation, recordId) {
        return `${tableName}:${operation}:${recordId}`;
    }

    /**
     * Check if a change is already pending
     */
    _isChangePending(tableName, operation, recordId) {
        const key = this._getChangeKey(tableName, operation, recordId);
        return this._pendingChangeKeys.has(key);
    }

    /**
     * Add change key to pending set
     */
    _addPendingKey(tableName, operation, recordId) {
        const key = this._getChangeKey(tableName, operation, recordId);
        this._pendingChangeKeys.add(key);
    }

    /**
     * Remove change key from pending set
     */
    _removePendingKey(tableName, operation, recordId) {
        const key = this._getChangeKey(tableName, operation, recordId);
        this._pendingChangeKeys.delete(key);
        this._pendingChangeRecords.delete(key);
    }

    /**
     * Get retry count for a change
     */
    _getRetryCount(tableName, recordId) {
        const key = `${tableName}:${recordId}`;
        return this._retryCountMap.get(key) || 0;
    }

    /**
     * Increment retry count for a change
     * @returns {number} New retry count
     */
    _incrementRetryCount(tableName, recordId) {
        const key = `${tableName}:${recordId}`;
        const count = (this._retryCountMap.get(key) || 0) + 1;
        this._retryCountMap.set(key, count);
        return count;
    }

    /**
     * Reset retry count for a change
     */
    _resetRetryCount(tableName, recordId) {
        const key = `${tableName}:${recordId}`;
        this._retryCountMap.delete(key);
    }

    _getPendingCount() {
        return this.pendingChanges.length;
    }

    _getConnectionQuality() {
        if (!this.autoSyncEnabled) return 'disabled';
        if (!this.isOnline) return 'offline';
        if (!this.mysqlInitialized) return 'degraded';
        if (this.isSyncing) return 'syncing';
        return 'good';
    }

    _getStatusSnapshot() {
        const pendingCount = this._getPendingCount();
        return {
            isOnline: this.isOnline && this.mysqlInitialized,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            syncStatus: this.syncStatus,
            status: this.syncStatus,
            syncError: this.syncError,
            autoSyncEnabled: this.autoSyncEnabled,
            syncEnabled: this.autoSyncEnabled,
            pendingCount,
            pendingChangesCount: pendingCount,
            mysqlInitialized: this.mysqlInitialized,
            connectionQuality: this._getConnectionQuality()
        };
    }

    _broadcastStatus() {
        const snapshot = this._getStatusSnapshot();
        broadcastSyncStatus(snapshot);
        broadcastConnectionStatus({
            isOnline: snapshot.isOnline,
            quality: snapshot.connectionQuality,
            mysqlInitialized: snapshot.mysqlInitialized,
            lastCheck: nowISO()
        });
    }

    /**
     * Get the last pull timestamp for a table from sync_metadata
     * @param {string} tableName - The table name
     * @returns {string|null} ISO timestamp string or null if never pulled
     */
    _getLastPullAt(tableName) {
        try {
            const db = getDatabase();
            const row = db.prepare('SELECT last_pull_at FROM sync_metadata WHERE table_name = ?').get(tableName);
            return row?.last_pull_at ?? null;
        } catch (err) {
            console.warn('[CloudSync] Failed to get last pull time for', tableName, ':', err.message);
            return null;
        }
    }

    /**
     * Persist the last pull timestamp for a table into sync_metadata
     * @param {string} tableName - The table name
     * @param {string} isoTs - ISO 8601 timestamp string
     */
    _setLastPullAt(tableName, isoTs) {
        try {
            const db = getDatabase();
            db.prepare(`
                INSERT INTO sync_metadata (table_name, last_pull_at, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(table_name) DO UPDATE
                    SET last_pull_at = excluded.last_pull_at,
                        updated_at   = excluded.updated_at
            `).run(tableName, isoTs);
        } catch (err) {
            console.warn('[CloudSync] Failed to set last pull time for', tableName, ':', err.message);
        }
    }

    /**
     * Remove the sync_metadata row for a table so the next pull is a full fetch.
     * Used by performFullSync when the force option is set.
     * @param {string} tableName - The table whose metadata to clear
     */
    _clearSyncMetadataFor(tableName) {
        try {
            const db = getDatabase();
            db.prepare('DELETE FROM sync_metadata WHERE table_name = ?').run(tableName);
        } catch (err) {
            console.warn('[CloudSync] Could not clear sync_metadata for', tableName, ':', err.message);
        }
    }

    /**
     * Log a sync overwrite to the audit_log table for traceability.
     * Called before any sync overwrite (not just contested conflicts) so the losing
     * record is preserved. Errors are swallowed — conflict logging must never break sync.
     *
     * @param {Object} params
     * @param {string} params.tableName    - The table where the overwrite occurred
     * @param {*}      params.recordId     - The primary key value of the conflicting record
     * @param {Object} params.winner       - The record that won (will be kept)
     * @param {Object} params.loser        - The record that lost (will be overwritten)
     * @param {string} params.winnerSource - Either 'cloud' or 'local'
     */
    _logConflict({ tableName, recordId, winner, loser, winnerSource }) {
        try {
            const db = getDatabase();
            // Filter out local-only columns (blobs, sensitive data, virtual JOIN fields)
            // before storing records in the audit log
            const tableExclusions = TABLE_SPECIFIC_EXCLUSIONS[tableName] || [];
            const filterRecord = (record) => {
                if (!record) return record;
                const filtered = { ...record };
                for (const col of LOCAL_ONLY_COLUMNS) {
                    delete filtered[col];
                }
                for (const col of tableExclusions) {
                    delete filtered[col];
                }
                return filtered;
            };
            const filteredWinner = filterRecord(winner);
            const filteredLoser = filterRecord(loser);
            const loserSource = winnerSource === 'cloud' ? 'local' : 'cloud';
            db.prepare(`
                INSERT INTO audit_log
                    (table_name, record_id, action, old_values, new_values, changed_fields)
                VALUES (?, ?, 'UPDATE', ?, ?, ?)
            `).run(
                tableName,
                String(recordId),
                JSON.stringify({ source: loserSource, data: filteredLoser }),
                JSON.stringify({ source: winnerSource, data: filteredWinner }),
                'sync_overwrite'
            );
            console.log(`[CloudSync] Logged sync overwrite for ${tableName} record ${recordId} (${winnerSource} wins)`);
        } catch (err) {
            console.warn('[CloudSync] Failed to log sync conflict:', err.message);
        }
    }

    /**
     * Initialize the cloud sync service
     */
    async initialize() {
        if (this.initialized && this.autoSyncEnabled) {
            this._broadcastStatus();
            return this;
        }

        if (!this.autoSyncEnabled) {
            this.syncStatus = 'disabled';
            this._broadcastStatus();
            this.initialized = true;
            return this;
        }

        console.log('[CloudSync] Initializing real-time sync service...');

        // Check initial network status
        this.isOnline = await this.checkNetworkStatus();
        console.log(`[CloudSync] Initial network status: ${this.isOnline ? 'online' : 'offline'}`);

        if (this.isOnline) {
            // Pass skipPing=true since checkNetworkStatus() already confirmed connectivity
            await this.initializeMySQL(true);
        }

        // Start network monitoring
        this.startNetworkMonitoring();

        // Start pending sync interval
        this.startPendingSyncInterval();

        // Start active_sessions polling (single-device enforcement)
        this.startActiveSessionsPolling();

        // Start incremental pull loop (replaces RealTimeSyncService's parallel flood)
        this.startIncrementalPullLoop();

        // syncQueueRepo is lazily initialized via getter — force resolution now that DB is ready
        void this.syncQueueRepo;

        // Recover any pending changes that survived a crash/restart FIRST
        this.recoverPendingFromDB();

        // Then start full sync (fire-and-forget)
        if (this.isOnline && this.mysqlInitialized) {
            this.performFullSync().catch(err =>
                console.error('[CloudSync] Initial full sync failed:', err.message)
            );
        }

        this.syncStatus = this.isOnline && this.mysqlInitialized ? 'idle' : 'offline';
        this.initialized = true;
        this._broadcastStatus();

        return this;
    }

    /**
     * Initialize MySQL connection and schema
     * @param {boolean} skipPing - Skip the connection test if caller already confirmed connectivity
     */
    async initializeMySQL(skipPing = false) {
        if (this.mysqlInitialized) return true;

        try {
            console.log('[CloudSync] Initializing MySQL connection pool...');
            await initializeMySQLPool();

            let connected = skipPing;
            if (!skipPing) {
                console.log('[CloudSync] Testing MySQL connection...');
                connected = await testConnection();
            }

            if (connected) {
                console.log('[CloudSync] Connection successful, creating schema...');
                await this.createMySQLSchema();
                await this.cleanupGhostPendingRecords();
                this.mysqlInitialized = true;
                this.syncError = null;
                this.syncStatus = this.isSyncing ? this.syncStatus : 'idle';
                this._broadcastStatus();
                console.log('[CloudSync] MySQL initialized successfully');
                return true;
            } else {
                console.error('[CloudSync] MySQL connection test failed');
            }
        } catch (error) {
            console.error('[CloudSync] Failed to initialize MySQL:', error.message);
            console.error('[CloudSync] Full error:', error);
        }
        this.mysqlInitialized = false;
        this.syncError = 'MySQL initialization failed';
        this.syncStatus = this.autoSyncEnabled ? 'offline' : 'disabled';
        this._broadcastStatus();
        return false;
    }

    /**
     * Force recreate MySQL schema (can be called manually if tables are missing)
     * @returns {Promise<Object>} Result with status
     */
    async ensureMySQLSchema() {
        try {
            console.log('[CloudSync] Ensuring MySQL schema exists...');
            await initializeMySQLPool();

            const connected = await testConnection();
            if (!connected) {
                return { success: false, message: 'MySQL connection failed' };
            }

            await this.createMySQLSchema();
            this.mysqlInitialized = true;
            this.syncError = null;
            this._broadcastStatus();
            return { success: true, message: 'MySQL schema created/verified successfully' };
        } catch (error) {
            console.error('[CloudSync] Failed to ensure MySQL schema:', error.message);
            this.syncError = error.message;
            this._broadcastStatus();
            return { success: false, message: error.message };
        }
    }

    /**
     * Check network connectivity by pinging the MySQL server directly.
     * This is more reliable than DNS lookups (which test internet, not MySQL reachability).
     * Falls back to false on any error or if the check takes longer than 5 seconds.
     * @returns {Promise<boolean>}
     */
    async checkNetworkStatus() {
        try {
            const pingPromise = testConnection();
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 5000));
            return await Promise.race([pingPromise, timeoutPromise]);
        } catch {
            return false;
        }
    }

    /**
     * Start network monitoring interval
     */
    startNetworkMonitoring() {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
        }

        this.networkCheckInterval = setInterval(async () => {
            const wasOnline = this.isOnline;
            this.isOnline = await this.checkNetworkStatus();

            // Connection restored
            if (!wasOnline && this.isOnline) {
                console.log('[CloudSync] Internet connection restored!');
                this.wasOffline = true;
                this.syncStatus = 'reconnecting';
                this.syncError = null;
                this._broadcastStatus();

                // Initialize MySQL if not done
                if (!this.mysqlInitialized) {
                    await this.initializeMySQL();
                }

                // Sync all pending changes
                if (this.mysqlInitialized) {
                    await this.syncPendingChanges();
                }
            }

            // Connection lost
            if (wasOnline && !this.isOnline) {
                console.log('[CloudSync] Internet connection lost. Changes will be queued.');
                this.syncStatus = 'offline';
                this._broadcastStatus();
            }
        }, NETWORK_CHECK_INTERVAL_MS);

        console.log('[CloudSync] Network monitoring started');
    }

    /**
     * Start interval to sync pending changes
     */
    startPendingSyncInterval() {
        if (this.pendingSyncInterval) {
            clearInterval(this.pendingSyncInterval);
        }

        this.pendingSyncInterval = setInterval(async () => {
            if (this.isOnline && this.pendingChanges.length > 0 && !this.isSyncing) {
                await this.syncPendingChanges();
            }
        }, PENDING_SYNC_INTERVAL_MS);
    }

    /**
     * Queue a change for sync (called by repositories/services on data changes)
     * @param {string} tableName - The table that was modified
     * @param {string} operation - 'INSERT', 'UPDATE', or 'DELETE'
     * @param {object} record - The record data
     * @param {string|number} recordId - The record ID
     */
    async queueChange(tableName, operation, record, recordId) {
        // Skip local-only tables
        if (LOCAL_ONLY_TABLES.includes(tableName)) {
            return;
        }

        // Skip if table is not in sync list
        if (!TABLES_TO_SYNC.includes(tableName)) {
            return;
        }

        // Deduplication: if same table+operation+record is already pending, update
        // its record data with the latest snapshot so the most recent state is pushed.
        // Identify ONLY by table and recordId, allowing INSERT and UPDATE offline jumps to merge seamlessly.
        const pendingKeyInsert = this._getChangeKey(tableName, 'INSERT', recordId);
        const pendingKeyUpdate = this._getChangeKey(tableName, 'UPDATE', recordId);
        
        let existingKey = null;
        if (this._pendingChangeKeys.has(pendingKeyInsert)) existingKey = pendingKeyInsert;
        else if (this._pendingChangeKeys.has(pendingKeyUpdate)) existingKey = pendingKeyUpdate;
        else if (this._pendingChangeKeys.has(this._getChangeKey(tableName, operation, recordId))) existingKey = this._getChangeKey(tableName, operation, recordId);

        if (existingKey) {
            this._pendingChangeRecords.set(existingKey, record);
            const keyParts = existingKey.split(':');
            const origOp = keyParts[1];
            const existing = this.pendingChanges.find(
                c => c.tableName === tableName && c.operation === origOp && String(c.recordId) === String(recordId)
            );
            if (existing) existing.record = record;
            console.log(`[CloudSync] Updated pending record data: ${operation} merged into ${origOp} on ${tableName} (ID: ${recordId})`);
            // Update queue DB if applicable
            try {
                if (existing && existing.queueId && this.syncQueueRepo) {
                    this.syncQueueRepo.updatePayload(existing.queueId, record);
                }
            } catch (err) {}
            return;
        }

        const change = {
            tableName,
            operation,
            record,
            recordId,
            timestamp: nowISO()
        };

        // If online, sync immediately using pull-first-then-push strategy
        if (this.isOnline && this.mysqlInitialized) {
            // Mark as pending BEFORE the async call so concurrent identical changes
            // are deduplicated while the sync is in-flight
            this._addPendingKey(tableName, operation, recordId);
            try {
                // For PULL_FIRST_TABLES, pull the latest record from cloud first
                // This ensures we have the most recent version before pushing our changes
                if (PULL_FIRST_TABLES.includes(tableName)) {
                    console.log(`[CloudSync] Pull-first table ${tableName}: checking cloud for latest version first...`);
                    await this.pullSingleRecordFromCloud(tableName, recordId);
                }

                // Now push our local change to cloud
                await this.syncSingleChange(change);
                this._resetRetryCount(tableName, recordId); // Reset retry count on success
                this._removePendingKey(tableName, operation, recordId); // Clear pending key on success
                console.log(`[CloudSync] Real-time sync: ${operation} on ${tableName} (ID: ${recordId})`);
                this._broadcastStatus();
            } catch (error) {
                console.error(`[CloudSync] Real-time sync failed, queuing:`, error.message);
                // Key stays in _pendingChangeKeys; push change to queue for retry
                try {
                    const queuedItem = this.syncQueueRepo
                        ? this.syncQueueRepo.enqueue({
                            entity_type: tableName,
                            entity_id: String(recordId),
                            operation: operation,
                            payload: record
                        })
                        : null;
                    this.pendingChanges.push({ ...change, queueId: queuedItem ? queuedItem.id : undefined });
                } catch (queueErr) {
                    console.warn('[CloudSync] Failed to persist failed change to DB queue:', queueErr.message);
                    this.pendingChanges.push(change);
                }
                this.updateLocalSyncStatus(tableName, recordId, 'pending');
                this._broadcastStatus();
            }
        } else {
            // Offline - queue the change (with deduplication tracking)
            this._addPendingKey(tableName, operation, recordId);
            try {
                const queuedItem = this.syncQueueRepo
                    ? this.syncQueueRepo.enqueue({
                        entity_type: tableName,
                        entity_id: String(recordId),
                        operation: operation,
                        payload: record
                    })
                    : null;
                this.pendingChanges.push({ ...change, queueId: queuedItem ? queuedItem.id : undefined });
            } catch (queueErr) {
                console.warn('[CloudSync] Failed to persist offline change to DB queue:', queueErr.message);
                this.pendingChanges.push(change);
            }
            this.updateLocalSyncStatus(tableName, recordId, 'pending');
            console.log(`[CloudSync] Queued change: ${operation} on ${tableName} (ID: ${recordId}). Queue size: ${this.pendingChanges.length}`);
            this._broadcastStatus();
        }
    }

    /**
     * Update sync_status in local database
     */
    updateLocalSyncStatus(tableName, recordId, status) {
        try {
            const db = getDatabase();
            if (!db) return;

            const primaryKey = this.getPrimaryKeyColumn(tableName);

            // Check if table has sync_status and synced_at columns
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const hasSyncStatus = tableInfo.some(col => col.name === 'sync_status');
            const hasSyncedAt = tableInfo.some(col => col.name === 'synced_at');

            if (hasSyncStatus) {
                const now = nowISO();
                if (status === 'synced' && hasSyncedAt) {
                    db.prepare(`UPDATE ${tableName} SET sync_status = ?, synced_at = ? WHERE ${primaryKey} = ?`)
                        .run(status, now, recordId);
                } else {
                    db.prepare(`UPDATE ${tableName} SET sync_status = ? WHERE ${primaryKey} = ?`)
                        .run(status, recordId);
                }
            }
        } catch (error) {
            // Silently ignore - sync status is just for tracking
        }
    }

    /**
     * Sync a single change to MySQL
     * @param {object} change - The change to sync
     */
    async syncSingleChange(change) {
        const { tableName, operation, record, recordId } = change;

        if (operation === 'DELETE') {
            const primaryKey = this.getPrimaryKeyColumn(tableName);
            await executeQuery(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`, [recordId]);
        } else {
            // INSERT or UPDATE - use REPLACE INTO for upsert behavior
            // Filter out local-only columns that don't exist in cloud MySQL
            const tableExclusions = TABLE_SPECIFIC_EXCLUSIONS[tableName] || [];
            const allColumns = Object.keys(record);
            const columns = allColumns.filter(col =>
                !LOCAL_ONLY_COLUMNS.includes(col) && !tableExclusions.includes(col)
            );

            const values = columns.map(col => {
                const val = record[col];
                if (typeof val === 'boolean') return val ? 1 : 0;
                // For roles and other JSON fields, stringify arrays
                if (Array.isArray(val)) return JSON.stringify(val);
                // Serialize explicitly constructed Date objects from cache memory
                if (val instanceof Date) return val.toISOString();
                // Skip other objects (not arrays) - these are embedded data, not actual columns
                if (typeof val === 'object' && val !== null) return null;
                return val;
            });

            // Prevent strict blind overwrites of newer cloud records
            // Verify if cloud possesses a newer chronological timestamp.
            try {
                const cloudExisting = await executeQuery(`SELECT updated_at, created_at FROM ${tableName} WHERE ${primaryKey} = ?`, [recordId]);
                if (cloudExisting && cloudExisting.length > 0) {
                    const cloudRecord = cloudExisting[0];
                    const cloudTime = new Date(cloudRecord.updated_at || cloudRecord.created_at || 0).getTime();
                    const localTime = new Date(record.updated_at || record.created_at || 0).getTime();
                    
                    if (cloudTime > localTime && localTime > 0) {
                        console.warn(`[CloudSync] Sync pushed aborted: Cloud record for ${tableName}:${recordId} is newer. Discarding offline payload.`);
                        this._logConflict({
                            tableName,
                            recordId,
                            winner: cloudRecord,
                            loser: record,
                            winnerSource: 'cloud'
                        });
                        // Automatically flag success to dequeue local state, allow native pulls to override it later
                        this.updateLocalSyncStatus(tableName, recordId, 'synced');
                        return;
                    }
                }
            } catch (err) {}

            const placeholders = columns.map(() => '?').join(', ');

            // Tables that have FK children in MySQL — REPLACE INTO (DELETE+INSERT) would
            // cascade-delete child rows if MySQL FK is ON DELETE CASCADE.
            // Use INSERT ... ON DUPLICATE KEY UPDATE for all tables with FK children.
            const FK_PARENT_TABLES = [
                'users', 'items', 'members', 'suppliers', 'categories',
                'branches', 'units_of_measurement', 'payment_methods',
                'sales_transactions', 'restock_transactions'
            ];

            let query;
            if (FK_PARENT_TABLES.includes(tableName)) {
                const updateClauses = columns
                    .filter(col => col !== 'id')
                    .map(col => `${col} = VALUES(${col})`)
                    .join(', ');
                query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`;

                if (tableName === 'users') {
                    const rolesIndex = columns.indexOf('roles');
                    console.log(`[CloudSync] syncSingleChange pushing user: roles=${rolesIndex >= 0 ? values[rolesIndex] : 'NOT_IN_COLUMNS'}`);
                }
            } else {
                query = `REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
            }

            await executeQuery(query, values);

            // Mark cloud record as synced after successful push
            const primaryKey = this.getPrimaryKeyColumn(tableName);
            try {
                await executeQuery(
                    `UPDATE ${tableName} SET sync_status = 'synced' WHERE ${primaryKey} = ?`,
                    [recordId]
                );
            } catch (e) {
                // Non-fatal — cloud record may not have sync_status column
            }
        }

        // Update local sync status
        this.updateLocalSyncStatus(tableName, recordId, 'synced');
    }

    /**
     * Sync all pending changes
     */
    async syncPendingChanges() {
        if (this.pendingChanges.length === 0) {
            return { synced: 0, failed: 0, dropped: 0 };
        }

        // Use lock to prevent concurrent syncs
        const lockAcquired = await this._acquireSyncLock(5000);
        if (!lockAcquired) {
            return { status: 'skipped', reason: 'already_syncing' };
        }

        if (this.isSyncing) {
            this._releaseSyncLock();
            return { status: 'skipped', reason: 'already_syncing' };
        }

        this.isSyncing = true;
        this.syncStatus = 'syncing';
        this.syncError = null;
        this._broadcastStatus();
        console.log(`[CloudSync] Syncing ${this.pendingChanges.length} pending changes...`);

        let synced = 0;
        let failed = 0;
        let dropped = 0;
        const failedChanges = [];

        try {
            // Test connection first
            if (!await testConnection()) {
                this.isSyncing = false;
                this.syncStatus = 'connection_failed';
                this.syncError = 'Cloud database connection failed';
                this._broadcastStatus();
                this._releaseSyncLock();
                return { status: 'failed', reason: 'connection_failed' };
            }

            // Process each pending change using a snapshot copy to avoid data loss
            // if the app crashes mid-loop (shift() is destructive; this approach is safer)
            const workingChanges = [...this.pendingChanges];
            this.pendingChanges = []; // Clear original; failedChanges will be re-added at end

            for (const change of workingChanges) {
                const { tableName, operation, recordId } = change;

                // Remove from pending keys set
                this._removePendingKey(tableName, operation, recordId);

                // Check retry count
                const retryCount = this._getRetryCount(tableName, recordId);
                if (retryCount >= MAX_RETRY_ATTEMPTS) {
                    console.warn(`[CloudSync] Dropping change after ${MAX_RETRY_ATTEMPTS} failed attempts: ${operation} on ${tableName} (ID: ${recordId})`);
                    this._resetRetryCount(tableName, recordId);
                    this.updateLocalSyncStatus(tableName, recordId, 'failed');
                    if (change.queueId) {
                        try { this.syncQueueRepo.markFailed(change.queueId, 'Max retries exceeded'); } catch (e) { console.warn('[CloudSync] Failed to update sync queue record:', e.message); }
                    }
                    // Alert the UI so the user knows data was not saved to cloud
                    broadcastEvent('sync:drop-alert', {
                        tableName,
                        operation,
                        recordId,
                        attempts: MAX_RETRY_ATTEMPTS,
                        message: `Failed to sync ${operation} on ${tableName} (ID: ${recordId}) after ${MAX_RETRY_ATTEMPTS} attempts. Data saved locally but not synced to cloud.`
                    });
                    dropped++;
                    continue;
                }

                try {
                    await this.syncSingleChange(change);
                    this._resetRetryCount(tableName, recordId);
                    if (change.queueId) {
                        try { this.syncQueueRepo.markCompleted(change.queueId); } catch (e) { console.warn('[CloudSync] Failed to update sync queue record:', e.message); }
                    }
                    synced++;
                } catch (error) {
                    console.error(`[CloudSync] Failed to sync change (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}):`, error.message);
                    this._incrementRetryCount(tableName, recordId);
                    this._addPendingKey(tableName, operation, recordId);
                    if (change.queueId) {
                        try { this.syncQueueRepo.markFailed(change.queueId, error.message); } catch (e) { console.warn('[CloudSync] Failed to update sync queue record:', e.message); }
                    }
                    failedChanges.push(change);
                    failed++;
                }
            }

            // Re-queue failed changes (they will be retried next interval)
            // Any new changes added to pendingChanges during the loop are preserved
            this.pendingChanges = [...failedChanges, ...this.pendingChanges];

            this.lastSyncTime = nowISO();
            this.syncStatus = failed > 0 ? 'partial' : 'completed';
            this.syncError = failed > 0 ? `${failed} change(s) failed to sync` : null;
            this._broadcastStatus();

            console.log(`[CloudSync] Pending sync complete. Synced: ${synced}, Failed: ${failed}, Dropped: ${dropped}`);

            // If we were offline before, do a full sync to catch any missed data
            if (this.wasOffline && synced > 0) {
                this.wasOffline = false;
                this.performFullSync().catch(err =>
                    console.error('[CloudSync] Post-offline full sync failed:', err.message)
                );
            }

            return { synced, failed, dropped };
        } finally {
            this.isSyncing = false;
            this._broadcastStatus();
            this._releaseSyncLock();
        }
    }

    /**
     * Perform a full bidirectional sync of all tables
     * Uses version-based comparison (updated_at timestamp):
     * - If local is newer → push to cloud
     * - If cloud is newer → pull to local
     * - New records on either side get synced to the other
     */
    async performFullSync(options = {}) {
        // Use lock to prevent concurrent syncs
        const lockAcquired = await this._acquireSyncLock(10000);
        if (!lockAcquired) {
            return { status: 'skipped', reason: 'lock_timeout' };
        }

        if (this.isSyncing) {
            this._releaseSyncLock();
            return { status: 'skipped', reason: 'already_syncing' };
        }

        if (!this.isOnline) {
            this._releaseSyncLock();
            return { status: 'skipped', reason: 'offline' };
        }

        if (!await testConnection()) {
            this._releaseSyncLock();
            return { status: 'skipped', reason: 'connection_failed' };
        }

        this.isSyncing = true;
        this.syncStatus = 'full_sync';
        this.syncError = null;
        this._broadcastStatus();
        console.log('[CloudSync] Starting version-based bidirectional sync...');

        const startTime = Date.now();
        const results = { uploaded: 0, downloaded: 0, conflicts: 0, errors: [] };

        const totalTables = TABLES_TO_SYNC.length;
        let tableIndex = 0;

        const broadcastTableProgress = (tableName, downloaded, uploaded, hasError) => {
            broadcastEvent('sync:table-progress', {
                table: tableName,
                downloaded,
                uploaded,
                hasError,
                index: tableIndex,
                total: totalTables,
                totalDownloaded: results.downloaded,
                totalUploaded: results.uploaded
            });
        };

        try {
        // Step 1: Pull-first tables (users, user_settings) - Pull from cloud FIRST, then push local
        console.log('[CloudSync] Step 1: Syncing pull-first tables (pull from cloud first, then push local)...');
        for (const tableName of PULL_FIRST_TABLES) {
            tableIndex++;
            try {
                if (options.force) {
                    this._clearSyncMetadataFor(tableName);
                }

                const pullResult = await this.pullFromCloud(tableName);
                results.downloaded += pullResult.downloaded || 0;

                const pushResult = await this.syncTable(tableName);
                results.uploaded += pushResult.uploaded || 0;

                console.log(`[CloudSync] ${tableName}: Pulled ${pullResult.downloaded || 0}, Pushed ${pushResult.uploaded || 0}`);
                broadcastTableProgress(tableName, pullResult.downloaded || 0, pushResult.uploaded || 0, false);
            } catch (error) {
                console.error(`[CloudSync] Error syncing ${tableName}:`, error.message);
                results.errors.push({ table: tableName, error: error.message });
                broadcastTableProgress(tableName, 0, 0, true);
            }
        }

        // Step 2: Bidirectional sync for all other tables (version-based: pull first, then push)
        console.log('[CloudSync] Step 2: Bidirectional sync for other tables (pull first, then push)...');
        for (const tableName of TABLES_TO_SYNC) {
            if (PULL_FIRST_TABLES.includes(tableName)) continue;

            tableIndex++;
            try {
                if (options.force) {
                    this._clearSyncMetadataFor(tableName);
                }

                const syncResult = await this.bidirectionalSyncTable(tableName, false);
                results.uploaded += syncResult.pushed || 0;
                results.downloaded += syncResult.pulled || 0;
                results.conflicts += syncResult.conflicts || 0;

                broadcastTableProgress(tableName, syncResult.pulled || 0, syncResult.pushed || 0, false);
            } catch (error) {
                console.error(`[CloudSync] Error syncing ${tableName}:`, error.message);
                results.errors.push({ table: tableName, error: error.message });
                broadcastTableProgress(tableName, 0, 0, true);
            }
        }

        } finally {
            this.isSyncing = false;
            this._broadcastStatus();
            this._releaseSyncLock();
        }

        const duration = Date.now() - startTime;
        this.lastSyncTime = nowISO();
        this.syncStatus = 'completed';
        this.syncError = results.errors.length > 0 ? `${results.errors.length} table(s) failed to sync` : null;
        this._broadcastStatus();

        console.log(`[CloudSync] Bidirectional sync completed in ${duration}ms. Pushed: ${results.uploaded}, Pulled: ${results.downloaded}, Conflicts: ${results.conflicts}`);

        // Broadcast sync completion to update UI
        const totalRecordsUpdated = results.uploaded + results.downloaded;
        broadcastSyncComplete({
            success: results.errors.length === 0,
            tablesAffected: TABLES_TO_SYNC,
            recordsUpdated: totalRecordsUpdated,
            uploaded: results.uploaded,
            downloaded: results.downloaded,
            conflicts: results.conflicts,
            duration,
            errors: results.errors
        });

        // Notify user if sync encountered errors
        if (results.errors.length > 0) {
            try {
                const { getAppSettingsService } = require('./AppSettingsService.cjs');
                getAppSettingsService().sendNotification(
                    'Sync Warning',
                    `${results.errors.length} table(s) failed to sync. Changes saved locally.`,
                    { silent: false }
                );
            } catch (e) {
                // Notification failure is non-critical
            }
        }

        // If any records were downloaded, broadcast multi-table change to refresh UI
        // Exclude tables that are polled frequently to avoid constant UI refreshes
        if (results.downloaded > 0) {
            const noRefreshTables = ['active_sessions', 'users', 'user_settings'];
            // Build list of tables that had changes, excluding no-refresh tables
            const tableChanges = TABLES_TO_SYNC
                .filter(table => !noRefreshTables.includes(table))
                .map(table => ({
                    table,
                    count: Math.ceil(results.downloaded / TABLES_TO_SYNC.length) // Approximate distribution
                }));
            if (tableChanges.length > 0) {
                broadcastMultiTableChange(tableChanges);
            }
        }

        return { status: 'success', duration, ...results };
    }

    /**
     * Bidirectional sync for a single table using version comparison
     * Strategy: Pull from cloud first (newer cloud records update local),
     * then push local records to cloud (newer local records update cloud)
     * @param {string} tableName - Table to sync
     * @param {boolean} localPriority - If true, local always wins (deprecated, kept for compatibility)
     */
    async bidirectionalSyncTable(tableName, localPriority = false) {
        const db = getDatabase();
        if (!db) throw new Error('Local database not initialized');

        const result = { pushed: 0, pulled: 0, conflicts: 0, skipped: 0 };
        const primaryKey = this.getPrimaryKeyColumn(tableName);

        try {
            // Note: Foreign keys are NO LONGER disabled globally across this async function.
            // Synchronous foreign key checks are managed intimately inside pullRecordToLocal
            // ensuring other offline interactions don't accidentally bypass restrictions!

            // Get table info upfront for column filtering
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const localColumnsInfo = tableInfo.map(col => col.name);
            const hasSyncStatus = localColumnsInfo.includes('sync_status');
            const hasUpdatedAt = localColumnsInfo.includes('updated_at');

            // Only fetch local records that need pushing (pending) to avoid loading entire table
            const localQuery = hasSyncStatus
                ? `SELECT * FROM ${tableName} WHERE sync_status = 'pending' OR sync_status IS NULL`
                : `SELECT * FROM ${tableName}`;
            const localRecords = db.prepare(localQuery).all();
            const localMap = new Map();
            for (const record of localRecords) {
                localMap.set(String(record[primaryKey]), record);
            }
            console.log(`[CloudSync] ${tableName}: Found ${localRecords.length} local pending records`);

            // Only fetch cloud records changed since last sync to avoid loading entire table
            const lastPull = hasUpdatedAt ? this._getLastPullAt(tableName) : null;
            const sinceTs = (hasUpdatedAt && lastPull)
                ? new Date(new Date(lastPull + 'Z').getTime() - INCREMENTAL_SYNC_SKEW_MS)
                    .toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
                : null;

            let cloudRecords = [];
            try {
                const cloudQuery = sinceTs
                    ? `SELECT * FROM ${tableName} WHERE updated_at > ?`
                    : `SELECT * FROM ${tableName}`;
                const cloudParams = sinceTs ? [sinceTs] : [];
                cloudRecords = await executeQuery(cloudQuery, cloudParams) || [];
                console.log(`[CloudSync] ${tableName}: Found ${cloudRecords.length} cloud records${sinceTs ? ` since ${sinceTs}` : ''}`);
            } catch (error) {
                // Table might not exist in cloud yet
                console.log(`[CloudSync] Cloud table ${tableName} may not exist, pushing all local records. Error: ${error.message}`);
            }

            const cloudMap = new Map();
            for (const record of cloudRecords) {
                cloudMap.set(String(record[primaryKey]), record);
            }

            // Use column info already gathered above
            const localColumns = localColumnsInfo;
            const hasCreatedAt = localColumnsInfo.includes('created_at');

            // Process all unique IDs from both local and cloud
            const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);

            // PULL-FIRST-THEN-PUSH STRATEGY:
            // Step 1: First, pull all cloud-only records and newer cloud records to local
            // Step 2: Then, push all local-only records and newer local records to cloud

            // Step 1: PULL - Process cloud records first (pull from cloud)
            for (const id of allIds) {
                const localRecord = localMap.get(id);
                const cloudRecord = cloudMap.get(id);

                try {
                    if (!localRecord && cloudRecord) {
                        // Record exists only in cloud → Pull to local (skip individual broadcast, batch later)
                        await this.pullRecordToLocal(tableName, cloudRecord, localColumns, primaryKey, true);
                        result.pulled++;
                    } else if (localRecord && cloudRecord) {
                        // Record exists in both - compare versions
                        const syncDecision = this.compareVersions(localRecord, cloudRecord, hasUpdatedAt, hasCreatedAt, localPriority);

                        if (syncDecision === 'pull') {
                            // Cloud is newer → Pull to local FIRST (skip individual broadcast, batch later)
                            this._logConflict({
                                tableName,
                                recordId: cloudRecord[primaryKey],
                                winner: cloudRecord,
                                loser: localRecord,
                                winnerSource: 'cloud'
                            });
                            await this.pullRecordToLocal(tableName, cloudRecord, localColumns, primaryKey, true);
                            result.pulled++;
                        }
                    }
                } catch (error) {
                    console.error(`[CloudSync] Error pulling record ${id} in ${tableName}:`, error.message);
                    result.conflicts++;
                }
            }

            // Step 2: PUSH - Process local records (push to cloud)
            for (const id of allIds) {
                const localRecord = localMap.get(id);
                const cloudRecord = cloudMap.get(id);

                try {
                    if (localRecord && !cloudRecord) {
                        // Record exists only locally → Push to cloud
                        await this.pushRecordToCloud(tableName, localRecord, localColumns);
                        this.updateLocalSyncStatus(tableName, id, 'synced');
                        result.pushed++;
                    } else if (localRecord && cloudRecord) {
                        // Record exists in both - compare versions
                        const syncDecision = this.compareVersions(localRecord, cloudRecord, hasUpdatedAt, hasCreatedAt, localPriority);

                        if (syncDecision === 'push') {
                            // Local is newer → Push to cloud
                            this._logConflict({
                                tableName,
                                recordId: localRecord[primaryKey],
                                winner: localRecord,
                                loser: cloudRecord,
                                winnerSource: 'local'
                            });
                            await this.pushRecordToCloud(tableName, localRecord, localColumns);
                            this.updateLocalSyncStatus(tableName, id, 'synced');
                            result.pushed++;
                        } else if (syncDecision === 'skip') {
                            // Same version, skip — but mark local as synced if still pending
                            if (localRecord.sync_status === 'pending') {
                                this.updateLocalSyncStatus(tableName, id, 'synced');
                            }
                            result.skipped++;
                        }
                    }
                } catch (error) {
                    console.error(`[CloudSync] Error pushing record ${id} in ${tableName}:`, error.message);
                    result.conflicts++;
                }
            }

            console.log(`[CloudSync] ${tableName}: pushed=${result.pushed}, pulled=${result.pulled}, skipped=${result.skipped}`);

            // Broadcast a SINGLE batch update for all pulled records (instead of N individual broadcasts)
            // Skip frequently-polled tables to avoid UI refresh storms
            const noRefreshTables = ['active_sessions', 'users', 'user_settings'];
            if (result.pulled > 0 && !noRefreshTables.includes(tableName)) {
                broadcastBatchChange(tableName, result.pulled, 'SYNC_PULL');
            }

            return result;
        } catch (error) {
            console.error(`[CloudSync] Failed bidirectional sync for ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Compare versions of local and cloud records
     * @returns 'push' | 'pull' | 'skip'
     */
    compareVersions(localRecord, cloudRecord, hasUpdatedAt, hasCreatedAt, localPriority) {
        // If local priority is set (push-first tables), always push local
        if (localPriority) {
            return 'push';
        }

        // First, check if the actual data content is the same (ignoring timestamps and sync fields)
        // This prevents unnecessary updates when data hasn't actually changed
        if (this.areRecordsEquivalent(localRecord, cloudRecord)) {
            return 'skip';
        }

        // Get timestamps for comparison
        let localTime = null;
        let cloudTime = null;

        if (hasUpdatedAt) {
            localTime = localRecord.updated_at ? new Date(localRecord.updated_at).getTime() : 0;
            cloudTime = cloudRecord.updated_at ? new Date(cloudRecord.updated_at).getTime() : 0;
        } else if (hasCreatedAt) {
            localTime = localRecord.created_at ? new Date(localRecord.created_at).getTime() : 0;
            cloudTime = cloudRecord.created_at ? new Date(cloudRecord.created_at).getTime() : 0;
        }

        // If we can't determine timestamps, push local (local wins as fallback)
        if (localTime === null || cloudTime === null) {
            return 'push';
        }

        // Compare timestamps - newer wins
        if (localTime > cloudTime) {
            return 'push';
        } else if (cloudTime > localTime) {
            return 'pull';
        } else {
            return 'skip'; // Same timestamp, no sync needed
        }
    }

    /**
     * Compare if two records have equivalent data content
     * Ignores metadata fields like timestamps, sync_status, etc.
     * @returns {boolean} True if records are equivalent (no sync needed)
     */
    areRecordsEquivalent(localRecord, cloudRecord) {
        // Fields to ignore when comparing record content
        const ignoreFields = [
            'updated_at', 'created_at', 'synced_at', 'last_fetched_at',
            'sync_status', 'is_synced', 'last_sync_at',
            // Embedded objects that aren't actual DB columns
            'member', 'cashier', 'cashier_name', 'items', 'category', 'uom', 'inventory', 'supplier',
            'added_items', 'return_items', 'prepared_by_name', 'authorized_by_name',
            'supplier_basic_info', 'uom_symbol', 'uom_unit_name', 'category_brand', 'category_type',
            'member_name', 'member_type'
        ];

        // Get all keys from both records
        const allKeys = new Set([
            ...Object.keys(localRecord || {}),
            ...Object.keys(cloudRecord || {})
        ]);

        for (const key of allKeys) {
            // Skip ignored fields
            if (ignoreFields.includes(key)) continue;

            const localVal = localRecord?.[key];
            const cloudVal = cloudRecord?.[key];

            // Normalize values for comparison
            const normalizedLocal = this.normalizeValueForComparison(localVal);
            const normalizedCloud = this.normalizeValueForComparison(cloudVal);

            if (normalizedLocal !== normalizedCloud) {
                return false; // Records are different
            }
        }

        return true; // All compared fields are equivalent
    }

    /**
     * Normalize a value for comparison purposes
     * Handles nulls, empty strings, booleans, numbers, etc.
     */
    normalizeValueForComparison(val) {
        // Treat null, undefined, and empty string as equivalent
        if (val === null || val === undefined || val === '') {
            return null;
        }

        // Convert booleans to 0/1 for comparison with MySQL tinyint
        if (typeof val === 'boolean') {
            return val ? 1 : 0;
        }

        // Stringify objects/arrays for comparison
        if (typeof val === 'object') {
            return JSON.stringify(val);
        }

        // Convert numbers stored as strings
        if (typeof val === 'string' && !isNaN(val) && val.trim() !== '') {
            const num = parseFloat(val);
            // Only convert if it's a clean numeric string
            if (String(num) === val.trim()) {
                return num;
            }
        }

        return val;
    }

    /**
     * Push a single record to cloud
     * Filters out local-only columns that don't exist in the cloud database
     * IMPORTANT: Ensures roles field is always properly set for users
     */
    async pushRecordToCloud(tableName, record, columns) {
        // Filter out local-only columns using the module-level constant
        // Also filter out table-specific exclusions (e.g., sku/item_name are virtual JOINs in sales_items but real in items)
        const tableExclusions = TABLE_SPECIFIC_EXCLUSIONS[tableName] || [];
        const syncColumns = columns.filter(col =>
            !LOCAL_ONLY_COLUMNS.includes(col) && !tableExclusions.includes(col)
        );

        const values = syncColumns.map(col => {
            let val = record[col];

            // For users table, ensure roles is always a valid JSON string
            if (tableName === 'users' && col === 'roles') {
                if (!val || val === '' || val === 'null' || val === '[]') {
                    // If no roles, set default based on username
                    // Use '["cashier"]' to match the pull-from-cloud default (prevents role drift)
                    val = record.username === 'admin' ? '["admin"]' : '["cashier"]';
                    console.log(`[CloudSync] pushRecordToCloud: Setting default roles for ${record.username}: ${val}`);
                } else if (typeof val === 'object' && Array.isArray(val)) {
                    // If it's an array, stringify it
                    val = JSON.stringify(val);
                }
                // Ensure it's a valid JSON string
                try {
                    JSON.parse(val);
                } catch (e) {
                    val = record.username === 'admin' ? '["admin"]' : '["cashier"]';
                }
                return val;
            }

            if (typeof val === 'boolean') return val ? 1 : 0;
            // Skip objects/arrays - these are embedded data, not actual columns
            if (typeof val === 'object' && val !== null) return null;
            return val;
        });

        const placeholders = syncColumns.map(() => '?').join(', ');

        try {
            // First, check if record exists by ID
            const existingRecord = await executeQuery(
                `SELECT id FROM ${tableName} WHERE id = ?`,
                [record.id]
            );

            let result;
            let action;

            if (existingRecord && existingRecord.length > 0) {
                // Record exists - UPDATE it
                const updateClauses = syncColumns
                    .filter(col => col !== 'id')
                    .map(col => `${col} = ?`)
                    .join(', ');
                const updateValues = syncColumns
                    .filter(col => col !== 'id')
                    .map((col, idx) => {
                        const colIndex = syncColumns.indexOf(col);
                        return values[colIndex];
                    });
                updateValues.push(record.id); // Add id for WHERE clause

                result = await executeQuery(
                    `UPDATE ${tableName} SET ${updateClauses} WHERE id = ?`,
                    updateValues
                );
                action = 'updated';
            } else {
                // Record doesn't exist - INSERT with explicit ID
                result = await executeQuery(
                    `INSERT INTO ${tableName} (${syncColumns.join(', ')}) VALUES (${placeholders})`,
                    values
                );
                action = 'inserted';
            }

            // Only log for non-tea_coop tables or for inserts (reduce log noise for bulk syncs)
            if (!tableName.startsWith('tea_coop_') || action === 'inserted') {
                console.log(`[CloudSync] Pushed record to cloud: ${tableName} (ID: ${record.id}, SKU: ${record.sku || 'N/A'}, action: ${action})`);
            }

            // Mark cloud record as synced (if table has sync_status column)
            try {
                await executeQuery(
                    `UPDATE ${tableName} SET sync_status = 'synced' WHERE id = ?`,
                    [record.id]
                );
            } catch (statusErr) {
                // Non-fatal — table may not have sync_status column (e.g. sales_items before migration)
                console.warn(`[CloudSync] Could not update cloud sync_status for ${tableName} ${record.id}:`, statusErr.message);
            }
        } catch (err) {
            console.error(`[CloudSync] Failed to push record to ${tableName}:`, err.message);
            console.error(`[CloudSync] Record ID: ${record.id}, SKU: ${record.sku || 'N/A'}`);
            throw err;
        }
    }

    /**
     * Pull a single record from cloud to local
     * Optionally broadcasts data change event to update UI immediately
     * IMPORTANT: Preserves critical fields like 'roles' if cloud has empty/null values
     * @param {boolean} skipBroadcast - If true, don't broadcast (caller will batch broadcasts)
     */
    async pullRecordToLocal(tableName, cloudRecord, localColumns, primaryKey, skipBroadcast = false) {
        const db = getDatabase();
        if (!db) return;

        const columns = Object.keys(cloudRecord);
        const commonColumns = columns.filter(col => localColumns.includes(col));

        // For users table, ALWAYS preserve local roles (local is source of truth for roles)
        let preserveLocalRoles = false;
        let localRoles = null;
        if (tableName === 'users') {
            const cloudRoles = cloudRecord.roles;
            const cloudRolesValid = cloudRoles && cloudRoles !== '' && cloudRoles !== 'null' && cloudRoles !== '[]';

            // Check if local has valid roles - always prefer local over cloud
            const localRecord = db.prepare(`SELECT roles FROM users WHERE ${primaryKey} = ?`).get(cloudRecord[primaryKey]);
            if (localRecord && localRecord.roles) {
                try {
                    const parsedLocalRoles = JSON.parse(localRecord.roles);
                    if (Array.isArray(parsedLocalRoles) && parsedLocalRoles.length > 0) {
                        preserveLocalRoles = true;
                        localRoles = localRecord.roles;
                    }
                } catch (e) {
                    // Invalid JSON, don't preserve
                }
            }

            // If neither has valid roles, set default
            if (!preserveLocalRoles && !cloudRolesValid) {
                localRoles = cloudRecord.username === 'admin' ? '["admin"]' : '["cashier"]';
                preserveLocalRoles = true;
                console.log(`[CloudSync] Setting default roles for user ${cloudRecord.username}: ${localRoles}`);
            }
        }

        const values = commonColumns.map(col => {
            const val = cloudRecord[col];

            // Preserve local roles if cloud has empty roles
            if (tableName === 'users' && col === 'roles' && preserveLocalRoles) {
                return localRoles;
            }

            if (val === null || val === undefined) return null;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return val.toISOString();
            return val;
        });

        const placeholders = commonColumns.map(() => '?').join(', ');
        const updateSet = commonColumns
            .filter(col => col !== primaryKey)
            .map(col => `${col} = excluded.${col}`)
            .join(', ');

        // Check if record exists locally to determine if it's INSERT or UPDATE
        const existingRecord = db.prepare(`SELECT 1 FROM ${tableName} WHERE ${primaryKey} = ?`).get(cloudRecord[primaryKey]);
        const operation = existingRecord ? 'UPDATE' : 'INSERT';

        // For items table, handle UNIQUE constraint on sku by using OR REPLACE
        // This ensures cloud records can overwrite local records with same sku but different id
        let query;
        if (tableName === 'items') {
            // Use INSERT OR REPLACE to handle both id and sku conflicts
            query = `
                INSERT OR REPLACE INTO ${tableName} (${commonColumns.join(', ')})
                VALUES (${placeholders})
            `;
        } else {
            query = `
                INSERT INTO ${tableName} (${commonColumns.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT(${primaryKey}) DO UPDATE SET ${updateSet}
            `;
        }

        // Toggle SQLite Connection level foreign keys specifically around the synchronous execution context
        // This natively prevents 'ON DELETE CASCADE' wiping histories during network pulls.
        const wasFkOn = db.pragma('foreign_keys', { simple: true });
        if (wasFkOn) db.pragma('foreign_keys = OFF');
        try {
            db.prepare(query).run(...values);
        } finally {
            if (wasFkOn) db.pragma('foreign_keys = ON');
        }

        // Broadcast data change to update UI immediately (unless caller is batching broadcasts)
        if (!skipBroadcast) {
            broadcastDataChange(tableName, operation, cloudRecord[primaryKey], cloudRecord);
        }
    }

    /**
     * Pull a single record from cloud by ID (for real-time pull-first sync)
     * @param {string} tableName - Table to pull from
     * @param {string|number} recordId - Record ID to pull
     */
    async pullSingleRecordFromCloud(tableName, recordId) {
        const db = getDatabase();
        if (!db) return;

        const primaryKey = this.getPrimaryKeyColumn(tableName);

        try {
            // Get the specific record from cloud
            const cloudRecords = await executeQuery(
                `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
                [recordId]
            );

            if (!cloudRecords || cloudRecords.length === 0) {
                // Record doesn't exist in cloud yet, nothing to pull
                return;
            }

            const cloudRecord = cloudRecords[0];

            // Get local table info
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const localColumns = tableInfo.map(col => col.name);

            // Pull the record to local
            await this.pullRecordToLocal(tableName, cloudRecord, localColumns, primaryKey);
            console.log(`[CloudSync] Pulled latest version of ${tableName} record ${recordId} from cloud`);
        } catch (error) {
            // If table doesn't exist in cloud or other error, just log and continue
            console.log(`[CloudSync] Could not pull ${tableName} record ${recordId} from cloud:`, error.message);
        }
    }

    /**
     * Pull records from cloud to local (for cloud-primary tables like users)
     * @param {string} tableName - Table to pull from cloud
     */
    async pullFromCloud(tableName, { skipFkPragma = false } = {}) {
        const db = getDatabase();
        if (!db) throw new Error('Local database not initialized');

        const result = { downloaded: 0, actuallyChanged: 0 };

        try {
            // Foreign keys are locally managed via pullRecordToLocal now.

            // Check local table schema upfront (needed for incremental logic and column filtering)
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const localColumns = tableInfo.map(col => col.name);
            const hasUpdatedAt = localColumns.includes('updated_at');

            // Incremental pull: only fetch rows changed since the last pull
            // Only applicable for tables that have an updated_at column.
            // Tables like login_history and audit_log lack updated_at, so we always
            // do a full SELECT * for them (and skip writing to sync_metadata since
            // there is no timestamp to filter on next time).
            const lastPull = hasUpdatedAt ? this._getLastPullAt(tableName) : null;
            // pullStart is stored as UTC (YYYY-MM-DD HH:mm:ss) — MySQL DATETIME columns are UTC.
            const pullStart = nowISO().replace('T', ' ').replace(/\.\d+Z$/, '');
            // lastPull is stored as UTC. Subtract skew buffer to tolerate minor clock drift.
            // The resulting sinceTs is also UTC, matching MySQL DATETIME storage.
            const sinceTs = (hasUpdatedAt && lastPull)
                ? new Date(new Date(lastPull + 'Z').getTime() - INCREMENTAL_SYNC_SKEW_MS)
                    .toISOString()
                    .replace('T', ' ')
                    .replace(/\.\d+Z$/, '')
                : null;

            // Build the query conditionally
            let query, queryParams;
            if (sinceTs) {
                // hasUpdatedAt is true here (sinceTs is only set when hasUpdatedAt && lastPull)
                query = `SELECT * FROM ${tableName} WHERE updated_at > ?`;
                queryParams = [sinceTs];
            } else {
                query = `SELECT * FROM ${tableName}`;
                queryParams = [];
            }
            const cloudRecords = await executeQuery(query, queryParams);
            if (!cloudRecords || cloudRecords.length === 0) {
                console.log(`[CloudSync] No records in cloud ${tableName}${sinceTs ? ` since ${sinceTs}` : ''}`);
                if (hasUpdatedAt) {
                    this._setLastPullAt(tableName, pullStart);
                }
                return result;
            }

            const columns = Object.keys(cloudRecords[0]);
            const primaryKey = this.getPrimaryKeyColumn(tableName);

            // Filter to only columns that exist in both cloud and local
            const commonColumns = columns.filter(col => localColumns.includes(col));

            for (const record of cloudRecords) {
                try {
                    // SPECIAL HANDLING FOR active_sessions:
                    // Use user_id as the unique key, not id
                    // This ensures only one session record per user exists locally
                    if (tableName === 'active_sessions' && record.user_id) {
                        // Check if the existing record is actually different
                        const existingSession = db.prepare(`SELECT * FROM ${tableName} WHERE user_id = ?`).get(record.user_id);

                        let sessionChanged = !existingSession; // New record = changed

                        if (existingSession && !sessionChanged) {
                            // If local record is newer than cloud record, local wins — don't overwrite.
                            // This prevents the race condition where a fresh login record gets overwritten
                            // by a stale cloud record before the login's own push to cloud completes.
                            // A 5-second grace window is used instead of strict > to tolerate minor
                            // clock skew between POS machines (common without NTP enforcement).
                            if (existingSession.updated_at && record.updated_at) {
                                const localTime = new Date(existingSession.updated_at).getTime();
                                const cloudTime = new Date(record.updated_at).getTime();
                                const CLOCK_SKEW_GRACE_MS = 5000;
                                if (localTime > cloudTime - CLOCK_SKEW_GRACE_MS) {
                                    result.downloaded++;
                                    continue;
                                }
                            }

                            // Compare key fields to detect actual changes
                            // Use session_token_hash (the actual column name), not session_id which doesn't exist
                            if (existingSession.device_id !== record.device_id ||
                                existingSession.session_token_hash !== record.session_token_hash ||
                                existingSession.is_active !== (record.is_active ? 1 : 0)) {
                                sessionChanged = true;
                            }
                        }

                        // Only update if there's an actual change
                        if (sessionChanged) {
                            // Delete any existing local record for this user first
                            db.prepare(`DELETE FROM ${tableName} WHERE user_id = ?`).run(record.user_id);

                            // Build insert values (excluding 'id' to let SQLite auto-generate)
                            const insertColumns = commonColumns.filter(col => col !== 'id');
                            const insertValues = insertColumns.map(col => {
                                const val = record[col];
                                if (val === null || val === undefined) return null;
                                if (typeof val === 'boolean') return val ? 1 : 0;
                                if (val instanceof Date) return val.toISOString();
                                return val;
                            });

                            const placeholders = insertColumns.map(() => '?').join(', ');
                            const insertQuery = `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`;
                            db.prepare(insertQuery).run(...insertValues);

                            console.log(`[CloudSync] Updated active_sessions for user ${record.user_id} with device ${record.device_id}`);
                            result.actuallyChanged++;
                        }

                        result.downloaded++;
                        continue;
                    }

                    // Check if local record exists and compare data to see if it actually changed
                    const existingRecord = db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`).get(record[primaryKey]);
                    let recordChanged = !existingRecord; // New record = changed

                    // If local record has pending unsent changes, verify if the cloud change natively overrides it through timestamps.
                    if (existingRecord && existingRecord.sync_status === 'pending') {
                        const cloudTime = new Date(record.updated_at || record.created_at || 0).getTime();
                        const localTime = new Date(existingRecord.updated_at || existingRecord.created_at || 0).getTime();

                        if (cloudTime > localTime && cloudTime > 0) {
                            console.log(`[CloudSync] Conflict resolved: Cloud record ${record[primaryKey]} in ${tableName} is newer. Overwriting local pending change.`);
                            this._logConflict({
                                tableName,
                                recordId: record[primaryKey],
                                winner: record,
                                loser: existingRecord,
                                winnerSource: 'cloud'
                            });
                            // Cancel matching native push queries
                            this._removePendingKey(tableName, 'UPDATE', record[primaryKey]);
                            this._removePendingKey(tableName, 'INSERT', record[primaryKey]);
                            recordChanged = true;
                        } else {
                            // Local remains newer, skip download overlap
                            result.downloaded++;
                            continue;
                        }
                    }

                    // If local record doesn't exist, it might have been intentionally deleted locally offline.
                    // Don't re-insert from cloud — the pending DELETE will clean cloud on the next sync phase.
                    if (!existingRecord) {
                        const pendingDelete = this._isChangePending(tableName, 'DELETE', record[primaryKey]);
                        if (pendingDelete) {
                            console.log(`[CloudSync] Skipping cloud re-insert for locally deleted entity: ${tableName} / ${record[primaryKey]}`);
                            result.downloaded++;
                            continue;
                        }
                    }

                    // For users table, handle roles carefully:
                    // 1. If cloud roles is NULL/empty and local has valid roles -> preserve local
                    // 2. If cloud roles is valid and local has valid roles -> prefer local (local is truth)
                    // 3. If neither has valid roles -> set default based on username
                    let preserveLocalRoles = false;
                    let localRoles = null;
                    if (tableName === 'users') {
                        const cloudRoles = record.roles;
                        const cloudRolesValid = cloudRoles && cloudRoles !== '' && cloudRoles !== 'null' && cloudRoles !== '[]';

                        // Check if local has valid roles
                        if (existingRecord && existingRecord.roles) {
                            try {
                                const parsedLocalRoles = JSON.parse(existingRecord.roles);
                                if (Array.isArray(parsedLocalRoles) && parsedLocalRoles.length > 0) {
                                    preserveLocalRoles = true;
                                    localRoles = existingRecord.roles;
                                }
                            } catch (e) {
                                // Invalid JSON, don't preserve
                            }
                        }

                        // If neither cloud nor local has valid roles, set default
                        if (!preserveLocalRoles && !cloudRolesValid) {
                            localRoles = record.username === 'admin' ? '["admin"]' : '["cashier"]';
                            preserveLocalRoles = true;
                        }
                    }

                    // Build upsert query for SQLite
                    const values = commonColumns.map(col => {
                        const val = record[col];

                        // Preserve local roles if cloud has empty roles
                        if (tableName === 'users' && col === 'roles' && preserveLocalRoles) {
                            return localRoles;
                        }

                        if (val === null || val === undefined) return null;
                        if (typeof val === 'boolean') return val ? 1 : 0;
                        // Handle MySQL date objects
                        if (val instanceof Date) return val.toISOString();
                        return val;
                    });

                    // Compare existing record with new values to detect actual changes
                    if (existingRecord && !recordChanged) {
                        for (let i = 0; i < commonColumns.length; i++) {
                            const col = commonColumns[i];
                            const newVal = values[i];
                            let oldVal = existingRecord[col];

                            // Normalize values for comparison
                            if (oldVal === undefined) oldVal = null;
                            if (typeof oldVal === 'boolean') oldVal = oldVal ? 1 : 0;

                            // Skip updated_at and synced_at columns for change detection
                            if (col === 'updated_at' || col === 'synced_at' || col === 'sync_status') continue;

                            // Compare as strings to handle type differences
                            if (String(newVal) !== String(oldVal)) {
                                recordChanged = true;
                                break;
                            }
                        }
                    }

                    const placeholders = commonColumns.map(() => '?').join(', ');
                    const updateSet = commonColumns
                        .filter(col => col !== primaryKey)
                        .map(col => `${col} = excluded.${col}`)
                        .join(', ');

                    // For items table, use INSERT OR REPLACE to handle UNIQUE constraint on sku
                    let query;
                    if (tableName === 'items') {
                        query = `
                            INSERT OR REPLACE INTO ${tableName} (${commonColumns.join(', ')})
                            VALUES (${placeholders})
                        `;
                    } else {
                        query = `
                            INSERT INTO ${tableName} (${commonColumns.join(', ')})
                            VALUES (${placeholders})
                            ON CONFLICT(${primaryKey}) DO UPDATE SET ${updateSet}
                        `;
                    }

                    db.prepare(query).run(...values);
                    result.downloaded++;

                    // Mark local record as synced (it came from cloud — it is synced)
                    if (localColumns.includes('sync_status')) {
                        try {
                            db.prepare(`UPDATE ${tableName} SET sync_status = 'synced' WHERE ${primaryKey} = ?`)
                                .run(record[primaryKey]);
                        } catch (e) {
                            // Non-fatal
                        }
                    }

                    if (recordChanged) {
                        result.actuallyChanged++;
                    }
                } catch (error) {
                    // Handle FOREIGN KEY constraint failures gracefully
                    // This happens when syncing user_settings/login_history before their parent user exists
                    if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
                        // Silently skip - the record will be synced later when the parent user exists
                        // Don't log as error since this is expected during initial sync
                    } else if (error.message && error.message.includes('UNIQUE constraint failed') && tableName === 'users') {
                        // Handle UNIQUE constraint on email/username for users table
                        // This happens when cloud has a user with same email but different ID
                        // In this case, we should update the existing local user instead
                        try {
                            const email = record.email;
                            const username = record.username;

                            // Find existing user by email or username
                            const existingByEmail = email ? db.prepare('SELECT id FROM users WHERE email = ?').get(email) : null;
                            const existingByUsername = username ? db.prepare('SELECT id FROM users WHERE username = ?').get(username) : null;

                            if (existingByEmail || existingByUsername) {
                                const existingId = existingByEmail?.id || existingByUsername?.id;

                                // Update the existing user with cloud data (except id)
                                const updateColumns = commonColumns.filter(col => col !== 'id');
                                const updateValues = updateColumns.map(col => {
                                    const val = record[col];
                                    if (val === null || val === undefined) return null;
                                    if (typeof val === 'boolean') return val ? 1 : 0;
                                    if (val instanceof Date) return val.toISOString();
                                    return val;
                                });

                                const updateSet = updateColumns.map(col => `${col} = ?`).join(', ');
                                const updateQuery = `UPDATE users SET ${updateSet} WHERE id = ?`;

                                db.prepare(updateQuery).run(...updateValues, existingId);
                                // Silently handled - don't log as this is expected
                            }
                        } catch (updateError) {
                            // If update also fails, log but continue
                            console.warn(`[CloudSync] Could not resolve UNIQUE constraint for user:`, updateError.message);
                        }
                    } else if (error.message && error.message.includes('UNIQUE constraint failed') && tableName === 'items') {
                        // Handle UNIQUE constraint on sku for items table
                        // Find existing item by sku and update it with cloud data
                        try {
                            const sku = record.sku;
                            if (sku) {
                                const existingBySku = db.prepare('SELECT id FROM items WHERE sku = ?').get(sku);
                                if (existingBySku) {
                                    // Delete the existing item and insert the cloud record
                                    db.prepare('DELETE FROM items WHERE id = ?').run(existingBySku.id);
                                    // Now insert the cloud record
                                    const insertQuery = `
                                        INSERT INTO ${tableName} (${commonColumns.join(', ')})
                                        VALUES (${commonColumns.map(() => '?').join(', ')})
                                    `;
                                    db.prepare(insertQuery).run(...values);
                                    result.downloaded++;
                                }
                            }
                        } catch (updateError) {
                            console.warn(`[CloudSync] Could not resolve UNIQUE constraint for item:`, updateError.message);
                        }
                    } else {
                        console.error(`[CloudSync] Failed to pull record from ${tableName}:`, error.message);
                    }
                }
            }

            // Delete propagation: on full pulls (sinceTs is null), remove local records
            // that no longer exist in the cloud. This prevents ghost record resurrection.
            // Skip active_sessions — it uses user_id keying and is managed separately.
            if (!sinceTs && tableName !== 'active_sessions' && cloudRecords.length > 0) {
                try {
                    const primaryKey = this.getPrimaryKeyColumn(tableName);
                    const cloudIds = new Set(cloudRecords.map(r => String(r[primaryKey])));
                    const localRecords = db.prepare(`SELECT ${primaryKey} FROM ${tableName}`).all();
                    const toDelete = localRecords.filter(r => !cloudIds.has(String(r[primaryKey])));
                    for (const r of toDelete) {
                        db.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`).run(r[primaryKey]);
                        result.actuallyChanged++;
                        console.log(`[CloudSync] Delete propagation: removed local ${tableName} ${r[primaryKey]} (deleted from cloud)`);
                    }
                } catch (delErr) {
                    console.warn(`[CloudSync] Delete propagation error for ${tableName}:`, delErr.message);
                }
            }

            // Broadcast batch change ONLY if records actually changed
            // Skip broadcasting for tables that are polled frequently (active_sessions, users, user_settings)
            // These cause UI refreshes every few seconds when polling, which is undesirable
            const noRefreshTables = ['active_sessions', 'users', 'user_settings'];
            if (result.actuallyChanged > 0 && !noRefreshTables.includes(tableName)) {
                broadcastBatchChange(tableName, result.actuallyChanged, 'SYNC_PULL');
            }

            // Record the timestamp of this successful pull for incremental sync on next run.
            // Only meaningful for tables that have an updated_at column.
            if (hasUpdatedAt) {
                this._setLastPullAt(tableName, pullStart);
            }

            return result;
        } catch (error) {
            console.error(`[CloudSync] Failed to pull from cloud ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Sync a single table (all records)
     */
    async syncTable(tableName) {
        const db = getDatabase();
        if (!db) throw new Error('Local database not initialized');

        const result = { uploaded: 0 };

        try {
            const localRecords = db.prepare(`SELECT * FROM ${tableName}`).all();
            if (localRecords.length === 0) return result;

            // Get all columns and filter out local-only columns
            const allColumns = Object.keys(localRecords[0]);
            const columns = allColumns.filter(col => !LOCAL_ONLY_COLUMNS.includes(col));
            const primaryKey = this.getPrimaryKeyColumn(tableName);

            for (const record of localRecords) {
                try {
                    const values = columns.map(col => {
                        let val = record[col];

                        // For users table, ensure roles is always a valid JSON string
                        if (tableName === 'users' && col === 'roles') {
                            if (!val || val === '' || val === 'null' || val === '[]') {
                                val = record.username === 'admin' ? '["admin"]' : '["cashier"]';
                                console.log(`[CloudSync] syncTable: Setting default roles for ${record.username}: ${val}`);
                            } else if (typeof val === 'object' && Array.isArray(val)) {
                                val = JSON.stringify(val);
                            }
                            try {
                                JSON.parse(val);
                            } catch (e) {
                                val = record.username === 'admin' ? '["admin"]' : '["cashier"]';
                            }
                            return val;
                        }

                        if (typeof val === 'boolean') return val ? 1 : 0;
                        // Skip objects/arrays - these are embedded data, not actual columns
                        if (typeof val === 'object' && val !== null) return null;
                        return val;
                    });

                    const placeholders = columns.map(() => '?').join(', ');

                    // For users table, use INSERT ... ON DUPLICATE KEY UPDATE to ensure roles are updated
                    let query;
                    if (tableName === 'users') {
                        const updateClauses = columns
                            .filter(col => col !== 'id')
                            .map(col => `${col} = VALUES(${col})`)
                            .join(', ');
                        query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`;

                        const rolesIndex = columns.indexOf('roles');
                        console.log(`[CloudSync] Pushing user ${record.username} to cloud:`, {
                            id: record.id,
                            roles_value: rolesIndex >= 0 ? values[rolesIndex] : 'NOT_FOUND'
                        });
                    } else {
                        query = `REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
                    }

                    await executeQuery(query, values);
                    result.uploaded++;

                    // Mark cloud record as synced after successful push
                    try {
                        await executeQuery(
                            `UPDATE ${tableName} SET sync_status = 'synced' WHERE ${primaryKey} = ?`,
                            [record[primaryKey]]
                        );
                    } catch (e) {
                        // Non-fatal — cloud table may not have sync_status column yet
                    }

                    // Mark as synced locally (check if synced_at column exists)
                    if (allColumns.includes('sync_status')) {
                        const hasSyncedAt = allColumns.includes('synced_at');
                        if (hasSyncedAt) {
                            db.prepare(`UPDATE ${tableName} SET sync_status = 'synced', synced_at = ? WHERE ${primaryKey} = ?`)
                                .run(nowISO(), record[primaryKey]);
                        } else {
                            db.prepare(`UPDATE ${tableName} SET sync_status = 'synced' WHERE ${primaryKey} = ?`)
                                .run(record[primaryKey]);
                        }
                    }
                } catch (error) {
                    console.error(`[CloudSync] Failed to sync record in ${tableName}:`, error.message);
                }
            }

            return result;
        } catch (error) {
            console.error(`[CloudSync] Failed to sync table ${tableName}:`, error.message);
            throw error;
        }
    }

    /**
     * Create MySQL schema (mirror SQLite tables)
     */
    async createMySQLSchema() {
        const schemas = {
            users: `
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(255) PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name VARCHAR(255),
                    roles TEXT,
                    branch_id VARCHAR(255),
                    is_active TINYINT DEFAULT 1,
                    last_login_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    synced_at DATETIME,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_email (email),
                    INDEX idx_username (username),
                    INDEX idx_branch_id (branch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            categories: `
                CREATE TABLE IF NOT EXISTS categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    brand VARCHAR(255) NOT NULL,
                    type VARCHAR(255) NOT NULL,
                    created_by VARCHAR(255),
                    updated_by VARCHAR(255),
                    created_at_branch INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_brand (brand),
                    INDEX idx_type (type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            units_of_measurement: `
                CREATE TABLE IF NOT EXISTS units_of_measurement (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    symbol VARCHAR(50) NOT NULL,
                    unit_name VARCHAR(255) NOT NULL,
                    created_by VARCHAR(255),
                    updated_by VARCHAR(255),
                    created_at_branch INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_symbol (symbol)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            branches: `
                CREATE TABLE IF NOT EXISTS branches (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    address TEXT,
                    contact VARCHAR(255),
                    is_active TINYINT DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_name (name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            suppliers: `
                CREATE TABLE IF NOT EXISTS suppliers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    supplier_name VARCHAR(255) NOT NULL,
                    contact VARCHAR(255),
                    type VARCHAR(255),
                    supplier_address TEXT,
                    status TINYINT DEFAULT 1,
                    current_amount DECIMAL(15,2) DEFAULT 0,
                    previous_amount DECIMAL(15,2) DEFAULT 0,
                    account_number VARCHAR(255),
                    account_bank VARCHAR(255),
                    account_branch VARCHAR(255),
                    account_name VARCHAR(255),
                    account_nickname VARCHAR(255),
                    created_by VARCHAR(255),
                    updated_by VARCHAR(255),
                    created_at_branch INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_name (supplier_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            items: `
                CREATE TABLE IF NOT EXISTS items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    sku VARCHAR(255) UNIQUE NOT NULL,
                    item_name VARCHAR(255) NOT NULL,
                    item_image_url TEXT,
                    item_code VARCHAR(255) DEFAULT NULL,
                    item_image_blob LONGTEXT DEFAULT NULL,
                    maximum_capacity INT DEFAULT 0,
                    category_id INT,
                    uom_id INT,
                    branch_id INT,
                    availability TINYINT DEFAULT 1,
                    created_by VARCHAR(255),
                    updated_by VARCHAR(255),
                    created_at_branch INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_sku (sku),
                    INDEX idx_name (item_name),
                    INDEX idx_category (category_id),
                    INDEX idx_branch_id (branch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            stock: `
                CREATE TABLE IF NOT EXISTS stock (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) DEFAULT 0,
                    threshold_limit DECIMAL(15,2) DEFAULT 0,
                    stock_price DECIMAL(15,2) DEFAULT 0,
                    retail_price DECIMAL(15,2) DEFAULT 0,
                    discount_price DECIMAL(15,2) DEFAULT 0,
                    expiry_date DATETIME,
                    availability TINYINT DEFAULT 1,
                    branch_id INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE KEY unique_item_batch (item_id, batch_code),
                    INDEX idx_item (item_id),
                    INDEX idx_batch (batch_code),
                    INDEX idx_branch_id (branch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            restock_transactions: `
                CREATE TABLE IF NOT EXISTS restock_transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    invoice_no VARCHAR(255) UNIQUE NOT NULL,
                    bill_no VARCHAR(255),
                    supplier_id INT,
                    prepared_by VARCHAR(255),
                    authorized_by VARCHAR(255),
                    payment_method VARCHAR(255),
                    discount DECIMAL(15,2) DEFAULT 0,
                    expenses DECIMAL(15,2) DEFAULT 0,
                    total_amount DECIMAL(15,2) DEFAULT 0,
                    cash_amount DECIMAL(15,2) DEFAULT 0,
                    change_amount DECIMAL(15,2) DEFAULT 0,
                    execution_level VARCHAR(50) DEFAULT 'medium',
                    status VARCHAR(50) DEFAULT 'completed',
                    branch_id INT,
                    created_by VARCHAR(255),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_invoice (invoice_no),
                    INDEX idx_supplier (supplier_id),
                    INDEX idx_branch_id (branch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            restock_items: `
                CREATE TABLE IF NOT EXISTS restock_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    restock_id INT NOT NULL,
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    stock_price DECIMAL(15,2) NOT NULL,
                    retail_price DECIMAL(15,2) NOT NULL,
                    expiry_date DATETIME,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_restock (restock_id),
                    INDEX idx_item (item_id),
                    INDEX idx_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            return_items: `
                CREATE TABLE IF NOT EXISTS return_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    restock_id INT NOT NULL,
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    description TEXT,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_restock (restock_id),
                    INDEX idx_item (item_id),
                    INDEX idx_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            members: `
                CREATE TABLE IF NOT EXISTS members (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    member_no VARCHAR(255) UNIQUE NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    contact VARCHAR(255),
                    address TEXT,
                    member_type VARCHAR(50) DEFAULT 'regular',
                    total_income DECIMAL(15,2) DEFAULT 0,
                    total_credits DECIMAL(15,2) DEFAULT 0,
                    is_active TINYINT DEFAULT 1,
                    branch_id INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_member_no (member_no),
                    INDEX idx_name (full_name),
                    INDEX idx_branch_id (branch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            sales_transactions: `
                CREATE TABLE IF NOT EXISTS sales_transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    invoice_no VARCHAR(255) UNIQUE NOT NULL,
                    member_id INT,
                    cashier_id VARCHAR(255),
                    payment_method VARCHAR(50) DEFAULT 'cash',
                    credit_duration VARCHAR(255),
                    subtotal DECIMAL(15,2) DEFAULT 0,
                    discount DECIMAL(15,2) DEFAULT 0,
                    total_amount DECIMAL(15,2) DEFAULT 0,
                    cash_received DECIMAL(15,2) DEFAULT 0,
                    change_amount DECIMAL(15,2) DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'completed',
                    is_held TINYINT DEFAULT 0,
                    branch_id INT,
                    created_by VARCHAR(255),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_invoice (invoice_no),
                    INDEX idx_member (member_id),
                    INDEX idx_cashier (cashier_id),
                    INDEX idx_branch_id (branch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            sales_items: `
                CREATE TABLE IF NOT EXISTS sales_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    sale_id INT NOT NULL,
                    item_id INT NOT NULL,
                    stock_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    unit_price DECIMAL(15,2) NOT NULL,
                    discount DECIMAL(15,2) DEFAULT 0,
                    total_price DECIMAL(15,2) NOT NULL,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_sale (sale_id),
                    INDEX idx_item (item_id),
                    INDEX idx_stock (stock_id),
                    INDEX idx_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            disposed_items: `
                CREATE TABLE IF NOT EXISTS disposed_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    item_id INT NOT NULL,
                    stock_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    reason TEXT,
                    disposed_by VARCHAR(255),
                    disposed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_item (item_id),
                    INDEX idx_stock (stock_id),
                    INDEX idx_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            offers_discounts: `
                CREATE TABLE IF NOT EXISTS offers_discounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    discount_type VARCHAR(50) DEFAULT 'percentage',
                    discount_value DECIMAL(15,2) NOT NULL,
                    min_purchase DECIMAL(15,2) DEFAULT 0,
                    start_date DATETIME,
                    end_date DATETIME,
                    is_active TINYINT DEFAULT 1,
                    applies_to VARCHAR(50) DEFAULT 'all',
                    target_id INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            // NOTE: app_settings intentionally excluded — it is device-specific (LOCAL_ONLY_TABLES)
            user_settings: `
                CREATE TABLE IF NOT EXISTS user_settings (
                    id VARCHAR(255) PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    user_id VARCHAR(255) NOT NULL UNIQUE,
                    profile_image TEXT,
                    permissions TEXT,
                    theme VARCHAR(50) DEFAULT 'light',
                    language VARCHAR(10) DEFAULT 'en',
                    notifications_enabled TINYINT DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_user_id (user_id),
                    INDEX idx_user_settings_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            login_history: `
                CREATE TABLE IF NOT EXISTS login_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    user_id VARCHAR(255) NOT NULL,
                    session_id VARCHAR(255),
                    username VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    login_at DATETIME NOT NULL,
                    logout_at DATETIME,
                    duration_seconds INT,
                    logout_reason VARCHAR(50),
                    device_info TEXT,
                    ip_address VARCHAR(255),
                    branch_id INT DEFAULT NULL,
                    branch_name VARCHAR(255) DEFAULT NULL,
                    status VARCHAR(50) DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_user_id (user_id),
                    INDEX idx_login_at (login_at),
                    INDEX idx_status (status),
                    INDEX idx_session_id (session_id),
                    INDEX idx_branch_id (branch_id),
                    INDEX idx_login_history_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            active_sessions: `
                CREATE TABLE IF NOT EXISTS active_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    user_id VARCHAR(255) NOT NULL,
                    device_id VARCHAR(255) NOT NULL,
                    device_name VARCHAR(255),
                    session_token_hash VARCHAR(64),
                    login_at DATETIME NOT NULL,
                    last_activity_at DATETIME,
                    is_active TINYINT DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE KEY unique_user (user_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_device_id (device_id),
                    INDEX idx_is_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            payment_methods: `
                CREATE TABLE IF NOT EXISTS payment_methods (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    type VARCHAR(50) NOT NULL DEFAULT 'cash',
                    credit_months INT DEFAULT 0,
                    interest_rate DECIMAL(5,2) DEFAULT 0,
                    is_active TINYINT DEFAULT 1,
                    is_member_only TINYINT DEFAULT 0,
                    display_order INT DEFAULT 0,
                    icon VARCHAR(255),
                    color VARCHAR(50),
                    created_by VARCHAR(255),
                    updated_by VARCHAR(255),
                    created_at_branch INT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_type (type),
                    INDEX idx_is_active (is_active),
                    INDEX idx_sync_status (sync_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            audit_log: `
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    table_name VARCHAR(255) NOT NULL,
                    record_id VARCHAR(255) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    user_id VARCHAR(255),
                    user_name VARCHAR(255),
                    branch_id INT,
                    branch_name VARCHAR(255),
                    old_values LONGTEXT,
                    new_values LONGTEXT,
                    changed_fields TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    device_info TEXT,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_table_name (table_name),
                    INDEX idx_record_id (record_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_branch_id (branch_id),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_action (action)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            tea_coop_members: `
                CREATE TABLE IF NOT EXISTS tea_coop_members (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    member_id VARCHAR(255) NOT NULL,
                    member_no VARCHAR(255),
                    full_name VARCHAR(255) NOT NULL,
                    contact VARCHAR(255),
                    address TEXT,
                    factory_id INT DEFAULT 1,
                    green_leaf_value DECIMAL(15,2) DEFAULT 0,
                    loans DECIMAL(15,2) DEFAULT 0,
                    net_amount DECIMAL(15,2) DEFAULT 0,
                    additions DECIMAL(15,2) DEFAULT 0,
                    deductions DECIMAL(15,2) DEFAULT 0,
                    is_active TINYINT DEFAULT 1,
                    last_fetched_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_member_id (member_id),
                    INDEX idx_member_no (member_no),
                    INDEX idx_full_name (full_name),
                    INDEX idx_is_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            tea_coop_payments: `
                CREATE TABLE IF NOT EXISTS tea_coop_payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    member_id VARCHAR(255) NOT NULL,
                    year INT NOT NULL,
                    month INT NOT NULL,
                    green_leaf_value DECIMAL(15,2) DEFAULT 0,
                    loans DECIMAL(15,2) DEFAULT 0,
                    net_amount DECIMAL(15,2) DEFAULT 0,
                    additions DECIMAL(15,2) DEFAULT 0,
                    deductions DECIMAL(15,2) DEFAULT 0,
                    payment_date DATE,
                    factory_id INT DEFAULT 1,
                    last_fetched_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_member_year_month (member_id, year, month),
                    INDEX idx_member_id (member_id),
                    INDEX idx_year_month (year, month)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            returned_items: `
                CREATE TABLE IF NOT EXISTS returned_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    sale_id INT NOT NULL,
                    item_id INT NOT NULL,
                    stock_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
                    reason TEXT,
                    returned_by VARCHAR(255),
                    returned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_returns_sale_id (sale_id),
                    INDEX idx_returns_item_id (item_id),
                    INDEX idx_returns_returned_at (returned_at),
                    INDEX idx_returns_sync_status (sync_status),
                    INDEX idx_returns_updated_at (updated_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `
        };

        for (const [tableName, schema] of Object.entries(schemas)) {
            try {
                await executeQuery(schema);
                console.log(`[CloudSync] Created/verified table: ${tableName}`);
            } catch (error) {
                console.error(`[CloudSync] Failed to create table ${tableName}:`, error.message);
            }
        }

        // Add missing columns to existing tables (for schema updates)
        await this.addMissingColumns();

        // Add missing indexes to existing tables
        await this.addMissingIndexes();
    }

    /**
     * Add missing columns to existing MySQL tables
     * This handles schema migrations for existing tables
     */
    async addMissingColumns() {
        const columnUpdates = [
            // Add branch_id to users table if missing
            {
                table: 'users',
                column: 'branch_id',
                definition: 'VARCHAR(255) DEFAULT NULL',
                after: 'roles'
            },
            // Add branch_id to login_history table if missing
            {
                table: 'login_history',
                column: 'branch_id',
                definition: 'INT DEFAULT NULL',
                after: 'ip_address'
            },
            // Add branch_name to login_history table if missing
            {
                table: 'login_history',
                column: 'branch_name',
                definition: 'VARCHAR(255) DEFAULT NULL',
                after: 'branch_id'
            },
            // Add updated_at to restock_transactions table if missing
            {
                table: 'restock_transactions',
                column: 'updated_at',
                definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
                after: 'created_at'
            },
            // ========== Multi-branch & Audit columns ==========
            // Categories audit fields
            { table: 'categories', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'type' },
            { table: 'categories', column: 'updated_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'created_by' },
            { table: 'categories', column: 'created_at_branch', definition: 'INT DEFAULT NULL', after: 'updated_by' },
            // Units of measurement audit fields
            { table: 'units_of_measurement', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'unit_name' },
            { table: 'units_of_measurement', column: 'updated_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'created_by' },
            { table: 'units_of_measurement', column: 'created_at_branch', definition: 'INT DEFAULT NULL', after: 'updated_by' },
            // Suppliers audit fields
            { table: 'suppliers', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'account_nickname' },
            { table: 'suppliers', column: 'updated_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'created_by' },
            { table: 'suppliers', column: 'created_at_branch', definition: 'INT DEFAULT NULL', after: 'updated_by' },
            // Items audit fields
            { table: 'items', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'availability' },
            { table: 'items', column: 'updated_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'created_by' },
            { table: 'items', column: 'created_at_branch', definition: 'INT DEFAULT NULL', after: 'updated_by' },
            // Stock branch_id
            { table: 'stock', column: 'branch_id', definition: 'INT DEFAULT NULL', after: 'availability' },
            // Members branch_id
            { table: 'members', column: 'branch_id', definition: 'INT DEFAULT NULL', after: 'is_active' },
            // Sales transactions branch & audit
            { table: 'sales_transactions', column: 'branch_id', definition: 'INT DEFAULT NULL', after: 'is_held' },
            { table: 'sales_transactions', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'branch_id' },
            { table: 'sales_transactions', column: 'updated_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'created_at' },
            // Restock transactions branch & audit
            { table: 'restock_transactions', column: 'branch_id', definition: 'INT DEFAULT NULL', after: 'status' },
            { table: 'restock_transactions', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'branch_id' },
            // Tea Coop additions/deductions (migration 035)
            { table: 'tea_coop_members', column: 'additions', definition: 'DECIMAL(15,2) DEFAULT 0', after: 'net_amount' },
            { table: 'tea_coop_members', column: 'deductions', definition: 'DECIMAL(15,2) DEFAULT 0', after: 'additions' },
            { table: 'tea_coop_payments', column: 'additions', definition: 'DECIMAL(15,2) DEFAULT 0', after: 'net_amount' },
            { table: 'tea_coop_payments', column: 'deductions', definition: 'DECIMAL(15,2) DEFAULT 0', after: 'additions' },
            // sales_items sync columns (needed for proper sync tracking)
            { table: 'sales_items', column: 'cloud_id',    definition: 'VARCHAR(255) DEFAULT NULL',                                       after: 'id' },
            { table: 'sales_items', column: 'sync_status', definition: "VARCHAR(50) DEFAULT 'pending'",                                   after: 'total_price' },
            { table: 'sales_items', column: 'created_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP',                              after: 'sync_status' },
            { table: 'sales_items', column: 'updated_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',  after: 'created_at' },
            // restock_items sync columns (needed for proper sync tracking)
            { table: 'restock_items', column: 'cloud_id',    definition: 'VARCHAR(255) DEFAULT NULL',                                      after: 'id' },
            { table: 'restock_items', column: 'sync_status', definition: "VARCHAR(50) DEFAULT 'pending'",                                  after: 'expiry_date' },
            { table: 'restock_items', column: 'created_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP',                             after: 'sync_status' },
            { table: 'restock_items', column: 'updated_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'created_at' },
            // disposed_items created_at (was missing from original cloud schema)
            { table: 'disposed_items', column: 'created_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP', after: 'sync_status' },
            // offers_discounts updated_at (needed for incremental sync — was missing)
            { table: 'offers_discounts', column: 'updated_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'created_at' },
            // login_history sync columns
            { table: 'login_history', column: 'cloud_id',    definition: 'VARCHAR(255) DEFAULT NULL',                                       after: 'id' },
            { table: 'login_history', column: 'updated_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',  after: 'created_at' },
            // user_settings sync columns (were missing from original schema)
            { table: 'user_settings', column: 'cloud_id',    definition: 'VARCHAR(255) DEFAULT NULL',                                       after: 'id' },
            { table: 'user_settings', column: 'sync_status', definition: "VARCHAR(50) DEFAULT 'pending'",                                   after: 'updated_at' },
            // returned_items sync columns (migration 042)
            { table: 'returned_items', column: 'cloud_id',    definition: 'VARCHAR(255) DEFAULT NULL',                                       after: 'id' },
            { table: 'returned_items', column: 'sync_status', definition: "VARCHAR(50) DEFAULT 'pending'",                                   after: 'returned_at' },
            { table: 'returned_items', column: 'created_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP',                              after: 'sync_status' },
            { table: 'returned_items', column: 'updated_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',  after: 'created_at' },
            // disposed_items updated_at (migration 042)
            { table: 'disposed_items', column: 'updated_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'sync_status' },
            // return_items sync columns (migration 042)
            { table: 'return_items', column: 'cloud_id',    definition: 'VARCHAR(255) DEFAULT NULL',                                       after: 'id' },
            { table: 'return_items', column: 'sync_status', definition: "VARCHAR(50) DEFAULT 'pending'",                                   after: 'description' },
            { table: 'return_items', column: 'created_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP',                              after: 'sync_status' },
            { table: 'return_items', column: 'updated_at',  definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',  after: 'created_at' }
        ];

        for (const update of columnUpdates) {
            try {
                // Check if column exists
                const columns = await executeQuery(
                    `SHOW COLUMNS FROM ${update.table} LIKE '${update.column}'`
                );

                if (!columns || columns.length === 0) {
                    // Column doesn't exist, add it
                    const alterQuery = `ALTER TABLE ${update.table} ADD COLUMN ${update.column} ${update.definition}${update.after ? ` AFTER ${update.after}` : ''}`;
                    await executeQuery(alterQuery);
                    console.log(`[CloudSync] Added column ${update.column} to ${update.table}`);
                }
            } catch (error) {
                console.error(`[CloudSync] Failed to add column ${update.column} to ${update.table}:`, error.message);
            }
        }
    }

    /**
     * Reset ghost 'pending' sync_status on cloud records that are permanently inactive.
     * E.g. active_sessions rows with is_active=0 that were never marked 'synced' because
     * the app crashed or went offline before the deactivation push completed.
     */
    async cleanupGhostPendingRecords() {
        try {
            const result = await executeQuery(
                `UPDATE active_sessions SET sync_status = 'synced' WHERE is_active = 0 AND sync_status = 'pending'`
            );
            if (result && result.affectedRows > 0) {
                console.log(`[CloudSync] Cleaned up ${result.affectedRows} ghost pending active_sessions row(s)`);
            }
        } catch (error) {
            console.error('[CloudSync] Failed to cleanup ghost pending records:', error.message);
        }
    }

    /**
     * Add missing indexes to existing MySQL tables
     * Idempotent: skips indexes that already exist
     */
    async addMissingIndexes() {
        const indexUpdates = [
            { table: 'login_history',  index: 'idx_login_history_sync_status', column: 'sync_status' },
            { table: 'restock_items',  index: 'idx_sync_status',               column: 'sync_status' },
        ];

        for (const update of indexUpdates) {
            try {
                const rows = await executeQuery(
                    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
                    [update.table, update.index]
                );
                if (!rows || rows.length === 0) {
                    await executeQuery(`ALTER TABLE ${update.table} ADD INDEX ${update.index} (${update.column})`);
                    console.log(`[CloudSync] Added index ${update.index} to ${update.table}`);
                }
            } catch (error) {
                console.error(`[CloudSync] Failed to add index ${update.index} to ${update.table}:`, error.message);
            }
        }
    }

    /**
     * Get primary key column for a table
     */
    getPrimaryKeyColumn(tableName) {
        return 'id'; // All tables use 'id' as primary key
    }

    /**
     * Manually trigger full sync
     */
    async syncNow() {
        // First sync pending changes, then do full sync
        if (this.pendingChanges.length > 0) {
            await this.syncPendingChanges();
        }
        return await this.performFullSync();
    }

    /**
     * Sync users with cloud using pull-first-then-push strategy
     * 1. Pull any updates from cloud to local FIRST
     * 2. Then push local user changes to cloud
     */
    async syncUsers() {
        if (!this.isOnline) {
            return { status: 'offline', uploaded: 0, downloaded: 0 };
        }

        if (!await testConnection()) {
            return { status: 'connection_failed', uploaded: 0, downloaded: 0 };
        }

        console.log('[CloudSync] Syncing users (pull-first-then-push)...');

        try {
            // Step 1: Pull from cloud FIRST to get latest updates from other devices
            console.log('[CloudSync] Step 1: Pulling user updates from cloud first...');
            const usersPullResult = await this.pullFromCloud('users');
            const settingsPullResult = await this.pullFromCloud('user_settings');

            const downloaded = (usersPullResult.downloaded || 0) + (settingsPullResult.downloaded || 0);
            console.log(`[CloudSync] Pulled ${usersPullResult.downloaded || 0} users and ${settingsPullResult.downloaded || 0} user settings from cloud`);

            // Step 2: Push local users to cloud
            console.log('[CloudSync] Step 2: Pushing local users to cloud...');
            const usersPushResult = await this.syncTable('users');
            const settingsPushResult = await this.syncTable('user_settings');

            const uploaded = (usersPushResult.uploaded || 0) + (settingsPushResult.uploaded || 0);
            console.log(`[CloudSync] Pushed ${usersPushResult.uploaded || 0} users and ${settingsPushResult.uploaded || 0} user settings to cloud`);

            return {
                status: 'success',
                uploaded,
                downloaded,
                users: { pulled: usersPullResult.downloaded, pushed: usersPushResult.uploaded },
                userSettings: { pulled: settingsPullResult.downloaded, pushed: settingsPushResult.uploaded }
            };
        } catch (error) {
            console.error('[CloudSync] Failed to sync users:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * @deprecated Use syncUsers() instead for pull-first-then-push strategy
     * Pull users from cloud - kept for backward compatibility
     */
    async pullUsers() {
        console.log('[CloudSync] pullUsers() is deprecated. Using syncUsers() instead.');
        return await this.syncUsers();
    }

    /**
     * Sync a user with cloud using pull-first-then-push strategy
     * @param {object} user - User record
     * @param {boolean} pullBefore - Whether to pull updates before pushing (default: true)
     */
    async pushUser(user, pullBefore = true) {
        if (!this.isOnline || !this.mysqlInitialized) {
            // Queue for later via queueChange so it is persisted to the DB queue
            await this.queueChange('users', 'INSERT', user, user.id);
            return { status: 'queued' };
        }

        try {
            // Step 1: Pull updates from cloud FIRST (pull-first-then-push)
            if (pullBefore) {
                console.log('[CloudSync] Pulling user updates from cloud first...');
                await this.pullFromCloud('users');
            }

            // Step 2: Push local user to cloud
            await this.syncSingleChange({
                tableName: 'users',
                operation: 'INSERT',
                record: user,
                recordId: user.id
            });
            console.log(`[CloudSync] Pushed user ${user.id} to cloud`);

            return { status: 'success' };
        } catch (error) {
            console.error('[CloudSync] Failed to sync user:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Sync user settings with cloud using pull-first-then-push strategy
     * @param {object} settings - User settings record
     * @param {boolean} pullBefore - Whether to pull updates before pushing (default: true)
     */
    async pushUserSettings(settings, pullBefore = true) {
        if (!this.isOnline || !this.mysqlInitialized) {
            // Queue for later via queueChange so it is persisted to the DB queue
            await this.queueChange('user_settings', 'INSERT', settings, settings.id);
            return { status: 'queued' };
        }

        try {
            // Step 1: Pull updates from cloud FIRST (pull-first-then-push)
            if (pullBefore) {
                console.log('[CloudSync] Pulling user settings updates from cloud first...');
                await this.pullFromCloud('user_settings');
            }

            // Step 2: Push local settings to cloud
            await this.syncSingleChange({
                tableName: 'user_settings',
                operation: 'INSERT',
                record: settings,
                recordId: settings.id
            });
            console.log(`[CloudSync] Pushed user settings ${settings.id} to cloud`);

            return { status: 'success' };
        } catch (error) {
            console.error('[CloudSync] Failed to sync user settings:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Get current sync status
     */
    getStatus() {
        return this._getStatusSnapshot();
    }

    /**
     * Set auto-sync enabled/disabled
     */
    setAutoSync(enabled) {
        this.autoSyncEnabled = enabled;
        if (!enabled) {
            if (this.networkCheckInterval) {
                clearInterval(this.networkCheckInterval);
                this.networkCheckInterval = null;
            }
            if (this.pendingSyncInterval) {
                clearInterval(this.pendingSyncInterval);
                this.pendingSyncInterval = null;
            }
            if (this.activeSessionsPollInterval) {
                clearInterval(this.activeSessionsPollInterval);
                this.activeSessionsPollInterval = null;
            }
            if (this.incrementalPullInterval) {
                clearInterval(this.incrementalPullInterval);
                this.incrementalPullInterval = null;
            }
            this.isSyncing = false;
            this.syncStatus = 'disabled';
        } else {
            this.startNetworkMonitoring();
            this.startPendingSyncInterval();
            this.startActiveSessionsPolling();
            this.startIncrementalPullLoop();
            this.syncStatus = this.isOnline && this.mysqlInitialized ? 'idle' : 'offline';
        }
        this._broadcastStatus();
    }

    /**
     * Start dedicated active_sessions polling (5s interval).
     * Owns single-device enforcement — detects when another device logs in
     * and kicks the current session via SessionValidator.
     */
    startActiveSessionsPolling() {
        if (this.activeSessionsPollInterval) {
            clearInterval(this.activeSessionsPollInterval);
        }

        this.activeSessionsPollInterval = setInterval(async () => {
            if (!this.autoSyncEnabled || !this.isOnline || !this.mysqlInitialized) return;

            try {
                const db = getDatabase();
                if (!db) return;

                const pullResult = await this.syncActiveSessions({
                    pullFirst: true,
                    pushLocal: false,
                    clearCache: true
                });
                const { validateSessionFast } = require('./SessionValidator.cjs');

                if ((pullResult.changed || 0) > 0) {
                    console.log('[CloudSync] Active sessions changed, validating current session...');
                    const sessions = db.prepare('SELECT token FROM sessions WHERE is_active = 1').all();
                    for (const session of sessions) {
                        const result = validateSessionFast(session.token);
                        if (!result.valid && result.forcedLogout) {
                            console.log('[CloudSync] Session kicked detected after active_sessions pull');
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log('[CloudSync] Active sessions poll failed:', error.message);
            }
        }, 1000); // 1 second — near real-time single-device enforcement

        console.log('[CloudSync] Active sessions polling started (every 1s)');
    }

    async syncActiveSessions(options = {}) {
        const {
            pullFirst = true,
            pushLocal = true,
            clearCache = true
        } = options;

        if (!this.autoSyncEnabled || !this.isOnline || !this.mysqlInitialized) {
            return { status: 'skipped', reason: 'offline', pulled: 0, pushed: 0, changed: 0 };
        }

        let pulled = 0;
        let pushed = 0;
        let changed = 0;

        if (pullFirst) {
            const pullResult = await this.pullFromCloud('active_sessions', { skipFkPragma: true });
            pulled = pullResult.downloaded || 0;
            changed += pullResult.actuallyChanged || 0;
        }

        if (clearCache) {
            const { clearCache } = require('./SessionValidator.cjs');
            clearCache();
        }

        if (pushLocal) {
            const pushResult = await this.syncTable('active_sessions');
            pushed = pushResult.uploaded || 0;
        }

        return { status: 'success', pulled, pushed, changed };
    }

    /**
     * Start incremental pull loop for all tables.
     * Pulls tables in round-robin batches of 4 every 7 seconds.
     * This replaces the old RealTimeSyncService Promise.all() flood that exhausted
     * the MySQL user connection limit.
     */
    startIncrementalPullLoop() {
        if (this.incrementalPullInterval) {
            clearInterval(this.incrementalPullInterval);
        }

        // All tables except active_sessions (managed by dedicated poll above)
        const PULL_TABLES = TABLES_TO_SYNC.filter(t => t !== 'active_sessions');
        const BATCH_SIZE = 6;

        this.incrementalPullInterval = setInterval(async () => {
            if (!this.isOnline || !this.mysqlInitialized || this.isSyncing) return;

            const db = getDatabase();
            if (!db) return;

            // Pick next batch (round-robin)
            const start = this._pullTableIndex % PULL_TABLES.length;
            const batch = PULL_TABLES.slice(start, start + BATCH_SIZE);
            this._pullTableIndex = (start + BATCH_SIZE) % PULL_TABLES.length;

            for (const table of batch) {
                try {
                    await this.pullFromCloud(table, { skipFkPragma: true });
                } catch (err) {
                    console.log(`[CloudSync] Incremental pull error for ${table}:`, err.message);
                }
            }
        }, 2000); // 2 seconds — full table cycle in ~7s with batch size 6

        console.log('[CloudSync] Incremental pull loop started (batch of 6 every 2s)');
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
            this.networkCheckInterval = null;
        }
        if (this.pendingSyncInterval) {
            clearInterval(this.pendingSyncInterval);
            this.pendingSyncInterval = null;
        }
        if (this.activeSessionsPollInterval) {
            clearInterval(this.activeSessionsPollInterval);
            this.activeSessionsPollInterval = null;
        }
        if (this.incrementalPullInterval) {
            clearInterval(this.incrementalPullInterval);
            this.incrementalPullInterval = null;
        }
        await closeMySQLPool();
        this.isOnline = false;
        this.mysqlInitialized = false;
        this.isSyncing = false;
        this.syncStatus = this.autoSyncEnabled ? 'offline' : 'disabled';
        this._broadcastStatus();
        console.log('[CloudSync] Service cleaned up');
    }
}

// Singleton instance
let cloudSyncInstance = null;

/**
 * Get or create CloudSyncService instance
 */
function getCloudSyncService() {
    if (!cloudSyncInstance) {
        cloudSyncInstance = new CloudSyncService();
    }
    return cloudSyncInstance;
}

/**
 * Initialize and get CloudSyncService
 */
async function initializeCloudSync() {
    const service = getCloudSyncService();
    service.setAutoSync(true);
    await service.initialize();
    return service;
}

/**
 * Helper function to notify sync service of changes
 * Call this from repositories after INSERT/UPDATE/DELETE operations
 */
function notifyDataChange(tableName, operation, record, recordId) {
    try {
        const service = getCloudSyncService();
        service.queueChange(tableName, operation, record, recordId);
    } catch (error) {
        console.error('[CloudSync] Failed to queue change:', error.message);
    }
}

module.exports = {
    CloudSyncService,
    getCloudSyncService,
    initializeCloudSync,
    notifyDataChange
};
