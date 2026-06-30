## 2026-06-27T01:59:19+07:00
You are the Refinement JS Worker for Milestone 1.
Your working directory is: c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\.agents\worker_m1_refine_js\
Your task is to refine the implementation in `main.js` and `src/ui/app.js` to fix theme switching (data-theme attribute), environment dbPath override compatibility, clinicHeader settings keys, and E2E page object selector alignments.

Modify the following files:

1. **main.js**:
   - Ensure the defaultSettings object contains `clinicHeader` matching the default address:
     ```javascript
     const defaultSettings = {
       username: "admin",
       password: "med1234",
       clinicName: "Parinda Clinic",
       clinicHeader: "123 Main St, Bangkok",
       clinicAddress: "123 Main St, Bangkok",
       clinicTel: "02-123-4567",
       defaultPractitioner: "Dr. Parinda",
       theme: "clinic-green"
     };
     ```

2. **src/ui/app.js**:
   - Update all event listeners and DOM queries to match the refined selectors in `index.html`:
     - Login: container `#login-container`, inputs `#username` and `#password`, submit button `#login-submit-btn`, error display `#login-error-msg`.
     - Sidebar Navigation: Dashboard link `#nav-dashboard`, Patients `#nav-patients`, Visit `#nav-visit`, Inventory `#nav-inventory`, POS `#nav-pos`, Settings `#nav-settings`, Logout `#nav-logout`.
     - Page containers: `#dashboard-page`, `#patients-page`, `#visit-form-page`, `#inventory-page`, `#pos-page`, `#settings-page`.
     - Visit Form vitals: weight `#vitals-weight`, height `#vitals-height`, BMI `#vitals-bmi` (readonly input). Chief complaint symptoms `#visit-symptoms`, diagnosis `#visit-diagnosis`.
   - Update theme switching:
     - On settings-get theme loading and settings-save theme update: run `document.body.setAttribute('data-theme', themeName)` dynamically. Theme names must be: `clinic-green`, `soft-blue`, `dark`, `warm-pink`.
   - Aligned settings sub-forms:
     - Auth Credentials Form: `#settings-credentials-form` (listening to submit or saveAuthBtn `#settings-save-auth-btn` click). Populates fields `#settings-username-input` and `#settings-password-input`. On success, shows `#settings-auth-success-msg`.
     - Clinic Info Form: `#settings-clinic-form` (listening to submit or saveClinicBtn `#settings-save-clinic-btn` click). Populates fields `#settings-clinic-name-input`, `#settings-clinic-header-input`, `#settings-clinic-tel`, `#settings-practitioner`. Note: E2E tests expect settings to have the key `clinicHeader` matching `#settings-clinic-header-input`. Make sure `clinicHeader` is saved and read. On success, shows `#settings-clinic-success-msg`.
     - Theme Customization Form: `#settings-theme-form` (listening to submit or saveThemeBtn `#settings-save-theme-btn` click). Populates `#settings-theme-select` option value. On success, updates body `data-theme` attribute instantly.
   - Preserves default `admin` / `med1234` credentials check if settings loading fails.

3. **Verification**:
   - Re-run packaging build `npm run build` to verify compilation.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Once completed, write your handoff report to c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\.agents\worker_m1_refine_js\handoff.md documenting the files written, commands run, and build outcome, then send a message to the caller.
