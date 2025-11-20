import React, { useState } from "react";
import barcodeImg from "../../assets/barcode.png";
import { ChevronDown, Printer, ChevronUp } from "lucide-react";
import AddItemCard from "../../components/AddItemCard.jsx";

function DisposeItem({isActive}) {
  const [openFormBlock, setOpenFormBlock] = useState("item");

  return (
    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* Form section left */}
      <div className="bg-white w-[28rem] h-full p-4 z-10">
        <div className="flex flex-col h-full gap-6">
          {/* Item description box */}
          <div className="border rounded bg-white p-4">
            {/* Item description block */}
            <div className="border rounded bg-white mb-4">
              <button
                className="w-full flex justify-between items-center bg-white px-4 py-3 text-lg font-bold"
                onClick={() =>
                  setOpenFormBlock(openFormBlock === "item" ? "" : "item")
                }
              >
                <span className="text-gray-400">ITEM DESCRIPTION</span>
                {openFormBlock == "item" ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openFormBlock === "item" && (
                <div className="mt-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <img
                        alt="Barcode"
                        className="w-[100px] object-contain"
                        src={barcodeImg}
                      />
                      <p className="text-sm font-semibold text-gray-800 mt-2">
                        SKU: 123456789
                      </p>
                    </div>
                    <div className="flex flex-col">
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                        <p className="text-sm font-semibold text-gray-800">
                          Name
                        </p>
                        <p className="text-sm text-gray-700">Sample Item</p>

                        <p className="text-sm font-semibold text-gray-800">
                          Category
                        </p>
                        <p className="text-sm text-gray-700">Sample Category</p>

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

            {/* Stock Description */}
            <div className="border rounded bg-white mb-4">
              <button
                className="w-full flex justify-between items-center bg-white px-4 py-3 text-lg font-bold"
                onClick={() =>
                  setOpenFormBlock(openFormBlock === "stock" ? "" : "stock")
                }
              >
                <span className="text-gray-400">STOCK DESCRIPTION</span>
                {openFormBlock == "item" ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openFormBlock === "stock" && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        name="batch_code"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Lower Threshold Rate
                      </label>
                      <input
                        type="number"
                        name="lower_threshold"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Availability
                      </label>
                      <select
                        name="availability"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="pre_order">Pre-order</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Stock Price
                      </label>
                      <input
                        type="number"
                        name="stock_price"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Retail Price
                      </label>
                      <input
                        type="number"
                        name="retail_price"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Expire Date
                      </label>
                      <input
                        type="date"
                        name="expire_date"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        name="discount_percentage"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mt-6">
                    Recent Batch Code Changes
                  </p>
                  <div className="flex flex-col gap-3 overflow-y-auto h-[10rem] mt-2">
                    <p className="text-sm text-gray-700 italic">
                      No batch code changes
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dispose Description */}
            <div className="border rounded bg-white">
              <button
                className="w-full flex justify-between items-center bg-white px-4 py-3 text-lg font-bold"
                onClick={() =>
                  setOpenFormBlock(openFormBlock === "return" ? "" : "return")
                }
              >
                <span className="text-gray-400">DISPOSE DESCRIPTION</span>
                {openFormBlock == "item" ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openFormBlock === "return" && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        SKU
                      </label>
                      <input
                        type="text"
                        name="sku"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Dispose Quantity
                      </label>
                      <input
                        type="number"
                        name="dispose_quantity"
                        className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Return Date
                    </label>
                    <input
                      type="date"
                      name="return_date"
                      className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows="4"
                      className="w-full px-3 py-2 border bg-gray-100 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Form Selection left section end */}

      {/* ------------------------------------------------------------------------------ */}
      {/* Mid Section */}
      <div className="flex-1 bg-gray-50 p-6 shadow-md rounded-md">
        {/* Search by name/sku/batchcode : search button Category Drop Down -> Those should be in the same line*/}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by Name / SKU / Batch Code"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* add search icon */}
          <button className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Search
            <span></span>
          </button>
          <select className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Categories</option>
            <option value="category1">Category 1</option>
            <option value="category2">Category 2</option>
          </select>
        </div>

        {/* Table View */}
        {/* Table -> heading dark gray, font light gray */}
        {/* Columns : SKU, Status, Qty, Stock Price */}
        <div className="overflow-y-auto h-[calc(100vh-10rem)]">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-800 text-gray-300">
                <th className="px-4 py-2 border-b border-gray-700 text-left">
                  SKU
                </th>
                <th className="px-4 py-2 border-b border-gray-700 text-left">
                  Status
                </th>
                <th className="px-4 py-2 border-b border-gray-700 text-left">
                  Qty
                </th>
                <th className="px-4 py-2 border-b border-gray-700 text-left">
                  Stock Price
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Sample Row */}
              <tr className="hover:bg-gray-100">
                <td className="px-4 py-2 border-b border-gray-200">
                  123456789
                </td>
                <td className="px-4 py-2 border-b border-gray-200">In Stock</td>
                <td className="px-4 py-2 border-b border-gray-200">50</td>
                <td className="px-4 py-2 border-b border-gray-200">$10.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Mid Section end */}

      {/* ------------------------------------------------------------------------------- */}
      {/* Right Section */}
      <div className="flex-1 w-[20rem] bg-gray-100 p-4">
        {/* Search bar with search button and icon */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search your item code"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span>Search</span>
          </button>
        </div>

        {/* Category and Stock Availability Drop Down in the same line */}
        <div className="flex items-center gap-4 mb-6">
          <select className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Category</option>
            <option value="category1">Category 1</option>
            <option value="category2">Category 2</option>
          </select>
          <select className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Availability</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        {/* Item Cards  */}
        <div className="flex flex-col gap-4 overflow-y-auto h-[calc(100vh-16rem)]">
          <AddItemCard item={INITIAL_FORM_DATA} />
        </div>
      </div>
      {/* Right Section end */}

      {/*  */}
    </div>
  );
}

export default DisposeItem;

// uncompleted empty form‐data state(new api)
const INITIAL_FORM_DATA = {
  _id: "",
  id: 0,
  stock_trace: [0],
  item_name: "",
  item_image_url: "",
  sku: "",
  maximum_capacity: 0,
  uom_id: 0,
  category_id: 0,
  inventory_id: 1,
  item_update_datetime: "",
  item_created_datetime: "",
  __v: 0,
  uom: {
    _id: "",
    id: 0,
    symbol: "",
    unit_name: "",
    __v: 0,
  },
  category: {
    _id: "",
    id: 0,
    brand: "",
    type: "",
    __v: 0,
  },
  inventory: null,
  availability: true,
};
