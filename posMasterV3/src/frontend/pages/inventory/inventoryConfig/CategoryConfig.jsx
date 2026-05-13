import React, { useState } from "react";
import { Search, X, Check, Tag, ChevronDown, RefreshCw } from "lucide-react";
import { categoryApi } from "../../../api/localApi";
import { useReactiveData, TABLES } from "../../../store";
import StatusModal from "../../../components/StatusModal.jsx";

function CategoryConfig() {
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });

  // Use reactive data hook - automatically updates when categories change
  const { data: categories, loading: isLoading } = useReactiveData(TABLES.CATEGORIES);

  const [formData, setFormData] = useState({
    brand: "",
    type: ""
  });
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Search functionality
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");

  // Search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Category search handler
  const handleSearchCategoryChange = (e) => {
    setSearchCategory(e.target.value);
  };

  // Filter categories based on search and category type
  const filteredCategories = (categories || []).filter((category) => {
    const matchesSearch = category.brand.toLowerCase().includes(search.toLowerCase()) ||
      category.type.toLowerCase().includes(search.toLowerCase()) ||
      String(category.id).includes(search);
    const matchesCategory = searchCategory === "All" || category.type === searchCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique category types for dropdown
  const uniqueCategoryTypes = [...new Set((categories || []).map(cat => cat.type))];

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
        response = await categoryApi.update(editingId, formData);
      } else {
        response = await categoryApi.create(formData);
      }

      if (response.status === "success") {
        // Data will auto-refresh via reactive hook - no need to manually fetch
        handleClear();
        setStatusModal({ open: true, type: 'success', description: editingId ? "Category updated successfully" : "Category added successfully" });
      } else {
        setError(response.message || "Operation failed");
      }
    } catch (error) {
      const errorMessage = error.message || "Network error, please try again";
      setError(errorMessage);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();

    try {
      const response = await categoryApi.delete(id);
      if (response.status === "success") {
        // Data will auto-refresh via reactive hook - no need to manually update state
        if (editingId === id) handleClear();
        setStatusModal({ open: true, type: 'success', description: "Category deleted successfully" });
      }
    } catch (error) {
      setError(error.message || 'Delete failed');
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
  const summary = (categories || []).reduce((acc, { type }) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const summaryRows = Object.entries(summary).map(([type, count], i) => ({
    idx: i + 1,
    type,
    count,
  }));

  return (
    <div className="flex-1 h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Tag className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Category Configuration</h2>
            <p className="text-sm text-gray-500">Manage product categories and brands</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search categories and brands..."
                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
              />
            </div>
            <button className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </button>
            <div className="relative">
              <select
                value={searchCategory}
                onChange={handleSearchCategoryChange}
                className="h-12 pl-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="All">All Categories</option>
                {uniqueCategoryTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              name="brand"
              placeholder="Brand name"
              value={formData.brand}
              onChange={handleChange}
              className="flex-1 h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
            />
            <input
              type="text"
              name="type"
              placeholder="Category type"
              value={formData.type}
              onChange={handleChange}
              className="flex-1 h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
            />
            <button
              onClick={handleClear}
              className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
              title="Clear"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPosting}
              className={`h-12 w-12 ${editingId ? 'bg-[#1A318C]' : 'bg-emerald-600'} text-white rounded-xl font-medium ${editingId ? 'hover:bg-[#152870]' : 'hover:bg-emerald-700'} transition-all duration-200 shadow-md ${editingId ? 'shadow-blue-900/20' : 'shadow-emerald-900/20'} flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
              title={editingId ? "Update" : "Add"}
            >
              {isPosting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Check className="w-5 h-5" />
              )}
            </button>
          </div>
          {editingId && (
            <p className="text-xs text-[#1A318C] mt-2 font-medium">Editing category ID: {editingId} - Click row to edit or clear to cancel</p>
          )}
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
          <div className="max-h-[300px] overflow-y-auto rounded-xl">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-20 bg-[#1A318C]">ID</th>
                  <th className="sticky top-0 z-10 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider bg-[#1A318C]">Category</th>
                  <th className="sticky top-0 z-10 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider bg-[#1A318C]">Brand</th>
                  <th className="sticky top-0 z-10 px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-20 bg-[#1A318C]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full border-4 border-gray-200 border-t-[#1A318C] h-10 w-10 mb-3"></div>
                      <span className="text-gray-500">Searching...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                        <Tag className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No categories found</p>
                      <p className="text-gray-400 text-sm">{search ? 'Try adjusting your search' : 'Add a new category to get started'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    onClick={() => handleRowClick(category)}
                    className={`cursor-pointer transition-colors ${editingId === category.id ? 'bg-[#1A318C]/5 ring-2 ring-inset ring-[#1A318C]' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">{category.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{category.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{category.brand}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDelete(category.id, e)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors group mx-auto"
                      >
                        <X className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="max-h-[300px] overflow-y-auto rounded-xl">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-20 bg-gray-700">#</th>
                  <th className="sticky top-0 z-10 px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider bg-gray-700">Category Name</th>
                  <th className="sticky top-0 z-10 px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider bg-gray-700">Num. of Brands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {summaryRows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                    No category summary available
                  </td>
                </tr>
              ) : (
                summaryRows.map(({ idx, type, count }) => (
                  <tr key={type} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-600">{idx}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-800">{type}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-3 py-1 bg-[#1A318C]/10 text-[#1A318C] rounded-full text-sm font-semibold">{count}</span>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredCategories.length} of {(categories || []).length} categories
        </div>
      </div>

      <StatusModal
        isOpen={statusModal.open}
        closeModal={() => setStatusModal({ open: false, type: null, description: "" })}
        type={statusModal.type}
        description={statusModal.description}
        context="inventory"
      />
    </div>
  );
}

export default CategoryConfig;
