/**
 * useDataChangeListener Hook
 *
 * A React hook that listens for real-time data changes from the backend
 * and triggers a callback when relevant tables are updated.
 *
 * Usage:
 *   // Listen for changes to specific tables
 *   useDataChangeListener(['items', 'stock'], () => {
 *     fetchItems(); // Refetch data when items or stock changes
 *   });
 *
 *   // Listen for all changes
 *   useDataChangeListener(null, (change) => {
 *     console.log('Data changed:', change);
 *   });
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to listen for data changes from the backend
 * @param {string[]|null} tables - Array of table names to listen for, or null for all tables
 * @param {Function} onDataChange - Callback function when data changes
 * @param {Object} options - Additional options
 * @param {boolean} options.enabled - Whether the listener is enabled (default: true)
 */
export function useDataChangeListener(tables, onDataChange, options = {}) {
    const { enabled = true } = options;
    const callbackRef = useRef(onDataChange);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = onDataChange;
    }, [onDataChange]);

    useEffect(() => {
        if (!enabled) return;

        // Check if electronAPI is available
        if (!window.electronAPI?.onDataChange) {
            console.warn('[useDataChangeListener] electronAPI.onDataChange not available');
            return;
        }

        const handleDataChange = (data) => {
            // If tables is null, listen to all changes
            // Otherwise, only trigger callback for specified tables
            if (tables === null || tables.includes(data.table)) {
                callbackRef.current(data);
            }
        };

        // Subscribe to data changes
        const unsubscribe = window.electronAPI.onDataChange(handleDataChange);

        // Cleanup on unmount
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [tables, enabled]);
}

/**
 * Hook to listen for sync status changes
 * @param {Function} onSyncStatusChange - Callback function when sync status changes
 */
export function useSyncStatusListener(onSyncStatusChange) {
    const callbackRef = useRef(onSyncStatusChange);

    useEffect(() => {
        callbackRef.current = onSyncStatusChange;
    }, [onSyncStatusChange]);

    useEffect(() => {
        if (!window.electronAPI?.onSyncStatusChange) {
            return;
        }

        const unsubscribe = window.electronAPI.onSyncStatusChange((data) => {
            callbackRef.current(data);
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);
}

export default useDataChangeListener;
