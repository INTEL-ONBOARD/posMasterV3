import React from "react";
import { ChevronDown, User } from "lucide-react";

/**
 * Head of the cart rail: who the sale is for, plus the invoice/date/cashier
 * context that has to stay visible for the whole transaction.
 *
 * Replaces the old full-width SalesHeaderBar — in the catalogue-first layout
 * this metadata belongs beside the cart it describes, not stretched across
 * the top of the item grid.
 */
export default function CartRailHeader({
  selectedMember,
  onOpenMemberModal,
  formattedDate,
  preparedBy,
  invoiceNo,
  onClearAll,
  hasItems
}) {
  const isGuest = selectedMember?.is_guest;

  return (
    <div className="shrink-0 border-b border-slate-200 p-3">
      <button
        type="button"
        onClick={onOpenMemberModal}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:shadow-sm ${
          isGuest
            ? "bg-slate-100 hover:bg-slate-200/70"
            : "bg-emerald-50 hover:bg-emerald-100/70"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isGuest ? "bg-slate-600" : "bg-emerald-600"
          }`}
        >
          <User className="h-4 w-4 text-white" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-slate-800">
            {selectedMember?.full_name || "Guest Customer"}
          </span>
          <span className="block truncate text-[11px] font-medium text-slate-500">
            {selectedMember?.member_no || "Tap to attach a member"}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      <div className="mt-3 flex items-start gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Invoice</p>
          <p className="truncate text-[12px] font-bold tabular-nums text-slate-700">{invoiceNo || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Date</p>
          <p className="truncate text-[12px] font-bold tabular-nums text-slate-700">{formattedDate}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Cashier</p>
          <p className="truncate text-[12px] font-bold text-slate-700">{preparedBy || "—"}</p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasItems}
          className="ml-auto shrink-0 self-center rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
