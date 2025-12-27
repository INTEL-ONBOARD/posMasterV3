import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import SalesItemCard from "../../components/SalesItemCard";
import { salesApi, categoryApi } from "../../api/localApi";
import { ChevronDown, ChevronUp, User, Package, Layers, ShoppingCart, CreditCard, Plus, X, DollarSign, AlertTriangle, Wallet, History, UserCheck, RefreshCw } from "lucide-react";
import ToastContext from "../toasts/ToastService.jsx";
import { localAuth } from "../../api/services/localAuth";
import { useStatusLog } from "../../services/StatusLogService.jsx";
import { useReactiveData, TABLES } from "../../store";
import { transformStockData } from "../../util/common/blockConverter.jsx";

//image imports
import barcodeImg from "../../assets/barcode.png";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import BillContent from "./layout/BillContent.jsx";
import BackIcon from "../../assets/back-icon/back_icon.jsx";
import MemEvaluationModal from "./modals/MemEvaluationModal.jsx";

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

export default function SalesView({ isActive }) {
  const billRef = useRef(null);
  const toast = useContext(ToastContext);
  const statusLog = useStatusLog();

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

  // Transform stock data for display
  const inventoryItems = useMemo(() => {
    if (!stockItemsRaw || stockItemsRaw.length === 0) return [];
    return transformStockData({ status: 'success', data: stockItemsRaw });
  }, [stockItemsRaw]);

  // Extract unique category types
  const uniqueCategoryTypes = useMemo(() => {
    return Array.from(new Set((categoriesData || []).map(c => c.type)));
  }, [categoriesData]);

  // Collapsible section states
  const [openMemberSection, setOpenMemberSection] = useState(true);
  const [openItemSection, setOpenItemSection] = useState(true);
  const [openStockSection, setOpenStockSection] = useState(true);

  // Customer/Member state - default to Guest
  const [selectedMember, setSelectedMember] = useState(GUEST_USER);
  const [modal, setModal] = useState(false);
  const closeModal = () => setModal(false);

  // Handle member selection from modal
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    // If guest, force cash payment
    if (member?.is_guest) {
      setPaymentMethod("cash");
    }
    closeModal();
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
    }
  }, [isActive]);

  // Item form data
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
    uom: { symbol: "", unit_name: "" },
    category: { brand: "", type: "" },
  });

  // Stock form data
  const [formDataStock, setFormDataStock] = useState({
    batch_code: "",
    quantity: 0,
    threshold_limit: 0,
    stock_price: 0,
    retail_price: 0,
    expired_datetime: "",
    availability: true,
    customer_quantity: 0,
    discount_price: 0,
    customer_discount: 0
  });

  const handleStockInputChange = (e) => {
    const { name, value } = e.target;
    setFormDataStock(prev => ({ ...prev, [name]: value }));
  };

  const [rightActiveSection, setRightActiveSection] = useState("buttons");
  const [selectedItems, setSelectedItems] = useState([]);

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
      uom_symbol: item.uom?.uom_symbol
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

  const addNewRegItem = () => {
    if (formDataRegItem.id === 0) return;

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
      batch_code: formDataStock.batch_code,
      quantity: parseFloat(formDataStock.quantity) || 0,
      threshold_limit: parseFloat(formDataStock.threshold_limit) || 0,
      stock_price: parseFloat(formDataStock.stock_price) || 0,
      retail_price: parseFloat(formDataStock.retail_price) || 0,
      discount_price: parseFloat(formDataStock.discount_price) || 0,
      expired_datetime: formDataStock.exp_date,
      availability: formDataStock.availability,
      uom: formDataRegItem.uom,
      category: formDataRegItem.category,
      customer_discount: formDataStock.customer_discount,
      customer_quantity: formDataStock.customer_quantity,
      uom_symbol: formDataRegItem.uom?.symbol
    };

    setSelectedItems(prev =>
      prev.map(prevItem =>
        prevItem.id === formDataRegItem.id ? newRegItem : prevItem
      )
    );
  };

  // Calculate totals
  const stockTotal = selectedItems.reduce((total, item) => {
    const discountedPrice = item.retail_price - (item.customer_discount || 0);
    return total + (discountedPrice * item.customer_quantity);
  }, 0);

  const [cashAmount, setCashAmount] = useState(0);
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const totalAmount = stockTotal - parseFloat(finalDiscount || 0);
  const changeAmount = parseFloat(cashAmount || 0) - totalAmount;

  // Credit validation
  const availableCredit = (selectedMember?.credit_limit || 0) - (selectedMember?.credit_balance || 0);
  const canUseCredit = !selectedMember?.is_guest && availableCredit >= totalAmount;
  const creditWarning = paymentMethod === "credit" && !canUseCredit;

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
      uom: item.uom || { symbol: "", unit_name: "" },
      category: item.category || { brand: "", type: "" },
    });
    setFormDataStock({
      batch_code: item.batch_code,
      quantity: item.quantity,
      threshold_limit: item.threshold_limit,
      stock_price: item.stock_price,
      retail_price: item.retail_price,
      expired_datetime: item.exp_date,
      availability: item.stock_availability,
      customer_quantity: item.customer_quantity,
      discount_price: item.discount_price,
      customer_discount: item.customer_discount
    });
  };

  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [searchAvailability, setSearchAvailability] = useState("All");

  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
  };

  // Date formatting
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Generate invoice number
  const [invoiceNo, setInvoiceNo] = useState("");
  const generateNewInvoice = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'INV';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInvoiceNo(result);
  };

  useEffect(() => {
    generateNewInvoice();
  }, []);

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
    const matchesSearch = (item?.item_name || "").toLowerCase().includes((search || "").toLowerCase());
    return matchesCategory && matchesAvailability && matchesSearch;
  });

  const clearForm = () => {
    setSelectedItems([]);
    setCashAmount(0);
    setFinalDiscount(0);
    setSelectedMember(GUEST_USER);
    setPaymentMethod("cash");
    generateNewInvoice();
    setFormDataRegItem({
      sku: "", id: 0, stock_trace: [0], item_name: "", item_image_url: "",
      maximum_capacity: 10, uom_id: 10, category_id: 10, inventory_id: 11,
      uom: { symbol: "", unit_name: "" }, category: { brand: "", type: "" },
    });
    setFormDataStock({
      batch_code: "", quantity: 0, threshold_limit: 0, stock_price: 0,
      retail_price: 0, expired_datetime: "", availability: true,
      customer_quantity: 0, discount_price: 0, customer_discount: 0
    });
  };

  const processSale = async () => {
    if (totalAmount <= 0) {
      toast.error("Please add items to the sale");
      return;
    }

    if (paymentMethod === "credit" && !canUseCredit) {
      toast.error("Insufficient credit limit");
      return;
    }

    // For cash payments, use entered amount or default to exact payment
    const finalCashAmount = paymentMethod === "cash"
      ? (parseFloat(cashAmount) || 0) >= totalAmount
        ? parseFloat(cashAmount)
        : totalAmount  // Default to exact payment if no/insufficient cash entered
      : 0;

    const finalChangeAmount = paymentMethod === "cash"
      ? Math.max(0, finalCashAmount - totalAmount)
      : 0;

    try {
      // Prepare sale data
      const saleData = {
        invoice_no: invoiceNo,
        member_id: selectedMember?.is_guest ? null : (selectedMember?.id || selectedMember?._id),
        member_name: selectedMember?.full_name || "Guest",
        payment_method: paymentMethod,
        total_amount: totalAmount,
        discount_amount: parseFloat(finalDiscount) || 0,
        cash_amount: finalCashAmount,
        change_amount: finalChangeAmount,
        cashier_name: preparedBy,
        items: selectedItems.map(item => ({
          item_id: item.item_id || item.id,
          stock_id: item.stock_id || item.id,  // Stock record ID for inventory tracking
          batch_code: item.batch_code,
          item_name: item.item_name,
          sku: item.sku,
          quantity: item.customer_quantity,
          unit_price: item.retail_price,
          discount: item.customer_discount || 0,
          total_price: item.retail_price * item.customer_quantity
        }))
      };

      const response = await salesApi.create(saleData);

      if (response.status === "success") {
        toast.success("Sale completed successfully!");
        // Generate and print bill
        await generateBillPdf();
        // Clear form for next customer
        clearForm();
      } else {
        toast.error(response.message || "Failed to process sale");
      }
    } catch (error) {
      console.error("[SalesView] Error processing sale:", error);
      toast.error("Failed to process sale");
    }
  };

  const generateBillPdf = async () => {
    try {
      if (!billRef.current) return;

      const canvas = await html2canvas(billRef.current, { scale: 2, useCORS: true });
      const widthPt = 311.81;
      const heightPt = 311.81;
      const doc = new jsPDF({ unit: "pt", format: [widthPt, heightPt] });
      const margin = 40;
      const pdfWidth = doc.internal.pageSize.getWidth() - 2 * margin;
      const pdfPageHeight = doc.internal.pageSize.getHeight() - 2 * margin;
      const scaleRatio = pdfWidth / canvas.width;

      let positionY = 0;
      let pageNumber = 1;

      while (positionY < canvas.height) {
        const remainingHeightPx = canvas.height - positionY;
        const sliceHeightPx = Math.min(remainingHeightPx, pdfPageHeight / scaleRatio);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");
        ctx.drawImage(canvas, 0, positionY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const sliceData = sliceCanvas.toDataURL("image/png");
        const slicePdfHeight = sliceHeightPx * scaleRatio;
        if (pageNumber > 1) doc.addPage();
        doc.addImage(sliceData, "PNG", margin, margin, pdfWidth, slicePdfHeight);
        positionY += sliceHeightPx;
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
    total_price: item.retail_price * item.customer_quantity,
  }));

  const billData = {
    invoiceNo: invoiceNo,
    cashier_name: currentUser?.username || "-",
    payment_method: paymentMethod,
    date_time: formattedDate,
    member_no: selectedMember?.member_no || "-",
    stock_items: stock_items,
    totalAmount: stockTotal,
    discountAmount: finalDiscount,
    finalAmount: totalAmount,
    cashAmount: cashAmount,
    changeAmount: changeAmount,
  };

  const formatCurrency = (amount) => `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-gray-50 overflow-hidden">
      {/* Off-screen bill content */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <BillContent ref={billRef} billData={billData} />
      </div>

      {/* Left Sidebar - Customer & Item Info */}
      <div className="w-[280px] bg-gray-100 h-full p-3 flex flex-col gap-3 shrink-0">
        {/* Customer Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setOpenMemberSection(!openMemberSection)}
            className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                selectedMember?.is_guest ? "bg-gray-200" : "bg-emerald-100"
              }`}>
                <User className={`w-4 h-4 ${selectedMember?.is_guest ? "text-gray-600" : "text-emerald-600"}`} />
              </div>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Customer</span>
            </div>
            {openMemberSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {openMemberSection && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="pt-4">
                {/* Customer Info Card */}
                <div className={`rounded-xl p-4 mb-3 ${selectedMember?.is_guest ? "bg-gray-50" : "bg-emerald-50"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                      selectedMember?.is_guest ? "bg-gray-400" : "bg-emerald-500"
                    }`}>
                      {selectedMember?.is_guest ? <User className="w-5 h-5" /> : (selectedMember?.full_name || "M")[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{selectedMember?.full_name || "Guest"}</p>
                      <p className="text-xs text-gray-500">{selectedMember?.member_no || "-"}</p>
                    </div>
                  </div>

                  {/* Credit Info for Members */}
                  {!selectedMember?.is_guest && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-emerald-200">
                      <div>
                        <p className="text-[10px] text-emerald-600 uppercase font-medium">Credit Limit</p>
                        <p className="text-sm font-bold text-emerald-700">{formatCurrency(selectedMember?.credit_limit || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-600 uppercase font-medium">Used</p>
                        <p className="text-sm font-bold text-amber-700">{formatCurrency(selectedMember?.credit_balance || 0)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Customer Button */}
                <button
                  onClick={() => setModal(true)}
                  className="w-full py-2.5 bg-[#1A318C] text-white rounded-lg font-medium hover:bg-[#152870] transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Change Customer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Item Description Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setOpenItemSection(!openItemSection)}
            className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                <Package className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Item Description</span>
            </div>
            {openItemSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {openItemSection && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="pt-4 flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <img src={barcodeImg} alt="Barcode" className="w-16 h-12 object-contain" />
                  <p className="text-[10px] text-gray-500 mt-1">{formDataRegItem.sku || "No SKU"}</p>
                </div>
                <div className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">NAME</span>
                      <span className="text-xs font-medium text-gray-800">{formDataRegItem.item_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">CATEGORY</span>
                      <span className="text-xs font-medium text-gray-800">{formDataRegItem.category?.type || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stock Description Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-1">
          <button
            onClick={() => setOpenStockSection(!openStockSection)}
            className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stock Description</span>
            </div>
            {openStockSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {openStockSection && (
            <div className="px-4 pb-4 border-t border-gray-100 overflow-y-auto max-h-[300px]">
              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Batch Code</label>
                    <input
                      type="text"
                      readOnly
                      value={formDataStock.batch_code}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                    <input
                      type="number"
                      name="customer_quantity"
                      value={formDataStock.customer_quantity}
                      onChange={handleStockInputChange}
                      className="w-full px-3 py-2 bg-white border-2 border-[#1A318C] rounded-lg text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Unit Price</label>
                    <input
                      type="number"
                      readOnly
                      value={formDataStock.retail_price}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Available</label>
                    <input
                      type="number"
                      readOnly
                      value={formDataStock.quantity}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-2">
          <button
            onClick={clearForm}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={addNewRegItem}
            disabled={formDataRegItem.id === 0}
            className="flex-1 py-3 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Update
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full flex flex-col p-3 min-w-0 overflow-hidden">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm mb-3 p-3 shrink-0">
          <div className="flex items-center gap-4">
            {/* Customer Info Card */}
            <div
              onClick={() => setModal(true)}
              className={`flex items-center gap-3 px-5 py-3 rounded-lg cursor-pointer transition-all hover:opacity-90 shrink-0 ${
                selectedMember?.is_guest
                  ? "bg-slate-600"
                  : "bg-emerald-500"
              }`}
            >
              <div className="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-[9px] font-semibold uppercase">Customer</p>
                <p className="text-white font-bold text-base truncate max-w-[120px]">{selectedMember?.full_name || "Guest"}</p>
                <p className="text-white/60 text-[10px]">{selectedMember?.member_no || "Walk-in"}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-white/50" />
            </div>

            {/* Date */}
            <div className="px-4 shrink-0">
              <p className="text-gray-400 text-[9px] font-semibold uppercase">Date</p>
              <p className="text-gray-800 font-bold text-lg">{formattedDate}</p>
            </div>

            {/* Spacer */}
            <div className="flex-1 min-w-0"></div>

            {/* Prepared By */}
            <div className="shrink-0">
              <p className="text-gray-400 text-[9px] font-semibold uppercase mb-0.5">Prepared By</p>
              <select
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-28 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:border-[#1A318C]"
              >
                <option value="">Select</option>
                {(employees || []).map(emp => (
                  <option key={emp.id || emp._id} value={emp.username || emp.name}>
                    {emp.username || emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Badge */}
            <div className="bg-[#1A318C] px-5 py-3 rounded-lg text-center shrink-0">
              <p className="text-blue-300 text-[9px] font-semibold uppercase">Invoice No</p>
              <p className="text-white font-bold text-lg tracking-wide">{invoiceNo}</p>
            </div>

            {/* Clear Button */}
            <button
              onClick={clearForm}
              className="px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all text-sm shrink-0"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Credit Warning */}
        {creditWarning && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-center gap-3 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">
              <span className="font-semibold">Insufficient Credit.</span> Available: {formatCurrency(availableCredit)} | Required: {formatCurrency(totalAmount)}
            </p>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Table Header */}
          <div className="bg-slate-800">
            <div className="grid grid-cols-12 gap-3 px-5 py-3">
              <div className="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</div>
              <div className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Details</div>
              <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Qty</div>
              <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Unit Price</div>
              <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Total</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <ShoppingCart className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-base font-medium text-gray-500">No items added yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Items" from the right panel</p>
              </div>
            ) : (
              selectedItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleTableRowClick(item)}
                  className={`grid grid-cols-12 gap-3 px-5 py-3 items-center cursor-pointer transition-all border-b border-gray-100 ${
                    item.id === formDataRegItem.id
                      ? 'bg-blue-50 border-l-4 border-l-[#1A318C]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-1">
                    <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 rounded-lg text-sm font-bold text-gray-700">
                      {item.customer_quantity}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-gray-500 tabular-nums">{formatCurrency(item.retail_price)}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-gray-800 tabular-nums">
                      {formatCurrency(item.retail_price * item.customer_quantity)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItemFromList(item.id); }}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Payment Section - Fixed at bottom */}
        <div className="bg-white rounded-xl shadow-sm mt-3 px-4 py-3 shrink-0">
          <div className="flex items-center gap-4">
            {/* Left Group - Totals */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Subtotal */}
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Subtotal</p>
                <p className="text-base font-bold text-gray-800 tabular-nums">{formatCurrency(stockTotal)}</p>
              </div>

              {/* Discount */}
              <div>
                <p className="text-[10px] font-medium text-orange-500 uppercase tracking-wide mb-0.5">Discount</p>
                <input
                  type="number"
                  value={finalDiscount}
                  onChange={(e) => setFinalDiscount(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-lg font-bold text-sm text-orange-600 focus:outline-none focus:border-orange-400 tabular-nums"
                  placeholder="0.00"
                />
              </div>

              {/* Net Amount */}
              <div className="bg-[#1A318C] rounded-lg px-4 py-2">
                <p className="text-[9px] font-semibold text-blue-300 uppercase tracking-wide">Net Amount</p>
                <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-gray-200 shrink-0"></div>

            {/* Center Group - Payment Fields */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Payment Type */}
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Payment</p>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={selectedMember?.is_guest}
                  className={`w-24 px-2 py-1.5 border rounded-lg text-sm font-medium focus:outline-none ${
                    selectedMember?.is_guest
                      ? "bg-gray-100 border-gray-200 text-gray-400"
                      : "bg-white border-gray-200 text-gray-700 focus:border-[#1A318C]"
                  }`}
                >
                  <option value="cash">Cash</option>
                  {!selectedMember?.is_guest && <option value="credit">Credit</option>}
                </select>
              </div>

              {/* Cash Amount */}
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Cash</p>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-24 px-2 py-1.5 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg focus:border-[#1A318C] focus:outline-none tabular-nums"
                  placeholder="0.00"
                />
              </div>

              {/* Change */}
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Change</p>
                <div className={`w-24 px-2 py-1.5 rounded-lg text-sm font-bold tabular-nums text-center ${
                  changeAmount >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {changeAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1 min-w-0"></div>

            {/* Right Group - Items & Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Items Badge */}
              <div className="bg-slate-100 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-500 font-medium">Items: </span>
                <span className="text-sm font-bold text-slate-800">{selectedItems.length}</span>
              </div>

              {/* Cancel Button */}
              <button
                onClick={clearForm}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all text-sm"
              >
                Cancel
              </button>

              {/* Proceed Button */}
              <button
                onClick={processSale}
                disabled={totalAmount <= 0 || creditWarning}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-all text-sm whitespace-nowrap disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Action Cards */}
      <div className="w-[300px] bg-gray-100 h-full p-3 flex flex-col gap-3 shrink-0">
        {rightActiveSection === "buttons" ? (
          <>
            {/* Add Items Card */}
            <button
              onClick={() => {
                setRightActiveSection("items");
                refetchItems(); // Refresh items when opening the panel
              }}
              className="bg-white rounded-xl p-5 flex flex-col items-center justify-center hover:shadow-lg transition-all border-2 border-transparent hover:border-teal-200 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-7 h-7 text-teal-600" />
              </div>
              <span className="text-sm font-bold text-gray-800">Add Items</span>
              <span className="text-xs text-gray-500 mt-1">Add registered items to sale</span>
            </button>

            {/* Select Customer Card */}
            <button
              onClick={() => setModal(true)}
              className="bg-white rounded-xl p-5 flex flex-col items-center justify-center hover:shadow-lg transition-all border-2 border-transparent hover:border-emerald-200 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <User className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-gray-800">Select Customer</span>
              <span className="text-xs text-gray-500 mt-1">Member or Guest</span>
            </button>

            {/* Credit Payment Card - Only for members */}
            {!selectedMember?.is_guest && (
              <button
                onClick={() => setPaymentMethod("credit")}
                disabled={!canUseCredit}
                className={`bg-white rounded-xl p-5 flex flex-col items-center justify-center hover:shadow-lg transition-all border-2 ${
                  paymentMethod === "credit"
                    ? "border-amber-500 bg-amber-50"
                    : "border-transparent hover:border-amber-200"
                } ${!canUseCredit ? "opacity-50 cursor-not-allowed" : ""} group`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-7 h-7 text-amber-600" />
                </div>
                <span className="text-sm font-bold text-gray-800">Credit Payment</span>
                <span className="text-xs text-gray-500 mt-1">
                  Available: {formatCurrency(availableCredit)}
                </span>
              </button>
            )}

            {/* Cash Payment Card */}
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`bg-white rounded-xl p-5 flex flex-col items-center justify-center hover:shadow-lg transition-all border-2 ${
                paymentMethod === "cash"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-transparent hover:border-emerald-200"
              } group`}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-gray-800">Cash Payment</span>
              <span className="text-xs text-gray-500 mt-1">Pay with cash</span>
            </button>

            {/* Sale Summary */}
            <div className="bg-white rounded-xl p-4 flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sale Summary</p>
              <div className="space-y-3">
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Items</p>
                    <p className="text-xl font-bold text-emerald-700 tabular-nums">{selectedItems.length}</p>
                  </div>
                </div>

                <div className="bg-[#1A318C]/5 rounded-xl p-3 flex items-center gap-3 border border-[#1A318C]/10">
                  <div className="w-10 h-10 rounded-xl bg-[#1A318C] flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#1A318C] font-medium">Total Amount</p>
                    <p className="text-xl font-bold text-[#1A318C] tabular-nums">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Items List View */
          <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setRightActiveSection("buttons")}
                  className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <BackIcon />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search items..."
                    className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategoryTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-3">
              {(isLoading || searchLoading) ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-3"></div>
                  <span className="text-gray-500 text-sm">Loading items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Package className="w-16 h-16 mb-3 text-gray-200" />
                  <span className="text-sm font-medium">No items found</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <SalesItemCard key={item.id ?? item._id} item={item} onOpen={() => loadItemtoList(item)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Member Selection Modal */}
      <MemEvaluationModal
        isOpen={modal}
        closeModal={closeModal}
        onSelectMember={handleSelectMember}
        currentMember={selectedMember}
      />
    </div>
  );
}
