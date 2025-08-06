import React from 'react';

function AppSettings() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">APPLICATION SETTINGS</h2>
      <p className="text-gray-600 mb-6">
        Customize how the app works for your usage preferences such as notifications, themes, language, and other general behaviors to tailor your experience to your needs. Your settings are saved automatically and can be updated anytime.
      </p>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Enable Automatic Logout</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Enable Windows Built-in Notifications</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Enable automatic cloud synchronization</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Enable Application temp system</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Allow app to run-on startup</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-700">Allow app to start maximize window</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Path for the temp files</label>
        <div className="mt-1 flex items-center">
          <input type="text" className="w-3/4 border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          <span className="ml-2 text-green-600">✔</span>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Path for the temp files</label>
        <div className="mt-1 flex items-center">
          <input type="text" className="w-3/4 border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          <span className="ml-2 text-red-600">✖</span>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Default outlet Setup</label>
        <div className="mt-1 flex items-center">
          <input type="text" className="w-3/4 border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default outlet Name" />
          <span className="ml-2 text-red-600">✖</span>
        </div>
      </div>
      <div className="mt-2 flex justify-end space-x-4">
        <button className="bg-red-600 text-white px-4 py-2 rounded">Reset to Default</button>
        <button className="bg-gray-400 text-white px-4 py-2 rounded">Clear</button>
        <button className="bg-blue-700 text-white px-4 py-2 rounded">Save</button>
      </div>
    </div>
  );
}

export default AppSettings;