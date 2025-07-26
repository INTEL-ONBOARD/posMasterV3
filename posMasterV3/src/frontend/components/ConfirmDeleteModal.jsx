import { X } from "lucide-react";
import Add_item_Card from "./Add_item_Card";
import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import ItemCard from "../../components/ItemCard";


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
      const result = await apiClient.delete(`api/items/${selectedItemId}`);
      //setDeleteResult(result);
      
      if (result.data.status === 'success') {
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
    <div className="fixed z-20 inset-0 flex items-center justify-center bg-black bg-opacity-70" style={{ left: '46%' }}>

      <div className="bg-white shadow-lg p-8 w-[700px] max-w-full h-[420px] relative">
        <button
          className="absolute top-4 left-4 bg-black rounded-full p-1"
          onClick={onCancel}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {!status ? (
          // Main content (default view)
          <div>
            <div className="flex justify-center mb-8">
              <ItemCard item={item} hideClose />
            </div>
            <h2 className="text-2xl font-semibold text-center mb-2">Confirm Delete?</h2>
            <p className="text-center text-gray-600 mb-8">
              Are you sure you want to remove this item from the inventory?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-6 py-2 bg-gray-500 text-white hover:bg-gray-600"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-blue-900 text-white hover:bg-blue-800"
                onClick={()=>handleDeleteClick(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          // Status screen (success/fail)
          <div className="flex flex-col items-center w-[700px] max-w-full h-[420px] justify-center py-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              status === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {status === 'success' ? (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-semibold mt-4">
              {status === 'success' ? 'Success!' : 'Failed!'}
            </h2>
            <p className="text-gray-600 mt-2">
              {status === 'success' 
                ? 'Item deleted successfully' 
                : 'Could not delete item'}
            </p>
            {/* <div className="mt-6">
              <div className="h-1 w-48 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 animate-progress"
                  style={{ animationDuration: '3s' }}
                ></div>
              </div>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}