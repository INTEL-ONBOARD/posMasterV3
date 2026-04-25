# Auto-Update System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user-triggered auto-update capability to POSMasterV3 so any logged-in user can check for, download, and install updates from GitHub Releases via App Settings.

**Architecture:** `electron-updater` listens for IPC calls from the renderer. Events (update available, download progress, downloaded) are pushed back to the renderer window. The React frontend exposes a new "Software Updates" section in AppSettings.jsx matching the existing collapsible-section visual pattern.

**Tech Stack:** `electron-updater` (new dependency), Electron IPC, React useState/useEffect, Tailwind CSS, Lucide React icons.

---

### Task 1: Install electron-updater and configure package.json

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

```bash
npm install electron-updater
```

Expected: `electron-updater` appears in `dependencies` in package.json.

**Step 2: Set a real app version**

In `package.json` line 4, change:
```json
"version": "0.0.0",
```
to:
```json
"version": "1.0.0",
```

**Step 3: Add publish config to the build section**

In `package.json`, inside the `"build"` object (after line 51 `"extraResources"` block), add:
```json
"publish": {
  "provider": "github",
  "owner": "Revo-infosurv",
  "repo": "posMasterV3"
}
```

> Replace `owner` and `repo` with your actual GitHub organization/username and repository name.

**Step 4: Verify**

```bash
node -e "const pkg = require('./package.json'); console.log(pkg.version, pkg.build.publish, pkg.dependencies['electron-updater'])"
```
Expected output: `1.0.0 { provider: 'github', owner: '...', repo: '...' } 6.x.x`

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install electron-updater and configure publish settings"
```

---

### Task 2: Add autoUpdater logic and IPC handlers to electron.cjs

**Files:**
- Modify: `electron.cjs`

**Context:** `electron.cjs` currently imports from electron at line 1. The `mainWindow` variable is declared at line 22 and used throughout. The existing IPC handlers like `app:restart` (line 555) are the pattern to follow. `autoUpdater` events need `mainWindow` to push updates to the renderer — add null-guard since `mainWindow` may not exist yet.

**Step 1: Add the import at the top of electron.cjs**

After line 1 (`const { app, BrowserWindow, ipcMain, dialog } = require("electron");`), add:

```javascript
const { autoUpdater } = require("electron-updater");
```

**Step 2: Configure autoUpdater (disable auto-download)**

After the `autoUpdater` import (still near the top, before `let mainWindow`), add:

```javascript
// Auto-updater configuration - user must trigger download manually
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
```

**Step 3: Register autoUpdater event listeners**

After the existing `ipcMain.handle("app:logoutAndRestart", ...)` block (around line 570), add:

```javascript
// ============================================================
// AUTO-UPDATER EVENT HANDLERS
// Push update status events to the renderer window
// ============================================================

autoUpdater.on("update-available", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("updates:available", {
      latestVersion: info.version,
      releaseNotes: info.releaseNotes,
    });
  }
});

autoUpdater.on("download-progress", (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send("updates:download-progress", {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  }
});

autoUpdater.on("update-downloaded", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("updates:downloaded", {
      version: info.version,
    });
  }
});

autoUpdater.on("error", (err) => {
  if (mainWindow) {
    mainWindow.webContents.send("updates:error", {
      message: err.message,
    });
  }
});

// ============================================================
// AUTO-UPDATER IPC HANDLERS
// ============================================================

ipcMain.handle("updates:check-for-updates", async () => {
  // Cannot check for updates in development (app not packaged)
  if (!app.isPackaged) {
    return {
      status: "error",
      message: "Update checks are only available in the packaged app.",
    };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    const currentVersion = app.getVersion();
    if (!result || !result.updateInfo) {
      return { status: "success", data: { available: false, currentVersion } };
    }
    const latestVersion = result.updateInfo.version;
    const available = latestVersion !== currentVersion;
    return {
      status: "success",
      data: {
        available,
        currentVersion,
        latestVersion,
        releaseNotes: result.updateInfo.releaseNotes,
      },
    };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("updates:download-update", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("updates:install-update", () => {
  autoUpdater.quitAndInstall(false, true);
});
```

**Step 4: Verify electron.cjs loads without syntax errors**

```bash
node --input-type=commonjs -e "
  process.env.ELECTRON_RUN_AS_NODE = '1';
  // Just check syntax - do not execute
" 2>&1 || true
```

Actually just open the dev app:
```bash
npm run dev:all
```
Expected: App launches without errors in terminal. Check the DevTools console for any import errors.

**Step 5: Commit**

```bash
git add electron.cjs
git commit -m "feat: add autoUpdater setup and IPC handlers to electron.cjs"
```

---

### Task 3: Expose update API in preload.cjs

**Files:**
- Modify: `preload.cjs`

**Context:** The `app` namespace ends at line 373. The `appSettings` namespace begins at line 379. Add the `updates` namespace between them, following the exact same code style.

**Step 1: Add the updates namespace**

In `preload.cjs`, find the block that ends with:
```javascript
    app: {
        // Restart the application
        restart: () =>
            ipcRenderer.invoke("app:restart"),
        // Logout user and restart the application
        logoutAndRestart: () =>
            ipcRenderer.invoke("app:logoutAndRestart")
    },
```

After that closing `},` (line 373), add:

```javascript
    // ============================================
    // SOFTWARE UPDATES API
    // ============================================

    updates: {
        // Check GitHub for a newer version
        checkForUpdates: () =>
            ipcRenderer.invoke("updates:check-for-updates"),
        // Start downloading the available update
        downloadUpdate: () =>
            ipcRenderer.invoke("updates:download-update"),
        // Quit and install the downloaded update
        installUpdate: () =>
            ipcRenderer.invoke("updates:install-update"),
        // Register listener: called when an update is found
        onUpdateAvailable: (callback) => {
            ipcRenderer.on("updates:available", (_, data) => callback(data));
            return () => ipcRenderer.removeAllListeners("updates:available");
        },
        // Register listener: called with download progress { percent, transferred, total }
        onDownloadProgress: (callback) => {
            ipcRenderer.on("updates:download-progress", (_, data) => callback(data));
            return () => ipcRenderer.removeAllListeners("updates:download-progress");
        },
        // Register listener: called when download is complete
        onUpdateDownloaded: (callback) => {
            ipcRenderer.on("updates:downloaded", (_, data) => callback(data));
            return () => ipcRenderer.removeAllListeners("updates:downloaded");
        },
        // Register listener: called on error
        onUpdateError: (callback) => {
            ipcRenderer.on("updates:error", (_, data) => callback(data));
            return () => ipcRenderer.removeAllListeners("updates:error");
        },
    },
```

**Step 2: Verify preload.cjs exposes the new API**

Rebuild and open dev app, then in the DevTools console:
```javascript
console.log(typeof window.electronAPI.updates.checkForUpdates) // "function"
console.log(typeof window.electronAPI.updates.onUpdateAvailable) // "function"
```

**Step 3: Commit**

```bash
git add preload.cjs
git commit -m "feat: expose updates namespace in preload.cjs IPC bridge"
```

---

### Task 4: Add updatesApi to localApi.js

**Files:**
- Modify: `src/frontend/api/localApi.js`

**Context:** `onlineStatusApi` is defined in the shared renderer API module and exported. The default export object includes `onlineStatus: onlineStatusApi`. Add `updatesApi` after `onlineStatusApi`, and add it to the default export. `getElectronAPI()` is the existing helper that returns `window.electronAPI` or null.

**Step 1: Add updatesApi export**

After the end of `onlineStatusApi` (find `export const onlineStatusApi = {` and find its closing `};`), add:

```javascript
/**
 * Software Updates API - Check and install app updates via GitHub Releases
 * @namespace
 */
export const updatesApi = {
    checkForUpdates: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.checkForUpdates();
    },
    downloadUpdate: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.downloadUpdate();
    },
    installUpdate: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.installUpdate();
    },
    onUpdateAvailable: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateAvailable(callback);
    },
    onDownloadProgress: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onDownloadProgress(callback);
    },
    onUpdateDownloaded: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateDownloaded(callback);
    },
    onUpdateError: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateError(callback);
    },
};
```

**Step 2: Add to default export**

In the default export object at the bottom of `localApi.js`, add after `onlineStatus: onlineStatusApi,`:

```javascript
    updates: updatesApi,
```

**Step 3: Commit**

```bash
git add src/frontend/api/localApi.js
git commit -m "feat: add updatesApi wrapper to localApi.js"
```

---

### Task 5: Add Software Updates section to AppSettings.jsx

**Files:**
- Modify: `src/frontend/pages/settings/AppSettings.jsx`

**Context:** AppSettings.jsx has 3 collapsible sections: General Settings, Branch Settings, Cloud Sync. The Cloud Sync section ends at line 554 (`</div>` closing the section div). Add the 4th section after line 554, before the "Bottom Buttons" div (line 557). The file uses Tailwind CSS, Lucide React icons, and the toast context for notifications.

**Step 1: Update the import line**

Change line 2 from:
```javascript
import { ChevronDown, ChevronUp, RefreshCw, Database, Cloud, Wifi, WifiOff } from 'lucide-react';
```
to:
```javascript
import { ChevronDown, ChevronUp, RefreshCw, Database, Cloud, Wifi, WifiOff, Download, CheckCircle, XCircle } from 'lucide-react';
```

**Step 2: Update the localApi import**

Change line 3 from:
```javascript
import { settingsApi, onlineStatusApi, appSettingsApi } from '../../api/localApi';
```
to:
```javascript
import { settingsApi, onlineStatusApi, appSettingsApi, updatesApi } from '../../api/localApi';
```

**Step 3: Add state variables**

After `const [ensuringSchema, setEnsuringSchema] = useState(false);` (line 26), add:

```javascript
  // Software Updates state
  // States: idle | checking | up-to-date | update-available | downloading | ready-to-install | error
  const [openUpdates, setOpenUpdates] = useState(false);
  const [updateState, setUpdateState] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null); // { latestVersion, releaseNotes }
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);
```

**Step 4: Register event listeners in a new useEffect**

After the existing `useEffect` that has `return () => clearInterval(interval);` (line 92), add a new `useEffect`:

```javascript
  // Register electron-updater event listeners
  useEffect(() => {
    const unsubAvailable = updatesApi.onUpdateAvailable((data) => {
      setUpdateInfo(data);
      setUpdateState('update-available');
    });
    const unsubProgress = updatesApi.onDownloadProgress((data) => {
      setDownloadProgress(data.percent);
    });
    const unsubDownloaded = updatesApi.onUpdateDownloaded(() => {
      setUpdateState('ready-to-install');
    });
    const unsubError = updatesApi.onUpdateError((data) => {
      setUpdateError(data.message);
      setUpdateState('error');
    });
    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);
```

**Step 5: Add handler functions**

After the `handleCheckNetwork` function (line 297), add:

```javascript
  // Software Updates handlers
  const handleCheckForUpdates = async () => {
    setUpdateState('checking');
    setUpdateError(null);
    try {
      const result = await updatesApi.checkForUpdates();
      if (result.status === 'error') {
        setUpdateError(result.message);
        setUpdateState('error');
        return;
      }
      if (result.data?.available) {
        setUpdateInfo(result.data);
        setUpdateState('update-available');
      } else {
        setUpdateState('up-to-date');
      }
    } catch (err) {
      setUpdateError(err.message);
      setUpdateState('error');
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateState('downloading');
    setDownloadProgress(0);
    try {
      const result = await updatesApi.downloadUpdate();
      if (result.status === 'error') {
        setUpdateError(result.message);
        setUpdateState('error');
      }
      // On success, the "update-downloaded" event from electron will set ready-to-install
    } catch (err) {
      setUpdateError(err.message);
      setUpdateState('error');
    }
  };

  const handleInstallUpdate = async () => {
    toast.open('Installing update and restarting...', 3000, 'Info', 'info');
    await updatesApi.installUpdate();
  };
```

**Step 6: Add the Software Updates JSX section**

Find the closing tag of the Cloud Sync section (line 554: `</div>` that ends `{/* Cloud Sync Section */}`). After that `</div>`, and before `{/* Bottom Buttons */}`, add:

```jsx
          {/* Software Updates Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => {
                setOpenUpdates(!openUpdates);
                if (!openUpdates) {
                  setOpenGeneral(false);
                  setOpenBranch(false);
                  setOpenCloudSync(false);
                }
              }}
              className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Software Updates</span>
              </div>
              <div className="flex items-center gap-2">
                {updateState === 'ready-to-install' && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                )}
                {openUpdates ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </button>

            {openUpdates && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic py-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Keep your app up to date with the latest features and fixes
                </p>

                {/* Current version display */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Current Version</span>
                    <span className="text-sm font-mono font-semibold text-gray-800">
                      v{window.electronAPI?.app?.getVersion ? window.electronAPI.app.getVersion() : '—'}
                    </span>
                  </div>

                  {/* Status area */}
                  <div className="mt-3">
                    {updateState === 'up-to-date' && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">You're up to date</span>
                      </div>
                    )}
                    {updateState === 'update-available' && updateInfo && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">v{updateInfo.latestVersion} available</span>
                      </div>
                    )}
                    {updateState === 'downloading' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Downloading...</span>
                          <span className="text-sm font-semibold text-gray-700">{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#1A318C] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {updateState === 'ready-to-install' && (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Update ready to install</span>
                      </div>
                    )}
                    {updateState === 'error' && updateError && (
                      <div className="flex items-start gap-2 text-red-500">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{updateError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {(updateState === 'idle' || updateState === 'up-to-date' || updateState === 'error') && (
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={updateState === 'checking'}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1A318C] text-white rounded-lg text-sm font-medium hover:bg-[#152870] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${updateState === 'checking' ? 'animate-spin' : ''}`} />
                      {updateState === 'checking' ? 'Checking...' : 'Check for Updates'}
                    </button>
                  )}

                  {updateState === 'checking' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1A318C] text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking...
                    </button>
                  )}

                  {updateState === 'update-available' && (
                    <button
                      onClick={handleDownloadUpdate}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Update
                    </button>
                  )}

                  {updateState === 'ready-to-install' && (
                    <button
                      onClick={handleInstallUpdate}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Install & Restart
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
```

**Step 7: Fix the version display**

The `window.electronAPI.app.getVersion()` method does not exist yet. Instead, get the version from the IPC. In the status display, replace the version span with a static value using `appVersion` from a state variable.

Add a state variable at the top of the component (after the other state declarations):
```javascript
  const [appVersion, setAppVersion] = useState('');
```

Then in the existing `loadSettings` async function (inside the first useEffect), after `setLoading(true)`, add:
```javascript
        // Get app version
        if (window.electronAPI?.appSettings?.getAll) {
          const versionResult = await window.electronAPI.appSettings.getAll();
          // fall through - version comes from updateInfo or IPC check
        }
```

Actually, the simpler approach: get version from the `checkForUpdates` result. Until then, show `—`. The `currentVersion` field returned by `updates:check-for-updates` (`app.getVersion()`) populates once the user checks. Update the version display line:

```jsx
<span className="text-sm font-mono font-semibold text-gray-800">
  v{updateInfo?.currentVersion || '—'}
</span>
```

This will show `—` until a check is done, then show the current version. This is clean and requires no extra IPC.

**Step 8: Verify the UI**

```bash
npm run dev:all
```

Open the app → Settings → Software Updates:
- Section expands correctly
- "Check for Updates" button is visible
- Clicking it shows spinner briefly, then shows either "You're up to date" or "Update available"
- In dev mode, it should show the error message from the dev-mode guard

**Step 9: Commit**

```bash
git add src/frontend/pages/settings/AppSettings.jsx
git commit -m "feat: add Software Updates section to AppSettings"
```

---

### Task 6: End-to-end release verification (manual steps for when you're ready to release)

This is NOT a code task — it documents how to publish and test your first real update.

**To publish a new version:**

1. Bump `version` in `package.json` (e.g. `1.0.0` → `1.0.1`)
2. Commit: `git commit -am "chore: bump version to 1.0.1"`
3. Tag: `git tag v1.0.1 && git push origin v1.0.1`
4. Build and publish:
   ```bash
   GH_TOKEN=<your_github_personal_access_token> npm run dist -- --publish always
   ```
   This builds the NSIS/DMG installer and publishes it as a GitHub Release with `latest.yml` metadata.

**To test the update flow:**

1. Install `v1.0.0` on a machine
2. Publish `v1.0.1` via the steps above
3. Open the installed `v1.0.0` app
4. Go to Settings → Software Updates
5. Click "Check for Updates" — should show "v1.0.1 available"
6. Click "Download Update" — progress bar should fill
7. Click "Install & Restart" — app restarts at `v1.0.1`

---

## Summary of Files Modified

| File | Change |
|------|--------|
| `package.json` | `electron-updater` dep, `publish` config, version `1.0.0` |
| `electron.cjs` | `autoUpdater` import + config + 4 event listeners + 3 IPC handlers |
| `preload.cjs` | `updates` namespace: 3 invoke methods + 4 event listener methods |
| `src/frontend/api/localApi.js` | `updatesApi` export (7 methods) + added to default export |
| `src/frontend/pages/settings/AppSettings.jsx` | New "Software Updates" collapsible section |
