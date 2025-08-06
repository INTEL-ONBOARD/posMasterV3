import React from "react";
import saleViewImg from "../../assets/sale_sidebar_view.png";
import transactionHistoryImg from "../../assets/sale_sidebar_trans_history.png";

function SettingsSidebar({
  activeSection,
  onSaleViewClick: onUserSettingsClick,
  onTransactionHistoryClick: onAppSettingsClick,
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
    <aside className="min-w-[7rem] bg-[#F3F3F3] h-screen border-r border-gray-200 flex flex-col items-center py-4">
      {sidebarItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`w-28 h-28 flex flex-col border border-gray-100 items-center justify-center p-4 transition-all duration-200 ${
              isActive
                ? "border-blue-500 bg-[#EBEBEB] relative"
                : "bg-[#FAFAFA] border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="relative flex flex-col items-center mb-2">
              <img
                src={item.icon}
                alt={item.label}
                className="w-12 h-12 object-contain"
              />
              {isActive && (
                <span className="absolute right-[-30px] top-1/2 -translate-y-1/2">
                  <svg
                    className="w-6 h-6 text-black"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              )}
            </div>
            <span
              className={`text-sm font-medium text-center mt-1 ${
                isActive ? "text-black" : "text-gray-700"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

export default SettingsSidebar;
