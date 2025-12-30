import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, SortAsc, ArrowLeft, FileText, Calendar, DollarSign, User, Package, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { restockApi } from '../../api/localApi';
import { extractDateOnly } from '../../util/common/date';
import { useReactiveData, TABLES } from '../../store';

function CheckHistory({ isActive }) {
  // View state
  const [activeView, setActiveView] = useState("transactions"); // "transactions" | "items"

  // Filter section controls
  const [openFilters, setOpenFilters] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  // Use reactive data hook for restock transactions
  const { data: transData, loading: isLoadingTrans, refetch: refetchTransactions } = useReactiveData(
    TABLES.RESTOCK_TRANSACTIONS,
    null,
    { enabled: isActive }
  );

  // Force refetch when component becomes active to ensure fresh data
  useEffect(() => {
    if (isActive) {
      refetchTransactions();
    }
  }, [isActive, refetchTransactions]);

  // Search loading state
  const [searchLoading, setSearchLoading] = useState(false);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [filterAmount, setFilterAmount] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");

  // Selected transaction for detail view
  const [selectedTrans, setSelectedTrans] = useState(null);

  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 400);
  };

  // Safe access to transaction data
  const safeTransData = transData || [];

  // Filter transactions
  const filteredTransactions = safeTransData.filter((t) => {
    const searchTerm = search.toLowerCase();
    const matchesSearch =
      t.invoice_no?.toLowerCase().includes(searchTerm) ||
      t.bill_no?.toLowerCase().includes(searchTerm) ||
      String(t.supplier_id).includes(searchTerm) ||
      t.supplier?.basic_info?.supplier_name?.toLowerCase().includes(searchTerm);
    return matchesSearch;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    switch (sortOrder) {
      case "recent":
        return new Date(b.created_at) - new Date(a.created_at);
      case "oldest":
        return new Date(a.created_at) - new Date(b.created_at);
      case "amount_high":
        return b.total_amount - a.total_amount;
      case "amount_low":
        return a.total_amount - b.total_amount;
      default:
        return 0;
    }
  });

  // View transaction details - fetch full details including items
  const handleViewDetails = async (transaction) => {
    try {
      const response = await restockApi.getById(transaction.id);
      if (response.status === 'success') {
        setSelectedTrans(response.data);
      } else {
        // Fallback to basic transaction data
        setSelectedTrans(transaction);
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      setSelectedTrans(transaction);
    }
    setActiveView("items");
  };

  // Back to transactions
  const handleBackToList = () => {
    setActiveView("transactions");
    setSelectedTrans(null);
  };

  return (
    <div className="flex flex-row bg-gray-50 h-[calc(100vh-2rem)]">
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {/* Transactions List View */}
        {activeView === "transactions" && (
          <>
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
                      value={search}
                      onChange={handleSearch}
                      placeholder="Search by invoice no, bill no, or supplier..."
                      className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                  <button
                    onClick={refetchTransactions}
                    disabled={isLoadingTrans}
                    className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoadingTrans ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {/* Results count */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-semibold text-gray-800">{sortedTransactions.length}</span> transactions
                  </p>
                </div>
              </div>
            </nav>

            {/* Transactions Table */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingTrans ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
                  <p className="text-gray-500">Loading transactions...</p>
                </div>
              ) : searchLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
                  <p className="text-gray-500">Searching...</p>
                </div>
              ) : sortedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">No transactions found</h3>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#1A318C] to-[#2a4ab8]">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Invoice No</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Amount (Rs.)</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedTransactions.map((t, index) => (
                        <tr
                          key={t.id || index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-800">{t.invoice_no}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-[#1A318C]" />
                              </div>
                              <span className="text-sm text-gray-700">
                                {t.supplier?.basic_info?.supplier_name || `Supplier #${t.supplier_id}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {extractDateOnly(t.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              t.payment_method === 'cash'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {t.payment_method ? t.payment_method.charAt(0).toUpperCase() + t.payment_method.slice(1) : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-gray-800 tabular-nums">
                              Rs.{t.total_amount?.toLocaleString() || '0'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleViewDetails(t)}
                              className="px-4 py-2 bg-[#1A318C]/10 text-[#1A318C] rounded-lg text-sm font-medium hover:bg-[#1A318C] hover:text-white transition-all duration-200"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Transaction Details View */}
        {activeView === "items" && selectedTrans && (
          <>
            {/* Header with Back Button */}
            <nav className="bg-white border-b border-gray-100 shadow-sm px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToList}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Transaction Details</h2>
                  <p className="text-sm text-gray-500">Invoice: {selectedTrans.invoice_no}</p>
                </div>
              </div>
            </nav>

            {/* Transaction Info Cards */}
            <div className="p-6 overflow-auto flex-1">
              {/* Info Cards Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Invoice Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#1A318C]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice No</p>
                      <p className="text-lg font-bold text-gray-800">{selectedTrans.invoice_no}</p>
                    </div>
                  </div>
                </div>

                {/* Date Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
                      <p className="text-lg font-bold text-gray-800">{extractDateOnly(selectedTrans.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Total Amount</p>
                      <p className="text-lg font-bold text-gray-800">Rs.{selectedTrans.total_amount?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                        Approved
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Transaction Details</p>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Supplier</p>
                    <p className="text-base font-semibold text-gray-800">
                      {selectedTrans.supplier?.basic_info?.supplier_name || `Supplier #${selectedTrans.supplier_id}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prepared By</p>
                    <p className="text-base font-semibold text-gray-800">{selectedTrans.prepared_by_name || selectedTrans.prepared_by || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Authorized By</p>
                    <p className="text-base font-semibold text-gray-800">{selectedTrans.authorized_by_name || selectedTrans.authorized_by || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="text-base font-semibold text-gray-800 capitalize">{selectedTrans.payment_method || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#1A318C]" />
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Added Items</h3>
                  </div>
                  <span className="px-3 py-1 bg-[#1A318C]/10 text-[#1A318C] rounded-full text-xs font-semibold">
                    {selectedTrans.added_items?.length || 0} items
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Total</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Retail Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Retail Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedTrans.added_items?.map((item, index) => {
                      const qty = item.quantity || item.qty || 0;
                      return (
                        <tr key={item.id || `${item.sku}-${item.batch_code}-${index}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800 font-mono">{item.sku}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.batch_code}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{extractDateOnly(item.expiry_date || item.exp_date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-800 text-center font-semibold">{qty}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 text-right tabular-nums">Rs.{item.stock_price}</td>
                          <td className="px-6 py-4 text-sm text-gray-800 text-right font-semibold tabular-nums">Rs.{(item.stock_price * qty).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 text-right tabular-nums">Rs.{item.retail_price}</td>
                          <td className="px-6 py-4 text-sm text-gray-800 text-right font-semibold tabular-nums">Rs.{(item.retail_price * qty).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Return Items Table (if any) */}
              {selectedTrans.return_items?.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 overflow-hidden mt-6">
                  <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Returned Items</h3>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
                      {selectedTrans.return_items?.length || 0} items
                    </span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-red-50/50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-red-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-red-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-red-500 uppercase tracking-wider">Batch Code</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-red-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-red-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {selectedTrans.return_items?.map((item, index) => {
                        const qty = item.quantity || item.qty || 0;
                        return (
                          <tr key={item.id || `return-${item.sku}-${item.batch_code}-${index}`} className="hover:bg-red-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-800 font-mono">{item.sku}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{item.batch_code}</td>
                            <td className="px-6 py-4 text-sm text-red-600 text-center font-semibold">-{qty}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Filter Section */}
      <div className="bg-gray-100 w-72 h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Search Filters Block */}
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
                      Supplier
                    </label>
                    <select
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">All Suppliers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Date Range
                    </label>
                    <select
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Amount Range
                    </label>
                    <select
                      value={filterAmount}
                      onChange={(e) => setFilterAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">All Amounts</option>
                      <option value="low">Below Rs.5,000</option>
                      <option value="medium">Rs.5,000 - Rs.20,000</option>
                      <option value="high">Above Rs.20,000</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order By Block */}
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
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount_high">Amount (High to Low)</option>
                    <option value="amount_low">Amount (Low to High)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Stats Summary Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mt-auto">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Summary</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="text-sm font-bold text-gray-800">{safeTransData.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Amount</span>
                <span className="text-sm font-bold text-[#1A318C]">
                  Rs.{safeTransData.reduce((sum, t) => sum + (t.total_amount || 0), 0).toLocaleString()}
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

export default CheckHistory;
