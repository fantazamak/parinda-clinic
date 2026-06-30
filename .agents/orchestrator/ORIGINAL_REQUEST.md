# Original User Request

## Initial Request — 2026-06-27T01:51:23+07:00

A local desktop application for clinic/pharmacy backend operations (Parinda Clinic) that manages patient records, generates clinic PDFs matching a specific template, handles product inventory, supports Point-of-Sale (POS) checkouts, and tracks income and expenses.

Working directory: c:/Users/admin/Desktop/myallprogram/Work/project-001(ParindaClinic)
Integrity mode: benchmark

## Requirements

### R1. User Authentication & Settings
- Secure login screen with username/password.
- Settings screen allowing changing credentials and configuring clinic header details (Name, Address, Tel, default practitioner).

### R2. Patient Records & Clinical Visit Data
- Add, edit, search patient records.
- Auto-generate Hospital Number (HN) based on B.E. year + running number (e.g. HN690001 for year 2569 B.E.), but allow manual edits.
- Record vitals (Weight, Height, Temperature, Respiratory Rate, Blood Pressure, Pulse Rate) and calculate BMI.
- Record chief complaint, present illness, physical exam, diagnosis, treatment, and write-in prescriptions.
- Link patient visits to product sales (prescribing inventory products, deducting stock, and logging the cost as income).
- Export/download patient clinical files to a PDF format matching the clinic's standard sheet.

### R3. Inventory & POS Sales
- Add, edit, search products/medicines with code, category, stock count, cost, selling price, and expiration date.
- Show alerts for low-stock and near-expiry items.
- Point-of-Sale (POS) interface for direct sales without patient profiles, deducting stock and logging income.

### R4. Income & Expense Summaries
- Dashboard displaying total income, total expenses, net profit with date range filters.
- Ability to record custom expense transactions.

### R5. Theme Customization
- Support selection between predefined premium themes: Clinic Green, Soft Blue, Dark Mode, Warm Pink/Purple.

## Acceptance Criteria

### Technical & Code Quality
- [ ] No placeholder components or "todo" pages. Every requested page (Login, Dashboard, Patients, Visit Form, Inventory, POS, Settings) must be fully functional.
- [ ] Theme switching changes CSS custom properties immediately without requiring an app reload.
- [ ] Login screen defaults to admin / med1234 on first run, and updates to the new credentials when changed in settings.

### Database Integrity
- [ ] A dedicated database test script exists (e.g., node test-db.js or npm run test:db) that programmatically verifies database actions (reading/writing to JSON files, saving visits, reducing stock levels, and inserting transaction records).

### Compilation & Build
- [ ] The app compiles successfully for production using electron-builder (npm run build or npm run build:win).
- [ ] A standalone .exe installer is generated in the dist/ directory.

### Document Generation
- [ ] PDF generation outputs a clean, well-aligned sheet containing the patient's vitals, medical history, physical exams, diagnosis, and treatment corresponding to the standard Thai clinical document layout.

## Follow-up — 2026-06-27T06:16:11+07:00

The previous orchestrator run stopped due to quota limits. Please resume coordinating and implementing the Parinda Clinic application as described in c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\.agents\ORIGINAL_REQUEST.md.
Please read the existing plan.md and progress.md in c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\.agents\orchestrator, and check the subagent progress folders under .agents/ to resume the implementation smoothly. Let me know when you have completed all milestones or if you need feedback.
