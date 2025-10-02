import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function Startup() {
  const [currentPage, setCurrentPage] = useState("initialLoading");
  const [formData, setFormData] = useState({
    outlet: "",
    filePath: "",
  });

  const navigate = useNavigate();
  const hiddenFileInput = useRef(null);

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

  // Handle file select
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData({ ...formData, filePath: file.name }); // only file name shown
      // if you want full path in Electron/desktop, you can use file.path
    }
  };

  const handleButtonClick = () => {
    hiddenFileInput.current.click();
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
            Please provide following details
          </p>

          {/* Temp File Path */}
          <div className="w-full mb-4">
            <label
              htmlFor="filePath"
              className="block text-sm text-[#D3D3D3] mb-1"
            >
              Temp file path
            </label>
            <div className="flex gap-2">
              <input
                id="filePath"
                type="text"
                value={formData.filePath}
                readOnly
                placeholder="C:/Drive//"
                className="flex-1 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-lg"
              />
              <button
                onClick={handleButtonClick}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg"
              >
                Select
              </button>
              <input
                type="file"
                accept=".json"
                ref={hiddenFileInput}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
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

          {/* Confirm Button */}
          <div className="w-full flex justify-between items-center">
            <button
              onClick={() => setCurrentPage("finalLoading")}
              className="px-6 py-2 h-10 w-full bg-[#00489A] text-white rounded-md hover:bg-[#003B7A] transition-colors"
            >
              Confirm
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
