import React, { useState, useEffect } from "react";
import { X, User, ShoppingCart, CreditCard, Wallet, DollarSign, Receipt, AlertTriangle, Heart, Users, Check, Banknote, ArrowRight, CheckCircle2, Sparkles, Printer } from "lucide-react";
import { paymentMethodApi } from "../../../api/localApi";

// Success Animation Component
function SuccessAnimation({ saleData, onClose, formatCurrency }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1300),
    ];

    // Auto-close after 10 seconds as a safety measure
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);

  // Press Enter to close the success screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10 transition-all duration-1000 ${step >= 1 ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
        <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 transition-all duration-1000 delay-200 ${step >= 1 ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/5 transition-all duration-1000 delay-300 ${step >= 2 ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
      </div>

      {/* Sparkle particles */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-ping"
            style={{
              left: `${15 + (i * 7) % 70}%`,
              top: `${10 + (i * 11) % 80}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '2s'
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-300/60" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-8">
        {/* Animated checkmark */}
        <div className={`mx-auto mb-6 transition-all duration-500 ${step >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="relative">
            <div className={`w-28 h-28 rounded-full bg-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/30 ${step >= 1 ? 'animate-bounce-once' : ''}`}>
              <CheckCircle2 className={`w-16 h-16 text-emerald-500 transition-all duration-300 ${step >= 1 ? 'scale-100' : 'scale-0'}`} />
            </div>
            {/* Ring animation */}
            <div className={`absolute inset-0 rounded-full border-4 border-white/50 transition-all duration-700 ${step >= 1 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}></div>
            <div className={`absolute inset-0 rounded-full border-4 border-white/30 transition-all duration-1000 delay-200 ${step >= 1 ? 'scale-[2] opacity-0' : 'scale-100 opacity-100'}`}></div>
          </div>
        </div>

        {/* Success text */}
        <div className={`transition-all duration-500 delay-300 ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-3xl font-bold text-white mb-2">Sale Complete!</h2>
          <p className="text-emerald-100 text-lg">Transaction processed successfully</p>
        </div>

        {/* Sale details */}
        <div className={`mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 transition-all duration-500 delay-500 ${step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="grid grid-cols-2 gap-6 text-left">
            <div>
              <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide mb-1">Amount Paid</p>
              <p className="text-white text-2xl font-bold tabular-nums">{formatCurrency(saleData.totalAmount)}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide mb-1">Payment Method</p>
              <p className="text-white text-lg font-semibold">{saleData.paymentMethodName}</p>
            </div>
            {saleData.changeAmount > 0 && (
              <div className="col-span-2 pt-4 border-t border-white/20">
                <p className="text-yellow-300 text-xs font-medium uppercase tracking-wide mb-1">Change to Return</p>
                <p className="text-yellow-300 text-3xl font-bold tabular-nums">{formatCurrency(saleData.changeAmount)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className={`mt-8 flex gap-4 justify-center transition-all duration-500 delay-700 ${step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <button
            onClick={onClose}
            className="px-8 py-4 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg flex items-center gap-2"
          >
            <Receipt className="w-5 h-5" />
            New Sale
          </button>
        </div>
      </div>

      {/* CSS for custom animation */}
      <style>{`
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

function CheckoutSummaryModal({
  isOpen,
  closeModal,
  selectedItems,
  selectedMember,
  stockTotal,
  onConfirmSale
}) {
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saleResult, setSaleResult] = useState(null);

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
      setFinalDiscount(0);
      setCashReceived('');
      setSelectedPaymentMethod(null);
      setIsProcessing(false);
      setShowSuccess(false);
      setSaleResult(null);
    }
  }, [isOpen, selectedMember]);

  const fetchPaymentMethods = async () => {
    setIsLoadingMethods(true);
    try {
      // Get methods based on whether customer is a member
      const response = selectedMember?.is_guest
        ? await paymentMethodApi.getForNonMembers()
        : await paymentMethodApi.getForMembers();

      if (response.status === 'success') {
        const methods = response.data || [];
        setPaymentMethods(methods);
        // Auto-select first method (usually cash)
        if (methods.length > 0) {
          setSelectedPaymentMethod(methods[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  if (!isOpen) return null;

  const totalAmount = stockTotal - parseFloat(finalDiscount || 0);
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const balanceAmount = cashReceivedNum - totalAmount;

  // Credit validation — any non-guest member can use credit regardless of balance
  const availableCredit = selectedMember?.credit_balance || 0;
  const isCredit = selectedPaymentMethod?.type === 'credit';
  const creditWarning = false;

  const formatCurrency = (amount) => `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;

  const handleConfirm = async () => {
    if (totalAmount < 0) return;
    if (creditWarning) return;
    if (!selectedPaymentMethod) return;

    setIsProcessing(true);

    const checkoutData = {
      finalDiscount: parseFloat(finalDiscount) || 0,
      paymentMethod: selectedPaymentMethod.type,
      paymentMethodId: selectedPaymentMethod.id,
      paymentMethodName: selectedPaymentMethod.name,
      creditMonths: selectedPaymentMethod.credit_months || 0,
      cashAmount: selectedPaymentMethod.type === "cash" ? (cashReceivedNum || totalAmount) : 0,
      totalAmount,
      changeAmount: selectedPaymentMethod.type === "cash" ? Math.max(0, balanceAmount) : 0
    };

    try {
      // Call the parent's confirm handler which processes the sale
      await onConfirmSale(checkoutData);

      // Show success animation - keep isProcessing true during animation
      // to prevent user interaction, but it will be reset when modal closes
      setSaleResult(checkoutData);
      setShowSuccess(true);
      // Don't set isProcessing to false here - the success animation handles the flow
    } catch (error) {
      console.error('Sale failed:', error);
      setIsProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    // Reset all states before closing
    setShowSuccess(false);
    setIsProcessing(false);
    setSaleResult(null);
    closeModal();
  };

  const getMethodIcon = (iconName) => {
    const icons = { Wallet, CreditCard, Heart, Users };
    return icons[iconName] || Wallet;
  };

  const colorClasses = {
    emerald: { bg: 'bg-emerald-500', bgLight: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500', ring: 'ring-emerald-200' },
    blue: { bg: 'bg-blue-500', bgLight: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500', ring: 'ring-blue-200' },
    indigo: { bg: 'bg-indigo-500', bgLight: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-500', ring: 'ring-indigo-200' },
    purple: { bg: 'bg-purple-500', bgLight: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500', ring: 'ring-purple-200' },
    pink: { bg: 'bg-pink-500', bgLight: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500', ring: 'ring-pink-200' },
    amber: { bg: 'bg-amber-500', bgLight: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500', ring: 'ring-amber-200' },
    gray: { bg: 'bg-gray-500', bgLight: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-500', ring: 'ring-gray-200' },
    teal: { bg: 'bg-teal-500', bgLight: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-500', ring: 'ring-teal-200' },
    violet: { bg: 'bg-violet-500', bgLight: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-500', ring: 'ring-violet-200' },
    red: { bg: 'bg-red-500', bgLight: 'bg-red-100', text: 'text-red-600', border: 'border-red-500', ring: 'ring-red-200' }
  };

  // Group payment methods by type
  const cashMethods = paymentMethods.filter(m => m.type === 'cash');
  const creditMethods = paymentMethods.filter(m => m.type === 'credit');
  const specialMethods = paymentMethods.filter(m => m.type === 'special');

  // Quick cash buttons
  const quickCashAmounts = [100, 500, 1000, 5000];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!showSuccess && !isProcessing ? closeModal : undefined}
      />

      {/* Modal Content - Wider and Centered */}
      <div
        className="relative z-10 w-full max-w-[1100px] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] relative">
          {/* Success Animation Overlay */}
          {showSuccess && saleResult && (
            <SuccessAnimation
              saleData={saleResult}
              onClose={handleSuccessClose}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Processing Overlay */}
          {isProcessing && !showSuccess && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg font-semibold text-gray-700">Processing Sale...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-gradient-to-r from-[#1A318C] to-[#2541B2] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Checkout Summary</h2>
                  <p className="text-blue-200 text-sm mt-0.5">Review and confirm your sale</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content - Two column layout */}
          <div className="flex flex-1 min-h-0">
            {/* Left Column - Order Details with flex layout for sticky bottom */}
            <div className="flex-1 flex flex-col p-5 border-r border-gray-100">
              {/* Customer & Items Count */}
              <div className="flex gap-3 mb-4 flex-shrink-0">
                {/* Customer Info */}
                <div className="flex-1 bg-white rounded-xl p-3 border-2 border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      selectedMember?.is_guest
                        ? "bg-slate-100"
                        : "bg-emerald-100"
                    }`}>
                      <User className={`w-5 h-5 ${
                        selectedMember?.is_guest ? "text-slate-500" : "text-emerald-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Customer</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{selectedMember?.full_name || "Guest"}</p>
                      <p className="text-xs text-gray-400">{selectedMember?.member_no || "Walk-in"}</p>
                    </div>
                  </div>
                </div>

                {/* Items Count */}
                <div className="w-28 bg-teal-50 rounded-xl p-3 border-2 border-teal-100 text-center">
                  <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wide">Items</p>
                  <p className="text-2xl font-bold text-teal-700 tabular-nums">{selectedItems.length}</p>
                </div>
              </div>

              {/* Items List - Scrollable area that fills remaining space */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 mb-4 flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Order Items</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {selectedItems.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                          <p className="text-[10px] text-gray-400">{item.sku} • Qty: {item.customer_quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-800 tabular-nums">
                        {formatCurrency((item.retail_price - (item.customer_discount || 0)) * item.customer_quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Section - Sticky at bottom */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-xl p-4 text-white flex-shrink-0 mt-auto">
                {/* Row 1: Subtotal and Discount */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">Subtotal</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(stockTotal)}</p>
                  </div>
                  <div className="text-slate-500">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wide mb-1">Discount</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/70 text-sm font-medium">Rs.</span>
                      <input
                        type="number"
                        value={finalDiscount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFinalDiscount(Math.max(0, Math.min(stockTotal, val)));
                        }}
                        disabled={isProcessing}
                        className="w-full pl-10 pr-3 py-2 bg-white/10 border border-amber-500/30 rounded-lg font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 tabular-nums text-lg disabled:opacity-50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Net Amount (Prominent) */}
                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-4 border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-emerald-300 font-semibold uppercase tracking-wide">Net Amount to Pay</p>
                    <p className="text-3xl font-bold text-emerald-400 tabular-nums">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Methods & Cash */}
            <div className="w-[380px] p-5 bg-gray-50 flex flex-col">
              {/* Payment Methods */}
              <div className="flex-1 overflow-y-auto mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Method</p>

                {isLoadingMethods ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1A318C] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Cash Methods */}
                    {cashMethods.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Cash</p>
                        <div className="space-y-2">
                          {cashMethods.map((method) => {
                            const IconComponent = getMethodIcon(method.icon);
                            const _colors = colorClasses[method.color] || colorClasses.emerald;
                            const isSelected = selectedPaymentMethod?.id === method.id;
                            return (
                              <button
                                key={method.id}
                                onClick={() => setSelectedPaymentMethod(method)}
                                disabled={isProcessing}
                                className={`w-full p-3 rounded-xl transition-all border-2 flex items-center gap-3 disabled:opacity-50 ${
                                  isSelected
                                    ? `border-emerald-500 bg-emerald-50 shadow-md`
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-emerald-500' : 'bg-emerald-100'
                                }`}>
                                  <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                                </div>
                                <p className={`text-sm font-semibold flex-1 text-left ${isSelected ? 'text-emerald-700' : 'text-gray-600'}`}>
                                  {method.name}
                                </p>
                                {isSelected && (
                                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Credit Methods */}
                    {creditMethods.length > 0 && !selectedMember?.is_guest && (
                      <div>
                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Credit</p>
                        <div className="space-y-2">
                          {creditMethods.map((method) => {
                            const IconComponent = getMethodIcon(method.icon);
                            const isSelected = selectedPaymentMethod?.id === method.id;
                            return (
                              <button
                                key={method.id}
                                onClick={() => !isProcessing && setSelectedPaymentMethod(method)}
                                disabled={isProcessing}
                                className={`w-full p-3 rounded-xl transition-all border-2 flex items-center gap-3 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-blue-500' : 'bg-blue-100'
                                }`}>
                                  <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                    {method.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400">{method.credit_months} months</p>
                                </div>
                                {isSelected && (
                                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {isCredit && (
                          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                            Current credit balance: {formatCurrency(availableCredit)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Special Methods */}
                    {specialMethods.length > 0 && !selectedMember?.is_guest && (
                      <div>
                        <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-2">Special</p>
                        <div className="space-y-2">
                          {specialMethods.map((method) => {
                            const IconComponent = getMethodIcon(method.icon);
                            const isSelected = selectedPaymentMethod?.id === method.id;
                            return (
                              <button
                                key={method.id}
                                onClick={() => setSelectedPaymentMethod(method)}
                                disabled={isProcessing}
                                className={`w-full p-3 rounded-xl transition-all border-2 flex items-center gap-3 disabled:opacity-50 ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-purple-500' : 'bg-purple-100'
                                }`}>
                                  <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                                </div>
                                <p className={`text-sm font-semibold flex-1 text-left ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                  {method.name}
                                </p>
                                {isSelected && (
                                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cash Received & Balance Section - Always visible for cash */}
              {selectedPaymentMethod?.type === 'cash' && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-3">
                  {/* Cash Received Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-500" />
                        Cash Received
                      </p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rs.</span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        disabled={isProcessing}
                        className="w-full pl-12 pr-4 py-3 text-xl font-bold text-gray-800 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none tabular-nums disabled:opacity-50"
                        placeholder="0.00"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const canConfirm = !isProcessing && totalAmount > 0 && !creditWarning && selectedPaymentMethod &&
                              !(selectedPaymentMethod?.type === 'cash' && cashReceivedNum < totalAmount && cashReceivedNum > 0);
                            if (canConfirm) handleConfirm();
                          }
                        }}
                      />
                    </div>
                    {/* Quick amount buttons */}
                    <div className="flex gap-2 mt-2">
                      {quickCashAmounts.map(amount => (
                        <button
                          key={amount}
                          onClick={() => setCashReceived(amount.toString())}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {amount}
                        </button>
                      ))}
                      <button
                        onClick={() => setCashReceived(Math.ceil(totalAmount).toString())}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                      >
                        Exact
                      </button>
                    </div>
                  </div>

                  {/* Balance/Change Display */}
                  <div className={`rounded-xl p-4 border-2 ${
                    cashReceivedNum === 0
                      ? 'bg-gray-50 border-gray-200'
                      : balanceAmount >= 0
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold uppercase tracking-wide ${
                        cashReceivedNum === 0
                          ? 'text-gray-400'
                          : balanceAmount >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                      }`}>
                        {balanceAmount >= 0 ? 'Change to Return' : 'Amount Due'}
                      </p>
                      <p className={`text-2xl font-bold tabular-nums ${
                        cashReceivedNum === 0
                          ? 'text-gray-400'
                          : balanceAmount >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                      }`}>
                        Rs. {Math.abs(balanceAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              onClick={closeModal}
              disabled={isProcessing}
              className="w-36 py-3.5 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || totalAmount < 0 || creditWarning || !selectedPaymentMethod || (selectedPaymentMethod?.type === 'cash' && cashReceivedNum < totalAmount && cashReceivedNum > 0)}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 disabled:shadow-none flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5" />
                  <span>Confirm Sale</span>
                  <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSummaryModal;
