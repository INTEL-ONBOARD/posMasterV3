import React, { useState, useEffect } from "react";
import { Search, X, User, CreditCard, Clock, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, UserCheck, Users } from "lucide-react";
import { memberApi, salesApi } from "../../../api/localApi";

function MemEvaluationModal({ isOpen, closeModal, onSelectMember, currentMember }) {
  const [activeTab, setActiveTab] = useState("search"); // search | details
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTransactions, setMemberTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

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

  // Fetch all members on mount
  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      if (currentMember && !currentMember.is_guest) {
        setSelectedMember(currentMember);
        setActiveTab("details");
        fetchMemberTransactions(currentMember.id || currentMember._id);
      } else {
        setSelectedMember(null);
        setActiveTab("search");
      }
    }
  }, [isOpen, currentMember]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await memberApi.getAll();
      if (response.status === "success") {
        setMembers(response.data || []);
        setFilteredMembers(response.data || []);
      }
    } catch (error) {
      console.error("[MemEvaluationModal] Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberTransactions = async (memberId) => {
    setTransactionsLoading(true);
    try {
      // Get transactions for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const response = await salesApi.getByMember(memberId);
      if (response.status === "success") {
        // Filter to last 6 months
        const filtered = (response.data || []).filter(t => {
          const transDate = new Date(t.created_at);
          return transDate >= sixMonthsAgo;
        });
        setMemberTransactions(filtered);
      }
    } catch (error) {
      console.error("[MemEvaluationModal] Error fetching transactions:", error);
      setMemberTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Filter members based on search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMembers(members);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = members.filter(m =>
        (m.full_name || "").toLowerCase().includes(term) ||
        (m.member_no || "").toLowerCase().includes(term) ||
        (m.contact || "").includes(term)
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, members]);

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setActiveTab("details");
    if (!member.is_guest) {
      fetchMemberTransactions(member.id || member._id);
    } else {
      setMemberTransactions([]);
    }
  };

  const handleConfirmSelection = () => {
    if (onSelectMember) {
      onSelectMember(selectedMember);
    }
    closeModal();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  // Calculate transaction summaries
  const totalPurchases = memberTransactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
  const cashPurchases = memberTransactions.filter(t => t.payment_method === "cash").reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
  const creditPurchases = memberTransactions.filter(t => t.payment_method === "credit").reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);

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
            <h2 className="text-lg font-bold text-gray-800 mb-1">Select Customer</h2>
            <p className="text-sm text-gray-500">Choose member or continue as guest</p>
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
                {filteredMembers.map((member) => (
                  <button
                    key={member.id || member._id}
                    onClick={() => handleSelectMember(member)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      selectedMember?.id === member.id || selectedMember?._id === member._id
                        ? "border-[#1A318C] bg-blue-50"
                        : "border-transparent bg-white hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                      selectedMember?.id === member.id || selectedMember?._id === member._id
                        ? "bg-[#1A318C]"
                        : "bg-gray-400"
                    }`}>
                      {(member.full_name || "M")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-800 truncate">{member.full_name}</p>
                      <p className="text-xs text-gray-500">{member.member_no} • {member.contact || "-"}</p>
                    </div>
                    {(member.credit_balance || 0) > 0 && (
                      <div className="px-2 py-1 bg-amber-100 rounded-lg">
                        <span className="text-xs font-semibold text-amber-700">
                          {formatCurrency(member.credit_balance)}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
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

                {/* Credit Info for Members */}
                {!selectedMember.is_guest && (
                  <div className="grid grid-cols-3 gap-4 mt-5">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-emerald-600 font-medium uppercase">Credit Limit</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedMember.credit_limit || 0)}</p>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-amber-600 font-medium uppercase">Credit Used</span>
                      </div>
                      <p className="text-xl font-bold text-amber-700">{formatCurrency(selectedMember.credit_balance || 0)}</p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1A318C] flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-[#1A318C] font-medium uppercase">Available</span>
                      </div>
                      <p className="text-xl font-bold text-[#1A318C]">
                        {formatCurrency((selectedMember.credit_limit || 0) - (selectedMember.credit_balance || 0))}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction History */}
              {!selectedMember.is_guest && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Section Header */}
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <h4 className="font-semibold text-gray-700">Transaction History (Last 6 Months)</h4>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">Total: <strong className="text-gray-800">{formatCurrency(totalPurchases)}</strong></span>
                        <span className="text-emerald-600">Cash: <strong>{formatCurrency(cashPurchases)}</strong></span>
                        <span className="text-amber-600">Credit: <strong>{formatCurrency(creditPurchases)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="flex-1 overflow-y-auto">
                    {transactionsLoading ? (
                      <div className="flex flex-col items-center justify-center h-40">
                        <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-3"></div>
                        <span className="text-sm text-gray-500">Loading transactions...</span>
                      </div>
                    ) : memberTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Clock className="w-12 h-12 mb-3 text-gray-200" />
                        <span className="text-sm">No transactions in the last 6 months</span>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-slate-800 text-white sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Invoice</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {memberTransactions.map((transaction, index) => (
                            <tr key={transaction.id || index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(transaction.created_at)}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                                  {transaction.invoice_no || "-"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                                  transaction.payment_method === "cash"
                                    ? "bg-emerald-500 text-white"
                                    : transaction.payment_method === "credit"
                                    ? "bg-amber-500 text-white"
                                    : "bg-gray-500 text-white"
                                }`}>
                                  {transaction.payment_method || "N/A"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-bold text-gray-800 tabular-nums">
                                  {formatCurrency(transaction.total_amount)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
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
