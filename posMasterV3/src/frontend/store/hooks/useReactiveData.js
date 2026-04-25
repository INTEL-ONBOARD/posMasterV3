/**
 * useReactiveData Hook
 *
 * A React hook that provides reactive data fetching with automatic updates.
 * When data changes in the online backend, the UI updates automatically.
 *
 * Features:
 * - Automatic data fetching on mount
 * - Reactive updates when backend data changes
 * - Loading and error states
 * - Caching with TTL
 * - Deduplication of concurrent requests
 * - Uses the MongoDB-backed online API facade
 *
 * Usage:
 *   // Basic usage with table constant
 *   const { data, loading, error, refetch } = useReactiveData(TABLES.SALES_TRANSACTIONS);
 *
 *   // With custom fetcher
 *   const { data: members } = useReactiveData(
 *     TABLES.MEMBERS,
 *     () => memberApi.getActive().then(r => r.data)
 *   );
 *
 *   // With options
 *   const { data } = useReactiveData(TABLES.STOCK, null, {
 *     enabled: isActive,
 *     initialData: [],
 *     onSuccess: (data) => console.log('Loaded', data.length, 'items')
 *   });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataStore, TABLES } from '../DataStore';

/**
 * Hook for reactive data fetching
 * @param {string} table - Table name from TABLES constant
 * @param {Function} [customFetcher] - Optional custom fetch function
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.enabled=true] - Whether to fetch data
 * @param {Array} [options.initialData=[]] - Initial data before first fetch
 * @param {Function} [options.onSuccess] - Callback on successful fetch
 * @param {Function} [options.onError] - Callback on fetch error
 * @param {boolean} [options.refetchOnMount=true] - Whether to refetch on component mount
 * @param {number} [options.staleTime] - Override cache TTL in ms
 * @returns {{ data: Array, loading: boolean, error: Error|null, refetch: Function, isStale: boolean }}
 */
export function useReactiveData(table, customFetcher = null, options = {}) {
    const {
        enabled = true,
        initialData = [],
        onSuccess,
        onError,
        refetchOnMount = true
    } = options;

    // Get initial state from store
    const initialState = dataStore.getState(table);

    const [state, setState] = useState({
        data: initialState.data.length > 0 ? initialState.data : initialData,
        loading: initialState.loading,
        error: initialState.error
    });

    const [isStale, setIsStale] = useState(dataStore.isStale(table));

    // Keep track of custom fetcher
    const fetcherRef = useRef(customFetcher);
    fetcherRef.current = customFetcher;

    // Keep track of callbacks
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    // Subscribe to store updates
    useEffect(() => {
        if (!enabled) return;

        const unsubscribe = dataStore.subscribe(table, (newState) => {
            setState({
                data: newState.data,
                loading: newState.loading,
                error: newState.error
            });
            setIsStale(dataStore.isStale(table));

            // Call success callback on successful data update
            if (!newState.loading && !newState.error && newState.data.length > 0) {
                onSuccessRef.current?.(newState.data);
            }

            // Call error callback on error
            if (newState.error) {
                onErrorRef.current?.(newState.error);
            }
        });

        return unsubscribe;
    }, [table, enabled]);

    // Initial fetch
    useEffect(() => {
        if (!enabled) return;

        const shouldFetch = refetchOnMount || dataStore.isStale(table);

        if (shouldFetch) {
            dataStore.fetchData(table, fetcherRef.current).catch(err => {
                console.error(`[useReactiveData] Failed to fetch ${table}:`, err);
            });
        }
    }, [table, enabled, refetchOnMount]);

    // Refetch function
    const refetch = useCallback(() => {
        return dataStore.refetch(table);
    }, [table]);

    return {
        data: state.data,
        loading: state.loading,
        error: state.error,
        refetch,
        isStale
    };
}

/**
 * Hook for multiple reactive data sources
 * @param {Array<{table: string, fetcher?: Function}>} sources - Array of data sources
 * @param {Object} [options] - Configuration options
 * @returns {Object} Object with table names as keys and data as values
 */
export function useReactiveDataMultiple(sources, options = {}) {
    const { enabled = true } = options;

    const [states, setStates] = useState(() => {
        const initial = {};
        sources.forEach(({ table }) => {
            initial[table] = dataStore.getState(table);
        });
        return initial;
    });

    // Subscribe to all tables
    useEffect(() => {
        if (!enabled) return;

        const unsubscribes = sources.map(({ table }) => {
            return dataStore.subscribe(table, (newState) => {
                setStates(prev => ({
                    ...prev,
                    [table]: newState
                }));
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [sources, enabled]);

    // Initial fetch for all tables
    useEffect(() => {
        if (!enabled) return;

        sources.forEach(({ table, fetcher }) => {
            if (dataStore.isStale(table)) {
                dataStore.fetchData(table, fetcher).catch(err => {
                    console.error(`[useReactiveDataMultiple] Failed to fetch ${table}:`, err);
                });
            }
        });
    }, [sources, enabled]);

    // Refetch all
    const refetchAll = useCallback(() => {
        return Promise.all(sources.map(({ table }) => dataStore.refetch(table)));
    }, [sources]);

    return {
        states,
        refetchAll,
        isAnyLoading: Object.values(states).some(s => s.loading),
        hasAnyError: Object.values(states).some(s => s.error)
    };
}

/**
 * Hook that only subscribes to changes without fetching
 * Useful when you want to react to changes but manage fetching yourself
 * @param {string} table - Table name
 * @param {Function} onDataChange - Callback when data changes
 */
export function useDataChangeSubscription(table, onDataChange) {
    const callbackRef = useRef(onDataChange);
    callbackRef.current = onDataChange;

    useEffect(() => {
        const unsubscribe = dataStore.subscribe(table, (state) => {
            callbackRef.current(state);
        });

        return unsubscribe;
    }, [table]);
}

/**
 * Hook to preload multiple tables
 * @param {string[]} tables - Array of table names
 */
export function usePreloadData(tables) {
    const [isPreloading, setIsPreloading] = useState(true);
    const [preloadError, setPreloadError] = useState(null);

    useEffect(() => {
        setIsPreloading(true);
        setPreloadError(null);

        dataStore.preload(tables)
            .then(() => setIsPreloading(false))
            .catch(err => {
                setPreloadError(err);
                setIsPreloading(false);
            });
    }, [tables.join(',')]); // Only re-run if tables array changes

    return { isPreloading, preloadError };
}

// Re-export TABLES for convenience
export { TABLES };

export default useReactiveData;
