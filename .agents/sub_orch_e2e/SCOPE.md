# Scope: E2E Testing Track

## Architecture
- The application is a local desktop application built using Electron.
- E2E Testing will use Playwright for Electron to control the app and assert UI states.
- All E2E test files will reside under `tests/e2e/`.
- Test configuration: Playwright configuration targeting the Electron main process entry file.

## Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|------|-------|-------------|--------|---------|
| 1 | Test Infra Setup | Create `tests/e2e/` folder structure, setup Playwright config, write `TEST_INFRA.md` outlining design, runner, case formats, and add run scripts | None | PLANNED | TBD |
| 2 | Tier 1 Feature Tests | Implement happy-path coverage for Login, Dashboard, Patients, Visit Form, Inventory, POS, Settings (>=5 tests each, total >=35 tests) | M1 | PLANNED | TBD |
| 3 | Tier 2 Boundary Tests | Implement edge/boundary cases for all features (e.g. invalid credentials, empty patient forms, empty product forms, zero stock POS, alerts; >=5 tests each, total >=35 tests) | M2 | PLANNED | TBD |
| 4 | Tier 3 & 4 Integration | Implement cross-feature pairwise scenarios (e.g. add patient -> verify dashboard, add product -> do POS -> check inventory, check dashboard; >=7 tests) and Tier 4 real-world workloads (>=5 tests) | M3 | PLANNED | TBD |
| 5 | E2E Verification & Ready | Verify all tests pass, compile test scripts under `npm run test:e2e`, publish `TEST_READY.md`, send completion message to parent | M4 | PLANNED | TBD |

## Interface Contracts
- The E2E tests must launch the application using Electron's entry file (e.g. `main.js`).
- Test execution command: `npm run test:e2e` (or equivalent runner script) executing all Tier 1, 2, 3, 4 tests.
