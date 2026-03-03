import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import SalesSidebar from "./Sales_sidebar";
import SalesView from "./SalesView";
import OffersDiscountView from "./OffersDiscountView";
import TransactionHistory from "./TransactionHistory";
import ViewSaleInventory from "./ViewSaleInventory";
import SalesConfig from "./SalesConfig";
import { useStatusLog } from "../../services/StatusLogService.jsx";
import { BarChart3, Clock, Sparkles, Wrench } from "lucide-react";

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
          <div className="h-[calc(100vh-2rem)] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            <div className="max-w-lg w-full text-center">
              {/* Animated Icon Container */}
              <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse">
                  <BarChart3 className="w-16 h-16 text-white" />
                </div>
                {/* Floating decorative elements */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'bounce 1s infinite 0.5s' }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Sales Reports
              </h2>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-6">
                <Clock className="w-4 h-4" />
                Under Development
              </div>

              {/* Description */}
              <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                We're working hard to bring you powerful sales analytics and reporting features.
                This module will help you track performance, identify trends, and make data-driven decisions.
              </p>

              {/* Features Preview */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Coming Soon</p>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-slate-600">Daily Sales Summary</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-sm text-slate-600">Revenue Analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-slate-600">Top Selling Items</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-sm text-slate-600">Export to PDF/Excel</span>
                  </div>
                </div>
              </div>

              {/* Footer Text */}
              <p className="text-slate-400 text-sm mt-8">
                Stay tuned for updates!
              </p>
            </div>
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