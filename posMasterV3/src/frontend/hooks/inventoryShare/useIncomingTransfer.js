import { useEffect, useState } from "react";
import { inventoryTransferApi } from "../../api/localApi";
import { TABLES, dataStore } from "../../store";
import {
  branchName,
  getTransferItems,
  getTransferLineItemKey,
  getTransferLineItemRequestedQty,
  getTransferRequestedQty,
  getTransferSourceBranchId,
  getTransferTargetBranchId,
} from "../../pages/inventory/utils/transferHelpers";

/**
 * Incoming-share tab state and the accept/reject business logic for
 * inter-branch stock transfers: the pending-batches list (kept in sync with
 * the derived `pendingIncomingCandidates`), the per-item accept-quantity map
 * (initialized to the full requested quantity per line item, editable for
 * partial acceptance), the search filter, and the accept/reject submission
 * flows. This is a verbatim extraction from InventoryShare's main component -
 * every branch, quantity-validation rule, and payload field was preserved
 * exactly as it behaved before the refactor.
 */
export function useIncomingTransfer({ transferRows, branches, pendingIncomingCandidates, refetchTransfers, setToast }) {
  const [incomingSearch, setIncomingSearch] = useState("");
  const [acceptQuantities, setAcceptQuantities] = useState({});
  const [pendingIncomingBatches, setPendingIncomingBatches] = useState([]);

  useEffect(() => {
    setPendingIncomingBatches(pendingIncomingCandidates);
  }, [pendingIncomingCandidates]);

  useEffect(() => {
    if (!pendingIncomingBatches.length) return;
    setAcceptQuantities((prev) => {
      const next = { ...prev };
      pendingIncomingBatches.forEach((request) => {
        const requestKey = String(request.id);
        const items = getTransferItems(request);
        const existingMap = next[requestKey] && typeof next[requestKey] === "object" ? next[requestKey] : {};
        const initializedMap = { ...existingMap };

        if (items.length > 0) {
          items.forEach((item, index) => {
            const itemKey = getTransferLineItemKey(item, index);
            if (initializedMap[itemKey] == null) {
              initializedMap[itemKey] = getTransferLineItemRequestedQty(item);
            }
          });
        } else if (initializedMap.default == null) {
          initializedMap.default = getTransferRequestedQty(request);
        }

        next[requestKey] = initializedMap;
      });
      return next;
    });
  }, [pendingIncomingBatches]);

  const handleAcceptTransfer = async (transferId) => {
    const request = transferRows.find((row) => row.id === transferId);
    if (!request) return;

    const items = getTransferItems(request);
    const requestKey = String(transferId);
    const quantityMap = acceptQuantities[requestKey] || {};
    const normalizedItems = (items.length > 0
      ? items
      : [{
          item_name: request?.itemName || request?.item_name || "Unnamed item",
          sku: request?.sku || "N/A",
          requestedQty: getTransferRequestedQty(request),
        }]).map((item, index) => {
      const itemKey = getTransferLineItemKey(item, index);
      const requestedQty = getTransferLineItemRequestedQty(item) || getTransferRequestedQty(request);
      const acceptedQty = Number(quantityMap[itemKey] ?? requestedQty) || 0;
      const stockId = item?.stockId ?? item?.stock_id ?? item?.stockid ?? request?.stockId ?? request?.stock_id ?? null;
      const itemId = item?.item_id ?? item?.itemId ?? item?.id ?? item?._id ?? request?.item_id ?? request?.itemId ?? request?.id ?? null;
      const batchCode = item?.batch_code ?? item?.batchCode ?? request?.batch_code ?? request?.batchCode ?? null;
      const sku = item?.sku ?? item?.item_sku ?? request?.sku ?? "";

      return {
        ...item,
        stockId,
        stock_id: stockId,
        stockid: stockId,
        id: item?.id ?? item?._id ?? item?.item_id ?? item?.itemId ?? itemKey,
        item_id: itemId,
        itemId,
        sku,
        batch_code: batchCode || "",
        batchCode: batchCode || "",
        requestedQty,
        requested_qty: requestedQty,
        quantity: requestedQty,
        qty: requestedQty,
        accepted_qty: acceptedQty,
        acceptedQty,
        accepted_quantity: acceptedQty,
      };
    });

    const totalRequestedQty = normalizedItems.reduce((sum, item) => sum + (Number(item.requestedQty) || 0), 0);
    const totalAcceptedQty = normalizedItems.reduce((sum, item) => sum + (Number(item.accepted_qty) || 0), 0);

    const invalidItem = normalizedItems.find((item) => {
      const requestedQty = Number(item.requestedQty) || 0;
      const acceptedQty = Number(item.accepted_qty) || 0;
      return acceptedQty < 0 || acceptedQty > requestedQty;
    });

    if (invalidItem) {
      setToast({
        type: "error",
        title: "Invalid acceptance quantity",
        message: "Each item must be between 0 and its requested quantity.",
      });
      return;
    }

    if (totalAcceptedQty <= 0) {
      setToast({
        type: "error",
        title: "Invalid acceptance quantity",
        message: "At least one item must be accepted.",
      });
      return;
    }

    try {
      const payload = {
        source_branch_id: getTransferSourceBranchId(request),
        target_branch_id: getTransferTargetBranchId(request),
        items: normalizedItems,
        accepted_items: normalizedItems,
        acceptedItems: normalizedItems,
        acceptedQty: totalAcceptedQty,
        accepted_qty: totalAcceptedQty,
        accepted_quantity: totalAcceptedQty,
      };

      console.log("📤 SENDING ACCEPT PAYLOAD:", payload);

      const acceptedResponse = await inventoryTransferApi.accept(transferId, totalAcceptedQty, payload);
      console.log("📥 RAW ACCEPT RESPONSE:", acceptedResponse);

      const accepted = acceptedResponse?.data || acceptedResponse;
      dataStore.invalidate(TABLES.INVENTORY_TRANSFERS);
      const [refetchedTransfers, refetchedStockItems] = await Promise.all([
        dataStore.refetch(TABLES.INVENTORY_TRANSFERS),
        dataStore.refetch(TABLES.STOCK_ITEMS),
      ]);

      const cachedTransfers = dataStore.getCached(TABLES.INVENTORY_TRANSFERS) || [];
      const dbRowAfterRefetch = cachedTransfers.find((t) => String(t.id) === String(transferId));

      console.log("[InventoryShare] accept refetch complete", {
        transferId,
        refetchedTransfers,
        refetchedStockItems,
      });
      console.log("🔄 DB ROW AFTER REFETCH:", dbRowAfterRefetch);

      setAcceptQuantities((prev) => {
        const next = { ...prev };
        delete next[requestKey];
        return next;
      });

      if (String(dbRowAfterRefetch?.status || "").toLowerCase() === "accepted") {
        setPendingIncomingBatches((prev) => prev.filter((batch) => String(batch.id) !== String(transferId)));
      }

      const acceptedItemName =
        accepted?.itemName ||
        accepted?.item_name ||
        accepted?.items?.[0]?.name ||
        accepted?.items?.[0]?.item_name ||
        "Items";
      const acceptedSourceBranchId =
        accepted?.sourceBranchId || accepted?.source_branch_id || accepted?.fromBranchId || accepted?.from_branch_id;
      setToast({
        type: "success",
        title: "Transfer accepted",
        message:
          totalAcceptedQty < totalRequestedQty
            ? `${totalAcceptedQty} of ${totalRequestedQty} units accepted from ${branchName(branches, acceptedSourceBranchId)}.`
            : `${acceptedItemName} received from ${branchName(branches, acceptedSourceBranchId)}.`,
      });
    } catch (error) {
      console.error("[InventoryShare] accept failed", {
        transferId,
        error,
        responseData: error?.response?.data,
      });
      setToast({
        type: "error",
        title: "Accept failed",
        message: error?.response?.data?.message || error?.response?.data || error?.message || "Unable to accept the transfer.",
      });
    }
  };

  const handleRejectTransfer = async (transferId) => {
    const request = transferRows.find((row) => row.id === transferId);
    if (!request) return;

    try {
      const rejectedResponse = await inventoryTransferApi.reject(transferId, {
        source_branch_id: getTransferSourceBranchId(request),
        target_branch_id: getTransferTargetBranchId(request),
      });
      const rejected = rejectedResponse?.data || rejectedResponse;
      await refetchTransfers();
      setAcceptQuantities((prev) => {
        const next = { ...prev };
        delete next[transferId];
        return next;
      });
      setToast({
        type: "info",
        title: "Transfer rejected",
        message: `${rejected.itemName} from ${branchName(branches, rejected.sourceBranchId || rejected.fromBranchId)} was rejected.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        title: "Reject failed",
        message: error?.message || "Unable to reject the transfer.",
      });
    }
  };

  return {
    incomingSearch,
    setIncomingSearch,
    acceptQuantities,
    setAcceptQuantities,
    pendingIncomingBatches,
    handleAcceptTransfer,
    handleRejectTransfer,
  };
}
