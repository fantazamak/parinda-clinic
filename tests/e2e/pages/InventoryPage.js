class InventoryPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Actions
    this.addProductBtn = page.locator('#add-product-btn');
    
    // Product Form Fields
    this.productModal = page.locator('#product-form-modal');
    this.productIdInput = page.locator('#product-id-input'); // Optional/Readonly if auto-gen
    this.nameInput = page.locator('#product-name-input');
    this.priceInput = page.locator('#product-price-input');
    this.stockInput = page.locator('#product-stock-input');
    this.unitInput = page.locator('#product-unit-input');
    this.minStockAlertInput = page.locator('#product-min-stock-alert-input');
    this.saveProductBtn = page.locator('#product-save-btn');
    this.cancelProductBtn = page.locator('#product-cancel-btn');

    // Inventory Table & Search
    this.searchInput = page.locator('#inventory-search-input');
    this.productRows = page.locator('#inventory-table-body tr');
    
    // Stock Alert Locators
    this.stockAlertBadges = page.locator('.stock-alert-badge');
    this.alertRows = page.locator('tr.inventory-alert-row');
  }

  /**
   * Register or add a new product
   * @param {object} product
   */
  async addProduct(product) {
    await this.addProductBtn.click();
    await this.nameInput.fill(product.name);
    await this.priceInput.fill(product.price.toString());
    await this.stockInput.fill(product.stock.toString());
    if (product.unit) await this.unitInput.fill(product.unit);
    if (product.minStockAlert !== undefined) {
      await this.minStockAlertInput.fill(product.minStockAlert.toString());
    }
    await this.saveProductBtn.click();
  }

  /**
   * Edit an existing product
   * @param {string} productIdOrName
   * @param {object} updatedFields
   */
  async editProduct(productIdOrName, updatedFields) {
    const row = this.productRows.filter({ hasText: productIdOrName });
    await row.locator('.btn-edit-product').click();
    
    if (updatedFields.name) await this.nameInput.fill(updatedFields.name);
    if (updatedFields.price !== undefined) await this.priceInput.fill(updatedFields.price.toString());
    if (updatedFields.stock !== undefined) await this.stockInput.fill(updatedFields.stock.toString());
    if (updatedFields.unit) await this.unitInput.fill(updatedFields.unit);
    if (updatedFields.minStockAlert !== undefined) {
      await this.minStockAlertInput.fill(updatedFields.minStockAlert.toString());
    }
    
    await this.saveProductBtn.click();
  }

  /**
   * Fast restock from inventory table
   * @param {string} productIdOrName
   * @param {number} additionalStock
   */
  async restockProduct(productIdOrName, additionalStock) {
    const row = this.productRows.filter({ hasText: productIdOrName });
    await row.locator('.btn-restock-product').click();
    await this.page.locator('#restock-qty-input').fill(additionalStock.toString());
    await this.page.locator('#restock-confirm-btn').click();
  }

  /**
   * Get product detail from a table row
   * @param {string} productIdOrName
   */
  async getProductData(productIdOrName) {
    const row = this.productRows.filter({ hasText: productIdOrName });
    const cols = row.locator('td');
    const priceText = await cols.nth(2).innerText();
    const stockText = await cols.nth(3).innerText();
    const minStockText = await cols.nth(5).innerText();
    return {
      id: await cols.nth(0).innerText(),
      name: await cols.nth(1).innerText(),
      price: parseFloat(priceText.replace(/[^0-9.-]/g, '') || '0'),
      stock: parseInt(stockText.replace(/[^0-9-]/g, '') || '0'),
      unit: await cols.nth(4).innerText(),
      minStockAlert: parseInt(minStockText.replace(/[^0-9-]/g, '') || '0')
    };
  }

  /**
   * Returns how many stock alerts are active in the UI
   */
  async getAlertCount() {
    return await this.stockAlertBadges.count();
  }
}

module.exports = { InventoryPage };
