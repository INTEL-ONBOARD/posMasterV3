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

  // Load user permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const currentUser = await localAuth.getCurrentUser();
        if (currentUser) {
          const userId = currentUser.id || currentUser._id;
          const response = await settingsApi.getUserSettings(userId);
          if (response.status === "success" && response.data?.settings?.permissions?.UserAccess) {
            setPermissions(response.data.settings.permissions.UserAccess);
          }
        }
      } catch (error) {
        console.error("[UsersSidebar] Error loading permissions:", error);
      }
    };
    loadPermissions();
  }, []);

  // Check if user has specific permission
  const hasPermission = (permKey) => {
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
    <aside className="bg-[#F3F3F3] border-r border-gray-200 h-screen">
      <div className="flex flex-col">
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-28 h-28 border border-gray-100 flex flex-col items-center justify-center p-4 transition-all duration-200 ${
                isActive
                  ? "border-blue-500 bg-[#EBEBEB] relative"
                  : "bg-[#FAFAFA] border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="relative flex flex-col items-center mb-2">
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-12 h-12 object-contain pointer-events-none"
                />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default UsersSidebar;
