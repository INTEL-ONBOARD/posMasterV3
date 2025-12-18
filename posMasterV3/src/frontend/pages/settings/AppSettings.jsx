import React, { useState, useEffect } from 'react';
import correctImage from '../../assets/Correct.png';
import issueImage from '../../assets/issue.png';
import successImage from '../../assets/Success.png';
import failedImage from '../../assets/Failed.png';
import { settingsApi } from '../../api/localApi';
import { branchApi } from '../../api/localApi';

function AppSettings() {
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
    default_outlet: 'Main Branch'
  });

  // Modal state
  const [modal, setModal] = useState({ open: false, type: null });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);

        // Fetch app settings
        const response = await settingsApi.getAppSettings();

        if (response.status === 'success' && response.data) {
          const data = response.data;

          // Map settings to state
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
            default_outlet: data.default_outlet || 'Main Branch'
          });
        }

        // Fetch branches for outlet dropdown
        const branchResponse = await branchApi.getAll();
        if (branchResponse.status === 'success' && branchResponse.data) {
          setBranches(branchResponse.data);
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
          default_outlet: data.default_outlet || 'Main Branch'
        });

        setModal({ open: true, type: 'success' });
      } else {
        setModal({ open: true, type: 'failed' });
      }
    } catch (err) {
      console.error('[AppSettings] Reset error:', err);
      setModal({ open: true, type: 'failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setPaths({
      temp_path: '',
      db_config_path: '',
      default_outlet: ''
    });
    setModal({ open: true, type: 'failed' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Combine all settings
      const allSettings = {
        ...settings,
        ...paths
      };

      const response = await settingsApi.updateAppSettings(allSettings);

      if (response.status === 'success') {
        setModal({ open: true, type: 'success' });
      } else {
        setModal({ open: true, type: 'failed' });
      }
    } catch (err) {
      console.error('[AppSettings] Save error:', err);
      setModal({ open: true, type: 'failed' });
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => setModal({ open: false, type: null });

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modal.open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modal.open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && modal.open) closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal.open]);

  // Handle folder selection via Electron
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
      alert('Folder picker not available');
    }
  };

  if (loading) {
    return (
      <div className="p-10 bg-white flex items-center justify-center h-full">
        <div className="text-gray-500">Loading application settings...</div>
      </div>
    );
  }

  return (
    <>
      {/* MAIN CONTENT — blurred when modal.open */}
      <div
        className="p-10 bg-white pb-32 pl-16 min-h-screen"
        style={{
          transition: 'filter 200ms ease',
          filter: modal.open ? 'blur(6px)' : 'none'
        }}
      >
        {/* Heading */}
        <div className="mt-4 mb-10 w-full">
          <h2 className="text-[36px] font-bold leading-[32px] text-gray-400 mb-2">
            APPLICATION SETTINGS
          </h2>
          <p className="text-[#525252] text-[14px] leading-relaxed w-full max-w-3xl">
            Customize how the app works for your usage preferences such as
            notifications, themes, language, and other general behaviors to
            tailor your experience to your needs.
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-4 mb-8 max-w-lg">
          {[
            { label: 'Enable Automatic Logout', key: 'auto_logout' },
            { label: 'Enable Windows Built-in Notifications', key: 'notifications' },
            { label: 'Enable automatic cloud synchronization', key: 'cloud_sync' },
            { label: 'Enable Application temp system', key: 'temp_system' },
            { label: 'Allow app to run-on startup', key: 'run_on_startup' },
            { label: 'Allow app to start maximize window', key: 'maximize_window' }
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{label}</span>

              {/* Toggle */}
              <label
                className="relative inline-block"
                style={{ width: 36, height: 20 }}
                aria-label={`${label} toggle`}
              >
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => handleToggle(key)}
                  className="opacity-0 w-0 h-0 peer"
                />
                {/* track */}
                <span
                  className="absolute top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: settings[key] ? '#00B050' : '#666666'
                  }}
                />
                {/* knob */}
                <span
                  className="absolute bg-white rounded-full transition-all duration-200"
                  style={{
                    height: 14,
                    width: 14,
                    left: settings[key] ? 19 : 3,
                    top: 3,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)'
                  }}
                />
              </label>
            </div>
          ))}
        </div>

        {/* Paths */}
        <div className="space-y-4 mb-8 max-w-lg">
          {/* Temp Path */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Path for the temp files</label>
            <div className="flex items-center">
              <input
                type="text"
                value={paths.temp_path}
                onChange={(e) => handlePathChange('temp_path', e.target.value)}
                className="flex-1 bg-[#f8f8f8] border border-[#ebebeb] py-1 px-2 text-sm focus:outline-none"
                style={{ height: 36 }}
              />
              <button
                className="ml-2 text-xs font-medium px-3 py-1"
                style={{
                  backgroundColor: '#c4c4c4',
                  color: 'white',
                  height: 32,
                  borderRadius: 4
                }}
                onClick={() => handleSelectFolder('temp_path')}
              >
                Select
              </button>
              <img
                src={paths.temp_path ? correctImage : issueImage}
                alt={paths.temp_path ? 'valid' : 'invalid'}
                className="ml-2 w-4 h-4"
              />
            </div>
          </div>

          {/* DB Config Path */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Path for the db configuration file</label>
            <div className="flex items-center">
              <input
                type="text"
                value={paths.db_config_path}
                onChange={(e) => handlePathChange('db_config_path', e.target.value)}
                className="flex-1 bg-[#f8f8f8] border border-[#ebebeb] py-1 px-2 text-sm focus:outline-none"
                style={{ height: 36 }}
              />
              <button
                className="ml-2 text-xs font-medium px-3 py-1"
                style={{
                  backgroundColor: '#c4c4c4',
                  color: 'white',
                  height: 32,
                  borderRadius: 4
                }}
                onClick={() => handleSelectFolder('db_config_path')}
              >
                Select
              </button>
              <img
                src={paths.db_config_path ? correctImage : issueImage}
                alt={paths.db_config_path ? 'valid' : 'invalid'}
                className="ml-2 w-4 h-4"
              />
            </div>
          </div>

          {/* Default Outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Default outlet Setup</label>
            <div className="flex items-center">
              <select
                value={paths.default_outlet}
                onChange={(e) => handlePathChange('default_outlet', e.target.value)}
                className="flex-1 bg-[#f8f8f8] border border-[#ebebeb] py-1 px-2 text-sm focus:outline-none"
                style={{ height: 36 }}
              >
                <option value="Main Branch">Main Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <img
                src={paths.default_outlet ? correctImage : issueImage}
                alt={paths.default_outlet ? 'valid' : 'invalid'}
                className="ml-2 w-4 h-4"
              />
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="fixed bottom-16 right-6 flex justify-end space-x-3 p-4 z-40">
          <button
            onClick={handleReset}
            disabled={saving}
            className="w-[12rem] h-10 px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            Reset to Default
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-6 py-2 w-[8rem] h-10 bg-[#727272] text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 h-10 w-[8rem] bg-blue-600 text-white hover:bg-[#1A318C] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {modal.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
            onClick={closeModal}
          />

          {/* close button */}
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/90 text-white flex items-center justify-center z-[10001]"
            aria-label="Close"
            title="Close"
          >
            X
          </button>

          {/* modal content */}
          <div
            className="relative z-[10000] flex flex-col items-center justify-center text-center p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              transition: 'transform 160ms ease, opacity 160ms ease'
            }}
          >
            <img
              src={modal.type === 'success' ? successImage : failedImage}
              alt={modal.type === 'success' ? 'Success' : 'Failed'}
              className="w-24 h-24 object-contain"
              style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.08))' }}
            />

            <h3 className="mt-4 text-2xl font-bold text-black">
              {modal.type === 'success' ? 'Success!' : 'Failed!'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {modal.type === 'success'
                ? 'All Changes were Applied.'
                : 'Something went wrong.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default AppSettings;
