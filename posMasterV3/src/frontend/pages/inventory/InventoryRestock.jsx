import React, { useEffect, useState } from "react";
import { supplierApi, userApi, itemApi, categoryApi, restockApi } from "../../api/localApi";
import { ChevronDown, ChevronUp, Package, Layers, Building2, RotateCcw, Search, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useStatusLog } from "../../services/StatusLogService.jsx";
import barcodeImg from "../../assets/barcode.png";
import SalesItemCard from "../../components/SalesItemCard";
import { generateUniqueString } from "../../util/common/generate";

//modal images
import successImage from '../../assets/Success.png';
import failedImage from '../../assets/Failed.png';
//date conversions
import { appendCurrentTimeToDate, extractDateOnly, getCurrentDate, getCurrentDateTime } from "../../util/common/date";
//form validations
import { validateReturnForm, validateStockForm } from "../../util/inventory/validate";
import StatusModal from "./modals/StatusModal";

function InventoryRestock({ isActive }) {
  const statusLog = useStatusLog();

  // success/fail modal state: { open: boolean, type: 'success' | 'failed' | null }
  const [modal, setModal] = useState({ open: false, type: null, description: "" });
  const closeModal = () => setModal({ open: false, type: null,  description: ""});
  // Fetch Categories from API and create mapping
  const [suppliers, setSuppliers] = useState([]);
  // Refetch when section becomes active
  useEffect(() => {
    if (isActive) {
    // user list(to populate dropdowns)
    const fetchSuppliers = async () => {
      try {
        const response = await supplierApi.getAll();
        if (response.status === "success") {
          console.log(response.data)
          setSuppliers(response.data || []);
          // console.log(response.data)
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      } finally {
        //setLoadingCategories(false);
      }
    };

    fetchSuppliers();
  }
  }, [isActive]);

  // Fetch Users from API and create mapping
  const [users, setUsers] = useState([]);
  // Refetch when section becomes active
  useEffect(() => {
    if (isActive) {
    // user list(to populate dropdowns)
    const fetchUsers = async () => {
      try {
        const response = await userApi.getAll();
        if (response.status === "success") {
          setUsers(response.data || []);
          // console.log(response.data)
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        //setLoadingCategories(false);
      }
    };

    fetchUsers();
  }
  }, [isActive]);

  // right section controls
  const [rightActiveSection, setRightActiveSection] = useState("buttons"); // "buttons" | "dispose" | "add" | "return"

  // registered item list
  const [inventoryItems, setInventoryItems] = useState([]);
  const fetchItems = async () => {
    statusLog.database("Loading restock items...", true);
    try {
      const response = await itemApi.getAllExtended();
      if (response.status === "success") {
        setInventoryItems(response.data || []);
        statusLog.success(`Restock: Loaded ${response.data?.length || 0} items`);
      }
    } catch (error) {
      statusLog.error("Failed to load restock items");
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch items from API
  // Refetch when section becomes active
  useEffect(() => {
    if (isActive) {
      console.log('items are fetching when active with right active section?');
    fetchItems();
    }
  }, [rightActiveSection]);


  // Fetch Categories from API and create mapping
  // Refetch when section becomes active
  useEffect(() => {
    if (isActive) {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAll();
        if (response.status === "success") {
          setItemCategories(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        //setLoadingCategories(false);
      }
    };

    fetchCategories();
  }
  }, [isActive]);

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

  const [isLoading, setIsLoading] = useState(false);
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


  //item list for the mid section table
  const [selectedStockItemList, setSelectedStockItemList] = useState([]);

  const [selectedReturnItemList, setSelectedReturnItemList] = useState([]);

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
  

  //to populate recent batch code changes
  const [stockEntries, setStockEntries] = useState([]);
  // fetch stock entries for a given SKU
  const fetchStockEntries = async (sku) => {
    if (!sku) return;
    try {
      const response = await restockApi.getStockData(sku);

      if (response) {
        if (response.status === 'success' && Array.isArray(response.data)) {
          setStockEntries(response.data);
          console.log(stockEntries);
        } else if (Array.isArray(response)) {
          setStockEntries(response);
        } else if (Array.isArray(response.data)) {
          setStockEntries(response.data);
        } else {
          setStockEntries([]);
          //setStockFetchError(response.message || 'Unexpected response shape');
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

        batch_code: "",

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
  // Refetch when section becomes active
  useEffect(() => {
    if (isActive) {
    // Only set if not already set (e.g., for editing existing data)
    // if (!formDataStock.expired_datetime) {
    setCurrentDateToExpired();
    // }
    }
  }, [isActive]); // Empty dependency array to run once on mount



  const registerTransaction = async (e) => {
    statusLog.database("Processing restock transaction...", true);

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
    //create ret item list for ret data
    const transformToReturnedItems = () => {
      return selectedReturnItemList.map(item => ({
        sku: item.sku,
        batch_code: item.batch_code,
        qty: item.return_quantity,
        description: item.return_description
      }));
    };

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
      const response = await restockApi.create(requestData);

      if (response.status === "success") {
        //generate a new invoice number
        setInvoiceGenerate(invoiceGenerate + 1);

        setModal({ open: true, type: 'success' });
        statusLog.success("Restock transaction completed successfully");
      } else {
        setModal({ open: true, type: 'failed' });
        statusLog.error("Restock transaction failed");
      }
    } catch (err) {
      setModal({ open: true, type: 'failed' });
      statusLog.error("Restock transaction error");
    }
    finally {
      //repopulate items
      //fetchItems();
    }
  };


  return (

    <div className="flex bg-gray-50 w-full h-[calc(100vh-2rem)] relative">
      {/* form section (left) */}
      <div className="bg-gray-100 w-[calc(28rem)] h-[calc(100vh-2rem)] p-3 z-10">
        <div className="flex flex-col h-[46rem] gap-3">
          {/* ▼ item description block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setopenFormBlock('item')}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Item Description</span>
              </div>
              {openFormBlock == 'item' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {(openFormBlock == 'item') && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="flex flex-row items-center gap-4 pt-4">
                  <div className="flex flex-col items-center">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <img src={barcodeImg} alt="Barcode" className="w-20 object-contain" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-mono">{formDataRegItem.sku || 'No SKU'}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Name</p>
                        <p className="text-sm font-semibold text-gray-800">{formDataRegItem.item_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Category</p>
                        <p className="text-sm font-medium text-gray-700">{formDataRegItem?.category?.type || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ stock description block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setopenFormBlock('stock')}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-[#1A318C]" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stock Description</span>
              </div>
              {openFormBlock == 'stock' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {(openFormBlock == 'stock') && (
              <div className="px-4 pb-4 border-t border-gray-100 h-[34rem] overflow-y-auto">
                <div className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        name="batch_code"
                        value={formDataStock.batch_code}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                          formErrors.batch_code ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.batch_code && <p className="text-red-500 text-xs mt-1">{formErrors.batch_code}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formDataStock.quantity}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                          formErrors.quantity ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Threshold (%)
                      </label>
                      <input
                        type="number"
                        name="threshold_limit"
                        value={formDataStock.threshold_limit}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                          formErrors.threshold_limit ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.threshold_limit && <p className="text-red-500 text-xs mt-1">{formErrors.threshold_limit}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={formDataStock.availability}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                          formErrors.availability ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer`}
                      >
                        <option value="">Select</option>
                        <option value={true}>Available</option>
                        <option value={false}>Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Stock Price
                      </label>
                      <input
                        type="number"
                        name="stock_price"
                        value={formDataStock.stock_price}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                          formErrors.stock_price ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.stock_price && <p className="text-red-500 text-xs mt-1">{formErrors.stock_price}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Retail Price
                      </label>
                      <input
                        type="number"
                        name="retail_price"
                        value={formDataStock.retail_price}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                          formErrors.retail_price ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.retail_price && <p className="text-red-500 text-xs mt-1">{formErrors.retail_price}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        id="expired_datetime"
                        value={formDataStock.expired_datetime ? formDataStock.expired_datetime.split('T')[0] : ''}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          if (selectedDate) {
                            const localDateTime = appendCurrentTimeToDate(selectedDate);
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
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                          formErrors.expired_datetime ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.expired_datetime && <p className="text-red-500 text-xs mt-1">{formErrors.expired_datetime}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Discount (Rs.)
                      </label>
                      <input
                        type="number"
                        name="discount"
                        value={formDataStock.discount}
                        onChange={handleStockInputChange}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                          formErrors.discount ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formErrors.discount && <p className="text-red-500 text-xs mt-1">{formErrors.discount}</p>}
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Batch Codes</p>
                    <div className="flex flex-col gap-2 max-h-[10rem] overflow-y-auto pr-1">
                      {stockEntries.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400">No recent batches</p>
                        </div>
                      ) : (
                        stockEntries.map((s, i) => (
                          <div
                            key={s.batch_code + i}
                            onClick={() => setStockBatchCodeFromEntry(s)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                              s.batch_code === formDataStock.batch_code
                                ? 'bg-[#1A318C]/10 border-2 border-[#1A318C]'
                                : 'bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div>
                              <p className="text-xs text-gray-400">Batch Code</p>
                              <p className="text-sm font-semibold text-gray-800">{s.batch_code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-800 tabular-nums">{s.qty} units</p>
                              <p className="text-xs text-gray-400">{s.exp_date ? extractDateOnly(s.exp_date) : 'N/A'}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* ▼ supplier description block ▼ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setopenFormBlock('supplier')}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supplier</span>
              </div>
              {(openFormBlock == 'supplier') ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {(openFormBlock == 'supplier') && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-3 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Supplier
                    </label>
                    <select
                      name="supplier_name"
                      value={formDataSupplier.supplier_name}
                      onChange={(e) => {
                        handleSupplierInputChange(e);
                        const selectedSupplierName = e.target.value;
                        const selectedSupplier = suppliers.find(supplier => supplier?.basic_info?.supplier_name === selectedSupplierName);
                        if (selectedSupplier) {
                          setTransactionData(prev => ({
                            ...prev,
                            supplier_id: selectedSupplier.id,
                            supplierName: selectedSupplier?.basic_info?.supplier_name,
                            previousAmount: selectedSupplier?.financial_info?.previous_amount
                          }));
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier?.basic_info?.supplier_name}>
                          {supplier?.basic_info?.supplier_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Invoice No
                      </label>
                      <input
                        type="text"
                        name="invoice_no"
                        value={formDataSupplier.invoice_no}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Bill No
                      </label>
                      <input
                        type="text"
                        name="bill_no"
                        value={formDataSupplier.bill_no}
                        onChange={handleSupplierInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Payment Method
                      </label>
                      <select
                        name="payment_method"
                        value={formDataSupplier.payment_method}
                        onChange={handleSupplierInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select method</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Expenses (Rs.)
                      </label>
                      <input
                        type="number"
                        name="expenses"
                        value={formDataSupplier.expenses}
                        onChange={handleSupplierInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ return description block ▼ */}
          {(returnItemSelected) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setopenFormBlock('return')}
                className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Return</span>
                </div>
                {openFormBlock === 'return' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {openFormBlock === 'return' && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-3 pt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formDataReturnItem.quantity}
                        onChange={handleReturnItemInputChange}
                        placeholder="Enter quantity"
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                          formReturnErrors.quantity ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formReturnErrors.quantity && <p className="text-red-500 text-xs mt-1">{formReturnErrors.quantity}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Description
                      </label>
                      <textarea
                        name="return_description"
                        value={formDataReturnItem.return_description}
                        onChange={handleReturnItemInputChange}
                        placeholder="Enter return reason..."
                        rows={3}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                          formReturnErrors.return_description ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        } bg-gray-50 focus:outline-none focus:ring-2 transition-all resize-none`}
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
                            <span className="text-gray-400">{s.exp_date ? extractDateOnly(s.exp_date) : ''} Exp</span>
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
        <div className="flex flex-row w-full gap-2 mt-auto pt-3">
          <button
            onClick={() => {
              clearFormInput();
              setReturnItemSelected(false);
              setStockEntries([]);
            }}
            className="flex-1 min-w-0 h-11 px-3 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={addNewRegItem}
            disabled={formDataRegItem.id === 0}
            className="flex-1 min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl text-sm font-semibold enabled:hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* main transaction section (mid) with loading state and content*/}
      <div className="flex-1 h-[calc(100vh-2rem)] flex flex-col">
        {/* supplier details section*/}
        <div className="bg-white border-b border-gray-100 p-5">
          <div className="flex flex-row gap-8">
            <div className="flex flex-col flex-1 gap-4">
              <div className="bg-gradient-to-r from-[#1A318C] to-[#2a4399] rounded-xl p-4 text-white">
                <p className="text-xs uppercase tracking-wide opacity-80">Supplier</p>
                <p className="text-xl font-bold">{transactionData.supplierName || 'Not selected'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select employee</option>
                    {users.map(user => (
                      <option key={user._id} value={user.username}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select employee</option>
                    {users.map(user => (
                      <option key={user._id} value={user.username}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-col w-64 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                <p className="text-lg font-bold text-gray-800">{getCurrentDate()}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Invoice No</p>
                <p className="text-lg font-bold text-white font-mono">{transactionData.invoiceNo}</p>
              </div>
              <div className="flex flex-row gap-2 mt-auto">
                <button
                  onClick={() => {
                    setInvoiceGenerate(invoiceGenerate + 1);
                  }}
                  className="flex-1 h-10 px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    registerTransaction();
                  }}
                  className="flex-1 h-10 px-4 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* table section*/}
        <div className="flex-1 overflow-hidden bg-white">
          <div className="h-full overflow-y-auto p-4">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-700 to-slate-600 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  Item Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  Stock Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  Stock Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  Retail Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide">
                  Retail Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wide w-12">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Map selectedStockItemList */}
              {selectedStockItemList.map((item, index) => (
                <tr
                  onClick={() => {
                    addRegItemToForm(item);
                  }}
                  key={item.id || generateUniqueString()}
                  className={`${item.id === formDataRegItem.id && item.item_name === formDataRegItem.item_name && !returnItemSelected ? 'bg-[#1A318C]/5 ring-2 ring-[#1A318C] ring-inset' : ''} hover:bg-gray-50 cursor-pointer transition-all`}
                >
                  <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 font-mono">
                    {item.sku}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    <span className="font-semibold">{item.quantity}</span>
                    <span className="text-gray-400 ml-1">({item.uom_symbol})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {(item.stock_price - item.item_discount_amt).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 tabular-nums">
                    {((item.stock_price - item.item_discount_amt) * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {(item.retail_price - item.item_discount_amt).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 tabular-nums">
                    {(item.retail_price * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStockItemFromList(item.id);
                      }}
                      aria-label="Remove item"
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white text-gray-400 inline-flex items-center justify-center transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    addReturnItemToForm(item);
                  }}
                  key={item.id}
                  className={`${item.id === formDataRegItem.id && item.item_name === formDataRegItem.item_name && returnItemSelected ? 'ring-2 ring-red-400 ring-inset' : ''} bg-red-50 hover:bg-red-100 cursor-pointer transition-all`}
                >
                  <td className="px-4 py-3 text-sm text-red-600 tabular-nums">
                    {selectedStockItemList.length + index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-red-700 font-mono">
                    {item.sku}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 tabular-nums">
                    <span className="font-semibold">{item.return_quantity}</span>
                    <span className="text-red-400 ml-1">({item.uom_symbol})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-400">—</td>
                  <td className="px-4 py-3 text-sm text-red-400">—</td>
                  <td className="px-4 py-3 text-sm text-red-400">—</td>
                  <td className="px-4 py-3 text-sm text-red-400">—</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeReturnItemFromList(item.id);
                      }}
                      aria-label="Remove item"
                      className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-500 hover:text-white text-red-400 inline-flex items-center justify-center transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {/* amount section */}
        <div className="bg-white border-t border-gray-100 p-5">
          <div className="flex gap-6">
            {/* LEFT: Amount summary cards */}
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Restock Amount */}
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium">Restock Amount</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">Rs. {stockTotal.toFixed(2)}</p>
                </div>
                {/* Return Amount */}
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Return Amount</p>
                  <p className="text-2xl font-bold text-red-700 tabular-nums mt-1">Rs. {returnTotal.toFixed(2)}</p>
                </div>
                {/* Discount */}
                <div className="bg-amber-50 rounded-xl p-4">
                  <label className="block text-xs text-amber-600 uppercase tracking-wide font-medium">Discount (Rs.)</label>
                  <input
                    type="number"
                    value={finalDiscount}
                    onChange={(e) => setFinalDiscount(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-lg font-bold text-amber-700 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Cash and Change inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Cash Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Change Amount</p>
                  <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-800 tabular-nums text-right">{changeAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Total Amount */}
            <div className="w-56 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-5 flex flex-col justify-center items-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Total Amount</p>
              <p className="text-4xl font-bold text-white tabular-nums mt-2">Rs. {(returnTotal+stockTotal).toFixed(2)}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 bg-slate-600 rounded-full">Stock: {stockTotal.toFixed(0)}</span>
                <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">-{returnTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 w-[calc(32rem)] h-[calc(100vh-2rem)] p-3">
        {/* BUTTONS BLOCK (default visible) */}
        {rightActiveSection === "buttons" && (
          <div className="flex flex-col h-full gap-3">
            {/* Add Items Button */}
            <button
              onClick={() => setRightActiveSection("add")}
              className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#1A318C]/10 flex items-center justify-center mb-3 group-hover:bg-[#1A318C]/20 transition-colors">
                <Package className="w-8 h-8 text-[#1A318C]" />
              </div>
              <span className="text-lg font-semibold text-gray-800">Add Items</span>
              <span className="text-sm text-gray-500 mt-1">Add registered items to stock</span>
            </button>

            {/* Dispose Items Button */}
            <button
              onClick={() => setRightActiveSection("dispose")}
              className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                <Trash2 className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-lg font-semibold text-gray-800">Dispose Items</span>
              <span className="text-sm text-gray-500 mt-1">Remove damaged or expired items</span>
            </button>

            {/* Return Items Button */}
            <button
              onClick={() => setRightActiveSection("return")}
              className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
                <RotateCcw className="w-8 h-8 text-red-600" />
              </div>
              <span className="text-lg font-semibold text-gray-800">Return Items</span>
              <span className="text-sm text-gray-500 mt-1">Process item returns to supplier</span>
            </button>
          </div>
        )}

        {/* ADD / DISPOSE / RETURN ITEMS BLOCK */}
        {(rightActiveSection === "add" || rightActiveSection === "dispose" || rightActiveSection === "return") && (
          <div className="flex flex-col h-full">
            {/* Section Header with context-aware styling */}
            <div className={`rounded-xl mb-3 overflow-hidden ${
              rightActiveSection === "add"
                ? "bg-gradient-to-r from-[#1A318C] to-[#2a4399]"
                : rightActiveSection === "dispose"
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : "bg-gradient-to-r from-red-500 to-red-400"
            }`}>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRightActiveSection("buttons")}
                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      {rightActiveSection === "add" && <Package className="w-5 h-5 text-white" />}
                      {rightActiveSection === "dispose" && <Trash2 className="w-5 h-5 text-white" />}
                      {rightActiveSection === "return" && <RotateCcw className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {rightActiveSection === "add" && "Add Items"}
                        {rightActiveSection === "dispose" && "Dispose Items"}
                        {rightActiveSection === "return" && "Return Items"}
                      </h3>
                      <p className="text-xs text-white/80">
                        {rightActiveSection === "add" && "Select items to add to stock"}
                        {rightActiveSection === "dispose" && "Select items to dispose"}
                        {rightActiveSection === "return" && "Select items to return"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search items by name, SKU..."
                    className={`w-full h-10 pl-10 pr-4 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      rightActiveSection === "add"
                        ? "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                        : rightActiveSection === "dispose"
                          ? "border-gray-200 focus:ring-amber-500/20 focus:border-amber-500"
                          : "border-gray-200 focus:ring-red-500/20 focus:border-red-500"
                    }`}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="p-4 bg-gray-50 flex gap-3">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="flex-1 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategoryTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  name="searchAvailability"
                  value={searchAvailability}
                  onChange={(e) => setSearchAvailability(e.target.value)}
                  className="flex-1 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Items</option>
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {(isLoading || searchLoading) ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className={`animate-spin rounded-full border-4 border-gray-200 h-12 w-12 mb-4 ${
                      rightActiveSection === "add"
                        ? "border-t-[#1A318C]"
                        : rightActiveSection === "dispose"
                          ? "border-t-amber-500"
                          : "border-t-red-500"
                    }`}></div>
                    <p className="text-gray-500">Loading items...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                      rightActiveSection === "add"
                        ? "bg-[#1A318C]/10"
                        : rightActiveSection === "dispose"
                          ? "bg-amber-100"
                          : "bg-red-100"
                    }`}>
                      {rightActiveSection === "add" && <Package className="w-8 h-8 text-[#1A318C]/50" />}
                      {rightActiveSection === "dispose" && <Trash2 className="w-8 h-8 text-amber-400" />}
                      {rightActiveSection === "return" && <RotateCcw className="w-8 h-8 text-red-400" />}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">No items found</h3>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <SalesItemCard key={item.id ?? item._id} item={item} onOpen={() => loadItemtoList(item)} />
                  ))
                )}
              </div>
            </div>

            {/* Action info bar */}
            <div className={`mt-3 rounded-xl p-3 flex items-center gap-3 ${
              rightActiveSection === "add"
                ? "bg-[#1A318C]/5 border border-[#1A318C]/10"
                : rightActiveSection === "dispose"
                  ? "bg-amber-50 border border-amber-100"
                  : "bg-red-50 border border-red-100"
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                rightActiveSection === "add"
                  ? "bg-[#1A318C]/10"
                  : rightActiveSection === "dispose"
                    ? "bg-amber-100"
                    : "bg-red-100"
              }`}>
                {rightActiveSection === "add" && <Package className="w-4 h-4 text-[#1A318C]" />}
                {rightActiveSection === "dispose" && <Trash2 className="w-4 h-4 text-amber-600" />}
                {rightActiveSection === "return" && <RotateCcw className="w-4 h-4 text-red-600" />}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium ${
                  rightActiveSection === "add"
                    ? "text-[#1A318C]"
                    : rightActiveSection === "dispose"
                      ? "text-amber-700"
                      : "text-red-700"
                }`}>
                  {rightActiveSection === "add" && "Click on items to add them to the restock list"}
                  {rightActiveSection === "dispose" && "Click on items to mark them for disposal"}
                  {rightActiveSection === "return" && "Click on items to add them to the return list"}
                </p>
              </div>
              <span className={`text-xs font-bold tabular-nums px-2 py-1 rounded-lg ${
                rightActiveSection === "add"
                  ? "bg-[#1A318C] text-white"
                  : rightActiveSection === "dispose"
                    ? "bg-amber-500 text-white"
                    : "bg-red-500 text-white"
              }`}>
                {filteredItems.length} items
              </span>
            </div>
          </div>
        )}
      </div>


      {/* integrage this modal later */}
      {/* MODAL OVERLAY */}
        <StatusModal 
          isOpen={modal.open}
          closeModal={closeModal}
          type={modal.type}/>

    </div>
  );
}

export default InventoryRestock;