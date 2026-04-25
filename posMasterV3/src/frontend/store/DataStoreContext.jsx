/**
 * DataStore Context Provider
 *
 * Provides the DataStore instance and realtime status to the React component tree.
 * Also initializes event listeners and manages connection status.
 *
 * Usage:
 *   // In App.jsx
 *   import { DataStoreProvider } from './store/DataStoreContext';
 *
 *   function App() {
 *     return (
 *       <DataStoreProvider>
 *         <YourApp />
 *       </DataStoreProvider>
 *     );
 *   }
 *
 *   // In any component
 *   import { useDataStoreContext } from './store/DataStoreContext';
 *
 *   function MyComponent() {
 *     const { isOnline, syncStatus, lastSyncTime } = useDataStoreContext();
 *     // ...
 *   }
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dataStore } from './DataStore';
import { onlineStatusApi } from '../api/localApi';

// Context for realtime status and connection info
const DataStoreContext = createContext(null);

const DEFAULT_SYNC_STATUS = {
    isOnline: false,
    connectionQuality: 'unknown',
    syncStatus: 'idle',
    lastSyncTime: null,
    pendingCount: 0,
    isSyncing: false
};

function normalizeSyncStatus(status = {}) {
    const pendingCount = status.pendingCount ?? status.pendingChangesCount ?? DEFAULT_SYNC_STATUS.pendingCount;
    const syncStatus = status.syncStatus ?? status.status ?? DEFAULT_SYNC_STATUS.syncStatus;

    return {
        isOnline: status.isOnline ?? DEFAULT_SYNC_STATUS.isOnline,
        connectionQuality: status.connectionQuality ?? DEFAULT_SYNC_STATUS.connectionQuality,
        syncStatus,
        lastSyncTime: status.lastSyncTime ?? DEFAULT_SYNC_STATUS.lastSyncTime,
        pendingCount,
        isSyncing: status.isSyncing ?? DEFAULT_SYNC_STATUS.isSyncing
    };
}

/**
 * DataStore Provider Component
 */
export function DataStoreProvider({ children }) {
    // Realtime and connection status
    const [isOnline, setIsOnline] = useState(DEFAULT_SYNC_STATUS.isOnline);
    const [connectionQuality, setConnectionQuality] = useState(DEFAULT_SYNC_STATUS.connectionQuality);
    const [syncStatus, setSyncStatus] = useState(DEFAULT_SYNC_STATUS.syncStatus);
    const [lastSyncTime, setLastSyncTime] = useState(DEFAULT_SYNC_STATUS.lastSyncTime);
    const [pendingCount, setPendingCount] = useState(DEFAULT_SYNC_STATUS.pendingCount);
    const [isSyncing, setIsSyncing] = useState(DEFAULT_SYNC_STATUS.isSyncing);

    // Setup event listeners
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) {
            console.warn('[DataStoreProvider] Not in Electron environment');
            return;
        }

        const unsubscribeRealtime = window.electronAPI.online?.onRealtimeStatus?.((status) => {
            console.log('[DataStoreProvider] Online realtime status:', status);
            const nextStatus = normalizeSyncStatus({
                ...status?.data,
                isOnline: status?.data?.ready ?? status?.data?.isOnline
            });
            setIsOnline(nextStatus.isOnline);
            setConnectionQuality(nextStatus.connectionQuality);
            setSyncStatus(nextStatus.syncStatus);
            setLastSyncTime(nextStatus.lastSyncTime);
            setPendingCount(nextStatus.pendingCount);
            setIsSyncing(nextStatus.isSyncing);
        });

        // Get initial realtime status
        onlineStatusApi.getStatus().then((result) => {
            if (result?.data) {
                const status = normalizeSyncStatus(result.data);
                setIsOnline(status.isOnline);
                setConnectionQuality(status.connectionQuality);
                setSyncStatus(status.syncStatus);
                setLastSyncTime(status.lastSyncTime);
                setPendingCount(status.pendingCount);
                setIsSyncing(status.isSyncing);
            }
        }).catch(err => {
            console.warn('[DataStoreProvider] Failed to get initial realtime status:', err);
        });

        return () => {
            unsubscribeRealtime?.();
        };
    }, []);

    // Manual refresh trigger
    const syncNow = useCallback(async () => {
        setIsSyncing(true);
        try {
            const result = await onlineStatusApi.refreshStatus();
            return result;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // Force full refresh
    const forceFullSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            const result = await onlineStatusApi.refreshStatus();
        // Invalidate all caches after full refresh
            dataStore.invalidateAll();
            return result;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // Check online status
    const checkNetwork = useCallback(async () => {
        const result = await onlineStatusApi.checkConnection();
        if (result?.data) {
            setIsOnline(result.data.isOnline);
        }
        return result?.data;
    }, []);

    // Invalidate all caches (force refresh)
    const invalidateAll = useCallback(() => {
        dataStore.invalidateAll();
    }, []);

    // Get store stats
    const getStoreStats = useCallback(() => {
        return dataStore.getStats();
    }, []);

    const contextValue = {
        // Connection & realtime status
        isOnline,
        connectionQuality,
        syncStatus,
        lastSyncTime,
        pendingCount,
        isSyncing,

        // Actions
        syncNow,
        forceFullSync,
        checkNetwork,
        invalidateAll,
        getStoreStats,

        // Direct store access (for advanced use cases)
        dataStore
    };

    return (
        <DataStoreContext.Provider value={contextValue}>
            {children}
        </DataStoreContext.Provider>
    );
}

/**
 * Hook to access DataStore context
 * @returns {Object} DataStore context value
 */
export function useDataStoreContext() {
    const context = useContext(DataStoreContext);

    if (!context) {
        console.warn('[useDataStoreContext] Used outside of DataStoreProvider');
        // Return default values to avoid crashes
        return {
            ...DEFAULT_SYNC_STATUS,
            syncNow: async () => null,
            forceFullSync: async () => null,
            checkNetwork: async () => ({ isOnline: false }),
            invalidateAll: () => {},
            getStoreStats: () => ({}),
            dataStore: null
        };
    }

    return context;
}

/**
 * Hook for realtime status only (lighter alternative)
 */
export function useSyncStatus() {
    const { isOnline, syncStatus, lastSyncTime, pendingCount, isSyncing } = useDataStoreContext();

    return {
        isOnline,
        syncStatus,
        lastSyncTime,
        pendingCount,
        isSyncing
    };
}

/**
 * Hook for connection status only
 */
export function useConnectionStatus() {
    const { isOnline, connectionQuality, checkNetwork } = useDataStoreContext();

    return {
        isOnline,
        connectionQuality,
        checkNetwork
    };
}

export default DataStoreProvider;
