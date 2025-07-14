import { X } from "lucide-react";
import Add_item_Card from "./Add_item_Card";

export default function ConfirmDeleteModal({ open, item, onCancel, onConfirm }) {
  if (!open || !item) return null;

  return (
    <div className="fixed z-20 inset-0 flex items-center justify-center bg-black bg-opacity-40" style={{ left: '46%' }}>
      <div className="bg-white  shadow-lg p-8 w-[700px] max-w-full relative">
        {/* Modal Close icon */}
        <button
          className="absolute top-4 left-4 bg-black rounded-full p-1"
          onClick={onCancel}
        >
          <X className="w-5 h-5 text-white" />
        </button>
        {/* Card preview without card close icon */}
        <div className="flex justify-center mb-8">
          <Add_item_Card item={item} hideClose />
        </div>
        <h2 className="text-2xl font-semibold text-center mb-2">Confirm Delete?</h2>
        <p className="text-center text-gray-600 mb-8">
          Are you sure you want to remove this item from the inventory?
        </p>
        <div className="flex justify-end gap-4">
          <button
            className="px-6 py-2 bg-gray-500 text-white  hover:bg-gray-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-blue-900 text-white hover:bg-blue-800"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}