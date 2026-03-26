import React, { useEffect, useContext, useRef, useState, useCallback } from "react";
import { X, ChevronDown, ChevronUp, Upload, RefreshCw } from "lucide-react";
import { userApi, authApi, branchApi, settingsApi } from "../../api/localApi";
import ToastContext from "../toasts/ToastService";
import { useReactiveData, TABLES } from "../../store";
import StatusModal from "../../components/StatusModal.jsx";

function ManageUser() {
  const toast = useContext(ToastContext);

  // Form section collapse controls
  const [openUser, setOpenUser] = useState(true);
  const [openPermission, setOpenPermission] = useState(false);

  // Use reactive data hooks for users and branches
  const { data: userList, loading: isLoading, refetch: refetchUsers } = useReactiveData(
    TABLES.USERS
  );

  const { data: branchList } = useReactiveData(
    TABLES.BRANCHES
  );

  // Search loading state
  const [searchLoading, setSearchLoading] = useState(false);
  const [rolesList, setRolesList] = useState([
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "cashier", label: "Cashier" },
    { value: "assistant", label: "Assistant" },
    { value: "user", label: "User" }
  ]);
  
  // Default permissions structure
  const defaultPermissions = {
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
  };

  // Helper to format permission keys for display
  const formatPermissionLabel = (key) => {
    return key
      .replace(/^(sale_|inventory_|user_)/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const [permissions, setPermissions] = useState(defaultPermissions);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchRole, setSearchRole] = useState("All");
  const [searchStatus, setSearchStatus] = useState("All");

  // Form states
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [formStatus, setFormStatus] = useState("form");
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const [pendingSelectUser, setPendingSelectUser] = useState(null);
  const timerRef = useRef(null);
  const originalFormDataRef = useRef(null);

  const closeStatusModal = () => {
    setStatusModal({ open: false, type: null, description: "" });
    setFormStatus("form");
  };

  // Form data
  const [formData, setFormData] = useState({
    id: "",
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirm_password: "",
    roles: ["cashier"],
    is_active: true,
    branch_id: "",
    profile_image: "",
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Initial data load - just load role permissions, data is handled by reactive hooks
  useEffect(() => {
    loadRolePermissions();
  }, []);

  // Search handler with debounce
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 400);
  };

  // Parse roles - handle string or array format (for filtering)
  const parseUserRoles = (roles) => {
    if (!roles) return [];
    if (Array.isArray(roles)) return roles;
    if (typeof roles === 'string') {
      try {
        const parsed = JSON.parse(roles);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        return [roles];
      }
    }
    return [];
  };

  // Filter users based on search criteria
  const filteredUsers = (userList || []).filter((user) => {
    // Role filter
    const userRoles = parseUserRoles(user.roles);
    const matchesRole = searchRole === "All" || userRoles.includes(searchRole.toLowerCase());

    // Status filter
    const matchesStatus =
      searchStatus === "All" ||
      (searchStatus === "Active" && user.is_active) ||
      (searchStatus === "Inactive" && !user.is_active);

    // Text search
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (user.full_name || "").toLowerCase().includes(searchLower) ||
      (user.username || "").toLowerCase().includes(searchLower) ||
      (user.email || "").toLowerCase().includes(searchLower);

    return matchesRole && matchesStatus && matchesSearch;
  });

  // Default role-based permissions (fallback if not saved in settings)
  const defaultRolePermissions = {
    admin: {
      SaleAccess: {
        sale_process: true, sale_history: true, sale_view_inventory: true,
        sale_reports: true, sale_configurations: true, sale_discounts: true,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: true, inventory_restock: true,
        inventory_suppliers: true, inventory_discount: true, inventory_price_change: true,
        inventory_history: true, inventory_configurations: true, inventory_reports: true,
      },
      UserAccess: { user_manage: true, user_role_manage: true },
    },
    manager: {
      SaleAccess: {
        sale_process: true, sale_history: true, sale_view_inventory: true,
        sale_reports: true, sale_configurations: true, sale_discounts: true,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: true, inventory_restock: true,
        inventory_suppliers: true, inventory_discount: true, inventory_price_change: true,
        inventory_history: true, inventory_configurations: false, inventory_reports: true,
      },
      UserAccess: { user_manage: true, user_role_manage: false },
    },
    cashier: {
      SaleAccess: {
        sale_process: true, sale_history: true, sale_view_inventory: true,
        sale_reports: false, sale_configurations: false, sale_discounts: true,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: false, inventory_restock: false,
        inventory_suppliers: false, inventory_discount: false, inventory_price_change: false,
        inventory_history: false, inventory_configurations: false, inventory_reports: false,
      },
      UserAccess: { user_manage: false, user_role_manage: false },
    },
    assistant: {
      SaleAccess: {
        sale_process: true, sale_history: false, sale_view_inventory: true,
        sale_reports: false, sale_configurations: false, sale_discounts: false,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: false, inventory_restock: false,
        inventory_suppliers: false, inventory_discount: false, inventory_price_change: false,
        inventory_history: false, inventory_configurations: false, inventory_reports: false,
      },
      UserAccess: { user_manage: false, user_role_manage: false },
    },
    user: {
      SaleAccess: {
        sale_process: true, sale_history: false, sale_view_inventory: true,
        sale_reports: false, sale_configurations: false, sale_discounts: false,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: false, inventory_restock: false,
        inventory_suppliers: false, inventory_discount: false, inventory_price_change: false,
        inventory_history: false, inventory_configurations: false, inventory_reports: false,
      },
      UserAccess: { user_manage: false, user_role_manage: false },
    },
  };

  // Role permissions state (can be modified by admin in ManageRole)
  const [rolePermissions, setRolePermissions] = useState(defaultRolePermissions);

  // Load role permissions and custom roles from app_settings
  const loadRolePermissions = async () => {
    try {
      const response = await settingsApi.getAppSettings();
      if (response.status === "success" && response.data) {
        // Merge saved system role permissions with defaults
        if (response.data.system_role_permissions) {
          const savedPerms = response.data.system_role_permissions;
          const mergedPerms = { ...defaultRolePermissions };
          Object.keys(savedPerms).forEach(roleId => {
            mergedPerms[roleId] = savedPerms[roleId];
          });
          setRolePermissions(mergedPerms);
        }

        // Append custom roles to the roles dropdown
        const customRoles = response.data.custom_roles || [];
        if (customRoles.length > 0) {
          setRolesList(prev => {
            const systemIds = new Set(prev.map(r => r.value));
            const newCustom = customRoles
              .filter(r => !systemIds.has(r.id))
              .map(r => ({ value: r.id, label: r.name }));
            return newCustom.length > 0 ? [...prev, ...newCustom] : prev;
          });
        }
        console.log("[ManageUser] Loaded saved role permissions and custom roles");
      }
    } catch (error) {
      console.log("[ManageUser] Using default role permissions");
    }
  };

  // Check if form has unsaved changes compared to originally loaded user data
  const isFormDirty = () => {
    if (!isUserEditing) return false;
    const orig = originalFormDataRef.current;
    if (!orig) return false;
    return !!(
      formData.full_name !== orig.full_name ||
      formData.username !== orig.username ||
      formData.email !== orig.email ||
      JSON.stringify(formData.roles) !== JSON.stringify(orig.roles) ||
      String(formData.branch_id) !== String(orig.branch_id) ||
      formData.is_active !== orig.is_active ||
      formData.password ||
      formData.confirm_password
    );
  };

  // Handle clicking a user in the list — show dirty warning if needed
  const handleSelectUser = (user) => {
    if (isFormDirty()) {
      setPendingSelectUser(user);
      setShowDirtyWarning(true);
    } else {
      loadUser(user);
    }
  };

  // Load user into form for editing
  const loadUser = async (user) => {
    setIsUserEditing(true);

    let profileImg = "";
    const parsedUserRoles = parseUserRoles(user.roles);
    const userRole = parsedUserRoles.length > 0 ? parsedUserRoles[0] : "cashier";

    // Load user permissions and profile image
    try {
      const settingsResponse = await settingsApi.getUserSettings(user.id);
      console.log("[ManageUser] Settings response:", settingsResponse);
      console.log("[ManageUser] Full data:", JSON.stringify(settingsResponse.data, null, 2));

      // Response structure is: { data: { user, settings: { permissions, profile_image, ... } } }
      if (settingsResponse.status === "success" && settingsResponse.data?.settings) {
        const settings = settingsResponse.data.settings;
        console.log("[ManageUser] Settings object:", settings);
        console.log("[ManageUser] Profile image exists:", !!settings.profile_image);
        console.log("[ManageUser] Profile image type:", typeof settings.profile_image);
        if (settings.profile_image) {
          console.log("[ManageUser] Profile image length:", settings.profile_image.length);
          console.log("[ManageUser] Profile image starts with:", settings.profile_image.substring(0, 50));
        }

        // Get profile image from settings
        if (settings.profile_image) {
          profileImg = settings.profile_image;
          console.log("[ManageUser] Setting profile image to formData");
        }

        // Load permissions - check if it has the new structure (sale_process key exists in SaleAccess)
        if (settings.permissions) {
          const loadedPerms = settings.permissions;

          // Check if permissions use new structure by checking for new keys
          const hasNewSaleKeys = loadedPerms.SaleAccess && typeof loadedPerms.SaleAccess === 'object' && 'sale_process' in loadedPerms.SaleAccess;
          const hasNewInventoryKeys = loadedPerms.InventoryAccess && typeof loadedPerms.InventoryAccess === 'object' && 'inventory_view' in loadedPerms.InventoryAccess;

          if (hasNewSaleKeys && hasNewInventoryKeys) {
            // New structure - merge with defaults to fill any missing keys
            setPermissions({
              SaleAccess: { ...defaultPermissions.SaleAccess, ...(loadedPerms.SaleAccess || {}) },
              InventoryAccess: { ...defaultPermissions.InventoryAccess, ...(loadedPerms.InventoryAccess || {}) },
              UserAccess: { ...defaultPermissions.UserAccess, ...(loadedPerms.UserAccess || {}) },
            });
          } else {
            // Old structure - use role-based defaults
            console.log("[ManageUser] Old permission structure detected, using role-based defaults for:", userRole);
            setPermissions(rolePermissions[userRole] || defaultPermissions);
          }
        } else {
          // No permissions saved - use role-based defaults
          console.log("[ManageUser] No permissions found, using role-based defaults for:", userRole);
          setPermissions(rolePermissions[userRole] || defaultPermissions);
        }
      } else {
        // No settings - use role-based defaults
        setPermissions(rolePermissions[userRole] || defaultPermissions);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
      setPermissions(rolePermissions[userRole] || defaultPermissions);
    }

    console.log("[ManageUser] Final profileImg value:", profileImg ? profileImg.substring(0, 80) + "..." : "EMPTY");

    // Parse roles to ensure it's an array
    const parsedRoles = parseUserRoles(user.roles);
    const finalRoles = parsedRoles.length > 0 ? parsedRoles : ["cashier"];

    const loadedFormData = {
      id: user.id,
      username: user.username || "",
      email: user.email || "",
      full_name: user.full_name || "",
      password: "",
      confirm_password: "",
      roles: finalRoles,
      is_active: user.is_active !== undefined ? user.is_active : true,
      branch_id: user.branch_id || "",
      profile_image: profileImg,
    };
    setFormData(loadedFormData);
    // Snapshot original values for dirty tracking
    originalFormDataRef.current = {
      full_name: loadedFormData.full_name,
      username: loadedFormData.username,
      email: loadedFormData.email,
      roles: [...loadedFormData.roles],
      branch_id: loadedFormData.branch_id,
      is_active: loadedFormData.is_active,
    };

    console.log("[ManageUser] FormData updated with profile_image:", profileImg ? "YES" : "NO");
    console.log("[ManageUser] User roles:", user.roles, "-> Parsed:", finalRoles);
  };

  // Clear form
  const clearUserInput = () => {
    setFormData({
      id: "",
      username: "",
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
      roles: ["cashier"],
      is_active: true,
      branch_id: "",
      profile_image: "",
    });
    originalFormDataRef.current = null;
    setPermissions(defaultPermissions);
    setIsUserEditing(false);
    // Reset file input
    const fileInput = document.getElementById("profileImageUpload");
    if (fileInput) fileInput.value = "";
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
    } else if (name === "roles") {
      setFormData((prev) => ({ ...prev, roles: [value] }));
      // Only apply role-based defaults on new user creation, not when editing
      // to avoid overwriting existing custom permissions
      if (!isUserEditing) {
        const selectedRolePerms = rolePermissions[value];
        if (selectedRolePerms) {
          setPermissions(selectedRolePerms);
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle permission toggle
  const handlePermissionChange = (category, permission) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: !prev[category][permission],
      },
    }));
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

  // Handle profile image upload
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.open("Only image files are allowed (JPEG, PNG, WebP, GIF)", 4000, "Error", "error");
        e.target.value = "";
        return;
      }
      // Validate file size (max 5MB before compression)
      const MAX_SIZE_MB = 5;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.open(`Image file must be smaller than ${MAX_SIZE_MB}MB`, 4000, "Error", "error");
        e.target.value = "";
        return;
      }
      try {
        // Compress image before storing (200x200, 80% quality)
        const compressedImage = await compressImage(file, 200, 200, 0.8);
        console.log('[ManageUser] Original size:', file.size, 'Compressed size:', compressedImage.length);

        // Update form data with the new image
        setFormData(prev => ({ ...prev, profile_image: compressedImage }));

        // If editing an existing user, save immediately
        if (isUserEditing && formData.id) {
          const response = await settingsApi.updateProfileImage(formData.id, compressedImage);
          if (response.status === 'success') {
            toast.open('Profile image updated', 3000, 'Success', 'success');
          } else {
            toast.open('Failed to save profile image', 3000, 'Error', 'error');
          }
        }
      } catch (err) {
        console.error('[ManageUser] Image upload error:', err);
        toast.open('Failed to upload image', 3000, 'Error', 'error');
      }
    }
  };

  // Validate form data
  const validateFormData = () => {
    if (!formData.full_name?.trim()) {
      toast.open("Please enter full name", 4000, "Validation Error", "error");
      return false;
    }

    // Username: required, 3–30 chars, alphanumeric + underscore only
    const username = formData.username?.trim() || "";
    if (!username) {
      toast.open("Please enter username", 4000, "Validation Error", "error");
      return false;
    }
    if (username.length < 3 || username.length > 30) {
      toast.open("Username must be between 3 and 30 characters", 4000, "Validation Error", "error");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.open("Username can only contain letters, numbers, and underscores", 4000, "Validation Error", "error");
      return false;
    }

    if (!formData.email?.trim()) {
      toast.open("Please enter email", 4000, "Validation Error", "error");
      return false;
    }
    // Stricter email validation
    if (!/^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/.test(formData.email.trim())) {
      toast.open("Please enter a valid email address", 4000, "Validation Error", "error");
      return false;
    }

    // Password validation only for new users
    if (!isUserEditing) {
      if (!formData.password?.trim()) {
        toast.open("Please enter password", 4000, "Validation Error", "error");
        return false;
      }
      if (formData.password.length < 6) {
        toast.open("Password must be at least 6 characters", 4000, "Validation Error", "error");
        return false;
      }
      if (!/[0-9]/.test(formData.password)) {
        toast.open("Password must contain at least one number", 4000, "Validation Error", "error");
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        toast.open("Passwords do not match", 4000, "Validation Error", "error");
        return false;
      }
    }

    // For editing, only validate password if provided
    if (isUserEditing && formData.password) {
      if (formData.password.length < 6) {
        toast.open("Password must be at least 6 characters", 4000, "Validation Error", "error");
        return false;
      }
      if (!/[0-9]/.test(formData.password)) {
        toast.open("Password must contain at least one number", 4000, "Validation Error", "error");
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        toast.open("Passwords do not match", 4000, "Validation Error", "error");
        return false;
      }
    }

    return true;
  };

  // Create new user
  const registerUser = async (e) => {
    e.preventDefault();

    if (!validateFormData()) {
      return;
    }

    setFormStatus("loading");

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        roles: formData.roles,
        branch_id: formData.branch_id || null,
      };

      const response = await authApi.register(userData);

      if (response.status === "success") {
        // Save user permissions and profile image (must succeed for a complete user setup)
        if (response.data?.id) {
          try {
            await settingsApi.updateUserPermissions(response.data.id, permissions);
          } catch (permErr) {
            console.error("[ManageUser] Failed to save user permissions:", permErr);
            toast.open("User created but permissions could not be saved — please edit the user to set permissions", 6000, "Warning", "warning");
          }

          // Save profile image if uploaded (non-critical)
          if (formData.profile_image) {
            try {
              await settingsApi.updateProfileImage(response.data.id, formData.profile_image);
            } catch (imgErr) {
              console.error("[ManageUser] Failed to save profile image:", imgErr);
            }
          }
        }

        setStatusModal({ open: true, type: 'success', description: `User "${formData.full_name}" created successfully` });
        clearUserInput();
        // Refetch users after successful creation
        await refetchUsers();
        setFormStatus("form");
      } else {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: response.message || 'Failed to create user' });
      }
    } catch (err) {
      console.error("Create user error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Failed to create user' });
    }
  };

  // Update existing user
  const updateUser = async (e) => {
    e.preventDefault();

    if (!validateFormData()) {
      return;
    }

    setFormStatus("loading");

    try {
      const updateData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        roles: formData.roles,
        branch_id: formData.branch_id || null,
        is_active: formData.is_active ? 1 : 0, // Convert boolean to integer for SQLite
      };

      const response = await userApi.update(formData.id, updateData);

      if (response.status === "success") {
        // Reset password if provided
        if (formData.password) {
          const pwResult = await userApi.resetPassword(formData.id, formData.password);
          if (!pwResult.success) {
            setFormStatus("form");
            setStatusModal({ open: true, type: 'failed', description: pwResult.message || 'Failed to reset password' });
            return;
          }
        }

        // Update user permissions
        try {
          await settingsApi.updateUserPermissions(formData.id, permissions);
        } catch (permErr) {
          console.error("[ManageUser] Failed to save permissions on update:", permErr);
          toast.open("User updated but permissions could not be saved — please edit the user to set permissions", 6000, "Warning", "warning");
        }

        setStatusModal({ open: true, type: 'success', description: `User "${formData.full_name}" updated successfully` });
        clearUserInput();
        // Refetch users after successful update
        await refetchUsers();
        setFormStatus("form");
      } else {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: response.message || 'Failed to update user' });
      }
    } catch (err) {
      console.error("Update user error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Failed to update user' });
    }
  };

  // Delete user — called only after confirmation dialog approves
  const deleteUser = async () => {
    setShowDeleteConfirm(false);

    if (!formData.id) {
      toast.open("Please select a user to delete", 4000, "Error", "error");
      return;
    }

    setFormStatus("loading");

    try {
      const response = await userApi.delete(formData.id, true);

      if (response.status === "success") {
        const description = response.message?.includes('deactivated')
          ? 'User deactivated (has transaction history)'
          : 'User deleted successfully';
        setStatusModal({ open: true, type: 'success', description });
        clearUserInput();
        await refetchUsers();
        setFormStatus("form");
      } else {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: response.message || 'Failed to delete user' });
      }
    } catch (err) {
      console.error("Delete user error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Failed to delete user' });
    }
  };

  // Get role display name
  const getRoleDisplay = (roles) => {
    const parsedRoles = parseUserRoles(roles);
    if (parsedRoles.length === 0) return "No Role";
    return parsedRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ");
  };

  return (
    <div className="flex bg-gray-100 w-full h-[calc(100vh-2rem)] relative">
      {formStatus === "form" ? (
        <div className="w-[28rem] h-[calc(100vh-2rem)] p-4 overflow-y-auto">
          {/* Form section */}
          <div className="flex flex-col gap-4">
            {/* Primary Description Block */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => {
                  setOpenUser(!openUser)
                  setOpenPermission(!openPermission)
                }}
                className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#1A318C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">User Information</span>
                </div>
                {(openUser && !openPermission) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {(openUser && !openPermission) && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="flex flex-col items-center py-4">
                    {/* Profile image with upload */}
                    <div className={`relative w-24 h-24 ${formData.profile_image ? 'ring-4 ring-[#1A318C]/20' : 'border-2 border-dashed border-gray-300'} flex flex-col items-center justify-center hover:border-[#1A318C] transition-all duration-300 rounded-full overflow-hidden bg-gray-50`}>
                      {formData.profile_image ? (
                        <img
                          src={formData.profile_image}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                          onError={(e) => {
                            console.error("[ManageUser] Image failed to load");
                            e.target.style.display = 'none';
                            toast.open("Profile image could not be displayed", 3000, "Warning", "warning");
                          }}
                          onLoad={() => {
                            console.log("[ManageUser] Image loaded successfully");
                          }}
                        />
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Upload button */}
                    <input
                      type="file"
                      id="profileImageUpload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileImageUpload}
                    />
                    <label
                      htmlFor="profileImageUpload"
                      className="mt-3 px-4 py-2 bg-[#1A318C] text-white text-xs font-medium rounded-lg hover:bg-[#152870] transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </label>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Username *
                      </label>
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
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Email *
                      </label>
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Password {!isUserEditing && "*"}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={isUserEditing ? "Leave blank to keep" : "Enter password"}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Confirm Password {!isUserEditing && "*"}
                      </label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleInputChange}
                        placeholder="Confirm password"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Status
                      </label>
                      <select
                        name="is_active"
                        value={formData.is_active ? "true" : "false"}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === "true" }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                        Branch
                      </label>
                      <select
                        name="branch_id"
                        value={formData.branch_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                      >
                        <option value="">Select Branch</option>
                        {(branchList || []).map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Permission Description Block */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => {
                  setOpenPermission(!openPermission)
                  setOpenUser(!openUser)
                }}
                className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Roles & Permissions</span>
                </div>
                {(openPermission && !openUser) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {(openPermission && !openUser) && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="py-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Role
                    </label>
                    <select
                      name="roles"
                      value={formData.roles[0] || "cashier"}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all"
                    >
                      {rolesList.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4 max-h-[30rem] overflow-y-auto">
                    <p className="text-xs text-gray-400 italic mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Permissions are based on the selected role
                    </p>
                    {Object.entries(permissions).map(([category, perms]) => (
                      <div key={category} className="bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 text-xs mb-3 uppercase tracking-wide">
                          {category.replace("Access", " Access")}
                        </div>
                        <div className="space-y-2">
                          {Object.entries(perms).map(([perm, value]) => (
                            <div key={perm} className="flex items-center justify-between py-1.5 px-2 bg-white rounded-md">
                              <span className="text-sm text-gray-600">
                                {formatPermissionLabel(perm)}
                              </span>
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

          {/* Bottom button set */}
          <div className="flex flex-row w-full gap-3 mt-4">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!isUserEditing}
              className={`flex-1 min-w-0 h-11 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isUserEditing
                  ? "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-200"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              onClick={clearUserInput}
              className="flex-1 min-w-0 h-11 px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              onClick={isUserEditing ? updateUser : registerUser}
              className="flex-[1.5] min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl text-sm font-semibold hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isUserEditing ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" : "M12 4v16m8-8H4"} />
              </svg>
              {isUserEditing ? "Update User" : "Add User"}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-[28rem] h-[calc(100vh-2rem)] p-5 flex flex-col justify-center items-center bg-white rounded-xl m-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#1A318C]/10 flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full border-4 border-[#1A318C]/20 border-t-[#1A318C] h-8 w-8"></div>
          </div>
          <h2 className="text-gray-700 font-semibold">Processing...</h2>
          <p className="text-sm text-gray-400 mt-1">Please wait</p>
        </div>
      )}

      {/* Table section */}
      <div className="bg-white flex-1 h-[calc(100vh-2rem)] rounded-l-2xl shadow-sm border-l border-gray-100 overflow-hidden flex flex-col">
        {/* Search bar */}
        <nav className="w-full flex items-center gap-4 p-4 bg-white border-b border-gray-100">
          <div className="flex-1 flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="pl-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search by name, username, or email..."
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-sm"
            />
            <button className="px-6 py-3 bg-[#1A318C] text-white text-sm font-medium hover:bg-[#152870] transition-colors">
              Search
            </button>
            <button
              onClick={refetchUsers}
              disabled={isLoading}
              className="px-3 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <select
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1A318C] transition-colors"
          >
            <option value="All">All Roles</option>
            {rolesList.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1A318C] transition-colors"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* User Count Badge */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400">Users</p>
              <p className="text-lg font-bold text-white tabular-nums">{filteredUsers.length}</p>
            </div>
          </div>
        </nav>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-300 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Full Name</div>
                <div className="col-span-2">Username</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="h-[20rem] w-full flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-4"></div>
                    <span className="text-gray-500 text-sm font-medium">Loading users...</span>
                  </div>
                </div>
              ) : searchLoading ? (
                <div className="h-[20rem] w-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-4"></div>
                  <span className="text-gray-500 text-sm font-medium">Searching...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="h-[16rem] w-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No users found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters</p>
                </div>
              ) : (
                filteredUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                      formData.id === user.id ? "bg-[#1A318C]/5 border-l-4 border-l-[#1A318C]" : ""
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="col-span-1 text-sm text-gray-500 font-medium">{index + 1}</div>
                    <div className="col-span-2 text-sm font-medium text-gray-800">{user.full_name || "-"}</div>
                    <div className="col-span-2 text-sm text-gray-600">{user.username}</div>
                    <div className="col-span-3 text-sm text-gray-600 truncate">{user.email}</div>
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 bg-[#1A318C]/10 text-[#1A318C] rounded-lg text-xs font-semibold">
                        {getRoleDisplay(user.roles)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        user.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user);
                        }}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-[#1A318C] hover:text-white inline-flex items-center justify-center transition-all duration-200 group"
                      >
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <StatusModal
        isOpen={statusModal.open}
        closeModal={closeStatusModal}
        type={statusModal.type}
        description={statusModal.description}
        context="user"
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl p-6 w-80 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-1">Delete User?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-700">{formData.full_name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 shadow-lg shadow-red-200 transition-all duration-200"
                onClick={deleteUser}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dirty-state Warning Dialog */}
      {showDirtyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl p-6 w-80 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-1">Unsaved Changes</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              You have unsaved changes. Switching users will discard them.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                onClick={() => { setShowDirtyWarning(false); setPendingSelectUser(null); }}
              >
                Stay
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all duration-200"
                onClick={() => {
                  setShowDirtyWarning(false);
                  const user = pendingSelectUser;
                  setPendingSelectUser(null);
                  loadUser(user);
                }}
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUser;
