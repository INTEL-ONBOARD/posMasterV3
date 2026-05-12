import React, { useState, useEffect, useRef } from "react";
import { X, Package, Minus, Plus, Tag, Layers } from "lucide-react";
import barcodeImg from "../../../assets/barcode.png";
import placeholderImg from "../../../assets/card_placeholder_img.png";
import { restockApi } from "../../../api/localApi";
import { extractDateOnly } from "../../../util/common/date";
import { getEffectiveSellingPrice, supportsDecimalSaleQuantity } from "../../../util/common/uomPricing";

function CartItemEditModal({ isOpen, closeModal, item, onUpdate, onRemove, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [stockEntries, setStockEntries] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const quantityInputRef = useRef(null);
  const updateBtnRef = useRef(null);
  const maxQuantityRef = useRef(999);
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
      setDiscount(item.customer_discount || 0);
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

  const unitPrice = getEffectiveSellingPrice({
    ...item,
    ...(selectedBatch || {}),
    uom: item.uom,
    uom_symbol: item.uom?.symbol || item.uom_symbol
  });
  const maxQuantity = selectedBatch?.qty || item.quantity || 999;
  maxQuantityRef.current = maxQuantity;
  const lineTotal = (unitPrice - discount) * quantity;
  const hasMultipleBatches = stockEntries.length > 1;

  const minQuantity = isDecimalQuantityUom ? 0.01 : 1;
  const quantityStep = isDecimalQuantityUom ? 0.25 : 1;
  const getBatchRowKey = (batch, index) => {
    const stableId = batch?.id ?? batch?.stock_id ?? batch?.stockId;
    if (stableId !== undefined && stableId !== null && stableId !== "") {
      return `batch-${stableId}`;
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
      customer_discount: discount,
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
        className="relative z-10 w-[480px] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Image */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5">
            <div className="flex items-start gap-4">
              {/* Item Image */}
              <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={imageSrc}
                  alt={item.item_name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{item.item_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-300">
                    {item.category?.type || "Unknown"}
                  </span>
                  <span className="text-xs bg-[#1A318C]/80 px-2 py-0.5 rounded text-white">
                    {item.category?.brand || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <img src={barcodeImg} alt="Barcode" className="h-4 brightness-0 invert opacity-50" />
                  <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Batch Selection - Only show if multiple batches */}
            {hasMultipleBatches && (
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-gray-700">Select Batch</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full ml-auto">
                    {stockEntries.length} batches
                  </span>
                </div>

                {isLoadingBatches ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {stockEntries.map((batch, index) => (
                      <button
                        key={getBatchRowKey(batch, index)}
                        onClick={() => handleBatchSelect(batch)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedBatch?.batch_code === batch.batch_code
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white border border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-semibold ${
                              selectedBatch?.batch_code === batch.batch_code ? 'text-white' : 'text-gray-800'
                            }`}>
                              {batch.batch_code}
                            </p>
                            <p className={`text-xs mt-0.5 ${
                              selectedBatch?.batch_code === batch.batch_code ? 'text-teal-100' : 'text-gray-500'
                            }`}>
                              Exp: {batch.exp_date ? extractDateOnly(batch.exp_date) : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              selectedBatch?.batch_code === batch.batch_code ? 'text-white' : 'text-emerald-600'
                            }`}>
                              {batch.qty} {item.uom?.symbol || item.uom_symbol || 'units'}
                            </p>
                            <p className={`text-xs ${
                              selectedBatch?.batch_code === batch.batch_code ? 'text-teal-100' : 'text-gray-500'
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Price & Stock Info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Unit Price</p>
                <p className="text-lg font-bold text-gray-800 mt-1">Rs.{unitPrice.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Batch</p>
                <p className="text-xs font-semibold text-gray-800 mt-1 truncate">
                  {selectedBatch?.batch_code || item.batch_code || "N/A"}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                <p className="text-[10px] text-emerald-600 uppercase tracking-wide font-medium">Available</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">{maxQuantity}</p>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Quantity</span>
                </div>
                <span className="text-xs text-gray-400">Max: {maxQuantity} {item.uom?.symbol || ''}</span>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= minQuantity}
                  className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 text-gray-600 hover:border-[#1A318C] hover:text-[#1A318C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
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
                  className="w-24 h-12 text-center text-2xl font-bold text-gray-800 bg-white border-2 border-[#1A318C] rounded-xl focus:outline-none"
                />

                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxQuantity}
                  className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 text-gray-600 hover:border-[#1A318C] hover:text-[#1A318C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Discount Input */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">Item Discount</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rs.</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDiscount(Math.max(0, Math.min(unitPrice, val)));
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-lg font-semibold text-orange-600 focus:outline-none focus:border-orange-400"
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase">Per Unit</p>
                  <p className="text-sm font-medium text-gray-600">
                    {discount > 0 && unitPrice > 0 ? `-${((discount / unitPrice) * 100).toFixed(0)}%` : "0%"}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Total */}
            <div className="bg-[#1A318C] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300 uppercase tracking-wide font-medium">Line Total</p>
                <p className="text-xs text-blue-200 mt-0.5">
                  {quantity} {item.uom?.symbol || ''} x Rs.{(unitPrice - discount).toFixed(2)}
                </p>
              </div>
              <p className="text-2xl font-bold text-white">Rs.{lineTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 pb-5 flex gap-3">
            <button
              onClick={handleRemove}
              className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors text-sm border border-red-200"
            >
              Remove
            </button>
            <button
              onClick={closeModal}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
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
