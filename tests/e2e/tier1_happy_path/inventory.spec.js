const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { InventoryPage } = require('../pages/InventoryPage');

test.describe('Inventory Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToInventory();
  });

  test('TC-INV-01: View inventory product catalog list', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    await expect(inventoryPage.productRows).toHaveCount(3);
    const data = await inventoryPage.getProductData('Paracetamol 500mg');
    expect(data.name).toBe('Paracetamol 500mg');
    expect(data.price).toBe(50);
    expect(data.stock).toBe(200);
    expect(data.minStockAlert).toBe(50);
  });

  test('TC-INV-02: Add new product with safety/alert thresholds', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);

    const newProd = {
      name: 'Vitamin C 500mg',
      price: 150,
      stock: 100,
      unit: 'tablet',
      minStockAlert: 20
    };

    await inventoryPage.addProduct(newProd);

    // Verify UI row added
    await expect(inventoryPage.productRows.filter({ hasText: 'Vitamin C 500mg' })).toBeVisible();
    const data = await inventoryPage.getProductData('Vitamin C 500mg');
    expect(data.name).toBe('Vitamin C 500mg');
    expect(data.price).toBe(150);
    expect(data.stock).toBe(100);
    expect(data.unit).toBe('tablet');
    expect(data.minStockAlert).toBe(20);

    // Verify DB state
    const dbState = db.read();
    const dbProd = dbState.products.find(p => p.name === 'Vitamin C 500mg');
    expect(dbProd).toBeDefined();
    expect(dbProd.price).toBe(150);
  });

  test('TC-INV-03: Update product price and details', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.editProduct('Amoxicillin 250mg', {
      price: 130,
      minStockAlert: 40
    });

    const data = await inventoryPage.getProductData('Amoxicillin 250mg');
    expect(data.price).toBe(130);
    expect(data.minStockAlert).toBe(40);

    // Verify DB state
    const dbState = db.read();
    const dbProd = dbState.products.find(p => p.id === 'prod-002');
    expect(dbProd.price).toBe(130);
    expect(dbProd.minStockAlert).toBe(40);
  });

  test('TC-INV-04: Restock product to increase quantity', async ({ page, db }) => {
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.restockProduct('Cough Syrup 60ml', 50);

    const data = await inventoryPage.getProductData('Cough Syrup 60ml');
    expect(data.stock).toBe(75); // 25 + 50

    // Verify DB state
    const dbState = db.read();
    const dbProd = dbState.products.find(p => p.id === 'prod-003');
    expect(dbProd.stock).toBe(75);
  });

  test('TC-INV-05: Search products in catalog by name/code', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.searchInput.fill('Amoxicillin');

    await expect(inventoryPage.productRows).toHaveCount(1);
    const data = await inventoryPage.getProductData('Amoxicillin 250mg');
    expect(data.name).toBe('Amoxicillin 250mg');
  });
});
