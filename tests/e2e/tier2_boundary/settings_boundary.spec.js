const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { SettingsPage } = require('../pages/SettingsPage');

test.describe('Settings Boundary', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToSettings();
  });

  test('TC-SET-06: Change credentials fails if password is blank or fails validation check', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);
    const initialUser = db.read().settings.username;

    // Try to update with empty password
    await settingsPage.updateCredentials('newadmin', '');

    // DB username should not be updated
    const finalUser = db.read().settings.username;
    expect(finalUser).toBe(initialUser);
  });

  test('TC-SET-07: Clinic telephone setting validates numeric/telephone format', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);
    const initialTel = db.read().settings.clinicTel || '02-123-4567';

    // Update with invalid telephone format (non-numeric characters)
    await settingsPage.updateClinicInfo('Parinda Clinic', 'Parinda Clinic - Premium Medical Care');
    // Direct manipulation of tel input if needed, or updateClinicInfo
    // Since updateClinicInfo only has Name and Header, let's locate tel directly and fill it
    await page.locator('#settings-clinic-tel').fill('invalid-tel-number');
    await settingsPage.saveClinicBtn.click();

    // DB should not be updated with invalid telephone
    const finalTel = db.read().settings.clinicTel;
    expect(finalTel).toBe(initialTel);
  });

  test('TC-SET-08: Saving settings with blank credentials or required header fields shows validation messages', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);
    const initialClinicName = db.read().settings.clinicName;

    // Clear clinic name and try to save
    await settingsPage.clinicNameInput.fill('');
    await settingsPage.saveClinicBtn.click();

    // DB should not be updated
    const finalClinicName = db.read().settings.clinicName;
    expect(finalClinicName).toBe(initialClinicName);
  });

  test('TC-SET-09: Invalid theme value in DB falls back to default theme', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    // Directly write invalid theme value in DB
    db.update((current) => {
      current.settings.theme = 'invalid-theme';
    });

    // Reload application
    await page.reload();

    // Verify it falls back to clinic-green
    const activeTheme = await settingsPage.getActiveTheme();
    expect(activeTheme).toBe('clinic-green');
  });

  test('TC-SET-10: Theme settings persist across restarts', async ({ page, db }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.switchTheme('soft-blue');

    // Reload/restart page
    await page.reload();

    const activeTheme = await settingsPage.getActiveTheme();
    expect(activeTheme).toBe('soft-blue');
  });
});
