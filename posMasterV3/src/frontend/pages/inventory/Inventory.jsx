import React, { useState, useEffect } from "react";
import InventorySidebar from "./Inventory_sidebar";
import AddItem from "./AddItem.jsx";
import NotFound from "../../assets/nonicons_not-found-16.png";
import InventoryConfig from "./InventoryConfig";
import InventoryReport from "./InventoryReport";
import { useOutletContext } from "react-router-dom";
import InventoryView from "./InventoryView.jsx";
import InventoryRestock from "./InventoryRestock.jsx";
import SupplierReg from "./SupplierReg.jsx";
import CheckHistory from "./CheckHistory.jsx";
import ReturnItem from "./ReturnItem.jsx";
import DisposeItem from "./DisposeItem.jsx";
import PriceChange from "./PriceChange.jsx";

function Inventory() {
  const { setActiveSection } = useOutletContext();
  const [activeSection, setLocalActiveSection] = useState("view-inventory");
  // update incorr
  // Update parent's activeSection whenever local activeSection changess
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
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
        onReturnItemClick={() => handleSectionChange("return-item")}
        onDisposeItemClick={() => handleSectionChange("dispose-item")}
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
        {/* Return Item */}
        <div className={isVisible("return-item")}>
          <ReturnItem isActive={activeSection === "return-item"} />
        </div>
        {/* Dispose Item */}
        <div className={isVisible("dispose-item")}>
          <DisposeItem isActive={activeSection === "dispose-item"} />
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
        {/* Dispose Item */}
        <div className={isVisible("dispose-item")}>
          <DisposeItem isActive={activeSection === "dispose-item"} />
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
