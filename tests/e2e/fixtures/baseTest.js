const { test: base, _electron: electron } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper to generate a unique temp database path
function getTempDbPath(testId) {
  const sanitizedId = testId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(os.tmpdir(), `clinic-db-sandbox-${sanitizedId}-${Date.now()}.json`);
}

const test = base.extend({
  // Unique temporary DB path for this test
  tempDbPath: async ({}, use, testInfo) => {
    const tempPath = getTempDbPath(testInfo.testId);
    
    // Ensure default mock data exists and copy it
    const seedPath = path.join(__dirname, 'mockDb.json');
    let seedData = '{}';
    if (fs.existsSync(seedPath)) {
      seedData = fs.readFileSync(seedPath, 'utf8');
    } else {
      console.warn(`Warning: seed file not found at ${seedPath}. Starting with empty database.`);
    }
    
    // Write sandbox database file
    fs.writeFileSync(tempPath, seedData, 'utf8');

    await use(tempPath);

    // Clean up temporary database file
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {
        console.error(`Failed to clean up temp DB file: ${tempPath}`, e);
      }
    }
  },

  // DB Sandbox helper to read/write state within tests
  db: async ({ tempDbPath }, use) => {
    const dbHelper = {
      getPath: () => tempDbPath,
      read: () => {
        if (!fs.existsSync(tempDbPath)) return {};
        return JSON.parse(fs.readFileSync(tempDbPath, 'utf8'));
      },
      write: (data) => {
        fs.writeFileSync(tempDbPath, JSON.stringify(data, null, 2), 'utf8');
      },
      // Convenience update helper
      update: (updaterFn) => {
        const current = dbHelper.read();
        updaterFn(current);
        dbHelper.write(current);
      }
    };
    await use(dbHelper);
  },

  // Electron App fixture
  electronApp: async ({ tempDbPath }, use) => {
    // Locate the electron main file (main.js) in the project root
    const mainPath = path.join(__dirname, '../../../main.js');
    
    const app = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        DB_PATH: tempDbPath,
        CLINIC_DB_PATH: tempDbPath,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
      }
    });

    await use(app);

    await app.close();
  },

  // Page fixture representing the main Electron window
  page: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    
    // Wait for the window DOM to be fully loaded
    await window.waitForLoadState('domcontentloaded');
    
    await use(window);
  }
});

module.exports = {
  test,
  expect: base.expect,
};
