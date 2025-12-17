import React, { useState } from "react";
import UnitOfMeassurement from "./inventoryConfig/UnitOfMeassurement";
import CategoryConfig from "./inventoryConfig/CategoryConfig";
import BranchConfig from "./inventoryConfig/BranchConfig";

export default function InventoryConfig({ isActive }) {
  const [selectedSection, setSelectedSection] = useState("unit-of-meassurement");

  const sections = [
    {
      id: "unit-of-meassurement",
      label: "Unit of Measurement",
      component: <UnitOfMeassurement />,
    },
    {
      id: "category-config",
      label: "Category Configurations",
      component: <CategoryConfig />,
    },
    {
      id: "branch-config",
      label: "Branch Configurations",
      component: <BranchConfig />,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-2rem)]">
      {/* Left Panel with Dynamic Menu Items */}
      <div className="w-1/3 bg-white border-r flex flex-col">
        <div className="p-6">
          {sections.map((section) => (
            <div key={section.id} className="mb-2 bg-[#F8F8F8]">
              <button
                onClick={() => setSelectedSection(section.id)}
                className={`w-full text-left px-4 py-3 font-semibold flex items-center justify-between ${
                  selectedSection === section.id ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {section.label}
                {selectedSection === section.id && (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1">
        {sections.map((section) => (
          <div
            key={section.id}
            className={selectedSection === section.id ? "h-full" : "hidden"}
          >
            {section.component}
          </div>
        ))}
      </div>
    </div>
  );
}
