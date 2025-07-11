// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electron', {
//   ipcRenderer: {
//     send: (channel, data) => ipcRenderer.send(channel, data),
//   },
// });

// preload.cjs
// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   send: (channel, data) => ipcRenderer.send(channel, data)
// });

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  bufferFrom: (data, encoding = 'base64') => Buffer.from(data, encoding),
    send: (channel, data) => ipcRenderer.send(channel, data),
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
});