const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const axios = require("axios");
const fs = require("fs").promises;
const printer = require("pdf-to-printer");

// Load the version from package.json
const appVersion = require(path.join(__dirname, "package.json")).version;

let mainWindow;
let storedUser = null;
let isQuitting = false;

try {
  if (!app.isPackaged) {
    require("electron-reload")(__dirname, {
      awaitWriteFinish: true,
      ignored: /node_modules|[\/\\]\.git|dist|dist-react/,
    });
    console.log("electron-reload enabled");
  }
} catch (e) {
  console.log("electron-reload not available, skipping hot reload");
}

// IPC to open folder selector
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC to create temp.json and config.json
ipcMain.handle("create-files", async (event, { folderPath, outlet }) => {
  const tempFilePath = path.join(folderPath, "temp.json");
  const configFilePath = path.join(folderPath, "config.json");

  const currentDate = new Date().toISOString();

  // Define temp.json structure
  const tempContent = {
    version_no: appVersion,
    config_path: folderPath,
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
    temp_file_path: folderPath,
    config_path: folderPath,
    db_config_path: folderPath,
    outlet_setup: outlet,
    created_date: currentDate,
    updated_date: currentDate,
  };

  try {
    // Write temp.json
    await fs.writeFile(
      tempFilePath,
      JSON.stringify(tempContent, null, 2),
      "utf-8"
    );

    // Write config.json
    await fs.writeFile(
      configFilePath,
      JSON.stringify(configContent, null, 2),
      "utf-8"
    );

    return { success: true, tempFilePath, configFilePath };
  } catch (error) {
    console.error("Error creating files:", error);
    return { success: false, error: error.message };
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

async function createWindow() {
  const iconPath = path.join(__dirname, "src", "assets", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    titleBarOverlay: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.maximize();

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

app.whenReady().then(() => {
  createWindow();

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
