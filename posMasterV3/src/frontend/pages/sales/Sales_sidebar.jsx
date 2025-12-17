import React from "react";
// import saleViewImg from "../../assets/Dashboard_sales.png";
// import transactionHistoryImg from "../../assets/Inventory_report.png";
// import inventoryViewImg from "../../assets/View_inventory.png";
// import offersDiscountImg from "../../assets/Inventory_settings.png";
// import salesConfigImg from "../../assets/Inventory_settings.png";
//new image imports
import saleViewImg from "../../assets/sale_sidebar_view.png";
import transactionHistoryImg from "../../assets/sale_sidebar_trans_history.png";
import offersDiscountImg from "../../assets/sale_sidebar_discounts.png";
import salesConfigImg from "../../assets/Inventory_settings.png";
import inventoryReportImg from "../../assets/Inventory_report.png";
import viewInventoryImg from "../../assets/sale_sidebar_view_inventory.png";
function SalesSidebar({
  activeSection,
  onSaleViewClick,
  onTransactionHistoryClick,
  onInventoryViewClick,
  onSalesReportClick,
  onOffersDiscountClick,
  onSalesConfigClick,
}) {
  const sidebarItems = [
    {
      id: "sale-view",
      label: "Sale View",
      icon: saleViewImg,
      onClick: onSaleViewClick,
    },
    {
      id: "transaction-history",
      label: "Transaction History",
      icon: transactionHistoryImg,
      onClick: onTransactionHistoryClick,
    },
    {
      id: "view-inventory",
      label: "View Inventory",
      icon: viewInventoryImg,
      onClick: onInventoryViewClick,
    },
    {
      id: "sales-report",
      label: "Sales Report",
      icon: inventoryReportImg,
      onClick: onSalesReportClick,
    },
    {
      id: "sales-config",
      label: "Sales Configurations",
      icon: salesConfigImg,
      onClick: onSalesConfigClick,
    },
    {
      id: "offers-discount",
      label: "Offers and Discount View",
      icon: offersDiscountImg,
      onClick: onOffersDiscountClick,
    },
  ];

  return (
    //z index set to 20 to show popupups and status messages without overshadwoing popup
    <aside className="bg-[#F3F3F3] border-r z-20 border-gray-200 h-screen">
      <div className="flex flex-col">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-28 h-28 flex flex-col border border-gray-100 items-center justify-center p-4 transition-all duration-200 ${isActive
                  ? 'border-blue-500 bg-[#EBEBEB] relative'
                  : 'bg-[#FAFAFA] border-gray-200 hover:border-gray-300'
                }`}
            >
              {/* Image and arrow */}
              <div className="relative flex flex-col items-center mb-2">
                <img src={item.icon} alt={item.label} className="w-12 h-12 object-contain" />
                {/* Arrow absolutely positioned to the right of the image, vertically centered */}
                {/* {isActive && (
                  <span className="absolute right-[-40px] top-1/2 -translate-y-1/2">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )} */}
              </div>
              {/* Label below image */}
              {/* <span className={`text-sm font-medium text-center mt-1 ${isActive ? 'text-black' : 'text-gray-700'}`}>
                {item.label}
              </span> */}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default SalesSidebar;