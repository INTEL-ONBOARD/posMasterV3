# Auto-Update System Design

**Date:** 2026-03-03
**Status:** Approved

## Context

POSMasterV3 is an Electron desktop app currently distributed as a manual installer (NSIS on Windows, DMG on macOS). There is no mechanism to deliver updates to deployed instances. This design adds automatic update delivery via GitHub Releases using `electron-updater`, with a user-facing "Software Updates" section in App Settings where any logged-in user can check for and install updates.

## Approach

**electron-updater + GitHub Releases** — the standard update mechanism for apps built with electron-builder. Updates are published as GitHub Releases (tagged versions). The app checks GitHub, downloads in the background, and prompts the user to install with a restart.

## Architecture

```
GitHub Release (latest.yml + installer)
        ↓  HTTPS
electron.cjs (autoUpdater)
        ↓  IPC
preload.cjs (window.electronAPI.updates)
        ↓  localApi.js wrapper
AppSettings.jsx (Software Updates section)
```

## Components

### 1. electron.cjs — autoUpdater setup

- Install `electron-updater` as a dependency
- Import and configure `autoUpdater` with `autoDownload: false` (user-triggered download)
- Register IPC handlers:
  - `updates:check-for-updates` → `autoUpdater.checkForUpdates()` → returns `{ available, currentVersion, latestVersion, releaseNotes }`
  - `updates:download-update` → `autoUpdater.downloadUpdate()` (progress sent via events)
  - `updates:install-update` → `autoUpdater.quitAndInstall(false, true)`
- Push events to renderer via `win.webContents.send()`:
  - `updates:available` — `{ latestVersion, releaseNotes }`
  - `updates:download-progress` — `{ percent, transferred, total }`
  - `updates:downloaded` — `{ version }`
  - `updates:error` — `{ message }`

### 2. package.json — publish config

Add to the `build` section:
```json
"publish": {
  "provider": "github",
  "owner": "<github-org>",
  "repo": "<github-repo>"
}
```

Set a real `version` (e.g. `"1.0.0"`) — currently hardcoded as `"0.0.0"`.

### 3. preload.cjs — IPC bridge

Add `updates` namespace to `window.electronAPI`:
```javascript
updates: {
  checkForUpdates: () => ipcRenderer.invoke("updates:check-for-updates"),
  downloadUpdate:  () => ipcRenderer.invoke("updates:download-update"),
  installUpdate:   () => ipcRenderer.invoke("updates:install-update"),
  onUpdateAvailable:    (cb) => { ipcRenderer.on("updates:available", (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners("updates:available"); },
  onDownloadProgress:   (cb) => { ipcRenderer.on("updates:download-progress", (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners("updates:download-progress"); },
  onUpdateDownloaded:   (cb) => { ipcRenderer.on("updates:downloaded", (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners("updates:downloaded"); },
  onUpdateError:        (cb) => { ipcRenderer.on("updates:error", (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners("updates:error"); },
}
```

### 4. localApi.js — updatesApi

Add `updatesApi` export following the same async wrapper pattern as `cloudSyncApi`:
- `checkForUpdates()` → proxies to `api.updates.checkForUpdates()`
- `downloadUpdate()` → proxies to `api.updates.downloadUpdate()`
- `installUpdate()` → proxies to `api.updates.installUpdate()`
- `onUpdateAvailable(cb)`, `onDownloadProgress(cb)`, `onUpdateDownloaded(cb)`, `onUpdateError(cb)` — event listener proxies

### 5. AppSettings.jsx — Software Updates section

4th collapsible section, below Cloud Sync, using the same visual pattern.

**UI state machine:**
```
idle → checking → up-to-date
                → update-available → downloading → ready-to-install
                → error
```

**UI elements:**
- Current version label (from app version)
- "Check for Updates" button (shows spinner while `checking`)
- Status message: "You're up to date" / "Update available: vX.X.X" / error message
- Download progress bar (0-100%) — visible only in `downloading` state
- "Download Update" button — visible only in `update-available` state
- "Install & Restart" button — visible only in `ready-to-install` state

Cleanup event listeners on component unmount.

## Data Flow

1. User clicks "Check for Updates" → `updatesApi.checkForUpdates()`
2. `autoUpdater.checkForUpdates()` contacts GitHub API
3. If update found: `updates:available` event → renderer shows version + "Download" button
4. User clicks "Download Update" → `updatesApi.downloadUpdate()`
5. Progress events update progress bar
6. `updates:downloaded` event → "Install & Restart" button appears
7. User clicks "Install & Restart" → `updatesApi.installUpdate()` → `quitAndInstall()`

## GitHub Release Setup

To publish a release:
```bash
# Tag and push
git tag v1.0.1
git push origin v1.0.1

# Build and publish (requires GH_TOKEN env var)
GH_TOKEN=<token> npm run build -- --publish always
```

electron-builder auto-generates `latest.yml` (Windows) / `latest-mac.yml` (macOS) in the release assets, which `electron-updater` uses to detect new versions.

## Verification

1. Build the app locally, install it
2. Bump `version` in `package.json` to a higher number in a test branch
3. Publish a draft GitHub Release with the new build
4. Open the installed (old) version → Settings → Software Updates → "Check for Updates"
5. Confirm the new version is detected, download progresses, and install restarts the app

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `electron-updater` dep, add `publish` config, set real version |
| `electron.cjs` | Add autoUpdater setup + IPC handlers |
| `preload.cjs` | Add `updates` namespace |
| `src/frontend/api/localApi.js` | Add `updatesApi` export |
| `src/frontend/pages/settings/AppSettings.jsx` | Add Software Updates section |
