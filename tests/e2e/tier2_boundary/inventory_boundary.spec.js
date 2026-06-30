const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { InventoryPage } = require('../pages/InventoryPage');

test.describe('Inventory Boundary', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToInventory();
  });

  test('TC-INV-06: Add product with negative price', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);
    const initialCount = db.read().products.length;

    await inventoryPage.addProduct({
      name: 'Bad Price Item',
      price: -10,
      stock: 100,
      unit: 'tablet',
      minStockAlert: 10
    });

    const finalCount = db.read().products.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-INV-07: Add product with negative stock', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);
    const initialCount = db.read().products.length;

    await inventoryPage.addProduct({
      name: 'Bad Stock Item',
      price: 100,
      stock: -5,
      unit: 'tablet',
      minStockAlert: 10
    });

    const finalCount = db.read().products.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-INV-08: Add product with empty name', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);
    const initialCount = db.read().products.length;

    await inventoryPage.addProduct({
      name: '',
      price: 100,
      stock: 10,
      unit: 'tablet',
      minStockAlert: 10
    });

    const finalCount = db.read().products.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-INV-09: Add product with duplicate name/ID', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);
    const initialCount = db.read().products.length;

    // "Paracetamol 500mg" already exists
    await inventoryPage.addProduct({
      name: 'Paracetamol 500mg',
      price: 50,
      stock: 200,
      unit: 'tablet',
      minStockAlert: 50
    });

    const finalCount = db.read().products.length;
    expect(finalCount).toBe(initialCount); // Duplicate product should be blocked
  });

  test('TC-INV-10: Add product with negative min stock alert threshold', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);
    const initialCount = db.read().products.length;

    await inventoryPage.addProduct({
      name: 'Bad Alert Item',
      price: 100,
      stock: 100,
      unit: 'tablet',
      minStockAlert: -15
    });

    const finalCount = db.read().products.length;
    expect(finalCount).toBe(initialCount);
  });
});
