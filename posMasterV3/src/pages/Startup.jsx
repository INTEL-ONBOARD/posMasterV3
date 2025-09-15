import React, { useState } from "react";
import { motion } from "framer-motion";

function Startup() {
  const [currentPage, setCurrentPage] = useState("setup"); // "setup" || "loading"
  
  const [formData, setFormData] = useState({
    outlet: "",
    filePath: "",
  }); // "setup" || "loading"

  return (
    // full-height container (adjust calc if you need a different offset)
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center bg-white">
      {currentPage === "loading" ? (
        // Loading: centered column
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
            <p className="mt-3 text-xl text-[#484848]">We are prepairng things for you...</p>
          <div className="relative">
            <div className="w-8 h-8 border-2 border-gray-200 rounded-full" />
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-[#C8C8C8]">Loading...</p>
        </motion.div>
      ) : (
        // Setup: centered card (constrained width)
        <div className="w-full max-w-md p-6 flex flex-col items-center justify-center">
          <p className="mb-4 text-2xl text-gray-700">Please provide following details</p>

          <div className="w-full mb-4">
            <label htmlFor="outlet" className="block text-sm text-[#D3D3D3] mb-1">
              Outlet Selected
            </label>
            <select
              id="outlet"
              name="categoryType"
              value={formData.outlet}
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-lg"
            >
              <option value="allenvalley">Allenvalley</option>
              <option value="morawakkorale">Morawakkorale</option>
              <option value="kotapola">Kotapola</option>
            </select>
          </div>

          <div className="w-full mb-4">
            <label htmlFor="file_input" className="block mb-2 text-sm text-[#D3D3D3]">
              Temporary File path
            </label>
            <input
              id="file_input"
              type="file"
              value= {formData.filePath}
              className="block w-full text-sm text-gray-900 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-lg cursor-pointer focus:outline-none"
              aria-describedby="file_input_help"
            />
            <p className="mt-1 text-sm text-gray-500" id="file_input_help">
              (JSON)
            </p>
          </div>

          <div className="w-full flex justify-between items-center">
            <button
              onClick={() => setCurrentPage("loading")}
              className="px-6 py-2 h-10 w-full bg-blue-600 text-white rounded-md hover:bg-[#1A318C] transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Startup;
