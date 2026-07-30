import React from "react";
import { ShoppingCart, X } from "lucide-react";

/**
 * Main cart line-items table (center panel): header row plus the current
 * cart contents, or an empty state when nothing has been added yet.
 */
export default function CartListPanel({
  selectedItems,
  onRowClick,
  onRemoveItem,
  getCartUnitPrice,
  formatCurrency
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-0 border border-slate-100">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="grid grid-cols-12 gap-4 px-6 py-4">
          <div className="col-span-1 text-[11px] font-bold text-slate-300 uppercase tracking-wider">#</div>
          <div className="col-span-4 text-[11px] font-bold text-slate-300 uppercase tracking-wider">Item Details</div>
          <div className="col-span-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider text-center">Qty</div>
          <div className="col-span-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider text-right">Unit Price</div>
          <div className="col-span-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider text-right">Total</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        {selectedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-500">No items added yet</p>
            <p className="text-sm text-slate-400 mt-1">Click "Add Items" from the right panel</p>
          </div>
        ) : (
          selectedItems.map((item, index) => (
            <div
              key={`${item.id || item.sku || "selected-item"}-${index}`}
              onClick={() => onRowClick(item)}
              className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-all border-b border-slate-100 hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-transparent group"
            >
              <div className="col-span-1">
                <span className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-700 text-sm font-bold flex items-center justify-center transition-colors">
                  {index + 1}
                </span>
              </div>
              <div className="col-span-4">
                <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800 transition-colors">{item.item_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400 font-mono">{item.sku}</span>
                  {item.batch_code && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                      {item.batch_code}
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-2 text-center">
                <span className="inline-flex items-center justify-center px-4 py-1.5 bg-emerald-100 rounded-xl text-sm font-bold text-emerald-700">
                  {item.customer_quantity}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm text-slate-500 tabular-nums font-medium">{formatCurrency(getCartUnitPrice(item))}</span>
                {item.customer_discount > 0 && (
                  <p className="text-[10px] text-orange-500 font-medium">-{formatCurrency(item.customer_discount)}</p>
                )}
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {formatCurrency((getCartUnitPrice(item) - (item.customer_discount || 0)) * item.customer_quantity)}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                  className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all hover:scale-110"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
