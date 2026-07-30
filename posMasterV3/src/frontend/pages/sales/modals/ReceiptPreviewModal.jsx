import React from "react";
import { Receipt, X } from "lucide-react";
import BillContent from "../layout/BillContent.jsx";

/**
 * Read-only preview of the current (or last printed) receipt, rendered with
 * the same BillContent layout used for the off-screen print source.
 */
export default function ReceiptPreviewModal({ isOpen, onClose, billData }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-[71] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Receipt Preview</h3>
              <p className="text-xs text-slate-500">{billData?.invoiceNo || "Current receipt"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-auto bg-slate-100 p-5">
          <div className="mx-auto w-fit shadow-xl">
            <BillContent billData={billData} />
          </div>
        </div>
      </div>
    </div>
  );
}
