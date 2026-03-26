import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { settingsApi } from '../../api/localApi';
import { localAuth } from '../../api/services/localAuth';
import StatusModal from '../../components/StatusModal.jsx';

function UserSettings() {
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
  const navigate = useNavigate();

  // Section collapse states
  const [openProfile, setOpenProfile] = useState(true);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openPermissions, setOpenPermissions] = useState(false);

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    username: '',
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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
  });

  const [profileImage, setProfileImage] = useState(null);

  // Helper to format permission keys for display
  const formatPermissionLabel = (key) => {
    return key
      .replace(/^(sale_|inventory_|user_)/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Load current user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const currentUser = await localAuth.getCurrentUser();

        if (!currentUser) {
          setLoading(false);
          return;
        }

        const userId = currentUser.id || currentUser._id;
        const response = await settingsApi.getUserSettings(userId);

        if (response.status === 'success' && response.data) {
          const user = response.data.user;
          const settings = response.data.settings;

          setUserData(user);

          // Check if user is admin
          const userRoles = Array.isArray(user.roles) ? user.roles :
            (typeof user.roles === 'string' ? JSON.parse(user.roles) : []);
          const adminCheck = userRoles.some(role =>
            ['admin', 'superadmin', 'Admin', 'SuperAdmin'].includes(role)
          );
          setIsAdmin(adminCheck);

          setFormData({
            id: user.id || user._id || '',
            username: user.username || '',
            fullName: user.full_name || '',
            email: user.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            role: Array.isArray(user.roles) ? user.roles[0] : (user.roles || '')
          });

          // For admin users, set all permissions to true
          if (adminCheck) {
            setPermissions({
              SaleAccess: {
                sale_process: true,
                sale_history: true,
                sale_view_inventory: true,
                sale_reports: true,
                sale_configurations: true,
                sale_discounts: true,
              },
              InventoryAccess: {
                inventory_view: true,
                inventory_register_item: true,
                inventory_restock: true,
                inventory_suppliers: true,
                inventory_discount: true,
                inventory_price_change: true,
                inventory_history: true,
                inventory_configurations: true,
                inventory_reports: true,
              },
              UserAccess: {
                user_manage: true,
                user_role_manage: true,
              },
            });
          } else if (settings && settings.permissions) {
            setPermissions(prev => ({
              SaleAccess: settings.permissions.SaleAccess || prev.SaleAccess,
              InventoryAccess: settings.permissions.InventoryAccess || prev.InventoryAccess,
              UserAccess: settings.permissions.UserAccess || prev.UserAccess,
            }));
          }

          if (settings && settings.profile_image) {
            setProfileImage(settings.profile_image);
          }
        }
      } catch (err) {
        console.error('[UserSettings] Fetch error:', err);
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

  // Compress image
  const compressImage = (file, maxWidth = 200, maxHeight = 200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

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
          resolve(canvas.toDataURL('image/jpeg', quality));
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
        const compressedImage = await compressImage(file, 200, 200, 0.8);
        setProfileImage(compressedImage);

        if (formData.id) {
          const response = await settingsApi.updateProfileImage(formData.id, compressedImage);
          if (response.status === 'success') {
            setStatusModal({ open: true, type: 'success', description: 'Profile image updated' });
          }
        }
      } catch (err) {
        setStatusModal({ open: true, type: 'failed', description: 'Failed to upload image' });
      }
    }
  };

  const handleClear = () => {
    if (userData) {
      setFormData({
        id: userData.id || userData._id || '',
        username: userData.username || '',
        fullName: userData.full_name || '',
        email: userData.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        role: Array.isArray(userData.roles) ? userData.roles[0] : (userData.roles || '')
      });
    }
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = async () => {
    if (formData.email && !isValidEmail(formData.email)) {
      setStatusModal({ open: true, type: 'failed', description: 'Enter a valid Email Address' });
      return;
    }

    if (!formData.username?.trim()) {
      setStatusModal({ open: true, type: 'failed', description: 'Username is required' });
      return;
    }

    if (!formData.fullName?.trim()) {
      setStatusModal({ open: true, type: 'failed', description: 'Full name is required' });
      return;
    }

    // Handle password change if fields are filled
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setStatusModal({ open: true, type: 'failed', description: 'Current password is required' });
        return;
      }

      if (!formData.newPassword || formData.newPassword.length < 6) {
        setStatusModal({ open: true, type: 'failed', description: 'New password must be at least 6 characters' });
        return;
      }

      if (formData.confirmPassword !== formData.newPassword) {
        setStatusModal({ open: true, type: 'failed', description: 'New passwords do not match' });
        return;
      }

      try {
        const pwResult = await localAuth.changePassword(formData.currentPassword, formData.newPassword);
        if (!pwResult.success) {
          setStatusModal({ open: true, type: 'failed', description: pwResult.message || 'Password change failed' });
          return;
        }
        setStatusModal({ open: true, type: 'success', description: 'Password changed. Please log in again.' });
        await localAuth.logout();
        setTimeout(() => navigate('/'), 1500);
        return;
      } catch (err) {
        setStatusModal({ open: true, type: 'failed', description: 'Password change failed: ' + err.message });
        return;
      }
    }

    setSaving(true);

    try {
      const profileData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.fullName
      };

      const profileResult = await settingsApi.updateUserProfile(formData.id, profileData);

      if (profileResult.status !== 'success') {
        setStatusModal({ open: true, type: 'failed', description: profileResult.message || 'Failed to update profile' });
        setSaving(false);
        return;
      }

      setStatusModal({ open: true, type: 'success', description: 'Settings saved successfully' });

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (err) {
      setStatusModal({ open: true, type: 'failed', description: 'Failed to save settings: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-gray-100 w-full h-[calc(100vh-2rem)] items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-4"></div>
          <span className="text-gray-500 text-sm font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 w-full h-[calc(100vh-2rem)] relative">
      {/* Left Panel - Form */}
      <div className="w-[28rem] h-[calc(100vh-2rem)] p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {/* Profile Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenProfile(!openProfile);
                if (!openProfile) {
                  setOpenSecurity(false);
                  setOpenPermissions(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#1A318C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile Information</span>
              </div>
              {openProfile ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openProfile && (
              <div className="px-5 pb-5 border-t border-gray-100">
                {/* Profile Image */}
                <div className="flex flex-col items-center py-4">
                  <div className={`relative w-24 h-24 ${profileImage ? 'ring-4 ring-[#1A318C]/20' : 'border-2 border-dashed border-gray-300'} flex flex-col items-center justify-center hover:border-[#1A318C] transition-all duration-300 rounded-full overflow-hidden bg-gray-50`}>
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <input type="file" id="profileUpload" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <label
                    htmlFor="profileUpload"
                    className="mt-3 px-4 py-2 bg-[#1A318C] text-white text-xs font-medium rounded-lg hover:bg-[#152870] transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </label>
                </div>

                {/* Form Fields */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Username *</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter username"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Role</label>
                  <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 capitalize">
                    {formData.role || 'No role assigned'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 italic">Role can only be changed by an administrator</p>
                </div>
              </div>
            )}
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenSecurity(!openSecurity);
                if (!openSecurity) {
                  setOpenProfile(false);
                  setOpenPermissions(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Security</span>
              </div>
              {openSecurity ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openSecurity && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Leave password fields empty if you don't want to change it
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Enter current password"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="New password"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm password"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Permissions Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenPermissions(!openPermissions);
                if (!openPermissions) {
                  setOpenProfile(false);
                  setOpenSecurity(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Permissions</span>
              </div>
              {openPermissions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {openPermissions && (
              <div className="px-5 pb-5 border-t border-gray-100">
                {isAdmin ? (
                  <p className="text-xs text-emerald-600 italic py-3 flex items-center gap-2 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Administrator - Full access to all features
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Permissions are based on your assigned role (read-only)
                  </p>
                )}

                <div className="space-y-4 max-h-[30rem] overflow-y-auto">
                  {Object.entries(permissions).map(([category, perms]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                          {category.replace("Access", " Access")}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          Object.values(perms).some(v => v) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {Object.values(perms).filter(v => v).length}/{Object.keys(perms).length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(perms).map(([perm, value]) => (
                          <div key={perm} className="flex items-center justify-between py-1.5 px-2 bg-white rounded-md">
                            <span className="text-sm text-gray-600">{formatPermissionLabel(perm)}</span>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                              {value ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-row w-full gap-3 mt-4">
          <button
            onClick={handleClear}
            disabled={saving}
            className="flex-1 min-w-0 h-11 px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[1.5] min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl text-sm font-semibold hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Right Panel - Info Card */}
      <div className="flex-1 h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* User Profile Section */}
          <div className="w-full max-w-sm">
            {/* Profile Avatar & Name */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-28 h-28 rounded-full border-4 border-[#1A318C]/20 overflow-hidden bg-gray-50 mb-4">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-800">{formData.fullName || 'User Name'}</h2>
              <p className="text-gray-400 text-sm">@{formData.username || 'username'}</p>
            </div>

            {/* Info Rows */}
            <div className="space-y-3">
              {/* Role Row */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1A318C]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1A318C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Role</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1A318C]/10 text-[#1A318C]'
                }`}>
                  {formData.role ? formData.role.charAt(0).toUpperCase() + formData.role.slice(1) : 'No Role'}
                </span>
              </div>

              {/* Email Row */}
              <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Email</span>
                </div>
                <span className="text-sm text-gray-800 font-medium truncate max-w-[180px]">
                  {formData.email || 'Not set'}
                </span>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="mt-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Access Permissions</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {Object.values(permissions.SaleAccess).filter(v => v).length}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Sales</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {Object.values(permissions.InventoryAccess).filter(v => v).length}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Inventory</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {Object.values(permissions.UserAccess).filter(v => v).length}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Users</p>
                </div>
              </div>
            </div>

            {/* Admin Badge */}
            {isAdmin && (
              <div className="mt-6 flex items-center gap-2 py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium text-emerald-700">Administrator - Full System Access</span>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center max-w-xs">
            <p className="text-xs text-gray-400">
              Manage your personal information and security settings. Permissions are assigned by an administrator.
            </p>
          </div>
        </div>
      </div>
      <StatusModal
        isOpen={statusModal.open}
        closeModal={() => setStatusModal({ open: false, type: null, description: "" })}
        type={statusModal.type}
        description={statusModal.description}
        context="user"
      />
    </div>
  );
}

export default UserSettings;
