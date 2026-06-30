const { test: base, _electron: electron, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Target path to database and its backup
const dbPath = path.join(__dirname, '../../data/db.json');
const dbBackupPath = path.join(__dirname, '../../data/db.json.bak');

const testDbContent = {
  settings: {
    username: "admin",
    password: "med1234",
    clinicName: "Parinda Clinic",
    clinicAddress: "123 Main St, Bangkok",
    clinicTel: "02-123-4567",
    defaultPractitioner: "Dr. Parinda",
    theme: "clinic-green"
  }
};

// Custom test fixture that handles DB backup, restore and Electron launch
const test = base.extend({
  electronApp: async ({}, use) => {
    // 1. Back up database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, dbBackupPath);
    }
    
    // 2. Write test database content
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(testDbContent, null, 2), 'utf8');

    // 3. Launch Electron app
    const mainPath = path.resolve(__dirname, '../../main.js');
    const app = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
      }
    });

    await use(app);

    // 4. Close Electron app
    await app.close();

    // 5. Restore database
    if (fs.existsSync(dbBackupPath)) {
      fs.copyFileSync(dbBackupPath, dbPath);
      fs.unlinkSync(dbBackupPath);
    } else if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  },
  page: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await use(window);
  }
});

test.describe('SPA Integration & Settings Persistence Tests', () => {

  test('Verify Authentication, Theme Switching, Credentials Update, and Clinic Header Settings', async ({ page }) => {
    // --- 1. User authentication state tests ---
    // Assert login page is visible initially
    await expect(page.locator('#login-page')).toBeVisible();
    await expect(page.locator('#app-shell')).toBeHidden();

    // Try logging in with incorrect credentials
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill('wrongpassword');
    await page.locator('#login-form button[type="submit"]').click();

    // Verify error message is displayed
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-error')).toHaveText(/Invalid admin username or password/);
    await expect(page.locator('#app-shell')).toBeHidden();

    // Login with correct default credentials
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill('med1234');
    await page.locator('#login-form button[type="submit"]').click();

    // Verify login succeeds and dashboard is shown
    await expect(page.locator('#login-page')).toBeHidden();
    await expect(page.locator('#app-shell')).toBeVisible();

    // --- 2. Clinic UI headers verification (Default values) ---
    await expect(page.locator('#sidebar-clinic-name')).toHaveText('Parinda Clinic');
    await expect(page.locator('#header-clinic-details')).toHaveText('Address: 123 Main St, Bangkok | Tel: 02-123-4567');
    await expect(page.locator('#header-practitioner')).toHaveText('Practitioner: Dr. Parinda');

    // --- 3. Navigate to settings and verify settings form population ---
    await page.locator('a.nav-item[data-target="settings-page"]').click();
    await expect(page.locator('#settings-page')).toBeVisible();

    // Verify settings fields are filled with current settings
    await expect(page.locator('#settings-username')).toHaveValue('admin');
    await expect(page.locator('#settings-password')).toHaveValue('med1234');
    await expect(page.locator('#settings-clinic-name')).toHaveValue('Parinda Clinic');
    await expect(page.locator('#settings-clinic-address')).toHaveValue('123 Main St, Bangkok');
    await expect(page.locator('#settings-clinic-tel')).toHaveValue('02-123-4567');
    await expect(page.locator('#settings-practitioner')).toHaveValue('Dr. Parinda');
    await expect(page.locator('#settings-theme')).toHaveValue('clinic-green');

    // --- 4. Theme switching test ---
    // Change theme setting to soft-blue and save
    await page.locator('#settings-theme').selectOption('soft-blue');
    await page.locator('#settings-form button[type="submit"]').click();

    // Verify settings status message appears
    await expect(page.locator('#settings-status')).toBeVisible();
    await expect(page.locator('#settings-status')).toHaveText(/Settings saved successfully/);

    // Verify body class is updated instantly to contain theme-soft-blue
    const bodyClassList = await page.evaluate(() => Array.from(document.body.classList));
    expect(bodyClassList).toContain('theme-soft-blue');

    // --- 5. Credentials and Clinic Header Update persistence ---
    // Fill in new values
    await page.locator('#settings-username').fill('newadmin');
    await page.locator('#settings-password').fill('newpass123');
    await page.locator('#settings-clinic-name').fill('Parinda Clinic New');
    await page.locator('#settings-clinic-address').fill('456 New Road, Bangkok');
    await page.locator('#settings-clinic-tel').fill('098-765-4321');
    await page.locator('#settings-practitioner').fill('Dr. Somchai');
    
    // Save changes
    await page.locator('#settings-form button[type="submit"]').click();
    await expect(page.locator('#settings-status')).toBeVisible();
    await expect(page.locator('#settings-status')).toHaveText(/Settings saved successfully/);

    // Verify clinic header in the UI updates instantly
    await expect(page.locator('#sidebar-clinic-name')).toHaveText('Parinda Clinic New');
    await expect(page.locator('#header-clinic-details')).toHaveText('Address: 456 New Road, Bangkok | Tel: 098-765-4321');
    await expect(page.locator('#header-practitioner')).toHaveText('Practitioner: Dr. Somchai');

    // Verify data is saved in data/db.json on the filesystem
    // Since Electron's writeDb is synchronous on settings save, the file should be updated.
    // Let's read and parse data/db.json directly.
    const fileContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    expect(fileContent.settings.username).toBe('newadmin');
    expect(fileContent.settings.password).toBe('newpass123');
    expect(fileContent.settings.clinicName).toBe('Parinda Clinic New');
    expect(fileContent.settings.clinicAddress).toBe('456 New Road, Bangkok');
    expect(fileContent.settings.clinicTel).toBe('098-765-4321');
    expect(fileContent.settings.defaultPractitioner).toBe('Dr. Somchai');
    expect(fileContent.settings.theme).toBe('soft-blue');

    // --- 6. Log out and try logging in with old vs new credentials ---
    await page.locator('#logout-btn').click();
    await expect(page.locator('#login-page')).toBeVisible();
    await expect(page.locator('#app-shell')).toBeHidden();

    // Try logging in with OLD credentials
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill('med1234');
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#app-shell')).toBeHidden();

    // Log in with NEW credentials
    await page.locator('#login-username').fill('newadmin');
    await page.locator('#login-password').fill('newpass123');
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#login-page')).toBeHidden();
    await expect(page.locator('#app-shell')).toBeVisible();
  });
});
