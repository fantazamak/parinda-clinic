const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');
const { VisitFormPage } = require('../pages/VisitFormPage');

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
});
