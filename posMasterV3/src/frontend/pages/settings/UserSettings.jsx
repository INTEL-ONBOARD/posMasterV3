import React, { useState, useEffect, useContext } from 'react';
import { Upload, X, Check, EyeOff, Eye } from 'lucide-react';
import correctImage from '../../assets/Correct.png';
import issueImage from '../../assets/issue.png';
import { settingsApi } from '../../api/localApi';
import { localAuth } from '../../api/services/localAuth';
import ToastContext from '../toasts/ToastService';

function UserSettings() {
  const toast = useContext(ToastContext);

  const [userData, setUserData] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isChangePwOn, setIsChangePwOn] = useState(false);

  // States for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    username: '',
    fullName: '',
    email: '',
    currentPassword: '',
    retypePassword: '',
    newPassword: '',
    role: ''
  });

  const [permissions, setPermissions] = useState({
    SaleAccess: true,
    InventoryAccess: false,
    ReportAccess: false,
    UserManagerAccess: false,
    DtAccess: false
  });

  const [profileImage, setProfileImage] = useState(null);

  // Load current user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Get current user from localStorage
        const currentUser = await localAuth.getCurrentUser();

        if (!currentUser) {
          setError('No user logged in');
          setLoading(false);
          return;
        }

        const userId = currentUser.id || currentUser._id;

        // Fetch user settings from backend
        const response = await settingsApi.getUserSettings(userId);

        if (response.status === 'success' && response.data) {
          const user = response.data.user;
          const settings = response.data.settings;

          setUserData(user);
          setUserSettings(settings);

          // Populate form data
          setFormData({
            id: user.id || user._id || '',
            username: user.username || '',
            fullName: user.full_name || '',
            email: user.email || '',
            currentPassword: '',
            retypePassword: '',
            newPassword: '',
            role: Array.isArray(user.roles) ? user.roles[0] : (user.roles || '')
          });

          // Populate permissions
          if (settings && settings.permissions) {
            setPermissions({
              SaleAccess: settings.permissions.SaleAccess ?? true,
              InventoryAccess: settings.permissions.InventoryAccess ?? false,
              ReportAccess: settings.permissions.ReportAccess ?? false,
              UserManagerAccess: settings.permissions.UserManagerAccess ?? false,
              DtAccess: settings.permissions.DtAccess ?? false
            });
          }

          // Set profile image if available
          if (settings && settings.profile_image) {
            setProfileImage(settings.profile_image);
          }
        } else {
          setError(response.message || 'Failed to load user settings');
        }
      } catch (err) {
        console.error('[UserSettings] Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permission) => {
    setPermissions(prev => ({ ...prev, [permission]: !prev[permission] }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        setProfileImage(base64Image);

        // Save profile image to backend
        if (formData.id) {
          try {
            const response = await settingsApi.updateProfileImage(formData.id, base64Image);
            if (response.status === 'success') {
              toast.open('Profile image updated', 3000, 'Success', 'success');
            }
          } catch (err) {
            console.error('[UserSettings] Image upload error:', err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = async () => {
    // Reset to original user data
    if (userData) {
      setFormData({
        id: userData.id || userData._id || '',
        username: userData.username || '',
        fullName: userData.full_name || '',
        email: userData.email || '',
        currentPassword: '',
        retypePassword: '',
        newPassword: '',
        role: Array.isArray(userData.roles) ? userData.roles[0] : (userData.roles || '')
      });
    }

    // Reset permissions to defaults
    setPermissions({
      SaleAccess: true,
      InventoryAccess: false,
      ReportAccess: false,
      UserManagerAccess: false,
      DtAccess: false
    });

    setProfileImage(null);
    setIsChangePwOn(false);

    toast.open('Form reset to defaults', 3000, 'Reset', 'info');
  };

  const handleClear = () => {
    setFormData({
      id: formData.id,
      username: '',
      fullName: '',
      email: '',
      currentPassword: '',
      retypePassword: '',
      newPassword: '',
      role: ''
    });
  };

  // Email format validation
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = async () => {
    // Validate email
    if (formData.email && !isValidEmail(formData.email)) {
      toast.open('Enter a valid Email Address', 10000, 'Invalid Email Format', 'warning');
      return;
    }

    // Validate required fields
    if (!formData.username?.trim()) {
      toast.open('Username is required', 5000, 'Validation Error', 'warning');
      return;
    }

    if (!formData.fullName?.trim()) {
      toast.open('Full name is required', 5000, 'Validation Error', 'warning');
      return;
    }

    // Handle password change
    if (isChangePwOn) {
      if (!formData.currentPassword) {
        toast.open('Current password is required', 5000, 'Validation Error', 'warning');
        return;
      }

      if (!formData.newPassword || formData.newPassword.length < 4) {
        toast.open('New password must be at least 4 characters', 5000, 'Validation Error', 'warning');
        return;
      }

      if (formData.retypePassword !== formData.newPassword) {
        toast.open('New passwords do not match', 5000, 'Password Mismatch', 'warning');
        return;
      }

      // Change password via localAuth
      try {
        const pwResult = await localAuth.changePassword(formData.currentPassword, formData.newPassword);
        if (!pwResult.success) {
          toast.open(pwResult.message || 'Password change failed', 5000, 'Error', 'error');
          return;
        }
        toast.open('Password changed successfully', 3000, 'Success', 'success');
      } catch (err) {
        toast.open('Password change failed: ' + err.message, 5000, 'Error', 'error');
        return;
      }
    }

    setSaving(true);

    try {
      // Update user profile
      const profileData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.fullName,
        roles: formData.role
      };

      const profileResult = await settingsApi.updateUserProfile(formData.id, profileData);

      if (profileResult.status !== 'success') {
        toast.open(profileResult.message || 'Failed to update profile', 5000, 'Error', 'error');
        setSaving(false);
        return;
      }

      // Update permissions
      const permResult = await settingsApi.updateUserPermissions(formData.id, permissions);

      if (permResult.status !== 'success') {
        console.warn('[UserSettings] Permission update warning:', permResult.message);
      }

      toast.open('Settings saved successfully', 3000, 'Success', 'success');

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        retypePassword: '',
        newPassword: ''
      }));
      setIsChangePwOn(false);

    } catch (err) {
      console.error('[UserSettings] Save error:', err);
      toast.open('Failed to save settings: ' + err.message, 5000, 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 bg-white flex items-center justify-center h-full">
        <div className="text-gray-500">Loading user settings...</div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="p-10 bg-white flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-10 bg-white pb-32 pl-16">
      {/* Heading and Description */}
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

          {/* Password change fields - only show when isChangePwOn is true */}
          {isChangePwOn && (
            <>
              <div>
                <label className="block text-[16px] font-medium text-[#949494] mb-1">Current Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                    className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="focus:outline-none"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  <img
                    src={formData.currentPassword && formData.currentPassword.trim() ? correctImage : issueImage}
                    alt="Validation Status"
                    className="h-[18px] w-auto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[16px] font-medium text-[#949494] mb-1">New Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="focus:outline-none"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  <img
                    src={formData.newPassword && formData.newPassword.length >= 4 ? correctImage : issueImage}
                    alt="Validation Status"
                    className="h-[18px] w-auto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[16px] font-medium text-[#949494] mb-1">Confirm New Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showRetypePassword ? 'text' : 'password'}
                    name="retypePassword"
                    value={formData.retypePassword}
                    onChange={handleInputChange}
                    placeholder="Retype new password"
                    className="w-3/4 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRetypePassword((prev) => !prev)}
                    className="focus:outline-none"
                  >
                    {showRetypePassword ? (
                      <EyeOff className="h-5 w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  <img
                    src={formData.retypePassword && formData.retypePassword === formData.newPassword ? correctImage : issueImage}
                    alt="Validation Status"
                    className="h-[18px] w-auto"
                  />
                </div>
              </div>
            </>
          )}
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
          disabled={saving}
          className="w-[12rem] h-10 px-4 py-2 bg-[#D01710] text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          Reset to Default
        </button>
        {!isChangePwOn ? (
          <button
            onClick={() => setIsChangePwOn(true)}
            disabled={saving}
            className="px-6 py-2 h-10 min-w-[11rem] bg-blue-600 text-white hover:bg-[#1A318C] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Change Password
          </button>
        ) : (
          <button
            onClick={() => {
              setIsChangePwOn(false);
              setFormData((prev) => ({
                ...prev,
                currentPassword: '',
                retypePassword: '',
                newPassword: ''
              }));
            }}
            disabled={saving}
            className="px-6 py-2 h-10 min-w-[11rem] bg-gray-500 text-white hover:bg-[#59595a] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Cancel Password
          </button>
        )}
        <button
          onClick={handleClear}
          disabled={saving}
          className="px-6 py-2 w-[8rem] h-10 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
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
  );
}

export default UserSettings;
