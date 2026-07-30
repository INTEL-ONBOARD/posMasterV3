import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { salesApi } from "../../api/localApi";
import StatusModal from "../../components/StatusModal.jsx";
import { localAuth } from "../../api/services/localAuth";
import { useReactiveData, TABLES } from "../../store";

import BillContent from "./layout/BillContent.jsx";
import BackIcon from "../../assets/back-icon/back_icon.jsx";
import MemEvaluationModal from "./modals/MemEvaluationModal.jsx";
import CartItemEditModal from "./modals/CartItemEditModal.jsx";
import CheckoutSummaryModal from "./modals/CheckoutSummaryModal.jsx";
import ClearCartConfirmModal from "./modals/ClearCartConfirmModal.jsx";
import ReceiptPreviewModal from "./modals/ReceiptPreviewModal.jsx";
import SalesHeaderBar from "./panels/SalesHeaderBar.jsx";
import CartListPanel from "./panels/CartListPanel.jsx";
import ItemSearchPanel from "./panels/ItemSearchPanel.jsx";
import CartActionsFooter from "./panels/CartActionsFooter.jsx";
import { useBranchContext } from "../../context/BranchContext.jsx";
import { useCart } from "../../hooks/useCart";
import { useItemSearch } from "../../hooks/useItemSearch";
import { useHeldOrder } from "../../hooks/useHeldOrder";
import { useSalePayload } from "../../hooks/useSalePayload";
import { useCheckout } from "../../hooks/useCheckout";
import { useReceiptPrinting } from "../../hooks/useReceiptPrinting";

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
  const searchInputRef = useRef(null);
  const proceedBtnRef = useRef(null);
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
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

  // Customer/Member state - default to Guest
  const [selectedMember, setSelectedMember] = useState(GUEST_USER);
  const [modal, setModal] = useState(false);
  const closeModal = () => setModal(false);

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

  const itemSearch = useItemSearch({ inventoryItems, categoriesData });

  const cart = useCart({ inventoryItems, isActive, setSearch: itemSearch.setSearch });

  const salePayload = useSalePayload({
    invoiceNo,
    resolvedBranchId,
    selectedMember,
    currentUser,
    stockTotal: cart.stockTotal,
    selectedItems: cart.selectedItems,
    getCartUnitPrice: cart.getCartUnitPrice
  });

  const heldOrder = useHeldOrder({
    currentUser,
    selectedItems: cart.selectedItems,
    setSelectedItems: cart.setSelectedItems,
    setSelectedMember,
    invoiceNo,
    setInvoiceNo,
    resolvedBranchId,
    buildSalePayload: salePayload.buildSalePayload,
    getSalesSessionId: salePayload.getSalesSessionId,
    setStatusModal,
    focusSearch,
    guestUser: GUEST_USER
  });

  const clearForm = () => {
    cart.setSelectedItems([]);
    setSelectedMember(GUEST_USER);
    heldOrder.setReleasedHeldOrder(null);
    generateNewInvoice();
    focusSearch();
  };

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const openClearConfirm = () => {
    if (cart.selectedItems.length === 0) return;
    setIsClearConfirmOpen(true);
  };

  const closeClearConfirm = () => {
    setIsClearConfirmOpen(false);
  };

  const confirmClearCart = () => {
    clearForm();
    closeClearConfirm();
  };

  const receiptPrinting = useReceiptPrinting({
    invoiceNo,
    currentUser,
    selectedMember,
    formattedDate,
    selectedItems: cart.selectedItems,
    stockTotal: cart.stockTotal,
    getCartUnitPrice: cart.getCartUnitPrice,
    setStatusModal
  });

  const checkout = useCheckout({
    resolvedBranchId,
    invoiceNo,
    generateNewInvoice,
    selectedItems: cart.selectedItems,
    supportsDecimalSaleQuantity: cart.supportsDecimalSaleQuantity,
    buildSalePayload: salePayload.buildSalePayload,
    releasedHeldOrder: heldOrder.releasedHeldOrder,
    setReleasedHeldOrder: heldOrder.setReleasedHeldOrder,
    setHeldOrder: heldOrder.setHeldOrder,
    fetchHeldOrder: heldOrder.fetchHeldOrder,
    getHeldSaleId: heldOrder.getHeldSaleId,
    getHeldSaleMember: heldOrder.getHeldSaleMember,
    mergeHeldSaleItems: heldOrder.mergeHeldSaleItems,
    currentUser,
    setStatusModal,
    setLastReceiptData: receiptPrinting.setLastReceiptData,
    buildBillDataSnapshot: receiptPrinting.buildBillDataSnapshot,
    printReceipt: receiptPrinting.printReceipt,
    clearForm
  });

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
        await heldOrder.fetchHeldOrder(user);
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
  }, [isActive, heldOrder.fetchHeldOrder]);

  const formatCurrency = (amount) => `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;

  // Tab from the item-search box jumps to (or activates) the Proceed button,
  // otherwise defers to the scanner-aware search key handling.
  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey && cart.selectedItems.length > 0) {
      e.preventDefault();
      proceedBtnRef.current?.focus();
    } else if (e.key === 'Tab' && e.shiftKey && cart.selectedItems.length > 0) {
      e.preventDefault();
      checkout.handleProceedClick();
    } else {
      itemSearch.handleSearchKeyDown(e);
    }
  };

  const hasItems = cart.selectedItems.length > 0;
  const canPreviewReceipt = hasItems || Boolean(receiptPrinting.lastReceiptData);
  const receiptPreviewBillData = receiptPrinting.receiptPreviewData || receiptPrinting.lastReceiptData || receiptPrinting.billData;

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
      {/* Off-screen bill content */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <BillContent ref={receiptPrinting.billRef} billData={receiptPrinting.billData} variant={receiptPrinting.receiptVariant} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full flex flex-col p-4 min-w-0 overflow-hidden">
        {/* Header Section */}
        <SalesHeaderBar
          selectedMember={selectedMember}
          onOpenMemberModal={() => setModal(true)}
          formattedDate={formattedDate}
          preparedBy={preparedBy}
          invoiceNo={invoiceNo}
          lastScannedCode={cart.lastScannedCode}
          onRefresh={() => refetchItems()}
          onClearAll={openClearConfirm}
        />

        {/* Items Table */}
        <CartListPanel
          selectedItems={cart.selectedItems}
          onRowClick={cart.handleTableRowClick}
          onRemoveItem={cart.removeItemFromList}
          getCartUnitPrice={cart.getCartUnitPrice}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Right Sidebar - Action Cards */}
      <div className="w-[320px] bg-gradient-to-b from-slate-100 to-slate-50 h-full p-4 flex flex-col gap-3 shrink-0 border-l border-slate-200">
        <ItemSearchPanel
          searchInputRef={searchInputRef}
          search={itemSearch.search}
          onSearchChange={itemSearch.handleSearch}
          onSearchKeyDown={handleSearchInputKeyDown}
          searchCategory={itemSearch.searchCategory}
          onCategoryChange={itemSearch.setSearchCategory}
          uniqueCategoryTypes={itemSearch.uniqueCategoryTypes}
          isLoading={isLoading}
          searchLoading={itemSearch.searchLoading}
          filteredItems={itemSearch.filteredItems}
          onItemOpen={cart.handleItemCardClick}
        />

        <CartActionsFooter
          itemCount={cart.selectedItems.length}
          stockTotal={cart.stockTotal}
          formatCurrency={formatCurrency}
          onClearAll={openClearConfirm}
          hasItems={hasItems}
          heldOrder={heldOrder.heldOrder}
          releasedHeldOrder={heldOrder.releasedHeldOrder}
          onHold={() => heldOrder.handleHoldSale(clearForm)}
          onRelease={heldOrder.handleReleaseSale}
          onPreviewReceipt={receiptPrinting.openReceiptPreview}
          canPreviewReceipt={canPreviewReceipt}
          proceedBtnRef={proceedBtnRef}
          onProceed={checkout.handleProceedClick}
        />
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
        isOpen={cart.cartItemModal}
        closeModal={cart.closeCartItemModal}
        item={cart.selectedCartItem}
        onUpdate={cart.handleCartItemUpdate}
        onRemove={cart.removeItemFromList}
        onClose={focusSearch}
      />

      {/* Checkout Summary Modal */}
      <CheckoutSummaryModal
        isOpen={checkout.checkoutModal}
        closeModal={checkout.closeCheckoutModal}
        selectedItems={cart.selectedItems}
        selectedMember={selectedMember}
        stockTotal={cart.stockTotal}
        onConfirmSale={checkout.handleConfirmSale}
      />

      {/* Clear Cart Confirmation Modal */}
      <ClearCartConfirmModal
        isOpen={isClearConfirmOpen}
        onCancel={closeClearConfirm}
        onConfirm={confirmClearCart}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        isOpen={receiptPrinting.isReceiptPreviewOpen}
        onClose={() => receiptPrinting.setIsReceiptPreviewOpen(false)}
        billData={receiptPreviewBillData}
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
