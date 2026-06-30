const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');
const { VisitFormPage } = require('../pages/VisitFormPage');

test.describe('Visit Boundary', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const patientsPage = new PatientsPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPatients();
    await patientsPage.startVisit('HN690001');
  });

  test('TC-VIS-06: Vitals BMI calculation with height = 0', async ({ page }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.fillVitals({
      weight: 70,
      height: 0
    });

    const bmi = await visitFormPage.getBmi();
    // Should be empty or 0.00 or N/A, avoiding crash
    expect(bmi === '' || bmi === '0.00' || bmi === '0' || bmi === 'N/A').toBe(true);
  });

  test('TC-VIS-07: Vitals BMI calculation with weight = 0', async ({ page }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.fillVitals({
      weight: 0,
      height: 175
    });

    const bmi = await visitFormPage.getBmi();
    expect(bmi === '' || bmi === '0.00' || bmi === '0').toBe(true);
  });

  test('TC-VIS-08: Negative weight/height values validation', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);
    const initialVisits = db.read().visits.length;

    await visitFormPage.fillVitals({
      weight: -70,
      height: -175
    });
    await visitFormPage.symptomsInput.fill('Fever');
    await visitFormPage.diagnosisInput.fill('Flu');
    await visitFormPage.submitVisit();

    // Check that DB is not updated (save blocked)
    const finalVisits = db.read().visits.length;
    expect(finalVisits).toBe(initialVisits);
  });

  test('TC-VIS-09: Record visit with empty symptoms/diagnosis validation', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);
    const initialVisits = db.read().visits.length;

    await visitFormPage.fillVitals({
      weight: 70,
      height: 175
    });
    // Leave symptoms & diagnosis empty
    await visitFormPage.symptomsInput.fill('');
    await visitFormPage.diagnosisInput.fill('');
    await visitFormPage.submitVisit();

    const finalVisits = db.read().visits.length;
    expect(finalVisits).toBe(initialVisits);
  });

  test('TC-VIS-10: Prescribe item quantity exceeding current stock', async ({ page, db }) => {
    const visitFormPage = new VisitFormPage(page);
    const initialVisits = db.read().visits.length;

    await visitFormPage.fillVitals({
      weight: 70,
      height: 175
    });
    await visitFormPage.symptomsInput.fill('Fever');
    await visitFormPage.diagnosisInput.fill('Flu');

    // Cough Syrup 60ml has 25 units in stock. Let's try adding 30 units.
    await visitFormPage.addPrescriptionItem('Cough Syrup 60ml', 30);

    // Save should be blocked or the item should not be added
    await visitFormPage.submitVisit();

    const finalVisits = db.read().visits.length;
    expect(finalVisits).toBe(initialVisits);
  });

  test('TC-VIS-11: Prescribe zero/negative item quantity', async ({ page }) => {
    const visitFormPage = new VisitFormPage(page);

    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', -5);

    // Prescribed item list should not contain the product or have a row
    await expect(visitFormPage.prescTableBody).toHaveCount(0);
  });
});
