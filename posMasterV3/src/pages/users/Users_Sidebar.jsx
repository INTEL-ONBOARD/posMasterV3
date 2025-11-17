import React from "react";
import addItemImg from "../../assets/Inventory_addItem.png";
import ViewInventoryImg from "../../assets/View_inventory.png";
import SupplierRegImg from "../../assets/Inventory_supplier_reg.png";
import manageImg from "../../assets/users_manage.png";
import permissionsImg from "../../assets/users_permission.png";


function UsersSidebar({
  activeSection,
  onUsersClick,
  onRolesClick,
}) {
  const sidebarItems = [
    {
      id: "manage-users",
      label: "Manage Users",
      icon: manageImg,
      onClick: onUsersClick,
    },
    {
      id: "manage-roles",
      label: "Manage Roles",
      icon: permissionsImg,
      onClick: onRolesClick,
    },
  ];

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
