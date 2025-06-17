import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Outlet } from 'react-router-dom';

function Intro() {
  const navigate = useNavigate(); // Hook to navigate programmatically

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login"); // Navigate to the login page after 3 seconds
    }, 3000);

    return () => clearTimeout(timer); // Cleanup the timeout
  }, [navigate]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
          {/* Logo/Title */}
          <div className="text-center mb-16">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-600">POS</span>
              <span className="text-gray-900"> MASTER</span>
              <span className="text-gray-700">.3</span>
            </h1>
          </div>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-16">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Loading...
            </p>
          </div>
        </div>

        {/* Additional Info Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            © 2025 POS Master. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Intro