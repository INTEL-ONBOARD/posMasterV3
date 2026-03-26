import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const SYNC_TIMEOUT_MS = 60000;
const MYSQL_READY_TIMEOUT_MS = 45000;
const MYSQL_POLL_INTERVAL_MS = 500;
const OFFLINE_PAUSE_MS = 2000;
const BACKEND_READY_TIMEOUT_MS = 20000;

const TABLE_LABELS = {
  users: "Users",
  categories: "Categories",
  units_of_measurement: "Units of Measurement",
  branches: "Branches",
  suppliers: "Suppliers",
  items: "Products",
  stock: "Stock",
  restock_transactions: "Restock Records",
  restock_items: "Restock Items",
  return_items: "Return Items",
  members: "Members",
  sales_transactions: "Sales Transactions",
  sales_items: "Sales Items",
  disposed_items: "Disposed Items",
  offers_discounts: "Offers & Discounts",
  returned_items: "Customer Returns",
  user_settings: "User Settings",
  login_history: "Login History",
  active_sessions: "Active Sessions",
  payment_methods: "Payment Methods",
  tea_coop_members: "Tea Coop Members",
  tea_coop_payments: "Tea Coop Payments",
};

export default function Intro() {
  const navigate = useNavigate();
  const syncDoneRef = useRef(false);

  const [status, setStatus] = useState("Starting up...");
  const [progress, setProgress] = useState(0);
  const [syncState, setSyncState] = useState(null); // null | 'syncing' | 'done' | 'offline' | 'error'

  useEffect(() => {
    let unsubs = [];
    let timeoutHandle = null;

    const unsub = (fn) => { if (fn) unsubs.push(fn); };

    const goToLogin = () => {
      unsubs.forEach(fn => { try { fn(); } catch (e) {} });
      if (timeoutHandle) clearTimeout(timeoutHandle);
      navigate("/login");
    };

    const initializeApp = async () => {
      try {
        setStatus("Connecting to database...");
        setProgress(10);

        if (window.electronAPI?.database?.getStatus) {
          const deadline = Date.now() + BACKEND_READY_TIMEOUT_MS;
          let initialized = false;
          while (Date.now() < deadline) {
            const dbStatus = await window.electronAPI.database.getStatus();
            if (dbStatus?.initialized) { initialized = true; break; }
            await new Promise(r => setTimeout(r, 500));
          }
          if (!initialized) throw new Error("Database not initialized");
        } else {
          await new Promise(r => setTimeout(r, 400));
        }

        setStatus("Database ready");
        setProgress(25);

        setStatus("Checking cloud connection...");
        setProgress(35);

        let isOnline = false;
        let mysqlReady = false;

        if (window.electronAPI?.cloudSync?.getStatus) {
          const deadline = Date.now() + MYSQL_READY_TIMEOUT_MS;
          while (Date.now() < deadline) {
            const res = await window.electronAPI.cloudSync.getStatus();
            if (res?.status === "success") {
              isOnline = res.data?.isOnline ?? false;
              mysqlReady = res.data?.mysqlInitialized ?? false;
              if (isOnline && mysqlReady) break;
            }
            await new Promise(r => setTimeout(r, MYSQL_POLL_INTERVAL_MS));
          }
        }

        if (isOnline && mysqlReady) {
          setSyncState("syncing");
          setStatus("Syncing data from cloud...");
          setProgress(45);

          unsub(window.electronAPI?.onSyncTableProgress?.((data) => {
            const { table, index, total } = data;
            const label = TABLE_LABELS[table] ?? table;
            setStatus(`Syncing ${label}...`);
            setProgress(45 + Math.round((index / Math.max(total, 1)) * 50));
          }));

          await new Promise((resolve) => {
            const handleComplete = (data) => {
              if (syncDoneRef.current) return;
              syncDoneRef.current = true;
              const success = data?.success ?? true;
              setSyncState(success ? "done" : "error");
              setProgress(100);
              setStatus(success ? "Sync complete" : "Sync completed with issues");
              resolve();
            };

            unsub(window.electronAPI?.onSyncCompleted?.(handleComplete));

            timeoutHandle = setTimeout(() => {
              if (syncDoneRef.current) return;
              syncDoneRef.current = true;
              setSyncState("error");
              setStatus("Sync timed out — starting offline");
              setProgress(100);
              resolve();
            }, SYNC_TIMEOUT_MS);

            window.electronAPI?.cloudSync?.getStatus().then((res) => {
              if (syncDoneRef.current) return;
              if (res?.data?.lastSyncTime) {
                syncDoneRef.current = true;
                setSyncState("done");
                setStatus("Sync complete");
                setProgress(100);
                resolve();
              } else {
                window.electronAPI?.cloudSync?.forceFullSync?.().catch(() => {});
              }
            }).catch(() => {
              window.electronAPI?.cloudSync?.forceFullSync?.().catch(() => {});
            });
          });

        } else {
          setSyncState("offline");
          setStatus("No cloud connection — starting offline");
          setProgress(100);
          await new Promise(r => setTimeout(r, OFFLINE_PAUSE_MS));
        }

        await new Promise(r => setTimeout(r, 600));
        goToLogin();

      } catch (error) {
        console.error("[Intro] Initialization error:", error);
        setStatus("Could not connect — starting offline");
        setSyncState("offline");
        setProgress(100);
        setTimeout(goToLogin, OFFLINE_PAUSE_MS);
      }
    };

    initializeApp();
    return () => {
      unsubs.forEach(fn => { try { fn(); } catch (e) {} });
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [navigate]);

  const barColor =
    syncState === "done" ? "#10b981"
    : syncState === "offline" || syncState === "error" ? "#f59e0b"
    : "#1A318C";

  const statusColor =
    syncState === "done" ? "text-emerald-500"
    : syncState === "offline" || syncState === "error" ? "text-amber-500"
    : "text-slate-400";

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#ffffff" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >

      <div className="flex flex-col items-center w-full max-w-[280px]">

        {/* Logo */}
        <motion.div
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
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-[28px] font-bold tracking-tight mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span style={{ color: "#1A318C" }}>POS</span>
          <span className="text-slate-800"> MASTER</span>
          <span className="text-slate-400 font-normal">.3</span>
        </motion.h1>

        {/* Progress bar */}
        <motion.div
          className="w-full mb-3"
          initial={{ opacity: 0, scaleX: 0.92 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.22, duration: 0.4 }}
        >
          <div className="w-full flex justify-end mb-1.5">
            <motion.span
              className={`text-[11px] font-medium tabular-nums ${statusColor}`}
              animate={{ opacity: 1 }}
            >
              {progress}%
            </motion.span>
          </div>
          <div
            className="w-full h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(26,49,140,0.1)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: barColor, transformOrigin: "left" }}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </motion.div>

        {/* Status text */}
        <div className="h-4 w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              className={`text-[11px] tracking-wide text-center ${statusColor}`}
              initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {status}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Syncing indicator — shown while connecting OR syncing */}
        <AnimatePresence>
          {(syncState === null || syncState === "syncing") && (
            <motion.div
              className="mt-4 flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block rounded-full"
                  style={{ width: 5, height: 5, background: "#1A318C" }}
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-5 text-[11px] text-slate-400 tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        © 2025 SLTC ® · v{import.meta.env.VITE_VERSION_NUMBER}
      </motion.p>
    </motion.div>
  );
}
