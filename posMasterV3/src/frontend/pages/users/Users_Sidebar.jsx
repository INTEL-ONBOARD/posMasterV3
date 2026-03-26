import React, { useState, useEffect } from "react";
import manageImg from "../../assets/users_manage.png";
import permissionsImg from "../../assets/users_permission.png";
import { localAuth } from "../../api/services/localAuth";
import { settingsApi } from "../../api/localApi";

function UsersSidebar({
  activeSection,
  onUsersClick,
  onRolesClick,
}) {
  const [permissions, setPermissions] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load user permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await localAuth.getCurrentUser();
        if (currentUser) {
          // Check if user is admin (case-insensitive)
          const userRoles = currentUser.roles || [];
          const adminCheck = userRoles.some(role =>
            typeof role === 'string' && ['admin', 'superadmin'].includes(role.toLowerCase())
          );
          setIsAdmin(adminCheck);

          // If admin, no need to load specific permissions - they have all access
          if (adminCheck) {
            return;
          }

          const userId = currentUser.id || currentUser._id;
          const response = await settingsApi.getUserSettings(userId);
          if (response.status === "success" && response.data?.settings?.permissions?.UserAccess) {
            setPermissions(response.data.settings.permissions.UserAccess);
          }
        }
      } catch (error) {
        // Silent fail - permissions will default to showing all
      }
    };
    loadPermissions();
  }, []);

  // Check if user has specific permission
  const hasPermission = (permKey) => {
    // Admin users have all permissions
    if (isAdmin) return true;
    if (!permissions) return true; // Show all until permissions load
    return permissions[permKey] === true;
  };

  const sidebarItems = [
    {
      id: "manage-users",
      label: "Manage Users",
      icon: manageImg,
      onClick: onUsersClick,
      permissionKey: "user_manage",
    },
    {
      id: "manage-roles",
      label: "Manage Roles",
      icon: permissionsImg,
      onClick: onRolesClick,
      permissionKey: "user_role_manage",
    },
  ].filter(item => hasPermission(item.permissionKey));

  return (
    <aside className="bg-white border-r border-gray-100 h-screen shadow-sm">
      <div className="flex flex-col py-2">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <div key={item.id} className="relative group px-2 py-1">
              <button
                onClick={item.onClick}
                className={`relative w-24 h-24 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-[#1A318C] to-[#152870] shadow-lg shadow-blue-900/20"
                    : "bg-gray-50 hover:bg-gray-100 hover:shadow-md"
                }`}
              >
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-white rounded-r-full" />
                )}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-1 transition-transform duration-300 ${
                  isActive ? "bg-white/90 shadow-sm" : "bg-white shadow-sm"
                } ${!isActive && "group-hover:scale-105"}`}>
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-8 h-8 object-contain pointer-events-none transition-all duration-300"
                  />
                </div>
              </button>
              {/* Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default UsersSidebar;
