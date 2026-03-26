import React, { useEffect, useContext, useRef, useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Shield, Users, Settings } from "lucide-react";
import { settingsApi } from "../../api/localApi";
import ToastContext from "../toasts/ToastService";
import { useReactiveData, TABLES } from "../../store";
import StatusModal from "../../components/StatusModal.jsx";

function ManageRole() {
  const toast = useContext(ToastContext);

  // Form section collapse controls
  const [openRoleInfo, setOpenRoleInfo] = useState(true);
  const [openPermissions, setOpenPermissions] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Data states
  const [rolesList, setRolesList] = useState([]);

  // Use reactive data for users - auto-updates when users change
  const { data: users } = useReactiveData(TABLES.USERS);

  // Compute user stats from reactive data
  const userStats = useMemo(() => {
    const userList = users || [];
    const roleBreakdown = {};

    userList.forEach(user => {
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      userRoles.forEach(role => {
        roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      });
    });

    return {
      totalUsers: userList.length,
      activeUsers: userList.filter(u => u.is_active).length,
      roleBreakdown
    };
  }, [users]);

  // Predefined roles with default permissions
  const predefinedRoles = [
    {
      id: "admin",
      name: "Admin",
      description: "Full system access with all permissions",
      is_system: true,
      permissions: {
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
        UserAccess: { user_manage: true, user_role_manage: true },
      }
    },
    {
      id: "manager",
      name: "Manager",
      description: "Management access with most permissions",
      is_system: true,
      permissions: {
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
          inventory_configurations: false,
          inventory_reports: true,
        },
        UserAccess: { user_manage: true, user_role_manage: false },
      }
    },
    {
      id: "cashier",
      name: "Cashier",
      description: "Sales and basic inventory access",
      is_system: true,
      permissions: {
        SaleAccess: {
          sale_process: true,
          sale_history: true,
          sale_view_inventory: true,
          sale_reports: false,
          sale_configurations: false,
          sale_discounts: true,
        },
        InventoryAccess: {
          inventory_view: true,
          inventory_register_item: false,
          inventory_restock: false,
          inventory_suppliers: false,
          inventory_discount: false,
          inventory_price_change: false,
          inventory_history: false,
          inventory_configurations: false,
          inventory_reports: false,
        },
        UserAccess: { user_manage: false, user_role_manage: false },
      }
    },
    {
      id: "assistant",
      name: "Assistant",
      description: "Limited access for basic operations",
      is_system: true,
      permissions: {
        SaleAccess: {
          sale_process: true,
          sale_history: false,
          sale_view_inventory: true,
          sale_reports: false,
          sale_configurations: false,
          sale_discounts: false,
        },
        InventoryAccess: {
          inventory_view: true,
          inventory_register_item: false,
          inventory_restock: false,
          inventory_suppliers: false,
          inventory_discount: false,
          inventory_price_change: false,
          inventory_history: false,
          inventory_configurations: false,
          inventory_reports: false,
        },
        UserAccess: { user_manage: false, user_role_manage: false },
      }
    }
  ];

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

  const [permissions, setPermissions] = useState(defaultPermissions);

  // Search and filter states
  const [search, setSearch] = useState("");

  // Form states
  const [isRoleEditing, setIsRoleEditing] = useState(false);
  const [formStatus, setFormStatus] = useState("form");
  const [statusModal, setStatusModal] = useState({ open: false, type: null, description: "" });
  const timerRef = useRef(null);

  const closeStatusModal = () => {
    setStatusModal({ open: false, type: null, description: "" });
    setFormStatus("form");
  };

  // Form data
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    is_system: false,
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Fetch roles (user stats now come from reactive data)
  const fetchRoles = async () => {
    try {
      setIsLoading(true);

      // Try to fetch saved role permissions and custom roles from settings
      try {
        const rolesResponse = await settingsApi.getAppSettings();
        if (rolesResponse.status === "success" && rolesResponse.data) {
          // Merge saved system role permissions with predefined roles
          const savedSystemRolePerms = rolesResponse.data.system_role_permissions || {};
          const mergedPredefinedRoles = predefinedRoles.map(role => ({
            ...role,
            permissions: savedSystemRolePerms[role.id] || role.permissions
          }));

          // Add custom roles
          const customRoles = rolesResponse.data.custom_roles || [];
          setRolesList([...mergedPredefinedRoles, ...customRoles]);
        } else {
          setRolesList(predefinedRoles);
        }
      } catch {
        console.log("No saved role settings found, using predefined roles");
        setRolesList(predefinedRoles);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.open("Failed to load roles", 4000, "Error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search handler with debounce
  const handleSearch = (e) => {
    setSearchLoading(true);
    setSearch(e.target.value);
    setTimeout(() => setSearchLoading(false), 400);
  };

  // Filter roles based on search
  const filteredRoles = rolesList.filter((role) => {
    const searchLower = search.toLowerCase();
    return (
      role.name.toLowerCase().includes(searchLower) ||
      (role.description || "").toLowerCase().includes(searchLower)
    );
  });

  // Load role into form for editing
  const loadRole = (role) => {
    setIsRoleEditing(true);
    setFormData({
      id: role.id,
      name: role.name,
      description: role.description || "",
      is_system: role.is_system || false,
    });
    setPermissions(role.permissions || defaultPermissions);
  };

  // Clear form
  const clearRoleInput = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      is_system: false,
    });
    setPermissions(defaultPermissions);
    setIsRoleEditing(false);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  // Toggle all permissions in a category
  const toggleCategoryPermissions = (category) => {
    const currentPerms = permissions[category];
    const allEnabled = Object.values(currentPerms).every(v => v);

    const newPerms = {};
    Object.keys(currentPerms).forEach(key => {
      newPerms[key] = !allEnabled;
    });

    setPermissions((prev) => ({
      ...prev,
      [category]: newPerms,
    }));
  };

  // Reserved system role IDs that custom roles must not collide with
  const SYSTEM_ROLE_IDS = ['admin', 'manager', 'cashier', 'assistant', 'user', 'superadmin'];

  // Validate form data
  const validateFormData = () => {
    if (!formData.name?.trim()) {
      toast.open("Please enter role name", 4000, "Validation Error", "error");
      return false;
    }

    // Check for duplicate role names (case-insensitive)
    const existingRole = rolesList.find(
      r => r.name.toLowerCase() === formData.name.trim().toLowerCase() && r.id !== formData.id
    );
    if (existingRole) {
      toast.open("A role with this name already exists", 4000, "Validation Error", "error");
      return false;
    }

    // Prevent custom role name from colliding with system role IDs
    const candidateId = formData.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!formData.id && SYSTEM_ROLE_IDS.includes(candidateId)) {
      toast.open("This name conflicts with a system role. Please choose a different name.", 4000, "Validation Error", "error");
      return false;
    }

    return true;
  };

  // Create new custom role
  const createRole = async (e) => {
    e.preventDefault();

    if (!validateFormData()) {
      return;
    }

    setFormStatus("loading");

    try {
      // Re-fetch settings inside the save to avoid stale read-modify-write race
      const currentSettings = await settingsApi.getAppSettings();
      const customRoles = currentSettings.data?.custom_roles || [];

      // Generate a unique ID — append timestamp suffix to prevent collisions
      const baseId = formData.name.trim().toLowerCase().replace(/\s+/g, '_');
      const candidateId = `${baseId}_${Date.now()}`;

      // Double-check uniqueness against freshly fetched list
      const idCollision = customRoles.find(r => r.id === candidateId);
      if (idCollision) {
        setFormStatus("form");
        setStatusModal({ open: true, type: 'failed', description: 'Role ID conflict, please try again' });
        return;
      }

      const roleData = {
        id: candidateId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_system: false,
        permissions: permissions,
      };

      customRoles.push(roleData);

      await settingsApi.updateAppSettings({ custom_roles: customRoles });

      setFormStatus("form");
      setStatusModal({ open: true, type: 'success', description: `Role "${formData.name}" created successfully` });
      fetchRoles();
      // Load the newly created role so the delete button is immediately available
      loadRole(roleData);
    } catch (err) {
      console.error("Create role error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Failed to create role' });
    }
  };

  // Update existing role (both system and custom)
  const updateRole = async (e) => {
    e.preventDefault();

    if (!validateFormData()) {
      return;
    }

    setFormStatus("loading");

    try {
      const currentSettings = await settingsApi.getAppSettings();

      if (formData.is_system) {
        // Update system role permissions in app_settings
        const systemRolePerms = currentSettings.data?.system_role_permissions || {};
        systemRolePerms[formData.id] = permissions;

        await settingsApi.updateAppSettings({ system_role_permissions: systemRolePerms });

        toast.open("System role permissions updated successfully", 4000, "Success", "success");
      } else {
        // Update custom role in app settings
        const roleData = {
          id: formData.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          is_system: false,
          permissions: permissions,
        };

        let customRoles = currentSettings.data?.custom_roles || [];
        customRoles = customRoles.map(r => r.id === formData.id ? roleData : r);

        await settingsApi.updateAppSettings({ custom_roles: customRoles });
      }

      setFormStatus("form");
      setStatusModal({ open: true, type: 'success', description: `Role "${formData.name}" updated successfully` });
      clearRoleInput();
      fetchRoles();
    } catch (err) {
      console.error("Update role error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Failed to update role' });
    }
  };

  // Delete custom role
  const deleteRole = async () => {
    if (!formData.id) {
      toast.open("Please select a role to delete", 4000, "Error", "error");
      return;
    }

    if (formData.is_system) {
      toast.open("Cannot delete system roles", 4000, "Warning", "warning");
      return;
    }

    // Check if any users have this role
    if (userStats.roleBreakdown[formData.id] > 0) {
      toast.open(`Cannot delete role: ${userStats.roleBreakdown[formData.id]} users have this role`, 4000, "Warning", "warning");
      return;
    }

    setFormStatus("loading");

    try {
      const currentSettings = await settingsApi.getAppSettings();
      let customRoles = currentSettings.data?.custom_roles || [];
      customRoles = customRoles.filter(r => r.id !== formData.id);

      await settingsApi.updateAppSettings({ custom_roles: customRoles });

      setFormStatus("form");
      setStatusModal({ open: true, type: 'success', description: 'Role deleted successfully' });
      clearRoleInput();
      fetchRoles();
    } catch (err) {
      console.error("Delete role error:", err);
      setFormStatus("form");
      setStatusModal({ open: true, type: 'failed', description: err.message || 'Failed to delete role' });
    }
  };

  // Count permissions enabled
  const countEnabledPermissions = (perms) => {
    let enabled = 0;
    let total = 0;
    Object.values(perms).forEach(category => {
      Object.values(category).forEach(value => {
        total++;
        if (value) enabled++;
      });
    });
    return { enabled, total };
  };

  return (
    <div className="flex bg-gray-100 w-full h-[calc(100vh-2rem)] gap-4 relative">
      {formStatus === "form" ? (
        <div className="w-[28rem] h-[calc(100vh-2rem)] p-4 overflow-y-auto">
          {/* Form section */}
          <div className="flex flex-col gap-4">
            {/* Role Information Block */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => {
                  setOpenRoleInfo(!openRoleInfo)
                  setOpenPermissions(!openPermissions)
                }}
                className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#1A318C]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Role Information</span>
                </div>
                {(openRoleInfo && !openPermissions) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {(openRoleInfo && !openPermissions) && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="py-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter role name"
                      disabled={formData.is_system}
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all ${
                        formData.is_system ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter role description"
                      disabled={formData.is_system}
                      rows={3}
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A318C]/20 focus:border-[#1A318C] transition-all resize-none ${
                        formData.is_system ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  {formData.is_system && (
                    <div className="bg-[#1A318C]/5 border border-[#1A318C]/20 rounded-lg p-3 text-sm text-[#1A318C] flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      <span>System role - permissions can be modified but name cannot be changed.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Permissions Block */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => {
                  setOpenPermissions(!openPermissions)
                  setOpenRoleInfo(!openRoleInfo)
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
                {(openPermissions && !openRoleInfo) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {(openPermissions && !openRoleInfo) && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="space-y-4 max-h-[30rem] overflow-y-auto pt-4">
                    {Object.entries(permissions).map(([category, perms]) => {
                      const allEnabled = Object.values(perms).every(v => v);
                      return (
                        <div key={category} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between py-2 mb-2">
                            <span
                              className="font-semibold text-gray-700 text-xs uppercase tracking-wide cursor-pointer"
                              onClick={() => toggleCategoryPermissions(category)}
                            >
                              {category.replace("Access", " Access")}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={allEnabled}
                                onChange={() => toggleCategoryPermissions(category)}
                              />
                              <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A318C] shadow-inner"></div>
                            </label>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(perms).map(([perm, value]) => (
                              <div key={perm} className="flex items-center justify-between py-2 px-2 bg-white rounded-md">
                                <span className="text-sm text-gray-600">
                                  {perm.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={value}
                                    onChange={() => handlePermissionChange(category, perm)}
                                  />
                                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom button set */}
          <div className="flex flex-row w-full gap-3 mt-4">
            <button
              onClick={deleteRole}
              disabled={!isRoleEditing || formData.is_system || (userStats.roleBreakdown[formData.id] > 0)}
              className={`flex-1 min-w-0 h-11 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isRoleEditing && !formData.is_system && !(userStats.roleBreakdown[formData.id] > 0)
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
              onClick={clearRoleInput}
              className="flex-1 min-w-0 h-11 px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              onClick={isRoleEditing ? updateRole : createRole}
              className="flex-[1.5] min-w-0 h-11 px-4 py-2 bg-[#1A318C] text-white rounded-xl text-sm font-semibold hover:bg-[#152870] transition-all duration-200 shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRoleEditing ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" : "M12 4v16m8-8H4"} />
              </svg>
              {isRoleEditing ? (formData.is_system ? "Update Permissions" : "Update Role") : "Add Role"}
            </button>
          </div>
        </div>
      ) : formStatus === "loading" ? (
        <div className="w-[28rem] h-[calc(100vh-2rem)] p-5 flex flex-col justify-center items-center bg-white rounded-xl m-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#1A318C]/10 flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full border-4 border-[#1A318C]/20 border-t-[#1A318C] h-8 w-8"></div>
          </div>
          <h2 className="text-gray-700 font-semibold">Processing...</h2>
          <p className="text-sm text-gray-400 mt-1">Please wait</p>
        </div>
      ) : null}

      {/* Table section (middle) */}
      <div className="bg-white flex-1 h-[calc(100vh-2rem)] rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
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
              placeholder="Search roles..."
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-sm"
            />
            <button className="px-6 py-3 bg-[#1A318C] text-white text-sm font-medium hover:bg-[#152870] transition-colors">
              Search
            </button>
          </div>
        </nav>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-300 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Role Name</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2">Permissions</div>
                <div className="col-span-2">Users</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="h-[20rem] w-full flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-4"></div>
                    <span className="text-gray-500 text-sm font-medium">Loading roles...</span>
                  </div>
                </div>
              ) : searchLoading ? (
                <div className="h-[20rem] w-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-[#1A318C] rounded-full animate-spin mb-4"></div>
                  <span className="text-gray-500 text-sm font-medium">Searching...</span>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="h-[16rem] w-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No roles found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
                </div>
              ) : (
                filteredRoles.map((role, index) => {
                  const permStats = countEnabledPermissions(role.permissions);
                  const userCount = userStats.roleBreakdown[role.id] || 0;
                  return (
                    <div
                      key={role.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                        formData.id === role.id ? "bg-[#1A318C]/5 border-l-4 border-l-[#1A318C]" : ""
                      }`}
                      onClick={() => loadRole(role)}
                    >
                      <div className="col-span-1 text-sm text-gray-500 font-medium">{index + 1}</div>
                      <div className="col-span-2 text-sm font-semibold text-gray-800">{role.name}</div>
                      <div className="col-span-3 text-sm text-gray-500 truncate">
                        {role.description || "-"}
                      </div>
                      <div className="col-span-2">
                        <span className="px-2.5 py-1 bg-[#1A318C]/10 text-[#1A318C] rounded-lg text-xs font-semibold">
                          {permStats.enabled}/{permStats.total}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700 tabular-nums">{userCount} users</span>
                      </div>
                      <div className="col-span-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          role.is_system
                            ? "bg-purple-100 text-purple-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {role.is_system ? "System" : "Custom"}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadRole(role);
                          }}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-[#1A318C] hover:text-white inline-flex items-center justify-center transition-all duration-200 group"
                        >
                          <Settings className="w-4 h-4 text-gray-500 group-hover:text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats section (right) */}
      <div className="w-[16rem] h-[calc(100vh-2rem)] p-4 flex flex-col gap-4">
        {/* Total Users Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#1A318C]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#1A318C]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">{userStats.totalUsers}</p>
              <p className="text-xs text-gray-500 font-medium">Total Users</p>
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">{userStats.activeUsers}</p>
              <p className="text-xs text-gray-500 font-medium">Active Users</p>
            </div>
          </div>
        </div>

        {/* Total Roles Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">{rolesList.length}</p>
              <p className="text-xs text-gray-500 font-medium">Total Roles</p>
            </div>
          </div>
        </div>

        {/* Role breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Users by Role</p>
          <div className="space-y-2">
            {Object.entries(userStats.roleBreakdown).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 capitalize font-medium">{role}</span>
                <span className="text-sm font-bold text-gray-800 tabular-nums">{count}</span>
              </div>
            ))}
            {Object.keys(userStats.roleBreakdown).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <StatusModal
        isOpen={statusModal.open}
        closeModal={closeStatusModal}
        type={statusModal.type}
        description={statusModal.description}
        context="role"
      />
    </div>
  );
}

export default ManageRole;
