import { useCallback, useState } from "react";
import { useBarcodeScanner } from "./useBarcodeScanner";
import { getEffectiveSellingPrice } from "../util/common/uomPricing";

/**
 * Cart state + mutation logic for the sales/POS terminal: the selected line
 * items, the cart-item edit modal wiring, barcode-scan-to-add, quantity /
 * discount totals, and the cart-item edit modal (CartItemEditModal) state.
 */
export function useCart({ inventoryItems, isActive, setSearch }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastScannedCode, setLastScannedCode] = useState("");

  // Cart item edit modal state
  const [cartItemModal, setCartItemModal] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const closeCartItemModal = () => {
    setCartItemModal(false);
    setSelectedCartItem(null);
  };

  const removeItemFromList = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const getCartUnitPrice = (item) => (
    Number(item?.unit_price ?? item?.unitPrice ?? getEffectiveSellingPrice(item) ?? 0)
  );

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

  // Inline +/- on a cart row. Mirrors loadItemtoList's stepping rules so a
  // KG/Liter line moves in 0.5 increments while everything else stays whole,
  // and never drops below one step (removing is a separate explicit action).
  const changeQuantity = (id, direction) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const canUseDecimalQuantity = supportsDecimalSaleQuantity(item);
      const step = canUseDecimalQuantity ? 0.5 : 1;
      const next = (Number(item.customer_quantity) || 0) + (direction * step);
      const rounded = canUseDecimalQuantity ? Math.round(next * 100) / 100 : Math.round(next);
      return { ...item, customer_quantity: Math.max(step, rounded) };
    }));
  };

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

  return {
    selectedItems,
    setSelectedItems,
    lastScannedCode,
    cartItemModal,
    selectedCartItem,
    closeCartItemModal,
    removeItemFromList,
    getCartUnitPrice,
    supportsDecimalSaleQuantity,
    buildCartItem,
    loadItemtoList,
    stockTotal,
    changeQuantity,
    handleTableRowClick,
    handleItemCardClick,
    handleCartItemUpdate
  };
}
