/**
 * DataStore Context Provider
 *
 * Provides the DataStore instance and sync status to the React component tree.
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

// Context for sync status and connection info
const DataStoreContext = createContext(null);

/**
 * DataStore Provider Component
 */
export function DataStoreProvider({ children }) {
    // Sync and connection status
    const [isOnline, setIsOnline] = useState(true);
    const [connectionQuality, setConnectionQuality] = useState('unknown');
    const [syncStatus, setSyncStatus] = useState('idle');
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Setup event listeners
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) {
            console.warn('[DataStoreProvider] Not in Electron environment');
            return;
        }

        // Listen for sync status changes
        const unsubscribeSyncStatus = window.electronAPI.onSyncStatusChange?.((status) => {
            console.log('[DataStoreProvider] Sync status update:', status);

            if (status.isOnline !== undefined) setIsOnline(status.isOnline);
            if (status.connectionQuality) setConnectionQuality(status.connectionQuality);
            if (status.syncStatus) setSyncStatus(status.syncStatus);
            if (status.lastSyncTime) setLastSyncTime(status.lastSyncTime);
            if (status.pendingCount !== undefined) setPendingCount(status.pendingCount);
            if (status.isSyncing !== undefined) setIsSyncing(status.isSyncing);
        });

        // Listen for connection status changes
        const unsubscribeConnection = window.electronAPI.onConnectionStatusChange?.((status) => {
            console.log('[DataStoreProvider] Connection update:', status);

            setIsOnline(status.isOnline);
            if (status.quality) setConnectionQuality(status.quality);
        });

        // Get initial sync status
        window.electronAPI.cloudSync?.getStatus?.().then((result) => {
            if (result?.data) {
                const status = result.data;
                setIsOnline(status.isOnline ?? true);
                setSyncStatus(status.syncStatus ?? 'idle');
                setLastSyncTime(status.lastSyncTime);
                setPendingCount(status.pendingChangesCount ?? 0);
                setIsSyncing(status.isSyncing ?? false);
            }
        }).catch(err => {
            console.warn('[DataStoreProvider] Failed to get initial sync status:', err);
        });

        return () => {
            unsubscribeSyncStatus?.();
            unsubscribeConnection?.();
        };
    }, []);

    // Manual sync trigger
    const syncNow = useCallback(async () => {
        if (!window.electronAPI?.cloudSync?.syncNow) {
            console.warn('[DataStoreProvider] syncNow not available');
            return null;
        }

        setIsSyncing(true);
        try {
            const result = await window.electronAPI.cloudSync.syncNow();
            return result;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // Force full sync
    const forceFullSync = useCallback(async () => {
        if (!window.electronAPI?.cloudSync?.forceFullSync) {
            console.warn('[DataStoreProvider] forceFullSync not available');
            return null;
        }

        setIsSyncing(true);
        try {
            const result = await window.electronAPI.cloudSync.forceFullSync();
            // Invalidate all caches after full sync
            dataStore.invalidateAll();
            return result;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // Check network status
    const checkNetwork = useCallback(async () => {
        if (!window.electronAPI?.cloudSync?.checkNetwork) {
            return { isOnline: navigator.onLine };
        }

        const result = await window.electronAPI.cloudSync.checkNetwork();
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
        // Connection & sync status
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
            isOnline: true,
            connectionQuality: 'unknown',
            syncStatus: 'idle',
            lastSyncTime: null,
            pendingCount: 0,
            isSyncing: false,
            syncNow: async () => null,
            forceFullSync: async () => null,
            checkNetwork: async () => ({ isOnline: true }),
            invalidateAll: () => {},
            getStoreStats: () => ({}),
            dataStore: null
        };
    }

    return context;
}

/**
 * Hook for sync status only (lighter alternative)
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
