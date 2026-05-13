import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Package2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { inventoryTransferApi } from "../../api/localApi";

function formatDate(value) {
  if (!value) return "Unknown date";
  try {
    return new Intl.DateTimeFormat("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Unknown date";
  }
}

function resolveBranchLabel(branches, branchValue) {
  if (!branchValue) return "Unknown branch";

  if (typeof branchValue === "object") {
    return (
      branchValue.branch_name ||
      branchValue.name ||
      branchValue.branchName ||
      branchValue.code ||
      branchValue.id ||
      "Unknown branch"
    );
  }

  const targetId = String(branchValue).trim();
  const branch = branches.find((row) =>
    String(row?.id ?? row?._id ?? row?.branch_id ?? row?.branchId ?? "").trim() === targetId
  );

  return branch?.branch_name || branch?.name || branch?.branchName || branch?.code || targetId || "Unknown branch";
}

function getBatchDetails(batch) {
  const requestDetails = batch?.requestDetails && typeof batch.requestDetails === "object" ? batch.requestDetails : {};
  const items = Array.isArray(batch?.items)
    ? batch.items
    : batch
      ? [
          {
            id: batch.itemId ?? batch.item_id ?? batch.sku,
            sku: batch.sku,
            item_name: batch.itemName ?? batch.item_name,
            transferQty: batch.requestedQty ?? batch.quantity ?? 1,
            quantity: batch.requestedQty ?? batch.quantity ?? 1,
            category: batch.category,
            uom: batch.uom,
            retail_price: batch.retail_price,
          },
        ]
      : [];

  return {
    requestDetails,
    items,
  };
}

function BatchCard({ batch, isSelected, onClick, branches }) {
  const { requestDetails, items } = getBatchDetails(batch);
  const destinationLabel = resolveBranchLabel(branches, requestDetails.destinationBranch ?? batch.targetBranchId ?? batch.toBranchId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        isSelected
          ? "border-[#1A318C] bg-[#1A318C] text-white shadow-md"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${isSelected ? "text-white/75" : "text-slate-400"}`}>
            Pending batch
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CalendarDays className={`h-4 w-4 shrink-0 ${isSelected ? "text-white/80" : "text-slate-400"}`} />
            <span className="text-sm font-semibold">{formatDate(batch.createdAt || batch.created_at || batch.updatedAt)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? "text-white/80" : "text-slate-400"}`} />
            <span className="truncate text-sm">{destinationLabel}</span>
          </div>
        </div>

        <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>
          {items.length} item(s)
        </div>
      </div>
    </button>
  );
}

function BatchItemsTable({ items }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                No items in this batch.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={item.id ?? `${item.sku}-${index}`} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-[#1A318C]" />
                    <span className="font-semibold text-slate-800">{item.item_name || item.itemName || "Unnamed item"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.sku || "N/A"}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.transferQty ?? item.quantity ?? item.requestedQty ?? 1}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {item.category?.type || item.categoryType || item.category_name || "N/A"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ManagerApprovalTab({ branches = [] }) {
  const [pendingBatches, setPendingBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");

  const loadPendingBatches = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await inventoryTransferApi.getAll();
      const rows = Array.isArray(response?.data) ? response.data : [];
      console.log("4. ManagerTab received raw rows:", response.data);
      const pending = rows.filter((row) => {
        const status = String(row?.status ?? row?.requestDetails?.status ?? row?.request_details?.status ?? "").toLowerCase();
        return status === "pending";
      });
      const sorted = [...pending].sort(
        (a, b) =>
          new Date(
            b.createdAt ||
              b.created_at ||
              b.updatedAt ||
              b.updated_at ||
              b.requestDetails?.createdAt ||
              b.requestDetails?.created_at ||
              0
          ) -
          new Date(
            a.createdAt ||
              a.created_at ||
              a.updatedAt ||
              a.updated_at ||
              a.requestDetails?.createdAt ||
              a.requestDetails?.created_at ||
              0
          )
      );

      setPendingBatches(sorted);
      console.log("5. ManagerTab filtered pending rows:", sorted);
      setSelectedBatchId((prev) => prev || sorted[0]?.id || "");
    } catch (err) {
      setError(err?.message || "Unable to load pending transfer batches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingBatches();
  }, []);

  const selectedBatch = useMemo(
    () => pendingBatches.find((row) => String(row.id) === String(selectedBatchId)) || pendingBatches[0] || null,
    [pendingBatches, selectedBatchId]
  );

  const selectedBatchDetails = useMemo(() => getBatchDetails(selectedBatch), [selectedBatch]);

  const handleAction = async (action) => {
    if (!selectedBatch) return;

    setSavingAction(action);
    setError("");

    try {
      if (action === "approve") {
        await inventoryTransferApi.approveBatch(selectedBatch.id);
      } else {
        await inventoryTransferApi.rejectBatch(selectedBatch.id);
      }

      await loadPendingBatches();
    } catch (err) {
      setError(err?.message || `Unable to ${action} this batch.`);
    } finally {
      setSavingAction("");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 p-6">
      <div className="mb-6 rounded-3xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1A318C]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manager Approvals</h1>
            <p className="mt-1 text-sm text-slate-500">Review, approve, or reject branch stock transfer requests</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pending Batches</h2>
              <p className="text-sm text-slate-500">{pendingBatches.length} request batch(es)</p>
            </div>
            <button
              type="button"
              onClick={loadPendingBatches}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Refresh pending batches"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : pendingBatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <Clock3 className="mx-auto h-10 w-10 text-[#1A318C]" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No pending batches</p>
                <p className="mt-1 text-xs text-slate-500">New transfer requests will appear here.</p>
              </div>
            ) : (
              pendingBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  branches={branches}
                  isSelected={String(batch.id) === String(selectedBatchId)}
                  onClick={() => setSelectedBatchId(batch.id)}
                />
              ))
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          {selectedBatch ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Batch</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-800">Transfer Request Review</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review the destination, note, and individual item list before approving or rejecting.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Items</p>
                    <p className="text-xl font-bold text-slate-800">{selectedBatchDetails.items.length}</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Destination Branch</p>
                    <p className="mt-2 text-lg font-bold text-slate-800">
                      {resolveBranchLabel(
                        branches,
                        selectedBatchDetails.requestDetails.destinationBranch ?? selectedBatch.targetBranchId ?? selectedBatch.toBranchId
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created At</p>
                    <p className="mt-2 text-lg font-bold text-slate-800">
                      {formatDate(selectedBatch.createdAt || selectedBatch.created_at || selectedBatch.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1A318C]" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manager Note</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedBatchDetails.requestDetails.note || selectedBatch.note || "No note provided."}
                  </p>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Batch Items</h3>
                    <span className="rounded-full bg-[#1A318C]/5 px-3 py-1 text-xs font-semibold text-[#1A318C]">
                      {selectedBatchDetails.items.length} item(s)
                    </span>
                  </div>
                  <BatchItemsTable items={selectedBatchDetails.items} />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={savingAction === "reject"}
                    onClick={() => handleAction("reject")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingAction === "reject" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject Transfer
                  </button>
                  <button
                    type="button"
                    disabled={savingAction === "approve"}
                    onClick={() => handleAction("approve")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingAction === "approve" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve Transfer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-10 text-center">
              <div className="max-w-md">
                <Package2 className="mx-auto h-12 w-12 text-[#1A318C]" />
                <h3 className="mt-4 text-xl font-bold text-slate-800">Select a batch to review</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Pending transfer batches will appear on the left. Choose one to inspect the destination, note, and item list.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
