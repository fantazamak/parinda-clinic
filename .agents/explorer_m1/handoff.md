# Handoff Report — E2E Test Infrastructure Proposal

## 1. Observation
- Scanned the workspace directory `c:\Users\admin\Desktop\myallprogram\Work\project-001(ParindaClinic)\` using search tools and observed that the project currently contains only `PROJECT.md` and the `.agents/` folder. The source files are planned under Milestone 1 but do not exist in the root folder yet.
- Checked `PROJECT.md` (lines 38-51) for the planned layout:
  - `package.json` - Electron config and scripts.
  - `main.js` - Electron main entry point.
  - `preload.js` - IPC exposed interfaces.
  - `src/` (with `db.js`, `pdf.js`, `ui/index.html`, etc.)
  - `tests/e2e/` - E2E Test Suite (maintained by Testing Track).
- Checked `.agents/sub_orch_e2e/SCOPE.md` (lines 9-20) for the testing track scope and milestones:
  - **Milestone 1: Test Infra Setup** - Create `tests/e2e/` structure, setup Playwright config, write E2E configuration and scripts.
  - **Milestone 2: Tier 1 Feature Tests** (>=35 happy-path tests).
  - **Milestone 3: Tier 2 Boundary Tests** (>=35 edge cases).
  - **Milestone 4: Tier 3 & 4 Integration** (>=7 pairwise, >=5 real-world workloads).
- Checked `.agents/sub_orch_m1/SCOPE.md` (lines 20-23) for Electron IPC contracts:
  - `settings-get` and `settings-save` to read and write app settings.

---

## 2. Logic Chain

### 2.1 Technology Selection
- **Playwright** is selected as the E2E testing framework because it offers first-class native support for Electron via the `playwright._electron` module, which connects directly to Electron's Chromium-based renderer process using Chrome DevTools Protocol (CDP).
- Alternative frameworks (like Spectron) are deprecated and no longer supported. WebDriverIO is heavier and less integrated than Playwright for direct Electron window manipulation.

### 2.2 Headless / Headed Test Execution Configuration
- Standard browser-based headless config (`headless: true`) does not apply to Electron because Playwright launches the actual Electron executable.
- To achieve true headless execution on Windows/macOS/CI, the Electron application main process (`main.js`) must check if it's running in a headless test environment and create the `BrowserWindow` with `{ show: false }`.
- Playwright will launch Electron passing an argument (e.g., `--headless`) or an environment variable (e.g., `HEADLESS=true`).
- **Main Process Integration (`main.js` snippet):**
  ```javascript
  const isHeadless = process.argv.includes('--headless') || process.env.HEADLESS === 'true';
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: !isHeadless, // Do not show UI window if headless
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!isHeadless) {
      mainWindow.show();
    }
  });
  ```
- **Playwright Launcher Integration (`baseTest.js` snippet):**
  ```javascript
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, '../../../main.js'), '--headless']
  });
  ```

### 2.3 Database Isolation Strategy
- The application uses a local JSON file (`data/db.json`) for data persistence.
- To allow parallel or sequential testing without test pollution, each test needs an isolated database.
- **Strategy:** Use a custom Playwright fixture to:
  1. Generate a temporary database file path (e.g., `data/db_test_[random_id].json`).
  2. Seed the temporary database with default configurations (e.g., default credentials `admin` / `med1234`).
  3. Pass the custom database path to Electron via an environment variable (`DB_PATH`).
  4. Instruct the database module (`src/db.js`) to use `process.env.DB_PATH` if present.
  5. Delete the temporary file when the test finishes.

---

## 3. Caveats
- The actual implementation source code is still being developed by the implementation track.
- The proposed isolation/headless mechanics assume that the implementation track will implement the environment variable `DB_PATH` in `src/db.js` and support the `--headless` argument in `main.js`. (This must be communicated to the implementation track).
- Running E2E tests headlessly with `{ show: false }` simulates the renderer and DOM, but some Electron-specific OS integrations (like native menus or system dialogs) might behave differently compared to fully headed mode.

---

## 4. Conclusion & Infrastructure Proposal

### 4.1 Required npm Packages
Add these to `devDependencies` in `package.json`:
- `"@playwright/test": "^1.40.0"`
- `"playwright": "^1.40.0"`

### 4.2 Proposed NPM Scripts
Add these to the `scripts` block in `package.json`:
```json
"scripts": {
  "test:e2e": "playwright test -c tests/e2e/config/playwright.config.js",
  "test:e2e:headed": "playwright test -c tests/e2e/config/playwright.config.js --headed",
  "test:e2e:tier1": "playwright test -c tests/e2e/config/playwright.config.js tests/e2e/tier1_happy_path",
  "test:e2e:tier2": "playwright test -c tests/e2e/config/playwright.config.js tests/e2e/tier2_boundary",
  "test:e2e:tier3": "playwright test -c tests/e2e/config/playwright.config.js tests/e2e/tier3_pairwise",
  "test:e2e:tier4": "playwright test -c tests/e2e/config/playwright.config.js tests/e2e/tier4_workloads",
  "test:e2e:debug": "playwright test -c tests/e2e/config/playwright.config.js --debug"
}
```

### 4.3 Directory Layout under `tests/e2e/`
```
tests/e2e/
├── config/
│   └── playwright.config.js    # Playwright Electron Configuration
├── fixtures/
│   ├── baseTest.js             # Electron launch fixture with DB sandboxing
│   └── mockDb.json             # Seed database with default admin credentials
├── pages/                      # Page Object Model classes
│   ├── base.page.js            # Common locators/utilities
│   ├── login.page.js
│   ├── dashboard.page.js
│   ├── patients.page.js
│   ├── visit.page.js
│   ├── inventory.page.js
│   ├── pos.page.js
│   └── settings.page.js
├── tier1_happy_path/           # Tier 1 tests (happy path)
│   ├── auth.spec.js
│   ├── dashboard.spec.js
│   ├── patients.spec.js
│   ├── visit.spec.js
│   ├── inventory.spec.js
│   ├── pos.spec.js
│   └── settings.spec.js
├── tier2_boundary/             # Tier 2 tests (boundary/error validation)
│   └── auth_boundary.spec.js
├── tier3_pairwise/             # Tier 3 tests (integration/cross-feature)
│   └── integration_pairwise.spec.js
└── tier4_workloads/            # Tier 4 tests (real-world workflows)
    └── real_world_workloads.spec.js
```

### 4.4 Test Infrastructure Configuration Files

#### `tests/e2e/config/playwright.config.js`
```javascript
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Ensure serial/limited execution to avoid disk I/O race conditions
  workers: 2,           // Safe limit for parallel execution with isolated DBs
  reporter: [
    ['html', { outputFolder: '../reports/html-report', open: 'never' }],
    ['list']
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
```

#### `tests/e2e/fixtures/baseTest.js`
```javascript
const { test: baseTest, expect } = require('@playwright/test');
const { _electron } = require('playwright');
const path = require('path');
const fs = require('fs');

exports.test = baseTest.extend({
  app: async ({}, use) => {
    // 1. Generate temp database path
    const testId = Math.random().toString(36).substring(7);
    const dataDir = path.join(__dirname, '../../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tempDbPath = path.join(dataDir, `db_test_${testId}.json`);
    
    // Copy seed DB to temp database
    const seedPath = path.join(__dirname, 'mockDb.json');
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, tempDbPath);
    } else {
      // Fallback fallback seed structure
      fs.writeFileSync(tempDbPath, JSON.stringify({
        patients: [],
        products: [],
        visits: [],
        transactions: [],
        settings: { username: 'admin', password: 'med1234' }
      }));
    }

    // 2. Launch the Electron app
    const appPath = path.join(__dirname, '../../../main.js');
    const isHeaded = process.env.HEADED === 'true';
    
    const electronApp = await _electron.launch({
      args: [appPath, ...(isHeaded ? [] : ['--headless'])],
      env: {
        ...process.env,
        DB_PATH: tempDbPath,
        NODE_ENV: 'test'
      }
    });

    // 3. Get the main renderer window
    const window = await electronApp.firstWindow();
    
    // Pass application controller and window to tests
    await use({ electronApp, window });

    // 4. Cleanup
    await electronApp.close();
    
    // Delete temporary DB file
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch (err) {
        console.error('Failed to delete temp database:', err);
      }
    }
  }
});

exports.expect = expect;
```

#### `tests/e2e/fixtures/mockDb.json`
```json
{
  "patients": [],
  "products": [],
  "visits": [],
  "transactions": [],
  "settings": {
    "username": "admin",
    "password": "med1234",
    "clinicName": "Parinda E2E Test Clinic",
    "clinicAddress": "123 Test Rd, Bangkok",
    "clinicTel": "02-123-4567",
    "defaultPractitioner": "Dr. Playwright"
  }
}
```

#### Page Object Model (POM) Base Class: `tests/e2e/pages/base.page.js`
```javascript
class BasePage {
  constructor(page) {
    this.page = page;
  }

  async navigateTo(menuSelector) {
    await this.page.click(menuSelector);
  }

  async getTitle() {
    return await this.page.title();
  }
}
module.exports = { BasePage };
```

#### Login Page Object Model: `tests/e2e/pages/login.page.js`
```javascript
const { BasePage } = require('./base.page');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.usernameInput = page.locator('#username'); // Assuming standard IDs
    this.passwordInput = page.locator('#password');
    this.loginBtn = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error-message');
  }

  async goto() {
    // SPA start route
    await this.page.goto('file:///' + require('path').resolve(__dirname, '../../../src/ui/index.html'));
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
  }
}
module.exports = { LoginPage };
```

#### Test Case Template: `tests/e2e/tier1_happy_path/auth.spec.js`
```javascript
const { test, expect } = require('../fixtures/baseTest');
const { LoginPage } = require('../pages/login.page');

test.describe('Tier 1: Authentication - Happy Path', () => {
  test('should login successfully with default credentials and redirect to dashboard', async ({ app }) => {
    const { window } = app;
    const loginPage = new LoginPage(window);

    // Navigate to local SPA file
    await loginPage.goto();

    // Verify initial login state
    await expect(loginPage.usernameInput).toBeVisible();

    // Fill form and submit
    await loginPage.login('admin', 'med1234');

    // Assert that the dashboard component is rendered (e.g. settings header or dashboard section)
    const dashboardSection = window.locator('#dashboard-section');
    await expect(dashboardSection).toBeVisible();
    
    // Assert credentials are authenticated (welcome message)
    await expect(window.locator('#welcome-user')).toContainText('admin');
  });
});
```

---

## 5. Verification Method
1. **Infrastructure Installation**:
   - Run `npm install --save-dev @playwright/test playwright` after package.json is initialized.
   - Run `npx playwright install chromium` to fetch chromium binary components used by the Playwright Electron driver.
2. **Directory Structure Verification**:
   - Check that all directories under `tests/e2e/` (config, fixtures, pages, tier1_happy_path, etc.) exist.
3. **Execution Verification**:
   - Run `npm run test:e2e` to verify the runner boots up and runs the tests.
   - Run `npm run test:e2e:headed` with `process.env.HEADED = 'true'` to verify that the physical Electron window pops up and executes successfully for debugging.
