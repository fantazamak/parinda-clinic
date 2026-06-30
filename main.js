const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { generatePatientVisitPdf } = require('./src/pdf');

const dbPath = process.env.CLINIC_DB_PATH || process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');

const defaultSettings = {
  username: "admin",
  password: "med1234",
  clinicName: "Parinda Clinic",
  clinicHeader: "123 Main St, Bangkok",
  clinicAddress: "123 Main St, Bangkok",
  clinicTel: "02-123-4567",
  defaultPractitioner: "Dr. Parinda",
  theme: "clinic-green"
};

function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      return null;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    if (!data.trim()) {
      return null;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return null;
  }
}

function writeDb(data) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

function getSettings() {
  const db = readDb();
  if (!db) {
    // DB doesn't exist or is corrupted/empty, initialize with defaults
    const initialDb = { settings: { ...defaultSettings } };
    writeDb(initialDb);
    return { ...defaultSettings };
  }
  
  let settings;
  let needWrite = false;
  if (db.settings) {
    settings = db.settings;
  } else if (db.username) {
    // Compatibility fallback in case DB is just settings directly
    settings = {};
    for (const key in defaultSettings) {
      if (db[key] !== undefined) {
        settings[key] = db[key];
      }
    }
  } else {
    // DB exists but has no settings key, initialize settings key
    db.settings = { ...defaultSettings };
    writeDb(db);
    return { ...defaultSettings };
  }

  // Ensure all fields from defaultSettings exist in settings
  for (const key in defaultSettings) {
    if (settings[key] === undefined) {
      settings[key] = defaultSettings[key];
      needWrite = true;
    }
  }

  // If compatibility fallback was used, we need to restructure and save
  if (!db.settings && db.username) {
    db.settings = settings;
    // Remove old settings-related keys from root to clean up
    for (const key in defaultSettings) {
      delete db[key];
    }
    needWrite = true;
  }

  if (needWrite) {
    writeDb(db);
  }

  return settings;
}

function saveSettings(newSettings) {
  let db = readDb();
  if (!db) {
    db = {};
  }
  db.settings = newSettings;
  return writeDb(db);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const isTest = !!(process.env.CLINIC_DB_PATH || process.env.DB_PATH);
  if (isTest) {
    mainWindow.loadFile(path.join(__dirname, 'src', 'ui', 'index.html'), { query: { test: 'true' } });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'src', 'ui', 'index.html'));
  }
  
  // Security: Prevent external navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.includes('index.html')) {
      return;
    }
    event.preventDefault();
    console.warn(`Blocked external navigation attempt to: ${url}`);
  });

  // Security: Prevent external redirects
  mainWindow.webContents.on('will-redirect', (event, url) => {
    event.preventDefault();
    console.warn(`Blocked external redirect attempt to: ${url}`);
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

app.whenReady().then(() => {
  // Security: Setup Permission Request Handler
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.warn(`Blocked permission request for: ${permission}`);
    callback(false); // Deny all permissions
  });

  // Security: Enforce Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isPdfPreview = details.url && (details.url.startsWith('file://') || details.url.includes('.pdf'));
    const csp = isPdfPreview 
      ? 'default-src \'none\'; img-src \'self\' data:; style-src \'unsafe-inline\';'
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'";
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // Register IPC handlers
  ipcMain.handle('settings-get', () => {
    return getSettings();
  });

  ipcMain.handle('settings-save', (event, newSettings) => {
    return saveSettings(newSettings);
  });

  // Stubs for database integration
  ipcMain.handle('db-read', (event, modelName, query) => {
    console.log(`db-read for ${modelName}`, query);
    const db = readDb();
    if (!db) return [];
    return db[modelName] || [];
  });

  ipcMain.handle('db-write', (event, modelName, data) => {
    console.log(`db-write for ${modelName}`, data);
    let db = readDb() || {};
    db[modelName] = data;
    return writeDb(db);
  });

  ipcMain.handle('generate-pdf', async (event, visitData) => {
    console.log('generate-pdf for visitData', visitData);
    try {
      const settings = getSettings();
      const db = readDb() || {};
      const products = db.products || [];

      // Resolve prescriptions to display names, units, prices, and totals
      const resolvedPrescriptions = (visitData.prescriptions || []).map(p => {
        const prod = products.find(pr => pr.id === p.productId);
        const name = prod ? prod.name : p.productId;
        const unit = prod ? prod.unit : 'unit';
        const price = prod ? prod.price : p.price || 0;
        const quantity = p.quantity || 0;
        return {
          name,
          quantity,
          unit,
          price,
          total: price * quantity
        };
      });

      // Prepare payload for PDF generator
      const pdfPayload = {
        settings,
        patient: visitData.patient,
        vitals: visitData.vitals,
        symptoms: visitData.symptoms,
        presentIllness: visitData.presentIllness,
        pastHistory: visitData.pastHistory,
        regularMedication: visitData.regularMedication,
        pe: visitData.pe,
        diagnosis: visitData.diagnosis,
        prescriptions: resolvedPrescriptions,
        treatment: visitData.treatment,
        visitDate: visitData.visitDate,
        visitTime: visitData.visitTime
      };

      // Resolve output directory
      const outputDir = settings.outputPdfDir || path.join(__dirname, 'generated_pdfs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const hn = (visitData.patient && visitData.patient.hn) ? visitData.patient.hn : 'unknown';
      const fileName = `visit_${hn}_${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);

      await generatePatientVisitPdf(filePath, pdfPayload);
      console.log('PDF successfully generated at:', filePath);
      return { success: true, filePath };
    } catch (err) {
      console.error('Error generating PDF:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('open-pdf-preview', (event, pdfPath) => {
    const previewWindow = new BrowserWindow({
      width: 950,
      height: 850,
      title: "PDF Preview",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    previewWindow.setMenu(null);
    previewWindow.loadURL('file:///' + pdfPath.replace(/\\/g, '/'));
  });

  // Auto updater config and IPC handlers
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err ? err.message : 'Unknown error');
    }
  });

  ipcMain.handle('start-update-download', () => {
    autoUpdater.downloadUpdate();
    return true;
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
    return true;
  });

  ipcMain.handle('simulate-update-check', () => {
    if (!app.isPackaged) {
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.webContents.send('update-available', { version: '1.1.0', releaseNotes: 'ฟีเจอร์ใหม่สำหรับทดสอบระบบ Auto Update' });
        }
      }, 1000);
      return true;
    }
    return false;
  });

  createWindow();

  // Check for updates after window is created
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Error checking for updates:', err);
    });
  } else {
    console.log('Running in development mode: auto-updater is disabled.');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
