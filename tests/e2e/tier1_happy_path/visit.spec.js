const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');
const { VisitFormPage } = require('../pages/VisitFormPage');
const fs = require('fs');
const path = require('path');

test.describe('Visits Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const patientsPage = new PatientsPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPatients();
    await patientsPage.startVisit('HN690001');
  });

  test('TC-VIS-01: Record vitals and verify auto BMI calculation', async ({ page }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.fillVitals({
      weight: 70,
      height: 175
    });

    const bmi = await visitFormPage.getBmi();
    expect(bmi).toBe('22.86');
  });

  test('TC-VIS-02: Search and link prescription products to a visit', async ({ page }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 10);

    // Verify row added in table
    await expect(visitFormPage.prescTableBody).toHaveCount(1);
    const totalPrice = await visitFormPage.getTotalPrice();
    expect(totalPrice).toBe(500); // 10 * 50 THB
  });

  test('TC-VIS-03: Complete visit and verify stock is deducted', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.fillVitals({
      bp: '120/80',
      hr: 72,
      temp: 36.5,
      weight: 70,
      height: 175
    });

    await visitFormPage.symptomsInput.fill('Headache');
    await visitFormPage.diagnosisInput.fill('Migraine');

    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 10);
    await visitFormPage.submitVisit();

    // Verify DB stock deduction
    const dbState = db.read();
    const product = dbState.products.find(p => p.id === 'prod-001');
    expect(product.stock).toBe(190); // 200 - 10
  });

  test('TC-VIS-04: Complete visit and verify income transaction is recorded', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.fillVitals({
      bp: '120/80',
      hr: 72,
      temp: 36.5,
      weight: 70,
      height: 175
    });

    await visitFormPage.symptomsInput.fill('Fever');
    await visitFormPage.diagnosisInput.fill('Influenza');

    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 10);
    await visitFormPage.submitVisit();

    // Verify DB transactions
    const dbState = db.read();
    const transaction = dbState.transactions.find(t => t.description.includes('HN690001') || t.description.includes('visit'));
    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('income');
    expect(transaction.amount).toBe(500);
  });

  test('TC-VIS-05: Export Standard Thai Clinical PDF document', async ({ page }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.fillVitals({
      bp: '120/80',
      hr: 72,
      temp: 36.5,
      weight: 70,
      height: 175
    });

    await visitFormPage.symptomsInput.fill('Fever');
    await visitFormPage.diagnosisInput.fill('Influenza');
    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 10);

    // PDF button should be enabled/clickable
    await expect(visitFormPage.printPdfBtn).toBeVisible();
    await visitFormPage.exportPdf();

    // The export finishes and triggers IPC generate-pdf which is mocked to return { success: true }
    // No error or crash should happen.
  });

  test('TC-VIS-06: Save treatment and additional advice as separate fields', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.symptomsInput.fill('เจ็บคอ');
    await visitFormPage.diagnosisInput.fill('คออักเสบ');
    await visitFormPage.treatmentInput.fill('ตรวจคอและให้ยาตามอาการ');
    await visitFormPage.adviceInput.fill('ดื่มน้ำอุ่นและพักผ่อนให้เพียงพอ');
    await visitFormPage.submitVisit();

    const savedVisit = db.read().visits.at(-1);
    expect(savedVisit.treatment).toBe('ตรวจคอและให้ยาตามอาการ');
    expect(savedVisit.advice).toBe('ดื่มน้ำอุ่นและพักผ่อนให้เพียงพอ');
  });

  test('TC-VIS-07: Save directions for each prescribed medication', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);
    await visitFormPage.symptomsInput.fill('มีไข้');
    await visitFormPage.diagnosisInput.fill('ไข้หวัด');
    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 10, 'ครั้งละ 1 เม็ด หลังอาหาร เมื่อมีไข้');
    await visitFormPage.submitVisit();

    const savedVisit = db.read().visits.at(-1);
    expect(savedVisit.prescriptions[0].instructions).toBe('ครั้งละ 1 เม็ด หลังอาหาร เมื่อมีไข้');
  });

  test('TC-VIS-08: Preview renders without saving a permanent PDF', async ({ page, electronApp }) => {
    const outputDir = path.join(__dirname, '../../../generated_pdfs');
    const before = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).length : 0;
    const windowCountBefore = (await electronApp.windows()).length;

    await page.locator('#visit-preview-pdf-btn').click();
    await expect.poll(async () => (await electronApp.windows()).length).toBe(windowCountBefore + 1);
    const preview = (await electronApp.windows()).at(-1);
    await preview.waitForLoadState('domcontentloaded');
    await expect(preview.locator('.pdf-page')).toHaveCount(1, { timeout: 15000 });
    const pixels = await preview.locator('.pdf-page').evaluate(canvas => {
      const context = canvas.getContext('2d');
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBlank = 0;
      for (let index = 0; index < data.length; index += 16) {
        if (data[index] < 250 || data[index + 1] < 250 || data[index + 2] < 250) nonBlank += 1;
      }
      return nonBlank;
    });
    expect(pixels).toBeGreaterThan(100);
    await preview.close();

    const after = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).length : 0;
    expect(after).toBe(before);
  });
});
