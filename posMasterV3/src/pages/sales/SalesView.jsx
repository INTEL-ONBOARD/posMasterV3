import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import bananaImg from "../../assets/Inventory_banana.png";
import Inventory_card from "../../frontend/components/Inventory_card";
import SalesItemCard from "../../components/SalesItemCard";
import barcodeImg from "../../assets/barcode.png";
import OffersDiscountView from "./OffersDiscountView";

//image imports
import clearBtnImg from "../../assets/sales_clear.png";
import sidebarHoldOrderBtnImg from "../../assets/sales_hold_order.png";
import sidebarPaymentBtnImg from "../../assets/sales_proceed_payment.png";

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
    {
      id: 1,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 30,
      unit: "pcs",
      total: 12300.0,
    },
    {
      id: 2,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 1,
      unit: "pcs",
      total: 12300.0,
    },
    {
      id: 3,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 200,
      unit: "ml",
      total: 12300.0,
    },
    {
      id: 4,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 3.5,
      unit: "kg",
      total: 12300.0,
    },
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
      image: bananaImg,
    },
    {
      id: 2,
      name: "Banana",
      category: "Fruits",
      price: "340.00",
      unit: "1KG",
      sku: "SKY3486",
      stock: "20 KG",
      image: bananaImg,
    },
    {
      id: 3,
      name: "Orange",
      category: "Fruits",
      price: "380.00",
      unit: "1KG",
      sku: "ORG3488",
      stock: "25 KG",
      image: bananaImg,
    },
    {
      id: 4,
      name: "Mango",
      category: "Fruits",
      price: "520.00",
      unit: "1KG",
      sku: "MNG3489",
      stock: "12 KG",
      image: bananaImg,
    },
    {
      id: 5,
      name: "Grapes",
      category: "Fruits",
      price: "680.00",
      unit: "1KG",
      sku: "GRP3490",
      stock: "8 KG",
      image: bananaImg,
    },
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
      await new Promise((resolve) => setTimeout(resolve, 500));

      const filtered = inventoryItems.filter(
        (item) =>
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
    { id: 5, label: "No Membership", discount: 0 },
  ];

  // Credit options
  const creditOptions = [
    { id: 1, label: "3 months", period: 3 },
    { id: 2, label: "6 months", period: 6 },
    { id: 3, label: "9 months", period: 9 },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target)
      ) {
        setMemberDropdownOpen(false);
      }
      if (
        creditDropdownRef.current &&
        !creditDropdownRef.current.contains(event.target)
      ) {
        setCreditDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalAmount = scannedItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = 450.0;
  const changeAmount = 450.0;

  const handleRemoveItem = (id) => {
    setScannedItems((items) => items.filter((item) => item.id !== id));
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
      unitType: item.unit,
    };
    setSelectedTableItem(displayItem);
  };
  const handleClearSelectedItem = () => {
    setSelectedTableItem(null);
  };

  // Helper function to check visibility
  const isVisible = (section) =>
    activeSection === section ? "block" : "hidden";

  return (
    <div className="flex h-screen bg-[#EBEBEB] -ml-12">
      <SalesSidebar
        activeSection={activeSection}
        onSaleViewClick={() => handleSectionChange("sale-view")}
        onTransactionHistoryClick={() =>
          handleSectionChange("transaction-history")
        }
        onInventoryViewClick={() => handleSectionChange("inventory-view")}
        onOffersDiscountClick={() => handleSectionChange("offers-discount")}
        onSalesConfigClick={() => handleSectionChange("sales-config")}
      />

      {/* Main Content */}
      <div className="flex-1">
        <div className={isVisible("sale-view")}>
          <div className="flex h-[calc(100vh-6rem)] bg-[#EBEBEB] w-[calc(100vw-23rem)]">
            {/* Item list section(left) */}
            <div className="bg-[#EBEBEB] border-r flex flex-col h-full">
              <div className="p-6 space-y-4 flex flex-col h-full">
                {/* Scanner Section */}
                <div className="bg-[#F8F8F8] p-4 flex-shrink-0">
                  {/* Barcode Image and Search Bar - Parallel */}
                  <div className="flex flex-row items-center gap-4 mb-4">
                    {/* Back button */}


                    {/* Search Bar */}
                    {/* <div className="flex-1 flex gap-2">
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </button>
                    </div> */}
                    <div className="w-full flex flex-col gap-3">

                      <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
                        <input
                          type="text"
                          value={scanCode}
                          onChange={(e) => setScanCode(e.target.value)}
                          placeholder="Search Your Items here"
                          className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
                        />
                        <button
                          className="flex items-center px-4 py-2 bg-[#1A318C] text-white"
                          onClick={handleScan}
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                          </svg>
                          Search
                        </button>
                      </div>


                      <div className="flex flex-row gap-3">

                        <label className="relative">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 w-0 h-0 peer"
                            name="category"
                            value="fruit"
                          />
                          <div className="py-2 px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer peer-checked:border-blue-500">
                            <span>Fruit</span>
                            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center peer-checked:bg-blue-100 peer-checked:text-blue-500">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          </div>
                        </label>


                        <label className="relative">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 w-0 h-0 peer"
                            name="category"
                            value="vegetable"
                          />
                          <div className="py-2 px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer peer-checked:border-blue-500">
                            <span>Vegetable</span>
                            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center peer-checked:bg-blue-100 peer-checked:text-blue-500">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          </div>
                        </label>

                        <label className="relative">
                          <input
                            type="checkbox"
                            className="absolute opacity-0 w-0 h-0 peer"
                            name="category"
                            value="dairy"
                          />
                          <div className="py-2 px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer peer-checked:border-blue-500">
                            <span>Dairy</span>
                            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center peer-checked:bg-blue-100 peer-checked:text-blue-500">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Search Results Info */}
                  {scanCode.trim() && (
                    <div className="text-sm w-full text-gray-600 mb-2">
                      {isSearching ? (
                        <span>Searching...</span>
                      ) : (
                        <span>
                          Found {filteredItems.length} result(s) for "{scanCode}
                          "
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Table Item Display */}
                {selectedTableItem && (
                  <div className="bg-white border border-gray-300 rounded-lg shadow-sm flex-shrink-0">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        Selected from Cart
                      </h3>
                      <button
                        onClick={handleClearSelectedItem}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
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
                        <div className="text-xs text-gray-500 mb-1">
                          SKU {selectedTableItem.sku}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-1">
                          {selectedTableItem.name}
                        </h2>
                        <div className="text-sm text-gray-600 mb-2">
                          {selectedTableItem.category}
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          Rs.{selectedTableItem.price}/{selectedTableItem.unit}
                        </div>
                      </div>
                      {/* Quantity Controls */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                            onClick={() => {
                              // Handle quantity decrease
                              console.log("Decrease quantity");
                            }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 12H4"
                              />
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
                              Available: {selectedTableItem.currentQuantity}{" "}
                              {selectedTableItem.unitType}
                            </span>
                          </div>

                          <button
                            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                            onClick={() => {
                              // Handle quantity increase
                              console.log("Increase quantity");
                            }}
                          >
                            {" "}
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Available Discounts Section */}
                      <div className="border-t border-gray-200 pt-3">
                        <div className="text-sm text-gray-600 mb-2">
                          Available discounts ( * applied )
                        </div>
                        <div className="text-xs text-gray-500 italic">
                          Default / No discounts are available
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Cards - With Loading and No Results States */}
                {!selectedTableItem && (
                  <div className="flex-1 overflow-y-scroll overflow-x-hidden flex flex-col items-center py-5 max-w-[57rem]">
                    {isSearching ? (
                      // Loading State
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500 text-lg font-medium">
                          Loading items...
                        </p>
                        <p className="text-gray-400 text-sm">
                          Please wait while we search
                        </p>
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
                        <h3 className="text-gray-500 text-xl font-semibold mb-2">
                          No Items Found
                        </h3>
                        <p className="text-gray-400 text-center mb-4">
                          {scanCode.trim() ? (
                            <>
                              No items match your search "
                              <span className="font-medium">{scanCode}</span>"
                            </>
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

                      <div className="grid sm:grid-cols-1 md:grid-cols-2">
                        {filteredItems.map((item) => (
                          <div key={item.id} className="transform scale-90">
                            <SalesItemCard
                              item={item}
                              onOpen={() => handleProductSelect(item)}
                            />
                          </div>
                        ))}
                      </div>
                    )

                    }
                  </div>
                )}
              </div>
            </div>

            {/* item table section(right) */}
            <div className="flex-1 p-3 flex w-[30rem] flex-col h-[calc(100vh-7rem)]">
              {/* Items Table - REDUCED HEIGHT */}
              <div
                className="bg-white overflow-hidden"
                style={{ height: "calc(100vh - 300px)" }}
              >
                {/* member container */}
                <div className="border-2 p-5 my-5 border-orange-500 bg-[#FFF5E9] h-[15rem]">
                  <div className="flex flex-row justify-between">
                    <span className="font-semibold ">Member 123456</span>
                    <button className="px-6 bg-[#FFE0B4] border-2 border-orange-500 p-1 rounded-2xl">Change</button>
                  </div>
                </div>
                {/* item table */}
                <div className="overflow-x-auto h-full">
                  <table className="w-full">
                    <thead className="bg-gray-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Item code
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Unit price(Rs.)
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Total(Rs.)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {scannedItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${selectedTableItem?.id === item.id
                              ? "bg-blue-100"
                              : ""
                            }`}
                          onClick={() => handleTableRowClick(item)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.code}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            Rs.{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.total.toFixed(2)}
                          </td>
                          {/* <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(item.id);
                              }}
                              className="w-6 h-6 bg-red-500 rounded flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white">
                {/* Amounts */}
                <div className="grid grid-cols-2 p-3">
                  <div className="p-2 bg-[#D9D9D9] text-base text-gray-500">Discount Amount</div>
                  <div className="p-2 bg-[#D9D9D9] text-xl font-normal text-gray-800 text-right">
                    RS.{discountAmount.toFixed(2)}
                  </div>
                  <div className="p-2 bg-[#F8F8F8] text-base text-gray-500">Change Amount</div>
                  <div className="p-2 bg-[#F8F8F8] text-xl font-normal text-gray-800 text-right">
                    RS.{changeAmount.toFixed(2)}
                  </div>
                  <div className="p-2 bg-[#5C5C5C] text-base text-gray-500">Total Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-xl font-semibold text-white text-right">
                    RS.{totalAmount.toFixed(2)}
                  </div>
                </div>
                {/* payment button controls*/}
                <div className="flex flex-row justify-between px-3">
                  <button className="px-4 py-3 mb-4 bg-[#727272] text-white text-sm hover:bg-gray-700 transition-colors flex items-center">
                    <img src={clearBtnImg} alt="Clear" className="w-4 h-4 mr-2" />
                    Clear
                  </button>

                  <button className="px-4 py-3 mb-4 bg-[#EB8928] text-white text-sm hover:bg-orange-500 transition-colors flex items-center">
                    <img src={sidebarHoldOrderBtnImg} alt="Hold Order" className="w-4 h-4 mr-2" />
                    Hold Order
                  </button>

                  <button className="px-4 py-3 mb-4 bg-[#1A318C] text-white text-sm hover:bg-blue-700 transition-colors flex items-center">
                    <img src={sidebarPaymentBtnImg} alt="Proceed Payment" className="w-4 h-4 mr-2" />
                    Proceed Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
          <OffersDiscountView />
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
