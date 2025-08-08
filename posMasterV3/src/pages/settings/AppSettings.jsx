import React, { useState } from 'react';
import correctImage from '../../assets/Correct.png';
import issueImage from '../../assets/issue.png';

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

  const handleClear = () => {
    setPaths({
      tempPath: '',
      dbConfig: '',
      outletSetup: ''
    });
  };

  const handleSave = () => {
    console.log('Settings saved:', { settings, paths });
  };

  return (
    <div className="p-10 bg-white pb-32 pl-16">
      {/* Heading */}
      <div className="mt-4 mb-10 w-full">
        <h2 className="text-[36px] font-bold leading-[32px] text-gray-400 mb-2">
          APPLICATION SETTINGS
        </h2>
        <p className="text-[#525252] text-[14px] leading-relaxed w-full">
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
            <label
              className="relative inline-block"
              style={{ width: '36px', height: '20px' }}
            >
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={() => handleToggle(key)}
                className="opacity-0 w-0 h-0 peer"
              />
              <span
                className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-300 peer-checked:bg-[#00B050] bg-gray-400"
                style={{ borderRadius: '34px' }}
              >
                <span
                  className="absolute bg-white rounded-full transition-transform duration-300"
                  style={{
                    height: '14px',
                    width: '14px',
                    left: '3px',
                    bottom: '3px',
                    transform: settings[key] ? 'translateX(16px)' : 'translateX(0px)'
                  }}
                />
              </span>
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
            <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <div className="flex items-center">
              {dropdown ? (
                <select
                  value={paths[key]}
                  onChange={(e) => handlePathChange(key, e.target.value)}
                  className="flex-1 bg-[#f8f8f8] border border-[#ebebeb] py-1 px-2 text-sm focus:outline-none"
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
                />
              )}
              {!dropdown && (
                <button
                  className="bg-[#c4c4c4] text-white text-xs px-3 py-[6px] ml-2"
                  style={{ height: '32px' }}
                >
                  Select
                </button>
              )}
              <img
                src={valid ? correctImage : issueImage}
                alt="Validation"
                className="ml-2 w-4 h-4"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="fixed bottom-16 right-6 flex justify-end space-x-3 p-4">
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
  );
}

export default AppSettings;
