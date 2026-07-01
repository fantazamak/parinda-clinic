const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');
const { generatePatientVisitPdf, generatePatientVisitPdfBuffer } = require('./src/pdf');

const dbPath = process.env.CLINIC_DB_PATH || process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');

const defaultSettings = {
  username: "admin",
  clinicName: "Parinda Clinic",
  clinicHeader: "123 Main St, Bangkok",
  clinicAddress: "123 Main St, Bangkok",
  clinicTel: "02-123-4567",
  defaultPractitioner: "Dr. Parinda",
  theme: "clinic-green"
};
const defaultPassword = 'med1234';

function createPasswordRecord(password) {
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, passwordSalt, 64).toString('hex');
  return { passwordSalt, passwordHash };
}

function verifyPassword(password, settings) {
  if (!settings || !settings.passwordSalt || !settings.passwordHash) return false;
  const candidate = crypto.scryptSync(password, settings.passwordSalt, 64);
  const stored = Buffer.from(settings.passwordHash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function createInitialSettings() {
  return { ...defaultSettings, ...createPasswordRecord(defaultPassword) };
}

function publicSettings(settings) {
  const { password, passwordHash, passwordSalt, ...safeSettings } = settings || {};
  return safeSettings;
}

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
    const initialDb = { settings: createInitialSettings() };
    writeDb(initialDb);
    return initialDb.settings;
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
    db.settings = createInitialSettings();
    writeDb(db);
    return db.settings;
  }

  // Ensure all fields from defaultSettings exist in settings
  for (const key in defaultSettings) {
    if (settings[key] === undefined) {
      settings[key] = defaultSettings[key];
      needWrite = true;
    }
  }

  if (!settings.passwordHash || !settings.passwordSalt) {
    const legacyPassword = settings.password || defaultPassword;
    Object.assign(settings, createPasswordRecord(legacyPassword));
    delete settings.password;
    needWrite = true;
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

function saveSettings(newSettings, options = {}) {
  let db = readDb();
  if (!db) {
    db = {};
  }
  const existing = getSettings();
  db = readDb() || db;
  const { username, password, passwordHash, passwordSalt, ...safeSettings } = newSettings || {};
  db.settings = {
    ...existing,
    ...safeSettings,
    username: options.allowUsername ? username : existing.username,
    passwordHash: existing.passwordHash,
    passwordSalt: existing.passwordSalt
  };
  delete db.settings.password;
  return writeDb(db);
}

function buildPdfPayload(visitData) {
  const settings = getSettings();
  const db = readDb() || {};
  const products = db.products || [];
  const prescriptions = (visitData.prescriptions || []).map(item => {
    const product = products.find(entry => entry.id === item.productId);
    const price = product ? product.price : item.price || 0;
    const quantity = Number(item.quantity || 0);
    return {
      name: product ? product.name : item.productId,
      quantity,
      unit: product ? product.unit : 'unit',
      price,
      total: price * quantity,
      instructions: String(item.instructions || '')
    };
  });

  return {
    settings,
    patient: visitData.patient,
    vitals: visitData.vitals,
    symptoms: visitData.symptoms,
    presentIllness: visitData.presentIllness,
    pastHistory: visitData.pastHistory,
    regularMedication: visitData.regularMedication,
    pe: visitData.pe,
    diagnosis: visitData.diagnosis,
    prescriptions,
    treatment: visitData.treatment,
    advice: visitData.advice,
    visitDate: visitData.visitDate,
    visitTime: visitData.visitTime
  };
}

function openPdfPreview(buffer, settings) {
  const previewWindow = new BrowserWindow({
    width: 980,
    height: 860,
    minWidth: 680,
    minHeight: 560,
    title: settings.lang === 'th' ? 'ตัวอย่างเอกสาร PDF' : 'PDF Preview',
    autoHideMenuBar: true,
    backgroundColor: settings.theme === 'dark' || settings.theme === 'dark-mode' ? '#0f172a' : '#e8eef1',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'ui', 'pdf-preview-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  previewWindow.setMenu(null);
  previewWindow.loadFile(path.join(__dirname, 'src', 'ui', 'pdf-preview.html'), {
    query: { lang: settings.lang || 'th', theme: settings.theme || 'clinic-green' }
  });
  previewWindow.webContents.once('did-finish-load', () => {
    previewWindow.webContents.send('pdf-preview-data', new Uint8Array(buffer));
  });
}

let mainWindow;
let manualUpdateCheck = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

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
    const isPdfPreview = details.url && /\.pdf(?:[?#]|$)/i.test(details.url);
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
    return publicSettings(getSettings());
  });

  ipcMain.handle('settings-save', (event, newSettings) => {
    return saveSettings(newSettings);
  });

  ipcMain.handle('auth-login', (event, credentials) => {
    const settings = getSettings();
    const username = String(credentials?.username || '').trim();
    const password = String(credentials?.password || '');
    return username === settings.username && verifyPassword(password, settings);
  });

  ipcMain.handle('auth-change-username', (event, payload) => {
    const settings = getSettings();
    const username = String(payload?.username || '').trim();
    if (!username) return { success: false, error: 'USERNAME_REQUIRED' };
    if (!verifyPassword(String(payload?.currentPassword || ''), settings)) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }
    return saveSettings({ ...publicSettings(settings), username }, { allowUsername: true })
      ? { success: true }
      : { success: false, error: 'SAVE_FAILED' };
  });

  ipcMain.handle('auth-change-password', (event, payload) => {
    const settings = getSettings();
    const currentPassword = String(payload?.currentPassword || '');
    const newPassword = String(payload?.newPassword || '');
    if (!verifyPassword(currentPassword, settings)) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }
    if (newPassword.length < 6) return { success: false, error: 'PASSWORD_TOO_SHORT' };
    const db = readDb() || {};
    db.settings = { ...settings, ...createPasswordRecord(newPassword) };
    delete db.settings.password;
    return writeDb(db) ? { success: true } : { success: false, error: 'SAVE_FAILED' };
  });

  ipcMain.handle('app-version', () => app.getVersion());

  // Stubs for database integration
  ipcMain.handle('db-read', (event, modelName, query) => {
    console.log(`db-read for ${modelName}`, query);
    const db = readDb();
    if (!db) return [];
    return db[modelName] || [];
  });

  ipcMain.handle('db-write', (event, modelName, data) => {
    if (modelName === 'settings') return false;
    console.log(`db-write for ${modelName}`, data);
    let db = readDb() || {};
    db[modelName] = data;
    return writeDb(db);
  });

  ipcMain.handle('generate-pdf', async (event, visitData) => {
    try {
      const pdfPayload = buildPdfPayload(visitData);
      const settings = pdfPayload.settings;

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

  ipcMain.handle('preview-pdf', async (event, visitData) => {
    try {
      const pdfPayload = buildPdfPayload(visitData);
      const buffer = await generatePatientVisitPdfBuffer(pdfPayload);
      openPdfPreview(buffer, pdfPayload.settings);
      return { success: true };
    } catch (err) {
      console.error('Error previewing PDF:', err);
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

  // Auto updater config and IPC handlers
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-not-available', { ...info, manual: manualUpdateCheck });
    manualUpdateCheck = false;
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

  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) return { success: false, development: true };
    try {
      manualUpdateCheck = true;
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err) {
      manualUpdateCheck = false;
      return { success: false, error: err.message };
    }
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
    autoUpdater.checkForUpdates().catch(err => {
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
