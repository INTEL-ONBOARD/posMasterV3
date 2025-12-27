/**
 * useRealTimeSync Hook
 *
 * Provides real-time data synchronization and UI updates.
 * Listens for data changes from the backend and triggers re-fetches.
 *
 * Usage:
 * ```jsx
 * const { isOnline, connectionQuality, subscribe } = useRealTimeSync();
 *
 * // Subscribe to specific table changes
 * useEffect(() => {
 *   const unsubscribe = subscribe('items', (change) => {
 *     // Refetch items when they change
 *     fetchItems();
 *   });
 *   return unsubscribe;
 * }, []);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Global state for sync status
let globalSyncStatus = {
    isOnline: true,
    connectionQuality: 'unknown',
    pendingCount: 0,
    lastSyncTime: null
};

// Subscribers map: table -> Set<callback>
const tableSubscribers = new Map();

// Global status subscribers
const statusSubscribers = new Set();

/**
 * Hook for real-time sync status and data change subscriptions
 */
export function useRealTimeSync(options = {}) {
    const [syncStatus, setSyncStatus] = useState(globalSyncStatus);
    const listenersSetup = useRef(false);

    // Setup global listeners once
    useEffect(() => {
        if (listenersSetup.current) return;
        if (!window.electronAPI) return;

        listenersSetup.current = true;

        // Listen for data changes
        const unsubscribeData = window.electronAPI.onDataChange?.((data) => {
            const { table, operation, recordId, record } = data;

            // Notify table subscribers
            const subscribers = tableSubscribers.get(table);
            if (subscribers) {
                subscribers.forEach(callback => {
                    try {
                        callback({ table, operation, recordId, record });
                    } catch (e) {
                        console.error('[useRealTimeSync] Subscriber error:', e);
                    }
                });
            }

            // Also notify 'all' subscribers
            const allSubscribers = tableSubscribers.get('all');
            if (allSubscribers) {
                allSubscribers.forEach(callback => {
                    try {
                        callback({ table, operation, recordId, record });
                    } catch (e) {
                        console.error('[useRealTimeSync] All-subscriber error:', e);
                    }
                });
            }
        });

        // Listen for sync status changes
        const unsubscribeStatus = window.electronAPI.onSyncStatusChange?.((status) => {
            globalSyncStatus = {
                isOnline: status.isOnline ?? globalSyncStatus.isOnline,
                connectionQuality: status.connectionQuality ?? globalSyncStatus.connectionQuality,
                pendingCount: status.pendingCount ?? globalSyncStatus.pendingCount,
                lastSyncTime: status.lastSyncTime ?? globalSyncStatus.lastSyncTime
            };

            // Notify all status subscribers
            statusSubscribers.forEach(callback => {
                try {
                    callback(globalSyncStatus);
                } catch (e) {
                    console.error('[useRealTimeSync] Status subscriber error:', e);
                }
            });
        });

        // Cleanup on app unload (won't run on component unmount)
        window.addEventListener('beforeunload', () => {
            unsubscribeData?.();
            unsubscribeStatus?.();
        });

    }, []);

    // Subscribe to status updates for this component
    useEffect(() => {
        const updateStatus = (status) => {
            setSyncStatus({ ...status });
        };

        statusSubscribers.add(updateStatus);
        return () => statusSubscribers.delete(updateStatus);
    }, []);

    /**
     * Subscribe to changes for a specific table
     * @param {string} table - Table name or 'all' for all tables
     * @param {Function} callback - Called with { table, operation, recordId, record }
     * @returns {Function} Unsubscribe function
     */
    const subscribe = useCallback((table, callback) => {
        if (!tableSubscribers.has(table)) {
            tableSubscribers.set(table, new Set());
        }

        tableSubscribers.get(table).add(callback);

        return () => {
            const subscribers = tableSubscribers.get(table);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    tableSubscribers.delete(table);
                }
            }
        };
    }, []);

    /**
     * Force a sync now
     */
    const syncNow = useCallback(async () => {
        if (!window.electronAPI?.cloudSync?.syncNow) return null;
        return window.electronAPI.cloudSync.syncNow();
    }, []);

    /**
     * Get current network status
     */
    const checkNetwork = useCallback(async () => {
        if (!window.electronAPI?.cloudSync?.checkNetwork) return null;
        return window.electronAPI.cloudSync.checkNetwork();
    }, []);

    return {
        isOnline: syncStatus.isOnline,
        connectionQuality: syncStatus.connectionQuality,
        pendingCount: syncStatus.pendingCount,
        lastSyncTime: syncStatus.lastSyncTime,
        subscribe,
        syncNow,
        checkNetwork
    };
}

/**
 * Hook for subscribing to a specific table's changes
 * Automatically refetches when data changes
 */
export function useTableSubscription(tableName, onChangeCallback) {
    const { subscribe } = useRealTimeSync();

    useEffect(() => {
        if (!tableName || !onChangeCallback) return;

        const unsubscribe = subscribe(tableName, onChangeCallback);
        return unsubscribe;
    }, [tableName, onChangeCallback, subscribe]);
}

/**
 * Hook for auto-refetching data when a table changes
 * @param {string} tableName - The table to watch
 * @param {Function} fetchFn - The fetch function to call on changes
 * @param {Array} deps - Additional dependencies for the fetch
 */
export function useAutoRefetch(tableName, fetchFn, deps = []) {
    const { subscribe } = useRealTimeSync();
    const fetchRef = useRef(fetchFn);

    // Keep fetch function reference updated
    useEffect(() => {
        fetchRef.current = fetchFn;
    }, [fetchFn]);

    useEffect(() => {
        const unsubscribe = subscribe(tableName, () => {
            // Debounce refetch by 100ms to batch rapid changes
            setTimeout(() => {
                fetchRef.current?.();
            }, 100);
        });

        return unsubscribe;
    }, [tableName, subscribe, ...deps]);
}

/**
 * Connection quality indicator component helper
 */
export function getConnectionQualityColor(quality) {
    switch (quality) {
        case 'excellent': return 'green';
        case 'good': return 'lime';
        case 'poor': return 'yellow';
        case 'offline': return 'red';
        default: return 'gray';
    }
}

export default useRealTimeSync;
