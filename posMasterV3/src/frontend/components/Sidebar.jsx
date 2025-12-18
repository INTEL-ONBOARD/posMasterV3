import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { localAuth } from "../api/services/localAuth";
import { settingsApi } from "../api/localApi";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_sales from "../assets/Dashboard_sales.png";
import Dashboard_users from "../assets/Dashboard_users.png";

// Animation variants
const sidebarContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const tileVariant = {
  hidden: { opacity: 0, x: -40 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
            setPermissions(null);
            return;
          }

          const userId = currentUser.id || currentUser._id;
          const response = await settingsApi.getUserSettings(userId);

          if (response.status === "success" && response.data?.settings?.permissions) {
            setPermissions(response.data.settings.permissions);
          } else {
            // No permissions saved, set default based on role
            setPermissions(null);
          }
        }
      } catch (error) {
        // Silent fail - permissions will default to showing all
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

    // If permissions not loaded yet or null, check user role for defaults
    if (!permissions) {
      return true; // Show all by default until permissions load
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

  // Logout function
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await localAuth.logout();
    } catch (error) {
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
        <motion.ul
          className="font-medium space-y-2"
          variants={sidebarContainer}
          initial="hidden"
          animate="show"
        >
          {/* Sidebar Tiles */}
          {[
            {
              to: "notifications",
              icon: Dashboard_notification,
              label: "Notifications",
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
            .map((item) => {
              const isActive = currentPath.startsWith(`/dashboard/${item.to}`);
              return (
                <motion.li key={item.to} variants={tileVariant} className="relative group">
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
                      isActive ? "bg-white/20" : "bg-white shadow-sm"
                    } ${!isActive && "group-hover:scale-105"}`}>
                      <img
                        className={`w-8 h-8 object-contain transition-all duration-300 ${
                          isActive ? "brightness-0 invert" : ""
                        }`}
                        src={item.icon}
                        alt={item.label}
                      />
                    </div>
                    <span className={`text-xs font-semibold text-center transition-colors duration-300 ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}>
                      {item.label}
                    </span>
                  </Link>
                </motion.li>
              );
            })}

          {/* Logout */}
          <motion.li variants={tileVariant} className="relative group">
            <button
              onClick={handleLogout}
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
          </motion.li>
        </motion.ul>
      </div>
    </aside>
  );
}

export default Sidebar;