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
import { dataStore, TABLES } from "../../store/DataStore";

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

function getBatchSourceBranchId(batch) {
  return String(
    batch?.sourceBranchId ??
      batch?.source_branch_id ??
      batch?.fromBranchId ??
      batch?.from_branch_id ??
      batch?.branchId ??
      batch?.branch_id ??
      batch?.requestDetails?.sourceBranchId ??
      batch?.requestDetails?.source_branch_id ??
      batch?.requestDetails?.fromBranchId ??
      batch?.requestDetails?.from_branch_id ??
      ""
  ).trim();
}

function getBatchTargetBranchId(batch) {
  const requestDetails = batch?.requestDetails && typeof batch.requestDetails === "object" ? batch.requestDetails : {};
  return String(
    batch?.targetBranchId ??
      batch?.target_branch_id ??
      batch?.toBranchId ??
      batch?.to_branch_id ??
      batch?.destinationBranchId ??
      batch?.destination_branch_id ??
      requestDetails?.destinationBranch?.id ??
      requestDetails?.destinationBranch?.branchId ??
      requestDetails?.destination_branch?.id ??
      requestDetails?.destination_branch?.branchId ??
      ""
  ).trim();
}

function getBatchRequestedQty(batch) {
  return Number(batch?.requestedQty ?? batch?.requested_qty ?? batch?.quantity ?? batch?.items?.[0]?.transferQty ?? batch?.items?.[0]?.quantity ?? 0) || 0;
}

function getBatchStatus(batch) {
  return String(batch?.status ?? batch?.requestDetails?.status ?? batch?.request_details?.status ?? "").trim().toLowerCase();
}

function getBatchDateValue(batch) {
  return (
    batch?.updatedAt ||
    batch?.updated_at ||
    batch?.createdAt ||
    batch?.created_at ||
    batch?.requestDetails?.updatedAt ||
    batch?.requestDetails?.updated_at ||
    batch?.requestDetails?.createdAt ||
    batch?.requestDetails?.created_at ||
    0
  );
}

function getBatchSortTime(batch) {
  const value = new Date(getBatchDateValue(batch)).getTime();
  return Number.isFinite(value) ? value : 0;
}

function sortByNewestDate(rows = []) {
  return [...rows].sort((a, b) => getBatchSortTime(b) - getBatchSortTime(a));
}

function normalizeTransferBatch(batch) {
  if (!batch) return batch;

  const status = getBatchStatus(batch) || "pending";
  return {
    ...batch,
    status,
  };
}

function segregateTransferBatches(rows = []) {
  const normalizedRows = rows.map(normalizeTransferBatch);
  const pending = sortByNewestDate(normalizedRows.filter((row) => getBatchStatus(row) === "pending"));
  const history = sortByNewestDate(
    normalizedRows.filter((row) => {
      const status = getBatchStatus(row);
      return status === "approved_by_manager" || status === "rejected_by_manager";
    })
  );

  return {
    pending,
    history,
  };
}

function getStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "approved_by_manager") {
    return {
      label: "Approved",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (normalized === "rejected_by_manager") {
    return {
      label: "Rejected",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function BatchCard({ batch, isSelected, onClick, branches, viewMode }) {
  const { requestDetails, items } = getBatchDetails(batch);
  const destinationLabel = resolveBranchLabel(branches, requestDetails.destinationBranch ?? batch.targetBranchId ?? batch.toBranchId);
  const status = getBatchStatus(batch);
  const isHistory = viewMode === "history";
  const statusMeta = getStatusMeta(status);

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
            {isHistory ? "Transfer history" : "Pending batch"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CalendarDays className={`h-4 w-4 shrink-0 ${isSelected ? "text-white/80" : "text-slate-400"}`} />
            <span className="text-sm font-semibold">{formatDate(getBatchDateValue(batch))}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? "text-white/80" : "text-slate-400"}`} />
            <span className="truncate text-sm">{destinationLabel}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>
            {items.length} item(s)
          </div>
          {isHistory ? (
            <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
              {statusMeta.label}
            </div>
          ) : null}
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
              <tr key={`${item.id || item.sku || "batch-item"}-${index}`} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-[#1A318C]" />
                    <span className="font-semibold text-slate-800">{item.item_name || item.itemName || "Unnamed item"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.sku || "N/A"}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.transferQty ?? item.quantity ?? item.requestedQty ?? 1}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.category?.type || item.categoryType || item.category_name || "N/A"}</td>
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
  const [historyBatches, setHistoryBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [activeView, setActiveView] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");

  const loadTransferBatches = async () => {
    setLoading(true);
    setError("");

    try {
      const rows = await dataStore.refetch(TABLES.INVENTORY_TRANSFERS);
      const { pending, history } = segregateTransferBatches(Array.isArray(rows) ? rows : []);

      setPendingBatches(pending);
      setHistoryBatches(history);

      setSelectedBatchId((currentId) => {
        const combined = [...pending, ...history];
        const stillExists = combined.some((row) => String(row?.id) === String(currentId));
        if (stillExists) return currentId;
        return pending[0]?.id || history[0]?.id || "";
      });
    } catch (err) {
      setError(err?.message || "Unable to load transfer batches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransferBatches();
  }, []);

  const allBatches = useMemo(() => [...pendingBatches, ...historyBatches], [pendingBatches, historyBatches]);
  const selectedBatch = useMemo(
    () => allBatches.find((row) => String(row?.id) === String(selectedBatchId)) || null,
    [allBatches, selectedBatchId]
  );

  const selectedBatchDetails = useMemo(() => getBatchDetails(selectedBatch), [selectedBatch]);
  const selectedBatchStatus = getBatchStatus(selectedBatch);
  const isHistorySelection = selectedBatchStatus === "approved_by_manager" || selectedBatchStatus === "rejected_by_manager";
  const visibleBatches = activeView === "history" ? historyBatches : pendingBatches;
  const viewTitle = activeView === "history" ? "Transfer Request History" : "Pending Batches";
  const viewSubtitle =
    activeView === "history"
      ? `${historyBatches.length} processed request(s)`
      : `${pendingBatches.length} request batch(es)`;
  const emptyTitle = activeView === "history" ? "No processed batches" : "No pending batches";
  const emptySubtitle =
    activeView === "history"
      ? "Manager-approved and manager-rejected requests will appear here."
      : "New transfer requests will appear here.";
  const selectedStatusMeta = getStatusMeta(selectedBatchStatus);

  const handleAction = async (action) => {
    if (!selectedBatch || isHistorySelection) return;

    setSavingAction(action);
    setError("");

    try {
      const targetBranchId = getBatchTargetBranchId(selectedBatch);
      const sourceBranchId = getBatchSourceBranchId(selectedBatch);
      const acceptedQty = Math.max(1, getBatchRequestedQty(selectedBatch));

      let response;

      if (action === "approve") {
        response = await inventoryTransferApi.accept(selectedBatch.id, acceptedQty, {
          sourceBranchId,
          source_branch_id: sourceBranchId,
          targetBranchId,
          target_branch_id: targetBranchId,
        });
      } else {
        response = await inventoryTransferApi.reject(selectedBatch.id, {
          targetBranchId,
          target_branch_id: targetBranchId,
        });
      }

      console.log("[ManagerApprovalTab] transfer mutation response:", response);

      const responseStatus = String(response?.status ?? response?.data?.status ?? "").trim().toLowerCase();
      const successFlag = response?.success ?? response?.data?.success;
      const failureFlag = response?.success === false || response?.data?.success === false || responseStatus === "error" || responseStatus === "failed";

      if (failureFlag || (responseStatus && responseStatus !== "success" && responseStatus !== "ok")) {
        console.error("[ManagerApprovalTab] transfer mutation rejected by backend:", response);
        throw new Error(response?.message || response?.data?.message || `Backend did not confirm ${action} for this batch.`);
      }

      if (successFlag === false) {
        console.error("[ManagerApprovalTab] transfer mutation returned explicit failure flag:", response);
        throw new Error(response?.message || response?.data?.message || `Backend reported ${action} failure for this batch.`);
      }

      const freshRows = await dataStore.refetch(TABLES.INVENTORY_TRANSFERS);
      console.log("[ManagerApprovalTab] refetched inventory transfers:", freshRows);

      const { pending, history } = segregateTransferBatches(Array.isArray(freshRows) ? freshRows : []);
      setPendingBatches(pending);
      setHistoryBatches(history);

      const refreshedSelected =
        history.find((row) => String(row?.id) === String(selectedBatch.id)) ||
        pending.find((row) => String(row?.id) === String(selectedBatch.id)) ||
        null;

      setActiveView(
        refreshedSelected && getBatchStatus(refreshedSelected) !== "pending"
          ? "history"
          : pending.length > 0
            ? "pending"
            : "history"
      );
      setSelectedBatchId(refreshedSelected?.id || pending[0]?.id || history[0]?.id || "");
    } catch (err) {
      console.error(`[ManagerApprovalTab] Unable to ${action} transfer batch`, {
        batchId: selectedBatch?.id,
        action,
        error: err,
      });
      setError(err?.message || `Unable to ${action} this batch.`);
    } finally {
      setSavingAction("");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-slate-50 px-6 pb-6 pt-0">
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="rounded-3xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A318C]/10 text-[#1A318C]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Manager Approvals</p>
                  <h2 className="text-base font-bold text-slate-900">Manager Approvals</h2>
                  <p className="text-xs text-slate-500">Manage transfer requests</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800">{viewTitle}</h2>
                <p className="text-sm text-slate-500">{viewSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={loadTransferBatches}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Refresh transfer batches"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveView("pending")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeView === "pending" ? "bg-white text-[#1A318C] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Pending
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {pendingBatches.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("history")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeView === "history" ? "bg-white text-[#1A318C] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                History
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {historyBatches.length}
                </span>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : visibleBatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <Clock3 className="mx-auto h-10 w-10 text-[#1A318C]" />
                <p className="mt-3 text-sm font-semibold text-slate-700">{emptyTitle}</p>
                <p className="mt-1 text-xs text-slate-500">{emptySubtitle}</p>
              </div>
            ) : (
              visibleBatches.map((batch, index) => (
                <BatchCard
                  key={`${batch.id || batch.sku || "batch"}-${index}`}
                  batch={batch}
                  branches={branches}
                  viewMode={activeView}
                  isSelected={String(batch.id) === String(selectedBatchId)}
                  onClick={() => setSelectedBatchId(batch.id)}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedBatch ? (
            <div className="flex flex-col">
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

              <div className="space-y-5 p-5">
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
                    <p className="mt-2 text-lg font-bold text-slate-800">{formatDate(getBatchDateValue(selectedBatch))}</p>
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

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800">Batch Items</h3>
                      <span className="rounded-full bg-[#1A318C]/5 px-3 py-1 text-xs font-semibold text-[#1A318C]">
                        {selectedBatchDetails.items.length} item(s)
                      </span>
                    </div>
                    <BatchItemsTable items={selectedBatchDetails.items} />
                  </div>

                  <div className="border-t border-slate-100 px-5 py-4">
                    {isHistorySelection ? (
                      <div className="flex justify-end">
                        <span className={`inline-flex items-center rounded-2xl border px-4 py-3 text-sm font-semibold ${selectedStatusMeta.className}`}>
                          {selectedStatusMeta.label}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          disabled={savingAction === "reject"}
                          onClick={() => handleAction("reject")}
                          className="inline-flex w-auto items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {savingAction === "reject" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Reject Transfer
                        </button>
                        <button
                          type="button"
                          disabled={savingAction === "approve"}
                          onClick={() => handleAction("approve")}
                          className="inline-flex w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {savingAction === "approve" ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Approve Transfer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-10 text-center">
              <div className="max-w-md">
                <Package2 className="mx-auto h-12 w-12 text-[#1A318C]" />
                <h3 className="mt-4 text-xl font-bold text-slate-800">Select a batch to review</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {activeView === "history"
                    ? "Processed transfer requests will appear on the left. Choose one to inspect the final status, note, and item list."
                    : "Pending transfer batches will appear on the left. Choose one to inspect the destination, note, and item list."}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
