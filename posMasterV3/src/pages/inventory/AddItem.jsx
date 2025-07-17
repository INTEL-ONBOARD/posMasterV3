import React, { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { useNavigate } from "react-router-dom";
import { X, Upload, Printer } from "lucide-react";
import Add_item_Card from "../../frontend/components/Add_item_Card";
import AddItemCard from "../../components/AddItemCard.jsx";
import bananaImg from '../../assets/Inventory_banana.png';
import ConfirmDeleteModal from "../../frontend/components/ConfirmDeleteModal";
import itemImg from '../../assets/Inventory_banana.png';

import { pdf } from '@react-pdf/renderer';
import SimpleDocument from './SimpleDocument';
import JsBarcode from 'jsbarcode';



function AddItem() {
  const navigate = useNavigate();
const [inventoryItems, setInventoryItems] = useState([
    {
      _id: "6877751e6d4492e44dbb403b",
      id: 19,
      stock_trace: [1],
      item_name: "test toothbrush",
      item_image_url: "/src/assets/Inventory_banana.png",
      batch_code: "bar237645TE1522",
      sku: "bar237645",
      quantity: 30,
      threshold_limit: 20,
      maximum_capacity: 40,
      uom_id: 22,
      category_id: 15,
      inventory_id: 1,
      unit_price: 110,
      stock_update_datetime: "2025-07-16T09:47:10.682Z",
      stock_created_datetime: "2025-07-16T09:47:10.682Z",
      __v: 0,
      uom: {
        _id: "687720ad798018e0851599a0",
        id: 22,
        symbol: "pcs",
        unit_name: "Piece",
        __v: 0
      },
      category: {
        _id: "68773ebf1edd62f9c8128b58",
        id: 15,
        brand: "Colgate",
        type: "Oral Care",
        __v: 0
      },
      inventory: null
    },
    {
      _id: "687775746d4492e44dbb404f",
      id: 22,
      stock_trace: [1],
      item_name: "test toothbrush2",
      item_image_url: "/src/assets/Inventory_banana.png",
      batch_code: "fubar237645TE1522",
      sku: "fubar237645",
      quantity: 30,
      threshold_limit: 20,
      maximum_capacity: 40,
      uom_id: 22,
      category_id: 15,
      inventory_id: 1,
      unit_price: 110,
      stock_update_datetime: "2025-07-16T09:48:36.213Z",
      stock_created_datetime: "2025-07-16T09:48:36.213Z",
      __v: 0,
      uom: {
        _id: "687720ad798018e0851599a0",
        id: 22,
        symbol: "pcs",
        unit_name: "Piece",
        __v: 0
      },
      category: {
        _id: "68773ebf1edd62f9c8128b58",
        id: 15,
        brand: "Colgate",
        type: "Oral Care",
        __v: 0
      },
      inventory: null
    },
  ]);

    // State for category/brand mapping
  const [loadingItemCategories, setLoadingItemCategories] = useState(false);
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
  //in case for the category dropdown population
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
    setFormData(f => ({ ...f, categoryType: newType, brand: "" }));
  };

  const handleBrandChange = e => {
    setFormData(f => ({ ...f, brand: e.target.value }));
  };


  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState({
      _id: "687775746d4492e44dbb404f",
      id: 22,
      stock_trace: [1],
      item_name: "test toothbrush2",
      item_image_url: "/src/assets/Inventory_banana.png",
      batch_code: "fubar237645TE1522",
      sku: "fubar237645",
      quantity: 30,
      threshold_limit: 20,
      maximum_capacity: 40,
      uom_id: 22,
      category_id: 15,
      inventory_id: 1,
      unit_price: 110,
      stock_update_datetime: "2025-07-16T09:48:36.213Z",
      stock_created_datetime: "2025-07-16T09:48:36.213Z",
      __v: 0,
      uom: {
        _id: "687720ad798018e0851599a0",
        id: 22,
        symbol: "pcs",
        unit_name: "Piece",
        __v: 0
      },
      category: {
        _id: "68773ebf1edd62f9c8128b58",
        id: 15,
        brand: "Colgate",
        type: "Oral Care",
        __v: 0
      },
      inventory: null
    });


  // Form state
  const [formData, setformData] = useState({
      _id: "687775746d4492e44dbb404f",
      id: 22,
      stock_trace: [1],
      item_name: "test toothbrush2",
      item_image_url: "/src/assets/Inventory_banana.png",
      batch_code: "fubar237645TE1522",
      sku: "fubar237645",
      quantity: 30,
      threshold_limit: 20,
      maximum_capacity: 40,
      uom_id: 22,
      category_id: 15,
      inventory_id: 1,
      unit_price: 110,
      stock_update_datetime: "2025-07-16T09:48:36.213Z",
      stock_created_datetime: "2025-07-16T09:48:36.213Z",
      __v: 0,
      uom: {
        _id: "687720ad798018e0851599a0",
        id: 22,
        symbol: "pcs",
        unit_name: "Piece",
        __v: 0
      },
      category: {
        _id: "68773ebf1edd62f9c8128b58",
        id: 15,
        brand: "Colgate",
        type: "Oral Care",
        __v: 0
      },
      inventory: null,
      categoryType: "",  // ← add this
    brand: "",         // ← add this
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
      alert('Failed to generate PDF');
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

  // Load item object into form
  const loadItem = (selectedItem) => {
    setformData(selectedItem);
  };

  // Delete item handlers
  const handleRemoveClick = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    //enter api later
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  // Filter items based on search and category
  const filteredItems = inventoryItems.filter(
    (item) =>
      (searchCategory === "All" || item.category === searchCategory) &&
      item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-row">
      {/* Item form (left) */}
      <div className="bg-white w-1/3 h-[calc(100vh-6rem)] p-10 z-10 flex flex-col justify-between">
        <div className="flex flex-col justify-end gap-6 h-[45rem]">
          {/* Image uploading block */}
          <div className="flex flex-row items-center max-h-[7rem]">
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-4 hover:border-gray-400 transition-colors">
              {formData.item_image_url ? (
                <img 
                  src={formData.item_image_url} 
                  alt="Item" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-gray-500">No image</span>
                </>
              )}
            </div>
            <div className="flex flex-col m-10">
              <button className="px-4 py-2 mb-4 bg-[#BDBDBD] text-white text-sm hover:bg-gray-700 transition-colors">
                Upload a photo
              </button>
              <div className="grid grid-cols-2 md:grd-cols-1">
                <p className="text-lg text-black">SKU :</p>
                <p className="w-max text-lg text-[#A7A7A7]">{formData.sku}</p>
                <p className="text-lg text-black">BARCODE :</p>
                <p className="w-max text-lg text-[#A7A7A7]">{formData.batch_code}</p>
              </div>
            </div>   
          </div>

          {/* Item form block */}
          <div className="space-y-4 mb-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  // name="category"
                  // value={formData.category}
                  // onChange={handleInputChange}
                  name="categoryType"
                  value={formData.categoryType}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
          <select
            // name="brand"
            // value={formData.brand}
            // onChange={handleInputChange}
            name="brand"
            value={formData.brand}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Barcode
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
              {/* status is no need for now */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lowStock">Low Stock</option>
                  <option value="available">Available</option>
                  <option value="outOfStock">Out of Stock</option>
                </select>
            </div> */}
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
                  placeholder="12"
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
                  placeholder="12"
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
                  placeholder="12"
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UOM
                </label>
                <select
                  name="uom"
                  value={formData.uom.symbol}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="kg">KG</option>
                  <option value="pcs">PCS</option>
                  <option value="ltr">LTR</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        

        {/* Bottom bar */}
        <div className="flex justify-between space-x-3 -mx-10 p-4">
          <div className="flex flex-row items-center gap-3">
            <button 
              className="flex items-center px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors"
              onClick={() => generatePdf('print')}
            >
              <Printer className="w-4 h-4 mr-4 " />
              <p>Print Barcode</p>
            </button>
          </div>
          <div>
            <button
              onClick={() => setformData({
                id: "",
                name: "",
                category: "",
                brand: "",
                itemCode: "",
                sku: "",
                status: "available",
                thresholdLimit: 0,
                maxmiumCapacity: 0,
                price: 0,
                quantity: 0,
                uom: "pcs",
                image: itemImg,
              })}
              className="px-6 py-2 mr-4 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              // onClick={
              //   //createItem
              // }
              className="px-6 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors"
            >
              Save
            </button>
          </div>
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
            <button className="px-10 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors">
              Search
            </button>
          </div>

          <select
            value={searchCategory}
            onChange={handleSearchCategoryChange}
            className="w-80 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="fruit">Fruit</option>
            <option value="beverage">Beverage</option>
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
                    onRemove={handleRemoveClick}
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
        item={selectedItem}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isSuccess={true}
      />
    </div>
    
  );
}

export default AddItem;