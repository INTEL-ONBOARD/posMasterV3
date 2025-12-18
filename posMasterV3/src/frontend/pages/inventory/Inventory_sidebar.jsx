import React, { useState, useEffect } from "react";
import addItemImg from "../../assets/Inventory_addItem.png";
import configImg from "../../assets/Inventory_settings.png";
import reportImg from "../../assets/Inventory_report.png";
import restockImg from "../../assets/Inventory_restock.png";
import ViewInventoryImg from "../../assets/View_inventory.png";
import SupplierRegImg from "../../assets/Inventory_supplier_reg.png";
import checkHistoryImg from "../../assets/Inventory_history_check.png";
import returnItemImg from "../../assets/return_stock_image.png";
import disposeItemImg from "../../assets/dispose_items.png";
import priceChangeImg from "../../assets/price_change.png";
import { localAuth } from "../../api/services/localAuth";
import { settingsApi } from "../../api/localApi";

function InventorySidebar({
  activeSection,
  onViewInvClick,
  onAddItemClick,
  onRestockClick,
  onSupplierRegClick,
  onCheckHistoryClick,
  onConfigClick,
  onCReportClick,
  onReturnItemClick,
  onDisposeItemClick,
  onPriceChangeClick,
}) {
  const [permissions, setPermissions] = useState(null);

  // Load user permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await localAuth.getCurrentUser();
        if (currentUser) {
          const userId = currentUser.id || currentUser._id;
          const response = await settingsApi.getUserSettings(userId);
          if (response.status === "success" && response.data?.settings?.permissions?.InventoryAccess) {
            setPermissions(response.data.settings.permissions.InventoryAccess);
          }
        }
      } catch (error) {
        console.error("[InventorySidebar] Error loading permissions:", error);
      }
    };
    loadPermissions();
  }, []);

  // Check if user has specific permission
  const hasPermission = (permKey) => {
    if (!permissions) return true; // Show all until permissions load
    return permissions[permKey] === true;
  };

  const sidebarItems = [
    {
      id: "view-inventory",
      label: "View Inventory",
      icon: ViewInventoryImg,
      onClick: onViewInvClick,
      permissionKey: "inventory_view",
    },
    {
      id: "add-item",
      label: "Add Item",
      icon: addItemImg,
      onClick: onAddItemClick,
      permissionKey: "inventory_register_item",
    },
    {
      id: "inventory-restock",
      label: "Inventory Restock",
      icon: restockImg,
      onClick: onRestockClick,
      permissionKey: "inventory_restock",
    },
    {
      id: "return-item",
      label: "Return Item",
      icon: returnItemImg,
      onClick: onReturnItemClick,
      permissionKey: "inventory_return_list",
    },
    {
      id: "dispose-item",
      label: "Dispose Item",
      icon: disposeItemImg,
      onClick: onDisposeItemClick,
      permissionKey: "inventory_dispose",
    },
    {
      id: "supplier-registration",
      label: "Supplier Registration",
      icon: SupplierRegImg,
      onClick: onSupplierRegClick,
      permissionKey: "inventory_suppliers",
    },
    {
      id: "price-change",
      label: "Price Change",
      icon: priceChangeImg,
      onClick: onPriceChangeClick,
      permissionKey: "inventory_price_change",
    },
    {
      id: "check-history",
      label: "Check History",
      icon: checkHistoryImg,
      onClick: onCheckHistoryClick,
      permissionKey: "inventory_history",
    },
    {
      id: "inventory-config",
      label: "Inventory Configurations",
      icon: configImg,
      onClick: onConfigClick,
      permissionKey: "inventory_configurations",
    },
    {
      id: "inventory-report",
      label: "Inventory report",
      icon: reportImg,
      onClick: onCReportClick,
      permissionKey: "inventory_reports",
    },
  ].filter(item => hasPermission(item.permissionKey));

  return (
    //z index set to 20 to show popupups and status messages without overshadwoing popup
    <aside className="bg-[#F3F3F3] border-r z-20 border-gray-200 h-screen">
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
              <div className="relative flex flex-col items-center mb-2">
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-12 h-12 object-contain pointer-events-none"
                />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default InventorySidebar;
