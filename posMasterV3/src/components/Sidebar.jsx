import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_viewmore from "../assets/Dashboard_viewmore.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_Morawakle from "../assets/Dashboard_Morawakle.png";
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

  return (
    <aside
      id="logo-sidebar"
      className="fixed top-0 bottom-0 h-screen pt-20 bg-white border-r"
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
                  {currentPath === `/dashboard/${item.to}` && (
                    <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  )}
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
              onClick={() => navigate("/login")}
              className={`${currentPath === "/dashboard/logout" ? "bg-[#EBEBEB] border-blue-500 relative" : ""
                } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200 bg-transparent outline-none`}
              style={{ border: "none", background: "none" }}
            >
              <div className="relative flex flex-col items-center mb-2">
                <img className="w-12 object-contain" src={Dashboard_logout} alt="Logout" />
                {currentPath === "/dashboard/logout" && (
                  <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-center mt-1">Logout</span>
            </button>
          </motion.li>
        </motion.ul>
      </div>
    </aside>
  );
}

export default Sidebar;
