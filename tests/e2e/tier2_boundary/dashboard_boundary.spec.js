const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Dashboard Boundary', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('admin', 'med1234');
  });

  test('TC-DASH-06: Filter with start date after end date', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.filterByDateRange('2026-06-26', '2026-06-25');

    // Verification: Query is either blocked, shows warning, or handles safely without crash
    // We can verify the UI doesn't crash and we are still on the dashboard
    await expect(dashboardPage.incomeAmount).toBeVisible();
  });

  test('TC-DASH-07: Filter with empty date range inputs', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.startDateInput.fill('');
    await dashboardPage.endDateInput.fill('');
    await dashboardPage.applyFilterBtn.click();

    // Verification: Defaults to default or blocks, app is responsive
    await expect(dashboardPage.incomeAmount).toBeVisible();
  });

  test('TC-DASH-08: Add expense with zero amount validation', async ({ page, db }) => {
    const dashboardPage = new DashboardPage(page);

    const initialCount = db.read().expenses ? db.read().expenses.length : 0;

    await dashboardPage.addExpense(0, 'Medical Supplies', 'Zero amount');

    // DB should not be updated
    const finalCount = db.read().expenses ? db.read().expenses.length : 0;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-DASH-09: Add expense with negative amount validation', async ({ page, db }) => {
    const dashboardPage = new DashboardPage(page);

    const initialCount = db.read().expenses ? db.read().expenses.length : 0;

    await dashboardPage.addExpense(-100, 'Medical Supplies', 'Negative amount');

    // DB should not be updated
    const finalCount = db.read().expenses ? db.read().expenses.length : 0;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-DASH-10: Add expense with empty description/category validation', async ({ page, db }) => {
    const dashboardPage = new DashboardPage(page);

    const initialCount = db.read().expenses ? db.read().expenses.length : 0;

    // Use empty description
    await dashboardPage.expenseAmountInput.fill('100');
    await dashboardPage.expenseCategorySelect.selectOption('Medical Supplies');
    await dashboardPage.expenseDescInput.fill('');
    await dashboardPage.expenseSubmitBtn.click();

    // DB should not be updated
    const finalCount = db.read().expenses ? db.read().expenses.length : 0;
    expect(finalCount).toBe(initialCount);
  });
});
