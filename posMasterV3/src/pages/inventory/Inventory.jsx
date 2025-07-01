import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import InventorySidebar from "./Inventory_sidebar";
import InventoryCard from "../../frontend/components/Inventory_card";
import AddItemModal from "./AddItem_modal";
import Configurations from "./Configurations";
import bananaImg from "../../assets/Inventory_banana.png";
import SpinnerDot from "../../frontend/components/SpinnerDot";
import EditItemModal from "./EditItem_modal";
import ViewInventory from "./ViewInventory";

function Inventory() {
  const navigate = useNavigate();
  const location = useLocation();

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
      name: "Orange",
      barcode: "SKU-58394324",
      category: "Fruit",
      price: "390.00",
      unit: "KG",
      sku: "SKU003",
      stock: 60,
      image: bananaImg,
    },
    {
      id: "4",
      name: "Tomato",
      barcode: "SKU-34681324",
      category: "Vegetable",
      price: "120.00",
      unit: "KG",
      sku: "SKU004",
      stock: 150,
      image: bananaImg,
    },
    {
      id: "5",
      name: "Potato",
      barcode: "SKU-34681325",
      category: "Vegetable",
      price: "80.00",
      unit: "KG",
      sku: "SKU005",
      stock: 200,
      image: bananaImg,
    },
    {
      id: "6",
      name: "Milk",
      barcode: "SKU-34681326",
      category: "Dairy",
      price: "60.00",
      unit: "LTR",
      sku: "SKU006",
      stock: 50,
      image: bananaImg,
    },
    // Add more items as needed
  ]);

  // Get item ID from URL
  const getEditingItemId = () => {
    const pathParts = location.pathname.split("/");
    return pathParts[pathParts.length - 1];
  };

  const editingItem = inventoryItems.find(
    (item) => item.id === getEditingItemId()
  );

  const [activeSection, setActiveSection] = useState("inventory-list");
  // Show modal if route matches
  const isAddItemOpen = location.pathname.endsWith("/add-item");
  const isEditItemOpen = location.pathname.includes("/edit-item/");
  const isConfigOpen = location.pathname.endsWith("/config");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // or "list"

  const filteredItems = inventoryItems.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    // id here controls the blur thingyy
    <div id="inv-background" className="flex h-screen bg-[#EBEBEB] -ml-12">
      {/* <div id="inv-background"  className={`flex h-screen bg-red-400 p-24 ${ (isAddItemOpen || isConfigOpen) ? 'blur-md' : 'blur-none' }`}> */}
      {/* inventory sidebar */}

      <InventorySidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddItemClick={() => navigate("/dashboard/inventory/add-item")}
        onConfigClick={() => navigate("/dashboard/inventory/config")}
      />
      {/* main section */}
      <main className="flex-1 p-0 bg-[#F3F3F3] rounded-r-2xl">
        {/* Controls Bar */}
       {activeSection === "view-inventory" && (
  <div className="mb-4">
    <div className="flex flex-row items-center gap-4 bg-white border border-gray-200 rounded-lg px-6 py-4 shadow-sm">
      {/* Search */}
      <div className="relative flex items-center border border-gray-300 h-10 w-full max-w-4xl px-0 bg-white">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your item here"
          className="flex-1 bg-transparent border-none outline-none text-sm text-[#A7A7A7] placeholder-[#A7A7A7] h-full pl-4 pr-32"
        />
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 w-28 h-8 bg-[#1A318C] text-white text-sm font-semibold"
          style={{ minWidth: '90px' }}
        >
          Search
        </button>
      </div>
      {/* Category dropdown */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="bg-white border border-gray-300 rounded h-10 px-4 text-sm text-[#A7A7A7] min-w-[210px]"
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
        className="bg-white border border-gray-300 rounded h-10 px-4 text-sm text-[#A7A7A7] min-w-[210px]"
      >
        <option value="grid">View mode</option>
        <option value="grid">Grid</option>
        <option value="list">List</option>
      </select>
    </div>
  </div>
)}

        {viewMode === "grid" ? (
          <div className="grid pr-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onOpen={() =>
                  navigate(`/dashboard/inventory/edit-item/${item.id}`)
                }
                onRemove={
                  {
                    /* TODO */
                  }
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pr-20">
            {filteredItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onOpen={() =>
                  navigate(`/dashboard/inventory/edit-item/${item.id}`)
                }
                onRemove={
                  {
                    /* TODO */
                  }
                }
                viewMode="list"
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Loading Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-2">
        <div className="flex items-center gap-1 justify-start  ml-5">
          <SpinnerDot />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>

      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => navigate("/dashboard/inventory")}
        onSave={(item) => {
          // handle save logic here
          navigate("/dashboard/inventory");
        }}
      />

      <Configurations
        isOpen={isConfigOpen}
        onClose={() => navigate("/dashboard/inventory")}
        onSave={(units) => {
          // handle save logic here
          navigate("/dashboard/inventory");
        }}
      />

      <EditItemModal
        isOpen={isEditItemOpen}
        item={editingItem}
        onClose={() => navigate("/dashboard/inventory")}
        onUpdate={(updatedItem) => {
          setInventoryItems((prevItems) =>
            prevItems.map((item) =>
              item.id === updatedItem.id ? { ...item, ...updatedItem } : item
            )
          );
          navigate("/dashboard/inventory");
        }}
      />
    </div>
  );
}

export default Inventory;
