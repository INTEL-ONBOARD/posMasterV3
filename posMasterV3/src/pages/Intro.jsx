import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Intro() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8">
        {/* Logo/Title */}
        <div className="text-center mb-16">
          <h1 className="text-2xl font-bold">
             <span className="font-bold" style={{ color: "#00489A" }}>POS</span>
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
            Please Wait...
          </p>
        </div>

        {/* Additional Info Footer */}
        <div className="w-full absolute bottom-4 left-0 text-center">
          <p className="text-xs text-gray-400">
            © 2025 POS Master. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Intro;