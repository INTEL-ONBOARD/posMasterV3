import React, { useMemo } from "react";
import { ClipboardCheck } from "lucide-react";
import Sidebar from "../../components/Sidebar.jsx";
import ManagerApprovalTab from "./ManagerApprovalTab.jsx";
import { useReactiveData, TABLES } from "../../store";

export default function ManagerApprovalPage() {
  const { data: branchRows = [], loading } = useReactiveData(TABLES.BRANCHES, null, {
    initialData: [],
  });

  const branches = useMemo(
    () => branchRows.filter((branch) => branch && branch.is_active !== false && branch.isActive !== false),
    [branchRows]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="min-h-screen pl-[128px]">
        <div className="mx-auto max-w-[1800px] px-4 py-6 lg:px-6">
          <div className="mb-5 rounded-3xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#1A318C]/10 bg-[#1A318C]/5 px-3 py-1.5 text-xs font-semibold text-[#1A318C]">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Manager Approvals
                </div>
                <h1 className="mt-3 text-3xl font-black text-slate-900">Manager Approvals</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Review and manage branch transfer requests.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-10 shadow-sm">
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1A318C]" />
              </div>
            </div>
          ) : (
            <ManagerApprovalTab branches={branches} />
          )}
        </div>
      </main>
    </div>
  );
}
