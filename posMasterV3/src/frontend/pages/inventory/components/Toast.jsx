import React from "react";
import BellIcon from "./BellIcon.jsx";

export default function Toast({ toast }) {
  if (!toast) return null;

  const toneClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <div className="fixed right-5 top-5 z-50 w-full max-w-sm">
      <div className={`rounded-2xl border px-4 py-3 shadow-xl ${toneClasses[toast.type] || toneClasses.info}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-white/60 p-2">
            <BellIcon type={toast.type} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{toast.title}</p>
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
