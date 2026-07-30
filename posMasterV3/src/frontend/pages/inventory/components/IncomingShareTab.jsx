import React, { useMemo } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import SectionShell from "./SectionShell.jsx";
import IncomingRequestCard from "./IncomingRequestCard.jsx";
import { branchName, getTransferSourceBranchId } from "../utils/transferHelpers";

export default function IncomingShareTab({
  branches,
  pendingRequests,
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
                itemAcceptedQtyMap={acceptQuantities[String(request.id)] || {}}
                onItemQtyChange={(batchId, itemId, value) =>
                  setAcceptQuantities((prev) => ({
                    ...prev,
                    [String(batchId)]: {
                      ...(prev[String(batchId)] || {}),
                      [String(itemId)]: value === "" ? 0 : Math.max(0, Number(value) || 0),
                    },
                  }))
                }
                onAccept={onAcceptTransfer}
                onReject={onRejectTransfer}
              />
            ))}
          </div>
        )}
      </SectionShell>

    </div>
  );
}
