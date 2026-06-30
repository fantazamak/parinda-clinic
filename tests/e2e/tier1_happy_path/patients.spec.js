const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');
const { VisitFormPage } = require('../pages/VisitFormPage');

test.describe('Patients Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPatients();
  });

  test('TC-PAT-01: Register new patient and verify HN auto-generation', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);

    const newPatient = {
      name: 'Somprasong Rakdee',
      dob: '1990-01-01',
      gender: 'Male',
      phone: '0855555555',
      allergies: 'None'
    };

    await patientsPage.registerPatient(newPatient);

    // Verify UI row updates
    await expect(patientsPage.patientRows.filter({ hasText: 'HN690003' })).toBeVisible();
    const data = await patientsPage.getPatientData('HN690003');
    expect(data.name).toBe('Somprasong Rakdee');
    expect(data.gender).toBe('Male');
    expect(data.phone).toBe('0855555555');
    expect(data.allergies).toBe('None');

    // Verify DB update
    const dbState = db.read();
    const dbPatient = dbState.patients.find(p => p.hn === 'HN690003');
    expect(dbPatient).toBeDefined();
    expect(dbPatient.name).toBe('Somprasong Rakdee');
  });

  test('TC-PAT-02: Search patient by name', async ({ page }) => {
    const patientsPage = new PatientsPage(page);

    await patientsPage.searchPatient('Somsri');

    // Only 1 row should be visible containing Somsri
    await expect(patientsPage.patientRows).toHaveCount(1);
    const data = await patientsPage.getPatientData('HN690001');
    expect(data.name).toBe('Somsri Rakdee');
  });

  test('TC-PAT-03: Search patient by HN', async ({ page }) => {
    const patientsPage = new PatientsPage(page);

    await patientsPage.searchPatient('HN690002');

    await expect(patientsPage.patientRows).toHaveCount(1);
    const data = await patientsPage.getPatientData('HN690002');
    expect(data.hn).toBe('HN690002');
    expect(data.name).toBe('Sombat Jaidee');
  });

  test('TC-PAT-04: Edit existing patient details', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);

    await patientsPage.editPatient('HN690002', { phone: '0899999999' });

    const data = await patientsPage.getPatientData('HN690002');
    expect(data.phone).toBe('0899999999');

    // Verify DB update
    const dbState = db.read();
    const dbPatient = dbState.patients.find(p => p.hn === 'HN690002');
    expect(dbPatient.phone).toBe('0899999999');
  });

  test('TC-PAT-05: Open visit form from patient list row action', async ({ page }) => {
    const patientsPage = new PatientsPage(page);
    const visitFormPage = new VisitFormPage(page);

    await patientsPage.startVisit('HN690001');

    // Check we navigated to Visit Form and fields are filled
    await expect(visitFormPage.patientHnSpan).toHaveText('HN690001');
    await expect(visitFormPage.patientNameSpan).toHaveText('Somsri Rakdee');
  });
});
