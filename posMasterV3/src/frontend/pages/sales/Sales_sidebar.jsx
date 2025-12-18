import React, { useState, useEffect } from "react";
import saleViewImg from "../../assets/sale_sidebar_view.png";
import transactionHistoryImg from "../../assets/sale_sidebar_trans_history.png";
import offersDiscountImg from "../../assets/sale_sidebar_discounts.png";
import salesConfigImg from "../../assets/Inventory_settings.png";
import inventoryReportImg from "../../assets/Inventory_report.png";
import viewInventoryImg from "../../assets/sale_sidebar_view_inventory.png";
import { localAuth } from "../../api/services/localAuth";
import { settingsApi } from "../../api/localApi";

function SalesSidebar({
  activeSection,
  onSaleViewClick,
  onTransactionHistoryClick,
  onInventoryViewClick,
  onSalesReportClick,
  onOffersDiscountClick,
  onSalesConfigClick,
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
          if (response.status === "success" && response.data?.settings?.permissions?.SaleAccess) {
            setPermissions(response.data.settings.permissions.SaleAccess);
          }
        }
      } catch (error) {
        // Silent fail - permissions will default to showing all
      }
    };
    loadPermissions();
  }, []);

  // Check if user has specific permission
  const hasPermission = (permKey) => {
    // Admin users have all permissions
    if (isAdmin) return true;
    if (!permissions) return true; // Show all until permissions load
    return permissions[permKey] === true;
  };

  const sidebarItems = [
    {
      id: "sale-view",
      label: "Sale View",
      icon: saleViewImg,
      onClick: onSaleViewClick,
      permissionKey: "sale_process",
    },
    {
      id: "transaction-history",
      label: "Transaction History",
      icon: transactionHistoryImg,
      onClick: onTransactionHistoryClick,
      permissionKey: "sale_history",
    },
    {
      id: "view-inventory",
      label: "View Inventory",
      icon: viewInventoryImg,
      onClick: onInventoryViewClick,
      permissionKey: "sale_view_inventory",
    },
    {
      id: "sales-report",
      label: "Sales Report",
      icon: inventoryReportImg,
      onClick: onSalesReportClick,
      permissionKey: "sale_reports",
    },
    {
      id: "sales-config",
      label: "Sales Configurations",
      icon: salesConfigImg,
      onClick: onSalesConfigClick,
      permissionKey: "sale_configurations",
    },
    {
      id: "offers-discount",
      label: "Offers and Discount View",
      icon: offersDiscountImg,
      onClick: onOffersDiscountClick,
      permissionKey: "sale_discounts",
    },
  ].filter(item => hasPermission(item.permissionKey));

  return (
    <aside className="bg-white border-r z-20 border-gray-100 h-screen shadow-sm">
      <div className="flex flex-col py-2">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <div key={item.id} className="relative group px-2 py-1">
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
                  isActive ? "bg-white/20" : "bg-white shadow-sm"
                } ${!isActive && "group-hover:scale-105"}`}>
                  <img
                    src={item.icon}
                    alt={item.label}
                    className={`w-8 h-8 object-contain pointer-events-none transition-all duration-300 ${
                      isActive ? "brightness-0 invert" : ""
                    }`}
                  />
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

export default SalesSidebar;