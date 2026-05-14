import React from "react";
import saleViewImg from "../../assets/setting_user.png";
import transactionHistoryImg from "../../assets/setting_app.png";

function SettingsSidebar({
  activeSection,
  onUserSettingsClick,
  onAppSettingsClick,
}) {
  const sidebarItems = [
    {
      id: "user-settings",
      label: "User Settings",
      icon: saleViewImg,
      onClick: onUserSettingsClick,
    },
    {
      id: "app-settings",
      label: "App Settings",
      icon: transactionHistoryImg,
      onClick: onAppSettingsClick,
    },
  ];

  return (
    <aside className="bg-white border-r border-gray-100 h-screen shadow-sm">
      <div className="flex flex-col py-2">
        {sidebarItems.map((item, index) => {
          const isActive = activeSection === item.id;
          return (
            <div key={`${item.id || item.label || "settings-item"}-${index}`} className="relative group px-2 py-1">
              <button
                onClick={item.onClick}
                className={`relative w-24 h-24 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-[#1A318C] to-[#152870] shadow-lg shadow-blue-900/20"
                    : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                }`}
              >
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-white rounded-r-full" />
                )}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-1 transition-transform duration-300 ${
                  isActive ? "bg-white/90 shadow-sm" : "bg-white shadow-sm"
                } ${!isActive && "group-hover:scale-105"}`}>
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-8 h-8 object-contain pointer-events-none transition-all duration-300"
                  />
                </div>
              </button>
              {/* Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default SettingsSidebar;
