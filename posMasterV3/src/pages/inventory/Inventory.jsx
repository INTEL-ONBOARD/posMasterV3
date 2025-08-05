import React, { useState, useEffect } from "react";
import InventorySidebar from "./Inventory_sidebar";
import ItemCard from "../../components/ItemCard.jsx";
import SpinnerDot from "../../frontend/components/SpinnerDot";
import bananaImg from "../../assets/Inventory_banana.png";
import AddItem from "./AddItem.jsx";
import NotFound from "../../assets/nonicons_not-found-16.png";
import InventoryConfig from "./InventoryConfig";
import InventoryReport from "./InventoryReport";
import { useOutletContext } from "react-router-dom";
import InventoryView from "./InventoryView.jsx";
import InventoryRestock from "./InventoryRestock.jsx";
import SupplierReg from "./SupplierReg.jsx";
import CheckHistory from "./CheckHistory.jsx";

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
    <div id="inv-background" className="flex h-screen bg-[#EBEBEB] -ml-12">
      {/* sidebar (left) */}
      <InventorySidebar
        activeSection={activeSection}
        onViewInvClick={() => handleSectionChange("view-inventory")}
        onAddItemClick={() => handleSectionChange("add-item")}

        onRestockClick={() => handleSectionChange("inventory-restock")}
        onSupplierRegClick={() => handleSectionChange("supplier-reg")}
        onCheckHistoryClick={() => handleSectionChange("check-history")}
        
        onConfigClick={() => handleSectionChange("inventory-config")}
        onCReportClick={() => handleSectionChange("inventory-report")}
      />


      <main className="flex-1 bg-[#F3F3F3] h-[calc(100vh-2rem)] relative">

        {/* View Inventory */}
        <div className={isVisible("view-inventory")}>
          <InventoryView/>
        </div>
        {/* Add Item */}
        <div className={isVisible("add-item")}>
          <AddItem />
        </div>
        {/* Inventory Restock */}
        <div className={isVisible("inventory-restock")}>
          <InventoryRestock />
        </div>
        {/* Supplier Reg */}
        <div className={isVisible("supplier-reg")}>
          <SupplierReg />
        </div>
        {/* Check History */}
        <div className={isVisible("check-history")}>
          <CheckHistory />
        </div>

        {/* Inventory Config */}
        <div className={isVisible("inventory-config")}>
          <InventoryConfig />
          {/* …your config UI here… */}
        </div>
        {/* Inventory Report */}
        <div className={isVisible("inventory-report")}>
          <InventoryReport />
        </div>
      </main>


    </div>
  );
}

export default Inventory;