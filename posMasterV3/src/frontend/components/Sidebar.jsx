import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { localAuth } from "../api/services/localAuth";
import { settingsApi } from "../api/localApi";
import Dashboard_dashboard from "../assets/dashboard.png";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_sales from "../assets/Dashboard_sales.png";
import Dashboard_users from "../assets/Dashboard_users.png";

function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load user permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await localAuth.getCurrentUser();
        if (currentUser) {
          // Check if user is admin (case-insensitive)
          const userRoles = currentUser.roles || [];
          const adminCheck = userRoles.some(role =>
            typeof role === 'string' && ['admin', 'superadmin'].includes(role.toLowerCase())
          );
          setIsAdmin(adminCheck);

          // If admin, no need to load specific permissions - they have all access
          if (adminCheck) {
            setPermissions(null);
            return;
          }

          const userId = currentUser.id || currentUser._id;
          const response = await settingsApi.getUserSettings(userId);

          if (response.status === "success" && response.data?.settings?.permissions) {
            setPermissions(response.data.settings.permissions);
          } else {
            // No permissions saved — fall back to role-based defaults
            const roleDefaults = {
              manager: {
                SaleAccess: { sale_process: true, sale_history: true, sale_view_inventory: true, sale_reports: true, sale_configurations: true, sale_discounts: true },
                InventoryAccess: { inventory_view: true, inventory_register_item: true, inventory_restock: true, inventory_suppliers: true, inventory_discount: true, inventory_price_change: true, inventory_history: true, inventory_configurations: false, inventory_reports: true },
                UserAccess: { user_manage: true, user_role_manage: false },
              },
              cashier: {
                SaleAccess: { sale_process: true, sale_history: true, sale_view_inventory: true, sale_reports: false, sale_configurations: false, sale_discounts: true },
                InventoryAccess: { inventory_view: true, inventory_register_item: false, inventory_restock: false, inventory_suppliers: false, inventory_discount: false, inventory_price_change: false, inventory_history: false, inventory_configurations: false, inventory_reports: false },
                UserAccess: { user_manage: false, user_role_manage: false },
              },
              assistant: {
                SaleAccess: { sale_process: true, sale_history: false, sale_view_inventory: true, sale_reports: false, sale_configurations: false, sale_discounts: false },
                InventoryAccess: { inventory_view: true, inventory_register_item: false, inventory_restock: false, inventory_suppliers: false, inventory_discount: false, inventory_price_change: false, inventory_history: false, inventory_configurations: false, inventory_reports: false },
                UserAccess: { user_manage: false, user_role_manage: false },
              },
              user: {
                SaleAccess: { sale_process: true, sale_history: false, sale_view_inventory: true, sale_reports: false, sale_configurations: false, sale_discounts: false },
                InventoryAccess: { inventory_view: true, inventory_register_item: false, inventory_restock: false, inventory_suppliers: false, inventory_discount: false, inventory_price_change: false, inventory_history: false, inventory_configurations: false, inventory_reports: false },
                UserAccess: { user_manage: false, user_role_manage: false },
              },
            };
            const primaryRole = (userRoles[0] || "user").toLowerCase();
            setPermissions(roleDefaults[primaryRole] || roleDefaults.user);
          }
        }
      } catch {
        // On failure, deny access to protected sections rather than showing all
        setPermissions({});
      }
    };

    loadPermissions();
  }, []);

  // Check if user has access to a specific section
  const hasAccess = (section) => {
    // Admin users have access to everything
    if (isAdmin) {
      return true;
    }

    // If permissions not loaded yet (null = still loading), show all temporarily
    if (permissions === null) {
      return true;
    }

    switch (section) {
      case "inventory":
        // Check if any inventory permission is enabled
        return permissions.InventoryAccess &&
          Object.values(permissions.InventoryAccess).some(v => v === true);
      case "sales":
        // Check if any sale permission is enabled
        return permissions.SaleAccess &&
          Object.values(permissions.SaleAccess).some(v => v === true);
      case "users":
        // Check if user management permission is enabled
        return permissions.UserAccess &&
          (permissions.UserAccess.user_manage === true || permissions.UserAccess.user_role_manage === true);
      default:
        return true; // Notifications, Settings, Logout are always accessible
    }
  };

  // Logout function — called after confirmation
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setShowLogoutConfirm(false);

    try {
      await localAuth.logout();
    } catch {
      // Silent fail - still navigate to login
    } finally {
      setIsLoggingOut(false);
      navigate("/");
    }
  };

  return (
    <aside
      id="logo-sidebar"
      className="fixed top-0 bottom-0 z-30 h-screen bg-white border-r border-gray-100 shadow-sm"
      aria-label="Sidebar"
    >
      <div className="h-full overflow-hidden bg-white py-3 px-2">
        <ul className="font-medium space-y-2">
          {/* Sidebar Tiles */}
          {[
            {
              to: "/dashboard",
              icon: Dashboard_dashboard,
              label: "Dashboard",
              alwaysVisible: true,
            },
            {
              to: "inventory",
              icon: Dashboard_inventory,
              label: "Inventory",
              permissionKey: "inventory",
            },
            {
              to: "sales",
              icon: Dashboard_sales,
              label: "Sales",
              permissionKey: "sales",
            },
            {
              to: "users",
              icon: Dashboard_users,
              label: "Users",
              permissionKey: "users",
            },
            {
              to: "settings",
              icon: Dashboard_settings,
              label: "Settings",
              alwaysVisible: true,
            },
          ]
            .filter((item) => item.alwaysVisible || hasAccess(item.permissionKey))
            .map((item, index) => {
              const isActive = item.to.startsWith('/')
                ? currentPath === item.to
                : currentPath.startsWith(`/dashboard/${item.to}`);
              return (
                <li key={`${item.to || item.label || "sidebar-item"}-${index}`} className="relative group">
                  <Link
                    to={item.to}
                    className={`relative w-28 h-28 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-br from-[#1A318C] to-[#152870] shadow-lg shadow-blue-900/20"
                        : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-14 bg-white rounded-r-full" />
                    )}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 transition-transform duration-300 ${
                      isActive ? "bg-white/90 shadow-sm" : "bg-white shadow-sm"
                    } ${!isActive && "group-hover:scale-105"}`}>
                      {item.reactIcon ? (
                        <item.reactIcon className={`w-8 h-8 transition-all duration-300 ${isActive ? 'text-[#1A318C]' : 'text-gray-500'}`} />
                      ) : (
                        <img
                          className="w-8 h-8 object-contain transition-all duration-300"
                          src={item.icon}
                          alt={item.label}
                        />
                      )}
                    </div>
                    <span className={`text-xs font-semibold text-center transition-colors duration-300 ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}

          {/* Logout */}
          <li className="relative group">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              disabled={isLoggingOut}
              className={`relative w-28 h-28 flex flex-col items-center justify-center rounded-xl transition-all duration-300 bg-gray-50 hover:bg-red-50 hover:shadow-md ${
                isLoggingOut ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 bg-white shadow-sm group-hover:bg-red-100 group-hover:scale-105`}>
                <img
                  className="w-8 h-8 object-contain transition-all duration-300 group-hover:brightness-75"
                  src={Dashboard_logout}
                  alt="Logout"
                />
              </div>
              <span className="text-xs font-semibold text-center text-gray-600 group-hover:text-red-600 transition-colors duration-300">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </button>
          </li>
        </ul>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl p-6 w-80 relative animate-in fade-in zoom-in duration-200">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 text-center mb-1">Logout?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to log out of your session?
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 shadow-lg shadow-red-200 transition-all duration-200 flex items-center justify-center gap-2"
                onClick={handleLogout}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
