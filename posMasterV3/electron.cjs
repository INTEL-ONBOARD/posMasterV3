const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require('axios');
const fs = require('fs').promises;

const printer = require("pdf-to-printer");

let mainWindow;
let storedUser = null;
let isQuitting = false;





ipcMain.handle('store-user-data', async (event, userData) => {
  storedUser = userData;
  console.log('User data stored:', userData);
  return { success: true };
});

const performLogoutAndQuit = async () => {
  if (isQuitting) return;
  isQuitting = true;
  console.log('performLogoutAndQuit: starting logout sequence');

  if (!storedUser) {
    try {
      const userFromRenderer = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ipcMain.removeAllListeners('reply-user-data');
          resolve(null);
        }, 2000);

        ipcMain.once('reply-user-data', (event, user) => {
          clearTimeout(timeout);
          resolve(user);
        });

        try {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('request-user-data');
          }
        } catch (e) {
          console.error('Error sending request-user-data to renderer', e);
        }
      });

      if (userFromRenderer) {
        storedUser = userFromRenderer;
        console.log('performLogoutAndQuit: received user from renderer', storedUser);
      } else {
        console.warn('performLogoutAndQuit: no user reply from renderer');
      }
    } catch (e) {
      console.error('Error requesting user from renderer', e);
    }
  }

  if (storedUser && (storedUser.email || storedUser.username) && (storedUser._id || storedUser.token)) {
    try {
      const resp = await axios.post(
        'https://posmasterv3-backend.onrender.com/api/users/logout',
        {
          email: storedUser.email,
          user_id: storedUser._id,
          username: storedUser.username,
          token: storedUser.token,
        },
        { timeout: 5000 }
      );
      console.log('Logout successful', resp && resp.data ? resp.data : resp);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('logout-response', { ok: true, data: resp.data });
      }
    } catch (error) {
      const errMsg = error && error.response && error.response.data ? error.response.data : (error && error.message ? error.message : String(error));
      console.error('Logout failed:', errMsg);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('logout-response', { ok: false, error: errMsg });
      }
    }
  } else {
    console.warn('No user data to logout');
  }

  try {
    app.quit();
  } catch (e) {
    console.error('Error quitting app:', e && e.message ? e.message : String(e));
    process.exit(0);
  }
};

function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  mainWindow.webContents.openDevTools();

  mainWindow.on("close", async (event) => {
    if (isQuitting) return;
    event.preventDefault();
    console.log('Window close triggered, handling logout...');
    performLogoutAndQuit();
  });
}

ipcMain.on('perform-logout', async () => {
  console.log('IPC perform-logout received');
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
          printWindow.webContents.print({
            silent: true,
            printBackground: true,
          }, (success) => {
            printWindow.close();
            if (success) {
              console.log("Printed via fallback method");
            }
            resolve();
          });
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


