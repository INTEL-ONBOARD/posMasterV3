import React, { useState, useEffect, useRef, useContext } from "react";
import SalesItemCard from "../../components/SalesItemCard";
import { restockApi, categoryApi, settingsApi } from "../../api/localApi";
import {ChevronDown, ChevronUp } from "lucide-react";
import ToastContext from "../toasts/ToastService.jsx";
import { localAuth } from "../../api/services/localAuth";
import { useStatusLog } from "../../services/StatusLogService.jsx";

//image imports
import barcodeImg from "../../assets/barcode.png";
import AddRegitemsImg from "../../assets/add_reg_items.png";
import clearBtnImg from "../../assets/sales_clear.png";
import sidebarHoldOrderBtnImg from "../../assets/sales_hold_order.png";
import sidebarPaymentBtnImg from "../../assets/sales_proceed_payment.png";
import defaultProfileImg from "../../assets/user_profile_image.png";
import { transformStockData } from "../../util/common/blockConverter.jsx";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import BillContent from "./layout/BillContent.jsx"; // Import the separate off-screen component for bill printing 
import BackIcon from "../../assets/back-icon/back_icon.jsx";
import MemEvaluationModal from "./modals/MemEvaluation.jsx";

export default function SalesView({ isActive }) {

  const billRef = useRef(null); //used to store bill pdf format
  const toast = useContext(ToastContext);
  const statusLog = useStatusLog();
  const [openItemFormBlock, setopenItemFormBlock] = useState('item'); //item || stock || supplier ||
  const [openStockFormBlock, setopenStockFormBlock] = useState('stock'); //item || stock || supplier ||

  const [selectedMember, setSelectedMember] = useState(''); //item || stock || supplier ||
  // member popup modal open state
  const [modal, setModal] = useState(false);
  const closeModal = () => setModal(false);

  // Current user state for profile image
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfileImage, setUserProfileImage] = useState(null);

  // Fetch current user and profile image
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await localAuth.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          const userId = user.id || user._id;

          // Fetch user settings to get profile image
          const response = await settingsApi.getUserSettings(userId);
          if (response.status === 'success' && response.data?.settings?.profile_image) {
            setUserProfileImage(response.data.settings.profile_image);
          }
        }
      } catch (error) {
        console.error('[SalesView] Error fetching current user:', error);
      }
    };

    if (isActive) {
      fetchCurrentUser();
    }
  }, [isActive]);

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
    statusLog.database("Loading sales inventory...", true);
    try {
      const response = await restockApi.getStockItems();
      if (response.status === "success") {
        //convert default response object to get each detailed stock items(detach stock item object and create a new obj with parent attributes)
        const transformed = transformStockData(response);
        setInventoryItems(transformed);
        statusLog.success(`Sales: Loaded ${transformed.length} items`);
      }
      } catch (error) {
          statusLog.error("Failed to load sales inventory");
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
          const response = await categoryApi.getAll();
          if (response.status === "success") {
            //setItemCategories(response.data);
            const types = Array.from(new Set((response.data || []).map(c => c.type)));
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

                {/* selected item list - Modern Design */}
                <div className="flex-1 overflow-hidden p-4">
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full flex flex-col">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-300 uppercase tracking-wider">
                        <div className="col-span-1">#</div>
                        <div className="col-span-3">Item Code</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-3 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto">
                      {selectedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                          <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <p className="text-sm font-medium">No items added yet</p>
                          <p className="text-xs mt-1">Add items from the right panel</p>
                        </div>
                      ) : (
                        selectedItems.map((item, index) => (
                          <div
                            key={item.id}
                            onClick={() => handleTableRowClick(item)}
                            className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-all ${
                              item.id === formDataRegItem.id && item.item_name === formDataRegItem.item_name
                                ? 'bg-blue-50 border-l-4 border-l-[#1A318C]'
                                : 'border-b border-gray-50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="col-span-1">
                              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center">
                                {index + 1}
                              </span>
                            </div>
                            <div className="col-span-3">
                              <span className="text-sm font-medium text-gray-800">{item.sku}</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-sm text-gray-600 tabular-nums">{(item.retail_price).toFixed(2)}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-slate-100 rounded-md text-sm font-semibold text-slate-700">
                                {item.customer_quantity}
                              </span>
                            </div>
                            <div className="col-span-3 text-right">
                              <span className="text-sm font-semibold text-gray-800 tabular-nums">
                                {(item.retail_price * item.customer_quantity).toFixed(2)}
                              </span>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeItemFromList(item.id); }}
                                className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Section - Modern POS Design */}
              <div className="bg-white border-t border-gray-200">
                {/* Order Summary */}
                <div className="px-6 pt-5 pb-4">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500">Subtotal</span>
                    <span className="text-sm font-medium text-gray-700 tabular-nums">RS. {stockTotal.toFixed(2)}</span>
                  </div>

                  {/* Discount */}
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-sm text-gray-500">Discount</span>
                    <div className="flex items-center">
                      <span className="text-gray-400 text-sm mr-1">−</span>
                      <input
                        type="number"
                        value={finalDiscount}
                        onChange={(e) => setFinalDiscount(e.target.value)}
                        className="w-20 px-2 py-1 text-right text-sm font-medium text-gray-700 bg-transparent border border-transparent hover:border-gray-300 focus:border-[#1A318C] focus:bg-white rounded transition-all outline-none tabular-nums"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Amount - Hero Section */}
                <div className="mx-4 mb-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
                        RS. {totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Payment Input Section */}
                <div className="px-4 pb-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {/* Cash Received Input */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600">Cash Received</span>
                      </div>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-32 px-4 py-2.5 text-right text-lg font-semibold text-emerald-700 bg-white border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-none tabular-nums"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Change Display */}
                    <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                      changeAmount >= 0
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          changeAmount >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                          {changeAmount >= 0 ? (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${changeAmount >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                          {changeAmount >= 0 ? 'Change to Return' : 'Amount Remaining'}
                        </span>
                      </div>
                      <span className={`text-xl font-bold tabular-nums ${changeAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        RS. {Math.abs(changeAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-5 flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-600 text-sm font-medium rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear
                  </button>

                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm shadow-amber-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hold
                  </button>

                  <button
                    onClick={() => generateBillPdf()}
                    disabled={totalAmount <= 0 || cashAmount < totalAmount}
                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 bg-[#1A318C] text-white text-sm font-semibold rounded-xl hover:bg-[#152870] active:scale-[0.98] transition-all shadow-md shadow-blue-900/20 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Complete Payment
                  </button>
                </div>
              </div>

            </div>

            {/* Member and Item list section(right) - Modern Design */}
            <div className="bg-gray-100 w-[calc(32rem)] h-[calc(100vh-2rem)]">
              <div className="flex flex-col h-full">

                {/* item list */}
                {rightActiveSection == "items" && (
                  <div className="flex flex-col h-full">
                    {/* Search Header */}
                    <div className="bg-white p-4 border-b border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={() => setRightActiveSection("buttons")}
                          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <BackIcon />
                        </button>
                        <div className="flex-1 flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                          <input
                            type="text"
                            placeholder="Search items..."
                            className="flex-1 px-4 py-2.5 bg-transparent focus:outline-none text-sm"
                          />
                          <button className="px-4 py-2.5 bg-[#1A318C] text-white text-sm font-medium hover:bg-[#152870] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <select className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1A318C]">
                          <option value="All">All Categories</option>
                          {uniqueCategoryTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <select
                          name="searchAvailability"
                          value={searchAvailability}
                          onChange={(e) => setSearchAvailability(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1A318C]"
                        >
                          <option value="All">All Status</option>
                          <option value="Available">Available</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {(isLoading || searchLoading) ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-3"></div>
                          <span className="text-gray-500 text-sm">Loading items...</span>
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <svg className="w-16 h-16 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <span className="text-sm font-medium">No items found</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredItems.map((item) => (
                            <SalesItemCard key={item.id ?? item._id} item={item} onOpen={()=>loadItemtoList(item)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Main Panel with Add Items Button & Member Section */}
                {rightActiveSection == "buttons" && (
                  <div className="flex flex-col h-full p-3 gap-3">
                    {/* Add Items Card */}
                    <button
                      onClick={() => setRightActiveSection("items")}
                      className="bg-white rounded-xl p-6 flex flex-col items-center justify-center hover:shadow-md transition-all border-2 border-transparent hover:border-[#1A318C]/20 group"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A318C]/10 to-[#1A318C]/5 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <img src={AddRegitemsImg} alt="Add Items" className="w-14 h-14 object-contain" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Add Registered Items</span>
                    </button>

                    {/* Member Section Card */}
                    <div className="flex-1 bg-white rounded-xl overflow-hidden flex flex-col">
                      {/* Search Member */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                          <input
                            type="text"
                            placeholder="Search Member ID"
                            className="flex-1 px-4 py-2.5 bg-transparent focus:outline-none text-sm"
                          />
                          <button className="px-4 py-2.5 bg-[#1A318C] text-white text-sm font-medium hover:bg-[#152870] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Member Profile */}
                      <div
                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setModal(true)}
                      >
                        <img
                          src={userProfileImage || defaultProfileImg}
                          className="w-14 h-14 rounded-xl object-cover border-2 border-gray-100"
                          alt="Member"
                        />
                        <div className="flex-1">
                          <p className="text-[#1A318C] font-bold text-lg">-</p>
                          <p className="text-sm font-medium text-gray-700">MEMBER: -</p>
                          <p className="text-xs text-gray-400">PRE-MEMBER: -</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      {/* Income Stats */}
                      <div className="mx-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 flex items-center justify-around">
                        <div className="text-center">
                          <p className="text-xl font-bold text-white tabular-nums">RS. 0</p>
                          <p className="text-xs text-slate-400 font-medium">Income</p>
                        </div>
                        <div className="w-px h-10 bg-slate-600"></div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-white tabular-nums">RS. 0</p>
                          <p className="text-xs text-slate-400 font-medium">Credits</p>
                        </div>
                      </div>

                      {/* Transaction History */}
                      <div className="flex-1 p-4 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Transactions</p>

                        {/* Transaction Card */}
                        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-400">yyyy-mm-dd</p>
                            <p className="text-xs text-gray-400">Total Amount:</p>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-500 tabular-nums">Rs. 0.00</span>
                              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">CASH</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-4 pt-0 flex gap-3">
                        <button className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                          CLEAR
                        </button>
                        <button className="flex-1 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200">
                          SELECT
                        </button>
                      </div>
                    </div>
                  </div>
                )}

          </div>
          </div>
                        


          </div>

          <MemEvaluationModal
            isOpen={modal}
            closeModal={closeModal}
            memeber={selectedMember}
          />

    </div>
  );
}


