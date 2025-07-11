import React, { useContext, useState } from "react";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_viewmore from "../assets/Dashboard_viewmore.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_Morawakle from "../assets/Dashboard_Morawakle.png";
import ToastContext from "./toasts/ToastService.jsx";
import DashboardCard from "../frontend/components/DashboardCard.jsx";
import SpinnerDot from "../frontend/components/SpinnerDot.jsx";
import { Outlet, useNavigate } from "react-router-dom";
import Inventory from "./inventory/Inventory.jsx";
import LoadingBar from "../frontend/components/LoadingBar.jsx";
import Dashboard_card from "../assets/Dashboard_card.png";
import Dashboard_manageUsers from "../assets/Dashboard_manageUsers.png";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Notification from "./notification/Notification.jsx";

function Dashboard() {
  const [hoveredCard, setHoveredCard] = useState(null);
   const [activeSection, setActiveSection] = useState(null);
  const toast = useContext(ToastContext);
  const navigate = useNavigate();

  const handleComponentClick = (componentName) => {
    if (componentName === "notifications") {
      toast.open("You have new notifications!");
    }
    if (componentName === "logout") {
      navigate("/login");
    }
    if (componentName === "inventory") {
      navigate("/dashboard/inventory");
    }
    
    // Add other click logic as needed
  };

  // Helper to get blur class
  const getBlurClass = (cardName) =>
    hoveredCard && hoveredCard !== cardName
      ? "blur-sm transition-all duration-300"
      : "transition-all duration-300";

  return (
    <>
      <div className="mb-20">
       <Header activeSection={activeSection} />
      </div>
      <Sidebar/>
      <div className="ml-44">
     <Outlet context={{ setActiveSection }} />
      </div>
    </>
  );
}

export default Dashboard;


