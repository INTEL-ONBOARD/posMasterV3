import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';

function UserSettings() {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    currentPassword: '',
    retypePassword: '',
    newPassword: '',
    role: 'Cashier'
  });

  const [permissions, setPermissions] = useState({
    saleAccess: true,
    inventoryAccess: false,
    reportAccess: false,
    dtAccess: false
  });

  const [profileImage, setProfileImage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permission) => {
    setPermissions(prev => ({ ...prev, [permission]: !prev[permission] }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setProfileImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      currentPassword: '',
      retypePassword: '',
      newPassword: '',
      role: 'Cashier'
    });
    setPermissions({
      saleAccess: true,
      inventoryAccess: false,
      reportAccess: false,
      dtAccess: false
    });
    setProfileImage(null);
  };

  const handleClear = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      currentPassword: '',
      retypePassword: '',
      newPassword: '',
      role: ''
    });
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = () => {
    if (formData.email && !isValidEmail(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }
    console.log('User settings saved:', { formData, permissions, profileImage });
  };

  return (
    <div className="p-6 bg-white pb-32">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">USER SETTINGS</h2>
        <p className="text-gray-600 leading-relaxed">
          Manage your personal information and account preferences. Update your profile details, change your password, set privacy options, and control how your account interacts with the app. These settings help keep your experience secure and personalized.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Section - Profile Picture Upload */}
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">User Profile Picture</label>
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4 hover:border-gray-400 transition-colors relative overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="User Profile"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-gray-500 text-xs">No image</span>
                </div>
              )}
            </div>
            <input
              type="file"
              id="profileUpload"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <label
              htmlFor="profileUpload"
              className="px-4 py-2 bg-[#4A4A4A] text-white text-sm rounded-md hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </label>
          </div>
        </div>

        {/* Middle Section - Profile Info */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter username"
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter full name"
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex items-center justify-center w-6 h-6">
                {formData.email ? (
                  isValidEmail(formData.email) ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              placeholder="Enter current password"
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retype Current Password</label>
            <input
              type="password"
              name="retypePassword"
              value={formData.retypePassword}
              onChange={handleInputChange}
              placeholder="Retype current password"
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="Enter new password"
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Section - Role & Permissions */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Role --</option>
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Allowed Permissions</label>
            <div className="space-y-4">
              {Object.entries(permissions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">
                    {key.replace('Access', '').replace(/([A-Z])/g, ' $1').trim()} access
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={value}
                      onChange={() => handlePermissionChange(key)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Position Buttons */}
      <div className="fixed bottom-16 right-6 flex justify-end space-x-3 p-4 bg-white rounded-lg shadow-md z-10">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-[#D01710] text-white   rounded-md hover:bg-red-600 transition-colors"
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

export default UserSettings;
