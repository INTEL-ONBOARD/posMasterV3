/**
 * useRealTimeSync Hook
 *
 * Provides realtime data refresh and UI updates.
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
import { onlineStatusApi } from '../api/localApi';

const DEFAULT_SYNC_STATUS = {
    isOnline: false,
    isSyncing: false,
    syncStatus: 'idle',
    status: 'idle',
    connectionQuality: 'unknown',
    pendingCount: 0,
    pendingChangesCount: 0,
    lastSyncTime: null
};

function normalizeSyncStatus(status = {}) {
    const pendingCount = status.pendingCount ?? status.pendingChangesCount ?? 0;
    const syncStatus = status.syncStatus ?? status.status ?? DEFAULT_SYNC_STATUS.syncStatus;

    return {
        ...DEFAULT_SYNC_STATUS,
        ...status,
        isOnline: status.isOnline ?? DEFAULT_SYNC_STATUS.isOnline,
        isSyncing: status.isSyncing ?? DEFAULT_SYNC_STATUS.isSyncing,
        syncStatus,
        status: syncStatus,
        connectionQuality: status.connectionQuality ?? DEFAULT_SYNC_STATUS.connectionQuality,
        pendingCount,
        pendingChangesCount: pendingCount,
        lastSyncTime: status.lastSyncTime ?? DEFAULT_SYNC_STATUS.lastSyncTime
    };
}

// Global state for realtime status
let globalSyncStatus = { ...DEFAULT_SYNC_STATUS };

// Subscribers map: table -> Set<callback>
const tableSubscribers = new Map();

// Global status subscribers
const statusSubscribers = new Set();

// Track whether Electron IPC listeners are attached at module level.
// Using a module-level flag (not a useRef) prevents duplicate listener
// registration on React Fast Refresh cycles — useRef resets per-instance
// while this persists across remounts.
let electronListenersAttached = false;
let electronUnsubscribeData = null;
let electronUnsubscribeStatus = null;

/**
 * Reset all module-level realtime state.
 * MUST be called on user logout to prevent subscriber callbacks and status
 * status from leaking into the next user's session.
 */
export function resetSyncModuleState() {
    // Detach IPC listeners
    if (electronUnsubscribeData) {
        try { electronUnsubscribeData(); } catch { /* ignore */ }
        electronUnsubscribeData = null;
    }
    if (electronUnsubscribeStatus) {
        try { electronUnsubscribeStatus(); } catch { /* ignore */ }
        electronUnsubscribeStatus = null;
    }
    electronListenersAttached = false;

    // Clear all table and status subscribers
    tableSubscribers.clear();
    statusSubscribers.clear();

    // Reset realtime status to defaults
    globalSyncStatus = { ...DEFAULT_SYNC_STATUS };
}

/**
 * Hook for realtime status and data change subscriptions
 */
export function useRealTimeSync() {
    const [syncStatus, setSyncStatus] = useState(globalSyncStatus);

    // Attach Electron IPC listeners once at module level (not per-component-instance).
    // This prevents duplicate listeners on React Fast Refresh or multiple hook consumers.
    useEffect(() => {
        if (electronListenersAttached) return;
        if (!window.electronAPI) return;

        electronListenersAttached = true;

        onlineStatusApi.getStatus().then((result) => {
            if (result?.data) {
                globalSyncStatus = normalizeSyncStatus(result.data);
                statusSubscribers.forEach(callback => {
                    try {
                        callback(globalSyncStatus);
                    } catch (e) {
                        console.error('[useRealTimeSync] Initial status subscriber error:', e);
                    }
                });
            }
        }).catch((error) => {
            console.warn('[useRealTimeSync] Failed to load initial realtime status:', error);
        });

        // Listen for online domain events.
        electronUnsubscribeData = window.electronAPI.online?.onDomainEvent?.((event) => {
            const table = event.entity || event.table;
            const operation = event.operation || event.type;
            const recordId = event.entityId || event.recordId || event.id;
            const record = event.record || event.payload || null;

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

        electronUnsubscribeStatus = window.electronAPI.online?.onRealtimeStatus?.((status) => {
            globalSyncStatus = normalizeSyncStatus({
                ...globalSyncStatus,
                ...(status?.data || {}),
                isOnline: status?.data?.ready ?? status?.data?.isOnline ?? globalSyncStatus.isOnline,
                syncStatus: status?.data?.ready ? 'connected' : (status?.data?.syncStatus ?? globalSyncStatus.syncStatus)
            });

            statusSubscribers.forEach(callback => {
                try {
                    callback(globalSyncStatus);
                } catch (e) {
                    console.error('[useRealTimeSync] Status subscriber error:', e);
                }
            });
        });

        // No cleanup here intentionally — these listeners live for the app's lifetime.
        // Individual table subscriptions are cleaned up in their own useEffect returns.
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
     * Refresh now
     */
    const syncNow = useCallback(async () => {
        return onlineStatusApi.refreshStatus();
    }, []);

    /**
     * Get current network status
     */
    const checkNetwork = useCallback(async () => {
        return onlineStatusApi.checkConnection();
    }, []);

    return {
        isOnline: syncStatus.isOnline,
        isSyncing: syncStatus.isSyncing,
        syncStatus: syncStatus.syncStatus,
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
    const depsSignature = JSON.stringify(deps);

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
    }, [tableName, subscribe, depsSignature]);
}

export default useRealTimeSync;
