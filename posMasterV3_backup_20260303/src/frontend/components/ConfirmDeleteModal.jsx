import { X, AlertTriangle, Package } from "lucide-react";
import { useState, useEffect } from "react";
import ItemCard from "./ItemCard";
import registerItemService from "../api/services/inventory/registerItemService";



export default function ConfirmDeleteModal({ open, item, onCancel, onSuccess }) {
  if (!open || !item) return null;

  const [status, setStatus] = useState(null); // 'success', 'fail', 'stock_error', or null
  const [errorMessage, setErrorMessage] = useState('');

  // Check if item has stock
  const hasStock = item && item.quantity > 0;

  const handleDeleteClick = async (selectedItemId) => {
    console.info("starting item deletion");

    try {
      const result = await registerItemService.deleteItem(selectedItemId);

      if (result.status === 'success') {
        console.log('Item deleted:', result.data);
        onSuccess();
        setStatus('success');
      } else {
        console.error('Delete failed:', result.message);
        // Check if it's a stock-related error
        if (result.message && result.message.toLowerCase().includes('stock')) {
          setStatus('stock_error');
          setErrorMessage(result.message);
        } else {
          setStatus('fail');
          setErrorMessage(result.message || 'Could not delete the item. Please try again.');
        }
      }
    } catch (error) {
      console.error("delete operation failed: " + error.message);
      setStatus('fail');
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  // Effect to automatically clear status after 3 seconds with dep. arr
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus(null);
        setErrorMessage('');
        onCancel();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ left: '12.5%' }}>
      <div className="bg-white shadow-2xl rounded-2xl p-6 w-[700px] max-w-full relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          onClick={onCancel}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {!status ? (
          // Main content (default view)
          <div className="pt-4">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Delete Item?</h2>
            <p className="text-center text-gray-500 mb-4">
              Are you sure you want to remove this item from the inventory?
            </p>

            {/* Stock Warning Banner */}
            {hasStock && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800">Stock Available</h4>
                  <p className="text-sm text-amber-700 mt-0.5">
                    This item has <span className="font-bold">{item.quantity} units</span> in stock.
                    You must clear all stock before deleting this item.
                  </p>
                </div>
              </div>
            )}

            {/* Item Preview Card */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                  {item.item_image_blob || item.item_image_url ? (
                    <img src={item.item_image_blob || item.item_image_url} alt={item.item_name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{item.item_name}</h3>
                  <p className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">Rs.{item.stock_price || item.retail_price || 0}</p>
                  <p className={`text-xs ${hasStock ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                    {item.quantity || 0} in stock
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-red-500 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  hasStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200'
                }`}
                onClick={() => !hasStock && handleDeleteClick(item.id)}
                disabled={hasStock}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {hasStock ? 'Clear Stock First' : 'Delete Item'}
              </button>
            </div>
          </div>
        ) : status === 'stock_error' ? (
          // Stock error screen
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-6">Cannot Delete Item</h2>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              {errorMessage}
            </p>
            <div className="mt-6">
              <div className="h-1.5 w-48 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    animation: 'progress 4s linear forwards',
                    width: '0%'
                  }}
                ></div>
              </div>
              <style>{`
                @keyframes progress {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}</style>
            </div>
          </div>
        ) : (
          // Status screen (success/fail)
          <div className="flex flex-col items-center justify-center py-16">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
              status === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'
            }`}>
              {status === 'success' ? (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-6">
              {status === 'success' ? 'Deleted Successfully!' : 'Delete Failed'}
            </h2>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              {status === 'success'
                ? 'The item has been removed from inventory'
                : errorMessage || 'Could not delete the item. Please try again.'}
            </p>
            <div className="mt-6">
              <div className="h-1.5 w-48 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{
                    animation: 'progress 4s linear forwards',
                    width: '0%'
                  }}
                ></div>
              </div>
              <style>{`
                @keyframes progress {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}</style>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
