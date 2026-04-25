import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useStatusLog } from "../services/StatusLogService.jsx";
import { onlineApi } from "../api/onlineApi";
import StatusModal from "../components/StatusModal.jsx";

function resolveSyncStatus(status = {}) {
  return status.ready || status.online ? 'online' : 'unavailable';
}

function getSyncBadge(syncStatus) {
  switch (syncStatus) {
    case 'completed':
    case 'synced':
    case 'idle':
    case 'online':
      return {
        label: 'Online server ready',
        icon: Cloud,
        textClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50 border-emerald-100'
      };
    case 'syncing':
    case 'reconnecting':
      return {
        label: 'Checking online service',
        icon: RefreshCw,
        textClass: 'text-sky-600',
        bgClass: 'bg-sky-50 border-sky-100',
        spin: true
      };
    case 'unavailable':
      return {
        label: 'Online server unavailable',
        icon: CloudOff,
        textClass: 'text-amber-600',
        bgClass: 'bg-amber-50 border-amber-100'
      };
    case 'disabled':
      return {
        label: 'Online mode unavailable',
        icon: CloudOff,
        textClass: 'text-slate-500',
        bgClass: 'bg-slate-50 border-slate-200'
      };
    default:
      return {
        label: 'Online server issue',
        icon: CloudOff,
        textClass: 'text-rose-600',
        bgClass: 'bg-rose-50 border-rose-100'
      };
  }
}

// Staggered children animation
const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

function Login() {
  const navigate = useNavigate();
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
  const statusLog = useStatusLog();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkOnlineServer = async () => {
      try {
        const statusResult = await onlineApi.ready();
        if (statusResult?.status === 'success') {
          setSyncStatus(resolveSyncStatus(statusResult.data));
          return;
        }
        setSyncStatus('unavailable');
      } catch (error) {
        console.error('Failed to check online server status:', error);
        setSyncStatus('unavailable');
      }
    };
    checkOnlineServer();
  }, []);

  const handleSyncNow = async (silent = false) => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    if (!silent) statusLog.loading("Checking online server...");
    try {
      const result = await onlineApi.ready();
      if (result?.status === 'success' && result?.data?.ready) {
        setSyncStatus('online');
        if (!silent) {
          statusLog.success("Online server is ready");
          setStatusModal({ open: true, type: 'success', description: 'Online server is ready.' });
        }
      } else {
        setSyncStatus('unavailable');
        if (!silent) {
          const message = result?.message || 'Online server is unavailable';
          statusLog.error(message);
          setStatusModal({ open: true, type: 'failed', description: message });
        }
      }
    } catch (error) {
      console.error('Online server check failed:', error);
      setSyncStatus('unavailable');
      if (!silent) statusLog.error("Online server check failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const syncBadge = getSyncBadge(syncStatus);
  const SyncBadgeIcon = syncBadge.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    statusLog.loading("Authenticating user...");

    try {
      const result = await onlineApi.login(formData.email, formData.password, null);

      if (result.success) {
        const userData = result.data;
        const token = result.token;

        statusLog.success(`Welcome back, ${userData.full_name || userData.username}`);

        const userJson = JSON.stringify(userData);
        sessionStorage.setItem("user", userJson);
        localStorage.setItem("user", userJson);

        if (token !== undefined && token !== null) {
          sessionStorage.setItem("token", token);
        } else {
          sessionStorage.removeItem('token');
        }

        const usernameVal = userData.username ?? userData.email ?? '';
        const emailVal = userData.email ?? '';
        const idVal = userData._id ?? userData.id ?? '';
        sessionStorage.setItem('username', usernameVal);
        sessionStorage.setItem('email', emailVal);
        sessionStorage.setItem('_id', idVal);
        localStorage.setItem('username', usernameVal);
        localStorage.setItem('email', emailVal);
        localStorage.setItem('_id', idVal);

        if (window.electronAPI && window.electronAPI.sendUserData) {
          window.electronAPI.sendUserData(userData.email, token);
        }

        navigate("/dashboard");
      } else {
        statusLog.error("Login failed: Invalid credentials");
        setStatusModal({ open: true, type: 'failed', description: result.message || 'Login failed' });
      }
    } catch (error) {
      statusLog.error("Login error occurred");
      setStatusModal({ open: true, type: 'failed', description: error.message || 'Login error: Please try again' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Motion.div
      className="fixed inset-0 flex items-center justify-center overflow-hidden p-4"
      style={{ background: "#ffffff" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >

      {/* Card */}
      <Motion.div
        className="relative w-full max-w-[380px] z-10"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#ffffff",
          }}
        >
          <Motion.div
            className="flex flex-col items-center"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <Motion.div className="mb-5" variants={item}>
              <div
                className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(145deg, #1e3ba8 0%, #152870 100%)",
                  boxShadow: "0 6px 24px rgba(26,49,140,0.3), 0 2px 6px rgba(26,49,140,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </Motion.div>

            {/* Title */}
            <Motion.h1
              className="text-[26px] font-bold tracking-tight mb-1"
              variants={item}
            >
              <span style={{ color: "#1A318C" }}>POS</span>
              <span className="text-slate-800"> MASTER</span>
              <span className="text-slate-400 font-normal text-lg">.3</span>
            </Motion.h1>

            {/* Subtitle */}
            <Motion.p
              className="text-[13px] text-slate-400 mb-7 text-center leading-relaxed"
              variants={item}
            >
              Welcome back! Enter your credentials to continue.
            </Motion.p>

            <Motion.div className="w-full mb-5" variants={item}>
              <div className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${syncBadge.bgClass}`}>
                <div className={`flex items-center gap-2 text-[12px] font-medium ${syncBadge.textClass}`}>
                  <SyncBadgeIcon className={`h-4 w-4 ${syncBadge.spin ? 'animate-spin' : ''}`} />
                  <span>{syncBadge.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncNow(false)}
                  disabled={isSyncing}
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSyncing ? 'Please wait' : 'Check'}
                </button>
              </div>
            </Motion.div>

            {/* Email field */}
            <Motion.div className="w-full mb-3" variants={item}>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 transition-all duration-200 outline-none"
                  style={{
                    background: "rgba(248,250,252,0.8)",
                    border: "1px solid rgba(203,213,225,0.8)",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "rgba(26,49,140,0.5)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(26,49,140,0.08)";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "rgba(203,213,225,0.8)";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "rgba(248,250,252,0.8)";
                  }}
                  placeholder="Enter your email or username"
                  required
                />
              </div>
            </Motion.div>

            {/* Password field */}
            <Motion.div className="w-full mb-5" variants={item}>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full h-11 pl-10 pr-11 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 transition-all duration-200 outline-none"
                  style={{
                    background: "rgba(248,250,252,0.8)",
                    border: "1px solid rgba(203,213,225,0.8)",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "rgba(26,49,140,0.5)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(26,49,140,0.08)";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "rgba(203,213,225,0.8)";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "rgba(248,250,252,0.8)";
                  }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <AnimatePresence mode="wait">
                    <Motion.span
                      key={showPassword ? "off" : "on"}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </Motion.div>

            {/* Sign in button */}
            <Motion.div className="w-full" variants={item}>
              <Motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-11 rounded-xl font-semibold text-[13px] text-white flex items-center justify-center gap-2 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #1e3ba8 0%, #152870 100%)",
                  boxShadow: "0 4px 16px rgba(26,49,140,0.3), 0 1px 0 rgba(255,255,255,0.12) inset",
                }}
                whileHover={{ scale: 1.015, boxShadow: "0 6px 24px rgba(26,49,140,0.38), 0 1px 0 rgba(255,255,255,0.12) inset" }}
                whileTap={{ scale: 0.975 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <Motion.div
                      key="loading"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Motion.div
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Signing in...</span>
                    </Motion.div>
                  ) : (
                    <Motion.div
                      key="idle"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span>Sign In</span>
                      <Motion.svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        initial={{ x: 0 }}
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </Motion.svg>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </Motion.button>
            </Motion.div>

            {/* Support */}
            <Motion.div className="mt-6 text-center" variants={item}>
              <p className="text-[12px] text-slate-400">Need help?</p>
              <button className="text-[12px] font-medium mt-0.5 transition-colors" style={{ color: "#1A318C" }}>
                Contact Support
              </button>
            </Motion.div>
          </Motion.div>
        </div>
      </Motion.div>

      {/* Footer */}
      <Motion.p
        className="absolute bottom-5 text-[11px] text-slate-400 tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        © 2025 SLTC ® · v{import.meta.env.VITE_VERSION_NUMBER}
      </Motion.p>
    </Motion.div>
    <StatusModal
      isOpen={statusModal.open}
      closeModal={() => setStatusModal({ open: false, type: null, description: "" })}
      type={statusModal.type}
      description={statusModal.description}
      context="default"
    />
    </>
  );
}

export default Login;
