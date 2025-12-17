import React, { useState, useEffect, useContext } from "react";
import { apiClient } from "../../../api/client";
import ToastContext from "../../toasts/ToastService";

function CategoryConfig() {
  const toast = useContext(ToastContext);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    brand: "",
    type: ""
  });
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Search functionality - imported from AddItem
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCategory, setSearchCategory] = useState("All");

  //to populate brand table by a selected category
  const [selectedCategroy, setSelectedCategroy] = useState();
  const [selectedBrands, setSelectedBrands] = useState([]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('api/categories/');
      if (response.data.status === 'success') {
        setCategories(response.data.data);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Search handler - imported from AddItem
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 600);
  };

  // Category search handler
  const handleSearchCategoryChange = (e) => {
    setSearchCategory(e.target.value);
  };

  // Filter categories based on search and category type
  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.brand.toLowerCase().includes(search.toLowerCase()) ||
      category.type.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = searchCategory === "All" || category.type === searchCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique category types for dropdown
  const uniqueCategoryTypes = [...new Set(categories.map(cat => cat.type))];

  const handleSubmit = async () => {
    if (!formData.brand.trim() || !formData.type.trim()) {
      setError("Both brand and type are required");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      let response;
      if (editingId) {
        response = await apiClient.put(`api/categories/${editingId}`, formData);
      } else {
        response = await apiClient.post('api/categories/add', formData);
      }

      if (response.data.status === "success") {
        if (editingId) {

        } else {

        }
        fetchCategories();
        handleClear();
      } else {
        setError(response.data.message || "Operation failed");

      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.message ||
        "Network error, please try again";
      setError(errorMessage);

    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();

    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        const response = await apiClient.delete(`api/categories/${id}`);
        if (response.data.status === "success") {

          setCategories(prev => prev.filter(cat => cat.id !== id));
          if (editingId === id) handleClear();
        }
      } catch (error) {
        setError(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleRowClick = (category) => {
    setFormData({
      brand: category.brand,
      type: category.type
    });
    setEditingId(category.id);
  };

  const handleClear = () => {
    setFormData({ brand: "", type: "" });
    setEditingId(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // GROUP BY type → count brands per type
  const summary = categories.reduce((acc, { type }) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const summaryRows = Object.entries(summary).map(([type, count], i) => ({
    idx: i + 1,
    type,
    count,
  }));

  return (
    <div className="flex-1 h-[calc(100vh-2rem)] bg-white flex flex-col px-8 py-8 overflow-hidden">
  <div className="flex flex-col h-full">
    <h2 className="text-2xl font-bold text-gray-400 mb-1">
          BRANCH CONFIGURATION
        </h2>
        <p className="text-sm font-bold text-gray-400 mb-7">
          Customize how the app works for you. Manage preferences such as
          notifications, themes, language, and other general behaviors to tailor
          the experience to your needs. Your settings are saved automatically
          and can be updated anytime.
        </p>

    {error && (
      <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-center">
        {error}
      </div>
    )}

    {/* Search Panel */}
    <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
      {/* Search box */}
      <div className="flex w-full lg:w-2/3 items-center border-b-2 border-gray-400">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search categories and brands..."
          className="flex-1 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-6 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors">
          Search
        </button>
      </div>

      {/* Category filter */}
      <select
        value={searchCategory}
        onChange={handleSearchCategoryChange}
        className="w-full lg:w-1/3 h-10 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="All">All Categories</option>
        {uniqueCategoryTypes.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </div>

    {/* Add / Edit Form */}
    <div className="flex flex-wrap gap-2 mb-6 items-center">
      <input
        type="text"
        name="brand"
        placeholder="Brand name"
        className="flex-1 min-w-[200px] border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
        value={formData.brand}
        onChange={handleChange}
      />
      <input
        type="text"
        name="type"
        placeholder="Category type"
        className="flex-1 min-w-[200px] border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
        value={formData.type}
        onChange={handleChange}
      />
      <div className="flex gap-2">
        <button
          className="bg-gray-400 text-white px-3 py-2 rounded"
          onClick={handleClear}
          title="Clear"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          className={`${editingId ? 'bg-blue-600' : 'bg-green-600'} text-white px-4 py-2 rounded ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleSubmit}
          title={editingId ? "Update" : "Add"}
          disabled={isPosting}
        >
          {isPosting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {editingId ? "Updating..." : "Adding..."}
            </div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>

    {/* Categories Table */}
    <div className="flex-1 overflow-y-auto mb-6">
      <table className="w-full border-collapse bg-[#F8F8F8] min-w-[600px] rounded shadow-sm">
        <thead className="bg-gray-700 text-white sticky top-0 z-10">
          <tr className="text-left font-medium text-sm">
            <th className="px-4 py-2 w-12">ID</th>
            <th className="px-4 py-2">CATEGORY</th>
            <th className="px-4 py-2">BRAND</th>
            <th className="px-4 py-2 w-16">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {searchLoading ? (
            <tr>
              <td colSpan="4" className="text-center py-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-8 w-8 mb-3"></div>
                  <span className="text-gray-700">Searching...</span>
                </div>
              </td>
            </tr>
          ) : filteredCategories.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-8 text-gray-500">
                {search ? 'No categories found matching your search.' : 'No categories available.'}
              </td>
            </tr>
          ) : (
            filteredCategories.map((category) => (
              <tr
                key={category.id}
                className={`border-b border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 ${editingId === category.id ? 'bg-blue-50' : ''}`}
                onClick={() => handleRowClick(category)}
              >
                <td className="px-4 py-2">{category.id}</td>
                <td className="px-4 py-2">{category.type}</td>
                <td className="px-4 py-2">{category.brand}</td>
                <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => handleDelete(category.id, e)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Summary Table */}
    <div className="flex-1 overflow-y-auto">
      <table className="w-full border-collapse bg-[#F8F8F8] min-w-[500px] rounded shadow-sm">
        <thead className="bg-gray-700 text-white sticky top-0 z-10">
          <tr className="text-left font-medium text-sm">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">CATEGORY NAME</th>
            <th className="px-4 py-2">Num. OF BRANDS</th>
          </tr>
        </thead>
        <tbody>
          {summaryRows.map(({ idx, type, count }) => (
            <tr key={type} className="border-b hover:bg-gray-100">
              <td className="px-4 py-2">{idx}</td>
              <td className="px-4 py-2">{type}</td>
              <td className="px-4 py-2">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>

  );
}

export default CategoryConfig;