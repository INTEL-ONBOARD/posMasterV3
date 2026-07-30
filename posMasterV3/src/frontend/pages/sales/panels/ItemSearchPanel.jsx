import React from "react";
import { Package } from "lucide-react";
import SalesItemCard from "../../../components/SalesItemCard";

/**
 * Right-sidebar item picker: search box + category filter + the scrollable
 * list of available items (SalesItemCard grid).
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
  onItemOpen
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Items List View */}
      <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="mb-3">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={onSearchChange}
              placeholder="Search by name, SKU, or code..."
              className="w-full pl-4 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <select
            value={searchCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
          >
            <option value="All">All Categories</option>
            {uniqueCategoryTypes.map((type, index) => (
              <option key={`${type || "category"}-${index}`} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3">
          {(isLoading || searchLoading) ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
              <span className="text-slate-500 text-sm font-medium">Loading items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <span className="text-sm font-semibold text-slate-500">No items found</span>
              <span className="text-xs text-slate-400 mt-1">Try a different search</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <SalesItemCard key={`${item.id ?? item._id ?? item.sku ?? "item"}-${index}`} item={item} onOpen={() => onItemOpen(item)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
