import React, { useState, useEffect } from "react";
import InventorySidebar from "./Inventory_sidebar";
import AddItem from "./AddItem.jsx";
import InventoryConfig from "./InventoryConfig";
import InventoryReport from "./InventoryReport";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import InventoryView from "./InventoryView.jsx";
import InventoryRestock from "./InventoryRestock.jsx";
import InventoryShare from "./InventoryShare.jsx";
import SupplierReg from "./SupplierReg.jsx";
import CheckHistory from "./CheckHistory.jsx";
import PriceChange from "./PriceChange.jsx";
import DisposedItemsView from "./DisposedItemsView.jsx";
import ManagerApprovalTab from "./ManagerApprovalTab.jsx";
import { useReactiveData, TABLES } from "../../store";
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
  "inventory-approvals": "Approvals",
  "inventory-report": "Inventory Report",
  "inventory-share": "Inventory Share",
  "disposed-items": "Disposed Items",
};

function Inventory() {
  const { setActiveSection } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setLocalActiveSection] = useState("view-inventory");
  const statusLog = useStatusLog();
  const { data: branchRows = [] } = useReactiveData(TABLES.BRANCHES, null, { initialData: [] });

  const branches = branchRows.filter((branch) => branch && branch.is_active !== false && branch.isActive !== false);

  useEffect(() => {
    if (location.pathname.endsWith("/share")) {
      setLocalActiveSection("inventory-share");
      setActiveSection("inventory-share");
    } else if (location.pathname.endsWith("/approvals")) {
      setLocalActiveSection("inventory-approvals");
      setActiveSection("inventory-approvals");
    }
  }, [location.pathname, setActiveSection]);

  // Update parent's activeSection whenever local activeSection changes
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
    statusLog.info(`Inventory: ${sectionLabels[section] || section}`);
    if (section === "inventory-share") {
      navigate("/dashboard/inventory/share", { replace: true });
    } else if (section === "inventory-approvals") {
      navigate("/dashboard/inventory/approvals", { replace: true });
    }
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
        onShareClick={() => handleSectionChange("inventory-share")}
        onApprovalsClick={() => handleSectionChange("inventory-approvals")}
        onConfigClick={() => handleSectionChange("inventory-config")}
        onCReportClick={() => handleSectionChange("inventory-report")}
        onDisposedItemsClick={() => handleSectionChange("disposed-items")}
      />

      <main className="flex-1 bg-[#F3F3F3] h-[calc(100vh-2rem)] relative overflow-y-auto">
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
        {/* Inventory Share */}
        <div className={isVisible("inventory-share")}>
          <InventoryShare isActive={activeSection === "inventory-share"} />
        </div>
        {/* Approvals */}
        <div className={isVisible("inventory-approvals")}>
          <ManagerApprovalTab branches={branches} />
        </div>
        {/* Disposed Items */}
        <div className={isVisible("disposed-items")}>
          <DisposedItemsView isActive={activeSection === "disposed-items"} />
        </div>
      </main>
    </div>
  );
}

export default Inventory;
