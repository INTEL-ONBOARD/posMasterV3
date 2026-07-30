import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

// Shared pure helpers for the Inventory Share (inter-branch transfer) feature:
// date/status formatting, branch-id resolution, and the many defensive
// field-lookup helpers used to normalize transfer records coming from the
// backend (which have historically used several different field-naming
// conventions). Extracted verbatim from InventoryShare.jsx during its
// decomposition refactor - logic and behavior unchanged.

export const CURRENT_BRANCH_ID = null;

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const formatDateOnly = (value) =>
  new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
  }).format(new Date(value));

export const statusMeta = (status) => {
  switch ((status || "").toLowerCase()) {
    case "manager_approved":
    case "approved_by_manager":
      return {
        label: "Manager Approved",
        className: "bg-sky-50 text-sky-700 border-sky-200",
        dot: "bg-sky-500",
        icon: CheckCircle2,
      };
    case "in_transit":
      return {
        label: "In Transit",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
        dot: "bg-indigo-500",
        icon: ArrowLeftRight,
      };
    case "accepted":
      return {
        label: "Accepted",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        label: "Rejected",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
        icon: XCircle,
      };
    default:
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        icon: Clock3,
      };
  }
};

export const normalizeTransferStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const branchIdValue = (branch) =>
  String(branch?.id ?? branch?._id ?? branch?.branch_id ?? branch?.branchId ?? "").trim();

export const branchDisplayName = (branch) =>
  branch?.branch_name || branch?.name || branch?.branchName || branch?.code || "Unknown branch";

export const branchName = (branches, branchId) => {
  const targetId = String(branchId ?? "").trim();
  const branch = branches.find((row) => branchIdValue(row) === targetId);
  return branchDisplayName(branch);
};

export const getCurrentBranchId = (branch, fallback = CURRENT_BRANCH_ID) =>
  String(branch?.id ?? branch?.branch_id ?? branch?.branchId ?? fallback ?? "").trim();

export const getStockBranchId = (stock) =>
  String(
    stock?.branch_id ??
      stock?.branchId ??
      stock?.branchID ??
      stock?.branch_id_value ??
      stock?.branch?.id ??
      stock?.branch?.branch_id ??
      stock?.branch?.branchId ??
      stock?.branch?.branchID ??
      stock?.branch?.value ??
      stock?.branch?.branch ??
      stock?.branch?.code ??
      stock?.branch?.name ??
      stock?.branch_name ??
      stock?.branchName ??
      stock?.branch_code ??
      stock?.branchCode ??
      stock?.branch_id_ref ??
      stock?.branchIdRef ??
      stock?.item?.branch_id ??
      stock?.item?.branchId ??
      stock?.item?.branchID ??
      stock?.item?.branch?.id ??
      stock?.item?.branch?.branch_id ??
      stock?.item?.branch?.branchId ??
      stock?.item?.branch?.value ??
      stock?.item?.branch_name ??
      stock?.item?.branchName ??
      stock?.item?.branch_code ??
      stock?.item?.branchCode ??
      stock?.item?.branch ??
      ""
  ).trim();

export const getTransferSourceBranchId = (transfer) =>
  String(
    transfer?.source_branch_id ??
      transfer?.sourceBranchId ??
      transfer?.fromBranchId ??
      transfer?.from_branch_id ??
      transfer?.requestDetails?.sourceBranch?.id ??
      transfer?.requestDetails?.sourceBranch?.branch_id ??
      transfer?.requestDetails?.sourceBranch?.branchId ??
      transfer?.requestDetails?.sourceBranch?.branchID ??
      transfer?.requestDetails?.sourceBranchId ??
      transfer?.requestDetails?.source_branch_id ??
      transfer?.sourceBranch?.id ??
      transfer?.sourceBranch?.branch_id ??
      transfer?.sourceBranch?.branchId ??
      transfer?.sourceBranch?.branchID ??
      transfer?.sourceBranchId ??
      transfer?.source_branch_id ??
      transfer?.source_branch?.id ??
      transfer?.source_branch?.branch_id ??
      transfer?.source_branch?.branchId ??
      transfer?.requestDetails?.sourceBranchId ??
      ""
  ).trim();

export const getTransferTargetBranchId = (transfer) =>
  String(
    transfer?.target_branch_id ??
      transfer?.targetBranchId ??
      transfer?.toBranchId ??
      transfer?.to_branch_id ??
      transfer?.destination_branch_id ??
      transfer?.destinationBranchId ??
      transfer?.requestDetails?.destinationBranch?.id ??
      transfer?.requestDetails?.destinationBranch?.branch_id ??
      transfer?.requestDetails?.destinationBranch?.branchId ??
      transfer?.requestDetails?.destinationBranch?.branchID ??
      transfer?.requestDetails?.destinationBranchId ??
      transfer?.requestDetails?.destination_branch_id ??
      transfer?.destinationBranch?.id ??
      transfer?.destinationBranch?.branch_id ??
      transfer?.destinationBranch?.branchId ??
      transfer?.destinationBranch?.branchID ??
      transfer?.destinationBranchId ??
      transfer?.destination_branch_id ??
      transfer?.destination_branch?.id ??
      transfer?.destination_branch?.branch_id ??
      transfer?.destination_branch?.branchId ??
      transfer?.requestDetails?.destinationBranchId ??
      ""
  ).trim();

export const getTransferRequestedQty = (transfer) =>
  Number(transfer?.quantity ?? transfer?.requestedQty ?? transfer?.requested_qty ?? 0) || 0;

export const getTransferAcceptedQty = (transfer) =>
  Number(
    transfer?.acceptedQty ??
      transfer?.accepted_qty ??
      transfer?.accepted_quantity ??
      transfer?.requestDetails?.acceptedQty ??
      transfer?.requestDetails?.accepted_qty ??
      transfer?.requestDetails?.accepted_quantity ??
      getTransferItems(transfer).reduce((sum, item) => sum + getTransferLineItemAcceptedQty(item), 0)
  ) || 0;

export const getTransferItems = (transfer) => {
  const candidates = [
    transfer?.items,
    transfer?.transfer_items,
    transfer?.transferItems,
    transfer?.details,
    transfer?.requestDetails?.items,
    transfer?.request_details?.items,
    transfer?.stock_items,
    transfer?.stockItems
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const looksLikeItem =
        value.item_name ||
        value.itemName ||
        value.name ||
        value.sku ||
        value.batch_code ||
        value.batchCode ||
        value.quantity != null ||
        value.qty != null ||
        value.transferQty != null ||
        value.requestedQty != null ||
        value.requested_qty != null;
      if (looksLikeItem) return [value];
    }
  }
  return [];
};

export const getTransferItemName = (transfer, fallbackIndex = 0) => {
  const items = getTransferItems(transfer);
  const primaryItem = items[0] || {};
  const itemName =
    primaryItem.item_name ||
    primaryItem.itemName ||
    primaryItem.name ||
    transfer?.item_name ||
    transfer?.itemName ||
    transfer?.name ||
    transfer?.requestDetails?.item_name ||
    transfer?.requestDetails?.itemName ||
    transfer?.requestDetails?.item?.item_name ||
    transfer?.requestDetails?.item?.itemName ||
    transfer?.requestDetails?.item?.name ||
    transfer?.item?.item_name ||
    transfer?.item?.itemName ||
    transfer?.item?.name ||
    transfer?.requestDetails?.item?.item_name ||
    transfer?.requestDetails?.item?.itemName ||
    transfer?.requestDetails?.item?.name;

  if (itemName) return itemName;
  if (items.length > 1) return `${items.length} Items`;
  if (primaryItem.sku || transfer?.sku) return `SKU ${primaryItem.sku || transfer?.sku}`;
  return `Unknown Item${fallbackIndex ? ` #${fallbackIndex + 1}` : ""}`;
};

export const getTransferBatchItemNames = (transfer, fallbackIndex = 0, maxVisible = 2) => {
  const items = getTransferItems(transfer);
  const itemNames = items
    .map((item) =>
      item?.item_name ||
      item?.itemName ||
      item?.name ||
      item?.product_name ||
      item?.productName ||
      item?.sku ||
      "Unknown Item"
    )
    .filter(Boolean);

  if (itemNames.length === 0) {
    return getTransferItemName(transfer, fallbackIndex);
  }

  if (itemNames.length <= maxVisible) {
    return itemNames.join(", ");
  }

  const remaining = itemNames.length - maxVisible;
  return `${itemNames.slice(0, maxVisible).join(", ")} (+${remaining} more)`;
};

export const getTransferLineItemQuantity = (item = {}) =>
  Number(
    item?.requestedQty ??
      item?.requested_qty ??
      item?.transferQty ??
      item?.transfer_qty ??
      item?.acceptedQty ??
      item?.accepted_qty ??
      item?.requested_quantity ??
      item?.transfer_quantity ??
      0
  ) || 0;

export const getTransferLineItemKey = (item = {}, index = 0) =>
  String(
    item?.id ??
      item?._id ??
      item?.item_id ??
      item?.itemId ??
      item?.sku ??
      item?.batch_code ??
      item?.batchCode ??
      index
  );

export const getTransferLineItemRequestedQty = (item = {}) => {
  const requestedQty =
    item?.requestedQty ??
    item?.requested_qty ??
    item?.transferQty ??
    item?.transfer_qty ??
    item?.acceptedQty ??
    item?.accepted_qty ??
    item?.requested_quantity ??
    item?.transfer_quantity ??
    item?.quantity;

  return Number(requestedQty || 0) || 0;
};

export const getTransferLineItemAcceptedQty = (item = {}) => {
  const acceptedQty =
    item?.acceptedQty ??
    item?.accepted_qty ??
    item?.accepted_quantity ??
    item?.receivedQty ??
    item?.received_qty;

  return Number(acceptedQty || 0) || 0;
};

export const getTransferBatchQuantityLabel = (transfer) => {
  const items = getTransferItems(transfer);
  if (!items.length) {
    const fallbackQty = getTransferQuantityLabel(transfer);
    return fallbackQty || 0;
  }

  const totalQuantity = items.reduce((sum, item) => {
    return sum + getTransferLineItemQuantity(item);
  }, 0);

  if (totalQuantity > 0) return totalQuantity;
  return items.length;
};

export const getTransferDestinationBranchLabel = (transfer, branches, currentBranchId) => {
  const branchId =
    transfer?.target_branch_id ??
    transfer?.targetBranchId ??
    transfer?.toBranchId ??
    transfer?.to_branch_id ??
    transfer?.destination_branch_id ??
    transfer?.destinationBranchId ??
    transfer?.requestDetails?.destinationBranch?.id ??
    transfer?.requestDetails?.destinationBranch?.branch_id ??
    transfer?.requestDetails?.destinationBranch?.branchId ??
    transfer?.requestDetails?.destinationBranchId ??
    transfer?.destinationBranch?.id ??
    transfer?.destinationBranch?.branch_id ??
    transfer?.destinationBranch?.branchId ??
    "";

  const branchNameFromLookup = branchName(branches, branchId);
  if (branchNameFromLookup && branchNameFromLookup !== "Unknown branch") return branchNameFromLookup;

  return (
    transfer?.requestDetails?.destinationBranch?.name ||
    transfer?.requestDetails?.destinationBranch?.branch_name ||
    transfer?.requestDetails?.destinationBranch?.branchName ||
    transfer?.requestDetails?.destinationBranch?.displayName ||
    transfer?.requestDetails?.destination_branch?.name ||
    transfer?.requestDetails?.destination_branch?.branch_name ||
    transfer?.requestDetails?.destination_branch?.branchName ||
    transfer?.requestDetails?.destination_branch?.displayName ||
    transfer?.requestDetails?.destination_branch_name ||
    transfer?.requestDetails?.destinationBranchName ||
    transfer?.destinationBranch?.name ||
    transfer?.destinationBranch?.branch_name ||
    transfer?.destinationBranch?.branchName ||
    transfer?.destinationBranch?.displayName ||
    transfer?.destination_branch?.name ||
    transfer?.destination_branch?.branch_name ||
    transfer?.destination_branch?.branchName ||
    transfer?.destination_branch?.displayName ||
    transfer?.destination_branch_name ||
    transfer?.destinationBranchName ||
    branchNameFromLookup ||
    "Unknown branch"
  );
};

export const getTransferSourceBranchLabel = (transfer, branches) => {
  const branchId = getTransferSourceBranchId(transfer);
  const branchNameFromLookup = branchName(branches, branchId);
  if (branchNameFromLookup && branchNameFromLookup !== "Unknown branch") return branchNameFromLookup;

  return (
    transfer?.sourceBranch?.name ||
    transfer?.sourceBranch?.branch_name ||
    transfer?.sourceBranch?.branchName ||
    transfer?.sourceBranch?.displayName ||
    transfer?.source_branch?.name ||
    transfer?.source_branch?.branch_name ||
    transfer?.source_branch?.branchName ||
    transfer?.source_branch?.displayName ||
    transfer?.source_branch_name ||
    transfer?.sourceBranchName ||
    branchNameFromLookup ||
    "Unknown branch"
  );
};

export const getTransferHistorySourceBranchId = (transfer = {}) =>
  String(
    transfer?.sourceBranchId ??
      transfer?.source_branch_id ??
      transfer?.fromBranchId ??
      transfer?.from_branch_id ??
      getTransferSourceBranchId(transfer) ??
      ""
  ).trim();

export const getTransferHistoryAcceptedQty = (transfer = {}) =>
  Number(
    transfer?.acceptedQty ??
      transfer?.accepted_qty ??
      transfer?.accepted_quantity ??
      transfer?.quantity ??
      transfer?.requestedQty ??
      transfer?.requested_qty ??
      0
  ) || 0;

export const getTransferQuantityLabel = (transfer) => {
  const items = getTransferItems(transfer);
  const requestedQty =
    transfer?.quantity ??
    transfer?.requestedQty ??
    transfer?.requested_qty ??
    transfer?.requestDetails?.requestedQty ??
    transfer?.requestDetails?.requested_qty ??
    transfer?.requestDetails?.totalRequestedQty ??
    transfer?.requestDetails?.total_requested_qty ??
    items.reduce((sum, item) => sum + getTransferLineItemQuantity(item), 0);

  return Number(requestedQty || 0) || 0;
};

export const normalizeTransferRecord = (transfer = {}, branches = [], currentBranchId = "") => {
  const items = getTransferItems(transfer);
  const primaryItem = items[0] || {};
  const itemName = getTransferItemName(transfer);
  const requestedQty = getTransferBatchQuantityLabel(transfer) || getTransferQuantityLabel(transfer);
  const acceptedQty = getTransferAcceptedQty(transfer);
  const destinationBranchLabel = getTransferDestinationBranchLabel(transfer, branches, currentBranchId);
  const sourceBranchLabel = getTransferSourceBranchLabel(transfer, branches);

  return {
    ...transfer,
    itemName,
    sku:
      primaryItem.sku ||
      primaryItem.item_sku ||
      transfer?.sku ||
      transfer?.requestDetails?.sku ||
      transfer?.requestDetails?.item?.sku ||
      "",
    destinationBranchLabel,
    destinationBranchName: destinationBranchLabel,
    sourceBranchLabel,
    sourceBranchName: sourceBranchLabel,
    requestedQty,
    quantity: requestedQty,
    acceptedQty,
    sourceBranchId:
      getTransferSourceBranchId(transfer) ||
      transfer?.requestDetails?.sourceBranch?.id ||
      transfer?.requestDetails?.sourceBranch?.branch_id ||
      transfer?.sourceBranch?.id ||
      transfer?.sourceBranch?.branch_id ||
      "",
    targetBranchId:
      getTransferTargetBranchId(transfer) ||
      transfer?.requestDetails?.destinationBranch?.id ||
      transfer?.requestDetails?.destinationBranch?.branch_id ||
      transfer?.destinationBranch?.id ||
      transfer?.destinationBranch?.branch_id ||
      "",
    updatedAt: transfer?.updatedAt || transfer?.updated_at || transfer?.createdAt || transfer?.created_at || null,
  };
};
