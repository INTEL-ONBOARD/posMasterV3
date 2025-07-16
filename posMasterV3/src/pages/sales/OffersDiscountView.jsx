import React, { useState } from "react";
function ItemSection() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Item Discounts</h2>
      <p>Item-related filter UI goes here...</p>
    </div>
  );
}

function PackageSection() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Package Discounts</h2>
      <p>Package-related filter UI goes here...</p>
    </div>
  );
}

function PriceRangeSection() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Price Range Discounts</h2>
      <p>Price range-related filter UI goes here...</p>
    </div>
  );
}

export default function OffersDiscountView() {
  const [selectedSection, setSelectedSection] = useState("view");

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

  const getStatusColor = (status) =>
    status === "Available" ? "text-green-600" : "text-red-600";

  const ViewSection = () => (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Offers & Discounts</h1>
      </div>

      {/* Table */}
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
            <tbody className="bg-white">
              {discounts.map((discount, index) => (
                <tr
                  key={discount.id}
                  className={`border-b hover:bg-blue-50 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                >
                  <td className="px-6 py-4 text-sm">#{index + 1}</td>
                  <td className="px-6 py-4 text-sm">{discount.code}</td>
                  <td className="px-6 py-4 text-sm font-medium">{discount.name}</td>
                  <td className="px-6 py-4 text-sm font-medium">{discount.type}</td>
                  <td className="px-6 py-4 text-sm font-medium">
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

      {/* Buttons */}
      <div className="bg-white border-t px-6 py-4 flex justify-end space-x-3">
        <button className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Clear
        </button>
        <button className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">
          Save
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-[#EBEBEB]">
      {/* Left panel */}
      <div className="w-1/3 bg-white border-r flex flex-col">
        <div className="p-6">
          {[
            { id: "view", label: "View" },
            { id: "item", label: "Item" },
            { id: "package", label: "Package" },
            { id: "price-range", label: "Price Range" },
          ].map((section) => (
            <div key={section.id} className="mb-2 bg-[#F8F8F8]">
              <button
                onClick={() => setSelectedSection(section.id)}
                className={`w-full text-left px-4 py-3 font-semibold flex items-center justify-between ${selectedSection === section.id ? "text-blue-600" : "text-gray-500"
                  }`}
              >
                {section.label}
                {selectedSection === section.id && (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>

          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1">
        <div className={selectedSection === "view" ? "block h-full" : "hidden"}>
          <ViewSection />
        </div>
        <div className={selectedSection === "item" ? "block h-full" : "hidden"}>
          <ItemSection />
        </div>
        <div className={selectedSection === "package" ? "block h-full" : "hidden"}>
          <PackageSection />
        </div>
        <div className={selectedSection === "price-range" ? "block h-full" : "hidden"}>
          <PriceRangeSection />
        </div>
      </div>
    </div>
  );
}
