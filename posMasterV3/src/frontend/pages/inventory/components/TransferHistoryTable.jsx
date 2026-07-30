import React from "react";
import { ArrowLeftRight } from "lucide-react";
import Badge from "./Badge.jsx";
import StatusBadge from "./StatusBadge.jsx";
import {
  branchName,
  formatDateOnly,
  getTransferBatchItemNames,
  getTransferBatchQuantityLabel,
  getTransferDestinationBranchLabel,
  getTransferHistoryAcceptedQty,
  getTransferHistorySourceBranchId,
  getTransferSourceBranchLabel,
  normalizeTransferStatus,
} from "../utils/transferHelpers";

export default function TransferHistoryTable({
  title,
  rows,
  counterpartyLabel,
  branches,
  currentBranchId,
  statusOverride,
  className = "",
  bodyClassName = "",
}) {
  const isIncomingHistory = counterpartyLabel === "Source Branch";
  const isOutgoingHistory = counterpartyLabel === "Destination Branch";
  const containerClassName = className || "rounded-3xl border border-slate-100 bg-white shadow-sm";

  return (
    <div className={containerClassName}>
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

      <div className={`overflow-x-auto ${bodyClassName}`.trim()}>
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
                const acceptedQty = getTransferHistoryAcceptedQty(row);
                const itemName = getTransferBatchItemNames(row, index);
                const counterpartyBranchLabel = isIncomingHistory
                  ? row.sourceBranchLabel ||
                    branchName(branches, getTransferHistorySourceBranchId(row)) ||
                    getTransferSourceBranchLabel(row, branches)
                  : row.destinationBranchLabel || getTransferDestinationBranchLabel(row, branches, currentBranchId);
                const quantityLabel = String(
                  isIncomingHistory ? acceptedQty || requestedQty || 0 : requestedQty || 0
                );
                const rowKey = `${row.id || row.sku || "transfer"}-${index}`;
                const normalizedStatus = normalizeTransferStatus(row.status);
                const managerApprovedLike =
                  normalizedStatus.includes("manager_approved") ||
                  normalizedStatus.includes("approved_by_manager") ||
                  normalizedStatus.includes("approved");
                const pendingOverride = (isIncomingHistory || isOutgoingHistory) && managerApprovedLike ? "pending" : normalizedStatus;
                const displayStatus =
                  typeof statusOverride === "function"
                    ? statusOverride(row)
                    : pendingOverride;

                return (
                  <tr key={rowKey} className="bg-white transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-sm font-medium text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{itemName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {counterpartyBranchLabel}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800 tabular-nums">{quantityLabel}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDateOnly(row.updatedAt || row.updated_at || row.createdAt || row.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={displayStatus} />
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
