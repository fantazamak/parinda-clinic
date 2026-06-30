const { contextBridge, ipcRenderer } = require('electron');

// Whitelisted IPC channels that the renderer process is allowed to use
const ALLOWED_CHANNELS = [
  'db-read',
  'db-write',
  'generate-pdf',
  'settings-get',
  'settings-save'
];

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: async (channel, ...args) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      try {
        return await ipcRenderer.invoke(channel, ...args);
      } catch (error) {
        console.error(`Error in IPC invoke for channel "${channel}":`, error);
        throw error;
      }
    } else {
      const errorMsg = `Unauthorized IPC channel: ${channel}`;
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }
  }
});
