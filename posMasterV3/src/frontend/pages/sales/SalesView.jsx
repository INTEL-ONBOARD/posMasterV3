import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import SalesItemCard from "../../components/SalesItemCard";
import { salesApi } from "../../api/localApi";
import { ChevronDown, User, Package, ShoppingCart, X, DollarSign, RefreshCw, Pause, Play, Trash2, ScanLine } from "lucide-react";
import StatusModal from "../../components/StatusModal.jsx";
import { localAuth } from "../../api/services/localAuth";
import { useReactiveData, TABLES } from "../../store";


import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import BillContent from "./layout/BillContent.jsx";
import BackIcon from "../../assets/back-icon/back_icon.jsx";
import MemEvaluationModal from "./modals/MemEvaluationModal.jsx";
import CartItemEditModal from "./modals/CartItemEditModal.jsx";
import CheckoutSummaryModal from "./modals/CheckoutSummaryModal.jsx";

// Default guest user
const GUEST_USER = {
  id: 0,
  _id: "guest",
  member_no: "GUEST",
  full_name: "Guest Customer",
  contact: "-",
  credit_balance: 0,
  credit_limit: 0,
  is_guest: true
};

/**
 * Custom hook for barcode scanner input
 * Barcode scanners typically send characters rapidly followed by Enter key
 * This hook captures that input pattern and returns the scanned barcode
 */
function useBarcodeScanner(onScan, enabled = true) {
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // If Enter key is pressed and we have buffered input
      if (e.key === "Enter" && barcodeBuffer.current.length > 0) {
        e.preventDefault();
        const scannedCode = barcodeBuffer.current.trim();
        barcodeBuffer.current = "";

        // Only process if it looks like a valid barcode (at least 3 characters)
        if (scannedCode.length >= 3) {
          onScan(scannedCode);
        }
        return;
      }

      // If time gap is too long (>100ms), likely manual typing - reset buffer
      // Barcode scanners typically send characters within 50ms of each other
      if (timeSinceLastKey > 100) {
        barcodeBuffer.current = "";
      }

      // Only capture alphanumeric characters and common barcode characters
      if (e.key.length === 1 && /^[a-zA-Z0-9\-_]$/.test(e.key)) {
        // Don't capture if user is focused on an input field
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.isContentEditable
        );

        if (!isInputFocused) {
          barcodeBuffer.current += e.key;

          // Clear buffer after 500ms of no input (scanner finished but no Enter)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            barcodeBuffer.current = "";
          }, 500);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan]);
}

export default function SalesView({ isActive }) {
  const billRef = useRef(null);
  const searchInputRef = useRef(null);
  const proceedBtnRef = useRef(null);
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });

  const focusSearch = () => {
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // Use reactive data hooks for stock items, categories, and users
  const { data: stockItemsRaw, loading: isLoading, refetch: refetchItems } = useReactiveData(
    TABLES.STOCK_ITEMS,
    null,
    { enabled: isActive }
  );

  const { data: categoriesData } = useReactiveData(
    TABLES.CATEGORIES,
    null,
    { enabled: isActive }
  );

  const { data: employees } = useReactiveData(
    TABLES.USERS,
    null,
    { enabled: isActive }
  );

  // Transform stock data for display (same as InventoryView.jsx)
  const inventoryItems = useMemo(() => {
    if (!stockItemsRaw || stockItemsRaw.length === 0) return [];
    return stockItemsRaw.map(stock => ({
      id: stock.id,
      stock_id: stock.id,
      item_id: stock.item_id,
      sku: stock.sku,
      item_name: stock.item_name,
      item_image_url: stock.item_image_url,
      maximum_capacity: stock.maximum_capacity || 100,
      batch_code: stock.batch_code,
      quantity: stock.quantity || 0,
      threshold_limit: stock.threshold_limit || 20,
      stock_price: stock.stock_price || 0,
      retail_price: stock.retail_price || 0,
      discount_price: stock.discount_price || 0,
      expiry_date: stock.expiry_date,
      exp_date: stock.expiry_date,
      availability: stock.availability,
      stock_availability: stock.availability,
      category: {
        id: stock.category_id,
        brand: stock.category_brand,
        type: stock.category_type
      },
      uom: {
        id: stock.uom_id,
        symbol: stock.uom_symbol,
        unit_name: stock.uom_unit_name
      }
    }));
  }, [stockItemsRaw]);

  // Extract unique category types
  const uniqueCategoryTypes = useMemo(() => {
    return Array.from(new Set((categoriesData || []).map(c => c.type)));
  }, [categoriesData]);

  // Customer/Member state - default to Guest
  const [selectedMember, setSelectedMember] = useState(GUEST_USER);
  const [modal, setModal] = useState(false);
  const closeModal = () => setModal(false);

  // Held sale state
  const [heldOrder, setHeldOrder] = useState(null); // the most recent held order
  const [releasedHeldOrder, setReleasedHeldOrder] = useState(null); // held order currently restored into cart

  // Cart item edit modal state
  const [cartItemModal, setCartItemModal] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const closeCartItemModal = () => {
    setCartItemModal(false);
    setSelectedCartItem(null);
  };

  // Checkout summary modal state
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(false);

  const closeCheckoutModal = () => {
    setCheckoutModal(false);
    // If sale was completed, clear the form now (after modal animation is done)
    if (saleCompleted) {
      clearForm();
      setSaleCompleted(false);
    }
  };

  // Handle member selection from modal
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    closeModal();
    focusSearch();
  };

  // Current user state
  const [currentUser, setCurrentUser] = useState(null);
  const [preparedBy, setPreparedBy] = useState("");

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await localAuth.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setPreparedBy(user.username || user.name || "");
        }
      } catch (error) {
        console.error('[SalesView] Error fetching current user:', error);
      }
    };

    if (isActive) {
      fetchCurrentUser();
      focusSearch();
      fetchHeldOrder();
    }
  }, [isActive]);

  // Fetch the most recent held order for this session
  const fetchHeldOrder = async () => {
    try {
      const response = await salesApi.getHeldOrders();
      if (response?.status === 'success' && response.data?.length > 0) {
        setHeldOrder(response.data[0]);
      } else {
        setHeldOrder(null);
      }
    } catch (e) {
      console.error('[SalesView] Failed to fetch held orders:', e);
    }
  };

  // Shift+Space opens the member selection modal
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.key === ' ' && e.shiftKey) {
        // Don't trigger if user is typing in an input/textarea
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  const [rightActiveSection, setRightActiveSection] = useState("items");
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastScannedCode, setLastScannedCode] = useState("");

  // Barcode scanner handler - finds item by SKU and adds to cart
  const handleBarcodeScan = useCallback((scannedCode) => {
    // Find item by SKU (case-insensitive)
    const item = inventoryItems.find(
      (i) => i.sku?.toLowerCase() === scannedCode.toLowerCase()
    );

    if (item) {
      loadItemtoList(item);
      setLastScannedCode(scannedCode);
      // Clear the visual indicator after 2 seconds
      setTimeout(() => setLastScannedCode(""), 2000);
    } else {
      setLastScannedCode("");
    }
  }, [inventoryItems]);

  // Enable barcode scanner when this view is active
  useBarcodeScanner(handleBarcodeScan, isActive);

  const removeItemFromList = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const loadItemtoList = (item) => {
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
      quantity: parseFloat(item.quantity) || 0,
      threshold_limit: parseFloat(item.threshold_limit) || 0,
      stock_price: parseFloat(item.stock_price) || 0,
      retail_price: parseFloat(item.retail_price) || 0,
      discount_price: parseFloat(item.discount_price) || 0,
      expired_datetime: item.exp_date,
      availability: item.stock_availability,
      uom: { symbol: item.uom?.symbol || "", unit_name: item.uom?.unit_name || "" },
      category: { brand: item.category?.brand || "", type: item.category?.type || "" },
      customer_discount: 0,
      customer_quantity: 1, // Default to 1 when adding
      uom_symbol: item.uom?.symbol
    };

    setSelectedItems(prev => {
      const exists = prev.find(item => item.id === newRegItem.id);
      if (exists) {
        // Increment quantity if already exists
        return prev.map(item =>
          item.id === newRegItem.id
            ? { ...item, customer_quantity: item.customer_quantity + 1 }
            : item
        );
      }
      return [...prev, newRegItem];
    });
  };

  // Calculate totals
  const stockTotal = selectedItems.reduce((total, item) => {
    const discountedPrice = item.retail_price - (item.customer_discount || 0);
    return total + (discountedPrice * item.customer_quantity);
  }, 0);

  const handleTableRowClick = (item) => {
    setSelectedCartItem(item);
    setCartItemModal(true);
  };

  // Open modal when clicking an item card in the right panel
  const handleItemCardClick = (item) => {
    // Build the cart-shaped item (same as loadItemtoList but open modal instead)
    const cartItem = {
      sku: item.sku,
      _id: item._id,
      id: item.id,
      stock_id: item.stock_id || item.id,
      stock_trace: item.stock_trace,
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      maximum_capacity: item.maximum_capacity,
      uom_id: item.uom_id,
      category_id: item.category_id,
      inventory_id: item.inventory_id,
      batch_code: item.batch_code,
      quantity: parseFloat(item.quantity) || 0,
      threshold_limit: parseFloat(item.threshold_limit) || 0,
      stock_price: parseFloat(item.stock_price) || 0,
      retail_price: parseFloat(item.retail_price) || 0,
      discount_price: parseFloat(item.discount_price) || 0,
      expired_datetime: item.exp_date,
      availability: item.stock_availability,
      uom: { symbol: item.uom?.symbol || "", unit_name: item.uom?.unit_name || "" },
      category: { brand: item.category?.brand || "", type: item.category?.type || "" },
      customer_discount: 0,
      customer_quantity: 1,
      uom_symbol: item.uom?.symbol
    };
    setSelectedCartItem(cartItem);
    setCartItemModal(true);
  };

  // Handle cart item update from modal (also handles adding new items via the card modal)
  const handleCartItemUpdate = (updatedItem) => {
    setSelectedItems(prev => {
      const exists = prev.some(item => item.id === updatedItem.id);
      if (exists) {
        return prev.map(item => item.id === updatedItem.id ? updatedItem : item);
      }
      // New item added via item card modal
      return [...prev, updatedItem];
    });
    setSearch("");
  };

  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability] = useState("All");

  const searchScanRef = useRef({ valueAtLastEnter: "" });

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setSearchLoading(true);
    setTimeout(() => setSearchLoading(false), 600);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const currentValue = search;
    const lastValue = searchScanRef.current.valueAtLastEnter;
    let newChars = (lastValue && currentValue.startsWith(lastValue))
      ? currentValue.slice(lastValue.length)
      : currentValue;
    const digitsOnly = newChars.replace(/\D/g, "");
    const isAllDigits = newChars.length > 0 && digitsOnly.length === newChars.length;
    let nextSearch;
    if (isAllDigits && digitsOnly.length >= 1 && digitsOnly.length <= 13) {
      nextSearch = digitsOnly;
    } else if (isAllDigits && digitsOnly.length > 13) {
      nextSearch = "";
    } else {
      nextSearch = currentValue;
    }
    setSearch(nextSearch);
    searchScanRef.current.valueAtLastEnter = nextSearch;
  };

  // Date formatting
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Generate invoice number
  const [invoiceNo, setInvoiceNo] = useState("");
  const generateNewInvoice = useCallback(async () => {
    try {
      const result = await window.electronAPI.sales.generateInvoiceNo();
      if (result?.data?.invoice_no) {
        setInvoiceNo(result.data.invoice_no);
      } else if (typeof result?.data === 'string') {
        setInvoiceNo(result.data);
      } else if (typeof result === 'string') {
        setInvoiceNo(result);
      }
    } catch {
      // Fallback: generate locally if IPC fails
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let fallback = 'INV';
      for (let i = 0; i < 8; i++) {
        fallback += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setInvoiceNo(fallback);
    }
  }, []);

  useEffect(() => {
    generateNewInvoice();
  }, [generateNewInvoice]);

  const interpretAvailability = (item) => {
    const a = item?.availability;
    if (typeof a === "boolean") return a;
    if (typeof a === "string") return a.toLowerCase() === "true";
    return Boolean(a);
  };

  const filteredItems = inventoryItems.filter((item) => {
    const matchesCategory = searchCategory === "All" || (item?.category && item.category.type === searchCategory);
    const isAvailable = interpretAvailability(item);
    const matchesAvailability = searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // Search by item name, SKU (product code), or item_code
    const searchLower = (search || "").toLowerCase();
    const matchesSearch = searchLower === "" ||
      (item?.item_name || "").toLowerCase().includes(searchLower) ||
      (item?.sku || "").toLowerCase().includes(searchLower) ||
      (item?.item_code || "").toLowerCase().includes(searchLower) ||
      (item?.batch_code || "").toLowerCase().includes(searchLower);

    return matchesCategory && matchesAvailability && matchesSearch;
  });

  const getSelectedMemberId = () => (
    selectedMember?.is_guest ? null : (selectedMember?.id || selectedMember?._id || null)
  );

  const buildSaleItemsPayload = () => selectedItems.map(item => ({
    item_id: item.item_id || item.id,
    stock_id: item.stock_id || item.id,
    batch_code: item.batch_code,
    item_name: item.item_name,
    sku: item.sku,
    quantity: item.customer_quantity,
    unit_price: item.retail_price,
    discount: item.customer_discount || 0,
    total_price: (item.retail_price - (item.customer_discount || 0)) * item.customer_quantity
  }));

  const buildSalePayload = ({
    paymentMethod = "cash",
    creditMonths = 0,
    totalAmount = stockTotal,
    finalDiscount = 0,
    cashAmount = 0,
    changeAmount = 0
  } = {}) => ({
    invoice_no: invoiceNo,
    member_id: getSelectedMemberId(),
    cashier_id: currentUser?.id || null,
    payment_method: paymentMethod,
    credit_duration: creditMonths ? `${creditMonths} months` : null,
    subtotal: stockTotal,
    discount: finalDiscount,
    total_amount: totalAmount,
    cash_received: cashAmount,
    change_amount: changeAmount,
    items: buildSaleItemsPayload()
  });

  const clearForm = () => {
    setSelectedItems([]);
    setSelectedMember(GUEST_USER);
    if (releasedHeldOrder) {
      setHeldOrder(releasedHeldOrder);
      setReleasedHeldOrder(null);
    }
    generateNewInvoice();
    focusSearch();
  };

  // Handle checkout from summary modal
  // Returns a promise that resolves when sale is complete (for success animation)
  const handleConfirmSale = async (checkoutData) => {
    const { finalDiscount, paymentMethod, creditMonths, cashAmount, totalAmount, changeAmount } = checkoutData;

    try {
      // Validate cart items before sending to backend
      for (const item of selectedItems) {
          const itemId = item.item_id || item.id;
          const stockId = item.stock_id || item.id;
          const qty = item.customer_quantity;
          if (!itemId || !stockId) {
              setStatusModal({ open: true, type: 'failed', description: `Item "${item.item_name || 'unknown'}" is missing required IDs` });
              return { success: false };
          }
          if (!Number.isFinite(qty) || qty <= 0) {
              setStatusModal({ open: true, type: 'failed', description: `Invalid quantity for "${item.item_name || 'unknown'}"` });
              return { success: false };
          }
      }

      const saleData = buildSalePayload({
        paymentMethod,
        creditMonths,
        totalAmount,
        finalDiscount,
        cashAmount,
        changeAmount
      });

      const response = releasedHeldOrder
        ? await salesApi.completeHeld(releasedHeldOrder.id, {
            member_id: saleData.member_id,
            cashier_id: saleData.cashier_id,
            payment_method: saleData.payment_method,
            credit_duration: saleData.credit_duration,
            subtotal: saleData.subtotal,
            discount: saleData.discount,
            total_amount: saleData.total_amount,
            cash_received: saleData.cash_received,
            change_amount: saleData.change_amount,
            items: saleData.items
          })
        : await salesApi.create(saleData);

      if (response.status === "success") {
        // Generate and print bill
        try {
            await generateBillPdf(checkoutData);
        } catch (printError) {
            console.error('[SalesView] Bill generation failed:', printError);
            setStatusModal({ open: true, type: 'failed', description: 'Sale saved but bill printing failed' });
        }
        setReleasedHeldOrder(null);
        await fetchHeldOrder();
        // Mark sale as completed - clearForm will be called when modal closes
        setSaleCompleted(true);
        // Return success for the modal to show animation
        return { success: true, data: response.data };
      } else {
        setStatusModal({ open: true, type: 'failed', description: response.message || "Failed to process sale" });
        throw new Error(response.message || "Failed to process sale");
      }
    } catch (error) {
      console.error("[SalesView] Error processing sale:", error);
      setStatusModal({ open: true, type: 'failed', description: "Failed to process sale" });
      throw error;
    }
  };

  // Open checkout modal
  const handleProceedClick = () => {
    if (selectedItems.length === 0) {
      setStatusModal({ open: true, type: 'failed', description: "Please add items to the sale" });
      return;
    }
    setCheckoutModal(true);
  };

  // Hold sale for later - saves to DB without completing payment or decrementing stock
  const handleHoldSale = async () => {
    if (selectedItems.length === 0) {
      setStatusModal({ open: true, type: 'failed', description: "No items to hold" });
      return;
    }

    const saleData = buildSalePayload();

    try {
      const response = await salesApi.hold(saleData);
      if (response.status === "success") {
        setStatusModal({ open: true, type: 'success', description: "Sale held. Click Release to resume." });
        clearForm();
        await fetchHeldOrder();
      } else {
        setStatusModal({ open: true, type: 'failed', description: response.message || "Failed to hold sale" });
      }
    } catch (error) {
      console.error("[SalesView] Error holding sale:", error);
      setStatusModal({ open: true, type: 'failed', description: "Failed to hold sale" });
    }
  };

  // Release held order — loads items back into cart
  const handleReleaseSale = () => {
    if (!heldOrder) return;

    if (selectedItems.length > 0) {
      setStatusModal({ open: true, type: 'failed', description: "Clear the current cart first before releasing the held sale" });
      return;
    }

    const restoredItems = (heldOrder.items || []).map(item => ({
      id: item.item_id,
      _id: item.item_id,
      stock_id: item.stock_id,
      item_id: item.item_id,
      sku: item.sku,
      item_name: item.item_name,
      item_image_url: item.item_image_url || null,
      batch_code: item.batch_code,
      retail_price: item.unit_price,
      stock_price: item.unit_price,
      customer_quantity: item.quantity,
      customer_discount: item.discount || 0,
      quantity: item.quantity,
      uom: { symbol: '', unit_name: '' },
      category: { brand: '', type: '' },
    }));

    setSelectedItems(restoredItems);
    setReleasedHeldOrder(heldOrder);
    setInvoiceNo(heldOrder.invoice_no || invoiceNo);

    // Restore member if not guest
    if (heldOrder.member && !heldOrder.member.is_guest) {
      setSelectedMember(heldOrder.member);
    } else {
      setSelectedMember(GUEST_USER);
    }

    setHeldOrder(null);
    setStatusModal({ open: true, type: 'success', description: "Held sale restored to cart" });
    focusSearch();
  };

  // Store checkout data for bill generation
  const checkoutDataRef = useRef(null);


// Thermal roll print settings. 80mm is the standard POS receipt width; change
// THERMAL_ROLL_WIDTH_MM to 58 for 58mm rolls if that is what the store uses.
const THERMAL_ROLL_WIDTH_MM = 80;
const THERMAL_PAGE_HEIGHT_MM = 297; // virtual page height used for slicing long bills
const THERMAL_SIDE_MARGIN_PT = 4;
const MM_TO_PT = 2.83465;

const generateBillPdf = async (checkoutData) => {
  try {
    if (!billRef.current) return;
    checkoutDataRef.current = checkoutData;

    const html2canvasScale = 2;

    const canvas = await html2canvas(billRef.current, {
      scale: html2canvasScale,
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    // Build a PDF page that matches the thermal roll width directly, so the
    // printer driver prints 1:1 instead of downscaling a half-A4 image.
    const rollWidthPt = THERMAL_ROLL_WIDTH_MM * MM_TO_PT;
    const rollPageHeightPt = THERMAL_PAGE_HEIGHT_MM * MM_TO_PT;

    const doc = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: [rollWidthPt, rollPageHeightPt]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const printableWidth = pageWidth - THERMAL_SIDE_MARGIN_PT * 2;
    const printableHeight = pageHeight;

    // Canvas px -> PDF pt.
    const pxToPt = 0.75 / html2canvasScale;
    const imgWidthPt = canvas.width * pxToPt;
    const scaleToRoll = printableWidth / imgWidthPt;

    let positionYpx = 0;
    let pageNumber = 0;

    while (positionYpx < canvas.height) {
      const maxSliceHeightPx = Math.floor(
        printableHeight / pxToPt / scaleToRoll
      );

      const sliceHeightPx = Math.min(canvas.height - positionYpx, maxSliceHeightPx);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;

      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to create 2D context for slice canvas");

      ctx.drawImage(
        canvas,
        0,
        positionYpx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      const sliceData = sliceCanvas.toDataURL("image/png");
      const sliceHeightPt = sliceHeightPx * pxToPt * scaleToRoll;

      if (pageNumber > 0) doc.addPage();
      doc.addImage(
        sliceData,
        "PNG",
        THERMAL_SIDE_MARGIN_PT,
        0,
        printableWidth,
        sliceHeightPt
      );

      positionYpx += sliceHeightPx;
      pageNumber++;
    }

    const arrayBuffer = doc.output("arraybuffer");
    window.electronAPI.sendPrintSilent(arrayBuffer);
  } catch (error) {
    console.error("generatePdf error:", error);
  }
};



  const stock_items = selectedItems.map((item) => ({
    ...item,
    total_price: (item.retail_price - (item.customer_discount || 0)) * item.customer_quantity,
  }));

  // Bill data uses checkout ref for payment details
  const billData = {
    invoiceNo: invoiceNo,
    cashier_name: currentUser?.username || "-",
    payment_method: checkoutDataRef.current?.paymentMethod || "cash",
    date_time: formattedDate,
    member_no: selectedMember?.member_no || "-",
    stock_items: stock_items,
    totalAmount: stockTotal,
    discountAmount: checkoutDataRef.current?.finalDiscount || 0,
    finalAmount: checkoutDataRef.current?.totalAmount || stockTotal,
    cashAmount: checkoutDataRef.current?.cashAmount || 0,
    changeAmount: checkoutDataRef.current?.changeAmount || 0,
  };

  const formatCurrency = (amount) => `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
      {/* Off-screen bill content */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <BillContent ref={billRef} billData={billData} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full flex flex-col p-4 min-w-0 overflow-hidden">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm mb-4 p-4 shrink-0 border border-slate-100">
          <div className="flex items-center gap-5">
            {/* Customer Info Card */}
            <div
              onClick={() => setModal(true)}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-xl cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] shrink-0 ${
                selectedMember?.is_guest
                  ? "bg-gradient-to-r from-slate-700 to-slate-600"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Customer</p>
                <p className="text-white font-bold text-base truncate max-w-[140px]">{selectedMember?.full_name || "Guest"}</p>
                <p className="text-white/60 text-[11px] font-medium">{selectedMember?.member_no || "Walk-in"}</p>
              </div>
              <ChevronDown className="w-5 h-5 text-white/60" />
            </div>

            {/* Date Card */}
            <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 shrink-0">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Date</p>
              <p className="text-slate-800 font-bold text-lg">{formattedDate}</p>
            </div>

            {/* Prepared By Card */}
            <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 shrink-0">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Prepared By</p>
              <p className="text-slate-800 font-bold text-lg">
                {preparedBy ? `${preparedBy} (You)` : "—"}
              </p>
            </div>

            {/* Invoice Card */}
            <div className="bg-slate-50 rounded-xl px-5 py-3 border border-slate-100 shrink-0">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Invoice No</p>
              <p className="text-slate-800 font-bold text-lg tracking-wider">{invoiceNo}</p>
            </div>

            {/* Barcode Scanner Indicator */}
            {lastScannedCode && (
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl px-4 py-2 flex items-center gap-2 animate-pulse shrink-0">
                <ScanLine className="w-5 h-5 text-white" />
                <div>
                  <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Scanned</p>
                  <p className="text-white font-bold text-sm">{lastScannedCode}</p>
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-w-0"></div>

            {/* Refresh & Clear Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => refetchItems()}
                className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                title="Refresh Items"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={clearForm}
                className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-0 border border-slate-100">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="grid grid-cols-12 gap-4 px-6 py-4">
              <div className="col-span-1 text-[11px] font-bold text-slate-300 uppercase tracking-wider">#</div>
              <div className="col-span-4 text-[11px] font-bold text-slate-300 uppercase tracking-wider">Item Details</div>
              <div className="col-span-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider text-center">Qty</div>
              <div className="col-span-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider text-right">Unit Price</div>
              <div className="col-span-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider text-right">Total</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-500">No items added yet</p>
                <p className="text-sm text-slate-400 mt-1">Click "Add Items" from the right panel</p>
              </div>
            ) : (
              selectedItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleTableRowClick(item)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-all border-b border-slate-100 hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-transparent group"
                >
                  <div className="col-span-1">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-700 text-sm font-bold flex items-center justify-center transition-colors">
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800 transition-colors">{item.item_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-mono">{item.sku}</span>
                      {item.batch_code && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                          {item.batch_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center justify-center px-4 py-1.5 bg-emerald-100 rounded-xl text-sm font-bold text-emerald-700">
                      {item.customer_quantity}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-slate-500 tabular-nums font-medium">{formatCurrency(item.retail_price)}</span>
                    {item.customer_discount > 0 && (
                      <p className="text-[10px] text-orange-500 font-medium">-{formatCurrency(item.customer_discount)}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-slate-800 tabular-nums">
                      {formatCurrency((item.retail_price - (item.customer_discount || 0)) * item.customer_quantity)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItemFromList(item.id); }}
                      className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Action Cards */}
      <div className="w-[320px] bg-gradient-to-b from-slate-100 to-slate-50 h-full p-4 flex flex-col gap-3 shrink-0 border-l border-slate-200">
        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Items List View */}
          <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="mb-3">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search by name, SKU, or code..."
                  className="w-full pl-4 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey && selectedItems.length > 0) {
                      e.preventDefault();
                      proceedBtnRef.current?.focus();
                    } else if (e.key === 'Tab' && e.shiftKey && selectedItems.length > 0) {
                      e.preventDefault();
                      handleProceedClick();
                    } else {
                      handleSearchKeyDown(e);
                    }
                  }}
                />
              </div>
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
              >
                <option value="All">All Categories</option>
                {uniqueCategoryTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-3">
              {(isLoading || searchLoading) ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
                  <span className="text-slate-500 text-sm font-medium">Loading items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">No items found</span>
                  <span className="text-xs text-slate-400 mt-1">Try a different search</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <SalesItemCard key={item.id ?? item._id} item={item} onOpen={() => handleItemCardClick(item)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer - Action Bar */}
        <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-lg mt-3 overflow-hidden">
          {/* Items & Total Summary */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500 font-medium">Items:</span>
                <span className="text-lg font-bold text-slate-800">{selectedItems.length}</span>
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Amount</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums">{formatCurrency(stockTotal)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 flex flex-col gap-2">
            {/* Clear & Hold Row */}
            <div className="flex gap-2">
              <button
                onClick={clearForm}
                disabled={selectedItems.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-red-200 text-red-500 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              {heldOrder ? (
                <button
                  onClick={handleReleaseSale}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 border-2 border-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 hover:border-amber-600 transition-all text-sm"
                >
                  <Play className="w-4 h-4" />
                  Release
                </button>
              ) : (
                <button
                  onClick={handleHoldSale}
                  disabled={selectedItems.length === 0 || Boolean(releasedHeldOrder)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-amber-200 text-amber-600 rounded-xl font-semibold hover:bg-amber-50 hover:border-amber-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pause className="w-4 h-4" />
                  {releasedHeldOrder ? "Held" : "Hold"}
                </button>
              )}
            </div>

            {/* Proceed Button */}
            <button
              ref={proceedBtnRef}
              onClick={handleProceedClick}
              disabled={selectedItems.length === 0}
              className="w-full flex items-center justify-center px-4 py-3.5 bg-gradient-to-r from-[#1A318C] to-[#2541B2] text-white rounded-xl font-bold hover:from-[#162970] hover:to-[#1E3699] transition-all text-base disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed shadow-lg shadow-[#1A318C]/30 disabled:shadow-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProceedClick();
              }}
            >
              Proceed
            </button>
          </div>
        </div>
      </div>

      {/* Member Selection Modal */}
      <MemEvaluationModal
        isOpen={modal}
        closeModal={closeModal}
        onSelectMember={handleSelectMember}
        currentMember={selectedMember}
      />

      {/* Cart Item Edit Modal */}
      <CartItemEditModal
        isOpen={cartItemModal}
        closeModal={closeCartItemModal}
        item={selectedCartItem}
        onUpdate={handleCartItemUpdate}
        onRemove={removeItemFromList}
        onClose={focusSearch}
      />

      {/* Checkout Summary Modal */}
      <CheckoutSummaryModal
        isOpen={checkoutModal}
        closeModal={closeCheckoutModal}
        selectedItems={selectedItems}
        selectedMember={selectedMember}
        stockTotal={stockTotal}
        onConfirmSale={handleConfirmSale}
      />

      <StatusModal
        isOpen={statusModal.open}
        closeModal={() => setStatusModal({ open: false, type: null, description: "" })}
        type={statusModal.type}
        description={statusModal.description}
        context="sale"
      />
    </div>
  );
}
