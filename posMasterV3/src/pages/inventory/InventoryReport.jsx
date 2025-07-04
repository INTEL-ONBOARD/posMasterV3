import React from "react";

export default function InventoryReport() {
  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-1/3 bg-white border-r flex flex-col">
        <div className="p-6">
          <div className="mb-2 bg-[#F8F8F8] rounded">
            <button className="w-full text-left px-4 py-3 font-semibold text-gray-500 flex items-center justify-between">
              BASIC REPORT
              <span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
          <div className="mb-2 bg-[#F8F8F8] rounded">
            <button className="w-full text-left px-4 py-3 font-semibold text-gray-500 flex items-center justify-between">
              ADVANCE REPORT
              <span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
      {/* Right panel */}
      <div className="flex-1 bg-white flex flex-col px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-400 mb-6">INVENTORY REPORTS</h2>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-gray-700 text-center">
            NO REPORT VIEW CURRENTLY INITIALIZED HERE
          </span>
        </div>
        {/* Bottom bar */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            className="px-8 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            // onClick={handleClear}
          >
            Clear
          </button>
          <button
            className="px-8 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
            // onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}