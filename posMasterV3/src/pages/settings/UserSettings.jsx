import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
import correctImage from '../../assets/Correct.png';
import issueImage from '../../assets/issue.png';

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
    SaleAccess: true,
    InventoryAccess: false,
    ReportAccess: false,
    UserManagerAccess: false,
    DtAccess: false
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
    <div className="p-10 bg-white pb-32 pl-16">
      {/* ✅ Heading and Description */}
      <div className="mt-4 mb-10 w-full">
        <h2 className="text-[36px] font-bold leading-[32px] text-gray-400 mb-2">
          USER SETTINGS
        </h2>
        <p className="text-[#525252] text-[14px] text-sm leading-relaxed w-full">
          Manage your personal information and account preferences. Update your profile details, change your password, set privacy options, and control how your account interacts with the app. <br /> These settings help keep your experience secure and personalized.
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Profile Picture Upload */}
        <div className="lg:col-span-3 lg:flex lg:flex-col lg:items-start">
          <label className="block text-[16px] font-medium text-[#949494] mb-3">
            User Profile Picture
          </label>

          {/* Image & Button - image aligned left on desktop, button centered under it */}
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4 hover:border-gray-400 transition-colors relative overflow-hidden">
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
              className="px-4 py-2 bg-[#A8A8A8] text-white text-sm rounded-md hover:bg-gray-600 transition-colors cursor-pointer flex items-center gap-2 justify-center"
            >
              <Upload className="w-4 h-4" />
              Upload
            </label>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 ml-0 lg:ml-[-150px]">
          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">Username</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username"
                className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <img
                src={formData.username && formData.username.trim() ? correctImage : issueImage}
                alt="Validation Status"
                className="h-[18px] w-auto"
              />
            </div>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">Full Name</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter full name"
                className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <img
                src={formData.fullName && formData.fullName.trim() ? correctImage : issueImage}
                alt="Validation Status"
                className="h-[18px] w-auto"
              />

            </div>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">Email Address</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <img
                src={formData.email && isValidEmail(formData.email) ? correctImage : issueImage}
                alt="Validation Status"
                className="h-[18px] w-auto"
              />

            </div>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">Current Password</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter current password"
                className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <img
                src={formData.currentPassword && formData.currentPassword.trim() ? correctImage : issueImage}
                alt="Validation Status"
                className="h-[18px] w-auto"
              />

            </div>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">Retype your Current Password</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                name="retypePassword"
                value={formData.retypePassword}
                onChange={handleInputChange}
                placeholder="Retype current password"
                className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <img
                src={formData.retypePassword && formData.retypePassword.trim() ? correctImage : issueImage}
                alt="Validation Status"
                className="h-[18px] w-auto"
              />

            </div>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">New Password</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
                className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <img
                src={formData.newPassword && formData.newPassword.trim() ? correctImage : issueImage}
                alt="Validation Status"
                className="h-[18px] w-auto"
              />

            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6 ml-0 lg:ml-[-80px]">
          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-3/5 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Role --</option>
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-5">Allowed Permissions</label>
            <div className="space-y-4 w-3/5">
              {Object.entries(permissions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-0">
                  <span className="text-sm font-bold text-[26px] text-gray-300">
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

      {/* Bottom Buttons */}
      <div className="fixed bottom-16 right-6 flex justify-end space-x-3 p-4">
        <button
          onClick={handleReset}
          className=" w-[12rem] h-10 px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors"
        >
        <p>Reset to Default</p>
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2 w-[8rem] h-10 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors"
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

export default UserSettings;