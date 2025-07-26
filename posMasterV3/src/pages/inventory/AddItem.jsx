import React, { useState, useEffect, useContext } from "react";
import { apiClient } from "../../api/client";
import { useNavigate } from "react-router-dom";
import { X, Upload, Printer, ChevronDown, ChevronUp } from "lucide-react";
import AddItemCard from "../../components/AddItemCard.jsx";
import ConfirmDeleteModal from "../../frontend/components/ConfirmDeleteModal";
import barcodeImg from "../../assets/barcode.png";
import validateItem from "../../util/validate.jsx";
import ToastContext from "../toasts/ToastService.jsx";
import Add_item_Card from "../../frontend/components/Add_item_Card";
import bananaImg from '../../assets/Inventory_banana.png';
import itemImg from '../../assets/Inventory_banana.png';

import { pdf } from '@react-pdf/renderer';
import SimpleDocument from './SimpleDocument';
import JsBarcode from 'jsbarcode';

function AddItem() {
  const navigate = useNavigate();
  const toast = useContext(ToastContext);

    // Fetch UOMs from API
    useEffect(() => {
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
    }, []);
  
    // Fetch Categories from API and create mapping
    useEffect(() => {
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
    }, []);

const [inventoryItems, setInventoryItems] = useState([]);

    const [uoms, setUoms] = useState([
    {
      _id: "687720ad798018e0851599a0",
      id: 22,
      symbol: "pcs",
      unit_name: "Piece",
      __v: 0
    },
    {
      _id: "6877207b798018e085159998",
      id: 20,
      symbol: "L",
      unit_name: "Liter",
      __v: 0
    },
    {
      _id: "687720a0798018e08515999c",
      id: 21,
      symbol: "mL",
      unit_name: "Milliliter",
      __v: 0
    },
  ]);

  //holds the selected UOM id from the dropdown
  const [formUOMData, setFormUOMData] = useState(null);

  // when user picks a UOM
 const handleUOMChange = e => {
   const uomId = Number(e.target.value);
   setFormUOMData(uomId);
   // optionally keep formData.uom_id in sync:
   setformData(fd => ({
     ...fd,
     uom_id: uomId,
     uom: uoms.find(u => u.id === uomId) || fd.uom
   }));
 };

    // State for category/brand mapping
  const [itemCategories, setItemCategories] = useState([
    { id: 145, brand: "Close-Up",   type: "Oral Care" },
    { id:  94, brand: "Clogard",    type: "Oral Care" },
    { id:  15, brand: "Colgate",    type: "Oral Care" },
    { id:  26, brand: "Pepsi",      type: "Beverages" },
    { id:   7, brand: "Coca-Cola",  type: "Beverages" },
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
    console.log("value changed: "+ e.target.value)
    setFormCategoryData(f => ({ ...f, brand: e.target.value }));
  };

  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state
  const [formData, setformData] = useState(INITIAL_FORM_DATA);
  const [deletingItem, setDeletingItem] = useState(INITIAL_FORM_DATA);

    const [formCategoryData, setFormCategoryData] = useState({
      categoryType: "",
      brand: "",
    });

  // Barcode generation
  const barcodeValue = formData.batch_code || "SKU-000000";
  
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

  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
  };

  // Category handler
  const handleSearchCategoryChange = (e) => {
    setSearchCategory(e.target.value);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setformData(prev => ({ ...prev, [name]: value }));
  };


  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/items/extended");
      if (response.data.status === "success") {
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
      // Fetch items after UOMs are loaded to properly map uomName
      // if (!loadingUoms) {
        fetchItems();
      // }
    //}, [loadingUoms]);
    }, []);

  // to switch between add and update api call via button switching
  const [isUserEditting, setUserEditing] = useState(false);

    // Create new item
    const createItem = async (e) => {
      e.preventDefault();
      try {
        const selectedCategory = itemCategories.find(c =>
          c.type  === formCategoryData.categoryType &&
          c.brand === formCategoryData.brand
        );
        const requestData = {
          sku: formData.sku,
          item_name: formData.item_name,
          quantity: Number(formData.quantity),
          threshold_limit: Number(formData.threshold_limit),
          maximum_capacity: Number(formData.maximum_capacity),
          uom_id:           formUOMData,
          category_id:      selectedCategory?.id ?? null, // look up id
          inventory_id: 1, // Fixed value
          item_image_url: formData.item_image_url || null,
          unit_price: parseFloat(formData.unit_price),
          batch_code: formData.batch_code
        };
        if (!validateItem(requestData)) {
          return;
        }
  
        const response = await apiClient.post("api/items/add", requestData);
  
        if (response.data.status === "success") {
          // Add new item to local state
          //alert("Item created successfully!");
          //toast.open("Item created successfully", 4000, 'Success', 'success');
          //clear data upon successful response
          clearUserInput();
        } else {
          //alert(response.data.message || "Failed to create item");
          //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
        }
      } catch (err) {
        console.error("Create item error:", err);
        //alert("Error creating item"+err.message);
        toast.open("Create item operation failed", 4000, 'Item creation Failed', 'error');
      }
      finally{
        //repopulate items
        fetchItems();
      }
    };

      // Update item
      const updateItem = async (e) => {
        e.preventDefault();
        try {
          const selectedCategory = itemCategories.find(c =>
                c.type  === formCategoryData.categoryType &&
                c.brand === formCategoryData.brand
              );
              const requestData = {
                sku: formData.sku,
                item_name: formData.item_name,
                quantity: Number(formData.quantity),
                threshold_limit: Number(formData.threshold_limit),
                maximum_capacity: Number(formData.maximum_capacity),
                uom_id:           formUOMData,
                category_id:      selectedCategory?.id ?? null, // look up id
                inventory_id: 1, // Fixed value for now
                item_image_url: formData.item_image_url || null,
                unit_price: parseFloat(formData.unit_price),
                batch_code: formData.batch_code
              };
    
          const response = await apiClient.put(`api/items/${formData.id}`, requestData);
    
          if (response.data.status === "success") {
            //alert("Item created successfully!");
            toast.open("Item updated successfully", 4000, 'Success', 'success');
            //clear data upon successful response
            clearUserInput();
            setUserEditing(false);
          } else {
            //alert(response.data.message || "Failed to update item");
            toast.open("Failed to update the item, please try again", 4000, 'Request failed', 'error');
          }
        } catch (err) {
          console.error("Update item error:", err);
          //alert("Error updating item");
          toast.open("Update item operation faild. Please try again", 4000, 'Item update Failed', 'error');
        }
        finally{
          //repopulate items
          fetchItems();
        }
      };

      //clear the form and related statee data(hrrngh)
      const clearUserInput = () =>{
        //alert("clearing user inputs")
        setformData(INITIAL_FORM_DATA)
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
   setformData(item);
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
   setformData(fd => ({ ...fd, uom_id: item.uom.id, uom: item.uom }));
 };


  // Delete item handlers
  const handleRemoveClick = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
  };

  // Filter items based on search and category //fix here
  const filteredItems = inventoryItems.filter(
    (item) =>
      (searchCategory === "All" || item.category.type === searchCategory) &&
      item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  const [openBasic, setOpenBasic] = useState(true);
  const [openPrimary, setOpenPrimary] = useState(true);
  const [openDetailed, setOpenDetailed] = useState(true);
  return (
    <div className="flex flex-row">
      {/* Item form (left) */}
      <div className="w-1/3 h-[calc(100vh-6rem)] p-5 z-10 flex flex-col justify-between">
        <div className="flex flex-col h-[45rem] gap-3">
 {/* ▼ Basic info block ▼ */}
      <div className="border rounded bg-white">
        <button
          onClick={() => setOpenBasic(!openBasic)}
          className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
        >
          <span className="text-gray-600">Barcode & SKU</span>
          {openBasic ? <ChevronUp /> : <ChevronDown />}
        </button>
        {openBasic && (
          <div className="bg-white border-2 border-black mx-4">
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
          <div className="w-0.5 bg-black self-stretch"></div>
          <div className="flex flex-col m-10">
            <div>
              <img src={barcodeImg} alt="Barcode" className="w-[100px] object-contain" />
              <p className="text-sm font-semibold text-gray-800">SKU: {formData.sku}</p>
              <p className="text-sm font-semibold text-gray-800">BARCODE: {formData.batch_code}</p>
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
          <span className="text-gray-600">Primary Description</span>
          {openPrimary ? <ChevronUp /> : <ChevronDown />}
        </button>
        {openPrimary && (
          <div className="px-4 bg h-[7rem] bg-white">
          {/*primary description block  */}
          <div className="">
            <div className="pt-2">
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label> */}
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
              <div>
                {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label> */}
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
                {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label> */}
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
          </div>
          </div>
        )}
      </div>

      
      {/* ▼ Detailed description block ▼ */}
      <div className="bg-white">
        <button
          onClick={() => setOpenDetailed(!openDetailed)}
          className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
        >
          <span className="text-gray-600">Detailed Description</span>
          {openDetailed ? <ChevronUp /> : <ChevronDown />}
        </button>
        {openDetailed && (
          <div className="px-4 bg-white pb-5">
          {/* detailed description block */}
          <div className="">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Generate barcode"
                  className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  //name="sku"
                  //value={formData.sku}
                  // onChange={handleInputChange}
                  placeholder="system genereated"
                  className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold Limit
                </label>
                <input
                  type="number"
                  name="threshold_limit"
                  value={formData.threshold_limit}
                  onChange={handleInputChange}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Capacity
                </label>
                <input
                  type="number"
                  name="maximum_capacity"
                  value={formData.maximum_capacity}
                  onChange={handleInputChange}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
            </div>

            {/* //newly added */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Price (Rs.)
                </label>
                <input
                  type="number"
                  // name="unit_price"
                  // value={formData.unit_price}
                  // onChange={handleInputChange}
                  placeholder="Enter item price"
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retail Price (Rs.)
              </label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleInputChange}
                placeholder="Enter item price"
                className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  name="availability"
                  //value={formUOMData ?? ""}               // show the selected id
                  //onChange={handleUOMChange}              // hook up your new handler
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- select availability --</option>
                  <option value="">-- Available --</option>
                  <option value="">-- Unavailable --</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regiatered Inventory
                </label>
                <select
                  name="inventory"
                  // value={formUOMData ?? ""}               // show the selected id
                  // onChange={handleUOMChange}              // hook up your new handler
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- select registered inventory --</option>
                  <option value="">Alanvalley</option>
                  <option value="">Morawawaka</option>
                  <option value="">Other</option>
                </select>
              </div>
            </div>

          </div>
        </div>
        )}
      </div>
        </div>
        
        {/* Bottom bar */}
        <div className="flex flex-row min-w-max justify-around">
        <button 
          className="flex items-center w-[12rem] h-10 px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors"
          onClick={() => generatePdf('print')}
        >
          <Printer className="w-4 h-4 mr-4" />
          <p>Print Barcode</p>
        </button>
            <button
              onClick={() => {
                clearUserInput();
                //switch from update item button to add item button 
                setUserEditing(false)
              }}
              className="px-6 py-2 w-[6rem] h-10  border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            {/* switch between update and add button functions based on item card selection and clear form button click */}
            <button
              onClick={isUserEditting ? updateItem : createItem}
              className="px-6 py-2 h-10 w-[6rem] bg-blue-600 text-white hover:bg-[#1A318C] transition-colors"
            >
              {isUserEditting ? 'Update' : 'Add Item'}
            </button>

        </div>
      </div>
      

      {/* Item list (right) */}
      <div className="w-2/3 h-[calc(100vh-1rem)] bg-[#EBEBEB]">
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

          <select
            value={searchCategory}
            onChange={handleSearchCategoryChange}
            className="w-80 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {/* <option value="All">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="fruit">Fruit</option>
            <option value="beverage">Beverage</option> */}
            {/* //fix this */}
            <option value="All">All Categories</option>
            {uniqueCategoryTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                  </option>
                  ))}
          </select>
        </nav>
        
        <div className="h-[calc(100vh-14rem)] overflow-y-scroll">
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


// 1️⃣ Define your “empty” form‐data once
const INITIAL_FORM_DATA = {
  _id: "",
  id: 0,
  stock_trace: [0],
  item_name: "",
  item_image_url: "",
  batch_code: "",
  sku: "",
  quantity: 0,
  threshold_limit: 0,
  maximum_capacity: 0,
  uom_id: 0,
  category_id: 0,
  inventory_id: 1,
  unit_price: 0,
  stock_update_datetime: "",
  stock_created_datetime: "",
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
  inventory: null
};

//inventory dummy data
    // {
    //   _id: "6877751e6d4492e44dbb403b",
    //   id: 19,
    //   stock_trace: [1],
    //   item_name: "test toothbrush",
    //   item_image_url: "/src/assets/Inventory_banana.png",
    //   batch_code: "bar237645TE1522",
    //   sku: "bar237645",
    //   quantity: 30,
    //   threshold_limit: 20,
    //   maximum_capacity: 40,
    //   uom_id: 22,
    //   category_id: 15,
    //   inventory_id: 1,
    //   unit_price: 110,
    //   stock_update_datetime: "2025-07-16T09:47:10.682Z",
    //   stock_created_datetime: "2025-07-16T09:47:10.682Z",
    //   __v: 0,
    //   uom: {
    //     _id: "687720ad798018e0851599a0",
    //     id: 22,
    //     symbol: "pcs",
    //     unit_name: "Piece",
    //     __v: 0
    //   },
    //   category: {
    //     _id: "68773ebf1edd62f9c8128b58",
    //     id: 15,
    //     brand: "Colgate",
    //     type: "Oral Care",
    //     __v: 0
    //   },
    //   inventory: null
    // },
    // {
    //   _id: "687775746d4492e44dbb404f",
    //   id: 22,
    //   stock_trace: [1],
    //   item_name: "test toothbrush2",
    //   item_image_url: "/src/assets/Inventory_banana.png",
    //   batch_code: "fubar237645TE1522",
    //   sku: "fubar237645",
    //   quantity: 30,
    //   threshold_limit: 20,
    //   maximum_capacity: 40,
    //   uom_id: 22,
    //   category_id: 15,
    //   inventory_id: 1,
    //   unit_price: 110,
    //   stock_update_datetime: "2025-07-16T09:48:36.213Z",
    //   stock_created_datetime: "2025-07-16T09:48:36.213Z",
    //   __v: 0,
    //   uom: {
    //     _id: "687720ad798018e0851599a0",
    //     id: 22,
    //     symbol: "pcs",
    //     unit_name: "Piece",
    //     __v: 0
    //   },
    //   category: {
    //     _id: "68773ebf1edd62f9c8128b58",
    //     id: 15,
    //     brand: "Colgate",
    //     type: "Oral Care",
    //     __v: 0
    //   },
    //   inventory: null
    // },