import React from "react";
import { getCurrentDate } from "../../../util/common/date";

// Top bar of the mid (transaction) column: supplier badge, prepared-by /
// authorized-by selects, date/invoice display, and Clear/Done buttons.
export default function RestockTransactionHeader({
  transactionData,
  setTransactionData,
  transactionErrors,
  setTransactionErrors,
  handleTransactionDataInputChange,
  users,
  invoiceGenerate,
  setInvoiceGenerate,
  registerTransaction,
}) {
  return (
    <div className="bg-white border-b border-gray-100 p-5">
      <div className="flex flex-row gap-8">
        <div className="flex flex-col flex-1 gap-4">
          <div className="bg-gradient-to-r from-[#1A318C] to-[#2a4399] rounded-xl p-4 text-white">
            <p className="text-xs uppercase tracking-wide opacity-80">Supplier</p>
            <p className="text-xl font-bold">{transactionData.supplierName || 'Not selected'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Prepared by
              </label>
              <select
                name="preparedBy"
                value={transactionData.preparedBy}
                onChange={(e) => {
                  handleTransactionDataInputChange(e);
                  const selectedUsername = e.target.value;
                  const selectedUser = (users || []).find(user => user.username === selectedUsername);
                  if (selectedUser) {
                    setTransactionData(prev => ({ ...prev, prep_id: selectedUser.id || selectedUser._id }));
                    setTransactionErrors(prev => {
                      const next = { ...prev };
                      delete next.preparedBy;
                      return next;
                    });
                  }
                }}
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                  transactionErrors.preparedBy
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]'
                }`}
              >
                <option value="">Select employee</option>
                {(users || []).map((user, index) => (
                  <option key={`${user.id || user._id || user.username || "user"}-${index}`} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
              {transactionErrors.preparedBy && (
                <p className="text-red-500 text-xs mt-1">{transactionErrors.preparedBy}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Authorized by
              </label>
              <select
                name="authorizedBy"
                value={transactionData.authorizedBy}
                onChange={(e) => {
                  handleTransactionDataInputChange(e);
                  const selectedUsername = e.target.value;
                  const selectedUser = (users || []).find(user => user.username === selectedUsername);
                  if (selectedUser) {
                    setTransactionData(prev => ({ ...prev, auth_id: selectedUser.id || selectedUser._id }));
                    setTransactionErrors(prev => {
                      const next = { ...prev };
                      delete next.authorizedBy;
                      return next;
                    });
                  }
                }}
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                  transactionErrors.authorizedBy
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-200 focus:ring-[#1A318C]/20 focus:border-[#1A318C]'
                }`}
              >
                <option value="">Select employee</option>
                {(users || []).map((user, index) => (
                  <option key={`${user.id || user._id || user.username || "user"}-${index}`} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
              {transactionErrors.authorizedBy && (
                <p className="text-red-500 text-xs mt-1">{transactionErrors.authorizedBy}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col w-64 gap-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-lg font-bold text-gray-800">{getCurrentDate()}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Invoice No</p>
            <p className="text-lg font-bold text-white font-mono">{transactionData.invoiceNo}</p>
          </div>
          <div className="flex flex-row gap-2 mt-auto">
            <button
              onClick={() => {
                setInvoiceGenerate(invoiceGenerate + 1);
              }}
              className="flex-1 h-10 px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Clear
            </button>
            <button
              onClick={() => {
                registerTransaction();
              }}
              className="flex-1 h-10 px-4 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
