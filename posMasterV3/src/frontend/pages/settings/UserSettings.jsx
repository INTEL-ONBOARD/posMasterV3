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
    SaleAccess: {
      sale_process: false,
      sale_history: false,
      sale_view_inventory: false,
      sale_reports: false,
      sale_configurations: false,
      sale_discounts: false,
    },
    InventoryAccess: {
      inventory_view: false,
      inventory_register_item: false,
      inventory_restock: false,
      inventory_return_list: false,
      inventory_dispose: false,
      inventory_suppliers: false,
      inventory_discount: false,
      inventory_price_change: false,
      inventory_history: false,
      inventory_configurations: false,
      inventory_reports: false,
    },
    UserAccess: {
      user_manage: false,
      user_role_manage: false,
    },
    ReportAccess: {
      view_reports: false,
      generate_reports: false,
      export_reports: false,
    },
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
            setPermissions(prev => ({
              SaleAccess: settings.permissions.SaleAccess || prev.SaleAccess,
              InventoryAccess: settings.permissions.InventoryAccess || prev.InventoryAccess,
              UserAccess: settings.permissions.UserAccess || prev.UserAccess,
              ReportAccess: settings.permissions.ReportAccess || prev.ReportAccess,
            }));
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

  const handlePermissionChange = (category, permission) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: !prev[category][permission],
      },
    }));
  };

  // Helper to format permission keys for display
  const formatPermissionLabel = (key) => {
    return key
      .replace(/^(sale_|inventory_|user_)/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Helper to check if any permission in a category is enabled
  const hasCategoryAccess = (categoryPerms) => {
    return Object.values(categoryPerms).some(v => v === true);
  };

  // Compress image to reduce storage size
  const compressImage = (file, maxWidth = 200, maxHeight = 200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Compress image before storing (200x200, 80% quality)
        const compressedImage = await compressImage(file, 200, 200, 0.8);
        console.log('[UserSettings] Original size:', file.size, 'Compressed size:', compressedImage.length);

        setProfileImage(compressedImage);

        // Save profile image to backend
        if (formData.id) {
          const response = await settingsApi.updateProfileImage(formData.id, compressedImage);
          if (response.status === 'success') {
            toast.open('Profile image updated', 3000, 'Success', 'success');
          }
        }
      } catch (err) {
        console.error('[UserSettings] Image upload error:', err);
        toast.open('Failed to upload image', 3000, 'Error', 'error');
      }
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
      SaleAccess: {
        sale_process: true,
        sale_history: false,
        sale_view_inventory: false,
        sale_reports: false,
        sale_configurations: false,
        sale_discounts: false,
      },
      InventoryAccess: {
        inventory_view: false,
        inventory_register_item: false,
        inventory_restock: false,
        inventory_return_list: false,
        inventory_dispose: false,
        inventory_suppliers: false,
        inventory_discount: false,
        inventory_price_change: false,
        inventory_history: false,
        inventory_configurations: false,
        inventory_reports: false,
      },
      UserAccess: {
        user_manage: false,
        user_role_manage: false,
      },
      ReportAccess: {
        view_reports: false,
        generate_reports: false,
        export_reports: false,
      },
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
      // Update user profile (role is read-only, managed by admin)
      const profileData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.fullName
      };

      const profileResult = await settingsApi.updateUserProfile(formData.id, profileData);

      if (profileResult.status !== 'success') {
        toast.open(profileResult.message || 'Failed to update profile', 5000, 'Error', 'error');
        setSaving(false);
        return;
      }

      // Note: Permissions are read-only and managed by administrators via ManageUser

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
            <div className="w-3/5 px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] text-gray-700 capitalize">
              {formData.role || 'No role assigned'}
            </div>
            <p className="text-xs text-gray-400 mt-1 italic">Role can only be changed by an administrator</p>
          </div>

          <div>
            <label className="block text-[16px] font-medium text-[#949494] mb-2">Allowed Permissions</label>
            <p className="text-xs text-gray-400 mb-3 italic">Permissions are based on your assigned role (read-only)</p>
            <div className="space-y-4 w-full max-h-[20rem] overflow-y-auto pr-2">
              {Object.entries(permissions).map(([category, perms]) => (
                <div key={category} className="border-b border-gray-100 pb-3">
                  <div className="flex items-center justify-between py-1 mb-2">
                    <span className="text-sm font-bold text-gray-500">
                      {category.replace('Access', '').replace(/([A-Z])/g, ' $1').trim()} Access
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      hasCategoryAccess(perms) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {Object.values(perms).filter(v => v).length}/{Object.keys(perms).length}
                    </span>
                  </div>
                  {Object.entries(perms).map(([perm, value]) => (
                    <div key={perm} className="flex items-center justify-between py-1 pl-4">
                      <span className="text-sm text-gray-400">
                        {formatPermissionLabel(perm)}
                      </span>
                      <div className="relative inline-flex items-center">
                        <div className={`w-9 h-5 rounded-full ${value ? 'bg-blue-600' : 'bg-gray-200'} after:content-[''] after:absolute after:top-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${value ? 'after:left-[18px]' : 'after:left-[2px]'}`}></div>
                      </div>
                    </div>
                  ))}
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
