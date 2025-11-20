import React, { useState, useEffect } from "react";
import UsersSidebar from "./Users_Sidebar.jsx";

import NotFound from "../../assets/nonicons_not-found-16.png";
import ManageUser from "./ManageUser.jsx";
import ManageRole from "./ManageRole.jsx";
import { useOutletContext } from "react-router-dom";


function Users() {
  const { setActiveSection } = useOutletContext();
  const [activeSection, setLocalActiveSection] = useState("manage-users");
  // update incorr
  // Update parent's activeSection whenever local activeSection changess
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSectionChange = (section) => {
    setLocalActiveSection(section);
    setActiveSection(section);
  };

  // helper function to toggle Tailwind visibility between sections
  const isVisible = (section) =>
    activeSection === section ? "block" : "hidden";

  return (
    <div id="inv-background" className="flex h-screen bg-[#EBEBEB]">
      {/* sidebar (left) */}
      <UsersSidebar
        activeSection={activeSection}
        onUsersClick={() => handleSectionChange("manage-users")}
        onRolesClick={() => handleSectionChange("manage-roles")}
      />

      <main className="flex-1 bg-[#F3F3F3] h-[calc(100vh-2rem)] relative">
        {/* View Inventory */}
        <div className={isVisible("manage-users")}>
          <ManageUser />
        </div>
        {/* Add Item */}
        <div className={isVisible("manage-roles")}>
          <ManageRole />
        </div>

      </main>
    </div>
  );
}

export default Users;
