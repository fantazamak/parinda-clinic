const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { PatientsPage } = require('../pages/PatientsPage');
const { VisitFormPage } = require('../pages/VisitFormPage');
const { InventoryPage } = require('../pages/InventoryPage');
const { PosPage } = require('../pages/PosPage');
const { SettingsPage } = require('../pages/SettingsPage');

test.describe('Real World Workloads', () => {
  test('TC-WORK-01: Standard Clinic Daily Flow', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const patientsPage = new PatientsPage(page);
    const visitFormPage = new VisitFormPage(page);

    // 1. Login
    await loginPage.login('admin', 'med1234');

    // 2. Add patient
    await dashboardPage.goToPatients();
    await patientsPage.registerPatient({
      name: 'Workload Pat One',
      dob: '1995-05-05',
      gender: 'Male',
      phone: '0811111111',
      allergies: 'Penicillin'
    });

    // 3. Start Visit
    await patientsPage.startVisit('HN690003');

    // 4. Enter Vitals
    await visitFormPage.fillVitals({
      bp: '125/80',
      hr: 80,
      temp: 37.2,
      weight: 75,
      height: 180
    });
    const bmi = await visitFormPage.getBmi();
    expect(bmi).toBe('23.15');

    // 5. Enter clinical notes
    await visitFormPage.symptomsInput.fill('Headache and fever');
    await visitFormPage.diagnosisInput.fill('Common Cold');

    // 6. Prescribe
    await visitFormPage.addPrescriptionItem('Paracetamol 500mg', 20);

    // 7. Generate PDF
    await visitFormPage.exportPdf();

    // 8. Checkout / Save visit
    await visitFormPage.submitVisit();

    // Verify DB states
    const dbState = db.read();
    const prod = dbState.products.find(p => p.id === 'prod-001');
    expect(prod.stock).toBe(180); // 200 - 20

    const visit = dbState.visits.find(v => v.hn === 'HN690003');
    expect(visit).toBeDefined();
    expect(visit.totalPrice).toBe(1000); // 20 * 50
  });

  test('TC-WORK-02: Inventory Management & Reorder Flow', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const inventoryPage = new InventoryPage(page);
    const posPage = new PosPage(page);

    await loginPage.login('admin', 'med1234');

    // Add product
    await dashboardPage.goToInventory();
    await inventoryPage.addProduct({
      name: 'Alcohol Gel',
      price: 60,
      stock: 15,
      unit: 'bottle',
      minStockAlert: 10
    });

    // Sell item to trigger low-stock alert
    await dashboardPage.goToPos();
    await posPage.addItem('Alcohol Gel', 10);
    await posPage.checkout(600);

    // Go to dashboard, verify low stock alert count
    await dashboardPage.navDashboard.click();
    let lowStockText = await page.locator('#dash-low-stock').innerText();
    expect(parseInt(lowStockText || '0')).toBe(2); // Cough Syrup + Alcohol Gel

    // Restock
    await dashboardPage.goToInventory();
    await inventoryPage.restockProduct('Alcohol Gel', 50);

    // Verify alert cleared in dashboard
    await dashboardPage.navDashboard.click();
    lowStockText = await page.locator('#dash-low-stock').innerText();
    expect(parseInt(lowStockText || '0')).toBe(1); // Only Cough Syrup remains low

    // Log restock expense
    await dashboardPage.addExpense(1500, 'Medical Supplies', 'Alcohol Gel Restock');

    // Verify DB expense
    const dbState = db.read();
    const exp = dbState.expenses.find(e => e.description === 'Alcohol Gel Restock');
    expect(exp).toBeDefined();
    expect(exp.amount).toBe(1500);
  });

  test('TC-WORK-03: Walk-in Pharmacy Customer Flow', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const posPage = new PosPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToPos();

    // Add items to cart
    await posPage.addItem('Paracetamol 500mg', 10);
    await posPage.addItem('Amoxicillin 250mg', 5);

    // Edit quantities by removing one item and adding another
    await posPage.removeItem('Amoxicillin 250mg');
    await posPage.addItem('Cough Syrup 60ml', 2);

    // Apply discount
    await posPage.applyDiscount(60);

    const total = await posPage.getTotalPrice();
    expect(total).toBe(600); // (10*50 + 2*80) - 60 = 500 + 160 - 60 = 600

    // Process payment and checkout
    await posPage.checkout(1000);
    const change = await posPage.getChangeAmount();
    expect(change).toBe(400);

    // Verify DB stock
    const dbState = db.read();
    const parac = dbState.products.find(p => p.id === 'prod-001');
    expect(parac.stock).toBe(190); // 200 - 10
    const syrup = dbState.products.find(p => p.id === 'prod-003');
    expect(syrup.stock).toBe(23); // 25 - 2

    // Verify transaction logged
    const lastTx = dbState.transactions[dbState.transactions.length - 1];
    expect(lastTx.amount).toBe(600);
    expect(lastTx.type).toBe('income');
  });

  test('TC-WORK-04: End of Month Reporting Flow', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Directly seed transactions in DB
    db.update((current) => {
      current.transactions = [
        { id: 'tx-june-1', type: 'income', amount: 5000, date: '2026-06-01', description: 'June income 1' },
        { id: 'tx-june-2', type: 'income', amount: 3000, date: '2026-06-15', description: 'June income 2' },
        { id: 'tx-june-3', type: 'expense', amount: 2000, date: '2026-06-20', description: 'June expense 1' },
        { id: 'tx-july-1', type: 'income', amount: 4000, date: '2026-07-05', description: 'July income 1' }
      ];
      current.expenses = [
        { id: 'exp-june-1', amount: 2000, date: '2026-06-20', category: 'Medical Supplies', description: 'June expense 1' }
      ];
    });

    await loginPage.login('admin', 'med1234');

    // Filter by date range for June
    await dashboardPage.filterByDateRange('2026-06-01', '2026-06-30');

    // Verify KPI calculations
    let income = await dashboardPage.getIncome();
    let expense = await dashboardPage.getExpense();
    let profit = await dashboardPage.getProfit();

    expect(income).toBe(8000);
    expect(expense).toBe(2000);
    expect(profit).toBe(6000);

    // Record new expense in June via UI
    // Ensure the date of added expense is in June (app.js should handle adding today's date, which is in June 2026)
    await dashboardPage.addExpense(1000, 'Rent', 'June office rent');

    // Verify updated KPIs
    income = await dashboardPage.getIncome();
    expense = await dashboardPage.getExpense();
    profit = await dashboardPage.getProfit();

    expect(income).toBe(8000);
    expect(expense).toBe(3000);
    expect(profit).toBe(5000);
  });

  test('TC-WORK-05: Clinic Relocation & Rebranding Flow', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const settingsPage = new SettingsPage(page);
    const patientsPage = new PatientsPage(page);
    const visitFormPage = new VisitFormPage(page);

    await loginPage.login('admin', 'med1234');
    await dashboardPage.goToSettings();

    // 1. Rebranding info
    await settingsPage.updateClinicInfo('Parinda Health Clinic', 'Parinda Health Specialist Care');

    // 2. Switch theme
    await settingsPage.switchTheme('soft-blue');

    // 3. Add patient
    await dashboardPage.goToPatients();
    await patientsPage.registerPatient({
      name: 'Rebrand Pat',
      dob: '1987-07-07',
      gender: 'Female',
      phone: '0877777777',
      allergies: 'None'
    });

    // 4. Create visit
    await patientsPage.startVisit('HN690003');
    await visitFormPage.fillVitals({ bp: '120/80', hr: 72, temp: 36.8, weight: 65, height: 165 });
    await visitFormPage.symptomsInput.fill('Follow-up');
    await visitFormPage.diagnosisInput.fill('Healthy');

    // 5. Verify PDF export triggers
    await visitFormPage.exportPdf();

    // 6. Verify theme styling class
    const theme = await settingsPage.getActiveTheme();
    expect(theme).toBe('soft-blue');

    // Verify DB settings
    const dbState = db.read();
    expect(dbState.settings.clinicName).toBe('Parinda Health Clinic');
    expect(dbState.settings.theme).toBe('soft-blue');
  });
});
