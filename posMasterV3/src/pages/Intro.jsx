import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Intro() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center p-4"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="flex-grow flex flex-col justify-center items-center w-full max-w-md p-8">
        {/* Logo/Title */}
        <motion.div
          className="text-center mb-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <h1 className="text-3xl font-bold">
            <span className="font-bold text-[#00489A]">POS</span>
            <span className="text-gray-900"> MASTER</span>
            <span className="text-gray-700">.3</span>
          </h1>
        </motion.div>

        {/* Loading Spinner */}
        <motion.div
          className="flex justify-center mb-2"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.5,
            duration: 0.6,
            type: "spring",
            stiffness: 100,
          }}
        >
          <div className="relative">
            <div className="w-8 h-8 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <p className="text-gray-500 text-sm">Please Wait...</p>
        </motion.div>

        
      </div>
      {/* Footer */}
        <motion.div
          className="w-full absolute bottom-4 left-0 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6 }}
        >
          <p className="text-xs text-gray-400">
            Copyright © 2025 SLTC ® | .{import.meta.env.VITE_VERSION_NUMBER}
          </p>
        </motion.div>
    </motion.div>
  );
}

export default Intro;
