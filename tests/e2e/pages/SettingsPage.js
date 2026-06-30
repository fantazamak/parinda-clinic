class SettingsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Authentication Settings
    this.usernameInput = page.locator('#settings-username-input');
    this.passwordInput = page.locator('#settings-password-input');
    this.saveAuthBtn = page.locator('#settings-save-auth-btn');
    this.authSuccessMsg = page.locator('#settings-auth-success-msg');

    // Clinic Customization
    this.clinicNameInput = page.locator('#settings-clinic-name-input');
    this.clinicHeaderInput = page.locator('#settings-clinic-header-input');
    this.saveClinicBtn = page.locator('#settings-save-clinic-btn');
    this.clinicSuccessMsg = page.locator('#settings-clinic-success-msg');

    // Theme Customization
    this.themeSelect = page.locator('#settings-theme-select');
    this.saveThemeBtn = page.locator('#settings-save-theme-btn');
  }

  /**
   * Update admin login credentials
   * @param {string} username
   * @param {string} password
   */
  async updateCredentials(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.saveAuthBtn.click();
  }

  /**
   * Update clinical document letterhead
   * @param {string} name
   * @param {string} header
   */
  async updateClinicInfo(name, header) {
    await this.clinicNameInput.fill(name);
    await this.clinicHeaderInput.fill(header);
    await this.saveClinicBtn.click();
  }

  /**
   * Switch clinic application theme
   * @param {'clinic-green' | 'soft-blue' | 'dark-mode' | 'warm-pink'} themeName
   */
  async switchTheme(themeName) {
    await this.themeSelect.selectOption(themeName);
    if (await this.saveThemeBtn.isVisible()) {
      await this.saveThemeBtn.click();
    }
  }

  /**
   * Gets the active body class or style attributes to verify the theme is applied in real-time
   */
  async getActiveTheme() {
    return await this.page.locator('body').getAttribute('data-theme');
  }
}

module.exports = { SettingsPage };
