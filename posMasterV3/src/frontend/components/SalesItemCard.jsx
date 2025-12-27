import React, { useRef, useState, useEffect } from "react";
import barcodeImg from "../assets/barcode.png";
import placeholderImg from "../assets/card_placeholder_img.png";

export default function SalesItemCard({ item, onOpen }) {
  const nameRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const imageSrc = item.item_image_url || placeholderImg;

  // Check if the item name overflows its container
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth);
  }, [item.item_name]);

  // Calculate status color based on quantity
  const percentFull = item.maximum_capacity ? ((item.quantity || 0) / item.maximum_capacity) * 100 : 0;
  let statusConfig;
  if (percentFull <= item.threshold_limit) {
    statusConfig = { bg: "bg-red-500", text: "text-red-600", label: "Low" };
  } else if (percentFull <= item.threshold_limit + 20) {
    statusConfig = { bg: "bg-amber-500", text: "text-amber-600", label: "Medium" };
  } else {
    statusConfig = { bg: "bg-emerald-500", text: "text-emerald-600", label: "In Stock" };
  }

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:border-[#1A318C]/20 transition-all duration-300"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      {/* Add Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A318C]/90 via-[#1A318C]/60 to-transparent flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 transform scale-90 group-hover:scale-100 transition-transform duration-300">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="text-white text-sm font-semibold tracking-wide">Add to Cart</span>
      </div>

      {/* Status Badge */}
      <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg} shadow-sm`}>
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
        <span className="text-[10px] font-semibold text-white uppercase tracking-wide">{statusConfig.label}</span>
      </div>

      {/* Image Section */}
      <div className="relative h-28 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={imageSrc}
          alt={item.item_name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Stock Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50">
          <div
            className={`h-full ${statusConfig.bg} transition-all duration-500`}
            style={{ width: `${Math.min(percentFull, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3">
        {/* SKU */}
        <div className="flex items-center gap-2 mb-1.5">
          <img src={barcodeImg} alt="Barcode" className="h-3 object-contain opacity-40" />
          <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">{item.sku}</span>
        </div>

        {/* Item Name */}
        <div className="overflow-hidden mb-1.5">
          <h3
            ref={nameRef}
            className={`text-sm font-bold text-gray-800 whitespace-nowrap ${overflowing ? "marquee" : ""}`}
          >
            {item.item_name}
          </h3>
        </div>

        {/* Category Tags */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {item.category?.type || 'Unknown'}
          </span>
          <span className="text-[9px] font-semibold text-[#1A318C] bg-blue-50 px-1.5 py-0.5 rounded">
            {item.category?.brand || 'Unknown'}
          </span>
        </div>

        {/* Price & Stock */}
        <div className="flex items-end justify-between pt-2 border-t border-gray-100">
          <div>
            <p className="text-lg font-bold text-gray-800 tabular-nums">
              Rs.{item.retail_price}
              <span className="text-[10px] font-medium text-gray-400 ml-0.5">/{item.uom?.symbol || 'unit'}</span>
            </p>
          </div>
          <div className={`text-[10px] font-bold ${statusConfig.text} tabular-nums`}>
            {item.quantity}/{item.maximum_capacity}
          </div>
        </div>
      </div>
    </div>
  );
}
