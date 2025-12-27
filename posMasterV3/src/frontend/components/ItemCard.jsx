import React, { useRef, useState, useEffect } from "react";
import barcodeImg from "../assets/barcode.png";
import placeholderImg from "../assets/card_placeholder_img.png";

//onOpen is the callback for opening the details for card
// onremove is the callback for for deleting a card
export default function ItemCard({ item, onOpen, onRemove }) {
  const nameRef = useRef(null);
  //for marquee effect in item name text
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth);
  }, [item.item_name]);

  const percentFull = item.maximum_capacity ? ((item.quantity || 0) / item.maximum_capacity) * 100 : 0;
  let statusConfig;
  if (percentFull <= (item.threshold_limit || 30)) {
    statusConfig = { bg: "bg-red-500", ring: "ring-red-200", text: "text-red-600", label: "Low Stock" };
  } else if (percentFull <= item.threshold_limit + 20) {
    statusConfig = { bg: "bg-amber-500", ring: "ring-amber-200", text: "text-amber-600", label: "Medium" };
  } else {
    statusConfig = { bg: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-600", label: "In Stock" };
  }

  const imageSrc = item.image || placeholderImg;

  return (
    <div
      onClick={() => onOpen()}
      className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:border-gray-200 transition-all duration-300"
      tabIndex={0}
    >
      {/* Status Badge */}
      <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg} shadow-sm`}>
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        <span className="text-[10px] font-semibold text-white uppercase tracking-wide">{statusConfig.label}</span>
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 flex items-center justify-center transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
          }}
          aria-label="Remove item"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Image Section */}
      <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={imageSrc}
          alt={item.item_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Stock Level Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className={`h-full ${statusConfig.bg} transition-all duration-500`}
            style={{ width: `${Math.min(percentFull, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* SKU & Barcode */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src={barcodeImg} alt="Barcode" className="h-4 object-contain opacity-50" />
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{item.sku}</span>
          </div>
          <div className={`text-[10px] font-bold ${statusConfig.text}`}>
            {item.quantity}/{item.maximum_capacity}
          </div>
        </div>

        {/* Item Name */}
        <div className="overflow-hidden mb-2">
          <h3
            ref={nameRef}
            className={`text-base font-bold text-gray-800 whitespace-nowrap ${overflowing ? "marquee" : ""}`}
          >
            {item.item_name}
          </h3>
        </div>

        {/* Category Tags */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            {item.category?.type || 'Unknown'}
          </span>
          <span className="text-[10px] font-semibold text-[#1A318C] bg-blue-50 px-2 py-1 rounded-md">
            {item.category?.brand || 'Unknown'}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between pt-2 border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Retail Price</p>
            <p className="text-xl font-bold text-gray-800 tabular-nums">
              Rs.{item.stock_price}
              <span className="text-xs font-medium text-gray-400 ml-1">/{item.uom?.symbol || 'unit'}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-[#1A318C] opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-medium">View</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
