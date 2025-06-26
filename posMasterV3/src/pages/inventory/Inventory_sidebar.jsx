import React from "react";
// import { Package, Settings, FileText, Plus } from 'lucide-react';
import addItemImg from "../../assets/Inventory_addItem.png";
import configImg from "../../assets/Inventory_settings.png";
import reportImg from "../../assets/Inventory_report.png";
import { Package, Settings, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ViewInventory from "../../assets/View_inventory.png";

function InventorySidebar({
  activeSection,
  onSectionChange,
  onAddItemClick,
  onConfigClick,
}) {
  const navigate = useNavigate();
  const sidebarItems = [
    {
      id: "view-inventory",
      label: "View Inventory",
      icon: ViewInventory,
      onClick: () => onSectionChange("view-inventory"),
    },
    {
      id: "add-item",
      label: "Add Item",
      icon: addItemImg,
      onClick: () => {
      onSectionChange("add-item");
      onAddItemClick();
    },
    isButton: true,
    },
    {
      id: "inventory-config",
      label: "Inventory Configurations",
      icon: configImg,
       onClick: () => {
      onSectionChange("inventory-config");
      onConfigClick();
    },
    isButton: true,
  },
    {
      id: "inventory-report",
      label: "Inventory report",
      icon: reportImg,
      onClick: () => onSectionChange("inventory-report"),
    },
  ];

  return (
    <aside className="bg-[#F3F3F3] border-r border-gray-200 h-screen">
      {/* sidbar buttons list*/}
      <div className="flex flex-col">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
             <button
      key={item.id}
      onClick={item.onClick}
      className={`w-60 h-40 flex flex-col items-center p-10 rounded-lg transition-all duration-200 hover:shadow-md ${
        isActive
          ? 'border-blue-500 bg-[#EBEBEB] relative'
          : 'bg-[#FAFAFA] border-gray-200 hover:border-gray-300'
      }`}
    >
      <img src={item.icon} alt={item.label} className="w-16 h-16 object-contain" />
      <span className={`text-sm font-medium text-center flex items-center gap-2 ${
        isActive ? 'text-blue-600' : 'text-gray-700'
      }`}>
        {item.label}
        {isActive && (
          <svg className="w-4 h-4 text-blue-600 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </span>
    </button>
          );
        })}
      </div>
    </aside>
  );
}

export default InventorySidebar;
