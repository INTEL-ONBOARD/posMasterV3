/**
 * DataStore - Central Reactive Data Store
 *
 * A singleton store that manages application data with reactive updates.
 * Provides caching, subscriptions, and automatic UI updates when data changes.
 *
 * Features:
 * - Centralized data cache for all tables
 * - Subscription-based reactive updates
 * - Automatic cache invalidation on data changes
 * - Optimistic updates for immediate UI feedback
 * - Works offline (uses local SQLite)
 * - Syncs with cloud when online
 *
 * Usage:
 *   import { dataStore } from './DataStore';
 *
 *   // Subscribe to data changes
 *   const unsubscribe = dataStore.subscribe('sales_transactions', (state) => {
 *     console.log('Sales updated:', state.data);
 *   });
 *
 *   // Fetch data
 *   await dataStore.fetchData('sales_transactions', () => salesApi.getAll());
 */

import {
    categoryApi,
    uomApi,
    branchApi,
    supplierApi,
    itemApi,
    stockApi,
    restockApi,
    memberApi,
    salesApi,
    paymentMethodApi,
    userApi,
    loginHistoryApi,
    teaCoopApi,
    offersApi,
    disposedApi
} from '../api/localApi';

// Table name constants for type safety
export const TABLES = {
    CATEGORIES: 'categories',
    UOM: 'units_of_measurement',
    BRANCHES: 'branches',
    SUPPLIERS: 'suppliers',
    ITEMS: 'items',
    STOCK: 'stock',
    STOCK_ITEMS: 'stock_items', // Combined items + stock view
    RESTOCK_TRANSACTIONS: 'restock_transactions',
    MEMBERS: 'members',
    SALES_TRANSACTIONS: 'sales_transactions',
    PAYMENT_METHODS: 'payment_methods',
    USERS: 'users',
    LOGIN_HISTORY: 'login_history',
    TEA_COOP_MEMBERS: 'tea_coop_members',
    OFFERS_DISCOUNTS: 'offers_discounts',
    DISPOSED_ITEMS: 'disposed_items'
};

// Default fetch functions for each table
const DEFAULT_FETCHERS = {
    [TABLES.CATEGORIES]: () => categoryApi.getAll().then(r => r.data || []),
    [TABLES.UOM]: () => uomApi.getAll().then(r => r.data || []),
    [TABLES.BRANCHES]: () => branchApi.getAll().then(r => r.data || []),
    [TABLES.SUPPLIERS]: () => supplierApi.getAll().then(r => r.data || []),
    [TABLES.ITEMS]: () => itemApi.getAllExtended().then(r => r.data || []),
    [TABLES.STOCK]: () => stockApi.getAllWithItems().then(r => r.data || []),
    [TABLES.STOCK_ITEMS]: () => restockApi.getStockItems().then(r => r.data || []),
    [TABLES.RESTOCK_TRANSACTIONS]: () => restockApi.getAll().then(r => r.data || []),
    [TABLES.MEMBERS]: () => memberApi.getAll().then(r => r.data || []),
    [TABLES.SALES_TRANSACTIONS]: () => salesApi.getAll().then(r => r.data || []),
    [TABLES.PAYMENT_METHODS]: () => paymentMethodApi.getAll().then(r => r.data || []),
    [TABLES.USERS]: () => userApi.getAll().then(r => r.data || []),
    [TABLES.LOGIN_HISTORY]: () => loginHistoryApi.getAll().then(r => r.data || []),
    [TABLES.TEA_COOP_MEMBERS]: () => teaCoopApi.getAllMembers().then(r => r.data || []),
    [TABLES.OFFERS_DISCOUNTS]: () => offersApi.getAll().then(r => r.data || []),
    [TABLES.DISPOSED_ITEMS]: () => disposedApi.getAll().then(r => r.data || [])
};

// Cache TTL in milliseconds (how long before data is considered stale)
// Kept at 2s so back-to-back renders don't hammer the IPC bridge,
// but data is never more than 2s old when the backend pushes a change.
const CACHE_TTL = {
    [TABLES.CATEGORIES]: 2000,
    [TABLES.UOM]: 2000,
    [TABLES.BRANCHES]: 2000,
    [TABLES.SUPPLIERS]: 2000,
    [TABLES.ITEMS]: 2000,
    [TABLES.STOCK]: 2000,
    [TABLES.STOCK_ITEMS]: 2000,
    [TABLES.RESTOCK_TRANSACTIONS]: 2000,
    [TABLES.MEMBERS]: 2000,
    [TABLES.SALES_TRANSACTIONS]: 2000,
    [TABLES.PAYMENT_METHODS]: 2000,
    [TABLES.USERS]: 2000,
    [TABLES.LOGIN_HISTORY]: 2000,
    [TABLES.TEA_COOP_MEMBERS]: 2000,
    default: 2000
};

class DataStore {
    constructor() {
        // Data cache: table -> array of records
        this.cache = new Map();

        // Loading states: table -> boolean
        this.loading = new Map();

        // Error states: table -> Error|null
        this.errors = new Map();

        // Last fetch timestamps: table -> timestamp
        this.lastFetch = new Map();

        // Subscribers: table -> Set of callbacks
        this.subscribers = new Map();

        // Pending fetches to avoid duplicate requests
        this.pendingFetches = new Map();

        // Last refresh timestamps for debouncing batch events
        this._lastRefreshTime = new Map();

        // Store cleanup functions for event listeners
        this._eventCleanupFunctions = [];

        // Flag to prevent duplicate listener setup
        this._listenersInitialized = false;

        // Initialize backend event listeners
        this._setupEventListeners();

        console.log('[DataStore] Initialized');
    }

    /**
     * Setup listeners for backend events
     * Returns cleanup functions that can be called to remove listeners
     */
    _setupEventListeners() {
        // Prevent duplicate listener setup
        if (this._listenersInitialized) {
            console.warn('[DataStore] Event listeners already initialized');
            return;
        }

        if (typeof window === 'undefined' || !window.electronAPI) {
            console.warn('[DataStore] Not in Electron environment, skipping event listeners');
            return;
        }

        // Clear any existing cleanup functions
        this._eventCleanupFunctions = [];

        // Listen for data changes from backend (local operations)
        if (window.electronAPI.onDataChange) {
            const cleanup = window.electronAPI.onDataChange((event) => {
                console.log('[DataStore] Data changed:', event.table, event.operation);
                this._handleDataChange(event);
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Listen for sync status changes
        if (window.electronAPI.onSyncStatusChange) {
            const cleanup = window.electronAPI.onSyncStatusChange((status) => {
                console.log('[DataStore] Sync status changed:', status);
                this._handleSyncStatusChange(status);
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Listen for refresh needed events (after cloud sync)
        if (window.electronAPI.onRefreshNeeded) {
            const cleanup = window.electronAPI.onRefreshNeeded((event) => {
                console.log('[DataStore] Refresh needed for:', event.table);
                this._handleRefreshNeeded(event);
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Listen for connection status changes
        if (window.electronAPI.onConnectionStatusChange) {
            const cleanup = window.electronAPI.onConnectionStatusChange((status) => {
                console.log('[DataStore] Connection status:', status.isOnline ? 'online' : 'offline');
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Listen for sync completion events
        if (window.electronAPI.onSyncCompleted) {
            const cleanup = window.electronAPI.onSyncCompleted((result) => {
                console.log('[DataStore] Sync completed:', result.success ? 'success' : 'failed');
                this._handleSyncCompleted(result);
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Listen for multi-table change events (after full cloud sync)
        if (window.electronAPI.onMultiTableChanged) {
            const cleanup = window.electronAPI.onMultiTableChanged((data) => {
                console.log('[DataStore] Multi-table changed:', data.tables?.length, 'tables');
                this._handleMultiTableChange(data);
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Listen for branch context changes - invalidate all caches so components
        // refetch with the correct branch filter applied
        if (window.electronAPI.branchContext?.onBranchChanged) {
            const cleanup = window.electronAPI.branchContext.onBranchChanged((branch) => {
                console.log('[DataStore] Branch changed to:', branch?.name || 'none', '- invalidating all caches');
                this.invalidateAll();
                this._refreshStaleCaches();
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        // Clear stale cache when a session kick is detected so the next user
        // doesn't briefly see data from the previous user's session.
        if (window.electronAPI?.onSessionKicked) {
            const cleanup = window.electronAPI.onSessionKicked(() => {
                console.log('[DataStore] Session kicked — clearing all caches');
                this.cleanup();
            });
            if (typeof cleanup === 'function') {
                this._eventCleanupFunctions.push(cleanup);
            }
        }

        this._listenersInitialized = true;
        console.log('[DataStore] Event listeners initialized, cleanup functions:', this._eventCleanupFunctions.length);
    }

    /**
     * Cleanup event listeners to prevent memory leaks
     * Call this when the store is no longer needed
     */
    cleanup() {
        // Call all cleanup functions
        for (const cleanupFn of this._eventCleanupFunctions) {
            try {
                cleanupFn();
            } catch (e) {
                console.error('[DataStore] Error during cleanup:', e);
            }
        }
        this._eventCleanupFunctions = [];
        this._listenersInitialized = false;

        // Clear all data
        this.clear();

        // Clear all subscribers
        this.subscribers.clear();

        console.log('[DataStore] Cleaned up');
    }

    /**
     * Reinitialize the store (cleanup and setup again)
     */
    reinitialize() {
        this.cleanup();
        this._setupEventListeners();
        console.log('[DataStore] Reinitialized');
    }

    /**
     * Handle data change events from backend
     */
    _handleDataChange(event) {
        const { table, operation, recordId, record, isBatch, count } = event;

        // Map backend table names to our table constants if needed
        const normalizedTable = this._normalizeTableName(table);

        // For batch sync operations, skip if no records changed or use debouncing
        if (isBatch) {
            if (count === 0) {
                return; // No actual changes
            }
            // Debounce batch updates - skip if we recently handled this table
            const lastRefresh = this._lastRefreshTime?.get(normalizedTable) || 0;
            if (Date.now() - lastRefresh < 500) {
                console.log(`[DataStore] Skipping batch change for ${normalizedTable} (debounced)`);
                return;
            }
            // Set timestamp BEFORE refetch to prevent concurrent events from also refetching
            if (!this._lastRefreshTime) this._lastRefreshTime = new Map();
            this._lastRefreshTime.set(normalizedTable, Date.now());
            // For batch operations, just invalidate and refetch if there are subscribers
            this.invalidate(normalizedTable);
            const subscribers = this.subscribers.get(normalizedTable);
            if (subscribers && subscribers.size > 0) {
                this.refetch(normalizedTable);
            }
            return;
        }

        if (!this.cache.has(normalizedTable)) {
            // Table not in cache, nothing to update
            return;
        }

        const currentData = this.cache.get(normalizedTable) || [];
        let newData;

        switch (operation) {
            case 'INSERT': {
                // For formatted tables, broadcast record is flat — refetch to get formatted shape
                const FORMATTED_TABLES_INSERT = [
                    TABLES.SUPPLIERS, TABLES.STOCK, TABLES.STOCK_ITEMS
                ];
                if (FORMATTED_TABLES_INSERT.includes(normalizedTable)) {
                    this.invalidate(normalizedTable);
                    const subscribers = this.subscribers.get(normalizedTable);
                    if (subscribers && subscribers.size > 0) {
                        this.refetch(normalizedTable);
                    }
                    return;
                }
                // Add new record to cache
                newData = [...currentData, record];
                break;
            }

            case 'UPDATE': {
                // For tables that use a nested/formatted structure in the cache
                // (suppliers, stock), the broadcast record is a flat raw DB row —
                // merging it would corrupt nested fields like account_info, item{}.
                // Detect this mismatch by checking if the cached item has nested objects
                // that the incoming record does not, and refetch instead.
                const FORMATTED_TABLES = [
                    TABLES.SUPPLIERS, TABLES.STOCK, TABLES.STOCK_ITEMS
                ];
                if (FORMATTED_TABLES.includes(normalizedTable)) {
                    // Don't merge — just invalidate and refetch
                    this.invalidate(normalizedTable);
                    const subscribers = this.subscribers.get(normalizedTable);
                    if (subscribers && subscribers.size > 0) {
                        this.refetch(normalizedTable);
                    }
                    return;
                }
                // Update existing record in cache
                newData = currentData.map(item =>
                    (item.id === recordId || item.id === record?.id)
                        ? { ...item, ...record }
                        : item
                );
                break;
            }

            case 'DELETE':
                // Remove record from cache
                newData = currentData.filter(item =>
                    item.id !== recordId && item.id !== record?.id
                );
                break;

            default:
                console.warn('[DataStore] Unknown operation:', operation);
                return;
        }

        // Update cache
        this.cache.set(normalizedTable, newData);
        this.lastFetch.set(normalizedTable, Date.now());

        // Notify subscribers
        this._notifySubscribers(normalizedTable);

        // Also update related tables that might be affected
        this._updateRelatedTables(normalizedTable, operation);
    }

    /**
     * Handle sync status changes
     */
    _handleSyncStatusChange(status) {
        // If sync completed, we might need to refresh data
        if (status.syncStatus === 'completed' || status.status === 'completed') {
            console.log('[DataStore] Sync completed, refreshing stale caches');
            this._refreshStaleCaches();
        }
    }

    /**
     * Handle refresh needed events (triggered after cloud sync pulls data)
     */
    _handleRefreshNeeded(event) {
        const { table, count } = event;
        const normalizedTable = this._normalizeTableName(table);

        // Skip if no records were actually changed
        if (count === 0) {
            return;
        }

        // Debounce: Skip if we recently refreshed this table (within 500ms)
        const lastRefresh = this._lastRefreshTime?.get(normalizedTable) || 0;
        if (Date.now() - lastRefresh < 500) {
            console.log(`[DataStore] Skipping refresh for ${normalizedTable} (debounced)`);
            return;
        }

        // Invalidate cache for this table
        this.invalidate(normalizedTable);

        // If there are active subscribers, refetch immediately
        const subscribers = this.subscribers.get(normalizedTable);
        if (subscribers && subscribers.size > 0) {
            // Track refresh time
            if (!this._lastRefreshTime) this._lastRefreshTime = new Map();
            this._lastRefreshTime.set(normalizedTable, Date.now());

            this.refetch(normalizedTable);
        }
    }

    /**
     * Handle sync completion events
     * @param {Object} result - { success, tablesAffected, recordsUpdated, error }
     */
    _handleSyncCompleted(result) {
        if (result.success) {
            // Refresh all stale caches after successful sync
            this._refreshStaleCaches();

            // If specific tables were affected, refetch them for active subscribers
            if (result.tablesAffected && Array.isArray(result.tablesAffected)) {
                for (const table of result.tablesAffected) {
                    const normalizedTable = this._normalizeTableName(table);
                    const subscribers = this.subscribers.get(normalizedTable);
                    if (subscribers && subscribers.size > 0) {
                        this.invalidate(normalizedTable);
                        this.refetch(normalizedTable);
                    }
                }
            }
        }
    }

    /**
     * Handle multi-table change events (after full cloud sync)
     * @param {Object} data - { changes: [{table, count}], totalRecords, tables }
     */
    _handleMultiTableChange(data) {
        const { changes, tables, totalRecords } = data;

        // Skip if no actual records changed
        if (!totalRecords || totalRecords === 0) {
            return;
        }

        // Track which tables we've already processed
        const processedTables = new Set();

        // Process tables list
        if (tables && Array.isArray(tables)) {
            for (const table of tables) {
                const normalizedTable = this._normalizeTableName(table);

                // Debounce: Skip if we recently refreshed this table
                const lastRefresh = this._lastRefreshTime?.get(normalizedTable) || 0;
                if (Date.now() - lastRefresh < 500) {
                    console.log(`[DataStore] Skipping multi-table refresh for ${normalizedTable} (debounced)`);
                    continue;
                }

                this.invalidate(normalizedTable);
                processedTables.add(normalizedTable);

                // Refetch if there are active subscribers
                const subscribers = this.subscribers.get(normalizedTable);
                if (subscribers && subscribers.size > 0) {
                    if (!this._lastRefreshTime) this._lastRefreshTime = new Map();
                    this._lastRefreshTime.set(normalizedTable, Date.now());
                    this.refetch(normalizedTable);
                }
            }
        }

        // Also process individual changes if provided (for tables not in the tables list)
        if (changes && Array.isArray(changes)) {
            for (const change of changes) {
                if (change.count > 0) {
                    const normalizedTable = this._normalizeTableName(change.table);

                    // Skip if already processed
                    if (processedTables.has(normalizedTable)) {
                        continue;
                    }

                    // Debounce check
                    const lastRefresh = this._lastRefreshTime?.get(normalizedTable) || 0;
                    if (Date.now() - lastRefresh < 500) {
                        continue;
                    }

                    this.invalidate(normalizedTable);
                    const subscribers = this.subscribers.get(normalizedTable);
                    if (subscribers && subscribers.size > 0) {
                        if (!this._lastRefreshTime) this._lastRefreshTime = new Map();
                        this._lastRefreshTime.set(normalizedTable, Date.now());
                        this.refetch(normalizedTable);
                    }
                }
            }
        }
    }

    /**
     * Normalize table name to match our constants
     */
    _normalizeTableName(table) {
        // Handle common variations and backend table names
        const mapping = {
            // Sales
            'sales': TABLES.SALES_TRANSACTIONS,
            'sales_transactions': TABLES.SALES_TRANSACTIONS,
            // Restocks
            'restocks': TABLES.RESTOCK_TRANSACTIONS,
            'restock_transactions': TABLES.RESTOCK_TRANSACTIONS,
            // Units of measurement
            'uom': TABLES.UOM,
            'units_of_measurement': TABLES.UOM,
            // Stock
            'stock': TABLES.STOCK,
            'stock_with_items': TABLES.STOCK_ITEMS,
            'stock_items': TABLES.STOCK_ITEMS,
            // Items
            'items': TABLES.ITEMS,
            // Members
            'members': TABLES.MEMBERS,
            // Suppliers
            'suppliers': TABLES.SUPPLIERS,
            // Categories
            'categories': TABLES.CATEGORIES,
            // Branches
            'branches': TABLES.BRANCHES,
            // Users
            'users': TABLES.USERS,
            // Tea Coop
            'tea_coop_members': TABLES.TEA_COOP_MEMBERS,
            // Other
            'login_history': TABLES.LOGIN_HISTORY,
            'payment_methods': TABLES.PAYMENT_METHODS
        };
        return mapping[table] || table;
    }

    /**
     * Update related tables when a table changes
     */
    _updateRelatedTables(table, operation) {
        // Define relationships between tables
        const relationships = {
            [TABLES.ITEMS]: [TABLES.STOCK_ITEMS, TABLES.STOCK],
            [TABLES.STOCK]: [TABLES.STOCK_ITEMS],
            [TABLES.SALES_TRANSACTIONS]: [TABLES.STOCK, TABLES.STOCK_ITEMS, TABLES.MEMBERS],
            [TABLES.RESTOCK_TRANSACTIONS]: [TABLES.STOCK, TABLES.STOCK_ITEMS]
        };

        const relatedTables = relationships[table] || [];

        for (const relatedTable of relatedTables) {
            // Invalidate related table cache (don't refetch immediately)
            this.invalidate(relatedTable);
        }
    }

    /**
     * Refresh caches that are stale
     */
    _refreshStaleCaches() {
        const now = Date.now();

        for (const [table, subscribers] of this.subscribers.entries()) {
            if (subscribers.size === 0) continue;

            const lastFetch = this.lastFetch.get(table) || 0;
            const ttl = CACHE_TTL[table] || CACHE_TTL.default;

            if (now - lastFetch > ttl) {
                console.log('[DataStore] Refreshing stale cache for:', table);
                this.refetch(table);
            }
        }
    }

    /**
     * Subscribe to a table's data changes
     * @param {string} table - Table name from TABLES constant
     * @param {Function} callback - Called with { data, loading, error }
     * @returns {Function} Unsubscribe function
     */
    subscribe(table, callback) {
        if (!this.subscribers.has(table)) {
            this.subscribers.set(table, new Set());
        }

        this.subscribers.get(table).add(callback);

        // Immediately call with current state
        callback(this.getState(table));

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(table);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(table);
                }
            }
        };
    }

    /**
     * Get current state for a table
     * @param {string} table - Table name
     * @returns {{ data: Array, loading: boolean, error: Error|null }}
     */
    getState(table) {
        return {
            data: this.cache.get(table) || [],
            loading: this.loading.get(table) || false,
            error: this.errors.get(table) || null
        };
    }

    /**
     * Notify all subscribers of a table
     */
    _notifySubscribers(table) {
        const subscribers = this.subscribers.get(table);
        if (!subscribers) return;

        const state = this.getState(table);

        subscribers.forEach(callback => {
            try {
                callback(state);
            } catch (e) {
                console.error('[DataStore] Subscriber error:', e);
            }
        });
    }

    /**
     * Fetch data for a table
     * @param {string} table - Table name from TABLES constant
     * @param {Function} [fetchFn] - Optional custom fetch function
     * @param {boolean} [forceRefresh=false] - Force refresh even if cache is valid
     * @returns {Promise<Array>} The fetched data
     */
    async fetchData(table, fetchFn = null, forceRefresh = false) {
        const fetcher = fetchFn || DEFAULT_FETCHERS[table];

        if (!fetcher) {
            console.warn('[DataStore] No fetcher available for table:', table);
            return [];
        }

        // Check if we have a pending fetch for this table (skip if forcing refresh)
        if (!forceRefresh && this.pendingFetches.has(table)) {
            return this.pendingFetches.get(table);
        }

        // Check if cache is still valid
        if (!forceRefresh) {
            const lastFetch = this.lastFetch.get(table) || 0;
            const ttl = CACHE_TTL[table] || CACHE_TTL.default;

            if (Date.now() - lastFetch < ttl && this.cache.has(table)) {
                return this.cache.get(table);
            }
        }

        // Set loading state
        this.loading.set(table, true);
        this.errors.set(table, null);
        this._notifySubscribers(table);

        // Create fetch promise
        const fetchPromise = (async () => {
            try {
                const data = await fetcher();

                // Update cache
                this.cache.set(table, data);
                this.lastFetch.set(table, Date.now());
                this.errors.set(table, null);

                return data;
            } catch (error) {
                console.error(`[DataStore] Failed to fetch ${table}:`, error);
                this.errors.set(table, error);
                throw error;
            } finally {
                this.loading.set(table, false);
                this.pendingFetches.delete(table);
                this._notifySubscribers(table);
            }
        })();

        // Store pending fetch
        this.pendingFetches.set(table, fetchPromise);

        return fetchPromise;
    }

    /**
     * Force refetch data for a table
     * @param {string} table - Table name
     * @returns {Promise<Array>}
     */
    async refetch(table) {
        return this.fetchData(table, null, true);
    }

    /**
     * Invalidate cache for a table (next access will refetch)
     * @param {string} table - Table name
     */
    invalidate(table) {
        this.lastFetch.delete(table);
    }

    /**
     * Invalidate all caches
     */
    invalidateAll() {
        this.lastFetch.clear();
    }

    /**
     * Optimistically update a record in cache
     * Used for immediate UI feedback before server confirms
     * @param {string} table - Table name
     * @param {string} operation - 'INSERT', 'UPDATE', or 'DELETE'
     * @param {Object} record - The record data
     * @param {string|number} [recordId] - The record ID (for UPDATE/DELETE)
     */
    optimisticUpdate(table, operation, record, recordId = null) {
        const currentData = this.cache.get(table) || [];
        let newData;

        switch (operation) {
            case 'INSERT':
                newData = [...currentData, record];
                break;
            case 'UPDATE':
                newData = currentData.map(item =>
                    item.id === (recordId || record.id) ? { ...item, ...record } : item
                );
                break;
            case 'DELETE':
                newData = currentData.filter(item => item.id !== (recordId || record.id));
                break;
            default:
                return;
        }

        this.cache.set(table, newData);
        this._notifySubscribers(table);
    }

    /**
     * Get cached data for a table without triggering a fetch
     * @param {string} table - Table name
     * @returns {Array|null} Cached data or null if not in cache
     */
    getCached(table) {
        return this.cache.get(table) || null;
    }

    /**
     * Rollback cache to a previous state (used for optimistic update rollback)
     * @param {string} table - Table name
     * @param {Array} previousData - Previous data to restore
     */
    rollbackCache(table, previousData) {
        if (previousData !== null && previousData !== undefined) {
            this.cache.set(table, previousData);
            this._notifySubscribers(table);
        }
    }

    /**
     * Check if data for a table is stale
     * @param {string} table - Table name
     * @returns {boolean}
     */
    isStale(table) {
        const lastFetch = this.lastFetch.get(table);
        if (!lastFetch) return true;

        const ttl = CACHE_TTL[table] || CACHE_TTL.default;
        return Date.now() - lastFetch > ttl;
    }

    /**
     * Preload data for multiple tables
     * @param {string[]} tables - Array of table names
     * @returns {Promise<void>}
     */
    async preload(tables) {
        const promises = tables.map(table =>
            this.fetchData(table).catch(err => {
                console.warn(`[DataStore] Failed to preload ${table}:`, err.message);
                return [];
            })
        );
        await Promise.all(promises);
    }

    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
        this.loading.clear();
        this.errors.clear();
        this.lastFetch.clear();
        this.pendingFetches.clear();
    }

    /**
     * Get statistics about the store
     * @returns {Object}
     */
    getStats() {
        return {
            cachedTables: this.cache.size,
            activeSubscriptions: Array.from(this.subscribers.entries()).reduce(
                (acc, [table, subs]) => acc + subs.size, 0
            ),
            pendingFetches: this.pendingFetches.size,
            tables: Array.from(this.cache.keys())
        };
    }
}

// Create singleton instance
export const dataStore = new DataStore();

// Export class for testing
export { DataStore };

export default dataStore;
