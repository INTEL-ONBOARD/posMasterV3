import React, { useState, useEffect } from "react";
import ItemCard from "../../components/ItemCard.jsx";
import NotFoundImg from "../../assets/nonicons_not-found-16.png";
import { apiClient } from "../../api/client.jsx";
import {ChevronDown, ChevronUp } from "lucide-react";
import { transformStockData } from "../../util/common/blockConverter.jsx";

function InventoryView({ isActive }) {
  const [inventoryItems, setInventoryItems] = useState([]);

  const fetchItems = async () => {
    try {
      const response = await apiClient.get("api/restocks/stock-items");
      if (response.data.status === "success") {
            const transformed = transformStockData(response.data);
            //convert default response object to get each detailed stock items(detach stock item object and create a new obj with parent attributes)
            setInventoryItems(transformed);
      }
      } catch (error) {
          console.error("Error fetching items:", error);
      } finally {
          //setIsLoading(false);
      }
    };
    // Fetch items from API
    useEffect(() => {
      if (isActive) {
          fetchItems();
      }
     }, [isActive]);


  //category dropdown population(search and item form)
  const [uniqueCategoryTypes, setUniqueCategoryTypes] = useState([]);
    // Fetch Categories from API and create mapping
    useEffect(() => {
      if (isActive) {
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
      }
     }, [isActive]);

  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [isSearching, setIsSearching] = useState(false);
  const [searchAvailability, setSearchAvailability] = useState("All");

  // search handler to set loading state:
  const handleSearch = (e) => {
    setIsSearching(true);
    setSearch(e.target.value);
    // Simulate async search (replace with your real async logic if needed)
    setTimeout(() => {
      setIsSearching(false);
    }, 600); // 600ms delay for demo
  };

  //helper method for item availability filtering
  const interpretAvailability = (item) => {
    // handle boolean, string, numeric types defensively
    const a = item?.availability;
    if (typeof a === "boolean") return a;
    if (typeof a === "string") return a.toLowerCase() === "true";
    return Boolean(a); // numbers (1/0) or other truthy/falsy
  };

  // Filter items based on search item name, batch code, category and availability
  const filteredItems = inventoryItems.filter((item) => {
    // Category match: either "All" or item.category.type equals selected
    const matchesCategory =
      searchCategory === "All" ||
      (item?.category && item.category.type === searchCategory);

    // Availability match: "All", Available (true), Unavailable (false)
    const isAvailable = interpretAvailability(item);
    const matchesAvailability =
      searchAvailability === "All" ||
      (searchAvailability === "Available" && isAvailable) ||
      (searchAvailability === "Unavailable" && !isAvailable);

    // Item name or batch code text search match
    const searchTerm = (search || "").toLowerCase();
    const matchesSearch =
      (item?.item_name || "").toLowerCase().includes(searchTerm) ||
      (item?.batch_code || "").toLowerCase().includes(searchTerm) ||
      (item?.sku || "").toLowerCase().includes(searchTerm);

    return matchesCategory && matchesAvailability && matchesSearch;
  });

  //right filter section controls
  const [openFilter, setOpenFilter] = useState(true);
  const [openOrderBy, setOpenOrderBy] = useState(true);

  return (

    <div className="flex bg-black w-full h-[calc(100vh-2rem)] relative">
      {/* item list section (right) */}
      <div className="bg-white w-[calc(85rem)] h-[calc(100vh-2rem)] overflow-y-scroll p-4">
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
                    src={NotFoundImg}
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
        </div>

      {/* filter section (right) */}
      <div className="bg-[#EBEBEB] w-[calc(20rem)] h-[calc(100vh-2rem)] p-1">
        <div className="flex flex-col h-[calc(100vh-2rem)] gap-2">
          {/* top block set */}
          <div>
          {/* ▼ search filters block ▼ */}
          <div className="bg-white">
            <button
              onClick={() => setOpenFilter(!openFilter)}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">SEARCH FILTERS</span>
              {openFilter ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openFilter && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Category
                      </label>
                      <select
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
                      >
                        <option value="All">All Categories</option>
                          {uniqueCategoryTypes.map(type => (
                              <option key={type} value={type}>
                                {type}
                            </option>
                            ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Stock Availability
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Available</option>
                        <option value="">Unavailable</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Popularity
                      </label>
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Default</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>
                </div>
              </div>
            )}
          </div>

          {/* ▼ order by block ▼ */}
          <div className="bg-white">
            <button
              onClick={() => setOpenOrderBy(!openOrderBy)}
              className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
            >
              <span className="text-gray-400">ORDER BY</span>
              {openOrderBy ? <ChevronUp /> : <ChevronDown />}
            </button>
            {openOrderBy && (
              <div className="px-4 bg-white pb-5">
                {/* detailed description block */}
                <div className="">
                    <div>
                      {/* <label className="block text-sm font-medium text-gray-400 mb-1">
                        Suppier
                      </label> */}
                      <select
                        name="uom"
                        // value={formUOMData ?? ""}               // show the selected id
                        // onChange={handleUOMChange}              // hook up your new handler
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Default</option>
                        {/* {uoms.map(uom => (
                          <option key={uom.id} value={uom.id}>
                            {uom.unit_name} ({uom.symbol})
                          </option>
                        ))} */}
                      </select>
                    </div>

                </div>
              </div>
            )}
          </div>
          </div>
          {/* empty bottom block */}
          <div className="bg-white h-full"></div>
        </div>
      </div>
        </div>
  )
}

export default InventoryView