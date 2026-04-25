import { X, Upload, Printer, Package, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useRef, forwardRef } from 'react';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';

export default function EditItemModal({ isOpen, onClose, onUpdate, item }) {

  const FIXED_COUNT = 21;
  const printRef = useRef();
  const fileInputRef = useRef();

  const [formData, setFormData] = useState({
    name: '',
    barcode: 'SKU-8938495',
    category: '',
    status: 'Available',
    thresholdLimit: '',
    maximumThreshold: '',
    quantity: '',
    uom: 'KG'
  });

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        barcode: item.barcode,
        category: item.category,
        status: 'Available',
        thresholdLimit: '',
        maximumThreshold: '',
        quantity: item.stock.toString(),
        uom: item.unit
      });
    }
  }, [item]);

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  const handleSave = () => {
    onUpdate({
      ...formData,
      id: item.id,
      price: item.price,
      image: item.image
    });
    onClose();
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Bulk-Barcodes',
    pageStyle: `
      @page { size: A4 landscape; margin: 0 }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        div[ref] { page-break-inside: avoid; }
      }
    `,
  });

  if (!isOpen || !item) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Hidden printable grid */}
      <div style={{ display: 'none' }}>
        <PrintableGrid
          ref={printRef}
          value={formData.barcode}
          count={FIXED_COUNT}
        />
      </div>

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Edit Item</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left - Image & SKU */}
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-[#1A318C]/30 hover:bg-[#1A318C]/5 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                  <X className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">No image</span>
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={openFileDialog}
                className="mt-4 px-4 py-2 bg-slate-700 text-white text-sm rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>

              {/* SKU Display */}
              <div className="mt-6 bg-slate-800 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">SKU</p>
                <p className="text-lg font-bold text-white font-mono">{formData.barcode}</p>
              </div>
            </div>

            {/* Right - Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  placeholder="Enter item name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    placeholder="Category"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="Available">Available</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Low Stock">Low Stock</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Threshold Limit
                  </label>
                  <input
                    type="number"
                    placeholder="12"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    UOM
                  </label>
                  <select
                    name="uom"
                    value={formData.uom}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer"
                  >
                    <option value="KG">KG</option>
                    <option value="PCS">PCS</option>
                    <option value="LTR">LTR</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handlePrint()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print Barcode
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1A318C] text-white rounded-xl text-sm font-semibold hover:bg-[#152870] transition-all shadow-md shadow-blue-900/20"
              >
                <RefreshCw className="w-4 h-4" />
                Update Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// Printable grid of N barcodes
const PrintableGrid = forwardRef(({ value, count }, ref) => {
  const slots = Array.from({ length: count }, () => `${value}`);

  return (
    <div
      ref={ref}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridAutoRows: 'minmax(50px, auto)',
        gap: '10px',
        width: '100vw',
        height: '100vh',
        padding: '10mm',
        boxSizing: 'border-box',
      }}
    >
      {slots.map((val) => (
        <div
          key={val}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '4mm',
            border: '1px solid #ccc',
          }}
        >
          <Barcode
            value={val}
            format="CODE128"
            width={1}
            height={40}
            displayValue
          />
        </div>
      ))}
    </div>
  );
});
