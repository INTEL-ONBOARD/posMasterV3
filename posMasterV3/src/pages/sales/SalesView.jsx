import React, { useState, useEffect, useRef, useContext } from "react";
import SalesItemCard from "../../components/SalesItemCard";
import { apiClient } from "../../api/client";
import {ChevronDown, ChevronUp } from "lucide-react";
import ToastContext from "../toasts/ToastService.jsx";

import { pdf } from '@react-pdf/renderer';
//image imports
import barcodeImg from "../../assets/barcode.png";
import AddRegitemsImg from "../../assets/add_reg_items.png";
import clearBtnImg from "../../assets/sales_clear.png";
import sidebarHoldOrderBtnImg from "../../assets/sales_hold_order.png";
import sidebarPaymentBtnImg from "../../assets/sales_proceed_payment.png";
import profileImg from "../../assets/user_profile_image.png";
import { transformStockData } from "../../util/blockConverter.jsx";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import BillContent from "./layout/BillContent.jsx"; // Import the separate off-screen component for bill printing 

export default function SalesView({ isActive }) {

  const billRef = useRef(null); //used to store bill pdf format
  const toast = useContext(ToastContext);
  const [openItemFormBlock, setopenItemFormBlock] = useState('item'); //item || stock || supplier || 
  const [openStockFormBlock, setopenStockFormBlock] = useState('stock'); //item || stock || supplier || 
  //left section controls
    const [formDataRegItem, setFormDataRegItem] = useState({

      sku: "",

      id: 0,
      stock_trace: [0],
      item_name: "",
      item_image_url: "",
      maximum_capacity: 10,
      uom_id: 10,
      category_id: 10,
      inventory_id: 11,
      item_update_datetime: "",
      item_created_datetime: "",

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
    //no input change for this except for customer_quantity(because of readonly in ui)
    const [formDataStock, setFormDataStock] = useState({
      batch_code: "",
      quantity: 0,
      threshold_limit: 0,
      stock_price: 0,
      retail_price: 0,
      expired_datetime: "",
      availability: true,
      //to give away quantity for customer
      customer_quantity: 0,
      //retail discount for individual item
      discount_price: 0,
      //additional discount given for customer
      customer_discount: 0
    });
    const handleStockInputChange = (e) => {
      const { name, value } = e.target;
      console.log(name +": "+ value);
      setFormDataStock(prev => ({ ...prev, [name]: value }));
    };

    const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "items"

    const removeItemFromList = (id) => {
      setSelectedItems(prev => prev.filter(item => item.id !== id));
    }

  //populate table from card list
  const loadItemtoList = (item) => {
    //return; //this has errors
    
    const newRegItem = {
        sku: item.sku,

        _id: item._id,
        id: item.id,
        stock_trace: item.stock_trace,
        item_name: item.item_name,
        item_image_url: item.item_image_url,
        maximum_capacity: item.maximum_capacity,
        uom_id: item.uom_id,
        category_id: item.category_id,
        inventory_id: item.inventory_id,
      
        batch_code: item.batch_code,
        //how many available in the stock currently
        quantity: parseFloat(item.quantity) || 0,
        //this is missing hmmm
        threshold_limit: parseFloat(item.threshold_limit) || 0,
        stock_price: parseFloat(item.stock_price) || 0,
        retail_price: parseFloat(item.retail_price) || 0,
        discount_price: parseFloat(item.discount_price) || 0,
        expired_datetime: item.exp_date,
        availability: item.stock_availability,

        uom: {
          id: 1,
          symbol: "",
          unit_name: "",
        },
        category: {
          id: 1,
          brand: "",
          type: "",
        },

        //individual discount given for customer
        customer_discount: 0,
        //newly added to place how much quantiy customer wants
        customer_quantity: 0,
        //do i use this somewhere? delete if not
        uom_symbol: item.uom?.uom_symbol
      };
      console.log(newRegItem);
      //setSelectedStockItemList(prev => [...prev, newRegItem]);
      //TODO: do a validation first: if item already exists, don't add it(can be changed to update mulitple items with different batch codes)
      setSelectedItems(prev => 
        prev.some(item => item.id === newRegItem.id) 
          ? prev 
          : [...prev, newRegItem]
      );

  };

  //adding an item from form back to the item table row based on ret/reg item
  const addNewRegItem = () => {

      //prevent adding items without selecting table rows
      if(formDataRegItem.id===0){
        return;
      }
  
      //check if it already exists on the item list first
    const newRegItem = {
        sku: formDataRegItem.sku,

        id: formDataRegItem.id,
        stock_trace: formDataRegItem.stock_trace,
        item_name: formDataRegItem.item_name,
        item_image_url: formDataRegItem.item_image_url,
        maximum_capacity: formDataRegItem.maximum_capacity,
        uom_id: formDataRegItem.uom_id,
        category_id: formDataRegItem.category_id,
        inventory_id: formDataRegItem.inventory_id,
      
        batch_code:formDataStock.batch_code,
        //how many available in the stock currently
        quantity: parseFloat(formDataStock.quantity) || 0,
        //this is missing hmmm
        threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
        stock_price: parseFloat(formDataStock.stock_price) || 0,
        retail_price: parseFloat(formDataStock.retail_price) || 0,
        discount_price: parseFloat(formDataStock.discount_price) || 0,
        expired_datetime: formDataStock.exp_date,
        availability: formDataStock.availability,

        uom: {
          id: 1,
          symbol: "pts",
          unit_name: "pints",
        },
        category: {
          id: 1,
          brand: "lux",
          type: "soap",
        },

        //individual discount given for customer
        customer_discount: formDataStock.customer_discount,
        //newly added to place how much quantiy customer wants
        customer_quantity: formDataStock.customer_quantity,
        //do i use this somewhere? delete if not
        uom_symbol: formDataRegItem.uom?.symbol
      };
        
        console.log(newRegItem);
  
        // Update existing item by id instead of adding new item
        setSelectedItems(prev => 
          prev.map(prevItem => 
            prevItem.id === formDataRegItem.id ? newRegItem : prevItem
          )
        );
  
        //finally clear inputs
        //clearFormInput();
        
        // //also clear the recent batch code changes
        // setStockEntries([]);
  


    }


// mid section controls
    const [selectedItems, setSelectedItems] = useState([
        // {
        //     _id: '688452ef1ddc1d25637c9a47',
        //     id: 31,
        //     stock_trace: [1],
        //     item_name: 'Water Bottle',
        //     item_image_url: null,
        //     batch_code: 'SKU2263WA901',
        //     sku: 'SKU2263',
        //     quantity: 50,
        //     threshold_limit: 120,
        //     maximum_capacity: 400,
        //     uom_id: 22,
        //     category_id: 90,
        //     inventory_id: 1,
        //     retail_price: 25.5,
        //     stock_update_datetime: '2025-07-26T04:00:47.273Z',
        //     stock_created_datetime: '2025-07-26T04:00:47.273Z',
        //     __v: 0,
        //     uom: {
        //         _id: '687720ad798018e0851599a0',
        //         id: 22,
        //         symbol: 'pcs',
        //         unit_name: 'Piece',
        //         __v: 0
        //     },
        //     category: {
        //         _id: '68775a921edd62f9c8128e0d',
        //         id: 90,
        //         brand: 'Reebok',
        //         type: 'Sportswear',
        //         __v: 0
        //     },
        //     inventory: null
        // },
  ]);





    // Calculate total for selectedItems with discount deduction
    const stockTotal = selectedItems.reduce((total, item) => {
      const discountedPrice = item.retail_price - (item.customer_discount || 0);
      return total + (discountedPrice * item.customer_quantity);
    }, 0);
  
    //Just in case for wenuja
    // Calculate total discount amounts for display
    // const totalStockDiscount = selectedItems.reduce((total, item) => {
    //   return total + ((item.customer_discount || 0) * item.customer_quantity);
    // }, 0);
  
    // State for form inputs
    const [cashAmount, setCashAmount] = useState(0);
    const [finalDiscount, setFinalDiscount] = useState(0);
    // Calculate the main totals(for table bottom content area)
    const totalAmount = (stockTotal) - parseFloat(finalDiscount || 0);
    const changeAmount = parseFloat(cashAmount || 0) - totalAmount;




  const handleTableRowClick = (item) => {

    setFormDataRegItem({

      sku: item.sku,

      _id: item._id,
      id: item.id,
      stock_trace: item.stock_trace,
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      maximum_capacity: item.maximum_capacity,
      uom_id: item.uom_id,
      category_id: item.category_id,
      inventory_id: item.inventory_id,
      item_update_datetime: item.item_update_datetime,
      item_created_datetime: item.item_created_datetime,
      __v: 0,
      uom: {
        _id: item.uom?._id || 2,
        id: item.uom?._id || 2,
        symbol: item.uom?._id || "uni",
        unit_name: item.uom?._id || "units",
      },
      category: {
        _id: item.category?._id || 2,
        id: item.category?.id || 2,
        brand: item.category?.brand || "lifebouy",
        type: item.category?.type || "soap",
      },
      inventory: null,
      //setting this as true for now
      availability: true
    }
    );
    setFormDataStock(
      {
        batch_code: item.batch_code,
        quantity: item.quantity,
        threshold_limit: item.threshold_limit,
        stock_price: item.stock_price,
        retail_price: item.retail_price,
        expired_datetime: item.exp_date,
        availability: item.stock_availability,
        //to give away quantity for customer
        customer_quantity: item.customer_quantity,
        //retail discount for individual item
        discount_price: item.discount_price,
        //additional discount given for customer
        customer_discount: item.customer_discount
      }
    );
  };




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
        //     retail_price: 111,
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
        // {
        //     _id: '688452ef1ddc1d25637c9a47',
        //     id: 31,
        //     stock_trace: [1],
        //     item_name: 'Water Bottle',
        //     item_image_url: null,
        //     batch_code: 'SKU2263WA901',
        //     sku: 'SKU2263',
        //     quantity: 50,
        //     threshold_limit: 120,
        //     maximum_capacity: 400,
        //     uom_id: 22,
        //     category_id: 90,
        //     inventory_id: 1,
        //     retail_price: 25.5,
        //     stock_update_datetime: '2025-07-26T04:00:47.273Z',
        //     stock_created_datetime: '2025-07-26T04:00:47.273Z',
        //     __v: 0,
        //     uom: {
        //         _id: '687720ad798018e0851599a0',
        //         id: 22,
        //         symbol: 'pcs',
        //         unit_name: 'Piece',
        //         __v: 0
        //     },
        //     category: {
        //         _id: '68775a921edd62f9c8128e0d',
        //         id: 90,
        //         brand: 'Reebok',
        //         type: 'Sportswear',
        //         __v: 0
        //     },
        //     inventory: null
        // },
        // {
        //     _id: '68845a0b8767fec474faa590',
        //     id: 32,
        //     stock_trace: [1],
        //     item_name: 'Mobile Data cable',
        //     item_image_url: null,
        //     threshold_limit: 40,
        //     maximum_capacity: 60,
        //     uom_id: 22,
        //     category_id: 158,
        //     inventory_id: 1,
            
        //     //assign some from stockData object 
        //     sku: 'SKU-32452',
        //     batch_code: 'SKU-32452DA15822',
        //     quantity: 54,
        //     stock_price: 155,
        //     retail_price: 155,
        //     discount_price: 100,
        //     exp_date: "2025-11-14T22:45:52.014Z",
        //     stock_availability: true, //use availability attribute from stockData object

        //     stock_update_datetime: '2025-07-26T04:31:07.861Z',
        //     stock_created_datetime: '2025-07-26T04:31:07.861Z',
        //     __v: 0,
        //     uom: {
        //         _id: '687720ad798018e0851599a0',
        //         id: 22,
        //         symbol: 'pcs',
        //         unit_name: 'Piece',
        //         __v: 0
        //     },
        //     category: {
        //         _id: '687765bb1edd62f9c8129017',
        //         id: 158,
        //         brand: 'Hp',
        //         type: 'Computers',
        //         __v: 0
        //     },
        //     inventory: null
        // }
    ]
);

  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/restocks/stock-items");
      if (response.data.status === "success") {
        //convert default response object to get each detailed stock items(detach stock item object and create a new obj with parent attributes)
        const transformed = transformStockData(response.data);
        setInventoryItems(transformed);
      }
      } catch (error) {
          console.error("Error fetching items:", error.message);
      } finally {
          setIsLoading(false);
      }
    };
    // Fetch items from API only when this section is active
    useEffect(() => {
      // Fetch items after UOMs are loaded to properly map uomName
      // if (!loadingUoms) {
      if(isActive){
        fetchItems();
      }
        console.log(inventoryItems);
        //console.log("sales view section api triggered to active section");
      // }
    //}, [loadingUoms]);
    }, [isActive]);

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
  const [isSearching, setIsSearching] = useState(false);

  // Search handler
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
  };



    const today = new Date();

  const year = today.getFullYear();
  // Month is zero-indexed, so +1. Then pad to 2-digits:
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day}`;

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



  const generateBillPdf = async () => {
    try {
      if (!billRef.current) {
        console.error("Bill ref is null");
        return;
      }

      // Capture the full HTML content as a single canvas
      const canvas = await html2canvas(billRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // If including external images
        logging: true, // For debugging
      });

      // Create jsPDF document with custom size (11cm x 10cm converted to points)
      const widthPt = 311.81; // 11 cm in points
      const heightPt = 311.81; // 10 cm in points
      const doc = new jsPDF({ unit: "pt", format: [widthPt, heightPt] });

      // Define margins and calculate max width/height per page in PDF units
      const margin = 40;
      const pdfWidth = doc.internal.pageSize.getWidth() - 2 * margin;
      const pdfPageHeight = doc.internal.pageSize.getHeight() - 2 * margin;

      // Calculate the scaling ratio (canvas is in pixels, PDF in pt)
      const scaleRatio = pdfWidth / canvas.width;

      // Start adding pages
      let positionY = 0; // Track vertical position in the original canvas (pixels)
      let pageNumber = 1;

      while (positionY < canvas.height) {
        // Calculate remaining height in pixels
        const remainingHeightPx = canvas.height - positionY;

        // Height for this slice in pixels (don't exceed page height)
        const sliceHeightPx = Math.min(
          remainingHeightPx,
          pdfPageHeight / scaleRatio
        );

        // Create a new canvas for this slice
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get 2D context");
        }
        ctx.drawImage(
          canvas,
          0,
          positionY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );

        // Get the slice as PNG data URL
        const sliceData = sliceCanvas.toDataURL("image/png");

        // Calculate slice height in PDF units
        const slicePdfHeight = sliceHeightPx * scaleRatio;

        // If not the first page, add a new page
        if (pageNumber > 1) {
          doc.addPage();
        }

        // Add the slice image to the current page
        doc.addImage(
          sliceData,
          "PNG",
          margin,
          margin,
          pdfWidth,
          slicePdfHeight
        );

        // Move to the next slice
        positionY += sliceHeightPx;
        pageNumber++;
      }

      // Save the PDF(for react)
      //doc.save("multi-page-pdf.pdf");
      //Get ArrayBuffer for silent printing
      const arrayBuffer = doc.output("arraybuffer");

      //Send to Electron API()
      window.electronAPI.sendPrintSilent(arrayBuffer);

      console.log("Multi-page PDF generated");
    } catch (error) {
      console.error("generatePdf error:", error);
    }
  };

    // Convert selectedItems → stock_items with total_price
  const stock_items = selectedItems.map((item) => ({
    ...item,
    total_price: item.retail_price * item.customer_quantity,
  }));
  
    // Plain object to pass as prop
  const billData = {
    invoiceNo: "INV-2025-0001",
    cashier_name: "-",
    payment_method: "Cash",
    date_time: formattedDate,
    member_no: "-",
    //get items form the selectedItems useState
    stock_items: stock_items,
    totalAmount: stockTotal,
    discountAmount: finalDiscount,
    finalAmount: totalAmount,
    cashAmount: cashAmount,
    changeAmount: changeAmount,
  };

  return (
    <div className="flex h-screen bg-[#EBEBEB]">
            {/* Off-screen bill content using the separate component */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <BillContent ref={billRef} billData={billData} />
      </div>
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
              //openFormBlock
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
                        name="batch_code"
                        readOnly={true}
                        value={formDataStock.batch_code}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Customer Quantity
                      </label>
                      <input
                        type="number"
                        name="customer_quantity"
                        value={formDataStock.customer_quantity}
                        onChange={handleStockInputChange}
                        className="w-full px-3 py-2 border-2 bg-[#ffffff] border-[#000000] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        readOnly={true}
                        value={formDataStock.threshold_limit}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 border bg-[#F8F8F8] border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Stock Availability
                      </label>
                      <select
                        name="availability"
                        disabled={true}
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
                        readOnly={true}
                        name="stock_price"
                        value={formDataStock.discount_price}
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
                        readOnly={true}
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
                            readOnly={true}
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
                        readOnly={true}
                        value={formDataStock.discount_price}
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
        {/* Bottom bar */}
        <div className="flex flex-row w-full mt-[10rem] gap-2">
          {/* <button
            className="flex items-center flex-1 min-w-0 h-10 px-2 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors text-sm"
            // onClick={() => generatePdf('print')}
          >
            <Printer className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Print Barcode</span>
          </button> */}
          <button
            onClick={() => {
              //clearing only stock form block for now
              //should i also clear reg item data also?: yess
              //clearFormInput();
              //setReturnItemSelected(false);
              //also clear the recent batch code changes
              //setStockEntries([]);

              //switch from update item button to add item button
            }}
            className="flex-1 min-w-0 h-10 px-3 py-2 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors text-sm"
          >
            <span className="truncate">Cancel</span>
          </button>
          {/* switch between update and add button functions based on item card selection and clear form button click */}
          <button
            onClick={addNewRegItem}
            disabled={formDataRegItem.id === 0}
            className="flex-1 min-w-0 h-10 px-3 py-2 bg-blue-600 text-white enabled:hover:bg-[#1A318C] transition-colors text-sm disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed"
          >
            <span className="truncate">Add Item</span>
          </button>

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
                      <p className="font-semibold text-xl">Guest</p>
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
                      <p>Member ID</p><p className="font-semibold text-lg">-</p>
                      </div>
                      <div>
                      <p>Date</p><p className="font-semibold text-lg">{formattedDate}</p>
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
                        <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-medium">
                          
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {selectedItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`${item.id === formDataRegItem.id && item.item_name === formDataRegItem.item_name ? 'border-4 border-blue-500' : 'border-b border-gray-200'} hover:bg-gray-50 cursor-pointer transition-colors`}
                          onClick={() => handleTableRowClick(item)}
                        >
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {index+1}
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.sku}
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {(item.retail_price).toFixed(2)}
                            {/* {(item.stock_price).toFixed(2) - (item.item_discount_amt).toFixed(2)} */}
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {item.customer_quantity}
                          </td>
                          <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                            {(item.retail_price * item.customer_quantity).toFixed(2)}
                          </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeItemFromList(item.id)}
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
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">RS.{stockTotal.toFixed(2)}</div>
                  <div className="p-2 bg-[#D9D9D9] text-sm lg:text-base text-gray-500">Discount Amount</div>
                  <div className="p-2 bg-[#D9D9D9] text-lg lg:text-xl font-normal text-gray-800 text-right">
                  <input
                    type="number"
                    value={finalDiscount}
                    onChange={(e) => setFinalDiscount(e.target.value)}
                    className="w-full px-3 py-1 bg-[#F8F8F8] border border-[#EBEBEB] text-right rounded"
                    placeholder="0.00"
                  />
                  </div>
                  <div className="p-2 bg-[#5C5C5C] text-sm lg:text-base text-gray-500">Total Amount</div>
                  <div className="p-2 bg-[#5C5C5C] text-lg lg:text-xl font-semibold text-white text-right">RS.{totalAmount.toFixed(2)}</div>
                  <div className="p-2 bg-white text-sm lg:text-base text-gray-500 h-16">Customer Gave</div>
                  <div className="p-2 bg-white text-lg lg:text-3xl font-semibold text-[#737373] text-right  h-16 border-b-2 ">
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-3 py-1 bg-[#F8F8F8] border border-[#EBEBEB] text-right rounded"
                    placeholder="0.00"
                  />
                  </div>
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
                    onClick={() => generateBillPdf()}
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
                    {/* {NotFoundImg ? (
                      <img
                        src={NotFoundImg}
                        alt="No items found!"
                        className="w-12 h-12 mb-2 opacity-70"
                      />
                    ) : null} */}
                    <span>No items found!</span>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <SalesItemCard key={item.id ?? item._id} item={item} onOpen={()=>loadItemtoList(item)} />
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
                          <h2 className="text-blue-800 font-bold">-</h2>
                          <p className="text-md font-semibold">MEMBER: -</p>
                          <p className="text-xs text-gray-600">PRE-MEMBER: -</p>
                        </div>
                      </div>
                    </div>
                    {/* income details */}
                    <div className="bg-[#E2E2E2] flex items-center justify-around border-black p-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">RS. 0</div>
                        <div className="text-sm text-gray-600">Income</div>
                      </div>  
                      {/* vertical divider */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        className="w-px h-8 bg-white"
                      />
                      <div className="text-center">
                        <div className="text-lg font-bold">RS. 0</div>
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
                        <div className="text-xl text-[#979797] font-bold">yyyy-mm-dd</div>
                        <div className="text-[#979797] font-regular">Total Amount:</div>
                        <div><span className="text-2xl text-[#979797] font-bold">Rs. 0.00</span><span className="ml-3 text-[#2DAA44] font-bold">CASH</span></div>
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
