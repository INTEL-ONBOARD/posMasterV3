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
        onConfigClick={() => handleSectionChange("inventory-config")}
        onCReportClick={() => handleSectionChange("inventory-report")}
      />


      <main className="flex-1 bg-[#F3F3F3] h-[calc(100vh-6rem)] relative">

        {/* View Inventory */}
        <div className={isVisible("view-inventory")}>
              <InventoryView/>
        </div>
        {/* Add Item */}
        <div className={isVisible("add-item")}>
          <AddItem />
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