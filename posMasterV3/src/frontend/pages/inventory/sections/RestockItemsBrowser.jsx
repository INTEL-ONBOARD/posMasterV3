import React from "react";
import { ArrowLeft, Package, Trash2, RotateCcw, Search } from "lucide-react";
import SalesItemCard from "../../../components/SalesItemCard";

// Right panel "add" / "dispose" / "return" mode: search + filters + item
// list + action info bar. The original component rendered this as one
// shared block with `rightActiveSection` ternaries sprinkled through it
// (rather than three separate copies), so this component reproduces that
// exact same shared-block-with-ternaries structure instead of splitting
// into three near-duplicate components.
export default function RestockItemsBrowser({
  rightActiveSection,
  setRightActiveSection,
  search,
  handleSearch,
  handleSearchKeyDown,
  searchCategory,
  setSearchCategory,
  searchAvailability,
  setSearchAvailability,
  uniqueCategoryTypes,
  isLoading,
  searchLoading,
  filteredAddItems,
  filteredDisposeItems,
  filteredRestockItems,
  buildDisposeDisplayItem,
  loadItemtoList,
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Section Header with context-aware styling */}
      <div className={`rounded-xl mb-3 overflow-hidden ${
        rightActiveSection === "add"
          ? "bg-gradient-to-r from-[#1A318C] to-[#2a4399]"
          : rightActiveSection === "dispose"
            ? "bg-gradient-to-r from-amber-500 to-amber-400"
            : "bg-gradient-to-r from-red-500 to-red-400"
      }`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRightActiveSection("buttons")}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                {rightActiveSection === "add" && <Package className="w-5 h-5 text-white" />}
                {rightActiveSection === "dispose" && <Trash2 className="w-5 h-5 text-white" />}
                {rightActiveSection === "return" && <RotateCcw className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {rightActiveSection === "add" && "Add Items"}
                  {rightActiveSection === "dispose" && "Dispose Items"}
                  {rightActiveSection === "return" && "Return Items"}
                </h3>
                <p className="text-xs text-white/80">
                  {rightActiveSection === "add" && "Select items to add to stock"}
                  {rightActiveSection === "dispose" && "Select items to dispose"}
                  {rightActiveSection === "return" && "Select items to return"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search items by name, SKU..."
              className={`w-full h-10 pl-10 pr-4 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                rightActiveSection === "add"
                  ? "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                  : rightActiveSection === "dispose"
                    ? "border-gray-200 focus:ring-amber-500/20 focus:border-amber-500"
                    : "border-gray-200 focus:ring-red-500/20 focus:border-red-500"
              }`}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 flex gap-3">
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="flex-1 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {uniqueCategoryTypes.map((type, index) => (
              <option key={`${type || "category"}-${index}`} value={type}>{type}</option>
            ))}
          </select>
          <select
            name="searchAvailability"
            value={searchAvailability}
            onChange={(e) => setSearchAvailability(e.target.value)}
            className="flex-1 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
          >
            <option value="All">All Items</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3">
          {(isLoading || searchLoading) ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className={`animate-spin rounded-full border-4 border-gray-200 h-12 w-12 mb-4 ${
                rightActiveSection === "add"
                  ? "border-t-[#1A318C]"
                  : rightActiveSection === "dispose"
                    ? "border-t-amber-500"
                    : "border-t-red-500"
              }`}></div>
              <p className="text-gray-500">Loading items...</p>
            </div>
          ) : (rightActiveSection === "add" ? filteredAddItems : rightActiveSection === "dispose" || rightActiveSection === "return" ? filteredDisposeItems : filteredRestockItems).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                rightActiveSection === "add"
                  ? "bg-[#1A318C]/10"
                  : rightActiveSection === "dispose"
                    ? "bg-amber-100"
                    : "bg-red-100"
              }`}>
                {rightActiveSection === "add" && <Package className="w-8 h-8 text-[#1A318C]/50" />}
                {rightActiveSection === "dispose" && <Trash2 className="w-8 h-8 text-amber-400" />}
                {rightActiveSection === "return" && <RotateCcw className="w-8 h-8 text-red-400" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
              <p className="text-sm text-gray-500 mt-1">{rightActiveSection === "dispose" ? "No stock available to dispose" : "Try adjusting your search"}</p>
            </div>
          ) : rightActiveSection === "dispose" || rightActiveSection === "return" ? (
            filteredDisposeItems.map((stock, index) => {
              const displayItem = buildDisposeDisplayItem(stock);
              return (
                <SalesItemCard
                  key={`${displayItem.id || displayItem.stock_id || displayItem.sku || "stock"}-${index}`}
                  item={displayItem}
                  onOpen={() => loadItemtoList(displayItem)}
                  label={rightActiveSection === "return" ? "Return Item" : "Dispose"}
                />
              );
            })
          ) : (
            filteredAddItems.map((item, index) => (
              <SalesItemCard
                key={`${item.id ?? item._id ?? item.sku ?? "item"}-${index}`}
                item={item}
                onOpen={() => loadItemtoList(item)}
                label="Add Item"
              />
            ))
          )}
        </div>
      </div>

      {/* Action info bar */}
      <div className={`mt-3 rounded-xl p-3 flex items-center gap-3 ${
        rightActiveSection === "add"
          ? "bg-[#1A318C]/5 border border-[#1A318C]/10"
          : rightActiveSection === "dispose"
            ? "bg-amber-50 border border-amber-100"
            : "bg-red-50 border border-red-100"
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          rightActiveSection === "add"
            ? "bg-[#1A318C]/10"
            : rightActiveSection === "dispose"
              ? "bg-amber-100"
              : "bg-red-100"
        }`}>
          {rightActiveSection === "add" && <Package className="w-4 h-4 text-[#1A318C]" />}
          {rightActiveSection === "dispose" && <Trash2 className="w-4 h-4 text-amber-600" />}
          {rightActiveSection === "return" && <RotateCcw className="w-4 h-4 text-red-600" />}
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium ${
            rightActiveSection === "add"
              ? "text-[#1A318C]"
              : rightActiveSection === "dispose"
                ? "text-amber-700"
                : "text-red-700"
          }`}>
            {rightActiveSection === "add" && "Click on registered items to add them to the restock list"}
            {rightActiveSection === "dispose" && "Click on items to mark them for disposal"}
            {rightActiveSection === "return" && "Click on items to add them to the return list"}
          </p>
        </div>
        <span className={`text-xs font-bold tabular-nums px-2 py-1 rounded-lg ${
          rightActiveSection === "add"
            ? "bg-[#1A318C] text-white"
            : rightActiveSection === "dispose"
              ? "bg-amber-500 text-white"
              : "bg-red-500 text-white"
        }`}>
          {rightActiveSection === "add" ? filteredAddItems.length : rightActiveSection === "dispose" || rightActiveSection === "return" ? filteredDisposeItems.length : filteredRestockItems.length} items
        </span>
      </div>
    </div>
  );
}
