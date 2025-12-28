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
const {
    broadcastDataChange,
    broadcastSyncStatus,
    broadcastSyncComplete,
    broadcastBatchChange,
    broadcastMultiTableChange
} = require('../utils/eventBroadcaster.cjs');

// Sync configuration
const NETWORK_CHECK_INTERVAL_MS = 5000; // Check network every 5 seconds (faster for real-time)
const PENDING_SYNC_INTERVAL_MS = 10000; // Try to sync pending changes every 10 seconds (faster)

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
    // NOTE: app_settings is intentionally NOT synced - it's device-specific
    'user_settings',
    'login_history',
    'active_sessions',  // For single-device enforcement across devices
    'payment_methods',  // Payment method configurations
    'audit_log'         // Audit trail for compliance
];

// Tables that shouldn't sync (local only) - each device has its own settings
const LOCAL_ONLY_TABLES = ['sessions', 'sync_queue', 'migrations', 'price_change_history', 'app_settings'];

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
    'category_type'         // From JOINed category data
];

// Table-specific column exclusions (columns that are virtual/JOINed only for specific tables)
// These columns exist as real columns in some tables but are virtual JOINs in others
const TABLE_SPECIFIC_EXCLUSIONS = {
    // For sales_items and restock_items, these columns come from JOINs with items table
    'sales_items': ['sku', 'item_name', 'item_image_url'],
    'restock_items': ['sku', 'item_name', 'item_image_url']
};

// Tables that use "pull-first-then-push" strategy
// For these tables: Pull cloud updates to local FIRST, then push local changes to cloud
// This ensures we have the latest cloud data before pushing local changes
const PULL_FIRST_TABLES = ['users', 'user_settings', 'active_sessions'];

// Maximum retry attempts for failed sync operations
const MAX_RETRY_ATTEMPTS = 3;

class CloudSyncService {
    constructor() {
        this.networkCheckInterval = null;
        this.pendingSyncInterval = null;
        this.isOnline = false;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncStatus = 'idle';
        this.syncError = null;
        this.autoSyncEnabled = true;
        this.pendingChanges = []; // Queue of changes to sync when online
        this.mysqlInitialized = false;
        this.wasOffline = false; // Track if we were offline before

        // Track pending change keys to prevent duplicates
        this._pendingChangeKeys = new Set();

        // Track retry counts for failed operations
        this._retryCountMap = new Map();

        // Sync lock to prevent concurrent syncs
        this._syncLock = false;
        this._syncLockQueue = [];
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
            const timeoutId = setTimeout(() => {
                // Remove from queue and return false
                const idx = this._syncLockQueue.indexOf(resolver);
                if (idx >= 0) this._syncLockQueue.splice(idx, 1);
                resolve(false);
            }, timeout);

            const resolver = () => {
                clearTimeout(timeoutId);
                this._syncLock = true;
                resolve(true);
            };

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

    /**
     * Initialize the cloud sync service
     */
    async initialize() {
        console.log('[CloudSync] Initializing real-time sync service...');

        // Check initial network status
        this.isOnline = await this.checkNetworkStatus();
        console.log(`[CloudSync] Initial network status: ${this.isOnline ? 'online' : 'offline'}`);

        if (this.isOnline) {
            await this.initializeMySQL();
        }

        // Start network monitoring
        this.startNetworkMonitoring();

        // Start pending sync interval
        this.startPendingSyncInterval();

        // Do initial full sync if online
        if (this.isOnline && this.mysqlInitialized) {
            this.performFullSync().catch(err =>
                console.error('[CloudSync] Initial full sync failed:', err.message)
            );
        }

        return this;
    }

    /**
     * Initialize MySQL connection and schema
     */
    async initializeMySQL() {
        if (this.mysqlInitialized) return true;

        try {
            console.log('[CloudSync] Initializing MySQL connection pool...');
            await initializeMySQLPool();

            console.log('[CloudSync] Testing MySQL connection...');
            const connected = await testConnection();

            if (connected) {
                console.log('[CloudSync] Connection successful, creating schema...');
                await this.createMySQLSchema();
                this.mysqlInitialized = true;
                console.log('[CloudSync] MySQL initialized successfully');
                return true;
            } else {
                console.error('[CloudSync] MySQL connection test failed');
            }
        } catch (error) {
            console.error('[CloudSync] Failed to initialize MySQL:', error.message);
            console.error('[CloudSync] Full error:', error);
        }
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
            return { success: true, message: 'MySQL schema created/verified successfully' };
        } catch (error) {
            console.error('[CloudSync] Failed to ensure MySQL schema:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Check network connectivity
     * @returns {Promise<boolean>}
     */
    async checkNetworkStatus() {
        return new Promise((resolve) => {
            dns.lookup('google.com', (err) => {
                resolve(!err);
            });
        });
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

        // Check for duplicate changes (deduplication)
        if (this._isChangePending(tableName, operation, recordId)) {
            console.log(`[CloudSync] Skipping duplicate change: ${operation} on ${tableName} (ID: ${recordId})`);
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
                console.log(`[CloudSync] Real-time sync: ${operation} on ${tableName} (ID: ${recordId})`);
            } catch (error) {
                console.error(`[CloudSync] Real-time sync failed, queuing:`, error.message);
                this._addPendingKey(tableName, operation, recordId);
                this.pendingChanges.push(change);
                this.updateLocalSyncStatus(tableName, recordId, 'pending');
            }
        } else {
            // Offline - queue the change (with deduplication tracking)
            this._addPendingKey(tableName, operation, recordId);
            this.pendingChanges.push(change);
            this.updateLocalSyncStatus(tableName, recordId, 'pending');
            console.log(`[CloudSync] Queued change: ${operation} on ${tableName} (ID: ${recordId}). Queue size: ${this.pendingChanges.length}`);
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
            const allColumns = Object.keys(record);
            const columns = allColumns.filter(col => !LOCAL_ONLY_COLUMNS.includes(col));

            const values = columns.map(col => {
                const val = record[col];
                if (typeof val === 'boolean') return val ? 1 : 0;
                // For roles and other JSON fields, stringify arrays
                if (Array.isArray(val)) return JSON.stringify(val);
                // Skip other objects (not arrays) - these are embedded data, not actual columns
                if (typeof val === 'object' && val !== null) return null;
                return val;
            });

            const placeholders = columns.map(() => '?').join(', ');

            // For users table, use INSERT ... ON DUPLICATE KEY UPDATE to ensure all fields are updated
            let query;
            if (tableName === 'users') {
                const updateClauses = columns
                    .filter(col => col !== 'id')
                    .map(col => `${col} = VALUES(${col})`)
                    .join(', ');
                query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`;

                // Log roles value for debugging
                const rolesIndex = columns.indexOf('roles');
                console.log(`[CloudSync] syncSingleChange pushing user: roles=${rolesIndex >= 0 ? values[rolesIndex] : 'NOT_IN_COLUMNS'}`);
            } else {
                query = `REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
            }

            await executeQuery(query, values);
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
                this._releaseSyncLock();
                return { status: 'failed', reason: 'connection_failed' };
            }

            // Process each pending change
            while (this.pendingChanges.length > 0) {
                const change = this.pendingChanges.shift();
                const { tableName, operation, recordId } = change;

                // Remove from pending keys set
                this._removePendingKey(tableName, operation, recordId);

                // Check retry count
                const retryCount = this._getRetryCount(tableName, recordId);
                if (retryCount >= MAX_RETRY_ATTEMPTS) {
                    console.warn(`[CloudSync] Dropping change after ${MAX_RETRY_ATTEMPTS} failed attempts: ${operation} on ${tableName} (ID: ${recordId})`);
                    this._resetRetryCount(tableName, recordId);
                    this.updateLocalSyncStatus(tableName, recordId, 'failed');
                    dropped++;
                    continue;
                }

                try {
                    await this.syncSingleChange(change);
                    this._resetRetryCount(tableName, recordId);
                    synced++;
                } catch (error) {
                    console.error(`[CloudSync] Failed to sync change (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}):`, error.message);
                    this._incrementRetryCount(tableName, recordId);
                    this._addPendingKey(tableName, operation, recordId);
                    failedChanges.push(change);
                    failed++;
                }
            }

            // Re-queue failed changes (they will be retried next interval)
            this.pendingChanges = [...failedChanges, ...this.pendingChanges];

            this.lastSyncTime = nowISO();
            this.syncStatus = failed > 0 ? 'partial' : 'completed';

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
    async performFullSync() {
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
        console.log('[CloudSync] Starting version-based bidirectional sync...');

        const startTime = Date.now();
        const results = { uploaded: 0, downloaded: 0, conflicts: 0, errors: [] };

        // Step 1: Pull-first tables (users, user_settings) - Pull from cloud FIRST, then push local
        console.log('[CloudSync] Step 1: Syncing pull-first tables (pull from cloud first, then push local)...');
        for (const tableName of PULL_FIRST_TABLES) {
            try {
                // First, pull from cloud to get latest changes
                console.log(`[CloudSync] ${tableName}: Pulling from cloud first...`);
                const pullResult = await this.pullFromCloud(tableName);
                results.downloaded += pullResult.downloaded || 0;

                // Then, push local changes to cloud
                console.log(`[CloudSync] ${tableName}: Now pushing local changes...`);
                const pushResult = await this.syncTable(tableName);
                results.uploaded += pushResult.uploaded || 0;

                console.log(`[CloudSync] ${tableName}: Pulled ${pullResult.downloaded || 0}, Pushed ${pushResult.uploaded || 0}`);
            } catch (error) {
                console.error(`[CloudSync] Error syncing ${tableName}:`, error.message);
                results.errors.push({ table: tableName, error: error.message });
            }
        }

        // Step 2: Bidirectional sync for all other tables (version-based: pull first, then push)
        console.log('[CloudSync] Step 2: Bidirectional sync for other tables (pull first, then push)...');
        for (const tableName of TABLES_TO_SYNC) {
            // Skip pull-first tables (already handled above)
            if (PULL_FIRST_TABLES.includes(tableName)) continue;

            try {
                const syncResult = await this.bidirectionalSyncTable(tableName, false); // version-based
                results.uploaded += syncResult.pushed || 0;
                results.downloaded += syncResult.pulled || 0;
                results.conflicts += syncResult.conflicts || 0;
            } catch (error) {
                console.error(`[CloudSync] Error syncing ${tableName}:`, error.message);
                results.errors.push({ table: tableName, error: error.message });
            }
        }

        const duration = Date.now() - startTime;
        this.lastSyncTime = nowISO();
        this.syncStatus = 'completed';
        this.isSyncing = false;

        // Release lock
        this._releaseSyncLock();

        console.log(`[CloudSync] Bidirectional sync completed in ${duration}ms. Pushed: ${results.uploaded}, Pulled: ${results.downloaded}, Conflicts: ${results.conflicts}`);

        // Broadcast sync completion to update UI
        const totalRecordsUpdated = results.uploaded + results.downloaded;
        broadcastSyncComplete({
            success: results.errors.length === 0,
            tablesAffected: TABLES_TO_SYNC.length,
            recordsUpdated: totalRecordsUpdated,
            uploaded: results.uploaded,
            downloaded: results.downloaded,
            conflicts: results.conflicts,
            duration,
            errors: results.errors
        });

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
            // Disable foreign key checks during sync to avoid FK constraint failures
            // when syncing child records before parent records exist
            // This is safe because we sync tables in dependency order
            db.pragma('foreign_keys = OFF');

            // Get local records
            const localRecords = db.prepare(`SELECT * FROM ${tableName}`).all();
            const localMap = new Map();
            for (const record of localRecords) {
                localMap.set(String(record[primaryKey]), record);
            }
            console.log(`[CloudSync] ${tableName}: Found ${localRecords.length} local records`);

            // Get cloud records
            let cloudRecords = [];
            try {
                cloudRecords = await executeQuery(`SELECT * FROM ${tableName}`) || [];
                console.log(`[CloudSync] ${tableName}: Found ${cloudRecords.length} cloud records`);
            } catch (error) {
                // Table might not exist in cloud yet
                console.log(`[CloudSync] Cloud table ${tableName} may not exist, pushing all local records. Error: ${error.message}`);
            }

            const cloudMap = new Map();
            for (const record of cloudRecords) {
                cloudMap.set(String(record[primaryKey]), record);
            }

            // Get table info for column validation
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const localColumns = tableInfo.map(col => col.name);
            const hasUpdatedAt = localColumns.includes('updated_at');
            const hasCreatedAt = localColumns.includes('created_at');

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
                            await this.pushRecordToCloud(tableName, localRecord, localColumns);
                            this.updateLocalSyncStatus(tableName, id, 'synced');
                            result.pushed++;
                        } else if (syncDecision === 'skip') {
                            // Same version, skip
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
        } finally {
            // Always re-enable foreign key checks after sync
            db.pragma('foreign_keys = ON');
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
                    val = record.username === 'admin' ? '["admin"]' : '["user"]';
                    console.log(`[CloudSync] pushRecordToCloud: Setting default roles for ${record.username}: ${val}`);
                } else if (typeof val === 'object' && Array.isArray(val)) {
                    // If it's an array, stringify it
                    val = JSON.stringify(val);
                }
                // Ensure it's a valid JSON string
                try {
                    JSON.parse(val);
                } catch (e) {
                    val = record.username === 'admin' ? '["admin"]' : '["user"]';
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

            console.log(`[CloudSync] Pushed record to cloud: ${tableName} (ID: ${record.id}, SKU: ${record.sku || 'N/A'}, action: ${action})`);
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

        db.prepare(query).run(...values);

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
            // Disable foreign key checks during sync
            db.pragma('foreign_keys = OFF');

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
        } finally {
            // Always re-enable foreign key checks
            db.pragma('foreign_keys = ON');
        }
    }

    /**
     * Pull records from cloud to local (for cloud-primary tables like users)
     * @param {string} tableName - Table to pull from cloud
     */
    async pullFromCloud(tableName) {
        const db = getDatabase();
        if (!db) throw new Error('Local database not initialized');

        const result = { downloaded: 0, actuallyChanged: 0 };

        try {
            // Disable foreign key checks during sync to avoid FK constraint failures
            // when syncing child records before parent records exist
            db.pragma('foreign_keys = OFF');

            // Get all records from cloud
            const cloudRecords = await executeQuery(`SELECT * FROM ${tableName}`);
            if (!cloudRecords || cloudRecords.length === 0) {
                console.log(`[CloudSync] No records in cloud ${tableName}`);
                return result;
            }

            const columns = Object.keys(cloudRecords[0]);
            const primaryKey = this.getPrimaryKeyColumn(tableName);

            // Get local table info to check which columns exist locally
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const localColumns = tableInfo.map(col => col.name);

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
                            // Compare key fields to detect actual changes
                            if (existingSession.device_id !== record.device_id ||
                                existingSession.session_id !== record.session_id ||
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

            // Broadcast batch change ONLY if records actually changed
            // Skip broadcasting for tables that are polled frequently (active_sessions, users, user_settings)
            // These cause UI refreshes every few seconds when polling, which is undesirable
            const noRefreshTables = ['active_sessions', 'users', 'user_settings'];
            if (result.actuallyChanged > 0 && !noRefreshTables.includes(tableName)) {
                broadcastBatchChange(tableName, result.actuallyChanged, 'SYNC_PULL');
            }

            return result;
        } catch (error) {
            console.error(`[CloudSync] Failed to pull from cloud ${tableName}:`, error.message);
            throw error;
        } finally {
            // Always re-enable foreign key checks after sync
            db.pragma('foreign_keys = ON');
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
                                val = record.username === 'admin' ? '["admin"]' : '["user"]';
                                console.log(`[CloudSync] syncTable: Setting default roles for ${record.username}: ${val}`);
                            } else if (typeof val === 'object' && Array.isArray(val)) {
                                val = JSON.stringify(val);
                            }
                            try {
                                JSON.parse(val);
                            } catch (e) {
                                val = record.username === 'admin' ? '["admin"]' : '["user"]';
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

                    // Mark as synced (check if synced_at column exists)
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
                    restock_id INT NOT NULL,
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    stock_price DECIMAL(15,2) NOT NULL,
                    retail_price DECIMAL(15,2) NOT NULL,
                    expiry_date DATETIME,
                    INDEX idx_restock (restock_id),
                    INDEX idx_item (item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            return_items: `
                CREATE TABLE IF NOT EXISTS return_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    restock_id INT NOT NULL,
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    description TEXT,
                    INDEX idx_restock (restock_id),
                    INDEX idx_item (item_id)
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
                    sale_id INT NOT NULL,
                    item_id INT NOT NULL,
                    stock_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    unit_price DECIMAL(15,2) NOT NULL,
                    discount DECIMAL(15,2) DEFAULT 0,
                    total_price DECIMAL(15,2) NOT NULL,
                    INDEX idx_sale (sale_id),
                    INDEX idx_item (item_id),
                    INDEX idx_stock (stock_id)
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
                    INDEX idx_item (item_id),
                    INDEX idx_stock (stock_id)
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
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            app_settings: `
                CREATE TABLE IF NOT EXISTS app_settings (
                    id VARCHAR(255) PRIMARY KEY,
                    setting_key VARCHAR(255) UNIQUE NOT NULL,
                    setting_value TEXT,
                    setting_type VARCHAR(50) DEFAULT 'string',
                    description TEXT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    INDEX idx_key (setting_key)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            user_settings: `
                CREATE TABLE IF NOT EXISTS user_settings (
                    id VARCHAR(255) PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL UNIQUE,
                    profile_image TEXT,
                    permissions TEXT,
                    theme VARCHAR(50) DEFAULT 'light',
                    language VARCHAR(10) DEFAULT 'en',
                    notifications_enabled TINYINT DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    INDEX idx_user_id (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            login_history: `
                CREATE TABLE IF NOT EXISTS login_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
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
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_user_id (user_id),
                    INDEX idx_login_at (login_at),
                    INDEX idx_status (status),
                    INDEX idx_session_id (session_id),
                    INDEX idx_branch_id (branch_id)
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
            { table: 'restock_transactions', column: 'created_by', definition: 'VARCHAR(255) DEFAULT NULL', after: 'branch_id' }
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
            // Queue for later
            this.pendingChanges.push({
                tableName: 'users',
                operation: 'INSERT',
                record: user,
                recordId: user.id,
                timestamp: nowISO()
            });
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
            // Queue for later
            this.pendingChanges.push({
                tableName: 'user_settings',
                operation: 'INSERT',
                record: settings,
                recordId: settings.id,
                timestamp: nowISO()
            });
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
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            syncStatus: this.syncStatus,
            syncError: this.syncError,
            autoSyncEnabled: this.autoSyncEnabled,
            pendingChangesCount: this.pendingChanges.length,
            mysqlInitialized: this.mysqlInitialized
        };
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
        } else {
            this.startNetworkMonitoring();
            this.startPendingSyncInterval();
        }
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
        await closeMySQLPool();
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
