import { useEffect, useMemo } from "react";
import { useReactiveData, TABLES } from "../../store";
import {
  branchDisplayName,
  branchIdValue,
  getCurrentBranchId,
  getStockBranchId,
  getTransferSourceBranchId,
  getTransferTargetBranchId,
  normalizeTransferRecord,
} from "../../pages/inventory/utils/transferHelpers";

/**
 * Reactive branch/stock/transfer data plus the derived lookups every part of
 * the Inventory Share page needs: the current branch, the branch-scoped
 * stock rows, the normalized transfer records, and the outgoing/incoming
 * history + pending-incoming-candidate slices derived from them. Mirrors the
 * data block that used to live at the top of InventoryShare's main
 * component, unchanged.
 */
export function useTransferBranchData({ isActive, activeBranch, branchLoading, currentBranchIdProp }) {
  const { data: branchRows = [], loading: branchesLoading } = useReactiveData(TABLES.BRANCHES, null, {
    enabled: isActive,
    initialData: [],
  });

  const { data: stockRows = [], loading: stockLoading, refetch: refetchStockItems } = useReactiveData(
    TABLES.STOCK_ITEMS,
    null,
    { enabled: isActive, initialData: [] }
  );

  const { data: transferRows = [], loading: transfersLoading, refetch: refetchTransfers } = useReactiveData(
    TABLES.INVENTORY_TRANSFERS,
    null,
    { enabled: isActive, initialData: [] }
  );

  const resolvedCurrentBranchId = useMemo(
    () => getCurrentBranchId(activeBranch, currentBranchIdProp),
    [activeBranch, currentBranchIdProp]
  );

  const branches = useMemo(
    () => branchRows.filter((branch) => branch && branch.is_active !== false && branch.isActive !== false),
    [branchRows]
  );

  const currentBranch = useMemo(() => {
    return (
      branches.find((branch) => branchIdValue(branch) === resolvedCurrentBranchId) ||
      activeBranch ||
      branches[0] ||
      null
    );
  }, [activeBranch, branches, resolvedCurrentBranchId]);

  const currentBranchLabel = branchDisplayName(currentBranch);

  const destinationBranches = useMemo(
    () => branches.filter((branch) => branchIdValue(branch) !== resolvedCurrentBranchId),
    [branches, resolvedCurrentBranchId]
  );

  const branchStockRows = useMemo(
    () =>
      stockRows.filter((stock) => {
        const stockBranchId = getStockBranchId(stock);
        const stockBranchName = String(stock?.branch_name ?? stock?.branchName ?? stock?.branch?.name ?? stock?.item?.branch_name ?? stock?.item?.branchName ?? "").trim();
        const currentBranchName = String(currentBranch?.branch_name ?? currentBranch?.branchName ?? currentBranch?.name ?? "").trim();

        return (
          stockBranchId === resolvedCurrentBranchId ||
          (stockBranchName && currentBranchName && stockBranchName.toLowerCase() === currentBranchName.toLowerCase())
        );
      }),
    [currentBranch, resolvedCurrentBranchId, stockRows]
  );

  const inventoryItems = useMemo(
    () =>
      [...branchStockRows].sort((a, b) => {
        const nameA = String(a?.item_name || "").toLowerCase();
        const nameB = String(b?.item_name || "").toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        const skuA = String(a?.sku || "").toLowerCase();
        const skuB = String(b?.sku || "").toLowerCase();
        if (skuA !== skuB) return skuA.localeCompare(skuB);
        return String(a?.batch_code || "").localeCompare(String(b?.batch_code || ""));
      }),
    [branchStockRows]
  );

  const normalizedTransferRows = useMemo(
    () => transferRows.map((transfer) => normalizeTransferRecord(transfer, branches, resolvedCurrentBranchId)),
    [branches, resolvedCurrentBranchId, transferRows]
  );

  useEffect(() => {
    console.groupCollapsed("[InventoryShare] Stock debug");
    console.log("activeBranch", activeBranch);
    console.log("resolvedCurrentBranchId", resolvedCurrentBranchId);
    console.log("rawStockRows", stockRows);
    console.log("branchStockRows", branchStockRows);
    console.log("inventoryItems", inventoryItems);
    console.groupEnd();
  }, [activeBranch, branchStockRows, inventoryItems, resolvedCurrentBranchId, stockRows]);

  const outgoingHistory = useMemo(
    () =>
      normalizedTransferRows
        .filter((transfer) => {
          const sourceMatches =
            getTransferSourceBranchId(transfer) === resolvedCurrentBranchId ||
            String(transfer?.sourceBranchId || "") === resolvedCurrentBranchId;
          return sourceMatches;
        })
        .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0)),
    [normalizedTransferRows, resolvedCurrentBranchId]
  );

  const incomingHistory = useMemo(
    () =>
      normalizedTransferRows
        .filter((transfer) => getTransferTargetBranchId(transfer) === resolvedCurrentBranchId || String(transfer?.targetBranchId || "") === resolvedCurrentBranchId)
        .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0)),
    [normalizedTransferRows, resolvedCurrentBranchId]
  );

  const pendingIncomingCandidates = useMemo(
    () =>
      incomingHistory.filter((transfer) => {
        const status = String(transfer.status || "").toLowerCase();
        return status === "pending" || status === "approved_by_manager" || status === "in_transit";
      }),
    [incomingHistory]
  );

  const loading = branchLoading || branchesLoading || stockLoading || transfersLoading;

  return {
    branches,
    currentBranch,
    currentBranchLabel,
    resolvedCurrentBranchId,
    destinationBranches,
    branchStockRows,
    inventoryItems,
    transferRows,
    normalizedTransferRows,
    outgoingHistory,
    incomingHistory,
    pendingIncomingCandidates,
    loading,
    refetchTransfers,
    refetchStockItems,
  };
}
