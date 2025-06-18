import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

export default function ConfigurationModal({ isOpen, onClose, onSave }) {
  const [units, setUnits] = useState([
    { id: 1, name: 'Kilogram', symbol: 'KG' },
    { id: 2, name: 'Pieces', symbol: 'PCS' },
    { id: 3, name: 'Liters', symbol: 'LTR' },
    { id: 4, name: 'Meters', symbol: 'M' }
  ]);

  const [newUnit, setNewUnit] = useState({ name: '', symbol: '' });

  const handleAddUnit = () => {
    if (newUnit.name && newUnit.symbol) {
      const newId = Math.max(...units.map(u => u.id)) + 1;
      setUnits([...units, { id: newId, ...newUnit }]);
      setNewUnit({ name: '', symbol: '' });
    }
  };

  const handleSave = () => {
    onSave(units);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">INVENTORY CONFIGURATION</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Unit of Measurement</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 mb-3 text-sm font-medium text-gray-700">
              <div>ID</div>
              <div>UNIT NAME</div>
              <div>UNIT SYMBOL</div>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {units.map((unit) => (
                <div key={unit.id} className="grid grid-cols-3 gap-4 text-sm text-gray-600 py-1">
                  <div>{unit.id}</div>
                  <div>{unit.name}</div>
                  <div>{unit.symbol}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-200">
              <div></div>
              <div>
                <input
                  type="text"
                  placeholder="Add New Unit name"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Unit Symbol"
                  value={newUnit.symbol}
                  onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddUnit}
                  className="p-1 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleAddUnit}
                  className="p-1 bg-green-500 rounded hover:bg-green-600 transition-colors"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}