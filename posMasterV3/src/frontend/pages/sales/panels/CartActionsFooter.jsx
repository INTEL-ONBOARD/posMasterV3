import React from "react";
import { Trash2, Pause, Play, Receipt } from "lucide-react";

/**
 * Foot of the cart rail: the running total and the terminal actions.
 *
 * `discountTotal` is the sum of the per-line discounts already applied in
 * the cart — it is not the final checkout discount, which is entered later
 * in the checkout modal.
 */
export default function CartActionsFooter({
  itemCount,
  stockTotal,
  discountTotal = 0,
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
    <div className="shrink-0 border-t border-slate-200 bg-slate-50/70 px-3 pb-3 pt-2.5">
      <div className="flex items-center justify-between text-[12px] text-slate-500">
        <span>Items</span>
        <span className="font-semibold tabular-nums text-slate-700">{itemCount}</span>
      </div>

      {discountTotal > 0 && (
        <div className="mt-1 flex items-center justify-between text-[12px] text-emerald-600">
          <span>Line discounts</span>
          <span className="font-semibold tabular-nums">-{formatCurrency(discountTotal)}</span>
        </div>
      )}

      <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-2.5">
        <span className="text-[12px] font-semibold text-slate-600">Total</span>
        <span className="text-[23px] font-extrabold tabular-nums tracking-tight text-slate-900">
          {formatCurrency(stockTotal)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasItems}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12.5px] font-semibold text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>

        {heldOrder ? (
          <button
            type="button"
            onClick={onRelease}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-500 bg-amber-500 text-[12.5px] font-semibold text-white transition-colors hover:border-amber-600 hover:bg-amber-600"
          >
            <Play className="h-3.5 w-3.5" />
            Release
          </button>
        ) : (
          <button
            type="button"
            onClick={onHold}
            disabled={!hasItems || Boolean(releasedHeldOrder)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12.5px] font-semibold text-amber-700 transition-colors hover:border-amber-200 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white"
          >
            <Pause className="h-3.5 w-3.5" />
            {releasedHeldOrder ? "Held" : "Hold"}
          </button>
        )}

        <button
          type="button"
          onClick={onPreviewReceipt}
          disabled={!canPreviewReceipt}
          className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
        >
          <Receipt className="h-3.5 w-3.5" />
          Preview receipt
        </button>

        <button
          ref={proceedBtnRef}
          type="button"
          onClick={onProceed}
          disabled={!hasItems}
          onKeyDown={(e) => { if (e.key === "Enter") onProceed(); }}
          className="col-span-2 flex h-12 items-center justify-center rounded-xl bg-[#1A318C] text-[14.5px] font-bold text-white shadow-lg shadow-[#1A318C]/25 transition-all hover:bg-[#22409f] active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none motion-reduce:active:scale-100"
        >
          {hasItems ? `Proceed · ${formatCurrency(stockTotal)}` : "Proceed"}
        </button>
      </div>
    </div>
  );
}
