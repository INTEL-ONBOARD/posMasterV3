const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  bufferFrom: (data, encoding = 'base64') => Buffer.from(data, encoding),
  send: (channel, data) => ipcRenderer.send(channel, data),
  sendPrintSilent: (arrayBuffer) => ipcRenderer.send('print-silent', arrayBuffer),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  sendUserData: (email, token) => {
    return ipcRenderer.invoke('store-user-data', { email, token });
  },
  sendUserDataSync: (email, token) => {
    try {
      ipcRenderer.send('store-user-data', { email, token });
    } catch (e) {
      console.error('preload: sendUserDataSync failed', e);
    }
  },
  onRequestUserData: (getUserDataFn) => {
    try {
      ipcRenderer.on('request-user-data', async () => {
        try {
          const user = await Promise.resolve(getUserDataFn());
          ipcRenderer.send('reply-user-data', user);
        } catch (e) {
          console.error('preload: onRequestUserData handler error', e);
          ipcRenderer.send('reply-user-data', null);
        }
      });
    } catch (e) {
      console.error('preload: onRequestUserData setup failed', e);
    }
  }
});