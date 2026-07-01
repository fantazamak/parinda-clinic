const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pdfPreview', {
  onData: callback => {
    const listener = (event, bytes) => callback(bytes);
    ipcRenderer.once('pdf-preview-data', listener);
  }
});
