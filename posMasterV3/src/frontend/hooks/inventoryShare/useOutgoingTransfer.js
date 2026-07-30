import { useMemo, useState } from "react";
import { inventoryTransferApi } from "../../api/localApi";
import { branchName } from "../../pages/inventory/utils/transferHelpers";

/**
 * Outgoing-share tab state: the search/category filter for the branch's own
 * stock, the filtered item list derived from it, and the "send transfer"
 * submission flow (payload shape + refetch + toast on success/failure).
 * Extracted from InventoryShare's main component, unchanged.
 */
export function useOutgoingTransfer({ inventoryItems, branches, refetchTransfers, refetchStockItems, setToast }) {
  const [outgoingSearch, setOutgoingSearch] = useState("");
  const [outgoingCategory, setOutgoingCategory] = useState("All");
  const [sending, setSending] = useState(false);

  const filteredOutgoingItems = useMemo(() => {
    const term = (outgoingSearch || "").toLowerCase();
    return inventoryItems.filter((item) => {
      const matchesCategory = outgoingCategory === "All" || item?.category?.type === outgoingCategory;
      const matchesSearch =
        (item?.item_name || "").toLowerCase().includes(term) ||
        (item?.sku || "").toLowerCase().includes(term) ||
        (item?.batch_code || "").toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [inventoryItems, outgoingCategory, outgoingSearch]);

  const handleSendTransfer = async (selectedItemsList, destinationBranchId, transferNote) => {
    setSending(true);
    try {
      const payload = {
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requestDetails: {
          destinationBranch: {
            id: destinationBranchId,
            name: branchName(branches, destinationBranchId),
          },
          note: transferNote,
        },
        items: selectedItemsList,
      };

      console.log("1. Payload before send:", payload);
      await inventoryTransferApi.create(payload);
      await Promise.all([refetchTransfers(), refetchStockItems()]);
      setToast({
        type: "success",
        title: "Requests sent",
        message: `${
          payload.items.length
        } item(s) transferred to ${branchName(branches, destinationBranchId)} as a pending batch request.`,
      });
      return true;
    } catch (error) {
      setToast({
        type: "error",
        title: "Send failed",
        message: error?.message || "Unable to send transfer request.",
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  return {
    outgoingSearch,
    setOutgoingSearch,
    outgoingCategory,
    setOutgoingCategory,
    sending,
    filteredOutgoingItems,
    handleSendTransfer,
  };
}
