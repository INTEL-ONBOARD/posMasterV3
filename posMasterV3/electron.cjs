const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { pathToFileURL } = require("url");
const axios = require("axios");
const fs = require("fs").promises;
const printer = require("pdf-to-printer");

// Backend initialization - lazy loaded to avoid importing Electron modules
// before app is ready
let _backendModule = null;
function getBackend() {
    if (!_backendModule) {
        _backendModule = require("./src/backend/backend.cjs");
    }
    return _backendModule;
}

// Load the version from package.json
const appVersion = require(path.join(__dirname, "package.json")).version;

// Auto-updater configuration - user must trigger download manually
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.logger = console;

let mainWindow;
let storedUser = null;
let isQuitting = false;

// Default folder path
const defaultFolderPath = "C:\\POS Master";

// Paths to your DTOs (as you specified)
const dtoPaths = {
  temp: path.join(
    __dirname,
    "src",
    "frontend",
    "templates",
    "dtos",
    "config",
    "TempConfigDTO.jsx"
  ),
  config: path.join(
    __dirname,
    "src",
    "frontend",
    "templates",
    "dtos",
    "config",
    "ConfigFileDTO.jsx"
  ),
};

// Cache for loaded DTO classes
const DTOCache = {};

// Dynamically import DTO modules (ES modules) and cache the default exports (classes)
async function loadDTOs() {
  if (DTOCache.TempConfigDTO && DTOCache.ConfigFileDTO) {
    return {
      TempConfigDTO: DTOCache.TempConfigDTO,
      ConfigFileDTO: DTOCache.ConfigFileDTO,
    };
  }

  // Convert file path to file:// URL for dynamic import
  const tempUrl = pathToFileURL(dtoPaths.temp).href;
  const configUrl = pathToFileURL(dtoPaths.config).href;

  // Dynamic import - these files should be transpiled/usable at runtime in your build
  const tempModule = await import(tempUrl);
  const configModule = await import(configUrl);

  // Default export is expected to be the DTO class
  DTOCache.TempConfigDTO = tempModule.default;
  DTOCache.ConfigFileDTO = configModule.default;

  return {
    TempConfigDTO: DTOCache.TempConfigDTO,
    ConfigFileDTO: DTOCache.ConfigFileDTO,
  };
}

// DISABLED: electron-reload was causing full app reloads on any file change
// including database writes and sync operations. Vite HMR handles React hot-reload.
// If you need backend hot-reload, use nodemon or restart manually.
//
// try {
//   if (!app.isPackaged) {
//     require("electron-reload")(__dirname, {
//       awaitWriteFinish: true,
//       ignored: /node_modules|[\/\\]\.git|dist|dist-react|\.db|\.sqlite|\.json|\.log/,
//     });
//     console.log("electron-reload enabled");
//   }
// } catch (e) {
//   console.log("electron-reload not available, skipping hot reload");
// }

// IPC to open folder selector
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return defaultFolderPath; // Return default folder path if no folder is selected
  }
  return result.filePaths[0]; // Return the user-selected folder
});

// Validate JSON structure helper (kept for fallback; DTO validation is preferred)
const validateJsonStructure = (fileContent, expectedStructure) => {
  try {
    const parsedContent = JSON.parse(fileContent);
    for (const key of Object.keys(expectedStructure)) {
      if (!(key in parsedContent)) {
        console.error(`Missing key ${key} in JSON structure`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Invalid JSON format:", error.message);
    return false;
  }
};

// IPC to create or validate temp.json and config.json
ipcMain.handle("create-files", async (event, { folderPath, outlet } = {}) => {
  const chosenFolderPath = folderPath || defaultFolderPath; // Use default if folderPath is null or undefined
  const tempFilePath = path.join(chosenFolderPath, "temp.json");
  const configFilePath = path.join(chosenFolderPath, "config.json");

  const currentDate = new Date().toISOString();

  // Prepare plain objects (these will be validated/normalized via DTO.fromJSON if needed)
  const tempContent = {
    version_no: appVersion, // Use the version from package.json
    config_path: chosenFolderPath,
    created_date: currentDate,
    updated_date: currentDate,
    log: [
      {
        date_time: currentDate,
        status: "INFO",
        message: "Initial configuration created.",
        mode: "SYSTEM",
      },
    ],
  };

  // Define config.json structure
  const configContent = {
    automatic_logout: false,
    notifications: false,
    cloud_sync: false,
    temp_system: false,
    run_on_startup: false,
    maximize_window: true,
    temp_file_path: chosenFolderPath,
    config_path: chosenFolderPath, // note: legacy key name kept for compatibility; DTO may accept it
    db_config_path: chosenFolderPath,
    outlet_setup: outlet,
    created_date: currentDate,
    updated_date: currentDate,
  };

  try {
    // Ensure folder exists
    await fs.mkdir(chosenFolderPath, { recursive: true });

    // Load DTOs (so we can validate using their fromJSON factories)
    let TempConfigDTO, ConfigFileDTO;
    try {
      ({ TempConfigDTO, ConfigFileDTO } = await loadDTOs());
    } catch (dtoErr) {
      console.warn(
        "Could not load DTO modules dynamically, falling back to basic validation:",
        dtoErr && dtoErr.message ? dtoErr.message : String(dtoErr)
      );
    }

    // Check and validate temp.json
    try {
      const existingTempContent = await fs.readFile(tempFilePath, "utf-8");
      if (TempConfigDTO && typeof TempConfigDTO.fromJSON === "function") {
        try {
          const parsed = JSON.parse(existingTempContent);
          // will throw if invalid
          TempConfigDTO.fromJSON(parsed);
        } catch (validationErr) {
          return {
            success: false,
            error: "Invalid temp.json structure: " + validationErr.message,
          };
        }
      } else {
        // fallback shallow check
        const isTempValid = validateJsonStructure(
          existingTempContent,
          tempContent
        );
        if (!isTempValid) {
          return { success: false, error: "Invalid temp.json structure" };
        }
      }
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(
        tempFilePath,
        JSON.stringify(tempContent, null, 2),
        "utf-8"
      );
    }

    // Check and validate config.json
    try {
      const existingConfigContent = await fs.readFile(configFilePath, "utf-8");
      if (ConfigFileDTO && typeof ConfigFileDTO.fromJSON === "function") {
        try {
          const parsed = JSON.parse(existingConfigContent);
          // will throw if invalid
          ConfigFileDTO.fromJSON(parsed);
        } catch (validationErr) {
          return {
            success: false,
            error: "Invalid config.json structure: " + validationErr.message,
          };
        }
      } else {
        // fallback shallow check
        const isConfigValid = validateJsonStructure(
          existingConfigContent,
          configContent
        );
        if (!isConfigValid) {
          return { success: false, error: "Invalid config.json structure" };
        }
      }
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(
        configFilePath,
        JSON.stringify(configContent, null, 2),
        "utf-8"
      );
    }

    return { success: true, tempFilePath, configFilePath };
  } catch (error) {
    console.error("Error creating or validating files:", error);
    return { success: false, error: error.message };
  }
});

// IPC to read the DTOs and return serialized objects
ipcMain.handle("read-config-dtos", async (event, { folderPath } = {}) => {
  const chosenFolderPath = folderPath || defaultFolderPath;
  const tempFilePath = path.join(chosenFolderPath, "temp.json");
  const configFilePath = path.join(chosenFolderPath, "config.json");

  try {
    const { TempConfigDTO, ConfigFileDTO } = await loadDTOs();

    const tempRaw = JSON.parse(await fs.readFile(tempFilePath, "utf-8"));
    const configRaw = JSON.parse(await fs.readFile(configFilePath, "utf-8"));

    const tempDto = TempConfigDTO.fromJSON(tempRaw);
    const configDto = ConfigFileDTO.fromJSON(configRaw);

    return {
      success: true,
      temp: typeof tempDto.toJSON === "function" ? tempDto.toJSON() : tempDto,
      config:
        typeof configDto.toJSON === "function" ? configDto.toJSON() : configDto,
    };
  } catch (err) {
    console.error(
      "read-config-dtos error:",
      err && err.message ? err.message : err
    );
    return {
      success: false,
      error: err && err.message ? err.message : String(err),
    };
  }
});

// IPC to store user data
ipcMain.handle("store-user-data", async (event, userData) => {
  storedUser = userData;
  console.log("User data stored:", userData);
  return { success: true };
});

// Perform logout and quit
const performLogoutAndQuit = async () => {
  if (isQuitting) return;
  isQuitting = true;
  console.log("performLogoutAndQuit: starting logout sequence");

  if (!storedUser) {
    try {
      const userFromRenderer = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ipcMain.removeAllListeners("reply-user-data");
          resolve(null);
        }, 2000);

        ipcMain.once("reply-user-data", (event, user) => {
          clearTimeout(timeout);
          resolve(user);
        });

        try {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send("request-user-data");
          }
        } catch (e) {
          console.error("Error sending request-user-data to renderer", e);
        }
      });

      if (userFromRenderer) {
        storedUser = userFromRenderer;
        console.log(
          "performLogoutAndQuit: received user from renderer",
          storedUser
        );
      } else {
        console.warn("performLogoutAndQuit: no user reply from renderer");
      }
    } catch (e) {
      console.error("Error requesting user from renderer", e);
    }
  }

  if (
    storedUser &&
    (storedUser.email || storedUser.username) &&
    (storedUser._id || storedUser.token)
  ) {
    try {
      const resp = await axios.post(
        "https://posmasterv3-backend.onrender.com/api/users/logout",
        {
          email: storedUser.email,
          user_id: storedUser._id,
          username: storedUser.username,
          token: storedUser.token,
        },
        { timeout: 5000 }
      );
      console.log("Logout successful", resp && resp.data ? resp.data : resp);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("logout-response", {
          ok: true,
          data: resp.data,
        });
      }
    } catch (error) {
      const errMsg =
        error && error.response && error.response.data
          ? error.response.data
          : error && error.message
          ? error.message
          : String(error);
      console.error("Logout failed:", errMsg);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("logout-response", {
          ok: false,
          error: errMsg,
        });
      }
    }
  } else {
    console.warn("No user data to logout");
  }

  try {
    app.quit();
  } catch (e) {
    console.error(
      "Error quitting app:",
      e && e.message ? e.message : String(e)
    );
    process.exit(0);
  }
};

async function createWindow(showImmediately = false) {
  const iconPath = path.join(__dirname, "src", "frontend", "assets", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    titleBarOverlay: true,
    icon: iconPath,
    show: showImmediately, // Show immediately if requested
    backgroundColor: "#ffffff", // White background while loading
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (showImmediately) {
    mainWindow.maximize();
  } else {
    // Show window once DOM is ready
    mainWindow.once("ready-to-show", () => {
      mainWindow.maximize();
      mainWindow.show();
    });
  }

  // In development, prefer loading the Vite dev server for HMR.
  const envUrl = process.env.VITE_DEV_SERVER_URL;
  const candidateUrls = envUrl
    ? [envUrl]
    : ["http://localhost:5173", "http://localhost:5174"];
  if (!app.isPackaged) {
    let loaded = false;
    for (const url of candidateUrls) {
      const ok = await waitForDevServer(url, 5000);
      if (ok) {
        await mainWindow.loadURL(url);
        console.log("Loaded renderer from dev server:", url);
        mainWindow.webContents.openDevTools();
        loaded = true;
        break;
      }
    }
    if (!loaded) {
      console.warn(
        "Dev server not available on candidate ports, falling back to built files"
      );
      await mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  async function waitForDevServer(url, timeoutMs = 15000) {
    const { URL } = require("url");
    const parsed = new URL(url);
    const http =
      parsed.protocol === "https:" ? require("https") : require("http");

    const start = Date.now();

    return new Promise((resolve) => {
      const tryOnce = () => {
        const req = http.request(
          {
            method: "HEAD",
            host: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname,
            timeout: 2000,
          },
          (res) => {
            resolve(true);
          }
        );
        req.on("error", () => {
          if (Date.now() - start >= timeoutMs) return resolve(false);
          setTimeout(tryOnce, 500);
        });
        req.on("timeout", () => {
          req.destroy();
          if (Date.now() - start >= timeoutMs) return resolve(false);
          setTimeout(tryOnce, 500);
        });
        req.end();
      };
      tryOnce();
    });
  }

  mainWindow.on("close", async (event) => {
    if (isQuitting) return;
    event.preventDefault();
    console.log("Window close triggered, handling logout...");
    performLogoutAndQuit();
  });
}

ipcMain.on("perform-logout", async () => {
  console.log("IPC perform-logout received");
  await performLogoutAndQuit();
});

ipcMain.on("print-silent", async (event, arrayBuffer) => {
  console.log("Silent print started");

  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
    console.error("Invalid print data received");
    return;
  }

  const tempFile = path.join(app.getPath("temp"), `print-${Date.now()}.pdf`);

  try {
    const pdfBuffer = Buffer.from(arrayBuffer);

    await fs.writeFile(tempFile, pdfBuffer);
    console.log("PDF saved to", tempFile);

    await printer.print(tempFile, { silent: true });
    console.log("Printed via pdf-to-printer");
  } catch (error) {
    console.error("Silent print failed:", error.message);

    try {
      console.log("Attempting fallback printing");
      const printWindow = new BrowserWindow({ show: false });
      await printWindow.loadURL(`file://${tempFile}`);

      await new Promise((resolve) => {
        printWindow.webContents.on("did-finish-load", () => {
          printWindow.webContents.print(
            {
              silent: true,
              printBackground: true,
            },
            (success) => {
              printWindow.close();
              if (success) {
                console.log("Printed via fallback method");
              }
              resolve();
            }
          );
        });
      });
    } catch (fallbackError) {
      console.error("Fallback printing failed:", fallbackError.message);
    }
  } finally {
    try {
      await fs.unlink(tempFile);
      console.log("Temporary file cleaned up");
    } catch (cleanupError) {
      console.warn("Temp file cleanup failed:", cleanupError.message);
    }
  }
});

// IPC handler for backend status - register early so it's available before backend init
ipcMain.handle("backend:status", async () => {
  return getBackend().getBackendStatus();
});

// IPC handler for app restart (used when app_settings change)
ipcMain.handle("app:restart", async () => {
  console.log("[Electron] App restart requested - restarting application...");
  app.relaunch();
  app.exit(0);
});

// IPC handler to logout and restart (clears session and restarts)
ipcMain.handle("app:logoutAndRestart", async () => {
  console.log("[Electron] Logout and restart requested...");
  // Clear stored user data
  storedUser = null;
  // Relaunch the app
  app.relaunch();
  app.exit(0);
});

// ============================================================
// AUTO-UPDATER EVENT HANDLERS
// Push update status events to the renderer window
// ============================================================

autoUpdater.on("update-available", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("updates:available", {
      latestVersion: info.version,
      currentVersion: app.getVersion(),
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

autoUpdater.on("update-not-available", (info) => {
  if (mainWindow) {
    mainWindow.webContents.send("updates:not-available", {
      currentVersion: info.version,
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
  try {
    autoUpdater.quitAndInstall(false, true);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

app.whenReady().then(async () => {
  const iconPath = path.join(__dirname, "src", "frontend", "assets", "icon.ico");

  // Create window and show immediately with splash screen (maximize setting read after backend init)
  console.log("[Electron] Creating window with splash...");
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    titleBarOverlay: true,
    icon: iconPath,
    show: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load splash screen HTML immediately (matches Intro.jsx styling)
  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }
        .title {
          font-size: 1.875rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .pos { color: #00489A; font-weight: bold; }
        .master { color: #111827; }
        .version { color: #374151; }
        .spinner-container {
          display: flex;
          justify-content: center;
          margin-bottom: 0.5rem;
        }
        .spinner {
          position: relative;
          width: 2rem;
          height: 2rem;
        }
        .spinner-bg {
          width: 2rem;
          height: 2rem;
          border: 2px solid #E5E7EB;
          border-radius: 50%;
        }
        .spinner-fg {
          position: absolute;
          top: 0;
          left: 0;
          width: 2rem;
          height: 2rem;
          border: 2px solid #2563EB;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status {
          color: #6B7280;
          font-size: 0.875rem;
        }
        .footer {
          position: absolute;
          bottom: 1rem;
          width: 100%;
          text-align: center;
          color: #9CA3AF;
          font-size: 0.75rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="title">
          <span class="pos">POS</span>
          <span class="master"> MASTER</span>
          <span class="version">.3</span>
        </h1>
        <div class="spinner-container">
          <div class="spinner">
            <div class="spinner-bg"></div>
            <div class="spinner-fg"></div>
          </div>
        </div>
        <p class="status">Initializing...</p>
      </div>
      <div class="footer">
        Copyright © 2025 SLTC ®
      </div>
    </body>
    </html>
  `;

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  // Now initialize backend (user sees splash during this)
  console.log("[Electron] Starting backend initialization...");
  const backendResult = getBackend().initializeBackend(defaultFolderPath);
  if (backendResult.success) {
    console.log("[Electron] Backend initialized:", backendResult.dbPath);
  } else {
    console.error("[Electron] Backend initialization failed:", backendResult.message);
  }

  // Read maximize setting AFTER backend is initialized
  let shouldMaximize = true; // Default to true
  try {
    const { getAppSettingsService } = require("./src/backend/services/AppSettingsService.cjs");
    const appSettingsService = getAppSettingsService();
    shouldMaximize = appSettingsService.getMaximizeOnStart();
    console.log(`[Electron] maximize_window setting: ${shouldMaximize}`);
  } catch (e) {
    console.log("[Electron] Could not read maximize setting, using default:", e.message);
  }

  // Apply maximize setting
  if (shouldMaximize) {
    mainWindow.maximize();
  }

  // Now load the React app (backend is ready, Intro will navigate to login quickly)
  console.log("[Electron] Loading React app...");
  const envUrl = process.env.VITE_DEV_SERVER_URL;
  const candidateUrls = envUrl
    ? [envUrl]
    : ["http://localhost:5173", "http://localhost:5174"];

  if (!app.isPackaged) {
    let loaded = false;
    for (const url of candidateUrls) {
      const ok = await waitForDevServer(url, 5000);
      if (ok) {
        await mainWindow.loadURL(url);
        console.log("Loaded renderer from dev server:", url);
        mainWindow.webContents.openDevTools();
        loaded = true;
        break;
      }
    }
    if (!loaded) {
      console.warn("Dev server not available, falling back to built files");
      await mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  async function waitForDevServer(url, timeoutMs = 15000) {
    const { URL } = require("url");
    const parsed = new URL(url);
    const http = parsed.protocol === "https:" ? require("https") : require("http");
    const start = Date.now();

    return new Promise((resolve) => {
      const tryOnce = () => {
        const req = http.request(
          {
            method: "HEAD",
            host: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname,
            timeout: 2000,
          },
          () => resolve(true)
        );
        req.on("error", () => {
          if (Date.now() - start >= timeoutMs) return resolve(false);
          setTimeout(tryOnce, 500);
        });
        req.on("timeout", () => {
          req.destroy();
          if (Date.now() - start >= timeoutMs) return resolve(false);
          setTimeout(tryOnce, 500);
        });
        req.end();
      };
      tryOnce();
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup on app quit
app.on("will-quit", () => {
  console.log("[Electron] Shutting down backend...");
  getBackend().shutdownBackend();
});
