const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require('fs').promises; // Use promise-based fs API
//const { pdf } = require("@react-pdf/renderer");
//const { error } = require("console");
//const pdf =  require('react-pdf'); // ✅ ES module compatible

const printer = require("pdf-to-printer");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  mainWindow.webContents.openDevTools();
}

ipcMain.on("print-silent", async (event) => {
  console.log("print started");

  if (!mainWindow) return;

  const tempFile = path.join(app.getPath("temp"), `print-${Date.now()}.pdf`);

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
    });

    await fs.writeFile(tempFile, pdfData); // use promise version of fs

    console.log("PDF saved to", tempFile);
    await printer.print(tempFile,{
      silent:true
    });
    const printWindow = new BrowserWindow({ show: false });

    await printWindow.loadURL(`file://${tempFile}`); // ✅ use tempFile here

    printWindow.webContents.on("did-finish-load", () => {
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
      }, (success, errorType) => {
        if (!success) {
          console.error("Print failed:", errorType);
        } else {
          
          console.log("Printed successfully.");
        }
        printWindow.close();
      });
    });

  } catch (error) {
    console.error("Silent print failed:", error.message);
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

// const { Console } = require('console');
// //const { app, BrowserWindow } = require('electron');
// // const path = require('path');
// //silent print
// const { app, BrowserWindow, ipcMain } = require('electron');
// const path = require('path');
// const fs = require('fs');
// const os = require('os');

// function createWindow() {
//     const win = new BrowserWindow({
//         width: 1024,
//         height: 768,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.cjs'),
//             nodeIntegration: false,
//             contextIsolation: true,
//         }
//     });

//     win.loadFile(path.join(__dirname, 'dist', 'index.html'));
//     win.webContents.openDevTools();

// }

// app.whenReady().then(createWindow);

// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') app.quit();
// });

// // silent printing related code
// ipcMain.on('silent-print', (event, uint8Array) => {
//   const tempPath = path.join(os.tmpdir(), `print-${Date.now()}.pdf`);

//   // Convert Uint8Array to Buffer
//   const buffer = Buffer.from(uint8Array);

//   fs.writeFile(tempPath, buffer, (err) => {
//     if (err) {
//       console.error('Failed to write temp PDF:', err);
//       event.reply('print-error', 'Failed to create temporary file');
//       return;
//     }

//     const printWindow = new BrowserWindow({
//       show: false,
//       webPreferences: {
//         sandbox: true,
//         contextIsolation: true
//       }
//     });

//     printWindow.loadFile(tempPath);

//     printWindow.webContents.on('did-finish-load', () => {
//       printWindow.webContents.print({
//         silent: true,
//         printBackground: true,
//         deviceName: ''
//       }, (success, failureReason) => {
//         // Clean up
//         fs.unlink(tempPath, (unlinkErr) => {
//           if (unlinkErr) console.error('Temp file deletion failed:', unlinkErr);
//         });
//         printWindow.close();

//         if (!success) {
//           console.error('Print failed:', failureReason);
//           event.reply('print-error', failureReason);
//         } else {
//           event.reply('print-success');
//         }
//       });
//     });

//     printWindow.webContents.on('did-fail-load', (_, errorCode, errorDesc) => {
//       console.error('Failed to load PDF:', errorDesc);
//       event.reply('print-error', `Failed to load PDF: ${errorDesc}`);
//       printWindow.close();
//       fs.unlink(tempPath, () => {});
//     });
//   });
// });
