import React, { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Phone, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { branchContextApi } from '../api/localApi';

/**
 * BranchSelectionModal
 *
 * A modal that enforces branch/outlet selection before the user can proceed.
 * This modal cannot be dismissed without selecting a branch.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onBranchSelected - Callback when branch is selected
 * @param {boolean} [props.allowClose=false] - Whether the modal can be closed without selection
 * @param {function} [props.onClose] - Callback when modal is closed (only if allowClose is true)
 */
export default function BranchSelectionModal({
    isOpen,
    onBranchSelected,
    allowClose = false,
    onClose
}) {
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const fetchBranches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await branchContextApi.getAvailableBranches();
            if (response.status === 'success') {
                let availableBranches = response.data || [];

                // If empty, retry once against the live branch API before giving up.
                if (availableBranches.length === 0) {
                    try {
                        const retryResponse = await branchContextApi.getAvailableBranches();
                        if (retryResponse.status === 'success') {
                            availableBranches = retryResponse.data || [];
                        }
                    } catch (pullErr) {
                        console.warn('[BranchSelectionModal] Branch reload failed:', pullErr.message);
                    }
                }

                setBranches(availableBranches);

                // If only one branch is available (user has assigned branch), auto-select AND auto-confirm
                if (availableBranches.length === 1) {
                    const singleBranch = availableBranches[0];
                    setSelectedBranchId(singleBranch.id);

                    // Check if this is user's assigned branch - if so, auto-confirm
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        try {
                            const user = JSON.parse(userData);
                            if (user.branch_id === singleBranch.id) {
                                // User's assigned branch - auto-confirm without showing modal
                                console.log('[BranchSelectionModal] Auto-confirming user assigned branch:', singleBranch.name);
                                const confirmResponse = await branchContextApi.setCurrent(singleBranch.id);
                                if (confirmResponse.status === 'success') {
                                    onBranchSelected?.(confirmResponse.data);
                                    return; // Exit early - modal will close
                                }
                            }
                        } catch (parseError) {
                            console.error('[BranchSelectionModal] Error parsing user data:', parseError);
                        }
                    }
                }
            } else {
                setError(response.message || 'Failed to load branches');
            }
        } catch (err) {
            console.error('[BranchSelectionModal] Error fetching branches:', err);
            setError('Failed to load branches. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [onBranchSelected]);

    // Fetch available branches on mount/open
    useEffect(() => {
        if (isOpen) {
            fetchBranches();
        }
    }, [isOpen, fetchBranches]);

    const handleSelectBranch = async () => {
        if (!selectedBranchId) return;

        setSaving(true);
        setError(null);
        try {
            const response = await branchContextApi.setCurrent(selectedBranchId);
            if (response.status === 'success') {
                onBranchSelected?.(response.data);
            } else {
                setError(response.message || 'Failed to select branch');
            }
        } catch (err) {
            console.error('[BranchSelectionModal] Error selecting branch:', err);
            setError('Failed to select branch. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (allowClose && onClose) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop - not clickable to close unless allowed */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={allowClose ? handleClose : undefined}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1A318C] to-[#2541B2] px-6 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Select Outlet</h2>
                            <p className="text-blue-200 text-sm mt-0.5">
                                Choose the branch you're working from
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Warning message */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">
                                Branch Selection Required
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                                You must select a branch/outlet before proceeding. All sales,
                                inventory, and transactions will be recorded under the selected branch.
                            </p>
                        </div>
                    </div>

                    {/* Loading state */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-[#1A318C] animate-spin mb-4" />
                            <p className="text-gray-500">Loading branches...</p>
                        </div>
                    )}

                    {/* Error state */}
                    {error && !loading && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                onClick={fetchBranches}
                                className="mt-2 text-xs text-red-700 underline hover:no-underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* No branches available */}
                    {!loading && !error && branches.length === 0 && (
                        <div className="text-center py-8">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No branches available</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Please contact your administrator to assign you to a branch.
                            </p>
                        </div>
                    )}

                    {/* Branch list */}
                    {!loading && !error && branches.length > 0 && (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {branches.map((branch) => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSelectedBranchId(branch.id)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                        selectedBranchId === branch.id
                                            ? 'border-[#1A318C] bg-[#1A318C]/5 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                selectedBranchId === branch.id
                                                    ? 'bg-[#1A318C] text-white'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p
                                                    className={`font-semibold ${
                                                        selectedBranchId === branch.id
                                                            ? 'text-[#1A318C]'
                                                            : 'text-gray-800'
                                                    }`}
                                                >
                                                    {branch.name}
                                                </p>
                                                {selectedBranchId === branch.id && (
                                                    <Check className="w-5 h-5 text-[#1A318C]" />
                                                )}
                                            </div>
                                            {branch.address && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {branch.address}
                                                    </p>
                                                </div>
                                            )}
                                            {branch.contact && (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                    <p className="text-xs text-gray-500">
                                                        {branch.contact}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    {allowClose && (
                        <button
                            onClick={handleClose}
                            className="px-5 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSelectBranch}
                        disabled={!selectedBranchId || saving || loading}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#1A318C] to-[#2541B2] text-white font-semibold rounded-xl hover:from-[#162970] hover:to-[#1E3699] transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#1A318C]/30 disabled:shadow-none"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Selecting...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Continue with Selected Branch
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
