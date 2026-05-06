import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { CloudOff, RefreshCw, ShieldAlert } from "lucide-react";
import { useConnectionStatus } from "../store/DataStoreContext";

function readSessionToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export default function OnlineConnectionOverlay() {
  const { isOnline, connectionQuality, checkNetwork } = useConnectionStatus();
  const [hasSession, setHasSession] = useState(() => Boolean(readSessionToken()));
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [hasVerifiedConnection, setHasVerifiedConnection] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncSession = () => {
      setHasSession(Boolean(readSessionToken()));
    };

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);
    document.addEventListener("visibilitychange", syncSession);
    window.addEventListener("auth-changed", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
      document.removeEventListener("visibilitychange", syncSession);
      window.removeEventListener("auth-changed", syncSession);
    };
  }, []);

  const refreshConnection = useCallback(async () => {
    if (!hasSession) return null;

    setIsChecking(true);
    try {
      const result = await checkNetwork();
      setHasVerifiedConnection(true);
      setLastCheckedAt(new Date());
      return result;
    } catch (error) {
      setHasVerifiedConnection(true);
      setLastCheckedAt(new Date());
      return { isOnline: false, error };
    } finally {
      setIsChecking(false);
    }
  }, [checkNetwork, hasSession]);

  useEffect(() => {
    if (!hasSession) {
      setHasVerifiedConnection(false);
      setLastCheckedAt(null);
      setIsChecking(false);
      return undefined;
    }

    let cancelled = false;

    const runCheck = async () => {
      await refreshConnection();
      if (cancelled) return;
    };

    runCheck();
    const handleFocus = () => {
      runCheck();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runCheck();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasSession, refreshConnection]);

  const shouldShow = hasSession && hasVerifiedConnection && !isOnline;

  const statusText = isChecking
    ? "Checking online backend..."
    : "Online backend unavailable";

  const description = isChecking
    ? "We are checking the online service before letting you continue."
    : "The app is waiting for the online backend to become reachable again.";

  return (
    <AnimatePresence>
      {shouldShow && (
        <Motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-white/95 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Motion.div
            className="w-full max-w-[420px] rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)] px-8 py-9 text-center"
            initial={{ y: 18, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#1A318C]/10 text-[#1A318C]">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              {statusText}
            </h1>

            <p className="mt-3 text-[14px] leading-6 text-slate-500">
              {description}
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-left">
              <div className="flex items-center gap-3">
                <CloudOff className="h-5 w-5 text-rose-500" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Connection State
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {connectionQuality === "online" ? "Connected" : "Unavailable"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={refreshConnection}
                disabled={isChecking}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1A318C] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#162771] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking" : "Retry"}
              </button>
            </div>

            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {lastCheckedAt ? `Last checked ${lastCheckedAt.toLocaleTimeString()}` : "Waiting for verification"}
            </p>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
