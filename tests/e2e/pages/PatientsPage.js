class PatientsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Search and Navigation
    this.searchInput = page.locator('#patient-search-input');
    this.searchBtn = page.locator('#patient-search-btn');
    this.registerPatientBtn = page.locator('#register-patient-btn');

    // Registration/Edit Modal or Form Fields
    this.formModal = page.locator('#patient-form-modal');
    this.hnInput = page.locator('#patient-hn-input'); // Usually read-only on edit or empty on registration
    this.nameInput = page.locator('#patient-name-input');
    this.dobInput = page.locator('#patient-dob-input');
    this.genderSelect = page.locator('#patient-gender-select');
    this.phoneInput = page.locator('#patient-phone-input');
    this.allergiesInput = page.locator('#patient-allergies-input');
    this.savePatientBtn = page.locator('#patient-save-btn');
    this.cancelPatientBtn = page.locator('#patient-cancel-btn');

    // Patient Grid/Table
    this.patientRows = page.locator('#patient-table-body tr');
  }

  /**
   * Search for a patient
   * @param {string} query
   */
  async searchPatient(query) {
    await this.searchInput.fill(query);
    await this.searchBtn.click();
  }

  /**
   * Open the registration form, fill details, and submit
   * @param {object} patient
   */
  async registerPatient(patient) {
    await this.registerPatientBtn.click();
    await this.nameInput.fill(patient.name);
    await this.dobInput.fill(patient.dob);
    await this.genderSelect.selectOption(patient.gender);
    await this.phoneInput.fill(patient.phone);
    await this.allergiesInput.fill(patient.allergies || 'None');
    await this.savePatientBtn.click();
  }

  /**
   * Open edit form for a patient by HN
   * @param {string} hn
   */
  async editPatient(hn, updatedFields) {
    const row = this.patientRows.filter({ hasText: hn });
    await row.locator('.btn-edit-patient').click();
    
    if (updatedFields.name) await this.nameInput.fill(updatedFields.name);
    if (updatedFields.dob) await this.dobInput.fill(updatedFields.dob);
    if (updatedFields.gender) await this.genderSelect.selectOption(updatedFields.gender);
    if (updatedFields.phone) await this.phoneInput.fill(updatedFields.phone);
    if (updatedFields.allergies) await this.allergiesInput.fill(updatedFields.allergies);
    
    await this.savePatientBtn.click();
  }

  /**
   * Starts a clinical visit for a patient by HN
   * @param {string} hn
   */
  async startVisit(hn) {
    const row = this.patientRows.filter({ hasText: hn });
    await row.locator('.btn-start-visit').click();
  }

  /**
   * Returns details of a patient from the table by HN
   * @param {string} hn
   */
  async getPatientData(hn) {
    const row = this.patientRows.filter({ hasText: hn });
    const cols = row.locator('td');
    return {
      hn: await cols.nth(0).innerText(),
      name: await cols.nth(1).innerText(),
      gender: await cols.nth(2).innerText(),
      phone: await cols.nth(3).innerText(),
      allergies: await cols.nth(4).innerText()
    };
  }
}

module.exports = { PatientsPage };
