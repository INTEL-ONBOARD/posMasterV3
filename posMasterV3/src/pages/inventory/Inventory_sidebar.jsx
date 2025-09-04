import React from "react";
import addItemImg from "../../assets/Inventory_addItem.png";
import configImg from "../../assets/Inventory_settings.png";
import reportImg from "../../assets/Inventory_report.png";
import restockImg from "../../assets/Inventory_restock.png";
import ViewInventoryImg from "../../assets/View_inventory.png";
import SupplierRegImg from "../../assets/Inventory_supplier_reg.png";
import checkHistoryImg from "../../assets/Inventory_history_check.png";

function InventorySidebar({
  activeSection,
  onViewInvClick,
  onAddItemClick,
  onRestockClick,
  onSupplierRegClick,
  onCheckHistoryClick,
  onConfigClick,
  onCReportClick,
}) {
  const sidebarItems = [
    {
      id: "view-inventory",
      label: "View Inventory",
      icon: ViewInventoryImg,
      onClick: onViewInvClick,
    },
    {
      id: "add-item",
      label: "Add Item",
      icon: addItemImg,
      onClick: onAddItemClick,
    },
    {
      id: "inventory-restock",
      label: "Inventory Restock",
      icon: restockImg,
      onClick: onRestockClick,
    },
    {
      id: "supplier-registration",
      label: "Supplier Registration",
      icon: SupplierRegImg,
      onClick: onSupplierRegClick,
    },
    {
      id: "check-history",
      label: "Check History",
      icon: checkHistoryImg,
      onClick: onCheckHistoryClick,
    },
    {
      id: "inventory-config",
      label: "Inventory Configurations",
      icon: configImg,
      onClick: onConfigClick,
    },
    {
      id: "inventory-report",
      label: "Inventory report",
      icon: reportImg,
      onClick: onCReportClick,
    },
  ];

  return (
    <aside className="bg-[#F3F3F3] border-r border-gray-200 h-screen">
      <div className="flex flex-col">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-28 h-28 border border-gray-100 flex flex-col items-center justify-center p-4 transition-all duration-200 ${
                isActive
                  ? "border-blue-500 bg-[#EBEBEB] relative"
                  : "bg-[#FAFAFA] border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Image and arrow */}
              <div className="relative flex flex-col items-center mb-2">
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-12 h-12 object-contain pointer-events-none"
                />

                {/* Arrow absolutely positioned to the right of the image, vertically centered */}
                {/* {isActive && (
                  <span className="absolute right-[-40px] top-1/2 -translate-y-1/2">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )} */}
              </div>
              {/* Label below image */}
              {/* <span className={`text-sm font-medium text-center mt-1 ${isActive ? 'text-black' : 'text-gray-700'}`}>
              
                {item.label}
              </span> */}
              {/* <span className={`text-sm font-medium text-center ${isActive ? 'text-black' : 'text-gray-700'}`}>
                {item.label}
              </span> */}

            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default InventorySidebar;
