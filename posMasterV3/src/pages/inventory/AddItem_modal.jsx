import React, { useState } from "react";
import { X, Upload, Printer } from "lucide-react";

export default function AddItemModal({ isOpen, onClose, onSave ,formData, setFormData}) {
 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    // background around modal
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* modal */}
      <div className="bg-white rounded-lg p-10 w-1/2 mx-4">
        {/* title & close btn(top) */}
        <div className="flex items-center justify-between mb-6">
          {/* close button(top)*/}
          <button
            aria-label="Close"
            className="bg-black self-start rounded-full p-1 shadow hover:bg-gray-600 active:bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M6 18L18 6"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">ADD ITEM</h2>
        </div>

        {/* image upload and form(mid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* image uploading(left) */}
          <div className="flex flex-col items-center">
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-4 hover:border-gray-400 transition-colors">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <X className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <button className="px-4 py-2 bg-[#4A4A4A] text-white text-sm rounded-md hover:bg-gray-700 transition-colors">
              Upload a photo
            </button>
            <div className="flex flex-row">
              <p className="text-2xl text-black mt-2 mb-4">SKU :</p>
              <p className="text-2xl text-gray-600 mt-2 mb-4">RX3466</p>
            </div>
          </div>
          {/* item form(right) */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="item@gmail.com"
                className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Item Code
    </label>
    <input
      type="text"
      name="itemCode"
      value={formData.itemCode || ""}
      onChange={handleInputChange}
      placeholder="Enter item code"
      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="item@gmail.com"
                  className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">Available</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Low Stock">Low Stock</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold Limit
                </label>
                <input
                  type="number"
                  placeholder="12"
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Threshold
                </label>
                <input
                  type="number"
                  placeholder="12"
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="12"
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UOM
                </label>
                <select
                  name="uom"
                  value={formData.uom}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="KG">KG</option>
                  <option value="PCS">PCS</option>
                  <option value="LTR">LTR</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* bottom bar(bottom) */}
        <div className="flex justify-between space-x-3 mt-8 p-3 rounded-lg bg-[#F9F9F9]">
          <div className="flex flex-row items-center gap-3">
            <button className="flex items-center px-4 py-2 bg-[#D01710] text-white rounded-md hover:bg-red-600 transition-colors">
              <Printer className="w-4 h-4 mr-2 " />
            </button>
            <p>Print Barcode</p>
          </div>
          <div>
            <button
              onClick={onClose}
              className="px-6 py-2 mr-4 border bg-[#D01710] border-gray-300 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-[#1A318C] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
