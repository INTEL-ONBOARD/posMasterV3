import React from "react";

export default function StatCard({ label, value, hint, icon, tone = "blue", compact = false }) {
  const IconComponent = icon;
  const tones = {
    blue: "bg-[#1A318C]/10 text-[#1A318C]",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <div className={`flex items-start justify-between gap-3 ${compact ? "" : ""}`}>
        <div>
          <p className={`font-semibold uppercase tracking-wide text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>{label}</p>
          <p className={`font-bold text-slate-800 tabular-nums ${compact ? "mt-1 text-xl" : "mt-1 text-2xl"}`}>{value}</p>
          {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
          {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
        </div>
      </div>
    </div>
  );
}
