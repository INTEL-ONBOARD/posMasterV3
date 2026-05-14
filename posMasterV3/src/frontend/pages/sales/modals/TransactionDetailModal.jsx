import React, { useState, useEffect, useCallback } from "react";
import { X, Receipt, User, CreditCard, Clock, Package, DollarSign, Wallet, Calendar, Hash, Printer, Download, ArrowRight, ShoppingBag, Tag } from "lucide-react";
import { salesApi } from "../../../api/localApi";

function TransactionDetailModal({ isOpen, closeModal, transaction }) {
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactionDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await salesApi.getById(transaction.id);
      if (response.status === 'success') {
        setTransactionDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [transaction?.id]);

  useEffect(() => {
    if (isOpen && transaction?.id) {
      fetchTransactionDetails();
    }
  }, [isOpen, transaction?.id, fetchTransactionDetails]);

  if (!isOpen) return null;

  const formatCurrency = (amount) => `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: 'short',
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPaymentBadge = (method) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return { bg: "bg-emerald-500", bgLight: "bg-emerald-100", text: "text-emerald-600", label: "Cash", icon: Wallet };
      case "credit":
        return { bg: "bg-blue-500", bgLight: "bg-blue-100", text: "text-blue-600", label: "Credit", icon: CreditCard };
      case "income":
        return { bg: "bg-purple-500", bgLight: "bg-purple-100", text: "text-purple-600", label: "Income", icon: DollarSign };
      case "special":
        return { bg: "bg-amber-500", bgLight: "bg-amber-100", text: "text-amber-600", label: "Special", icon: Tag };
      default:
        return { bg: "bg-gray-500", bgLight: "bg-gray-100", text: "text-gray-600", label: method || "N/A", icon: Receipt };
    }
  };

  const data = transactionDetails || transaction;
  const items = data?.items || [];
  const paymentBadge = getPaymentBadge(data?.payment_method);
  const PaymentIcon = paymentBadge.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-[900px] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1A318C] to-[#2541B2] px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                  <p className="text-blue-200 text-sm mt-0.5">Invoice #{data?.invoice_no || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  title="Print Receipt"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading transaction details...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Transaction Info Cards */}
              <div className="p-6 grid grid-cols-4 gap-4">
                {/* Date & Time */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-[88px]">
                  <div className="flex items-center gap-3 h-full">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Date & Time</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{formatDate(data?.created_at)}</p>
                      <p className="text-xs text-gray-500">{formatTime(data?.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Customer */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-[88px]">
                  <div className="flex items-center gap-3 h-full">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      data?.member_id ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                      <User className={`w-5 h-5 ${data?.member_id ? 'text-emerald-600' : 'text-slate-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Customer</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{data?.member_name || 'Guest'}</p>
                      <p className="text-xs text-gray-500">{data?.member_id ? `ID: ${data.member_id}` : 'Walk-in'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-[88px]">
                  <div className="flex items-center gap-3 h-full">
                    <div className={`w-10 h-10 rounded-lg ${paymentBadge.bgLight} flex items-center justify-center flex-shrink-0`}>
                      <PaymentIcon className={`w-5 h-5 ${paymentBadge.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Payment</p>
                      <p className={`text-sm font-bold ${paymentBadge.text}`}>{paymentBadge.label}</p>
                      <p className="text-xs text-gray-500">
                        {data?.payment_method === 'credit' && data?.credit_months > 0
                          ? `${data.credit_months} months`
                          : '\u00A0'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cashier */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-[88px]">
                  <div className="flex items-center gap-3 h-full">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Cashier</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{data?.cashier_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">Staff</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="px-6 pb-6">
                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-gray-500" />
                      <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Items Purchased</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                      {items.length} items
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No item details available</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-100/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-2 text-right">Total</div>
                      </div>

                      {/* Table Body */}
                      {items.map((item, index) => (
                        <div key={`${item.id || item.sku || "transaction-item"}-${index}`} className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-gray-50">
                          <div className="col-span-1">
                            <span className="w-6 h-6 rounded-md bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                          </div>
                          <div className="col-span-5">
                            <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                            <p className="text-[10px] text-gray-400">{item.sku || 'N/A'}</p>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-bold text-gray-700">{item.quantity}</span>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm text-gray-600 tabular-nums">{formatCurrency(item.unit_price)}</p>
                            {item.discount > 0 && (
                              <p className="text-[10px] text-red-500">-{formatCurrency(item.discount)}</p>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-bold text-gray-800 tabular-nums">{formatCurrency(item.total_price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer - Totals */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between gap-6">
              {/* Left side - breakdown */}
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Subtotal</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatCurrency((parseFloat(data?.total_amount) || 0) + (parseFloat(data?.discount_amount) || 0))}
                  </p>
                </div>
                {data?.discount_amount > 0 && (
                  <>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wide mb-0.5">Discount</p>
                      <p className="text-lg font-bold text-amber-400 tabular-nums">-{formatCurrency(data?.discount_amount)}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Right side - total */}
              <div className="bg-emerald-500/20 rounded-xl px-6 py-3 border border-emerald-500/30">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-wide mb-0.5">Total Paid</p>
                    <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatCurrency(data?.total_amount)}</p>
                  </div>
                  {data?.change_amount > 0 && (
                    <div className="pl-6 border-l border-emerald-500/30">
                      <p className="text-[10px] text-yellow-300 font-medium uppercase tracking-wide mb-0.5">Change</p>
                      <p className="text-lg font-bold text-yellow-300 tabular-nums">{formatCurrency(data?.change_amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailModal;
