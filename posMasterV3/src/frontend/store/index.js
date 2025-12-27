/**
 * Store - Main Export
 *
 * Central export point for all store-related functionality.
 *
 * Usage:
 *   import {
 *     dataStore,
 *     TABLES,
 *     useReactiveData,
 *     useDataMutation,
 *     DataStoreProvider,
 *     useDataStoreContext
 *   } from './store';
 */

// Core store
export { dataStore, DataStore, TABLES } from './DataStore';

// React hooks
export {
    useReactiveData,
    useReactiveDataMultiple,
    useDataChangeSubscription,
    usePreloadData
} from './hooks/useReactiveData';

export {
    useDataMutation,
    useCreate,
    useUpdate,
    useDelete,
    useCRUD
} from './hooks/useDataMutation';

// Context and provider
export {
    DataStoreProvider,
    useDataStoreContext,
    useSyncStatus,
    useConnectionStatus
} from './DataStoreContext';
