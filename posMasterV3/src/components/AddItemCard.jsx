import React from "react";
import barcodeImg from "../assets/barcode.png";
import placeholderImg from "../assets/card_placeholder_img.png";

export default function AddItemCard({ item, onOpen, onRemove, hideClose }) {
  // Use placeholder if item.item_image_url is null or undefined
  const imageSrc = item.item_image_url || placeholderImg;

  return (
    <div
      className="relative flex w-[24rem] h-[12rem] bg-white border border-gray-300 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      {/* Left Section */}
      <div className="flex flex-col justify-between p-4 pl-6 w-[75%]">
        <div>
          <img src={barcodeImg} alt="Barcode" className="w-[70px] object-contain" />
          <p className="text-xs text-gray-400 -mt-2">SKU: {item.sku}</p>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-[#6C6C6C]">{item.item_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 border px-2 py-0.5 rounded-sm text-[#A7A7A7]">
              {item.category?.type || 'Unknown'}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {item.category?.brand || 'Unknown'}
            </span>
          </div>
          <p className="text-xl font-extrabold text-black mt-2">
            Rs.{item.unit_price}
            <span className="text-sm font-semibold">{item.uom?.symbol || 'unit'}</span>
          </p>
        </div>
      </div>

      {/* Right Section now just an image that covers 100% of its area */}
      <div className="relative w-[25%] overflow-hidden">
        {/* Close button */}
        <button
          className="absolute top-2 right-2 p-0.5 bg-black rounded-full hover:bg-gray-800 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove) onRemove(item.id);
          }}
          aria-label="Close"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <img
          src={imageSrc}
          alt={item.item_name}
          className="w-full h-full object-cover"
        />

        {/* Status Indicator Circle (still overlaps at the same spot) */}
        <div className="absolute top-2 z-[1] right-[3.7rem] w-16 h-16 bg-green-500 rounded-full border-8 border-white" />
      </div>
    </div>
  );
}