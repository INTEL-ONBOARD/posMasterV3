import { useState, useMemo } from "react";
import ItemCard from "../../components/ItemCard.jsx";
import { ChevronDown, ChevronUp, Search, Filter, SortAsc, Package, Grid3X3, List, CheckCircle, AlertTriangle, Tag } from "lucide-react";
import ViewItemModal from "./modals/ViewItemModal.jsx";
import { useReactiveData, TABLES } from "../../store";
import { useScannerSearch } from "../../hooks/useScannerSearch";

function ViewSaleInventory({ isActive }) {
  const [modal, setModal] = useState(false);
  const closeModal = () => setModal(false);
  const [selectedItem, setSelectedItem] = useState({});
  const normalizeText = (value) => String(value ?? "");

  // Use reactive data hooks - fetch STOCK_ITEMS which includes prices and quantities
  const { data: stockItems, loading: isLoadingStock } = useReactiveData(
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
    return Array.from(new Set((categories || []).map((c) => c.type)));
  }, [categories]);

  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");
  const [sortOrder, setSortOrder] = useState("name_asc");
  const [viewMode, setViewMode] = useState("grid");
  const [openFilter, setOpenFilter] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  // Combined loading state
  const isLoading = isLoadingStock || isLoadingCategories;

  const { handleSearch, handleSearchKeyDown } = useScannerSearch({ setSearch });

  const filteredItems = inventoryItems
    .filter((item) => {
      const itemName = normalizeText(item.item_name);
      const itemSku = normalizeText(item.sku);
      const matchesCategory =
        searchCategory === "All" ||
        (item.category && item.category.type === searchCategory);
      const matchesSearch =
        itemName.toLowerCase().includes(search.toLowerCase()) ||
        itemSku.toLowerCase().includes(search.toLowerCase());
      const matchesAvailability =
        searchAvailability === "All" ||
        (searchAvailability === "Available" && item.quantity > 0) ||
        (searchAvailability === "Out of Stock" && item.quantity <= 0);
      return matchesCategory && matchesSearch && matchesAvailability;
    })
    .sort((a, b) => {
      const aName = normalizeText(a.item_name);
      const bName = normalizeText(b.item_name);
      switch (sortOrder) {
        case "name_asc":
          return aName.localeCompare(bName);
        case "name_desc":
          return bName.localeCompare(aName);
        case "price_asc":
          return (a.retail_price || 0) - (b.retail_price || 0);
        case "price_desc":
          return (b.retail_price || 0) - (a.retail_price || 0);
        case "quantity_asc":
          return (a.quantity || 0) - (b.quantity || 0);
        case "quantity_desc":
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

  const inStockCount = inventoryItems.filter((i) => i.quantity > 0).length;
  const outOfStockCount = inventoryItems.filter((i) => i.quantity <= 0).length;

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
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search items by name or SKU..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-[#1A318C]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-[#1A318C]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredItems.length}</span> items
              </p>
            </div>
          </div>
        </nav>

        {/* Items Grid */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item, index) => (
                <ItemCard
                  key={`${item.id || item.sku || "item"}-${index}`}
                  item={item}
                  onOpen={() => {
                    setModal(true);
                    setSelectedItem(item);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item, index) => (
                    <tr
                      key={`${item.id || item.sku || "item"}-${index}`}
                      onClick={() => {
                        setModal(true);
                        setSelectedItem(item);
                      }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {item.item_image_url ? (
                              <img
                                src={item.item_image_url}
                                alt={normalizeText(item.item_name) || "Inventory item"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-800">
                            {normalizeText(item.item_name) || item.sku || "Unnamed item"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {item.sku || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.category?.type || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-gray-800 tabular-nums">
                          Rs. {(item.retail_price || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.quantity > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">{item.quantity} In Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Out of Stock</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Filter Sidebar */}
      <div className="bg-gray-100 w-[18rem] h-[calc(100vh-2rem)] p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Filters Block */}
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
                      {uniqueCategoryTypes.map((type, index) => (
                        <option key={`${type || "category"}-${index}`} value={type}>
                          {type}
                        </option>
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
                      <option value="All">All Status</option>
                      <option value="Available">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sort By Block */}
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
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="price_asc">Price (Low to High)</option>
                    <option value="price_desc">Price (High to Low)</option>
                    <option value="quantity_asc">Quantity (Low to High)</option>
                    <option value="quantity_desc">Quantity (High to Low)</option>
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
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">{inStockCount}</p>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-sm shadow-red-200">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-600 font-medium">Out of Stock</p>
                  <p className="text-xl font-bold text-red-700 tabular-nums">{outOfStockCount}</p>
                </div>
              </div>

              <div className="bg-[#1A318C]/5 rounded-xl p-3 flex items-center gap-3 border border-[#1A318C]/10">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C] flex items-center justify-center shadow-sm shadow-blue-200">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#1A318C] font-medium">Total Items</p>
                  <p className="text-xl font-bold text-[#1A318C] tabular-nums">{inventoryItems.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSearch("");
              setSearchCategory("All");
              setSearchAvailability("All");
              setSortOrder("name_asc");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      <ViewItemModal isOpen={modal} closeModal={closeModal} item={selectedItem} />
    </div>
  );
}

export default ViewSaleInventory;
