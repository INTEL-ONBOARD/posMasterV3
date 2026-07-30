import React from "react";
import { Package, RefreshCw, ScanLine, Search } from "lucide-react";
import SalesItemTile from "../../../components/SalesItemTile";

/**
 * Main catalogue surface of the sales terminal: search/scan bar, category
 * filter pills, and the item grid. This owns the widest part of the screen
 * because finding an item is the action a cashier repeats most.
 */
export default function ItemSearchPanel({
  searchInputRef,
  search,
  onSearchChange,
  onSearchKeyDown,
  searchCategory,
  onCategoryChange,
  uniqueCategoryTypes,
  isLoading,
  searchLoading,
  filteredItems,
  onItemOpen,
  onRefresh,
  lastScannedCode
}) {
  // Rendered as a single horizontally-scrolling row rather than a wrapping
  // block so an org with many categories can't push the grid off-screen.
  const categories = ["All", ...uniqueCategoryTypes];

  return (
    // min-w-0 is load-bearing: a flex item defaults to min-width:auto, which
    // stops it shrinking below its content width. Without it the item grid
    // resolves against an unbounded width, never wraps, and pushes the cart
    // rail off-screen.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* Search / scan bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="relative max-w-[560px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={onSearchChange}
            onKeyDown={onSearchKeyDown}
            placeholder="Search or scan — name, SKU, or code"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1A318C] focus:ring-2 focus:ring-[#1A318C]/10"
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh items"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {lastScannedCode && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
            <ScanLine className="h-4 w-4" />
            <span className="font-mono text-[11.5px] font-semibold">{lastScannedCode}</span>
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2.5">
        {categories.map((type, index) => {
          const active = searchCategory === type;
          return (
            <button
              key={`${type || "category"}-${index}`}
              type="button"
              onClick={() => onCategoryChange(type)}
              aria-pressed={active}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? "border-[#1A318C] bg-[#1A318C] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {type === "All" ? "All items" : type}
            </button>
          );
        })}
      </div>

      {/* Item grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {(isLoading || searchLoading) ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
            <span className="text-sm font-medium text-slate-500">Loading items...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-slate-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <span className="text-sm font-semibold text-slate-500">No items found</span>
            <span className="mt-1 text-xs text-slate-400">Try a different search or category</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-2.5">
            {filteredItems.map((item, index) => (
              // Virtualize: off-screen tiles skip rendering/layout.
              // contain-intrinsic-size reserves the tile's box so the scrollbar stays stable.
              <div
                key={`${item.id ?? item._id ?? item.sku ?? "item"}-${index}`}
                style={{ contentVisibility: "auto", containIntrinsicSize: "158px 196px" }}
              >
                <SalesItemTile
                  item={item}
                  onOpen={() => onItemOpen(item)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
