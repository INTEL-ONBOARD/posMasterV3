import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Sparkles, Package, RotateCcw, UserPlus, Settings, ShoppingCart, Truck } from 'lucide-react';

/**
 * StatusModal - A reusable success/fail modal component with animations
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} closeModal - Function to close the modal
 * @param {string} type - 'success' or 'failed'
 * @param {string} description - Optional custom description message
 * @param {string} context - Optional context for the icon (e.g., 'inventory', 'user', 'sale', 'supplier')
 */
function StatusModal({ isOpen, closeModal, type, description, context = 'default' }) {
  const [step, setStep] = useState(0);

  // Reset and animate when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      const timers = [
        setTimeout(() => setStep(1), 200),
        setTimeout(() => setStep(2), 600),
        setTimeout(() => setStep(3), 1000),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuccess = type === 'success';

  // Get context-specific messages and icons
  const getContextInfo = () => {
    switch (context) {
      case 'inventory':
      case 'restock':
        return {
          successIcon: <Package className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'Inventory has been updated',
          failMsg: 'Please check your input and try again'
        };
      case 'user':
        return {
          successIcon: <UserPlus className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'User has been saved successfully',
          failMsg: 'Please check user details and try again'
        };
      case 'role':
        return {
          successIcon: <Settings className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'Role has been saved successfully',
          failMsg: 'Please check role details and try again'
        };
      case 'sale':
        return {
          successIcon: <ShoppingCart className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'Sale completed successfully',
          failMsg: 'Transaction failed. Please try again'
        };
      case 'supplier':
        return {
          successIcon: <Truck className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'Supplier has been saved successfully',
          failMsg: 'Please check supplier details and try again'
        };
      case 'item':
        return {
          successIcon: <Package className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'Item has been saved successfully',
          failMsg: 'Please check item details and try again'
        };
      default:
        return {
          successIcon: <CheckCircle2 className="w-5 h-5 text-white/80" />,
          failIcon: <RotateCcw className="w-5 h-5 text-white/80" />,
          successMsg: 'Operation completed successfully',
          failMsg: 'Please check your input and try again'
        };
    }
  };

  const contextInfo = getContextInfo();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal Content */}
      <div
        className="relative z-10 w-[400px] overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Background */}
        <div className={`relative ${isSuccess
          ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600'
          : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-600'
        } p-8`}>

          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/10 transition-all duration-700 ${step >= 1 ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
            <div className={`absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-white/5 transition-all duration-700 delay-100 ${step >= 1 ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 transition-all duration-700 delay-200 ${step >= 2 ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
          </div>

          {/* Sparkle particles for success */}
          {isSuccess && (
            <div className={`absolute inset-0 transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              {[...Array(8)].map((_, i) => (
                <div
                  key={`status-dot-${i}`}
                  className="absolute animate-ping"
                  style={{
                    left: `${10 + (i * 12) % 80}%`,
                    top: `${15 + (i * 15) % 70}%`,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '2s'
                  }}
                >
                  <Sparkles className="w-3 h-3 text-yellow-300/60" />
                </div>
              ))}
            </div>
          )}

          {/* Main content */}
          <div className="relative z-10 text-center">
            {/* Animated icon */}
            <div className={`mx-auto mb-5 transition-all duration-500 ${step >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
              <div className="relative inline-block">
                <div className={`w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto shadow-xl ${isSuccess ? 'shadow-emerald-900/20' : 'shadow-red-900/20'}`}>
                  {isSuccess ? (
                    <CheckCircle2 className={`w-14 h-14 text-emerald-500 transition-all duration-300 ${step >= 1 ? 'scale-100' : 'scale-0'}`} />
                  ) : (
                    <XCircle className={`w-14 h-14 text-red-500 transition-all duration-300 ${step >= 1 ? 'scale-100' : 'scale-0'}`} />
                  )}
                </div>
                {/* Ring animation */}
                <div className={`absolute inset-0 rounded-full border-4 border-white/50 transition-all duration-500 ${step >= 1 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}></div>
                <div className={`absolute inset-0 rounded-full border-4 border-white/30 transition-all duration-700 delay-150 ${step >= 1 ? 'scale-[1.8] opacity-0' : 'scale-100 opacity-100'}`}></div>
              </div>
            </div>

            {/* Status text */}
            <div className={`transition-all duration-500 delay-200 ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isSuccess ? 'Success!' : 'Failed!'}
              </h2>
              <p className={`text-base ${isSuccess ? 'text-emerald-100' : 'text-red-100'}`}>
                {description || (isSuccess
                  ? 'Operation completed successfully'
                  : 'Something went wrong. Please try again.')}
              </p>
            </div>

            {/* Info card */}
            <div className={`mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 transition-all duration-500 delay-400 ${step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="flex items-center justify-center gap-3">
                {isSuccess ? (
                  <>
                    {contextInfo.successIcon}
                    <span className="text-white/90 text-sm font-medium">{contextInfo.successMsg}</span>
                  </>
                ) : (
                  <>
                    {contextInfo.failIcon}
                    <span className="text-white/90 text-sm font-medium">{contextInfo.failMsg}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action button */}
            <div className={`mt-6 transition-all duration-500 delay-500 ${step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <button
                onClick={closeModal}
                className={`px-8 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                  isSuccess
                    ? 'bg-white text-emerald-600 hover:bg-emerald-50 shadow-emerald-900/20'
                    : 'bg-white text-red-600 hover:bg-red-50 shadow-red-900/20'
                }`}
              >
                {isSuccess ? 'Continue' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusModal;
