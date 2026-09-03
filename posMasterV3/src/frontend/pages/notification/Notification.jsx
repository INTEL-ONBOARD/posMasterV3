import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, HelpCircle, Send, CheckCircle, XCircle, Trash2, BellRing,
  TrendingUp, Package, Users, AlertTriangle, DollarSign, ShoppingCart,
  Clock, Calendar, Activity, RefreshCw, User, Shield, Eye,
  Boxes, ArrowUpRight, ArrowDownRight, BarChart3, Layers, Receipt,
  FileText, Settings, Database, Wifi, WifiOff, UserCheck, History
} from 'lucide-react';
import NotificationCard from '../../components/NotificationCard';
import AdminDashboard from './admin/AdminDashboard';
import { localAuth } from '../../api/services/localAuth';
import { salesApi, loginHistoryApi } from '../../api/localApi';
import { useReactiveData, useDataChangeSubscription, TABLES, useSyncStatus } from '../../store';

function Dashboard() {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  // Loading state for manual refresh
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Admin-specific data that needs custom fetching (date-based)
  const [recentSales, setRecentSales] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  // Today's transactions in full (not just the recent-5 preview) so the admin
  // view can derive the cash/credit split and the hourly shape from real rows.
  const [todaySaleRows, setTodaySaleRows] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [salesStats, setSalesStats] = useState({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    totalSalesCount: 0
  });

  // Use reactive data hooks - automatically updates when data changes
  const { data: items, loading: loadingItems, refetch: refetchItems } = useReactiveData(TABLES.ITEMS);
  const { data: stockItems, loading: loadingStockItems, refetch: refetchStockItems } = useReactiveData(TABLES.STOCK_ITEMS);
  const { data: members, loading: loadingMembers, refetch: refetchMembers } = useReactiveData(TABLES.MEMBERS);
  const { data: suppliers, loading: loadingSuppliers, refetch: refetchSuppliers } = useReactiveData(TABLES.SUPPLIERS);
  const { data: users, loading: loadingUsers, refetch: refetchUsers } = useReactiveData(TABLES.USERS);
  const { loading: loadingLoginHistory, refetch: refetchLoginHistory } = useReactiveData(TABLES.LOGIN_HISTORY);

  // Get realtime status
  const { isOnline } = useSyncStatus();

  // Combined loading state
  const isLoadingReactiveData = loadingItems || loadingStockItems || loadingMembers || loadingSuppliers || loadingUsers || loadingLoginHistory;

  // Compute stats from reactive data
  const stats = useMemo(() => {
    const lowStockItems = (stockItems || []).filter(s => s.quantity <= (s.threshold_limit ?? 10));
    const expiringItems = (stockItems || []).filter(s => {
      if (!s.expiry_date) return false;
      const expiryDate = new Date(s.expiry_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
    });

    return {
      todaySales: salesStats.todaySales,
      totalSalesCount: salesStats.totalSalesCount,
      weekSales: salesStats.weekSales,
      monthSales: salesStats.monthSales,
      totalItems: (items || []).length,
      lowStockItems: lowStockItems.length,
      totalMembers: (members || []).length,
      totalSuppliers: (suppliers || []).length,
      expiringItems: expiringItems.length,
      totalUsers: (users || []).length,
      activeSessions: activeSessionsCount,
    };
  }, [items, stockItems, members, suppliers, users, salesStats, activeSessionsCount]);

  // Low stock list for admin view - uses stockItems which includes item_name and sku
  const lowStockList = useMemo(() => {
    return (stockItems || [])
      .filter(s => s.quantity <= (s.threshold_limit ?? 10))
      .slice(0, 5);
  }, [stockItems]);

  /**
   * Stock health split into the two states that mean different things: a line
   * at zero is blocked from sale, a line below its threshold still sells. The
   * old "low stock" count merged them, which made an empty shelf and a nearly
   * empty one look identical.
   */
  const stockSummary = useMemo(() => {
    const lines = stockItems || [];
    const zeroLines = lines.filter(s => Number(s.quantity ?? 0) <= 0).length;
    const lowLines = lines.filter(s => {
      const qty = Number(s.quantity ?? 0);
      return qty > 0 && qty <= Number(s.threshold_limit ?? 10);
    }).length;
    const totalLines = lines.length;
    return {
      totalLines,
      zeroLines,
      lowLines,
      sellableLines: totalLines - zeroLines,
      availability: totalLines > 0 ? ((totalLines - zeroLines) / totalLines) * 100 : 0
    };
  }, [stockItems]);

  /**
   * Today's takings broken down by how they were settled. A credit sale raises
   * the sales figure without putting anything in the till, so the split is the
   * difference between what was rung up and what the shop actually holds.
   */
  const todayMetrics = useMemo(() => {
    const rows = todaySaleRows || [];
    const isCredit = (row) => {
      const method = String(row?.payment_method || '').toLowerCase();
      return method === 'credit'
        || method.includes('credit')
        || Number(row?.credit_months ?? row?.creditMonths ?? 0) > 0;
    };

    const byHour = new Array(24).fill(0);
    let takings = 0;
    let creditTotal = 0;
    let memberTakings = 0;

    rows.forEach((row) => {
      const amount = Number(row?.total_amount ?? 0) || 0;
      takings += amount;
      if (isCredit(row)) creditTotal += amount;
      if (row?.member_id) memberTakings += amount;

      const stamp = row?.created_at || row?.createdAt;
      const at = stamp ? new Date(stamp) : null;
      if (at && !Number.isNaN(at.getTime())) byHour[at.getHours()] += amount;
    });

    return {
      rows,
      count: rows.length,
      takings,
      creditTotal,
      cashTotal: takings - creditTotal,
      creditShare: takings > 0 ? (creditTotal / takings) * 100 : 0,
      memberShare: takings > 0 ? (memberTakings / takings) * 100 : 0,
      avgBasket: rows.length > 0 ? takings / rows.length : 0,
      byHour
    };
  }, [todaySaleRows]);

  // Most recent sign-in, shown beside the active-session count so "6 of 16"
  // has a time attached to it rather than standing alone.
  const latestSignInLabel = useMemo(() => {
    const stamps = (recentLogins || [])
      .map(l => new Date(l?.login_at || l?.loginAt || l?.created_at || ''))
      .filter(d => !Number.isNaN(d.getTime()));
    if (stamps.length === 0) return null;
    const latest = new Date(Math.max(...stamps.map(d => d.getTime())));
    return latest.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, [recentLogins]);

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
        const userRoles = user?.roles || [];
        setIsAdmin(userRoles.includes('admin') || userRoles.includes('superadmin') || userRoles.includes('Admin'));
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch sales stats (date-based, not in reactive store)
  const fetchSalesStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        salesApi.getSummary(startOfDay, endOfDay).catch(() => ({ data: { total_sales: 0, count: 0 } })),
        salesApi.getSummary(startOfWeek, endOfDay).catch(() => ({ data: { total_sales: 0 } })),
        salesApi.getSummary(startOfMonth, endOfDay).catch(() => ({ data: { total_sales: 0 } }))
      ]);

      setSalesStats({
        todaySales: todayRes?.data?.total_sales || todayRes?.data?.total_amount || 0,
        totalSalesCount: todayRes?.data?.total_transactions || 0,
        weekSales: weekRes?.data?.total_sales || weekRes?.data?.total_amount || 0,
        monthSales: monthRes?.data?.total_sales || monthRes?.data?.total_amount || 0
      });

      // Fetch recent sales for admin
      if (isAdmin) {
        const [recentSalesRes, loginsRes, activeSessionsRes, todayRowsRes] = await Promise.all([
          salesApi.getAll({ limit: 5, status: 'completed' }).catch(() => ({ data: [] })),
          loginHistoryApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
          loginHistoryApi.getActiveSessions().catch(() => ({ data: [] })),
          // Capped at the server's own page ceiling; a single shop's daily
          // transaction count sits well inside it.
          salesApi.getAll({ startDate: startOfDay, endDate: endOfDay, limit: 500 }).catch(() => ({ data: [] }))
        ]);

        setRecentSales(recentSalesRes?.data || []);
        setRecentLogins(loginsRes?.data || []);
        setActiveSessionsCount(Array.isArray(activeSessionsRes?.data) ? activeSessionsRes.data.length : 0);
        setTodaySaleRows(Array.isArray(todayRowsRes?.data) ? todayRowsRes.data : []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    }
  }, [isAdmin]);

  // Initial fetch of sales stats
  useEffect(() => {
    if (currentUser) {
      fetchSalesStats();
    }
  }, [currentUser, isAdmin, fetchSalesStats]);

  // REACTIVE: Subscribe to sales transaction changes for live updates
  // This will automatically refetch sales stats when any sale is created/updated/deleted
  useDataChangeSubscription(TABLES.SALES_TRANSACTIONS, useCallback((state) => {
    // When sales data changes (and not loading), refetch the stats
    if (!state.loading && currentUser) {
      console.log('[Dashboard] Sales data changed, refreshing stats...');
      fetchSalesStats();
    }
  }, [currentUser, fetchSalesStats]));

  useDataChangeSubscription(TABLES.LOGIN_HISTORY, useCallback((state) => {
    if (!state.loading && currentUser) {
      console.log('[Dashboard] Login history changed, refreshing stats...');
      fetchSalesStats();
    }
  }, [currentUser, fetchSalesStats]));

  // Generate notifications from reactive data
  useEffect(() => {
    const newNotifications = [];

    if (stats.lowStockItems > 0) {
      newNotifications.push({
        id: 1,
        title: 'Low Stock Alert',
        description: `${stats.lowStockItems} item(s) are running low on stock`,
        date: 'Now',
        type: 'warning'
      });
    }
    if (stats.expiringItems > 0) {
      newNotifications.push({
        id: 2,
        title: 'Expiring Items',
        description: `${stats.expiringItems} item(s) will expire within 30 days`,
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
  }, [stats.lowStockItems, stats.expiringItems]);

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

  // Refresh handler - NO page reload, just refetch data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refetch all reactive data in parallel
      await Promise.all([
        refetchItems(),
        refetchStockItems(),
        refetchMembers(),
        refetchSuppliers(),
        refetchUsers(),
        refetchLoginHistory(),
        fetchSalesStats()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadingStats = isLoadingReactiveData || refreshing;

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  if (isAdmin) {
    return (
      <AdminDashboard
        greeting={greeting}
        currentUser={currentUser}
        currentDate={currentDate}
        isOnline={isOnline}
        refreshing={loadingStats}
        onRefresh={handleRefresh}
        lastUpdatedLabel={lastUpdated
          ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '—'}
        stats={stats}
        today={todayMetrics}
        stock={stockSummary}
        lowStockList={lowStockList}
        recentSales={recentSales}
        latestSignInLabel={latestSignInLabel}
        onNavigate={navigate}
      />
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
            {/* Connection status indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span className={`text-xs font-medium ${isOnline ? 'text-emerald-700' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
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
                  {notifications.map((n, index) => (
                    <NotificationCard
                      key={`${n.id || n.title || "notification"}-${index}`}
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
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/sales')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#1A318C] hover:text-[#1A318C] transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  New Sale
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/inventory')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#1A318C] hover:text-[#1A318C] transition-colors"
                >
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
