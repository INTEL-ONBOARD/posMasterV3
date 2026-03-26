import React, { useContext, useState, useEffect, useRef } from "react";
import ToastContext from "./toasts/ToastService.jsx";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { useStatusLog, StatusType } from "../services/StatusLogService.jsx";
import { useRealTimeSync } from "../hooks/useRealTimeSync";
import { appSettingsApi, authApi } from "../api/localApi";
import { onSessionEvent, startSessionMonitor } from "../services/SessionGuard";
import { BranchProvider } from "../context/BranchContext.jsx";
import { useActivityTracker } from "../hooks/useActivityTracker";

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
  const { currentStatus, isOnline: statusIsOnline } = useStatusLog();
  const { pendingCount, lastSyncTime, isSyncing, isOnline } = useRealTimeSync();
  // Use the fetched initial value first; real-time updates from useRealTimeSync take over once received
  const displayOnline = isOnline ?? statusIsOnline;
  const [showKickedModal, setShowKickedModal] = useState(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Track user activity for idle auto-logout
  useActivityTracker({ enabled: true });

  // Force logout handler - clears session and navigates to login
  const handleForcedLogout = async (message = 'You have been logged out') => {
    console.log('[Dashboard] Forced logout:', message);

    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        await authApi.logout(token);
      }
    } catch (err) {
      console.error('[Dashboard] Logout error:', err);
    }

    // Clear all auth state from both storages
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('_id');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');

    // Clean up DataStore to prevent data leak to next user
    if (window.dataStore?.cleanup) {
        try {
            window.dataStore.cleanup();
        } catch (e) {
            console.warn('[Dashboard] DataStore cleanup error:', e);
        }
    }

    // Navigate to login
    navigate('/login', { replace: true, state: { message } });
  };

  // Apply settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Apply all settings (maximize window, etc.)
        await appSettingsApi.applyAll();
      } catch (err) {
        console.error('[Dashboard] Failed to apply settings:', err);
      }
    };

    initializeSettings();
  }, []);

  // Single-device enforcement: Real-time session monitoring
  useEffect(() => {
    // Subscribe to session events (kicked, invalid) from SessionGuard
    const unsubscribe = onSessionEvent((event) => {
      if (!isMountedRef.current) return;
      console.log('[Dashboard] Session event:', event);

      if (event.type === 'kicked') {
        // Another device logged in - show modal
        setShowKickedModal(true);
      } else if (event.type === 'invalid') {
        // Session expired - logout directly
        toast.open('Session expired', 3000, 'Warning', 'warning');
        handleForcedLogout('Session expired');
      }
    });

    // Also listen for direct session:kicked broadcasts from backend (faster detection)
    let unsubscribeKicked = null;
    if (window.electronAPI?.onSessionKicked) {
      unsubscribeKicked = window.electronAPI.onSessionKicked((data) => {
        if (!isMountedRef.current) return;
        console.log('[Dashboard] Direct session kicked broadcast:', data);
        setShowKickedModal(true);
      });
    }

    // Start real-time session monitoring (checks every 3 seconds + on visibility change)
    const stopMonitor = startSessionMonitor(3000);

    return () => {
      unsubscribe();
      unsubscribeKicked?.();
      stopMonitor();
    };
  }, [toast]);

  // Auto-enforce kicked modal: force logout after 8 seconds if user doesn't click OK
  useEffect(() => {
    if (!showKickedModal) return;
    const timer = setTimeout(() => {
      handleForcedLogout('Logged out - another device signed in');
    }, 8000);
    return () => clearTimeout(timer);
  }, [showKickedModal]);

  const style = getStatusStyle(currentStatus.type, currentStatus.isLoading);

  // Handler for the kicked modal OK button
  const handleKickedModalClose = () => {
    setShowKickedModal(false);
    handleForcedLogout('Logged out - another device signed in');
  };

  return (
    <BranchProvider>
      <div className="min-h-screen flex flex-col">
        {/* Session Kicked Modal */}
        {showKickedModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-xl font-bold text-white">Session Ended</h2>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Logged in from another device
                  </h3>
                  <p className="text-gray-600">
                    Your account has been signed in from another device. For security reasons,
                    only one active session is allowed at a time.
                  </p>
                  <p className="text-gray-500 text-sm mt-3">
                    If this wasn't you, please change your password immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={handleKickedModalClose}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                OK, Sign In Again
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Sync status UI */}
            <div className="flex items-center gap-2 text-xs text-white/80">
              {/* Online/Offline dot */}
              <span className={`w-2 h-2 rounded-full ${displayOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>{displayOnline ? 'Online' : 'Offline'}</span>

              {/* Pending changes badge — only show when there are pending changes */}
              {pendingCount > 0 && (
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs font-medium">
                  {pendingCount} pending
                </span>
              )}

              {/* Sync spinner — only show when actively syncing */}
              {isSyncing && (
                <svg className="animate-spin h-3 w-3 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}

              {/* Last sync time — only show if we have a timestamp */}
              {lastSyncTime && (
                <span className="text-white/50">Last sync: {formatTime(new Date(lastSyncTime))}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
      </div>
    </BranchProvider>
  );
}

export default Dashboard;
