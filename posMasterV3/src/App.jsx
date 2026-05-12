import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useOutletContext,
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
import OnlineConnectionOverlay from './frontend/components/OnlineConnectionOverlay.jsx';

// Reactive Data Store Provider
import { DataStoreProvider } from './frontend/store';



function PrivateRoute() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * PermissionRoute - guards a route by checking if the current user
 * has at least one of the required permissions.
 * Props:
 *   requiredPermissions: string[]  - any of these must be true
 *   anyRole: string[]              - OR any of these roles suffices
 */
function PermissionRoute({ requiredPermissions = [], anyRole = [] }) {
  const [allowed, setAllowed] = React.useState(null); // null = loading
  const outletContext = useOutletContext();

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { localAuth } = await import('./frontend/api/services/localAuth.js');
        const { settingsApi } = await import('./frontend/api/localApi.js');

        const currentUser = await localAuth.getCurrentUser();
        if (!currentUser) {
          if (!cancelled) setAllowed(false);
          return;
        }

        const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];

        // Admin always allowed
        if (userRoles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin')) {
          if (!cancelled) setAllowed(true);
          return;
        }

        // Role shortcut
        if (anyRole.length > 0 && userRoles.some(r => anyRole.includes((r || '').toLowerCase()))) {
          if (!cancelled) setAllowed(true);
          return;
        }

        if (requiredPermissions.length === 0) {
          if (!cancelled) setAllowed(true);
          return;
        }

        // Check saved permissions
        const userId = currentUser.id || currentUser._id;
        const response = await settingsApi.getUserSettings(userId);
        const perms = response?.data?.settings?.permissions;

        if (!perms) {
          // No permissions saved — deny non-admins for protected routes
          if (!cancelled) setAllowed(false);
          return;
        }

        const allPermValues = Object.values(perms).reduce((acc, cat) => {
          if (cat && typeof cat === 'object') Object.assign(acc, cat);
          return acc;
        }, {});

        const hasAny = requiredPermissions.some(p => allPermValues[p] === true);
        if (!cancelled) setAllowed(hasAny);
      } catch {
        if (!cancelled) setAllowed(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [anyRole, requiredPermissions]);

  if (allowed === null) return null; // loading — render nothing briefly
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <Outlet context={outletContext} />;
}

function App() {
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
            <OnlineConnectionOverlay />
            <Routes>
              <Route index element={<Intro />} />
              <Route path="startup" element={<Startup />} />
              <Route path="login" element={<Login />} />

              <Route path="dashboard" element={<PrivateRoute />}>
                <Route element={<Dashboard />}>
                  <Route index element={<Notification />} />
                  <Route path="inventory/share" element={<Inventory />} />
                  <Route path="inventory/*" element={<Inventory />} />
                  <Route path="inventory-config" element={<InventoryConfig />} />
                  <Route path="settings/*" element={<Settings />} />
                  <Route path="notifications" element={<Notification />} />
                  <Route path="sales" element={<Sales />} />
                  <Route element={<PermissionRoute requiredPermissions={['user_manage', 'user_role_manage']} anyRole={['admin', 'manager']} />}>
                    <Route path="users" element={<Users />} />
                  </Route>
                </Route>
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
