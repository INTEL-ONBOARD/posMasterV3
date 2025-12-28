import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import SalesView from "./SalesView";
import OffersDiscountView from "./OffersDiscountView";
import TransactionHistory from "./TransactionHistory";
import ViewSaleInventory from "./ViewSaleInventory";
import SalesConfig from "./SalesConfig";
import { useStatusLog } from "../../services/StatusLogService.jsx";

// Section labels for status bar
const sectionLabels = {
  "sale-view": "Sale View",
  "transaction-history": "Transaction History",
  "view-inventory": "View Inventory",
  "sales-report": "Sales Report",
  "offers-discount": "Offers & Discounts",
  "sales-config": "Sales Configuration",
};

export default function Sales() {
  const { setActiveSection } = useOutletContext();
  const [activeSection, setLocalActiveSection] = useState("sale-view");
  const statusLog = useStatusLog();

  // Helper function to check visibility
  const isVisible = (section) =>
    activeSection === section ? "block" : "hidden";

  // Update parent's activeSection whenever local activeSection changes
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
    statusLog.info(`Sales: ${sectionLabels[section] || section}`);
  };

  return (
    <div className="flex h-screen bg-[#EBEBEB]">
      <SalesSidebar
        activeSection={activeSection}
        onSaleViewClick={() => handleSectionChange("sale-view")}
        onTransactionHistoryClick={() => handleSectionChange("transaction-history")}
        onInventoryViewClick={() => handleSectionChange("view-inventory")}
        onOffersDiscountClick={() => handleSectionChange("offers-discount")}
        onSalesReportClick={() => handleSectionChange("sales-report")}
        onSalesConfigClick={() => handleSectionChange("sales-config")}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className={isVisible("sale-view")}>
          <SalesView isActive={activeSection === "sale-view"} />
        </div>

        <div className={isVisible("transaction-history")}>
          <TransactionHistory isActive={activeSection === "transaction-history"} />
        </div>

        <div className={isVisible("view-inventory")}>
          <ViewSaleInventory isActive={activeSection === "view-inventory"} />
        </div>
        
        <div className={isVisible("sales-report")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Sales Reports</h2>
            <p>Sales configurations content will go here...</p>
          </div>
        </div>
        
        <div className={isVisible("offers-discount")}>
          <OffersDiscountView isActive={activeSection === "offers-discount"} />
        </div>

        <div className={isVisible("sales-config")}>
          <SalesConfig isActive={activeSection === "sales-config"} />
        </div>
      </div>
    </div>
  );
}