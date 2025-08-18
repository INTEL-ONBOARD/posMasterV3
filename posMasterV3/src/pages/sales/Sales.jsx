import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import SalesView from "./SalesView";
import OffersDiscountView from "./OffersDiscountView";

export default function Sales() {
  const { setActiveSection } = useOutletContext();
  const [activeSection, setLocalActiveSection] = useState("sale-view");
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
  };

  // Fetch inventory items from API
return (
    <div className="flex h-screen bg-[#EBEBEB]">
      <SalesSidebar
        activeSection={activeSection}
        onSaleViewClick={() => handleSectionChange("sale-view")}
        onTransactionHistoryClick={() =>
          handleSectionChange("transaction-history")
        }
        onInventoryViewClick={() => handleSectionChange("inventory-view")}
        onOffersDiscountClick={() => handleSectionChange("offers-discount")}
        onSalesConfigClick={() => handleSectionChange("sales-config")}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className={isVisible("sale-view")}>
          <SalesView/>
        </div>

        <div className={isVisible("transaction-history")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Transaction History</h2>
            <p>Transaction history content will go here...</p>
          </div>
        </div>

        <div className={isVisible("inventory view")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Inventory View</h2>
            <p>Inventory view content will go here...</p>
          </div>
        </div>

        <div className={isVisible("offers-discount")}>
          <OffersDiscountView />
        </div>

        <div className={isVisible("sales-config")}>
          <div className="p-4 lg:p-8">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">Sales Configurations</h2>
            <p>Sales configurations content will go here...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
