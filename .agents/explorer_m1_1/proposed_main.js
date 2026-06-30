const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Paths for persistence
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Helper to load settings (or initialize defaults on first run)
function getSettings() {
  if (!fs.existsSync(settingsPath)) {
    const defaultSettings = {
      username: 'admin',
      password: 'med1234',
      clinicName: 'Parinda Clinic',
      clinicAddress: '123 Clinic Road, Bangkok, Thailand',
      clinicTel: '02-123-4567',
      defaultPractitioner: 'Dr. Parinda'
    };
    try {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write default settings:', err);
    }
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read settings, returning defaults:', err);
    return {
      username: 'admin',
      password: 'med1234',
      clinicName: 'Parinda Clinic',
      clinicAddress: '123 Clinic Road, Bangkok, Thailand',
      clinicTel: '02-123-4567',
      defaultPractitioner: 'Dr. Parinda'
    };
  }
}

// Helper to save settings
function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Load the SPA entry point
  mainWindow.loadFile(path.join(__dirname, 'src/ui/index.html'));

  // Security: Prevent external navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    console.warn(`Blocked external navigation attempt to: ${url}`);
  });

  // Security: Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`Blocked window open request for: ${url}`);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Security: Setup Permission Request Handler
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.warn(`Blocked permission request for: ${permission}`);
    callback(false); // Deny all permissions
  });

  // Security: Enforce Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
        ]
      }
    });
  });

  // Register IPC handlers
  ipcMain.handle('settings-get', async () => {
    return getSettings();
  });

  ipcMain.handle('settings-save', async (event, settings) => {
    return saveSettings(settings);
  });

  // Placeholder IPC handlers for db and pdf (will be implemented fully in later milestones)
  ipcMain.handle('db-read', async (event, modelName, query) => {
    console.log(`[IPC Placeholder] db-read model: ${modelName}, query:`, query);
    return [];
  });

  ipcMain.handle('db-write', async (event, modelName, data) => {
    console.log(`[IPC Placeholder] db-write model: ${modelName}, data:`, data);
    return { success: true };
  });

  ipcMain.handle('generate-pdf', async (event, visitData) => {
    console.log('[IPC Placeholder] generate-pdf data:', visitData);
    return { success: true, filePath: '' };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
