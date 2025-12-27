import React, { useState, useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import './App.css';

// Frontend page imports
import Intro from './frontend/pages/Intro.jsx';
import Login from './frontend/pages/Login.jsx';
import Dashboard from './frontend/pages/Dashboard.jsx';
import NotFound from './frontend/pages/NotFound.jsx';
import Inventory from './frontend/pages/inventory/Inventory.jsx';
import ToastProvider from './frontend/pages/toasts/ToastProvider.jsx';
import { StatusLogProvider } from './frontend/services/StatusLogService.jsx';
import Settings from './frontend/pages/settings/Settings.jsx';
import Notification from './frontend/pages/notification/Notification.jsx';

import InventoryConfig from './frontend/pages/inventory/InventoryConfig.jsx';
import Sales from './frontend/pages/sales/Sales.jsx';

import Startup from './frontend/pages/Startup.jsx';
import Users from './frontend/pages/users/users.jsx';

// Reactive Data Store Provider
import { DataStoreProvider } from './frontend/store';



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
      <StatusLogProvider>
        <DataStoreProvider>
          <HashRouter>
            <Routes>
              <Route index element={<Intro />} />
              <Route path="startup" element={<Startup />} />
              <Route path="login" element={<Login />} />

              <Route path="dashboard" element={<Dashboard />}>
                <Route index element={<Notification />} />
                <Route path="inventory/*" element={<Inventory />} />
                <Route path="inventory-config" element={<InventoryConfig />} />
                <Route path="settings/*" element={<Settings />} />
                <Route path="notifications" element={<Notification />} />
                <Route path="sales" element={<Sales />} />
                <Route path="users" element={<Users />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </DataStoreProvider>
      </StatusLogProvider>
    </ToastProvider>
  );
}

export default App;

