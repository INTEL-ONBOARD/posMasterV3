import React, { useState } from "react";
import { Ruler, Tag, MapPin, ChevronRight, Settings } from "lucide-react";
import UnitOfMeassurement from "./inventoryConfig/UnitOfMeassurement";
import CategoryConfig from "./inventoryConfig/CategoryConfig";
import BranchConfig from "./inventoryConfig/BranchConfig";

export default function InventoryConfig() {
  const [selectedSection, setSelectedSection] = useState("unit-of-meassurement");

  const sections = [
    {
      id: "unit-of-meassurement",
      label: "Unit of Measurement",
      description: "Manage measurement units like kg, pcs, litres",
      icon: Ruler,
      iconBg: "bg-[#1A318C]/10",
      iconColor: "text-[#1A318C]",
      component: <UnitOfMeassurement />,
    },
    {
      id: "category-config",
      label: "Category Configurations",
      description: "Manage product categories and brands",
      icon: Tag,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      component: <CategoryConfig />,
    },
    {
      id: "branch-config",
      label: "Branch Configurations",
      description: "Manage store branches and locations",
      icon: MapPin,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      component: <BranchConfig />,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-gray-50">
      {/* Left Panel with Navigation */}
      <div className="w-80 bg-gray-100 h-full p-3">
        <div className="flex flex-col h-full gap-3">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#1A318C]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Configuration</h2>
                <p className="text-xs text-gray-500">Manage inventory settings</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-3 space-y-2">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isSelected = selectedSection === section.id;
                return (
                  <button
                    key={`${section.id || section.label || "section"}-${index}`}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "bg-[#1A318C] shadow-lg shadow-blue-900/20"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-white/20" : section.iconBg
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? "text-white" : section.iconColor}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-800"}`}>
                            {section.label}
                          </p>
                          <p className={`text-xs ${isSelected ? "text-white/70" : "text-gray-500"}`}>
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${isSelected ? "text-white" : "text-gray-400"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mt-auto">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Quick Tip</p>
            <p className="text-sm text-gray-600">
              Configure your inventory settings before adding items to ensure accurate tracking and reporting.
            </p>
          </div>

          {/* Spacer */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>

      {/* Right Panel - Content Area */}
      <div className="flex-1 h-full overflow-hidden">
        {sections.map((section, index) => (
          <div
            key={`${section.id || section.label || "section"}-${index}`}
            className={selectedSection === section.id ? "h-full" : "hidden"}
          >
            {section.component}
          </div>
        ))}
      </div>
    </div>
  );
}
