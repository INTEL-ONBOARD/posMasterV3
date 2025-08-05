
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
  // sendUserData: (email, token) => {
  //   console.log("preload: sending user data", { email, token }); // <-- debug log here
  //   ipcRenderer.send("store-user-data", { email, token });
  // },

  sendUserData: (email, _id) => ipcRenderer.invoke('store-user-data', { email, _id }),


});