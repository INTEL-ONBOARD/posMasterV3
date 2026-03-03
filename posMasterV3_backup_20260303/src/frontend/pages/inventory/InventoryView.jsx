import React, { useState, useMemo } from "react";
import ItemCard from "../../components/ItemCard.jsx";
import NotFoundImg from "../../assets/nonicons_not-found-16.png";
import { ChevronDown, ChevronUp, Search, Filter, SortAsc, Package, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import ViewItemModal from "./modals/ViewItemModal.jsx";
import { useReactiveData, TABLES } from "../../store";

function InventoryView({ isActive }) {

  // Use reactive data hooks - automatically updates when data changes
  const { data: stockItems, loading: isLoadingStock, refetch: refetchStock } = useReactiveData(
    TABLES.STOCK_ITEMS,
    null,
    { enabled: isActive }
  );

  const { data: categories, loading: isLoadingCategories } = useReactiveData(
    TABLES.CATEGORIES,
    null,
    { enabled: isActive }
  );

  // Aggregate stock items by SKU - for items with multiple batches,
  // sum quantities and use the highest retail price for display
  const inventoryItems = useMemo(() => {
    const itemMap = new Map();

    (stockItems || []).forEach(stock => {
      // Skip entries without valid SKU
      if (!stock.sku) return;

      const existing = itemMap.get(stock.sku);

      if (existing) {
        // Aggregate: sum quantity across all batches
        existing.quantity += stock.quantity || 0;
        existing.batchCount += 1;

        // Use the highest retail price for display (newest stock typically has higher price)
        if ((stock.retail_price || 0) > (existing.retail_price || 0)) {
          existing.retail_price = stock.retail_price;
          existing.stock_price = stock.stock_price;
          existing.discount_price = stock.discount_price;
          existing.batch_code = stock.batch_code;
        }
      } else {
        // First occurrence - set initial values
        itemMap.set(stock.sku, {
          id: stock.item_id, // Use item_id for unique key
          item_id: stock.item_id,
          stock_id: stock.id,
          sku: stock.sku,
          item_code: stock.item_code || null, // Product code (manufacturer/supplier code)
          item_name: stock.item_name,
          item_image_url: stock.item_image_url,
          maximum_capacity: stock.maximum_capacity,
          batch_code: stock.batch_code,
          quantity: stock.quantity || 0,
          threshold_limit: stock.threshold_limit,
          stock_price: stock.stock_price,
          retail_price: stock.retail_price,
          discount_price: stock.discount_price,
          expiry_date: stock.expiry_date,
          availability: stock.availability,
          batchCount: 1,
          category: {
            id: stock.category_id,
            brand: stock.category_brand,
            type: stock.category_type
          },
          uom: {
            id: stock.uom_id,
            symbol: stock.uom_symbol,
            unit_name: stock.uom_unit_name
          }
        });
      }
    });

    return Array.from(itemMap.values());
  }, [stockItems]);

  // Extract unique category types
  const uniqueCategoryTypes = useMemo(() => {
    return Array.from(new Set((categories || []).map(c => c.type)));
  }, [categories]);

  // modal state: { open: boolean, type: 'success' | 'failed' | null }
  const [modal, setModal] = useState(false);
  const closeModal = () => setModal(false);
  const [selectedItem, setSelectedItem] = useState({});

  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");

  // Combined loading state
  const isLoading = isLoadingStock || isLoadingCategories;

  // search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  //helper method for item availability filtering
  const interpretAvailability = (item) => {
    // handle boolean, string, numeric types defensively
    const a = item?.availability;
    if (typeof a === "boolean") return a;
    if (typeof a === "string") return a.toLowerCase() === "true";
    return Boolean(a); // numbers (1/0) or other truthy/falsy
  };

  // Filter items based on search item name, batch code, category and availability
  const filteredItems = inventoryItems.filter((item) => {
    // Category match: either "All" or item.category.type equals selected
    const matchesCategory =
      searchCategory === "All" ||
      (item?.category && item.category.type === searchCategory);

    // Availability match: "All", Available (true), Unavailable (false)
    const isAvailable = interpretAvailability(item);
    const matchesAvailability =
      searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // Item name or batch code text search match
    const searchTerm = (search || "").toLowerCase();
    const matchesSearch =
      (item?.item_name || "").toLowerCase().includes(searchTerm) ||
      (item?.batch_code || "").toLowerCase().includes(searchTerm) ||
      (item?.sku || "").toLowerCase().includes(searchTerm);

    return matchesCategory && matchesAvailability && matchesSearch;
  });

  //right filter section controls
  const [openFilter, setOpenFilter] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);
  const [sortBy, setSortBy] = useState(""); // Sort by state

  // Sort the filtered items based on selected sort option
  const sortedItems = useMemo(() => {
    if (!sortBy) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.item_name || "").localeCompare(b.item_name || "");
        case "name_desc":
          return (b.item_name || "").localeCompare(a.item_name || "");
        case "price_asc":
          return (a.retail_price || 0) - (b.retail_price || 0);
        case "price_desc":
          return (b.retail_price || 0) - (a.retail_price || 0);
        case "stock_asc":
          return (a.quantity || 0) - (b.quantity || 0);
        case "stock_desc":
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });
  }, [filteredItems, sortBy]);

  return (
    <div className="flex flex-row bg-gray-50 w-full h-[calc(100vh-2rem)] relative">
      {/* Main Content Area */}
      <div className="flex-1 h-[calc(100vh-1rem)] bg-gray-50">
        {/* Search panel */}
        <nav className="w-full bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search items by name, SKU, or batch code..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <button
                onClick={refetchStock}
                disabled={isLoading}
                className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {/* Results count */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{sortedItems.length}</span> items
              </p>
            </div>
          </div>
        </nav>

        {/* Items Grid */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Searching items...</p>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedItems.map((item) => (
                <ItemCard
                  key={item.id || item.sku}
                  item={item}
                  onOpen={() => {
                    setModal(true);
                    setSelectedItem(item);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Sidebar */}
      <div className="bg-gray-100 w-[18rem] h-[calc(100vh-2rem)] p-3">
        <div className="flex flex-col h-full gap-3">
          {/* ▼ search filters block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFilter(!openFilter)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filters</span>
              </div>
              {openFilter ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFilter && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Category
                    </label>
                    <select
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      {uniqueCategoryTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Availability
                    </label>
                    <select
                      value={searchAvailability}
                      onChange={(e) => setSearchAvailability(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Items</option>
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ order by block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenOrderBy(!openOrderBy)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <SortAsc className="w-4 h-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sort By</span>
              </div>
              {openOrderBy ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openOrderBy && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Default</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="price_asc">Price (Low to High)</option>
                    <option value="price_desc">Price (High to Low)</option>
                    <option value="stock_asc">Stock (Low to High)</option>
                    <option value="stock_desc">Stock (High to Low)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Stats</p>

            <div className="space-y-3">
              <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">In Stock</p>
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">{inventoryItems.filter(i => interpretAvailability(i)).length}</p>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-sm shadow-red-200">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-600 font-medium">Out of Stock</p>
                  <p className="text-xl font-bold text-red-700 tabular-nums">{inventoryItems.filter(i => !interpretAvailability(i)).length}</p>
                </div>
              </div>

              <div className="bg-[#1A318C]/5 rounded-xl p-3 flex items-center gap-3 border border-[#1A318C]/10">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C] flex items-center justify-center shadow-sm shadow-blue-200">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#1A318C] font-medium">Total Items</p>
                  <p className="text-xl font-bold text-[#1A318C] tabular-nums">{inventoryItems.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ViewItemModal
        isOpen={modal}
        closeModal={closeModal}
        item={selectedItem}
      />
    </div>
  )
}

export default InventoryView
