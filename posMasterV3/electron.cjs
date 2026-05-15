const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { pathToFileURL } = require("url");
const net = require("net");
const os = require("os");
const axios = require("axios");
const fsSync = require("fs");
const fs = fsSync.promises;
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
let bundledOnlineBackendStarted = false;

// Default folder path
const defaultFolderPath = "C:\\POS Master";
const onlineRuntimeConfigFile = "online-runtime-config.json";
const DEFAULT_THERMAL_PRINTER_HOST =
  process.env.POS_THERMAL_PRINTER_HOST ||
  process.env.THERMAL_PRINTER_HOST ||
  "";
const DEFAULT_THERMAL_PRINTER_PORT = Number(
  process.env.POS_THERMAL_PRINTER_PORT ||
  process.env.THERMAL_PRINTER_PORT ||
  9100
);
const DEFAULT_RECEIPT_PRINTER_MODE = (
  process.env.POS_RECEIPT_PRINTER_MODE ||
  process.env.RECEIPT_PRINTER_MODE ||
  "auto"
).toLowerCase();
const DEFAULT_RECEIPT_SYSTEM_PRINTER_NAME = (
  process.env.POS_RECEIPT_SYSTEM_PRINTER_NAME ||
  process.env.POS_PRINTER_NAME ||
  process.env.PRINTER ||
  ""
).trim();
const DEFAULT_RECEIPT_NETWORK_AUTODISCOVERY = parseBooleanEnv(
  process.env.POS_RECEIPT_NETWORK_AUTODISCOVERY ||
  process.env.RECEIPT_NETWORK_AUTODISCOVERY,
  true
);
const THERMAL_PRINTER_DISCOVERY_TIMEOUT_MS = readPositiveIntegerEnv(
  process.env.POS_THERMAL_PRINTER_DISCOVERY_TIMEOUT_MS,
  250
);
const THERMAL_PRINTER_DISCOVERY_CONCURRENCY = readPositiveIntegerEnv(
  process.env.POS_THERMAL_PRINTER_DISCOVERY_CONCURRENCY,
  64
);
const THERMAL_PRINTER_DISCOVERY_CACHE_TTL_MS = readPositiveIntegerEnv(
  process.env.POS_THERMAL_PRINTER_DISCOVERY_CACHE_TTL_MS,
  5 * 60 * 1000
);
let cachedThermalPrinterTarget = null;

function parseBooleanEnv(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(value).trim().toLowerCase());
}

function readPositiveIntegerEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeReceiptPrinterMode(mode) {
  const normalized = String(mode || DEFAULT_RECEIPT_PRINTER_MODE).trim().toLowerCase();

  if (["tcp", "network", "raw", "wifi", "ethernet"].includes(normalized)) {
    return "network";
  }

  if (["system", "usb", "windows", "os", "pdf", "queue"].includes(normalized)) {
    return "system";
  }

  return "auto";
}

function getReceiptPrinterConfig(payload = {}) {
  return {
    mode: normalizeReceiptPrinterMode(payload.mode),
    systemPrinterName: String(
      payload.printerName ||
      process.env.POS_RECEIPT_SYSTEM_PRINTER_NAME ||
      process.env.POS_PRINTER_NAME ||
      process.env.PRINTER ||
      DEFAULT_RECEIPT_SYSTEM_PRINTER_NAME ||
      ""
    ).trim(),
    networkAutoDiscovery: parseBooleanEnv(
      payload.networkAutoDiscovery ??
      process.env.POS_RECEIPT_NETWORK_AUTODISCOVERY ??
      process.env.RECEIPT_NETWORK_AUTODISCOVERY,
      DEFAULT_RECEIPT_NETWORK_AUTODISCOVERY
    ),
  };
}

function getThermalPrinterHost(payload = {}) {
  return String(
    payload.host ||
    process.env.POS_THERMAL_PRINTER_HOST ||
    process.env.THERMAL_PRINTER_HOST ||
    DEFAULT_THERMAL_PRINTER_HOST
  ).trim();
}

function getThermalPrinterPort(payload = {}) {
  const port = Number(
    payload.port ||
    process.env.POS_THERMAL_PRINTER_PORT ||
    process.env.THERMAL_PRINTER_PORT ||
    DEFAULT_THERMAL_PRINTER_PORT
  );

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid thermal printer port: ${payload.port}`);
  }

  return port;
}

function getThermalPrinterTarget(payload = {}) {
  const host = getThermalPrinterHost(payload);
  const port = getThermalPrinterPort(payload);

  if (!host) throw new Error("Thermal printer host is not configured");

  return { host, port };
}

function normalizePrintBuffer(data) {
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (Array.isArray(data)) return Buffer.from(data);
  return null;
}

function writeToThermalPrinter(buffer, target, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(timeoutMs);
    socket.once("error", finish);
    socket.once("timeout", () => {
      finish(new Error(`Thermal printer connection timed out after ${timeoutMs}ms`));
    });
    socket.connect(target.port, target.host, () => {
      socket.write(buffer, (error) => {
        if (error) {
          finish(error);
          return;
        }
        socket.end();
      });
    });
    socket.once("close", (hadError) => {
      if (!hadError) finish();
    });
  });
}

function ipv4ToNumber(ipAddress) {
  const parts = String(ipAddress).split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    parts[3]
  ) >>> 0;
}

function numberToIpv4(value) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

function getLocalNetworkCandidates() {
  const candidates = new Set();
  const localAddresses = new Set();

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      const isIpv4 = entry.family === "IPv4" || entry.family === 4;
      if (!isIpv4 || entry.internal) continue;

      const localAddress = ipv4ToNumber(entry.address);
      if (localAddress === null) continue;
      localAddresses.add(entry.address);

      const netmask = ipv4ToNumber(entry.netmask);
      let start = ((localAddress & 0xffffff00) >>> 0) + 1;
      let end = ((localAddress & 0xffffff00) >>> 0) + 254;

      if (netmask !== null) {
        const network = (localAddress & netmask) >>> 0;
        const broadcast = (network | (~netmask >>> 0)) >>> 0;
        const hostCount = broadcast - network - 1;

        if (hostCount > 0 && hostCount <= 254) {
          start = network + 1;
          end = broadcast - 1;
        }
      }

      for (let address = start; address <= end; address += 1) {
        const candidate = numberToIpv4(address >>> 0);
        if (!localAddresses.has(candidate)) candidates.add(candidate);
      }
    }
  }

  return Array.from(candidates);
}

function testTcpPort(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (isOpen) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function findReachableHost(candidates, port, timeoutMs, concurrency) {
  for (let index = 0; index < candidates.length; index += concurrency) {
    const batch = candidates.slice(index, index + concurrency);
    const results = await Promise.all(
      batch.map(async (host) => ((await testTcpPort(host, port, timeoutMs)) ? host : null))
    );
    const foundHost = results.find(Boolean);
    if (foundHost) return foundHost;
  }

  return null;
}

async function discoverThermalPrinter(payload = {}) {
  const port = getThermalPrinterPort(payload);
  const { networkAutoDiscovery } = getReceiptPrinterConfig(payload);

  if (!networkAutoDiscovery) {
    throw new Error("Network printer auto-discovery is disabled");
  }

  if (
    cachedThermalPrinterTarget &&
    cachedThermalPrinterTarget.port === port &&
    Date.now() - cachedThermalPrinterTarget.detectedAt < THERMAL_PRINTER_DISCOVERY_CACHE_TTL_MS
  ) {
    return {
      host: cachedThermalPrinterTarget.host,
      port: cachedThermalPrinterTarget.port,
      discovered: true,
      cached: true,
    };
  }

  const candidates = getLocalNetworkCandidates();
  if (candidates.length === 0) {
    throw new Error("No local IPv4 network found for printer auto-discovery");
  }

  console.log(
    `[ThermalPrint] Auto-discovering network printer on ${candidates.length} hosts, port ${port}`
  );

  const host = await findReachableHost(
    candidates,
    port,
    THERMAL_PRINTER_DISCOVERY_TIMEOUT_MS,
    THERMAL_PRINTER_DISCOVERY_CONCURRENCY
  );

  if (!host) {
    throw new Error(`No network thermal printer found on port ${port}`);
  }

  cachedThermalPrinterTarget = {
    host,
    port,
    detectedAt: Date.now(),
  };

  return {
    host,
    port,
    discovered: true,
    cached: false,
  };
}

async function resolveThermalPrinterTarget(payload = {}) {
  const host = getThermalPrinterHost(payload);

  if (host) {
    return {
      ...getThermalPrinterTarget(payload),
      discovered: false,
      cached: false,
    };
  }

  return discoverThermalPrinter(payload);
}

async function printPdfBufferSilently(arrayBuffer, options = {}) {
  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
    throw new Error("Invalid print data received");
  }

  const tempFile = path.join(app.getPath("temp"), `print-${Date.now()}.pdf`);
  const { systemPrinterName } = getReceiptPrinterConfig(options);

  try {
    const pdfBuffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFile, pdfBuffer);
    console.log("PDF saved to", tempFile);

    const printOptions = { silent: true };
    if (systemPrinterName) printOptions.printer = systemPrinterName;

    await printer.print(tempFile, printOptions);
    console.log(
      systemPrinterName
        ? `Printed via pdf-to-printer on ${systemPrinterName}`
        : "Printed via pdf-to-printer on default printer"
    );

    return {
      status: "success",
      data: {
        mode: "system",
        printerName: systemPrinterName || null,
      },
    };
  } catch (error) {
    console.error("Silent print failed:", error.message);

    try {
      console.log("Attempting fallback printing");
      const printWindow = new BrowserWindow({ show: false });

      await new Promise((resolve, reject) => {
        printWindow.webContents.once("did-finish-load", () => {
          printWindow.webContents.print(
            {
              silent: true,
              printBackground: true,
              deviceName: systemPrinterName || undefined,
            },
            (success, failureReason) => {
              printWindow.close();
              if (success) {
                console.log("Printed via fallback method");
                resolve();
                return;
              }

              reject(new Error(failureReason || "Electron fallback print failed"));
            }
          );
        });
        printWindow.loadURL(pathToFileURL(tempFile).toString()).catch((loadError) => {
          printWindow.close();
          reject(loadError);
        });
      });

      return {
        status: "success",
        data: {
          mode: "system",
          printerName: systemPrinterName || null,
          fallback: true,
        },
      };
    } catch (fallbackError) {
      console.error("Fallback printing failed:", fallbackError.message);
      throw fallbackError;
    }
  } finally {
    try {
      await fs.unlink(tempFile);
      console.log("Temporary file cleaned up");
    } catch (cleanupError) {
      console.warn("Temp file cleanup failed:", cleanupError.message);
    }
  }
}

function readPackagedOnlineRuntimeConfig() {
  if (!app.isPackaged) return null;

  const candidates = [
    process.env.POS_ONLINE_RUNTIME_CONFIG,
    process.resourcesPath
      ? path.join(process.resourcesPath, onlineRuntimeConfigFile)
      : null,
    path.join(__dirname, onlineRuntimeConfigFile),
    path.join(process.cwd(), onlineRuntimeConfigFile),
  ].filter(Boolean);

  for (const configPath of candidates) {
    try {
      if (!fsSync.existsSync(configPath)) continue;
      const parsed = JSON.parse(fsSync.readFileSync(configPath, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined || value === null || value === "") continue;
        if (!process.env[key]) process.env[key] = String(value);
      }
      console.log(`[Electron] Loaded online runtime config: ${configPath}`);
      return configPath;
    } catch (error) {
      console.error(
        `[Electron] Failed to load online runtime config at ${configPath}:`,
        error.message
      );
    }
  }

  console.warn("[Electron] No packaged online runtime config found");
  return null;
}

function applyBundledOnlineDefaults() {
  process.env.ONLINE_API_HOST = process.env.ONLINE_API_HOST || "127.0.0.1";
  process.env.ONLINE_API_PORT = process.env.ONLINE_API_PORT || "4100";
  process.env.ONLINE_API_CORS_ORIGIN =
    process.env.ONLINE_API_CORS_ORIGIN || "*";

  const clientHost = process.env.POS_ONLINE_CLIENT_HOST || "127.0.0.1";
  const port = process.env.ONLINE_API_PORT;
  process.env.POS_ONLINE_API_URL =
    process.env.POS_ONLINE_API_URL || `http://${clientHost}:${port}/api`;
  process.env.POS_ONLINE_REALTIME_URL =
    process.env.POS_ONLINE_REALTIME_URL || `http://${clientHost}:${port}`;
}

function prepareBundledOnlineEnvironment() {
  if (!app.isPackaged) return;
  readPackagedOnlineRuntimeConfig();
  applyBundledOnlineDefaults();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOnlineBackendReady(timeoutMs = 30000) {
  const baseUrl = process.env.POS_ONLINE_API_URL || "http://127.0.0.1:4100/api";
  const readyUrl = `${baseUrl.replace(/\/$/, "")}/ready`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(readyUrl);
      if (response.ok) return true;
    } catch {
      // Retry until timeout; the server may still be binding or connecting Mongo.
    }
    await sleep(500);
  }

  return false;
}

async function startBundledOnlineBackend() {
  if (!app.isPackaged) return;
  if (bundledOnlineBackendStarted) return;

  prepareBundledOnlineEnvironment();

  if (await waitForOnlineBackendReady(1000)) {
    console.log("[Electron] Online backend already reachable");
    bundledOnlineBackendStarted = true;
    return;
  }

  const { startOnlineServer } = require("./src/online-server/runtime.cjs");
  await startOnlineServer();

  if (!(await waitForOnlineBackendReady(30000))) {
    throw new Error("Bundled online backend started but did not become ready");
  }

  bundledOnlineBackendStarted = true;
  console.log("[Electron] Bundled online backend ready");
}

async function stopBundledOnlineBackend() {
  if (!bundledOnlineBackendStarted) return;
  try {
    const { stopOnlineServer } = require("./src/online-server/runtime.cjs");
    await stopOnlineServer();
  } finally {
    bundledOnlineBackendStarted = false;
  }
}

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

// DISABLED: electron-reload was causing full app reloads on any file change.
// Vite HMR handles React hot-reload.
// If you need backend hot-reload, use nodemon or restart manually.
//
// try {
//   if (!app.isPackaged) {
//     require("electron-reload")(__dirname, {
//       awaitWriteFinish: true,
//       ignored: /node_modules|[\/\\]\.git|dist|dist-react|\.json|\.log/,
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
    cloud_sync: true,
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

  try {
    await printPdfBufferSilently(arrayBuffer);
  } catch (error) {
    console.error("Silent print failed:", error.message);
  }
});

ipcMain.handle("receipt-printer:get-config", async () => {
  const receiptConfig = getReceiptPrinterConfig();
  const networkHost = getThermalPrinterHost();
  let networkPort = null;

  try {
    networkPort = getThermalPrinterPort();
  } catch (error) {
    console.warn("[ReceiptPrinter] Invalid network printer config:", error.message);
  }

  return {
    status: "success",
    data: {
      ...receiptConfig,
      networkHost: networkHost || null,
      networkPort,
    },
  };
});

ipcMain.handle("receipt-printer:list", async () => {
  try {
    const [printers, defaultPrinter] = await Promise.all([
      printer.getPrinters(),
      printer.getDefaultPrinter().catch(() => null),
    ]);

    return {
      status: "success",
      data: {
        printers,
        defaultPrinter,
      },
    };
  } catch (error) {
    console.error("[ReceiptPrinter] Failed to list printers:", error.message);
    return {
      status: "error",
      message: error.message || "Failed to list printers",
    };
  }
});

ipcMain.handle("receipt-printer:print-pdf", async (event, payload = {}) => {
  try {
    const data = payload.data || payload.pdfData;
    const result = await printPdfBufferSilently(data, payload);
    return result;
  } catch (error) {
    console.error("[ReceiptPrinter] System print failed:", error.message);
    return {
      status: "error",
      message: error.message || "System receipt print failed",
    };
  }
});

ipcMain.handle("thermal:print-receipt", async (event, payload = {}) => {
  try {
    const buffer = normalizePrintBuffer(payload.data);
    if (!buffer || buffer.length === 0) {
      throw new Error("Thermal print payload is empty");
    }

    const target = await resolveThermalPrinterTarget(payload);
    const timeoutMs = Number(payload.timeoutMs || 8000);
    await writeToThermalPrinter(buffer, target, timeoutMs);

    console.log(
      `[ThermalPrint] Receipt sent to ${target.host}:${target.port} (${buffer.length} bytes)`
    );
    return {
      status: "success",
      data: {
        host: target.host,
        port: target.port,
        discovered: target.discovered,
        cached: target.cached,
        bytes: buffer.length,
      },
    };
  } catch (error) {
    console.error("[ThermalPrint] Receipt print failed:", error.message);
    return {
      status: "error",
      message: error.message || "Thermal receipt print failed",
    };
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

ipcMain.handle("updates:get-version", () => {
  return { status: "success", data: { currentVersion: app.getVersion() } };
});

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

  prepareBundledOnlineEnvironment();

  // Now initialize the online-only Electron bridge (user sees splash during this)
  console.log("[Electron] Starting online-only backend bridge initialization...");
  const backendResult = getBackend().initializeBackend(defaultFolderPath);
  if (backendResult.success) {
    console.log("[Electron] Backend bridge initialized");
  } else {
    console.error("[Electron] Backend bridge initialization failed:", backendResult.message);
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

  if (app.isPackaged) {
    console.log("[Electron] Starting bundled online backend...");
    try {
      await startBundledOnlineBackend();
    } catch (error) {
      console.error(
        "[Electron] Bundled online backend failed to start:",
        error && error.stack ? error.stack : error
      );
    }
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
    // Auto-check for updates in background after app loads (packaged only)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log("[AutoUpdater] Background check failed:", err.message);
      });
    }, 5000);
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
  stopBundledOnlineBackend().catch((error) => {
    console.error("[Electron] Failed to stop bundled online backend:", error);
  });
});
