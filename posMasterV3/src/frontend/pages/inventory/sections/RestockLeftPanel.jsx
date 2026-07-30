import React from "react";
import { ChevronDown, ChevronUp, Package, Layers, Building2, RotateCcw, Plus, Trash2, Sparkles } from "lucide-react";
import barcodeImg from "../../../assets/barcode.png";
import { appendCurrentTimeToDate, extractDateOnly } from "../../../util/common/date";

// Left column of the restock page: supplier / item / stock / return /
// dispose accordion blocks plus the bottom Cancel/Add action bar. This is
// a straight extraction of the original inline JSX — props map 1:1 to the
// state and handlers the original component closed over directly.
export default function RestockLeftPanel({
  openFormBlock,
  setopenFormBlock,
  // supplier block
  formDataSupplier,
  handleSupplierInputChange,
  suppliers,
  transactionErrors,
  setTransactionData,
  setTransactionErrors,
  // item description block
  formDataRegItem,
  // stock description block
  formDataStock,
  setFormDataStock,
  formErrors,
  handleStockInputChange,
  requiresMeasuredSellingRate,
  isKgSaleItem,
  stockEntries,
  setStockBatchCodeFromEntry,
  // return description block
  returnItemSelected,
  formDataReturnItem,
  handleReturnItemInputChange,
  formReturnErrors,
  // dispose description block
  disposeItemSelected,
  formDataDisposeItem,
  handleDisposeItemInputChange,
  formDisposeErrors,
  // bottom action bar
  clearFormInput,
  setReturnItemSelected,
  setDisposeItemSelected,
  setFormDataDisposeItem,
  setFormDisposeErrors,
  setStockEntries,
  addDisposeItem,
  addNewRegItem,
}) {
  return (
    <div className="bg-gray-100 w-[calc(28rem)] h-[calc(100vh-2rem)] p-3 z-10 flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* ▼ supplier description block ▼ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setopenFormBlock('supplier')}
            className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supplier</span>
            </div>
            {(openFormBlock == 'supplier') ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {(openFormBlock == 'supplier') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 pt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Supplier
                  </label>
                  <select
                    name="supplier_name"
                    value={formDataSupplier.supplier_name}
                    onChange={(e) => {
                      handleSupplierInputChange(e);
                      const selectedSupplierName = e.target.value;
                      const selectedSupplier = (suppliers || []).find(supplier => supplier?.basic_info?.supplier_name === selectedSupplierName);
                      if (selectedSupplier) {
                        setTransactionData(prev => ({
                          ...prev,
                          supplier_id: selectedSupplier.id,
                          supplierName: selectedSupplier?.basic_info?.supplier_name,
                          previousAmount: selectedSupplier?.financial_info?.previous_amount
                        }));
                        // Clear supplier error when selected
                        setTransactionErrors(prev => {
                          const next = { ...prev };
                          delete next.supplier;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                      transactionErrors.supplier
                        ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]'
                    }`}
                  >
                    <option value="">Select supplier</option>
                    {(suppliers || []).map((supplier, index) => (
                      <option key={`${supplier.id || supplier._id || supplier?.basic_info?.supplier_name || "supplier"}-${index}`} value={supplier?.basic_info?.supplier_name}>
                        {supplier?.basic_info?.supplier_name}
                      </option>
                    ))}
                  </select>
                  {transactionErrors.supplier && (
                    <p className="text-red-500 text-xs mt-1">{transactionErrors.supplier}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Invoice No
                    </label>
                    <input
                      type="text"
                      name="invoice_no"
                      value={formDataSupplier.invoice_no}
                      onChange={handleSupplierInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Bill No
                    </label>
                    <input
                      type="text"
                      name="bill_no"
                      value={formDataSupplier.bill_no}
                      onChange={handleSupplierInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Payment Method
                    </label>
                    <select
                      name="payment_method"
                      value={formDataSupplier.payment_method}
                      onChange={(e) => {
                        handleSupplierInputChange(e);
                        if (e.target.value) {
                          setTransactionErrors(prev => {
                            const next = { ...prev };
                            delete next.paymentMethod;
                            return next;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                        transactionErrors.paymentMethod
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]'
                      }`}
                    >
                      <option value="">Select method</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                    {transactionErrors.paymentMethod && (
                      <p className="text-red-500 text-xs mt-1">{transactionErrors.paymentMethod}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Expenses (Rs.)
                    </label>
                    <input
                      type="number"
                      name="expenses"
                      value={formDataSupplier.expenses}
                      onChange={handleSupplierInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ▼ item description block ▼ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setopenFormBlock('item')}
            className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Item Description</span>
            </div>
            {openFormBlock == 'item' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {(openFormBlock == 'item') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="flex flex-row items-center gap-4 pt-4">
                <div className="flex flex-col items-center">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <img src={barcodeImg} alt="Barcode" className="w-20 object-contain" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono">{formDataRegItem.sku || 'No SKU'}</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Name</p>
                      <p className="text-sm font-semibold text-gray-800">{formDataRegItem.item_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">SKU</p>
                      <p className="text-sm font-mono font-medium text-gray-700">{formDataRegItem.sku || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Product Code</p>
                      <p className="text-sm font-mono font-medium text-gray-700">{formDataRegItem.item_code || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Category</p>
                      <p className="text-sm font-medium text-gray-700">{formDataRegItem?.category?.type || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ▼ stock description block ▼ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setopenFormBlock('stock')}
            className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#1A318C]" />
              </div>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stock Description</span>
            </div>
            {openFormBlock == 'stock' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {(openFormBlock == 'stock') && (
            <div className="px-4 pb-4 border-t border-gray-100 h-[34rem] overflow-y-auto">
              <div className="space-y-3 pt-4">
                {/* Batch Code - Full Width */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Batch Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="batch_code"
                      value={formDataStock.batch_code}
                      onChange={handleStockInputChange}
                      className={`flex-1 px-4 py-2.5 border rounded-lg text-sm ${
                        formErrors.batch_code ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sku = formDataRegItem.sku || 'ITEM';
                        const batchNum = String(stockEntries.length + 1).padStart(3, '0');
                        const newBatchCode = `BATCH-${sku}-${batchNum}`;
                        setFormDataStock(prev => ({ ...prev, batch_code: newBatchCode }));
                      }}
                      className="px-3 py-2.5 bg-[#1A318C] hover:bg-[#152870] text-white rounded-lg transition-colors flex items-center justify-center"
                      title="Generate Batch Code"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                  {formErrors.batch_code && <p className="text-red-500 text-xs mt-1">{formErrors.batch_code}</p>}
                </div>
                {/* Quantity - Full Width */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    step={requiresMeasuredSellingRate ? "0.01" : "1"}
                    value={formDataStock.quantity}
                    onChange={handleStockInputChange}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                      formErrors.quantity ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                    } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                  />
                  {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Threshold (%)
                    </label>
                    <input
                      type="number"
                      name="threshold_limit"
                      value={formDataStock.threshold_limit}
                      onChange={handleStockInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formErrors.threshold_limit ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formErrors.threshold_limit && <p className="text-red-500 text-xs mt-1">{formErrors.threshold_limit}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Availability
                    </label>
                    <select
                      name="availability"
                      value={String(formDataStock.availability)}
                      onChange={(e) => setFormDataStock(prev => ({ ...prev, availability: e.target.value === "true" }))}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                        formErrors.availability ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer`}
                    >
                      <option value="">Select</option>
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Stock Price
                    </label>
                    <input
                      type="number"
                      name="stock_price"
                      value={formDataStock.stock_price}
                      onChange={handleStockInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formErrors.stock_price ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formErrors.stock_price && <p className="text-red-500 text-xs mt-1">{formErrors.stock_price}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Retail Price
                    </label>
                    <input
                      type="number"
                      name="retail_price"
                      value={formDataStock.retail_price}
                      onChange={handleStockInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formErrors.retail_price ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formErrors.retail_price && <p className="text-red-500 text-xs mt-1">{formErrors.retail_price}</p>}
                  </div>
                </div>
                {requiresMeasuredSellingRate && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      {isKgSaleItem ? "Selling Value per 1 KG" : "Selling Value per 1 Liter"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name={isKgSaleItem ? "selling_price_per_kg" : "selling_price_per_liter"}
                      value={isKgSaleItem ? formDataStock.selling_price_per_kg : formDataStock.selling_price_per_liter}
                      onChange={handleStockInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formErrors[isKgSaleItem ? "selling_price_per_kg" : "selling_price_per_liter"]
                          ? "border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Sales line totals for this UOM use this rate.
                    </p>
                    {formErrors[isKgSaleItem ? "selling_price_per_kg" : "selling_price_per_liter"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[isKgSaleItem ? "selling_price_per_kg" : "selling_price_per_liter"]}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      id="expired_datetime"
                      value={formDataStock.expired_datetime ? formDataStock.expired_datetime.split('T')[0] : ''}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        if (selectedDate) {
                          const localDateTime = appendCurrentTimeToDate(selectedDate);
                          setFormDataStock({
                            ...formDataStock,
                            expired_datetime: localDateTime,
                          });
                        } else {
                          setFormDataStock({
                            ...formDataStock,
                            expired_datetime: null,
                          });
                        }
                      }}
                      name="expired_datetime"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                        formErrors.expired_datetime ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formErrors.expired_datetime && <p className="text-red-500 text-xs mt-1">{formErrors.expired_datetime}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Discount (Rs.)
                    </label>
                    <input
                      type="number"
                      name="discount"
                      value={formDataStock.discount}
                      onChange={handleStockInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formErrors.discount ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formErrors.discount && <p className="text-red-500 text-xs mt-1">{formErrors.discount}</p>}
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Batch Codes</p>
                  <div className="flex flex-col gap-2 max-h-[10rem] overflow-y-auto pr-1">
                    {stockEntries.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-400">No recent batches</p>
                      </div>
                    ) : (
                      stockEntries.map((s, i) => (
                        <div
                          key={`${s.batch_code || s.code || "batch"}-${i}`}
                          onClick={() => setStockBatchCodeFromEntry(s)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                            s.batch_code === formDataStock.batch_code
                              ? 'bg-[#1A318C]/10 border-2 border-[#1A318C]'
                              : 'bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div>
                            <p className="text-xs text-gray-400">Batch Code</p>
                            <p className="text-sm font-semibold text-gray-800">{s.batch_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-800 tabular-nums">{s.qty} units</p>
                            <p className="text-xs text-gray-400">{s.exp_date ? extractDateOnly(s.exp_date) : 'N/A'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ▼ return description block ▼ */}
        {(returnItemSelected) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setopenFormBlock('return')}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Return</span>
              </div>
              {openFormBlock === 'return' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFormBlock === 'return' && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-3 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formDataReturnItem.quantity}
                      onChange={handleReturnItemInputChange}
                      placeholder="Enter quantity"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formReturnErrors.quantity ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formReturnErrors.quantity && <p className="text-red-500 text-xs mt-1">{formReturnErrors.quantity}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Description
                    </label>
                    <textarea
                      name="return_description"
                      value={formDataReturnItem.return_description}
                      onChange={handleReturnItemInputChange}
                      placeholder="Enter return reason..."
                      rows={3}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                        formReturnErrors.return_description ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all resize-none`}
                    />
                    {formReturnErrors.return_description && <p className="text-red-500 text-xs mt-1">{formReturnErrors.return_description}</p>}
                  </div>
                </div>
                {/* <p className="text-gray-400 font-semibold">Select the batchcode</p>
                <div className="flex flex-col gap-3 overflow-y-scroll overflow-x-hidden h-[13rem] -mr-4">
                  {stockEntries.length === 0 ? (
                    <div className="text-gray-500">No batches available</div>
                  ) : (
                    stockEntries.map((s, i) => (
                      <div key={`${s.batch_code || s.code || "batch"}-${i}`} className="flex flex-row items-center justify-between bg-[#F6F6F6] px-2 py-1 text-sm text-black w-[380px]"
                      onClick={()=>_setReturnBatchCodeFromEntry(s.batch_code)}>
                        <div className="flex flex-col">
                          <span className="text-md font-bold">SKU:</span>
                          <span className="text-gray-600">{s.sku}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 font-bold">{s.qty} units</span>
                          <span className="text-gray-400">{s.exp_date ? extractDateOnly(s.exp_date) : ''} Exp</span>
                        </div>
                      </div>
                    ))
                  )}

                </div> */}
              </div>

            )}
          </div>
        )}




        {/* ▼ dispose description block ▼ */}
        {disposeItemSelected && (
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setopenFormBlock('dispose')}
              className="w-full flex justify-between items-center px-4 py-3 hover:bg-amber-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dispose Description</span>
              </div>
              {openFormBlock === 'dispose' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openFormBlock === 'dispose' && (
              <div className="px-4 pb-4 border-t border-amber-100">
                <div className="space-y-3 pt-4">
                  {/* Selected batch info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">Batch</p>
                      <p className="text-sm font-bold text-gray-800">{formDataDisposeItem.batch_code || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">Available</p>
                      <p className="text-sm font-bold text-gray-800">{formDataDisposeItem.available_qty ?? '—'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Quantity to Dispose
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formDataDisposeItem.quantity}
                      onChange={handleDisposeItemInputChange}
                      placeholder="Enter quantity"
                      min="1"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm tabular-nums ${
                        formDisposeErrors.quantity ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-amber-500/20 focus:border-amber-500"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {formDisposeErrors.quantity && <p className="text-red-500 text-xs mt-1">{formDisposeErrors.quantity}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Reason
                    </label>
                    <textarea
                      name="reason"
                      value={formDataDisposeItem.reason}
                      onChange={handleDisposeItemInputChange}
                      placeholder="Enter reason for disposal..."
                      rows={3}
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                        formDisposeErrors.reason ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:ring-amber-500/20 focus:border-amber-500"
                      } bg-gray-50 focus:outline-none focus:ring-2 transition-all resize-none`}
                    />
                    {formDisposeErrors.reason && <p className="text-red-500 text-xs mt-1">{formDisposeErrors.reason}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* End of scrollable content area */}
      </div>
      {/* Bottom bar */}
      <div className="flex flex-row w-full gap-2 pt-3 flex-shrink-0">
        <button
          onClick={() => {
            clearFormInput();
            setReturnItemSelected(false);
            setDisposeItemSelected(false);
            setFormDataDisposeItem({ stock_id: "", quantity: "", reason: "" });
            setFormDisposeErrors({});
            setStockEntries([]);
          }}
          className="flex-1 min-w-0 h-11 px-3 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={disposeItemSelected ? addDisposeItem : addNewRegItem}
          disabled={!(formDataRegItem.id ?? formDataRegItem._id) || (formDataRegItem.id ?? formDataRegItem._id) === 0}
          className={`flex-1 min-w-0 h-11 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 ${
            disposeItemSelected
              ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
              : "bg-[#1A318C] enabled:hover:bg-[#152870] shadow-blue-900/20"
          }`}
        >
          <Plus className="w-4 h-4" />
          {disposeItemSelected ? "Dispose Item" : "Add Item"}
        </button>
      </div>
      {formErrors.item_id && (
        <p className="text-xs text-red-500 mt-1">{formErrors.item_id}</p>
      )}
    </div>
  );
}
