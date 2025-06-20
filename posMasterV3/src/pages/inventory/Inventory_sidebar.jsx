import React from 'react';
// import { Package, Settings, FileText, Plus } from 'lucide-react';
import addItemImg from '../../assets/Inventory_addItem.png';
import configImg from '../../assets/Inventory_settings.png';
import reportImg from '../../assets/Inventory_report.png';
import { Package, Settings, FileText, Plus } from 'lucide-react';
import { useNavigate } from "react-router-dom";

function InventorySidebar({ activeSection, onSectionChange, onAddItemClick, onConfigClick }) {
  const navigate = useNavigate();
  const sidebarItems = [
    {
      id: 'add-item',
      label: 'Add Item',
      icon: addItemImg,
      onClick: onAddItemClick,
      isButton: true
    },
    {
      id: 'inventory-config',
      label: 'Inventory Configurations',
      icon: configImg,
      onClick: onConfigClick,
      isButton: true
    },
    {
      id: 'inventory-report',
      label: 'Inventory report',
      icon: reportImg,
      onClick: () => onSectionChange('inventory-report')
    }
  ];

  return (
    <aside className="w-96 bg-[#F3F3F3] border-r border-gray-200 p-10 rounded-tl-2xl">
      {/* inventory header and back button */}
      <span className='flex flex-row gap-5 justify-center'>
        {/* back button */}
      <button
      onClick={() => navigate("/dashboard")}
      aria-label="Go Back"
      className="bg-white w-10 h-10 rounded-full p-2 hover:bg-gray-50 active:bg-gray-200 transition hover:shadow-md focus:outline-none focus:ring-indigo-500"
    >
      {/* Simple left arrow SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
      <h2 className="text-4xl font-bold mb-6">INVENTORY</h2>
      </span>

      {/* sidbar buttons list*/}
      <div className="flex flex-col gap-10 items-end">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-60 h-40 flex flex-col bg-[#FAFAFA] items-center p-10 rounded-lg transition-all duration-200 hover:shadow-md ${
                isActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
                <img src={item.icon} alt={item.label} className="w-16 h-16 object-contain" />

              <span className={`text-sm font-medium text-center ${
                isActive ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default InventorySidebar;