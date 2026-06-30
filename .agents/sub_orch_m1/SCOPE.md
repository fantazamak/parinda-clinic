# Scope: Milestone 1 - Project Setup & Auth

## Architecture
- Electron desktop app structure.
- Main process (`main.js`) handling windows, security, settings file.
- Preload script (`preload.js`) exposing IPC interfaces.
- Renderer UI (`src/ui/`) containing `index.html` (main SPA shell), `style.css` (variables and core UI styles), and `app.js` (SPA Router, authentication logic, and settings screen handling).
- Config file: `package.json` with scripts (`start`, `build`), dependencies, and `electron-builder` configuration.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Init Electron App | Create package.json, electron-builder settings, main.js, preload.js | None | PLANNED |
| 2 | Robust SPA Structure | Create src/ui/index.html, style.css, app.js with basic routing structure | M1.1 | PLANNED |
| 3 | Login Screen UI & Auth | Implement user credentials login, default credentials (admin / med1234) | M1.2 | PLANNED |
| 4 | Settings Screen & Save | Settings UI, update credentials, change clinic header details (Name, Address, Tel, practitioner) | M1.3 | PLANNED |
| 5 | Route Shells (Placeholders) | Create all pages (Dashboard, Patients, Visit Form, Inventory, POS, Settings) with minimal functional container UI | M1.2 | PLANNED |
| 6 | Build/Compilation Verification| Build app with electron-builder to verify package output | M1.4 | PLANNED |

## Interface Contracts
### Electron IPC
- `ipcRenderer.invoke('settings-get')` -> returns { username, password, clinicName, clinicAddress, clinicTel, defaultPractitioner }
- `ipcRenderer.invoke('settings-save', settings)` -> saves the settings object
