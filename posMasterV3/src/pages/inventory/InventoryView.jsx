import React, { useState, useEffect } from "react";
import InventorySidebar from "./Inventory_sidebar";
import ItemCard from "../../components/ItemCard.jsx";
import SpinnerDot from "../../frontend/components/SpinnerDot";
import bananaImg from "../../assets/Inventory_banana.png";
import NotFound from "../../assets/nonicons_not-found-16.png";
import { apiClient } from "../../api/client.jsx";

function InventoryView() {
  const [inventoryItems, setInventoryItems] = useState([
        // {
        //     _id: '688136391a56f324f917f98f',
        //     id: 29,
        //     stock_trace: [1],
        //     item_name: 'dsds1',
        //     item_image_url: null,
        //     batch_code: '2424DS4521',
        //     sku: '2424',
        //     quantity: 11,
        //     threshold_limit: 11,
        //     maximum_capacity: 111,
        //     uom_id: 21,
        //     category_id: 45,
        //     inventory_id: 1,
        //     unit_price: 111,
        //     stock_update_datetime: '2025-07-23T19:21:29.406Z',
        //     stock_created_datetime: '2025-07-23T19:21:29.406Z',
        //     __v: 0,
        //     uom: {
        //         _id: '687720a0798018e08515999c',
        //         id: 21,
        //         symbol: 'mL',
        //         unit_name: 'Milliliter',
        //         __v: 0
        //     },
        //     category: {
        //         _id: '687740d91edd62f9c8128bd0',
        //         id: 45,
        //         brand: 'Axe',
        //         type: 'Deodorants',
        //         __v: 0
        //     },
        //     inventory: null
        // },
        {
            _id: '688452ef1ddc1d25637c9a47',
            id: 31,
            stock_trace: [1],
            item_name: 'Water Bottle',
            item_image_url: null,
            batch_code: 'SKU2263WA901',
            sku: 'SKU2263',
            quantity: 50,
            threshold_limit: 120,
            maximum_capacity: 400,
            uom_id: 22,
            category_id: 90,
            inventory_id: 1,
            unit_price: 25.5,
            stock_update_datetime: '2025-07-26T04:00:47.273Z',
            stock_created_datetime: '2025-07-26T04:00:47.273Z',
            __v: 0,
            uom: {
                _id: '687720ad798018e0851599a0',
                id: 22,
                symbol: 'pcs',
                unit_name: 'Piece',
                __v: 0
            },
            category: {
                _id: '68775a921edd62f9c8128e0d',
                id: 90,
                brand: 'Reebok',
                type: 'Sportswear',
                __v: 0
            },
            inventory: null
        },
        {
            _id: '68845a0b8767fec474faa590',
            id: 32,
            stock_trace: [1],
            item_name: 'Mobile Data cable',
            item_image_url: null,
            batch_code: 'SKU-32452DA15822',
            sku: 'SKU-32452',
            quantity: 54,
            threshold_limit: 40,
            maximum_capacity: 60,
            uom_id: 22,
            category_id: 158,
            inventory_id: 1,
            unit_price: 155,
            stock_update_datetime: '2025-07-26T04:31:07.861Z',
            stock_created_datetime: '2025-07-26T04:31:07.861Z',
            __v: 0,
            uom: {
                _id: '687720ad798018e0851599a0',
                id: 22,
                symbol: 'pcs',
                unit_name: 'Piece',
                __v: 0
            },
            category: {
                _id: '687765bb1edd62f9c8129017',
                id: 158,
                brand: 'Hp',
                type: 'Computers',
                __v: 0
            },
            inventory: null
        }
    ]
);

  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/items/extended");
      if (response.data.status === "success") {
            setInventoryItems(response.data.data);
      }
      } catch (error) {
          console.error("Error fetching items:", error);
      } finally {
          setIsLoading(false);
      }
    };
    // Fetch items from API
    useEffect(() => {
      // Fetch items after UOMs are loaded to properly map uomName
      // if (!loadingUoms) {
        fetchItems();
      // }
    //}, [loadingUoms]);
    }, []);

  // //if more control over categories needed later, use this State for category/brand mapping
//   const [itemCategories, setItemCategories] = useState([
//     { id: 145, brand: "Close-Up",   type: "Oral Care" },
//     { id:  94, brand: "Clogard",    type: "Oral Care" },
//     { id:  15, brand: "Colgate",    type: "Oral Care" },
//     { id:  26, brand: "Pepsi",      type: "Beverages" },
//     { id:   7, brand: "Coca-Cola",  type: "Beverages" },
//   ]);

  //category dropdown population(search and item form)
  const [uniqueCategoryTypes, setUniqueCategoryTypes] = useState([]);
    // Fetch Categories from API and create mapping
    useEffect(() => {
      const fetchCategories = async () => {
        setIsSearching(true);
        try {
          const response = await apiClient.get("api/categories");
          if (response.data.status === "success") {
            //setItemCategories(response.data.data);
            const types = Array.from(new Set(response.data.data.map(c => c.type)));
            setUniqueCategoryTypes(types);
          }
        } catch (error) {
          console.error("Error fetching categories:", error);
        } finally {
          //setLoadingCategories(false); //if more control over categories needed later, use this
          setIsSearching(false);
        }
      };
  
      fetchCategories();
    }, []);
    
    //if more control over categories needed later, use this
    //   useEffect(() => {
    //     const types = Array.from(new Set(itemCategories.map(c => c.type)));
    //     setUniqueCategoryTypes(types);
    //   }, [itemCategories]);

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
      (searchCategory === "All" || item.category.type === searchCategory) &&
      item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
        <div className="">
          <nav className="w-full flex justify-between py-4 px-10 bg-white gap-6 mb-4 ">
            <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search Your Items here"
                className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="flex items-center px-4 py-2 bg-[#1A318C] text-white"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
                Search
              </button>
            </div>


            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-80 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
            >
              <option value="All">All Categories</option>
                {uniqueCategoryTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                  </option>
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
          <div className="h-[calc(100vh-13rem)] overflow-y-scroll bg-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
              {isSearching ? (
                <div className="col-span-full flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center mt-32">
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
                  <ItemCard
                    key={item.id}
                    item={item}
                  />
                ))
              )}
            </div>
          </div>
        </div>
  )
}

export default InventoryView