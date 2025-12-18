import React, { useEffect, useContext, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { userApi, authApi, branchApi, settingsApi } from "../../api/localApi";
import ToastContext from "../toasts/ToastService";

function ManageUser() {
  const toast = useContext(ToastContext);

  // Form section collapse controls
  const [openUser, setOpenUser] = useState(true);
  const [openPermission, setOpenPermission] = useState(true);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Data states
  const [userList, setUserList] = useState([]);
  const [branchList, setBranchList] = useState([]);
  const [rolesList] = useState([
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "cashier", label: "Cashier" },
    { value: "assistant", label: "Assistant" }
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
      inventory_return_list: false,
      inventory_dispose: false,
      inventory_suppliers: false,
      inventory_discount: false,
      inventory_price_change: false,
      inventory_history: false,
      inventory_configurations: false,
      inventory_reports: false,
    },
    UserManagerAccess: {
      create_user: false,
      edit_user: false,
      delete_user: false,
    },
    ReportAccess: {
      view_reports: false,
      generate_reports: false,
      export_reports: false,
    },
  };

  // Helper to format permission keys for display
  const formatPermissionLabel = (key) => {
    return key
      .replace(/^(sale_|inventory_)/, '')
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
  const timerRef = useRef(null);

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

  // Fetch users from API
  const fetchUserList = async () => {
    try {
      setIsLoading(true);
      const response = await userApi.getAll();
      if (response.status === "success") {
        setUserList(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.open("Failed to load users", 4000, "Error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch branches for dropdown
  const fetchBranches = async () => {
    try {
      const response = await branchApi.getAll();
      if (response.status === "success") {
        setBranchList(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchUserList();
    fetchBranches();
  }, []);

  // Search handler with debounce
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 400);
  };

  // Filter users based on search criteria
  const filteredUsers = userList.filter((user) => {
    // Role filter
    const userRoles = Array.isArray(user.roles) ? user.roles : [];
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

  // Role-based default permissions
  const rolePermissions = {
    admin: {
      SaleAccess: {
        sale_process: true, sale_history: true, sale_view_inventory: true,
        sale_reports: true, sale_configurations: true, sale_discounts: true,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: true, inventory_restock: true,
        inventory_return_list: true, inventory_dispose: true, inventory_suppliers: true,
        inventory_discount: true, inventory_price_change: true, inventory_history: true,
        inventory_configurations: true, inventory_reports: true,
      },
      UserManagerAccess: { create_user: true, edit_user: true, delete_user: true },
      ReportAccess: { view_reports: true, generate_reports: true, export_reports: true },
    },
    manager: {
      SaleAccess: {
        sale_process: true, sale_history: true, sale_view_inventory: true,
        sale_reports: true, sale_configurations: true, sale_discounts: true,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: true, inventory_restock: true,
        inventory_return_list: true, inventory_dispose: true, inventory_suppliers: true,
        inventory_discount: true, inventory_price_change: true, inventory_history: true,
        inventory_configurations: false, inventory_reports: true,
      },
      UserManagerAccess: { create_user: true, edit_user: true, delete_user: false },
      ReportAccess: { view_reports: true, generate_reports: true, export_reports: true },
    },
    cashier: {
      SaleAccess: {
        sale_process: true, sale_history: true, sale_view_inventory: true,
        sale_reports: false, sale_configurations: false, sale_discounts: true,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: false, inventory_restock: false,
        inventory_return_list: true, inventory_dispose: false, inventory_suppliers: false,
        inventory_discount: false, inventory_price_change: false, inventory_history: false,
        inventory_configurations: false, inventory_reports: false,
      },
      UserManagerAccess: { create_user: false, edit_user: false, delete_user: false },
      ReportAccess: { view_reports: true, generate_reports: false, export_reports: false },
    },
    assistant: {
      SaleAccess: {
        sale_process: true, sale_history: false, sale_view_inventory: true,
        sale_reports: false, sale_configurations: false, sale_discounts: false,
      },
      InventoryAccess: {
        inventory_view: true, inventory_register_item: false, inventory_restock: false,
        inventory_return_list: false, inventory_dispose: false, inventory_suppliers: false,
        inventory_discount: false, inventory_price_change: false, inventory_history: false,
        inventory_configurations: false, inventory_reports: false,
      },
      UserManagerAccess: { create_user: false, edit_user: false, delete_user: false },
      ReportAccess: { view_reports: false, generate_reports: false, export_reports: false },
    },
  };

  // Load user into form for editing
  const loadUser = async (user) => {
    setIsUserEditing(true);

    let profileImg = "";
    const userRole = Array.isArray(user.roles) ? user.roles[0] : "cashier";

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
          const hasNewSaleKeys = loadedPerms.SaleAccess && 'sale_process' in loadedPerms.SaleAccess;
          const hasNewInventoryKeys = loadedPerms.InventoryAccess && 'inventory_view' in loadedPerms.InventoryAccess;

          if (hasNewSaleKeys && hasNewInventoryKeys) {
            // New structure - merge with defaults to fill any missing keys
            setPermissions({
              SaleAccess: { ...defaultPermissions.SaleAccess, ...loadedPerms.SaleAccess },
              InventoryAccess: { ...defaultPermissions.InventoryAccess, ...loadedPerms.InventoryAccess },
              UserManagerAccess: { ...defaultPermissions.UserManagerAccess, ...loadedPerms.UserManagerAccess },
              ReportAccess: { ...defaultPermissions.ReportAccess, ...loadedPerms.ReportAccess },
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

    setFormData({
      id: user.id,
      username: user.username || "",
      email: user.email || "",
      full_name: user.full_name || "",
      password: "",
      confirm_password: "",
      roles: Array.isArray(user.roles) ? user.roles : ["cashier"],
      is_active: user.is_active !== undefined ? user.is_active : true,
      branch_id: user.branch_id || "",
      profile_image: profileImg,
    });

    console.log("[ManageUser] FormData updated with profile_image:", profileImg ? "YES" : "NO");
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
    setPermissions(defaultPermissions);
    setIsUserEditing(false);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
    } else if (name === "roles") {
      setFormData((prev) => ({ ...prev, roles: [value] }));
      // Apply role-based default permissions when role changes
      const selectedRolePerms = rolePermissions[value];
      if (selectedRolePerms) {
        setPermissions(selectedRolePerms);
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

  // Validate form data
  const validateFormData = () => {
    if (!formData.full_name?.trim()) {
      toast.open("Please enter full name", 4000, "Validation Error", "error");
      return false;
    }
    if (!formData.username?.trim()) {
      toast.open("Please enter username", 4000, "Validation Error", "error");
      return false;
    }
    if (!formData.email?.trim()) {
      toast.open("Please enter email", 4000, "Validation Error", "error");
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
        // Save user permissions
        if (response.data?.id) {
          await settingsApi.updateUserPermissions(response.data.id, permissions);
        }

        setFormStatus("success");
        timerRef.current = setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 2000);

        clearUserInput();
        toast.open("User created successfully", 4000, "Success", "success");
      } else {
        setFormStatus("fail");
        timerRef.current = setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 2000);
        toast.open(response.message || "Failed to create user", 4000, "Error", "error");
      }
    } catch (err) {
      console.error("Create user error:", err);
      setFormStatus("fail");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);
      toast.open("Failed to create user", 4000, "Error", "error");
    } finally {
      fetchUserList();
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
        // Update user permissions
        await settingsApi.updateUserPermissions(formData.id, permissions);

        setFormStatus("success");
        timerRef.current = setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 2000);

        clearUserInput();
        toast.open("User updated successfully", 4000, "Success", "success");
      } else {
        setFormStatus("fail");
        timerRef.current = setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 2000);
        toast.open(response.message || "Failed to update user", 4000, "Error", "error");
      }
    } catch (err) {
      console.error("Update user error:", err);
      setFormStatus("fail");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);
      toast.open("Failed to update user", 4000, "Error", "error");
    } finally {
      fetchUserList();
    }
  };

  // Delete user
  const deleteUser = async () => {
    if (!formData.id) {
      toast.open("Please select a user to delete", 4000, "Error", "error");
      return;
    }

    setFormStatus("loading");

    try {
      const response = await userApi.delete(formData.id);

      if (response.status === "success") {
        setFormStatus("success");
        timerRef.current = setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 2000);

        clearUserInput();
        toast.open("User deleted successfully", 4000, "Success", "success");
      } else {
        setFormStatus("fail");
        timerRef.current = setTimeout(() => {
          setFormStatus("form");
          timerRef.current = null;
        }, 2000);
        toast.open(response.message || "Failed to delete user", 4000, "Error", "error");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      setFormStatus("fail");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);
      toast.open("Failed to delete user", 4000, "Error", "error");
    } finally {
      fetchUserList();
    }
  };

  // Get role display name
  const getRoleDisplay = (roles) => {
    if (!roles || !Array.isArray(roles) || roles.length === 0) return "No Role";
    return roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ");
  };

  return (
    <div className="flex bg-gray-300 w-full h-[calc(100vh-2rem)] relative">
      {formStatus === "form" ? (
        <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 overflow-y-auto">
          {/* Form section */}
          <div className="flex flex-col gap-3">
            {/* Primary Description Block */}
            <div className="bg-white">
              <button
                onClick={() => setOpenUser(!openUser)}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">USER INFORMATION</span>
                {openUser ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openUser && (
                <div className="px-4 bg-white pb-5">
                  <div className="flex flex-row justify-around items-center mb-4">
                    {/* Profile image placeholder */}
                    <div className={`w-24 h-24 ${formData.profile_image ? 'border-2 border-gray-200 bg-gray-100' : 'border-2 border-dashed border-gray-300'} flex flex-col items-center justify-center hover:border-gray-400 transition-colors rounded-full overflow-hidden`}>
                      {formData.profile_image ? (
                        <img
                          src={formData.profile_image}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                          onError={(e) => {
                            console.error("[ManageUser] Image failed to load:", e);
                            console.log("[ManageUser] Image src was:", formData.profile_image?.substring(0, 100));
                            // Reset to show placeholder on error
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log("[ManageUser] Image loaded successfully");
                          }}
                        />
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <X className="w-6 h-6 text-gray-400" />
                          </div>
                          <span className="text-gray-500 text-xs mt-1">No image</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Enter username"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Password {!isUserEditing && "*"}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={isUserEditing ? "Leave blank to keep" : "Enter password"}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Confirm Password {!isUserEditing && "*"}
                      </label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleInputChange}
                        placeholder="Confirm password"
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Status
                      </label>
                      <select
                        name="is_active"
                        value={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === "true" }))}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Branch
                      </label>
                      <select
                        name="branch_id"
                        value={formData.branch_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Branch</option>
                        {branchList.map((branch) => (
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
            <div className="bg-white">
              <button
                onClick={() => setOpenPermission(!openPermission)}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">ROLE & PERMISSIONS</span>
                {openPermission ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openPermission && (
                <div className="px-4 bg-white pb-5">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Role
                    </label>
                    <select
                      name="roles"
                      value={formData.roles[0] || "cashier"}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {rolesList.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4 max-h-[20rem] overflow-y-auto">
                    <p className="text-xs text-gray-400 italic mb-2">
                      Permissions are based on the selected role (read-only)
                    </p>
                    {Object.entries(permissions).map(([category, perms]) => (
                      <div key={category} className="border-b border-gray-100 pb-2">
                        <div className="font-semibold text-gray-500 text-sm mb-2">
                          {category.replace("Access", " Access")}
                        </div>
                        {Object.entries(perms).map(([perm, value]) => (
                          <div key={perm} className="flex items-center justify-between py-1 pl-2">
                            <span className="text-sm text-gray-600">
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
              )}
            </div>
          </div>

          {/* Bottom button set */}
          <div className="flex flex-row w-full gap-2 mt-4">
            <button
              onClick={deleteUser}
              disabled={!isUserEditing}
              className={`flex-1 min-w-0 h-10 px-3 py-2 border border-gray-300 text-white transition-colors text-sm ${
                isUserEditing ? "bg-[#D01710] hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              <span className="truncate">Delete</span>
            </button>
            <button
              onClick={clearUserInput}
              className="flex-1 min-w-0 h-10 px-3 py-2 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              onClick={isUserEditing ? updateUser : registerUser}
              className="flex-1 min-w-0 h-10 px-3 py-2 bg-blue-600 text-white hover:bg-[#1A318C] transition-colors text-sm"
            >
              <span className="truncate">
                {isUserEditing ? "Update User" : "Add User"}
              </span>
            </button>
          </div>
        </div>
      ) : formStatus === "loading" ? (
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 flex flex-col justify-center items-center">
          <div className="animate-spin mb-3 rounded-full border-4 border-gray-300 border-t-[#1A318C] h-12 w-12"></div>
          <h2>Please wait...</h2>
        </div>
      ) : formStatus === "success" ? (
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 flex flex-col justify-center items-center">
          <svg width={80} height={80} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#22C55E" />
            <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="font-semibold text-xl mt-3">Success!</h2>
        </div>
      ) : (
        <div className="w-[calc(28rem)] h-[calc(100vh-2rem)] p-5 flex flex-col justify-center items-center">
          <svg width={80} height={80} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#EF4444" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 className="font-semibold text-xl mt-3">Failed...</h2>
        </div>
      )}

      {/* Table section */}
      <div className="bg-white flex-1 h-[calc(100vh-2rem)]">
        {/* Search bar */}
        <nav className="w-full flex justify-between py-4 px-6 bg-white gap-4 mb-4">
          <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search by name, username, or email..."
              className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
            />
            <button className="flex items-center px-4 py-2 bg-[#1A318C] text-white">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              </svg>
              Search
            </button>
          </div>

          <select
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="w-40 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
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
            className="w-40 h-10 px-3 bg-[#F8F8F8] border border-[#EBEBEB]"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </nav>

        {/* Table */}
        <div className="overflow-x-auto h-[calc(100vh-10rem)] p-4">
          <table className="w-full min-w-[600px] table-auto">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Full Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[20rem] w-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12"></div>
                        <span className="mt-3 text-gray-700">Loading users...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : searchLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[20rem] w-full flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-900 h-12 w-12 mb-3"></div>
                      <span className="text-gray-700">Searching...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[16rem] w-full flex items-center justify-center">
                      <span className="text-gray-500 text-lg">No users found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
                      formData.id === user.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => loadUser(user)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.full_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {getRoleDisplay(user.roles)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadUser(user);
                        }}
                        className="w-6 h-6 rounded-full bg-gray-200 inline-flex items-center justify-center hover:bg-gray-300"
                      >
                        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManageUser;
