import { useCallback, useEffect, useState } from "react";
import { restockApi, disposedApi } from "../../api/localApi";
import { useStatusLog } from "../../services/StatusLogService.jsx";
import { generateUniqueString, generateBillNo } from "../../util/common/generate";
import { validateReturnForm, validateStockForm } from "../../util/inventory/validate";
import { getEffectiveSellingPrice } from "../../util/common/uomPricing";

// This is the "restock transaction" orchestrator hook. It owns the
// transaction-level state (supplier/prep/auth selection, invoice number,
// the item list building up the transaction, cash/discount/totals, the
// success/fail modal) plus every action that reaches across more than one
// form section: loading a row back into the edit form, adding the edited
// form into the transaction list, disposing an item, and submitting the
// final restock transaction. These stayed together (instead of being
// split further) because that's exactly how the original component wired
// them — nearly every one of these actions reads and writes state from
// several of the other form hooks at once.
export function useRestockTransaction({
  isActive,
  rightActiveSection,
  setRightActiveSection,
  setopenFormBlock,
  buildDisposeDisplayItem,
  // stock item form (useStockItemForm)
  formDataRegItem,
  setFormDataRegItem,
  formDataStock,
  setFormDataStock,
  setFormErrors,
  clearFormInput,
  setStockEntries,
  fetchStockEntries,
  // return item form (useReturnItemForm)
  formDataReturnItem,
  setFormDataReturnItem,
  setFormReturnErrors,
  returnItemSelected,
  setReturnItemSelected,
  // dispose item form (useDisposeItemForm)
  formDataDisposeItem,
  setFormDataDisposeItem,
  setFormDisposeErrors,
  setDisposeItemSelected,
  // supplier form (useSupplierForm)
  formDataSupplier,
  setFormDataSupplier,
}) {
  const statusLog = useStatusLog();

  // success/fail modal state: { open: boolean, type: 'success' | 'failed' | null }
  const [modal, setModal] = useState({ open: false, type: null, description: "" });

  const clearTransactionForm = () => {
    setSelectedStockItemList([]);
    setSelectedReturnItemList([]);
    setFinalDiscount(0);
    setCashAmount(0);
    setRightActiveSection("buttons");
    setDisposeItemSelected(false);
    setFormDataDisposeItem({ stock_id: "", quantity: "", reason: "" });
    setFormDisposeErrors({});
    setFormDataSupplier({
      id: 0,
      supplier_name: "",
      type: "",
      supplier_address: "",
      status: false,
      contact: "",
      current_amount: 0,
      previous_amount: 0,
      invoice_no: "",
      bill_no: "",
      payment_method: "",
      expenses: 0,
      account_name: "",
      account_nickName: "",
      account_related_bank: "",
      account_number: "",
      account_related_branch: "",
    });
    clearFormInput();
    setStockEntries([]);
    setInvoiceGenerate(prev => prev + 1);
  };

  const closeModal = () => {
    const wasSuccess = modal.type === 'success';
    setModal({ open: false, type: null, description: "" });
    if (wasSuccess) clearTransactionForm();
  };

  //set invoice and bill number for both mid form and left supplier block
  // NOTE: `invoiceNo` itself (as opposed to `transactionData.invoiceNo`) was
  // never read anywhere in the original component either — it was written
  // by this effect and by the formDataSupplier initializer only. It's kept
  // (prefixed with `_` per this codebase's unused-var convention, matching
  // `_totalStockDiscount` below) rather than removed, since this is a
  // structural refactor, not a behavior cleanup.
  const [_invoiceNo, setInvoiceNo] = useState("");
  const [invoiceGenerate, setInvoiceGenerate] = useState(1);

  // Auto-generate invoice and bill numbers
  useEffect(() => {
    const newInvoiceNo = generateUniqueString();
    const newBillNo = generateBillNo();

    setInvoiceNo(newInvoiceNo);
    setTransactionData((prev) => ({
      ...prev,
      invoiceNo: newInvoiceNo
    }));
    setFormDataSupplier((prev) => ({
      ...prev,
      invoice_no: newInvoiceNo,
      bill_no: newBillNo
    }));
    // `setFormDataSupplier` is the useState setter returned from
    // useSupplierForm — its identity is stable across renders even though
    // eslint can't prove that across the hook boundary, so adding it here
    // does not change how often this effect runs.
  }, [invoiceGenerate, setFormDataSupplier]);

  // Transaction validation errors
  const [transactionErrors, setTransactionErrors] = useState({});

  // Validate transaction before submit
  const validateTransaction = () => {
    const errors = {};

    // Validate supplier selection
    if (!transactionData.supplier_id) {
      errors.supplier = "Please select a supplier";
    }

    // Validate at least one item in list
    if (selectedStockItemList.length === 0 && selectedReturnItemList.length === 0) {
      errors.items = "Please add at least one item to the transaction";
    }

    // Validate prepared by
    if (!transactionData.prep_id) {
      errors.preparedBy = "Please select who prepared this transaction";
    }

    // Validate authorized by
    if (!transactionData.auth_id) {
      errors.authorizedBy = "Please select who authorized this transaction";
    }

    // Validate payment method
    if (!formDataSupplier.payment_method) {
      errors.paymentMethod = "Please select a payment method";
    }

    // Validate cash amount if positive total
    if (totalAmount > 0 && parseFloat(cashAmount) <= 0) {
      errors.cashAmount = "Please enter the cash amount";
    }

    // DEBUG: Log validation status
    console.log('[InventoryRestock] Validation check:', {
      supplier_id: transactionData.supplier_id,
      prep_id: transactionData.prep_id,
      auth_id: transactionData.auth_id,
      payment_method: formDataSupplier.payment_method,
      totalAmount,
      cashAmount,
      stockItemsCount: selectedStockItemList.length,
      returnItemsCount: selectedReturnItemList.length,
      errors
    });

    setTransactionErrors(errors);
    return Object.keys(errors).length === 0;
  };


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
  const _totalStockDiscount = selectedStockItemList.reduce((total, item) => {
    return total + ((item.item_discount_amt || 0) * item.quantity);
  }, 0);

  const _totalReturnDiscount = selectedReturnItemList.reduce((total, item) => {
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
    const itemUomId = item.uom_id ?? item.uom?.id ?? item.uom?._id ?? "";
    const itemCategoryId = item.category_id ?? item.category?.id ?? item.category?._id ?? "";

    //to make left section's return item block invisible or removed only after selecting a return item from the table
    setReturnItemSelected(false);
        //load item basic details(loaded for all item types-reg, return...etc)
    setFormDataRegItem({
      sku: item.sku,
      item_code: item.item_code || null,

      _id: item._id,
      id: item.id,
      stock_trace: item.stock_trace,
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      //batch_code: item.batch_code,
      maximum_capacity: item.maximum_capacity,
      uom_id: itemUomId,
      category_id: itemCategoryId,
      inventory_id: item.inventory_id,
      item_update_datetime: item.item_update_datetime,
      item_created_datetime: item.item_created_datetime,
      __v: item._v,
      uom: {
        _id: item.uom?._id ?? itemUomId,
        id: item.uom?.id ?? itemUomId,
        symbol: item.uom?.symbol,
        unit_name: item.uom?.unit_name,
        __v: item.uom?._v,
      },
      category: {
        _id: item.category?._id ?? itemCategoryId,
        id: item.category?.id ?? itemCategoryId,
        brand: item.category?.brand,
        type: item.category?.type,
        __v: item.category?._v,
      },
      inventory: item.inventory,
      availability: item.availability
    });

    setFormDataStock({
      batch_code: item.batch_code || "",
      quantity: item.quantity ?? "",
      threshold_limit: item.threshold_limit ?? "",
      stock_price: item.stock_price ?? "",
      retail_price: item.retail_price ?? "",
      selling_price_per_kg: item.selling_price_per_kg ?? item.sellingPricePerKg ?? "",
      selling_price_per_liter: item.selling_price_per_liter ?? item.sellingPricePerLiter ?? "",
      expired_datetime: item.expired_datetime || item.expiry_date || null,
      availability: item.availability ?? true,

      //discount is given within the frontend
      discount: item.item_discount_amt ?? 0
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
      item_code: item.item_code || null,

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
      selling_price_per_kg: item.selling_price_per_kg ?? item.sellingPricePerKg ?? "",
      selling_price_per_liter: item.selling_price_per_liter ?? item.sellingPricePerLiter ?? "",
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
    // Use consistent ID (prefer id, fallback to _id)
    const formItemId = formDataRegItem.id ?? formDataRegItem._id;

    if (!returnItemSelected) {
    //prevent adding items without selecting table rows
    if(!formItemId || formItemId === 0){
      setFormErrors(prev => ({ ...prev, item_id: "Select an item from the list first." }));
      return;
    }

  //validate stock data input fields
  const { valid, formErrors: validationErrors } = validateStockForm(formDataStock, {
    uomSymbol: formDataRegItem.uom?.symbol
  });
  setFormErrors(validationErrors);

  if (!valid) {
    // bail out so UI shows highlights
    console.warn("Validation failed", validationErrors);
    return;
  }
    //hide the return description Upon VALIDATION SUCCESS
    setReturnItemSelected(false);

    //check if it already exists on the item list first
      const uomSymbol = formDataRegItem.uom?.symbol || "";
      const sellingPricePerKg = parseFloat(formDataStock.selling_price_per_kg) || 0;
      const sellingPricePerLiter = parseFloat(formDataStock.selling_price_per_liter) || 0;
      const effectiveSellingPrice = getEffectiveSellingPrice({
        retail_price: formDataStock.retail_price,
        selling_price_per_kg: sellingPricePerKg,
        selling_price_per_liter: sellingPricePerLiter,
        uom_symbol: uomSymbol
      });

      const newRegItem = {
        _id: formDataRegItem._id,
        id: formItemId,
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
        uom: formDataRegItem.uom,
        category: formDataRegItem.category,

        batch_code: formDataStock.batch_code,
        sku: formDataRegItem.sku,
        quantity: parseFloat(formDataStock.quantity) || 0,
        threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
        stock_price: parseFloat(formDataStock.stock_price) || 0,
        retail_price: effectiveSellingPrice,
        selling_price_per_kg: sellingPricePerKg,
        selling_price_per_liter: sellingPricePerLiter,
        expired_datetime: formDataStock.expired_datetime,
        availability: formDataStock.availability,

        item_discount_amt: parseFloat(formDataStock.discount) || 0,

        uom_symbol: uomSymbol
      };
      console.log("Adding/updating stock item:", newRegItem);

      // Add new item to list, or update if it already exists
      setSelectedStockItemList(prev => {
        const existingIndex = prev.findIndex(
          prevItem => (prevItem.id ?? prevItem._id) === formItemId
        );
        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prev];
          updated[existingIndex] = newRegItem;
          return updated;
        } else {
          // Add new item to list
          return [...prev, newRegItem];
        }
      });

      //finally clear inputs
      clearFormInput();
      setReturnItemSelected(false);
      //also clear the recent batch code changes
      setStockEntries([]);

    }
    else {
      console.log("return item was selected");

      // Validate return form
      const { valid, formReturnErrors: validationErrors } = validateReturnForm(formDataReturnItem);
      setFormReturnErrors(validationErrors);
      if (!valid) {
        console.warn("Return validation failed", validationErrors);
        return; // don't proceed if invalid
      }

      const uomSymbol = formDataRegItem.uom?.symbol || "";

      const newRetItem = {

        _id: formDataRegItem._id,
        id: formItemId,
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
        uom: formDataRegItem.uom,
        category: formDataRegItem.category,

        sku: formDataRegItem.sku,
        threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
        stock_price: parseFloat(formDataReturnItem.stock_price) || parseFloat(formDataStock.stock_price) || 0,
        retail_price: parseFloat(formDataReturnItem.retail_price) || parseFloat(formDataStock.retail_price) || 0,
        selling_price_per_kg: parseFloat(formDataStock.selling_price_per_kg) || 0,
        selling_price_per_liter: parseFloat(formDataStock.selling_price_per_liter) || 0,
        expired_datetime: formDataStock.expired_datetime,
        availability: formDataStock.availability,

        //the batch code for table row - use return form's batch_code which is validated
        batch_code: formDataReturnItem.batch_code || formDataStock.batch_code,
        quantity: parseFloat(formDataReturnItem.quantity),
        uom_symbol: uomSymbol,

        item_discount_amt: formDataStock.discount,

        return_description: formDataReturnItem.return_description,
        return_quantity: formDataReturnItem.quantity

      };
      console.log("Adding/updating return item:", newRetItem);

      // Add new item to list, or update if it already exists
      setSelectedReturnItemList(prev => {
        const existingIndex = prev.findIndex(
          prevItem => (prevItem.id ?? prevItem._id) === formItemId
        );
        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prev];
          updated[existingIndex] = newRetItem;
          return updated;
        } else {
          // Add new item to list
          return [...prev, newRetItem];
        }
      });

      //finally clear inputs
      clearFormInput();
      setReturnItemSelected(false);
      //also clear the recent batch code changes
      setStockEntries([]);

    }
  }

  // Submit a dispose item directly to the disposed_items table
  const addDisposeItem = async () => {
    const errors = {};
    const qty = parseFloat(formDataDisposeItem.quantity);
    if (!formDataDisposeItem.quantity || isNaN(qty) || qty <= 0) {
      errors.quantity = "Enter a valid quantity greater than 0.";
    } else if (formDataDisposeItem.available_qty != null && qty > formDataDisposeItem.available_qty) {
      errors.quantity = `Cannot exceed available quantity (${formDataDisposeItem.available_qty}).`;
    }
    if (!formDataDisposeItem.reason || !formDataDisposeItem.reason.trim()) {
      errors.reason = "Reason is required.";
    }
    if (Object.keys(errors).length > 0) {
      setFormDisposeErrors(errors);
      return;
    }

    try {
      const response = await disposedApi.create({
        stock_id: formDataDisposeItem.stock_id,
        quantity: qty,
        reason: formDataDisposeItem.reason.trim(),
        disposed_by: transactionData.prep_id,
      });

      if (response.status === "success") {
        setModal({ open: true, type: 'success', description: 'Item disposed successfully' });
        statusLog.success("Item disposed successfully");
        setDisposeItemSelected(false);
        setFormDataDisposeItem({ stock_id: "", quantity: "", reason: "" });
        setFormDisposeErrors({});
        clearFormInput();
      } else {
        setModal({ open: true, type: 'failed', description: response.message || 'Disposal failed' });
        statusLog.error("Disposal failed: " + (response.message || ""));
      }
    } catch (err) {
      setModal({ open: true, type: 'failed', description: err.message || 'An error occurred during disposal' });
      statusLog.error("Disposal error");
    }
  };

  //verify if it's a return item, register item or a dispose item
  //if it doesn't exists and a register item, add it to the list(for now adding from form state but i can also add it from selectedRegItem just in case)


  //removes item from list by id
  const removeStockItemFromList = (id) => {
    setSelectedStockItemList(prev => prev.filter(item => (item.id ?? item._id) !== id));
  }
    const removeReturnItemFromList = (id) => {
    setSelectedReturnItemList(prev => prev.filter(item => (item.id ?? item._id) !== id));
  }

  //populate the batchcode textbox from recent sku card
  const setStockBatchCodeFromEntry = (item) => {
    console.log(item);
    //const newDate = extractDateOnly(item.exp_date)
    //populate existing stock form block according to selected batch code
    // Ensure all values have defaults to prevent controlled/uncontrolled input warnings
    setFormDataStock({
      batch_code: item.batch_code || "",
      quantity: item.quantity ?? 0,
      threshold_limit: item.threshold_limit ?? 0,
      stock_price: item.stock_price ?? 0,
      retail_price: item.retail_price ?? 0,
      selling_price_per_kg: item.selling_price_per_kg ?? item.sellingPricePerKg ?? "",
      selling_price_per_liter: item.selling_price_per_liter ?? item.sellingPricePerLiter ?? "",
      expired_datetime: item.exp_date || null,
      availability: item.availability ?? true,
      discount: item.discount_price ?? 0
    });

    // Also populate return form batch_code if in return mode
    if (returnItemSelected || rightActiveSection === "return") {
      setFormDataReturnItem(prev => ({
        ...prev,
        batch_code: item.batch_code,
        stock_price: item.stock_price,
        retail_price: item.retail_price
      }));
    }
  }

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

  // Load item object into form from cards (populates form only, does not add to list)
  // Item is added to list when user clicks "Add Item" button
  const loadItemtoList = (item) => {
    // Use consistent ID (prefer id, fallback to _id)
    const itemId = item.id ?? item._id;
    const displayItem = buildDisposeDisplayItem(item);

    // Handle dispose mode separately
    if (rightActiveSection === "dispose") {
      console.log("Loading dispose item to form:", displayItem.item_name);
      setFormDataRegItem(prev => ({
        ...prev,
        sku: displayItem.sku,
        _id: displayItem._id,
        id: displayItem.id ?? itemId,
        item_name: displayItem.item_name,
        item_image_url: displayItem.item_image_url,
        category: displayItem.category,
        uom: displayItem.uom,
      }));
      setFormDataDisposeItem({
        stock_id: displayItem.stock_id,
        batch_code: displayItem.batch_code,
        available_qty: displayItem.quantity,
        quantity: "",
        reason: "",
      });
      setFormDisposeErrors({});
      setDisposeItemSelected(true);
      setopenFormBlock('dispose');
      return;
    }

    if (rightActiveSection != "return") {
      // clear item selection error if it existed
      setFormErrors(prev => {
        if (!prev?.item_id) return prev;
        const next = { ...prev };
        delete next.item_id;
        return next;
      });

      const itemUomId = displayItem.uom_id ?? displayItem.uom?.id ?? displayItem.uom?._id ?? "";
      const itemCategoryId = displayItem.category_id ?? displayItem.category?.id ?? displayItem.category?._id ?? "";

      console.log("Loading registered item to form:", displayItem.item_name);

      // Populate form data for regular item
      setFormDataRegItem({
        sku: displayItem.sku,
        _id: displayItem._id,
        id: displayItem.id ?? itemId,
        stock_trace: displayItem.stock_trace,
        item_name: displayItem.item_name,
        item_image_url: displayItem.item_image_url,
        maximum_capacity: displayItem.maximum_capacity,
        uom_id: itemUomId,
        category_id: itemCategoryId,
        inventory_id: displayItem.inventory_id,
        item_update_datetime: displayItem.item_update_datetime,
        item_created_datetime: displayItem.item_created_datetime,
        __v: displayItem.__v,
        uom: {
          _id: displayItem.uom?._id ?? itemUomId,
          id: displayItem.uom?.id ?? itemUomId,
          symbol: displayItem.uom?.symbol,
          unit_name: displayItem.uom?.unit_name,
          __v: displayItem.uom?.__v,
        },
        category: {
          _id: displayItem.category?._id ?? itemCategoryId,
          id: displayItem.category?.id ?? itemCategoryId,
          brand: displayItem.category?.brand,
          type: displayItem.category?.type,
          __v: displayItem.category?.__v,
        },
        inventory: displayItem.inventory,
        availability: true
      });

      // Reset stock form with defaults for new item entry
      setFormDataStock(prev => ({
        ...prev,
        batch_code: "",
        quantity: "",
        threshold_limit: "",
        stock_price: "",
        retail_price: "",
        selling_price_per_kg: "",
        selling_price_per_liter: "",
        discount: 0,
        availability: true
      }));

      // Fetch existing stock entries for this SKU
      fetchStockEntries(displayItem.sku);

      // Hide return section
      setReturnItemSelected(false);
    }
    //item is added to the form as a return item
    else {
      console.log("Loading return item to form:", displayItem.item_name);

      // Populate form data for return item
      setFormDataRegItem({
        sku: displayItem.sku,
        _id: displayItem._id,
        id: displayItem.id ?? itemId,
        stock_trace: displayItem.stock_trace,
        item_name: displayItem.item_name,
        item_image_url: displayItem.item_image_url,
        maximum_capacity: displayItem.maximum_capacity,
        uom_id: displayItem.uom_id,
        category_id: displayItem.category_id,
        inventory_id: displayItem.inventory_id,
        item_update_datetime: displayItem.item_update_datetime,
        item_created_datetime: displayItem.item_created_datetime,
        __v: displayItem.__v,
        uom: {
          _id: displayItem.uom?._id,
          id: displayItem.uom?.id ?? displayItem.uom?._id,
          symbol: displayItem.uom?.symbol,
          unit_name: displayItem.uom?.unit_name,
          __v: displayItem.uom?.__v,
        },
        category: {
          _id: displayItem.category?._id,
          id: displayItem.category?.id ?? displayItem.category?._id,
          brand: displayItem.category?.brand,
          type: displayItem.category?.type,
          __v: displayItem.category?.__v,
        },
        inventory: displayItem.inventory,
        availability: true
      });

      // Reset return form fields
      setFormDataReturnItem({
        sku: "",
        stock_price: 0,
        retail_price: 0,
        batch_code: "",
        quantity: "",
        return_description: ""
      });

      // Fetch existing stock entries for this SKU
      fetchStockEntries(displayItem.sku);

      // Show return section
      setReturnItemSelected(true);
    }
  };

  // Method to set current date (reusable function)
  // Wrapped in useCallback (the original defined this as a plain function,
  // safe there because `setFormDataStock` was a same-component useState
  // setter that eslint recognizes as stable). Here `setFormDataStock` is a
  // hook parameter, so eslint can't prove that stability across the hook
  // boundary — useCallback makes this function's identity provably stable
  // too, which is required to correctly list it as an effect dependency
  // below without the effect re-running on every render.
  const setCurrentDateToExpired = useCallback(() => {
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
  }, [setFormDataStock]);

  // useEffect to set current date on component mount
  // Refetch when section becomes active
  useEffect(() => {
    if (isActive) {
    // Only set if not already set (e.g., for editing existing data)
    // if (!formDataStock.expired_datetime) {
    setCurrentDateToExpired();
    // }
    }
  }, [isActive, setCurrentDateToExpired]); // Empty dependency array to run once on mount



  const registerTransaction = async () => {
    // Validate transaction before proceeding
    if (!validateTransaction()) {
      statusLog.error("Please fix validation errors before submitting");
      setModal({ open: true, type: 'failed', description: "Please fill in all required fields" });
      return;
    }

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
        selling_price_per_kg: item.selling_price_per_kg || 0,
        selling_price_per_liter: item.selling_price_per_liter || 0,
        uom_symbol: item.uom?.symbol || item.uom_symbol || "",
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
        total_amount: totalAmount,

        exe_level: "medium",

        added_items: transformToAddedItems(), //contatins a list
        return_items: transformToReturnedItems() //contains a list
      };
      const response = await restockApi.create(requestData);

      if (response.status === "success") {
        setModal({ open: true, type: 'success', description: 'Restock transaction completed successfully' });
        statusLog.success("Restock transaction completed successfully");
      } else {
        setModal({ open: true, type: 'failed', description: response.message || 'Restock transaction failed' });
        statusLog.error("Restock transaction failed");
      }
    } catch (err) {
      setModal({ open: true, type: 'failed', description: err.message || 'An error occurred during the transaction' });
      statusLog.error("Restock transaction error");
    }
    finally {
      //repopulate items
      //fetchItems();
    }
  };

  return {
    modal,
    closeModal,
    invoiceGenerate,
    setInvoiceGenerate,
    transactionErrors,
    setTransactionErrors,
    transactionData,
    setTransactionData,
    handleTransactionDataInputChange,
    selectedStockItemList,
    selectedReturnItemList,
    stockTotal,
    returnTotal,
    _totalStockDiscount,
    _totalReturnDiscount,
    cashAmount,
    setCashAmount,
    finalDiscount,
    setFinalDiscount,
    totalAmount,
    changeAmount,
    addRegItemToForm,
    addReturnItemToForm,
    addNewRegItem,
    addDisposeItem,
    removeStockItemFromList,
    removeReturnItemFromList,
    setStockBatchCodeFromEntry,
    loadItemtoList,
    registerTransaction,
    clearTransactionForm,
  };
}
