import React from 'react';

function Inventory_card({ item }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
      
      {/* <div className="flex items-center justify-center mb-4">
        <div className="text-6xl">
          {item.image}
        </div>
      </div> */}

      <div className="flex items-center justify-center mb-4">
        <img src={item.image} alt={item.name} className="w-20 h-20 object-contain" />
      </div>
      
      <div className="text-center">
        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
        <p className="text-gray-600">
          <span className="font-medium">{item.price}</span>/{item.unit}
        </p>
      </div>
      
      {item.sku && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-gray-400">Stock</span>
            <span className="ml-1 text-xs text-gray-600">{item.stock}</span>
            <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory_card;