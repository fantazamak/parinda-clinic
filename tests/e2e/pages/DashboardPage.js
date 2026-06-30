class DashboardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    
    // Navigation Tabs
    this.navDashboard = page.locator('#nav-dashboard');
    this.navPatients = page.locator('#nav-patients');
    this.navInventory = page.locator('#nav-inventory');
    this.navPos = page.locator('#nav-pos');
    this.navSettings = page.locator('#nav-settings');
    this.navLogout = page.locator('#nav-logout');

    // Date Filters
    this.startDateInput = page.locator('#dashboard-start-date');
    this.endDateInput = page.locator('#dashboard-end-date');
    this.applyFilterBtn = page.locator('#dashboard-apply-filter-btn');

    // KPI Cards
    this.incomeAmount = page.locator('#dashboard-kpi-income');
    this.expenseAmount = page.locator('#dashboard-kpi-expense');
    this.profitAmount = page.locator('#dashboard-kpi-profit');

    // Expense Form
    this.expenseAmountInput = page.locator('#expense-amount');
    this.expenseCategorySelect = page.locator('#tx-category-select');
    this.expenseDescInput = page.locator('#expense-desc');
    this.expenseSubmitBtn = page.locator('#expense-submit-btn');
    this.expenseList = page.locator('#dashboard-expense-list');
  }

  async goToPatients() {
    await this.navPatients.click();
  }

  async goToInventory() {
    await this.navInventory.click();
  }

  async goToPos() {
    await this.navPos.click();
  }

  async goToSettings() {
    await this.navSettings.click();
  }

  async logout() {
    await this.navLogout.click();
  }

  /**
   * Filter statistics by date range
   * @param {string} start 'YYYY-MM-DD'
   * @param {string} end 'YYYY-MM-DD'
   */
  async filterByDateRange(start, end) {
    await this.startDateInput.fill(start);
    await this.endDateInput.fill(end);
    await this.applyFilterBtn.click();
  }

  /**
   * Add a new expense transaction
   * @param {number} amount
   * @param {string} category
   * @param {string} description
   */
  async addExpense(amount, category, description) {
    await this.expenseAmountInput.fill(amount.toString());
    await this.expenseCategorySelect.selectOption(category);
    await this.expenseDescInput.fill(description);
    await this.expenseSubmitBtn.click();
  }

  async getIncome() {
    return parseFloat(await this.incomeAmount.innerText() || '0');
  }

  async getExpense() {
    return parseFloat(await this.expenseAmount.innerText() || '0');
  }

  async getProfit() {
    return parseFloat(await this.profitAmount.innerText() || '0');
  }
}

module.exports = { DashboardPage };
