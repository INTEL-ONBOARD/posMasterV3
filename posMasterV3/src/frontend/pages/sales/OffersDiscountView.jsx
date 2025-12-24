import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Filter, SortAsc, Tag, Package, DollarSign, Percent, CheckCircle, AlertTriangle, Plus } from "lucide-react";

export default function OffersDiscountView({ isActive }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("default");
  const [openFilter, setOpenFilter] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  const [discounts] = useState([
    { id: 1, code: "XLR9590565", name: "Christmas bonus", type: "Package", amount: 30, unit: "%", status: "Available" },
    { id: 2, code: "SUM2024OFF", name: "Summer Sale", type: "Item", amount: 15, unit: "%", status: "Available" },
    { id: 3, code: "BULK5000", name: "Bulk Buyer Discount", type: "Price Range", amount: 200, unit: "Rs off", status: "Available" },
    { id: 4, code: "BISC10OFF", name: "Biscuit Discount", type: "Item", amount: 1, unit: "Rs off", status: "Disabled" },
    { id: 5, code: "SNR1590565", name: "Senior Discount", type: "Price Range", amount: 200, unit: "%", status: "Disabled" },
    { id: 6, code: "STU3500OFF", name: "Student bonus", type: "Price Range", amount: 3.5, unit: "Rs off", status: "Available" },
  ]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredDiscounts = discounts
    .filter((d) => {
      const searchTerm = search.toLowerCase();
      const matchesSearch =
        d.code.toLowerCase().includes(searchTerm) ||
        d.name.toLowerCase().includes(searchTerm);
      const matchesType = filterType === "All" || d.type === filterType;
      const matchesStatus = filterStatus === "All" || d.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "amount_high":
          return b.amount - a.amount;
        case "amount_low":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

  const getTypeBadge = (type) => {
    switch (type) {
      case "Package":
        return { bg: "bg-purple-500", icon: Package, label: "Package" };
      case "Item":
        return { bg: "bg-blue-500", icon: Tag, label: "Item" };
      case "Price Range":
        return { bg: "bg-amber-500", icon: DollarSign, label: "Price Range" };
      default:
        return { bg: "bg-gray-500", icon: Percent, label: type };
    }
  };

  const activeCount = discounts.filter(d => d.status === "Available").length;
  const disabledCount = discounts.filter(d => d.status === "Disabled").length;

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
                  placeholder="Search discounts by code or name..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <button className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredDiscounts.length}</span> discounts
              </p>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium shadow-sm shadow-emerald-200">
                <Plus className="w-4 h-4" />
                New Discount
              </button>
            </div>
          </div>
        </nav>

        {/* Discounts Table */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-6">
          {filteredDiscounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Tag className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No discounts found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDiscounts.map((discount, index) => {
                    const typeBadge = getTypeBadge(discount.type);
                    const TypeIcon = typeBadge.icon;
                    return (
                      <tr key={discount.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {discount.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{discount.name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${typeBadge.bg} shadow-sm`}>
                            <TypeIcon className="w-3 h-3 text-white" />
                            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">{typeBadge.label}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-800 tabular-nums">
                            {discount.amount}
                            <span className="text-gray-400 font-normal ml-1">({discount.unit})</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {discount.status === "Available" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                              <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                              <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Disabled</span>
                            </span>
                          )}
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
                      Discount Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Types</option>
                      <option value="Item">Item Discount</option>
                      <option value="Package">Package Discount</option>
                      <option value="Price Range">Price Range</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Status</option>
                      <option value="Available">Active</option>
                      <option value="Disabled">Disabled</option>
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
                    <option value="default">Default</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="amount_high">Amount (High to Low)</option>
                    <option value="amount_low">Amount (Low to High)</option>
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
                  <p className="text-xs text-emerald-600 font-medium">Active</p>
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">{activeCount}</p>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-sm shadow-red-200">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-600 font-medium">Disabled</p>
                  <p className="text-xl font-bold text-red-700 tabular-nums">{disabledCount}</p>
                </div>
              </div>

              <div className="bg-[#1A318C]/5 rounded-xl p-3 flex items-center gap-3 border border-[#1A318C]/10">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C] flex items-center justify-center shadow-sm shadow-blue-200">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#1A318C] font-medium">Total Discounts</p>
                  <p className="text-xl font-bold text-[#1A318C] tabular-nums">{discounts.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
