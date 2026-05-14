import React, { useState, useEffect } from "react";
import addItemImg from "../../assets/Inventory_addItem.png";
import configImg from "../../assets/Inventory_settings.png";
import reportImg from "../../assets/Inventory_report.png";
import restockImg from "../../assets/Inventory_restock.png";
import ViewInventoryImg from "../../assets/View_inventory.png";
import SupplierRegImg from "../../assets/Inventory_supplier_reg.png";
import checkHistoryImg from "../../assets/Inventory_history_check.png";
import priceChangeImg from "../../assets/price_change.png";
import disposeItemsImg from "../../assets/dispose_items.png";
import { localAuth } from "../../api/services/localAuth";
import { settingsApi } from "../../api/localApi";
import { ArrowLeftRight, ClipboardCheck } from "lucide-react";

function InventorySidebar({
  activeSection,
  onViewInvClick,
  onAddItemClick,
  onRestockClick,
  onSupplierRegClick,
  onCheckHistoryClick,
  onShareClick,
  onApprovalsClick,
  onConfigClick,
  onCReportClick,
  onPriceChangeClick,
  onDisposedItemsClick,
}) {
  const [permissions, setPermissions] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load user permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await localAuth.getCurrentUser();
        if (currentUser) {
          // Check if user is admin
          const userRoles = currentUser.roles || [];
          const adminCheck = userRoles.some(role =>
            ['admin', 'superadmin', 'Admin', 'SuperAdmin'].includes(role)
          );
          setIsAdmin(adminCheck);

          // If admin, no need to load specific permissions - they have all access
          if (adminCheck) {
            return;
          }

          const userId = currentUser.id || currentUser._id;
          const response = await settingsApi.getUserSettings(userId);
          if (response.status === "success" && response.data?.settings?.permissions?.InventoryAccess) {
            setPermissions(response.data.settings.permissions.InventoryAccess);
          }
        }
      } catch {
        // Silent fail - permissions will default to showing all
      }
    };
    loadPermissions();
  }, []);

  // Check if user has specific permission
  const hasPermission = (permKey) => {
    // Admin users have all permissions
    if (isAdmin) return true;
    if (!permissions) return false; // Hide until permissions load to prevent flash
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
      id: "inventory-approvals",
      label: "Approvals",
      reactIcon: ClipboardCheck,
      onClick: onApprovalsClick,
      permissionKey: "inventory_view",
    },
    {
      id: "inventory-report",
      label: "Inventory report",
      icon: reportImg,
      onClick: onCReportClick,
      permissionKey: "inventory_reports",
    },
    {
      id: "inventory-share",
      label: "Inventory Share",
      reactIcon: ArrowLeftRight,
      onClick: onShareClick,
      permissionKey: "inventory_view",
    },
    {
      id: "disposed-items",
      label: "Disposed Items",
      icon: disposeItemsImg,
      onClick: onDisposedItemsClick,
      permissionKey: "inventory_view",
    },
  ].filter(item => hasPermission(item.permissionKey));

  return (
    <aside className="bg-white border-r z-20 border-gray-100 h-screen shadow-sm">
      <div className="flex flex-col py-2 overflow-y-auto h-full">
        {sidebarItems.map((item, index) => {
          const isActive = activeSection === item.id;
          return (
            <div key={`${item.id || item.label || "inventory-item"}-${index}`} className="relative group px-2 py-1">
              <button
                onClick={item.onClick}
                className={`relative w-24 h-24 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-[#1A318C] to-[#152870] shadow-lg shadow-blue-900/20"
                    : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                }`}
              >
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-white rounded-r-full" />
                )}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-1 transition-transform duration-300 ${
                  isActive ? "bg-white/90 shadow-sm" : "bg-white shadow-sm"
                } ${!isActive && "group-hover:scale-105"}`}>
                  {item.reactIcon ? (
                    <item.reactIcon
                      className={`w-8 h-8 transition-all duration-300 ${
                        isActive ? "text-[#1A318C]" : "text-gray-500"
                      }`}
                    />
                  ) : (
                    <img
                      src={item.icon}
                      alt={item.label}
                      className="w-8 h-8 object-contain pointer-events-none transition-all duration-300"
                    />
                  )}
                </div>
              </button>
              {/* Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default InventorySidebar;
