import React, { useState, useEffect, useContext } from 'react';
import { ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';
import { settingsApi, branchApi } from '../../api/localApi';
import ToastContext from '../toasts/ToastService';

function AppSettings() {
  const toast = useContext(ToastContext);

  // Section collapse states
  const [openGeneral, setOpenGeneral] = useState(true);
  const [openPaths, setOpenPaths] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);

  const [settings, setSettings] = useState({
    auto_logout: false,
    notifications: true,
    cloud_sync: false,
    temp_system: false,
    run_on_startup: true,
    maximize_window: true
  });

  const [paths, setPaths] = useState({
    temp_path: 'C:\\POS Master\\temp',
    db_config_path: 'C:\\POS Master\\config',
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
            auto_logout: data.auto_logout ?? false,
            notifications: data.notifications ?? true,
            cloud_sync: data.cloud_sync ?? false,
            temp_system: data.temp_system ?? false,
            run_on_startup: data.run_on_startup ?? true,
            maximize_window: data.maximize_window ?? true
          });

          setPaths({
            temp_path: data.temp_path || 'C:\\POS Master\\temp',
            db_config_path: data.db_config_path || 'C:\\POS Master\\config',
            default_outlet: data.default_outlet || ''
          });
        }

        const branchResponse = await branchApi.getAll();
        if (branchResponse.status === 'success' && branchResponse.data) {
          setBranches(branchResponse.data);
          // Set default outlet to first branch if not set
          if (!paths.default_outlet && branchResponse.data.length > 0) {
            setPaths(prev => ({ ...prev, default_outlet: branchResponse.data[0].name }));
          }
        }
      } catch (err) {
        console.error('[AppSettings] Load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
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
          auto_logout: data.auto_logout ?? false,
          notifications: data.notifications ?? true,
          cloud_sync: data.cloud_sync ?? false,
          temp_system: data.temp_system ?? false,
          run_on_startup: data.run_on_startup ?? true,
          maximize_window: data.maximize_window ?? true
        });

        setPaths({
          temp_path: data.temp_path || 'C:\\POS Master\\temp',
          db_config_path: data.db_config_path || 'C:\\POS Master\\config',
          default_outlet: data.default_outlet || ''
        });

        toast.open('Settings reset to defaults', 3000, 'Success', 'success');
      } else {
        toast.open('Failed to reset settings', 3000, 'Error', 'error');
      }
    } catch (err) {
      toast.open('Failed to reset settings', 3000, 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const allSettings = {
        ...settings,
        ...paths
      };

      const response = await settingsApi.updateAppSettings(allSettings);

      if (response.status === 'success') {
        toast.open('Settings saved! App will restart to apply changes...', 3000, 'Success', 'success');

        // If app settings require restart, trigger logout and restart
        if (response.requiresRestart && window.electronAPI?.app?.logoutAndRestart) {
          // Give user time to see the toast message
          setTimeout(async () => {
            await window.electronAPI.app.logoutAndRestart();
          }, 1500);
        }
      } else {
        toast.open('Failed to save settings', 3000, 'Error', 'error');
      }
    } catch (err) {
      toast.open('Failed to save settings', 3000, 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFolder = async (pathKey) => {
    if (window.electronAPI && window.electronAPI.selectFolder) {
      try {
        const result = await window.electronAPI.selectFolder();
        if (result && !result.canceled && result.filePaths && result.filePaths[0]) {
          handlePathChange(pathKey, result.filePaths[0]);
        }
      } catch (err) {
        console.error('[AppSettings] Folder selection error:', err);
      }
    } else {
      toast.open('Folder picker not available', 3000, 'Info', 'info');
    }
  };

  // Toggle items configuration
  const toggleItems = [
    { label: 'Automatic Logout', description: 'Log out user after inactivity', key: 'auto_logout', icon: 'logout' },
    { label: 'System Notifications', description: 'Enable Windows built-in notifications', key: 'notifications', icon: 'bell' },
    { label: 'Cloud Synchronization', description: 'Auto-sync data with cloud server', key: 'cloud_sync', icon: 'cloud' },
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
                  setOpenPaths(false);
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

          {/* File Paths Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenPaths(!openPaths);
                if (!openPaths) {
                  setOpenGeneral(false);
                  setOpenBranch(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">File Paths</span>
              </div>
              {openPaths ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openPaths && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Configure storage locations for application data
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Temporary Files Path</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paths.temp_path}
                        onChange={(e) => handlePathChange('temp_path', e.target.value)}
                        placeholder="Select temp folder..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                      <button
                        onClick={() => handleSelectFolder('temp_path')}
                        className="px-4 py-2.5 bg-[#1A318C] text-white rounded-lg text-sm font-medium hover:bg-[#152870] transition-colors flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Browse
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Database Config Path</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paths.db_config_path}
                        onChange={(e) => handlePathChange('db_config_path', e.target.value)}
                        placeholder="Select config folder..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                      <button
                        onClick={() => handleSelectFolder('db_config_path')}
                        className="px-4 py-2.5 bg-[#1A318C] text-white rounded-lg text-sm font-medium hover:bg-[#152870] transition-colors flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Browse
                      </button>
                    </div>
                  </div>
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
                  setOpenPaths(false);
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
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">This branch will be used as the default for new transactions</p>
                </div>

                {/* Branch List Preview */}
                {branches.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Available Branches</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {branches.map((branch) => (
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

              {/* Cloud Sync */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Cloud Sync</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${settings.cloud_sync ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.cloud_sync ? 'On' : 'Off'}
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

              {/* Auto Logout */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Auto Logout</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${settings.auto_logout ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.auto_logout ? 'On' : 'Off'}
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
    </div>
  );
}

export default AppSettings;
