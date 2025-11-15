import React, { useState, useMemo, useCallback } from "react";
import barcodeImg from "../../assets/barcode.png";
import { ChevronDown, ChevronUp } from "lucide-react";
import SalesItemCard from "../../components/SalesItemCard";

// Sample data for testing
const SAMPLE_ITEMS = [
  {
    id: 1,
    _id: "64a1b2c3d4e5f6789012345a",
    stock_trace: [1],
    item_name: "Wireless Headphones",
    item_image_url: "https://via.placeholder.com/150x150?text=Headphones",
    sku: "WH001",
    maximum_capacity: 100,
    uom_id: 1,
    category_id: 1,
    inventory_id: 1,
    item_update_datetime: "2024-01-15T10:30:00Z",
    item_created_datetime: "2024-01-01T08:00:00Z",
    __v: 0,
    uom: {
      _id: "64a1b2c3d4e5f6789012345b",
      id: 1,
      symbol: "pcs",
      unit_name: "Pieces",
      __v: 0,
    },
    category: {
      _id: "64a1b2c3d4e5f6789012345c",
      id: 1,
      brand: "TechBrand",
      type: "Electronics",
      __v: 0,
    },
    inventory: null,
    availability: true,
    current_qty: 75,
    stock_price: 45.99,
    retail_price: 59.99,
    batch_code: "WH001-2024-001",
    expire_date: "2025-12-31",
    status: "In Stock",
  },
  {
    id: 2,
    _id: "64a1b2c3d4e5f6789012345d",
    stock_trace: [2],
    item_name: "Bluetooth Speaker",
    item_image_url: "https://via.placeholder.com/150x150?text=Speaker",
    sku: "BS002",
    maximum_capacity: 50,
    uom_id: 1,
    category_id: 1,
    inventory_id: 1,
    item_update_datetime: "2024-01-14T14:20:00Z",
    item_created_datetime: "2024-01-02T09:15:00Z",
    __v: 0,
    uom: {
      _id: "64a1b2c3d4e5f6789012345b",
      id: 1,
      symbol: "pcs",
      unit_name: "Pieces",
      __v: 0,
    },
    category: {
      _id: "64a1b2c3d4e5f6789012345c",
      id: 1,
      brand: "AudioPro",
      type: "Electronics",
      __v: 0,
    },
    inventory: null,
    availability: true,
    current_qty: 32,
    stock_price: 29.99,
    retail_price: 39.99,
    batch_code: "BS002-2024-001",
    expire_date: "2025-06-30",
    status: "In Stock",
  },
  {
    id: 3,
    _id: "64a1b2c3d4e5f6789012345e",
    stock_trace: [3],
    item_name: "USB Cable",
    item_image_url: "https://via.placeholder.com/150x150?text=Cable",
    sku: "UC003",
    maximum_capacity: 200,
    uom_id: 1,
    category_id: 2,
    inventory_id: 1,
    item_update_datetime: "2024-01-13T11:45:00Z",
    item_created_datetime: "2024-01-03T07:30:00Z",
    __v: 0,
    uom: {
      _id: "64a1b2c3d4e5f6789012345b",
      id: 1,
      symbol: "pcs",
      unit_name: "Pieces",
      __v: 0,
    },
    category: {
      _id: "64a1b2c3d4e5f6789012345f",
      id: 2,
      brand: "CableTech",
      type: "Accessories",
      __v: 0,
    },
    inventory: null,
    availability: false,
    current_qty: 0,
    stock_price: 12.99,
    retail_price: 19.99,
    batch_code: "UC003-2024-001",
    expire_date: "2026-01-31",
    status: "Out of Stock",
  },
  {
    id: 4,
    _id: "64a1b2c3d4e5f6789012345g",
    stock_trace: [4],
    item_name: "Smartphone Case",
    item_image_url: "https://via.placeholder.com/150x150?text=Case",
    sku: "SC004",
    maximum_capacity: 150,
    uom_id: 1,
    category_id: 2,
    inventory_id: 1,
    item_update_datetime: "2024-01-12T16:10:00Z",
    item_created_datetime: "2024-01-04T10:45:00Z",
    __v: 0,
    uom: {
      _id: "64a1b2c3d4e5f6789012345b",
      id: 1,
      symbol: "pcs",
      unit_name: "Pieces",
      __v: 0,
    },
    category: {
      _id: "64a1b2c3d4e5f6789012345f",
      id: 2,
      brand: "ProtectPro",
      type: "Accessories",
      __v: 0,
    },
    inventory: null,
    availability: true,
    current_qty: 88,
    stock_price: 15.99,
    retail_price: 24.99,
    batch_code: "SC004-2024-001",
    expire_date: "2025-09-15",
    status: "In Stock",
  },
];

const SAMPLE_CATEGORIES = [
  { id: 1, name: "Electronics" },
  { id: 2, name: "Accessories" },
  { id: 3, name: "Home & Garden" },
  { id: 4, name: "Sports & Outdoors" },
];

// Initial form state
const INITIAL_STOCK_FORM = {
  batch_code: "",
  quantity: "",
  threshold_limit: "",
  availability: "",
  stock_price: "",
  retail_price: "",
  expired_datetime: "",
  discount: "",
};

const INITIAL_RETURN_FORM = {
  quantity: "",
  return_description: "",
};

// Sample stock entries for demonstration
const SAMPLE_STOCK_ENTRIES = [
  {
    code: "WH001-2024-001",
    quantity: "75 pcs",
    expiry: "2025-12-31",
  },
  {
    code: "BS002-2024-001",
    quantity: "32 pcs",
    expiry: "2025-06-30",
  },
  {
    code: "SC004-2024-001",
    quantity: "88 pcs",
    expiry: "2025-09-15",
  },
];

function ReturnItem() {
  // Form section state
  const [openFormBlock, setOpenFormBlock] = useState("item");

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("All");

  // NEW: Separate states for different sections
  const [selectedItemsForTable, setSelectedItemsForTable] = useState([]); // Mid section table items
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null); // Left section details

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Stock form state
  const [formDataStock, setFormDataStock] = useState(INITIAL_STOCK_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Return item form state
  const [formDataReturnItem, setFormDataReturnItem] =
    useState(INITIAL_RETURN_FORM);
  const [formReturnErrors, setFormReturnErrors] = useState({});

  // Stock entries state
  const [stockEntries] = useState(SAMPLE_STOCK_ENTRIES);

  // Memoized filtered items for performance (Right section)
  const filteredItems = useMemo(() => {
    return SAMPLE_ITEMS.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "" || item.category.type === selectedCategory;

      const matchesAvailability =
        selectedAvailability === "All" ||
        (selectedAvailability === "Available" && item.availability) ||
        (selectedAvailability === "Unavailable" && !item.availability);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [searchTerm, selectedCategory, selectedAvailability]);

  // NEW: Add item to mid section table from right section
  const addItemToTable = useCallback((item) => {
    setSelectedItemsForTable((prev) => {
      // Check if item already exists
      const exists = prev.find((existingItem) => existingItem.id === item.id);
      if (exists) {
        return prev; // Don't add duplicates
      }
      return [...prev, item];
    });
  }, []);

  // NEW: Remove item from mid section table
  const removeItemFromTable = useCallback(
    (itemId) => {
      setSelectedItemsForTable((prev) =>
        prev.filter((item) => item.id !== itemId)
      );

      // If the removed item was selected for details, clear the details
      if (selectedItemForDetails?.id === itemId) {
        setSelectedItemForDetails(null);
        setFormDataStock(INITIAL_STOCK_FORM);
        setFormDataReturnItem(INITIAL_RETURN_FORM);
      }
    },
    [selectedItemForDetails]
  );

  // NEW: Select item for left section details from mid section table
  const selectItemForDetails = useCallback((item) => {
    setSelectedItemForDetails(item);

    // Auto-populate stock form with selected item data
    setFormDataStock((prev) => ({
      ...prev,
      batch_code: item.batch_code || "",
      quantity: item.current_qty?.toString() || "",
      stock_price: item.stock_price?.toString() || "",
      retail_price: item.retail_price?.toString() || "",
      availability: item.availability?.toString() || "",
      expired_datetime: item.expire_date || "",
    }));

    console.log("Selected item for details:", item);
  }, []);

  // Optimized event handlers with useCallback
  const handleStockInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormDataStock((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error when user starts typing
      if (formErrors[name]) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    },
    [formErrors]
  );

  const handleReturnItemInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormDataReturnItem((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error when user starts typing
      if (formReturnErrors[name]) {
        setFormReturnErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    },
    [formReturnErrors]
  );

  const handleSearch = useCallback(() => {
    setSearchLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setSearchLoading(false);
    }, 1000);
  }, []);

  // Form validation functions
  const validateStockForm = () => {
    const errors = {};

    if (!formDataStock.batch_code.trim()) {
      errors.batch_code = "Batch code is required";
    }

    if (!formDataStock.quantity.trim()) {
      errors.quantity = "Quantity is required";
    } else if (
      isNaN(formDataStock.quantity) ||
      parseFloat(formDataStock.quantity) <= 0
    ) {
      errors.quantity = "Quantity must be a positive number";
    }

    if (!formDataStock.stock_price.trim()) {
      errors.stock_price = "Stock price is required";
    } else if (
      isNaN(formDataStock.stock_price) ||
      parseFloat(formDataStock.stock_price) <= 0
    ) {
      errors.stock_price = "Stock price must be a positive number";
    }

    if (!formDataStock.retail_price.trim()) {
      errors.retail_price = "Retail price is required";
    } else if (
      isNaN(formDataStock.retail_price) ||
      parseFloat(formDataStock.retail_price) <= 0
    ) {
      errors.retail_price = "Retail price must be a positive number";
    }

    if (!formDataStock.availability) {
      errors.availability = "Availability is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateReturnForm = () => {
    const errors = {};

    if (!formDataReturnItem.quantity.trim()) {
      errors.quantity = "Quantity is required";
    } else if (
      isNaN(formDataReturnItem.quantity) ||
      parseFloat(formDataReturnItem.quantity) <= 0
    ) {
      errors.quantity = "Quantity must be a positive number";
    } else if (
      selectedItemForDetails &&
      parseFloat(formDataReturnItem.quantity) >
        selectedItemForDetails.current_qty
    ) {
      errors.quantity = "Return quantity cannot exceed available stock";
    }

    if (!formDataReturnItem.return_description.trim()) {
      errors.return_description = "Return description is required";
    }

    setFormReturnErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission handlers
  const handleStockSubmit = useCallback(() => {
    if (validateStockForm()) {
      setSubmitLoading(true);
      // Simulate API call
      setTimeout(() => {
        console.log("Stock form submitted:", formDataStock);
        setSubmitLoading(false);
        // Reset form or show success message
      }, 1500);
    }
  }, [formDataStock]);

  const handleReturnSubmit = useCallback(() => {
    if (!selectedItemForDetails) {
      alert("Please select an item from the table first");
      return;
    }

    if (validateReturnForm()) {
      setSubmitLoading(true);
      // Simulate API call
      setTimeout(() => {
        console.log("Return form submitted:", {
          item: selectedItemForDetails,
          return_data: formDataReturnItem,
        });
        setSubmitLoading(false);
        // Reset form or show success message
        setFormDataReturnItem(INITIAL_RETURN_FORM);
      }, 1500);
    }
  }, [selectedItemForDetails, formDataReturnItem]);

  // Reset forms
  const resetForms = useCallback(() => {
    setFormDataStock(INITIAL_STOCK_FORM);
    setFormDataReturnItem(INITIAL_RETURN_FORM);
    setFormErrors({});
    setFormReturnErrors({});
    setSelectedItemForDetails(null);
    setSelectedItemsForTable([]);
  }, []);

  // NEW: Get display item for left section (N/A if no selection)
  const getDisplayItem = () => {
    if (!selectedItemForDetails) {
      return {
        sku: "N/A",
        item_name: "N/A",
        category: { type: "N/A" },
        current_qty: "N/A",
        uom: { symbol: "" },
      };
    }
    return selectedItemForDetails;
  };

  const displayItem = getDisplayItem();

  return (
    <div className="flex bg-white w-full h-[calc(100vh-2rem)] relative">
      {/* Form section left */}
      <div className="bg-gray-200 w-[28rem] h-full p-4 z-10">
        <div className="flex flex-col h-[46rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() =>
                setOpenFormBlock(openFormBlock === "item" ? "" : "item")
              }
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCRIPTION</span>
              {openFormBlock === "item" ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openFormBlock === "item" && (
              <div className="mx-4">
                <div className="flex flex-row px-4 items-center max-h-[12rem]">
                  <div className="">
                    <img
                      src={barcodeImg}
                      alt="Barcode"
                      className="w-[100px] object-contain"
                    />
                    <p className="text-sm text-gray-800">
                      SKU: {displayItem?.sku}
                    </p>
                  </div>
                  <div className="flex flex-col m-10">
                    <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                      <p className="text-sm font-semibold text-gray-800">
                        Name
                      </p>
                      <p className="text-sm text-gray-700">
                        {displayItem?.item_name}
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        Category
                      </p>
                      <p className="text-sm text-gray-700">
                        {displayItem?.category?.type}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ stock description block ▼ */}
          <div className="border">
            <button
              onClick={() =>
                setOpenFormBlock(openFormBlock === "stock" ? "" : "stock")
              }
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">STOCK DESCRIPTION</span>
              {openFormBlock === "stock" ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openFormBlock === "stock" && (
              <div className="px-4 bg h-[34rem] bg-white">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        name="batch_code"
                        value={formDataStock.batch_code}
                        onChange={handleStockInputChange}
                        disabled={!selectedItemForDetails}
                        className={`w-full px-3 py-2 border ${
                          formErrors.batch_code
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formErrors.batch_code && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.batch_code}
                        </p>
                      )}
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
                        disabled={!selectedItemForDetails}
                        className={`w-full px-3 py-2 border ${
                          formErrors.quantity
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formErrors.quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.quantity}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Lower Threshold Rate(%)
                      </label>
                      <input
                        type="number"
                        name="threshold_limit"
                        value={formDataStock.threshold_limit}
                        onChange={handleStockInputChange}
                        disabled={!selectedItemForDetails}
                        className={`w-full px-3 py-2 border ${
                          formErrors.threshold_limit
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formErrors.threshold_limit && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.threshold_limit}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        disabled={!selectedItemForDetails}
                        className={`w-full px-3 py-2 border ${
                          formErrors.availability
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <option value="">-- select availability --</option>
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                      {formErrors.availability && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.availability}
                        </p>
                      )}
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
                        disabled={!selectedItemForDetails}
                        className={`w-full px-3 py-2 border ${
                          formErrors.stock_price
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formErrors.stock_price && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.stock_price}
                        </p>
                      )}
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
                        disabled={!selectedItemForDetails}
                        className={`w-full px-3 py-2 border ${
                          formErrors.retail_price
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formErrors.retail_price && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.retail_price}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Expiration Date
                      </label>
                      <div className="relative max-w-sm">
                        <input
                          type="date"
                          id="expired_datetime"
                          value={
                            formDataStock.expired_datetime
                              ? formDataStock.expired_datetime.split("T")[0]
                              : ""
                          }
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            setFormDataStock({
                              ...formDataStock,
                              expired_datetime: selectedDate,
                            });
                          }}
                          name="expired_datetime"
                          disabled={!selectedItemForDetails}
                          placeholder="Select date"
                          className={`w-full px-3 py-2 border ${
                            formErrors.expired_datetime
                              ? "border-red-500 focus:ring-red-500"
                              : "border-[#EBEBEB] focus:ring-blue-500"
                          } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                            !selectedItemForDetails
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                        {formErrors.expired_datetime && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.expired_datetime}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Discount (Rs/-)
                      </label>
                      <input
                        type="number"
                        name="discount"
                        value={formDataStock.discount}
                        onChange={handleStockInputChange}
                        disabled={!selectedItemForDetails}
                        placeholder=""
                        className={`w-full px-3 py-2 border ${
                          formErrors.discount
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formErrors.discount && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.discount}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <p className="font-semibold">Recent Batch Code Changes</p>
                    <button
                      onClick={handleStockSubmit}
                      disabled={submitLoading || !selectedItemForDetails}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitLoading ? "Updating..." : "Update Stock"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[10rem] -mr-4">
                    {stockEntries.length === 0 ? (
                      <div className="text-gray-500">No recent batches</div>
                    ) : (
                      stockEntries.map((s, i) => (
                        <div
                          key={s.code + i}
                          className={`${
                            s.code === formDataStock.batch_code
                              ? "border-4 border-blue-500"
                              : ""
                          } flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px] cursor-pointer hover:bg-gray-200 ${
                            !selectedItemForDetails
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          onClick={() => {
                            if (selectedItemForDetails) {
                              setFormDataStock({
                                ...formDataStock,
                                batch_code: s.code,
                              });
                            }
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-md font-bold">
                              Batchcode:
                            </span>
                            <span className="text-gray-600">{s.code}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-bold">
                              {s.quantity}
                            </span>
                            <span className="text-gray-400">{s.expiry}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ return description block ▼ */}
          <div className="bg-white">
            <button
              onClick={() =>
                setOpenFormBlock(openFormBlock === "return" ? "" : "return")
              }
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">RETURN DESCRIPTION</span>
              {openFormBlock === "return" ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openFormBlock === "return" && (
              <div className="px-4 bg-white pb-5">
                <div className="">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formDataReturnItem.quantity}
                        onChange={handleReturnItemInputChange}
                        disabled={!selectedItemForDetails}
                        placeholder="Enter quantity"
                        max={selectedItemForDetails?.current_qty || ""}
                        className={`w-full px-3 py-2 bg-[#F8F8F8] border ${
                          formReturnErrors.quantity
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formReturnErrors.quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {formReturnErrors.quantity}
                        </p>
                      )}
                      {selectedItemForDetails && (
                        <p className="text-gray-500 text-xs mt-1">
                          Available: {selectedItemForDetails.current_qty}{" "}
                          {selectedItemForDetails.uom?.symbol}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      name="return_description"
                      type="text"
                      value={formDataReturnItem.return_description}
                      onChange={handleReturnItemInputChange}
                      disabled={!selectedItemForDetails}
                      placeholder="Enter return reason and details..."
                      rows={3}
                      className={`w-full mt-2 px-3 py-2 bg-[#F8F8F8] border ${
                        formReturnErrors.return_description
                          ? "border-red-500 focus:ring-red-500"
                          : "border-[#EBEBEB] focus:ring-blue-500"
                      } focus:outline-none focus:ring-2 focus:border-transparent ${
                        !selectedItemForDetails
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    {formReturnErrors.return_description && (
                      <p className="text-red-500 text-xs mt-1">
                        {formReturnErrors.return_description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleReturnSubmit}
                      disabled={submitLoading || !selectedItemForDetails}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {submitLoading ? "Processing..." : "Process Return"}
                    </button>
                    <button
                      onClick={resetForms}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Form Selection left section end */}

      {/* Mid Section */}
      <div className="flex-1 bg-gray-50 p-6 shadow-md rounded-md">
        {/* Search bar */}
        <div className="flex items-center border-b border-[#EDEDED] h-12 gap-3 mb-5">
          <input
            type="text"
            placeholder="Search selected items"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="flex items-center px-3 py-2 bg-[#1A318C] text-white disabled:opacity-50 flex-shrink-0"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"
              />
            </svg>
            {searchLoading ? "..." : "Search"}
          </button>
        </div>

        {/* NEW: Display message when no items selected */}
        {selectedItemsForTable.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-lg mb-2">No items selected for return</p>
            <p className="text-sm">
              Select items from the right panel to add them here
            </p>
          </div>
        )}

        {/* Table View - Updated with reference styling */}
        {selectedItemsForTable.length > 0 && (
          <div className="overflow-x-auto h-[28rem] p-2 lg:p-4">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-700 text-[#848484]">
                <tr>
                  <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                    #
                  </th>
                  <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                    SKU
                  </th>
                  <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                    Status
                  </th>
                  <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                    Quantity
                  </th>
                  <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                    Stock Price
                  </th>
                  <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {selectedItemsForTable.map((item, index) => {
                  const isSelectedForDetails =
                    selectedItemForDetails?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => selectItemForDetails(item)}
                      className={`${
                        isSelectedForDetails
                          ? "border-4 border-blue-500"
                          : "border-b border-gray-200"
                      } bg-white hover:bg-red-100 cursor-pointer transition-colors`}
                    >
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        {index + 1}
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        {item.sku || "N/A"}
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            item.availability
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        {item.current_qty} ({item.uom?.symbol || "units"})
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                        ${item.stock_price}
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItemFromTable(item.id);
                          }}
                          aria-label="Remove item"
                          className="m-3 w-5 h-5 rounded-full bg-black inline-flex items-center justify-center focus:outline-none hover:bg-red-600 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Mid Section end */}

      {/* Right Section */}
      <div className=" bg-white border-l border-gray-200">
        <div className="flex flex-col justify-between py-4 px-6 bg-white gap-6 mb-4">
          {/* Right section search bar */}
          <div className="flex items-center border-b border-[#EDEDED] h-12 gap-3 mt-1">
            <button
              onClick={resetForms}
              className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors flex-shrink-0"
              title="Reset Forms"
            >
              <BackIcon />
            </button>

            <input
              type="text"
              placeholder="Search available items"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="flex items-center px-3 py-2 bg-[#1A318C] text-white disabled:opacity-50 flex-shrink-0"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"
                />
              </svg>
              {searchLoading ? "..." : "Search"}
            </button>
          </div>

          {/* Filter section */}
          <div className="flex flex-col gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded"
            >
              <option value="">All Categories</option>
              {SAMPLE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              name="availability"
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Availabilities</option>
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          <div className="h-[calc(100vh-15rem)] overflow-y-scroll bg-transparent">
            <div className="grid grid-cols-1 gap-6 p-4">
              {isLoading || searchLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center mt-32">
                    <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                    <span className="text-gray-700 text-xl mt-1">
                      Please wait...
                    </span>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div
                  className="col-span-full flex flex-col items-center justify-center text-gray-500 text-lg"
                  style={{ minHeight: "50vh" }}
                >
                  <span>No items found!</span>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isAlreadySelected = selectedItemsForTable.find(
                    (selectedItem) => selectedItem.id === item.id
                  );
                  return (
                    <SalesItemCard
                      key={item.id ?? item._id}
                      item={item}
                      onOpen={() => addItemToTable(item)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReturnItem;

// Icon used for all back buttons
const BackIcon = () => (
  <svg
    className="w-4 h-4 text-black"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 19l-7-7 7-7"
    />
  </svg>
);
