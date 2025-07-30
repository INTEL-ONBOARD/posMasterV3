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
    <aside className="bg-[#F3F3F3] border-r border-gray-200 h-screen">
      <div className="flex flex-col">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-60 h-40 flex flex-col border border-gray-100 items-center justify-center p-4 transition-all duration-200 ${isActive
                  ? 'border-blue-500 bg-[#EBEBEB] relative'
                  : 'bg-[#FAFAFA] border-gray-200 hover:border-gray-300'
                }`}
            >
              {/* Image and arrow */}
              <div className="relative flex flex-col items-center mb-2">
                <img src={item.icon} alt={item.label} className="w-16 h-16 object-contain" />
                {/* Arrow absolutely positioned to the right of the image, vertically centered */}
                {isActive && (
                  <span className="absolute right-[-40px] top-1/2 -translate-y-1/2">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </div>
              {/* Label below image */}
              <span className={`text-sm font-medium text-center mt-1 ${isActive ? 'text-black' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default SettingsSidebar;