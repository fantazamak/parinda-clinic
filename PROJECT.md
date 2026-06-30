# Project: Parinda Clinic Application

## Architecture
The application is a local desktop application built using Electron.
- **Frontend (Renderer Process)**: Plain HTML/CSS/JS. CSS variables are used for real-time theme switching.
- **Backend/IPC (Main Process)**: Electron main process managing windows, file system, database operations, and PDF generation.
- **Database Layer**: Simple JSON-based database (`src/db.js`) storing data in a local JSON file (e.g. `data/db.json`). All operations (patients, visits, products, transactions, expenses, settings) read/write through this layer.
- **PDF Generator**: Node-based module utilizing `pdfkit` to generate the clinical document sheet layout.

## Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|------|-------|-------------|--------|---------|
| 1 | Project Setup & Auth | Init Electron, configure build, setup package.json, Login UI, Settings UI, default credentials (admin/med1234) | None | IN_PROGRESS | f8491339-5525-4f97-aba7-b5e6e84dc1f1 |
| 2 | Database & Patients | Create JSON database layer, test-db.js script, patient add/edit/search, auto HN generation (e.g. HN690001) | M1 | PLANNED | TBD |
| 3 | Inventory & POS | Product inventory, stock alert logic, direct POS checkout without patient records | M2 | PLANNED | TBD |
| 4 | Clinical Visits & PDF | Vitals recording, BMI calculation, prescription links, deduct stock, export Standard Thai Clinical PDF | M3 | PLANNED | TBD |
| 5 | Dashboard & Themes | Summaries with date filters, expense records, Clinic Green / Soft Blue / Dark Mode / Warm Pink/Purple themes | M4 | PLANNED | TBD |
| 6 | E2E Integration (Tiers 1-4) | Pass all opaque-box E2E tests built by E2E Testing track | M5 | PLANNED | TBD |
| 7 | Adversarial Hardening (Tier 5)| White-box test gaps coverage and adversarial testing | M6 | PLANNED | TBD |

## Interface Contracts
### Main Process ↔ Renderer Process IPC
- `ipcRenderer.invoke('db-read', modelName, query)`: Reads records from the database.
- `ipcRenderer.invoke('db-write', modelName, data)`: Writes or updates records in the database.
- `ipcRenderer.invoke('generate-pdf', visitData)`: Generates patient clinical visit PDF.
- `ipcRenderer.invoke('settings-get')`: Retrieves current application settings (credentials, header).
- `ipcRenderer.invoke('settings-save', settings)`: Saves new settings.

### Database API
- `db.getPatients(query)`: returns list of patient objects.
- `db.savePatient(patient)`: saves/updates patient record.
- `db.getProducts()`: returns list of products.
- `db.saveProduct(product)`: saves/updates product record.
- `db.createVisit(visit)`: saves visit, links to products, deducts inventory, creates income transaction.
- `db.createTransaction(transaction)`: creates income/expense log.
- `db.getDashboardStats(startDate, endDate)`: returns aggregated income, expense, and profit.

## Code Layout
- `package.json` - Electron config and scripts.
- `main.js` - Electron main entry point.
- `preload.js` - IPC exposed interfaces.
- `src/`
  - `db.js` - JSON database engine.
  - `pdf.js` - Thai clinical document PDF generator.
  - `ui/`
    - `index.html` - App shell / main layout.
    - `style.css` - Global styling and theme colors.
    - `app.js` - Frontend SPA router & controller.
- `test-db.js` - CLI database integrity test script.
- `tests/`
  - `e2e/` - E2E Test Suite (maintained by Testing Track).
