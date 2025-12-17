import React, { useContext, useState, } from "react";
import ToastContext from "./toasts/ToastService.jsx";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";

function Dashboard() {
  const [activeSection, setActiveSection] = useState(null);
  const toast = useContext(ToastContext);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Main content area removed mt-16 for header removal */}
      <div className="flex flex-1">
        {" "}
        {/* mt-16 accounts for header height */}
        {/* Sidebar - fixed left */}
        {/* <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-44 z-40"> */}
        <Sidebar />
        {/* </aside> */}
        {/* Main content - with sidebar offset */}
        <main className="flex-1 ml-[128px] pb-16">
          {" "}
          {/* pb-16 accounts for footer height */}
          <Outlet context={{ setActiveSection }} />
        </main>
      </div>

      {/* Footer - fixed at bottom */}
      <footer
        id="bottom-bar"
        className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white py-2 z-50"
      >
        <div className="flex items-center gap-1 justify-start ml-5">
        <span
          className={`inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin`}
          style={{ verticalAlign: "middle" }}
        ></span>
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
