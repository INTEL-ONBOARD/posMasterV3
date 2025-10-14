const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Utility to create a Buffer from a given data string and encoding
  bufferFrom: (data, encoding = "base64") => Buffer.from(data, encoding),

  // General send and receive IPC methods
  send: (channel, data) => ipcRenderer.send(channel, data),
  sendPrintSilent: (arrayBuffer) =>
    ipcRenderer.send("print-silent", arrayBuffer),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },

  // User data-related methods
  sendUserData: (email, token) => {
    return ipcRenderer.invoke("store-user-data", { email, token });
  },
  onRequestUserData: (getUserDataFn) => {
    try {
      ipcRenderer.on("request-user-data", async () => {
        try {
          const user = await Promise.resolve(getUserDataFn());
          ipcRenderer.send("reply-user-data", user);
        } catch (e) {
          console.error("preload: onRequestUserData handler error", e);
          ipcRenderer.send("reply-user-data", null);
        }
      });
    } catch (e) {
      console.error("preload: onRequestUserData setup failed", e);
    }
  },

  // Folder selection and file creation
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // Create temp.json and config.json
  createFiles: (folderPath, outlet) =>
    ipcRenderer.invoke("create-files", { folderPath, outlet }),

  // Ensure sample.json (legacy feature)
  ensureSampleJson: (folderPath) =>
    ipcRenderer.invoke("ensure-json-created", folderPath),
});
