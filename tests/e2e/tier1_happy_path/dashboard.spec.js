const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Dashboard Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('admin', 'med1234');
  });

  test('TC-DASH-01: View default dashboard metrics', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await expect(dashboardPage.incomeAmount).toBeVisible();
    await expect(dashboardPage.expenseAmount).toBeVisible();
    await expect(dashboardPage.profitAmount).toBeVisible();

    const income = await dashboardPage.getIncome();
    const expense = await dashboardPage.getExpense();
    const profit = await dashboardPage.getProfit();

    expect(income).toBe(500);
    expect(expense).toBe(1500);
    expect(profit).toBe(-1000);
  });

  test('TC-DASH-02: Filter metrics by valid date range', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Filter to only include 2026-06-25
    await dashboardPage.filterByDateRange('2026-06-25', '2026-06-25');

    const income = await dashboardPage.getIncome();
    const expense = await dashboardPage.getExpense();
    const profit = await dashboardPage.getProfit();

    expect(income).toBe(500);
    expect(expense).toBe(0);
    expect(profit).toBe(500);
  });

  test('TC-DASH-03: View list of recent transactions', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.expenseList).toBeVisible();
    const textContent = await dashboardPage.expenseList.innerText();
    expect(textContent).toContain('Clinic medical supplies restock');
  });

  test('TC-DASH-04: Add custom expense logs via UI', async ({ page, db }) => {
    const dashboardPage = new DashboardPage(page);

    const initialExpense = await dashboardPage.getExpense();

    await dashboardPage.addExpense(200, 'Medical Supplies', 'Extra gauze');

    // Wait or assert updated KPI
    await expect(async () => {
      const expense = await dashboardPage.getExpense();
      expect(expense).toBe(initialExpense + 200);
    }).toPass();

    // Verify DB update
    const dbState = db.read();
    const latestExpense = dbState.expenses[dbState.expenses.length - 1];
    expect(latestExpense.amount).toBe(200);
    expect(latestExpense.description).toBe('Extra gauze');
    expect(latestExpense.category).toBe('Medical Supplies');

    const latestTx = dbState.transactions[dbState.transactions.length - 1];
    expect(latestTx.amount).toBe(200);
    expect(latestTx.type).toBe('expense');
  });

  test('TC-DASH-05: Dashboard layout updates correctly', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Navigate away and back, and check layout elements
    await dashboardPage.goToPatients();
    await dashboardPage.goToPatients(); // Ensure we actually clicked
    await dashboardPage.navDashboard.click();

    await expect(dashboardPage.incomeAmount).toBeVisible();
    await expect(dashboardPage.expenseAmount).toBeVisible();
    await expect(dashboardPage.profitAmount).toBeVisible();
    await expect(dashboardPage.startDateInput).toBeVisible();
    await expect(dashboardPage.endDateInput).toBeVisible();
    await expect(dashboardPage.expenseAmountInput).toBeVisible();
  });
});
