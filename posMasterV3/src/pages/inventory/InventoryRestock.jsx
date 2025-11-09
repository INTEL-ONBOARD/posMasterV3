import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../api/client";
import { ChevronDown, Printer, ChevronUp } from "lucide-react";
import AddRegitemsImg from "../../assets/add_reg_items.png";

import NotFoundImg from "../../assets/nonicons_not-found-16.png";
import ReturnItemsImg from "../../assets/return_items.png";
import DisposeItemsImg from "../../assets/dispose_items.png";
import barcodeImg from "../../assets/barcode.png";
import SalesItemCard from "../../components/SalesItemCard";
import { generateUniqueString } from "../../util/generate";

//modal images
import successImage from '../../assets/Success.png';
import failedImage from '../../assets/Failed.png';
import { appendCurrentTimeToDate, extractDateOnly, getCurrentDate, getCurrentDateTime } from "../../util/date";
import { validateReturnForm, validateStockForm } from "../../util/validate";

function InventoryRestock() {

  // modal state: { open: boolean, type: 'success' | 'failed' | null }
  const [modal, setModal] = useState({ open: false, type: null });
  const closeModal = () => setModal({ open: false, type: null });
  // Fetch Categories from API and create mapping
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    // user list(to populate dropdowns)
    const fetchSuppliers = async () => {
      try {
        const response = await apiClient.get("api/suppliers");
        if (response.data.status === "success") {
          console.log(response.data.data)
          setSuppliers(response.data.data);
          // console.log(response.data.data)
        }
      } catch (error) {
        <response className="data message"></response>
        console.error("Error fetching suppliers:", error);
      } finally {
        //setLoadingCategories(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Fetch Categories from API and create mapping
  const [users, setUsers] = useState([]);
  useEffect(() => {
    // user list(to populate dropdowns)
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get("api/users");
        if (response.data.status === "success") {
          setUsers(response.data.data);
          // console.log(response.data.data)
        }
      } catch (error) {
        <response className="data message"></response>
        console.error("Error fetching users:", error);
      } finally {
        //setLoadingCategories(false);
      }
    };

    fetchUsers();
  }, []);

  // right section controls
  const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "dispose" | "add" | "return"

  // registered item list
  const [inventoryItems, setInventoryItems] = useState([]);
  const fetchItems = async () => {
    console.log("item list repopulated");
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
    fetchItems();
  }, [rightActiveSection]);


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

  // State for category/brand mapping
  const [itemCategories, setItemCategories] = useState([
    { id: 145, brand: "Close-Up", type: "Oral Care" },
    { id: 94, brand: "Clogard", type: "Oral Care" },
    { id: 26, brand: "Pepsi", type: "Beverages" },
    { id: 7, brand: "Coca-Cola", type: "Beverages" },
  ]);
  const [uniqueCategoryTypes, setUniqueCategoryTypes] = useState([]);

  useEffect(() => {
    const types = Array.from(new Set(itemCategories.map(c => c.type)));
    setUniqueCategoryTypes(types);
  }, [itemCategories]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");


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

  // Filter items based on search item name, batch code, category and availability
  const filteredItems = inventoryItems.filter((item) => {
    // Category match: either "All" or item.category.type equals selected
    const matchesCategory =
      searchCategory === "All" ||
      (item?.category && item.category.type === searchCategory);

    // Availability match: "All", Available (true), Unavailable (false)
    const isAvailable = interpretAvailability(item);
    const matchesAvailability =
      searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // Item name or batch code text search match
    const searchTerm = (search || "").toLowerCase();
    const matchesSearch =
      (item?.item_name || "").toLowerCase().includes(searchTerm) ||
      (item?.batch_code || "").toLowerCase().includes(searchTerm) ||
      (item?.sku || "").toLowerCase().includes(searchTerm);

    return matchesCategory && matchesAvailability && matchesSearch;
  });


  // left section controls
  // const [openItem, setOpenItem] = useState(false);
  // const [openStock, setOpenStock] = useState(true);
  // const [openSupplier, setOpenSupplier] = useState(true);
  //replaced with this
  const [openFormBlock, setopenFormBlock] = useState('item'); //item || stock || supplier || 


  //mid section logic

  //set invoice for both mid form and left supplier block
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceGenerate, setInvoiceGenerate] = useState(1);
  useEffect(() => {
    const no = generateUniqueString();
    //alert(no);
    setInvoiceNo(no);
    setTransactionData((prev) => ({
      ...prev, // Spread the previous state to preserve other attributes
      invoiceNo: no // Update only the color attribute
    }));
    setFormDataSupplier((prev) => ({
      ...prev, // Spread the previous state to preserve other attributes
      invoice_no: no // Update only the color attribute
    }));
  }, [invoiceGenerate]);


  // const [selectedSupplier, setselectedSupplier] = useState({});
  // const [selectedEmpPrep, setSelectedEmpPrep] = useState({});
  // const [selectedEmpAuth, setSeleselectedEmpAuth] = useState({});

  //storing additional data from api just in case(form data is maintained seperately)
  //const [selectedRegItem, setSelectedRegItem] = useState({});
  //const [selectedReturnItem, setselectedReturnItem] = useState({});

  //item list for the mid section table
  const [selectedStockItemList, setSelectedStockItemList] = useState([
    {
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
      inventory: null,
      sku: "1skupsps",
      quantity: 3,
      threshold_limit: 20,
      stock_price: 20,
      retail_price: 30,
      expired_datetime: "2025-12-31T23:59:59",
      availability: true,

      item_discount_amt: 10,

      uom_symbol: "pcs"
    },
    {
      _id: "",
      id: 1,
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
      inventory: null,
      sku: "2skupsps",
      quantity: 3,
      threshold_limit: 20,
      stock_price: 20,
      retail_price: 30,
      expired_datetime: "2025-12-31T23:59:59",
      availability: true,

      item_discount_amt: 0,

      uom_symbol: "pcs"
    }
  ]);

  const [selectedReturnItemList, setSelectedReturnItemList] = useState([
    {
      _id: "",
      id: 0,
      stock_trace: [0],
      item_name: "fdsaf return",
      item_image_url: "",
      batch_code: "fdsaf",
      maximum_capacity: 10,
      uom_id: 10,
      category_id: 10,
      inventory_id: 11,
      item_update_datetime: "2025-12-31T23:59:59",
      item_created_datetime: "2025-12-31T23:59:59",
      __v: 0,
      // uom: {
      //   _id: "",
      //   id: 0,
      //   symbol: "",
      //   unit_name: "",
      //   __v: 0
      // },
      // category: {
      //   _id: "",
      //   id: 0,
      //   brand: "",
      //   type: "",
      //   __v: 0
      // },
      inventory: null,
      // availability: true

      sku: "skupsps",
      quantity: 1,
      threshold_limit: 20,
      stock_price: 20,
      retail_price: 35,
      expired_datetime: "2025-12-31T23:59:59",
      availability: true,

      uom_symbol: "pcs",

      item_discount_amt: 0,

      return_quantity: 0,
      return_description: "damaged goods"
    }
  ]);

  // Calculate total for selectedStockItemList with discount deduction
  const stockTotal = selectedStockItemList.reduce((total, item) => {
    const discountedPrice = item.stock_price - (item.item_discount_amt || 0);
    return total + (discountedPrice * item.quantity);
  }, 0);

  // Calculate total for selectedReturnItemList with discount deduction
  const returnTotal = selectedReturnItemList.reduce((total, item) => {
    const discountedPrice = item.stock_price - (item.item_discount_amt || 0);
    return total + (discountedPrice * item.quantity);
  }, 0);

  //Just in case for wenuja
  // Calculate total discount amounts for display
  const totalStockDiscount = selectedStockItemList.reduce((total, item) => {
    return total + ((item.item_discount_amt || 0) * item.quantity);
  }, 0);

  const totalReturnDiscount = selectedReturnItemList.reduce((total, item) => {
    return total + ((item.item_discount_amt || 0) * item.quantity);
  }, 0);

  // State for form inputs
  const [cashAmount, setCashAmount] = useState(0);
  const [finalDiscount, setFinalDiscount] = useState(0);
  // Calculate the main totals(for table bottom content area)
  const totalAmount = (stockTotal - returnTotal) - parseFloat(finalDiscount || 0);
  const changeAmount = parseFloat(cashAmount || 0) - totalAmount;

  //select table rows and load form sections
  const addRegItemToForm = (item) => {
    console.log(item.batch_code+"  mmmmm");

  //not sure what are these
  //const { valid, errors: validationErrors } = validateStockForm(formDataStock);
  //setErrors(validationErrors);

    //to make left section's return item block invisible or removed only after selecting a return item from the table
    setReturnItemSelected(false);
        //load item basic details(loaded for all item types-reg, return...etc)
    setFormDataRegItem({
      sku: item.sku,

      _id: item._id,
      id: item.id,
      stock_trace: item.stock_trace,
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      //batch_code: item.batch_code,
      maximum_capacity: item.maximum_capacity,
      uom_id: item.uom_id,
      category_id: item.category_id,
      inventory_id: item.inventory_id,
      item_update_datetime: item.item_update_datetime,
      item_created_datetime: item.item_created_datetime,
      __v: item._v,
      uom: {
        _id: item.uom?._id,
        id: item.uom?._id,
        symbol: item.uom?.symbol,
        unit_name: item.uom?.unit_name,
        __v: item.uom?._v,
      },
      category: {
        _id: item.category?._id,
        id: item.category?.id,
        brand: item.category?.brand,
        type: item.category?.type,
        __v: item.category?._v,
      },
      inventory: item.inventory,
      availability: item.availability
    });

    setFormDataStock({
      batch_code: item.batch_code,
      quantity: item.quantity,
      threshold_limit: item.threshold_limit,
      stock_price: item.stock_price,
      retail_price: item.retail_price,
      expired_datetime: item.expired_datetime,
      availability: item.availability,

      //discount is given within the frontend
      discount: item.item_discount_amt
    });
    //load item into bucket just in case
    //setSelectedRegItem(item);

    //setFormDataRegItem(fd => ({ ...fd, ...item })); //not usefull with new row block obj
    //fetch stock list for item sku
    fetchStockEntries(item.sku);

  }

  const addReturnItemToForm = (item) => {
    //validation of some sort?

    //to make left section's return item block visible only after selecting a return item from the table
    setReturnItemSelected(true);

    //load item basic details(loaded for all item types-reg, return...etc)
    setFormDataRegItem({
      sku: item.sku,

      _id: item._id,
      id: item.id,
      stock_trace: item.stock_trace,
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      //batch_code: item.batch_code,
      maximum_capacity: item.maximum_capacity,
      uom_id: item.uom_id,
      category_id: item.category_id,
      inventory_id: item.inventory_id,
      item_update_datetime: item.item_update_datetime,
      item_created_datetime: item.item_created_datetime,
      __v: item._v,
      uom: {
        _id: item.uom?._id,
        id: item.uom?._id,
        symbol: item.uom?.symbol,
        unit_name: item.uom?.unit_name,
        __v: item.uom?._v,
      },
      category: {
        _id: item.category?._id,
        id: item.category?.id,
        brand: item.category?.brand,
        type: item.category?.type,
        __v: item.category?._v,
      },
      inventory: item.inventory,
      availability: item.availability
    });

    setFormDataStock({
      batch_code: item.batch_code,
      quantity: item.quantity,
      threshold_limit: item.threshold_limit,
      stock_price: item.stock_price,
      retail_price: item.retail_price,
      expired_datetime: item.expired_datetime,
      availability: item.availability,

      //discount is given within the frontend
      discount: item.item_discount_amt
    });
    //load item into bucket just in case
    //setSelectedRegItem(item);

    //setFormDataRegItem(fd => ({ ...fd, ...item })); //not usefull with new row block obj
    //fetch stock list for item sku
    fetchStockEntries(item.sku);

    setFormDataReturnItem({
      sku: "",

      stock_price: item.stock_price,
      retail_price: item.retail_price,

      batch_code: item.batch_code,
      quantity: item.return_quantity,
      return_description: item.return_description
    }
    );


    
    
  }

  //adding an item from form back to the item table row based on ret/reg item
  const addNewRegItem = () => {

    if (!returnItemSelected) {
    //prevent adding items without selecting table rows
    if(formDataRegItem.id===0){
      return;
    }

  //validate stock data input fields
  const { valid, formErrors: validationErrors } = validateStockForm(formDataStock);
  setFormErrors(validationErrors);

  if (!valid) {
    // bail out so UI shows highlights
    console.warn("Validation failed", validationErrors);
    return;
  }
    //hide the return description Upon VALIDATION SUCCESS
    setReturnItemSelected(false);

    //check if it already exists on the item list first
      const newRegItem = {
        _id: formDataRegItem._id,
        id: formDataRegItem.id,
        stock_trace: formDataRegItem.stock_trace,
        item_name: formDataRegItem.item_name,
        item_image_url: formDataRegItem.item_image_url,
        maximum_capacity: formDataRegItem.maximum_capacity,
        uom_id: formDataRegItem.uom_id,
        category_id: formDataRegItem.category_id,
        inventory_id: formDataRegItem.inventory_id,
        item_update_datetime: formDataRegItem.item_update_datetime,
        item_created_datetime: formDataRegItem.item_created_datetime,
        __v: formDataRegItem.__v,
        inventory: formDataRegItem.inventory,

        batch_code: formDataStock.batch_code,
        sku: formDataRegItem.sku,
        quantity: parseFloat(formDataStock.quantity) || 0,
        threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
        stock_price: parseFloat(formDataStock.stock_price) || 0,
        retail_price: parseFloat(formDataStock.retail_price) || 0,
        expired_datetime: formDataStock.expired_datetime,
        availability: formDataStock.availability,

        item_discount_amt: parseFloat(formDataStock.discount),

        uom_symbol: formDataStock.uom?.uom_symbol
      };
      console.log(newRegItem);
      //TODO: do a validation first

      // Update existing item by id instead of adding new item
      setSelectedStockItemList(prev => 
        prev.map(prevItem => 
          prevItem.id === formDataRegItem.id ? newRegItem : prevItem
        )
      );

      //finally clear inputs
      clearFormInput();
      setReturnItemSelected(false);
      //also clear the recent batch code changes
      setStockEntries([]);

    }
    else {
      console.log("return item was selected");

      // const { valid, formReturnErrors: validationErrors } = validateReturnForm(formDataReturnItem);
      // setFormReturnErrors(validationErrors);
      // if (!valid) {
      //   console.warn("Return validation failed", validationErrors);
      //   return; // don't proceed if invalid
      // }


      const newRetItem = {

        _id: formDataRegItem._id,
        id: formDataRegItem.id,
        stock_trace: formDataRegItem.stock_trace,
        item_name: formDataRegItem.item_name,
        item_image_url: formDataRegItem.item_image_url,
        maximum_capacity: formDataRegItem.maximum_capacity,
        uom_id: formDataRegItem.uom_id,
        category_id: formDataRegItem.category_id,
        inventory_id: formDataRegItem.inventory_id,
        item_update_datetime: formDataRegItem.item_update_datetime,
        item_created_datetime: formDataRegItem.item_created_datetime,
        __v: formDataRegItem.__v,
        inventory: formDataRegItem.inventory,

        sku: formDataRegItem.sku,
        threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
        stock_price: parseFloat(formDataStock.stock_price) || 0,
        retail_price: parseFloat(formDataStock.retail_price) || 0,
        expired_datetime: formDataStock.expired_datetime,
        availability: formDataStock.availability,

        //the batch code for table row is considered is this
        batch_code: formDataStock.batch_code,
        quantity: parseFloat(formDataReturnItem.quantity),
        uom_symbol: formDataStock.uom?.uom_symbol,

        item_discount_amt: formDataStock.discount,

        return_description: formDataReturnItem.return_description,
        return_quantity: formDataReturnItem.quantity
        
      };
      console.log(newRetItem);
      //TODO: do a validation first
      //setSelectedReturnItemList(prev => [...prev, newRetItem]);
      // Update existing item by id instead of adding new item
      setSelectedReturnItemList(prev => 
        prev.map(prevItem => 
          prevItem.id === formDataRegItem.id ? newRetItem : prevItem
        )
      );

      //finally clear inputs
      clearFormInput();
      setReturnItemSelected(false);
      //also clear the recent batch code changes
      setStockEntries([]);

    }
  }

  const clearFormInput = () => {
    // console.log(stock);
    // setFormDataReturnItem(prev => ({ ...prev, stock: stock }));

    setFormDataRegItem(
      {
            sku: "",

            _id: "",
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
      }
    );

    setFormDataStock(
      {
      batch_code: "",
      quantity: 0,
      threshold_limit: 0,
      stock_price: 0,
      retail_price: 0,
      expired_datetime: null,
      availability: true,

      discount: 0
      }
    );
  }

  //verify if it's a return item, register item or a dispose item
  //if it doesn't exists and a register item, add it to the list(for now adding from form state but i can also add it from selectedRegItem just in case)


  //removes item from list by id
  const removeStockItemFromList = (id) => {
    setSelectedStockItemList(prev => prev.filter(item => item.id !== id));
  }
    const removeReturnItemFromList = (id) => {
    setSelectedReturnItemList(prev => prev.filter(item => item.id !== id));
  }


  const [formDataRegItem, setFormDataRegItem] = useState({

    sku: "",

    _id: "",
    id: 0,
    stock_trace: [0],
    item_name: "",
    item_image_url: "",
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

  const [formDataStock, setFormDataStock] = useState({
    batch_code: "",
    quantity: 0,
    threshold_limit: 0,
    stock_price: 0,
    retail_price: 0,
    expired_datetime: null,
    availability: true,

    discount: 0
  });
  //to validate and
  const [formErrors, setFormErrors] = useState({});
  
  
  //date for batch code item cards
  const formatDateSafe = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (err) {
      console.error('formatDateSafe error for', dateStr, err);
      return '';
    }
  };
  
  const [stockEntries, setStockEntries] = useState([]);
  // fetch stock entries for a given SKU
  const fetchStockEntries = async (sku, isStockItem) => {
    if (!sku) return;
    try {
      const response = await apiClient.get(`api/restocks/stock-data/${sku}`);
      const payload = response?.data;

      if (payload) {
        if (payload.status === 'success' && Array.isArray(payload.data)) {
          setStockEntries(payload.data);
          console.log(stockEntries);
        } else if (Array.isArray(payload)) {
          setStockEntries(payload);
        } else if (Array.isArray(payload.data)) {
          setStockEntries(payload.data);
        } else {
          setStockEntries([]);
          //setStockFetchError(payload.message || 'Unexpected response shape');
        }

      } else {
        setStockEntries([]);
        //setStockFetchError('Empty response from server');
      }
    } catch (err) {
      console.error('Failed to fetch stock entries for', sku, err);
      setStockEntries([]);
    }
  };
  //populate the batchcode textbox from recent sku card
  const setStockBatchCodeFromEntry = (item) => {
    console.log(item);
    //const newDate = extractDateOnly(item.exp_date)
    //populate existing stock form block according to selected batch code
    setFormDataStock({
      batch_code: item.batch_code,
      quantity: item.quantity,
      threshold_limit: item.threshold_limit,
      stock_price: item.stock_price,
      retail_price: item.retail_price,
      expired_datetime: item.exp_date,
      //expired_datetime: "2025-10-31T00:00:00.000Z",
      availability: item.availability,

      discount: item.discount_price
    });
  }
  const setReturnBatchCodeFromEntry = (stock) => {
    // console.log(stock);
    // setFormDataReturnItem(prev => ({ ...prev, stock: stock }));
  }
  const handleStockInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormDataStock(prev => ({ ...prev, [name]: value }));

  // clear only that field's error if present
  setFormErrors(prev => {
    if (!prev || !prev[name]) return prev;
    const next = { ...prev };
    delete next[name];
    return next;
  });

  };
  const [formDataSupplier, setFormDataSupplier] = useState({
    id: 0,
    supplier_name: "",
    type: "",
    supplier_address: "",
    status: false,
    contact: "",

    current_amount: 0,
    previous_amount: 0,

    invoice_no: invoiceNo,
    bill_no: 0,

    payment_method: "",
    expenses: 0,

    account_name: "",
    account_nickName: "",
    account_related_bank: "",
    account_number: "",
    account_related_branch: "",
  });
  const handleSupplierInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormDataSupplier(prev => ({ ...prev, [name]: value }));
  };
  const [formDataReturnItem, setFormDataReturnItem] = useState({
    sku: "",

    stock_price: 0,
    retail_price: 0,


    batch_code: "",
    quantity: 0,
    return_description: ""
  });
  const [formReturnErrors, setFormReturnErrors] = useState({});

  const handleReturnItemInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setFormDataReturnItem(prev => ({ ...prev, [name]: value }));

  // Clear error for this field if present
  setFormReturnErrors(prev => {
    if (!prev || !prev[name]) return prev;
    const next = { ...prev };
    delete next[name];
    return next;
  });

  };
  const [transactionData, setTransactionData] = useState({
    supplier_id: "",
    supplierName: "",
    prep_id: "",
    preparedBy: "prep123",
    auth_id: "",
    authorizedBy: "auth123",
    date: "",

    invoiceNo: "No1234",
    description: "returning item",

    discount: 24,
    cashAmount: 3000,
    changeAmount: 200,
    totalAmount: 20000,

    discountAmount: 2000,
    returnAmount: 2000,

    previousAmount: 2000,
    currentAmount: 6000
  });
  const handleTransactionDataInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name + ": " + value);
    setTransactionData(prev => ({ ...prev, [name]: value }));
  };

  // Load item object into selectd item table from cards
  const loadItemtoList = (item) => {

    if (rightActiveSection != "return") {
      const newRegItem = {
        _id: item._id,
        id: item.id,
        stock_trace: item.stock_trace,
        item_name: item.item_name,
        item_image_url: item.item_image_url,
        maximum_capacity: item.maximum_capacity,
        uom_id: item.uom_id,
        category_id: item.category_id,
        // inventory_id: item.inventory_id,
        // item_update_datetime: item.item_update_datetime,
        // item_created_datetime: item.item_created_datetime,
        // __v: item.__v,
        // inventory: item.inventory,

        batch_code: "",
        //need to make them zeros and empty when loading to table for the first tiem
        // sku: formDataRegItem.sku,
        // quantity: parseFloat(formDataStock.quantity) || 0,
        // threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
        // stock_price: parseFloat(formDataStock.stock_price) || 0,
        // retail_price: parseFloat(formDataStock.retail_price) || 0,
        // expired_datetime: formDataStock.expired_datetime,
        // availability: formDataStock.availability,

        uom: {
        id: item.uom.id,
        symbol: item.uom.symbol,
        unit_name: item.uom.unit_name,
      },
      category: {
        id: item.category.id,
        brand: item.category.brand,
        type: item.category.type,
      },

        sku: item.sku,
        quantity: 0,
        threshold_limit: 0,
        stock_price: 0,
        retail_price: 0,
        expired_datetime: "",
        availability: true,

        item_discount_amt: 0,

        uom_symbol: formDataStock.uom?.uom_symbol
      };
      console.log(newRegItem);
      //setSelectedStockItemList(prev => [...prev, newRegItem]);
      //TODO: do a validation first: if item already exists, don't add it(can be changed to update mulitple items with different batch codes)
      setSelectedStockItemList(prev => 
        prev.some(item => item.id === newRegItem.id) 
          ? prev 
          : [...prev, newRegItem]
      );
    }
    //item is added to the table as a return item
    else {
      console.log("return item was selected");

      //TODO: fix quantity redunduncy here
      const newRetItem = {

        _id: item._id,
        id: item.id,
        stock_trace: item.stock_trace,
        item_name: item.item_name,
        item_image_url: item.item_image_url,
        maximum_capacity: item.maximum_capacity,
        uom_id: item.uom_id,
        category_id: item.category_id,
        //inventory_id: item.inventory_id,
        //item_update_datetime: item.item_update_datetime,
        //item_created_datetime: item.item_created_datetime,
        //__v: item.__v,
        //inventory: item.inventory,
        
        sku: item.sku,
        threshold_limit: 0,
        stock_price: 0,
        retail_price: 0,
        expired_datetime: "",
        availability: formDataStock.availability,

        batch_code: "",
        quantity: 0,
        uom_symbol: formDataStock.uom?.uom_symbol,

        item_discount_amt: 0,

        return_description: "",
        return_quantity: 0
      };
      console.log(newRetItem);

      //TODO: do a validation first: if item already exists, don't add it(can be changed to update mulitple items with different batch codes)
      //setSelectedReturnItemList(prev => [...prev, newRetItem]);
      setSelectedReturnItemList(prev => 
        prev.some(item => item.id === newRetItem.id) 
          ? prev 
          : [...prev, newRetItem]
      );
    }
    
    //load item basic details(loaded for all item types-reg, return...etc)
    // setFormDataRegItem({
    //   sku: item.sku,

    //   _id: item._id,
    //   id: item.id,
    //   stock_trace: item.stock_trace,
    //   item_name: item.item_name,
    //   item_image_url: item.item_image_url,
    //   //batch_code: item.batch_code,
    //   maximum_capacity: item.maximum_capacity,
    //   uom_id: item.uom_id,
    //   category_id: item.category_id,
    //   inventory_id: item.inventory_id,
    //   item_update_datetime: item.item_update_datetime,
    //   item_created_datetime: item.item_created_datetime,
    //   __v: item._v,
    //   uom: {
    //     _id: item.uom?._id,
    //     id: item.uom?._id.id,
    //     symbol: item.uom?.symbol,
    //     unit_name: item.uom?.unit_name,
    //     __v: item.uom?._v,
    //   },
    //   category: {
    //     _id: item.category?._id,
    //     id: item.category?.id,
    //     brand: item.category?.brand,
    //     type: item.category?.type,
    //     __v: item.category?._v,
    //   },
    //   inventory: item.inventory,
    //   availability: item.availability
    // });

    // // setFormDataStock({
    // //   sku: "skupsps",
    // //   quantity: 150,
    // //   threshold_limit: 20,
    // //   stock_price: 20.0,
    // //   retail_price: 35.0,
    // //   expired_datetime: "2025-12-31T23:59:59",
    // //   availability: true
    // // });
    // //load item into bucket just in case
    // //setSelectedRegItem(item);

    // setFormDataRegItem(fd => ({ ...fd, ...item }));
    // //fetch stock list for item sku
    // fetchStockEntries(item.sku);





    // //**________________________________________________________________________________________________________________________________
    // // 2. extract its category & brand:
    // const { type, brand } = item.category;
    // // 3a. set the category‐dropdown state (this also fires your useEffect to populate brandOptions)
    // setSelectedCategoryType(type);
    // // 3b. explicitly set the form’s dropdown values:
    // setFormCategoryData({
    //   categoryType: type,
    //   brand,
    // });
    // //set unit of measure in the dropdown
    // // 3. pre‐select the UOM dropdown
    // setFormUOMData(item.uom.id);
    // // and keep formData.uom_id correct:
    // setFormData(fd => ({ ...fd, uom_id: item.uom.id, uom: item.uom }));
    // //**________________________________________________________________________________________________________________________________


  };

  //to make left section's return item block visible only after selecting a return item from the table
  const [returnItemSelected, setReturnItemSelected] = useState(false);


  // Method to set current date (reusable function)
  const setCurrentDateToExpired = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDateStr = `${year}-${month}-${day}`;

    // Decide on format: end of day (like your initial) or start of day (like onChange)
    // Using end of day for consistency with initial state
    const endOfDayUTC = `${currentDateStr}T23:59:59.000Z`;

    setFormDataStock(prev => ({
      ...prev,
      expired_datetime: endOfDayUTC
    }));
  };

  // useEffect to set current date on component mount
  useEffect(() => {
    // Only set if not already set (e.g., for editing existing data)
    // if (!formDataStock.expired_datetime) {
    setCurrentDateToExpired();
    // }
  }, []); // Empty dependency array to run once on mount



  const registerTransaction = async (e) => {
    //setModal({ open: true, type: 'success' });
    //return;

    //create reg item list for req data
    // Function to transform selected items to the required format
    const transformToAddedItems = () => {
      return selectedStockItemList.map(item => ({
        sku: item.sku,
        qty: item.quantity,
        //stock price is deducted with the discount upon the request sendint 
        stock_price: item.stock_price-item.item_discount_amt,
        retail_price: item.retail_price,
        exp_date: item.expired_datetime,
        batch_code: item.batch_code
      }));
    };
    console.log(selectedReturnItemList);
    //create ret item list for ret data
    const transformToReturnedItems = () => {
      return selectedReturnItemList.map(item => ({
        sku: item.sku,
        batch_code: item.batch_code,
        qty: item.return_quantity,
        description: item.return_description
      }));
    };

    //     {
    //   sku: "SKU102",
    //   batch_code: "BATCH456",
    //   qty: 10,
    //   description: "Damaged item"
    // }


    //setFormStatus("loading");
    //e.preventDefault();
    try {
      const requestData = {
        sup_id: transactionData.supplier_id,
        prep_agent_id: transactionData.prep_id,
        auth_agent_id: transactionData.auth_id,
        invoice_no: transactionData.invoiceNo,
        bill_no: formDataSupplier.bill_no,
        payment_method: formDataSupplier.payment_method,
        expenses: formDataSupplier.expenses,

        discount: finalDiscount,
        current_amount: 0,
        cash_amount: cashAmount,
        change_amount: changeAmount,
        total_amount: (returnTotal+stockTotal),

        exe_level: "medium",

        added_items: transformToAddedItems(), //contatins a list
        return_items: transformToReturnedItems() //contains a list
      };
      //       const requestData = {
      //   sup_id: 1,
      //   prep_agent_id: 2,
      //   auth_agent_id: 3,
      //   invoice_no: "INdVd005",
      //   bill_no: "BIdLLd005",
      //   payment_method: "cash",
      //   discount: 5.00,
      //   expenses: 10.00,
      //   current_amount: 100.00,
      //   cash_amount: 95.00,
      //   change_amount: 5.00,
      //   total_amount: 105.00,
      //   exe_level: "medium",
      //   added_items: [
      //     {
      //       sku: "SKU101",
      //       qty: 50,
      //       stock_price: 1.50,
      //       retail_price: 2.00,
      //       exp_date: "2025-12-31T00:00:00.000Z",
      //       batch_code: "BATCH123"
      //     }
      //   ],
      //   return_items: [
      //     {
      //       sku: "SKU102",
      //       batch_code: "BATCH456",
      //       qty: 1,
      //       description: "Damaged item"
      //     }
      //   ]
      // };
      console.log(requestData);
      const response = await apiClient.post("api/restocks", requestData);

      if (response.data.status === "success") {
        //generate a new invoice number
        setInvoiceGenerate(invoiceGenerate + 1);

        setModal({ open: true, type: 'success' });
        // Add new item to local state
        //alert("Item created successfully!");
        //toast.open("Item created successfully", 4000, 'Success', 'success');
        //clear data upon successful response
        //setFormStatus("success");
        console.log(response.data.data.message);
        // after 4 seconds, flip back to the form
        // timerRef.current = window.setTimeout(() => {
        //   setFormStatus("form");
        //   timerRef.current = null;
        // }, 4000);
        // clearUserInput();
      } else {
        setModal({ open: true, type: 'failed' });
        //setModal({ open: true, type: 'failed' });
        console.log(response.data.data.message);
        //alert(response.data.message || "Failed to create item");
        //toast.open("Create item request failed, please try again", 4000, 'Request Failed', 'error');
        //setFormStatus("fail");

        // after 4 seconds, flip back to the form
        // timerRef.current = window.setTimeout(() => {
        //   setFormStatus("form");
        //   timerRef.current = null;
        // }, 4000);
      }
    } catch (err) {
      //console.log(response.data.data.message);
      console.error("Create item error:", err);
      console.error("Create item error:", err.message);
      // //alert("Error creating item"+err.message);
      // setFormStatus("fail");
      //   // after 4 seconds, flip back to the form
      //   timerRef.current = window.setTimeout(() => {
      //     setFormStatus("form");
      //     timerRef.current = null;
      //   }, 4000);
      // toast.open("Create item operation failed", 4000, 'Item creation Failed', 'error');
    }
    finally {
      //repopulate items
      //fetchItems();
    }
  };


  return (

    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* form section (left) */}
      <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 z-10">
        {/* 56 is the correct height */}
        <div className="flex flex-col h-[46rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="border rounded bg-white">
            <button
              onClick={() => setopenFormBlock('item')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ITEM DESCIRPTION</span>
              {openFormBlock == 'item' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openFormBlock == 'item') && (
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
                    <p className="text-sm text-gray-800">SKU: {formDataRegItem.sku}</p>
                  </div>
                  {/* Vertical black line separator */}
                  <div className="flex flex-col m-10">
                    <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                      <p className="text-sm font-semibold text-gray-800">Name</p>
                      <p className="text-sm text-gray-700">{formDataRegItem.item_name}</p>
                      <p className="text-sm font-semibold text-gray-800">Category</p>
                      {/* {console.log(formDataRegItem.category)} */}
                      <p className="text-sm text-gray-700">{formDataRegItem?.category?.type}</p>
                      {/* <p className="text-sm font-semibold text-gray-800">Current Qty</p> */}
                      {/* <p className="text-sm text-gray-700">{formDataStock?.quantity}/{formDataRegItem?.maximum_capacity}({formDataRegItem?.uom?.symbol})</p> */}
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
              onClick={() => setopenFormBlock('stock')}
              className="w-full flex justify-between items-center bg-white px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">STOCK DESCRIPTION</span>
              {openFormBlock == 'stock' ? <ChevronUp /> : <ChevronDown />}
            </button>
            {(openFormBlock == 'stock') && (
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
                        value={formDataStock.batch_code}
                        onChange={handleStockInputChange}
                        //placeholder=""
                        className={`w-full px-3 py-2 border ${
                          formErrors.batch_code ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                      />
                      {formErrors.batch_code && <p className="text-red-500 text-xs mt-1">{formErrors.batch_code}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Quantity
                      </label>
                      {/* Quantity */}
                      <input
                        type="number"
                        name="quantity"
                        value={formDataStock.quantity}
                        onChange={handleStockInputChange}
                        className={`w-full px-3 py-2 border ${
                          formErrors.quantity ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                      />
                      {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Lower Threshold Rate(%)
                      </label>
                      <input
                        type="number"
                        name="threshold_limit"
                        value={formDataStock.threshold_limit}
                        onChange={handleStockInputChange}
                        //placeholder=""
                        className={`w-full px-3 py-2 border ${
                          formErrors.threshold_limit ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                      />
                      {formErrors.threshold_limit && <p className="text-red-500 text-xs mt-1">{formErrors.threshold_limit}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className={`w-full px-3 py-2 border ${
                          formErrors.quantity ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                      >
                      {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
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
                        //placeholder=""
                        className={`w-full px-3 py-2 border ${
                          formErrors.stock_price ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                      />
                      {formErrors.stock_price && <p className="text-red-500 text-xs mt-1">{formErrors.stock_price}</p>}
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
                        //placeholder=""
                        className={`w-full px-3 py-2 border ${
                          formErrors.retail_price ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                      />
                      {formErrors.retail_price && <p className="text-red-500 text-xs mt-1">{formErrors.retail_price}</p>}
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
                            console.log("date input value:", selectedDate);
                            if (selectedDate) {
                              const localDateTime = appendCurrentTimeToDate(selectedDate);
                              console.log("to formData:", localDateTime);
                              setFormDataStock({
                                ...formDataStock,
                                expired_datetime: localDateTime,
                              });
                            } else {
                              setFormDataStock({
                                ...formDataStock,
                                expired_datetime: null,
                              });
                            }
                          }}
                          name="expired_datetime"
                          placeholder="Select date"
                          className={`w-full px-3 py-2 border ${
                            formErrors.expired_datetime ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                          } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                          />
                          {formErrors.expired_datetime && <p className="text-red-500 text-xs mt-1">{formErrors.expired_datetime}</p>}
                          </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Discount (Rs/-)
                      </label>
                      <input
                        type="number"
                        name="discount"
                        value={formDataStock.discount}
                        onChange={handleStockInputChange}
                        placeholder=""
                        className={`w-full px-3 py-2 border ${
                          formErrors.discount ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:border-transparent`}
                        />
                      {formErrors.discount && <p className="text-red-500 text-xs mt-1">{formErrors.discount}</p>}
                    </div>
                  </div>

                  <p>Recent Batch Code Changes</p>
                  <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[13rem] -mr-4">
                    {stockEntries.length === 0 ? (
                      <div className="text-gray-500">No recent batches</div>
                    ) : (
                      stockEntries.map((s, i) => (
                        <div
                          key={s.batch_code + i}
                          className={`${s.batch_code === formDataStock.batch_code ? 'border-4 border-blue-500' : ''} flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]`}
                          onClick={() => setStockBatchCodeFromEntry(s)}
                        >
                          <div className="flex flex-col">
                            <span className="text-md font-bold">Batchcode:</span>
                            <span className="text-gray-600">{s.batch_code}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-bold">{s.qty} units</span>
                            <span className="text-gray-400">{s.exp_date ? formatDateSafe(s.exp_date) : ''} Exp</span>
                          </div>
                        </div>
                      ))
                    )}

                    {/* end recent batches list */}

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
              {(openFormBlock == 'supplier') ? <ChevronUp /> : <ChevronDown />}
              {/* {openSupplier ? <ChevronUp /> : <ChevronDown />} */}
            </button>
            {(openFormBlock == 'supplier') && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Suppier
                    </label>
                    <select
                      name="supplier_name"
                      value={formDataSupplier.supplier_name}
                      onChange={(e) => {
                        handleSupplierInputChange(e);
                        const selectedSupplierName = e.target.value;
                        const selectedSupplier = suppliers.find(supplier => supplier?.basic_info?.supplier_name === selectedSupplierName);
                        if (selectedSupplier) {
                          console.log(selectedSupplier.id);
                          setTransactionData(prev => ({
                            ...prev,
                            supplier_id: selectedSupplier.id,
                            supplierName: selectedSupplier?.basic_info?.supplier_name,
                            previousAmount: selectedSupplier?.financial_info?.previous_amount
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- select supplier --</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier?.basic_info?.supplier_name}>
                          {supplier?.basic_info?.supplier_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Invoice No
                      </label>
                      <input
                        type="text"
                        name="invoice_no"
                        value={formDataSupplier.invoice_no}
                        //onChange={handleSupplierInputChange}
                        placeholder=""
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Bill No
                      </label>
                      <input
                        type="text"
                        name="bill_no"
                        value={formDataSupplier.bill_no}
                        onChange={handleSupplierInputChange}
                        placeholder=""
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
                        name="payment_method"
                        value={formDataSupplier.payment_method}
                        onChange={handleSupplierInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- select payment method --</option>
                        <option value="bank_transfer">Bank Check</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Expenses (Rs.)
                      </label>
                      <input
                        type="number"
                        name="expenses"
                        value={formDataSupplier.expenses}
                        onChange={handleSupplierInputChange}
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
          {(returnItemSelected) && (
            <div className="bg-white">
              <button
                onClick={() => setopenFormBlock('return')}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">RETURN DESCRIPTION</span>
                {openFormBlock === 'return' ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openFormBlock === 'return' && (
                <div className="px-4 bg-white pb-5">
                  {/* detailed description block */}
                  <div className="">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          value={formDataReturnItem.quantity}
                          onChange={handleReturnItemInputChange}
                          placeholder="Enter quantity"
                          className={`w-full px-3 py-2 bg-[#F8F8F8] border ${
                            formReturnErrors.quantity ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                          } focus:outline-none focus:ring-2 focus:border-transparent`}
                        />
                        {formReturnErrors.quantity && <p className="text-red-500 text-xs mt-1">{formReturnErrors.quantity}</p>}
                      </div>
                    </div>
                    <div className='mt-1'>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Description
                      </label>
                      <textarea
                        name="return_description"
                        type="text"
                        value={formDataReturnItem.return_description}
                        onChange={handleReturnItemInputChange}
                        placeholder="Enter details..."
                        rows={3}
                        className={`w-full mt-2 px-3 py-2 bg-[#F8F8F8] border ${
                          formReturnErrors.return_description ? "border-red-500 focus:ring-red-500" : "border-[#EBEBEB] focus:ring-blue-500"
                        } focus:outline-none focus:ring-2 focus:border-transparent`}
                      />
                      {formReturnErrors.return_description && <p className="text-red-500 text-xs mt-1">{formReturnErrors.return_description}</p>}
                    </div>
                  </div>
                  {/* <p className="text-gray-400 font-semibold">Select the batchcode</p>
                  <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[13rem] -mr-4">
                    {stockEntries.length === 0 ? (
                      <div className="text-gray-500">No batches available</div>
                    ) : (
                      stockEntries.map((s, i) => (
                        <div key={s.batch_code + i} className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]"
                        onClick={()=>setReturnBatchCodeFromEntry(s.batch_code)}>
                          <div className="flex flex-col">
                            <span className="text-md font-bold">SKU:</span>
                            <span className="text-gray-600">{s.sku}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-bold">{s.qty} units</span>
                            <span className="text-gray-400">{s.exp_date ? formatDateSafe(s.exp_date) : ''} Exp</span>
                          </div>
                        </div>
                      ))
                    )}

                  </div> */}
                </div>

              )}
            </div>
          )}





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
              clearFormInput();
              setReturnItemSelected(false);
              //also clear the recent batch code changes
              setStockEntries([]);

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

      {/* they don't pay me enough for this😞 */}
      {/* main transaction section (mid) */}
      <div className="bg-white w-[calc(45rem)] h-[calc(100vh-2rem)]">
        {/* supplier details section*/}
        <div className="p-5">
          <div className="flex flex-row gap-12">
            <div className="flex flex-col w-2/3">
              <div>
                <p>Supplier:</p>
                <p className="text-2xl font-semibold">{transactionData.supplierName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Prepared by
                </label>
                <select
                  name="preparedBy"
                  value={transactionData.preparedBy}
                  onChange={(e) => {
                    handleTransactionDataInputChange(e);
                    const selectedUsername = e.target.value;
                    const selectedUser = users.find(user => user.username === selectedUsername);
                    if (selectedUser) {
                      console.log(selectedUser._id)
                      setTransactionData(prev => ({ ...prev, prep_id: selectedUser._id }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- select employee --</option>
                  {users.map(user => (
                    <option key={user._id} value={user.username}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Authorized by
                </label>
                <select
                  name="authorizedBy"
                  value={transactionData.authorizedBy}
                  onChange={(e) => {
                    handleTransactionDataInputChange(e);
                    const selectedUsername = e.target.value;
                    const selectedUser = users.find(user => user.username === selectedUsername);
                    if (selectedUser) {
                      setTransactionData(prev => ({ ...prev, auth_id: selectedUser._id }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- select employee --</option>
                  {users.map(user => (
                    <option key={user._id} value={user.username}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col w-1/3">
              <div>
                <p>Date:</p>
                <p className="text-2xl font-semibold">{getCurrentDate()}</p>
              </div>
              <div>
                <p>Invoice No:</p>
                <p className="text-2xl font-semibold">{transactionData.invoiceNo}</p>
              </div>
              <div className="mt-8 flex flex-row gap-4">
                <button
                  onClick={() => {
                    setInvoiceGenerate(invoiceGenerate + 1);
                    //clearUserInput();
                    //switch from update item button to add item button 
                    //setUserEditing(false)
                  }}
                  className="px-6 py-2 w-[8rem] h-10  border bg-[#727272] border-gray-300 text-white hover:bg-gray-500 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    registerTransaction();
                    //clearUserInput();
                    //switch from update item button to add item button 
                    //setUserEditing(false)
                  }}
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
              {/* Map selectedStockItemList */}
              {selectedStockItemList.map((item, index) => (
                <tr
                  onClick={() => {
                    //alert("item added");
                    addRegItemToForm(item);
                  }}
                  key={item.id || generateUniqueString()} // Use the previously defined generateUniqueString
                  //add blue border by comparing item name and id. prevent both item from return and restock by determining retrunItemSelected.
                  className={`${item.id === formDataRegItem.id && item.item_name === formDataRegItem.item_name && !returnItemSelected ? 'border-4 border-blue-500' : 'border-b border-gray-200'} hover:bg-gray-50 cursor-pointer transition-colors`}
                >
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {index + 1}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {item.sku 
                    // || generateUniqueString()
                    }
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {item.quantity} ({item.uom_symbol})
                  </td>
                  {/* stock prices are shown with their discounts deducted */}
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {(item.stock_price).toFixed(2) - (item.item_discount_amt).toFixed(2)}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {
                    (((item.stock_price).toFixed(2) - (item.item_discount_amt).toFixed(2)) * item.quantity).toFixed(2)}
                  </td>
                  {/* retail prices doesn't have discounts (for now) */}
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {item.retail_price.toFixed(2) - (item.item_discount_amt).toFixed(2)}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {(item.retail_price * item.quantity).toFixed(2)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => { // 'e' represents the React synthetic event
                        e.stopPropagation(); // This stops the event from reaching the row
                        removeStockItemFromList(item.id);
                        //alert("item removed");
                      }}
                      aria-label="Close notification"
                      className="m-3 w-5 h-5 rounded-full bg-black inline-flex items-center justify-center focus:outline-none"
                    >
                      {/* Your SVG icon remains the same */}
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

              {/* Map selectedReturnItemList */}
              {selectedReturnItemList.map((item, index) => (
                <tr
                  onClick={() => {
                    //alert("ret i");
                    addReturnItemToForm(item);
                  }}
                  key={item.id}
                  className={`${item.id === formDataRegItem.id && item.item_name === formDataRegItem.item_name && returnItemSelected ? 'border-4 border-red-400' : 'border-b border-gray-200'} bg-red-100 hover:bg-red-200 cursor-pointer transition-colors`}
                >
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {selectedStockItemList.length + index + 1} {/* Continue numbering */}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {item.sku}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {item.return_quantity} ({item.uom_symbol})
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.stock_price.toFixed(2)} */}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {(item.stock_price * item.quantity).toFixed(2)} */}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {item.retail_price.toFixed(2)} */}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-700">
                    {/* {(item.retail_price * item.quantity).toFixed(2)} */}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeReturnItemFromList(item.id)}
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
                  // type="number"
                  // name="discountAmount"
                  // value={transactionData.discountAmount}
                  // onChange={handleTransactionDataInputChange}
                  type="number"
                  value={finalDiscount}
                  onChange={(e) => setFinalDiscount(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8F8F8] border border-[#EBEBEB] text-right rounded"
                  placeholder="0.00"
                />
              </div>

              {/* amounts area: two columns with a vertical divider */}
              <div className="flex gap-6 py-10 items-start">
                {/* left column inside amount area */}
                <div className="flex-1">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">Restock Amount</p>
                    <p className="text-xl font-semibold">{stockTotal.toFixed(2)}</p>
                  </div>

                  {/* <div className="mt-6">
                    <p className="text-sm font-semibold text-gray-700">Previous Amount</p>
                    <p className="text-3xl font-bold text-black">{transactionData.previousAmount}</p>
                  </div> */}
                </div>

                {/* vertical divider */}
                <div className="w-px bg-gray-200" />

                {/* right column inside amount area */}
                <div className="flex-1 pl-6">
                  <div className="mb-6">
                    <p className="text-sm text-red-500">Return Amount</p>
                    <p className="text-xl font-semibold text-red-500"> {returnTotal.toFixed(2)}</p>
                  </div>

                  {/* <div className="mt-6">
                    <p className="text-sm text-gray-500">Current Amount</p>
                    <p className="text-xl font-semibold text-gray-700">{transactionData.currentAmount}</p>
                  </div> */}
                </div>
              </div>
            </div>

            {/* RIGHT: 1/3 */}
            <div className="w-1/3 border-l border-gray-200 pl-6">
              {/* Cash amount input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Cash Amount ( Rs. )</label>
                <input
                  // type="number"
                  // value={transactionData.cashAmount}
                  // onChange={(e) => setTransactionData(Number(e.target.value))}
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8F8F8] border border-[#EBEBEB] text-right rounded"
                  placeholder="0.00"
                />
              </div>

              {/* change amount */}
              <div className="mb-6">
                <p className="text-sm text-gray-500">Change Amount</p>
                <p className="text-lg font-semibold text-gray-800">
                  {/* {transactionData.changeAmount} */}
                  {changeAmount.toFixed(2)}
                </p>
              </div>

              {/* total amount */}
              <div>
                <p className="text-sm font-semibold text-gray-800">Total Amount</p>
                <p className="text-4xl font-bold text-black">{(returnTotal+stockTotal).toFixed()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-300 w-[calc(32rem)] h-[calc(100vh-2rem)]">
        {/* BUTTONS BLOCK (default visible) */}
        {rightActiveSection === "buttons" && (
          <div className="flex flex-col flex-1 p-2 gap-1">
            <button
              onClick={() => setRightActiveSection("add")}
              className="h-[26rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
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
              className="h-[26rem] flex flex-col items-center justify-center p-4 bg-white rounded shadow hover:bg-gray-100 w-full"
            >
              <img
                src={ReturnItemsImg}
                alt="Return Items"
                className="w-[8rem] h-[8rem] object-contain mb-2"
              />
              <span>Return Items</span>
            </button>


            {/* White block to fill remaining space */}
            <div className="h-[20rem] bg-white rounded"></div>
          </div>
        )}

        {/* DISPOSE ITEMS BLOCK */}
        {/* {rightActiveSection === "dispose" && (
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
            </div>
          </div>
        )} */}

        {/* ADD REGISTERED ITEMS BLOCK */}
        {(rightActiveSection === "add" || rightActiveSection === "dispose" || rightActiveSection === "return") && (
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
                  onChange={handleSearch}
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
                    <SalesItemCard key={item.id ?? item._id} item={item} onOpen={() => loadItemtoList(item)} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* RETURN ITEMS BLOCK */}
        {/* {rightActiveSection === "return" && (
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
        )} */}
      </div>


      {/* integrage this modal later */}
      {/* MODAL OVERLAY */}
      {modal.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* backdrop (click to close) */}
          <div
            className="absolute inset-0 bg-black opacity-60"
            //style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
            onClick={closeModal}
          />

          {/* close button top-left */}
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/90 text-white flex items-center justify-center z-[10001]"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>

          {/* modal content */}
          <div
            className="relative z-[10000] flex flex-col items-center justify-center text-center p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              transition: 'transform 160ms ease, opacity 160ms ease'
            }}
          >
            <img
              src={modal.type === 'success' ? successImage : failedImage}
              alt={modal.type === 'success' ? 'Success' : 'Failed'}
              className="w-24 h-24 object-contain"
              style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.08))' }}
            />

            <h3 className="mt-4 text-2xl font-bold text-black">
              {modal.type === 'success' ? 'Success!' : 'Failed!'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {modal.type === 'success'
                ? 'Transaction Complete.'
                : 'Something went wrong, Try again.'}
            </p>
          </div>
        </div>
      )}

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
