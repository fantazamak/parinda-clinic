class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login-submit-btn');
    this.errorMessage = page.locator('#login-error-msg');
    this.loginContainer = page.locator('#login-container');
  }

  /**
   * Performs the login sequence
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Returns whether the login container is visible
   */
  async isVisible() {
    return await this.loginContainer.isVisible();
  }

  /**
   * Returns the error message text
   */
  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}

module.exports = { LoginPage };
