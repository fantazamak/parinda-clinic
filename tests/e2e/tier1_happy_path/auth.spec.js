const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { SettingsPage } = require('../pages/SettingsPage');

test.describe('Auth Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload();
  });

  test('TC-AUTH-01: Admin login with default credentials', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await expect(dashboardPage.navDashboard).toBeVisible();
    await expect(loginPage.loginContainer).not.toBeVisible();

    const dbState = db.read();
    expect(dbState.settings.username).toBe('admin');
  });

  test('TC-AUTH-02: Logout terminates session', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await expect(dashboardPage.navDashboard).toBeVisible();

    await dashboardPage.logout();
    await expect(loginPage.loginContainer).toBeVisible();
    await expect(dashboardPage.navDashboard).not.toBeVisible();
  });

  test('TC-AUTH-03: Session persists on page reload/refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await expect(dashboardPage.navDashboard).toBeVisible();

    await page.reload();
    await expect(dashboardPage.navDashboard).toBeVisible();
    await expect(loginPage.loginContainer).not.toBeVisible();
  });

  test('TC-AUTH-04: Navigation items are visible based on logged-in state', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await expect(dashboardPage.navDashboard).not.toBeVisible();
    await expect(dashboardPage.navPatients).not.toBeVisible();

    await loginPage.login('admin', 'med1234');

    await expect(dashboardPage.navDashboard).toBeVisible();
    await expect(dashboardPage.navPatients).toBeVisible();
    await expect(dashboardPage.navInventory).toBeVisible();
    await expect(dashboardPage.navPos).toBeVisible();
    await expect(dashboardPage.navSettings).toBeVisible();
    await expect(dashboardPage.navLogout).toBeVisible();
  });

  test('TC-AUTH-05: Login updates credentials successfully', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const settingsPage = new SettingsPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToSettings();
    await settingsPage.updateCredentials('newadmin', 'newpass123');

    // Assert DB state directly
    let dbState = db.read();
    expect(dbState.settings.username).toBe('newadmin');
    expect(dbState.settings.password).toBe('newpass123');

    await dashboardPage.logout();

    // Try logging in with old credentials (should fail)
    await loginPage.login('admin', 'med1234');
    await expect(loginPage.errorMessage).toBeVisible();

    // Log in with new credentials (should succeed)
    await loginPage.login('newadmin', 'newpass123');
    await expect(dashboardPage.navDashboard).toBeVisible();
  });
});
