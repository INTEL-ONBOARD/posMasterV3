import React, { useState, useMemo, useCallback, useEffect } from "react";
import barcodeImg from "../../assets/barcode.png";
import { ChevronDown, ChevronUp } from "lucide-react";
import SalesItemCard from "../../components/SalesItemCard";
import { fetchCommonData } from "../../context/inventory/common/CommonContext";
import { fetchStockContext } from "../../context/inventory/return-stock/ReturnStockContext";

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

const INITIAL_PRICE_CHANGE_FORM = {
  new_price: "",
  price_change_description: "",
};

function PriceChange() {
  // Form section state
  const [openFormBlock, setOpenFormBlock] = useState("item");

  // Search and filter state - SEPARATED for right section and mid section
  const [searchTerm, setSearchTerm] = useState(""); // For right section (available items)
  const [tableSearchTerm, setTableSearchTerm] = useState(""); // For mid section (selected items table)
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("All");

  // API data states
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Separate states for different sections
  const [selectedItemsForTable, setSelectedItemsForTable] = useState([]); // Mid section table items
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null); // Left section details

  // Loading states - SEPARATED for different search bars
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false); // For right section search
  const [tableSearchLoading, setTableSearchLoading] = useState(false); // For mid section search
  const [submitLoading, setSubmitLoading] = useState(false);

  // Success state
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Stock form state
  const [formDataStock, setFormDataStock] = useState(INITIAL_STOCK_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Price change form state
  const [formDataPriceChange, setFormDataPriceChange] = useState(
    INITIAL_PRICE_CHANGE_FORM
  );
  const [formPriceChangeErrors, setFormPriceChangeErrors] = useState({});

  // Stock entries state
  const [stockEntries, setStockEntries] = useState([]);
  const [loadingStockEntries, setLoadingStockEntries] = useState(false);
  const [stockEntriesError, setStockEntriesError] = useState(null);

  // Fetch data from API on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setDataError(null);
        const data = await fetchCommonData();

        setCategories(data.categories || []);

        let apiItems = [];
        if (data.items) {
          if (Array.isArray(data.items)) {
            apiItems = data.items;
          } else if (data.items.data && Array.isArray(data.items.data)) {
            apiItems = data.items.data;
          } else {
            console.warn("Unexpected items structure:", data.items);
            apiItems = [];
          }
        }

        const transformedItems = apiItems.map((item, index) => ({
          id: item.id || item._id || index + 1,
          _id: item._id || `item_${index + 1}`,
          stock_trace: item.stock_trace || [item.id || index + 1],
          item_name: item.item_name || item.name || "Unknown Item",
          item_image_url: item.item_image_url || item.image_url || "",
          sku: item.sku || `SKU_${index + 1}`,
          maximum_capacity: item.maximum_capacity || 0,
          uom_id: item.uom_id || 1,
          category_id: item.category_id || 1,
          inventory_id: item.inventory_id || 1,
          item_update_datetime:
            item.item_update_datetime ||
            item.updated_at ||
            new Date().toISOString(),
          item_created_datetime:
            item.item_created_datetime ||
            item.created_at ||
            new Date().toISOString(),
          __v: item.__v || 0,
          uom: item.uom || {
            _id: `uom_${index + 1}`,
            id: item.uom_id || 1,
            symbol: item.uom?.symbol || "pcs",
            unit_name: item.uom?.unit_name || "Pieces",
            __v: 0,
          },
          category: item.category || {
            _id: `category_${index + 1}`,
            id: item.category_id || 1,
            brand: item.category?.brand || "Unknown Brand",
            type: item.category?.type || "General",
            __v: 0,
          },
          inventory: item.inventory || null,
          availability:
            item.availability !== undefined ? item.availability : true,
          current_qty: item.current_qty || item.quantity || 0,
          stock_price: item.stock_price || item.price || 0,
          retail_price:
            item.retail_price || item.selling_price || item.stock_price || 0,
          batch_code: item.batch_code || `BATCH_${item.sku || index + 1}`,
          expire_date: item.expire_date || item.expiry_date || "2025-12-31",
          status:
            item.status || (item.availability ? "In Stock" : "Out of Stock"),
        }));

        setItems(transformedItems);

        console.log("Loaded data:", {
          categories: data.categories?.length || 0,
          items: transformedItems.length,
          sampleItem: transformedItems[0],
        });
      } catch (error) {
        console.error("Failed to load data:", error);
        setDataError(error.message || "Failed to load data");
        setCategories([]);
        setItems([]);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Fetch stock entries (batch codes) when an item is selected
  const fetchStockEntriesForItem = useCallback(async (sku) => {
    if (!sku) return;

    try {
      setLoadingStockEntries(true);
      setStockEntriesError(null);

      console.log("Fetching stock entries for SKU:", sku);

      const stockData = await fetchStockContext();

      let batchEntries = [];
      if (stockData.batchCodes && Array.isArray(stockData.batchCodes)) {
        batchEntries = stockData.batchCodes
          .filter((batch) => batch.sku === sku || batch.item_sku === sku)
          .map((batch) => ({
            code: batch.batch_code || batch.code || "Unknown Batch",
            quantity: `${batch.quantity || 0} ${batch.uom_symbol || "pcs"}`,
            expiry: batch.expire_date
              ? new Date(batch.expire_date).toISOString().split("T")[0]
              : "No expiry",
            stock_price: batch.stock_price || 0,
            retail_price: batch.retail_price || 0,
            availability:
              batch.availability !== undefined ? batch.availability : true,
            threshold_limit: batch.threshold_limit || 0,
            discount: batch.discount || 0,
          }));
      }

      if (batchEntries.length === 0) {
        batchEntries = [
          {
            code: `DEFAULT-${sku}`,
            quantity: "0 pcs",
            expiry: "No expiry",
            stock_price: 0,
            retail_price: 0,
            availability: false,
            threshold_limit: 0,
            discount: 0,
          },
        ];
      }

      setStockEntries(batchEntries);

      console.log("Loaded stock entries:", batchEntries);
    } catch (error) {
      console.error("Failed to fetch stock entries:", error);
      setStockEntriesError(error.message || "Failed to load batch codes");

      setStockEntries([
        {
          code: `ERROR-${sku}`,
          quantity: "0 pcs",
          expiry: "Error loading",
          stock_price: 0,
          retail_price: 0,
          availability: false,
          threshold_limit: 0,
          discount: 0,
        },
      ]);
    } finally {
      setLoadingStockEntries(false);
    }
  }, []);

  // Generate unique category types from API categories
  const uniqueCategoryTypes = useMemo(() => {
    if (!categories || categories.length === 0) {
      const itemCategories = items
        .map((item) => item.category?.type)
        .filter(Boolean);
      return [...new Set(itemCategories)];
    }

    const types = categories.map((category) => category.type).filter(Boolean);
    return [...new Set(types)];
  }, [categories, items]);

  // Memoized filtered items for performance (Right section - available items)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "" || item.category?.type === selectedCategory;

      const matchesAvailability =
        selectedAvailability === "All" ||
        (selectedAvailability === "Available" && item.availability) ||
        (selectedAvailability === "Unavailable" && !item.availability);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [searchTerm, selectedCategory, selectedAvailability, items]);

  // Memoized filtered table items for performance (Mid section - selected items table)
  const filteredTableItems = useMemo(() => {
    return selectedItemsForTable.filter((item) => {
      const matchesSearch =
        tableSearchTerm === "" ||
        item.item_name.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
        item.batch_code
          ?.toLowerCase()
          .includes(tableSearchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(tableSearchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [tableSearchTerm, selectedItemsForTable]);

  // Add item to mid section table from right section
  const addItemToTable = useCallback((item) => {
    setSelectedItemsForTable((prev) => {
      const exists = prev.find((existingItem) => existingItem.id === item.id);
      if (exists) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  // Remove item from mid section table
  const removeItemFromTable = useCallback(
    (itemId) => {
      setSelectedItemsForTable((prev) =>
        prev.filter((item) => item.id !== itemId)
      );

      if (selectedItemForDetails?.id === itemId) {
        setSelectedItemForDetails(null);
        setFormDataStock(INITIAL_STOCK_FORM);
        setFormDataPriceChange(INITIAL_PRICE_CHANGE_FORM);
        setStockEntries([]);
      }
    },
    [selectedItemForDetails]
  );

  // Select item for left section details from mid section table
  const selectItemForDetails = useCallback(
    (item) => {
      setSelectedItemForDetails(item);

      setFormDataStock((prev) => ({
        ...prev,
        batch_code: item.batch_code || "",
        quantity: item.current_qty?.toString() || "",
        stock_price: item.stock_price?.toString() || "",
        retail_price: item.retail_price?.toString() || "",
        availability: item.availability?.toString() || "",
        expired_datetime: item.expire_date || "",
      }));

      setFormDataPriceChange((prev) => ({
        ...prev,
        new_price: item.retail_price?.toString() || "",
      }));

      fetchStockEntriesForItem(item.sku);

      console.log("Selected item for details:", item);
    },
    [fetchStockEntriesForItem]
  );

  // Handle batch code selection with all related data
  const handleBatchCodeSelect = useCallback(
    (batchEntry) => {
      if (!selectedItemForDetails) return;

      setFormDataStock((prev) => ({
        ...prev,
        batch_code: batchEntry.code,
        stock_price: batchEntry.stock_price?.toString() || prev.stock_price,
        retail_price: batchEntry.retail_price?.toString() || prev.retail_price,
        availability: batchEntry.availability?.toString() || prev.availability,
        expired_datetime:
          batchEntry.expiry !== "No expiry" &&
          batchEntry.expiry !== "Error loading"
            ? batchEntry.expiry
            : prev.expired_datetime,
        threshold_limit:
          batchEntry.threshold_limit?.toString() || prev.threshold_limit,
        discount: batchEntry.discount?.toString() || prev.discount,
      }));

      console.log("Selected batch entry:", batchEntry);
    },
    [selectedItemForDetails]
  );

  // Event handlers
  const handleStockInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormDataStock((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (formErrors[name]) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    },
    [formErrors]
  );

  const handlePriceChangeInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormDataPriceChange((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (formPriceChangeErrors[name]) {
        setFormPriceChangeErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    },
    [formPriceChangeErrors]
  );

  // Search handlers
  const handleSearch = useCallback(() => {
    setSearchLoading(true);
    setTimeout(() => {
      setSearchLoading(false);
    }, 1000);
  }, []);

  const handleTableSearch = useCallback(() => {
    setTableSearchLoading(true);
    setTimeout(() => {
      setTableSearchLoading(false);
    }, 500);
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

  // Form submission handlers
  const handleStockSubmit = useCallback(() => {
    if (validateStockForm()) {
      setSubmitLoading(true);
      setSaveSuccess(false);

      setTimeout(() => {
        console.log("Stock form submitted:", formDataStock);

        if (selectedItemForDetails) {
          const updatedItem = {
            ...selectedItemForDetails,
            batch_code: formDataStock.batch_code,
            current_qty:
              parseInt(formDataStock.quantity) ||
              selectedItemForDetails.current_qty,
            stock_price:
              parseFloat(formDataStock.stock_price) ||
              selectedItemForDetails.stock_price,
            retail_price:
              parseFloat(formDataStock.retail_price) ||
              selectedItemForDetails.retail_price,
            availability: formDataStock.availability === "true",
            expire_date:
              formDataStock.expired_datetime ||
              selectedItemForDetails.expire_date,
            discount: parseFloat(formDataStock.discount) || 0,
            threshold_limit:
              parseFloat(formDataStock.threshold_limit) ||
              selectedItemForDetails.threshold_limit,
            status:
              formDataStock.availability === "true"
                ? "In Stock"
                : "Out of Stock",
            item_update_datetime: new Date().toISOString(),
          };

          setSelectedItemsForTable((prev) =>
            prev.map((item) =>
              item.id === selectedItemForDetails.id ? updatedItem : item
            )
          );
          setSelectedItemForDetails(updatedItem);
          setItems((prev) =>
            prev.map((item) =>
              item.id === selectedItemForDetails.id ? updatedItem : item
            )
          );

          setSaveSuccess(true);

          setTimeout(() => setSaveSuccess(false), 3000);
        }

        setSubmitLoading(false);
      }, 1500);
    }
  }, [formDataStock, selectedItemForDetails, validateStockForm]);

  // Clear function for all clear buttons
  const resetForms = useCallback(() => {
    setFormDataStock(INITIAL_STOCK_FORM);
    setFormDataPriceChange(INITIAL_PRICE_CHANGE_FORM);

    setFormErrors({});
    setFormPriceChangeErrors({});

    setSelectedItemForDetails(null);
    setSelectedItemsForTable([]);

    setSearchTerm("");
    setTableSearchTerm("");
    setSelectedCategory("");
    setSelectedAvailability("All");

    setOpenFormBlock("item");

    setSearchLoading(false);
    setTableSearchLoading(false);
    setSubmitLoading(false);

    setSaveSuccess(false);

    setStockEntries([]);
    setLoadingStockEntries(false);
    setStockEntriesError(null);

    console.log("All forms and states have been cleared");
  }, []);

  // Get display item for left section (N/A if no selection)
  const displayItem = selectedItemForDetails || {
    sku: "N/A",
    item_name: "N/A",
    category: { type: "N/A" },
    current_qty: "N/A",
    uom: { symbol: "" },
  };

  return (
    <div className="flex bg-white w-full h-[calc(100vh-2rem)] relative">
      {/* Form section left */}
      <div className="bg-gray-300 w-[calc(30.5rem)] h-[calc(100vh-2rem)] p-2 z-10">
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
                      <p className="text-sm font-semibold text-gray-800">
                        Current Qty
                      </p>
                      <p className="text-sm text-gray-700">
                        {displayItem?.current_qty} {displayItem?.uom?.symbol}
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
                  <div className="pt-4">
                    <span className="text-gray-500 text-sm font-bold mt-4 ml-1">
                      Recent Batches{" "}
                      {selectedItemForDetails &&
                        `(SKU: ${selectedItemForDetails.sku})`}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[10rem] -mr-4">
                    {loadingStockEntries ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 h-6 w-6 mr-2"></div>
                        <span className="text-gray-500">
                          Loading batch codes...
                        </span>
                      </div>
                    ) : stockEntriesError ? (
                      <div className="text-red-500 text-sm p-2">
                        Error loading batch codes: {stockEntriesError}
                      </div>
                    ) : stockEntries.length === 0 ? (
                      <div className="text-gray-500 p-2">
                        {selectedItemForDetails
                          ? "No batch codes found for this item"
                          : "Select an item to view batch codes"}
                      </div>
                    ) : (
                      stockEntries.map((s, i) => (
                        <div
                          key={s.code + i}
                          className={`${
                            s.code === formDataStock.batch_code
                              ? "border-4 border-blue-500"
                              : "border border-gray-200"
                          } flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px] cursor-pointer hover:bg-gray-200 transition-colors ${
                            !selectedItemForDetails
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          onClick={() => {
                            if (selectedItemForDetails) {
                              handleBatchCodeSelect(s);
                            }
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-md font-bold">
                              Batch Code:
                            </span>
                            <span className="text-gray-600">{s.code}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-gray-400 font-bold">
                              {s.quantity}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {s.expiry}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ price change description block ▼ */}
          <div className="bg-white">
            <button
              onClick={() =>
                setOpenFormBlock(
                  openFormBlock === "pricechange" ? "" : "pricechange"
                )
              }
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">PRICE CHANGE DESCRIPTION</span>
              {openFormBlock === "pricechange" ? (
                <ChevronUp />
              ) : (
                <ChevronDown />
              )}
            </button>
            {openFormBlock === "pricechange" && (
              <div className="px-4 bg-white pb-5">
                <div className="">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-1">
                        New Price
                      </label>
                      <input
                        type="number"
                        name="new_price"
                        value={formDataPriceChange.new_price}
                        onChange={handlePriceChangeInputChange}
                        disabled={!selectedItemForDetails}
                        placeholder="Enter new price"
                        className={`w-full px-3 py-2 bg-[#F8F8F8] border ${
                          formPriceChangeErrors.new_price
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#EBEBEB] focus:ring-blue-500"
                        } focus:outline-none focus:ring-2 focus:border-transparent ${
                          !selectedItemForDetails
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      />
                      {formPriceChangeErrors.new_price && (
                        <p className="text-red-500 text-xs mt-1">
                          {formPriceChangeErrors.new_price}
                        </p>
                      )}
                      {selectedItemForDetails && (
                        <p className="text-gray-500 text-xs mt-1">
                          Current Price: ${selectedItemForDetails.retail_price}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Reason for Price Change
                    </label>
                    <textarea
                      name="price_change_description"
                      type="text"
                      value={formDataPriceChange.price_change_description}
                      onChange={handlePriceChangeInputChange}
                      disabled={!selectedItemForDetails}
                      placeholder="Enter reason for price change..."
                      rows={3}
                      className={`w-full mt-2 px-3 py-2 bg-[#F8F8F8] border ${
                        formPriceChangeErrors.price_change_description
                          ? "border-red-500 focus:ring-red-500"
                          : "border-[#EBEBEB] focus:ring-blue-500"
                      } focus:outline-none focus:ring-2 focus:border-transparent ${
                        !selectedItemForDetails
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    {formPriceChangeErrors.price_change_description && (
                      <p className="text-red-500 text-xs mt-1">
                        {formPriceChangeErrors.price_change_description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Save and clear buttons - LEFT SECTION */}
          <div className="bottom-4 left-4 right-4 flex gap-2 justify-end items-end">
            {saveSuccess && (
              <div className="absolute -top-12 left-0 right-0 mx-4 p-2 bg-green-100 text-green-700 text-sm rounded">
                Stock information updated successfully!
              </div>
            )}
            <button
              onClick={resetForms}
              className="flex items-center px-6 py-2 bg-gray-400 text-white hover:bg-gray-500 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              Clear
            </button>
            <button
              onClick={handleStockSubmit}
              disabled={submitLoading || !selectedItemForDetails}
              className="flex items-center px-6 py-2 bg-[#1A318C] text-white hover:bg-[#152763] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {submitLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
      {/* Form Selection left section end */}

      {/* Mid Section */}
      <div className="flex-1 bg-gray-50 p-6 shadow-md rounded-md">
        {/* Search bar for table items only */}
        <div className="flex items-center border-b border-[#EDEDED] h-12 gap-3 mb-5">
          <input
            type="text"
            placeholder="Search selected items in table"
            value={tableSearchTerm}
            onChange={(e) => setTableSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
          />
          <button
            onClick={handleTableSearch}
            disabled={tableSearchLoading}
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
            {tableSearchLoading ? "..." : "Search"}
          </button>
        </div>

        {/* Display message when no items selected */}
        {selectedItemsForTable.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-lg mb-2">No items selected for price change</p>
            <p className="text-sm">
              Select items from the right panel to add them here
            </p>
          </div>
        )}

        {/* Show message when table search has no results */}
        {selectedItemsForTable.length > 0 &&
          filteredTableItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p className="text-lg mb-2">No items found in table</p>
              <p className="text-sm">
                Try adjusting your search term: "{tableSearchTerm}"
              </p>
            </div>
          )}

        {/* Save and clear buttons - MID SECTION - ONLY SHOW WHEN THERE IS DATA */}
        {selectedItemsForTable.length > 0 && (
          <div className="bottom-4 left-0.5 right-4 flex gap-2 justify-end items-end relative">
            {saveSuccess && (
              <div className="absolute -top-12 left-0 right-0 p-2 bg-green-100 text-green-700 text-sm rounded">
                Items updated successfully!
              </div>
            )}
            <button
              onClick={resetForms}
              className="flex items-center px-6 py-2 bg-gray-400 text-white hover:bg-gray-500 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              Clear
            </button>
            <button
              onClick={handleStockSubmit}
              disabled={submitLoading || !selectedItemForDetails}
              className="flex items-center px-6 py-2 bg-[#2fbc34] text-white hover:bg-[#28a62f] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {submitLoading ? "Saving..." : "Done"}
            </button>
          </div>
        )}

        {/* Table View - Uses filteredTableItems */}
        {selectedItemsForTable.length > 0 && filteredTableItems.length > 0 && (
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
                {filteredTableItems.map((item, index) => {
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
          {/* Right section search bar - for available items */}
          <div className="flex items-center border-b border-[#EDEDED] h-12 gap-3 mt-1">
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
              disabled={loadingData}
              className="w-full h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded disabled:opacity-50"
            >
              <option value="">
                {loadingData ? "Loading categories..." : "All Categories"}
              </option>
              {uniqueCategoryTypes.map((category) => (
                <option key={category} value={category}>
                  {category}
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
              {loadingData ? (
                <div className="col-span-full flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center mt-32">
                    <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                    <span className="text-gray-700 text-xl mt-1">
                      Loading items...
                    </span>
                  </div>
                </div>
              ) : dataError ? (
                <div className="col-span-full flex flex-col items-center justify-center text-red-500 text-lg">
                  <p className="mb-2">Error loading items</p>
                  <p className="text-sm text-gray-500">{dataError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredItems.length === 0 ? (
                <div
                  className="col-span-full flex flex-col items-center justify-center text-gray-500 text-lg"
                  style={{ minHeight: "50vh" }}
                >
                  <span>No items found!</span>
                  {items.length === 0 && (
                    <p className="text-sm mt-2">
                      No items available in inventory
                    </p>
                  )}
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

export default PriceChange;
