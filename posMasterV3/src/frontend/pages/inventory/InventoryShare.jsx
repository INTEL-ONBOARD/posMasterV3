import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Package2,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { useBranchContext } from "../../context/BranchContext.jsx";
import { inventoryTransferApi } from "../../api/localApi";
import { useReactiveData, TABLES } from "../../store";

const CURRENT_BRANCH_ID = null;

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatDateOnly = (value) =>
  new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
  }).format(new Date(value));

const statusMeta = (status) => {
  switch ((status || "").toLowerCase()) {
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

const branchIdValue = (branch) =>
  String(branch?.id ?? branch?._id ?? branch?.branch_id ?? branch?.branchId ?? "").trim();

const branchDisplayName = (branch) =>
  branch?.branch_name || branch?.name || branch?.branchName || branch?.code || "Unknown branch";

const branchName = (branches, branchId) => {
  const targetId = String(branchId ?? "").trim();
  const branch = branches.find((row) => branchIdValue(row) === targetId);
  return branchDisplayName(branch);
};

const getCurrentBranchId = (branch, fallback = CURRENT_BRANCH_ID) =>
  String(branch?.id ?? branch?.branch_id ?? branch?.branchId ?? fallback ?? "").trim();

const getStockBranchId = (stock) =>
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

const getTransferSourceBranchId = (transfer) =>
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

const getTransferTargetBranchId = (transfer) =>
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

const getTransferRequestedQty = (transfer) =>
  Number(transfer?.quantity ?? transfer?.requestedQty ?? transfer?.requested_qty ?? 0) || 0;

const getTransferAcceptedQty = (transfer) =>
  Number(transfer?.acceptedQty ?? transfer?.accepted_qty ?? transfer?.accepted_quantity ?? 0) || 0;

const getTransferItems = (transfer) => {
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

const getTransferItemName = (transfer, fallbackIndex = 0) => {
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

const getTransferBatchItemNames = (transfer, fallbackIndex = 0, maxVisible = 2) => {
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

const getTransferBatchQuantityLabel = (transfer) => {
  const items = getTransferItems(transfer);
  if (!items.length) {
    const fallbackQty = getTransferQuantityLabel(transfer);
    return fallbackQty || 0;
  }

  const totalQuantity = items.reduce((sum, item) => {
    const qty = Number(
      item?.transferQty ??
      item?.transfer_qty ??
      item?.quantity ??
      item?.qty ??
      item?.requestedQty ??
      item?.requested_qty ??
      item?.acceptedQty ??
      item?.accepted_qty ??
      0
    ) || 0;
    return sum + qty;
  }, 0);

  if (totalQuantity > 0) return totalQuantity;
  return items.length;
};

const getTransferDestinationBranchLabel = (transfer, branches, currentBranchId) => {
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

const getTransferQuantityLabel = (transfer) => {
  const items = getTransferItems(transfer);
  const primaryItem = items[0] || {};
  return Number(
    transfer?.quantity ??
      transfer?.requestedQty ??
      transfer?.requested_qty ??
      primaryItem.transferQty ??
      primaryItem.quantity ??
      primaryItem.qty ??
      primaryItem.requestedQty ??
      primaryItem.requested_qty ??
      primaryItem.transfer_qty ??
      primaryItem.transfer_quantity ??
      transfer?.requestDetails?.requestedQty ??
      transfer?.requestDetails?.requested_qty ??
      transfer?.requestDetails?.quantity ??
      transfer?.requestDetails?.qty ??
      transfer?.requestDetails?.item?.quantity ??
      transfer?.requestDetails?.item?.qty ??
      transfer?.requestDetails?.item?.requestedQty ??
      transfer?.requestDetails?.item?.requested_qty ??
      0
  ) || 0;
};

const normalizeTransferRecord = (transfer = {}, branches = [], currentBranchId = "") => {
  const items = getTransferItems(transfer);
  const primaryItem = items[0] || {};
  const itemName = getTransferItemName(transfer);
  const requestedQty = getTransferQuantityLabel(transfer);
  const acceptedQty = getTransferAcceptedQty(transfer);
  const destinationBranchLabel = getTransferDestinationBranchLabel(transfer, branches, currentBranchId);

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

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-[#1A318C] border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export function ShareItemCard({ item, isAdded, onAdd }) {
  const quantity = Number(item?.quantity) || 0;
  const maxCapacity = Number(item?.maximum_capacity) || 100;
  const threshold = Number(item?.threshold_limit) || 20;
  const percentFull = maxCapacity > 0 ? (quantity / maxCapacity) * 100 : 0;

  const status =
    percentFull <= threshold
      ? { label: "Low", badge: "bg-rose-500", text: "text-rose-600" }
      : percentFull <= threshold + 20
        ? { label: "Medium", badge: "bg-amber-500", text: "text-amber-600" }
        : { label: "In Stock", badge: "bg-emerald-500", text: "text-emerald-600" };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/80" />
      <div className="relative">
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#0F6591] via-[#1A8F9B] to-[#8EE8A4]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.34),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.2),_transparent_35%)]" />
          <div className="absolute left-3 top-3">
            <Badge tone={status.label === "In Stock" ? "emerald" : status.label === "Medium" ? "amber" : "rose"}>{status.label}</Badge>
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
            {quantity}/{maxCapacity}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className={`h-full ${status.badge}`} style={{ width: `${Math.min(percentFull, 100)}%` }} />
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {item?.uom?.symbol || "unit"}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item?.sku || "SKU"}</span>
          </div>
          <h3 className="mt-2 truncate text-base font-bold text-slate-800">{item?.item_name || "Unnamed Item"}</h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{item?.category?.type || "Category"}</Badge>
            <Badge tone="blue">{item?.category?.brand || "Brand"}</Badge>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Retail Price</p>
              <p className="text-lg font-bold text-slate-800 tabular-nums">
                Rs.{Number(item?.retail_price || 0).toFixed(2)}
                <span className="ml-1 text-xs font-medium text-slate-400">/{item?.uom?.symbol || "unit"}</span>
              </p>
            </div>
            <div className={`text-xs font-bold tabular-nums ${status.text}`}>
              {quantity}/{maxCapacity}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAdd(item)}
            disabled={isAdded}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              isAdded
                ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "bg-[#1A318C] text-white shadow-sm hover:bg-[#152a79]"
            }`}
          >
            {isAdded ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IncomingRequestCard({
  request,
  branchLabel,
  acceptedQty,
  onQtyChange,
  onAccept,
  onReject,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4 text-[#1A318C]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{request.sku}</p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-800">{request.itemName}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="blue">From: {branchLabel}</Badge>
            <Badge tone="slate">Requested: {request.requestedQty}</Badge>
            <StatusBadge status={request.status} />
          </div>
          {request.note ? <p className="mt-3 text-sm text-slate-500">{request.note}</p> : null}
          <p className="mt-3 text-xs text-slate-400">Requested on {formatDateTime(request.createdAt)}</p>
        </div>

        <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 lg:max-w-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accept Quantity</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="number"
              min="1"
              max={request.requestedQty}
              value={acceptedQty}
              onChange={(e) => onQtyChange(request.id, e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
            />
            <span className="text-xs font-semibold text-slate-400">/ {request.requestedQty}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">You can accept a partial quantity if needed.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onReject(request.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => onAccept(request.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransferHistoryTable({ title, rows, counterpartyLabel, branches, currentBranchId }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">{rows.length} transfer records</p>
        </div>
        <Badge tone="blue">
          <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
          {counterpartyLabel}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-[#1A318C] text-white">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">#</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">Item Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">{counterpartyLabel}</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">Quantity</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                  No transfer history yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const requestedQty = getTransferBatchQuantityLabel(row);
                const itemName = getTransferBatchItemNames(row, index);
                const destinationBranchLabel = row.destinationBranchLabel || getTransferDestinationBranchLabel(row, branches, currentBranchId);
                const quantityLabel = String(requestedQty);
                const rowKey = `${row.id || row.sku || "transfer"}-${index}`;

                return (
                  <tr key={rowKey} className="bg-white transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-sm font-medium text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{itemName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {destinationBranchLabel}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800 tabular-nums">{quantityLabel}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDateOnly(row.updatedAt || row.updated_at || row.createdAt || row.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  icon,
  rightSlot,
  children,
  headerClassName = "flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4",
  titleClassName = "text-base font-semibold text-slate-800",
  subtitleClassName = "text-xs leading-tight text-slate-500",
}) {
  const IconComponent = icon;
  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className={headerClassName}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A318C]/10 text-[#1A318C]">
            {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
          </div>
          <div>
            <h3 className={titleClassName}>{title}</h3>
            <p className={subtitleClassName}>{subtitle}</p>
          </div>
        </div>
        {rightSlot}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ label, value, hint, icon, tone = "blue" }) {
  const IconComponent = icon;
  const tones = {
    blue: "bg-[#1A318C]/10 text-[#1A318C]",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
          {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
        </div>
      </div>
    </div>
  );
}

export function OutgoingShareTab({
  currentBranch,
  branches,
  inventoryItems,
  outgoingHistory,
  outgoingSearch,
  setOutgoingSearch,
  outgoingCategory,
  setOutgoingCategory,
  onSendTransfer,
  sending,
  filteredOutgoingItems,
  loading,
}) {
  const [selectedItemsList, setSelectedItemsList] = useState([]);
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [cartError, setCartError] = useState("");

  const categoryOptions = useMemo(
    () => Array.from(new Set(inventoryItems.map((item) => item?.category?.type).filter(Boolean))),
    [inventoryItems]
  );

  const selectedItemIds = useMemo(
    () => new Set(selectedItemsList.map((item) => String(item.id))),
    [selectedItemsList]
  );

  const selectedItemsTotalQty = useMemo(
    () => selectedItemsList.reduce((sum, item) => sum + (Number(item.transferQty) || 0), 0),
    [selectedItemsList]
  );

  const destinationBranches = useMemo(
    () => branches.filter((branch) => branchIdValue(branch) !== String(currentBranch?.id ?? currentBranch?.branch_id ?? "")),
    [branches, currentBranch]
  );

  useEffect(() => {
    if (!destinationBranches.length) {
      setDestinationBranchId("");
      return;
    }

    setDestinationBranchId((prev) => {
      if (prev && destinationBranches.some((branch) => branchIdValue(branch) === String(prev))) {
        return prev;
      }
      return branchIdValue(destinationBranches[0]);
    });
  }, [destinationBranches]);

  useEffect(() => {
    setSelectedItemsList((prev) =>
      prev.map((cartItem) => {
        if (cartItem.transferQty === "") return cartItem;

        const sourceItem = inventoryItems.find((item) => String(item.id) === String(cartItem.id));
        if (!sourceItem) return cartItem;

        const availableQty = Math.max(1, Number(sourceItem.quantity) || 1);
        const transferQty = String(Math.min(Math.max(Number(cartItem.transferQty) || 1, 1), availableQty));
        return { ...cartItem, transferQty };
      })
    );
  }, [inventoryItems]);

  const addItemToCart = (item) => {
    setSelectedItemsList((prev) => {
      if (prev.some((entry) => String(entry.id) === String(item.id))) return prev;
      setCartError("");
      return [...prev, { ...item, transferQty: "1" }];
    });
  };

  const removeItemFromCart = (itemId) => {
    setSelectedItemsList((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
    setCartError("");
  };

  const updateCartQuantity = (itemId, value) => {
    setCartError("");
    const rawValue = String(value ?? "");
    const sanitizedValue = rawValue.replace(/[^\d]/g, "");

    setSelectedItemsList((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(itemId)) return item;
        if (rawValue === "") {
          return { ...item, transferQty: "" };
        }

        const availableQty = Math.max(1, Number(item.quantity) || 1);
        const parsed = Number(sanitizedValue);
        if (!Number.isFinite(parsed)) {
          return item;
        }

        const transferQty = String(Math.min(Math.max(parsed, 1), availableQty));
        return { ...item, transferQty };
      })
    );
  };

  useEffect(() => {
    console.groupCollapsed("[OutgoingShareTab] Render debug");
    console.log("currentBranch", currentBranch);
    console.log("inventoryItems", inventoryItems);
    console.log("filteredOutgoingItems", filteredOutgoingItems);
    console.groupEnd();
  }, [currentBranch, filteredOutgoingItems, inventoryItems]);

  const handleBulkSend = async () => {
    setCartError("");

    if (!selectedItemsList.length) {
      setCartError("Please add at least one item to the cart.");
      return;
    }

    if (!destinationBranchId) {
      setCartError("Please select a destination branch.");
      return;
    }

    if (String(destinationBranchId) === String(branchIdValue(currentBranch))) {
      setCartError("You cannot share inventory with the same branch.");
      return;
    }

    const invalidItem = selectedItemsList.find((item) => {
      const availableQty = Number(item.quantity) || 0;
      const qty = Number(item.transferQty) || 0;
      return qty <= 0 || qty > availableQty;
    });

    if (invalidItem) {
      setCartError(`Invalid quantity for ${invalidItem.item_name}.`);
      return;
    }

    try {
      await onSendTransfer(selectedItemsList, destinationBranchId, transferNote);
      setSelectedItemsList([]);
      setTransferNote("");
      setCartError("");
    } catch (error) {
      // Parent handles the failure toast.
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <SectionShell
          title="Current Branch Inventory"
          subtitle={`Select items from ${branchDisplayName(currentBranch)} and send them to another branch`}
          icon={Package2}
          titleClassName="text-base font-semibold text-slate-800"
          subtitleClassName="text-xs leading-tight text-slate-500"
          rightSlot={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={outgoingSearch}
                  onChange={(e) => setOutgoingSearch(e.target.value)}
                  placeholder="Search items by name or SKU..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#1A318C] focus:bg-white"
                />
              </div>
              <select
                value={outgoingCategory}
                onChange={(e) => setOutgoingCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#1A318C] focus:bg-white"
              >
                <option value="All">All Categories</option>
                {categoryOptions.map((category, index) => (
                  <option key={`${category || "category"}-${index}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="flex max-h-[calc(100vh-380px)] min-h-0 flex-col pr-1">
            {loading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
              </div>
            ) : filteredOutgoingItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
                <Package2 className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-base font-semibold text-slate-700">No items found</p>
                <p className="mt-1 text-sm text-slate-500">Try changing the search or category filter.</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredOutgoingItems.map((item, index) => (
                    <ShareItemCard
                      key={`${item.id || item.sku || item.batch_code || "item"}-${index}`}
                      item={item}
                      isAdded={selectedItemIds.has(String(item.id))}
                      onAdd={addItemToCart}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionShell>

        <SectionShell
          title="Send Share Request"
          subtitle="Choose the destination branch and quantity"
          icon={Send}
          headerClassName="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"
          titleClassName="text-base font-semibold text-slate-800"
          subtitleClassName="text-xs leading-tight text-slate-500"
          rightSlot={
            <Badge tone="blue">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              {branchDisplayName(currentBranch)}
            </Badge>
          }
        >
          <div className="space-y-4">
            {cartError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {cartError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Items</p>
                  <h4 className="text-lg font-bold text-slate-800">{selectedItemsList.length} item(s)</h4>
                </div>
                <Badge tone="blue">Total Qty: {selectedItemsTotalQty}</Badge>
              </div>

              <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                {selectedItemsList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                    <Package2 className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">Add items from the left panel</p>
                    <p className="mt-1 text-xs text-slate-500">Your transfer cart will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItemsList.map((item, index) => (
                      <div
                        key={`${item.id || item.sku || item.batch_code || "cart-item"}-${index}`}
                        className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Package2 className="h-4 w-4 shrink-0 text-[#1A318C]" />
                            <p className="truncate text-sm font-semibold text-slate-800">{item.item_name}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{item.sku}</p>
                        </div>

                        <div className="w-28 shrink-0">
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Transfer Qty
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max={Number(item.quantity) || 1}
                            value={item.transferQty ?? ""}
                            onChange={(e) => updateCartQuantity(item.id, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A318C]"
                          />
                        </div>

                        <div className="shrink-0 self-end pb-[2px]">
                          <button
                            type="button"
                            onClick={() => removeItemFromCart(item.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            <XCircle className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Destination Branch</label>
                <select
                  value={destinationBranchId}
                  onChange={(e) => {
                    setDestinationBranchId(e.target.value);
                    setCartError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1A318C]"
                >
                  <option value="">Select branch</option>
                  {destinationBranches.map((branch, index) => (
                    <option key={`${branch.id || branch.branch_id || branch.branchId || branch.code || "branch"}-${index}`} value={branch.id}>
                      {branchDisplayName(branch)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Transfer Note</label>
                <textarea
                  rows={4}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Optional note to accompany the share request..."
                  className="h-full w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1A318C]"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={sending || selectedItemsList.length === 0 || !destinationBranchId}
              onClick={handleBulkSend}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A318C] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#152a79] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Send Share Requests
            </button>

            <div className="rounded-2xl bg-[#1A318C]/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1A318C]">Quick Summary</p>
                <Badge tone="blue">{outgoingHistory.length} sent</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-medium text-slate-400">Current Branch</p>
                  <p className="mt-1 font-semibold text-slate-800">{branchDisplayName(currentBranch)}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-medium text-slate-400">Destination</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {branchName(branches, destinationBranchId) || "Not selected"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
      </div>

      <TransferHistoryTable
        title="Outgoing Share History"
        rows={outgoingHistory}
        counterpartyLabel="Destination Branch"
        branches={branches}
        currentBranchId={currentBranch?.id || currentBranch?.branch_id || ""}
      />
    </div>
  );
}

export function IncomingShareTab({
  currentBranchId,
  branches,
  pendingRequests,
  incomingHistory,
  incomingSearch,
  setIncomingSearch,
  acceptQuantities,
  setAcceptQuantities,
  onAcceptTransfer,
  onRejectTransfer,
  loading,
}) {
  const filteredPendingRequests = useMemo(() => {
    const term = (incomingSearch || "").toLowerCase();
    return pendingRequests.filter((request) => {
      const source = branchName(branches, request.fromBranchId).toLowerCase();
      return (
        (request.itemName || "").toLowerCase().includes(term) ||
        (request.sku || "").toLowerCase().includes(term) ||
        source.includes(term)
      );
    });
  }, [branches, incomingSearch, pendingRequests]);

  return (
    <div className="space-y-5">
      <SectionShell
        title="Pending Incoming Requests"
        subtitle="Review transfer requests from other branches"
        icon={ArrowLeftRight}
        rightSlot={
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={incomingSearch}
              onChange={(e) => setIncomingSearch(e.target.value)}
              placeholder="Search by item, SKU, or branch..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#1A318C] focus:bg-white"
            />
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
          </div>
        ) : filteredPendingRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
            <ArrowLeftRight className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-700">No pending requests</p>
            <p className="mt-1 text-sm text-slate-500">Incoming share requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPendingRequests.map((request, index) => (
              <IncomingRequestCard
                key={`${request.id || request.sku || request.itemName || "request"}-${index}`}
                request={request}
                branchLabel={branchName(branches, getTransferSourceBranchId(request))}
                acceptedQty={acceptQuantities[request.id] ?? getTransferRequestedQty(request)}
                onQtyChange={(id, value) =>
                  setAcceptQuantities((prev) => ({ ...prev, [id]: value }))
                }
                onAccept={onAcceptTransfer}
                onReject={onRejectTransfer}
              />
            ))}
          </div>
        )}
      </SectionShell>

      <TransferHistoryTable
        title="Incoming Share History"
        rows={incomingHistory}
        counterpartyLabel="Source Branch"
        branches={branches}
        currentBranchId={currentBranchId}
      />
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;

  const toneClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <div className="fixed right-5 top-5 z-50 w-full max-w-sm">
      <div className={`rounded-2xl border px-4 py-3 shadow-xl ${toneClasses[toast.type] || toneClasses.info}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-white/60 p-2">
            <BellIcon type={toast.type} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{toast.title}</p>
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BellIcon({ type }) {
  if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (type === "error") return <XCircle className="h-4 w-4 text-rose-600" />;
  return <Clock3 className="h-4 w-4 text-blue-600" />;
}

function InventoryShare({ isActive = true, currentBranchId: currentBranchIdProp = CURRENT_BRANCH_ID }) {
  const { currentBranch: activeBranch, loading: branchLoading } = useBranchContext();
  const [activeTab, setActiveTab] = useState("outgoing");
  const [outgoingSearch, setOutgoingSearch] = useState("");
  const [outgoingCategory, setOutgoingCategory] = useState("All");
  const [incomingSearch, setIncomingSearch] = useState("");
  const [acceptQuantities, setAcceptQuantities] = useState({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

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
        .filter((transfer) => getTransferSourceBranchId(transfer) === resolvedCurrentBranchId || String(transfer?.sourceBranchId || "") === resolvedCurrentBranchId)
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

  const pendingIncoming = useMemo(
    () => incomingHistory.filter((transfer) => String(transfer.status || "").toLowerCase() === "pending"),
    [incomingHistory]
  );

  useEffect(() => {
    if (!pendingIncoming.length) return;
    setAcceptQuantities((prev) => {
      const next = { ...prev };
      pendingIncoming.forEach((request) => {
        if (next[request.id] == null) {
          next[request.id] = getTransferRequestedQty(request);
        }
      });
      return next;
    });
  }, [pendingIncoming]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  const loading = branchLoading || branchesLoading || stockLoading || transfersLoading;

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

  const handleAcceptTransfer = async (transferId) => {
    const request = transferRows.find((row) => row.id === transferId);
    if (!request) return;

    const requestedQty = getTransferRequestedQty(request);
    const qty = Number(acceptQuantities[transferId] ?? requestedQty) || 0;
    if (qty <= 0 || qty > requestedQty) {
      setToast({
        type: "error",
        title: "Invalid acceptance quantity",
        message: `Accept between 1 and ${requestedQty}.`,
      });
      return;
    }

    try {
      const acceptedResponse = await inventoryTransferApi.accept(transferId, qty, {
        source_branch_id: getTransferSourceBranchId(request),
        target_branch_id: getTransferTargetBranchId(request),
      });
      const accepted = acceptedResponse?.data || acceptedResponse;
      await Promise.all([refetchTransfers(), refetchStockItems()]);
      setAcceptQuantities((prev) => {
        const next = { ...prev };
        delete next[transferId];
        return next;
      });
      setToast({
        type: "success",
        title: "Transfer accepted",
        message:
          accepted.acceptedQty < accepted.requestedQty
            ? `${accepted.acceptedQty} of ${accepted.requestedQty} units accepted from ${branchName(branches, accepted.sourceBranchId || accepted.fromBranchId)}.`
            : `${accepted.itemName} received from ${branchName(branches, accepted.sourceBranchId || accepted.fromBranchId)}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        title: "Accept failed",
        message: error?.message || "Unable to accept the transfer.",
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

  const summary = useMemo(() => {
    const outgoingPending = outgoingHistory.filter((transfer) => String(transfer.status || "").toLowerCase() === "pending").length;
    const incomingPendingCount = pendingIncoming.length;
    const acceptedCount = transferRows.filter((transfer) => String(transfer.status || "").toLowerCase() === "accepted").length;
    const rejectedCount = transferRows.filter((transfer) => String(transfer.status || "").toLowerCase() === "rejected").length;

    return { outgoingPending, incomingPendingCount, acceptedCount, rejectedCount };
  }, [outgoingHistory, pendingIncoming.length, transferRows]);

  const shareTabs = useMemo(
    () => [
      {
        id: "outgoing",
        title: "Outgoing Share",
        subtitle: "Create transfer requests for other branches",
        icon: Send,
      },
      {
        id: "incoming",
        title: "Incoming Share",
        subtitle: "Review and process requests sent to this branch",
        icon: ArrowLeftRight,
      },
    ],
    []
  );

  useEffect(() => {
    if (!shareTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(shareTabs[0].id);
    }
  }, [activeTab, shareTabs]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 pb-24">
      <Toast toast={toast} />

      <div className="mx-auto flex h-full min-h-0 max-w-[1800px] flex-col gap-4 p-4 pb-24 lg:p-6">
        <div className="rounded-3xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1A318C]/10 bg-[#1A318C]/5 px-3 py-1.5 text-xs font-semibold text-[#1A318C]">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Inventory Share
              </div>
              <h1 className="mt-3 text-3xl font-black text-slate-900">Inventory Share</h1>
              <p className="mt-1 text-sm text-slate-500">
                Move inventory safely between branches with outgoing requests, incoming approvals, and full transfer history.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Outgoing Pending" value={summary.outgoingPending} icon={Send} tone="blue" />
              <StatCard label="Incoming Pending" value={summary.incomingPendingCount} icon={ArrowLeftRight} tone="amber" />
              <StatCard label="Accepted" value={summary.acceptedCount} icon={CheckCircle2} tone="emerald" />
              <StatCard label="Rejected" value={summary.rejectedCount} icon={XCircle} tone="rose" />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-72 xl:w-80 shrink-0">
            <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-3 px-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Share Views</p>
                <p className="mt-1 text-sm text-slate-500">Choose the transfer workspace</p>
              </div>

              <div className="space-y-2">
                {shareTabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActiveTab = activeTab === tab.id;
                  return (
                    <button
                      key={`${tab.id || "tab"}-${index}`}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isActiveTab
                          ? "border-[#1A318C] bg-[#1A318C] text-white shadow-md shadow-blue-900/20"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                            isActiveTab ? "bg-white/15 text-white" : "bg-[#1A318C]/10 text-[#1A318C]"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold ${isActiveTab ? "text-white" : "text-slate-800"}`}>
                            {tab.title}
                          </p>
                          <p className={`mt-1 text-xs ${isActiveTab ? "text-white/80" : "text-slate-500"}`}>
                            {tab.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
              {activeTab === "outgoing" ? (
                <OutgoingShareTab
                  currentBranch={currentBranch || { id: resolvedCurrentBranchId, branch_name: currentBranchLabel }}
                  branches={destinationBranches}
                  inventoryItems={inventoryItems}
                  outgoingHistory={outgoingHistory}
                  outgoingSearch={outgoingSearch}
                  setOutgoingSearch={setOutgoingSearch}
                  outgoingCategory={outgoingCategory}
                  setOutgoingCategory={setOutgoingCategory}
                  onSendTransfer={handleSendTransfer}
                  sending={sending}
                  filteredOutgoingItems={filteredOutgoingItems}
                  loading={loading}
                />
              ) : (
                <IncomingShareTab
                  currentBranchId={currentBranch?.id || currentBranch?.branch_id || ""}
                  branches={branches}
                  pendingRequests={pendingIncoming}
                  incomingHistory={incomingHistory}
                  incomingSearch={incomingSearch}
                  setIncomingSearch={setIncomingSearch}
                  acceptQuantities={acceptQuantities}
                  setAcceptQuantities={setAcceptQuantities}
                  onAcceptTransfer={handleAcceptTransfer}
                  onRejectTransfer={handleRejectTransfer}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryShare;
