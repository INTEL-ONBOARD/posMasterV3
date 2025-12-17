import React from "react";

const FilterSidebar = ({
    selectedCategory,
    selectedStock,
    selectedPopularity,
    selectedOrder,
    onCategoryChange,
    onStockChange,
    onPopularityChange,
    onOrderChange,
}) => {
    return (
        <div className="bg-[#EBEBEB] border-r border-gray-200 p-0 w-64 h-screen">
            {/* Search Filters */}

            <div className="bg-white p-5 shadow-sm mb-1">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-black">Search filters</h3>
                    <svg
                        className="w-4 h-4 text-black"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M5.25 7.75L10 12.5l4.75-4.75-1.06-1.06L10 10.38 6.31 6.69 5.25 7.75z" />
                    </svg>
                </div>

                <hr className="my-4 border-gray-300" />

                <div className="space-y-4">
                    {/* Category */}
                    <select
                        value={selectedCategory}
                        onChange={onCategoryChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Category</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Dairy">Dairy</option>
                    </select>

                    {/* Stock Availability */}
                    <select
                        value={selectedStock}
                        onChange={onStockChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Stock Availability</option>
                        <option value="Available">Available</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </select>

                    {/* Popularity */}
                    <select
                        value={selectedPopularity}
                        onChange={onPopularityChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Popularity</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            {/* Order By */}
            <div className="bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-black">Order by</h3>
                    <svg
                        className="w-4 h-4 text-black"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M5.25 7.75L10 12.5l4.75-4.75-1.06-1.06L10 10.38 6.31 6.69 5.25 7.75z" />
                    </svg>
                </div>
                <hr className="my-4 border-gray-300" />

                <select
                    value={selectedOrder}
                    onChange={onOrderChange}
                    className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Default</option>
                    <option value="PriceLowHigh">Price: Low to High</option>
                    <option value="PriceHighLow">Price: High to Low</option>
                    <option value="Newest">Newest</option>
                </select>
            </div>
        </div>
    );
};

export default FilterSidebar;
