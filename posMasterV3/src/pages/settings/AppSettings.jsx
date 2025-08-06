import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

function AppSettings() {
  const [settings, setSettings] = useState({
    autoLogout: false,
    notifications: true,
    cloudSync: false,
    tempSystem: false,
    runOnStartup: false,
    maximizeWindow: true
  });

  const [paths, setPaths] = useState({
    tempPath: "Default path here",
    tempPath2: "Default path here",
    outletSetup: "Default outlet Name"
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePathChange = (key, value) => {
    setPaths(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSettings({
      autoLogout: false,
      notifications: true,
      cloudSync: false,
      tempSystem: false,
      runOnStartup: false,
      maximizeWindow: true
    });
    setPaths({
      tempPath: "Default path here",
      tempPath2: "Default path here",
      outletSetup: "Default outlet Name"
    });
  };

  const handleClear = () => {
    setPaths({
      tempPath: "",
      tempPath2: "",
      outletSetup: ""
    });
  };

  const handleSave = () => {
    // Save logic here
    console.log('Settings saved:', { settings, paths });
  };

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">APPLICATION SETTINGS</h2>
        <p className="text-gray-600 leading-relaxed">
          Customize how the app works for your usage preferences such as notifications, themes, language, and other general behaviors to tailor your experience to your needs. Your settings are saved automatically and can be updated anytime.
        </p>
      </div>

      {/* Settings Toggles */}
      <div className="space-y-3 mb-8 max-w-2xl">
        {/* Toggle Items */}
        {[
          { label: 'Enable Automatic Logout', key: 'autoLogout' },
          { label: 'Enable Windows Built-in Notifications', key: 'notifications' },
          { label: 'Enable automatic cloud synchronization', key: 'cloudSync' },
          { label: 'Enable Application temp system', key: 'tempSystem' },
          { label: 'Allow app to run-on startup', key: 'runOnStartup' },
          { label: 'Allow app to start maximize window', key: 'maximizeWindow' }
        ].map(({ label, key }) => (
          <div className="flex items-center py-1" key={key}>
            <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
            <label className="relative inline-flex items-center cursor-pointer ml-6">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings[key]}
                onChange={() => handleToggle(key)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      {/* Path Settings */}
      <div className="space-y-4 mb-8 max-w-2xl">
        {[
          { label: 'Path for the temp files', key: 'tempPath', valid: true },
          { label: 'Path for the temp files', key: 'tempPath2', valid: false },
          { label: 'Default outlet Setup', key: 'outletSetup', valid: false }
        ].map(({ label, key, valid }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paths[key]}
                onChange={(e) => handlePathChange(key, e.target.value)}
                className="flex-1 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex items-center justify-center w-6 h-6">
                {valid ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <X className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons - Fixed at Bottom Right */}
      <div className="fixed bottom-16 right-6 flex justify-end space-x-3 p-4 bg-white rounded-lg shadow-md z-10">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-[#D01710] text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Reset to Default
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2 bg-[#727272] text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-[#1A318C] transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default AppSettings;
