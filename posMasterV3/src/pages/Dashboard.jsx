import React, { useContext, useState } from "react";
import Dashboard_inventory from "../assets/Dashboard_inventory.png";
import Dashboard_logout from "../assets/Dashboard_logout.png";
import Dashboard_settings from "../assets/Dashboard_settings.png";
import Dashboard_viewmore from "../assets/Dashboard_viewmore.png";
import Dashboard_notification from "../assets/Dashboard_notification.png";
import Dashboard_Morawakle from "../assets/Dashboard_Morawakle.png";
import ToastContext from "./toasts/ToastService.jsx";
import DashboardCard from "./DashboardCard";
import SpinnerDot from "./SpinnerDot.jsx";
import { useNavigate } from "react-router-dom";
import Inventory from "./inventory/Inventory.jsx";

function Dashboard() {
  const [hoveredCard, setHoveredCard] = useState(null);
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
    hoveredCard && hoveredCard !== cardName ? "blur-sm transition-all duration-300" : "transition-all duration-300";

  return (
    <div className="pt-16 pb-4">
      <div className={`bg-gray-100 rounded-xl max-w-6xl mx-auto py-3 px-6 shadow text-center ${hoveredCard ? "blur-sm transition-all duration-300" : "transition-all duration-300"}`}>
        <h1 className="text-2xl font-bold">
          <span className="text-blue-600">POS</span>
          <span className="text-gray-900"> MASTER</span>
          <span className="text-gray-700">.3</span>
        </h1>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 transition-all duration-300">
        {/* Top Row - Store Info and Right Side Cards */}
        <div className="flex gap-6 mb-6">
          {/* Large Store Info Card */}
          <div
            className={`flex-1 ${getBlurClass("store-info")}`}
            onMouseEnter={() => setHoveredCard("store-info")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <DashboardCard
              onClick={() => handleComponentClick("store-info")}
              className="p-8 h-48"
              image={Dashboard_Morawakle}
              imageClass="w-28 h-20 bg-green-600 rounded-xl shadow-sm"
              title="Morawakkorale Outlet"
              subtitle="2025 - 05 - 23"
            />
          </div>
          {/* Right Side Cards Stack */}
          <div className="w-80 flex flex-col gap-4">
            <div
              className={getBlurClass("notifications")}
              onMouseEnter={() => setHoveredCard("notifications")}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <DashboardCard
                onClick={() => handleComponentClick("notifications")}
                className="h-14"
                image={Dashboard_notification}
                imageClass="w-6 h-6 bg-orange-100 rounded-lg"
                title={
                  <span className="flex items-center gap-2">
                    Notifications
                  </span>
                }
              />
            </div>
            <div
              className={getBlurClass("settings")}
              onMouseEnter={() => setHoveredCard("settings")}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <DashboardCard
                onClick={() => handleComponentClick("settings")}
                className="h-14"
                image={Dashboard_settings}
                imageClass="w-6 h-6 bg-gray-100 rounded-lg"
                title="Settings"
              />
            </div>
            <div
              className={getBlurClass("logout")}
              onMouseEnter={() => setHoveredCard("logout")}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <DashboardCard
                onClick={() => handleComponentClick("logout")}
                className="h-14"
                image={Dashboard_logout}
                imageClass="w-6 h-6 bg-blue-100 rounded-lg"
                title="Log out"
              />
            </div>
          </div>
        </div>
        {/* Bottom Row - Inventory and Other Cards */}
        <div className="grid grid-cols-5 gap-6">
          {/* Inventory Card */}
          <div
            className={getBlurClass("inventory")}
            onMouseEnter={() => setHoveredCard("inventory")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <DashboardCard
              onClick={() => handleComponentClick("inventory")}
              className="h-48 p-0"
              image={Dashboard_inventory}
              fullImage={true}
              title={null}
            />
          </div>
          {/* Empty spaces for future cards */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={getBlurClass(`empty${i}`)}
              onMouseEnter={() => setHoveredCard(`empty${i}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="bg-gray-200 rounded-xl h-48"></div>
            </div>
          ))}
          {/* View More Card */}
          <div
            className={getBlurClass("view-more")}
            onMouseEnter={() => setHoveredCard("view-more")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <DashboardCard
              onClick={() => handleComponentClick("view-more")}
              className="h-48 p-0"
              image={Dashboard_viewmore}
              fullImage={true}
              title={null}
            />
          </div>
        </div>
      </div>

      {/* Bottom Loading Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-1">
        <div className="flex items-center gap-1 justify-start">
          <SpinnerDot />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;