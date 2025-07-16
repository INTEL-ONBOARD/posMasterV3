import React from "react";
import barcodeImg from "../../assets/barcode.png";

export default function InventoryCard({ item, onOpen }) {
  return (
    <div
      className="flex w-[24rem] h-[12rem] bg-white border border-gray-300 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      {/* Left Section */}
      <div className="flex flex-col justify-between p-4 pl-6 w-[75%]">
        {/* Barcode and SKU */}
        <div>
          <img src={barcodeImg} alt="Barcode" className="w-[70px] object-contain" />
          <p className="text-xs text-gray-400 -mt-2">SKU: {item.sku}</p>
        </div>

        {/* Product Info */}
        <div>
          <h2 className="text-3xl font-bold text-[#6C6C6C]">{item.name}</h2>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 border px-2 py-0.5 rounded-sm text-[#A7A7A7]">
              {item.category}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {item.brand}
            </span>
          </div>

          <p className="text-xl font-extrabold text-black mt-2">
            Rs.{item.price}
            <span className="text-sm font-semibold">({item.unit.toUpperCase()})</span>
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="relative w-[25%] bg-teal-400">
        {/* inventory status indicator circle */}
        {/* Status Indicator Circle (positioned in-between) */}
      <div className="absolute top-2 right-[72%] w-16 h-16 bg-green-500 rounded-full border-8 border-white "></div>
    
      </div>
    </div>
  );
}
