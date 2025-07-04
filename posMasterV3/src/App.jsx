import React, { useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import './App.css';

import Intro from './pages/Intro.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import Inventory from './pages/inventory/Inventory.jsx';
import ToastProvider from './pages/toasts/ToastProvider.jsx';
import Settings from './pages/settings/Settings.jsx';
import Notification from './pages/notification/Notification.jsx';
import SalesView from './pages/sales/SalesView.jsx';
import InventoryConfig from './pages/inventory/InventoryConfig.jsx';

function App() {
  const [currentView, setCurrentView] = useState('desktop1');

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route index element={<Intro />} />
          <Route path="login" element={<Login />} />

          {/* Private routing when needed (disabled for now) */}
          {/* <Route element={<ProtectedRoute />}> */}
          <Route path="dashboard" element={<Dashboard />} >
            <Route path="inventory/*" element={<Inventory />} />
            <Route path="inventory-config" element={<InventoryConfig />} />
            <Route path="settings/*" element={<Settings />} />
            <Route path="notifications" element={<Notification />} />
            <Route path="sales" element={<SalesView />} />
          </Route>
          {/* </Route> */}

          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}

export default App;
