import React, { useState, useMemo } from "react";
import { Search, FileText, Download, Printer, Package, DollarSign, AlertTriangle, Tag, ChevronDown, ChevronUp, Filter, SortAsc, BarChart3 } from "lucide-react";
import { itemApi } from "../../api/localApi";
import { useReactiveData, TABLES } from "../../store";

export default function InventoryReport({ isActive }) {
  // Use reactive data hook for inventory items
  const { data: inventoryItems, loading: isLoading } = useReactiveData(
    TABLES.ITEMS,
    null,
    { enabled: isActive }
  );

  const [reportType, setReportType] = useState("basic");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [openFilters, setOpenFilters] = useState(true);
  const [openSort, setOpenSort] = useState(true);
  const [sortOrder, setSortOrder] = useState("name_asc");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");

  // Calculate summary statistics with null checks
  const safeItems = inventoryItems || [];
  const totalItems = safeItems.length;
  const totalValue = safeItems.reduce((sum, item) => sum + (parseFloat(item.retail_price || 0) * (item.quantity || 0)), 0);
  const lowStockItems = safeItems.filter(item => {
    const percentFull = ((item.quantity || 0) / (item.maximum_capacity || 1)) * 100;
    return percentFull <= (item.threshold_limit || 30);
  }).length;
  const categories = [...new Set(safeItems.map(item => item.category?.type).filter(Boolean))];

  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearchTerm(e.target.value);
    setTimeout(() => setSearchLoading(false), 400);
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!inventoryItems || inventoryItems.length === 0) return [];
    return inventoryItems.filter(item => {
      const matchesSearch = searchTerm === "" ||
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.type?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === "all" || item.category?.type === filterCategory;

      const percentFull = ((item.quantity || 0) / (item.maximum_capacity || 1)) * 100;
      const isLowStock = percentFull <= (item.threshold_limit || 30);
      const matchesStock = filterStock === "all" ||
        (filterStock === "low" && isLowStock) ||
        (filterStock === "in_stock" && !isLowStock);

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "name_asc":
          return (a.item_name || "").localeCompare(b.item_name || "");
        case "name_desc":
          return (b.item_name || "").localeCompare(a.item_name || "");
        case "stock_high":
          return (b.quantity || 0) - (a.quantity || 0);
        case "stock_low":
          return (a.quantity || 0) - (b.quantity || 0);
        case "price_high":
          return (b.retail_price || 0) - (a.retail_price || 0);
        case "price_low":
          return (a.retail_price || 0) - (b.retail_price || 0);
        default:
          return 0;
      }
    });
  }, [inventoryItems, searchTerm, filterCategory, filterStock, sortOrder]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ["ID", "Name", "Category", "Price", "Stock", "Unit", "SKU", "Total Value"];
    const csvContent = [
      headers.join(","),
      ...filteredItems.map(item => [
        item.id,
        `"${item.item_name}"`,
        item.category?.type || "N/A",
        item.retail_price || 0,
        item.quantity || 0,
        item.uom?.symbol || "pcs",
        item.sku,
        ((parseFloat(item.retail_price || 0) * (item.quantity || 0))).toFixed(2)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'inventory-report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Get stock status
  const getStockStatus = (item) => {
    const percentFull = ((item.quantity || 0) / (item.maximum_capacity || 1)) * 100;
    if (percentFull <= (item.threshold_limit || 30)) {
      return { text: "Low Stock", class: "bg-red-100 text-red-700" };
    } else if (percentFull <= (item.threshold_limit || 30) + 20) {
      return { text: "Medium", class: "bg-amber-100 text-amber-700" };
    }
    return { text: "In Stock", class: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <div className="flex flex-row bg-gray-50 h-[calc(100vh-2rem)]">
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {/* Search Header */}
        <nav className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search by item name, SKU, or category..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <button
                onClick={handleExport}
                className="h-12 px-6 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all duration-200 shadow-md shadow-emerald-900/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
            {/* Results count */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredItems.length}</span> of {totalItems} items
              </p>
            </div>
          </div>
        </nav>

        {/* Summary Cards */}
        <div className="px-6 pt-6">
          <div className="grid grid-cols-4 gap-4">
            {/* Total Items Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#1A318C]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total Items</p>
                  <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
                </div>
              </div>
            </div>

            {/* Total Value Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total Value</p>
                  <p className="text-2xl font-bold text-gray-800">Rs.{totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Low Stock Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-800">{lowStockItems}</p>
                </div>
              </div>
            </div>

            {/* Categories Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Tag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Categories</p>
                  <p className="text-2xl font-bold text-gray-800">{categories.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Loading inventory data...</p>
            </div>
          ) : searchLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Searching...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No inventory data found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1A318C] to-[#2a4ab8]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item, index) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-800">{item.item_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-mono">{item.sku}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{item.category?.type || "N/A"}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-gray-800 tabular-nums">
                            {item.quantity || 0} <span className="text-gray-400 font-normal">{item.uom?.symbol || "pcs"}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-600 tabular-nums">Rs.{item.retail_price || 0}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-gray-800 tabular-nums">
                            Rs.{((item.retail_price || 0) * (item.quantity || 0)).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.class}`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Filter Section */}
      <div className="bg-gray-100 w-72 h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Report Type Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Type</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={() => setReportType("basic")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  reportType === "basic"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Basic Report
              </button>
              <button
                onClick={() => setReportType("advanced")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  reportType === "advanced"
                    ? "bg-[#1A318C] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Advanced Report
              </button>
            </div>
          </div>

          {/* Filters Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFilters(!openFilters)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filters</span>
              </div>
              {openFilters ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFilters && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Category
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Stock Status
                    </label>
                    <select
                      value={filterStock}
                      onChange={(e) => setFilterStock(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="in_stock">In Stock</option>
                      <option value="low">Low Stock</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sort By Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenSort(!openSort)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <SortAsc className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sort By</span>
              </div>
              {openSort ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openSort && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="stock_high">Stock (High to Low)</option>
                    <option value="stock_low">Stock (Low to High)</option>
                    <option value="price_high">Price (High to Low)</option>
                    <option value="price_low">Price (Low to High)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Stats Summary Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mt-auto">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Report Summary</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Filtered Items</span>
                <span className="text-sm font-bold text-gray-800">{filteredItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Filtered Value</span>
                <span className="text-sm font-bold text-[#1A318C]">
                  Rs.{filteredItems.reduce((sum, item) => sum + ((item.retail_price || 0) * (item.quantity || 0)), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>
    </div>
  );
}
