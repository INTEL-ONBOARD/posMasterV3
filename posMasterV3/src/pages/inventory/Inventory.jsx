import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InventorySidebar from "./Inventory_sidebar";
import InventoryCard from "../../frontend/components/Inventory_card";
import SpinnerDot from "../../frontend/components/SpinnerDot";
import bananaImg from "../../assets/Inventory_banana.png";
import AddItem from "./AddItem";

function Inventory() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("view-inventory");

  // Example inventory data
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: "1",
      name: "Banana",
      barcode: "SKU-37847324",
      category: "Fruit",
      price: "340.00",
      unit: "KG",
      sku: "SKU001",
      stock: 100,
      image: bananaImg,
    },
    {
      id: "2",
      name: "Apple",
      barcode: "SKU-5837324",
      category: "Fruit",
      price: "420.00",
      unit: "KG",
      sku: "SKU002",
      stock: 80,
      image: bananaImg,
    },
    {
      id: "3",
      name: "Carrot",
      barcode: "SKU-58394324",
      category: "Vegetable",
      price: "150.00",
      unit: "KG",
      sku: "SKU003",
      stock: 60,
      image: bananaImg,
    },
    {
      id: "4",
      name: "Milk",
      barcode: "SKU-34681324",
      category: "Dairy",
      price: "200.00",
      unit: "LTR",
      sku: "SKU004",
      stock: 50,
      image: bananaImg,
    },
    {
      id: "5",
      name: "Bread",
      barcode: "SKU-34681325",
      category: "Bakery",
      price: "100.00",
      unit: "PCS",
      sku: "SKU005",
      stock: 120,
      image: bananaImg,
    },
    {
      id: "6",
      name: "Eggs",
      barcode: "SKU-34681326",
      category: "Poultry",
      price: "20.00",
      unit: "PCS",
      sku: "SKU006",
      stock: 200,
      image: bananaImg,
    },
    {
      id: "7",
      name: "Orange Juice",
      barcode: "SKU-34681327",
      category: "Beverage",
      price: "250.00",
      unit: "LTR",
      sku: "SKU007",
      stock: 40,
      image: bananaImg,
    },
    {
      id: "8",
      name: "Chicken Breast",
      barcode: "SKU-34681328",
      category: "Meat",
      price: "600.00",
      unit: "KG",
      sku: "SKU008",
      stock: 30,
      image: bananaImg,
    },
    {
      id: "9",
      name: "Cheese",
      barcode: "SKU-34681329",
      category: "Dairy",
      price: "500.00",
      unit: "KG",
      sku: "SKU009",
      stock: 25,
      image: bananaImg,
    },
  ]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // or "list"

  const filteredItems = inventoryItems.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div id="inv-background" className="flex h-screen bg-[#EBEBEB] -ml-12">
      {/* sidebar (left) */}
      <InventorySidebar
        activeSection={activeSection}
        onViewInvClick={() => setActiveSection("view-inventory")}
        onAddItemClick={() => setActiveSection("add-item")}
        onConfigClick={() => setActiveSection("inventory-config")}
        onCReportClick={() => setActiveSection("inventory-report")}
      />

      <main className="flex-1 bg-[#F3F3F3] ">
        {/* Conditional Rendering */}
        {activeSection === "view-inventory" && (
          <>
            {/* Search panel */}
            <nav className="w-full flex flex-row justify-between py-4 px-10 bg-white gap-6 mb-4">
              {/* search textbox and search button */}
              <div className="w-full flex flex-row justify-between border border-t-transparent border-l-transparent border-r-transparent pb-1 border-b-[#EDEDED] h-12">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your item here..."
                  className="px-3 py-2 w-full bg-white border border-transparent focus:outline-none focus:ring-0 focus:border-transparent"
                />
                <button className="px-10 py-2 bg-[#1A318C] text-white hover:bg-[#1A318C] transition-colors">
                  Search
                </button>
              </div>
              {/* Category dropdown */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-80 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-0 focus:border-transparent text-sm"
              >
                <option value="All">Category</option>
                {[...new Set(inventoryItems.map((item) => item.category))].map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  )
                )}
              </select>
              {/* View Mode dropdown */}
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-80 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-0 focus:border-transparent text-sm"
              >
                <option value="grid">View mode</option>
                <option value="grid">Grid</option>
                <option value="list">List</option>
              </select>
            </nav>
            {/* item list */}
            <div className="grid pr-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onOpen={() =>
                    navigate(`/dashboard/inventory/edit-item/${item.id}`)
                  }
                />
              ))}
            </div>
          </>
        )}

        {activeSection === "add-item" && (
          <div>
            <AddItem />
          </div>
        )}

        {activeSection === "inventory-config" && <div>this is config</div>}

        {activeSection === "inventory-report" && <div>this is inv report</div>}
      </main>

      {/* Loading Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-2">
        <div className="flex items-center gap-1 justify-start ml-5">
          <SpinnerDot />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default Inventory;
