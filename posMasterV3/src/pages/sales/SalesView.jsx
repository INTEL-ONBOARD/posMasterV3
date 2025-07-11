import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import bananaImg from "../../assets/Inventory_banana.png";
import Inventory_card from "../../frontend/components/Inventory_card";
import barcodeImg from "../../assets/barcode.png";

export default function SalesView() {
  const { setActiveSection } = useOutletContext();
  const [activeSection, setLocalActiveSection] = useState("sale-view");

  // Update parent's activeSection whenever local activeSection changes
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
  };
  
  const [scannedItems, setScannedItems] = useState([
    { id: 1, code: "XLR9590565", unitPrice: 3200.00, quantity: 30, unit: "pcs", total: 12300.00 },
    { id: 2, code: "XLR9590565", unitPrice: 3200.00, quantity: 1, unit: "pcs", total: 12300.00 },
    { id: 3, code: "XLR9590565", unitPrice: 3200.00, quantity: 200, unit: "ml", total: 12300.00 },
    { id: 4, code: "XLR9590565", unitPrice: 3200.00, quantity: 3.5, unit: "kg", total: 12300.00 },
  ]);

  const [scanCode, setScanCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  
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

   // Initialize filtered items with all items
  useEffect(() => {
    setFilteredItems(inventoryItems);
  }, [inventoryItems]);

  // Search functionality
  useEffect(() => {
    const searchItems = async () => {
      if (!scanCode.trim()) {
        setFilteredItems(inventoryItems);
        return;
      }

      setIsSearching(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const filtered = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(scanCode.toLowerCase()) ||
        item.sku.toLowerCase().includes(scanCode.toLowerCase()) ||
        item.category.toLowerCase().includes(scanCode.toLowerCase())
      );

      setFilteredItems(filtered);
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(searchItems, 300);
    return () => clearTimeout(debounceTimer);
  }, [scanCode, inventoryItems]);

  const handleScan = () => {
    console.log("Scanning:", scanCode);
    // Add barcode scanning logic here
  };

  // Payment dropdown states
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [creditDropdownOpen, setCreditDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("Member - 3 months");
  const [selectedCredit, setSelectedCredit] = useState("3 months");
  const [cashAmount, setCashAmount] = useState("0.00");

  const memberDropdownRef = useRef(null);
  const creditDropdownRef = useRef(null);

  // Member options
  const memberOptions = [
    { id: 1, label: "Member - 1 month", discount: 5 },
    { id: 2, label: "Member - 3 months", discount: 10 },
    { id: 3, label: "Member - 6 months", discount: 15 },
    { id: 4, label: "Member - 1 year", discount: 20 },
    { id: 5, label: "No Membership", discount: 0 }
  ];

  // Credit options
  const creditOptions = [
    { id: 1, label: "3 months", period: 3 },
    { id: 2, label: "6 months", period: 6 },
    { id: 3, label: "9 months", period: 9 }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target)) {
        setMemberDropdownOpen(false);
      }
      if (creditDropdownRef.current && !creditDropdownRef.current.contains(event.target)) {
        setCreditDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAmount = scannedItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = 450.00;
  const changeAmount = 450.00;

  

  const handleRemoveItem = (id) => {
    setScannedItems(items => items.filter(item => item.id !== id));
  };

  const handleProceedPayment = () => {
    console.log("Processing payment for:", totalAmount);
    console.log("Credit period:", selectedCredit);
    console.log("Membership:", selectedMember);
    console.log("Cash amount:", cashAmount);
  };

  const handleProductSelect = (item) => {
    console.log("Product selected:", item);
    // Add logic to add item to scanned items
  };

  const handleProductRemove = (id) => {
    console.log("Product removed:", id);
    // Add logic to remove item if needed
  };

  const [selectedTableItem, setSelectedTableItem] = useState(null);
  
  const handleTableRowClick = (item) => {
  // Convert scanned item format to inventory item format for display
  const displayItem = {
    id: item.id,
    name: "Banana", // You can map this to actual product name based on item.code
    category: "Fruit", // You can map this to actual category
    price: item.unitPrice.toFixed(2),
    unit: "1KG", // You can map this to actual unit
    sku: item.code,
    stock: `${item.quantity} Units`, // Current quantity in cart
    image: bananaImg, // You can map this to actual product image
    currentQuantity: item.quantity, // Current quantity in the cart
    unitType: item.unit
  };
  setSelectedTableItem(displayItem);
};
  const handleClearSelectedItem = () => {
    setSelectedTableItem(null);
  };



  // Helper function to check visibility
  const isVisible = (section) => activeSection === section ? "block" : "hidden";

  return (
    <div className="flex h-screen bg-[#EBEBEB] -ml-12">
      <SalesSidebar
        activeSection={activeSection}
        onSaleViewClick={() => handleSectionChange("sale-view")}
        onTransactionHistoryClick={() => handleSectionChange("transaction-history")}
        onInventoryViewClick={() => handleSectionChange("inventory-view")}
        onOffersDiscountClick={() => handleSectionChange("offers-discount")}
        onSalesConfigClick={() => handleSectionChange("sales-config")}
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
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={scanCode}
                          onChange={(e) => setScanCode(e.target.value)}
                          placeholder="Search Your Items here"
                          className="w-full px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleScan}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Search Results Info */}
                  {scanCode.trim() && (
                    <div className="text-sm text-gray-600 mb-2">
                      {isSearching ? (
                        <span>Searching...</span>
                      ) : (
                        <span>Found {filteredItems.length} result(s) for "{scanCode}"</span>
                      )}
                    </div>
                  )}
                </div>

               {/* Selected Table Item Display */}
{selectedTableItem && (
  <div className="bg-white border border-gray-300 rounded-lg shadow-sm flex-shrink-0">
    {/* Header with close button */}
    <div className="flex items-center justify-between p-3 border-b border-gray-200">
      <h3 className="font-semibold text-gray-800 text-sm">Selected from Cart</h3>
      <button
        onClick={handleClearSelectedItem}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    {/* Product Display */}
    <div className="p-4">
      {/* Product Image */}
      <div className="flex justify-center mb-4">
        <img 
          src={selectedTableItem.image} 
          alt={selectedTableItem.name}
          className="w-24 h-24 object-contain"
        />
      </div>

      {/* Product Details */}
      <div className="text-center mb-4">
        <div className="text-xs text-gray-500 mb-1">SKU {selectedTableItem.sku}</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{selectedTableItem.name}</h2>
        <div className="text-sm text-gray-600 mb-2">{selectedTableItem.category}</div>
        <div className="text-lg font-semibold text-gray-800">
          Rs.{selectedTableItem.price}/{selectedTableItem.unit}
        </div>
      </div>
       {/* Quantity Controls */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
        <div className="flex items-center justify-center gap-3">
          <button 
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
            onClick={() => {
              // Handle quantity decrease
              console.log("Decrease quantity");
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={selectedTableItem.currentQuantity}
              className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm"
              readOnly
            />
            <span className="text-sm text-gray-600">
              Available: {selectedTableItem.currentQuantity} {selectedTableItem.unitType}
            </span>
          </div>
          
          <button 
            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
            onClick={() => {
              // Handle quantity increase
              console.log("Increase quantity");
            }}
          > <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Available Discounts Section */}
      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm text-gray-600 mb-2">Available discounts ( * applied )</div>
        <div className="text-xs text-gray-500 italic">
          Default / No discounts are available
        </div>
      </div>
    </div>
  </div>
)}

                 {/* Inventory Cards - With Loading and No Results States */}
{!selectedTableItem && (
  <div className="flex-1 overflow-y-auto flex flex-col items-center py-4">
    {isSearching ? (
      // Loading State
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 text-lg font-medium">Loading items...</p>
        <p className="text-gray-400 text-sm">Please wait while we search</p>
      </div>
    ) : filteredItems.length === 0 ? (
      // No Results State
      <div className="flex flex-col items-center justify-center h-full">
        <div className="mb-6">
          <svg 
            className="w-20 h-20 text-gray-300" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119.993zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" 
            />
          </svg>
        </div>
        <h3 className="text-gray-500 text-xl font-semibold mb-2">No Items Found</h3>
        <p className="text-gray-400 text-center mb-4">
          {scanCode.trim() ? (
            <>No items match your search "<span className="font-medium">{scanCode}</span>"</>
          ) : (
            "No items available at the moment"
          )}
                    </p>
        {scanCode.trim() && (
          <button
            onClick={() => setScanCode("")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Clear Search
          </button>
        )}
      </div>
    ) : (
      // Items Display
      filteredItems.map((item) => (
        <div key={item.id} className="mb-2 transform scale-90">
          <Inventory_card
            item={item}
            onOpen={() => handleProductSelect(item)}
            onRemove={() => handleProductRemove(item.id)}
          />
        </div>
      ))
    )}
  </div>
)}
 
                
              </div>
            </div>
      

{/* Right Content */}
<div className="flex-1 flex flex-col h-screen">
  {/* Items Table - REDUCED HEIGHT */}
  <div className="bg-white mx-6 mt-6 mb-3 overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
    <div className="overflow-x-auto h-full">
      <table className="w-full">
        <thead className="bg-gray-700 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">#</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Item code</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Unit price(Rs.)</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Unit Quantity</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Total(Rs.)</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white">
  {scannedItems.map((item, index) => (
    <tr 
      key={item.id} 
      className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${
        selectedTableItem?.id === item.id ? 'bg-blue-100' : ''
      }`}
      onClick={() => handleTableRowClick(item)}
    >
              <td className="px-4 py-3 text-sm text-gray-700">#{index + 1}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{item.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">Rs.{item.unitPrice.toFixed(2)}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{item.quantity} ({item.unit})</td>
              <td className="px-4 py-3 text-sm text-gray-700">{item.total.toFixed(2)}</td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) =>{
                    e.stopPropagation();
                    handleRemoveItem(item.id)}}
                  className="w-6 h-6 bg-red-500 rounded flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

{/* Enhanced Payment Section - INCREASED HEIGHT */}
<div className="bg-white mx-6 mb-6 flex-shrink-0 shadow-sm" style={{ height: '300px' }}>
  <div className="p-8 h-full flex items-center justify-between">
    {/* Left side - Credit and Cash sections stacked */}
    <div className="flex items-center gap-3">
      
      {/* Credit and Cash Container */}
      <div className="flex flex-col gap-3">
        {/* Credit Button with Dropdown */}
        <div className="relative" ref={creditDropdownRef}>
          <button
            onClick={() => {
              setCreditDropdownOpen(!creditDropdownOpen);
              setMemberDropdownOpen(false);
            }}
            className="px-1 py-4 border-2 transition-all duration-200 w-[200px] bg-gray-600 text-white border-gray-600 hover:bg-gray-700 flex items-center justify-between"
          >
            <span className="font-medium">Credit</span>
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">{selectedCredit}</span>
            <svg 
              className={`w-4 h-4 ml-2 transition-transform duration-200 ${creditDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Credit Dropdown Menu */}
          <div className={`absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-200  shadow-lg z-50 transition-all duration-300 origin-bottom ${
            creditDropdownOpen 
              ? 'opacity-100 scale-y-100 translate-y-0' 
              : 'opacity-0 scale-y-95 translate-y-2 pointer-events-none'
          }`}>
            <div className="py-2">
              {creditOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedCredit(option.label);
                    setCreditDropdownOpen(false);
                  }}
                  className={`w-full text-left px-1 py-1 text-sm transition-all duration-150 flex items-center justify-between group ${
                    selectedCredit === option.label 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedCredit === option.label 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    {option.period}M
                  </span>
                  {selectedCredit === option.label && (
                    <svg className="w-4 h-4 text-blue-500 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Button with Amount Input */}
        <div className="flex items-center gap-3 px-2 py-2  border-2 border-gray-300 bg-gray-100 w-[150px]">
          <span className="font-medium text-gray-700">Cash</span>
          <input
            type="text"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="0.00 LKR"
            className="flex-1 bg-white px-1 py-1 text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Proceed Payment Button - Blue Arrow - MOVED CLOSER */}
      <button
        onClick={handleProceedPayment}
        className="bg-blue-600 text-white px-5 py-12 ml-4 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg group"
      >
        <svg 
          className="w-10 h-10 transition-transform duration-300 group-hover:translate-x-1" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>

    {/* Right side - Total Amount */}
    <div className="flex items-center gap-8">
      {/* Total Amount Section */}
      <div className="text-right">
        <div className="text-base text-gray-500 mb-2">
          <span>Discount Amount</span>
          <div className="text-xl font-bold text-gray-800">RS.{discountAmount.toFixed(2)}</div>
        </div>
        <div className="text-base text-gray-500 mb-2">
          <span>Change Amount</span>
          <div className="text-xl font-bold text-gray-800">RS.{changeAmount.toFixed(2)}</div>
        </div>
        <div className="text-base text-gray-500 mb-2">
          <span>Total Amount</span>
          <div className="text-3xl font-bold text-gray-800">RS.{totalAmount.toFixed(2)}</div>
        </div>
      </div>
    </div>
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