import React from "react";
import { Package, Trash2, Pause, Play, Receipt } from "lucide-react";

/**
 * Sticky footer of the right sidebar: items/total summary plus the
 * clear/hold/release, preview-receipt, and proceed-to-checkout actions.
 */
export default function CartActionsFooter({
  itemCount,
  stockTotal,
  formatCurrency,
  onClearAll,
  hasItems,
  heldOrder,
  releasedHeldOrder,
  onHold,
  onRelease,
  onPreviewReceipt,
  canPreviewReceipt,
  proceedBtnRef,
  onProceed
}) {
  return (
    <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-lg mt-3 overflow-hidden">
      {/* Items & Total Summary */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 font-medium">Items:</span>
            <span className="text-lg font-bold text-slate-800">{itemCount}</span>
          </div>
        </div>
        <div className="mt-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Amount</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{formatCurrency(stockTotal)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 flex flex-col gap-2">
        {/* Clear & Hold Row */}
        <div className="flex gap-2">
          <button
            onClick={onClearAll}
            disabled={!hasItems}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-red-200 text-red-500 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          {heldOrder ? (
            <button
              onClick={onRelease}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 border-2 border-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 hover:border-amber-600 transition-all text-sm"
            >
              <Play className="w-4 h-4" />
              Release
            </button>
          ) : (
            <button
              onClick={onHold}
              disabled={!hasItems || Boolean(releasedHeldOrder)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-amber-200 text-amber-600 rounded-xl font-semibold hover:bg-amber-50 hover:border-amber-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="w-4 h-4" />
              {releasedHeldOrder ? "Held" : "Hold"}
            </button>
          )}
        </div>

        <button
          onClick={onPreviewReceipt}
          disabled={!canPreviewReceipt}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-teal-200 text-teal-700 rounded-xl font-semibold hover:bg-teal-50 hover:border-teal-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Receipt className="w-4 h-4" />
          Preview Receipt
        </button>

        {/* Proceed Button */}
        <button
          ref={proceedBtnRef}
          onClick={onProceed}
          disabled={!hasItems}
          className="w-full flex items-center justify-center px-4 py-3.5 bg-gradient-to-r from-[#1A318C] to-[#2541B2] text-white rounded-xl font-bold hover:from-[#162970] hover:to-[#1E3699] transition-all text-base disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed shadow-lg shadow-[#1A318C]/30 disabled:shadow-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onProceed();
          }}
        >
          Proceed
        </button>
      </div>
    </div>
  );
}
