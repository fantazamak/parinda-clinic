const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');
const { VisitFormPage } = require('../pages/VisitFormPage');
const { InventoryPage } = require('../pages/InventoryPage');
const { PosPage } = require('../pages/PosPage');
const { SettingsPage } = require('../pages/SettingsPage');

test.describe('Pairwise Integration Tests', () => {
  test('TC-PAIR-01: Patient + Visit + PDF', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const patientsPage = new PatientsPage(page);
    const visitFormPage = new VisitFormPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPatients();

    // Register Patient
    const p = { name: 'Pairwise Pat One', dob: '1988-08-08', gender: 'Female', phone: '0888888888', allergies: 'None' };
    await patientsPage.registerPatient(p);

    // Start Visit for the newly registered patient (HN690003)
    await patientsPage.startVisit('HN690003');

    // Fill Visit details
    await visitFormPage.fillVitals({ bp: '120/85', hr: 75, temp: 37.0, weight: 60, height: 160 });
    await visitFormPage.symptomsInput.fill('Sneezing');
    await visitFormPage.diagnosisInput.fill('Allergy');
    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 5);
    await visitFormPage.exportPdf(); // Triggers PDF export

    // Submit Visit
    await visitFormPage.submitVisit();

    // Verify DB
    const dbState = db.read();
    const visit = dbState.visits.find(v => v.hn === 'HN690003');
    expect(visit).toBeDefined();
    expect(visit.diagnosis).toBe('Allergy');
  });

  test('TC-PAIR-02: Inventory + POS + Dashboard', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const inventoryPage = new InventoryPage(page);
    const posPage = new PosPage(page);

    await loginPage.login('admin', 'med1234');

    // Add product to inventory
    await dashboardPage.goToInventory();
    await inventoryPage.addProduct({
      name: 'Guaifenesin 100mg',
      price: 150,
      stock: 10,
      unit: 'tablet',
      minStockAlert: 5
    });

    // Go to POS, sell this product
    await dashboardPage.goToPos();
    await posPage.addItem('Guaifenesin 100mg', 2);
    await posPage.checkout(500);

    // Verify inventory stock reduced in DB
    const dbState = db.read();
    const prod = dbState.products.find(p => p.name === 'Guaifenesin 100mg');
    expect(prod.stock).toBe(8);

    // Verify dashboard updates
    await dashboardPage.navDashboard.click();
    const income = await dashboardPage.getIncome();
    // Pre-seeded is 500. POS sale of 2 * 150 = 300. Total income = 800.
    expect(income).toBe(800);
  });

  test('TC-PAIR-03: Settings + Login + Auth', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const settingsPage = new SettingsPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToSettings();

    // Change settings credentials
    await settingsPage.updateUsername('superadmin', 'med1234');

    // Attempt login with old credentials
    await loginPage.login('admin', 'med1234');
    await expect(loginPage.errorMessage).toBeVisible();

    // Login with new credentials
    await loginPage.login('superadmin', 'med1234');
    await expect(dashboardPage.navDashboard).toBeVisible();
  });

  test('TC-PAIR-04: Patient + Visit + Inventory', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const patientsPage = new PatientsPage(page);
    const visitFormPage = new VisitFormPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPatients();

    // Add patient
    await patientsPage.registerPatient({
      name: 'Pairwise Pat Two',
      dob: '1992-02-02',
      gender: 'Male',
      phone: '0822222222',
      allergies: 'None'
    });

    // Start visit
    await patientsPage.startVisit('HN690003');
    await visitFormPage.fillVitals({ bp: '115/75', hr: 70, temp: 36.6, weight: 80, height: 180 });
    await visitFormPage.symptomsInput.fill('Cough');
    await visitFormPage.diagnosisInput.fill('Bronchitis');
    await visitFormPage.addPrescriptionItem('Amoxicillin 250mg', 15);
    await visitFormPage.submitVisit();

    // Verify stock count in DB
    const dbState = db.read();
    const product = dbState.products.find(p => p.id === 'prod-002');
    expect(product.stock).toBe(135); // 150 - 15
  });

  test('TC-PAIR-05: Settings + Visit + PDF', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const settingsPage = new SettingsPage(page);
    const patientsPage = new PatientsPage(page);
    const visitFormPage = new VisitFormPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToSettings();

    // Update clinic settings
    await settingsPage.updateClinicInfo('Chaimongkol Clinic', 'Chaimongkol Specialist Care');

    // Go start a visit and trigger PDF
    await dashboardPage.goToPatients();
    await patientsPage.startVisit('HN690001');

    await visitFormPage.fillVitals({ bp: '120/80', hr: 72, temp: 36.8, weight: 65, height: 165 });
    await visitFormPage.symptomsInput.fill('Fever');
    await visitFormPage.diagnosisInput.fill('Cold');

    // Export PDF - should trigger and include the updated clinic header
    await visitFormPage.exportPdf();
  });

  test('TC-PAIR-06: POS + Dashboard + Date Filter', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const posPage = new PosPage(page);

    // Seed another transaction on a different date directly
    db.update((current) => {
      current.transactions.push({
        id: 'tx-old-01',
        type: 'income',
        amount: 1000,
        date: '2026-05-15',
        description: 'Old transaction'
      });
    });

    await loginPage.login('admin', 'med1234');

    // Make POS transaction today (let's assume today is 2026-06-26)
    const todayStr = new Date().toISOString().split('T')[0];
    await dashboardPage.goToPos();
    await posPage.addItem('Paracetamol 500mg', 4); // 200 THB
    await posPage.checkout(200);

    // Go to dashboard and filter for today only
    await dashboardPage.navDashboard.click();
    await dashboardPage.filterByDateRange(todayStr, todayStr);

    const income = await dashboardPage.getIncome();
    expect(income).toBe(200); // Only today's POS transaction
  });

  test('TC-PAIR-07: Inventory + Dashboard', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToInventory();

    // Add a product below its alert threshold
    await inventoryPage.addProduct({
      name: 'Saline Solution',
      price: 80,
      stock: 5,
      unit: 'bottle',
      minStockAlert: 10
    });

    // Go to dashboard and verify the low stock badge count in UI
    await dashboardPage.navDashboard.click();
    const lowStockText = await page.locator('#dash-low-stock').innerText();
    const lowStockCount = parseInt(lowStockText || '0');
    // Pre-seeded low stock items + 1 (Saline Solution)
    // Pre-seeded: Paracetamol (200/50 - ok), Amoxicillin (150/30 - ok), Cough Syrup (25/30 - low stock). So 1 pre-seeded.
    // New Saline Solution (5/10 - low stock). So total should be 2.
    expect(lowStockCount).toBe(2);
  });
});
