const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PosPage } = require('../pages/PosPage');

test.describe('POS Boundary', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPos();
  });

  test('TC-POS-06: Checkout empty cart validation', async ({ page, db }) => {
    const posPage = new PosPage(page);
    const initialTxs = db.read().transactions.length;

    // Checkout with empty cart
    await posPage.checkout(100);

    const finalTxs = db.read().transactions.length;
    expect(finalTxs).toBe(initialTxs); // No transaction should be recorded
  });

  test('TC-POS-07: Checkout cash received less than total price validation', async ({ page, db }) => {
    const posPage = new PosPage(page);
    const initialTxs = db.read().transactions.length;

    await posPage.addItem('Amoxicillin 250mg', 1); // 120 THB
    await posPage.checkout(100); // Insufficient payment

    const finalTxs = db.read().transactions.length;
    expect(finalTxs).toBe(initialTxs);
  });

  test('TC-POS-08: Cash received negative value validation', async ({ page, db }) => {
    const posPage = new PosPage(page);
    const initialTxs = db.read().transactions.length;

    await posPage.addItem('Amoxicillin 250mg', 1); // 120 THB
    await posPage.checkout(-50); // Negative cash

    const finalTxs = db.read().transactions.length;
    expect(finalTxs).toBe(initialTxs);
  });

  test('TC-POS-09: Apply discount greater than total price validation', async ({ page, db }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 1); // 120 THB
    await posPage.applyDiscount(150); // Discount exceeds total

    const total = await posPage.getTotalPrice();
    // Total should be clamped to 0 or remain 120 if invalid
    expect(total === 0 || total === 120).toBe(true);
  });

  test('TC-POS-10: Apply negative discount validation', async ({ page }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 1); // 120 THB
    await posPage.applyDiscount(-20); // Negative discount

    const total = await posPage.getTotalPrice();
    // Total should remain 120 (discount ignored/blocked)
    expect(total).toBe(120);
  });
});
