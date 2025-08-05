const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require('axios');
const fs = require('fs').promises; // Use promise-based fs API
//const { pdf } = require("@react-pdf/renderer"); //
//const { error } = require("console");
//const pdf =  require('react-pdf'); // ES module compatible
//for hot reload npm package
//const electronReload = require('electron-reload')

const printer = require("pdf-to-printer");

let mainWindow;
let storedUser = null;
let isQuitting = false;


ipcMain.on("store-user-data", (event, userData) => {
  console.log("User data received in main process:", userData);
  storedUser = userData;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    titleBarOverlay: true,
    icon: path.join(__dirname, "src", '../assets/app_logo/app_logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  mainWindow.webContents.openDevTools();


  mainWindow.on("close", async (event) => {
    if (isQuitting) return;

    event.preventDefault();
    console.log("Window close triggered, handling logout...");

    if (storedUser && storedUser.email && storedUser.token) {
      try {
        await axios.post("https://posmasterv3-backend.onrender.com/api/users/logout", {
          email: storedUser.email,
          user_id: storedUser.token,
        });
        console.log("Logout successful");
      } catch (error) {
        console.error("Logout failed:", error.message);
      }
    } else {
      console.warn("No user data to logout");
    }

    isQuitting = true;
    app.quit(); // only call quit AFTER logout
  });


}

// ipcMain.on("store-user-data", async (event, { username, token }) => {
//   if (isQuitting) return;

//   console.log("Received user data for logout:", { username, token });

//   try {
//     await axios.post("https://posmasterv3-backend.onrender.com/api/users/logout", {
//       username,
//       token,
//     });
//     console.log("Logout successful from store-user-data event");
//   } catch (error) {
//     console.error("Logout failed from store-user-data event:", error.message);
//   }

//   isQuitting = true;
//   app.quit();
// });



ipcMain.on("print-silent", async (event, arrayBuffer) => {
  console.log("Silent print started");

  if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
    console.error("Invalid print data received");
    return;
  }

  const tempFile = path.join(app.getPath("temp"), `print-${Date.now()}.pdf`);

  try {
    // Convert ArrayBuffer to Node.js Buffer
    const pdfBuffer = Buffer.from(arrayBuffer);

    await fs.writeFile(tempFile, pdfBuffer);
    console.log("PDF saved to", tempFile);

    // Print using specialized module (most reliable)
    await printer.print(tempFile, { silent: true });
    console.log("Printed via pdf-to-printer");

  } catch (error) {
    console.error("Silent print failed:", error.message);

    // Fallback method using hidden window
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
    // Cleanup temporary file
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


