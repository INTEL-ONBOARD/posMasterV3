import React, { useState, useRef, useEffect, useContext } from "react";
import { apiClient } from "../../api/client";
import { useNavigate } from "react-router-dom";
import { X, Printer, ChevronDown, ChevronUp } from "lucide-react";
import AddItemCard from "../../components/AddItemCard.jsx";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal.jsx";
import barcodeImg from "../../assets/barcode.png";
import ToastContext from "../toasts/ToastService.jsx";

import { pdf } from '@react-pdf/renderer';
import SimpleDocument from './SimpleDocument';
import JsBarcode from 'jsbarcode';
import registerItemService from "../../api/services/inventory/registerItemService.jsx";


function AddItem({ isActive }) {
  const toast = useContext(ToastContext);

  // Fetch UOMs from API
  // Reset form when section becomes active
  useEffect(() => {
    if (isActive) {
    const fetchUoms = async () => {
      try {
        const response = await apiClient.get("api/uoms");
        if (response.data.status === "success") {
          setUoms(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching UOMs:", error);
      } finally {
        //setLoadingUoms(false);
      }
    };

    fetchUoms();
    }
  }, [isActive]);

  // Fetch Categories from API and create mapping
  useEffect(() => {
    if (isActive) {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get("api/categories");
        if (response.data.status === "success") {
          setItemCategories(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        //setLoadingCategories(false);
      }
    };

    fetchCategories();
  }
  }, [isActive]);

  const [inventoryItems, setInventoryItems] = useState([]);

  const [uoms, setUoms] = useState([
    // {
    //   _id: "687720ad798018e0851599a0",
    //   id: 22,
    //   symbol: "pcs",
    //   unit_name: "Piece",
    //   __v: 0
    // },
    // {
    //   _id: "6877207b798018e085159998",
    //   id: 20,
    //   symbol: "L",
    //   unit_name: "Liter",
    //   __v: 0
    // },
    // {
    //   _id: "687720a0798018e08515999c",
    //   id: 21,
    //   symbol: "mL",
    //   unit_name: "Milliliter",
    //   __v: 0
    // },
  ]);

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
      uom: uoms.find(u => u.id === uomId) || fd.uom
    }));
  };

  // State for category/brand mapping
  const [itemCategories, setItemCategories] = useState([
    // { id: 145, brand: "Close-Up", type: "Oral Care" },
    // { id: 94, brand: "Clogard", type: "Oral Care" },
    // { id: 15, brand: "Colgate", type: "Oral Care" },
    // { id: 26, brand: "Pepsi", type: "Beverages" },
    // { id: 7, brand: "Coca-Cola", type: "Beverages" },
  ]);

  //to select the brand option from category
  const [selectedCategoryType, setSelectedCategoryType] = useState("");
  //filled when a category was selected from the category dropdown
  const [brandOptions, setBrandOptions] = useState([]);
  //category dropdown population(search and item form)
  const [uniqueCategoryTypes, setUniqueCategoryTypes] = useState([]);

  useEffect(() => {
    const types = Array.from(new Set(itemCategories.map(c => c.type)));
    setUniqueCategoryTypes(types);
  }, [itemCategories]);

  // when category changes, compute brands for that category
  useEffect(() => {
    if (!selectedCategoryType) {
      setBrandOptions([]);
      return;
    }
    const brands = itemCategories
      .filter(c => c.type === selectedCategoryType)
      .map(c => c.brand);
    setBrandOptions(brands);
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

  const [isLoading, setIsLoading] = useState(true);
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


  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/itemRegistry/extended");
      if (response.data.status === "success") {
        console.log(response.data.data);
        setInventoryItems(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch items from API
  useEffect(() => {
    if (isActive) {
            console.log('Add items: items are fetching when active');
    // Fetch items after UOMs are loaded to properly map uomName
    // if (!loadingUoms) {
    fetchItems();
    // }
    //}, [loadingUoms]);
    }
  }, [isActive]);

  // to switch between add and update api call via button switching
  const [isUserEditting, setUserEditing] = useState(false);

  // Create new item
  // const createItem = async (e) => {
  //   setFormStatus("loading");
  //   e.preventDefault();
  //   try {
  //     const selectedCategory = itemCategories.find(c =>
  //       c.type === formCategoryData.categoryType &&
  //       c.brand === formCategoryData.brand
  //     );
  //     const requestData = {
  //       sku: formData.sku,  
  //       item_name: formData.item_name,
  //       quantity: Number(formData.quantity),
  //       threshold_limit: Number(formData.threshold_limit),
  //       maximum_capacity: Number(formData.maximum_capacity),
  //       uom_id: formUOMData,
  //       category_id: selectedCategory?.id ?? null, // look up id
  //       inventory_id: 1, // Fixed value
  //       item_image_url: formData.item_image_url || null,
  //       batch_code: formData.batch_code,
  //       stock_price: parseFloat(formData.stock_price),
  //       retail_price: parseFloat(formData.retail_price),
  //       expired_datetime: formData.expired_datetime,
  //       availability: formData.availability,
  //     };
  //     if (!validateItem(requestData)) {
  //       // on fail
  //       setFormStatus("fail");
  //       // after 4 seconds, flip back to the form
  //       alert("validation failed")
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //       return;
  //     }

  //     const response = await apiClient.post("api/items/add", requestData);

  //     if (response.data.status === "success") {
  //       // Add new item to local state
  //       //alert("Item created successfully!");
  //       //toast.open("Item created successfully", 4000, 'Success', 'success');
  //       //clear data upon successful response
  //       setFormStatus("success");
  //       // after 4 seconds, flip back to the form
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //       clearUserInput();
  //     } else {
  //       //alert(response.data.message || "Failed to create item");
  //       //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
  //       setFormStatus("fail");
  //       // after 4 seconds, flip back to the form
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //     }
  //   } catch (err) {
  //     console.error("Create item error:", err);
  //     //alert("Error creating item"+err.message);
  //     setFormStatus("fail");
  //       // after 4 seconds, flip back to the form
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //     toast.open("Create item operation failed", 4000, 'Item creation Failed', 'error');
  //   }
  //   finally {
  //     //repopulate items
  //     fetchItems();
  //   }
  // };

    // Create new item

    const isRequestDataValid = (requestData) => {
      // Check string fields
      if (
        !requestData.item_name?.trim() ||
        !requestData.sku?.trim() ||
        (requestData.item_image_url && !requestData.item_image_url.trim()) || // Optional, but validate if provided
        (typeof requestData.availability === 'string' && !requestData.availability.trim()) // If string
      ) {
        console.log("Basic item info missing");
        return false;
      }

      // Check boolean availability (if it's a boolean, just check truthiness)
      if (typeof requestData.availability === 'boolean' && !requestData.availability) {
        console.log("Availability missing");
        return false;
      }

      // Check numeric fields
      if (
        Number.isNaN(requestData.maximum_capacity) || requestData.maximum_capacity <= 0 ||
        Number.isNaN(requestData.uom_id) || requestData.uom_id <= 0 ||
        (requestData.category_id !== null && (Number.isNaN(requestData.category_id) || requestData.category_id <= 0)) // Optional, validate if provided
      ) {
        console.log("Numeric fields invalid");
        return false;
      }

      // Fixed fields are always valid
      return true;
    };

  const registerItem = async (e) => {
    setFormStatus("loading");
    e.preventDefault();
    try {
      const selectedCategory = itemCategories.find(c =>
        c.type === formCategoryData.categoryType &&
        c.brand === formCategoryData.brand
      );
      const requestData = {
        item_name: formData.item_name,
        //changed to recent production quick fix
        //item_image_url: formData.item_image_url || null,
        item_code: formData.item_code,
        sku: formData.sku,
        maximum_capacity: Number(formData.maximum_capacity),
        uom_id: formUOMData,
        category_id: selectedCategory?.id ?? null, // look up id
        inventory_id: 1, // Fixed value
        availability: formData.availability,
        stock_trace: [101] // Fixed value
      };
      console.log("create inventory request");
      console.log(requestData);
      //const response = await apiClient.post("api/itemRegistry/add", requestData);
      const response = await registerItemService.registerItem(requestData);
      console.log(response);
      if (response.status === "success") {
        // Add new item to local state
        //alert("Item created successfully!");
        //toast.open("Item created successfully", 4000, 'Success', 'success');
        //clear data upon successful response
        setFormStatus("success");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        clearUserInput();
      } else {
        //alert(response.data.message || "Failed to create item");
        //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
        setFormStatus("fail");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      }
    } catch (err) {
      console.error("Create item error:", err);
      //alert("Error creating item"+err.message);
      setFormStatus("fail");
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
      toast.open("Create item operation failed", 4000, 'Item creation Failed', 'error');
    }
    finally {
      //repopulate items
      fetchItems();
    }
  };

  // Update item
  // const updateItem = async (e) => {
  //   setFormStatus("loading");
  //   e.preventDefault();
  //   try {
  //     const selectedCategory = itemCategories.find(c =>
  //       c.type === formCategoryData.categoryType &&
  //       c.brand === formCategoryData.brand
  //     );
  //     const requestData = {
  //       sku: formData.sku,
  //       item_name: formData.item_name,
  //       quantity: Number(formData.quantity),
  //       threshold_limit: Number(formData.threshold_limit),
  //       maximum_capacity: Number(formData.maximum_capacity),
  //       uom_id: formUOMData,
  //       category_id: selectedCategory?.id ?? null, // look up id
  //       inventory_id: 1, // Fixed value for now
  //       item_image_url: formData.item_image_url || null,
  //       batch_code: formData.batch_code,
  //       stock_price: parseFloat(formData.stock_price),
  //       retail_price: parseFloat(formData.retail_price),
  //       expired_datetime: formData.expired_datetime,
  //       availability: formData.availability,
  //     };

  //     const response = await apiClient.put(`api/items/${formData.id}`, requestData);

  //     if (response.data.status === "success") {
  //       //alert("Item created successfully!");
  //       setFormStatus("success");
  //       // after 4 seconds, flip back to the form
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //       toast.open("Item updated successfully", 4000, 'Success', 'success');
  //       //clear data upon successful response
  //       clearUserInput();
  //       setUserEditing(false);
  //     } else {
  //       setFormStatus("fail");
  //       // after 4 seconds, flip back to the form
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //       //alert(response.data.message || "Failed to update item");
  //       toast.open("Failed to update the item, please try again", 4000, 'Request failed', 'error');
  //     }
  //   } catch (err) {
  //     console.error("Update item error:", err);
  //     setFormStatus("fail");
  //       // after 4 seconds, flip back to the form
  //       timerRef.current = window.setTimeout(() => {
  //         setFormStatus("form");
  //         timerRef.current = null;
  //       }, 4000);
  //     //alert("Error updating item");
  //     toast.open("Update item operation faild. Please try again", 4000, 'Item update Failed', 'error');
  //   }
  //   finally {
  //     //repopulate items
  //     fetchItems();
  //   }
  // };
  const updateItem = async (e) => {
    setFormStatus("loading");
    e.preventDefault();
    try {
      const selectedCategory = itemCategories.find(c =>
        c.type === formCategoryData.categoryType &&
        c.brand === formCategoryData.brand
      );
      const requestData = {
        item_name: formData.item_name,
        //item_image_url: formData.item_image_url || null,
        item_code: formData.item_code,
        sku: formData.sku,
        maximum_capacity: Number(formData.maximum_capacity),
        uom_id: formUOMData,
        category_id: selectedCategory?.id ?? null, // look up id
        inventory_id: 1, // Fixed value
        availability: formData.availability,
        stock_trace: [101], // Fixed value
      };

      //const response = await apiClient.put(`api/itemRegistry/${formData.id}`, requestData);
      const response =registerItemService.updateItem(formData.id, requestData);
      
      if (response.status === "success") {
        //alert("Item created successfully!");
        setFormStatus("success");
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
        // after 4 seconds, flip back to the form
        timerRef.current = window.setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 4000);
        //alert(response.data.message || "Failed to update item");
        toast.open("Failed to update the item, please try again", 4000, 'Request failed', 'error');
      }
    } catch (err) {
      console.error("Update item error:", err);
      setFormStatus("fail");
      // after 4 seconds, flip back to the form
      timerRef.current = window.setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 4000);
      //alert("Error updating item");
      toast.open("Update item operation faild. Please try again", 4000, 'Item update Failed', 'error');
    }
    finally {
      //repopulate items
      fetchItems();
    }
  };

  //clear the form and related statee data(hrrngh)
  const clearUserInput = () => {
    //alert("clearing user inputs")
    setFormData(INITIAL_FORM_DATA)
    setSelectedCategoryType("");
    setBrandOptions([]);
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
    const { type, brand } = item.category;
    // 3a. set the category‐dropdown state (this also fires your useEffect to populate brandOptions)
    setSelectedCategoryType(type);
    // 3b. explicitly set the form’s dropdown values:
    setFormCategoryData({
      categoryType: type,
      brand,
    });
    //set unit of measure in the dropdown
    // 3. pre‐select the UOM dropdown
    setFormUOMData(item.uom.id);
    // and keep formData.uom_id correct:
    setFormData(fd => ({ ...fd, uom_id: item.uom.id, uom: item.uom }));
  };


  // Delete item handlers
  const handleRemoveClick = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
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
  const filteredItems = inventoryItems.filter((item) => {
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
    <div className="flex flex-row">
      {/* Item form (left) */}
      {formStatus === "form" ? (
      // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-between">
      // <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] overflow-y-scroll">
      <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 z-10 flex flex-col justify-between">
        <div className="flex flex-col h-[45rem] gap-3">
          {/* ▼ Basic info block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setOpenBasic(!openBasic)}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">Barcode & SKU</span>
              {openBasic ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openBasic && (
              <div className="bg-white mx-4">
                <div className="flex flex-row px-4 items-center max-h-[12rem]">
                  <div className="w-36 h-36 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center mb-4 hover:border-gray-400 transition-colors">
                    {formData.item_image_url ? (
                      <div>
                        <input
                          type="file"
                          id="imageUpload"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleImageUpload}
                        />
                        <label htmlFor="imageUpload" className="block w-full h-full cursor-pointer">
                          <img
                            src={formData.item_image_url}
                            alt="Item"
                            className="w-full h-full object-contain"
                          />
                        </label>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mb-2">
                          <X className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="text-gray-500">No image</span>
                      </>
                    )}
                  </div>
                  {/* Vertical black line separator */}
                  {/* <div className="w-0.5 bg-black self-stretch"></div> */}
                  <div className="flex flex-col m-10">
                    <div>
                      <img src={barcodeImg} alt="Barcode" className="w-[100px] object-contain" />
                      {/* <p className="text-sm font-semibold text-gray-800">SKU: {formData.sku}</p> */}
                      <p className="text-sm font-semibold text-gray-800">SKU: {formData.sku}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ Primary description block ▼ */}
          <div className="border">
            <button
              onClick={() => setOpenPrimary(!openPrimary)}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">Primary Description</span>
              {openPrimary ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openPrimary && (
              <div className="px-4 bg h-[25rem] bg-white">
                {/*primary description block  */}
                <div className="">
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleInputChange}
                      placeholder="Enter item name"
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 mt-2 gap-4">
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Product Code
                    </label>
                    <input
                      type="text"
                      name="item_code"
                      value={formData.item_code}
                      onChange={handleInputChange}
                      placeholder="Enter item name"
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  </div>

                  <div className="grid grid-cols-2 mt-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                  Category
                </label>
                      <select
                        // name="category"
                        // value={formData.category}
                        // onChange={handleInputChange}
                        name="categoryType"
                        value={formCategoryData.categoryType}
                        onChange={handleCategoryChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select category --</option>
                        {uniqueCategoryTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                  Brand
                </label>
                      <select
                        // name="brand"
                        // value={formData.brand}
                        // onChange={handleInputChange}
                        name="brand"
                        value={formCategoryData.brand}
                        onChange={handleBrandChange}
                        disabled={!brandOptions.length}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select brand --</option>
                        {brandOptions.map(brand => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 mt-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        //placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Maximum Capacity
                      </label>
                      <input
                        type="number"
                        name="maximum_capacity"
                        value={formData.maximum_capacity}
                        onChange={handleInputChange}
                        // placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        UOM
                      </label>
                      <select
                        name="uom"
                        value={formUOMData ?? ""}               // show the selected id
                        onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select unit --</option>
                        {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formData.availability}               // show the selected id
                        onChange={handleInputChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>-- select availability --</option>
                          <option value={true}>Available</option>
                          <option value={false}>Unavailable</option>

                        </select>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Bottom bar */}
          <div className="flex flex-row w-full gap-2">
            <button
              className="flex items-center justify-center flex-1 min-w-0 h-10 px-2 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors text-sm"
              onClick={() => generatePdf('print')}
            >
              <Printer className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Print Barcode</span>
            </button>
            <button
              onClick={() => {
                clearUserInput();
                //switch from update item button to add item button
                setUserEditing(false)
              }}
              className="flex-1 min-w-0 h-10 px-3 py-2 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="truncate">Cancel</span>
            </button>
            {/* switch between update and add button functions based on item card selection and clear form button click */}
            <button
              onClick={isUserEditting ? updateItem : registerItem}
              className="flex-1 min-w-0 h-10 px-3 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors text-sm"
            >
              <span className="truncate">{isUserEditting ? 'Update' : 'Create'}</span>
            </button>

          </div>
        </div>
      ) : formStatus === "loading" ? (
        // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-around">
        // <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] overflow-y-scroll">
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 z-10 flex flex-col justify-around">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin mb-3 rounded-full border-4 border-gray-300 border-t-[#1A318C] h-12 w-12"></div>
            <h2>Please wait…</h2>
          </div>
        </div>
      ) : formStatus === "success" ? (
        // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-around">
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 z-10 flex flex-col justify-around">
          <div className="flex flex-col items-center justify-center">
            <svg width={80} height={80} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* green circle */}
              <circle cx="12" cy="12" r="10" fill="#22C55E" />
              {/* white check */}
              <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <h2 className="font-semibold text-xl">Success!</h2>
          </div>
        </div>
      ) : (
        /* if it's none of the above, we treat it as "fail" */
        // <div className="w-1/3 h-[calc(100vh-7rem)] p-5 z-10 flex flex-col justify-around">
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 z-10 flex flex-col justify-around">
          <div className="flex flex-col items-center justify-center">
            <svg width={80} height={80} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* red circle */}
              <circle cx="12" cy="12" r="10" fill="#EF4444" />
              {/* white “X” */}
              <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2 className="font-semibold text-xl">Failed...</h2>
          </div>
        </div>
      )}

      {/* Item list (mid) */}
      <div className="w-[calc(57rem)] h-[calc(100vh-1rem)] bg-[#EBEBEB]">

        {/* Search panel */}
        <nav className="w-full flex flex-row justify-between py-8 px-10 h-[7rem] bg-white gap-6">
          <div className="w-full flex flex-row justify-between border border-t-transparent border-l-transparent border-r-transparent pb-2 border-blue-400">
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search your item here..."
              className="px-3 py-2 w-full bg-white border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-10 py-2 bg-[#00489A] text-white hover:bg-blue-900 transition-colors">
              Search
            </button>
          </div>
        </nav>

        <div className="h-[calc(100vh-8rem)] overflow-y-scroll">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-10">
              {searchLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
                  <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                  <span className="text-gray-700 text-xl mt-1">Please wait...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-500 text-lg" style={{ minHeight: "50vh" }}>
                  <span>No items found!</span>
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
      <div className="bg-[#EBEBEB] w-[calc(20rem)] h-[calc(100vh-2rem)] p-1">
        <div className="flex flex-col h-[calc(100vh-2rem)] gap-2">
          {/* top block set */}
          <div>
            {/* ▼ search filters block ▼ */}
            <div className="bg-white">
              <button
                onClick={() => setOpenFilter(!openFilter)}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">SEARCH FILTERS</span>
                {openFilter ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openFilter && (
                <div className="px-4 bg-white pb-5">
                  {/* detailed description block */}
                  <div className="">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Category
                      </label>
                      <select
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="All">All Categories</option>
                        {uniqueCategoryTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* fix availability here */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Item Availability
                      </label>
                      <select
                        name="searchAvailability"
                        value={searchAvailability}
                        onChange={(e) => setSearchAvailability(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All</option>
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                      </select>
                    </div>

                    {/* <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Popularity
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Default</option>

                      </select>
                    </div> */}
                  </div>
                </div>
              )}
            </div>

            {/* ▼ order by block ▼ */}
            <div className="bg-white">
              <button
                onClick={() => setOpenOrderBy(!openOrderBy)}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">ORDER BY</span>
                {openOrderBy ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openOrderBy && (
                <div className="px-4 bg-white pb-5">
                  {/* detailed description block */}
                  <div className="">
                    <div>
                      {/* <label className="block text-sm font-medium text-gray-400 mb-1">
                        Suppier
                      </label> */}
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Default</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
          {/* empty bottom block */}
          <div className="bg-white h-full"></div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        item={deletingItem}
        onCancel={handleCancelDelete}
        onSuccess={fetchItems}
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