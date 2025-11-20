import React, { useState, useEffect } from 'react';
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

import InventoryConfig from './pages/inventory/InventoryConfig.jsx';
import Sales from './pages/sales/Sales.jsx';

import Startup from './pages/Startup.jsx';
import Users from './pages/users/users.jsx';



function App() {
  const [currentView, setCurrentView] = useState('desktop1');

  useEffect(() => {
    const handleBeforeUnload = () => {
      const username = localStorage.getItem("username");
      const token = localStorage.getItem("token");

      if (username && token && window.electronAPI?.sendUserData) {
        if (window.electronAPI.sendUserDataSync) {
          window.electronAPI.sendUserDataSync(username, token);
        } else {
          window.electronAPI.sendUserData(username, token);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    if (window.electronAPI && window.electronAPI.onRequestUserData) {
      window.electronAPI.onRequestUserData(() => {
        const normalize = (v) => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'string') {
            const t = v.trim();
            if (t === '' || t === 'undefined') return null;
            return t;
          }
          return v;
        };

        const user = {
          username: normalize(localStorage.getItem('username')),
          token: normalize(localStorage.getItem('token')),
          email: normalize(localStorage.getItem('email')),
          _id: normalize(localStorage.getItem('_id')),
        };
        console.log('replying to request-user-data with', user);
        return user;
      });
    }

    if (window.electronAPI && window.electronAPI.receive) {
      window.electronAPI.receive('logout-response', (payload) => {
        try {
          console.log('logout-response received in renderer:', payload);
        } catch (e) {
          console.error('Error handling logout-response', e);
        }
      });
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route index element={<Intro />} />
          <Route path="startup" element={<Startup />} />
          <Route path="login" element={<Login />} />

          <Route path="dashboard"             element={<Dashboard />} >
            <Route index                      element={<Notification />} />
            <Route path="inventory/*"         element={<Inventory />} />
            <Route path="inventory-config"    element={<InventoryConfig />} />
            <Route path="settings/*"          element={<Settings />} />
            <Route path="notifications"       element={<Notification />} />
            <Route path="sales"               element={<Sales />} />
            <Route path="users"           element={<Users/>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}

export default App;

