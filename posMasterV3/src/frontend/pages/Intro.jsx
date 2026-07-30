import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { onlineApi } from "../api/onlineApi";
import AuthRail from "../components/AuthRail.jsx";

const ONLINE_READY_TIMEOUT_MS = 45000;
const ONLINE_POLL_INTERVAL_MS = 750;

export default function Intro() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Starting up...");
  const [progress, setProgress] = useState(0);
  const [syncState, setSyncState] = useState(null); // null | 'connecting' | 'done' | 'error'
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const goToLogin = () => {
      if (!cancelled) navigate("/login");
    };

    // Delay that bails out immediately if the component unmounts mid-wait,
    // instead of the polling loop below continuing to hit the network and
    // call setState for up to 45s after the splash screen is gone.
    const cancellableDelay = (ms) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        if (cancelled) clearTimeout(timer);
      });

    const initializeApp = async () => {
      try {
        setStatus("Connecting to online server...");
        setProgress(10);

        const deadline = Date.now() + ONLINE_READY_TIMEOUT_MS;
        let ready = false;
        setSyncState("connecting");

        while (!cancelled && Date.now() < deadline) {
          const response = await onlineApi.ready().catch(() => null);
          if (response?.status === "success" && response?.data?.ready) {
            ready = true;
            break;
          }
          await cancellableDelay(ONLINE_POLL_INTERVAL_MS);
          if (cancelled) return;
          setProgress((current) => Math.min(current + 3, 90));
        }

        if (cancelled) return;

        if (!ready) {
          throw new Error("Online server is not available");
        }

        setSyncState("done");
        setStatus("Online server ready");
        setProgress(100);

        await cancellableDelay(600);
        goToLogin();

      } catch (error) {
        if (cancelled) return;
        console.error("[Intro] Initialization error:", error);
        setStatus("Online server unavailable. Please check the connection.");
        setSyncState("error");
        setProgress(100);

        try {
          const startupError = await window.electronAPI?.getStartupError?.();
          if (!cancelled && startupError?.data) {
            setErrorDetail(startupError.data);
          }
        } catch {
          // No startup error API available (e.g. dev mode) — generic status message stands.
        }
      }
    };

    initializeApp();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const barColor =
    syncState === "done" ? "#10b981"
    : syncState === "error" ? "#ef4444"
    : "#1A318C";

  const statusColor =
    syncState === "done" ? "text-emerald-600"
    : syncState === "error" ? "text-rose-600"
    : "text-slate-400";

  return (
    <Motion.div
      className="fixed inset-0 flex overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <AuthRail />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-[300px] flex-col items-start">

          <Motion.h1
            className="mb-1 text-[22px] font-semibold tracking-tight text-slate-900"
            style={{ fontFamily: 'Charter, "Iowan Old Style", Georgia, serif' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Getting things ready
          </Motion.h1>
          <Motion.p
            className="mb-8 text-[13px] text-slate-400"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
          >
            This only takes a moment.
          </Motion.p>

          {/* Progress bar */}
          <Motion.div
            className="mb-3 w-full"
            initial={{ opacity: 0, scaleX: 0.92 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.24, duration: 0.4 }}
          >
            <div className="mb-1.5 flex w-full justify-between">
              <span className="text-[11px] font-medium text-slate-400">Status</span>
              <span className={`text-[11px] font-medium tabular-nums ${statusColor}`}>
                {progress}%
              </span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
              <Motion.div
                className="h-full rounded-full"
                style={{ background: barColor, transformOrigin: "left" }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </Motion.div>

          {/* Status text */}
          <div className="flex h-4 w-full items-center">
            <AnimatePresence mode="wait">
              <Motion.p
                key={status}
                className={`text-[12px] ${statusColor}`}
                initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {status}
              </Motion.p>
            </AnimatePresence>
          </div>

          {/* Startup error detail — only present when the bundled server failed to start */}
          {syncState === "error" && errorDetail && (
            <Motion.details
              className="mt-3 w-full text-[11px] text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <summary className="cursor-pointer select-none">Details for support</summary>
              <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-[10px] text-slate-500">
                {errorDetail}
              </pre>
            </Motion.details>
          )}

          {/* Syncing indicator — shown while connecting */}
          <AnimatePresence>
            {(syncState === null || syncState === "connecting") && (
              <Motion.div
                className="mt-5 flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                {[0, 1, 2].map((i) => (
                  <Motion.span
                    key={`intro-dot-${i}`}
                    className="block rounded-full"
                    style={{ width: 5, height: 5, background: "#1A318C" }}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                  />
                ))}
              </Motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </Motion.div>
  );
}
