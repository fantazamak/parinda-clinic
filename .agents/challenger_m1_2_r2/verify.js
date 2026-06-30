const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../..');
const mainPath = path.join(projectRoot, 'main.js');
const dbPath = path.join(projectRoot, 'data', 'db.json');
const backupPath = path.join(__dirname, 'db_backup.json');
const tempDbPath = path.join(__dirname, 'temp_db.json');
const styleCssPath = path.join(projectRoot, 'src', 'ui', 'style.css');

console.log('Project root:', projectRoot);
console.log('Main path:', mainPath);

async function run() {
  const results = {
    authDefault: { passed: false, details: '' },
    authUpdated: { passed: false, details: '' },
    themeSwitching: { passed: false, details: '' },
    cssRulesMatch: { passed: false, details: '' },
    credentialsPersistence: { passed: false, details: '' }
  };

  // 1. Back up original db.json
  if (fs.existsSync(dbPath)) {
    console.log('Backing up existing db.json...');
    fs.copyFileSync(dbPath, backupPath);
  } else {
    console.log('No existing db.json found.');
  }

  // Ensure fresh database for test (default credentials)
  const initialDb = {
    settings: {
      username: "admin",
      password: "med1234",
      clinicName: "Parinda Clinic",
      clinicAddress: "123 Main St, Bangkok",
      clinicTel: "02-123-4567",
      defaultPractitioner: "Dr. Parinda"
    }
  };
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), 'utf8');

  // Also write the same content to tempDbPath for sandboxed env test
  fs.writeFileSync(tempDbPath, JSON.stringify(initialDb, null, 2), 'utf8');

  let app;
  try {
    console.log('Launching Electron application with env...');
    app = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        DB_PATH: tempDbPath,
        CLINIC_DB_PATH: tempDbPath,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
      }
    });

    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    console.log('Window loaded. Page title:', await page.title());

    // --- TEST 1: User authentication state (Default Credentials) ---
    console.log('\n--- Test 1: Testing default credentials login ---');
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'med1234');
    await page.click('#login-form button[type="submit"]');

    // Wait for login transition
    await page.waitForTimeout(1000);
    const isAppShellVisible = await page.isVisible('#app-shell');
    const isLoginPageVisible = await page.isVisible('#login-page');

    if (isAppShellVisible && !isLoginPageVisible) {
      results.authDefault.passed = true;
      results.authDefault.details = 'Logged in successfully with admin/med1234. App shell is visible, login page is hidden.';
      console.log('PASS:', results.authDefault.details);
    } else {
      results.authDefault.passed = false;
      results.authDefault.details = `Failed to log in with default credentials. App shell visible: ${isAppShellVisible}, Login page visible: ${isLoginPageVisible}`;
      console.log('FAIL:', results.authDefault.details);
    }

    // --- TEST 2: Theme switching ---
    console.log('\n--- Test 2: Testing theme switching ---');
    // Navigate to Settings
    await page.click('a.nav-item[data-target="settings-page"]');
    await page.waitForTimeout(500);

    const themesToTest = ['clinic-green', 'soft-blue', 'dark-mode', 'warm-pink'];
    const themeResults = [];

    for (const theme of themesToTest) {
      console.log(`Switching theme to: ${theme}...`);
      
      // Select the theme in the select dropdown
      // Note: The UI options in HTML are 'clinic-green', 'soft-blue', 'dark', 'warm-pink'.
      // If we attempt to select 'dark-mode', it might fail if the option is 'dark'. Let's check:
      let optionValue = theme;
      if (theme === 'dark-mode') {
        optionValue = 'dark';
      }

      try {
        await page.selectOption('#settings-theme', optionValue);
        // Click Save Settings button
        await page.click('#settings-form button[type="submit"]');
        await page.waitForTimeout(500);

        // Check body attribute 'data-theme'
        const bodyDataTheme = await page.getAttribute('body', 'data-theme');
        const bodyClassList = await page.evaluate(() => Array.from(document.body.classList));

        console.log(`  - body data-theme: "${bodyDataTheme}"`);
        console.log(`  - body classList: [${bodyClassList.join(', ')}]`);

        if (bodyDataTheme === theme) {
          themeResults.push({ theme, status: 'pass', detail: `data-theme updated to "${theme}"` });
        } else {
          themeResults.push({ 
            theme, 
            status: 'fail', 
            detail: `data-theme expected "${theme}", got "${bodyDataTheme}". Classes on body: [${bodyClassList.join(', ')}]` 
          });
        }
      } catch (err) {
        themeResults.push({ theme, status: 'error', detail: err.message });
      }
    }

    const allThemesPassed = themeResults.every(r => r.status === 'pass');
    results.themeSwitching.passed = allThemesPassed;
    results.themeSwitching.details = themeResults.map(r => `${r.theme}: ${r.status} (${r.detail})`).join('; ');
    console.log(allThemesPassed ? 'PASS: Theme switching works as expected.' : 'FAIL: Theme switching issues found:', results.themeSwitching.details);

    // --- TEST 3: style.css contains matching rules ---
    console.log('\n--- Test 3: Checking style.css for matching data-theme rules ---');
    if (fs.existsSync(styleCssPath)) {
      const cssContent = fs.readFileSync(styleCssPath, 'utf8');
      const missingRules = [];
      for (const theme of themesToTest) {
        // e.g. [data-theme="clinic-green"] or body[data-theme="clinic-green"]
        const pattern = new RegExp(`\\[data-theme=["']?${theme}["']?\\]`, 'i');
        if (!pattern.test(cssContent)) {
          missingRules.push(theme);
        }
      }

      if (missingRules.length === 0) {
        results.cssRulesMatch.passed = true;
        results.cssRulesMatch.details = 'style.css contains rules matching data-theme for all tested themes.';
        console.log('PASS:', results.cssRulesMatch.details);
      } else {
        results.cssRulesMatch.passed = false;
        results.cssRulesMatch.details = `style.css is missing data-theme rules for: ${missingRules.join(', ')}`;
        console.log('FAIL:', results.cssRulesMatch.details);
      }
    } else {
      results.cssRulesMatch.passed = false;
      results.cssRulesMatch.details = 'style.css file does not exist.';
      console.log('FAIL:', results.cssRulesMatch.details);
    }

    // --- TEST 4: Credentials update (Updated Credentials work) ---
    console.log('\n--- Test 4: Testing credentials update and subsequent login ---');
    // We are already on the settings page. Let's fill the new username and password.
    await page.fill('#settings-username', 'newadmin');
    await page.fill('#settings-password', 'newpass123');
    await page.click('#settings-form button[type="submit"]');
    await page.waitForTimeout(1000);

    // Click logout
    console.log('Logging out...');
    await page.click('#logout-btn');
    await page.waitForTimeout(500);

    // Try logging in with OLD credentials (should fail)
    console.log('Attempting login with old credentials...');
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'med1234');
    await page.click('#login-form button[type="submit"]');
    await page.waitForTimeout(1000);

    const loginErrorVisible = await page.isVisible('#login-error');
    const isAppShellVisibleAfterOldLogin = await page.isVisible('#app-shell');
    console.log(`Old login - Error visible: ${loginErrorVisible}, App shell visible: ${isAppShellVisibleAfterOldLogin}`);

    // Try logging in with NEW credentials (should succeed)
    console.log('Attempting login with new credentials...');
    await page.fill('#login-username', 'newadmin');
    await page.fill('#login-password', 'newpass123');
    await page.click('#login-form button[type="submit"]');
    await page.waitForTimeout(1000);

    const isAppShellVisibleAfterNewLogin = await page.isVisible('#app-shell');
    const isLoginPageVisibleAfterNewLogin = await page.isVisible('#login-page');

    if (!isAppShellVisibleAfterOldLogin && isAppShellVisibleAfterNewLogin && !isLoginPageVisibleAfterNewLogin) {
      results.authUpdated.passed = true;
      results.authUpdated.details = 'Successfully verified that old credentials fail and updated credentials work.';
      console.log('PASS:', results.authUpdated.details);
    } else {
      results.authUpdated.passed = false;
      results.authUpdated.details = `Auth update check failed. App shell after old login: ${isAppShellVisibleAfterOldLogin}, App shell after new login: ${isAppShellVisibleAfterNewLogin}`;
      console.log('FAIL:', results.authUpdated.details);
    }

    // --- TEST 5: Credentials update persistence with process.env.CLINIC_DB_PATH or process.env.DB_PATH ---
    console.log('\n--- Test 5: Verifying DB path settings persistence ---');
    // Check if the tempDbPath (which was passed in env) contains the new settings,
    // or if the hardcoded project dbPath contains them.
    let tempDbData = null;
    let mainDbData = null;

    if (fs.existsSync(tempDbPath)) {
      try {
        tempDbData = JSON.parse(fs.readFileSync(tempDbPath, 'utf8'));
      } catch (e) {}
    }
    if (fs.existsSync(dbPath)) {
      try {
        mainDbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch (e) {}
    }

    console.log('Temp DB data (env path):', tempDbData ? tempDbData.settings : 'not found');
    console.log('Main DB data (hardcoded path):', mainDbData ? mainDbData.settings : 'not found');

    const savedInTemp = tempDbData && tempDbData.settings && tempDbData.settings.username === 'newadmin';
    const savedInMain = mainDbData && mainDbData.settings && mainDbData.settings.username === 'newadmin';

    if (savedInTemp && !savedInMain) {
      results.credentialsPersistence.passed = true;
      results.credentialsPersistence.details = 'Settings saved successfully to the path specified in process.env.CLINIC_DB_PATH/DB_PATH.';
      console.log('PASS:', results.credentialsPersistence.details);
    } else if (savedInMain) {
      results.credentialsPersistence.passed = false;
      results.credentialsPersistence.details = 'Settings were saved to the hardcoded data/db.json instead of the path in process.env.CLINIC_DB_PATH/DB_PATH.';
      console.log('FAIL:', results.credentialsPersistence.details);
    } else {
      results.credentialsPersistence.passed = false;
      results.credentialsPersistence.details = 'Settings were not found or saved to either database file.';
      console.log('FAIL:', results.credentialsPersistence.details);
    }

  } catch (err) {
    console.error('An error occurred during test execution:', err);
  } finally {
    if (app) {
      console.log('Closing Electron application...');
      await app.close();
    }

    // Clean up temp database
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }

    // Restore original db.json
    if (fs.existsSync(backupPath)) {
      console.log('Restoring original db.json...');
      fs.copyFileSync(backupPath, dbPath);
      fs.unlinkSync(backupPath);
    } else if (fs.existsSync(dbPath)) {
      console.log('Cleaning up test db.json...');
      fs.unlinkSync(dbPath);
    }
  }

  // Write test results to a JSON file in working directory for reporting
  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('\nVerification results written to:', reportPath);
}

run();
