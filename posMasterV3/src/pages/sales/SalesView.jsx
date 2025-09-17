import React, { useState, useEffect, useRef, useContext } from "react";
import bananaImg from "../../assets/Inventory_banana.png";
import SalesItemCard from "../../components/SalesItemCard";
import { apiClient } from "../../api/client";
import {ChevronDown, ChevronUp } from "lucide-react";
import ToastContext from "../toasts/ToastService.jsx";
import BillDocument from "./BillDocument";
import { pdf } from '@react-pdf/renderer';
//image imports
import barcodeImg from "../../assets/barcode.png";
import AddRegitemsImg from "../../assets/add_reg_items.png";
import clearBtnImg from "../../assets/sales_clear.png";
import sidebarHoldOrderBtnImg from "../../assets/sales_hold_order.png";
import sidebarPaymentBtnImg from "../../assets/sales_proceed_payment.png";
import profileImg from "../../assets/user_profile_image.png";


export default function SalesView() {

  const toast = useContext(ToastContext);
  const [openItemFormBlock, setopenItemFormBlock] = useState('item'); //item || stock || supplier || 
  const [openStockFormBlock, setopenStockFormBlock] = useState('stock'); //item || stock || supplier || 
  //left section controls
    const [formDataRegItem, setFormDataRegItem] = useState({
      _id: "",
      id: 0,
      stock_trace: [0],
      item_name: "fdsaf",
      item_image_url: "",
      batch_code: "fdsaf",
      maximum_capacity: 10,
      uom_id: 10,
      category_id: 10,
      inventory_id: 11,
      item_update_datetime: "2025-12-31T23:59:59",
      item_created_datetime: "2025-12-31T23:59:59",
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
    });
    //no input change for this for now(because of readonly in ui)
    const [formDataStock, setFormDataStock] = useState({
      sku: "skupsps",
      quantity: 150,
      threshold_limit: 20,
      stock_price: 20.0,
      retail_price: 35.0,
      expired_datetime: "2025-12-31T23:59:59",
      availability: true
    });
    const handleStockInputChange = (e) => {
      const { name, value } = e.target;
      console.log(name +": "+ value);
      setFormStockData(prev => ({ ...prev, [name]: value }));
    };

    const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "items"







// mid section controls
    const [selectedItems, setSelectedItems] = useState([
    {
      id: 1,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 30,
      unit: "pcs",
      total: 11300.0,
    },
    {
      id: 2,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 1,
      unit: "pcs",
      total: 12300.0,
    },
    {
      id: 3,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 200,
      unit: "ml",
      total: 12300.0,
    },
    {
      id: 4,
      code: "XLR9590565",
      unitPrice: 3200.0,
      quantity: 3.5,
      unit: "kg",
      total: 12300.0,
    },
  ]);



  const totalAmount = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = 450.0;
  const changeAmount = 450.0;

  const [selectedTableItem, setSelectedTableItem] = useState(null);




  const handleTableRowClick = (item) => {
    // Convert scanned item format to inventory item format for display
    const displayItem = {
      id: item.id,
      name: "Banana", // You can map this to actual product name based on item.code
      category: "Fruit", // You can map this to actual category
      price: item.unitPrice.toFixed(2),
      unit: "1KG", // You can map this to actual unit
      sku: item.code,
      stock: `${item.quantity} Units`, // Current quantity in cart
      image: bananaImg, // You can map this to actual product image
      currentQuantity: item.quantity, // Current quantity in the cart
      unitType: item.unit,
    };
    setSelectedTableItem(displayItem);
  };

  const handleOpenProceedPayment = () => {

};




//right section controls
  const [inventoryItems, setInventoryItems] = useState([
        // {
        //     _id: '688136391a56f324f917f98f',
        //     id: 29,
        //     stock_trace: [1],
        //     item_name: 'dsds1',
        //     item_image_url: null,
        //     batch_code: '2424DS4521',
        //     sku: '2424',
        //     quantity: 11,
        //     threshold_limit: 11,
        //     maximum_capacity: 111,
        //     uom_id: 21,
        //     category_id: 45,
        //     inventory_id: 1,
        //     unit_price: 111,
        //     stock_update_datetime: '2025-07-23T19:21:29.406Z',
        //     stock_created_datetime: '2025-07-23T19:21:29.406Z',
        //     __v: 0,
        //     uom: {
        //         _id: '687720a0798018e08515999c',
        //         id: 21,
        //         symbol: 'mL',
        //         unit_name: 'Milliliter',
        //         __v: 0
        //     },
        //     category: {
        //         _id: '687740d91edd62f9c8128bd0',
        //         id: 45,
        //         brand: 'Axe',
        //         type: 'Deodorants',
        //         __v: 0
        //     },
        //     inventory: null
        // },
        {
            _id: '688452ef1ddc1d25637c9a47',
            id: 31,
            stock_trace: [1],
            item_name: 'Water Bottle',
            item_image_url: null,
            batch_code: 'SKU2263WA901',
            sku: 'SKU2263',
            quantity: 50,
            threshold_limit: 120,
            maximum_capacity: 400,
            uom_id: 22,
            category_id: 90,
            inventory_id: 1,
            unit_price: 25.5,
            stock_update_datetime: '2025-07-26T04:00:47.273Z',
            stock_created_datetime: '2025-07-26T04:00:47.273Z',
            __v: 0,
            uom: {
                _id: '687720ad798018e0851599a0',
                id: 22,
                symbol: 'pcs',
                unit_name: 'Piece',
                __v: 0
            },
            category: {
                _id: '68775a921edd62f9c8128e0d',
                id: 90,
                brand: 'Reebok',
                type: 'Sportswear',
                __v: 0
            },
            inventory: null
        },
        {
            _id: '68845a0b8767fec474faa590',
            id: 32,
            stock_trace: [1],
            item_name: 'Mobile Data cable',
            item_image_url: null,
            batch_code: 'SKU-32452DA15822',
            sku: 'SKU-32452',
            quantity: 54,
            threshold_limit: 40,
            maximum_capacity: 60,
            uom_id: 22,
            category_id: 158,
            inventory_id: 1,
            unit_price: 155,
            stock_update_datetime: '2025-07-26T04:31:07.861Z',
            stock_created_datetime: '2025-07-26T04:31:07.861Z',
            __v: 0,
            uom: {
                _id: '687720ad798018e0851599a0',
                id: 22,
                symbol: 'pcs',
                unit_name: 'Piece',
                __v: 0
            },
            category: {
                _id: '687765bb1edd62f9c8129017',
                id: 158,
                brand: 'Hp',
                type: 'Computers',
                __v: 0
            },
            inventory: null
        }
    ]
  );
  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/itemRegistry/extended");
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

  const [uniqueCategoryTypes, setUniqueCategoryTypes] = useState([]);
    // Fetch Categories from API and create mapping
    useEffect(() => {
      const fetchCategories = async () => {
        setIsSearching(true);
        try {
          const response = await apiClient.get("api/categories");
          if (response.data.status === "success") {
            //setItemCategories(response.data.data);
            const types = Array.from(new Set(response.data.data.map(c => c.type)));
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

  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // or "list"
  const [isSearching, setIsSearching] = useState(false);

  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
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

  // text search match
  const matchesSearch =
    (item?.item_name || "").toLowerCase().includes((search || "").toLowerCase());

  return matchesCategory && matchesAvailability && matchesSearch;
});



  const generatePdf = async (action) => {
    try {
      console.log("printing started");
      const instance = pdf(<BillDocument/>);
console.log("printing complete");
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

  return (
    <div className="flex h-screen bg-[#EBEBEB]">

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] bg-[#EBEBEB] w-full">

        {/* main trasaction section(left) */}
        <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 z-10">
        {/* 56 is the correct height */}
          <div className="flex flex-col h-[46rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setopenItemFormBlock('item')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCIRPTION</span>
              {openItemFormBlock=='item' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openItemFormBlock=='item') && (
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
                          <p className="text-sm text-gray-700">{formDataRegItem.item_name}</p>
                          <p className="text-sm font-semibold text-gray-800">Category</p>
                          <p className="text-sm text-gray-700">{formDataRegItem?.category?.type}</p>
                          <p className="text-sm font-semibold text-gray-800">Current Qty</p>
                          <p className="text-sm text-gray-700">{formDataStock?.quantity}/{formDataRegItem?.maximum_capacity}({formDataRegItem?.uom?.symbol})</p>
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
              onClick={() => setopenStockFormBlock('stock')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">STOCK DESCRIPTION</span>
              {openStockFormBlock=='stock' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openStockFormBlock == 'stock') && (
              <div className="px-4 bg h-[34rem] bg-white">
                {/*stock description block  */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formDataStock.sku}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
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
                        name="threshold_limit"
                        value={formDataStock.threshold_limit}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select availability --</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
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
                        name="stock_price"
                        value={formDataStock.stock_price}
                        onChange={handleStockInputChange}
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
                        name="retail_price"
                        value={formDataStock.retail_price}
                        onChange={handleStockInputChange}
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
                            value={formDataStock.expired_datetime ? formDataStock.expired_datetime.split('T')[0] : ''}
                            onChange={(e) => {
                              const selectedDate = e.target.value;
                              console.log("date input value: "+selectedDate);
                              if (selectedDate) {
                                // Format to UTC midnight: YYYY-MM-DDT00:00:00.000Z
                                const utcMidnight = `${selectedDate}T00:00:00.000Z`;
                                console.log("to formData:"+utcMidnight)
                                setFormDataStock({
                                  ...formDataStock,
                                  expired_datetime: utcMidnight
                                });
                              } else {
                                // Clear the field if date is empty
                                setFormDataStock({ ...formDataStock, expired_datetime: null });
                              }
                            }}
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
                        name="retail_price"
                        value={formDataStock.retail_price}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {/* <p>Recent Batch Code Changes</p>
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

                  </div> */}


                </div>
              </div>
            )}
          </div>

          </div>
            </div>

            {/* item table section(mid) */}
            <div className="p-2 flex flex-col w-[calc(45rem)] h-[calc(100vh-2rem)]">
              {/* Items Table - REDUCED HEIGHT */}
              <div
                className="bg-white overflow-hidden h-[43rem]"
              >
                {/* member container */}
                <div className="w-full relative p-auto p-4">
                  {/* Main search container */}
                  <div className="flex flex-row gap-6">
                    {/* left */}
                    <div className="w-2/3">
                      <div>
                      <p>Member</p>
                      <p className="font-semibold text-xl">Nimal Gamage Rathnayake(12344)</p>
                      </div>
                                          <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Payment Method
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select payment --</option>
                        <option value="cash">Cash</option>
                        <option value="credit">Credit</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                                        <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Credit Duration
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="">-- select duration --</option>
                        <option value={true}>01 Month</option>
                        <option value={false}>03 Month</option>
                        <option value={false}>06 Month</option>
                      </select>
                    </div>
                    </div>
                    {/* right */}
                    <div className="w-1/3 flex flex-col gap-3">
                      <div>
                      <p>Member ID</p><p className="font-semibold text-lg">1232423</p>
                      </div>
                      <div>
                      <p>Date</p><p className="font-semibold text-lg">2025-07-11</p>
                      </div>
                      <div>
                      <p>Invoice No</p><p className="font-semibold text-lg">RECPC21321</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* transaction details */}
                <div className="overflow-x-auto h-full p-2 lg:p-4">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-700 text-white">
                      <tr>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          #
                        </th>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Item code
                        </th>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Unit price
                        </th>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Unit count
                        </th>
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {selectedItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors`}
                          onClick={() => handleTableRowClick(item)}
                        >
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {index+1}
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.code}
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.quantity || 30}(pcs)
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white">
                {/* Amounts */}
                <div className="grid grid-cols-2 p-2 lg:p-3">
                  <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">RS.{totalAmount.toFixed(2)}</div>
                  <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">Discount Amount</div>
                  <div className="p-2 bg-[#D9D9D9] text-lg lg:text-xl font-normal text-gray-800 text-right">RS.{discountAmount.toFixed(2)}</div>
                  <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">Total Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">RS.{totalAmount.toFixed(2)}</div>
                  <div className="p-2 bg-white text-sm lg:text-base text-gray-500 h-16">Customer Gave</div>
                  <div className="p-2 bg-white text-lg lg:text-3xl font-semibold text-[#737373] text-right  h-16 border-b-2 ">RS.20000</div>
                  <div className="p-2 bg-[#F8F8F8] text-sm lg:text-base text-gray-500">Change Amount</div>
                  <div className="p-2 bg-[#F8F8F8] text-lg lg:text-xl font-normal text-gray-800 text-right">RS.{changeAmount.toFixed(2)}</div>

                </div>
                {/* payment button controls*/}
                <div className="flex flex-col sm:flex-row px-2 lg:px-3 gap-[10px]">
                  <button className="w-1/4 px-4 py-3 bg-[#727272] text-white text-sm hover:bg-gray-700 transition-all flex items-center justify-center">
                    <img src={clearBtnImg} alt="Clear" className="w-4 h-4 mr-2" />
                    Clear
                  </button>

                  <button className="w-1/4 px-4 py-3 bg-[#EB8928] text-white text-sm hover:bg-orange-500 transition-all flex items-center justify-center">
                    <img src={sidebarHoldOrderBtnImg} alt="Hold Order" className="w-4 h-4 mr-2" />
                    Hold Order
                  </button>

                  <button 
                    //onClick={handleOpenProceedPayment}
                    onClick={() => generatePdf('print')}
                    className="flex-1 w-1/2 px-4 py-3 bg-[#1A318C] text-white text-sm hover:bg-blue-700 transition-all flex items-center justify-center"
                  >
                    <img src={sidebarPaymentBtnImg} alt="Proceed Payment" className="w-4 h-4 mr-2" />
                    Proceed Payment
                  </button>
                </div>

              </div>

            </div>

            {/* Member and Item list section(right) */}
            <div className="bg-gray-300 w-[calc(32rem)] h-[calc(100vh-2rem)]">
              <div className="space-y-4 flex flex-col h-full">

                {/* item list */}
                {rightActiveSection == "items" && (
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
                  //value={search}
                  //onChange={handleSearch}
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
                  //value={searchCategory}
                  //onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
                >
                  <option value="All">All Categories</option>
                    {uniqueCategoryTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                      </option>
                      ))}
                </select>

                      <select
                        name="searchAvailability"
                        value={searchAvailability}
                        onChange={(e) => setSearchAvailability(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Availabilities</option>
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                      </select>
              </div>
            </div>

            <div className="h-[calc(100vh-9rem)] overflow-y-scroll bg-transparent">
              <div className="grid grid-cols-1 gap-6 p-10">
                {(isLoading || searchLoading) ? (
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
                    <SalesItemCard key={item.id ?? item._id} item={item} onOpen={()=>loadItemtoForm(item)} />
                  ))
                )}
              </div>
            </div>
          </div>
                )
                }
                {/* buttons */}
                {rightActiveSection == "buttons" && (
                <div className="flex flex-col flex-1 p-2 gap-1">
                  <button
                    onClick={() => setRightActiveSection("items")}
                    className="h-[16rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
                  >
                    <img
                      src={AddRegitemsImg}
                      alt="Add Registered Items"
                      className="w-[8rem] h-[8rem] object-contain mb-2"
                    />
                    <span>Add Registered Items</span>
                  </button>



                  {/* White block to fill remaining space */}
                  <div className="flex flex-col h-[60rem] bg-white p-5 gap-6">
                    <div className="flex border-b border-[#EDEDED] h-12 items-center relative">
                      <input
                        // ref={searchInputRef}
                        type="text"
                        // value={scanCode}
                        // onChange={(e) => setScanCode(e.target.value)}
                        // onFocus={handleSearchFocus}
                        placeholder="Search Member ID"
                        className="flex-1 px-2 lg:px-3 py-2 bg-transparent focus:outline-none text-sm lg:text-base"
                      />
                      <button
                        className="flex items-center px-3 lg:px-4 py-2 bg-[#1A318C] text-white text-sm lg:text-base"
                        // onClick={handleScan}
                      >
                        <svg
                          className="w-4 lg:w-5 h-4 lg:h-5 mr-1 lg:mr-2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                        </svg>
                        Search
                      </button>
                    </div>
                    <div className="flex flex-row items-center justify-center">
                        {/* member details */}
                      <div className="flex gap-10">
                        <img src={profileImg} className="w-12 h-12 bg-gray-300 rounded-full" />
                        <div>
                          <h2 className="text-blue-800 font-bold">MR. Harischandra Silva</h2>
                          <p className="text-md font-semibold">MEMBER: 2345</p>
                          <p className="text-xs text-gray-600">PRE-MEMBER: 2345</p>
                        </div>
                      </div>
                    </div>
                    {/* income details */}
                    <div className="bg-[#E2E2E2] flex items-center justify-around border-black p-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">RS. 20000</div>
                        <div className="text-sm text-gray-600">Income</div>
                      </div>  
                      {/* vertical divider */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        className="w-px h-8 bg-white"
                      />
                      <div className="text-center">
                        <div className="text-lg font-bold">RS. 20000</div>
                        <div className="text-sm text-gray-600">Credits</div>
                      </div>
                    </div>
                    {/* transaction list */}
                    <div className="h-[21rem] bg-white overflow-y-scroll gap-3">

                    {/* transaction card */}
                    <div className="bg-[#F5F5F5] h-24 items-center gap-8 flex flex-row px-6">
                      <div>
                        <svg width={50} height={50} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* green circle */}<circle cx="12" cy="12" r="10" fill="#22C55E" />
                          {/* white check */}<path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="">
                        <div className="text-xl text-[#979797] font-bold">2024-06-03</div>
                        <div className="text-[#979797] font-regular">Total Amount:</div>
                        <div><span className="text-2xl text-[#979797] font-bold">Rs. 23000.00</span><span className="ml-3 text-[#2DAA44] font-bold">CASH</span></div>
                      </div>
                    </div>
                    </div>
                    {/* member control buttons */}
                    <div className="flex flex-row gap-6 justify-around h-[2.8rem]">

                    <button 
                    //onClick={handleOpenProceedPayment}
                    className="w-full h-full bg-[#9E9E9E] text-white text-sm hover:bg-gray-500 transition-all flex items-center justify-center"
                    >
                    CLEAR
                    </button>
                    <button 
                    //onClick={handleOpenProceedPayment}
                    className="w-full h-full bg-[#2DAA44] text-white text-sm hover:bg-green-700 transition-all flex items-center justify-center"
                    >
                    SELECT
                    </button>
                    </div>
                  </div>
                </div>
                )}

          </div>
          </div>
                        


          </div>


    </div>
  );
}

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
// Alternative approach: Combined fetch function
// const fetchInventoryAndCategories = async () => {
//   try {
//     setIsSearching(true);

//     // Fetch inventory items
//     const inventoryResponse = await apiClient.get('/api/items/extended');
//     const inventoryData = inventoryResponse.data;

//     if (inventoryData && inventoryData.data && Array.isArray(inventoryData.data)) {
//       // Transform inventory items
//       const transformedItems = inventoryData.data.map(item => ({
//         id: item.id,
//         name: item.item_name,
//         category: item.category?.type || "Uncategorized",
//         price: item.unit_price.toFixed(2),
//         unit: item.uom?.symbol || "pcs",
//         sku: item.sku,
//         stock: `${item.quantity} ${item.uom?.unit_name || "Units"}`,
//         image: item.item_image_url || bananaImg,
//         brand: item.category?.brand || "",
//         batchCode: item.batch_code
//       }));

//       setInventoryItems(transformedItems);
//       setFilteredItems(transformedItems);

//       // Extract unique categories
//       const categoryMap = new Map();
//       inventoryData.data.forEach(item => {
//         if (item.category && item.category.type) {
//           const categoryKey = item.category.id || item.category._id;
//           if (!categoryMap.has(categoryKey)) {
//             categoryMap.set(categoryKey, {
//               id: item.category.id,
//               type: item.category.type,
//               brand: item.category.brand || "Various",
//               _id: item.category._id
//             });
//           }
//         }
//       });

//       setCategories(Array.from(categoryMap.values()));
//     }

//   } catch (error) {
//     console.error("Error fetching data:", error);
//     setInventoryItems([]);
//     setFilteredItems([]);
//     setCategories([]);
//   } finally {
//     setIsSearching(false);
//   }
// };