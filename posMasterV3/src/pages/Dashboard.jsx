import React, { useContext, useState } from "react";
import ToastContext from "./toasts/ToastService.jsx";
import SpinnerDot from "../frontend/components/SpinnerDot.jsx";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_viewmore from "../assets/Dashboard_viewmore.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_Morawakle from "../assets/Dashboard_Morawakle.png";
import DashboardCard from "../frontend/components/DashboardCard.jsx";
import Inventory from "./inventory/Inventory.jsx";
import LoadingBar from "../frontend/components/LoadingBar.jsx";
import Dashboard_card from "../assets/Dashboard_card.png";
import Dashboard_manageUsers from "../assets/Dashboard_manageUsers.png";
import Header from "../components/Header.jsx";
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
      navigate("/");
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
  <div className="min-h-screen flex flex-col">
    {/* Header - fixed at top */}
    {/* <header className="fixed top-0 left-0 right-0 z-50">
      <Header activeSection={activeSection} />
    </header> */}

    {/* Main content area removed mt-16 for header removal */}
    <div className="flex flex-1"> {/* mt-16 accounts for header height */}
      {/* Sidebar - fixed left */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-44 z-40">
        <Sidebar />
      </aside>

      {/* Main content - with sidebar offset */}
      <main className="flex-1 ml-44 pb-16"> {/* pb-16 accounts for footer height */}
        <Outlet context={{ setActiveSection }} />
      </main>
    </div>

    {/* Footer - fixed at bottom */}
    <footer 
      id="bottom-bar"
      className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-2 z-50"
    >
      <div className="flex items-center gap-1 justify-start ml-5">
        <SpinnerDot />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </footer>
  </div>
);
}

export default Dashboard;


