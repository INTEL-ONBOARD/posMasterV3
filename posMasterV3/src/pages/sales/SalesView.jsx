import React, { useState } from "react";
import SalesSidebar from "./Sales_sidebar";
import bananaImg from "../../assets/Inventory_banana.png";
import Inventory_card from "../../frontend/components/Inventory_card";
import barcodeImg from "../../assets/barcode.png";

export default function SalesView() {
  const [activeSection, setActiveSection] = useState("sale-view");
  
  const [scannedItems, setScannedItems] = useState([
    { id: 1, code: "XLR9590565", unitPrice: 3200.00, quantity: 30, unit: "pcs", total: 12300.00 },
    { id: 2, code: "XLR9590565", unitPrice: 3200.00, quantity: 1, unit: "pcs", total: 12300.00 },
    { id: 3, code: "XLR9590565", unitPrice: 3200.00, quantity: 200, unit: "ml", total: 12300.00 },
    { id: 4, code: "XLR9590565", unitPrice: 3200.00, quantity: 3.5, unit: "kg", total: 12300.00 },
  ]);

  const [scanCode, setScanCode] = useState("");
  
  // Sample inventory items
  const [inventoryItems] = useState([
    {
      id: 1,
      name: "Banana",
      category: "Fruits",
      price: "340.00",
      unit: "1KG",
      sku: "SKY3486",
      stock: "20 KG",
      image: bananaImg
    },
    {
      id: 2,
      name: "Banana",
      category: "Fruits",
      price: "340.00",
      unit: "1KG",
      sku: "SKY3486",
      stock: "20 KG",
      image: bananaImg
    },
     {
      id: 3,
      name: "Orange",
      category: "Fruits",
      price: "380.00",
      unit: "1KG",
      sku: "ORG3488",
      stock: "25 KG",
      image: bananaImg
    },
    {
      id: 4,
      name: "Mango",
      category: "Fruits",
      price: "520.00",
      unit: "1KG",
      sku: "MNG3489",
      stock: "12 KG",
      image: bananaImg
    },
    {
      id: 5,
      name: "Grapes",
      category: "Fruits",
      price: "680.00",
      unit: "1KG",
      sku: "GRP3490",
      stock: "8 KG",
      image: bananaImg
    }
  ]);

  const totalAmount = scannedItems.reduce((sum, item) => sum + item.total, 0);

  const handleScan = () => {
    console.log("Scanning:", scanCode);
  };

  const handleRemoveItem = (id) => {
    setScannedItems(items => items.filter(item => item.id !== id));
  };

  const handleProceedPayment = () => {
    console.log("Processing payment for:", totalAmount);
  };

  const handleProductSelect = (item) => {
    console.log("Product selected:", item);
    // Add logic to add item to scanned items
  };

  const handleProductRemove = (id) => {
    console.log("Product removed:", id);
    // Add logic to remove item if needed
  };

  // Helper function to check visibility
  const isVisible = (section) => activeSection === section ? "block" : "hidden";

  return (
    <div className="flex h-screen bg-[#EBEBEB] -ml-12">
      {/* Sales Sidebar */}
      <SalesSidebar
        activeSection={activeSection}
        onSaleViewClick={() => setActiveSection("sale-view")}
        onTransactionHistoryClick={() => setActiveSection("transaction-history")}
        onInventoryViewClick={() => setActiveSection("inventory-view")}
        onOffersDiscountClick={() => setActiveSection("offers-discount")}
        onSalesConfigClick={() => setActiveSection("sales-config")}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Sale View Section */}
        <div className={isVisible("sale-view")}>
          <div className="flex h-screen bg-[#EBEBEB]">
            {/* Left Scanner Panel */}
            <div className="w-90 bg-white border-r flex flex-col h-full">
              <div className="p-6 space-y-4 flex flex-col h-full">
                {/* Scanner Section */}
                <div className="bg-[#F8F8F8] p-4 flex-shrink-0">
                  
                  {/* Barcode Image and Search Bar - Parallel */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* Barcode Image */}
                    <div className="bg-white p-2 rounded border shadow-sm flex flex-col items-center">
                      <h3 className="font-semibold text-gray-700 mb-1 text-center">Scan</h3>
                      <img 
                        src={barcodeImg} 
                        alt="Barcode" 
                        className="w-12 h-6 object-contain"
                      />
                    </div>
                    
                    {/* Search Bar */}
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={scanCode}
                        onChange={(e) => setScanCode(e.target.value)}
                        placeholder="Search Your Items here"
                        className="flex-1 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleScan}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                  {/* Inventory Cards - Centered in left panel */}
                <div className="flex-1 overflow-y-auto flex flex-col items-center py-4">
                  {inventoryItems.map((item) => (
                    <div key={item.id} className="mb-2 transform scale-90">
                      <Inventory_card
                        item={item}
                        onOpen={() => handleProductSelect(item)}
                        onRemove={() => handleProductRemove(item.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 flex flex-col h-screen">
              {/* Items Table */}
              <div className="bg-white m-6  overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
                <div className="overflow-x-auto h-full">
                  <table className="w-full">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Item code</th>
                        <th className="px-4 py-3 text-left">Unit price(Rs.)</th>
                        <th className="px-4 py-3 text-left">Unit Quantity</th>
                        <th className="px-4 py-3 text-left">Total(Rs.)</th>
                        <th className="px-4 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedItems.map((item, index) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">#{index + 1}</td>
                          <td className="px-4 py-3">{item.code}</td>
                          <td className="px-4 py-3">Rs.{item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3">{item.quantity} ({item.unit})</td>
                          <td className="px-4 py-3">{item.total.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white mx-6 mb-3  p-4 flex-shrink-0" style={{ marginTop: '-20px' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-500  flex items-center justify-center">
                        <span className="text-white font-bold text-sm">$</span>
                      </div>
                      <span className="text-gray-600">Member - 3 months</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500  flex items-center justify-center">
                        <span className="text-white font-bold text-sm">$</span>
                      </div>
                      <span className="text-gray-600">Cash</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold">RS.{totalAmount.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={handleProceedPayment}
                    className="bg-blue-600 text-white px-8 py-3  hover:bg-blue-700 flex items-center gap-2"
                  >
                    Proceed Payment
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other sections remain the same */}
        <div className={isVisible("transaction-history")}>
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
            <p>Transaction history content will go here...</p>
          </div>
        </div>

        <div className={isVisible("inventory-view")}>
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Inventory View</h2>
            <p>Inventory view content will go here...</p>
          </div>
        </div>

        <div className={isVisible("offers-discount")}>
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Offers and Discount View</h2>
            <p>Offers and discount content will go here...</p>
          </div>
        </div>

        <div className={isVisible("sales-config")}>
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Sales Configurations</h2>
            <p>Sales configurations content will go here...</p>
          </div>
        </div>
      </div>
    </div>
  );
}