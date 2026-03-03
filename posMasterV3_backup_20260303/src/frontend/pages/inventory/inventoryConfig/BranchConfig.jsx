import React, { useState, useEffect, useContext, useMemo } from "react";
import { Search, X, Check, MapPin, Plus } from "lucide-react";
import { branchApi } from "../../../api/localApi";
import ToastContext from "../../toasts/ToastService";
import { useReactiveData, TABLES } from "../../../store";

function BranchConfig() {
  const toast = useContext(ToastContext);

  // Use reactive data hook for branches
  const { data: allBranches, refetch: refetchBranches } = useReactiveData(TABLES.BRANCHES);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Filter branches based on search using useMemo
  const branches = useMemo(() => {
    if (!allBranches || allBranches.length === 0) return [];
    if (!searchTerm) return allBranches;
    return allBranches.filter(branch =>
      (branch.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.id.toString().includes(searchTerm)
    );
  }, [searchTerm, allBranches]);

  const handleSubmit = async () => {
    if (!formData.name.trim() ||
      !formData.address.trim() ||
      !formData.contact.trim()) {
      setError("All fields are required");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      let response;
      if (editingId) {
        response = await branchApi.update(editingId, formData);
      } else {
        response = await branchApi.create(formData);
      }

      if (response.status === "success") {
        refetchBranches();
        handleClear();
        toast?.open(editingId ? "Branch updated successfully" : "Branch added successfully", 3000, 'Success', 'success');
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
      const response = await branchApi.delete(id);
      if (response.status === "success") {
        refetchBranches();
        if (editingId === id) handleClear();
        toast?.open("Branch deleted successfully", 3000, 'Success', 'success');
      }
    } catch (error) {
      setError(error.message || 'Delete failed');
    }
  };

  const handleRowClick = (branch) => {
    setFormData({
      name: branch.name,
      address: branch.address,
      contact: branch.contact
    });
    setEditingId(branch.id);
  };

  const handleClear = () => {
    setFormData({
      name: "",
      address: "",
      contact: ""
    });
    setEditingId(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex-1 h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#1A318C]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Branch Configuration</h2>
            <p className="text-sm text-gray-500">Manage store branches and locations</p>
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
                placeholder="Search by ID, branch name, location or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
              />
            </div>
            <button className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </button>
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              name="name"
              placeholder="Branch name"
              value={formData.name}
              onChange={handleChange}
              className="h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
            />
            <input
              type="text"
              name="address"
              placeholder="Location"
              value={formData.address}
              onChange={handleChange}
              className="h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              name="contact"
              placeholder="Contact number"
              value={formData.contact}
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
              className="h-12 px-6 bg-[#1A318C] text-white rounded-xl font-medium hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPosting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {editingId ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? "Update Branch" : "Add New Branch"}
                </>
              )}
            </button>
          </div>
          {editingId && (
            <p className="text-xs text-[#1A318C] mt-2 font-medium">Editing branch ID: {editingId} - Click row to edit or clear to cancel</p>
          )}
        </div>

        {/* Branches Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1A318C] to-[#2a4ab8]">
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-20">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                        <MapPin className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No branches found</p>
                      <p className="text-gray-400 text-sm">Add a new branch to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr
                    key={branch.id}
                    onClick={() => handleRowClick(branch)}
                    className={`cursor-pointer transition-colors ${editingId === branch.id ? 'bg-[#1A318C]/5 ring-2 ring-inset ring-[#1A318C]' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">{branch.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{branch.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{branch.address}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{branch.contact}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDelete(branch.id, e)}
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

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {branches.length} of {(allBranches || []).length} branches
        </div>
      </div>
    </div>
  );
}

export default BranchConfig;
