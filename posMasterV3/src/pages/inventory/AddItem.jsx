import React, { useState } from "react";
import { X, Upload, Printer } from "lucide-react";
import Add_item_Card from "../../frontend/components/Add_item_Card";
import bananaImg from '../../assets/Inventory_banana.png';
import InventoryCard from '../../frontend/components/Inventory_card';
import itemImg from '../../assets/Inventory_banana.png';

function AddItem() {

  // Example inventory dataa
const [inventoryItems, setInventoryItems] = useState([
  {
    id: "1",
    name: "Banana",
    category: "fruit",
    brand: "none",
    itemCode: "234456",
    sku: "SKU-2347833",
    status: "available",
    thresholdLimit: 10,
    maxmiumCapacity: 100,
    quantity: 20,
    uom: "pcs",
    image: itemImg,
  },
  {
    id: "2",
    name: "Banana",
    category: "fruit",
    brand: "none",
    itemCode: "1543456",
    sku: "SKU-5343833",
    status: "available",
    thresholdLimit: 10,
    maxmiumCapacity: 100,
    quantity: 20,
    uom: "pcs",
    image: itemImg,
  },
  {
    id: "3",
    name: "Banana",
    category: "fruit",
    brand: "none",
    itemCode: "3345456",
    sku: "SKU-543833",
    status: "available",
    thresholdLimit: 10,
    maxmiumCapacity: 100,
    quantity: 20,
    uom: "pcs",
    image: itemImg,
  },
  // Add more items as needed
]);


  const [formUpdateData, setFormUpdateData] = useState({
    id: "4",
    name: "test item",
    category: "test fruit",
    brand: "test brand",
    itemCode: " test 2343234",
    sku: "test SKU-343423",
    status: "test available",
    thresholdLimit: 0,
    maxmiumCapacity: 0,
    quantity: 0,
    uom: "test kg",
    image: itemImg,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormUpdateData((prev) => ({ ...prev, [name]: value }));
  };

  // const handleSave = () => {
  //   onSave(formData);
  //   onClose();
  // };

  const loadItem = (selectedItem) => {
    setFormUpdateData({
      id: selectedItem.id,
      name: selectedItem.name,
      category: selectedItem.category,
      brand: selectedItem.brand,
      sku: selectedItem.sku,
      itemCode: selectedItem.itemCode,
      status: selectedItem.status,
      thresholdLimit: selectedItem.thresholdLimit,
      maxmiumCapacity: selectedItem.maxmiumCapacity,
      quantity: selectedItem.quantity,
      uom: selectedItem.uom,
    })
  };

  return (

      <div className="flex flex-row">
        {/* item form (left)*/}
          <div className="bg-white w-1/3 h-[55rem] p-10 flex flex-col justify-between">

            {/* image upload and form(top) */}
            <div className="flex flex-col justify-end gap-6 h-[45rem]">
              {/* image uploading block*/}
              <div className="flex flex-row items-center max-h-full">
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
                    <p className="text-lg text-[#A7A7A7]">{formUpdateData.sku}</p>
                    <p className="text-lg text-black">BARCODE :</p>
                    <p className="text-lg text-[#A7A7A7]">{formUpdateData.itemCode}</p>
                  </div>
                </div>   
              </div>

              {/* item form block*/}
              <div className="space-y-4 mb-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formUpdateData.name}
                    onChange={handleInputChange}
                    placeholder="Enter item name"
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
                      value={formUpdateData.category}
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
                      value={formUpdateData.brand}
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
                      name="itemCode"
                      value={formUpdateData.itemCode}
                      onChange={handleInputChange}
                      placeholder=""
                      className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formUpdateData.status}
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
                      value={formUpdateData.thresholdLimit}
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
                      value={formUpdateData.maxmiumCapacity}
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
                      value={formUpdateData.quantity}
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
                      value={formUpdateData.uom}
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
                  className="px-6 py-2 mr-4 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
                <button
                  //   onClick={}
                  className="px-6 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors"
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
                  <div className="w-full flex flex-row justify-between border border-t-transparent border-l-transparent border-r-transparent pb-2 border-b-[#EDEDED] h-14">
                    <input
                      type="text"
                      placeholder="Search your item here..."
                      className="px-3 py-2 w-full bg-white border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                    //   onClick={}
                    className="px-10 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors">
                      Search
                      </button>
                  </div>

                  <select
                      name="searchCategory"
                      //value={formData.uom}
                      onChange={handleInputChange}
                      className="w-80 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="electronics">Electronics</option>
                      <option value="fruit">Fruits</option>
                      <option value="beverage">Beverage</option>
                    </select>
        </nav>
                  <div className="h-[45rem] overflow-y-scroll">

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4  p-10">
  {inventoryItems.map(item => (
    <Add_item_Card
      key={item.id} 
      item={item} 
      onOpen={() => loadItem(item)} 
      // Optionally add onRemove if you want to support removing items
    />
  ))}
</div>
                        </div>
        </div>
      </div>
  );
}

export default AddItem;
