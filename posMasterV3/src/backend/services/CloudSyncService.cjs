/**
 * Cloud Sync Service
 * Handles real-time synchronization between local SQLite and cloud MySQL
 *
 * Features:
 * - Real-time sync when online (immediate push on data changes)
 * - Offline queue for pending changes
 * - Auto-sync pending changes when internet is restored
 * - Network connectivity monitoring
 * - Local database is ALWAYS the primary source
 */

const { getDatabase } = require('../database/connection.cjs');
const {
    initializeMySQLPool,
    testConnection,
    executeQuery,
    closeMySQLPool
} = require('../database/mysql-connection.cjs');
const dns = require('dns');

// Sync configuration
const NETWORK_CHECK_INTERVAL_MS = 10000; // Check network every 10 seconds
const PENDING_SYNC_INTERVAL_MS = 30000; // Try to sync pending changes every 30 seconds

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
    'app_settings',
    'user_settings'
];

// Tables that shouldn't sync (local only)
const LOCAL_ONLY_TABLES = ['sessions', 'sync_queue', 'migrations', 'price_change_history'];

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
            await initializeMySQLPool();
            const connected = await testConnection();

            if (connected) {
                await this.createMySQLSchema();
                this.mysqlInitialized = true;
                console.log('[CloudSync] MySQL initialized successfully');
                return true;
            }
        } catch (error) {
            console.error('[CloudSync] Failed to initialize MySQL:', error.message);
        }
        return false;
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

        const change = {
            tableName,
            operation,
            record,
            recordId,
            timestamp: new Date().toISOString()
        };

        // If online, sync immediately
        if (this.isOnline && this.mysqlInitialized) {
            try {
                await this.syncSingleChange(change);
                console.log(`[CloudSync] Real-time sync: ${operation} on ${tableName} (ID: ${recordId})`);
            } catch (error) {
                console.error(`[CloudSync] Real-time sync failed, queuing:`, error.message);
                this.pendingChanges.push(change);
                this.updateLocalSyncStatus(tableName, recordId, 'pending');
            }
        } else {
            // Offline - queue the change
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

            // Check if table has sync_status column
            const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const hasSyncStatus = tableInfo.some(col => col.name === 'sync_status');

            if (hasSyncStatus) {
                const now = new Date().toISOString();
                if (status === 'synced') {
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
            const columns = Object.keys(record);
            const values = columns.map(col => {
                const val = record[col];
                if (typeof val === 'boolean') return val ? 1 : 0;
                return val;
            });

            const placeholders = columns.map(() => '?').join(', ');
            const query = `REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

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
            return { synced: 0, failed: 0 };
        }

        if (this.isSyncing) {
            return { status: 'skipped', reason: 'already_syncing' };
        }

        this.isSyncing = true;
        this.syncStatus = 'syncing';
        console.log(`[CloudSync] Syncing ${this.pendingChanges.length} pending changes...`);

        let synced = 0;
        let failed = 0;
        const failedChanges = [];

        // Test connection first
        if (!await testConnection()) {
            this.isSyncing = false;
            this.syncStatus = 'connection_failed';
            return { status: 'failed', reason: 'connection_failed' };
        }

        // Process each pending change
        while (this.pendingChanges.length > 0) {
            const change = this.pendingChanges.shift();

            try {
                await this.syncSingleChange(change);
                synced++;
            } catch (error) {
                console.error(`[CloudSync] Failed to sync change:`, error.message);
                failedChanges.push(change);
                failed++;
            }
        }

        // Re-queue failed changes
        this.pendingChanges = [...failedChanges, ...this.pendingChanges];

        this.lastSyncTime = new Date().toISOString();
        this.syncStatus = failed > 0 ? 'partial' : 'completed';
        this.isSyncing = false;

        console.log(`[CloudSync] Pending sync complete. Synced: ${synced}, Failed: ${failed}`);

        // If we were offline before, do a full sync to catch any missed data
        if (this.wasOffline && synced > 0) {
            this.wasOffline = false;
            this.performFullSync().catch(err =>
                console.error('[CloudSync] Post-offline full sync failed:', err.message)
            );
        }

        return { synced, failed };
    }

    /**
     * Perform a full sync of all tables (all local data -> cloud)
     */
    async performFullSync() {
        if (this.isSyncing) {
            return { status: 'skipped', reason: 'already_syncing' };
        }

        if (!this.isOnline) {
            return { status: 'skipped', reason: 'offline' };
        }

        if (!await testConnection()) {
            return { status: 'skipped', reason: 'connection_failed' };
        }

        this.isSyncing = true;
        this.syncStatus = 'full_sync';
        console.log('[CloudSync] Starting full sync...');

        const startTime = Date.now();
        const results = { uploaded: 0, errors: [] };

        for (const tableName of TABLES_TO_SYNC) {
            try {
                const tableResult = await this.syncTable(tableName);
                results.uploaded += tableResult.uploaded || 0;
            } catch (error) {
                console.error(`[CloudSync] Error syncing ${tableName}:`, error.message);
                results.errors.push({ table: tableName, error: error.message });
            }
        }

        const duration = Date.now() - startTime;
        this.lastSyncTime = new Date().toISOString();
        this.syncStatus = 'completed';
        this.isSyncing = false;

        console.log(`[CloudSync] Full sync completed in ${duration}ms. Uploaded: ${results.uploaded}`);

        return { status: 'success', duration, ...results };
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

            const columns = Object.keys(localRecords[0]);
            const primaryKey = this.getPrimaryKeyColumn(tableName);

            for (const record of localRecords) {
                try {
                    const values = columns.map(col => {
                        const val = record[col];
                        if (typeof val === 'boolean') return val ? 1 : 0;
                        return val;
                    });

                    const placeholders = columns.map(() => '?').join(', ');
                    const query = `REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

                    await executeQuery(query, values);
                    result.uploaded++;

                    // Mark as synced
                    if (columns.includes('sync_status')) {
                        db.prepare(`UPDATE ${tableName} SET sync_status = 'synced', synced_at = ? WHERE ${primaryKey} = ?`)
                            .run(new Date().toISOString(), record[primaryKey]);
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
                    roles TEXT DEFAULT '[]',
                    is_active TINYINT DEFAULT 1,
                    last_login_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    synced_at DATETIME,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_email (email),
                    INDEX idx_username (username)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
            categories: `
                CREATE TABLE IF NOT EXISTS categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    brand VARCHAR(255) NOT NULL,
                    type VARCHAR(255) NOT NULL,
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_sku (sku),
                    INDEX idx_name (item_name),
                    INDEX idx_category (category_id)
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE KEY unique_item_batch (item_id, batch_code),
                    INDEX idx_item (item_id),
                    INDEX idx_batch (batch_code)
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_invoice (invoice_no),
                    INDEX idx_supplier (supplier_id)
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_member_no (member_no),
                    INDEX idx_name (full_name)
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_invoice (invoice_no),
                    INDEX idx_member (member_id),
                    INDEX idx_cashier (cashier_id)
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
                    permissions TEXT DEFAULT '{}',
                    theme VARCHAR(50) DEFAULT 'light',
                    language VARCHAR(10) DEFAULT 'en',
                    notifications_enabled TINYINT DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    INDEX idx_user_id (user_id)
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
