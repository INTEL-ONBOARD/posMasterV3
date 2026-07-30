import React from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export default function BellIcon({ type }) {
  if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (type === "error") return <XCircle className="h-4 w-4 text-rose-600" />;
  return <Clock3 className="h-4 w-4 text-blue-600" />;
}
