import React from "react";
import { Trash2 } from "lucide-react";

/**
 * Confirmation dialog shown before clearing all items from the current cart.
 */
export default function ClearCartConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div className="relative z-[61] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-900">Clear Cart?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Are you sure you want to remove all items from the current transaction? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-500 text-white font-semibold hover:bg-red-600 hover:border-red-600 transition-all shadow-sm"
            >
              Yes, Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
