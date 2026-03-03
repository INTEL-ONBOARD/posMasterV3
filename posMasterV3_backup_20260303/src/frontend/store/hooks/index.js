/**
 * Store Hooks - Index
 *
 * Re-exports all hooks from the store for easy importing.
 *
 * Usage:
 *   import { useReactiveData, useDataMutation, TABLES } from '../store/hooks';
 */

export {
    useReactiveData,
    useReactiveDataMultiple,
    useDataChangeSubscription,
    usePreloadData,
    TABLES
} from './useReactiveData';

export {
    useDataMutation,
    useCreate,
    useUpdate,
    useDelete,
    useCRUD
} from './useDataMutation';
