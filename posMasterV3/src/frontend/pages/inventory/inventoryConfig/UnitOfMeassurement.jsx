import React, { useState, useEffect, useContext } from "react";
import { Search, Plus, X, Check, Ruler, Trash2 } from "lucide-react";
import { uomApi } from "../../../api/localApi";
import ToastContext from "../../toasts/ToastService";

function UnitOfMeassurement() {
  const toast = useContext(ToastContext);
  const [units, setUnits] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [formData, setFormData] = useState({
    unit_name: "",
    symbol: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchUoms = async () => {
    try {
      const response = await uomApi.getAll();
      if (response.status === 'success') {
        setUnits(response.data || []);
        setAllUnits(response.data || []);
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch units');
    }
  };

  useEffect(() => {
    fetchUoms();
  }, []);

  // Filter units based on search
  useEffect(() => {
    if (!searchTerm) {
      setUnits(allUnits);
    } else {
      const filtered = allUnits.filter(unit =>
        unit.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.id.toString().includes(searchTerm)
      );
      setUnits(filtered);
    }
  }, [searchTerm, allUnits]);

  const handleSubmit = async () => {
    if (!formData.unit_name.trim() || !formData.symbol.trim()) {
      setError("Both unit name and symbol are required");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      let response;
      if (editingId) {
        response = await uomApi.update(editingId, formData);
      } else {
        response = await uomApi.create(formData);
      }

      if (response.status === "success") {
        fetchUoms();
        handleClear();
        toast?.open(editingId ? "Unit updated successfully" : "Unit added successfully", 3000, 'Success', 'success');
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
      const response = await uomApi.delete(id);
      if (response.status === "success") {
        setAllUnits(prev => prev.filter(unit => unit.id !== id));
        if (editingId === id) handleClear();
        toast?.open("Unit deleted successfully", 3000, 'Success', 'success');
      }
    } catch (error) {
      setError(error.message || 'Delete failed');
    }
  };

  const handleRowClick = (unit) => {
    setFormData({
      unit_name: unit.unit_name,
      symbol: unit.symbol
    });
    setEditingId(unit.id);
  };

  const handleClear = () => {
    setFormData({ unit_name: "", symbol: "" });
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
            <Ruler className="w-5 h-5 text-[#1A318C]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Unit of Measurement</h2>
            <p className="text-sm text-gray-500">Manage measurement units for inventory items</p>
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
                placeholder="Search by unit name, symbol or ID..."
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
          <div className="flex items-center gap-3">
            <input
              type="text"
              name="unit_name"
              placeholder="Add new unit name here"
              value={formData.unit_name}
              onChange={handleChange}
              className="flex-1 h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
            />
            <input
              type="text"
              name="symbol"
              placeholder="Unit symbol"
              value={formData.symbol}
              onChange={handleChange}
              className="w-40 h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
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
            <p className="text-xs text-[#1A318C] mt-2 font-medium">Editing unit ID: {editingId} - Click row to edit or clear to cancel</p>
          )}
        </div>

        {/* Units Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1A318C] to-[#2a4ab8]">
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Unit Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Unit Symbol</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                        <Ruler className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No units found</p>
                      <p className="text-gray-400 text-sm">Add a new unit to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr
                    key={unit.id}
                    onClick={() => handleRowClick(unit)}
                    className={`cursor-pointer transition-colors ${editingId === unit.id ? 'bg-[#1A318C]/5 ring-2 ring-inset ring-[#1A318C]' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">{unit.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{unit.unit_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-mono">{unit.symbol}</span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDelete(unit.id, e)}
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
          Showing {units.length} of {allUnits.length} units
        </div>
      </div>
    </div>
  );
}

export default UnitOfMeassurement;
