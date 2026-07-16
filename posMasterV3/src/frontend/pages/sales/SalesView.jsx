import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import SalesItemCard from "../../components/SalesItemCard";
import { salesApi } from "../../api/localApi";
import { ChevronDown, User, Package, ShoppingCart, X, DollarSign, RefreshCw, Pause, Play, Trash2, ScanLine, Receipt } from "lucide-react";
import StatusModal from "../../components/StatusModal.jsx";
import { localAuth } from "../../api/services/localAuth";
import { restockApi } from "../../api/localApi";
import { useReactiveData, TABLES } from "../../store";


import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import BillContent from "./layout/BillContent.jsx";
import BackIcon from "../../assets/back-icon/back_icon.jsx";
import MemEvaluationModal from "./modals/MemEvaluationModal.jsx";
import CartItemEditModal from "./modals/CartItemEditModal.jsx";
import CheckoutSummaryModal from "./modals/CheckoutSummaryModal.jsx";
import { useScannerSearch } from "../../hooks/useScannerSearch";
import { useBranchContext } from "../../context/BranchContext.jsx";
import { getEffectiveSellingPrice } from "../../util/common/uomPricing";

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

// Thermal roll print settings. 80mm printers usually expose 576 printable dots.
// The rendered receipt is converted to a monochrome ESC/POS raster image so
// Sinhala text and the current receipt layout print without relying on fonts.
//
// THERMAL_ROLL_WIDTH_MM is the PAPER width; the printhead only images
// THERMAL_PRINT_WIDTH_DOTS across (~72mm), leaving ~4mm dead on each edge.
// Receipt content must be sized to the printable width, never the paper width,
// or the right edge is physically clipped.
const THERMAL_ROLL_WIDTH_MM = 80;
const THERMAL_PAGE_HEIGHT_MM = 297;
const THERMAL_PRINT_WIDTH_DOTS = 576;
const THERMAL_PRINT_DPI = 203;
const THERMAL_PRINT_WIDTH_MM = (THERMAL_PRINT_WIDTH_DOTS / THERMAL_PRINT_DPI) * 25.4;
const THERMAL_RASTER_CHUNK_HEIGHT = 256;
const THERMAL_IMAGE_THRESHOLD = 190;
const THERMAL_TRAILING_FEED_LINES = 5;
const THERMAL_NETWORK_PRINT_TIMEOUT_MS = 5000;
const RECEIPT_CANVAS_SCALE = 2;
const MM_TO_PT = 2.83465;

const waitForBrowserPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

function appendBytes(target, bytes) {
  for (const byte of bytes) target.push(byte);
}

function buildEscposRasterCommand(sourceCanvas) {
  if (!sourceCanvas || sourceCanvas.width <= 0 || sourceCanvas.height <= 0) {
    throw new Error("Receipt image is empty");
  }

  const targetWidth = THERMAL_PRINT_WIDTH_DOTS;
  const targetHeight = Math.max(
    1,
    Math.ceil((sourceCanvas.height * targetWidth) / sourceCanvas.width)
  );
  const rasterCanvas = document.createElement("canvas");
  rasterCanvas.width = targetWidth;
  rasterCanvas.height = targetHeight;

  const rasterCtx = rasterCanvas.getContext("2d", { willReadFrequently: true });
  if (!rasterCtx) throw new Error("Failed to create receipt raster context");
  rasterCtx.fillStyle = "#ffffff";
  rasterCtx.fillRect(0, 0, targetWidth, targetHeight);
  rasterCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  const { data } = rasterCtx.getImageData(0, 0, targetWidth, targetHeight);
  const widthBytes = Math.ceil(targetWidth / 8);
  const raster = new Uint8Array(widthBytes * targetHeight);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const pixelIndex = (y * targetWidth + x) * 4;
      const alpha = data[pixelIndex + 3];
      if (alpha < 128) continue;

      const red = data[pixelIndex];
      const green = data[pixelIndex + 1];
      const blue = data[pixelIndex + 2];
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

      if (luminance < THERMAL_IMAGE_THRESHOLD) {
        const byteIndex = y * widthBytes + (x >> 3);
        raster[byteIndex] |= 0x80 >> (x & 7);
      }
    }
  }

  const command = [];
  appendBytes(command, [0x1b, 0x40]); // Initialize printer
  appendBytes(command, [0x1b, 0x61, 0x01]); // Center raster image

  for (let y = 0; y < targetHeight; y += THERMAL_RASTER_CHUNK_HEIGHT) {
    const chunkHeight = Math.min(THERMAL_RASTER_CHUNK_HEIGHT, targetHeight - y);
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = chunkHeight & 0xff;
    const yH = (chunkHeight >> 8) & 0xff;

    appendBytes(command, [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    const start = y * widthBytes;
    const end = start + chunkHeight * widthBytes;
    for (let index = start; index < end; index += 1) {
      command.push(raster[index]);
    }
  }

  appendBytes(command, [0x1b, 0x61, 0x00]); // Left align after image
  appendBytes(command, Array(THERMAL_TRAILING_FEED_LINES).fill(0x0a));
  appendBytes(command, [0x1d, 0x56, 0x00]); // Full cut where supported

  return new Uint8Array(command);
}

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
  const [receiptCheckoutData, setReceiptCheckoutData] = useState(null);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [receiptPreviewData, setReceiptPreviewData] = useState(null);
  const [lastReceiptData, setLastReceiptData] = useState(null);
  const { currentBranch } = useBranchContext();

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
      selling_price_per_kg: stock.selling_price_per_kg || 0,
      selling_price_per_liter: stock.selling_price_per_liter || 0,
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
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

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

  const resolvedBranchId = useMemo(() => (
    currentBranch?.id ||
    currentBranch?.branchId ||
    currentUser?.branchId ||
    currentUser?.branch_id ||
    null
  ), [currentBranch, currentUser]);

  const isAdminUser = useCallback((user = currentUser) => {
    const roles = Array.isArray(user?.roles)
      ? user.roles
      : (typeof user?.roles === 'string' ? [user.roles] : []);

    return roles.some((role) => {
      const value = String(role || '').toLowerCase();
      return value === 'admin' || value === 'superadmin';
    });
  }, [currentUser]);

  // Fetch the most recent held order for this session
  const fetchHeldOrder = useCallback(async (user = currentUser) => {
    try {
      if (isAdminUser(user)) {
        setHeldOrder(null);
        return;
      }

      const response = await salesApi.getHeldOrders();
      if (response?.status === 'success' && response.data?.length > 0) {
        const currentUserId = String(user?.id || user?._id || user?.userId || '');
        const currentBranchId = String(user?.branch_id || user?.branchId || '');
        const currentSessionId = getSalesSessionId();

        const nextHeldOrder = response.data.find((row) => {
          const rowCashierId = String(row?.cashier_id || row?.cashierId || row?.createdBy || row?.created_by || '');
          const rowBranchId = String(row?.branchId || row?.branch_id || '');
          const rowSessionId = String(row?.sales_session_id || row?.session_id || row?.sessionId || '');

          if (!currentUserId || rowCashierId !== currentUserId) return false;
          if (currentBranchId && rowBranchId && rowBranchId !== currentBranchId) return false;
          if (rowSessionId !== currentSessionId) return false;
          return true;
        }) || null;

        setHeldOrder(nextHeldOrder);
      } else {
        setHeldOrder(null);
      }
    } catch (e) {
      console.error('[SalesView] Failed to fetch held orders:', e);
    }
  }, [currentUser, isAdminUser]);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await localAuth.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setPreparedBy(user.username || user.name || "");
          return user;
        }
      } catch (error) {
        console.error('[SalesView] Error fetching current user:', error);
      }
      return null;
    };

    if (isActive) {
      focusSearch();
      (async () => {
        const user = await fetchCurrentUser();
        await fetchHeldOrder(user);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
  }, [isActive, fetchHeldOrder]);

  const [selectedItems, setSelectedItems] = useState([]);
  const [lastScannedCode, setLastScannedCode] = useState("");

  const removeItemFromList = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const getCartUnitPrice = (item) => (
    Number(item?.unit_price ?? item?.unitPrice ?? getEffectiveSellingPrice(item) ?? 0)
  );

  const buildCartItem = (item, customerQuantity = 1) => {
    const unitPrice = getEffectiveSellingPrice(item);

    return {
      sku: item.sku,
      _id: item._id,
      id: item.id,
      item_id: item.item_id || item.id,
      itemId: item.itemId || item.item_id || item.id,
      stock_id: item.stock_id || item.id,
      stockId: item.stockId || item.stock_id || item.id,
      stock_trace: item.stock_trace,
      item_name: item.item_name,
      item_image_url: item.item_image_url,
      maximum_capacity: item.maximum_capacity,
      uom_id: item.uom_id,
      category_id: item.category_id,
      inventory_id: item.inventory_id,
      batch_code: item.batch_code,
      batchCode: item.batchCode || item.batch_code,
      quantity: parseFloat(item.quantity) || 0,
      threshold_limit: parseFloat(item.threshold_limit) || 0,
      stock_price: parseFloat(item.stock_price) || 0,
      retail_price: unitPrice,
      unit_price: unitPrice,
      selling_price_per_kg: parseFloat(item.selling_price_per_kg) || 0,
      selling_price_per_liter: parseFloat(item.selling_price_per_liter) || 0,
      discount_price: parseFloat(item.discount_price) || 0,
      expired_datetime: item.exp_date || item.expired_datetime,
      availability: item.stock_availability ?? item.availability,
      uom: { symbol: item.uom?.symbol || item.uom_symbol || "", unit_name: item.uom?.unit_name || "" },
      category: { brand: item.category?.brand || "", type: item.category?.type || "" },
      customer_discount: 0,
      customer_quantity: customerQuantity,
      uom_symbol: item.uom?.symbol || item.uom_symbol || ""
    };
  };

  const loadItemtoList = (item) => {
    const newRegItem = buildCartItem(item, 1);

    setSelectedItems(prev => {
      const exists = prev.find(item => item.id === newRegItem.id);
      if (exists) {
        // Increment quantity by 0.5 for decimal-supported units like KG/Liter.
        const canUseDecimalQuantity = supportsDecimalSaleQuantity(exists);
        const increment = canUseDecimalQuantity ? 0.5 : 1;
        return prev.map(item =>
          item.id === newRegItem.id
            ? {
                ...item,
                customer_quantity: canUseDecimalQuantity
                  ? Math.round((item.customer_quantity + increment) * 100) / 100
                  : item.customer_quantity + increment
              }
            : item
        );
      }
      return [...prev, newRegItem];
    });
  };

  // Barcode scanner handler - finds item by SKU and adds to cart
  const handleBarcodeScan = useCallback((scannedCode) => {
    const item = inventoryItems.find(
      (i) => i.sku?.toLowerCase() === scannedCode.toLowerCase()
    );

    if (item) {
      loadItemtoList(item);
      setLastScannedCode(scannedCode);
      setTimeout(() => setLastScannedCode(""), 2000);
    } else {
      setLastScannedCode("");
    }
  // loadItemtoList uses functional state updates, so this handler only needs the latest inventory list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryItems]);

  // Enable barcode scanner when this view is active
  useBarcodeScanner(handleBarcodeScan, isActive);

  // Calculate totals
  const stockTotal = selectedItems.reduce((total, item) => {
    const discountedPrice = getCartUnitPrice(item) - (item.customer_discount || 0);
    return total + (discountedPrice * item.customer_quantity);
  }, 0);

  const handleTableRowClick = (item) => {
    setSelectedCartItem(item);
    setCartItemModal(true);
  };

  // Open modal when clicking an item card in the right panel
  const handleItemCardClick = (item) => {
    const cartItem = buildCartItem(item, 1);
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

  const { handleSearch, handleSearchKeyDown } = useScannerSearch({
    setSearch,
    setSearchLoading
  });

  // Date formatting
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Generate invoice number
  const [invoiceNo, setInvoiceNo] = useState("");
  const generateNewInvoice = useCallback(async () => {
    if (!resolvedBranchId) {
      setInvoiceNo("");
      return;
    }
    try {
      const result = await salesApi.generateInvoiceNo();
      if (result?.data?.invoice_no) {
        setInvoiceNo(result.data.invoice_no);
      } else if (typeof result?.data === 'string') {
        setInvoiceNo(result.data);
      } else if (typeof result === 'string') {
        setInvoiceNo(result);
      }
    } catch (error) {
      console.error("[SalesView] Invoice number generation failed:", error);
      setInvoiceNo("");
      setStatusModal({
        open: true,
        type: "failed",
        description: error?.message || "Online invoice generation failed. Check the backend connection before processing sales."
      });
    }
  }, [resolvedBranchId]);

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

  const getSalesSessionId = () => {
    const storageKey = 'sales_session_id';
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = window.crypto?.randomUUID?.() || `sales-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(storageKey, next);
    return next;
  };

  const buildSaleItemsPayload = () => selectedItems.map((item) => {
    const itemId = item.itemId || item.item_id || item.id || item._id || null;
    const stockId = item.stockId || item.stock_id || item.stock?.id || item.id || null;
    const batchCode = item.batchCode || item.batch_code || item.batch || null;
    const unitPrice = getCartUnitPrice(item);
    const discount = Number(item.discount ?? item.customer_discount ?? 0);
    const quantity = Number(item.customer_quantity ?? item.quantity ?? 0);
    const totalPrice = (unitPrice - discount) * quantity;

    return {
      itemId,
      item_id: itemId,
      stockId,
      stock_id: stockId,
      batchCode,
      batch_code: batchCode,
      item_name: item.item_name,
      sku: item.sku,
      quantity,
      unitPrice,
      unit_price: unitPrice,
      discount,
      totalPrice,
      total_price: totalPrice,
      item_image_url: item.item_image_url || null,
      uom_symbol: item.uom?.symbol || item.uom_symbol || "",
      selling_price_per_kg: Number(item.selling_price_per_kg || 0),
      selling_price_per_liter: Number(item.selling_price_per_liter || 0)
    };
  });

  const buildSalePayload = ({
    paymentMethod = "cash",
    creditMonths = 0,
    totalAmount = stockTotal,
    finalDiscount = 0,
    cashAmount = 0,
    changeAmount = 0
  } = {}) => ({
    invoice_no: invoiceNo,
    sales_session_id: getSalesSessionId(),
    branchId: resolvedBranchId,
    branch_id: resolvedBranchId,
    member_id: getSelectedMemberId(),
    member_name: selectedMember?.is_guest ? null : (selectedMember?.full_name || null),
    cashier_id: currentUser?.id || currentUser?._id || currentUser?.userId || null,
    cashier_name: currentUser?.username || currentUser?.name || null,
    payment_method: paymentMethod,
    credit_duration: creditMonths ? `${creditMonths} months` : null,
    subtotal: stockTotal,
    discount: finalDiscount,
    total_amount: totalAmount,
    cash_received: cashAmount,
    change_amount: changeAmount,
    items: buildSaleItemsPayload()
  });

  const buildHeldOrderSnapshot = (saleRecord, fallbackItems = []) => {
    if (!saleRecord) return null;

    return {
      ...saleRecord,
      invoice_no: saleRecord.invoice_no || saleRecord.invoiceNo || invoiceNo,
      invoiceNo: saleRecord.invoiceNo || saleRecord.invoice_no || invoiceNo,
      sales_session_id: saleRecord.sales_session_id || saleRecord.salesSessionId || getSalesSessionId(),
      salesSessionId: saleRecord.salesSessionId || saleRecord.sales_session_id || getSalesSessionId(),
      branchId: saleRecord.branchId || saleRecord.branch_id || resolvedBranchId,
      branch_id: saleRecord.branch_id || saleRecord.branchId || resolvedBranchId,
      cashierId: saleRecord.cashierId || saleRecord.cashier_id || currentUser?.id || currentUser?._id || null,
      cashier_id: saleRecord.cashier_id || saleRecord.cashierId || currentUser?.id || currentUser?._id || null,
      cashierName: saleRecord.cashierName || saleRecord.cashier_name || currentUser?.username || currentUser?.name || null,
      cashier_name: saleRecord.cashier_name || saleRecord.cashierName || currentUser?.username || currentUser?.name || null,
      items: Array.isArray(saleRecord.items) && saleRecord.items.length > 0 ? saleRecord.items : fallbackItems
    };
  };

  const getHeldSaleId = (sale) => sale?.id || sale?._id || sale?.saleId || sale?.sale_id || null;

  const getHeldSaleMember = (sale) => {
    if (!sale) return null;
    const memberId = sale.memberId || sale.member_id || null;
    const memberName = sale.memberName || sale.member_name || null;

    if (sale.member && typeof sale.member === 'object') {
      return sale.member;
    }

    if (!memberId && !memberName) {
      return null;
    }

    return {
      id: memberId,
      _id: memberId,
      member_id: memberId,
      member_no: sale.member_no || sale.memberNo || '',
      full_name: memberName || 'Member',
      contact: sale.member_contact || sale.contact || '',
      is_guest: false
    };
  };

  const supportsDecimalSaleQuantity = (item) => {
    const uomValue = String(
      item?.uom?.symbol ||
      item?.uom_symbol ||
      item?.uom?.unit_name ||
      ""
    ).trim().toLowerCase();

    return [
      "kg",
      "kilogram",
      "kilograms",
      "l",
      "liter",
      "liters",
      "litre",
      "litres"
    ].includes(uomValue);
  };

  const mergeHeldSaleItems = (items = []) =>
    items.map((item) => ({
      ...item,
      itemId: item.itemId || item.item_id || item.id || item._id || null,
      item_id: item.item_id || item.itemId || item.id || item._id || null,
      stockId: item.stockId || item.stock_id || item.id || item._id || null,
      stock_id: item.stock_id || item.stockId || item.id || item._id || null,
      batchCode: item.batchCode || item.batch_code || item.batch || null,
      batch_code: item.batch_code || item.batchCode || item.batch || null,
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? item.retail_price ?? 0),
      unit_price: Number(item.unit_price ?? item.unitPrice ?? item.retail_price ?? 0),
      discount: Number(item.discount ?? item.customer_discount ?? 0),
      quantity: Number(item.quantity ?? item.customer_quantity ?? 0),
      customer_quantity: Number(item.customer_quantity ?? item.quantity ?? 0)
    }));

  const clearForm = () => {
    setSelectedItems([]);
    setSelectedMember(GUEST_USER);
    setReleasedHeldOrder(null);
    generateNewInvoice();
    focusSearch();
  };

  const openClearConfirm = () => {
    if (selectedItems.length === 0) return;
    setIsClearConfirmOpen(true);
  };

  const closeClearConfirm = () => {
    setIsClearConfirmOpen(false);
  };

  const confirmClearCart = () => {
    clearForm();
    closeClearConfirm();
  };

  // Handle checkout from summary modal
  // Returns a promise that resolves when sale is complete (for success animation)
  const handleConfirmSale = async (checkoutData) => {
    const { finalDiscount, paymentMethod, creditMonths, cashAmount, totalAmount, changeAmount } = checkoutData;

    try {
      if (!resolvedBranchId) {
        setStatusModal({
          open: true,
          type: 'failed',
          description: 'Select a branch before processing a sale'
        });
        return { success: false };
      }

      if (!invoiceNo) {
        setStatusModal({
          open: true,
          type: 'failed',
          description: 'Online invoice number is required before processing a sale'
        });
        await generateNewInvoice();
        return { success: false };
      }

      const liveStockBySku = new Map();

      // Validate cart items before sending to backend
      for (const item of selectedItems) {
        const itemId = item.item_id || item.id;
        const stockId = item.stock_id || item.id;
        const qty = item.customer_quantity;

        if (!itemId || !stockId) {
          setStatusModal({
            open: true,
            type: 'failed',
            description: `Item "${item.item_name || 'unknown'}" is missing required IDs`
          });
          return { success: false };
        }

        if (!Number.isFinite(qty) || qty <= 0) {
          setStatusModal({
            open: true,
            type: 'failed',
            description: `Invalid quantity for "${item.item_name || 'unknown'}"`
          });
          return { success: false };
        }

        if (!supportsDecimalSaleQuantity(item) && !Number.isInteger(qty)) {
          setStatusModal({
            open: true,
            type: 'failed',
            description: `Only KG and Liter items can use decimal quantities. "${item.item_name || 'unknown'}" must be a whole number.`
          });
          return { success: false };
        }

        let liveBatches = liveStockBySku.get(item.sku);
        if (!liveBatches) {
          const liveResponse = await restockApi.getStockData(item.sku, resolvedBranchId);
          liveBatches = Array.isArray(liveResponse?.data) ? liveResponse.data : [];
          liveStockBySku.set(item.sku, liveBatches);
        }

        const currentStock = liveBatches.find((stock) =>
          String(stock?.stock_id ?? stock?.id ?? stock?.stockId ?? '') === String(stockId) ||
          String(stock?.batch_code ?? stock?.batchCode ?? '') === String(item.batch_code || item.batchCode || '')
        );

        if (!currentStock) {
          setStatusModal({
            open: true,
            type: 'failed',
            description: `Stock batch for "${item.item_name || 'unknown'}" was not found in the selected branch`
          });
          return { success: false };
        }

        const availableQty = Number(currentStock.qty ?? currentStock.quantity ?? 0);
        if (availableQty < Number(qty)) {
          setStatusModal({
            open: true,
            type: 'failed',
            description: `Insufficient stock for "${item.item_name || 'unknown'}". Available: ${availableQty}, requested: ${qty}`
          });
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

      const restoredHeldSaleId = getHeldSaleId(releasedHeldOrder);
      if (releasedHeldOrder && !restoredHeldSaleId) {
        setStatusModal({ open: true, type: 'failed', description: 'Unable to complete restored held sale: missing sale ID' });
        return { success: false };
      }

      if (releasedHeldOrder) {
        const heldMember = getHeldSaleMember(releasedHeldOrder);
        const heldBranchId = releasedHeldOrder.branchId || releasedHeldOrder.branch_id || resolvedBranchId || currentUser?.branchId || currentUser?.branch_id || null;
        const heldCashierId = releasedHeldOrder.cashierId || releasedHeldOrder.cashier_id || currentUser?.id || currentUser?._id || null;
        const heldCashierName = releasedHeldOrder.cashierName || releasedHeldOrder.cashier_name || currentUser?.username || currentUser?.name || null;

        saleData.saleId = restoredHeldSaleId;
        saleData.sale_id = restoredHeldSaleId;
        saleData.branchId = heldBranchId;
        saleData.branch_id = heldBranchId;
        saleData.memberId = heldMember?.id || saleData.memberId || null;
        saleData.member_id = heldMember?.id || saleData.member_id || null;
        saleData.memberName = heldMember?.full_name || saleData.memberName || null;
        saleData.member_name = heldMember?.full_name || saleData.member_name || null;
        saleData.cashierId = heldCashierId;
        saleData.cashier_id = heldCashierId;
        saleData.cashierName = heldCashierName;
        saleData.cashier_name = heldCashierName;
        saleData.items = mergeHeldSaleItems(saleData.items);
      }

      const response = releasedHeldOrder
        ? await salesApi.completeHeld(restoredHeldSaleId, saleData)
        : await salesApi.create(saleData);

      if (response.status === "success") {
        setLastReceiptData(buildBillDataSnapshot(checkoutData));
        // Generate and print bill
        try {
            await printReceipt(checkoutData);
        } catch (printError) {
            console.error('[SalesView] Bill generation failed:', printError);
            setStatusModal({ open: true, type: 'failed', description: 'Sale saved but bill printing failed' });
        }
        if (releasedHeldOrder) {
          setHeldOrder(null);
          await fetchHeldOrder(currentUser);
        }
        setReleasedHeldOrder(null);
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
      setStatusModal({
        open: true,
        type: 'failed',
        description: error?.message || "Failed to process sale"
      });
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
        const heldSnapshot = buildHeldOrderSnapshot(response.data || saleData, saleData.items);
        if (heldSnapshot) {
          setHeldOrder(heldSnapshot);
        }
        setReleasedHeldOrder(null);
        setStatusModal({ open: true, type: 'success', description: "Sale held. Click Release to resume." });
        clearForm();
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
      id: item.itemId || item.item_id,
      _id: item.itemId || item.item_id,
      stock_id: item.stockId || item.stock_id,
      stockId: item.stockId || item.stock_id,
      item_id: item.itemId || item.item_id,
      itemId: item.itemId || item.item_id,
      sku: item.sku,
      item_name: item.item_name,
      item_image_url: item.item_image_url || null,
      batch_code: item.batchCode || item.batch_code,
      batchCode: item.batchCode || item.batch_code,
      retail_price: item.unitPrice || item.unit_price,
      unit_price: item.unitPrice || item.unit_price,
      stock_price: item.unitPrice || item.unit_price,
      selling_price_per_kg: item.selling_price_per_kg || 0,
      selling_price_per_liter: item.selling_price_per_liter || 0,
      customer_quantity: item.quantity,
      customer_discount: item.discount || 0,
      quantity: item.quantity,
      uom_symbol: item.uom_symbol || '',
      uom: { symbol: item.uom_symbol || '', unit_name: '' },
      category: { brand: '', type: '' },
    }));

    setSelectedItems(restoredItems);
    setReleasedHeldOrder(heldOrder);
    setInvoiceNo(heldOrder.invoice_no || invoiceNo);

    // Restore member if not guest
    const restoredMember = getHeldSaleMember(heldOrder);
    if (restoredMember && !restoredMember.is_guest) {
      setSelectedMember(restoredMember);
    } else {
      setSelectedMember(GUEST_USER);
    }

    setHeldOrder(null);
    setStatusModal({ open: true, type: 'success', description: "Held sale restored to cart" });
    focusSearch();
  };

  // Store checkout data for bill generation
  const checkoutDataRef = useRef(null);


const captureReceiptCanvas = async (checkoutData) => {
    if (!billRef.current) throw new Error("Receipt content is not ready");
    checkoutDataRef.current = checkoutData;
    setReceiptCheckoutData(checkoutData);
    await waitForBrowserPaint();

    return html2canvas(billRef.current, {
      scale: RECEIPT_CANVAS_SCALE,
      useCORS: true,
      backgroundColor: "#ffffff"
    });
};

const getReceiptPrinterConfig = async () => {
    if (!window.electronAPI?.getReceiptPrinterConfig) {
      return { mode: "auto", networkHost: null };
    }

    const response = await window.electronAPI.getReceiptPrinterConfig();
    if (response?.status !== "success") {
      return { mode: "auto", networkHost: null };
    }

    return {
      mode: response.data?.mode || "auto",
      networkHost: response.data?.networkHost || null,
      networkAutoDiscovery: Boolean(response.data?.networkAutoDiscovery),
    };
};

const printReceiptToThermalPrinter = async (canvas, options = {}) => {
    if (!window.electronAPI?.printThermalReceipt) {
      throw new Error("Thermal printer IPC is not available");
    }

    const commands = buildEscposRasterCommand(canvas);
    const response = await window.electronAPI.printThermalReceipt({
      data: commands.buffer,
      mode: "network",
      timeoutMs: options.timeoutMs || THERMAL_NETWORK_PRINT_TIMEOUT_MS
    });

    if (response?.status !== "success") {
      throw new Error(response?.message || "Thermal receipt print failed");
    }

    return response;
};

const buildReceiptPdfArrayBuffer = async (canvas) => {
    const rollWidthPt = THERMAL_ROLL_WIDTH_MM * MM_TO_PT;
    const rollPageHeightPt = THERMAL_PAGE_HEIGHT_MM * MM_TO_PT;

    const doc = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: [rollWidthPt, rollPageHeightPt]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    // Size to the printhead's reach, not the paper edge, and centre it on the
    // roll so the image lands on the dots the printer can actually fire.
    const printableWidth = THERMAL_PRINT_WIDTH_MM * MM_TO_PT;
    const printableHeight = pageHeight;
    const offsetX = (pageWidth - printableWidth) / 2;

    // Canvas px -> PDF pt.
    const pxToPt = 0.75 / RECEIPT_CANVAS_SCALE;
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
        offsetX,
        0,
        printableWidth,
        sliceHeightPt
      );

      positionYpx += sliceHeightPx;
      pageNumber++;
    }

    return doc.output("arraybuffer");
};

const printReceiptViaSystemPrinter = async (canvas) => {
    const arrayBuffer = await buildReceiptPdfArrayBuffer(canvas);

    if (window.electronAPI?.printReceiptPdf) {
      const response = await window.electronAPI.printReceiptPdf({
        data: arrayBuffer,
        mode: "system"
      });

      if (response?.status !== "success") {
        throw new Error(response?.message || "System receipt print failed");
      }

      return response;
    }

    if (!window.electronAPI?.sendPrintSilent) {
      throw new Error("System print IPC is not available");
    }

    window.electronAPI.sendPrintSilent(arrayBuffer);
};

const printReceipt = async (checkoutData) => {
    const canvas = await captureReceiptCanvas(checkoutData);
    const printerConfig = await getReceiptPrinterConfig();
    const printerMode = printerConfig.mode;

    if (printerMode === "system") {
      await printReceiptViaSystemPrinter(canvas);
      return;
    }

    if (printerMode === "network") {
      await printReceiptToThermalPrinter(canvas);
      return;
    }

    if (!printerConfig.networkHost && !printerConfig.networkAutoDiscovery) {
      await printReceiptViaSystemPrinter(canvas);
      return;
    }

    try {
      await printReceiptToThermalPrinter(canvas);
    } catch (networkPrintError) {
      console.warn(
        "[SalesView] Network receipt print failed; trying system printer",
        networkPrintError
      );
      await printReceiptViaSystemPrinter(canvas);
    }
};



  const stock_items = selectedItems.map((item) => ({
    ...item,
    retail_price: getCartUnitPrice(item),
    total_price: (getCartUnitPrice(item) - (item.customer_discount || 0)) * item.customer_quantity,
  }));

  const currentReceiptCheckoutData = receiptCheckoutData || checkoutDataRef.current;

  const buildBillDataSnapshot = (checkoutData = currentReceiptCheckoutData) => ({
    invoiceNo: invoiceNo,
    cashier_name: currentUser?.username || "-",
    payment_method: checkoutData?.paymentMethodName || checkoutData?.paymentMethod || "cash",
    date_time: formattedDate,
    member_no: selectedMember?.member_no || "-",
    stock_items: stock_items.map((item) => ({ ...item })),
    totalAmount: stockTotal,
    discountAmount: checkoutData?.finalDiscount || 0,
    finalAmount: checkoutData?.totalAmount || stockTotal,
    cashAmount: checkoutData?.cashAmount || 0,
    changeAmount: checkoutData?.changeAmount || 0,
  });

  // Bill data uses the latest checkout data captured for receipt generation.
  const billData = buildBillDataSnapshot(currentReceiptCheckoutData);

  const openReceiptPreview = () => {
    const previewData = selectedItems.length > 0
      ? buildBillDataSnapshot(currentReceiptCheckoutData)
      : lastReceiptData;

    if (!previewData) {
      setStatusModal({ open: true, type: 'failed', description: "No receipt available to preview" });
      return;
    }

    setReceiptPreviewData(previewData);
    setIsReceiptPreviewOpen(true);
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
                onClick={openClearConfirm}
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
                  key={`${item.id || item.sku || "selected-item"}-${index}`}
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
                    <span className="text-sm text-slate-500 tabular-nums font-medium">{formatCurrency(getCartUnitPrice(item))}</span>
                    {item.customer_discount > 0 && (
                      <p className="text-[10px] text-orange-500 font-medium">-{formatCurrency(item.customer_discount)}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-slate-800 tabular-nums">
                      {formatCurrency((getCartUnitPrice(item) - (item.customer_discount || 0)) * item.customer_quantity)}
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
                {uniqueCategoryTypes.map((type, index) => (
                  <option key={`${type || "category"}-${index}`} value={type}>{type}</option>
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
                  {filteredItems.map((item, index) => (
                    <SalesItemCard key={`${item.id ?? item._id ?? item.sku ?? "item"}-${index}`} item={item} onOpen={() => handleItemCardClick(item)} />
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
                onClick={openClearConfirm}
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

	            <button
	              onClick={openReceiptPreview}
	              disabled={selectedItems.length === 0 && !lastReceiptData}
	              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-teal-200 text-teal-700 rounded-xl font-semibold hover:bg-teal-50 hover:border-teal-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
	            >
	              <Receipt className="w-4 h-4" />
	              Preview Receipt
	            </button>

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

	      {/* Clear Cart Confirmation Modal */}
	      {isClearConfirmOpen && (
	        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={closeClearConfirm}
          />
          <div className="relative z-[61] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-900">Clear Cart?</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Are you sure you want to remove all items from the current transaction? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={closeClearConfirm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearCart}
                  className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-500 text-white font-semibold hover:bg-red-600 hover:border-red-600 transition-all shadow-sm"
                >
                  Yes, Clear
                </button>
              </div>
            </div>
          </div>
	        </div>
	      )}

	      {isReceiptPreviewOpen && (
	        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
	          <div
	            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
	            onClick={() => setIsReceiptPreviewOpen(false)}
	          />
	          <div className="relative z-[71] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
	            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
	              <div className="flex items-center gap-3">
	                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
	                  <Receipt className="w-5 h-5" />
	                </div>
	                <div>
	                  <h3 className="text-lg font-bold text-slate-900">Receipt Preview</h3>
	                  <p className="text-xs text-slate-500">{(receiptPreviewData || lastReceiptData || billData)?.invoiceNo || "Current receipt"}</p>
	                </div>
	              </div>
	              <button
	                onClick={() => setIsReceiptPreviewOpen(false)}
	                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-colors"
	              >
	                <X className="w-5 h-5" />
	              </button>
	            </div>

	            <div className="max-h-[78vh] overflow-auto bg-slate-100 p-5">
	              <div className="mx-auto w-fit shadow-xl">
	                <BillContent billData={receiptPreviewData || lastReceiptData || billData} />
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

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
