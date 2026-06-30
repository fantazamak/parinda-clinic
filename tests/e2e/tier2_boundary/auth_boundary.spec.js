const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Auth Boundary', () => {
  test('TC-AUTH-06: Login with empty username', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login('', 'med1234');

    // Submit should be blocked or show error, login container remains visible
    await expect(loginPage.loginContainer).toBeVisible();
  });

  test('TC-AUTH-07: Login with empty password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login('admin', '');

    await expect(loginPage.loginContainer).toBeVisible();
  });

  test('TC-AUTH-08: Login with incorrect password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login('admin', 'wrong_pass');

    await expect(loginPage.loginContainer).toBeVisible();
    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Invalid');
  });

  test('TC-AUTH-09: Login with non-existent username', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login('unknown_user', 'med1234');

    await expect(loginPage.loginContainer).toBeVisible();
    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Invalid');
  });

  test('TC-AUTH-10: Special characters in credentials input validation', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Try SQL-injection like characters
    await loginPage.login("' OR '1'='1", "'; DROP TABLE settings; --");

    await expect(loginPage.loginContainer).toBeVisible();
    // Verify it doesn't crash the app and just rejects the credentials
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
