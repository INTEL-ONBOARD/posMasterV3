import React, { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { useNavigate } from "react-router-dom";
import { X, Upload, Printer } from "lucide-react";
import Add_item_Card from "../../frontend/components/Add_item_Card";
import bananaImg from '../../assets/Inventory_banana.png';
import ConfirmDeleteModal from "../../frontend/components/ConfirmDeleteModal";
import itemImg from '../../assets/Inventory_banana.png';

import { pdf } from '@react-pdf/renderer';
import SimpleDocument from './SimpleDocument';
import JsBarcode from 'jsbarcode';



function AddItem() {
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await apiClient.get("api/items");
        if (response.data.status === "success") {
          // Map API data to component's expected format instead of directly passing it
          const items = response.data.data.map(item => ({
            id: item._id,
            name: item.item_name,
            category: item.category?.type || "Uncategorized",
            brand: item.category?.brand || "No brand",
            itemCode: item.batch_code,
            sku: item.sku,
            status: item.quantity <= 0 
              ? "outOfStock" 
              : item.quantity <= item.threshold_limit 
                ? "lowStock" 
                : "available",
            thresholdLimit: item.threshold_limit,
            maxmiumCapacity: item.maximum_capacity,
            price: item.unit_price,
            quantity: item.quantity,
            uom: "pcs", // Default since API doesn't provide(for now)
            image: item.item_image_url || itemImg
          }));
          setInventoryItems(items);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Form state
  const [formData, setformData] = useState({
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
  });

  // Barcode generation
  const barcodeValue = formData.itemCode || "SKU-000000";
  
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
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  // Create new item
  const createItem = async (e) => {
    e.preventDefault();
    try {
      const requestData = {
        sku: formData.sku,
        item_name: formData.name,
        quantity: Number(formData.quantity),
        threshold_limit: Number(formData.thresholdLimit),
        maximum_capacity: Number(formData.maxmiumCapacity),
        uom_id: 11, // Needs proper mapping
        category_id: 1, // Needs proper mapping
        inventory_id: 1, // Needs proper mapping
        item_image_url: formData.image || null,
        unit_price: parseFloat(formData.price),
        batch_code: formData.itemCode
      };

      const response = await apiClient.post("api/items/add", requestData);
      
      if (response.data.status === "success") {
        // Add new item to local state
        const newItem = {
          id: response.data.data._id,
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          itemCode: formData.itemCode,
          sku: formData.sku,
          status: "available",
          thresholdLimit: formData.thresholdLimit,
          maxmiumCapacity: formData.maxmiumCapacity,
          price: formData.price,
          quantity: formData.quantity,
          uom: formData.uom,
          image: formData.image
        };
        
        setInventoryItems([...inventoryItems, newItem]);
        alert("Item created successfully!");
      } else {
        alert(response.data.message || "Failed to create item");
      }
    } catch (err) {
      console.error("Create item error:", err);
      alert("Error creating item");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setformData(prev => ({ ...prev, [name]: value }));
  };

  // Load item into form
  const loadItem = (selectedItem) => {
    setformData({
      id: selectedItem.id,
      name: selectedItem.name,
      category: selectedItem.category,
      brand: selectedItem.brand,
      sku: selectedItem.sku,
      itemCode: selectedItem.itemCode,
      status: selectedItem.status,
      thresholdLimit: selectedItem.thresholdLimit,
      maxmiumCapacity: selectedItem.maxmiumCapacity,
      price: selectedItem.price,
      quantity: selectedItem.quantity,
      uom: selectedItem.uom,
      image: selectedItem.image
    });
  };

  // Delete item handlers
  const handleRemoveClick = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    // try {
    //   await apiClient.delete(`api/items/${selectedItem.id}`);
    //   setInventoryItems(items => items.filter(i => i.id !== selectedItem.id));
    //   alert("Item deleted successfully");
    // } catch (error) {
    //   console.error("Delete error:", error);
    //   alert("Failed to delete item");
    // } finally {
    //   setShowDeleteModal(false);
    //   setSelectedItem(null);
    // }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  // Filter items based on search and category
  const filteredItems = inventoryItems.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-row">
      {/* Item form (left) */}
      <div className="bg-white w-1/3 h-[calc(100vh-6rem)] p-10 z-10 flex flex-col justify-between">
        <div className="flex flex-col justify-end gap-6 h-[45rem]">
          {/* Image uploading block */}
          <div className="flex flex-row items-center max-h-[7rem]">
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-4 hover:border-gray-400 transition-colors">
              {formData.image ? (
                <img 
                  src={formData.image} 
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
                <p className="w-max text-lg text-[#A7A7A7]">{formData.itemCode}</p>
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
                name="name"
                value={formData.name}
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
                name="price"
                value={formData.price}
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
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="electronics">Electronics</option>
                  <option value="fruit">Fruit</option>
                  <option value="beverage">Beverage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="wijaya">Wijaya</option>
                  <option value="none">No brand</option>
                  <option value="malibourn">Malibourn</option>
                  <option value="munchee">Munchee</option>
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
                  name="itemCode"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Generate barcode"
                  className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold Limit
                </label>
                <input
                  type="number"
                  name="thresholdLimit"
                  value={formData.thresholdLimit}
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
                  name="maxmiumCapacity"
                  value={formData.maxmiumCapacity}
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
                  value={formData.uom}
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
              onClick={createItem}
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
            value={category}
            onChange={handleCategoryChange}
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
                  <Add_item_Card
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