import React, { useState } from "react";
import barcodeImg from "../../assets/barcode.png";

function ReturnItem() {
  const [openFormBlock, setOpenFormBlock] = useState("item");

  return (
    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* Form section left */}
      <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 z-10">
        {/* 56 is the correct height */}
        <div className="flex flex-col h-[46rem] gap-3">
          {/* Item description box */}
          <div className="border rounded bg-white">
            {/* ------------------------------------------------------------------------ */}
            {/* ▼ item description block ▼ */}
            <div className="border rounded bg-white">
              <button
                className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
                onClick={() =>
                  setOpenFormBlock(openFormBlock === "item" ? "" : "item")
                }
              >
                <span className="text-gray-400">ITEM DESCRIPTION</span>
              </button>
              {openFormBlock === "item" && (
                <div className="mx-4">
                  <div className="flex flex-row px-4 items-center max-h-[12rem]">
                    <div>
                      <img
                        alt="Barcode"
                        className="w-[100px] object-contain"
                        src={barcodeImg}
                      />
                      {/* SKU */}
                      <p className="text-sm font-semibold text-gray-800 mt-2">
                        SKU: 123456789
                      </p>
                    </div>
                    {/* Vertical black line separator */}
                    <div className="flex flex-col m-10">
                      <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                        {/* Name */}
                        <p className="text-sm font-semibold text-gray-800">
                          Name
                        </p>
                        <p className="text-sm text-gray-700">Sample Item</p>

                        {/* Category */}
                        <p className="text-sm font-semibold text-gray-800">
                          Category
                        </p>
                        <p className="text-sm text-gray-700">Sample Category</p>

                        {/* Current Qty */}
                        <p className="text-sm font-semibold text-gray-800">
                          Current Qty
                        </p>
                        <p className="text-sm text-gray-700">100</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* ------------------------------------------------------------------------ */}

            {/* Stock Description */}
            <div className="border rounded bg-white mt-2">
              <button
                className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
                onClick={() =>
                  setOpenFormBlock(openFormBlock === "stock" ? "" : "stock")
                }
              >
                <span className="text-gray-400">STOCK DESCRIPTION</span>
              </button>
              {openFormBlock === "stock" && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Batch Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        name="batch_code"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Lower Threshold Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Lower Threshold Rate
                      </label>
                      <input
                        type="number"
                        name="lower_threshold"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Availability */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        name="availability"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="pre_order">Pre-order</option>
                      </select>
                    </div>
                    {/* Stock Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Stock Price
                      </label>
                      <input
                        type="number"
                        name="stock_price"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Retail Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Retail Price
                      </label>
                      <input
                        type="number"
                        name="retail_price"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Expire Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Expire Date
                      </label>
                      <input
                        type="date"
                        name="expire_date"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Discount % */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        name="discount_percentage"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Recent Batch code changes */}
                    <p className="text-sm font-semibold text-gray-800 mt-4">
                      Recent Batch Code Changes
                    </p>
                    <br />
                    <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden h-[13rem] pr-2">
                      <p className="text-sm text-gray-700 italic">
                        No batch code changes
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* ----------------------------------------------------------------------------- */}

            {/* Return Descrition */}
            <div className="border rounded bg-white mt-2">
              <button
                className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
                onClick={() =>
                  setOpenFormBlock(openFormBlock === "return" ? "" : "return")
                }
              >
                <span className="text-gray-400">RETURN DESCRIPTION</span>
              </button>
              {openFormBlock === "return" && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        name="sku"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Dispose Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Dispose Quantity
                      </label>
                      <input
                        type="number"
                        name="dispose_quantity"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Return Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      name="return_date"
                      className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows="4"
                      className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            {/* ----------------------------------------------------------------------------- */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReturnItem;
