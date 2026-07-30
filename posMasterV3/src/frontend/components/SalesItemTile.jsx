import React from "react";
import { getEffectiveSellingPrice } from "../util/common/uomPricing";

/**
 * Catalogue tile for the sales terminal grid.
 *
 * Keeps a photo band like the original SalesItemCard but at 64px instead of
 * ~112px, so roughly 3x more items fit on screen, with the stock level shown
 * as a bar along the band's base.
 *
 * The defensive field resolution below is carried over from SalesItemCard:
 * stock rows arrive with several different shapes depending on which service
 * produced them.
 */

// Mirrors ItemCard.jsx's grading (including its distinct zero-stock state) so
// the sales catalogue reads the same as the inventory screens.
const STATUS = {
  none: { label: "No stock", pill: "bg-red-50 text-red-700", stock: "text-red-700", bar: "#b91c1c" },
  low: { label: "Low stock", pill: "bg-red-50 text-red-600", stock: "text-red-600", bar: "#dc2626" },
  medium: { label: "Medium", pill: "bg-amber-50 text-amber-700", stock: "text-amber-700", bar: "#f59e0b" },
  ok: { label: "In stock", pill: "bg-emerald-50 text-emerald-700", stock: "text-emerald-600", bar: "#10b981" }
};

function resolveStatus(quantity, maxCapacity, thresholdLimit) {
  const percentFull = maxCapacity > 0 ? (quantity / maxCapacity) * 100 : 0;
  if (quantity <= 0) return { ...STATUS.none, percentFull: 0 };
  if (percentFull <= thresholdLimit) return { ...STATUS.low, percentFull };
  if (percentFull <= thresholdLimit + 20) return { ...STATUS.medium, percentFull };
  return { ...STATUS.ok, percentFull };
}

export default function SalesItemTile({ item, onOpen }) {
  const sourceItem = item?.item && typeof item.item === "object" ? item.item : item || {};

  const displayName =
    sourceItem.item_name ?? sourceItem.itemName ?? sourceItem.name ??
    item?.item_name ?? item?.itemName ?? item?.name ?? "Unknown Item";

  const displaySku =
    sourceItem.sku ?? sourceItem.item_sku ?? sourceItem.itemCode ??
    item?.sku ?? item?.item_sku ?? item?.itemCode ?? "";

  const displayUomSymbol = sourceItem.uom?.symbol || item?.uom?.symbol || "unit";

  // Only a real product photo — the shared placeholder asset carries no
  // information, so an initial-letter swatch stands in for it.
  const realImage = sourceItem.item_image_url || item?.item_image_url || item?.image || null;

  const quantity = Number(item?.quantity ?? sourceItem.quantity ?? 0);
  const maxCapacity = Number(item?.maximum_capacity ?? sourceItem.maximum_capacity ?? 100);
  const thresholdLimit = Number(item?.threshold_limit ?? sourceItem.threshold_limit ?? 20);
  const retailPrice = getEffectiveSellingPrice({ ...sourceItem, ...item });

  const status = resolveStatus(quantity, maxCapacity, thresholdLimit);
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "?";

  return (
    <button
      type="button"
      onClick={onOpen}
      title={displayName}
      // items-stretch is explicit on purpose: browsers apply their own
      // align-items to <button>, which otherwise centre-shrinks the band and
      // body instead of letting them span the card.
      className="group flex h-full w-full flex-col items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-all duration-150 hover:-translate-y-px hover:border-[#1A318C] hover:shadow-lg focus:outline-none focus-visible:border-[#1A318C] focus-visible:ring-2 focus-visible:ring-[#1A318C]/20 motion-reduce:hover:translate-y-0"
    >
      {/* Photo band */}
      <div className="relative flex h-16 w-full flex-none items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {realImage ? (
          <img
            src={realImage}
            alt={displayName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="text-2xl font-bold text-slate-400">{initial}</span>
        )}

        <span
          className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9px] font-bold uppercase tracking-wide ${status.pill}`}
        >
          <span className="h-1 w-1 rounded-full bg-current" />
          {status.label}
        </span>

        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-slate-400/40">
          <span
            className="block h-full"
            style={{ width: `${Math.min(status.percentFull, 100)}%`, background: status.bar }}
          />
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <span className="flex flex-col gap-[3px]">
          <span className="line-clamp-2 break-words text-[12.5px] font-semibold leading-snug text-slate-700">
            {displayName}
          </span>
          {displaySku && (
            <span className="block truncate font-mono text-[9.5px] text-slate-400">{displaySku}</span>
          )}
        </span>

        <span className="mt-auto flex items-baseline justify-between gap-2">
          <span
            className={`whitespace-nowrap text-[15px] font-extrabold tracking-tight ${
              retailPrice > 0 ? "text-slate-900" : "text-red-700"
            }`}
          >
            Rs.{retailPrice > 0 ? retailPrice.toFixed(2) : "0.00"}
            <span className="text-[10px] font-semibold text-slate-400">/{displayUomSymbol}</span>
          </span>
          <span className={`shrink-0 text-[10.5px] font-bold tabular-nums ${status.stock}`}>
            {quantity}
          </span>
        </span>
      </div>
    </button>
  );
}
