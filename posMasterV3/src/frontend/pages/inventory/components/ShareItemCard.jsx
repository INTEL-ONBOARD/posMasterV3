import React from "react";
import { Package2 } from "lucide-react";
import Badge from "./Badge.jsx";

export default function ShareItemCard({ item, isAdded, onAdd }) {
  const quantity = Number(item?.quantity) || 0;
  const maxCapacity = Number(item?.maximum_capacity) || 100;
  const threshold = Number(item?.threshold_limit) || 20;
  const percentFull = maxCapacity > 0 ? (quantity / maxCapacity) * 100 : 0;

  const status =
    percentFull <= threshold
      ? { label: "Low", badge: "bg-rose-500", text: "text-rose-600" }
      : percentFull <= threshold + 20
        ? { label: "Medium", badge: "bg-amber-500", text: "text-amber-600" }
        : { label: "In Stock", badge: "bg-emerald-500", text: "text-emerald-600" };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all duration-300 hover:shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/80" />
      <div className="relative">
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#0F6591] via-[#1A8F9B] to-[#8EE8A4]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.34),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.2),_transparent_35%)]" />
          <div className="absolute left-3 top-3">
            <Badge tone={status.label === "In Stock" ? "emerald" : status.label === "Medium" ? "amber" : "rose"}>{status.label}</Badge>
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
            {quantity}/{maxCapacity}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className={`h-full ${status.badge}`} style={{ width: `${Math.min(percentFull, 100)}%` }} />
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {item?.uom?.symbol || "unit"}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item?.sku || "SKU"}</span>
          </div>
          <h3 className="mt-2 truncate text-base font-bold text-slate-800">{item?.item_name || "Unnamed Item"}</h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{item?.category?.type || "Category"}</Badge>
            <Badge tone="blue">{item?.category?.brand || "Brand"}</Badge>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Retail Price</p>
              <p className="text-lg font-bold text-slate-800 tabular-nums">
                Rs.{Number(item?.retail_price || 0).toFixed(2)}
                <span className="ml-1 text-xs font-medium text-slate-400">/{item?.uom?.symbol || "unit"}</span>
              </p>
            </div>
            <div className={`text-xs font-bold tabular-nums ${status.text}`}>
              {quantity}/{maxCapacity}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAdd(item)}
            disabled={isAdded}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              isAdded
                ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "bg-[#1A318C] text-white shadow-sm hover:bg-[#152a79]"
            }`}
          >
            {isAdded ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
