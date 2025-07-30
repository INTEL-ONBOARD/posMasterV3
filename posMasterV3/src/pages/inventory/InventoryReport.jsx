import React, { useState } from "react";
import bananaImg from "../../assets/Inventory_banana.png";

export default function InventoryReport() {
  const [reportType, setReportType] = useState("basic");
  // Example inventory data
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: "1",
      name: "Banana",
      barcode: "SKU-37847324",
      category: "Fruit",
      price: "340.00",
      unit: "KG",
      sku: "SKU001",
      stock: 100,
      image: bananaImg,
    },
    {
      id: "2",
      name: "Apple",
      barcode: "SKU-5837324",
      category: "Fruit",
      price: "420.00",
      unit: "KG",
      sku: "SKU002",
      stock: 80,
      image: bananaImg,
    },
  ]);
  // Calculate summary statistics
  const totalItems = inventoryItems.length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.stock), 0);
  const lowStockItems = inventoryItems.filter(item => item.stock < 20).length;
  const categories = [...new Set(inventoryItems.map(item => item.category))];

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Basic CSV export
    const headers = ["ID", "Name", "Category", "Price", "Stock", "Unit", "SKU", "Total Value"];
    const csvContent = [
      headers.join(","),
      ...inventoryItems.map(item => [
        item.id,
        item.name,
        item.category,
        item.price,
        item.stock,
        item.unit,
        item.sku,
        (parseFloat(item.price) * item.stock).toFixed(2)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'inventory-report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex h-full bg-red-400">
      {/* Left panel */}
      <div className="w-72 bg-white h-[calc(100vh-7rem)] border-r flex flex-col">
        <div className="p-6">
          <div className="mb-2 bg-[#F8F8F8] rounded">
            <button 
              onClick={() => setReportType("basic")}
              className={`w-full text-left px-4 py-3 font-semibold flex items-center justify-between ${
                reportType === "basic" ? "text-blue-600 bg-blue-50" : "text-gray-500"
              }`}
            >
              BASIC REPORT
              <span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
          {/* <div className="mb-2 bg-[#F8F8F8] rounded">
            <button 
              onClick={() => setReportType("advanced")}
              className={`w-full text-left px-4 py-3 font-semibold flex items-center justify-between ${
                reportType === "advanced" ? "text-blue-600 bg-blue-50" : "text-gray-500"
              }`}
            >
              ADVANCED REPORT
              <span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div> */}
        </div>
      </div>

      {/* Right panel - Added scroll like ViewInventory */}
      <div className="h-[calc(100vh-7rem)] bg-white p-8 rounded flex-1">
        <h2 className="text-2xl font-bold text-gray-400 mb-6">INVENTORY REPORTS</h2>
        
        {inventoryItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <span className="text-sm text-gray-700 text-center">
              NO INVENTORY DATA AVAILABLE
            </span>
          </div>
        ) : (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600">Total Items</h3>
                <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600">Total Value</h3>
                <p className="text-2xl font-bold text-green-900">Rs.{totalValue.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-600">Low Stock Items</h3>
                <p className="text-2xl font-bold text-yellow-900">{lowStockItems}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600">Categories</h3>
                <p className="text-2xl font-bold text-purple-900">{categories.length}</p>
              </div>
            </div>

            {reportType === "basic" ? (
              /* Basic Report */
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-4">Basic Inventory Report</h3>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full h-[30rem] overflow-y-auto">
                  <table className="w-full border-collapse bg-white rounded">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="border px-4 py-2 text-left">Item Name</th>
                        <th className="border px-4 py-2 text-left">Category</th>
                        <th className="border px-4 py-2 text-left">Stock</th>
                        <th className="border px-4 py-2 text-left">Price</th>
                        <th className="border px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border px-4 py-2">{item.name}</td>
                          <td className="border px-4 py-2">{item.category}</td>
                          <td className="border px-4 py-2">{item.stock} {item.unit}</td>
                          <td className="border px-4 py-2">Rs.{item.price}</td>
                          <td className="border px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.stock < 20 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {item.stock < 20 ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            ) : (
              /* Advanced Report */
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Advanced Inventory Report</h3>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full h-[30rem] overflow-y-auto">
                  <table className="w-full border-collapse bg-white rounded">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr className="bg-gray-100">
                        <th className="border px-4 py-2 text-left">SKU</th>
                        <th className="border px-4 py-2 text-left">Item Name</th>
                        <th className="border px-4 py-2 text-left">Category</th>
                        <th className="border px-4 py-2 text-left">Stock</th>
                        <th className="border px-4 py-2 text-left">Unit Price</th>
                        <th className="border px-4 py-2 text-left">Total Value</th>
                        <th className="border px-4 py-2 text-left">Barcode</th>
                        <th className="border px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border px-4 py-2 font-mono text-sm">{item.sku}</td>
                          <td className="border px-4 py-2">{item.name}</td>
                          <td className="border px-4 py-2">{item.category}</td>
                          <td className="border px-4 py-2">{item.stock} {item.unit}</td>
                          <td className="border px-4 py-2">Rs.{item.price}</td>
                          <td className="border px-4 py-2">Rs.{(parseFloat(item.price) * item.stock).toFixed(2)}</td>
                          <td className="border px-4 py-2 font-mono text-sm">{item.barcode}</td>
                          <td className="border px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.stock < 20 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {item.stock < 20 ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex justify-between items-center gap-4 pt-4 border-t">
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>
              <div className="flex gap-4">
                <button className="px-8 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                  Clear
                </button>
                <button className="px-8 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}