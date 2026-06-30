const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');

test.describe('Patients Boundary', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPatients();
  });

  test('TC-PAT-06: Register patient with empty name', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);
    const initialCount = db.read().patients.length;

    await patientsPage.registerPatient({
      name: '',
      dob: '1990-01-01',
      gender: 'Male',
      phone: '0855555555',
      allergies: 'None'
    });

    // Modal should remain open or DB not updated
    const finalCount = db.read().patients.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-PAT-07: Register patient with empty DOB', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);
    const initialCount = db.read().patients.length;

    await patientsPage.registerPatient({
      name: 'Test Patient',
      dob: '',
      gender: 'Male',
      phone: '0855555555',
      allergies: 'None'
    });

    const finalCount = db.read().patients.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-PAT-08: Register patient with future DOB', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);
    const initialCount = db.read().patients.length;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await patientsPage.registerPatient({
      name: 'Test Future Patient',
      dob: tomorrowStr,
      gender: 'Male',
      phone: '0855555555',
      allergies: 'None'
    });

    const finalCount = db.read().patients.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-PAT-09: Register patient with invalid phone format', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);
    const initialCount = db.read().patients.length;

    await patientsPage.registerPatient({
      name: 'Test Phone Patient',
      dob: '1990-01-01',
      gender: 'Male',
      phone: 'abc-123-xyz',
      allergies: 'None'
    });

    const finalCount = db.read().patients.length;
    expect(finalCount).toBe(initialCount);
  });

  test('TC-PAT-10: Register patient with extreme age', async ({ page, db }) => {
    const patientsPage = new PatientsPage(page);
    const initialCount = db.read().patients.length;

    await patientsPage.registerPatient({
      name: 'Test Extreme Age Patient',
      dob: '1850-01-01',
      gender: 'Male',
      phone: '0855555555',
      allergies: 'None'
    });

    // Extreme age (170+ years) should trigger validation warning and block, or handle gracefully without crash
    // Let's assert DB is not updated
    const finalCount = db.read().patients.length;
    expect(finalCount).toBe(initialCount);
  });
});
