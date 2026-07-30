import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  Send,
  XCircle,
} from "lucide-react";
import { useBranchContext } from "../../context/BranchContext.jsx";
import { useTransferBranchData } from "../../hooks/inventoryShare/useTransferBranchData";
import { useOutgoingTransfer } from "../../hooks/inventoryShare/useOutgoingTransfer";
import { useIncomingTransfer } from "../../hooks/inventoryShare/useIncomingTransfer";
import { useTransferToast } from "../../hooks/inventoryShare/useTransferToast";
import { CURRENT_BRANCH_ID } from "./utils/transferHelpers";
import Toast from "./components/Toast.jsx";
import StatCard from "./components/StatCard.jsx";
import TransferHistoryTable from "./components/TransferHistoryTable.jsx";
import OutgoingShareTab from "./components/OutgoingShareTab.jsx";
import IncomingShareTab from "./components/IncomingShareTab.jsx";

// InventoryShare composes the inter-branch stock transfer workspace out of:
//   - useTransferBranchData: reactive branch/stock/transfer data + derived
//     lookups (current branch, branch-scoped stock, normalized transfer
//     records, outgoing/incoming history, pending-incoming candidates)
//   - useOutgoingTransfer: outgoing search/category filter state + the
//     "send transfer" submission flow
//   - useIncomingTransfer: pending-incoming-batches state, per-item accept
//     quantities, and the accept/reject submission flows
//   - useTransferToast: the toast notification shown after send/accept/reject
// `activeTab` / `showHistory` stay here since they drive which top-level
// section renders and are read only by this component's own JSX.
function InventoryShare({ isActive = true, currentBranchId: currentBranchIdProp = CURRENT_BRANCH_ID }) {
  const { currentBranch: activeBranch, loading: branchLoading } = useBranchContext();
  const [activeTab, setActiveTab] = useState("outgoing");
  const [showHistory, setShowHistory] = useState(false);

  const {
    branches,
    currentBranch,
    currentBranchLabel,
    resolvedCurrentBranchId,
    destinationBranches,
    inventoryItems,
    transferRows,
    outgoingHistory,
    incomingHistory,
    pendingIncomingCandidates,
    loading,
    refetchTransfers,
    refetchStockItems,
  } = useTransferBranchData({ isActive, activeBranch, branchLoading, currentBranchIdProp });

  const { toast, setToast } = useTransferToast();

  const outgoing = useOutgoingTransfer({
    inventoryItems,
    branches,
    refetchTransfers,
    refetchStockItems,
    setToast,
  });

  const incoming = useIncomingTransfer({
    transferRows,
    branches,
    pendingIncomingCandidates,
    refetchTransfers,
    setToast,
  });

  const summary = useMemo(() => {
    const outgoingPending = outgoingHistory.filter((transfer) => String(transfer.status || "").toLowerCase() === "pending").length;
    const incomingPendingCount = incoming.pendingIncomingBatches.length;
    const acceptedCount = transferRows.filter((transfer) => String(transfer.status || "").toLowerCase() === "accepted").length;
    const rejectedCount = transferRows.filter((transfer) => String(transfer.status || "").toLowerCase() === "rejected").length;

    return { outgoingPending, incomingPendingCount, acceptedCount, rejectedCount };
  }, [incoming.pendingIncomingBatches.length, outgoingHistory, transferRows]);

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

  useEffect(() => {
    setShowHistory(false);
  }, [activeTab]);

  const historyTitle = activeTab === "outgoing" ? "Outgoing Share History" : "Incoming Share History";
  const historyCounterpartyLabel = activeTab === "outgoing" ? "Destination Branch" : "Source Branch";
  const historyRows = activeTab === "outgoing" ? outgoingHistory : incomingHistory;
  const historyCurrentBranchId = currentBranch?.id || currentBranch?.branch_id || resolvedCurrentBranchId || "";

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 pb-24">
      <Toast toast={toast} />

      <div className="mx-auto flex h-full min-h-0 max-w-[1800px] flex-col gap-4 px-4 pb-24 pt-0 lg:px-6 lg:pt-0">
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-72 xl:w-80 shrink-0">
            <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A318C]/10 text-[#1A318C]">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inventory Share</p>
                    <h2 className="text-base font-bold text-slate-900">Inventory Share</h2>
                    <p className="text-xs text-slate-500">Manage inventory transfers</p>
                  </div>
                </div>
              </div>

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

            <div className="mt-4 space-y-3">
              <StatCard label="Outgoing Pending" value={summary.outgoingPending} icon={Send} tone="blue" compact />
              <StatCard label="Incoming Pending" value={summary.incomingPendingCount} icon={ArrowLeftRight} tone="amber" compact />
              <StatCard label="Accepted" value={summary.acceptedCount} icon={CheckCircle2} tone="emerald" compact />
              <StatCard label="Rejected" value={summary.rejectedCount} icon={XCircle} tone="rose" compact />
            </div>

            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                showHistory
                  ? "border-[#1A318C] bg-[#1A318C] text-white shadow-md shadow-blue-900/20 hover:bg-[#152a79]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#1A318C]/30 hover:bg-slate-50"
              }`}
            >
              <Clock3 className="h-4 w-4" />
              {historyTitle}
            </button>
          </aside>

          <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className={`min-h-0 flex-1 ${showHistory ? "h-full" : "overflow-y-auto p-4 lg:p-6"}`}>
              {showHistory ? (
                <TransferHistoryTable
                  title={historyTitle}
                  rows={historyRows}
                  counterpartyLabel={historyCounterpartyLabel}
                  branches={branches}
                  currentBranchId={historyCurrentBranchId}
                  className="h-full flex flex-col overflow-hidden rounded-none border-0 shadow-none"
                  bodyClassName="flex-1 overflow-auto"
                />
              ) : activeTab === "outgoing" ? (
                <OutgoingShareTab
                  currentBranch={currentBranch || { id: resolvedCurrentBranchId, branch_name: currentBranchLabel }}
                  branches={destinationBranches}
                  inventoryItems={inventoryItems}
                  outgoingHistory={outgoingHistory}
                  outgoingSearch={outgoing.outgoingSearch}
                  setOutgoingSearch={outgoing.setOutgoingSearch}
                  outgoingCategory={outgoing.outgoingCategory}
                  setOutgoingCategory={outgoing.setOutgoingCategory}
                  onSendTransfer={outgoing.handleSendTransfer}
                  sending={outgoing.sending}
                  filteredOutgoingItems={outgoing.filteredOutgoingItems}
                  loading={loading}
                />
              ) : (
                <IncomingShareTab
                  branches={branches}
                  pendingRequests={incoming.pendingIncomingBatches}
                  incomingSearch={incoming.incomingSearch}
                  setIncomingSearch={incoming.setIncomingSearch}
                  acceptQuantities={incoming.acceptQuantities}
                  setAcceptQuantities={incoming.setAcceptQuantities}
                  onAcceptTransfer={incoming.handleAcceptTransfer}
                  onRejectTransfer={incoming.handleRejectTransfer}
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
