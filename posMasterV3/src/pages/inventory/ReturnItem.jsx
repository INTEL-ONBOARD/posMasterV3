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
                <div className="mx-4">
                  <div className="flex flex-col px-4 py-2 max-h-[12rem]">
                    <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                      {/* Stock Type */}
                      <p className="text-sm font-semibold text-gray-800">
                        Stock Type
                      </p>
                      <p className="text-sm text-gray-700">Regular</p>
                      {/* Supplier */}
                      <p className="text-sm font-semibold text-gray-800">
                        Supplier
                      </p>
                      <p className="text-sm text-gray-700">Sample Supplier</p>
                      {/* Purchase Date */}
                      <p className="text-sm font-semibold text-gray-800">
                        Purchase Date
                      </p>
                      <p className="text-sm text-gray-700">2024-01-01</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* ----------------------------------------------------------------------------- */}

            {/* Return Description */}
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
                <div className="mx-4">
                  <div className="flex flex-col px-4 py-2 max-h-[12rem]">
                    <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                      {/* Return Qty */}
                      <p className="text-sm font-semibold text-gray-800">
                        Return Qty
                      </p>
                      <p className="text-sm text-gray-700">10</p>
                      {/* Return Reason */}
                      <p className="text-sm font-semibold text-gray-800">
                        Return Reason
                      </p>
                      <p className="text-sm text-gray-700">Damaged</p>
                    </div>
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
