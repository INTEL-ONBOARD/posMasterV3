import React from 'react';
import Setting_usericon from '../../assets/Setting_usericon.png';

function UserSettings() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">USER SETTINGS</h2>
      <p className="text-gray-600 mb-6">
        Manage your personal information and account preferences. Update your profile details, change your password, set privacy options, and control how your account interacts with the app. These settings help keep your experience secure and personalized.
      </p>
      <div className="flex space-x-12">
        {/* Left Section - Profile Picture Upload */}
        <div className="w-1/5">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 text-center">User Profile Picture</label>
            <div className="mt-3 flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                <img src={Setting_usericon} alt="User Profile" className="w-28 h-28 object-cover rounded-full" />
              </div>
              <button className="mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm">Upload</button>
            </div>
          </div>
        </div>

        {/* Middle Section - Username to New Password */}
        <div className="w-1/3">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input type="text" className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Retype Current Password</label>
            <input type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-1 text-sm" defaultValue="Default path here" />
          </div>
        </div>

        {/* Right Section - Role and Allowed Permissions */}
        <div className="w-1/3">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm bg-[#F8F8F8] p-2 text-sm" defaultValue="Cashier">
              <option>Cashier</option>
              {/* Add more roles as needed */}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Allowed Permissions</label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sale access</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Inventory access</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Report manager access</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Dt access</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-20 flex justify-end space-x-4">
        <button className="bg-red-600 text-white px-4 py-2 rounded">Reset to Default</button>
        <button className="bg-gray-400 text-white px-4 py-2 rounded">Clear</button>
        <button className="bg-blue-700 text-white px-4 py-2 rounded">Save</button>
      </div>
    </div>
  );
}

export default UserSettings;