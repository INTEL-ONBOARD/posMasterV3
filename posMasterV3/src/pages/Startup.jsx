import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function Startup() {
  const [currentPage, setCurrentPage] = useState("initialLoading");
  const [formData, setFormData] = useState({
    outlet: "",
    filePath: "", // Default folder path will be set here on load
  });
  const [message, setMessage] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const isConfirmEnabled = formData.filePath && formData.outlet;

  // Set default folder path when the component is mounted
  useEffect(() => {
    const defaultFolderPath = window.electronAPI.getDefaultFolderPath();
    setFormData((prev) => ({ ...prev, filePath: defaultFolderPath }));
  }, []);

  // Auto-timers for loading pages
  useEffect(() => {
    if (currentPage === "initialLoading") {
      const timer = setTimeout(() => {
        setCurrentPage("setup");
      }, 4000);
      return () => clearTimeout(timer);
    }

    if (currentPage === "finalLoading") {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentPage, navigate]);

  // Handle folder selection
  const handleSelectFolder = async () => {
    setSelecting(true);
    setMessage(""); // Clear any previous messages
    try {
      if (window.electronAPI && window.electronAPI.selectFolder) {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
          setFormData((prev) => ({ ...prev, filePath: folderPath }));
          setMessage(`Folder selected: ${folderPath}`);
        }
      } else {
        alert("Electron API not available!");
      }
    } catch (e) {
      alert("Failed to select folder: " + (e && e.message ? e.message : e));
    } finally {
      setSelecting(false);
    }
  };

  // Handle confirmation (create files)
  const handleConfirm = async () => {
    setConfirming(true);
    setMessage(""); // Clear any previous messages
    try {
      if (window.electronAPI && window.electronAPI.createFiles) {
        const result = await window.electronAPI.createFiles(
          formData.filePath,
          formData.outlet
        );
        if (result.success) {
          setMessage(
            `Files created successfully:\n- temp.json: ${result.tempFilePath}\n- config.json: ${result.configFilePath}`
          );
          setCurrentPage("finalLoading");
        } else {
          alert("Failed to create files: " + result.error);
        }
      } else {
        alert("Electron API not available!");
      }
    } catch (e) {
      alert("Failed to create files: " + (e && e.message ? e.message : e));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      {/* Initial Loading */}
      {currentPage === "initialLoading" && (
        <motion.div
          className="flex flex-col gap-4 items-center justify-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.45,
            type: "spring",
            stiffness: 100,
          }}
        >
          <p className="mt-3 text-xl text-[#484848]">
            We are preparing for you...
          </p>
          <div className="relative">
            <div className="w-8 h-8 border-2 border-gray-200 rounded-full" />
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-[#C8C8C8]">Please wait...</p>
        </motion.div>
      )}

      {/* Setup Form */}
      {currentPage === "setup" && (
        <div className="w-full max-w-md p-6 flex flex-col items-center justify-center">
          <p className="mb-4 text-2xl text-gray-700">
            Please provide the following details
          </p>

          {/* Temp File Path */}
          <div className="w-full mb-4">
            <label
              htmlFor="filePath"
              className="block text-sm text-[#D3D3D3] mb-1"
            >
              Configuration folder path
            </label>
            <div className="flex gap-2">
              <input
                id="filePath"
                type="text"
                value={formData.filePath}
                readOnly
                placeholder="Select a folder..."
                className="flex-1 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-lg"
              />
              <button
                onClick={handleSelectFolder}
                disabled={selecting}
                className={`px-4 py-2 bg-gray-500 text-white rounded-lg ${
                  selecting ? "opacity-60" : ""
                }`}
              >
                {selecting ? "Selecting..." : "Select"}
              </button>
            </div>
          </div>

          {/* Outlet Select */}
          <div className="w-full mb-4">
            <label
              htmlFor="outlet"
              className="block text-sm text-[#D3D3D3] mb-1"
            >
              Outlet Selected
            </label>
            <select
              id="outlet"
              value={formData.outlet}
              onChange={(e) =>
                setFormData({ ...formData, outlet: e.target.value })
              }
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-lg"
            >
              <option value="">Select outlet</option>
              <option value="alenweli">Alenweli Outlet</option>
              <option value="morawakkorale">Morawakkorale</option>
              <option value="kotapola">Kotapola</option>
            </select>
          </div>

          <div className="w-full flex justify-between items-center">
            <button
              onClick={handleConfirm}
              disabled={!isConfirmEnabled || confirming}
              className={`px-6 py-2 h-10 w-full bg-[#00489A] text-white rounded-md hover:bg-[#003B7A] transition-colors ${
                !isConfirmEnabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {confirming ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Final Loading */}
      {currentPage === "finalLoading" && (
        <motion.div
          className="flex flex-col gap-4 items-center justify-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.45,
            type: "spring",
            stiffness: 100,
          }}
        >
          <p className="mt-3 text-xl text-[#484848]">
            All set... please wait...
          </p>
          <div className="relative">
            <div className="w-8 h-8 border-2 border-gray-200 rounded-full" />
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-[#C8C8C8]">Please wait...</p>
        </motion.div>
      )}
    </div>
  );
}

export default Startup;
