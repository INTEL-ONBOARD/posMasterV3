import React, { useState } from "react";

export default function OffersDiscountView() {
  const [selectedView, setSelectedView] = useState("View");
  const [selectedItem, setSelectedItem] = useState("Item");
  const [selectedPackage, setSelectedPackage] = useState("Package");
  const [selectedPriceRange, setSelectedPriceRange] = useState("Price range");

  // Sample discount data
  const [discounts] = useState([
    {
      id: 1,
      code: "XLR9590565",
      name: "Christmas bonus",
      type: "Package",
      amount: 30,
      unit: "%",
      status: "Available"
    },
    {
      id: 2,
      code: "XLR9590565", 
      name: "Biscuit Discount",
      type: "Item",
      amount: 1,
      unit: "Rs off",
      status: "Disabled"
    },
    {
      id: 3,
      code: "XLR9590565",
      name: "Senior Discount", 
      type: "Price Range",
      amount: 200,
      unit: "%",
      status: "Disabled"
    },
    {
      id: 4,
      code: "XLR9590565",
      name: "Student bonus",
      type: "Price Range", 
      amount: 3.5,
      unit: "Rs off",
      status: "Available"
    }
  ]);

  const getStatusColor = (status) => {
    return status === "Available" ? "text-green-600" : "text-red-600";
  };

  const getTypeColor = (type) => {
    switch(type) {
      case "Package": return "bg-blue-100 text-blue-800";
      case "Item": return "bg-green-100 text-green-800"; 
      case "Price Range": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-screen bg-[#EBEBEB]">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
         
        </div>

        {/* Filter Options */}
        <div className="flex-1 p-6 space-y-6">
          {/* View Filter */}
          <div>
            
            <select 
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="View">View</option>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Item Filter */}
          <div>
            
            <select 
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Item">Item</option>
              <option value="All Items">All Items</option>
              <option value="Biscuits">Biscuits</option>
              <option value="Beverages">Beverages</option>
              <option value="Fruits">Fruits</option>
            </select>
          </div>

          {/* Package Filter */}
          <div>
            
            <select 
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Package">Package</option>
              <option value="Christmas Package">Christmas Package</option>
              <option value="Holiday Package">Holiday Package</option>
              <option value="Student Package">Student Package</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
           
            <select 
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Price range">Price range</option>
              <option value="0-100">Rs. 0 - 100</option>
              <option value="100-500">Rs. 100 - 500</option>
              <option value="500-1000">Rs. 500 - 1000</option>
              <option value="1000+">Rs. 1000+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Offers & Discounts</h1>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-white m-6 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto h-full">
            <table className="w-full">
              <thead className="bg-gray-600 text-white sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">#</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Discount code</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Discount Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Discount Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {discounts.map((discount, index) => (
                  <tr 
                    key={discount.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm text-gray-700">#{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{discount.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{discount.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(discount.type)}`}>
                        {discount.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {discount.amount} ({discount.unit})
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${getStatusColor(discount.status)}`}>
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