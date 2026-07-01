const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  settingsGet: () => ipcRenderer.invoke('settings-get'),
  settingsSave: (settings) => ipcRenderer.invoke('settings-save', settings),
  authLogin: (credentials) => ipcRenderer.invoke('auth-login', credentials),
  changeUsername: (payload) => ipcRenderer.invoke('auth-change-username', payload),
  changePassword: (payload) => ipcRenderer.invoke('auth-change-password', payload),
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  
  // Future compatibility stubs
  dbRead: (modelName, query) => ipcRenderer.invoke('db-read', modelName, query),
  dbWrite: (modelName, data) => ipcRenderer.invoke('db-write', modelName, data),
  generatePdf: (visitData) => ipcRenderer.invoke('generate-pdf', visitData),
  previewPdf: (visitData) => ipcRenderer.invoke('preview-pdf', visitData),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Auto Updater APIs
  onUpdateAvailable: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateNotAvailable: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on('update-not-available', listener);
    return () => ipcRenderer.removeListener('update-not-available', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (event, progressInfo) => callback(progressInfo);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (event, err) => callback(err);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
  startUpdateDownload: () => ipcRenderer.invoke('start-update-download'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  simulateUpdateCheck: () => ipcRenderer.invoke('simulate-update-check')
});
