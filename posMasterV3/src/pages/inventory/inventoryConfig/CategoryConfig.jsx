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
        // Update existing category
        response = await apiClient.put(`api/categories/${editingId}`, formData);
      } else {
        // Add new category
        response = await apiClient.post('api/categories/add', formData);
      }

      if (response.data.status === "success") {
        if (editingId) {
        toast.open(`${response.data.message}`, 4000, 'Category updated', 'success');
      } else {
        toast.open(`${response.data.message}`, 4000, 'New Category added', 'success');
      }
        fetchCategories(); // Refresh the list
        handleClear();
      } else {
        setError(response.data.message || "Operation failed");
        toast.open(`${response.data.message}`, 4000, 'Category request error', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "Network error, please try again";
      setError(errorMessage);
      toast.open(`${errorMessage}`, 4000, 'Category operation error', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent row click event
    
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

  return (
    <div className="flex-1 h-[calc(100vh-6rem)] bg-white flex justify-between flex-col px-8 py-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-400 mb-6">CATEGORY CONFIGURATION</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            name="brand"
            placeholder="Brand name"
            className="flex-1 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
            value={formData.brand}
            onChange={handleChange}
          />
          <input
            type="text"
            name="type"
            placeholder="Category type"
            className="flex-1 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
            value={formData.type}
            onChange={handleChange}
          />
          <button
            className="bg-gray-400 text-white px-3"
            onClick={handleClear}
            title="Clear"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            className={`${editingId ? 'bg-blue-600' : 'bg-green-600'} text-white px-3 py-2 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSubmit}
            title={editingId ? "Update" : "Add"}
            disabled={isPosting}
          >
            {isPosting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                {editingId ? "Updating..." : "Adding..."}
              </div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
        <div className="max-h-[40rem] overflow-y-scroll">
        <table className="w-full border-collapse bg-[#F8F8F8]">
          <thead>
            <tr className="text-left text-gray-500 font-semibold">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">BRAND</th>
              <th className="px-4 py-2">TYPE</th>
              <th className="px-4 py-2 w-16">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr 
                key={category.id} 
                className={`border-b border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 ${editingId === category.id ? 'bg-blue-50' : ''}`}
                onClick={() => handleRowClick(category)}
              >
                <td className="px-4 py-2">{category.id}</td>
                <td className="px-4 py-2">{category.brand}</td>
                <td className="px-4 py-2">{category.type}</td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
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
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export default CategoryConfig;