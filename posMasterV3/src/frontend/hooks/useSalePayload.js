/**
 * Sale payload builder hook.
 *
 * Builds the request bodies sent to salesApi.create / salesApi.hold /
 * salesApi.completeHeld from the current cart + customer + session state.
 * Kept independent of cart mutation, checkout flow, and held-order state so
 * both the checkout hook and the held-order hook can share it without a
 * circular dependency between them.
 */
export function useSalePayload({
  invoiceNo,
  resolvedBranchId,
  selectedMember,
  currentUser,
  stockTotal,
  selectedItems,
  getCartUnitPrice
}) {
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

  return {
    getSelectedMemberId,
    getSalesSessionId,
    buildSaleItemsPayload,
    buildSalePayload
  };
}
