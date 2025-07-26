import React from "react";
import barcodeImg from "../assets/barcode.png";
import placeholderImg from "../assets/card_placeholder_img.png";
import plusImg from "../assets/card_add_img.png";

export default function SalesItemCard({ item, onOpen }) {
  // Use placeholder if item.item_image_url is null or undefined
  const imageSrc = item.item_image_url || placeholderImg;

  return (
    <div
      className="relative group flex w-[24rem] h-[12rem] bg-white border border-gray-300 overflow-hidden cursor-pointer hover:shadow-md transform transition-transform duration-300 ease-in-out hover:scale-105"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      {/* HOVER OVERLAY */}
      <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <img src={plusImg} alt="+ Add" className="w-12 h-12 mb-2" />
        <span className="text-white text-lg font-semibold">Add</span>
      </div>

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
        <img
          src={imageSrc}
          alt={item.item_name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Status Indicator Circle */}
      <div className="absolute top-2 z-[1] right-[3.7rem] w-16 h-16 bg-green-500 rounded-full border-8 border-white" />
    </div>
  );
}
