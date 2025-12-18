import React, { useState, useEffect, useContext } from "react";
import { uomApi } from "../../../api/localApi";
import ToastContext from "../../toasts/ToastService";

function UnitOfMeassurement() {
  const toast = useContext(ToastContext);
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState({
    unit_name: "",
    symbol: ""
  });
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchUoms = async () => {
    try {
      const response = await uomApi.getAll();
      if (response.status === 'success') {
        setUnits(response.data || []);
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch units');
    }
  };

  useEffect(() => {
    fetchUoms();
  }, []);

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
        setUnits(prev => prev.filter(unit => unit.id !== id));
        if (editingId === id) handleClear();
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
    <div className="flex-1 h-[calc(100vh-2rem)] bg-white flex justify-between flex-col px-8 py-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-400 mb-1">
          UNIT OF MEASUREMENT
        </h2>
        <p className="text-sm font-bold text-gray-400 mb-4">
          Customize how the app works for you. Manage preferences such as
          notifications, themes, language, and other general behaviors to tailor
          the experience to your needs. Your settings are saved automatically
          and can be updated anytime.
        </p>

        {/* Search bar with dynamic clear button */}
        <div className="mb-4 flex items-center">
          <input
            type="text"
            placeholder="Search your Unit Name or ID"
            className="flex-grow px-2 py-2 border-b border-gray-300 focus:outline-none focus:border-[#00489A]"
            value={formData.search || ""}
            onChange={async e => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, search: value }));

              if (!value) {
                await fetchUoms();
                return;
              }

              const filteredUnits = units.filter(unit => 
                unit.unit_name.toLowerCase().includes(value.toLowerCase()) ||
                unit.symbol.toLowerCase().includes(value.toLowerCase()) ||
                unit.id.toString().includes(value)
              );
              setUnits(filteredUnits);
            }}
          />

          {formData.search ? (
            // Clear button appears when typing, styled like Search
            <button
              onClick={async () => {
                setFormData(prev => ({ ...prev, search: "" }));
                await fetchUoms(); // Reset the units list
              }}
              className="ml-2 bg-[#00489A] text-white px-6 py-2 flex items-center gap-2 hover:bg-blue-900"
              title="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          ) : (
            // Search button
            <button
              className="ml-2 bg-[#00489A] text-white px-6 py-2 flex items-center gap-2 hover:bg-blue-900"
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
          )}
        </div>



        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            name="unit_name"
            placeholder="Add New Unit here"
            className="flex-1 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
            value={formData.unit_name}
            onChange={handleChange}
          />
          <input
            type="text"
            name="symbol"
            placeholder="Unit symbol"
            className="w-40 border border-gray-300 px-4 py-2 bg-[#F8F8F8]"
            value={formData.symbol}
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
          <table className="w-full border-collapse bg-[#F8F8F8] min-w-[500px]">
            <thead className="bg-gray-700 text-white sticky top-0 z-10">
              <tr className="text-left font-medium text-xs lg:text-sm">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">UNIT NAME</th>
                <th className="px-4 py-2">UNIT SYMBOL</th>
                <th className="px-4 py-2 w-16">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr
                  key={unit.id}
                  className={`border-b border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 ${editingId === unit.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleRowClick(unit)}
                >
                  <td className="px-4 py-2">{unit.id}</td>
                  <td className="px-4 py-2">{unit.unit_name}</td>
                  <td className="px-4 py-2">{unit.symbol}</td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => handleDelete(unit.id, e)}
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

export default UnitOfMeassurement;