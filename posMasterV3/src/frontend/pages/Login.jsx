import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useStatusLog } from "../services/StatusLogService.jsx";
import { onlineApi } from "../api/onlineApi";
import StatusModal from "../components/StatusModal.jsx";
import AuthRail from "../components/AuthRail.jsx";

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
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const FIELD_BASE_STYLE = {
  background: "rgba(248,250,252,0.8)",
  border: "1px solid rgba(203,213,225,0.8)",
};

function focusField(e) {
  e.target.style.borderColor = "rgba(26,49,140,0.5)";
  e.target.style.boxShadow = "0 0 0 3px rgba(26,49,140,0.08)";
  e.target.style.background = "#fff";
}

function blurField(e) {
  e.target.style.borderColor = "rgba(203,213,225,0.8)";
  e.target.style.boxShadow = "none";
  e.target.style.background = "rgba(248,250,252,0.8)";
}

function Login() {
  const navigate = useNavigate();
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
  const statusLog = useStatusLog();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Silent readiness probe. Deliberately free of any dependency so it stays
   * referentially stable and can be wired to listeners and a timer without
   * re-subscribing on every render.
   */
  const refreshReadyState = useCallback(async () => {
    try {
      const statusResult = await onlineApi.ready();
      setSyncStatus(statusResult?.status === 'success'
        ? resolveSyncStatus(statusResult.data)
        : 'unavailable');
    } catch (error) {
      console.error('Failed to check online server status:', error);
      setSyncStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    refreshReadyState();
  }, [refreshReadyState]);

  // The status used to be a single snapshot taken when this screen mounted, so
  // a server that recovered — or a laptop that woke up — left it stale until
  // the app was restarted. Re-probe on the events that actually change it.
  useEffect(() => {
    window.addEventListener('focus', refreshReadyState);
    window.addEventListener('online', refreshReadyState);
    return () => {
      window.removeEventListener('focus', refreshReadyState);
      window.removeEventListener('online', refreshReadyState);
    };
  }, [refreshReadyState]);

  // Keep retrying only while something is wrong; once ready, stop polling.
  useEffect(() => {
    if (syncStatus === 'online' || syncStatus === 'syncing') return undefined;
    const timer = setInterval(refreshReadyState, 20000);
    return () => clearInterval(timer);
  }, [syncStatus, refreshReadyState]);

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
  // null means "first probe hasn't answered yet", which is not a fault — only
  // a resolved non-ready state is worth interrupting the sign-in form for.
  // 'syncing' stays truthy so the notice doesn't vanish mid-retry.
  const needsAttention = syncStatus !== null && syncStatus !== 'online';

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
      className="fixed inset-0 flex overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AuthRail />

      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        <Motion.div
          className="w-full max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Motion.div
            className="flex flex-col items-start"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {/* Title */}
            <Motion.h1
              className="mb-1 text-[26px] font-semibold tracking-tight text-slate-900"
              style={{ fontFamily: 'Charter, "Iowan Old Style", Georgia, serif' }}
              variants={item}
            >
              Welcome back
            </Motion.h1>

            {/* Subtitle */}
            <Motion.p className="mb-6 text-[13px] leading-relaxed text-slate-400" variants={item}>
              Sign in with your branch credentials.
            </Motion.p>

            {/* A healthy connection is the normal case and says nothing — the
                app connects on its own and sign-in never depended on this.
                The notice appears only when the server can't be reached, so
                it carries a real warning and a real action when it shows. */}
            {needsAttention && (
              <Motion.div className="mb-5 w-full" variants={item}>
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
                    {isSyncing ? 'Checking' : 'Retry'}
                  </button>
                </div>
              </Motion.div>
            )}

            {/* Email field */}
            <Motion.div className="mb-3 w-full" variants={item}>
              <label htmlFor="email" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Email or Username
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-xl pl-10 pr-4 text-[13px] text-slate-800 outline-none transition-all duration-200 placeholder-slate-400"
                  style={FIELD_BASE_STYLE}
                  onFocus={focusField}
                  onBlur={blurField}
                  placeholder="Enter your email or username"
                  required
                />
              </div>
            </Motion.div>

            {/* Password field */}
            <Motion.div className="mb-5 w-full" variants={item}>
              <label htmlFor="password" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-xl pl-10 pr-11 text-[13px] text-slate-800 outline-none transition-all duration-200 placeholder-slate-400"
                  style={FIELD_BASE_STYLE}
                  onFocus={focusField}
                  onBlur={blurField}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600"
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
                className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[13px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #1e3ba8 0%, #152870 100%)",
                  boxShadow: "0 4px 16px rgba(26,49,140,0.3), 0 1px 0 rgba(255,255,255,0.12) inset",
                }}
                whileHover={{ scale: 1.015, boxShadow: "0 6px 24px rgba(26,49,140,0.38), 0 1px 0 rgba(255,255,255,0.12) inset" }}
                whileTap={{ scale: 0.975 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
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
                    </Motion.div>
                  )}
                </AnimatePresence>
              </Motion.button>
            </Motion.div>

            {/* Support */}
            <Motion.div className="mt-6 w-full text-left" variants={item}>
              <p className="text-[12px] text-slate-400">
                Need help?{" "}
                <button className="font-medium transition-colors" style={{ color: "#1A318C" }}>
                  Contact support
                </button>
              </p>
            </Motion.div>
          </Motion.div>
        </Motion.div>
      </div>
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
