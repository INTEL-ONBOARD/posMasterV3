import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import bananaImg from "../../assets/Inventory_banana.png";
import SalesItemCard from "../../components/SalesItemCard";
import OffersDiscountView from "./OffersDiscountView";
import { apiClient } from "../../api/client";
import {ChevronDown, Printer, ChevronUp } from "lucide-react";

//image imports
import barcodeImg from "../../assets/barcode.png";
import AddRegitemsImg from "../../assets/add_reg_items.png";
import clearBtnImg from "../../assets/sales_clear.png";
import sidebarHoldOrderBtnImg from "../../assets/sales_hold_order.png";
import sidebarPaymentBtnImg from "../../assets/sales_proceed_payment.png";
import profileImg from "../../assets/user_profile_image.png";

export default function SalesView() {


  const [openItemFormBlock, setopenItemFormBlock] = useState('item'); //item || stock || supplier || 
  const [openStockFormBlock, setopenStockFormBlock] = useState('stock'); //item || stock || supplier || 
  //left section controls
    const [formDataRegItem, setFormDataRegItem] = useState({
      _id: "",
      id: 0,
      stock_trace: [0],
      item_name: "fdsaf",
      item_image_url: "",
      batch_code: "fdsaf",
      maximum_capacity: 10,
      uom_id: 10,
      category_id: 10,
      inventory_id: 11,
      item_update_datetime: "2025-12-31T23:59:59",
      item_created_datetime: "2025-12-31T23:59:59",
      __v: 0,
      uom: {
        _id: "",
        id: 0,
        symbol: "",
        unit_name: "",
        __v: 0
      },
      category: {
        _id: "",
        id: 0,
        brand: "",
        type: "",
        __v: 0
      },
      inventory: null,
      availability: true
    });
    //no input change for this for now(because of readonly in ui)
    const [formDataStock, setFormDataStock] = useState({
      sku: "skupsps",
      quantity: 150,
      threshold_limit: 20,
      stock_price: 20.0,
      retail_price: 35.0,
      expired_datetime: "2025-12-31T23:59:59",
      availability: true
    });
    const handleStockInputChange = (e) => {
      const { name, value } = e.target;
      console.log(name +": "+ value);
      setFormStockData(prev => ({ ...prev, [name]: value }));
    };

    const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "items"

  //payment 
  const [selected, setSelected] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownValue, setDropdownValue] = useState('Cash');

  const handleButtonClick = (value) => {
    setSelected(value);
  };

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleDropdownSelect = (value) => {
    setDropdownValue(value);
    setDropdownOpen(false);
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

  const handleOpenMemberSection = () => {

};

  const handleOpenProceedPayment = () => {

};


  return (
    <div className="flex h-screen bg-[#EBEBEB]">

      {/* Main Content */}
          <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] bg-[#EBEBEB] w-full">

            {/* main trasaction section(left) */}
            <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 z-10">
        {/* 56 is the correct height */}
          <div className="flex flex-col h-[46rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setopenItemFormBlock('item')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCIRPTION</span>
              {openItemFormBlock=='item' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openItemFormBlock=='item') && (
/* 
              onClick={() => setOpenItem(!openItem)}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCIRPTION</span>
              {openItem ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openItem && (*/
              
              <div className="mx-4">
                <div className="flex flex-row px-4 items-center max-h-[12rem]">
                  <div className="">
                    <img src={barcodeImg} alt="Barcode" className="w-[100px] object-contain" />
                    <p className="text-sm text-gray-800">SKU: 345634BRE</p>
                  </div>
                  {/* Vertical black line separator */}
                  <div className="flex flex-col m-10">
                    <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                          <p className="text-sm font-semibold text-gray-800">Name</p>
                          <p className="text-sm text-gray-700">{formDataRegItem.item_name}</p>
                          <p className="text-sm font-semibold text-gray-800">Category</p>
                          <p className="text-sm text-gray-700">{formDataRegItem?.category?.type}</p>
                          <p className="text-sm font-semibold text-gray-800">Current Qty</p>
                          <p className="text-sm text-gray-700">{formDataStock?.quantity}/{formDataRegItem?.maximum_capacity}({formDataRegItem?.uom?.symbol})</p>
                        </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* ▼ stock description block ▼ */}
          <div className="border">
            <button
              // onClick={() => setOpenStock(!openStock)}
              openFormBlock
              onClick={() => setopenStockFormBlock('stock')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">STOCK DESCRIPTION</span>
              {openStockFormBlock=='stock' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openStockFormBlock == 'stock') && (
              <div className="px-4 bg h-[34rem] bg-white">
                {/*stock description block  */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formDataStock.sku}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formDataStock.quantity}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Lower Threshold Rate(%)
                      </label>
                      <input
                        type="text"
                        name="threshold_limit"
                        value={formDataStock.threshold_limit}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select availability --</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Stock Price
                      </label>
                      <input
                        type="number"
                        name="stock_price"
                        value={formDataStock.stock_price}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Retail Price
                      </label>
                      <input
                        type="number"
                        name="retail_price"
                        value={formDataStock.retail_price}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Expiration Date
                      </label>
                      <div className="relative max-w-sm">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                          {/* <svg
                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                          </svg> */}
                        </div>
                          <input
                            type="date"
                            id="expired_datetime"
                            value={formDataStock.expired_datetime ? formDataStock.expired_datetime.split('T')[0] : ''}
                            onChange={(e) => {
                              const selectedDate = e.target.value;
                              console.log("date input value: "+selectedDate);
                              if (selectedDate) {
                                // Format to UTC midnight: YYYY-MM-DDT00:00:00.000Z
                                const utcMidnight = `${selectedDate}T00:00:00.000Z`;
                                console.log("to formData:"+utcMidnight)
                                setFormDataStock({
                                  ...formDataStock,
                                  expired_datetime: utcMidnight
                                });
                              } else {
                                // Clear the field if date is empty
                                setFormDataStock({ ...formDataStock, expired_datetime: null });
                              }
                            }}
                            name="expired_datetime"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2"
                            placeholder="Select date"
                          />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        name="retail_price"
                        value={formDataStock.retail_price}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {/* <p>Recent Batch Code Changes</p>
                  <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[13rem] -mr-4">
                  <div className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]">
                    <div className="flex flex-col">
                      <span className="text-md font-bold">SKU:</span>
                      <span className="text-gray-600">SKU23453RE</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">60 units</span>
                      <span className="text-gray-400">2025-04-04 Exp</span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]">
                    <div className="flex flex-col">
                      <span className="text-md font-bold">SKU:</span>
                      <span className="text-gray-600">SKU23453RE</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">60 units</span>
                      <span className="text-gray-400">2025-04-04 Exp</span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]">
                    <div className="flex flex-col">
                      <span className="text-md font-bold">SKU:</span>
                      <span className="text-gray-600">SKU23453RE</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">60 units</span>
                      <span className="text-gray-400">2025-04-04 Exp</span>
                    </div>
                  </div>

                  </div> */}


                </div>
              </div>
            )}
          </div>

          </div>
            </div>

            {/* item table section(mid) */}
            <div className="p-2 flex flex-col w-[calc(45rem)] h-[calc(100vh-2rem)]">
              {/* Items Table - REDUCED HEIGHT */}
              <div
                className="bg-white overflow-hidden h-[43rem]"
              >
                {/* member container */}
                <div className="w-full relative p-auto">
                  {/* Main search container */}
                  <div className="flex flex-row gap-6">
                    {/* left */}
                    <div className="w-2/3">
                      <div>
                      <p>Member</p>
                      <p>Nimal Gamage Rathnayake(12344)</p>
                      </div>
                                          <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Method
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select payment --</option>
                        <option value="cash">Cash</option>
                        <option value="credit">Credit</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                                        <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Credit Duration
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select duration --</option>
                        <option value={true}>01 Month</option>
                        <option value={false}>03 Month</option>
                        <option value={false}>06 Month</option>
                      </select>
                    </div>
                    </div>
                    {/* right */}
                    <div className="w-1/3">
                      <div>
                      <p>Member ID</p><p>1232423</p>
                      </div>
                      <div>
                      <p>Date</p><p>2025-07-11</p>
                      </div>
                      <div>
                      <p>Invoice No</p><p>RECPC21321</p>
                      </div>
                    </div>
                    <div>

                    </div>
                  </div>
                </div>

                {/* transaction details */}
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
                  <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">RS.{totalAmount.toFixed(2)}</div>
                  <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">Discount Amount</div>
                  <div className="p-2 bg-[#D9D9D9] text-lg lg:text-xl font-normal text-gray-800 text-right">RS.{discountAmount.toFixed(2)}</div>
                  <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">Total Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">RS.{totalAmount.toFixed(2)}</div>
                  <div className="p-2 bg-white text-sm lg:text-base text-gray-500 h-16">Customer Gave</div>
                  <div className="p-2 bg-white text-lg lg:text-3xl font-semibold text-[#737373] text-right  h-16 border-b-2 ">RS.20000</div>
                  <div className="p-2 bg-[#F8F8F8] text-sm lg:text-base text-gray-500">Change Amount</div>
                  <div className="p-2 bg-[#F8F8F8] text-lg lg:text-xl font-normal text-gray-800 text-right">RS.{changeAmount.toFixed(2)}</div>

                </div>
                {/* payment button controls*/}
                <div className="flex flex-col sm:flex-row px-2 lg:px-3 gap-[10px]">
                  <button className="w-1/4 px-4 py-3 bg-[#727272] text-white text-sm hover:bg-gray-700 transition-all flex items-center justify-center">
                    <img src={clearBtnImg} alt="Clear" className="w-4 h-4 mr-2" />
                    Clear
                  </button>

                  <button className="w-1/4 px-4 py-3 bg-[#EB8928] text-white text-sm hover:bg-orange-500 transition-all flex items-center justify-center">
                    <img src={sidebarHoldOrderBtnImg} alt="Hold Order" className="w-4 h-4 mr-2" />
                    Hold Order
                  </button>

                  <button 
                    onClick={handleOpenProceedPayment}
                    className="flex-1 w-1/2 px-4 py-3 bg-[#1A318C] text-white text-sm hover:bg-blue-700 transition-all flex items-center justify-center"
                  >
                    <img src={sidebarPaymentBtnImg} alt="Proceed Payment" className="w-4 h-4 mr-2" />
                    Proceed Payment
                  </button>
                </div>

              </div>

            </div>

            {/* Member and Item list section(right) */}
            <div className="bg-gray-300 w-[calc(32rem)] h-[calc(100vh-2rem)]">
              <div className="space-y-4 flex flex-col h-full">

                {/* item list */}
                {rightActiveSection == "items" && (
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
                        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-2 sm:gap-3 md:gap-4">
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
                )
                }
                {/* buttons */}
                {rightActiveSection == "buttons" && (
                <div className="flex flex-col flex-1 p-2 gap-1">
                  <button
                    onClick={() => setRightActiveSection("items")}
                    className="h-[16rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
                  >
                    <img
                      src={AddRegitemsImg}
                      alt="Add Registered Items"
                      className="w-[8rem] h-[8rem] object-contain mb-2"
                    />
                    <span>Add Registered Items</span>
                  </button>



                  {/* White block to fill remaining space */}
                  <div className="flex flex-col h-[60rem] bg-white p-5 gap-6">
                    <div className="flex border-b border-[#EDEDED] h-12 items-center relative">
                      <input
                        // ref={searchInputRef}
                        type="text"
                        // value={scanCode}
                        // onChange={(e) => setScanCode(e.target.value)}
                        // onFocus={handleSearchFocus}
                        placeholder="Search Member ID"
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
                    <div className="flex flex-row items-center justify-center">
                        {/* member details */}
                      <div className="flex gap-10">
                        <img src={profileImg} className="w-12 h-12 bg-gray-300 rounded-full" />
                        <div>
                          <h2 className="text-blue-800 font-bold">MR. Harischandra Silva</h2>
                          <p className="text-md font-semibold">MEMBER: 2345</p>
                          <p className="text-xs text-gray-600">PRE-MEMBER: 2345</p>
                        </div>
                      </div>
                    </div>
                    {/* income detils */}
                    <div className="bg-[#E2E2E2] flex items-center justify-around border-black p-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">RS. 20000</div>
                        <div className="text-sm text-gray-600">Income</div>
                      </div>  
                      {/* vertical divider */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        className="w-px h-8 bg-white"
                      />
                      <div className="text-center">
                        <div className="text-lg font-bold">RS. 20000</div>
                        <div className="text-sm text-gray-600">Credits</div>
                      </div>
                    </div>
                    {/* transaction list */}
                    <div className="h-[21rem] bg-red-500 overflow-y-scroll gap-3">

                    {/* transaction card */}
                    <div className="bg-[#F5F5F5] h-24 items-center gap-8 flex flex-row px-6">
                      <div>
                        <svg width={50} height={50} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* green circle */}<circle cx="12" cy="12" r="10" fill="#22C55E" />
                          {/* white check */}<path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="">
                        <div className="text-xl text-[#979797] font-bold">2024-06-03</div>
                        <div className="text-[#979797] font-regular">Total Amount:</div>
                        <div><span className="text-2xl text-[#979797] font-bold">Rs. 23000.00</span><span className="ml-3 text-[#2DAA44] font-bold">CASH</span></div>
                      </div>
                    </div>
                    </div>
                    {/* member control buttons */}
                    <div className="flex flex-row gap-6 justify-around h-[2.8rem]">

                    <button 
                    //onClick={handleOpenProceedPayment}
                    className="w-full h-full bg-[#9E9E9E] text-white text-sm hover:bg-gray-500 transition-all flex items-center justify-center"
                    >
                    CLEAR
                    </button>
                    <button 
                    //onClick={handleOpenProceedPayment}
                    className="w-full h-full bg-[#2DAA44] text-white text-sm hover:bg-green-700 transition-all flex items-center justify-center"
                    >
                    SELECT
                    </button>
                    </div>
                  </div>
                </div>
                )}

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