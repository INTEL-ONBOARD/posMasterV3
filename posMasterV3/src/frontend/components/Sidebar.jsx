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

  // Load user permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await localAuth.getCurrentUser();
        if (currentUser) {
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
    // removet pt-20 for header removal
    //z index set to 20 to show popupups and status messages without overshadwoing popup
    <aside
      id="logo-sidebar"
      className="fixed top-0 bottom-0 z-30 h-screen bg-white border-r"
      aria-label="Sidebar"
    >
      <div className="h-full overflow-hidden bg-white">
        <motion.ul
          className="font-medium"
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
              alwaysVisible: true, // Always show
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
              alwaysVisible: true, // Always show
            },
          ]
            .filter((item) => item.alwaysVisible || hasAccess(item.permissionKey))
            .map((item) => (
            <motion.li key={item.to} variants={tileVariant}>
              <Link
                to={item.to}
                className={`${currentPath.startsWith(`/dashboard/${item.to}`)
                  ? "bg-[#EBEBEB] border-blue-500 relative"
                  : ""
                  } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}
              >
                <div className="relative flex flex-col items-center mb-2">
                  <img className="w-12 object-contain" src={item.icon} alt={item.label} />
                </div>
                <span className="text-sm font-medium text-center mt-1">
                  {item.label}
                </span>
              </Link>
            </motion.li>
          ))}

          {/* Logout */}
          <motion.li variants={tileVariant}>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`${currentPath === "/dashboard/logout" ? "bg-[#EBEBEB] border-blue-500 relative" : ""
                } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200 bg-transparent outline-none ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ border: "none", background: "none" }}
            >
              <div className="relative flex flex-col items-center mb-2">
                <img className="w-12 object-contain" src={Dashboard_logout} alt="Logout" />
              </div>
              <span className="text-sm font-medium text-center mt-1">
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