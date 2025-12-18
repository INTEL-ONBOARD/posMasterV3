import { X } from "lucide-react";
import { useState, useEffect } from "react";
import ItemCard from "./ItemCard";
import registerItemService from "../api/services/inventory/registerItemService";



export default function ConfirmDeleteModal({ open, item, onCancel, onSuccess }) {
  if (!open || !item) return null;
  
  const [status, setStatus] = useState(null); // 'success', 'fail', or null

  const handleDeleteClick = async (selectedItemId) => {
    console.info("starting item deletion")
    // Set status based on deletion result
    // if (isSuccess) {
    //   setStatus('success');
    // } else {
    //   setStatus('fail');
    // }
    
      try {
      //const result = await apiClient.delete(`api/itemRegistry/${selectedItemId}`);
      const result = await registerItemService.deleteItem(selectedItemId);
      //setDeleteResult(result);
      
      if (result.status === 'success') {
        // Handle successful deletion (e.g., update UI, show notification)
        console.log('Item deleted:', result.data);
        onSuccess();
        setStatus('success');

      } else {
        // Handle API error
        console.error('Delete failed:', result.message);
        setStatus('fail');
      }
    } catch (error) {
      // Handle unexpected errors
      console.error("delete operation failed"+error.message)
      // setDeleteResult({
      //   message: 'An unexpected error occurred',
      //   status: 'error',
      //   data: null
      // });
      console.error('Unexpected error:', error);
      setStatus('fail');
    } finally {
      //setIsDeleting(false);
    }
  };

  // Effect to automatically clear status after 3 seconds with dep. arr
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus(null);
        onCancel();
      }, 3000);
      
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

            {/* Item Preview Card */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.item_name} className="w-full h-full object-cover" />
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
                  <p className="text-lg font-bold text-gray-800">Rs.{item.stock_price || item.retail_price}</p>
                  <p className="text-xs text-gray-400">{item.quantity} in stock</p>
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
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-200 flex items-center gap-2"
                onClick={()=>handleDeleteClick(item.id)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Item
              </button>
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
            <p className="text-gray-500 mt-2">
              {status === 'success'
                ? 'The item has been removed from inventory'
                : 'Could not delete the item. Please try again.'}
            </p>
            <div className="mt-6">
              <div className="h-1.5 w-48 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{
                    animation: 'progress 3s linear forwards',
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