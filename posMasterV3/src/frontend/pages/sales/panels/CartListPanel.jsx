import React from "react";
import { ShoppingCart, X, Minus, Plus } from "lucide-react";

/**
 * Cart line items inside the right rail. Each row exposes an inline
 * quantity stepper for the common case; clicking the row still opens the
 * full edit modal for discounts and anything else per-line.
 */
export default function CartListPanel({
  selectedItems,
  onRowClick,
  onRemoveItem,
  onChangeQuantity,
  getCartUnitPrice,
  formatCurrency
}) {
  if (selectedItems.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <ShoppingCart className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-[13px] font-semibold text-slate-500">Cart is empty</p>
        <p className="mt-1 text-[11.5px] text-slate-400">Pick an item from the catalogue to start</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {selectedItems.map((item, index) => {
        const unitPrice = getCartUnitPrice(item);
        const discount = item.customer_discount || 0;
        const lineTotal = (unitPrice - discount) * item.customer_quantity;

        return (
          <div
            key={`${item.id || item.sku || "selected-item"}-${index}`}
            onClick={() => onRowClick(item)}
            className="group flex cursor-pointer items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight text-slate-800">
                {item.item_name}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] tabular-nums text-slate-400">
                {formatCurrency(unitPrice)}
                {item.uom?.symbol ? ` /${item.uom.symbol}` : ""}
                {discount > 0 && (
                  <span className="ml-1 font-semibold text-orange-500">-{formatCurrency(discount)}</span>
                )}
              </p>
            </div>

            {/* Quantity stepper — stops propagation so it doesn't open the modal */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => onChangeQuantity(item.id, -1)}
                aria-label={`Decrease quantity of ${item.item_name}`}
                className="flex h-7 w-6 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-[12px] font-bold tabular-nums text-slate-800">
                {item.customer_quantity}
              </span>
              <button
                type="button"
                onClick={() => onChangeQuantity(item.id, 1)}
                aria-label={`Increase quantity of ${item.item_name}`}
                className="flex h-7 w-6 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <span className="w-[74px] shrink-0 text-right text-[12.5px] font-bold tabular-nums text-slate-900">
              {formatCurrency(lineTotal)}
            </span>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
              aria-label={`Remove ${item.item_name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
