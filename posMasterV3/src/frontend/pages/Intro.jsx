import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { onlineApi } from "../api/onlineApi";

const ONLINE_READY_TIMEOUT_MS = 45000;
const ONLINE_POLL_INTERVAL_MS = 750;

export default function Intro() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Starting up...");
  const [progress, setProgress] = useState(0);
  const [syncState, setSyncState] = useState(null); // null | 'connecting' | 'done' | 'error'

  useEffect(() => {
    const goToLogin = () => {
      navigate("/login");
    };

    const initializeApp = async () => {
      try {
        setStatus("Connecting to online server...");
        setProgress(10);

        const deadline = Date.now() + ONLINE_READY_TIMEOUT_MS;
        let ready = false;
        setSyncState("connecting");

        while (Date.now() < deadline) {
          const response = await onlineApi.ready().catch(() => null);
          if (response?.status === "success" && response?.data?.ready) {
            ready = true;
            break;
          }
          await new Promise(r => setTimeout(r, ONLINE_POLL_INTERVAL_MS));
          setProgress((current) => Math.min(current + 3, 90));
        }

        if (!ready) {
          throw new Error("Online server is not available");
        }

        setSyncState("done");
        setStatus("Online server ready");
        setProgress(100);

        await new Promise(r => setTimeout(r, 600));
        goToLogin();

      } catch (error) {
        console.error("[Intro] Initialization error:", error);
        setStatus("Online server unavailable. Please check the connection.");
        setSyncState("error");
        setProgress(100);
      }
    };

    initializeApp();
  }, [navigate]);

  const barColor =
    syncState === "done" ? "#10b981"
    : syncState === "error" ? "#ef4444"
    : "#1A318C";

  const statusColor =
    syncState === "done" ? "text-emerald-500"
    : syncState === "error" ? "text-rose-500"
    : "text-slate-400";

  return (
    <Motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#ffffff" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >

      <div className="flex flex-col items-center w-full max-w-[280px]">

        {/* Logo */}
        <Motion.div
          className="mb-6"
          initial={{ scale: 0.5, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div
            className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #1e3ba8 0%, #152870 100%)",
              boxShadow: "0 8px 32px rgba(26,49,140,0.28), 0 2px 8px rgba(26,49,140,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </Motion.div>

        {/* Title */}
        <Motion.h1
          className="text-[28px] font-bold tracking-tight mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span style={{ color: "#1A318C" }}>POS</span>
          <span className="text-slate-800"> MASTER</span>
          <span className="text-slate-400 font-normal">.3</span>
        </Motion.h1>

        {/* Progress bar */}
        <Motion.div
          className="w-full mb-3"
          initial={{ opacity: 0, scaleX: 0.92 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.22, duration: 0.4 }}
        >
          <div className="w-full flex justify-end mb-1.5">
            <Motion.span
              className={`text-[11px] font-medium tabular-nums ${statusColor}`}
              animate={{ opacity: 1 }}
            >
              {progress}%
            </Motion.span>
          </div>
          <div
            className="w-full h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(26,49,140,0.1)" }}
          >
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
        <div className="h-4 w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <Motion.p
              key={status}
              className={`text-[11px] tracking-wide text-center ${statusColor}`}
              initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {status}
            </Motion.p>
          </AnimatePresence>
        </div>

        {/* Syncing indicator — shown while connecting OR syncing */}
        <AnimatePresence>
          {(syncState === null || syncState === "connecting") && (
            <Motion.div
              className="mt-4 flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {[0, 1, 2].map((i) => (
                <Motion.span
                  key={i}
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

      {/* Footer */}
      <Motion.p
        className="absolute bottom-5 text-[11px] text-slate-400 tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        © 2025 SLTC ® · v{import.meta.env.VITE_VERSION_NUMBER}
      </Motion.p>
    </Motion.div>
  );
}
