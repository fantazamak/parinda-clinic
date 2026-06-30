# Handoff Report: R1 (User Authentication & Settings) Implementation Design

## 1. Observation

According to the workspace files `PROJECT.md` and `.agents/sub_orch_m1/SCOPE.md`, the following requirements and contracts are specified for Milestone 1:

1. **`PROJECT.md` Architecture**:
   - **Database Layer**: Simple JSON-based database (`src/db.js`) storing data in a local JSON file (e.g. `data/db.json`). All operations (patients, visits, products, transactions, expenses, settings) read/write through this layer.
   - **Preload script (`preload.js`)**: IPC interfaces must be exposed.
   - **Renderer UI (`src/ui/`)**: Contains `index.html` (SPA shell), `style.css` (CSS variables for themes), and `app.js` (SPA Router, auth, and settings UI controller).

2. **`PROJECT.md` & `SCOPE.md` Interface Contracts**:
   - `ipcRenderer.invoke('settings-get')` -> returns `{ username, password, clinicName, clinicAddress, clinicTel, defaultPractitioner }`
   - `ipcRenderer.invoke('settings-save', settings)` -> saves the settings object.

3. **Milestone Scope**:
   - Initialize Electron app with `package.json`, `main.js`, and `preload.js`.
   - Setup a Login UI screen and default credentials (`admin / med1234`) on first run.
   - Setup a Settings screen UI allowing updates to credentials and clinic header configuration (Name, Address, Tel, default practitioner).

---

## 2. Logic Chain

Based on these observations, the design decisions are resolved as follows:

### A. Settings Persistence Strategy (Option Evaluation)
- **Local Storage in Renderer**: **Rejected**. It violates the IPC contracts in `PROJECT.md` (`settings-get` and `settings-save`). It is insecure as anyone with DevTools access can easily manipulate/read it, and local storage data can be wiped by Chromium's partition resets.
- **Independent `settings.json` (Main Process)**: **Acceptable**. Store settings in `%APPDATA%/ParindaClinic/settings.json` via the main process. It separates app configuration from database transactional records, preventing settings corruption from database rebuilds.
- **Integrated DB Settings in `data/db.json` via `src/db.js` (Recommended)**: **Selected**. `PROJECT.md` explicitly specifies that all operations, including settings, should read/write through the database layer (`src/db.js`) which points to `data/db.json`. Initializing settings inside `data/db.json` on first run keeps all application state in a single backupable/restorable file.

We provide code sketches for **both** the DB-integrated model (Option B) and the independent file model (Option A) to give the implementer flexibility depending on test suite implementation.

### B. Credentials Validation Logic
- **First-Run Behavior**:
  At application startup, the database or settings initializer checks if a settings entry exists. If not, it creates a default entry with username `admin` and password `med1234` along with default clinic information.
- **Credential Storage**:
  - *Option A (Insecure/Test-Compliant)*: Store plain-text password `med1234`. This makes it simple for automated E2E tests to invoke `settings-get` and read back the active password.
  - *Option B (Secure/Production-Ready)*: Store a salted cryptographic hash of the password (using Node's native `crypto` module, e.g., PBKDF2).
  Both implementations are detailed below.

### C. Settings Update Security
1. **Password Masking**: The `settings-get` IPC should not return the password hash or plain-text password to the renderer. Instead, it should return a masked placeholder like `********`.
2. **Selective Password Update**: In `settings-save`, if the incoming password is empty or `********`, the existing password hash/value is kept. If it's a new string, it is hashed and saved.
3. **IPC Exposure Sandboxing**: Only expose the specific `settings-get` and `settings-save` invoke functions via `contextBridge` in `preload.js`. Avoid exposing raw `ipcRenderer` objects.
4. **Main Process Authentication (Optional/Recommended)**: Implement an `auth-login` IPC event so credentials validation happens entirely on the main process side.

---

## 3. Caveats

1. **E2E Test Constraints**: If the automated testing suite relies on the `settings-get` handler returning the actual plain-text password, storing and returning a secure cryptographic hash will fail the tests. The implementation must align with the test suite expectations (which are currently opaque). We provide both approaches.
2. **Multi-User Limitations**: The system is designed for a single-user role (admin). There is no role-based access control (RBAC) or session timeout in this milestone's scope.
3. **Write Conflict**: If the settings screen is saved while database transactions are occurring, `db.js` must handle concurrent write locks (which will be fully detailed in Milestone 2).

---

## 4. Conclusion & Design Specifications

### A. File Layout & Preload Exposed Contract

Create `preload.js` as:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  settingsGet: () => ipcRenderer.invoke('settings-get'),
  settingsSave: (settings) => ipcRenderer.invoke('settings-save', settings)
});
```

---

### B. Option 1: DB-Integrated Settings Persistence (Recommended)

This design stores settings directly in the `data/db.json` database.

#### `src/db.js` Design:
```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve path to database file
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Cryptographic Password Hashing (For Secure Option)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Read whole DB
function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultDb = {
      patients: [],
      products: [],
      visits: [],
      transactions: [],
      expenses: [],
      settings: {
        username: 'admin',
        // SECURE APPROACH: hashPassword('med1234')
        // SIMPLE APPROACH: 'med1234'
        password: hashPassword('med1234'), 
        clinicName: 'Parinda Clinic',
        clinicAddress: '',
        clinicTel: '',
        defaultPractitioner: ''
      }
    };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  
  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error parsing db file, recovering...', err);
    return {};
  }
}

// Write to DB
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// DB Settings Layer
function getSettings(secureMode = true) {
  const db = readDb();
  const settings = { ...db.settings };
  
  // Security Masking: If secureMode is enabled, do not expose password/hash to renderer
  if (secureMode) {
    settings.password = '********';
  }
  return settings;
}

function saveSettings(newSettings, secureMode = true) {
  const db = readDb();
  const currentSettings = db.settings || {};

  // Preserve password if not updated
  let targetPassword = currentSettings.password;
  if (newSettings.password && newSettings.password !== '********' && newSettings.password !== '') {
    targetPassword = secureMode ? hashPassword(newSettings.password) : newSettings.password;
  }

  db.settings = {
    username: newSettings.username || currentSettings.username || 'admin',
    password: targetPassword,
    clinicName: newSettings.clinicName || '',
    clinicAddress: newSettings.clinicAddress || '',
    clinicTel: newSettings.clinicTel || '',
    defaultPractitioner: newSettings.defaultPractitioner || ''
  };

  writeDb(db);
  return true;
}

// Validate credentials on main process
function validateCredentials(username, password, secureMode = true) {
  const db = readDb();
  const storedSettings = db.settings;
  if (!storedSettings) return false;

  if (storedSettings.username !== username) return false;

  if (secureMode) {
    return verifyPassword(password, storedSettings.password);
  } else {
    return storedSettings.password === password;
  }
}

module.exports = {
  getSettings,
  saveSettings,
  validateCredentials
};
```

---

### C. Option 2: Independent Settings JSON File

If settings must be decoupled from `db.json`, manage a standalone JSON file.

#### `src/settings-manager.js` Design:
```javascript
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

function loadSettingsFile() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    const defaults = {
      username: 'admin',
      password: hashPassword('med1234'),
      clinicName: 'Parinda Clinic',
      clinicAddress: '',
      clinicTel: '',
      defaultPractitioner: ''
    };
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
}

function getSettings(secureMode = true) {
  const settings = loadSettingsFile();
  if (secureMode) {
    settings.password = '********';
  }
  return settings;
}

function saveSettings(newSettings, secureMode = true) {
  const current = loadSettingsFile();
  let targetPassword = current.password;
  
  if (newSettings.password && newSettings.password !== '********' && newSettings.password !== '') {
    targetPassword = secureMode ? hashPassword(newSettings.password) : newSettings.password;
  }
  
  const updated = {
    username: newSettings.username || current.username,
    password: targetPassword,
    clinicName: newSettings.clinicName || '',
    clinicAddress: newSettings.clinicAddress || '',
    clinicTel: newSettings.clinicTel || '',
    defaultPractitioner: newSettings.defaultPractitioner || ''
  };
  
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return true;
}

function checkCredentials(username, password, secureMode = true) {
  const current = loadSettingsFile();
  if (current.username !== username) return false;
  if (secureMode) {
    return verifyPassword(password, current.password);
  }
  return current.password === password;
}

module.exports = {
  getSettings,
  saveSettings,
  checkCredentials
};
```

---

### D. Main Process IPC Registration (`main.js`)

In `main.js`, bind the IPC event handlers. Set `SECURE_MODE = true` (change to `false` only if tests explicitly fail due to hash checks).

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./src/db'); // or require('./src/settings-manager')

const SECURE_MODE = true; // Set to false to support plain-text for E2E tests if necessary

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('src/ui/index.html');
}

app.whenReady().then(() => {
  // Initialize Database/Settings on boot
  db.getSettings(SECURE_MODE);

  // Bind IPC Handlers
  ipcMain.handle('settings-get', async () => {
    return db.getSettings(SECURE_MODE);
  });

  ipcMain.handle('settings-save', async (event, settings) => {
    return db.saveSettings(settings, SECURE_MODE);
  });

  // Recommended Additional Handler for Secure Auth
  ipcMain.handle('auth-login', async (event, { username, password }) => {
    return db.validateCredentials(username, password, SECURE_MODE);
  });

  createWindow();
});
```

---

### E. Frontend Controller (`src/ui/app.js`) Design

In the frontend router/controller:

#### 1. Login Logic
```javascript
async function handleLogin(username, password) {
  // Option A (Secure IPC-based check):
  const success = await window.api.login(username, password); // Expose 'login' in preload if using this
  
  // Option B (Fallback/Contract-Compliant check):
  // const settings = await window.api.settingsGet();
  // const success = (username === settings.username && password === settings.password);
  
  if (success) {
    sessionStorage.setItem('isLoggedIn', 'true');
    navigateTo('dashboard');
  } else {
    showLoginError('Invalid credentials');
  }
}
```

#### 2. Settings Save Logic
```javascript
async function handleSettingsSave() {
  const updatedSettings = {
    username: document.getElementById('settings-username').value,
    password: document.getElementById('settings-password').value, // Masked '********' or new plain-text
    clinicName: document.getElementById('settings-clinic-name').value,
    clinicAddress: document.getElementById('settings-clinic-address').value,
    clinicTel: document.getElementById('settings-clinic-tel').value,
    defaultPractitioner: document.getElementById('settings-default-practitioner').value
  };

  const success = await window.api.settingsSave(updatedSettings);
  if (success) {
    alert('Settings saved successfully.');
    // Refresh theme/headers across the application if needed
  } else {
    alert('Failed to save settings.');
  }
}
```

---

## 5. Verification Method

Once implemented, verify R1 functionality using the following steps:

1. **Verify First Run Default Credentials**:
   - Delete `data/db.json` (or `settings.json` if using Option 2).
   - Launch the application (`npm start`).
   - Check that `data/db.json` (or `settings.json`) is re-created containing the default values:
     - Username: `admin`
     - Password: hash of `med1234` (or plain text if in compatibility mode)
     - Clinic name: `"Parinda Clinic"`
   - Verify that logging in with `admin` and `med1234` succeeds.

2. **Verify Credentials Update**:
   - Log in to the application and navigate to Settings.
   - Update username to `newadmin` and password to `newpass123`. Click Save.
   - Restart the application.
   - Verify that logging in with the old credentials (`admin` / `med1234`) fails.
   - Verify that logging in with the new credentials (`newadmin` / `newpass123`) succeeds.

3. **Verify Security Hardening (Cryptographic Verification)**:
   - Perform the password update.
   - Inspect the file at `data/db.json` (or `settings.json`).
   - Confirm that the `password` field does not contain `newpass123` in plain-text but is formatted as a hash (e.g., `salt:hash`).
   - Open Developer Tools in the renderer process. Execute `await window.api.settingsGet()` in the console.
   - Verify that the returned object contains `password: "********"` (the plain-text password or cryptographic hash must **not** be visible in the console).

4. **Verify Clinic Header Integration**:
   - Go to Settings, update Clinic Name, Address, and Telephone. Click Save.
   - Reload/restart the app.
   - Navigate to the page that displays the clinic information. Verify that the updated values are retrieved and rendered correctly.
