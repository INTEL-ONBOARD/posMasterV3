import React from 'react'
import {Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_viewmore from "../assets/Dashboard_viewmore.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_Morawakle from "../assets/Dashboard_Morawakle.png";

function Sidebar() {


       //to highlight the currrent page's sidebar item from the sidebar
    const location = useLocation();
    const currentPath = location.pathname;

    return (
    <aside id="logo-sidebar" className="fixed top-0 mb-10 bottom-0 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-red-200 sm:translate-x-0" aria-label="Sidebar">
   <div className="h-full overflow-y-auto bg-white">
      <ul className="font-medium">
         <li>
            <Link to="inventory" className={`${currentPath === '/dashboard/inventory' ? 'bg-[#EBEBEB]':""} w-40 h-40 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}>
               <img className='w-20' src={Dashboard_inventory}  alt="" />
               <span className="flex-1 whitespace-nowrap">Inventory</span>
            </Link>
         </li>
        <li>
            <Link to="settings" className={`${currentPath === '/dashboard/settings' ? 'bg-[#EBEBEB]':""} w-40 h-40 border border-gray-100 flex flex-col items-center justify-center px-6 cursor-pointer hover:shadow-sm transition-all duration-200 hover:border-gray-200`}>
               <img className='w-20' src={Dashboard_settings}  alt="" />
               <span className="flex-1 whitespace-nowrap">Settings</span>
            </Link>
         </li>
         
      </ul>
   </div>
         

         

</aside>
  )
}

export default Sidebar