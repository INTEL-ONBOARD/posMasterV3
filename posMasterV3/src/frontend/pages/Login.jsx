import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import ToastContext from "./toasts/ToastService";
import { localAuth } from "../api/services/localAuth";
import { useStatusLog } from "../services/StatusLogService.jsx";
import { appSettingsApi, cloudSyncApi } from "../api/localApi";


const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1.0, ease: "easeOut" },
  },
};

const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 50, damping: 18 },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

function Login() {
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const statusLog = useStatusLog();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Cloud sync state
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'synced', 'offline', 'error'
  const [isSyncing, setIsSyncing] = useState(false);

  // Check cloud sync status on mount
  useEffect(() => {
    const checkCloudSync = async () => {
      try {
        // Check if cloud sync is enabled
        const enabledResult = await appSettingsApi.isCloudSyncEnabled();
        const isEnabled = enabledResult?.status === 'success' && enabledResult?.data?.enabled;
        setCloudSyncEnabled(isEnabled);

        if (isEnabled) {
          // Check sync status
          const statusResult = await cloudSyncApi.getStatus();
          if (statusResult?.status === 'success') {
            const data = statusResult.data;
            if (data.isOnline && data.mysqlInitialized) {
              // Check if this might be first run (no previous sync)
              if (!data.lastSyncTime) {
                setSyncStatus('syncing');
                // Trigger initial sync
                handleSyncNow(true);
              } else {
                setSyncStatus('synced');
              }
            } else if (!data.isOnline) {
              setSyncStatus('offline');
            } else {
              setSyncStatus('error');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check cloud sync status:', error);
      }
    };

    checkCloudSync();
  }, []);

  // Handle manual sync
  const handleSyncNow = async (silent = false) => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    if (!silent) {
      statusLog.loading("Syncing with cloud...");
    }

    try {
      // Pull users from cloud first
      const pullResult = await cloudSyncApi.pullUsers();

      if (pullResult?.status === 'success') {
        setSyncStatus('synced');
        if (!silent) {
          statusLog.success("Cloud sync complete");
          toast.open("User data synced from cloud.", 5000, "Sync Complete", "success");
        }
      } else {
        setSyncStatus('error');
        if (!silent) {
          statusLog.error("Sync failed");
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      if (!silent) {
        statusLog.error("Sync failed");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    statusLog.loading("Authenticating user...");

    try {
      // Use local SQLite login only (no cloud fallback)
      const result = await localAuth.login(formData.email, formData.password);

      if (result.success) {
        const userData = result.data;
        const token = result.token;

        statusLog.success(`Welcome back, ${userData.full_name || userData.username}`);

        // Persist user fields explicitly so other parts of the app can read them
        localStorage.setItem("user", JSON.stringify(userData));

        if (token !== undefined && token !== null) {
          localStorage.setItem("token", token);
        } else {
          localStorage.removeItem('token');
        }

        // common keys used across app
        localStorage.setItem('username', userData.username ?? userData.email ?? '');
        localStorage.setItem('email', userData.email ?? '');
        localStorage.setItem('_id', userData._id ?? userData.id ?? '');

        // Send user data to main process for logout handling
        if (window.electronAPI && window.electronAPI.sendUserData) {
          window.electronAPI.sendUserData(userData.email, token);
        }

        navigate("/dashboard");
      } else {
        statusLog.error("Login failed: Invalid credentials");
        toast.open(result.message || 'Login failed', 4000, 'Login Failed', 'warning');
      }
    } catch (error) {
      statusLog.error("Login error occurred");
      toast.open(error.message || "Login error: Please try again", 4000, 'Login Failed', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden flex items-center justify-center p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#1A318C]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1A318C]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <motion.div className="w-full max-w-md flex flex-col justify-center min-h-[60vh] relative z-10" variants={cardVariants} initial="hidden" animate="visible">
        <div>
          <motion.div
            className="bg-white rounded-2xl p-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Logo Icon */}
            <motion.div className="flex justify-center mb-6" variants={fadeUp}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A318C] to-[#152870] flex items-center justify-center shadow-lg shadow-blue-900/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div className="text-center mb-2" variants={fadeUp}>
              <h1 className="text-3xl font-bold">
                <span className="font-bold text-[#1A318C]">POS</span>
                <span className="text-gray-800"> MASTER</span>
                <span className="text-gray-400 text-xl">.3</span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.div className="text-center mb-4" variants={fadeUp}>
              <p className="text-sm leading-relaxed text-gray-400">
                Welcome back! Enter your credentials to continue.
              </p>
            </motion.div>

            {/* Cloud Sync Status Banner */}
            {cloudSyncEnabled && (
              <motion.div className="mb-6" variants={fadeUp}>
                {/* Sync Status Indicator */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-200' :
                  syncStatus === 'syncing' ? 'bg-blue-50 border-blue-200' :
                  syncStatus === 'offline' ? 'bg-amber-50 border-amber-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {syncStatus === 'syncing' ? (
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : syncStatus === 'synced' ? (
                      <Cloud className="w-4 h-4 text-emerald-500" />
                    ) : syncStatus === 'offline' ? (
                      <CloudOff className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Cloud className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      syncStatus === 'synced' ? 'text-emerald-700' :
                      syncStatus === 'syncing' ? 'text-blue-700' :
                      syncStatus === 'offline' ? 'text-amber-700' :
                      'text-gray-500'
                    }`}>
                      {syncStatus === 'syncing' ? 'Syncing with cloud...' :
                       syncStatus === 'synced' ? 'Cloud connected' :
                       syncStatus === 'offline' ? 'Offline mode' :
                       'Cloud sync enabled'}
                    </span>
                  </div>
                  {!isSyncing && syncStatus !== 'syncing' && (
                    <button
                      type="button"
                      onClick={() => handleSyncNow(false)}
                      className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                      title="Sync now"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Login Form */}
            <motion.form onSubmit={handleSubmit} className="space-y-5 w-full" variants={staggerContainer}>
              {/* Email Field */}
              <motion.div className="space-y-1.5" variants={fadeUp}>
                <label htmlFor="email" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all duration-200 text-gray-800 placeholder-gray-400"
                    placeholder="Enter your email or username"
                    required
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div className="space-y-1.5" variants={fadeUp}>
                <label htmlFor="password" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all duration-200 text-gray-800 placeholder-gray-400"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-[#1A318C] transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-[#1A318C] transition-colors" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-full h-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A318C]/50 transition-all duration-200 text-white font-semibold flex items-center justify-center bg-gradient-to-r from-[#1A318C] to-[#152870] shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 disabled:opacity-70 disabled:cursor-not-allowed"
                variants={fadeUp}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Support Section */}
            <motion.div className="mt-8 text-center" variants={fadeUp}>
              <p className="text-sm text-gray-400">Need help?</p>
              <button
                className="text-sm font-medium text-[#1A318C] hover:underline transition-colors mt-1"
              >
                Contact Support
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/*bottom Footer section*/}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.7 }}
        >
          <p className="text-xs text-gray-400">
            © 2025 SLTC ® · v{import.meta.env.VITE_VERSION_NUMBER}
          </p>
        </motion.div>


      </motion.div>
    </motion.div>
  );
}

export default Login;

