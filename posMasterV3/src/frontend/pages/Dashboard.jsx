import React, { useContext, useState, useEffect } from "react";
import ToastContext from "./toasts/ToastService.jsx";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { useStatusLog, StatusType } from "../services/StatusLogService.jsx";
import { appSettingsApi, authApi } from "../api/localApi";

// Get icon and color based on status type
const getStatusStyle = (type, isLoading) => {
  if (isLoading) {
    return {
      bg: "bg-blue-700",
      icon: (
        <span
          className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
          style={{ verticalAlign: "middle" }}
        />
      ),
    };
  }

  switch (type) {
    case StatusType.SUCCESS:
      return {
        bg: "bg-green-600",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    case StatusType.WARNING:
      return {
        bg: "bg-yellow-600",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case StatusType.ERROR:
      return {
        bg: "bg-red-600",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
    case StatusType.SYNC:
      return {
        bg: "bg-purple-600",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      };
    case StatusType.DATABASE:
      return {
        bg: "bg-indigo-600",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        ),
      };
    case StatusType.NETWORK:
      return {
        bg: "bg-cyan-600",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        ),
      };
    default: // INFO
      return {
        bg: "bg-blue-800",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
};

// Format timestamp
const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

function Dashboard() {
  const [activeSection, setActiveSection] = useState(null);
  const toast = useContext(ToastContext);
  const navigate = useNavigate();
  const { currentStatus, isOnline } = useStatusLog();
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(false);

  // Apply settings and setup auto-logout on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Apply all settings (including auto-logout)
        const result = await appSettingsApi.applyAll();
        if (result.status === 'success' && result.data?.auto_logout) {
          setAutoLogoutEnabled(true);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to apply settings:', err);
      }
    };

    initializeSettings();

    // Listen for auto-logout event
    const handleAutoLogout = async () => {
      console.log('[Dashboard] Auto-logout triggered');
      toast.open('Session expired due to inactivity', 3000, 'Warning', 'warning');

      try {
        const token = localStorage.getItem('token');
        if (token) {
          await authApi.logout(token);
        }
      } catch (err) {
        console.error('[Dashboard] Logout error:', err);
      }

      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('_id');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');

      // Navigate to login
      navigate('/login', { replace: true, state: { message: 'Session expired due to inactivity' } });
    };

    if (window.electronAPI?.appSettings?.onAutoLogout) {
      window.electronAPI.appSettings.onAutoLogout(handleAutoLogout);
    }

    // Activity tracking - reset timer on user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    let debounceTimer = null;

    const resetActivity = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        appSettingsApi.resetActivity().catch(() => {});
      }, 1000);
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetActivity);
      });
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [navigate, toast]);

  const style = getStatusStyle(currentStatus.type, currentStatus.isLoading);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content area */}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-[128px] pb-10">
          <Outlet context={{ setActiveSection }} />
        </main>
      </div>

      {/* Dynamic Status Bar */}
      <footer
        id="bottom-bar"
        className={`fixed bottom-0 left-0 right-0 ${style.bg} text-white py-2 z-50 transition-colors duration-300`}
      >
        <div className="flex items-center justify-between px-5">
          {/* Status message */}
          <div className="flex items-center gap-2">
            {style.icon}
            <span className="text-sm font-medium">{currentStatus.message}</span>
            <span className="text-xs text-white/60 ml-2">
              {formatTime(currentStatus.timestamp)}
            </span>
          </div>

          {/* Right side indicators */}
          <div className="flex items-center gap-4">
            {/* Network status */}
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-xs text-white/80">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
