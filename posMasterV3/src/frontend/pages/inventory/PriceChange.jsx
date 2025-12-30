import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Search, Package, DollarSign, Tag, Percent, Calendar, X, CheckCircle, Filter, AlertCircle } from "lucide-react";
import barcodeImg from "../../assets/barcode.png";
import SalesItemCard from "../../components/SalesItemCard";
import { restockApi } from "../../api/localApi";
import { useReactiveData, TABLES } from "../../store";

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

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("All");

  // Use reactive data hooks for categories and stock items (items with stock quantities)
  const { data: categories, loading: categoriesLoading } = useReactiveData(TABLES.CATEGORIES);
  const { data: rawItems, loading: itemsLoading } = useReactiveData(TABLES.STOCK);

  // Derive loading state
  const loadingData = categoriesLoading || itemsLoading;

  // Transform stock items to expected format (stock data includes item info + quantities)
  const items = useMemo(() => {
    if (!rawItems || rawItems.length === 0) return [];
    return rawItems.map((item, index) => ({
      id: item.id || item.item_id || item._id || index + 1,
      _id: item._id || `item_${index + 1}`,
      item_id: item.item_id || item.id,
      stock_trace: item.stock_trace || [item.id || index + 1],
      item_name: item.item_name || item.name || "Unknown Item",
      item_image_url: item.item_image_url || item.image_url || "",
      item_image_blob: item.item_image_blob || null,
      sku: item.sku || `SKU_${index + 1}`,
      maximum_capacity: item.maximum_capacity || 100,
      threshold_limit: item.threshold_limit || 20,
      uom_id: item.uom_id || 1,
      category_id: item.category_id || 1,
      inventory_id: item.inventory_id || 1,
      uom: item.uom || { symbol: item.uom_symbol || "pcs", unit_name: item.uom_unit_name || "Pieces" },
      category: item.category || { brand: item.category_brand || "Unknown", type: item.category_type || "General" },
      inventory: item.inventory || null,
      availability: item.availability !== undefined ? item.availability : true,
      // Use quantity from stock data (this is the actual stock quantity)
      quantity: item.quantity || 0,
      current_qty: item.quantity || 0,
      stock_price: item.stock_price || item.price || 0,
      retail_price: item.retail_price || item.selling_price || item.stock_price || 0,
      batch_code: item.batch_code || `BATCH_${item.sku || index + 1}`,
      expire_date: item.expiry_date || item.expire_date || "2025-12-31",
      status: item.availability ? "In Stock" : "Out of Stock",
    }));
  }, [rawItems]);

  // Separate states for different sections
  const [selectedItemsForTable, setSelectedItemsForTable] = useState([]);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  // Loading states
  const [searchLoading, setSearchLoading] = useState(false);
  const [tableSearchLoading, setTableSearchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Success state
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Stock form state
  const [formDataStock, setFormDataStock] = useState(INITIAL_STOCK_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Price change form state
  const [formDataPriceChange, setFormDataPriceChange] = useState(INITIAL_PRICE_CHANGE_FORM);
  const [formPriceChangeErrors, setFormPriceChangeErrors] = useState({});

  // Stock entries state
  const [stockEntries, setStockEntries] = useState([]);
  const [loadingStockEntries, setLoadingStockEntries] = useState(false);
  const [stockEntriesError, setStockEntriesError] = useState(null);

  // Fetch stock entries when an item is selected
  const fetchStockEntriesForItem = useCallback(async (sku) => {
    if (!sku) return;

    try {
      setLoadingStockEntries(true);
      setStockEntriesError(null);

      const response = await restockApi.getStockData(sku);

      let batchEntries = [];
      if (response.status === "success" && Array.isArray(response.data)) {
        batchEntries = response.data.map((batch) => ({
          code: batch.batch_code || batch.code || "Unknown Batch",
          quantity: `${batch.quantity || 0} ${batch.uom_symbol || "pcs"}`,
          expiry: batch.exp_date ? new Date(batch.exp_date).toISOString().split("T")[0] : "No expiry",
          stock_price: batch.stock_price || 0,
          retail_price: batch.retail_price || 0,
          availability: batch.availability !== undefined ? batch.availability : true,
          threshold_limit: batch.threshold_limit || 0,
          discount: batch.discount_price || 0,
        }));
      }

      if (batchEntries.length === 0) {
        batchEntries = [{
          code: `DEFAULT-${sku}`,
          quantity: "0 pcs",
          expiry: "No expiry",
          stock_price: 0,
          retail_price: 0,
          availability: false,
          threshold_limit: 0,
          discount: 0,
        }];
      }

      setStockEntries(batchEntries);
    } catch (error) {
      console.error("Failed to fetch stock entries:", error);
      setStockEntriesError(error.message || "Failed to load batch codes");
      setStockEntries([]);
    } finally {
      setLoadingStockEntries(false);
    }
  }, []);

  // Generate unique category types
  const uniqueCategoryTypes = useMemo(() => {
    const safeCategories = categories || [];
    if (safeCategories.length === 0) {
      const itemCategories = items.map((item) => item.category?.type).filter(Boolean);
      return [...new Set(itemCategories)];
    }
    const types = safeCategories.map((category) => category.type).filter(Boolean);
    return [...new Set(types)];
  }, [categories, items]);

  // Filtered items for right section
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchTerm === "" ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "" || item.category?.type === selectedCategory;

      const matchesAvailability = selectedAvailability === "All" ||
        (selectedAvailability === "Available" && item.availability) ||
        (selectedAvailability === "Unavailable" && !item.availability);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [searchTerm, selectedCategory, selectedAvailability, items]);

  // Filtered table items for mid section
  const filteredTableItems = useMemo(() => {
    return selectedItemsForTable.filter((item) => {
      return tableSearchTerm === "" ||
        item.item_name.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(tableSearchTerm.toLowerCase());
    });
  }, [tableSearchTerm, selectedItemsForTable]);

  // Add item to table
  const addItemToTable = useCallback((item) => {
    setSelectedItemsForTable((prev) => {
      const exists = prev.find((existingItem) => existingItem.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
  }, []);

  // Remove item from table
  const removeItemFromTable = useCallback((itemId) => {
    setSelectedItemsForTable((prev) => prev.filter((item) => item.id !== itemId));

    if (selectedItemForDetails?.id === itemId) {
      setSelectedItemForDetails(null);
      setFormDataStock(INITIAL_STOCK_FORM);
      setFormDataPriceChange(INITIAL_PRICE_CHANGE_FORM);
      setStockEntries([]);
    }
  }, [selectedItemForDetails]);

  // Select item for details
  const selectItemForDetails = useCallback((item) => {
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
  }, [fetchStockEntriesForItem]);

  // Handle batch code selection
  const handleBatchCodeSelect = useCallback((batchEntry) => {
    if (!selectedItemForDetails) return;

    setFormDataStock((prev) => ({
      ...prev,
      batch_code: batchEntry.code,
      stock_price: batchEntry.stock_price?.toString() || prev.stock_price,
      retail_price: batchEntry.retail_price?.toString() || prev.retail_price,
      availability: batchEntry.availability?.toString() || prev.availability,
      expired_datetime: batchEntry.expiry !== "No expiry" ? batchEntry.expiry : prev.expired_datetime,
      threshold_limit: batchEntry.threshold_limit?.toString() || prev.threshold_limit,
      discount: batchEntry.discount?.toString() || prev.discount,
    }));
  }, [selectedItemForDetails]);

  // Event handlers
  const handleStockInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormDataStock((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }, [formErrors]);

  const handlePriceChangeInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormDataPriceChange((prev) => ({ ...prev, [name]: value }));
    if (formPriceChangeErrors[name]) {
      setFormPriceChangeErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }, [formPriceChangeErrors]);

  // Search handlers
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearchTerm(e.target.value);
    setTimeout(() => setSearchLoading(false), 400);
  };

  const handleTableSearch = (e) => {
    setTableSearchLoading(true);
    setTableSearchTerm(e.target.value);
    setTimeout(() => setTableSearchLoading(false), 400);
  };

  // Form validation
  const validateStockForm = () => {
    const errors = {};
    if (!formDataStock.batch_code.trim()) errors.batch_code = "Batch code is required";
    if (!formDataStock.stock_price.trim()) errors.stock_price = "Stock price is required";
    if (!formDataStock.retail_price.trim()) errors.retail_price = "Retail price is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleStockSubmit = useCallback(() => {
    if (validateStockForm()) {
      setSubmitLoading(true);
      setSaveSuccess(false);

      setTimeout(() => {
        if (selectedItemForDetails) {
          const updatedItem = {
            ...selectedItemForDetails,
            batch_code: formDataStock.batch_code,
            current_qty: parseInt(formDataStock.quantity) || selectedItemForDetails.current_qty,
            stock_price: parseFloat(formDataStock.stock_price) || selectedItemForDetails.stock_price,
            retail_price: parseFloat(formDataStock.retail_price) || selectedItemForDetails.retail_price,
            availability: formDataStock.availability === "true",
            expire_date: formDataStock.expired_datetime || selectedItemForDetails.expire_date,
            discount: parseFloat(formDataStock.discount) || 0,
            status: formDataStock.availability === "true" ? "In Stock" : "Out of Stock",
          };

          setSelectedItemsForTable((prev) =>
            prev.map((item) => item.id === selectedItemForDetails.id ? updatedItem : item)
          );
          setSelectedItemForDetails(updatedItem);
          // Note: Items come from reactive hook, they'll update automatically when data changes

          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
        setSubmitLoading(false);
      }, 1500);
    }
  }, [formDataStock, selectedItemForDetails]);

  // Reset forms
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
    setSaveSuccess(false);
    setStockEntries([]);
  }, []);

  // Get display item for left section
  const displayItem = selectedItemForDetails || {
    sku: "N/A",
    item_name: "N/A",
    category: { type: "N/A" },
    current_qty: "N/A",
    uom: { symbol: "" },
  };

  return (
    <div className="flex bg-gray-50 w-full h-[calc(100vh-2rem)]">
      {/* Left Form Section */}
      <div className="bg-gray-100 w-[26rem] h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Item Description Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFormBlock(openFormBlock === "item" ? "" : "item")}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Item Description</span>
              </div>
              {openFormBlock === "item" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFormBlock === "item" && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="flex items-center gap-4 pt-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <img src={barcodeImg} alt="Barcode" className="w-20 object-contain" />
                    <p className="text-xs text-gray-500 mt-1 text-center font-mono">{displayItem?.sku}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase">Name</span>
                      <span className="text-sm font-semibold text-gray-800">{displayItem?.item_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase">Category</span>
                      <span className="text-sm text-gray-600">{displayItem?.category?.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase">Current Qty</span>
                      <span className="text-sm font-bold text-[#1A318C]">{displayItem?.current_qty} {displayItem?.uom?.symbol}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Description Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFormBlock(openFormBlock === "stock" ? "" : "stock")}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stock Description</span>
              </div>
              {openFormBlock === "stock" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFormBlock === "stock" && (
              <div className="px-4 pb-4 border-t border-gray-100 overflow-auto max-h-[calc(100vh-28rem)]">
                <div className="space-y-4 pt-4">
                  {/* Info banner - stock fields are read-only for price change */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-600 font-medium">Stock details are read-only. Use the Price Change section below to update prices.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Batch Code</label>
                      <input
                        type="text"
                        name="batch_code"
                        value={formDataStock.batch_code}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Quantity</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formDataStock.quantity}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Stock Price (Rs.)</label>
                      <input
                        type="number"
                        name="stock_price"
                        value={formDataStock.stock_price}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Retail Price (Rs.)</label>
                      <input
                        type="number"
                        name="retail_price"
                        value={formDataStock.retail_price}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Threshold (%)</label>
                      <input
                        type="number"
                        name="threshold_limit"
                        value={formDataStock.threshold_limit}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Availability</label>
                      <input
                        type="text"
                        name="availability"
                        value={formDataStock.availability === "true" || formDataStock.availability === true ? "Available" : formDataStock.availability === "false" || formDataStock.availability === false ? "Unavailable" : "N/A"}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                      <input
                        type="text"
                        name="expired_datetime"
                        value={formDataStock.expired_datetime ? formDataStock.expired_datetime.split("T")[0] : "N/A"}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Discount (Rs.)</label>
                      <input
                        type="number"
                        name="discount"
                        value={formDataStock.discount}
                        readOnly
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Recent Batches */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Recent Batches {selectedItemForDetails && `(${selectedItemForDetails.sku})`}
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {loadingStockEntries ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full border-2 border-gray-200 border-t-[#1A318C] h-6 w-6 mr-2"></div>
                          <span className="text-gray-500 text-sm">Loading batches...</span>
                        </div>
                      ) : stockEntries.length === 0 ? (
                        <p className="text-gray-400 text-sm py-2">
                          {selectedItemForDetails ? "No batches found" : "Select an item to view batches"}
                        </p>
                      ) : (
                        stockEntries.map((s, i) => (
                          <div
                            key={s.code + i}
                            onClick={() => selectedItemForDetails && handleBatchCodeSelect(s)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                              s.code === formDataStock.batch_code
                                ? "bg-[#1A318C]/10 border-2 border-[#1A318C]"
                                : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                            } ${!selectedItemForDetails ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{s.code}</p>
                              <p className="text-xs text-gray-500">{s.expiry}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#1A318C]">{s.quantity}</p>
                              <p className="text-xs text-gray-400">Rs.{s.retail_price}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Change Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFormBlock(openFormBlock === "pricechange" ? "" : "pricechange")}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Price Change</span>
              </div>
              {openFormBlock === "pricechange" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFormBlock === "pricechange" && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">New Price (Rs.)</label>
                    <input
                      type="number"
                      name="new_price"
                      value={formDataPriceChange.new_price}
                      onChange={handlePriceChangeInputChange}
                      disabled={!selectedItemForDetails}
                      placeholder="Enter new price"
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all ${!selectedItemForDetails ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    {selectedItemForDetails && (
                      <p className="text-xs text-gray-400 mt-1">Current: Rs.{selectedItemForDetails.retail_price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Reason</label>
                    <textarea
                      name="price_change_description"
                      value={formDataPriceChange.price_change_description}
                      onChange={handlePriceChangeInputChange}
                      disabled={!selectedItemForDetails}
                      placeholder="Enter reason for price change..."
                      rows={2}
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all resize-none ${!selectedItemForDetails ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {saveSuccess && (
              <div className="absolute top-4 left-4 right-4 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Updated successfully!
              </div>
            )}
            <button
              onClick={resetForms}
              className="flex-1 h-12 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              Clear
            </button>
            <button
              onClick={handleStockSubmit}
              disabled={submitLoading || !selectedItemForDetails}
              className="flex-1 h-12 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all duration-200 shadow-md shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Middle Section - Selected Items Table */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {/* Search Header */}
        <nav className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={tableSearchTerm}
                  onChange={handleTableSearch}
                  placeholder="Search selected items..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <button
                className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{selectedItemsForTable.length}</span> items selected for price change
              </p>
            </div>
          </div>
        </nav>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6">
          {selectedItemsForTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No items selected</h3>
              <p className="text-sm text-gray-500 mt-1">Select items from the right panel to add them here</p>
            </div>
          ) : filteredTableItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search term</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1A318C] to-[#2a4ab8]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Stock Price</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Retail Price</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTableItems.map((item, index) => {
                    const isSelected = selectedItemForDetails?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => selectItemForDetails(item)}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-[#1A318C]/5 ring-2 ring-inset ring-[#1A318C]" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-gray-600">{item.sku}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-800">{item.item_name}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${item.availability ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-gray-800 tabular-nums">
                            {item.current_qty} <span className="text-gray-400 font-normal">{item.uom?.symbol}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-600 tabular-nums">Rs.{item.stock_price}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-[#1A318C] tabular-nums">Rs.{item.retail_price}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItemFromTable(item.id);
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors group"
                          >
                            <X className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
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
      </div>

      {/* Right Section - Item Selection */}
      <div className="bg-gray-100 w-80 h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search items..."
                className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                <Filter className="w-3 h-3 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filters</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={loadingData}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
            >
              <option value="">{loadingData ? "Loading..." : "All Categories"}</option>
              {uniqueCategoryTypes.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          {/* Items List */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-full overflow-y-auto p-3">
              {loadingData ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-10 w-10 mb-3"></div>
                  <span className="text-gray-500 text-sm">Loading items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Package className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">No items found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <SalesItemCard
                      key={item.id ?? item._id}
                      item={item}
                      onOpen={() => addItemToTable(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Summary</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available Items</span>
              <span className="text-sm font-bold text-gray-800">{filteredItems.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceChange;
