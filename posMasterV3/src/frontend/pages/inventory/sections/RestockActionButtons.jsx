import React from "react";
import { Package, Trash2, RotateCcw } from "lucide-react";

// Right panel "buttons" mode — the three big navigation buttons shown
// before the user picks add / dispose / return.
export default function RestockActionButtons({ setRightActiveSection }) {
  return (
    <div className="flex flex-col h-full gap-3">
      {/* Add Items Button */}
      <button
        onClick={() => setRightActiveSection("add")}
        className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#1A318C]/10 flex items-center justify-center mb-3 group-hover:bg-[#1A318C]/20 transition-colors">
          <Package className="w-8 h-8 text-[#1A318C]" />
        </div>
        <span className="text-lg font-semibold text-gray-800">Add Items</span>
        <span className="text-sm text-gray-500 mt-1">Add registered items to the restock list</span>
      </button>

      {/* Dispose Items Button */}
      <button
        onClick={() => setRightActiveSection("dispose")}
        className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
          <Trash2 className="w-8 h-8 text-amber-600" />
        </div>
        <span className="text-lg font-semibold text-gray-800">Dispose Items</span>
        <span className="text-sm text-gray-500 mt-1">Remove damaged or expired items</span>
      </button>

      {/* Return Items Button */}
      <button
        onClick={() => setRightActiveSection("return")}
        className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
          <RotateCcw className="w-8 h-8 text-red-600" />
        </div>
        <span className="text-lg font-semibold text-gray-800">Return Items</span>
        <span className="text-sm text-gray-500 mt-1">Process item returns to supplier</span>
      </button>
    </div>
  );
}
