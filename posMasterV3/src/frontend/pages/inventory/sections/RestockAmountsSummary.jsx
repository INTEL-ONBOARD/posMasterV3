import React from "react";

// Bottom bar of the mid column: restock/return amount cards, the discount
// input, cash/change inputs, and the net total box.
export default function RestockAmountsSummary({
  stockTotal,
  returnTotal,
  finalDiscount,
  setFinalDiscount,
  cashAmount,
  setCashAmount,
  changeAmount,
  totalAmount,
}) {
  return (
    <div className="bg-white border-t border-gray-100 p-5">
      <div className="flex gap-6">
        {/* LEFT: Amount summary cards */}
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Restock Amount */}
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium">Restock Amount</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">Rs. {stockTotal.toFixed(2)}</p>
            </div>
            {/* Return Amount */}
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Return Amount</p>
              <p className="text-2xl font-bold text-red-700 tabular-nums mt-1">Rs. {returnTotal.toFixed(2)}</p>
            </div>
            {/* Discount */}
            <div className="bg-amber-50 rounded-xl p-4">
              <label className="block text-xs text-amber-600 uppercase tracking-wide font-medium">Discount (Rs.)</label>
              <input
                type="number"
                value={finalDiscount}
                onChange={(e) => setFinalDiscount(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-lg font-bold text-amber-700 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Cash and Change inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Cash Amount (Rs.)
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                placeholder="0.00"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Change Amount</p>
              <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-800 tabular-nums text-right">{changeAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Total Amount */}
        <div className="w-56 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-5 flex flex-col justify-center items-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Net Amount</p>
          <p className="text-4xl font-bold text-white tabular-nums mt-2">Rs. {totalAmount.toFixed(2)}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 bg-slate-600 rounded-full">Stock: {stockTotal.toFixed(0)}</span>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">-{returnTotal.toFixed(0)}</span>
          </div>
          {parseFloat(finalDiscount) > 0 && (
            <span className="mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs">-{parseFloat(finalDiscount).toFixed(0)} disc.</span>
          )}
        </div>
      </div>
    </div>
  );
}
