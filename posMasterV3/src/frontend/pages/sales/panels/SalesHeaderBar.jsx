import React from "react";
import { ChevronDown, User, RefreshCw, ScanLine } from "lucide-react";

/**
 * Top header bar of the sales terminal: customer/date/prepared-by/invoice
 * summary cards, the barcode-scan indicator, and the refresh/clear actions.
 */
export default function SalesHeaderBar({
  selectedMember,
  onOpenMemberModal,
  formattedDate,
  preparedBy,
  invoiceNo,
  lastScannedCode,
  onRefresh,
  onClearAll
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm mb-4 p-4 shrink-0 border border-slate-100">
      <div className="flex items-center gap-5">
        {/* Customer Info Card */}
        <div
          onClick={onOpenMemberModal}
          className={`flex items-center gap-4 px-5 py-3.5 rounded-xl cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] shrink-0 ${
            selectedMember?.is_guest
              ? "bg-gradient-to-r from-slate-700 to-slate-600"
              : "bg-gradient-to-r from-emerald-600 to-emerald-500"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Customer</p>
            <p className="text-white font-bold text-base truncate max-w-[140px]">{selectedMember?.full_name || "Guest"}</p>
            <p className="text-white/60 text-[11px] font-medium">{selectedMember?.member_no || "Walk-in"}</p>
          </div>
          <ChevronDown className="w-5 h-5 text-white/60" />
        </div>

        {/* Date Card */}
        <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 shrink-0">
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Date</p>
          <p className="text-slate-800 font-bold text-lg">{formattedDate}</p>
        </div>

        {/* Prepared By Card */}
        <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 shrink-0">
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Prepared By</p>
          <p className="text-slate-800 font-bold text-lg">
            {preparedBy ? `${preparedBy} (You)` : "—"}
          </p>
        </div>

        {/* Invoice Card */}
        <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 shrink-0">
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Invoice No</p>
          <p className="text-slate-800 font-bold text-lg tracking-wider">{invoiceNo}</p>
        </div>

        {/* Barcode Scanner Indicator */}
        {lastScannedCode && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl px-4 py-2 flex items-center gap-2 animate-pulse shrink-0">
            <ScanLine className="w-5 h-5 text-white" />
            <div>
              <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Scanned</p>
              <p className="text-white font-bold text-sm">{lastScannedCode}</p>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-0"></div>

        {/* Refresh & Clear Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            title="Refresh Items"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onClearAll}
            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
