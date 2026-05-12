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

const CURRENT_BRANCH_ID = "branch-1";

const MOCK_BRANCHES = [
  { id: "branch-1", branch_name: "Colombo Hub", code: "CBL", city: "Colombo" },
  { id: "branch-2", branch_name: "Kandy Depot", code: "KDY", city: "Kandy" },
  { id: "branch-3", branch_name: "Galle Outlet", code: "GAL", city: "Galle" },
  { id: "branch-4", branch_name: "Jaffna Hub", code: "JFN", city: "Jaffna" },
];

const MOCK_BRANCH_STOCK = {
  "branch-1": [
    {
      id: "stk-1",
      item_id: "itm-1",
      sku: "CF12154",
      item_code: "CF12154",
      item_name: "Coffee",
      item_image_url: "",
      maximum_capacity: 100,
      batch_code: "CF-001",
      quantity: 46,
      threshold_limit: 20,
      stock_price: 180,
      retail_price: 250,
      discount_price: 0,
      expiry_date: "2026-12-31",
      availability: true,
      category: { id: "cat-1", brand: "Harischandra", type: "Coffee" },
      uom: { id: "uom-1", symbol: "pack", unit_name: "Pack" },
    },
    {
      id: "stk-2",
      item_id: "itm-2",
      sku: "HIG23534",
      item_code: "HIG23534",
      item_name: "Anchor",
      item_image_url: "",
      maximum_capacity: 50,
      batch_code: "ANCH-002",
      quantity: 59,
      threshold_limit: 20,
      stock_price: 220,
      retail_price: 250,
      discount_price: 0,
      expiry_date: "2026-10-10",
      availability: true,
      category: { id: "cat-2", brand: "Anchor", type: "Milk Powder" },
      uom: { id: "uom-2", symbol: "pcs", unit_name: "Pieces" },
    },
    {
      id: "stk-3",
      item_id: "itm-3",
      sku: "VIV4785123699",
      item_code: "VIV4785123699",
      item_name: "VIVA",
      item_image_url: "",
      maximum_capacity: 100,
      batch_code: "VIVA-003",
      quantity: 166,
      threshold_limit: 20,
      stock_price: 920,
      retail_price: 1025,
      discount_price: 0,
      expiry_date: "2026-09-01",
      availability: true,
      category: { id: "cat-3", brand: "Viva", type: "Malted Drinks" },
      uom: { id: "uom-3", symbol: "pack", unit_name: "Pack" },
    },
    {
      id: "stk-4",
      item_id: "itm-4",
      sku: "HIG23534-L",
      item_code: "HIG23534-L",
      item_name: "Highland Milk",
      item_image_url: "",
      maximum_capacity: 10,
      batch_code: "HIG-004",
      quantity: 19,
      threshold_limit: 15,
      stock_price: 220,
      retail_price: 250,
      discount_price: 0,
      expiry_date: "2026-08-11",
      availability: true,
      category: { id: "cat-4", brand: "Highland", type: "Fresh Milk" },
      uom: { id: "uom-4", symbol: "L", unit_name: "Liter" },
    },
  ],
  "branch-2": [
    {
      id: "stk-11",
      item_id: "itm-1",
      sku: "CF12154",
      item_code: "CF12154",
      item_name: "Coffee",
      item_image_url: "",
      maximum_capacity: 100,
      batch_code: "CF-KDY-001",
      quantity: 11,
      threshold_limit: 20,
      stock_price: 180,
      retail_price: 250,
      discount_price: 0,
      expiry_date: "2026-12-31",
      availability: true,
      category: { id: "cat-1", brand: "Harischandra", type: "Coffee" },
      uom: { id: "uom-1", symbol: "pack", unit_name: "Pack" },
    },
    {
      id: "stk-12",
      item_id: "itm-3",
      sku: "VIV4785123699",
      item_code: "VIV4785123699",
      item_name: "VIVA",
      item_image_url: "",
      maximum_capacity: 100,
      batch_code: "VIVA-KDY-001",
      quantity: 28,
      threshold_limit: 20,
      stock_price: 920,
      retail_price: 1025,
      discount_price: 0,
      expiry_date: "2026-09-01",
      availability: true,
      category: { id: "cat-3", brand: "Viva", type: "Malted Drinks" },
      uom: { id: "uom-3", symbol: "pack", unit_name: "Pack" },
    },
  ],
  "branch-3": [
    {
      id: "stk-21",
      item_id: "itm-2",
      sku: "HIG23534",
      item_code: "HIG23534",
      item_name: "Anchor",
      item_image_url: "",
      maximum_capacity: 50,
      batch_code: "ANCH-GAL-001",
      quantity: 35,
      threshold_limit: 20,
      stock_price: 220,
      retail_price: 250,
      discount_price: 0,
      expiry_date: "2026-10-10",
      availability: true,
      category: { id: "cat-2", brand: "Anchor", type: "Milk Powder" },
      uom: { id: "uom-2", symbol: "pcs", unit_name: "Pieces" },
    },
  ],
  "branch-4": [
    {
      id: "stk-31",
      item_id: "itm-4",
      sku: "HIG23534-L",
      item_code: "HIG23534-L",
      item_name: "Highland Milk",
      item_image_url: "",
      maximum_capacity: 10,
      batch_code: "HIG-JFN-001",
      quantity: 12,
      threshold_limit: 15,
      stock_price: 220,
      retail_price: 250,
      discount_price: 0,
      expiry_date: "2026-08-11",
      availability: true,
      category: { id: "cat-4", brand: "Highland", type: "Fresh Milk" },
      uom: { id: "uom-4", symbol: "L", unit_name: "Liter" },
    },
  ],
};

const MOCK_TRANSFERS = [
  {
    id: "TR-20260512-001",
    itemId: "itm-1",
    sku: "CF12154",
    itemName: "Coffee",
    category: { id: "cat-1", brand: "Harischandra", type: "Coffee" },
    uom: { id: "uom-1", symbol: "pack", unit_name: "Pack" },
    maximum_capacity: 100,
    retail_price: 250,
    stock_price: 180,
    threshold_limit: 20,
    fromBranchId: "branch-1",
    toBranchId: "branch-2",
    requestedQty: 8,
    acceptedQty: 8,
    status: "accepted",
    createdAt: "2026-05-11T09:30:00.000Z",
    updatedAt: "2026-05-11T12:14:00.000Z",
    note: "Urgent top-up for weekend sales",
  },
  {
    id: "TR-20260512-002",
    itemId: "itm-2",
    sku: "HIG23534",
    itemName: "Anchor",
    category: { id: "cat-2", brand: "Anchor", type: "Milk Powder" },
    uom: { id: "uom-2", symbol: "pcs", unit_name: "Pieces" },
    maximum_capacity: 50,
    retail_price: 250,
    stock_price: 220,
    threshold_limit: 20,
    fromBranchId: "branch-3",
    toBranchId: "branch-1",
    requestedQty: 10,
    acceptedQty: 0,
    status: "pending",
    createdAt: "2026-05-12T06:15:00.000Z",
    updatedAt: "2026-05-12T06:15:00.000Z",
    note: "Transfer for seasonal demand",
  },
  {
    id: "TR-20260512-003",
    itemId: "itm-4",
    sku: "HIG23534-L",
    itemName: "Highland Milk",
    category: { id: "cat-4", brand: "Highland", type: "Fresh Milk" },
    uom: { id: "uom-4", symbol: "L", unit_name: "Liter" },
    maximum_capacity: 10,
    retail_price: 250,
    stock_price: 220,
    threshold_limit: 15,
    fromBranchId: "branch-4",
    toBranchId: "branch-1",
    requestedQty: 4,
    acceptedQty: 2,
    status: "accepted",
    createdAt: "2026-05-12T08:05:00.000Z",
    updatedAt: "2026-05-12T09:15:00.000Z",
    note: "Partial fill due to branch stock",
  },
  {
    id: "TR-20260512-004",
    itemId: "itm-3",
    sku: "VIV4785123699",
    itemName: "VIVA",
    category: { id: "cat-3", brand: "Viva", type: "Malted Drinks" },
    uom: { id: "uom-3", symbol: "pack", unit_name: "Pack" },
    maximum_capacity: 100,
    retail_price: 1025,
    stock_price: 920,
    threshold_limit: 20,
    fromBranchId: "branch-1",
    toBranchId: "branch-3",
    requestedQty: 12,
    acceptedQty: 0,
    status: "rejected",
    createdAt: "2026-05-12T10:25:00.000Z",
    updatedAt: "2026-05-12T10:48:00.000Z",
    note: "Destination branch not ready for receipt",
  },
];

const mockDb = {
  branches: JSON.parse(JSON.stringify(MOCK_BRANCHES)),
  stockByBranch: JSON.parse(JSON.stringify(MOCK_BRANCH_STOCK)),
  transfers: JSON.parse(JSON.stringify(MOCK_TRANSFERS)),
};

const delay = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));

const deepClone = (value) => JSON.parse(JSON.stringify(value));

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

const branchName = (branches, branchId) =>
  branches.find((branch) => branch.id === branchId)?.branch_name ||
  branches.find((branch) => branch.id === branchId)?.code ||
  "Unknown branch";

function aggregateStockRows(stockRows = []) {
  const map = new Map();

  stockRows.forEach((stock) => {
    const sku = stock?.sku;
    if (!sku) return;

    const existing = map.get(sku);
    if (existing) {
      existing.quantity += Number(stock?.quantity) || 0;
      existing.batchCount += 1;
      if ((Number(stock?.retail_price) || 0) > (Number(existing.retail_price) || 0)) {
        existing.retail_price = stock?.retail_price;
        existing.stock_price = stock?.stock_price;
        existing.discount_price = stock?.discount_price;
        existing.batch_code = stock?.batch_code;
      }
      return;
    }

    map.set(sku, {
      id: stock?.item_id ?? stock?.id ?? sku,
      item_id: stock?.item_id ?? stock?.id ?? null,
      stock_id: stock?.id,
      sku,
      item_code: stock?.item_code || null,
      item_name: stock?.item_name || "",
      item_image_url: stock?.item_image_url || "",
      maximum_capacity: stock?.maximum_capacity ?? 100,
      batch_code: stock?.batch_code || "",
      quantity: Number(stock?.quantity) || 0,
      threshold_limit: stock?.threshold_limit ?? 20,
      stock_price: stock?.stock_price ?? 0,
      retail_price: stock?.retail_price ?? 0,
      discount_price: stock?.discount_price ?? 0,
      expiry_date: stock?.expiry_date || "",
      availability: stock?.availability ?? true,
      batchCount: 1,
      category: {
        id: stock?.category?.id ?? stock?.category_id ?? null,
        brand: stock?.category?.brand ?? stock?.category_brand ?? "",
        type: stock?.category?.type ?? stock?.category_type ?? "",
      },
      uom: {
        id: stock?.uom?.id ?? stock?.uom_id ?? null,
        symbol: stock?.uom?.symbol ?? stock?.uom_symbol ?? "",
        unit_name: stock?.uom?.unit_name ?? stock?.uom_unit_name ?? "",
      },
    });
  });

  return Array.from(map.values());
}

async function fetchBranches() {
  await delay();
  return deepClone(mockDb.branches);
}

async function fetchInventory(branchId) {
  await delay();
  return aggregateStockRows(deepClone(mockDb.stockByBranch[branchId] || []));
}

async function fetchTransfers() {
  await delay();
  return deepClone(mockDb.transfers);
}

async function sendTransfer(payload) {
  await delay();
  const id = `TR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(
    mockDb.transfers.length + 1
  ).padStart(3, "0")}`;

  const record = {
    id,
    itemId: payload.itemId,
    sku: payload.sku,
    itemName: payload.itemName,
    category: deepClone(payload.category || null),
    uom: deepClone(payload.uom || null),
    maximum_capacity: payload.maximum_capacity ?? 100,
    retail_price: payload.retail_price ?? 0,
    stock_price: payload.stock_price ?? 0,
    threshold_limit: payload.threshold_limit ?? 20,
    fromBranchId: payload.fromBranchId,
    toBranchId: payload.toBranchId,
    requestedQty: Number(payload.quantity) || 0,
    acceptedQty: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    note: payload.note || "",
  };

  mockDb.transfers.unshift(record);
  return deepClone(record);
}

function removeQuantityFromBranch(branchId, sku, quantity) {
  const rows = mockDb.stockByBranch[branchId] || [];
  let remaining = Number(quantity) || 0;
  const available = rows
    .filter((row) => row.sku === sku)
    .reduce((total, row) => total + (Number(row.quantity) || 0), 0);

  if (available < remaining) {
    throw new Error("Not enough stock to complete the transfer");
  }

  for (let index = 0; index < rows.length && remaining > 0; index += 1) {
    const row = rows[index];
    if (row.sku !== sku) continue;

    const take = Math.min(Number(row.quantity) || 0, remaining);
    row.quantity = Math.max(0, (Number(row.quantity) || 0) - take);
    remaining -= take;
  }

  mockDb.stockByBranch[branchId] = rows.filter((row) => (Number(row.quantity) || 0) > 0);
}

function addQuantityToBranch(branchId, transfer, acceptedQty) {
  const rows = mockDb.stockByBranch[branchId] || [];
  rows.unshift({
    id: `recv-${Date.now()}`,
    item_id: transfer.itemId,
    sku: transfer.sku,
    item_code: transfer.sku,
    item_name: transfer.itemName,
    item_image_url: "",
    maximum_capacity: transfer.maximum_capacity ?? 100,
    batch_code: `XFER-${transfer.id}`,
    quantity: acceptedQty,
    threshold_limit: transfer.threshold_limit ?? 20,
    stock_price: transfer.stock_price ?? 0,
    retail_price: transfer.retail_price ?? 0,
    discount_price: 0,
    expiry_date: "",
    availability: true,
    category: transfer.category || { id: null, brand: "", type: "" },
    uom: transfer.uom || { id: null, symbol: "unit", unit_name: "Unit" },
  });
  mockDb.stockByBranch[branchId] = rows;
}

async function acceptTransfer({ transferId, acceptedQty }) {
  await delay();
  const transfer = mockDb.transfers.find((row) => row.id === transferId);
  if (!transfer) throw new Error("Transfer request not found");
  if (transfer.status !== "pending") throw new Error("Transfer has already been decided");

  const qty = Math.max(0, Math.min(Number(acceptedQty) || 0, Number(transfer.requestedQty) || 0));
  if (qty <= 0) throw new Error("Accepted quantity must be greater than zero");

  removeQuantityFromBranch(transfer.fromBranchId, transfer.sku, qty);
  addQuantityToBranch(transfer.toBranchId, transfer, qty);

  transfer.status = "accepted";
  transfer.acceptedQty = qty;
  transfer.updatedAt = new Date().toISOString();
  transfer.partialAccepted = qty < transfer.requestedQty;

  return deepClone(transfer);
}

async function rejectTransfer({ transferId }) {
  await delay();
  const transfer = mockDb.transfers.find((row) => row.id === transferId);
  if (!transfer) throw new Error("Transfer request not found");
  if (transfer.status !== "pending") throw new Error("Transfer has already been decided");

  transfer.status = "rejected";
  transfer.acceptedQty = 0;
  transfer.updatedAt = new Date().toISOString();

  return deepClone(transfer);
}

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

export function ShareItemCard({ item, selected, onSelect }) {
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
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-300 hover:shadow-lg ${
        selected ? "border-[#1A318C] ring-2 ring-[#1A318C]/10" : "border-slate-100 hover:border-[#1A318C]/20"
      }`}
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
        </div>
      </div>
    </button>
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
                const quantityLabel =
                  row.status === "accepted" && Number(row.acceptedQty) && row.acceptedQty !== row.requestedQty
                    ? `${row.acceptedQty}/${row.requestedQty}`
                    : `${row.requestedQty}`;

                return (
                  <tr key={row.id} className="bg-white transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-sm font-medium text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{row.itemName}</p>
                        <p className="text-xs text-slate-400">{row.sku}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {branchName(branches, row.fromBranchId === currentBranchId ? row.toBranchId : row.fromBranchId)}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800 tabular-nums">{quantityLabel}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDateOnly(row.updatedAt || row.createdAt)}</td>
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

function SectionShell({ title, subtitle, icon: Icon, rightSlot, children }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A318C]/10 text-[#1A318C]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {rightSlot}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon, tone = "blue" }) {
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
          <Icon className="h-5 w-5" />
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
  selectedOutgoingItemId,
  setSelectedOutgoingItemId,
  transferQty,
  setTransferQty,
  destinationBranchId,
  setDestinationBranchId,
  transferNote,
  setTransferNote,
  onSendTransfer,
  sending,
  filteredOutgoingItems,
  loading,
}) {
  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedOutgoingItemId) || inventoryItems[0] || null,
    [inventoryItems, selectedOutgoingItemId]
  );

  useEffect(() => {
    if (!selectedItem) return;
    const maxQty = Number(selectedItem.quantity) || 1;
    setTransferQty((prev) => {
      const parsed = Number(prev) || 1;
      return Math.min(Math.max(parsed, 1), maxQty);
    });
  }, [selectedItem, setTransferQty]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(inventoryItems.map((item) => item?.category?.type).filter(Boolean))),
    [inventoryItems]
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <SectionShell
          title="Current Branch Inventory"
          subtitle={`Select items from ${currentBranch.branch_name} and send them to another branch`}
          icon={Package2}
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
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
            </div>
          ) : filteredOutgoingItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <Package2 className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-base font-semibold text-slate-700">No items found</p>
              <p className="mt-1 text-sm text-slate-500">Try changing the search or category filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOutgoingItems.map((item) => (
                <ShareItemCard
                  key={item.id}
                  item={item}
                  selected={item.id === selectedOutgoingItemId}
                  onSelect={() => setSelectedOutgoingItemId(item.id)}
                />
              ))}
            </div>
          )}
        </SectionShell>

        <SectionShell
          title="Send Share Request"
          subtitle="Choose the destination branch and quantity"
          icon={Send}
          rightSlot={
            <Badge tone="blue">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              {currentBranch.branch_name}
            </Badge>
          }
        >
          <div className="space-y-4">
            {selectedItem ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A318C]/10 text-[#1A318C]">
                    <Package2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Item</p>
                    <h4 className="truncate text-lg font-bold text-slate-800">{selectedItem.item_name}</h4>
                    <p className="text-sm text-slate-500">{selectedItem.sku}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available</p>
                    <p className="mt-1 text-xl font-bold text-slate-800 tabular-nums">{selectedItem.quantity}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Maximum</p>
                    <p className="mt-1 text-xl font-bold text-slate-800 tabular-nums">{selectedItem.maximum_capacity}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <Package2 className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Select an item to start a transfer</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Transfer Quantity</label>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <input
                    type="number"
                    min="1"
                    max={selectedItem?.quantity || 1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Destination Branch</label>
                <select
                  value={destinationBranchId}
                  onChange={(e) => setDestinationBranchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1A318C]"
                >
                  <option value="">Select branch</option>
                  {branches
                    .filter((branch) => branch.id !== currentBranch.id)
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Transfer Note</label>
              <textarea
                rows={4}
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Optional note to accompany the share request..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1A318C]"
              />
            </div>

            <button
              type="button"
              disabled={sending || !selectedItem || !destinationBranchId || Number(transferQty) <= 0}
              onClick={onSendTransfer}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A318C] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#152a79] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Send Share Request
            </button>

            <div className="rounded-2xl bg-[#1A318C]/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1A318C]">Quick Summary</p>
                <Badge tone="blue">{outgoingHistory.length} sent</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-medium text-slate-400">Current Branch</p>
                  <p className="mt-1 font-semibold text-slate-800">{currentBranch.branch_name}</p>
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
        currentBranchId={CURRENT_BRANCH_ID}
      />
    </div>
  );
}

export function IncomingShareTab({
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
            {filteredPendingRequests.map((request) => (
              <IncomingRequestCard
                key={request.id}
                request={request}
                branchLabel={branchName(branches, request.fromBranchId)}
                acceptedQty={acceptQuantities[request.id] ?? request.requestedQty}
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
        currentBranchId={CURRENT_BRANCH_ID}
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

function InventoryShare({ isActive = true, currentBranchId = CURRENT_BRANCH_ID }) {
  const [activeTab, setActiveTab] = useState("outgoing");
  const [branches, setBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedOutgoingItemId, setSelectedOutgoingItemId] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [outgoingSearch, setOutgoingSearch] = useState("");
  const [outgoingCategory, setOutgoingCategory] = useState("All");
  const [incomingSearch, setIncomingSearch] = useState("");
  const [acceptQuantities, setAcceptQuantities] = useState({});
  const [toast, setToast] = useState(null);

  const currentBranch = useMemo(
    () => branches.find((branch) => branch.id === currentBranchId) || branches[0] || MOCK_BRANCHES[0],
    [branches, currentBranchId]
  );

  const branchMap = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch]));
  }, [branches]);

  const outgoingHistory = useMemo(
    () =>
      transfers
        .filter((transfer) => transfer.fromBranchId === currentBranchId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [currentBranchId, transfers]
  );

  const incomingHistory = useMemo(
    () =>
      transfers
        .filter((transfer) => transfer.toBranchId === currentBranchId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [currentBranchId, transfers]
  );

  const pendingIncoming = useMemo(
    () => incomingHistory.filter((transfer) => transfer.status === "pending"),
    [incomingHistory]
  );

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;

    async function loadShareData() {
      setLoading(true);
      try {
        const [branchData, inventoryData, transferData] = await Promise.all([
          fetchBranches(),
          fetchInventory(currentBranchId),
          fetchTransfers(),
        ]);

        if (cancelled) return;

        setBranches(branchData);
        setInventoryItems(inventoryData);
        setTransfers(transferData);
      } catch (error) {
        if (!cancelled) {
          setToast({
            type: "error",
            title: "Load failed",
            message: error?.message || "Unable to load inventory share data.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShareData();

    return () => {
      cancelled = true;
    };
  }, [currentBranchId, isActive]);

  useEffect(() => {
    if (!branches.length) return;
    const fallbackDestination = branches.find((branch) => branch.id !== currentBranchId)?.id || "";
    setDestinationBranchId((prev) => prev || fallbackDestination);
  }, [branches, currentBranchId]);

  useEffect(() => {
    if (!inventoryItems.length) return;
    setSelectedOutgoingItemId((prev) =>
      prev && inventoryItems.some((item) => item.id === prev) ? prev : inventoryItems[0].id
    );
  }, [inventoryItems]);

  useEffect(() => {
    if (!pendingIncoming.length) return;
    setAcceptQuantities((prev) => {
      const next = { ...prev };
      pendingIncoming.forEach((request) => {
        if (next[request.id] == null) {
          next[request.id] = request.requestedQty;
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

  const handleSendTransfer = async () => {
    const selectedItem = inventoryItems.find((item) => item.id === selectedOutgoingItemId);
    const qty = Number(transferQty) || 0;

    if (!selectedItem) {
      setToast({ type: "error", title: "Select an item", message: "Please choose an inventory item to share." });
      return;
    }

    if (!destinationBranchId) {
      setToast({ type: "error", title: "Destination required", message: "Please select a destination branch." });
      return;
    }

    if (destinationBranchId === currentBranchId) {
      setToast({ type: "error", title: "Invalid branch", message: "You cannot share inventory with the same branch." });
      return;
    }

    if (qty <= 0 || qty > Number(selectedItem.quantity) || Number.isNaN(qty)) {
      setToast({
        type: "error",
        title: "Invalid quantity",
        message: `Enter a quantity between 1 and ${selectedItem.quantity}.`,
      });
      return;
    }

    setSending(true);
    try {
      const created = await sendTransfer({
        fromBranchId: currentBranchId,
        toBranchId: destinationBranchId,
        itemId: selectedItem.item_id || selectedItem.id,
        sku: selectedItem.sku,
        itemName: selectedItem.item_name,
        category: selectedItem.category,
        uom: selectedItem.uom,
        maximum_capacity: selectedItem.maximum_capacity,
        retail_price: selectedItem.retail_price,
        stock_price: selectedItem.stock_price,
        threshold_limit: selectedItem.threshold_limit,
        quantity: qty,
        note: transferNote,
      });

      const transferData = await fetchTransfers();
      setTransfers(transferData);
      setAcceptQuantities((prev) => ({ ...prev, [created.id]: created.requestedQty }));
      setTransferQty(1);
      setTransferNote("");
      setToast({
        type: "success",
        title: "Request sent",
        message: `${selectedItem.item_name} transferred to ${branchName(branches, destinationBranchId)} as a pending request.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        title: "Send failed",
        message: error?.message || "Unable to send transfer request.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleAcceptTransfer = async (transferId) => {
    const request = transfers.find((row) => row.id === transferId);
    if (!request) return;

    const qty = Number(acceptQuantities[transferId] ?? request.requestedQty) || 0;
    if (qty <= 0 || qty > request.requestedQty) {
      setToast({
        type: "error",
        title: "Invalid acceptance quantity",
        message: `Accept between 1 and ${request.requestedQty}.`,
      });
      return;
    }

    try {
      const accepted = await acceptTransfer({ transferId, acceptedQty: qty });
      const transferData = await fetchTransfers();
      const inventoryData = await fetchInventory(currentBranchId);
      setTransfers(transferData);
      setInventoryItems(inventoryData);
      setToast({
        type: "success",
        title: "Transfer accepted",
        message:
          accepted.acceptedQty < accepted.requestedQty
            ? `${accepted.acceptedQty} of ${accepted.requestedQty} units accepted from ${branchName(branches, accepted.fromBranchId)}.`
            : `${accepted.itemName} received from ${branchName(branches, accepted.fromBranchId)}.`,
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
    if (!transfers.some((row) => row.id === transferId)) return;

    try {
      const rejected = await rejectTransfer({ transferId });
      const transferData = await fetchTransfers();
      setTransfers(transferData);
      setToast({
        type: "info",
        title: "Transfer rejected",
        message: `${rejected.itemName} from ${branchName(branches, rejected.fromBranchId)} was rejected.`,
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
    const outgoingPending = outgoingHistory.filter((transfer) => transfer.status === "pending").length;
    const incomingPendingCount = pendingIncoming.length;
    const acceptedCount = transfers.filter((transfer) => transfer.status === "accepted").length;
    const rejectedCount = transfers.filter((transfer) => transfer.status === "rejected").length;

    return { outgoingPending, incomingPendingCount, acceptedCount, rejectedCount };
  }, [incomingHistory.length, outgoingHistory, pendingIncoming.length, transfers]);

  return (
    <div className="min-h-full bg-slate-50">
      <Toast toast={toast} />

      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-4 p-4 lg:p-6">
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

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setActiveTab("outgoing")}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "outgoing"
                  ? "bg-[#1A318C] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ArrowRight className="h-4 w-4" />
              Outgoing Share
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("incoming")}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "incoming"
                  ? "bg-[#1A318C] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Incoming Share
            </button>
          </div>

          <div className="p-4 lg:p-6">
            {activeTab === "outgoing" ? (
              <OutgoingShareTab
                currentBranch={currentBranch}
                branches={branches}
                inventoryItems={inventoryItems}
                outgoingHistory={outgoingHistory}
                outgoingSearch={outgoingSearch}
                setOutgoingSearch={setOutgoingSearch}
                outgoingCategory={outgoingCategory}
                setOutgoingCategory={setOutgoingCategory}
                selectedOutgoingItemId={selectedOutgoingItemId}
                setSelectedOutgoingItemId={setSelectedOutgoingItemId}
                transferQty={transferQty}
                setTransferQty={setTransferQty}
                destinationBranchId={destinationBranchId}
                setDestinationBranchId={setDestinationBranchId}
                transferNote={transferNote}
                setTransferNote={setTransferNote}
                onSendTransfer={handleSendTransfer}
                sending={sending}
                filteredOutgoingItems={filteredOutgoingItems}
                loading={loading}
              />
            ) : (
              <IncomingShareTab
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
  );
}

export default InventoryShare;