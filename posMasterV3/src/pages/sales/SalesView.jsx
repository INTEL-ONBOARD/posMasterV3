import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import bananaImg from "../../assets/Inventory_banana.png";
import Inventory_card from "../../frontend/components/Inventory_card";
import SalesItemCard from "../../components/SalesItemCard";
import barcodeImg from "../../assets/barcode.png";
import OffersDiscountView from "./OffersDiscountView";
import { apiClient } from "../../api/client";

//image imports
import clearBtnImg from "../../assets/sales_clear.png";
import sidebarHoldOrderBtnImg from "../../assets/sales_hold_order.png";
import sidebarPaymentBtnImg from "../../assets/sales_proceed_payment.png";
import profileImg from "../../assets/user_profile_image.png";

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
      total: 11300.0,
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
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  const [inventoryItems, setInventoryItems] = useState([]);

  // Fetch inventory items from API
  const fetchInventoryItems = async () => {
    try {
      setIsSearching(true);

      const response = await apiClient.get('/api/items/extended');
      const apiData = response.data;
      console.log("Fetched inventory items:", apiData);

      if (apiData && apiData.data && Array.isArray(apiData.data)) {
        const transformedItems = apiData.data.map(item => ({
          id: item.id,
          name: item.item_name,
          category: item.category?.type || "Uncategorized",
          price: item.retail_price.toFixed(2),
          unit: item.uom?.symbol || "pcs",
          sku: item.sku,
          stock: `${item.quantity} ${item.uom?.unit_name || "Units"}`,
          image: item.item_image_url || bananaImg,
          brand: item.category?.brand || "",
          batchCode: item.batch_code
        }));

        setInventoryItems(transformedItems);
        setFilteredItems(transformedItems);

        const uniqueCategories = [];
        const categoryMap = new Map();

        apiData.data.forEach(item => {
          if (item.category && item.category.type) {
            const categoryKey = `${item.category.type}-${item.category.brand}`;
            if (!categoryMap.has(categoryKey)) {
              categoryMap.set(categoryKey, {
                id: item.category.id,
                type: item.category.type,
                brand: item.category.brand || "Various",
                _id: item.category._id
              });
            }
          }
        });

        const categoriesArray = Array.from(categoryMap.values());
        setCategories(categoriesArray);

      } else {
        console.error("Unexpected API response structure:", apiData);
        setInventoryItems([]);
        setFilteredItems([]);
        setCategories([]);
      }

    } catch (error) {
      console.error("Error fetching inventory items:", error);
      setInventoryItems([]);
      setFilteredItems([]);
      setCategories([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Alternative: Fetch categories from separate API endpoint (if available)
  const fetchCategories = async () => {
    try {
      // If you have a dedicated categories endpoint:
      const response = await apiClient.get('/api/categories');
      const categoriesData = response.data;

      if (categoriesData && categoriesData.data && Array.isArray(categoriesData.data)) {
        setCategories(categoriesData.data);
      } else {
        console.error("Unexpected categories API response structure:", categoriesData);
        setCategories([]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback: categories will be derived from inventory items
    }
  };

  // Updated useEffect to handle the flow properly
  useEffect(() => {
    const loadData = async () => {
      await fetchCategories();
      await fetchInventoryItems();
    };

    loadData();
  }, []);

  const sortCategoriesAlphabetically = (categories) => {
    return categories.sort((a, b) => a.type.localeCompare(b.type));
  };

  // Initialize data
  useEffect(() => {
    fetchInventoryItems();
    fetchCategories();
  }, []);

  // Generate search suggestions
  const generateSuggestions = (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions = [];
    const addedSuggestions = new Set();

    inventoryItems.forEach(item => {
      // Name suggestions
      if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        const suggestion = {
          type: 'name',
          value: item.name,
          label: item.name,
          icon: ''
        };
        if (!addedSuggestions.has(suggestion.value)) {
          suggestions.push(suggestion);
          addedSuggestions.add(suggestion.value);
        }
      }

      // SKU suggestions
      if (item.sku.toLowerCase().includes(searchTerm.toLowerCase())) {
        const suggestion = {
          type: 'sku',
          value: item.sku,
          label: `${item.sku} - ${item.name}`,
          icon: ''
        };
        if (!addedSuggestions.has(suggestion.value)) {
          suggestions.push(suggestion);
          addedSuggestions.add(suggestion.value);
        }
      }

      // Category suggestions
      if (item.category.toLowerCase().includes(searchTerm.toLowerCase())) {
        const suggestion = {
          type: 'category',
          value: item.category,
          label: item.category,
          icon: ''
        };
        if (!addedSuggestions.has(suggestion.value)) {
          suggestions.push(suggestion);
          addedSuggestions.add(suggestion.value);
        }
      }
    });

    setSearchSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
  };

  // Search functionality with debounce
  useEffect(() => {
    const searchItems = async () => {
      if (!scanCode.trim()) {
        let items = inventoryItems;

        // Apply category filter if selected
        if (selectedCategory) {
          items = items.filter(item =>
            item.category.toLowerCase() === selectedCategory.toLowerCase()
          );
        }

        setFilteredItems(items);
        setSearchSuggestions([]);
        return;
      }

      setIsSearching(true);
      generateSuggestions(scanCode);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      let filtered = inventoryItems.filter(
        (item) =>
          item.name.toLowerCase().includes(scanCode.toLowerCase()) ||
          item.sku.toLowerCase().includes(scanCode.toLowerCase()) ||
          item.category.toLowerCase().includes(scanCode.toLowerCase())
      );

      // Apply category filter if selected
      if (selectedCategory) {
        filtered = filtered.filter(item =>
          item.category.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      setFilteredItems(filtered);
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(searchItems, 300);
    return () => clearTimeout(debounceTimer);
  }, [scanCode, inventoryItems, selectedCategory]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setScanCode(suggestion.value);
    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setIsCategoryDropdownOpen(false);
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (scanCode.trim()) {
      generateSuggestions(scanCode);
    }
    setShowSuggestions(true);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }

      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScan = () => {
    console.log("Scanning:", scanCode);
    setShowSuggestions(false);
  };

  // Payment dropdown states
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [creditDropdownOpen, setCreditDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("Member - 3 months");
  const [selectedCredit, setSelectedCredit] = useState("3 months");
  const [cashAmount, setCashAmount] = useState("0.00");
  //about to be changed in the next update
  const [salesMiddlepage, setSalesMiddlepage] = useState("inventory view");

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
    setSalesMiddlepage("inventory view");
  };

  // Helper function to check visibility
  const isVisible = (section) =>
    activeSection === section ? "block" : "hidden";

  const [isMemberSectionOpen, setIsMemberSectionOpen] = useState(false);
  const [isPaymentSectionOpen, setIsPaymentSectionOpen] = useState(false);

  const handleMemberSection = () => {
    console.log("Processing payment for:", totalAmount);
    // Close selected item and salesMiddlePage
    setSelectedTableItem(null);
    setSalesMiddlepage("");
    // Open payment section
    setIsMemberSectionOpen(true);
  };

  const handleProceedPayment = () => {
    console.log("Processing payment for:", totalAmount);
    // Close selected item and salesMiddlePage
    setSelectedTableItem(null);
    setSalesMiddlepage("");
    // Open payment section
    setIsPaymentSectionOpen(true);
  };

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
            <div className="bg-[#EBEBEB] border-r flex flex-col h-full lg:flex-1">
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

                {/* Enhanced Inventory View with Auto-suggestions and Category Filter */}
                {!selectedTableItem && salesMiddlepage == "inventory view" && (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center">
                    <div className="bg-[#F8F8F8] p-3 lg:p-4 flex-shrink-0 w-full max-w-full shadow-md mb-4">
                      {/* Back button(removed for now) and Search Bar */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-4">
                        {/* Back button */}
                        {/* <button
                          onClick={() => setSalesMiddlepage("defalut menu")}
                          className="bg-black text-white px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-center space-x-2 text-base lg:text-lg">
                          <span className="text-xl lg:text-2xl">&#x276E;</span>
                          <span>Back</span>
                        </button> */}

                        {/* Search Bar Container */}
                        <div className="w-full flex flex-col gap-3 relative">
                          <div className="flex-1 flex border-b border-[#EDEDED] h-10 lg:h-12 items-center relative">
                            <input
                              ref={searchInputRef}
                              type="text"
                              value={scanCode}
                              onChange={(e) => setScanCode(e.target.value)}
                              onFocus={handleSearchFocus}
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

                          {/* Search Suggestions Dropdown */}
                          {showSuggestions && searchSuggestions.length > 0 && (
                            <div
                              ref={suggestionsRef}
                              className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
                            >
                              {searchSuggestions.map((suggestion, index) => (
                                <div
                                  key={index}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                >
                                  <span className="text-lg">{suggestion.icon}</span>
                                  <span>{suggestion.label}</span>
                                  <span className="text-xs text-gray-500 ml-auto">
                                    {suggestion.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Category Dropdown */}
                          <div className="flex flex-wrap gap-2 lg:gap-3 items-center">
                            {/* Enhanced Category Dropdown with Alphabetical Sort */}
                            <div className="relative" ref={categoryDropdownRef}>
                              <button
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                className="py-2 px-3 lg:px-4 bg-white border-2 border-[#BDBDBD] flex items-center gap-2 cursor-pointer hover:border-blue-500 text-sm lg:text-base rounded-md shadow-sm transition-colors"
                              >
                                <span className="text-gray-700">
                                  {selectedCategory || "All Categories"}
                                </span>
                                <svg
                                  className={`w-4 h-4 transform transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""
                                    }`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>

                              {isCategoryDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                  {/* All Categories Option */}
                                  <div
                                    className={`px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 font-medium ${!selectedCategory ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                      }`}
                                    onClick={() => handleCategorySelect("")}
                                  >
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                      </svg>
                                      All Categories
                                    </div>
                                  </div>

                                  {/* Alphabetically Sorted Categories */}
                                  {sortCategoriesAlphabetically(categories).map((category, index) => (
                                    <div
                                      key={category.id || index}
                                      className={`px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm transition-colors ${selectedCategory === category.type ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                        }`}
                                      onClick={() => handleCategorySelect(category.type)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{category.type}</span>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Empty State */}
                                  {categories.length === 0 && (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                      No categories available
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Clear Category Filter Button (optional) */}
                            {selectedCategory && (
                              <button
                                onClick={() => handleCategorySelect("")}
                                className="px-3 py-2 text-xs bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                              >
                                Clear Filter
                              </button>
                            )}
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
                              No items matched your search "
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

                {isPaymentSectionOpen && (
                  <div className="bg-white border h-[45rem] border-gray-300 rounded-lg shadow-sm flex-shrink-0">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        Selected from Cart
                      </h3>
                      <button
                        //onClick={handleClearSelectedItem}
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






                    {/* Available Discounts Section */}

                  </div>
                )}
                {isMemberSectionOpen && (
                  <div className="bg-white border h-[45rem] border-gray-300 rounded-lg shadow-sm flex-shrink-0">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        Selected from Cart
                      </h3>
                      <button
                        //onClick={handleClearSelectedItem}
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






                    {/* Available Discounts Section */}

                  </div>
                )}
              </div>



            </div>


            {/* item table section(right) */}
            <div className="p-2 lg:p-3 flex lg:max-w-[32rem] flex-col h-[calc(100vh-7rem)]">
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
                    <div className="bg-[#E9F5FF] border-2 border-blue-400 rounded-lg overflow-hidden">
                      <div className="p-2 lg:p-3">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3">
                          {/* Search icon */}
                          <svg className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500 flex-shrink-0 self-center lg:self-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>

                          {/* Search input with underline */}
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder="Search Member here ....."
                              value={searchTerm}
                              onChange={(e) => handleSearch(e.target.value)}
                              className="w-full bg-transparent text-blue-500 placeholder-blue-400 outline-none font-medium pb-2"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
                          </div>

                          {/* Guest button and expand arrow container */}
                          <div className="flex items-center gap-2 lg:gap-3">
                            {/* Guest button */}
                            <button
                              onClick={handleGuestClick}
                              className="bg-blue-200 text-blue-600 px-3 border-2 border-blue-400 text-base lg:text-lg font-medium hover:bg-blue-300 transition-colors"
                            >
                              Guest
                            </button>

                            {/* Expand arrow */}
                            <button
                              onClick={toggleExpanded}
                              className="p-1 hover:bg-blue-200 rounded transition-colors"
                            >
                              <svg
                                className={`w-5 h-5 lg:w-6 lg:h-6 text-blue-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="">
                          {/* Search results */}
                          {searchTerm && searchTerm !== 'Guest' && (
                            // member details card
                            <div className="bg-[#EAF6FF] p-4 shadow-md w-full max-w-md flex flex-col text-black font-sans">

                              {/* Member and Income Row */}
                              <div className="flex justify-between items-start">
                                {/* Profile section */}
                                <div className="flex gap-3 w-3/5">
                                  {/* Avatar Placeholder */}
                                  <img src={profileImg} className="w-12 h-12 bg-gray-300 rounded-full" />
                                  <div>
                                    <h2 className="text-blue-800 font-bold">MR. Harischandra Silva</h2>
                                    <p className="text-md font-semibold">MEMBER: 2345</p>
                                    <p className="text-xs text-gray-600">PRE-MEMBER: 2345</p>
                                  </div>
                                </div>

                                {/* Income */}
                                <div className="flex flex-col w-2/5 bg-green-300 text-center px-4 py-2">
                                  <p className="text-blue-900 font-bold text-lg">RS. 2,000</p>
                                  <p className="text-sm text-gray-800">INCOME</p>
                                </div>
                              </div>

                              {/* Amount and Credit Row */}
                              <div className="flex justify-between items-center">
                                {/* Transaction info */}
                                <div className="flex flex-col w-3/5">
                                  <p className="text-sm font-semibold text-black">Total Amount of the transaction</p>
                                  <p className="text-sm font-semibold text-black">2024-06-23</p>
                                  <p className="text-2xl font-bold text-black">Rs.2300.00</p>
                                </div>

                                {/* Credits */}
                                <div className="bg-orange-300 text-center px-4 py-2 flex flex-col w-2/5">
                                  <p className="text-blue-900 font-bold text-lg">RS. 140</p>
                                  <p className="text-sm text-gray-800">CREDITS</p>
                                </div>
                              </div>

                              {/* Buttons Row */}
                              <div className="flex justify-between gap-3">
                                <button className="flex-1 border border-black py-2 hover:bg-gray-100"
                                  onClick={handleMemberSection}
                                >
                                  See more ↗️
                                </button>
                                <button className="flex-1 border border-black py-2 hover:bg-gray-100">
                                  Select ✔
                                </button>
                              </div>
                            </div>

                          )}
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
                <div className="flex flex-col sm:flex-row px-2 lg:px-3 gap-[10px]">
                  <button className="flex-1 px-4 py-3 bg-[#727272] text-white text-sm hover:bg-gray-700 transition-all flex items-center justify-center">
                    <img src={clearBtnImg} alt="Clear" className="w-4 h-4 mr-2" />
                    Clear
                  </button>

                  <button className="flex-1 px-4 py-3 bg-[#EB8928] text-white text-sm hover:bg-orange-500 transition-all flex items-center justify-center">
                    <img src={sidebarHoldOrderBtnImg} alt="Hold Order" className="w-4 h-4 mr-2" />
                    Hold Order
                  </button>

                  <button
                    onClick={handleProceedPayment}
                    className="flex-1 px-4 py-3 bg-[#1A318C] text-white text-sm hover:bg-blue-700 transition-all flex items-center justify-center"
                  >
                    <img src={sidebarPaymentBtnImg} alt="Proceed Payment" className="w-4 h-4 mr-2" />
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

// Alternative approach: Combined fetch function
// const fetchInventoryAndCategories = async () => {
//   try {
//     setIsSearching(true);

//     // Fetch inventory items
//     const inventoryResponse = await apiClient.get('/api/items/extended');
//     const inventoryData = inventoryResponse.data;

//     if (inventoryData && inventoryData.data && Array.isArray(inventoryData.data)) {
//       // Transform inventory items
//       const transformedItems = inventoryData.data.map(item => ({
//         id: item.id,
//         name: item.item_name,
//         category: item.category?.type || "Uncategorized",
//         price: item.unit_price.toFixed(2),
//         unit: item.uom?.symbol || "pcs",
//         sku: item.sku,
//         stock: `${item.quantity} ${item.uom?.unit_name || "Units"}`,
//         image: item.item_image_url || bananaImg,
//         brand: item.category?.brand || "",
//         batchCode: item.batch_code
//       }));

//       setInventoryItems(transformedItems);
//       setFilteredItems(transformedItems);

//       // Extract unique categories
//       const categoryMap = new Map();
//       inventoryData.data.forEach(item => {
//         if (item.category && item.category.type) {
//           const categoryKey = item.category.id || item.category._id;
//           if (!categoryMap.has(categoryKey)) {
//             categoryMap.set(categoryKey, {
//               id: item.category.id,
//               type: item.category.type,
//               brand: item.category.brand || "Various",
//               _id: item.category._id
//             });
//           }
//         }
//       });

//       setCategories(Array.from(categoryMap.values()));
//     }

//   } catch (error) {
//     console.error("Error fetching data:", error);
//     setInventoryItems([]);
//     setFilteredItems([]);
//     setCategories([]);
//   } finally {
//     setIsSearching(false);
//   }
// };