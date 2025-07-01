import React, { useState } from "react";
import { X, Upload, Printer } from "lucide-react";
import InventoryCard from '../../frontend/components/Inventory_card';
import bananaImg from '../../assets/Inventory_banana.png';

function AddItem() {


  // Example inventory data
const [inventoryItems, setInventoryItems] = useState([
  {
    id: '1',
    name: 'Banana',
    barcode: 'SKU-37847324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU001',
    stock: 100,
    image: bananaImg
  },
   {
    id: '2',
    name: 'Banana',
    barcode: 'SKU-5837324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '3',
    name: 'Banana',
    barcode: 'SKU-58394324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '4',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '5',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '6',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '7',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '8',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  {
    id: '9',
    name: 'Banana',
    barcode: 'SKU-34681324',
    category: 'Fruit',
    price: '340.00',
    unit: 'KG',
    sku: 'SKU002',
    stock: 100,
    image: bananaImg
  },
  // Add more items as needed
]);


  const [formData, setFormData] = useState({
    name: "",
    itemCode: "",
    sku: "SKU-3847833",
    barcode: "3847833",
    category: "provisions",
    brand: "wijaya",
    status: "Available",
    thresholdLimit: "",
    maximumThreshold: "",
    quantity: "",
    uom: "KG",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (

      <div className="flex flex-row">
        {/* item form (left)*/}
          <div className="bg-white w-1/3 h-[55rem] p-10 flex flex-col justify-between">

            {/* image upload and form(top) */}
            <div className="flex flex-col gap-6">
              {/* image uploading  */}
              <div className="flex flex-row items-center max-h-48">
                <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-4 hover:border-gray-400 transition-colors">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                </div>
                <div className="flex flex-col m-10">
                <button className="px-4 py-2 mb-4 bg-[#4A4A4A] text-white text-sm hover:bg-gray-700 transition-colors">
                  Upload a photo
                </button>
                <div className="grid grid-cols-2">
                <p className="text-lg text-black">SKU :</p>
                <p className="text-lg text-[#A7A7A7]">RX3466</p>
                <p className="text-lg text-black">BARCODE :</p>
                <p className="text-lg text-[#A7A7A7]">RX3466</p>
                </div>
                </div>   
              </div>

              {/* item form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="item@gmail.com"
                    className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="food">Foods</option>
                      <option value="beverages">Beverages</option>
                      <option value="provisions">Provisions</option>
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
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Available">Wijaya</option>
                      <option value="Out of Stock">Malibourn</option>
                      <option value="Low Stock">Munchee</option>
                    </select>
                  </div>
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code
                  </label>
                  <input
                    type="text"
                    name="itemCode"
                    value={formData.itemCode || ""}
                    onChange={handleInputChange}
                    placeholder="Enter item code"
                    className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div> */}

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
                      placeholder=""
                      className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Available">Available</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Low Stock">Low Stock</option>
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
                      placeholder="12"
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Threshold
                    </label>
                    <input
                      type="number"
                      placeholder="12"
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="KG">KG</option>
                      <option value="PCS">PCS</option>
                      <option value="LTR">LTR</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* bottom bar(bottom) */}
            <div className="flex justify-between space-x-3 -mx-10 p-4 bg-[#C4C4C4]">
              <div className="flex flex-row items-center gap-3">
                <button className="flex items-center px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors">
                  <Printer className="w-4 h-4 mr-4 " />
                    <p>Print Barcode</p>
                </button>

              </div>
              <div>
                <button
                  //   onClick={}
                  className="px-6 py-2 mr-4 border bg-[#727272] border-gray-300 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
                <button
                  //   onClick={}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-[#1A318C] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

        {/* item list(right)*/}
        <div className="w-2/3 h-[40rem] bg-[#EBEBEB]">
        {/* search panel */}
        <nav className="w-full flex flex-row justify-between py-8 px-10 h-[7rem] bg-white gap-6">
          {/* search textbox and search button */}
                  <div className="w-full flex flex-row justify-between border-2 pb-2 border-b-[#EDEDED] h-14">
                    <input
                      type="text"
                      placeholder="Search your item here..."
                      className="px-3 py-2 w-full bg-white border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                    //   onClick={}
                    className="px-10 py-2 bg-blue-600 text-white rounded-md hover:bg-[#1A318C] transition-colors"
                      >Search
                      </button>
                  </div>

                  <select
                      name="searchCategory"
                      //value={formData.uom}
                      onChange={handleInputChange}
                      className="w-80 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="foods">Foods</option>
                      <option value="beverages">Beverages</option>
                      <option value="electronics">Electronics</option>
                    </select>
        </nav>
                  <div className="h-[45rem] overflow-y-scroll">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4  p-10">
                        {inventoryItems.map(item => (
                          <InventoryCard 
                          key={item.id} 
                          item={item} 
                          onOpen={() => navigate(`/dashboard/inventory/edit-item/${item.id}`)} 
                          />
                        ))}
                      </div>
                        </div>
        </div>
      </div>
  );
}

export default AddItem;
