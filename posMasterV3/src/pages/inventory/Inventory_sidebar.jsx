import React from 'react';
// import { Package, Settings, FileText, Plus } from 'lucide-react';
import addItemImg from '../../assets/Inventory_addItem.png';
import configImg from '../../assets/Inventory_settings.png';
import reportImg from '../../assets/Inventory_report.png';
import { Package, Settings, FileText, Plus } from 'lucide-react';

function InventorySidebar({ activeSection, onSectionChange, onAddItemClick, onConfigClick }) {
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
    <div className="w-64 bg-white border-r border-gray-200 p-6">
      <div className="space-y-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                isActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`p-3 rounded-lg mb-2 ${
                isActive ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <img src={item.icon} alt={item.label} className="w-6 h-6 object-contain" />
              </div>
              <span className={`text-sm font-medium text-center ${
                isActive ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default InventorySidebar;