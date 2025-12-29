import React, { useState, useEffect } from "react";
//modal images
import barcodeImg from "../../../assets/barcode.png";
import placeholderImg from "../../../assets/card_placeholder_img.png";

import { extractDateOnly } from "../../../util/common/date";
import { restockApi } from "../../../api/localApi";

function ViewItemModal({ isOpen, closeModal, item }) {
  if (!isOpen) return null;

  //to populate recent batch code changes
  const [stockEntries, setStockEntries] = useState([]);

  useEffect (() => {
    fetchStockEntries(item.sku)
  }, [item.sku]);

  const imageSrc = item.item_image_url || item.item_image_blob || placeholderImg;

  // fetch stock entries for a given SKU
  const fetchStockEntries = async (sku) => {
    if (!sku) return;
    try {
      const response = await restockApi.getStockData(sku);
      console.log('[ViewItemModal] Stock data response:', response);

      if (response) {
        if (response.status === 'success' && Array.isArray(response.data)) {
          setStockEntries(response.data);
        } else if (Array.isArray(response)) {
          setStockEntries(response);
        } else if (Array.isArray(response.data)) {
          setStockEntries(response.data);
        } else {
          setStockEntries([]);
        }
      } else {
        setStockEntries([]);
      }
    } catch (err) {
      console.error('Failed to fetch stock entries for', sku, err);
      setStockEntries([]);
    }
  };

  // Get the primary stock entry (first/oldest batch for FIFO, or use item data as fallback)
  const primaryStock = stockEntries.length > 0 ? stockEntries[0] : null;

  // Calculate totals across all batches
  const totalQuantity = stockEntries.reduce((sum, s) => sum + (s.qty || 0), 0) || item.quantity || 0;

  // Use primary stock data, falling back to item data
  const displayBatchCode = primaryStock?.batch_code || item.batch_code || "N/A";
  const displayStockPrice = primaryStock?.stock_price ?? item.stock_price ?? 0;
  const displayRetailPrice = primaryStock?.retail_price ?? item.retail_price ?? 0;
  const displayExpDate = primaryStock?.exp_date || item.expiry_date || item.exp_date;
  const displayThreshold = primaryStock?.threshold_limit || item.threshold_limit || 10;
  const maxCapacity = item.maximum_capacity || 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop (click to close) */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* modal content */}
      <div
        className="relative z-[20] flex flex-col items-center justify-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-[70rem] max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                <img
                  src={imageSrc}
                  alt={item.item_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">{item.item_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-white/10 px-2 py-1 rounded-lg text-slate-300">
                    {item.category?.type || "Unknown"}
                  </span>
                  <span className="text-xs bg-[#1A318C]/80 px-2 py-1 rounded-lg text-white font-medium">
                    {item.category?.brand || "Unknown"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-8 flex gap-8">
            {/* Left section - Details */}
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-6">
                {/* Batch Code */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Batch Code</p>
                  <p className="text-lg font-semibold text-gray-800">{displayBatchCode}</p>
                  {stockEntries.length > 1 && (
                    <p className="text-xs text-gray-400 mt-1">+{stockEntries.length - 1} more batches</p>
                  )}
                </div>

                {/* Quantity */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Total Quantity</p>
                  <p className="text-lg font-semibold text-gray-800">{totalQuantity} <span className="text-sm font-normal text-gray-500">/ {maxCapacity}</span></p>
                </div>

                {/* Stock Price */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Stock Price</p>
                  <p className="text-lg font-bold text-gray-800 tabular-nums">Rs. {Number(displayStockPrice).toFixed(2)}</p>
                </div>

                {/* Retail Price */}
                <div className="bg-[#1A318C]/5 rounded-xl p-4 border border-[#1A318C]/10">
                  <p className="text-xs text-[#1A318C] uppercase tracking-wide font-medium mb-1">Retail Price</p>
                  <p className="text-xl font-bold text-[#1A318C] tabular-nums">Rs. {Number(displayRetailPrice).toFixed(2)}</p>
                </div>

                {/* Threshold */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Low Stock Threshold</p>
                  <p className="text-lg font-semibold text-amber-600">{displayThreshold} units</p>
                </div>

                {/* Expiration Date */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Expiration Date</p>
                  <p className="text-lg font-semibold text-gray-800">{displayExpDate ? extractDateOnly(displayExpDate) : "N/A"}</p>
                </div>
              </div>

              {/* Stock Level Bar */}
              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Stock Level</p>
                  <p className="text-sm font-semibold text-gray-800">{Math.round((totalQuantity / maxCapacity) * 100) || 0}%</p>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (totalQuantity / maxCapacity) * 100 <= displayThreshold
                        ? 'bg-red-500'
                        : (totalQuantity / maxCapacity) * 100 <= displayThreshold + 20
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((totalQuantity / maxCapacity) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right section - SKU & Batches */}
            <div className="w-80">
              {/* SKU Card */}
              <div className="bg-slate-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">SKU</p>
                    <p className="text-lg font-bold text-white font-mono">{item.sku || "N/A"}</p>
                  </div>
                  <img
                    src={barcodeImg}
                    alt="Barcode"
                    className="w-20 object-contain brightness-0 invert opacity-50"
                  />
                </div>
              </div>

              {/* Product Code Card */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-amber-600 uppercase tracking-wide font-medium mb-1">Product Code</p>
                <p className="text-lg font-bold text-amber-800 font-mono">{item.item_code || "N/A"}</p>
              </div>

              {/* Recent Batches */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">All Batches ({stockEntries.length})</p>
                <div className="flex flex-col gap-2 max-h-[16rem] overflow-y-auto pr-2">
                  {stockEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-400">No stock batches found</p>
                    </div>
                  ) : (
                    stockEntries.map((s, i) => (
                      <div
                        key={s.batch_code + i}
                        className="bg-white rounded-lg px-3 py-2.5 border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-800">{s.batch_code}</p>
                          <p className="text-xs font-bold text-emerald-600 tabular-nums">{s.qty} units</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Rs. {Number(s.retail_price || 0).toFixed(2)}</span>
                          <span>Exp: {s.exp_date ? extractDateOnly(s.exp_date) : 'N/A'}</span>
                        </div>
                      </div>
                    ))
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

export default ViewItemModal;
