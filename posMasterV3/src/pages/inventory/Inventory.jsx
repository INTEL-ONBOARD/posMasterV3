import React, { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InventorySidebar from "./Inventory_sidebar";
import InventoryCard from "../../frontend/components/Inventory_card";
import SpinnerDot from "../../frontend/components/SpinnerDot";
import bananaImg from "../../assets/Inventory_banana.png";
import AddItem from "./AddItem.jsx";
import NotFound from "../../assets/nonicons_not-found-16.png";
import InventoryConfig from "./InventoryConfig";
import InventoryReport from "./InventoryReport"; 
import { useOutletContext } from "react-router-dom";

function Inventory() {
  const navigate = useNavigate();
  const { setActiveSection } = useOutletContext();

  const [activeSection, setLocalActiveSection] = useState("view-inventory");

  // Update parent's activeSection whenever local activeSection changess
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

   const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
  };

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
    {
      id: "10",
      name: "Parata",
      barcode: "SKU-34681329",
      category: "Dairy",
      price: "500.00",
      unit: "KG",
      sku: "SKU009",
      stock: 25,
      image: bananaImg,
    },
    {
      id: "11",
      name: "Noodles",
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
  const [searchCategory, setSearchCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // or "list"
  const [isSearching, setIsSearching] = useState(false);

  // search handler to set loading state:
  const handleSearch = (e) => {
    setIsSearching(true);
    setSearch(e.target.value);
    // Simulate async search (replace with your real async logic if needed)
    setTimeout(() => {
      setIsSearching(false);
    }, 600); // 600ms delay for demo
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      (searchCategory === "All" || item.category === searchCategory) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );
 

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
      

      <main className="flex-1 bg-[#F3F3F3] relative">
        
        {/* View Inventory */}
        <div className={isVisible("view-inventory")}>
          <nav className="w-full flex justify-between py-4 px-10 bg-white gap-6 mb-4">
            <div className="flex-1 flex border-b border-[#EDEDED] h-12">
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search your item here..."
                className="flex-1 px-3 py-2 bg-white focus:outline-none"
              />
              <button className="px-10 py-2 bg-[#1A318C] text-white">
                Search
              </button>
            </div>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
            >
              <option value="All">Category</option>
              {[...new Set(inventoryItems.map((i) => i.category))].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
            >
              <option value="grid">View mode</option>
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </nav>
          <div className="h-[45rem] overflow-y-scroll bg-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
              {isSearching ? (
                <div className="col-span-full flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
                  <div className="flex flex-col items-center">
                    {/* Custom spinner */}
                    <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                    <span className="text-gray-700 text-xl mt-1">Please wait...</span>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-500 text-lg" style={{ minHeight: "50vh" }}>
                  <img
                    src={NotFound}
                    alt="No items found!"
                    className="w-12 h-12 mb-2 opacity-70"
                  />
                  <span>No items found!</span>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onOpen={() =>
                      navigate(`/dashboard/inventory/edit-item/${item.id}`)
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Item */}
        <div className={isVisible("add-item")}>
          <AddItem />
        </div>

        {/* Inventory Config */}
        <div className={isVisible("inventory-config") + " p-6"}>
          <InventoryConfig />
          {/* …your config UI here… */}
        </div>

        {/* Inventory Report */}
        <div className={isVisible("inventory-report") + " p-6"}>
          <InventoryReport inventoryItems={inventoryItems} />
          {/* …your report UI here… */}
        </div>
      </main>


    </div>
  );
}

export default Inventory;