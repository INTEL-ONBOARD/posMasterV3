import React from "react";
import { getEffectiveSellingPrice } from "../util/common/uomPricing";

/**
 * Compact catalogue tile for the sales terminal grid.
 *
 * Replaces the tall SalesItemCard (which spent ~50% of its height on a
 * placeholder image most items don't have) so roughly 4-5x more items fit
 * on screen — the catalogue is the surface a cashier works fastest in.
 * The defensive field resolution below is carried over verbatim from
 * SalesItemCard: stock rows reach this component with several different
 * shapes depending on which service produced them.
 */
export default function SalesItemTile({ item, onOpen }) {
  const sourceItem = item?.item && typeof item.item === "object" ? item.item : item || {};

  const displayName =
    sourceItem.item_name ?? sourceItem.itemName ?? sourceItem.name ??
    item?.item_name ?? item?.itemName ?? item?.name ?? "Unknown Item";

  const displaySku =
    sourceItem.sku ?? sourceItem.item_sku ?? sourceItem.itemCode ??
    item?.sku ?? item?.item_sku ?? item?.itemCode ?? "";

  const displayCategoryBrand =
    sourceItem.category?.brand ?? sourceItem.categoryBrand ?? sourceItem.category_brand ??
    item?.category?.brand ?? item?.categoryBrand ?? item?.category_brand ?? "";

  const displayUomSymbol = sourceItem.uom?.symbol || item?.uom?.symbol || "unit";

  // Only use a real product photo — the shared placeholder asset carries no
  // information, so an initial-letter swatch is used instead of it.
  const realImage = sourceItem.item_image_url || item?.item_image_url || item?.image || null;

  const quantity = Number(item?.quantity ?? sourceItem.quantity ?? 0);
  const maxCapacity = Number(item?.maximum_capacity ?? sourceItem.maximum_capacity ?? 100);
  const thresholdLimit = Number(item?.threshold_limit ?? sourceItem.threshold_limit ?? 20);
  const retailPrice = getEffectiveSellingPrice({ ...sourceItem, ...item });

  const percentFull = maxCapacity > 0 ? (quantity / maxCapacity) * 100 : 0;
  const stockTone =
    percentFull <= thresholdLimit ? "text-red-600"
    : percentFull <= thresholdLimit + 20 ? "text-amber-600"
    : "text-emerald-600";

  return (
    <button
      type="button"
      onClick={onOpen}
      title={displayName}
      className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all duration-150 hover:-translate-y-px hover:border-[#1A318C] hover:shadow-md focus:outline-none focus-visible:border-[#1A318C] focus-visible:ring-2 focus-visible:ring-[#1A318C]/20 motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center gap-2.5">
        {realImage ? (
          <img
            src={realImage}
            alt={displayName}
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[13px] font-bold text-slate-500">
            {String(displayName).trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[12.5px] font-semibold leading-tight text-slate-800">
            {displayName}
          </span>
          {displaySku && (
            <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">{displaySku}</span>
          )}
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <span className="text-[14px] font-bold tabular-nums tracking-tight text-slate-900">
          Rs.{retailPrice > 0 ? retailPrice.toFixed(2) : "0.00"}
          <span className="ml-0.5 text-[10px] font-medium text-slate-400">/{displayUomSymbol}</span>
        </span>
        <span className={`shrink-0 text-[10.5px] font-bold tabular-nums ${stockTone}`}>
          {quantity} left
        </span>
      </div>

      {displayCategoryBrand && (
        <span className="truncate text-[10px] font-medium text-slate-400">{displayCategoryBrand}</span>
      )}
    </button>
  );
}
