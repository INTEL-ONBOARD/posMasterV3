import React, { useState } from 'react';
import { X, Plus, Check, Printer } from 'lucide-react';

export default function ConfigurationModal({ isOpen, onClose, onSave ,units, setUnits, newUnit, setNewUnit }) {
 

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
    // background around modal
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* modal */}
      <div className="bg-white rounded-lg p-10 w-1/2 mx-4">
        {/* title & close btn(top) */}
        <div className="flex items-center justify-between mb-6">
          {/* close button(top)*/}
          <button aria-label="Close" className="bg-black self-start rounded-full p-1 shadow hover:bg-gray-600 active:bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6"/>
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">INVENTORY CONFIGURATION</h2>
        </div>
        {/* mid section */}
        <div className='flex flex-row gap-3'>
        {/* left section */}
        <div className='w-2/5'>
          {/* button list */}
          <div className="flex items-center justify-between mb-4 bg-[#F8F8F8] rounded-md p-3">
            <h3 className="text-md font-medium text-gray-700">Unit of Measurements</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        {/* right section */}
        <div className="w-3/5 mb-6">
          
        {/* configurations table */}
        <div className="overflow-y-auto bg-blue-400 max-h-64 border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-200 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Unit Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Symbol
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{unit.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{unit.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{unit.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            <div className="flex flex-row gap-4 mt-4 pt-3 bg-white justify-between border-gray-200">
              {/* <div>
                <input
                  type="text"
                  placeholder="Add New Unit name"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div> */}
              <div>
                <input
                  type="text"
                  name="name"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="Add New Unit name"
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <div>
                <input
                  type="text"
                  name="symbol"
                  placeholder="Unit Symbol"
                  value={newUnit.symbol}
                  onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            {/* add and clear buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddUnit}
                  className="p-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                >
                  <X className="w-7 h-7 text-gray-600" />
                </button>
                <button
                  onClick={handleAddUnit}
                  className="p-2 bg-green-500 rounded-md hover:bg-green-600 transition-colors"
                >
                  <Check className="w-7 h-7 text-white" />
                </button>
              </div>

            </div>

        </div>
        </div>

        {/* bottom bar(bottom) */}
        <div className="flex justify-end space-x-3 p-3 rounded-lg bg-[#F9F9F9]">
            
            <div>
              <button onClick={onClose}
                className="px-6 py-2 mr-4 border bg-[#D01710] border-gray-300 text-white rounded-md hover:bg-red-600 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-[#1A318C] transition-colors">
                Save
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}