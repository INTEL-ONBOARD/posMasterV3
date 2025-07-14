import React, { useState } from "react";

export default function OffersDiscountView() {
  const [selectedView, setSelectedView] = useState("View");
  const [itemInput, setItemInput] = useState("");
  const [packageInput, setPackageInput] = useState("");
  const [priceRangeInput, setPriceRangeInput] = useState("");

  // Sample discount data
  const [discounts] = useState([
    {
      id: 1,
      code: "XLR9590565",
      name: "Christmas bonus",
      type: "Package",
      amount: 30,
      unit: "%",
      status: "Available",
    },
    {
      id: 2,
      code: "XLR9590565",
      name: "Biscuit Discount",
      type: "Item",
      amount: 1,
      unit: "Rs off",
      status: "Disabled",
    },
    {
      id: 3,
      code: "XLR9590565",
      name: "Senior Discount",
      type: "Price Range",
      amount: 200,
      unit: "%",
      status: "Disabled",
    },
    {
      id: 4,
      code: "XLR9590565",
      name: "Student bonus",
      type: "Price Range",
      amount: 3.5,
      unit: "Rs off",
      status: "Available",
    },
  ]);

  const getStatusColor = (status) => {
    return status === "Available" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="flex h-screen bg-[#EBEBEB]">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Filter Options */}
        <div className="flex-1 p-6 space-y-4">
          {/* View Filter */}
         <div>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="View">View</option>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Item Input */}
          <div>
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              placeholder="Item"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Package Input */}
          <div >
            <input
              type="text"
              value={packageInput}
              onChange={(e) => setPackageInput(e.target.value)}
              placeholder="Package"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Price Range Input */}
          <div >
            <input
              type="text"
              value={priceRangeInput}
              onChange={(e) => setPriceRangeInput(e.target.value)}
              placeholder="Price Range"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Offers & Discounts
          </h1>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-white m-6 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto h-full">
            <table className="w-full">
              <thead className="bg-gray-600 text-white sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">#</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Discount code
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Discount Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Discount Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {discounts.map((discount, index) => (
                  <tr
                    key={discount.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-700">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {discount.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {discount.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {discount.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {discount.amount} ({discount.unit})
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${getStatusColor(
                          discount.status
                        )}`}
                      >
                        {discount.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white border-t px-6 py-4 flex justify-end space-x-3">
          <button className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
            Clear
          </button>
          <button className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}