import React, { useState, useEffect } from 'react';
import {
  Bell, HelpCircle, Send, CheckCircle, XCircle, Trash2, BellRing,
  TrendingUp, Package, Users, AlertTriangle, DollarSign, ShoppingCart,
  Clock, Calendar, Activity, RefreshCw, User, Shield, Eye,
  Boxes, ArrowUpRight, ArrowDownRight, BarChart3, Layers, Receipt,
  FileText, Settings, Database, Wifi, WifiOff, UserCheck, History
} from 'lucide-react';
import NotificationCard from '../../components/NotificationCard';
import { localAuth } from '../../api/services/localAuth';
import { salesApi, stockApi, memberApi, supplierApi, itemApi, userApi, loginHistoryApi } from '../../api/localApi';

function Dashboard() {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({
    todaySales: 0,
    totalItems: 0,
    lowStockItems: 0,
    totalMembers: 0,
    totalSuppliers: 0,
    expiringItems: 0,
    totalUsers: 0,
    activeSessions: 0,
    totalSalesCount: 0,
    weekSales: 0,
    monthSales: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Admin-specific data
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [dailySales, setDailySales] = useState([]);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  // Get greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await localAuth.getCurrentUser();
        setCurrentUser(user);
        // Check if user is admin
        const userRoles = user?.roles || [];
        setIsAdmin(userRoles.includes('admin') || userRoles.includes('superadmin') || userRoles.includes('Admin'));
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        // Get date ranges
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Basic stats for all users
        const basicPromises = [
          salesApi.getSummary(startOfDay, endOfDay).catch(() => ({ data: { total_sales: 0, count: 0 } })),
          itemApi.getAll().catch(() => ({ data: [] })),
          stockApi.getLowStock().catch(() => ({ data: [] })),
          memberApi.getAll().catch(() => ({ data: [] })),
          supplierApi.getAll().catch(() => ({ data: [] })),
          stockApi.getExpiring(30).catch(() => ({ data: [] })),
        ];

        // Admin-only stats
        const adminPromises = isAdmin ? [
          userApi.getAll().catch(() => ({ data: [] })),
          loginHistoryApi.getActiveSessions().catch(() => ({ data: [] })),
          salesApi.getSummary(startOfWeek, endOfDay).catch(() => ({ data: { total_sales: 0 } })),
          salesApi.getSummary(startOfMonth, endOfDay).catch(() => ({ data: { total_sales: 0 } })),
          salesApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
          salesApi.getDaily(7).catch(() => ({ data: [] })),
          loginHistoryApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
        ] : [];

        const [salesRes, itemsRes, lowStockRes, membersRes, suppliersRes, expiringRes] = await Promise.all(basicPromises);

        let adminData = {};
        if (isAdmin && adminPromises.length > 0) {
          const [usersRes, sessionsRes, weekSalesRes, monthSalesRes, recentSalesRes, dailySalesRes, loginsRes] = await Promise.all(adminPromises);
          adminData = {
            totalUsers: usersRes?.data?.length || 0,
            activeSessions: sessionsRes?.data?.length || 0,
            weekSales: weekSalesRes?.data?.total_sales || weekSalesRes?.data?.total_amount || 0,
            monthSales: monthSalesRes?.data?.total_sales || monthSalesRes?.data?.total_amount || 0,
          };
          setRecentSales(recentSalesRes?.data || []);
          setLowStockList((lowStockRes?.data || []).slice(0, 5));
          setDailySales(dailySalesRes?.data || []);
          setRecentLogins(loginsRes?.data || []);
        }

        setStats({
          todaySales: salesRes?.data?.total_sales || salesRes?.data?.total_amount || 0,
          totalSalesCount: salesRes?.data?.count || salesRes?.data?.total_count || 0,
          totalItems: itemsRes?.data?.length || 0,
          lowStockItems: lowStockRes?.data?.length || 0,
          totalMembers: membersRes?.data?.length || 0,
          totalSuppliers: suppliersRes?.data?.length || 0,
          expiringItems: expiringRes?.data?.length || 0,
          ...adminData,
        });

        // Generate notifications
        const newNotifications = [];
        if (lowStockRes?.data?.length > 0) {
          newNotifications.push({
            id: 1,
            title: 'Low Stock Alert',
            description: `${lowStockRes.data.length} item(s) are running low on stock`,
            date: 'Now',
            type: 'warning'
          });
        }
        if (expiringRes?.data?.length > 0) {
          newNotifications.push({
            id: 2,
            title: 'Expiring Items',
            description: `${expiringRes.data.length} item(s) will expire within 30 days`,
            date: 'Now',
            type: 'error'
          });
        }
        newNotifications.push({
          id: 3,
          title: 'System Ready',
          description: 'All systems are operational and running smoothly',
          date: 'Just now',
          type: 'success'
        });

        setNotifications(newNotifications);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (currentUser) {
      fetchStats();
    }
  }, [currentUser, isAdmin]);

  // Handle notification removal
  const handleRemoveNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  // Handle feedback
  const handleFeedbackChange = (e) => {
    setFeedbackText(e.target.value);
    setFeedbackActive(e.target.value.trim().length > 0);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackActive || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitted(true);
      setSubmitSuccess(Math.random() < 0.8);
      setTimeout(() => {
        setFeedbackText('');
        setFeedbackActive(false);
        setSubmitted(false);
        setSubmitting(false);
      }, 2500);
    }, 800);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Refresh handler
  const handleRefresh = () => {
    window.location.reload();
  };

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  if (isAdmin) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        {/* Admin Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A318C] to-[#152870] flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800">{greeting},</h1>
                  <span className="text-2xl font-bold text-[#1A318C]">{currentUser?.full_name?.split(' ')[0] || 'Admin'}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-gradient-to-r from-[#1A318C] to-[#152870] rounded-full">Admin</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">{currentDate}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingStats ? 'animate-spin' : ''}`} />
              </button>

              <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{currentUser?.full_name || currentUser?.username}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            {/* Today's Sales */}
            <div className="col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-80" />
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Today</span>
              </div>
              <p className="text-3xl font-bold">{loadingStats ? '...' : formatCurrency(stats.todaySales)}</p>
              <p className="text-sm opacity-80 mt-1">Today's Revenue</p>
            </div>

            {/* Week Sales */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-800">{loadingStats ? '...' : formatCurrency(stats.weekSales)}</p>
              <p className="text-xs text-gray-500 mt-1">This Week</p>
            </div>

            {/* Month Sales */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-800">{loadingStats ? '...' : formatCurrency(stats.monthSales)}</p>
              <p className="text-xs text-gray-500 mt-1">This Month</p>
            </div>

            {/* Total Items */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#1A318C]" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-800">{loadingStats ? '...' : stats.totalItems}</p>
              <p className="text-xs text-gray-500 mt-1">Total Items</p>
            </div>

            {/* Low Stock */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                {stats.lowStockItems > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <p className="text-xl font-bold text-gray-800">{loadingStats ? '...' : stats.lowStockItems}</p>
              <p className="text-xs text-gray-500 mt-1">Low Stock</p>
            </div>

            {/* Total Users */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-800">{loadingStats ? '...' : stats.totalUsers}</p>
              <p className="text-xs text-gray-500 mt-1">Total Users</p>
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                {stats.activeSessions > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
              </div>
              <p className="text-xl font-bold text-gray-800">{loadingStats ? '...' : stats.activeSessions}</p>
              <p className="text-xs text-gray-500 mt-1">Active Now</p>
            </div>
          </div>

          {/* Middle Section: Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Sales */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-800">Recent Sales</h3>
                </div>
                <span className="text-xs text-gray-500">{recentSales.length} transactions</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {recentSales.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent sales</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Invoice</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Amount</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Method</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentSales.map((sale, idx) => (
                        <tr key={sale.id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-800">{sale.invoice_no}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{formatCurrency(sale.total_amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                              sale.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {sale.payment_method || 'cash'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-gray-800">Low Stock Items</h3>
                </div>
                <span className="text-xs text-amber-600 font-medium">{stats.lowStockItems} items need attention</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {lowStockList.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                    <p className="text-sm">All items are well stocked</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Item</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lowStockList.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-amber-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800 truncate max-w-[150px]">{item.item_name}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.sku}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-red-600">{item.quantity || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.threshold_limit || 10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent User Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <History className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="font-bold text-gray-800">Recent Logins</h3>
              </div>
              <div className="p-4 max-h-[250px] overflow-y-auto">
                {recentLogins.length === 0 ? (
                  <div className="text-center text-gray-400 py-6">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLogins.map((login, idx) => (
                      <div key={login.id || idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{login.username || login.full_name}</p>
                          <p className="text-xs text-gray-400">
                            {login.login_at ? new Date(login.login_at).toLocaleString() : '-'}
                          </p>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${login.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-[#1A318C]" />
                  </div>
                  <h3 className="font-bold text-gray-800">Alerts</h3>
                </div>
                {notifications.length > 0 && (
                  <button onClick={handleClearAllNotifications} className="text-xs text-red-500 hover:text-red-700">
                    Clear
                  </button>
                )}
              </div>
              <div className="p-4 max-h-[250px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-400 py-6">
                    <BellRing className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <NotificationCard
                        key={n.id}
                        title={n.title}
                        description={n.description}
                        date={n.date}
                        type={n.type}
                        onClose={() => handleRemoveNotification(n.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-800">Quick Summary</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-gray-600">Members</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.totalMembers}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm text-gray-600">Suppliers</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.totalSuppliers}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-600">Expiring Items</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">{stats.expiringItems}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm text-gray-600">Today's Transactions</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.totalSalesCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // COMMON USER DASHBOARD
  // ============================================
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A318C] to-[#152870] flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {greeting}, <span className="text-[#1A318C]">{currentUser?.full_name?.split(' ')[0] || currentUser?.username || 'User'}</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">{currentDate}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
              <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#1A318C]" />
              </div>
              <div className="pr-2">
                <p className="text-sm font-semibold text-gray-800">{currentUser?.full_name || currentUser?.username || 'User'}</p>
                <p className="text-xs text-gray-500">{currentUser?.email || 'user@posmaster.com'}</p>
              </div>
              <div className="pl-3 border-l border-gray-200">
                <span className="px-2 py-1 text-xs font-medium text-[#1A318C] bg-[#1A318C]/10 rounded-lg capitalize">
                  {currentUser?.roles?.[0] || 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{loadingStats ? '...' : formatCurrency(stats.todaySales)}</p>
            <p className="text-xs text-gray-500 mt-1">Today's Sales</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-[#1A318C]" />
              </div>
              <Boxes className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{loadingStats ? '...' : stats.totalItems}</p>
            <p className="text-xs text-gray-500 mt-1">Total Items</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              {stats.lowStockItems > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-2xl font-bold text-gray-800">{loadingStats ? '...' : stats.lowStockItems}</p>
            <p className="text-xs text-gray-500 mt-1">Low Stock Items</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <BarChart3 className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{loadingStats ? '...' : stats.totalMembers}</p>
            <p className="text-xs text-gray-500 mt-1">Total Members</p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#1A318C]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
                  <p className="text-xs text-gray-500">{notifications.length} alerts</p>
                </div>
              </div>
              {notifications.length > 0 && (
                <button onClick={handleClearAllNotifications} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <BellRing className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-gray-500">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <NotificationCard
                      key={n.id}
                      title={n.title}
                      description={n.description}
                      date={n.date}
                      type={n.type}
                      onClose={() => handleRemoveNotification(n.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#1A318C] hover:text-[#1A318C] transition-colors">
                  <ShoppingCart className="w-4 h-4" />
                  New Sale
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#1A318C] hover:text-[#1A318C] transition-colors">
                  <Package className="w-4 h-4" />
                  View Inventory
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Need Help?</h2>
                  <p className="text-xs text-gray-500">Send us feedback</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
              {submitted ? (
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${submitSuccess ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {submitSuccess ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${submitSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
                    {submitSuccess ? 'Submitted!' : 'Failed'}
                  </h3>
                  <p className="text-sm text-gray-500">{submitSuccess ? 'Thank you!' : 'Try again later.'}</p>
                </div>
              ) : (
                <>
                  <textarea
                    placeholder="Describe your issue..."
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C]"
                    value={feedbackText}
                    onChange={handleFeedbackChange}
                  />
                  <button
                    disabled={!feedbackActive || submitting}
                    onClick={handleFeedbackSubmit}
                    className={`mt-4 w-full px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                      ${feedbackActive && !submitting ? "bg-[#1A318C] text-white hover:bg-[#152870] shadow-md" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Sending..." : "Send Feedback"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
