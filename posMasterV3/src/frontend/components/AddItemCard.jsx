import React, { useRef, useState, useEffect } from "react";
import barcodeImg from "../assets/barcode.png";
import placeholderImg from "../assets/card_placeholder_img.png";

export default function AddItemCard({ item, onOpen, onRemove }) {
  const nameRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth);
  }, [item.item_name]);

  // compute filled % once per render
  const percentFull = (item.quantity / item.maximum_capacity) * 100;
  let statusColorClass, statusBgClass, statusText;
  if (percentFull <= item.threshold_limit) {
    statusColorClass = "bg-red-500";
    statusBgClass = "bg-red-50 text-red-600";
    statusText = "Low";
  } else if (percentFull <= item.threshold_limit + 20) {
    statusColorClass = "bg-amber-500";
    statusBgClass = "bg-amber-50 text-amber-600";
    statusText = "Medium";
  } else {
    statusColorClass = "bg-emerald-500";
    statusBgClass = "bg-emerald-50 text-emerald-600";
    statusText = "Good";
  }

  // Prioritize blob image over URL, fallback to placeholder
  const imageSrc = item.item_image_blob || item.item_image_url || placeholderImg;

  return (
    <div
      className="relative flex bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:border-gray-200 transform transition-all duration-300 ease-in-out hover:scale-[1.02]"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      {/* Left Section */}
      <div className="flex flex-col justify-between p-4 flex-1">
        <div className="flex items-start justify-between">
          <div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 inline-block">
              <img src={barcodeImg} alt="Barcode" className="w-14 object-contain" />
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">SKU: {item.sku}</p>
          </div>
          {/* Stock Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBgClass}`}>
            <div className={`w-2 h-2 rounded-full ${statusColorClass}`}></div>
            {statusText}
          </div>
        </div>

        <div className="mt-3">
          <div className="overflow-hidden">
            <h2
              ref={nameRef}
              className={
                `text-xl font-bold text-gray-800 whitespace-nowrap ` +
                (overflowing ? "marquee" : "")
              }
            >
              {item.item_name}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-lg text-gray-500 font-medium">
              {item.category?.type || 'Unknown'}
            </span>
            <span className="text-xs bg-[#1A318C]/10 px-2 py-0.5 rounded-lg text-[#1A318C] font-semibold">
              {item.category?.brand || 'Unknown'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-gray-800 tabular-nums">Rs.{item.retail_price}</span>
            <span className="text-sm text-gray-400">/{item.uom?.symbol || 'unit'}</span>
          </div>
        </div>
      </div>

      {/* Right Section - Image */}
      <div className="relative w-28 flex-shrink-0">
        <button
          className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 backdrop-blur rounded-lg hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
          }}
          aria-label="Remove item"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <img src={imageSrc} alt={item.item_name} className="w-full h-full object-cover" />

        {/* Quantity Badge */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-lg px-2 py-1 shadow-sm">
          <p className="text-xs font-bold text-gray-800 tabular-nums">{item.quantity} <span className="text-gray-400 font-normal">in stock</span></p>
        </div>
      </div>
    </div>
  );
}
