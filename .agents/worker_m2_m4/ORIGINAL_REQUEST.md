## 2026-06-26T18:55:54Z

You are the E2E Test Suite Implementer.
Your working directory is: c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\.agents\worker_m2_m4\
Your mission is to implement all 83 test cases under the four tiers of E2E tests using Playwright and the Page Object Models located in `tests/e2e/pages/`.

Please create and implement the following test files:

1. `tests/e2e/tier1_happy_path/auth.spec.js` (5 happy-path auth tests)
   - TC-AUTH-01: Admin login with default credentials
   - TC-AUTH-02: Logout terminates session
   - TC-AUTH-03: Session persists on page reload/refresh
   - TC-AUTH-04: Navigation items are visible based on logged-in state
   - TC-AUTH-05: Login updates credentials successfully

2. `tests/e2e/tier1_happy_path/dashboard.spec.js` (5 happy-path dashboard tests)
   - TC-DASH-01: View default dashboard metrics
   - TC-DASH-02: Filter metrics by valid date range
   - TC-DASH-03: View list of recent transactions
   - TC-DASH-04: Add custom expense logs via UI
   - TC-DASH-05: Dashboard layout updates correctly

3. `tests/e2e/tier1_happy_path/patients.spec.js` (5 happy-path patient tests)
   - TC-PAT-01: Register new patient and verify HN auto-generation
   - TC-PAT-02: Search patient by name
   - TC-PAT-03: Search patient by HN
   - TC-PAT-04: Edit existing patient details
   - TC-PAT-05: Open visit form from patient list row action

4. `tests/e2e/tier1_happy_path/visit.spec.js` (5 happy-path visit tests)
   - TC-VIS-01: Record vitals and verify auto BMI calculation
   - TC-VIS-02: Search and link prescription products to a visit
   - TC-VIS-03: Complete visit and verify stock is deducted
   - TC-VIS-04: Complete visit and verify income transaction is recorded
   - TC-VIS-05: Export Standard Thai Clinical PDF document (triggers IPC generate-pdf)

5. `tests/e2e/tier1_happy_path/inventory.spec.js` (5 happy-path inventory tests)
   - TC-INV-01: View inventory product catalog list
   - TC-INV-02: Add new product with safety/alert thresholds
   - TC-INV-03: Update product price and details
   - TC-INV-04: Restock product to increase quantity
   - TC-INV-05: Search products in catalog by name/code

6. `tests/e2e/tier1_happy_path/pos.spec.js` (5 happy-path POS tests)
   - TC-POS-01: Add item to cart and calculate subtotal
   - TC-POS-02: Apply discount and verify correct total price
   - TC-POS-03: Complete checkout with cash payment and check change calculation
   - TC-POS-04: Verify counter sale is logged in transactions (without patient linkage)
   - TC-POS-05: Clear cart resets POS fields

7. `tests/e2e/tier1_happy_path/settings.spec.js` (5 happy-path settings/theme tests)
   - TC-SET-01: Switch theme to Clinic Green
   - TC-SET-02: Switch theme to Soft Blue
   - TC-SET-03: Switch theme to Dark Mode
   - TC-SET-04: Switch theme to Warm Pink/Purple
   - TC-SET-05: Configure clinic header details (Name, Address, Tel, default practitioner)

8. `tests/e2e/tier2_boundary/auth_boundary.spec.js` (5 boundary auth tests)
   - TC-AUTH-06: Login with empty username
   - TC-AUTH-07: Login with empty password
   - TC-AUTH-08: Login with incorrect password
   - TC-AUTH-09: Login with non-existent username
   - TC-AUTH-10: Special characters in credentials input validation

9. `tests/e2e/tier2_boundary/dashboard_boundary.spec.js` (5 boundary dashboard tests)
   - TC-DASH-06: Filter with start date after end date
   - TC-DASH-07: Filter with empty date range inputs
   - TC-DASH-08: Add expense with zero amount validation
   - TC-DASH-09: Add expense with negative amount validation
   - TC-DASH-10: Add expense with empty description/category validation

10. `tests/e2e/tier2_boundary/patients_boundary.spec.js` (5 boundary patient tests)
    - TC-PAT-06: Register patient with empty name
    - TC-PAT-07: Register patient with empty DOB
    - TC-PAT-08: Register patient with future DOB
    - TC-PAT-09: Register patient with invalid phone format
    - TC-PAT-10: Register patient with extreme age

11. `tests/e2e/tier2_boundary/visit_boundary.spec.js` (6 boundary visit tests)
    - TC-VIS-06: Vitals BMI calculation with height = 0
    - TC-VIS-07: Vitals BMI calculation with weight = 0
    - TC-VIS-08: Negative weight/height values validation
    - TC-VIS-09: Record visit with empty symptoms/diagnosis validation
    - TC-VIS-10: Prescribe item quantity exceeding current stock
    - TC-VIS-11: Prescribe zero/negative item quantity

12. `tests/e2e/tier2_boundary/inventory_boundary.spec.js` (5 boundary inventory tests)
    - TC-INV-06: Add product with negative price
    - TC-INV-07: Add product with negative stock
    - TC-INV-08: Add product with empty name
    - TC-INV-09: Add product with duplicate name/ID
    - TC-INV-10: Add product with negative min stock alert threshold

13. `tests/e2e/tier2_boundary/pos_boundary.spec.js` (5 boundary POS tests)
    - TC-POS-06: Checkout empty cart validation
    - TC-POS-07: Checkout cash received less than total price validation
    - TC-POS-08: Cash received negative value validation
    - TC-POS-09: Apply discount greater than total price validation
    - TC-POS-10: Apply negative discount validation

14. `tests/e2e/tier2_boundary/settings_boundary.spec.js` (5 boundary settings tests)
    - TC-SET-06: Change credentials fails if confirm password does not match (if UI has confirm password, or validation check)
    - TC-SET-07: Clinic telephone setting validates numeric/telephone format
    - TC-SET-08: Saving settings with blank credentials or required header fields shows validation messages
    - TC-SET-09: Invalid theme value in DB falls back to default theme
    - TC-SET-10: Theme settings persist across restarts

15. `tests/e2e/tier3_pairwise/integration_pairwise.spec.js` (7 pairwise integration tests)
    - TC-PAIR-01: Patient + Visit + PDF (Create patient, create visit, verify PDF details)
    - TC-PAIR-02: Inventory + POS + Dashboard (Add product, POS sell, check inventory reduction, check dashboard update)
    - TC-PAIR-03: Settings + Login + Auth (Change settings, logout, login validation)
    - TC-PAIR-04: Patient + Visit + Inventory (Add patient, record visit, prescribe item, verify stock count update)
    - TC-PAIR-05: Settings + Visit + PDF (Update clinic info in settings, create visit, verify PDF header matches updated info)
    - TC-PAIR-06: POS + Dashboard + Date Filter (Multiple transactions on different dates, filter and verify dashboard totals)
    - TC-PAIR-07: Inventory + Dashboard (Add product below alert threshold, verify low-stock alert count on dashboard)

16. `tests/e2e/tier4_workloads/real_world_workloads.spec.js` (5 real-world workloads)
    - TC-WORK-01: Standard Clinic Daily Flow (Login -> Add patient -> Start visit -> Enter vitals & notes -> Prescribe -> Checkout -> Generate PDF)
    - TC-WORK-02: Inventory Management & Reorder Flow (Add products -> Stock falls low -> Trigger Alert -> Restock -> Clear alert -> Log expense)
    - TC-WORK-03: Walk-in Pharmacy Customer Flow (POS cart -> Edit quantities -> Process discount & cash -> Checkout -> Verify DB stock and transactions)
    - TC-WORK-04: End of Month Reporting Flow (Apply date range filter -> Review transactions -> Record expenses -> Verify net profit recalculation)
    - TC-WORK-05: Clinic Relocation & Rebranding Flow (Update Settings info -> Switch theme to Soft Blue -> Add patient -> Create visit -> Verify PDF header and applied theme colors)

Ensure that all test files import the POMs correctly:
- LoginPage: `const { LoginPage } = require('../pages/LoginPage');`
- DashboardPage: `const { DashboardPage } = require('../pages/DashboardPage');`
- PatientsPage: `const { PatientsPage } = require('../pages/PatientsPage');`
- VisitFormPage: `const { VisitFormPage } = require('../pages/VisitFormPage');`
- InventoryPage: `const { InventoryPage } = require('../pages/InventoryPage');`
- PosPage: `const { PosPage } = require('../pages/PosPage');`
- SettingsPage: `const { SettingsPage } = require('../pages/SettingsPage');`

Make sure to write clean, complete Playwright E2E tests using the sandbox `db` helper or direct page interactions where appropriate. Write your handoff to `c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\.agents\worker_m2_m4\handoff.md`.
