import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Filter, SortAsc, Receipt, CreditCard, DollarSign, Clock, RefreshCw, Eye, User, RotateCcw, X, Minus, Plus } from "lucide-react";
import { useReactiveData, TABLES } from "../../store";
import TransactionDetailModal from "./modals/TransactionDetailModal";
import { salesApi } from "../../api/localApi";

export default function TransactionHistory({ isActive }) {
  // Use reactive data hook - automatically updates when data changes
  const { data: transactions, loading: isLoading, refetch } = useReactiveData(
    TABLES.SALES_TRANSACTIONS,
    null,
    { enabled: isActive }
  );

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Return modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTransaction, setReturnTransaction] = useState(null);
  const [returnItems, setReturnItems] = useState({});   // { saleItemId: quantity }
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("All");
  const [sortOrder, setSortOrder] = useState("recent");
  const [openFilter, setOpenFilter] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  const getSaleLineKey = (item = {}, index = 0) => String(
    item.id ||
    item._id ||
    item.sale_item_id ||
    item.saleItemId ||
    `${item.item_id || item.itemId || 'item'}:${item.batch_code || item.batchCode || 'batch'}:${index}`
  ) + `-${index}`;

  const handleOpenReturn = async (e, transaction) => {
    e.stopPropagation();
    setReturnError("");
    setReturnReason("");
    setReturnItems({});
    // Load full sale details including items
    try {
      const res = await salesApi.getById(transaction.id);
      if (res?.status === 'success') {
        setReturnTransaction(res.data);
        // Initialize return quantities to 0
        const init = {};
        (res.data.items || []).forEach((item, index) => { init[getSaleLineKey(item, index)] = 0; });
        setReturnItems(init);
        setReturnModalOpen(true);
      }
    } catch (e) {
      console.error('[TransactionHistory] openReturn error:', e);
    }
  };

  const handleSubmitReturn = async () => {
    const itemsToReturn = (returnTransaction?.items || [])
      .map((item, index) => ({ item, key: getSaleLineKey(item, index) }))
      .filter(({ key }) => (returnItems[key] || 0) > 0)
      .map(({ item, key }) => ({
        sale_item_id: key,
        stock_id: item.stock_id || item.stockId,
        item_id: item.item_id || item.itemId,
        batch_code: item.batch_code || item.batchCode,
        quantity: returnItems[key],
        unit_price: item.unit_price
      }));

    if (itemsToReturn.length === 0) {
      setReturnError("Please specify at least one item to return");
      return;
    }
    if (!returnReason.trim()) {
      setReturnError("Reason is required");
      return;
    }
    setReturnSubmitting(true);
    setReturnError("");
    try {
      const res = await salesApi.returnItems(returnTransaction.id, { items: itemsToReturn, reason: returnReason });
      if (res?.status === 'success') {
        setReturnModalOpen(false);
        refetch();
      } else {
        setReturnError(res?.message || "Failed to process return");
      }
    } catch (e) {
      setReturnError(e.message || "Failed to process return");
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Safe access to transactions array
  const safeTransactions = transactions || [];

  const filteredTransactions = safeTransactions
    .filter((t) => {
      const searchTerm = search.toLowerCase();
      const matchesSearch =
        (t.invoice_no || "").toLowerCase().includes(searchTerm) ||
        (t.member_name || "Guest").toLowerCase().includes(searchTerm);
      const matchesPayment =
        filterPaymentType === "All" || t.payment_method === filterPaymentType.toLowerCase();
      return matchesSearch && matchesPayment;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "recent":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "amount_high":
          return (b.total_amount || 0) - (a.total_amount || 0);
        case "amount_low":
          return (a.total_amount || 0) - (b.total_amount || 0);
        default:
          return 0;
      }
    });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `Rs.${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  const getPaymentBadge = (method) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return { bg: "bg-emerald-500", label: "Cash" };
      case "credit":
        return { bg: "bg-amber-500", label: "Credit" };
      case "income":
        return { bg: "bg-blue-500", label: "Income" };
      default:
        return { bg: "bg-gray-500", label: method || "N/A" };
    }
  };

  const cashTransactions = safeTransactions.filter(t => t.payment_method === 'cash').length;
  const creditTransactions = safeTransactions.filter(t => t.payment_method === 'credit').length;

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
                  placeholder="Search by invoice number or member name..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <button
                onClick={refetch}
                disabled={isLoading}
                className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredTransactions.length}</span> transactions
              </p>
            </div>
          </div>
        </nav>

        {/* Transactions Table */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Receipt className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No transactions found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((transaction, index) => {
                    const paymentBadge = getPaymentBadge(transaction.payment_method);
                    return (
                      <tr
                        key={`${transaction.id || transaction.invoice_no || "transaction"}-${index}`}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                          selectedTransaction?.id === transaction.id ? "bg-[#1A318C]/5" : ""
                        }`}
                        onClick={() => handleViewTransaction(transaction)}
                      >
                        <td className="px-4 py-4 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-800">{transaction.invoice_no || "-"}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              transaction.member_id ? 'bg-emerald-100' : 'bg-gray-100'
                            }`}>
                              <User className={`w-4 h-4 ${
                                transaction.member_id ? 'text-emerald-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{transaction.member_name || "Guest"}</p>
                              <p className="text-[10px] text-gray-400">{transaction.member_id ? `ID: ${transaction.member_id}` : 'Walk-in'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${paymentBadge.bg} shadow-sm`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            <span className="text-[10px] font-semibold text-white uppercase tracking-wide">{paymentBadge.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-bold text-gray-800 tabular-nums">
                            {formatCurrency(transaction.total_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTransaction(transaction);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A318C]/10 text-[#1A318C] rounded-lg text-xs font-semibold hover:bg-[#1A318C]/20 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                            {(transaction.status === 'completed' || transaction.status === 'partial_return') && (
                              <button
                                onClick={(e) => handleOpenReturn(e, transaction)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
                                title="Return items"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Return
                              </button>
                            )}
                          </div>
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
                      Payment Type
                    </label>
                    <select
                      value={filterPaymentType}
                      onChange={(e) => setFilterPaymentType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Payments</option>
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                      <option value="income">Income</option>
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
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
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
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Cash Sales</p>
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">{cashTransactions}</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm shadow-amber-200">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">Credit Sales</p>
                  <p className="text-xl font-bold text-amber-700 tabular-nums">{creditTransactions}</p>
                </div>
              </div>

              <div className="bg-[#1A318C]/5 rounded-xl p-3 flex items-center gap-3 border border-[#1A318C]/10">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C] flex items-center justify-center shadow-sm shadow-blue-200">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#1A318C] font-medium">Total Sales</p>
                  <p className="text-xl font-bold text-[#1A318C] tabular-nums">{safeTransactions.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={detailModalOpen}
        closeModal={() => {
          setDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />

      {/* Return Items Modal */}
      {returnModalOpen && returnTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Return Items</h2>
                <p className="text-sm text-gray-500 mt-0.5">Invoice: {returnTransaction.invoice_no}</p>
              </div>
              <button onClick={() => setReturnModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Items list with quantity inputs */}
            <div className="space-y-3 mb-4">
              {(returnTransaction.items || []).map((item, index) => {
                const itemKey = getSaleLineKey(item, index);
                return (
                <div key={itemKey} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.item_name || item.item_id}</p>
                    <p className="text-xs text-gray-400">Batch: {item.batch_code} · Sold: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReturnItems(prev => ({
                        ...prev,
                        [itemKey]: Math.max(0, (prev[itemKey] || 0) - 1)
                      }))}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="text-sm font-semibold text-gray-800 w-8 text-center tabular-nums">
                      {returnItems[itemKey] || 0}
                    </span>
                    <button
                      onClick={() => setReturnItems(prev => ({
                        ...prev,
                        [itemKey]: Math.min(item.quantity, (prev[itemKey] || 0) + 1)
                      }))}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason *</label>
              <input
                type="text"
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="e.g. Defective product, Wrong item..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
              />
            </div>

            {returnError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{returnError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReturnModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={returnSubmitting}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                {returnSubmitting ? "Processing..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
