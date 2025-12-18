import React, { useState } from "react";
import SettingsSidebar from "./SettingsSidebar";
import UserSettings from "./UserSettings";
import AppSettings from "./AppSettings";

function Settings() {
  const [activeSection, setActiveSection] = useState("user-settings");

  const renderContent = () => {
    switch (activeSection) {
      case "user-settings":
        return <UserSettings />;
      case "app-settings":
        return <AppSettings />;
      default:
        return <div>Select a section</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <SettingsSidebar
        activeSection={activeSection}
        onUserSettingsClick={() => setActiveSection("user-settings")}
        onAppSettingsClick={() => setActiveSection("app-settings")}
      />
      <div className="flex-1 overflow-y-auto bg-gray-100 p-0 m-0">
        {renderContent()}
      </div>
    </div>
  );
}

export default Settings;