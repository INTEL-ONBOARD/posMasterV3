
const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {

//   bufferFrom: (data, encoding = 'base64') => Buffer.from(data, encoding),
//     send: (channel, data) => ipcRenderer.send(channel, data),
//     receive: (channel, func) => {
//         ipcRenderer.on(channel, (event, ...args) => func(...args));
//     }
// });

contextBridge.exposeInMainWorld('electronAPI', {
  bufferFrom: (data, encoding = 'base64') => Buffer.from(data, encoding),
  send: (channel, data) => ipcRenderer.send(channel, data),
  sendPrintSilent: (arrayBuffer) => ipcRenderer.send('print-silent', arrayBuffer),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  sendUserData: (email, token) => ipcRenderer.send("store-user-data", { email, token }),


});