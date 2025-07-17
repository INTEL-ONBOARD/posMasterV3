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
  const [salesMiddlepage, setSalesMiddlepage] = useState("defalut menu");

  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Members data should be provided here
  const members = [];

  const handleSearch = (value) => {
    setSearchTerm(value);

    if (value.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Filter members based on search term
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(value.toLowerCase()) ||
      member.memberId.includes(value) ||
      member.phone.includes(value)
    );

    setSearchResults(filtered);
  };

  const handleGuestClick = () => {
    setSearchTerm('Guest');
    setSearchResults([]);
  };

  const handleMemberSelect = (member) => {
    setSearchTerm(`${member.name} (${member.memberId})`);
    setSearchResults([]);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

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
      <div className="flex-1 min-w-0">
        <div className={isVisible("sale-view")}>
          <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] bg-[#EBEBEB] w-full">
            {/* Item list section(left) */}
            <div className="bg-[#EBEBEB] border-r flex flex-col h-full w-full lg:flex-1">
              <div className="p-3 lg:p-6 space-y-4 flex flex-col h-full">

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

                {/* Sales middle default page*/}
                {salesMiddlepage === "defalut menu" && (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col lg:flex-row items-start py-5 w-full gap-4 lg:gap-6">
                    {/* Left Section */}
                    <div className="w-full lg:w-1/3 h-64 lg:h-full bg-gray-400 flex items-center justify-center rounded-xl shadow-md p-6">
                      <p className="text-lg text-black">User Details here</p>
                    </div>

                    {/* Right Section */}
                    <div className="w-full lg:w-2/3 flex flex-col gap-4 lg:gap-6">
                      {/* Inventory View Button */}
                      <button
                        onClick={() => setSalesMiddlepage("inventory view")}
                        className="h-[200px] lg:h-[250px] xl:h-[300px] w-full bg-gray-800 rounded-xl shadow-md flex items-center justify-center hover:bg-gray-700 transition p-4"
                      >
                        <p className="text-white text-lg">Inventory View</p>
                      </button>

                      {/* Discount View Button */}
                      <button
                        onClick={() => setSalesMiddlepage("discount view")}
                        className="h-[200px] lg:h-[250px] xl:h-[300px] w-full bg-gray-800 rounded-xl shadow-md flex items-center justify-center hover:bg-gray-700 transition p-4"
                      >
                        <p className="text-white text-lg">Discount View</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Discount View Page */}
                {salesMiddlepage === "discount view" && (
                  <div className="flex w-full h-full bg-gray-100 p-3 lg:p-6 gap-4 lg:gap-6">
                    <div className="w-full bg-white rounded-xl shadow-md p-4 lg:p-6">
                      <h2 className="text-xl font-semibold mb-4">Discounts</h2>
                      <p className="text-gray-600 mb-2">
                        Discount view page here
                      </p>
                    </div>
                  </div>
                )}


                {/* Inventory Cards - With Loading and No Results States */}

                {!selectedTableItem && salesMiddlepage == "inventory view" && (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center py-5 w-full">
                    <div className="bg-[#F8F8F8] p-3 lg:p-4 flex-shrink-0 w-full max-w-full lg:max-w-2xl rounded-lg shadow-md mb-4 mx-2 lg:mx-6">
                      {/* Barcode Image and Search Bar - Parallel */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-4">
                        {/* Back button */}
                        <button
                          onClick={() => setSalesMiddlepage("defalut menu")}
                          className="bg-black text-white px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-center space-x-2 text-base lg:text-lg">
                          <span className="text-xl lg:text-2xl">&#x276E;</span>
                          <span>Back</span>
                        </button>

                        {/* Search Bar */}
                        <div className="w-full flex flex-col gap-3">
                          <div className="flex-1 flex border-b border-[#EDEDED] h-10 lg:h-12 items-center">
                            <input
                              type="text"
                              value={scanCode}
                              onChange={(e) => setScanCode(e.target.value)}
                              placeholder="Search Your Items here"
                              className="flex-1 px-2 lg:px-3 py-2 bg-transparent focus:outline-none text-sm lg:text-base"
                            />
                            <button
                              className="flex items-center px-3 lg:px-4 py-2 bg-[#1A318C] text-white text-sm lg:text-base"
                              onClick={handleScan}
                            >
                              <svg
                                className="w-4 lg:w-5 h-4 lg:h-5 mr-1 lg:mr-2"
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

                          <div className="flex flex-wrap gap-2 lg:gap-3">
                            <label className="relative">
                              <input
                                type="checkbox"
                                className="absolute opacity-0 w-0 h-0 peer"
                                name="category"
                                value="fruit"
                              />
                              <div className="py-2 px-3 lg:px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer peer-checked:border-blue-500 text-sm lg:text-base">
                                <span>Fruit</span>
                                <span className="w-4 lg:w-5 h-4 lg:h-5 rounded-full bg-gray-200 flex items-center justify-center peer-checked:bg-blue-100 peer-checked:text-blue-500">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-2 lg:h-3 w-2 lg:w-3"
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
                              <div className="py-2 px-3 lg:px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer peer-checked:border-blue-500 text-sm lg:text-base">
                                <span>Vegetable</span>
                                <span className="w-4 lg:w-5 h-4 lg:h-5 rounded-full bg-gray-200 flex items-center justify-center peer-checked:bg-blue-100 peer-checked:text-blue-500">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-2 lg:h-3 w-2 lg:w-3"
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
                              <div className="py-2 px-3 lg:px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer peer-checked:border-blue-500 text-sm lg:text-base">
                                <span>Dairy</span>
                                <span className="w-4 lg:w-5 h-4 lg:h-5 rounded-full bg-gray-200 flex items-center justify-center peer-checked:bg-blue-100 peer-checked:text-blue-500">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-2 lg:h-3 w-2 lg:w-3"
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
                              Found {filteredItems.length} result(s) for "{scanCode}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>

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
                      // Items Display - Clean Card Layout
                      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6">
                        <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                          {filteredItems.map((item) => (
                            <div key={item.id} className="w-full min-w-0 max-w-full">
                              <SalesItemCard
                                item={item}
                                onOpen={() => handleProductSelect(item)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* item table section(right) */}
            <div className="flex-1 p-2 lg:p-3 flex w-full lg:w-[30rem] flex-col h-[calc(100vh-7rem)]">
              {/* Items Table - REDUCED HEIGHT */}
              <div
                className="bg-white overflow-hidden"
                style={{ height: "calc(100vh - 300px)" }}
              >
                {/* member container */}
                <div className="w-full relative p-auto">
                  {/* Main search container */}
                  <div className="w-full relative p-2 lg:p-4">
                    {/* Main search container */}
                    <div className="bg-orange-50 border-2 border-orange-400 rounded-lg overflow-hidden">
                      <div className="p-2 lg:p-3">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
                          {/* Search icon */}
                          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-orange-500 flex-shrink-0 self-center lg:self-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>

                          {/* Search input with underline */}
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder="Search Member here ....."
                              value={searchTerm}
                              onChange={(e) => handleSearch(e.target.value)}
                              className="w-full bg-transparent text-orange-500 placeholder-orange-400 outline-none text-lg lg:text-xl font-medium pb-2"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></div>
                          </div>

                          {/* Guest button and expand arrow container */}
                          <div className="flex items-center gap-2 lg:gap-3">
                            {/* Guest button */}
                            <button
                              onClick={handleGuestClick}
                              className="bg-orange-200 text-orange-600 px-4 lg:px-6 py-2 lg:py-3 border-2 border-orange-400 text-base lg:text-lg font-medium hover:bg-orange-300 transition-colors"
                            >
                              Guest
                            </button>

                            {/* Expand arrow */}
                            <button
                              onClick={toggleExpanded}
                              className="p-1 hover:bg-orange-200 rounded transition-colors"
                            >
                              <svg
                                className={`w-5 h-5 lg:w-6 lg:h-6 text-orange-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Search results */}
                      {searchTerm && searchTerm !== 'Guest' && (
                        <div className="border-t border-orange-200 bg-white p-2 lg:p-4">
                          <div className="text-sm text-gray-600">
                            Search results will appear here
                          </div>
                        </div>
                      )}

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-orange-200 bg-white p-2 lg:p-4">
                          <div className="text-sm text-gray-600">
                            More details should be added here
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* item table */}
                <div className="overflow-x-auto h-full p-2 lg:p-4">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-700 text-white">
                      <tr>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Item code
                        </th>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Unit count
                        </th>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {scannedItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                          onClick={() => handleTableRowClick(item)}
                        >
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-1 lg:mr-2 mt-1">
                                {selectedTableItem?.id === item.id ? (
                                  <svg className="w-3 h-3 lg:w-4 lg:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 lg:w-4 lg:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-grow">
                                <div className="text-gray-800 font-medium">
                                  {index + 1} {item.code}
                                </div>
                                {selectedTableItem?.id === item.id && (
                                  <div className="mt-1 text-gray-500 text-xs lg:text-sm">
                                    <div>{item.name || 'White Banana'}</div>
                                    <div>Rs.{item.unitPrice.toFixed(2)}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.quantity || 30}(pcs)
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white">
                {/* Amounts */}
                <div className="grid grid-cols-2 p-2 lg:p-3">
                  <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">Discount Amount</div>
                  <div className="p-2 bg-[#D9D9D9] text-lg lg:text-xl font-normal text-gray-800 text-right">
                    RS.{discountAmount.toFixed(2)}
                  </div>
                  <div className="p-2 bg-[#F8F8F8] text-sm lg:text-base text-gray-500">Change Amount</div>
                  <div className="p-2 bg-[#F8F8F8] text-lg lg:text-xl font-normal text-gray-800 text-right">
                    RS.{changeAmount.toFixed(2)}
                  </div>
                  <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">Total Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">
                    RS.{totalAmount.toFixed(2)}
                  </div>
                </div>
                {/* payment button controls*/}
                <div className="flex flex-col sm:flex-row justify-between px-2 lg:px-3 gap-2 lg:gap-0">
                  <button className="px-3 lg:px-4 py-2 lg:py-3 mb-2 lg:mb-4 bg-[#727272] text-white text-xs lg:text-sm hover:bg-gray-700 transition-colors flex items-center justify-center sm:justify-start sm:mr-2">
                    <img src={clearBtnImg} alt="Clear" className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                    Clear
                  </button>

                  <button className="px-3 lg:px-4 py-2 lg:py-3 mb-2 lg:mb-4 bg-[#EB8928] text-white text-xs lg:text-sm hover:bg-orange-500 transition-colors flex items-center justify-center sm:justify-start sm:mr-2">
                    <img src={sidebarHoldOrderBtnImg} alt="Hold Order" className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                    Hold Order
                  </button>

                  <button className="px-3 lg:px-4 py-2 lg:py-3 mb-2 lg:mb-4 bg-[#1A318C] text-white text-xs lg:text-sm hover:bg-blue-700 transition-colors flex items-center justify-center sm:justify-start sm:mr-2">
                    <img src={sidebarPaymentBtnImg} alt="Proceed Payment" className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                    Proceed Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={isVisible("transaction-history")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Transaction History</h2>
            <p>Transaction history content will go here...</p>
          </div>
        </div>

        <div className={isVisible("inventory-view")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Inventory View</h2>
            <p>Inventory view content will go here...</p>
          </div>
        </div>

        <div className={isVisible("offers-discount")}>
          <OffersDiscountView />
        </div>

        <div className={isVisible("sales-config")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Sales Configurations</h2>
            <p>Sales configurations content will go here...</p>
          </div>
        </div>
      </div>
    </div>
  );
}