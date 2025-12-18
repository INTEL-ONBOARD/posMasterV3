import React, { useEffect, useContext, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Shield, Users, Settings } from "lucide-react";
import { settingsApi, userApi } from "../../api/localApi";
import ToastContext from "../toasts/ToastService";

function ManageRole() {
  const toast = useContext(ToastContext);

  // Form section collapse controls
  const [openRoleInfo, setOpenRoleInfo] = useState(true);
  const [openPermissions, setOpenPermissions] = useState(true);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Data states
  const [rolesList, setRolesList] = useState([]);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    roleBreakdown: {}
  });

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
          inventory_return_list: true,
          inventory_dispose: true,
          inventory_suppliers: true,
          inventory_discount: true,
          inventory_price_change: true,
          inventory_history: true,
          inventory_configurations: true,
          inventory_reports: true,
        },
        UserManagerAccess: { create_user: true, edit_user: true, delete_user: true },
        ReportAccess: { view_reports: true, generate_reports: true, export_reports: true },
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
          inventory_return_list: true,
          inventory_dispose: true,
          inventory_suppliers: true,
          inventory_discount: true,
          inventory_price_change: true,
          inventory_history: true,
          inventory_configurations: false,
          inventory_reports: true,
        },
        UserManagerAccess: { create_user: true, edit_user: true, delete_user: false },
        ReportAccess: { view_reports: true, generate_reports: true, export_reports: true },
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
          inventory_return_list: true,
          inventory_dispose: false,
          inventory_suppliers: false,
          inventory_discount: false,
          inventory_price_change: false,
          inventory_history: false,
          inventory_configurations: false,
          inventory_reports: false,
        },
        UserManagerAccess: { create_user: false, edit_user: false, delete_user: false },
        ReportAccess: { view_reports: true, generate_reports: false, export_reports: false },
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
          inventory_return_list: false,
          inventory_dispose: false,
          inventory_suppliers: false,
          inventory_discount: false,
          inventory_price_change: false,
          inventory_history: false,
          inventory_configurations: false,
          inventory_reports: false,
        },
        UserManagerAccess: { create_user: false, edit_user: false, delete_user: false },
        ReportAccess: { view_reports: false, generate_reports: false, export_reports: false },
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

  const [permissions, setPermissions] = useState(defaultPermissions);

  // Search and filter states
  const [search, setSearch] = useState("");

  // Form states
  const [isRoleEditing, setIsRoleEditing] = useState(false);
  const [formStatus, setFormStatus] = useState("form");
  const timerRef = useRef(null);

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

  // Fetch roles and user statistics
  const fetchRolesAndStats = async () => {
    try {
      setIsLoading(true);

      // Initialize with predefined roles
      setRolesList(predefinedRoles);

      // Try to fetch custom roles from settings
      try {
        const rolesResponse = await settingsApi.getAppSettings();
        if (rolesResponse.status === "success" && rolesResponse.data?.custom_roles) {
          setRolesList([...predefinedRoles, ...rolesResponse.data.custom_roles]);
        }
      } catch (error) {
        console.log("No custom roles found, using predefined roles");
      }

      // Fetch user stats
      try {
        const usersResponse = await userApi.getAll();
        if (usersResponse.status === "success" && usersResponse.data) {
          const users = usersResponse.data;
          const roleBreakdown = {};

          users.forEach(user => {
            const userRoles = Array.isArray(user.roles) ? user.roles : [];
            userRoles.forEach(role => {
              roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
            });
          });

          setUserStats({
            totalUsers: users.length,
            activeUsers: users.filter(u => u.is_active).length,
            roleBreakdown
          });
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.open("Failed to load roles", 4000, "Error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchRolesAndStats();
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
    // Don't allow editing system roles
    if (formData.is_system) {
      toast.open("Cannot modify system role permissions", 4000, "Warning", "warning");
      return;
    }

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
    if (formData.is_system) {
      toast.open("Cannot modify system role permissions", 4000, "Warning", "warning");
      return;
    }

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

  // Validate form data
  const validateFormData = () => {
    if (!formData.name?.trim()) {
      toast.open("Please enter role name", 4000, "Validation Error", "error");
      return false;
    }

    // Check for duplicate role names
    const existingRole = rolesList.find(
      r => r.name.toLowerCase() === formData.name.toLowerCase() && r.id !== formData.id
    );
    if (existingRole) {
      toast.open("A role with this name already exists", 4000, "Validation Error", "error");
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
      const roleData = {
        id: formData.name.toLowerCase().replace(/\s+/g, '_'),
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_system: false,
        permissions: permissions,
      };

      // Save custom role to app settings
      const currentSettings = await settingsApi.getAppSettings();
      const customRoles = currentSettings.data?.custom_roles || [];
      customRoles.push(roleData);

      await settingsApi.updateAppSettings({ custom_roles: customRoles });

      setFormStatus("success");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);

      clearRoleInput();
      toast.open("Role created successfully", 4000, "Success", "success");
      fetchRolesAndStats();
    } catch (err) {
      console.error("Create role error:", err);
      setFormStatus("fail");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);
      toast.open("Failed to create role", 4000, "Error", "error");
    }
  };

  // Update existing custom role
  const updateRole = async (e) => {
    e.preventDefault();

    if (formData.is_system) {
      toast.open("Cannot modify system roles", 4000, "Warning", "warning");
      return;
    }

    if (!validateFormData()) {
      return;
    }

    setFormStatus("loading");

    try {
      const roleData = {
        id: formData.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_system: false,
        permissions: permissions,
      };

      // Update custom role in app settings
      const currentSettings = await settingsApi.getAppSettings();
      let customRoles = currentSettings.data?.custom_roles || [];
      customRoles = customRoles.map(r => r.id === formData.id ? roleData : r);

      await settingsApi.updateAppSettings({ custom_roles: customRoles });

      setFormStatus("success");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);

      clearRoleInput();
      toast.open("Role updated successfully", 4000, "Success", "success");
      fetchRolesAndStats();
    } catch (err) {
      console.error("Update role error:", err);
      setFormStatus("fail");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);
      toast.open("Failed to update role", 4000, "Error", "error");
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

      setFormStatus("success");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);

      clearRoleInput();
      toast.open("Role deleted successfully", 4000, "Success", "success");
      fetchRolesAndStats();
    } catch (err) {
      console.error("Delete role error:", err);
      setFormStatus("fail");
      timerRef.current = setTimeout(() => {
        setFormStatus("form");
        timerRef.current = null;
      }, 2000);
      toast.open("Failed to delete role", 4000, "Error", "error");
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
    <div className="flex bg-gray-300 w-full h-[calc(100vh-2rem)] gap-2 relative">
      {formStatus === "form" ? (
        <div className="bg-gray-300 w-[calc(28rem)] h-[calc(100vh-2rem)] p-2 overflow-y-auto">
          {/* Form section */}
          <div className="flex flex-col gap-3">
            {/* Role Information Block */}
            <div className="bg-white">
              <button
                onClick={() => setOpenRoleInfo(!openRoleInfo)}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">ROLE INFORMATION</span>
                {openRoleInfo ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openRoleInfo && (
                <div className="px-4 bg-white pb-5">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter role name"
                      disabled={formData.is_system}
                      className={`w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formData.is_system ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter role description"
                      disabled={formData.is_system}
                      rows={3}
                      className={`w-full px-3 py-2 bg-[#F8F8F8] border border-[#EBEBEB] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        formData.is_system ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  {formData.is_system && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
                      <Shield className="inline w-4 h-4 mr-1" />
                      This is a system role and cannot be modified.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Permissions Block */}
            <div className="bg-white">
              <button
                onClick={() => setOpenPermissions(!openPermissions)}
                className="w-full flex justify-between items-center px-4 py-2 text-lg font-bold"
              >
                <span className="text-gray-400">PERMISSIONS</span>
                {openPermissions ? <ChevronUp /> : <ChevronDown />}
              </button>
              {openPermissions && (
                <div className="px-4 bg-white pb-5">
                  <div className="space-y-4 max-h-[20rem] overflow-y-auto">
                    {Object.entries(permissions).map(([category, perms]) => {
                      const allEnabled = Object.values(perms).every(v => v);
                      return (
                        <div key={category} className="border-b border-gray-100 pb-3">
                          <div
                            className="flex items-center justify-between cursor-pointer py-1"
                            onClick={() => toggleCategoryPermissions(category)}
                          >
                            <span className="font-semibold text-gray-600 text-sm">
                              {category.replace("Access", " Access")}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={allEnabled}
                                onChange={() => {}}
                                disabled={formData.is_system}
                              />
                              <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 ${
                                formData.is_system ? "opacity-50" : ""
                              }`}></div>
                            </label>
                          </div>
                          {Object.entries(perms).map(([perm, value]) => (
                            <div key={perm} className="flex items-center justify-between py-1 pl-4">
                              <span className="text-sm text-gray-500">
                                {perm.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={value}
                                  onChange={() => handlePermissionChange(category, perm)}
                                  disabled={formData.is_system}
                                />
                                <div className={`w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500 ${
                                  formData.is_system ? "opacity-50" : ""
                                }`}></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom button set */}
          <div className="flex flex-row w-full gap-2 mt-4">
            <button
              onClick={deleteRole}
              disabled={!isRoleEditing || formData.is_system}
              className={`flex-1 min-w-0 h-10 px-3 py-2 border border-gray-300 text-white transition-colors text-sm ${
                isRoleEditing && !formData.is_system ? "bg-[#D01710] hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              <span className="truncate">Delete</span>
            </button>
            <button
              onClick={clearRoleInput}
              className="flex-1 min-w-0 h-10 px-3 py-2 border bg-[#727272] border-gray-300 text-white hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              onClick={isRoleEditing ? updateRole : createRole}
              disabled={formData.is_system}
              className={`flex-1 min-w-0 h-10 px-3 py-2 text-white transition-colors text-sm ${
                formData.is_system ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-[#1A318C]"
              }`}
            >
              <span className="truncate">
                {isRoleEditing ? "Update Role" : "Add Role"}
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

      {/* Table section (middle) */}
      <div className="bg-white flex-1 h-[calc(100vh-2rem)]">
        {/* Search bar */}
        <nav className="w-full flex justify-between py-4 px-6 bg-white gap-4 mb-4">
          <div className="flex-1 flex border-b border-[#EDEDED] h-12 items-center">
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search roles..."
              className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
            />
            <button className="flex items-center px-4 py-2 bg-[#1A318C] text-white">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              </svg>
              Search
            </button>
          </div>
        </nav>

        {/* Table */}
        <div className="overflow-x-auto h-[calc(100vh-10rem)] p-4">
          <table className="w-full min-w-[500px] table-auto">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Role Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Permissions</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Users</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Type</th>
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
                        <span className="mt-3 text-gray-700">Loading roles...</span>
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
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="h-[16rem] w-full flex items-center justify-center">
                      <span className="text-gray-500 text-lg">No roles found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role, index) => {
                  const permStats = countEnabledPermissions(role.permissions);
                  const userCount = userStats.roleBreakdown[role.id] || 0;
                  return (
                    <tr
                      key={role.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
                        formData.id === role.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => loadRole(role)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{role.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                        {role.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {permStats.enabled}/{permStats.total}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{userCount}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          role.is_system
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}>
                          {role.is_system ? "System" : "Custom"}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadRole(role);
                          }}
                          className="w-6 h-6 rounded-full bg-gray-200 inline-flex items-center justify-center hover:bg-gray-300"
                        >
                          <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats section (right) */}
      <div className="bg-white w-[calc(15rem)] h-[calc(100vh-2rem)]">
        <div className="flex flex-col gap-4 p-4">
          <div className="border bg-blue-50 flex flex-col justify-center h-[8rem] items-center gap-2 p-4 rounded">
            <Users className="w-8 h-8 text-blue-600" />
            <p className="text-3xl font-bold text-blue-800">{userStats.totalUsers}</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>
          <div className="border bg-green-50 flex flex-col justify-center h-[8rem] items-center gap-2 p-4 rounded">
            <Shield className="w-8 h-8 text-green-600" />
            <p className="text-3xl font-bold text-green-800">{userStats.activeUsers}</p>
            <p className="text-sm text-gray-600">Active Users</p>
          </div>
          <div className="border bg-purple-50 flex flex-col justify-center h-[8rem] items-center gap-2 p-4 rounded">
            <Settings className="w-8 h-8 text-purple-600" />
            <p className="text-3xl font-bold text-purple-800">{rolesList.length}</p>
            <p className="text-sm text-gray-600">Total Roles</p>
          </div>

          {/* Role breakdown */}
          <div className="border bg-gray-50 p-4 rounded mt-2">
            <p className="text-sm font-semibold text-gray-600 mb-3">Users by Role</p>
            {Object.entries(userStats.roleBreakdown).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600 capitalize">{role}</span>
                <span className="text-sm font-medium text-gray-800">{count}</span>
              </div>
            ))}
            {Object.keys(userStats.roleBreakdown).length === 0 && (
              <p className="text-sm text-gray-400 text-center">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageRole;
