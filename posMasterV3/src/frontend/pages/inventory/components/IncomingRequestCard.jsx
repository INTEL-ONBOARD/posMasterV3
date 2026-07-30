import React from "react";
import { CheckCircle2, Package2, XCircle } from "lucide-react";
import Badge from "./Badge.jsx";
import StatusBadge from "./StatusBadge.jsx";
import {
  formatDateTime,
  getTransferBatchQuantityLabel,
  getTransferItems,
  getTransferLineItemKey,
  getTransferLineItemRequestedQty,
} from "../utils/transferHelpers";

export default function IncomingRequestCard({
  request,
  branchLabel,
  itemAcceptedQtyMap,
  onItemQtyChange,
  onAccept,
  onReject,
}) {
  const items = getTransferItems(request);
  const totalRequestedQty = Number((request?.requestedQty ?? request?.quantity ?? getTransferBatchQuantityLabel(request) ?? 0) || 0) || 0;
  const fallbackItems = items.length
    ? items
    : [
        {
          item_name: request?.itemName || request?.item_name || "Unnamed item",
          sku: request?.sku || "N/A",
          requestedQty: totalRequestedQty,
        },
      ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4 text-[#1A318C]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {request.sku || fallbackItems[0]?.sku || "Transfer batch"}
            </p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-800">
            {fallbackItems.length > 1 ? `${fallbackItems.length} items in batch` : request.itemName || fallbackItems[0]?.item_name || "Transfer batch"}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="blue">From: {branchLabel}</Badge>
            <Badge tone="slate">Requested: {totalRequestedQty}</Badge>
            <StatusBadge status={request.status} />
          </div>
          {request.note ? <p className="mt-3 text-sm text-slate-500">{request.note}</p> : null}
          <p className="mt-3 text-xs text-slate-400">Requested on {formatDateTime(request.createdAt)}</p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batch Items</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Requested Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Accept Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {fallbackItems.map((item, index) => {
                    const itemName = item?.item_name || item?.itemName || item?.name || "Unnamed item";
                    const itemSku = item?.sku || item?.item_sku || item?.itemSku || request?.sku || "N/A";
                    const itemKey = getTransferLineItemKey(item, index);
                    const itemQty = getTransferLineItemRequestedQty(item);
                    const acceptedQty = itemAcceptedQtyMap?.[itemKey] ?? itemQty;

                    return (
                      <tr key={`${itemSku}-${index}`}>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{itemName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{itemSku}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{itemQty || totalRequestedQty || 0}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={itemQty || 0}
                            value={acceptedQty}
                            onChange={(e) => onItemQtyChange(request.id, itemKey, e.target.value)}
                            className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#1A318C]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onReject(request.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => onAccept(request.id)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
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
