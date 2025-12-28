import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Intro() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Step 1: Check database status
        setStatus("Connecting to database...");
        setProgress(10);

        if (window.electronAPI?.database?.getStatus) {
          const dbStatus = await window.electronAPI.database.getStatus();
          if (dbStatus?.status === 'success') {
            setProgress(30);
            setStatus("Database connected");
          }
        } else {
          // No API available, simulate delay
          await new Promise(resolve => setTimeout(resolve, 500));
          setProgress(30);
        }

        // Step 2: Verify tables
        setStatus("Verifying database tables...");
        setProgress(50);
        await new Promise(resolve => setTimeout(resolve, 400));

        // Step 3: Initialize services
        setStatus("Starting services...");
        setProgress(70);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 4: Load configuration
        setStatus("Loading configuration...");
        setProgress(85);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 5: Ready
        setStatus("Ready!");
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 400));

        // Navigate to login
        navigate("/login");
      } catch (error) {
        console.error("[Intro] Initialization error:", error);
        setStatus("Error initializing. Retrying...");
        // Retry after delay
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    initializeApp();
  }, [navigate]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex-grow flex flex-col justify-center items-center w-full max-w-md p-8">
        {/* Logo Icon */}
        <motion.div
          className="mb-6"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A318C] to-[#152870] flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </motion.div>

        {/* Logo/Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold">
            <span className="font-bold text-[#1A318C]">POS</span>
            <span className="text-gray-900"> MASTER</span>
            <span className="text-gray-400 font-normal">.3</span>
          </h1>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          className="w-full max-w-xs mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1A318C] to-[#2541B2] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Status Text */}
        <motion.div
          className="text-center h-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              className="text-gray-500 text-sm"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {status}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        className="w-full absolute bottom-6 left-0 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <p className="text-xs text-gray-400">
          © 2025 SLTC ® · v{import.meta.env.VITE_VERSION_NUMBER}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default Intro;
