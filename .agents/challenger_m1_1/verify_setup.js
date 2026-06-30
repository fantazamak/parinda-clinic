const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const MAIN_JS_PATH = path.join(PROJECT_ROOT, 'main.js');
const INDEX_HTML_PATH = path.join(PROJECT_ROOT, 'src', 'ui', 'index.html');
const STYLE_CSS_PATH = path.join(PROJECT_ROOT, 'src', 'ui', 'style.css');

function verifyPackageJson() {
  console.log('--- Verifying package.json ---');
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    throw new Error('package.json not found at ' + PACKAGE_JSON_PATH);
  }
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  
  const requiredFields = ['name', 'version', 'description', 'main', 'scripts'];
  for (const field of requiredFields) {
    if (!pkg[field]) {
      throw new Error(`package.json is missing required field: "${field}"`);
    }
  }
  
  if (!pkg.scripts.start) {
    throw new Error('package.json scripts must contain "start"');
  }
  if (!pkg.scripts.build) {
    throw new Error('package.json scripts must contain "build"');
  }
  
  // Verify electron-builder config
  if (!pkg.build) {
    throw new Error('package.json must contain "build" electron-builder configuration');
  }
  const build = pkg.build;
  if (!build.appId) {
    throw new Error('build config must contain "appId"');
  }
  if (!build.productName) {
    throw new Error('build config must contain "productName"');
  }
  if (!build.directories || build.directories.output !== 'dist') {
    throw new Error('build config directories.output must be "dist"');
  }
  if (!build.win || build.win.target !== 'dir') {
    throw new Error('build config win.target must be "dir"');
  }
  if (!build.files || !build.files.includes('main.js') || !build.files.includes('preload.js') || !build.files.includes('src/**/*')) {
    throw new Error('build config files must include main.js, preload.js, and src/**/*');
  }
  console.log('package.json is VALID.');
}

function verifyDatabaseSettings() {
  console.log('--- Verifying Database Settings Logic ---');
  if (!fs.existsSync(MAIN_JS_PATH)) {
    throw new Error('main.js not found at ' + MAIN_JS_PATH);
  }
  const mainJsContent = fs.readFileSync(MAIN_JS_PATH, 'utf8');
  
  const startIndex = mainJsContent.indexOf('const dbPath =');
  const endIndex = mainJsContent.indexOf('let mainWindow;');
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Could not locate database functions section in main.js');
  }
  
  let dbCode = mainJsContent.substring(startIndex, endIndex);
  
  // Setup temporary sandbox directory
  const tempDir = path.join(__dirname, 'sandbox_db_test');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Replace the original dbPath with our temp database path
  const targetDbFilePath = path.join(tempDir, 'db.json').replace(/\\/g, '\\\\');
  dbCode = dbCode.replace(
    /const dbPath = path\.join\(__dirname, 'data', 'db.json'\);/,
    `const dbPath = "${targetDbFilePath}";`
  );
  
  // Add path and fs imports, and module.exports
  dbCode = `const path = require('path');
const fs = require('fs');

` + dbCode + `
module.exports = {
  getSettings,
  saveSettings,
  readDb,
  writeDb,
  defaultSettings
};
`;
  
  const tempScriptPath = path.join(__dirname, 'temp_db_test.js');
  fs.writeFileSync(tempScriptPath, dbCode, 'utf8');
  
  try {
    const testDb = require('./temp_db_test.js');
    
    // 1. Initial State: db.json should not exist yet, and getSettings() should create it with defaults
    if (fs.existsSync(targetDbFilePath)) {
      fs.unlinkSync(targetDbFilePath);
    }
    
    console.log('Testing default settings initialization when DB does not exist...');
    const settings = testDb.getSettings();
    if (!settings) {
      throw new Error('getSettings() returned null/undefined on first init');
    }
    
    if (settings.username !== 'admin' || settings.password !== 'med1234') {
      throw new Error(`getSettings() returned incorrect default credentials: ${settings.username} / ${settings.password}`);
    }
    
    if (!fs.existsSync(targetDbFilePath)) {
      throw new Error('db.json was not created on getSettings() initialization');
    }
    
    const dbFileContent = JSON.parse(fs.readFileSync(targetDbFilePath, 'utf8'));
    if (!dbFileContent.settings || dbFileContent.settings.username !== 'admin' || dbFileContent.settings.password !== 'med1234') {
      throw new Error('db.json contains invalid contents after initialization');
    }
    console.log('Default credentials and settings initialization: PASSED.');
    
    // 2. Test compatibility fallbacks
    // Case A: DB exists but settings key is missing
    console.log('Testing fallback when DB exists but settings key is missing...');
    fs.writeFileSync(targetDbFilePath, JSON.stringify({ otherData: 'test' }, null, 2), 'utf8');
    const settingsFallback = testDb.getSettings();
    if (settingsFallback.username !== 'admin' || settingsFallback.password !== 'med1234') {
      throw new Error('getSettings() fallback failed when settings key is missing');
    }
    const dbFileContentFallback = JSON.parse(fs.readFileSync(targetDbFilePath, 'utf8'));
    if (!dbFileContentFallback.settings || dbFileContentFallback.settings.username !== 'admin') {
      throw new Error('db.json settings key was not backfilled');
    }
    console.log('Fallback settings key initialization verification: PASSED.');
    
    // Case B: Compatibility fallback where DB is just settings directly (e.g. db.username exists)
    console.log('Testing fallback when DB contains settings directly at root...');
    const directSettings = { username: 'directAdmin', password: 'directPassword' };
    fs.writeFileSync(targetDbFilePath, JSON.stringify(directSettings, null, 2), 'utf8');
    const settingsDirect = testDb.getSettings();
    if (settingsDirect.username !== 'directAdmin' || settingsDirect.password !== 'directPassword') {
      throw new Error(`getSettings() failed to parse root-level settings. Got: ${JSON.stringify(settingsDirect)}`);
    }
    console.log('Direct root-level settings parsing verification: PASSED.');

    // 3. Test writing/saving settings
    console.log('Testing saving settings...');
    const customSettings = {
      username: 'customAdmin',
      password: 'customPassword123',
      clinicName: 'Test Clinic',
      clinicAddress: '456 Test Rd',
      clinicTel: '081-999-9999',
      defaultPractitioner: 'Dr. Test'
    };
    
    const saveResult = testDb.saveSettings(customSettings);
    if (!saveResult) {
      throw new Error('saveSettings() returned false status');
    }
    
    const updatedSettings = testDb.getSettings();
    if (updatedSettings.username !== 'customAdmin' || updatedSettings.password !== 'customPassword123') {
      throw new Error('getSettings() did not return updated settings');
    }
    
    const updatedDbContent = JSON.parse(fs.readFileSync(targetDbFilePath, 'utf8'));
    if (!updatedDbContent.settings || updatedDbContent.settings.username !== 'customAdmin') {
      throw new Error('db.json does not reflect saved settings');
    }
    console.log('Save settings verification: PASSED.');
    
  } finally {
    // Cleanup
    if (fs.existsSync(tempScriptPath)) {
      try { fs.unlinkSync(tempScriptPath); } catch(e){}
    }
    if (fs.existsSync(targetDbFilePath)) {
      try { fs.unlinkSync(targetDbFilePath); } catch(e){}
    }
    if (fs.existsSync(tempDir)) {
      try { fs.rmdirSync(tempDir); } catch(e){}
    }
  }
  console.log('Database settings logic is VALID.');
}

function verifyIndexHtml() {
  console.log('--- Verifying src/ui/index.html SPA Pages ---');
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    throw new Error('index.html not found at ' + INDEX_HTML_PATH);
  }
  const htmlContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  
  const requiredPages = [
    { name: 'Login', pattern: /id=["']login-page["']/ },
    { name: 'Dashboard', pattern: /id=["']dashboard-page["']/ },
    { name: 'Patients', pattern: /id=["']patients-page["']/ },
    { name: 'Visit Form', pattern: /id=["']visit-form-page["']/ },
    { name: 'Inventory', pattern: /id=["']inventory-page["']/ },
    { name: 'POS', pattern: /id=["']pos-page["']/ },
    { name: 'Settings', pattern: /id=["']settings-page["']/ }
  ];
  
  for (const page of requiredPages) {
    if (!page.pattern.test(htmlContent)) {
      throw new Error(`Required SPA Page "${page.name}" is not declared as an element in index.html`);
    }
    console.log(`Page element "${page.name}" presence verified.`);
  }
  console.log('src/ui/index.html is VALID.');
}

function verifyStyleCss() {
  console.log('--- Verifying src/ui/style.css Custom Themes ---');
  if (!fs.existsSync(STYLE_CSS_PATH)) {
    throw new Error('style.css not found at ' + STYLE_CSS_PATH);
  }
  const cssContent = fs.readFileSync(STYLE_CSS_PATH, 'utf8');
  
  const themes = [
    { name: 'Clinic Green (Default in :root)', selector: /:root\s*\{[^}]*--primary-color:[^}]*\}/ },
    { name: 'Soft Blue', selector: /(body\.)?theme-soft-blue\s*\{[^}]*--primary-color:[^}]*\}/ },
    { name: 'Dark Mode', selector: /(body\.)?theme-dark\s*\{[^}]*--primary-color:[^}]*\}/ },
    { name: 'Warm Pink/Purple', selector: /(body\.)?theme-warm-pink\s*\{[^}]*--primary-color:[^}]*\}/ }
  ];
  
  for (const theme of themes) {
    if (!theme.selector.test(cssContent)) {
      throw new Error(`Theme "${theme.name}" custom CSS properties block is missing or does not define --primary-color`);
    }
    console.log(`Theme "${theme.name}" custom CSS properties presence verified.`);
  }
  console.log('src/ui/style.css is VALID.');
}

try {
  verifyPackageJson();
  verifyDatabaseSettings();
  verifyIndexHtml();
  verifyStyleCss();
  console.log('=======================================');
  console.log('All verification checks PASSED successfully!');
  console.log('=======================================');
} catch (err) {
  console.error('=======================================');
  console.error('VERIFICATION FAILED:');
  console.error(err.message);
  console.error('=======================================');
  process.exit(1);
}
