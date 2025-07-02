import React from "react";
import { Link,useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_viewmore from "../assets/Dashboard_viewmore.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_Morawakle from "../assets/Dashboard_Morawakle.png";
import Dashboard_sales from "../assets/Dashboard_sales.png";
<assets />;

function Sidebar() {
  //to highlight the currrent page's sidebar item from the sidebar
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  return (
    <aside
      id="logo-sidebar"
      className="fixed top-0 mb-10 bottom-0 h-screen pt-20 transition-transform -translate-x-full bg-white border-r sm:translate-x-0"
      aria-label="Sidebar"
    >
      <div className="h-full overflow-hidden bg-white">
        <ul className="font-medium">
          <li>
             <Link
      to="notifications"
      className={`${
        currentPath === "/dashboard/notifications" ? "bg-[#EBEBEB] border-blue-500 relative" : ""
      } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}
    >
      {/* Image and arrow */}
  <div className="relative flex flex-col items-center mb-2">
    <img className="w-12 object-contain" src={Dashboard_notification} alt="" />
    {currentPath === "/dashboard/notifications" && (
      <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    )}
  </div>
  {/* Label below image */}
  <span className="text-sm font-medium text-center mt-1">
    Notifications
  </span>
    </Link>
          </li>
          
          <li>
            <Link
  to="inventory"
  className={`${
    currentPath.startsWith("/dashboard/inventory") ? "bg-[#EBEBEB] border-blue-500 relative" : ""
  } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}
>

  {/* Image and arrow */}
  <div className="relative flex flex-col items-center mb-2">
    <img className="w-12 object-contain" src={Dashboard_inventory} alt="" />
    {currentPath === "/dashboard/inventory" && (
      <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    )}
  </div>
  {/* Label below image */}
  <span className="text-sm font-medium text-center mt-1">
    Inventory
  </span>
</Link>
          </li>
          <li>
            <Link
      to="sales"
      className={`${
        currentPath.startsWith("/dashboard/sales") ? "bg-[#EBEBEB] border-blue-500 relative" : ""
      } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}
    >
      
      {/* Image and arrow */}
  <div className="relative flex flex-col items-center mb-2">
    <img className="w-12 object-contain" src={Dashboard_sales} alt="" />
    {currentPath === "/dashboard/sales" && (
      <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    )}
  </div>
  {/* Label below image */}
  <span className="text-sm font-medium text-center mt-1">
    Sales
  </span>
    </Link>
          </li>
          <li>
           <Link
      to="settings"
      className={`${
        currentPath === "/dashboard/settings" ? "bg-[#EBEBEB] border-blue-500 relative" : ""
      } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}
    >
      {/* Image and arrow */}
  <div className="relative flex flex-col items-center mb-2">
    <img className="w-12 object-contain" src={Dashboard_settings} alt="" />
    {currentPath === "/dashboard/settings" && (
      <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    )}
  </div>
  {/* Label below image */}
  <span className="text-sm font-medium text-center mt-1">
    Settings
  </span>
    </Link>
          </li>
          <li>
           <button
      onClick={() => navigate("/login")}
      className={`${
        currentPath === "/dashboard/logout" ? "bg-[#EBEBEB] border-blue-500 relative" : ""
      } w-32 h-32 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200 bg-transparent outline-none`}
      style={{ border: "none", background: "none" }}
    >
      
    {/* Image and arrow */}
  <div className="relative flex flex-col items-center mb-2">
    <img className="w-12 object-contain" src={Dashboard_logout} alt="" />
    {currentPath === "/dashboard/logout" && (
      <span className="absolute right-[-32px] top-1/2 -translate-y-1/2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    )}
  </div>
  {/* Label below image */}
  <span className="text-sm font-medium text-center mt-1">
    Logout
  </span>
    </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
