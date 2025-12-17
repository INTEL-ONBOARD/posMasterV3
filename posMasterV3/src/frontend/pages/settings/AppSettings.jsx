import React, { useState, useEffect } from 'react';
import correctImage from '../../assets/Correct.png';
import issueImage from '../../assets/issue.png';
import successImage from '../../assets/Success.png';
import failedImage from '../../assets/Failed.png';

function AppSettings() {
  const [settings, setSettings] = useState({
    autoLogout: false,
    notifications: true,
    cloudSync: false,
    tempSystem: false,
    runOnStartup: true,
    maximizeWindow: true
  });

  const [paths, setPaths] = useState({
    tempPath: 'Default path here',
    dbConfig: 'Default path here',
    outletSetup: 'Default outlet Name'
  });

  // modal state: { open: boolean, type: 'success' | 'failed' | null }
  const [modal, setModal] = useState({ open: false, type: null });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePathChange = (key, value) => {
    setPaths((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSettings({
      autoLogout: false,
      notifications: true,
      cloudSync: false,
      tempSystem: false,
      runOnStartup: true,
      maximizeWindow: true
    });
    setPaths({
      tempPath: 'Default path here',
      dbConfig: 'Default path here',
      outletSetup: 'Default outlet Name'
    });
  };

  // Clear fields AND show the Failed modal
  const handleClear = () => {
    setPaths({
      tempPath: '',
      dbConfig: '',
      outletSetup: ''
    });
    setModal({ open: true, type: 'failed' });
  };

  // Save settings AND show the Success modal
  const handleSave = () => {
    console.log('Settings saved:', { settings, paths });
    setModal({ open: true, type: 'success' });
  };

  const closeModal = () => setModal({ open: false, type: null });

  // prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modal.open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modal.open]);

  // close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && modal.open) closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal.open]);

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
            { label: 'Enable Automatic Logout', key: 'autoLogout' },
            { label: 'Enable Windows Built-in Notifications', key: 'notifications' },
            { label: 'Enable automatic cloud synchronization', key: 'cloudSync' },
            { label: 'Enable Application temp system', key: 'tempSystem' },
            { label: 'Allow app to run-on startup', key: 'runOnStartup' },
            { label: 'Allow app to start maximize window', key: 'maximizeWindow' }
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{label}</span>

              {/* Toggle — pixel-sized via inline styles */}
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
          {[
            { label: 'Path for the temp files', key: 'tempPath', valid: true },
            { label: 'Path for the db configuration file', key: 'dbConfig', valid: false },
            { label: 'Default outlet Setup', key: 'outletSetup', valid: false, dropdown: true }
          ].map(({ label, key, valid, dropdown }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
              <div className="flex items-center">
                {dropdown ? (
                  <select
                    value={paths[key]}
                    onChange={(e) => handlePathChange(key, e.target.value)}
                    className="flex-1 bg-[#f8f8f8] border border-[#ebebeb] py-1 px-2 text-sm focus:outline-none"
                    style={{ height: 36 }}
                  >
                    <option value="Default outlet Name">Default outlet Name</option>
                    <option value="Outlet A">Outlet A</option>
                    <option value="Outlet B">Outlet B</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={paths[key]}
                    onChange={(e) => handlePathChange(key, e.target.value)}
                    className="flex-1 bg-[#f8f8f8] border border-[#ebebeb] py-1 px-2 text-sm focus:outline-none"
                    style={{ height: 36 }}
                  />
                )}

                {/* inline Select button for text inputs */}
                {!dropdown && (
                  <button
                    className="ml-2 text-xs font-medium px-3 py-1"
                    style={{
                      backgroundColor: '#c4c4c4',
                      color: 'white',
                      height: 32,
                      borderRadius: 4
                    }}
                    onClick={() => {
                      /* placeholder for file picker */
                      alert('Open file picker (not implemented)');
                    }}
                  >
                    Select
                  </button>
                )}

                {/* small validation icon */}
                <img
                  src={valid ? correctImage : issueImage}
                  alt={valid ? 'valid' : 'invalid'}
                  className="ml-2 w-4 h-4"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Buttons (fixed) */}
        <div className="fixed bottom-16 right-6 flex justify-end space-x-3 p-4 z-40">
          <button
            onClick={handleReset}
            className="w-[12rem] h-10 px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-2 w-[8rem] h-10 bg-[#727272] text-white hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 h-10 w-[8rem] bg-blue-600 text-white hover:bg-[#1A318C] transition-colors"
          >
            Save
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
          {/* backdrop (click to close) */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
            onClick={closeModal}
          />

          {/* close button top-left */}
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/90 text-white flex items-center justify-center z-[10001]"
            aria-label="Close"
            title="Close"
          >
            ✕
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
