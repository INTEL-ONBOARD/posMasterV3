import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Database, Cloud, Wifi, WifiOff, Download, CheckCircle, XCircle } from 'lucide-react';
import { settingsApi, onlineStatusApi, appSettingsApi, updatesApi } from '../../api/localApi';
import { useReactiveData, TABLES } from '../../store';
import { useBranchContext } from '../../context/BranchContext';
import StatusModal from '../../components/StatusModal.jsx';

function AppSettings() {
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
  const { currentBranch, branchName, setBranch } = useBranchContext();

  // Section collapse states
  const [openGeneral, setOpenGeneral] = useState(true);
  const [openBranch, setOpenBranch] = useState(false);
  const [openOnlineBackend, setOpenOnlineBackend] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use reactive data for branches - auto-updates when branches change
  const { data: branches } = useReactiveData(TABLES.BRANCHES);

  // Online backend state
  const [syncStatus, setSyncStatus] = useState({ isOnline: false, isSyncing: false, lastSyncTime: null });
  const [syncingNow, setSyncingNow] = useState(false);
  const [ensuringSchema, setEnsuringSchema] = useState(false);

  // Software Updates state machine
  // States: idle | checking | up-to-date | update-available | downloading | ready-to-install | error
  const [openUpdates, setOpenUpdates] = useState(false);
  const [updateState, setUpdateState] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null); // { latestVersion, currentVersion, releaseNotes }
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);

  const [settings, setSettings] = useState({
    logout_on_close: true,
    notifications: true,
    temp_system: false,
    run_on_startup: true,
    maximize_window: true
  });

  const [paths, setPaths] = useState({
    default_outlet: ''
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);

        const response = await settingsApi.getAppSettings();

        if (response.status === 'success' && response.data) {
          const data = response.data;

          setSettings({
            logout_on_close: data.logout_on_close ?? true,
            notifications: data.notifications ?? true,
            temp_system: data.temp_system ?? false,
            run_on_startup: data.run_on_startup ?? true,
            maximize_window: data.maximize_window ?? true
          });

          setPaths({
            default_outlet: data.default_outlet || ''
          });
        }

        // Load online backend status
        const syncResponse = await onlineStatusApi.getStatus();
        if (syncResponse.status === 'success' && syncResponse.data) {
          setSyncStatus(syncResponse.data);
        }
      } catch (err) {
        console.error('[AppSettings] Load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Refresh online backend status every 10 seconds
    const interval = setInterval(async () => {
      try {
        const syncResponse = await onlineStatusApi.getStatus();
        if (syncResponse.status === 'success' && syncResponse.data) {
          setSyncStatus(syncResponse.data);
        }
      } catch (err) {
        console.error('[AppSettings] Online status refresh error:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Fetch current version on mount so it's always visible
  useEffect(() => {
    updatesApi.getVersion().then((result) => {
      if (result?.status === 'success' && result.data?.currentVersion) {
        setUpdateInfo((prev) => ({ ...prev, currentVersion: result.data.currentVersion }));
      }
    }).catch(() => {});
  }, []);

  // Register electron-updater push event listeners
  useEffect(() => {
    const unsubAvailable = updatesApi.onUpdateAvailable((data) => {
      setUpdateInfo(data);
      setUpdateState('update-available');
    });
    const unsubNotAvailable = updatesApi.onUpdateNotAvailable((data) => {
      if (data?.currentVersion) {
        setUpdateInfo((prev) => ({ ...prev, currentVersion: data.currentVersion }));
      }
      setUpdateState('up-to-date');
    });
    const unsubProgress = updatesApi.onDownloadProgress((data) => {
      setDownloadProgress(data.percent);
    });
    const unsubDownloaded = updatesApi.onUpdateDownloaded(() => {
      setUpdateState('ready-to-install');
    });
    const unsubError = updatesApi.onUpdateError((data) => {
      console.error('[AppSettings] Update error event:', data.message);
      setUpdateError('An update error occurred. Please try again.');
      setUpdateState('error');
    });
    return () => {
      unsubAvailable();
      unsubNotAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  // Initialize default_outlet from current branch on first load only
  const [initialBranchLoaded, setInitialBranchLoaded] = useState(false);
  useEffect(() => {
    if (!initialBranchLoaded && !loading) {
      if (branchName) {
        setPaths(prev => ({ ...prev, default_outlet: branchName }));
      } else if (branches && branches.length > 0 && !paths.default_outlet) {
        setPaths(prev => ({ ...prev, default_outlet: branches[0].name }));
      }
      setInitialBranchLoaded(true);
    }
  }, [branchName, branches, loading, initialBranchLoaded, paths.default_outlet]);

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    // Apply setting immediately for real-time effect
    try {
      let result;
      switch (key) {
        case 'logout_on_close':
          result = await appSettingsApi.setLogoutOnClose(newValue);
          if (result.status === 'success') {
            setStatusModal({ open: true, type: 'success', description: newValue ? 'Logout on close enabled' : 'Logout on close disabled' });
          }
          break;
        case 'notifications':
          result = await appSettingsApi.setNotifications(newValue);
          if (result.status === 'success') {
            setStatusModal({ open: true, type: 'success', description: newValue ? 'Notifications enabled' : 'Notifications disabled' });
            // Test notification if enabled
            if (newValue) {
              setTimeout(() => appSettingsApi.testNotification(), 500);
            }
          }
          break;
        case 'run_on_startup':
          result = await appSettingsApi.setRunOnStartup(newValue);
          if (result.status === 'success') {
            setStatusModal({ open: true, type: 'success', description: result.message });
          } else {
            setStatusModal({ open: true, type: 'failed', description: result.message || 'Failed to update startup setting' });
            // Revert on failure
            setSettings((prev) => ({ ...prev, [key]: !newValue }));
          }
          break;
        case 'maximize_window':
          result = await appSettingsApi.setMaximizeOnStart(newValue);
          if (result.status === 'success') {
            setStatusModal({ open: true, type: 'success', description: newValue ? 'App will maximize on start' : 'App will start in normal window' });
          }
          break;
        default:
          // For other settings, just save to database
          break;
      }
    } catch (err) {
      console.error(`[AppSettings] Failed to apply ${key}:`, err);
    }
  };

  const handlePathChange = (key, value) => {
    setPaths((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await settingsApi.resetAppSettings();

      if (response.status === 'success' && response.data) {
        const data = response.data;

        setSettings({
          logout_on_close: data.logout_on_close ?? true,
          notifications: data.notifications ?? true,
          temp_system: data.temp_system ?? false,
          run_on_startup: data.run_on_startup ?? true,
          maximize_window: data.maximize_window ?? true
        });

        setPaths({
          default_outlet: data.default_outlet || ''
        });

        setStatusModal({ open: true, type: 'success', description: 'Settings reset to defaults' });
      } else {
        setStatusModal({ open: true, type: 'failed', description: 'Failed to reset settings' });
      }
    } catch {
      setStatusModal({ open: true, type: 'failed', description: 'Failed to reset settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Check if branch is being changed
      const selectedBranch = branches?.find(b => b.name === paths.default_outlet);
      const branchChanged = selectedBranch && selectedBranch.id !== currentBranch?.id;

      const allSettings = {
        ...settings,
        ...paths
      };

      const response = await settingsApi.updateAppSettings(allSettings);

      if (response.status === 'success') {
        // If branch changed, update the BranchContext and restart
        if (branchChanged && selectedBranch) {
          setStatusModal({ open: true, type: 'success', description: 'Branch changed! App will restart with fresh data...' });

          // Update branch context
          await setBranch(selectedBranch.id);

          // Restart the app to clear cached data
          if (window.electronAPI?.app?.logoutAndRestart) {
            setTimeout(async () => {
              await window.electronAPI.app.logoutAndRestart();
            }, 1500);
          }
        } else {
          setStatusModal({ open: true, type: 'success', description: 'Settings saved successfully!' });
        }
      } else {
        setStatusModal({ open: true, type: 'failed', description: 'Failed to save settings' });
      }
    } catch {
      setStatusModal({ open: true, type: 'failed', description: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Online backend handlers
  const handleSyncNow = async () => {
    try {
      setSyncingNow(true);
      setStatusModal({ open: true, type: 'success', description: 'Refreshing online status...' });

      const result = await onlineStatusApi.refreshStatus();

      if (result.status === 'success') {
        setStatusModal({ open: true, type: 'success', description: 'Online status refreshed' });
        // Refresh status
        const statusResult = await onlineStatusApi.getStatus();
        if (statusResult.status === 'success') {
          setSyncStatus(statusResult.data);
        }
      } else {
        setStatusModal({ open: true, type: 'failed', description: result.message || 'Online status refresh failed' });
      }
    } catch (err) {
      console.error('[AppSettings] Online status refresh error:', err);
      setStatusModal({ open: true, type: 'failed', description: 'Online status refresh failed: ' + err.message });
    } finally {
      setSyncingNow(false);
    }
  };

  const handleEnsureSchema = async () => {
    try {
      setEnsuringSchema(true);
      setStatusModal({ open: true, type: 'success', description: 'Refreshing online status...' });

      const result = await onlineStatusApi.getStatus();

      if (result.status === 'success' && result.data) {
        setStatusModal({ open: true, type: 'success', description: 'Online backend status refreshed' });
      } else {
        setStatusModal({ open: true, type: 'failed', description: result.data?.message || result.message || 'Failed to refresh online status' });
      }
    } catch (err) {
      console.error('[AppSettings] Ensure schema error:', err);
      setStatusModal({ open: true, type: 'failed', description: 'Failed to refresh online status: ' + err.message });
    } finally {
      setEnsuringSchema(false);
    }
  };

  const handleCheckNetwork = async () => {
    try {
      const result = await onlineStatusApi.checkConnection();
      if (result.status === 'success') {
        setSyncStatus(prev => ({ ...prev, isOnline: result.data.isOnline }));
        setStatusModal({ open: true, type: result.data.isOnline ? 'success' : 'failed', description: result.data.isOnline ? 'Online backend reachable' : 'Online backend unavailable' });
      }
    } catch (err) {
      console.error('[AppSettings] Network check error:', err);
    }
  };

  // Software Updates handlers
  const handleCheckForUpdates = async () => {
    setUpdateState('checking');
    setUpdateError(null);
    try {
      const result = await updatesApi.checkForUpdates();
      if (result.status === 'error') {
        console.error('[AppSettings] Update check failed:', result.message);
        setUpdateError('Failed to check for updates. Please try again.');
        setUpdateState('error');
        return;
      }
      if (result.data?.available) {
        setUpdateInfo(result.data);
        setUpdateState('update-available');
      } else {
        setUpdateState('up-to-date');
      }
    } catch (err) {
      console.error('[AppSettings] Update check error:', err);
      setUpdateError('Failed to check for updates. Please try again.');
      setUpdateState('error');
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateState('downloading');
    setDownloadProgress(0);
    let errorHandledByEvent = false;
    const unsubTempError = updatesApi.onUpdateError(() => {
      errorHandledByEvent = true;
    });
    try {
      const result = await updatesApi.downloadUpdate();
      if (result.status === 'error' && !errorHandledByEvent) {
        setUpdateError('Failed to download update. Please try again.');
        setUpdateState('error');
      }
    } catch (err) {
      if (!errorHandledByEvent) {
        console.error('[AppSettings] Update download error:', err);
        setUpdateError('Failed to download update. Please try again.');
        setUpdateState('error');
      }
    } finally {
      unsubTempError();
    }
  };

  const handleInstallUpdate = async () => {
    setStatusModal({ open: true, type: 'success', description: 'Installing update and restarting...' });
    await updatesApi.installUpdate();
  };

  // Toggle items configuration
  const toggleItems = [
    { label: 'Logout on Close', description: 'Log out user when app is closed', key: 'logout_on_close', icon: 'logout' },
    { label: 'System Notifications', description: 'Enable Windows built-in notifications', key: 'notifications', icon: 'bell' },
    { label: 'Temp File System', description: 'Enable temporary file storage', key: 'temp_system', icon: 'folder' },
    { label: 'Run on Startup', description: 'Launch app when Windows starts', key: 'run_on_startup', icon: 'power' },
    { label: 'Maximize on Start', description: 'Start app in maximized window', key: 'maximize_window', icon: 'maximize' }
  ];

  // Count enabled settings
  const enabledCount = Object.values(settings).filter(v => v).length;

  if (loading) {
    return (
      <div className="flex bg-gray-100 w-full h-[calc(100vh-2rem)] items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-4"></div>
          <span className="text-gray-500 text-sm font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 w-full h-[calc(100vh-2rem)] relative">
      {/* Left Panel - Form */}
      <div className="w-[28rem] h-[calc(100vh-2rem)] p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {/* General Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenGeneral(!openGeneral);
                if (!openGeneral) {
                  setOpenBranch(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#1A318C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">General Settings</span>
              </div>
              {openGeneral ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openGeneral && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Configure application behavior and preferences
                </p>

                <div className="space-y-3">
                  {toggleItems.map(({ label, description, key }) => (
                    <div key={key} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{label}</p>
                        <p className="text-xs text-gray-400">{description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[key]}
                          onChange={() => handleToggle(key)}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#1A318C]/20 transition-colors ${settings[key] ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-[2px] bg-white w-5 h-5 rounded-full shadow transition-all ${settings[key] ? 'left-[22px]' : 'left-[2px]'}`}></div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Branch Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenBranch(!openBranch);
                if (!openBranch) {
                  setOpenGeneral(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Branch Settings</span>
              </div>
              {openBranch ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openBranch && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Configure default branch/outlet settings
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Default Outlet</label>
                  <select
                    value={paths.default_outlet}
                    onChange={(e) => handlePathChange('default_outlet', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  >
                    <option value="">Select Branch</option>
                    {(branches || []).map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">This branch will be used as the default for new transactions</p>
                </div>

                {/* Branch List Preview */}
                {(branches || []).length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Available Branches</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(branches || []).map((branch) => (
                        <div
                          key={branch.id}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                            paths.default_outlet === branch.name ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${paths.default_outlet === branch.name ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                            <span className="text-sm text-gray-700">{branch.name}</span>
                          </div>
                          {paths.default_outlet === branch.name && (
                            <span className="text-xs font-medium text-emerald-600">Default</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Online Backend Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenOnlineBackend(!openOnlineBackend);
                if (!openOnlineBackend) {
                  setOpenGeneral(false);
                  setOpenBranch(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Online Backend</span>
              </div>
              <div className="flex items-center gap-2">
                {syncStatus.isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                {openOnlineBackend ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </button>
            {openOnlineBackend && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Monitor the MongoDB-backed online service
                </p>

                {/* Status Display */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Connection Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${syncStatus.isOnline ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                      <span className={`text-xs font-semibold ${syncStatus.isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                        {syncStatus.isOnline ? 'Connected' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                  {syncStatus.lastSyncTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Last Status Update</span>
                      <span className="text-xs text-gray-600">{new Date(syncStatus.lastSyncTime).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleSyncNow}
                    disabled={syncingNow || !syncStatus.isOnline}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1A318C] text-white rounded-lg text-sm font-medium hover:bg-[#152870] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingNow ? 'animate-spin' : ''}`} />
                    {syncingNow ? 'Refreshing...' : 'Refresh Status'}
                  </button>

                  <button
                    onClick={handleEnsureSchema}
                    disabled={ensuringSchema || !syncStatus.isOnline}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Database className={`w-4 h-4 ${ensuringSchema ? 'animate-pulse' : ''}`} />
                    {ensuringSchema ? 'Refreshing...' : 'Refresh Online Status'}
                  </button>

                  <button
                    onClick={handleCheckNetwork}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    {syncStatus.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    Check Connection
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700">
                    <strong>Refresh Status:</strong> Checks the online service without creating local sync work.
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    <strong>Refresh Online Status:</strong> Confirms the backend is reachable.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Software Updates Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenUpdates(!openUpdates);
                if (!openUpdates) {
                  setOpenGeneral(false);
                  setOpenBranch(false);
                  setOpenOnlineBackend(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Software Updates</span>
              </div>
              <div className="flex items-center gap-2">
                {updateState === 'ready-to-install' && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                )}
                {openUpdates ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </button>

            {openUpdates && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Keep your app up to date with the latest features and fixes
                </p>

                {/* Version and status display */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Current Version</span>
                    <span className="text-sm font-mono font-semibold text-gray-800">
                      v{updateInfo?.currentVersion || '—'}
                    </span>
                  </div>

                  <div className="mt-3">
                    {updateState === 'up-to-date' && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">You're up to date</span>
                      </div>
                    )}
                    {updateState === 'update-available' && updateInfo && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">v{updateInfo.latestVersion} available</span>
                      </div>
                    )}
                    {updateState === 'downloading' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Downloading...</span>
                          <span className="text-sm font-semibold text-gray-700">{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#1A318C] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {updateState === 'ready-to-install' && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Update ready to install</span>
                      </div>
                    )}
                    {updateState === 'error' && updateError && (
                      <div className="flex items-start gap-2 text-red-500">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{updateError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {(updateState === 'idle' || updateState === 'up-to-date' || updateState === 'error') && (
                    <button
                      onClick={handleCheckForUpdates}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1A318C] text-white rounded-lg text-sm font-medium hover:bg-[#152870] transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Check for Updates
                    </button>
                  )}

                  {updateState === 'checking' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1A318C] text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking...
                    </button>
                  )}

                  {updateState === 'downloading' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                    >
                      <Download className="w-4 h-4 animate-bounce" />
                      Downloading...
                    </button>
                  )}

                  {updateState === 'update-available' && (
                    <button
                      onClick={handleDownloadUpdate}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Update
                    </button>
                  )}

                  {updateState === 'ready-to-install' && (
                    <button
                      onClick={handleInstallUpdate}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Install & Restart
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-row w-full gap-3 mt-4">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex-1 min-w-0 h-11 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm shadow-red-200 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[1.5] min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl text-sm font-semibold hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Right Panel - Settings Summary */}
      <div className="flex-1 h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Settings Summary Section */}
          <div className="w-full max-w-sm">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl border-4 border-[#1A318C]/20 bg-gray-50 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-[#1A318C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Application Settings</h2>
              <p className="text-gray-400 text-sm">POS Master Configuration</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-800">{enabledCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Enabled</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-800">{6 - enabledCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Disabled</p>
              </div>
            </div>

            {/* Feature Status Rows */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Quick Status</p>

              {/* Online Mode */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Online Backend</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  On
                </span>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Notifications</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${settings.notifications ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.notifications ? 'On' : 'Off'}
                </span>
              </div>

              {/* Logout on Close */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Logout on Close</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${settings.logout_on_close ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.logout_on_close ? 'On' : 'Off'}
                </span>
              </div>
            </div>

            {/* Default Branch */}
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1A318C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Default Branch</p>
                  <p className="text-sm font-semibold text-gray-800">{paths.default_outlet || 'Not Set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center max-w-xs">
            <p className="text-xs text-gray-400">
              Configure application behavior, storage locations, and default branch. Changes apply after saving.
            </p>
          </div>
        </div>
      </div>
      <StatusModal
        isOpen={statusModal.open}
        closeModal={() => setStatusModal({ open: false, type: null, description: "" })}
        type={statusModal.type}
        description={statusModal.description}
        context="default"
      />
    </div>
  );
}

export default AppSettings;
