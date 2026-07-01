class VisitFormPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Header Details
    this.patientHnSpan = page.locator('#visit-patient-hn');
    this.patientNameSpan = page.locator('#visit-patient-name');

    // Vitals Section
    this.vitalsBpInput = page.locator('#vitals-bp');
    this.vitalsHrInput = page.locator('#vitals-hr');
    this.vitalsTempInput = page.locator('#vitals-temp');
    this.vitalsWeightInput = page.locator('#vitals-weight');
    this.vitalsHeightInput = page.locator('#vitals-height');
    this.vitalsBmiInput = page.locator('#vitals-bmi'); // Readonly field

    // Clinical Details
    this.symptomsInput = page.locator('#visit-symptoms');
    this.diagnosisInput = page.locator('#visit-diagnosis');
    this.treatmentInput = page.locator('#visit-treatment');
    this.adviceInput = page.locator('#visit-advice');

    // Prescriptions Section
    this.productSelect = page.locator('#presc-product-select');
    this.qtyInput = page.locator('#presc-qty-input');
    this.instructionsInput = page.locator('#presc-instructions-input');
    this.addPrescBtn = page.locator('#add-presc-item-btn');
    this.prescTableBody = page.locator('#presc-table-body tr');
    this.visitTotalPriceSpan = page.locator('#visit-total-price');

    // Action Buttons
    this.saveVisitBtn = page.locator('#visit-save-btn');
    this.printPdfBtn = page.locator('#visit-print-pdf-btn');
    this.cancelVisitBtn = page.locator('#visit-cancel-btn');
  }

  /**
   * Fills vitals information
   * @param {object} vitals
   */
  async fillVitals(vitals) {
    if (vitals.bp) await this.vitalsBpInput.fill(vitals.bp);
    if (vitals.hr) await this.vitalsHrInput.fill(vitals.hr.toString());
    if (vitals.temp) await this.vitalsTempInput.fill(vitals.temp.toString());
    if (vitals.weight) await this.vitalsWeightInput.fill(vitals.weight.toString());
    if (vitals.height) await this.vitalsHeightInput.fill(vitals.height.toString());
  }

  /**
   * Returns the current auto-calculated BMI value
   */
  async getBmi() {
    return await this.vitalsBmiInput.inputValue();
  }

  /**
   * Add a product prescription item
   * @param {string} productNameOrId
   * @param {number} qty
   */
  async addPrescriptionItem(productNameOrId, qty, instructions = '') {
    await this.productSelect.selectOption({ label: productNameOrId });
    await this.qtyInput.fill(qty.toString());
    await this.instructionsInput.fill(instructions);
    await this.addPrescBtn.click();
  }

  /**
   * Submits the clinical visit
   */
  async submitVisit() {
    await this.saveVisitBtn.click();
  }

  /**
   * Triggers standard Thai clinical document PDF export
   */
  async exportPdf() {
    // Playwright handles electron main downloads or file generation triggers
    await this.printPdfBtn.click();
  }

  async getTotalPrice() {
    return parseFloat(await this.visitTotalPriceSpan.innerText() || '0');
  }
}

module.exports = { VisitFormPage };
