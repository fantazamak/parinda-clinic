# Parinda Clinic - E2E Test Infrastructure & Case Inventory

This document outlines the End-to-End (E2E) testing infrastructure, configuration, database sandboxing mechanisms, and a comprehensive inventory of all 82 test cases across 4 tiers of complexity.

---

## 1. Test Runner & Environment

The E2E test suite is powered by **Playwright Test** configured to drive the **Electron** desktop application. Playwright runs the application in the main process, allowing direct validation of both the user interface and database state.

### Execution Constraints & Strategy
- **Single-Worker Execution (`workers: 1`)**: Electron instances require focus and screen space. To avoid race conditions, window focus hijacking, and resource contention, all tests are executed in a serial queue.
- **Database Sandboxing**: To allow tests to run with a clean state, every test runs in a dedicated **database sandbox**. 
  - Before launching the app, the test copy the default seed file (`tests/e2e/fixtures/mockDb.json`) to a unique temporary file.
  - The test sets the `DB_PATH` and `CLINIC_DB_PATH` environment variables pointing to this temporary file.
  - The Electron backend (`src/db.js`) reads these environment variables to determine which database file to use.
  - After the test completes, the temporary database file is deleted.

---

## 2. Directory Layout

The E2E test code is located under `tests/e2e/`:

```text
tests/
└── e2e/
    ├── config/
    │   └── playwright.config.js       # Playwright runner configuration
    ├── fixtures/
    │   ├── baseTest.js                 # Custom base test with Electron & DB sandbox
    │   └── mockDb.json                 # Default database seed file
    ├── pages/
    │   ├── LoginPage.js                # Login POM
    │   ├── DashboardPage.js            # Dashboard & Expenses POM
    │   ├── PatientsPage.js             # Patient search & registration POM
    │   ├── VisitFormPage.js            # Clinical visits & vitals POM
    │   ├── InventoryPage.js            # Inventory catalog & alerts POM
    │   ├── PosPage.js                  # POS checkout POM
    │   └── SettingsPage.js             # Theme & credentials POM
    ├── tier1_happy_path/               # Happy-path / Smoke E2E tests
    ├── tier2_boundary/                 # Validation and boundary tests
    ├── tier3_pairwise/                 # Combinatorial tests
    └── tier4_workloads/                # Full scenario workflow simulation tests
```

---

## 3. Test Case Format

Every spec file uses the custom `test` fixture from `tests/e2e/fixtures/baseTest.js` and interactions are driven using the Page Object Models.

```javascript
const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Authentication Sanity', () => {
  test('TC-AUTH-01: Admin login with default credentials', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Act
    await loginPage.login('admin', 'med1234');

    // Assert UI
    await expect(dashboardPage.navDashboard).toBeVisible();

    // Assert DB State
    const dbState = db.read();
    expect(dbState.settings.username).toBe('admin');
  });
});
```

---

## 4. Comprehensive Test Case Inventory (82 Cases)

### Feature 1: Authentication (10 Cases)
#### Tier 1: Happy Path
*   **TC-AUTH-01: Admin login with default credentials**
    *   *Preconditions*: DB seeded with username `admin` and password `med1234`.
    *   *Steps*: Open app, input credentials, click submit.
    *   *Expected Result*: Redirected to Dashboard; Login window is hidden.
*   **TC-AUTH-02: Logout terminates session**
    *   *Preconditions*: User logged in.
    *   *Steps*: Click logout button.
    *   *Expected Result*: Session cleared; redirected back to Login screen; subsequent actions blocked.
*   **TC-AUTH-03: Session persists on page reload/refresh**
    *   *Preconditions*: User logged in.
    *   *Steps*: Reload page/window.
    *   *Expected Result*: User remains authenticated; dashboard remains visible without login prompt.

#### Tier 2: Boundary & Validation
*   **TC-AUTH-04: Login with empty username**
    *   *Preconditions*: App on Login screen.
    *   *Steps*: Leave username blank, enter password, submit.
    *   *Expected Result*: Error message shown; submit blocked.
*   **TC-AUTH-05: Login with empty password**
    *   *Preconditions*: App on Login screen.
    *   *Steps*: Enter username, leave password blank, submit.
    *   *Expected Result*: Error message shown; submit blocked.
*   **TC-AUTH-06: Login with incorrect password**
    *   *Preconditions*: User exists.
    *   *Steps*: Enter correct username, wrong password, submit.
    *   *Expected Result*: Login fails; error message "Invalid credentials" displayed; input fields not cleared.
*   **TC-AUTH-07: Login with non-existent username**
    *   *Preconditions*: User does not exist in DB.
    *   *Steps*: Enter unknown username, valid password, submit.
    *   *Expected Result*: Login fails; error message displayed.
*   **TC-AUTH-08: Special characters in credentials input validation**
    *   *Preconditions*: App on Login screen.
    *   *Steps*: Enter SQL-injection-like payload `' OR '1'='1` in username, submit.
    *   *Expected Result*: Form validation handles special characters safely; login fails gracefully without database error.

#### Tier 3: Combinatorial
*   **TC-AUTH-09: Login credential updates reflection in login form**
    *   *Preconditions*: User logged in.
    *   *Steps*: Change credentials in Settings, logout, attempt login with old credentials (fails), attempt with new credentials (succeeds).
    *   *Expected Result*: Database updates credentials immediately; authentication logic uses the updated values.

#### Tier 4: Workloads & State
*   **TC-AUTH-10: Rapid consecutive login attempts responsiveness**
    *   *Preconditions*: App on Login screen.
    *   *Steps*: Rapidly click submit button with invalid inputs multiple times.
    *   *Expected Result*: UI does not crash; rate limit/responsiveness handles rapid clicks safely without hanging Electron window.

---

### Feature 2: Dashboard & Reporting (11 Cases)
#### Tier 1: Happy Path
*   **TC-DASH-01: View default dashboard metrics**
    *   *Preconditions*: Database has existing sales/expenses.
    *   *Steps*: Access Dashboard.
    *   *Expected Result*: Income, expense, and profit metrics correctly calculated and displayed.
*   **TC-DASH-02: Filter metrics by valid date range**
    *   *Preconditions*: Data exists across multiple dates.
    *   *Steps*: Set date range filter to a specific week.
    *   *Expected Result*: Dashboard KPIs and transaction list updated to show only records within selected range.
*   **TC-DASH-03: View list of recent transactions**
    *   *Preconditions*: Recent transactions exist in DB.
    *   *Steps*: Navigate to Dashboard.
    *   *Expected Result*: List of recent transactions is visible, showing details like type, date, description, and amount.

#### Tier 2: Boundary & Validation
*   **TC-DASH-04: Filter with start date after end date**
    *   *Preconditions*: Dashboard page open.
    *   *Steps*: Set start date to tomorrow, end date to today.
    *   *Expected Result*: Validation error displayed or date fields automatically corrected; query blocked.
*   **TC-DASH-05: Filter with empty date range inputs**
    *   *Preconditions*: Dashboard page open.
    *   *Steps*: Clear date inputs and press filter.
    *   *Expected Result*: Defaults to current month or shows appropriate validation warning.
*   **TC-DASH-06: Add expense with zero amount validation**
    *   *Preconditions*: Dashboard page open.
    *   *Steps*: Open expense form, input amount `0`, submit.
    *   *Expected Result*: Validation warning; submission rejected.
*   **TC-DASH-07: Add expense with negative amount validation**
    *   *Preconditions*: Dashboard page open.
    *   *Steps*: Input amount `-500`, submit.
    *   *Expected Result*: Input blocked or validation error triggered; DB unmodified.
*   **TC-DASH-08: Add expense with empty description/category validation**
    *   *Preconditions*: Dashboard page open.
    *   *Steps*: Input amount `100`, leave description empty, submit.
    *   *Expected Result*: Validation error on empty description field.

#### Tier 3: Combinatorial
*   **TC-DASH-09: Filter by single date boundary**
    *   *Preconditions*: Transactions logged on various days.
    *   *Steps*: Enter start date only (leaving end date blank), apply.
    *   *Expected Result*: Filters records starting from that date until current date.
*   **TC-DASH-10: Multiple expenses in different categories summary check**
    *   *Preconditions*: Database contains multiple expenses of various categories.
    *   *Steps*: View dashboard breakdown.
    *   *Expected Result*: Expense total matches the sum of category values correctly.

#### Tier 4: Workloads & State
*   **TC-DASH-11: Full-day transaction reconciliation simulation**
    *   *Preconditions*: Sandboxed DB.
    *   *Steps*: Execute 3 POS transactions, 2 clinical visits, 1 expense; check dashboard metrics.
    *   *Expected Result*: Net Profit mathematically equals (POS total + Visit total - Expense amount).

---

### Feature 3: Theme Switching (9 Cases)
#### Tier 1: Happy Path
*   **TC-THEME-01: Switch theme to Clinic Green**
    *   *Steps*: Go to Settings, select "Clinic Green", click save.
    *   *Expected Result*: `data-theme` attribute on body is updated to `clinic-green`; primary colors update.
*   **TC-THEME-02: Switch theme to Soft Blue**
    *   *Steps*: Go to Settings, select "Soft Blue", click save.
    *   *Expected Result*: `data-theme` attribute on body is updated to `soft-blue`; UI styling updates in real time.
*   **TC-THEME-03: Switch theme to Dark Mode**
    *   *Steps*: Go to Settings, select "Dark Mode", click save.
    *   *Expected Result*: `data-theme` attribute on body is updated to `dark-mode`; UI colors match dark palette.
*   **TC-THEME-04: Switch theme to Warm Pink/Purple**
    *   *Steps*: Go to Settings, select "Warm Pink/Purple", click save.
    *   *Expected Result*: `data-theme` attribute on body is updated to `warm-pink`; pink accents applied.

#### Tier 2: Boundary & Validation
*   **TC-THEME-05: Fallback to default theme on invalid theme value in DB**
    *   *Preconditions*: Sandbox DB.
    *   *Steps*: Directly write invalid theme value `"hacked-theme"` to settings DB; reload app.
    *   *Expected Result*: Application falls back safely to default `"clinic-green"`.

#### Tier 3: Combinatorial
*   **TC-THEME-06: Theme selection persistence after user logout and re-login**
    *   *Steps*: Log in, switch to "Dark Mode", log out, log in again.
    *   *Expected Result*: Theme remains "Dark Mode" on login screen and post-login dashboard.
*   **TC-THEME-07: Theme styling is applied to modals and overlays**
    *   *Steps*: Switch theme to "Soft Blue", trigger Patient registration modal.
    *   *Expected Result*: Modal headers and buttons conform to Soft Blue theme variables.

#### Tier 4: Workloads & State
*   **TC-THEME-08: Theme state persistence on application reload**
    *   *Steps*: Change theme to "Warm Pink", reload application window.
    *   *Expected Result*: Theme state parsed from DB on startup; "Warm Pink Accents" visible instantly.
*   **TC-THEME-09: Custom themes switch correctly during active clinical form input**
    *   *Steps*: Open patient visit form, type symptoms, open settings, switch theme, return to visit.
    *   *Expected Result*: Theme shifts in real-time, entered symptoms and form data are fully preserved.

---

### Feature 4: Patient Management (12 Cases)
#### Tier 1: Happy Path
*   **TC-PAT-01: Register new patient and verify HN auto-generation**
    *   *Preconditions*: Max HN in DB is `HN690002`.
    *   *Steps*: Open Patients, fill details, submit.
    *   *Expected Result*: Patient registered; assigned `HN690003` (sequential increment).
*   **TC-PAT-02: Search patient by name**
    *   *Preconditions*: Patient "Somsri Rakdee" exists.
    *   *Steps*: Type "Somsri" in search bar.
    *   *Expected Result*: Table filters to show only Somsri Rakdee.
*   **TC-PAT-03: Search patient by HN**
    *   *Preconditions*: Patient "HN690001" exists.
    *   *Steps*: Type "HN690001" in search bar.
    *   *Expected Result*: Table filters to show exactly HN690001.
*   **TC-PAT-04: Edit existing patient details**
    *   *Preconditions*: Patient "HN690002" exists.
    *   *Steps*: Click Edit, change phone, save.
    *   *Expected Result*: Database and list reflect updated phone number instantly.

#### Tier 2: Boundary & Validation
*   **TC-PAT-05: Register patient with empty name**
    *   *Steps*: Fill form leaving Name field empty, save.
    *   *Expected Result*: Validation error on Name input; form submission rejected.
*   **TC-PAT-06: Register patient with empty DOB**
    *   *Steps*: Leave DOB blank, save.
    *   *Expected Result*: Validation warning; submission rejected.
*   **TC-PAT-07: Register patient with future DOB**
    *   *Steps*: Set DOB to tomorrow's date, save.
    *   *Expected Result*: Validation error; future birth dates are blocked.
*   **TC-PAT-08: Register patient with invalid phone format**
    *   *Steps*: Set phone to "abc-123", save.
    *   *Expected Result*: Validation warning; phone must contain only numbers or valid characters.
*   **TC-PAT-09: Register patient with extreme age**
    *   *Steps*: Set DOB to "1850-01-01", save.
    *   *Expected Result*: Handled safely; validation flags excessive age or accepts it if permitted, without app crashing.

#### Tier 3: Combinatorial
*   **TC-PAT-10: Patient search with multiple terms**
    *   *Steps*: Search using "HN690001 Somsri".
    *   *Expected Result*: Filters correctly to Somsri Rakdee.
*   **TC-PAT-11: Register patient with special characters in name**
    *   *Steps*: Register patient named "Dr. John O'Connor-Smith", save.
    *   *Expected Result*: Successfully registered; name is escaped/stored safely in JSON file.

#### Tier 4: Workloads & State
*   **TC-PAT-12: Sequential registration of 5 patients in a row**
    *   *Steps*: Add 5 consecutive patients.
    *   *Expected Result*: HNs generated sequentially without duplicate conflicts: HN690003, HN690004, HN690005, HN690006, HN690007.

---

### Feature 5: Clinical Visit Form & PDF (14 Cases)
#### Tier 1: Happy Path
*   **TC-VIS-01: Record vitals and verify auto BMI calculation**
    *   *Steps*: Input weight = `70` (kg), height = `175` (cm).
    *   *Expected Result*: BMI field automatically displays `22.86` ($70 / 1.75^2$).
*   **TC-VIS-02: Search and link prescription products to a visit**
    *   *Steps*: Select "Paracetamol 500mg", qty `10`, add.
    *   *Expected Result*: Added to prescription list table with total price calculated.
*   **TC-VIS-03: Complete visit and verify stock is deducted**
    *   *Preconditions*: Paracetamol stock = `200`.
    *   *Steps*: Create visit, prescribe `10` Paracetamol, complete visit.
    *   *Expected Result*: Paracetamol stock in DB is decremented to `190`.
*   **TC-VIS-04: Complete visit and verify income transaction is recorded**
    *   *Steps*: Complete visit costing `500` THB.
    *   *Expected Result*: New transaction of type `income` for `500` logged in DB.
*   **TC-VIS-05: Export Standard Thai Clinical PDF document**
    *   *Steps*: Click Export/Print PDF on completed visit.
    *   *Expected Result*: System triggers PDF generation via IPC `generate-pdf` using correct layout format.

#### Tier 2: Boundary & Validation
*   **TC-VIS-06: Vitals BMI calculation with height = 0**
    *   *Steps*: Input weight = `70`, height = `0`.
    *   *Expected Result*: BMI field is blank or shows "0.00" / "N/A" (avoids division by zero crash).
*   **TC-VIS-07: Vitals BMI calculation with weight = 0**
    *   *Steps*: Input weight = `0`, height = `175`.
    *   *Expected Result*: BMI field displays "0.00".
*   **TC-VIS-08: Negative weight/height values validation**
    *   *Steps*: Enter weight = `-70`, height = `-175`.
    *   *Expected Result*: Input blocked or validation error triggered.
*   **TC-VIS-09: Record visit with empty symptoms/diagnosis validation**
    *   *Steps*: Save visit without filling symptoms and diagnosis.
    *   *Expected Result*: Validation error requires symptoms/diagnosis to save clinical record.
*   **TC-VIS-10: Prescribe item quantity exceeding current stock**
    *   *Preconditions*: Product "Cough Syrup" has `25` units in stock.
    *   *Steps*: Enter quantity `30` on prescription select, add.
    *   *Expected Result*: Warning displayed; checkout blocked or restricted to maximum available stock.
*   **TC-VIS-11: Prescribe zero/negative item quantity**
    *   *Steps*: Enter quantity `-5` or `0`, add.
    *   *Expected Result*: Action blocked or ignored by form validation.

#### Tier 3: Combinatorial
*   **TC-VIS-12: Multiple items prescription handling**
    *   *Steps*: Add `10` Paracetamol (sufficient stock) and `10` Cough Syrup (sufficient but triggers alert warning threshold).
    *   *Expected Result*: Both successfully added, total price updates, and alerts flag upon completion.
*   **TC-VIS-13: Vitals record edge cases**
    *   *Steps*: Enter weight = `500` kg, height = `300` cm.
    *   *Expected Result*: Validates range or processes extreme inputs without overflow error.

#### Tier 4: Workloads & State
*   **TC-VIS-14: End-to-end patient journey**
    *   *Steps*: Register patient, start visit, input vitals, prescribe medications, save visit, check inventory stock depletion, check transaction list, check PDF.
    *   *Expected Result*: Multi-step data integrity holds; all UI components show unified backend state updates.

---

### Feature 6: Inventory Management (13 Cases)
#### Tier 1: Happy Path
*   **TC-INV-01: View inventory product catalog list**
    *   *Steps*: Navigate to Inventory.
    *   *Expected Result*: Table shows all products with names, prices, units, and stock quantities.
*   **TC-INV-02: Add new product with safety/alert thresholds**
    *   *Steps*: Fill add product form (Name: "Vitamin C", stock: 100, alert: 20), save.
    *   *Expected Result*: Product is created and displayed in list.
*   **TC-INV-03: Update product price and details**
    *   *Steps*: Edit "Vitamin C", change price to `150`, save.
    *   *Expected Result*: Updated price reflected immediately in catalog.
*   **TC-INV-04: Restock product to increase quantity**
    *   *Steps*: Select "Cough Syrup", restock by `50` units.
    *   *Expected Result*: Stock count increments from `25` to `75` in DB and table row.

#### Tier 2: Boundary & Validation
*   **TC-INV-05: Add product with negative price**
    *   *Steps*: Try saving a product with price `-10`.
    *   *Expected Result*: Rejected with price validation error.
*   **TC-INV-06: Add product with negative stock**
    *   *Steps*: Try saving a product with stock `-5`.
    *   *Expected Result*: Rejected with stock validation error.
*   **TC-INV-07: Add product with empty name**
    *   *Steps*: Save product leaving name input blank.
    *   *Expected Result*: Rejected with name validation error.
*   **TC-INV-08: Add product with duplicate name/ID**
    *   *Steps*: Save a new product with name "Paracetamol 500mg".
    *   *Expected Result*: Error message: "Product already exists" or handles gracefully.
*   **TC-INV-09: Add product with negative min stock alert threshold**
    *   *Steps*: Input min stock alert threshold = `-15`.
    *   *Expected Result*: Rejected with validation error.

#### Tier 3: Combinatorial
*   **TC-INV-10: Stock alert trigger at exact threshold**
    *   *Preconditions*: Product has stock = `50`, minStockAlert = `50`.
    *   *Expected Result*: Alert badge/row styling active since stock <= minStockAlert.
*   **TC-INV-11: Stock alert trigger below threshold**
    *   *Preconditions*: Product stock is `49`, minStockAlert = `50`.
    *   *Expected Result*: Alert badge/row styling active.
*   **TC-INV-12: Stock alert resolving on restock above threshold**
    *   *Steps*: Restock product from `49` to `100` (threshold `50`).
    *   *Expected Result*: Stock alert styling removed from row instantly.

#### Tier 4: Workloads & State
*   **TC-INV-13: Rapid depletion of stock through consecutive visits**
    *   *Steps*: Conduct series of sales that bring multiple products below their alert limits.
    *   *Expected Result*: Alerts appear dynamically in dashboard/inventory tab without requiring reload.

---

### Feature 7: POS Checkout / Counter Sales (13 Cases)
#### Tier 1: Happy Path
*   **TC-POS-01: Add item to cart and calculate subtotal**
    *   *Steps*: Add "Amoxicillin 250mg" (price `120`), qty = `2`.
    *   *Expected Result*: Cart subtotal shows `240`.
*   **TC-POS-02: Apply discount and verify correct total price**
    *   *Steps*: Add item (subtotal `240`), input discount = `40`.
    *   *Expected Result*: Total price updates to `200`.
*   **TC-POS-03: Complete checkout with cash payment**
    *   *Steps*: Total = `200`, input cash received = `500`, click checkout.
    *   *Expected Result*: Checkout completes; change display shows `300` ($500 - 200$).
*   **TC-POS-04: Verify counter sale is logged in transactions**
    *   *Steps*: Perform POS sale.
    *   *Expected Result*: Income transaction logged in DB without patient or visit ID linkages.

#### Tier 2: Boundary & Validation
*   **TC-POS-05: Checkout empty cart validation**
    *   *Steps*: Click checkout button with 0 items in cart.
    *   *Expected Result*: Button disabled or validation warning shown.
*   **TC-POS-06: Checkout cash received less than total price validation**
    *   *Steps*: Total = `200`, input cash = `150`, try to checkout.
    *   *Expected Result*: Checkout blocked; validation warning "Insufficient payment" shown.
*   **TC-POS-07: Cash received negative value validation**
    *   *Steps*: Input cash = `-100`.
    *   *Expected Result*: Blocked by form validation.
*   **TC-POS-08: Apply discount greater than total price validation**
    *   *Steps*: Subtotal = `200`, input discount = `250`.
    *   *Expected Result*: Total clamped to `0` or discount rejected by validation.
*   **TC-POS-09: Apply negative discount validation**
    *   *Steps*: Input discount = `-50`.
    *   *Expected Result*: Input blocked or ignored by form validation.

#### Tier 3: Combinatorial
*   **TC-POS-10: Cart manipulation**
    *   *Steps*: Add item, add same item again (should aggregate qty), remove item.
    *   *Expected Result*: Cart updates item list and total price accurately at each step.
*   **TC-POS-11: Combined order with multiple items and discounts**
    *   *Steps*: Add 3 different products, apply discount, verify math.
    *   *Expected Result*: Total is computed exactly as $\sum(\text{price} \times \text{qty}) - \text{discount}$.
*   **TC-POS-12: Checkout with stock exactly equal to cart request**
    *   *Preconditions*: Stock is `25`.
    *   *Steps*: Add `25` units of product to cart, checkout.
    *   *Expected Result*: Sale completes; stock becomes exactly `0` in DB.

#### Tier 4: Workloads & State
*   **TC-POS-13: Concurrent cart edits, stock verification, and checkout**
    *   *Steps*: Perform rapid cart edits, add items, checkout, verify that DB stock decrements atomic and transaction logging is correct.
    *   *Expected Result*: Consistent inventory counts; transaction details match exact checkout prices.
