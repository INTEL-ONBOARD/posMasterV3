import { useState } from "react";
import { salesApi, restockApi } from "../api/localApi";

/**
 * Checkout/payment flow state and handlers for the sales terminal: the
 * checkout summary modal, cart validation against live stock, submitting
 * the sale (fresh or completing a released held order), and triggering the
 * receipt print once the sale is saved.
 */
export function useCheckout({
  resolvedBranchId,
  invoiceNo,
  generateNewInvoice,
  selectedItems,
  supportsDecimalSaleQuantity,
  buildSalePayload,
  releasedHeldOrder,
  setReleasedHeldOrder,
  setHeldOrder,
  fetchHeldOrder,
  getHeldSaleId,
  getHeldSaleMember,
  mergeHeldSaleItems,
  currentUser,
  setStatusModal,
  setLastReceiptData,
  buildBillDataSnapshot,
  printReceipt,
  clearForm
}) {
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

  return {
    checkoutModal,
    setCheckoutModal,
    saleCompleted,
    closeCheckoutModal,
    handleConfirmSale,
    handleProceedClick
  };
}
