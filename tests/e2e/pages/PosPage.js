class PosPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Cart Inputs
    this.productSelect = page.locator('#pos-product-select');
    this.qtyInput = page.locator('#pos-qty-input');
    this.addToCartBtn = page.locator('#pos-add-to-cart-btn');

    // Cart Table
    this.cartRows = page.locator('#pos-cart-table-body tr');
    
    // Payment/Calculation Fields
    this.discountInput = page.locator('#pos-discount-input');
    this.totalPriceSpan = page.locator('#pos-total-price');
    this.cashInput = page.locator('#pos-cash-input');
    this.changeSpan = page.locator('#pos-change-span');

    // Action Buttons
    this.checkoutBtn = page.locator('#pos-checkout-btn');
    this.clearCartBtn = page.locator('#pos-clear-cart-btn');
  }

  /**
   * Adds a product item to the POS cart
   * @param {string} productNameOrId
   * @param {number} qty
   */
  async addItem(productNameOrId, qty) {
    await this.productSelect.selectOption({ label: productNameOrId });
    await this.qtyInput.fill(qty.toString());
    await this.addToCartBtn.click();
  }

  /**
   * Removes an item from the cart by its product name/label
   * @param {string} name
   */
  async removeItem(name) {
    const row = this.cartRows.filter({ hasText: name });
    await row.locator('.btn-remove-item').click();
  }

  /**
   * Applies discount to transaction
   * @param {number} discount
   */
  async applyDiscount(discount) {
    await this.discountInput.fill(discount.toString());
  }

  /**
   * Process and complete checkout
   * @param {number} cashReceived
   */
  async checkout(cashReceived) {
    await this.cashInput.fill(cashReceived.toString());
    await this.checkoutBtn.click();
  }

  async getTotalPrice() {
    return parseFloat(await this.totalPriceSpan.innerText() || '0');
  }

  async getChangeAmount() {
    return parseFloat(await this.changeSpan.innerText() || '0');
  }
}

module.exports = { PosPage };
