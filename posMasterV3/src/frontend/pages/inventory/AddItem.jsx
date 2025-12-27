import React, { useState, useRef, useEffect, useContext, useMemo } from "react";
import { uomApi, categoryApi, itemApi } from "../../api/localApi";
import { useNavigate } from "react-router-dom";
import { X, Printer, ChevronDown, ChevronUp, Search, Package, Filter, SortAsc, Upload, Image } from "lucide-react";
import AddItemCard from "../../components/AddItemCard.jsx";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal.jsx";
import barcodeImg from "../../assets/barcode.png";
import ToastContext from "../toasts/ToastService.jsx";
import { useStatusLog } from "../../services/StatusLogService.jsx";
import { useReactiveData, TABLES } from "../../store";

import { pdf } from '@react-pdf/renderer';
import SimpleDocument from './layout/BarcodeBulk.jsx';
import JsBarcode from 'jsbarcode';
import registerItemService from "../../api/services/inventory/registerItemService.jsx";


function AddItem({ isActive }) {
  const toast = useContext(ToastContext);
  const statusLog = useStatusLog();

  // Use reactive data hooks for UOMs, Categories, and Items
  const { data: uoms } = useReactiveData(
    TABLES.UOM,
    null,
    { enabled: isActive }
  );

  const { data: itemCategories } = useReactiveData(
    TABLES.CATEGORIES,
    null,
    { enabled: isActive }
  );

  const { data: inventoryItems, loading: isLoading, refetch: refetchItems } = useReactiveData(
    TABLES.ITEMS,
    null,
    { enabled: isActive }
  );

  //holds the selected UOM id from the dropdown
  const [formUOMData, setFormUOMData] = useState(null);

  // when user picks a UOM
  const handleUOMChange = e => {
    const uomId = Number(e.target.value);
    setFormUOMData(uomId);
    // optionally keep formData.uom_id in sync:
    setFormData(fd => ({
      ...fd,
      uom_id: uomId,
      uom: (uoms || []).find(u => u.id === uomId) || fd.uom
    }));
  };

  //to select the brand option from category
  const [selectedCategoryType, setSelectedCategoryType] = useState("");

  // Derive unique category types from reactive data
  const uniqueCategoryTypes = useMemo(() => {
    if (!itemCategories || itemCategories.length === 0) return [];
    return Array.from(new Set(itemCategories.map(c => c.type)));
  }, [itemCategories]);

  // Derive brand options based on selected category type
  const brandOptions = useMemo(() => {
    if (!selectedCategoryType || !itemCategories) return [];
    return itemCategories
      .filter(c => c.type === selectedCategoryType)
      .map(c => c.brand);
  }, [selectedCategoryType, itemCategories]);

  const handleCategoryChange = e => {
    const newType = e.target.value;
    setSelectedCategoryType(newType);
    setFormCategoryData(f => ({ ...f, categoryType: newType, brand: "" }));
  };

  const handleBrandChange = e => {
    console.log("value changed: " + e.target.value)
    setFormCategoryData(f => ({ ...f, brand: e.target.value }));
  };

  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  // Form select
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [deletingItem, setDeletingItem] = useState(INITIAL_FORM_DATA);

  const [formCategoryData, setFormCategoryData] = useState({
    categoryType: "",
    brand: "",
  });

  // Barcode generation
  const barcodeValue = formData.sku || "-";

  const generateBarcode = () => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
      });
      resolve(canvas.toDataURL('image/png'));
    });
  };

  const generatePdf = async (action) => {
    try {
      const barcodeDataUrl = await generateBarcode();
      const instance = pdf(<SimpleDocument
        barcodeDataUrl={barcodeDataUrl}
        barcodeValue={barcodeValue}
      />);

      const blob = await instance.toBlob();
      if (action === 'print') {
        const arrayBuffer = await blob.arrayBuffer();
        window.electronAPI.sendPrintSilent(arrayBuffer);
      } else if (action === 'download') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `barcode-${barcodeValue}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      console.error('Error:', error);
      //alert('Failed to generate PDF');
      toast.open("Failed to generate PDF", 4000, 'Pdf Failed', 'error');
    }
  };

  //filteriings
  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Image upload handler - converts file to base64 blob
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.open("Please select an image file", 4000, 'Invalid File', 'error');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.open("Image size must be less than 5MB", 4000, 'File Too Large', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData(prev => ({
        ...prev,
        item_image_blob: base64String
      }));
      toast.open("Image uploaded successfully", 2000, 'Success', 'success');
    };
    reader.onerror = () => {
      toast.open("Failed to read image file", 4000, 'Error', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      item_image_blob: null,
      item_image_url: null
    }));
  };

  // Get display image (blob takes priority over url)
  const getDisplayImage = () => {
    return formData.item_image_blob || formData.item_image_url || null;
  };


  // to switch between add and update api call via button switching
  const [isUserEditting, setUserEditing] = useState(false);


  const registerItem = async (e) => {
    setFormStatus("loading");
    statusLog.database("Registering new item...", true);
    e.preventDefault();
    try {
      const selectedCategory = (itemCategories || []).find(c =>
        c.type === formCategoryData.categoryType &&
        c.brand === formCategoryData.brand
      );
      const requestData = {
        item_name: formData.item_name,
        item_image_blob: formData.item_image_blob || null,
        item_code: formData.item_code,
        sku: formData.sku,
        maximum_capacity: Number(formData.maximum_capacity),
        uom_id: formUOMData,
        category_id: selectedCategory?.id ?? null, // look up id
        inventory_id: 1, // Fixed value
        availability: formData.availability,
        stock_trace: [101] // Fixed value
      };
      const response = await registerItemService.registerItem(requestData);
      if (response.status === "success") {
        // Add new item to local state
        //clear data upon successful response
        setFormStatus("success");
        statusLog.success(`Item "${formData.item_name}" registered successfully`);
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        clearUserInput();
      } else {
        setFormStatus("fail");
        statusLog.error("Failed to register item");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      }
    } catch (err) {
      setFormStatus("fail");
      statusLog.error("Item registration failed");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      toast.open("Create item operation failed", 4000, 'Item creation Failed', 'error');
    }
    finally {
      //repopulate items
      refetchItems();
    }
  };


  const updateItem = async (e) => {
    setFormStatus("loading");
    statusLog.database("Updating item...", true);
    e.preventDefault();
    try {
      const selectedCategory = (itemCategories || []).find(c =>
        c.type === formCategoryData.categoryType &&
        c.brand === formCategoryData.brand
      );
      const requestData = {
        item_name: formData.item_name,
        item_image_blob: formData.item_image_blob || null,
        item_code: formData.item_code,
        sku: formData.sku,
        maximum_capacity: Number(formData.maximum_capacity),
        uom_id: formUOMData,
        category_id: selectedCategory?.id ?? null, // look up id
        inventory_id: 1, // Fixed value
        availability: formData.availability,
        stock_trace: [101], // Fixed value
      };

      const response = await registerItemService.updateItem(formData.id, requestData);

      if (response.status === "success") {
        setFormStatus("success");
        statusLog.success(`Item "${formData.item_name}" updated successfully`);
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        toast.open("Item updated successfully", 4000, 'Success', 'success');
        //clear data upon successful response
        clearUserInput();
        setUserEditing(false);
      } else {
        setFormStatus("fail");
        statusLog.error("Failed to update item");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        toast.open("Failed to update the item, please try again", 4000, 'Request failed', 'error');
      }
    } catch (err) {
      setFormStatus("fail");
      statusLog.error("Item update failed");
      // after 4 seconds, flip back to the form
      timerRef.current = window.setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 4000);
      toast.open("Update item operation faild. Please try again", 4000, 'Item update Failed', 'error');
    }
    finally {
      //repopulate items
      refetchItems();
    }
  };

  //clear the form and related statee data(hrrngh)
  const clearUserInput = () => {
    //alert("clearing user inputs")
    setFormData(INITIAL_FORM_DATA)
    setSelectedCategoryType("");
    // brandOptions is derived from selectedCategoryType via useMemo, so it will clear automatically
    setFormCategoryData({
      categoryType: "",
      brand: "",
    });
    setFormUOMData(null);
    //switch from update item button to add item button
    setUserEditing(false)
  }

  // Load item object into form
  const loadItem = (item) => {
    //to enable edit button and disable the create button
    setUserEditing(true);
    setFormData(item);
    // 2. extract its category & brand:
    const { type, brand } = item.category || {};
    // 3a. set the category‐dropdown state (this also fires your useEffect to populate brandOptions)
    setSelectedCategoryType(type || "");
    // 3b. explicitly set the form's dropdown values:
    setFormCategoryData({
      categoryType: type || "",
      brand: brand || "",
    });
    //set unit of measure in the dropdown
    // 3. pre‐select the UOM dropdown
    setFormUOMData(item.uom?.id);
    // and keep formData.uom_id correct:
    setFormData(fd => ({ ...fd, uom_id: item.uom?.id, uom: item.uom }));
  };


  // Delete item handlers
  const handleRemoveClick = (itemId) => {
    const item = (inventoryItems || []).find(i => i.id === itemId);
    setDeletingItem(item);
    setShowDeleteModal(true);
    //addditional fetch handling

  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
  };

  //helper method for item availability filtering
  const interpretAvailability = (item) => {
    // handle boolean, string, numeric types defensively
    const a = item?.availability;
    if (typeof a === "boolean") return a;
    if (typeof a === "string") return a.toLowerCase() === "true";
    return Boolean(a); // numbers (1/0) or other truthy/falsy
  };

  // Filter items based on search, category and availability
  const filteredItems = (inventoryItems || []).filter((item) => {
    // category match: either All or item.category.type equals selected
    const matchesCategory =
      searchCategory === "All" ||
      (item?.category && item.category.type === searchCategory);

    // availability match: All, Available (true), Unavailable (false)
    const isAvailable = interpretAvailability(item);
    const matchesAvailability =
      searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // Item name or batch code text search match
    const searchTerm = (search || "").toLowerCase();
    // text search match
    const matchesSearch =
      (item?.item_name || "").toLowerCase().includes(searchTerm) ||
      (item?.batch_code || "").toLowerCase().includes(searchTerm) ||
      (item?.sku || "").toLowerCase().includes(searchTerm);

    return matchesCategory && matchesAvailability && matchesSearch;
  });

  const [openBasic, setOpenBasic] = useState(false);
  const [openPrimary, setOpenPrimary] = useState(true);

  const [formStatus, setFormStatus] = useState("form");   // possible values: "form" | "loading" | "success" | "fail"
  // keep the timer ID so we can clear it if the component unmounts early
  const timerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  //right filter section controls
  const [openFilter, setOpenFilter] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  return (
    <div className="flex flex-row bg-gray-50">
      {/* Item form (left) */}
      {formStatus === "form" ? (
      <div className="bg-gray-100 w-[28rem] h-[calc(100vh-2rem)] p-3 z-10 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col gap-3">
          {/* ▼ Basic info block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenBasic(!openBasic)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Barcode & SKU</span>
              </div>
              {openBasic ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openBasic && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="flex flex-row items-center gap-6 pt-4">
                  {/* Image Upload Section */}
                  <div className="relative">
                    <input
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    {getDisplayImage() ? (
                      <div className="relative w-32 h-32 group">
                        <img
                          src={getDisplayImage()}
                          alt="Item"
                          className="w-full h-full object-cover rounded-xl border-2 border-gray-200"
                        />
                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label
                            htmlFor="imageUpload"
                            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                            title="Change image"
                          >
                            <Upload className="w-4 h-4 text-gray-700" />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            title="Remove image"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="imageUpload"
                        className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-[#1A318C]/30 hover:bg-[#1A318C]/5 transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                          <Image className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-xs text-gray-400">Upload Image</span>
                      </label>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <img src={barcodeImg} alt="Barcode" className="w-24 object-contain" />
                    </div>
                    <p className="text-xs font-medium text-gray-500 mt-2">SKU: <span className="font-bold text-gray-800 font-mono">{formData.sku || "N/A"}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ Primary description block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenPrimary(!openPrimary)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1A318C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Primary Description</span>
              </div>
              {openPrimary ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openPrimary && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Item Name
                    </label>
                    <input
                      type="text"
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleInputChange}
                      placeholder="Enter item name"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Product Code
                    </label>
                    <input
                      type="text"
                      name="item_code"
                      value={formData.item_code}
                      onChange={handleInputChange}
                      placeholder="Enter product code"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Category
                      </label>
                      <select
                        name="categoryType"
                        value={formCategoryData.categoryType}
                        onChange={handleCategoryChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select category</option>
                        {uniqueCategoryTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Brand
                      </label>
                      <select
                        name="brand"
                        value={formCategoryData.brand}
                        onChange={handleBrandChange}
                        disabled={!brandOptions.length}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select brand</option>
                        {brandOptions.map(brand => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        SKU
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        placeholder="Enter SKU"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Max Capacity
                      </label>
                      <input
                        type="number"
                        name="maximum_capacity"
                        value={formData.maximum_capacity}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        UOM
                      </label>
                      <select
                        name="uom"
                        value={formUOMData ?? ""}
                        onChange={handleUOMChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select unit</option>
                        {(uoms || []).map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={String(formData.availability)}
                        onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value === 'true' }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select availability</option>
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


        </div>

          {/* Bottom bar */}
          <div className="flex flex-row w-full gap-2 mt-auto pt-3">
            <button
              className="flex items-center justify-center flex-1 min-w-0 h-11 px-3 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 text-sm font-medium shadow-md"
              onClick={() => generatePdf('print')}
            >
              <Printer className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Print</span>
            </button>
            <button
              onClick={() => {
                clearUserInput();
                setUserEditing(false)
              }}
              className="flex-1 min-w-0 h-11 px-3 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm font-medium"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              onClick={isUserEditting ? updateItem : registerItem}
              className="flex-[1.5] min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl hover:bg-[#152870] transition-all duration-200 text-sm font-semibold shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {isUserEditting ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Update</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : formStatus === "loading" ? (
        <div className="bg-gray-100 w-[28rem] h-[calc(100vh-2rem)] p-3 z-10 flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="animate-spin mb-4 rounded-full border-4 border-gray-200 border-t-[#1A318C] h-14 w-14"></div>
            <h2 className="text-lg font-semibold text-gray-800">Processing...</h2>
            <p className="text-sm text-gray-500 mt-1">Please wait</p>
          </div>
        </div>
      ) : formStatus === "success" ? (
        <div className="bg-gray-100 w-[28rem] h-[calc(100vh-2rem)] p-3 z-10 flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200 mb-4">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Success!</h2>
            <p className="text-sm text-gray-500 mt-1">Item saved successfully</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 w-[28rem] h-[calc(100vh-2rem)] p-3 z-10 flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-200 mb-4">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Failed</h2>
            <p className="text-sm text-gray-500 mt-1">Please try again</p>
          </div>
        </div>
      )}

      {/* Item list (mid) */}
      <div className="flex-1 h-[calc(100vh-1rem)] bg-gray-50">
        {/* Search panel */}
        <nav className="w-full bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search items by name, SKU, or batch code..."
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>
              <button className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
            {/* Results count */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredItems.length}</span> items
              </p>
            </div>
          </div>
        </nav>

        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
              <p className="text-gray-500">Loading items...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {searchLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-12 w-12 mb-4"></div>
                  <span className="text-gray-500">Searching...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <AddItemCard
                    key={item.id}
                    item={item}
                    onOpen={() => loadItem(item)}
                    onRemove={() => handleRemoveClick(item.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* filter section (right) */}
      <div className="bg-gray-100 w-[18rem] h-[calc(100vh-2rem)] p-3">
        <div className="flex flex-col h-full gap-3">
          {/* ▼ search filters block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenFilter(!openFilter)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filters</span>
              </div>
              {openFilter ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFilter && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Category
                    </label>
                    <select
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      {uniqueCategoryTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Availability
                    </label>
                    <select
                      name="searchAvailability"
                      value={searchAvailability}
                      onChange={(e) => setSearchAvailability(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">All Items</option>
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ order by block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenOrderBy(!openOrderBy)}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <SortAsc className="w-4 h-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sort By</span>
              </div>
              {openOrderBy ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openOrderBy && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4">
                  <select
                    name="sortOrder"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Default</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="recent">Most Recent</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        item={deletingItem}
        onCancel={handleCancelDelete}
        onSuccess={refetchItems}
      />
    </div>

  );
}

export default AddItem;


// uncompleted empty form‐data state(new api)
const INITIAL_FORM_DATA = {
  _id: "",
  id: 0,
  stock_trace: [0],
  item_name: "",

  item_code: "",

  item_image_url: "",
  item_image_blob: null,
  sku: "",
  maximum_capacity: 0,
  uom_id: 0,
  category_id: 0,
  inventory_id: 1,
  item_update_datetime: "",
  item_created_datetime: "",
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
};