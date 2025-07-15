import React, { useState } from "react";
import UnitOfMeassurement from "./inventoryConfig/UnitOfMeassurement";
import CategoryConfig from "./inventoryConfig/CategoryConfig";
import BranchConfig from "./inventoryConfig/BranchConfig";

export default function InventoryConfig() {
  const [selectedSection, setSelectedSection] = useState("unit-of-meassurement");

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Left panel with menu items */}
      <div className="w-1/3 bg-white border-r flex flex-col">
        <div className="p-6">
          <div className="mb-2 bg-[#F8F8F8] ">
            <button
              className="w-full text-left px-4 py-3 font-semibold text-gray-500 flex items-center justify-between"
              onClick={() => setSelectedSection("unit-of-meassurement")}
            >
              Unit of Measurement
              <span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
          </div>
          <div className="mb-2 bg-[#F8F8F8] ">
            <button className="w-full text-left px-4 py-3 font-semibold text-gray-500 flex items-center justify-between"
            onClick={() => setSelectedSection("category-config")}>
              Category Configurations
              <span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
          </div>
          <div className="mb-2 bg-[#F8F8F8] ">
            <button className="w-full text-left px-4 py-3 font-semibold text-gray-500 flex items-center justify-between"
            onClick={() => setSelectedSection("branch-config")}>
              Branch Configurations
              <span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Right panel with conditional visibility */}
      <div className="flex-1">
        <div
          className={` ${
            selectedSection === "unit-of-meassurement"
              ? "visible"
              : "invisible"
          }`}
        >
          <UnitOfMeassurement /> 
        </div>
        <div
          className={` ${
            selectedSection === "category-config"
              ? "visible"
              : "invisible"
          }`}
        >
          <CategoryConfig />
        </div>
        <div
          className={` ${
            selectedSection === "branch-config"
              ? "visible"
              : "invisible"
          }`}
        >
          <BranchConfig />
        </div>
      </div>
    </div>
  );
}