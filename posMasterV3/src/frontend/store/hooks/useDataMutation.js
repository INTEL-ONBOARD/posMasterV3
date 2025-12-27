/**
 * useDataMutation Hook
 *
 * A React hook for mutating data with optimistic updates.
 * Provides immediate UI feedback while the actual operation completes in the background.
 *
 * Features:
 * - Optimistic updates (UI updates immediately)
 * - Automatic rollback on error
 * - Loading and error states
 * - Success/error callbacks
 * - Works with the DataStore for automatic cache updates
 *
 * Usage:
 *   const { mutate, isLoading, error } = useDataMutation({
 *     table: TABLES.MEMBERS,
 *     mutationFn: (data) => memberApi.create(data),
 *     onSuccess: (result) => toast.success('Member created!'),
 *     onError: (error) => toast.error(error.message)
 *   });
 *
 *   // In a form submit handler:
 *   await mutate({ full_name: 'John Doe', member_no: 'MEM-001' });
 */

import { useState, useCallback, useRef } from 'react';
import { dataStore } from '../DataStore';

/**
 * Hook for data mutations with optimistic updates
 * @param {Object} options - Configuration options
 * @param {string} options.table - Table name from TABLES constant
 * @param {Function} options.mutationFn - Async function that performs the mutation
 * @param {string} [options.operation='INSERT'] - 'INSERT', 'UPDATE', or 'DELETE'
 * @param {Function} [options.onSuccess] - Called on successful mutation
 * @param {Function} [options.onError] - Called on mutation error
 * @param {boolean} [options.optimistic=true] - Whether to use optimistic updates
 * @param {Function} [options.getOptimisticData] - Transform input to optimistic record
 * @returns {{ mutate: Function, isLoading: boolean, error: Error|null, reset: Function }}
 */
export function useDataMutation(options) {
    const {
        table,
        mutationFn,
        operation = 'INSERT',
        onSuccess,
        onError,
        optimistic = true,
        getOptimisticData
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keep track of callbacks
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    // Store previous state for rollback
    const previousDataRef = useRef(null);

    /**
     * Perform the mutation
     * @param {Object} data - Data to mutate
     * @param {string|number} [recordId] - Record ID for UPDATE/DELETE
     * @returns {Promise<Object>} The mutation result
     */
    const mutate = useCallback(async (data, recordId = null) => {
        setIsLoading(true);
        setError(null);

        // Store current state for potential rollback
        previousDataRef.current = dataStore.getCached(table);

        // Apply optimistic update
        if (optimistic && table) {
            const optimisticRecord = getOptimisticData
                ? getOptimisticData(data)
                : {
                    ...data,
                    id: recordId || data.id || `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

            dataStore.optimisticUpdate(table, operation, optimisticRecord, recordId);
        }

        try {
            // Perform the actual mutation
            const result = await mutationFn(data, recordId);

            // Check for API error response
            if (result.status === 'error') {
                throw new Error(result.message || 'Operation failed');
            }

            // Call success callback
            onSuccessRef.current?.(result.data || result, data);

            // If the backend returns the created/updated record, update the cache
            // (The backend should also broadcast the change, but this ensures consistency)
            if (result.data && table) {
                dataStore.invalidate(table);
                // The backend broadcast will trigger a refetch
            }

            setIsLoading(false);
            return result;
        } catch (err) {
            console.error('[useDataMutation] Mutation failed:', err);

            // Rollback optimistic update
            if (optimistic && previousDataRef.current && table) {
                dataStore.cache.set(table, previousDataRef.current);
                dataStore._notifySubscribers(table);
            }

            setError(err);
            setIsLoading(false);

            // Call error callback
            onErrorRef.current?.(err, data);

            throw err;
        }
    }, [table, mutationFn, operation, optimistic, getOptimisticData]);

    /**
     * Reset error state
     */
    const reset = useCallback(() => {
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        mutate,
        isLoading,
        error,
        reset
    };
}

/**
 * Hook for creating records
 * @param {string} table - Table name
 * @param {Function} createFn - API function to create record
 * @param {Object} [options] - Additional options
 */
export function useCreate(table, createFn, options = {}) {
    return useDataMutation({
        table,
        mutationFn: createFn,
        operation: 'INSERT',
        ...options
    });
}

/**
 * Hook for updating records
 * @param {string} table - Table name
 * @param {Function} updateFn - API function to update record (id, data) => Promise
 * @param {Object} [options] - Additional options
 */
export function useUpdate(table, updateFn, options = {}) {
    return useDataMutation({
        table,
        mutationFn: (data, recordId) => updateFn(recordId, data),
        operation: 'UPDATE',
        ...options
    });
}

/**
 * Hook for deleting records
 * @param {string} table - Table name
 * @param {Function} deleteFn - API function to delete record (id) => Promise
 * @param {Object} [options] - Additional options
 */
export function useDelete(table, deleteFn, options = {}) {
    return useDataMutation({
        table,
        mutationFn: (_, recordId) => deleteFn(recordId),
        operation: 'DELETE',
        ...options
    });
}

/**
 * Combined hook for CRUD operations on a table
 * @param {string} table - Table name
 * @param {Object} apiFns - Object with create, update, delete functions
 * @param {Object} [options] - Shared options for all mutations
 */
export function useCRUD(table, apiFns, options = {}) {
    const createMutation = useCreate(table, apiFns.create, {
        onSuccess: options.onCreateSuccess,
        onError: options.onCreateError,
        ...options
    });

    const updateMutation = useUpdate(table, apiFns.update, {
        onSuccess: options.onUpdateSuccess,
        onError: options.onUpdateError,
        ...options
    });

    const deleteMutation = useDelete(table, apiFns.delete, {
        onSuccess: options.onDeleteSuccess,
        onError: options.onDeleteError,
        ...options
    });

    return {
        create: createMutation,
        update: updateMutation,
        delete: deleteMutation,
        isAnyLoading: createMutation.isLoading || updateMutation.isLoading || deleteMutation.isLoading
    };
}

export default useDataMutation;
