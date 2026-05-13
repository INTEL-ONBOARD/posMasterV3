/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { branchContextApi } from '../api/localApi';
import { localAuth } from '../api/services/localAuth';
import BranchSelectionModal from '../components/BranchSelectionModal';
import { dataStore } from '../store/DataStore';

/**
 * BranchContext
 *
 * Global context for managing the current branch/outlet selection.
 * Provides:
 * - Current branch state
 * - Methods to change branch
 * - Automatic branch enforcement modal
 * - Branch validation for operations
 */

const BranchContext = createContext(null);

/**
 * Hook to access branch context
 * @returns {BranchContextValue}
 */
export function useBranchContext() {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error('useBranchContext must be used within a BranchProvider');
    }
    return context;
}

/**
 * BranchProvider
 *
 * Wraps the app and provides branch context to all children.
 * Shows branch selection modal when no branch is selected.
 */
export function BranchProvider({ children }) {
    const [currentBranch, setCurrentBranch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSelectionModal, setShowSelectionModal] = useState(false);

    // Load current branch from backend
    const loadCurrentBranch = useCallback(async () => {
        setLoading(true);
        try {
            let user = null;
            try {
                user = await localAuth.getCurrentUser();
            } catch (userError) {
                console.warn('[BranchContext] Could not load current user while resolving branch:', userError);
            }

            const assignedBranchId = user?.branch_id || user?.branchId || null;
            const roles = Array.isArray(user?.roles)
                ? user.roles
                : (typeof user?.roles === 'string' ? [user.roles] : []);
            const isCashier = roles.some((role) => String(role || '').toLowerCase() === 'cashier');

            if (isCashier && assignedBranchId) {
                console.log('[BranchContext] Using assigned user branch_id:', assignedBranchId);
                const setBranchResponse = await branchContextApi.setCurrent(assignedBranchId);
                if (setBranchResponse.status === 'success' && setBranchResponse.data) {
                    setCurrentBranch(setBranchResponse.data);
                    console.log('[BranchContext] Auto-selected user branch:', setBranchResponse.data?.name);
                    return;
                }
            }

            const response = await branchContextApi.getCurrent();
            if (response.status === 'success') {
                setCurrentBranch(response.data);

                if (!response.data) {
                    // No branch assigned or auto-select failed - show selection modal
                    setShowSelectionModal(true);
                }
            }
        } catch (error) {
            console.error('[BranchContext] Error loading branch:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load current branch on mount
    useEffect(() => {
        loadCurrentBranch();

        // Subscribe to branch changes from backend
        const unsubscribe = branchContextApi.onBranchChanged((branch) => {
            console.log('[BranchContext] Branch changed:', branch?.name || 'none');
            setCurrentBranch(branch);
        });

        return () => unsubscribe();
    }, [loadCurrentBranch]);

    // Set current branch
    const setBranch = useCallback(async (branchId) => {
        try {
            const response = await branchContextApi.setCurrent(branchId);
            if (response.status === 'success') {
                setCurrentBranch(response.data);
                setShowSelectionModal(false);
                // Invalidate DataStore so all components refetch with the new branch context
                dataStore.invalidateAll();
                dataStore._refreshStaleCaches();
                return { success: true, branch: response.data };
            }
            return { success: false, error: response.message };
        } catch (error) {
            console.error('[BranchContext] Error setting branch:', error);
            return { success: false, error: error.message };
        }
    }, []);

    // Clear current branch
    const clearBranch = useCallback(async () => {
        try {
            await branchContextApi.clear();
            setCurrentBranch(null);
            setShowSelectionModal(true);
        } catch (error) {
            console.error('[BranchContext] Error clearing branch:', error);
        }
    }, []);

    // Show branch selection modal
    const showBranchSelector = useCallback(() => {
        setShowSelectionModal(true);
    }, []);

    // Validate operation (check if branch is required)
    const validateOperation = useCallback(async (operation) => {
        try {
            const response = await branchContextApi.validateOperation(operation);
            if (response.status === 'error' || !response.valid) {
                // Show branch selection modal if branch is required
                if (response.requiresBranch) {
                    setShowSelectionModal(true);
                }
                return { valid: false, message: response.message };
            }
            return { valid: true };
        } catch (error) {
            console.error('[BranchContext] Error validating operation:', error);
            return { valid: false, message: error.message };
        }
    }, []);

    // Handle branch selected from modal
    const handleBranchSelected = useCallback((branch) => {
        setCurrentBranch(branch);
        setShowSelectionModal(false);
        // Invalidate DataStore so all components refetch with the new branch context
        dataStore.invalidateAll();
        dataStore._refreshStaleCaches();
    }, []);

    // Context value
    const value = {
        // State
        currentBranch,
        branchId: currentBranch?.id || null,
        branchName: currentBranch?.name || null,
        hasBranch: !!currentBranch,
        loading,

        // Methods
        setBranch,
        clearBranch,
        showBranchSelector,
        validateOperation,
        refreshBranch: loadCurrentBranch
    };

    return (
        <BranchContext.Provider value={value}>
            {children}

            {/* Branch Selection Modal - shows when no branch is selected */}
            <BranchSelectionModal
                isOpen={showSelectionModal && !loading}
                onBranchSelected={handleBranchSelected}
                allowClose={!!currentBranch} // Can close if a branch is already selected
                onClose={() => setShowSelectionModal(false)}
            />
        </BranchContext.Provider>
    );
}

/**
 * HOC to ensure a component has branch context
 * Use this for components that require branch selection
 */
export function withBranchRequired(WrappedComponent) {
    return function BranchRequiredWrapper(props) {
        const { hasBranch, showBranchSelector, loading } = useBranchContext();

        useEffect(() => {
            if (!loading && !hasBranch) {
                showBranchSelector();
            }
        }, [loading, hasBranch, showBranchSelector]);

        // Show loading while checking branch
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A318C]" />
                </div>
            );
        }

        return React.createElement(WrappedComponent, props);
    };
}

export default BranchContext;
