import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { apiClient } from "../api/client";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_sales from "../assets/Dashboard_sales.png";

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

  // Logout function
  const handleLogout = async () => {
    console.log("Logout initiated");
    if (isLoggingOut) return;
    console.log("Logout process started");
    setIsLoggingOut(true);

    try {
      const storedUserInfo = localStorage.getItem('user');

      if (storedUserInfo) {
        const user = JSON.parse(storedUserInfo);

        const logoutData = {
          email: user.email,
          user_id: user._id
        };
        const response = await apiClient.post('/api/users/logout', logoutData);

        if (response.status === 200) {
          console.log("Logout successful:", response.data);
        } else {
          console.error("Logout API call failed:", response.statusText);
        }
      }
    } catch (error) {
      console.error("Error during logout:", error.response?.data || error.message);
    } finally {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('auth') || key.startsWith('user')) {
          localStorage.removeItem(key);
        }
      });

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
            },
            {
              to: "inventory",
              icon: Dashboard_inventory,
              label: "Inventory",
            },
            {
              to: "sales",
              icon: Dashboard_sales,
              label: "Sales",
            },
            {
              to: "settings",
              icon: Dashboard_settings,
              label: "Settings",
            },
          ].map((item, index) => (
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