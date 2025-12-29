import React, { useState, useEffect, useMemo } from "react";
import { Search, X, User, CreditCard, Clock, AlertTriangle, CheckCircle, UserCheck, Users, Leaf, Banknote, RefreshCw } from "lucide-react";
import { teaCoopApi } from "../../../api/localApi";
import { useReactiveData, TABLES } from "../../../store";

function MemEvaluationModal({ isOpen, closeModal, onSelectMember, currentMember }) {
  const [activeTab, setActiveTab] = useState("search"); // search | details
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Use reactive data hook for Tea Coop members
  const { data: members, loading: isLoading, refetch } = useReactiveData(
    TABLES.TEA_COOP_MEMBERS,
    null,
    { enabled: isOpen }
  );

  // Filter members based on search using useMemo
  const filteredMembers = useMemo(() => {
    const safeMembers = members || [];
    if (searchTerm.trim() === "") {
      return safeMembers;
    }
    const term = searchTerm.toLowerCase();
    return safeMembers.filter(m =>
      (m.full_name || "").toLowerCase().includes(term) ||
      (m.member_no || "").toLowerCase().includes(term) ||
      (m.member_id || "").toLowerCase().includes(term) ||
      (m.contact || "").includes(term)
    );
  }, [searchTerm, members]);

  // Sync members from external API with progress simulation
  const handleSyncMembers = async () => {
    setSyncing(true);
    setSyncProgress(0);

    // Simulate progress while syncing
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) return prev; // Cap at 90% until complete
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await teaCoopApi.syncMembers();
      setSyncProgress(100);
      await refetch();
    } catch (error) {
      console.error("[MemEvaluationModal] Error syncing members:", error);
    } finally {
      clearInterval(progressInterval);
      // Keep 100% shown briefly before hiding
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress(0);
      }, 500);
    }
  };

  // Guest user object
  const guestUser = {
    id: 0,
    _id: "guest",
    member_no: "GUEST",
    full_name: "Guest Customer",
    contact: "-",
    address: "-",
    credit_balance: 0,
    credit_limit: 0,
    member_type: "guest",
    is_guest: true
  };

  // Handle current member selection when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentMember && !currentMember.is_guest) {
        setSelectedMember(currentMember);
        setActiveTab("details");
        fetchPaymentHistory(currentMember.member_id);
      } else {
        setSelectedMember(null);
        setActiveTab("search");
      }
    }
  }, [isOpen, currentMember]);

  // Fetch payment history from Tea Coop API
  const fetchPaymentHistory = async (memberId) => {
    if (!memberId) return;
    setHistoryLoading(true);
    try {
      const response = await teaCoopApi.getPaymentHistory(memberId, 6);
      if (response.status === "success") {
        setPaymentHistory(response.data || []);
      }
    } catch (error) {
      console.error("[MemEvaluationModal] Error fetching payment history:", error);
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setActiveTab("details");
    if (!member.is_guest) {
      fetchPaymentHistory(member.member_id);
    } else {
      setPaymentHistory([]);
    }
  };

  const handleConfirmSelection = () => {
    if (onSelectMember && selectedMember) {
      // Add member_type to distinguish tea_coop members from regular members
      const memberWithType = selectedMember.is_guest
        ? selectedMember
        : { ...selectedMember, member_type: 'tea_coop' };
      onSelectMember(memberWithType);
    }
    closeModal();
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  const formatMonthYear = (year, month) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  // Calculate payment history totals
  const totalGreenLeaf = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.green_leaf_value) || 0), 0);
  const totalLoans = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.loans) || 0), 0);
  const totalNetAmount = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.net_amount) || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={closeModal} />

      {/* Modal Content */}
      <div
        className="relative z-[20] bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[1200px] h-[85vh] max-h-[750px] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
          {/* Select Customer Button */}
          {selectedMember && (
            <button
              onClick={handleConfirmSelection}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
            >
              <UserCheck className="w-5 h-5" />
              Select Customer
            </button>
          )}
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Left Panel - Member Search/List */}
        <div className="w-[380px] bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">Select Member</h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {filteredMembers.length}
                </span>
              </div>
              <button
                onClick={handleSyncMembers}
                disabled={syncing}
                className="p-2 text-gray-500 hover:text-[#1A318C] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                title="Sync from Tea Coop API"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="text-sm text-gray-500">Choose Tea Coop member or continue as guest</p>

            {/* Sync Progress Bar */}
            {syncing && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#1A318C] font-medium">Syncing members...</span>
                  <span className="text-xs text-[#1A318C] font-semibold">{Math.round(syncProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1A318C] rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Guest Selection */}
          <div className="p-4">
            <button
              onClick={() => handleSelectMember(guestUser)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selectedMember?.is_guest
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedMember?.is_guest ? "bg-emerald-500" : "bg-gray-200"
              }`}>
                <User className={`w-6 h-6 ${selectedMember?.is_guest ? "text-white" : "text-gray-500"}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-800">Guest Customer</p>
                <p className="text-xs text-gray-500">Cash payment only</p>
              </div>
              {selectedMember?.is_guest && (
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="px-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Or select member</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID or phone..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-3"></div>
                <span className="text-sm text-gray-500">Loading members...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Users className="w-12 h-12 mb-3 text-gray-200" />
                <span className="text-sm">No members found</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  // Use member_no as the unique identifier since id/_id may be undefined
                  const memberId = member.member_no || member.id || member._id;
                  const selectedId = selectedMember?.member_no || selectedMember?.id || selectedMember?._id;
                  const isSelected = selectedMember && memberId && selectedId && memberId === selectedId;
                  return (
                    <button
                      key={memberId}
                      onClick={() => handleSelectMember(member)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm transition-colors ${
                        isSelected
                          ? "bg-emerald-500"
                          : "bg-[#1A318C]"
                      }`}>
                        {(member.full_name || "M")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`font-semibold truncate transition-colors ${
                          isSelected ? "text-emerald-700" : "text-gray-800"
                        }`}>{member.full_name}</p>
                        <p className="text-xs text-gray-500">{member.member_no} • {member.contact || "-"}</p>
                      </div>
                      {isSelected ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                      ) : (member.credit_balance || 0) > 0 ? (
                        <div className="px-2 py-1 bg-amber-100 rounded-lg shrink-0">
                          <span className="text-xs font-semibold text-amber-700">
                            {formatCurrency(member.credit_balance)}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Member Details & Transactions */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedMember ? (
            <>
              {/* Member Info Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start gap-5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 ${
                    selectedMember.is_guest ? "bg-emerald-500" : "bg-[#1A318C]"
                  }`}>
                    {selectedMember.is_guest ? <User className="w-8 h-8" /> : (selectedMember.full_name || "M")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-gray-800 truncate">{selectedMember.full_name}</h3>
                      {selectedMember.is_guest ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold shrink-0">
                          Guest
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold shrink-0">
                          Member
                        </span>
                      )}
                    </div>
                    {!selectedMember.is_guest && (
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>ID: {selectedMember.member_no}</span>
                        <span>Phone: {selectedMember.contact || "-"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tea Coop Info for Members */}
                {!selectedMember.is_guest && (
                  <div className="grid grid-cols-3 gap-4 mt-5">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                          <Leaf className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-emerald-600 font-medium uppercase">Green Leaf Value</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedMember.green_leaf_value || 0)}</p>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-amber-600 font-medium uppercase">Loans</span>
                      </div>
                      <p className="text-xl font-bold text-amber-700">{formatCurrency(selectedMember.loans || 0)}</p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1A318C] flex items-center justify-center">
                          <Banknote className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-[#1A318C] font-medium uppercase">Net Amount</span>
                      </div>
                      <p className="text-xl font-bold text-[#1A318C]">
                        {formatCurrency(selectedMember.net_amount || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {!selectedMember.is_guest && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Section Header */}
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <h4 className="font-semibold text-gray-700">Payment History</h4>
                      <span className="text-sm text-gray-400">• Last 6 months</span>
                    </div>
                  </div>

                  {/* Payment History Table */}
                  <div className="flex-1 overflow-y-auto">
                    {historyLoading ? (
                      <div className="flex flex-col items-center justify-center h-40">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-3"></div>
                        <span className="text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : paymentHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Clock className="w-10 h-10 text-gray-200 mb-2" />
                        <span className="text-sm">No payment history available</span>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="text-xs text-gray-500 uppercase tracking-wide">
                            <th className="text-left py-3 px-6 font-semibold">Month</th>
                            <th className="text-right py-3 px-4 font-semibold">Green Leaf</th>
                            <th className="text-right py-3 px-4 font-semibold">Loans</th>
                            <th className="text-right py-3 px-6 font-semibold">Net Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paymentHistory.map((payment, index) => {
                            const hasData = (parseFloat(payment.green_leaf_value) || 0) > 0 ||
                                           (parseFloat(payment.loans) || 0) > 0 ||
                                           (parseFloat(payment.net_amount) || 0) > 0;
                            return (
                              <tr
                                key={payment.id || index}
                                className={`hover:bg-gray-50 transition-colors ${!hasData ? "opacity-50" : ""}`}
                              >
                                <td className="py-3 px-6">
                                  <span className="font-medium text-gray-800">
                                    {formatMonthYear(payment.year, payment.month)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`font-medium tabular-nums ${hasData ? "text-emerald-600" : "text-gray-400"}`}>
                                    {formatCurrency(payment.green_leaf_value)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`font-medium tabular-nums ${parseFloat(payment.loans) > 0 ? "text-amber-600" : "text-gray-400"}`}>
                                    {formatCurrency(payment.loans)}
                                  </span>
                                </td>
                                <td className="py-3 px-6 text-right">
                                  <span className={`font-semibold tabular-nums ${hasData ? "text-gray-800" : "text-gray-400"}`}>
                                    {formatCurrency(payment.net_amount)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Fixed Totals Row at Bottom */}
                  {paymentHistory.length > 0 && (
                    <div className="border-t-2 border-gray-200 bg-gray-50">
                      <div className="grid grid-cols-4 py-3 font-semibold">
                        <div className="px-6 text-gray-700">Total</div>
                        <div className="px-4 text-right text-emerald-600 tabular-nums">{formatCurrency(totalGreenLeaf)}</div>
                        <div className="px-4 text-right text-amber-600 tabular-nums">{formatCurrency(totalLoans)}</div>
                        <div className="px-6 text-right text-gray-800 tabular-nums">{formatCurrency(totalNetAmount)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Guest Info */}
              {selectedMember.is_guest && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                    <User className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-2">Guest Customer Selected</h4>
                  <p className="text-gray-500 max-w-md mb-6">
                    This customer will proceed with cash payment only. No transaction history will be tracked.
                  </p>
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-medium">Credit payment not available for guests</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No Selection State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
              <Users className="w-20 h-20 mb-4 text-gray-200" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Select a Customer</h4>
              <p className="text-sm">Choose Guest for cash payment or select a registered member</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemEvaluationModal;
