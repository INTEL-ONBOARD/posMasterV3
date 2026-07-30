import { useCallback, useState } from "react";
import { salesApi } from "../api/localApi";

/**
 * Pure helper: normalizes a held sale's stored item shape (itemId/item_id,
 * unitPrice/unit_price, etc.) before it's sent back to the backend to
 * complete a previously-held sale. Exported standalone (not tied to hook
 * state) so the checkout flow can reuse it when finishing a released held
 * order.
 */
export const mergeHeldSaleItems = (items = []) =>
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

/** Pure helper: resolves the DB id of a held sale record. */
export const getHeldSaleId = (sale) => sale?.id || sale?._id || sale?.saleId || sale?.sale_id || null;

/** Pure helper: builds a member-shaped object out of a held sale record. */
export const getHeldSaleMember = (sale) => {
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

/**
 * Held-order (hold/release) state and logic for the sales terminal: the
 * most recently held order for this cashier/session, the held order
 * currently restored into the cart, and the hold/release/fetch handlers.
 */
export function useHeldOrder({
  currentUser,
  selectedItems,
  setSelectedItems,
  setSelectedMember,
  invoiceNo,
  setInvoiceNo,
  resolvedBranchId,
  buildSalePayload,
  getSalesSessionId,
  setStatusModal,
  focusSearch,
  guestUser
}) {
  const [heldOrder, setHeldOrder] = useState(null); // the most recent held order
  const [releasedHeldOrder, setReleasedHeldOrder] = useState(null); // held order currently restored into cart

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
  // getSalesSessionId is a stable sessionStorage accessor; matches the original
  // component-scoped dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAdminUser]);

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

  // Hold sale for later - saves to DB without completing payment or decrementing stock.
  // `onSuccess` (e.g. clearForm) is invoked after a successful hold so this hook doesn't
  // need to depend on the cart/member/invoice reset logic that lives in the page.
  const handleHoldSale = async (onSuccess) => {
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
        onSuccess?.();
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
      setSelectedMember(guestUser);
    }

    setHeldOrder(null);
    setStatusModal({ open: true, type: 'success', description: "Held sale restored to cart" });
    focusSearch();
  };

  return {
    heldOrder,
    setHeldOrder,
    releasedHeldOrder,
    setReleasedHeldOrder,
    fetchHeldOrder,
    buildHeldOrderSnapshot,
    handleHoldSale,
    handleReleaseSale,
    getHeldSaleId,
    getHeldSaleMember,
    mergeHeldSaleItems
  };
}
