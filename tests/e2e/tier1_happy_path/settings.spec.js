const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { SettingsPage } = require('../pages/SettingsPage');

test.describe('Settings Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToSettings();
  });

  test('TC-SET-01: Switch theme to Clinic Green', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.switchTheme('clinic-green');

    // Verify DB update
    const dbState = db.read();
    expect(dbState.settings.theme).toBe('clinic-green');

    // Verify applied theme class/data-theme
    const theme = await settingsPage.getActiveTheme();
    expect(theme).toBe('clinic-green');
  });

  test('TC-SET-02: Switch theme to Soft Blue', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.switchTheme('soft-blue');

    const dbState = db.read();
    expect(dbState.settings.theme).toBe('soft-blue');

    const theme = await settingsPage.getActiveTheme();
    expect(theme).toBe('soft-blue');
  });

  test('TC-SET-03: Switch theme to Dark Mode', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    // Depending on DB value, 'dark' or 'dark-mode'
    await settingsPage.switchTheme('dark');

    const dbState = db.read();
    expect(dbState.settings.theme).toBe('dark');

    const theme = await settingsPage.getActiveTheme();
    expect(theme).toBe('dark');
  });

  test('TC-SET-04: Switch theme to Warm Pink/Purple', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.switchTheme('warm-pink');

    const dbState = db.read();
    expect(dbState.settings.theme).toBe('warm-pink');

    const theme = await settingsPage.getActiveTheme();
    expect(theme).toBe('warm-pink');
  });

  test('TC-SET-05: Configure clinic header details (Name, Address, Tel, default practitioner)', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    // Update clinic info via POM
    await settingsPage.updateClinicInfo('New Clinic Name', 'New Header Info');

    // Wait and verify DB
    const dbState = db.read();
    expect(dbState.settings.clinicName).toBe('New Clinic Name');
    expect(dbState.settings.clinicHeader).toBe('New Header Info');
  });
});
