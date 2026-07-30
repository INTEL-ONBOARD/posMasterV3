import React from "react";
import { statusMeta } from "../utils/transferHelpers";

export default function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}
