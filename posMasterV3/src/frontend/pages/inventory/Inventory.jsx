import React, { useState, useEffect } from "react";
import InventorySidebar from "./Inventory_sidebar";
import AddItem from "./AddItem.jsx";
import InventoryConfig from "./InventoryConfig";
import InventoryReport from "./InventoryReport";
import { useOutletContext } from "react-router-dom";
import InventoryView from "./InventoryView.jsx";
import InventoryRestock from "./InventoryRestock.jsx";
import SupplierReg from "./SupplierReg.jsx";
import CheckHistory from "./CheckHistory.jsx";
import PriceChange from "./PriceChange.jsx";
import { useStatusLog } from "../../services/StatusLogService.jsx";

// Section labels for status bar
const sectionLabels = {
  "view-inventory": "View Inventory",
  "add-item": "Add Item",
  "inventory-restock": "Inventory Restock",
  "supplier-registration": "Supplier Registration",
  "price-change": "Price Change",
  "check-history": "Check History",
  "inventory-config": "Inventory Configuration",
  "inventory-report": "Inventory Report",
};

function Inventory() {
  const { setActiveSection } = useOutletContext();
  const [activeSection, setLocalActiveSection] = useState("view-inventory");
  const statusLog = useStatusLog();

  // Update parent's activeSection whenever local activeSection changes
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
    statusLog.info(`Inventory: ${sectionLabels[section] || section}`);
  };

  // helper function to toggle Tailwind visibility between sections
  const isVisible = (section) =>
    activeSection === section ? "block" : "hidden";

  return (
    <div id="inv-background" className="flex h-screen bg-[#EBEBEB]">
      {/* sidebar (left) */}
      <InventorySidebar
        activeSection={activeSection}
        onViewInvClick={() => handleSectionChange("view-inventory")}
        onAddItemClick={() => handleSectionChange("add-item")}
        onRestockClick={() => handleSectionChange("inventory-restock")}
        onSupplierRegClick={() => handleSectionChange("supplier-registration")}
        onPriceChangeClick={() => handleSectionChange("price-change")}
        onCheckHistoryClick={() => handleSectionChange("check-history")}
        onConfigClick={() => handleSectionChange("inventory-config")}
        onCReportClick={() => handleSectionChange("inventory-report")}
      />

      <main className="flex-1 bg-[#F3F3F3] h-[calc(100vh-2rem)] relative">
        {/* View Inventory */}
        <div className={isVisible("view-inventory")}>
          <InventoryView isActive={activeSection === "view-inventory"} />
        </div>
        {/* Add Item */}
        <div className={isVisible("add-item")}>
          <AddItem isActive={activeSection === "add-item"} />
        </div>
        {/* Inventory Restock */}
        <div className={isVisible("inventory-restock")}>
          <InventoryRestock isActive={activeSection === "inventory-restock"} />
        </div>
        {/* Supplier Reg */}
        <div className={isVisible("supplier-registration")}>
          <SupplierReg isActive={activeSection === "supplier-registration"} />
        </div>
        {/* Price Change */}
        <div className={isVisible("price-change")}>
          <PriceChange isActive={activeSection === "price-change"} />
        </div>
        {/* Check History */}
        <div className={isVisible("check-history")}>
          <CheckHistory isActive={activeSection === "check-history"} />
        </div>
        {/* Inventory Config */}
        <div className={isVisible("inventory-config")}>
          <InventoryConfig isActive={activeSection === "inventory-config"} />
          {/* …your config UI here… */}
        </div>
        {/* Inventory Report */}
        <div className={isVisible("inventory-report")}>
          <InventoryReport isActive={activeSection === "inventory-report"} />
        </div>
      </main>
    </div>
  );
}

export default Inventory;
