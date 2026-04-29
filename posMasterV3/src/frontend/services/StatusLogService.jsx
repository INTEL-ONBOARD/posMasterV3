import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// Status types for different message categories
export const StatusType = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  SYNC: "sync",
  DATABASE: "database",
  NETWORK: "network",
};

// Create context
const StatusLogContext = createContext(null);

// Maximum logs to keep in history
const MAX_LOG_HISTORY = 100;

function resolveOnlineState(status) {
  const payload = status?.data && typeof status.data === "object" ? status.data : (status || {});
  return payload?.isOnline ?? payload?.ready ?? payload?.connected ?? true;
}

/**
 * StatusLogProvider - Provides app-wide status logging functionality
 */
export function StatusLogProvider({ children }) {
  const [currentStatus, setCurrentStatus] = useState({
    message: "Ready",
    type: StatusType.INFO,
    timestamp: new Date(),
    isLoading: false,
  });
  const [logHistory, setLogHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  // Listen for IPC events from backend
  useEffect(() => {
    if (window.electronAPI?.onStatusUpdate) {
      const unsubscribe = window.electronAPI.onStatusUpdate((data) => {
        log(data.message, data.type || StatusType.INFO, data.isLoading);
      });
      return () => unsubscribe?.();
    }
  }, []);

  // Check network status
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const checkNetwork = async () => {
      try {
        const status = await window.electronAPI?.online?.getRealtimeStatus?.();
        setIsOnline(resolveOnlineState(status));
      } catch {
        // Ignore errors
      }
    };

    // Initial fetch on mount
    checkNetwork();

    const handleFocus = () => {
      checkNetwork();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNetwork();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for online realtime status events.
    const handler = window.electronAPI?.online?.onRealtimeStatus;
    if (handler) {
      const unsubscribe = handler((status) => {
        const nextOnline = resolveOnlineState(status);
        if (typeof nextOnline === 'boolean') {
          setIsOnline(nextOnline);
        }
      });
      return () => {
        unsubscribe?.();
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  /**
   * Log a status message
   */
  const log = useCallback((message, type = StatusType.INFO, isLoading = false) => {
    const newStatus = {
      message,
      type,
      timestamp: new Date(),
      isLoading,
    };

    setCurrentStatus(newStatus);

    // Add to history
    setLogHistory((prev) => {
      const updated = [newStatus, ...prev].slice(0, MAX_LOG_HISTORY);
      return updated;
    });

    // Auto-clear loading after 10 seconds
    if (isLoading) {
      setTimeout(() => {
        setCurrentStatus((current) => {
          if (current.message === message && current.isLoading) {
            return { ...current, isLoading: false };
          }
          return current;
        });
      }, 10000);
    }
  }, []);

  // Convenience methods
  const info = useCallback((message) => log(message, StatusType.INFO), [log]);
  const success = useCallback((message) => log(message, StatusType.SUCCESS), [log]);
  const warning = useCallback((message) => log(message, StatusType.WARNING), [log]);
  const error = useCallback((message) => log(message, StatusType.ERROR), [log]);
  const sync = useCallback((message, isLoading = true) => log(message, StatusType.SYNC, isLoading), [log]);
  const database = useCallback((message, isLoading = false) => log(message, StatusType.DATABASE, isLoading), [log]);
  const network = useCallback((message) => log(message, StatusType.NETWORK), [log]);
  const loading = useCallback((message) => log(message, StatusType.INFO, true), [log]);

  const value = {
    currentStatus,
    logHistory,
    isOnline,
    log,
    info,
    success,
    warning,
    error,
    sync,
    database,
    network,
    loading,
  };

  return (
    <StatusLogContext.Provider value={value}>
      {children}
    </StatusLogContext.Provider>
  );
}

/**
 * Hook to use status logging
 */
export function useStatusLog() {
  const context = useContext(StatusLogContext);
  if (!context) {
    throw new Error("useStatusLog must be used within StatusLogProvider");
  }
  return context;
}

export default StatusLogContext;
