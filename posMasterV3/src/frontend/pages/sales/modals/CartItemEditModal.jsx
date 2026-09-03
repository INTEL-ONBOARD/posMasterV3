import React, { useState, useEffect, useRef } from "react";
import { X, Package, Minus, Plus, Tag, Layers } from "lucide-react";
import barcodeImg from "../../../assets/barcode.png";
import placeholderImg from "../../../assets/card_placeholder_img.png";
import { restockApi } from "../../../api/localApi";
import { extractDateOnly } from "../../../util/common/date";
import { getEffectiveSellingPrice, supportsDecimalSaleQuantity } from "../../../util/common/uomPricing";

function CartItemEditModal({ isOpen, closeModal, item, onUpdate, onRemove, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState("0");
  const [stockEntries, setStockEntries] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const quantityInputRef = useRef(null);
  const updateBtnRef = useRef(null);
  const maxQuantityRef = useRef(0);
  const uomSymbol = item?.uom?.symbol || item?.uom_symbol || '';
  const isDecimalQuantityUom = supportsDecimalSaleQuantity(uomSymbol);

  // Fetch stock entries when item changes
  useEffect(() => {
    if (item?.sku) {
      fetchStockEntries(item.sku);
    }
  }, [item?.sku]);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setQuantity(item.customer_quantity || 1);
      setDiscount(String(item.customer_discount || 0));
    }
  }, [item]);

  // Auto-focus quantity input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => quantityInputRef.current?.focus(), 80);
    }
  }, [isOpen, isDecimalQuantityUom]);

  // Keyboard +/- to adjust quantity while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in the discount input
      if (e.target === quantityInputRef.current) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const step = isDecimalQuantityUom ? 0.25 : 1;
        setQuantity(q => {
          const newQ = Math.min(maxQuantityRef.current, q + step);
          return isDecimalQuantityUom ? Math.round(newQ * 100) / 100 : newQ;
        });
      } else if (e.key === '-') {
        e.preventDefault();
        const step = isDecimalQuantityUom ? 0.25 : 1;
        const minQty = isDecimalQuantityUom ? 0.01 : 1;
        setQuantity(q => {
          const newQ = Math.max(minQty, q - step);
          return isDecimalQuantityUom ? Math.round(newQ * 100) / 100 : newQ;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDecimalQuantityUom]);

  // Set selected batch when stock entries are loaded
  useEffect(() => {
    if (stockEntries.length > 0 && item) {
      // Find the batch that matches the current item's batch_code
      const currentBatch = stockEntries.find(s => s.batch_code === item.batch_code);
      if (currentBatch) {
        setSelectedBatch(currentBatch);
      } else {
        // Default to first batch (FIFO)
        setSelectedBatch(stockEntries[0]);
      }
    }
  }, [stockEntries, item]);

  const unitPrice = item ? getEffectiveSellingPrice({
    ...item,
    ...(selectedBatch || {}),
    uom: item.uom,
    uom_symbol: item.uom?.symbol || item.uom_symbol
  }) : 0;

  useEffect(() => {
    if (discount === "") return;
    const numericDiscount = parseFloat(discount);
    if (!Number.isNaN(numericDiscount) && numericDiscount > unitPrice) {
      setDiscount(String(unitPrice.toFixed(2)));
    }
  }, [unitPrice, discount]);

  const fetchStockEntries = async (sku) => {
    if (!sku) return;
    setIsLoadingBatches(true);
    try {
      const response = await restockApi.getStockData(sku);
      if (response) {
        if (response.status === 'success' && Array.isArray(response.data)) {
          setStockEntries(response.data);
        } else if (Array.isArray(response)) {
          setStockEntries(response);
        } else if (Array.isArray(response.data)) {
          setStockEntries(response.data);
        } else {
          setStockEntries([]);
        }
      } else {
        setStockEntries([]);
      }
    } catch (err) {
      console.error('Failed to fetch stock entries for', sku, err);
      setStockEntries([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  if (!isOpen || !item) return null;

  // Use ?? not || so a genuine 0-stock batch reads as 0, not the old 999
  // fallback — a falsy 0 must not fall through to "unlimited".
  const maxQuantity = selectedBatch?.qty ?? item.quantity ?? 0;
  maxQuantityRef.current = maxQuantity;
  const discountAmount = Math.max(0, Math.min(unitPrice, parseFloat(discount) || 0));
  const lineTotal = Math.max(0, (unitPrice - discountAmount) * quantity);
  const hasMultipleBatches = stockEntries.length > 1;

  const minQuantity = isDecimalQuantityUom ? 0.01 : 1;
  const quantityStep = isDecimalQuantityUom ? 0.25 : 1;
  const getBatchRowKey = (batch, index) => {
    const stableId = batch?.id ?? batch?.stock_id ?? batch?.stockId;
    if (stableId !== undefined && stableId !== null && stableId !== "") {
      return `batch-${stableId}-${index}`;
    }

    const batchCode = batch?.batch_code || "batch";
    const expDate = batch?.exp_date || batch?.expiry_date || "no-exp";
    const qty = batch?.qty ?? "no-qty";
    return `${batchCode}-${expDate}-${qty}-${index}`;
  };

  const handleQuantityChange = (delta) => {
    const newQty = Math.max(minQuantity, Math.min(maxQuantity, quantity + (delta * quantityStep)));
    setQuantity(isDecimalQuantityUom ? Math.round(newQty * 100) / 100 : newQty);
  };

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    // Reset quantity if it exceeds the new batch's available quantity
    if (quantity > batch.qty) {
      setQuantity(batch.qty);
    }
  };

  const handleDiscountChange = (value) => {
    const normalized = String(value).replace(/,/g, "");

    if (normalized === "") {
      setDiscount("");
      return;
    }

    if (!/^\d*\.?\d*$/.test(normalized)) return;

    const nextValue = normalized.startsWith(".") ? `0${normalized}` : normalized;
    setDiscount(nextValue);
  };

  const applyDiscountPercentage = (percentage) => {
    const amount = unitPrice * (percentage / 100);
    setDiscount(amount.toFixed(2));
  };

  const handleUpdate = () => {
    onUpdate({
      ...item,
      // Update with selected batch info
      batch_code: selectedBatch?.batch_code || item.batch_code,
      retail_price: unitPrice,
      unit_price: unitPrice,
      stock_price: selectedBatch?.stock_price || item.stock_price,
      selling_price_per_kg: selectedBatch?.selling_price_per_kg ?? selectedBatch?.sellingPricePerKg ?? item.selling_price_per_kg ?? 0,
      selling_price_per_liter: selectedBatch?.selling_price_per_liter ?? selectedBatch?.sellingPricePerLiter ?? item.selling_price_per_liter ?? 0,
      quantity: selectedBatch?.qty || item.quantity,
      expiry_date: selectedBatch?.exp_date || item.expiry_date,
      customer_quantity: quantity,
      customer_discount: discountAmount,
      uom_symbol: item.uom?.symbol || item.uom_symbol || ""
    });
    closeModal();
    onClose?.();
  };

  const handleRemove = () => {
    onRemove(item.id);
    closeModal();
    onClose?.();
  };

  const imageSrc = item.item_image_url || placeholderImg;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal Content */}
      <div
        className="relative z-10 w-[760px] max-w-[95vw] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                <img src={imageSrc} alt={item.item_name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{item.item_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <img src={barcodeImg} alt="" className="h-3.5 brightness-0 invert opacity-50" />
                  <span className="text-xs text-slate-400 font-mono truncate">{item.sku}</span>
                  {/* Category chips are omitted when unknown rather than printing "Unknown". */}
                  {item.category?.type && (
                    <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-slate-300 truncate">
                      {item.category.type}
                    </span>
                  )}
                  {item.category?.brand && (
                    <span className="text-[11px] bg-[#1A318C]/80 px-2 py-0.5 rounded text-white truncate">
                      {item.category.brand}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Two-column body: batches left, controls right */}
          <div className="grid grid-cols-2 min-h-0 flex-1 overflow-hidden">
            {/* ---- Left: batches ---- */}
            <div className="p-5 overflow-y-auto border-r border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold text-gray-700">
                  {hasMultipleBatches ? "Select Batch" : "Batch"}
                </span>
                {hasMultipleBatches && (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full ml-auto">
                    {stockEntries.length} batches
                  </span>
                )}
              </div>

              {isLoadingBatches ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                </div>
              ) : stockEntries.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">
                  {item.batch_code || "No batch information available"}
                </p>
              ) : (
                <div className="space-y-2">
                  {stockEntries.map((batch, index) => {
                    const isSelected = selectedBatch?.batch_code === batch.batch_code;
                    const batchQty = Number(batch.qty ?? 0);
                    // An empty batch can't be sold from — selecting it would set
                    // the quantity ceiling to 0 and let an out-of-stock line
                    // reach the cart.
                    const isEmpty = batchQty <= 0;

                    return (
                      <button
                        key={getBatchRowKey(batch, index)}
                        onClick={() => handleBatchSelect(batch)}
                        disabled={isEmpty}
                        title={isEmpty ? "No stock left in this batch" : undefined}
                        className={`w-full p-3 rounded-lg text-left transition-all border ${
                          isEmpty
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "bg-teal-600 border-teal-600 text-white shadow-md"
                              : "bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${
                              isEmpty ? "text-slate-500" : isSelected ? "text-white" : "text-gray-800"
                            }`}>
                              {batch.batch_code}
                              {isEmpty && (
                                <span className="ml-2 text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded align-middle">
                                  Out
                                </span>
                              )}
                            </p>
                            <p className={`text-xs mt-0.5 ${
                              isEmpty ? "text-slate-400" : isSelected ? "text-teal-100" : "text-gray-500"
                            }`}>
                              Exp: {batch.exp_date ? extractDateOnly(batch.exp_date) : "N/A"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold tabular-nums ${
                              isEmpty ? "text-red-500" : isSelected ? "text-white" : "text-emerald-600"
                            }`}>
                              {batchQty} {item.uom?.symbol || item.uom_symbol || "units"}
                            </p>
                            <p className={`text-xs tabular-nums ${
                              isEmpty ? "text-slate-400" : isSelected ? "text-teal-100" : "text-gray-500"
                            }`}>
                              Rs.{Number(getEffectiveSellingPrice({
                                ...item,
                                ...batch,
                                uom: item.uom,
                                uom_symbol: item.uom?.symbol || item.uom_symbol
                              }) || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ---- Right: quantity, discount, total ---- */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              {/* Unit price / availability replaces the old duplicated tile row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Unit price</span>
                <span className="font-bold text-gray-800 tabular-nums">Rs.{unitPrice.toFixed(2)}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Quantity</span>
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums">
                    Max {maxQuantity} {item.uom?.symbol || ""}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= minQuantity}
                    className="w-11 h-11 rounded-xl bg-white border-2 border-gray-200 text-gray-600 hover:border-[#1A318C] hover:text-[#1A318C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <input
                    ref={quantityInputRef}
                    type="number"
                    step={isDecimalQuantityUom ? "0.01" : "1"}
                    value={quantity}
                    onChange={(e) => {
                      const val = isDecimalQuantityUom ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setQuantity(minQuantity);
                        return;
                      }
                      const nextValue = Math.max(minQuantity, Math.min(maxQuantity, val));
                      setQuantity(isDecimalQuantityUom ? Math.round(nextValue * 100) / 100 : Math.trunc(nextValue));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        updateBtnRef.current?.focus();
                      }
                    }}
                    className="flex-1 min-w-0 h-11 text-center text-2xl font-bold text-gray-800 bg-white border-2 border-[#1A318C] rounded-xl focus:outline-none tabular-nums"
                  />

                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= maxQuantity}
                    className="w-11 h-11 rounded-xl bg-white border-2 border-gray-200 text-gray-600 hover:border-[#1A318C] hover:text-[#1A318C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">Item discount</span>
                  <span className="text-xs text-gray-500 ml-auto tabular-nums">
                    per unit {discountAmount > 0 && unitPrice > 0
                      ? `-${((discountAmount / unitPrice) * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rs.</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    onBlur={() => setDiscount(String(discountAmount.toFixed(2)))}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-orange-200 rounded-xl text-base font-semibold text-orange-600 focus:outline-none focus:border-orange-400 tabular-nums"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {[10, 25, 50, 75, 100].map((percentage, index) => (
                    <button
                      key={`discount-${percentage}-${index}`}
                      type="button"
                      onClick={() => applyDiscountPercentage(percentage)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-white border border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors"
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A318C] rounded-xl p-4 flex items-center justify-between gap-3 mt-auto">
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-300 uppercase tracking-wide font-bold">Line total</p>
                  <p className="text-xs text-blue-200 mt-0.5 tabular-nums truncate">
                    {quantity} {item.uom?.symbol || ''} &times; Rs.{(unitPrice - discountAmount).toFixed(2)}
                  </p>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums shrink-0">Rs.{lineTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Footer — its own row, so it can never overlap the line total */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
            <button
              onClick={handleRemove}
              className="px-4 py-3 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors text-sm border border-red-200"
            >
              Remove
            </button>
            <button
              onClick={closeModal}
              className="flex-1 py-3 bg-white border border-slate-200 text-gray-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              ref={updateBtnRef}
              onClick={handleUpdate}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); }}
              className="flex-1 py-3 bg-[#1A318C] text-white rounded-xl font-semibold hover:bg-[#152870] transition-colors text-sm"
            >
              Update Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartItemEditModal;
