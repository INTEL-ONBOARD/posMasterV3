import React, { useState, useEffect, useContext } from "react";
import { apiClient } from "../../../api/client";
import ToastContext from "../../toasts/ToastService";

function BranchConfig() {
  const toast = useContext(ToastContext);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    inventory_name: "",
    inventory_location: "",
    inventory_contact: ""
  });
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('api/inventories/');
      if (response.data.status === 'success') {
        setBranches(response.data.data);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch branches');
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSubmit = async () => {
    if (!formData.inventory_name.trim() ||
      !formData.inventory_location.trim() ||
      !formData.inventory_contact.trim()) {
      setError("All fields are required");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      let response;
      if (editingId) {
        // Update existing branch
        response = await apiClient.put(`api/inventories/${editingId}`, formData);
      } else {
        // Add new branch
        response = await apiClient.post('api/inventories/add', formData);
      }

      if (response.data.status === "success") {
        if (editingId) {
          toast.open(`${response.data.message}`, 4000, 'Branch updated', 'success');
        } else {
          toast.open(`${response.data.message}`, 4000, 'New UOM added', 'success');
        }
        fetchBranches(); // Refresh the list
        handleClear();
      } else {
        setError(response.data.message || "Operation failed");
        toast.open(`${response.data.message}`, 4000, 'Branch request error', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.message ||
        "Network error, please try again";
      setError(errorMessage);
      toast.open(`${errorMessage}`, 4000, 'Branch operation error', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent row click event

    if (window.confirm("Are you sure you want to delete this branch?")) {
      try {
        const response = await apiClient.delete(`api/inventories/${id}`);
        if (response.data.status === "success") {
          setBranches(prev => prev.filter(branch => branch.id !== id));
          if (editingId === id) handleClear();
        }
      } catch (error) {
        setError(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleRowClick = (branch) => {
    setFormData({
      inventory_name: branch.inventory_name,
      inventory_location: branch.inventory_location,
      inventory_contact: branch.inventory_contact
    });
    setEditingId(branch.id);
  };

  const handleClear = () => {
    setFormData({
      inventory_name: "",
      inventory_location: "",
      inventory_contact: ""
    });
    setEditingId(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex-1 h-[calc(100vh-2rem)] bg-white flex justify-between flex-col px-8 py-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-400 mb-1">
          BRANCH CONFIGURATION
        </h2>
        <p className="text-sm font-bold text-gray-400 mb-4">
          Customize how the app works for you. Manage preferences such as
          notifications, themes, language, and other general behaviors to tailor
          the experience to your needs. Your settings are saved automatically
          and can be updated anytime.
        </p>
        
        {/* Search bar */}
        <div className="mb-4 flex items-center">
          <input
            type="text"
            placeholder="Search by ID, branch name, location or contact"
            className="flex-grow px-2 py-2 border-b border-gray-300 focus:outline-none focus:border-[#00489A]"
            value={formData.search || ""}
            onChange={e => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, search: value }));

              if (!value) {
                fetchBranches();
                return;
              }

              const filteredBranches = branches.filter(branch => 
                branch.inventory_name.toLowerCase().includes(value.toLowerCase()) ||
                branch.inventory_location.toLowerCase().includes(value.toLowerCase()) ||
                branch.inventory_contact.toLowerCase().includes(value.toLowerCase()) ||
                branch.id.toString().includes(value)
              );
              setBranches(filteredBranches);
            }}
          />
          <button
            className="bg-[#00489A] text-white px-6 py-2 ml-2 flex items-center gap-2 hover:bg-blue-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
              />
            </svg>
            Search
          </button>
        </div>



        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              name="inventory_name"
              placeholder="Branch name"
              className="flex-1 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
              value={formData.inventory_name}
              onChange={handleChange}
            />
            <input
              type="text"
              name="inventory_location"
              placeholder="Location"
              className="flex-1 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
              value={formData.inventory_location}
              onChange={handleChange}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              name="inventory_contact"
              placeholder="Contact number"
              className="flex-1 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
              value={formData.inventory_contact}
              onChange={handleChange}
            />
            <button
              className="bg-gray-400 text-white px-3 w-16"
              onClick={handleClear}
              title="Clear"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              className={`${editingId ? 'bg-blue-600' : 'bg-green-600'} text-white px-4 py-2 flex-1 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSubmit}
              disabled={isPosting}
            >
              {isPosting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingId ? "Updating..." : "Adding..."}
                </div>
              ) : editingId ? (
                "UPDATE BRANCH"
              ) : (
                "ADD NEW BRANCH"
              )}
            </button>
          </div>
        </div>
        <div className="max-h-[40rem] overflow-y-scroll">
          <table className="w-full border-collapse bg-[#F8F8F8] min-w-[600px]">
            <thead className="bg-gray-700 text-white sticky top-0 z-10">
              <tr className="text-left font-medium text-xs lg:text-sm">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">BRANCH NAME</th>
                <th className="px-4 py-2">LOCATION</th>
                <th className="px-4 py-2">CONTACT</th>
                <th className="px-4 py-2 w-16">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr
                  key={branch.id}
                  className={`border-b border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 ${editingId === branch.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleRowClick(branch)}
                >
                  <td className="px-4 py-2">{branch.id}</td>
                  <td className="px-4 py-2">{branch.inventory_name}</td>
                  <td className="px-4 py-2">{branch.inventory_location}</td>
                  <td className="px-4 py-2">{branch.inventory_contact}</td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => handleDelete(branch.id, e)}
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

export default BranchConfig;