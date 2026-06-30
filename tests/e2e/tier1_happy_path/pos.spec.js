const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PosPage } = require('../pages/PosPage');

test.describe('POS Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPos();
  });

  test('TC-POS-01: Add item to cart and calculate subtotal', async ({ page }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 2);

    await expect(posPage.cartRows).toHaveCount(1);
    const total = await posPage.getTotalPrice();
    expect(total).toBe(240); // 2 * 120
  });

  test('TC-POS-02: Apply discount and verify correct total price', async ({ page }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 2);
    await posPage.applyDiscount(40);

    const total = await posPage.getTotalPrice();
    expect(total).toBe(200); // 240 - 40
  });

  test('TC-POS-03: Complete checkout with cash payment and check change calculation', async ({ page, db }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 2);
    await posPage.applyDiscount(40);
    await posPage.checkout(500);

    const change = await posPage.getChangeAmount();
    expect(change).toBe(300); // 500 - 200

    // Check DB stock update
    const dbState = db.read();
    const prod = dbState.products.find(p => p.id === 'prod-002');
    expect(prod.stock).toBe(148); // 150 - 2
  });

  test('TC-POS-04: Verify counter sale is logged in transactions (without patient linkage)', async ({ page, db }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 2);
    await posPage.applyDiscount(40);
    await posPage.checkout(500);

    // Verify DB transactions
    const dbState = db.read();
    const lastTx = dbState.transactions[dbState.transactions.length - 1];
    expect(lastTx).toBeDefined();
    expect(lastTx.type).toBe('income');
    expect(lastTx.amount).toBe(200);
    // Counter sale should not be linked to any patient HN or visit ID
    expect(lastTx.description).not.toContain('HN');
    expect(lastTx.description).not.toContain('visit');
  });

  test('TC-POS-05: Clear cart resets POS fields', async ({ page }) => {
    const posPage = new PosPage(page);

    await posPage.addItem('Amoxicillin 250mg', 2);
    await posPage.applyDiscount(40);
    await posPage.cashInput.fill('500');

    await posPage.clearCartBtn.click();

    await expect(posPage.cartRows).toHaveCount(0);
    const total = await posPage.getTotalPrice();
    expect(total).toBe(0);
    await expect(posPage.discountInput).toHaveValue('');
    await expect(posPage.cashInput).toHaveValue('');
  });
});
