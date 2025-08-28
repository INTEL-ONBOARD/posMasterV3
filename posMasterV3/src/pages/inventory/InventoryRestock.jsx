import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import ItemCard from "../../components/ItemCard";
import {ChevronDown, Printer, ChevronUp } from "lucide-react";
import AddRegitemsImg from "../../assets/add_reg_items.png";

import NotFoundImg from "../../assets/nonicons_not-found-16.png";
import ReturnItemsImg from "../../assets/return_items.png";
import DisposeItemsImg from "../../assets/dispose_items.png";
import barcodeImg from "../../assets/barcode.png";
import SalesItemCard from "../../components/SalesItemCard";

function InventoryRestock() {
  // add item list
  const [inventoryItems, setInventoryItems] = useState([
    {
      _id: "688452ef1ddc1d25637c9a47",
      id: 31,
      stock_trace: [1],
      item_name: "Water Bottle",
      item_image_url: null,
      batch_code: "SKU2263WA901",
      sku: "SKU2263",
      quantity: 50,
      threshold_limit: 120,
      maximum_capacity: 400,
      uom_id: 22,
      category_id: 90,
      inventory_id: 1,
      unit_price: 25.5,
      stock_update_datetime: "2025-07-26T04:00:47.273Z",
      stock_created_datetime: "2025-07-26T04:00:47.273Z",
      __v: 0,
      uom: {
        _id: "687720ad798018e0851599a0",
        id: 22,
        symbol: "pcs",
        unit_name: "Piece",
        __v: 0,
      },
      category: {
        _id: "68775a921edd62f9c8128e0d",
        id: 90,
        brand: "Reebok",
        type: "Sportswear",
        __v: 0,
      },
      inventory: null,
    },
    {
      _id: "68845a0b8767fec474faa590",
      id: 32,
      stock_trace: [1],
      item_name: "Mobile Data cable",
      item_image_url: null,
      batch_code: "SKU-32452DA15822",
      sku: "SKU-32452",
      quantity: 54,
      threshold_limit: 40,
      maximum_capacity: 60,
      uom_id: 22,
      category_id: 158,
      inventory_id: 1,
      unit_price: 155,
      stock_update_datetime: "2025-07-26T04:31:07.861Z",
      stock_created_datetime: "2025-07-26T04:31:07.861Z",
      __v: 0,
      uom: {
        _id: "687720ad798018e0851599a0",
        id: 22,
        symbol: "pcs",
        unit_name: "Piece",
        __v: 0,
      },
      category: {
        _id: "687765bb1edd62f9c8129017",
        id: 158,
        brand: "Hp",
        type: "Computers",
        __v: 0,
      },
      inventory: null,
    },
  ]);
  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/items/extended");
      if (response.data.status === "success") {
        setInventoryItems(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      //setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch items after UOMs are loaded to properly map uomName
    // if (!loadingUoms) {
    fetchItems();
    // }
    //}, [loadingUoms]);
  }, []);
  // //if more control over categories needed later, use this State for category/brand mapping
  //   const [itemCategories, setItemCategories] = useState([
  //     { id: 145, brand: "Close-Up",   type: "Oral Care" },
  //     { id:  94, brand: "Clogard",    type: "Oral Care" },
  //     { id:  15, brand: "Colgate",    type: "Oral Care" },
  //     { id:  26, brand: "Pepsi",      type: "Beverages" },
  //     { id:   7, brand: "Coca-Cola",  type: "Beverages" },
  //   ]);

  //category dropdown population(search and item form)
  const [uniqueCategoryTypes, setUniqueCategoryTypes] = useState([]);
  // Fetch Categories from API and create mapping
  useEffect(() => {
    const fetchCategories = async () => {
      setIsSearching(true);
      try {
        const response = await apiClient.get("api/categories");
        if (response.data.status === "success") {
          //setItemCategories(response.data.data);
          const types = Array.from(
            new Set(response.data.data.map((c) => c.type))
          );
          setUniqueCategoryTypes(types);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        //setLoadingCategories(false); //if more control over categories needed later, use this
        setIsSearching(false);
      }
    };

    fetchCategories();
  }, []);

  //if more control over categories needed later, use this
  //   useEffect(() => {
  //     const types = Array.from(new Set(itemCategories.map(c => c.type)));
  //     setUniqueCategoryTypes(types);
  //   }, [itemCategories]);

  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [isSearching, setIsSearching] = useState(false);

  // search handler to set loading state:
  const handleSearch = (e) => {
    setIsSearching(true);
    setSearch(e.target.value);
    // Simulate async search (replace with your real async logic if needed)
    setTimeout(() => {
      setIsSearching(false);
    }, 600); // 600ms delay for demo
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      (searchCategory === "All" || item.category.type === searchCategory) &&
      item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  // left section controls
    // const [openItem, setOpenItem] = useState(false);
    // const [openStock, setOpenStock] = useState(true);
    // const [openSupplier, setOpenSupplier] = useState(true);
    //replace with this
    const [openFormBlock, setopenFormBlock] = useState('item'); //item || stock || supplier || 

  // right section controls
  const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "dispose" | "add" | "return"

  return (
    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* form section (left) */}
      <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)]">
          <div className="flex flex-col h-[56rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setopenFormBlock('item')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCIRPTION</span>
              {openFormBlock=='item' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openFormBlock=='item') && (
/* 
              onClick={() => setOpenItem(!openItem)}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCIRPTION</span>
              {openItem ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openItem && (*/
              
              <div className="mx-4">
                <div className="flex flex-row px-4 items-center max-h-[12rem]">
                  <div className="">
                    <img src={barcodeImg} alt="Barcode" className="w-[100px] object-contain" />
                    <p className="text-sm text-gray-800">SKU: 345634BRE</p>
                  </div>
                  {/* Vertical black line separator */}
                  <div className="flex flex-col m-10">
                    <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                          <p className="text-sm font-semibold text-gray-800">Name</p>
                          <p className="text-sm text-gray-700">Soap</p>
                          <p className="text-sm font-semibold text-gray-800">Category</p>
                          <p className="text-sm text-gray-700">Sanitary</p>
                          <p className="text-sm font-semibold text-gray-800">Current Qty</p>
                          <p className="text-sm text-gray-700">100/1000(pcs)</p>
                        </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ stock description block ▼ */}
          <div className="border">
            <button
              // onClick={() => setOpenStock(!openStock)}
              openFormBlock
              onClick={() => setopenFormBlock('stock')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">STOCK DESCRIPTION</span>
              {openFormBlock=='stock' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openFormBlock == 'stock') && (
              <div className="px-4 bg h-[34rem] bg-white">
                {/*stock description block  */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Barcode
                      </label>
                      <input
                        type="text"
                        name="sku"
                        // value={formData.sku}
                        // onChange={handleInputChange}
                        placeholder="Generate barcode"
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="batch_code"
                        // value={formData.batch_code}
                        // onChange={handleInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Lower Threshold Rate(%)
                      </label>
                      <input
                        type="text"
                        name="sku"
                        // value={formData.sku}
                        // onChange={handleInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        // name="category"
                        // value={formData.category}
                        // onChange={handleInputChange}
                        name="categoryType"
                        // value={formCategoryData.categoryType}
                        // onChange={handleCategoryChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select availability --</option>
                        <option value="">Available</option>
                        <option value="">Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Stock Price
                      </label>
                      <input
                        type="number"
                        name="sku"
                        // value={formData.sku}
                        // onChange={handleInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Retail Price
                      </label>
                      <input
                        type="number"
                        name="batch_code"
                        // value={formData.batch_code}
                        // onChange={handleInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Expiration Date
                      </label>
                      <div className="relative max-w-sm">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                          {/* <svg
                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                          </svg> */}
                        </div>
                          <input
                            type="date"
                            id="expired_datetime"
                            // value={formData.expired_datetime ? formData.expired_datetime.split('T')[0] : ''}
                            // onChange={(e) => {
                            //   const selectedDate = e.target.value;
                            //   console.log("date input value: "+selectedDate);
                            //   if (selectedDate) {
                            //     // Format to UTC midnight: YYYY-MM-DDT00:00:00.000Z
                            //     const utcMidnight = `${selectedDate}T00:00:00.000Z`;
                            //     console.log("to formData:"+utcMidnight)
                            //     setformData({
                            //       ...formData,
                            //       expired_datetime: utcMidnight
                            //     });
                            //   } else {
                            //     // Clear the field if date is empty
                            //     setformData({ ...formData, expired_datetime: null });
                            //   }
                            // }}
                            name="expired_datetime"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2"
                            placeholder="Select date"
                          />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        name="batch_code"
                        // value={formData.batch_code}
                        // onChange={handleInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p>Recent Batch Code Changes</p>
                  <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[13rem] -mr-4">
                  <div className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]">
                    <div className="flex flex-col">
                      <span className="text-md font-bold">SKU:</span>
                      <span className="text-gray-600">SKU23453RE</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">60 units</span>
                      <span className="text-gray-400">2025-04-04 Exp</span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]">
                    <div className="flex flex-col">
                      <span className="text-md font-bold">SKU:</span>
                      <span className="text-gray-600">SKU23453RE</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">60 units</span>
                      <span className="text-gray-400">2025-04-04 Exp</span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]">
                    <div className="flex flex-col">
                      <span className="text-md font-bold">SKU:</span>
                      <span className="text-gray-600">SKU23453RE</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">60 units</span>
                      <span className="text-gray-400">2025-04-04 Exp</span>
                    </div>
                  </div>

                  </div>


                </div>
              </div>
            )}
          </div>


          {/* ▼ supplier description block ▼ */}
          <div className="bg-white">
            <button
              // onClick={() => setOpenSupplier(!openSupplier)}
              onClick={() => setopenFormBlock('supplier')}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">SUPPLIER DESCRIPTION</span>
              {(openFormBlock=='supplier') ? <ChevronUp /> : <ChevronDown />}
              {/* {openSupplier ? <ChevronUp /> : <ChevronDown />} */}
            </button>
            {(openFormBlock=='supplier') && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Suppier
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select supplier --</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                  {/* //newly added */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Invoice No
                      </label>
                      <input
                        type="text"
                        name="stock_price"
                        // value={formData.stock_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Bill No
                      </label>
                      <input
                        type="text"
                        name="retail_price"
                        // value={formData.retail_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Method
                      </label>
                      <select
                        name="availability"
                        // value={formData.availability}
                        // onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select payment method --</option>
                        <option value={true}>Bank Check</option>
                        <option value={false}>Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Expenses (Rs.)
                      </label>
                      <input
                        type="number"
                        name="retail_price"
                        // value={formData.retail_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* ▼ return description block ▼ */}
          <div className="bg-white">
            <button
              // onClick={() => setOpenSupplier(!openSupplier)}
              onClick={() => setopenFormBlock('return')}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">RETURN DESCRIPTION</span>
              {(openFormBlock=='return') ? <ChevronUp /> : <ChevronDown />}
              {/* {openSupplier ? <ChevronUp /> : <ChevronDown />} */}
            </button>
            {(openFormBlock=='return') && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="text"
                        name="stock_price"
                        // value={formData.stock_price}
                        // onChange={handleInputChange}
                        placeholder="Enter item price"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                    <div className='mt-1'>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Description
                      </label>
                      <textarea
                      //value=""
                      //onChange=
                      placeholder="Enter details..."
                      rows={3}
                      className="w-full mt-2 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                </div>
              </div>
            )}
          </div>




          
        </div>
        {/* Bottom bar */}
        <div className="flex flex-row justify-around">
          {/* <button
            className="flex items-center w-[10rem] h-10 px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors"
            // onClick={() => generatePdf('print')}
          >
            <Printer className="w-4 h-4 mr-4" />
            <p>Print Barcode</p>
          </button> */}
          <button
            onClick={() => {
              clearUserInput();
              //switch from update item button to add item button 
              setUserEditing(false)
            }}
            className="px-6 py-2 w-[10rem] h-10  border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          {/* switch between update and add button functions based on item card selection and clear form button click */}
          <button
            // onClick={isUserEditting ? updateItem : createItem}
            className="px-6 py-2 h-10 w-[10rem] bg-blue-600 text-white hover:bg-[#1A318C] transition-colors"
          >
            {/* {isUserEditting ? 'Update' : 'Create'} */}Add Item
          </button>

        </div>
      </div>
      
      {/* they don't pay me enough for this😞 */}
      {/* main transaction section (mid) */}
      <div className="bg-white w-[calc(45rem)] h-[calc(100vh-2rem)]">
        {/* supplier details section*/}
        <div className="p-5">
          <div className="flex flex-row gap-12">
          <div className="flex flex-col w-2/3">
            <div>
              <p>Supplier:</p>
              <p className="text-2xl font-semibold">Ranathunga Pvt(Ltd)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Prepared by
              </label>
              <select
                //  name="availability"
                // value={formData.availability}
                // onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- select employee --</option>
                <option value="john">John</option>
                <option value="doe">Doe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Authorized by
              </label>
              <select
                //  name="availability"
                // value={formData.availability}
                // onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- select employee --</option>
                <option value="john">John</option>
                <option value="doe">Doe</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col w-1/3">
            <div>
              <p>Date:</p>
              <p className="text-2xl font-semibold">2023-02-02</p>
            </div>
            <div>
              <p>Invoice No:</p>
              <p className="text-2xl font-semibold">REPC2456XS</p>
            </div>
            <div className="mt-8 flex flex-row gap-4">
              <button
                // onClick={() => {
                //   clearUserInput();
                //   //switch from update item button to add item button 
                //   setUserEditing(false)
                // }}
                className="px-6 py-2 w-[8rem] h-10  border bg-[#727272] border-gray-300 text-white hover:bg-gray-500 transition-colors"
              >
                Clear
              </button>
              <button
                // onClick={() => {
                //   clearUserInput();
                //   //switch from update item button to add item button 
                //   setUserEditing(false)
                // }}
                className="px-6 py-2 w-[8rem] h-10  border bg-[#2FBC34] border-gray-300 text-white hover:bg-green-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
        </div>
        {/* table section*/}
        <div className="overflow-x-auto h-[28rem] p-2 lg:p-4">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-700 text-[#848484]">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  #
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Item code
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Unit count
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Stock Price
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Stock Total
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Retail Price
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  Retail Total
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs font-normal lg:text-sm">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">

                <tr
                  //key={item.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                  // onClick={() => handleTableRowClick(item)}
                >
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {index + 1} {item.code} */} 1
                  </td>
                 <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.quantity || 30}(pcs) */}XLR9590565
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.quantity || 30}(pcs) */}13
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.total.toFixed(2)} */}12334.00
                  </td>
                  <td>

                  <button
                    type="button"
                    //onClick={onClose}
                    aria-label="Close notification"
                    className="m-3 w-5 h-5 rounded-full bg-black inline-flex items-center justify-center focus:outline-none"
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
            </tbody>
          </table>
        </div>
        {/* amount section */}
        <div className="bg-white mt-2 p-6 border-t-2 border-t-gray-400">
          {/* outer row */}
          <div className="flex gap-6">
            {/* LEFT: 2/3 */}
            <div className="w-2/3">
              {/* Discount input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Discount ( Rs. )</label>
                <input
                  type="number"
                  // value={discount}
                  // onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full px-3 py-3 bg-[#F8F8F8] border border-[#EBEBEB] text-right rounded"
                  placeholder="0.00"
                />
              </div>

              {/* amounts area: two columns with a vertical divider */}
              <div className="flex gap-6 items-start">
                {/* left column inside amount area */}
                <div className="flex-1">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">Discount Amount</p>
                    <p className="text-xl font-semibold">fdsfdsfdsf</p>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-semibold text-gray-700">Previous Amount</p>
                    <p className="text-3xl font-extrabold text-black">fdsfdff</p>
                  </div>
                </div>

                {/* vertical divider */}
                <div className="w-px bg-gray-200" />

                {/* right column inside amount area */}
                <div className="flex-1 pl-6">
                  <div className="mb-6">
                    <p className="text-sm text-red-500">Return Amount</p>
                    <p className="text-xl font-semibold text-red-500">3423424</p>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-gray-500">Current Amount</p>
                    <p className="text-xl font-semibold text-gray-700">324324324</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: 1/3 */}
            <div className="w-1/3 border-l border-gray-200 pl-6">
              {/* Cash amount input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Cash Amount ( Rs. )</label>
                <input
                  type="number"
                  // value={cash}
                  // onChange={(e) => setCash(Number(e.target.value))}
                  className="w-full px-3 py-3 bg-[#F8F8F8] border border-[#EBEBEB] text-right rounded"
                  placeholder="0.00"
                />
              </div>

              {/* change amount */}
              <div className="mb-6">
                <p className="text-sm text-gray-500">Change Amount</p>
                <p className="text-lg font-semibold text-gray-800">41343432</p>
              </div>

              {/* total amount */}
              <div>
                <p className="text-sm font-semibold text-gray-800">Total Amount</p>
                <p className="text-4xl font-extrabold text-black">431434324</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-300 border-yellow-300 w-[calc(32rem)] h-[calc(100vh-2rem)]">
        {/* BUTTONS BLOCK (default visible) */}
        {rightActiveSection === "buttons" && (
          <div className="flex flex-col flex-1 p-2 gap-1">
            <button
              onClick={() => setRightActiveSection("dispose")}
              className="h-[16rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
            >
              <img
                src={DisposeItemsImg}
                alt="Dispose Items"
                className="w-[8rem] h-[8rem] object-contain mb-2"
              />
              <span>Dispose Items</span>
            </button>

            <button
              onClick={() => setRightActiveSection("add")}
              className="h-[16rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
            >
              <img
                src={AddRegitemsImg}
                alt="Add Registered Items"
                className="w-[8rem] h-[8rem] object-contain mb-2"
              />
              <span>Add Registered Items</span>
            </button>

            <button
              onClick={() => setRightActiveSection("return")}
              className="h-[16rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
            >
              <img
                src={ReturnItemsImg}
                alt="Return Items"
                className="w-[8rem] h-[8rem] object-contain mb-2"
              />
              <span className="text-xl">Return Items</span>
            </button>

            {/* White block to fill remaining space */}
            <div className="h-[20rem] bg-white rounded"></div>
          </div>
        )}

        {/* DISPOSE ITEMS BLOCK */}
        {rightActiveSection === "dispose" && (
          <div className="p-4">
            <button
              onClick={() => setRightActiveSection("buttons")}
              aria-label="Back"
              className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors mb-4"
            >
              <BackIcon />
            </button>

            <div className="p-4 bg-white rounded">
              <h3 className="font-semibold mb-2">Dispose Items</h3>
              <p className="text-sm text-gray-600">
                This is the dispose items block. Add your UI here.
              </p>
              {/* Example: list disposed items or a form */}
            </div>
          </div>
        )}

        {/* ADD REGISTERED ITEMS BLOCK */}
        {rightActiveSection === "add" && (
          <div>
            <div className="w-full flex flex-col justify-between py-4 px-6 bg-white gap-6 mb-4">
              <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center gap-3">
                {/* back button */}
                <button
                  onClick={() => setRightActiveSection("buttons")}
                  className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
                >
                  <BackIcon />
                </button>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Your Items here"
                  className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
                />

                <button
                  /*onClick={handleSearchClick}*/ className="flex items-center px-4 py-2 bg-[#1A318C] text-white"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  Search
                </button>
              </div>

              <div className="flex flex-row gap-4">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-[14rem] h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategoryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  /*value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}*/
                  className="w-[14rem] h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
                >
                  <option value="All">Stock Availability</option>
                  <option value="All">All</option>
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>
            </div>

            <div className="h-[calc(100vh-13rem)] overflow-y-scroll bg-transparent">
              <div className="grid grid-cols-1 gap-6 p-10">
                {isSearching ? (
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
                    {NotFoundImg ? (
                      <img
                        src={NotFoundImg}
                        alt="No items found!"
                        className="w-12 h-12 mb-2 opacity-70"
                      />
                    ) : null}
                    <span>No items found!</span>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <SalesItemCard key={item.id ?? item._id} item={item} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* RETURN ITEMS BLOCK */}
        {rightActiveSection === "return" && (
          <div className="p-4">
            <button
              onClick={() => setRightActiveSection("buttons")}
              className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors mb-4"
            >
              <BackIcon />
            </button>

            <div className="p-4 bg-white rounded">
              <h3 className="font-semibold mb-2">Return Items</h3>
              <p className="text-sm text-gray-600">
                This is the return items block. Add return UI here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryRestock;

// icon used for all back buttons
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
