const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const mainJsPath = path.join(projectRoot, 'main.js');
const indexHtmlPath = path.join(projectRoot, 'src', 'ui', 'index.html');

console.log('=== STARTING ELECTRON APP SETUP VERIFICATION ===\n');

let overallPassed = true;

// 1. Validate package.json
console.log('--- 1. Validating package.json ---');
if (!fs.existsSync(packageJsonPath)) {
  console.error('[FAIL] package.json does not exist');
  overallPassed = false;
} else {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Required fields check
    const requiredFields = ['name', 'version', 'main', 'scripts', 'devDependencies', 'build'];
    requiredFields.forEach(field => {
      if (pkg[field] === undefined) {
        console.error(`[FAIL] package.json is missing required top-level field: "${field}"`);
        overallPassed = false;
      } else {
        console.log(`[PASS] package.json has field: "${field}"`);
      }
    });

    if (pkg.scripts) {
      if (!pkg.scripts.build) {
        console.error('[FAIL] package.json: scripts.build is missing');
        overallPassed = false;
      } else {
        console.log(`[PASS] package.json: scripts.build = "${pkg.scripts.build}"`);
      }
    }

    // electron-builder configurations
    if (pkg.build) {
      const buildConfigs = ['appId', 'productName', 'win', 'files'];
      buildConfigs.forEach(cfg => {
        if (pkg.build[cfg] === undefined) {
          console.error(`[FAIL] package.json: build config is missing "${cfg}"`);
          overallPassed = false;
        } else {
          console.log(`[PASS] package.json: build.${cfg} is configured`);
        }
      });
    }
  } catch (err) {
    console.error('[FAIL] Failed to parse package.json:', err.message);
    overallPassed = false;
  }
}
console.log('');

// 2. Parse main.js for security policies
console.log('--- 2. Validating main.js Security Policies ---');
if (!fs.existsSync(mainJsPath)) {
  console.error('[FAIL] main.js does not exist');
  overallPassed = false;
} else {
  const mainContent = fs.readFileSync(mainJsPath, 'utf8');

  // Helper check function
  const checkSecurityPolicy = (name, regex, description) => {
    const matched = regex.test(mainContent);
    if (matched) {
      console.log(`[PASS] main.js includes security policy: ${name} (${description})`);
    } else {
      console.error(`[FAIL] main.js is MISSING security policy: ${name} (${description})`);
      overallPassed = false;
    }
  };

  // 'will-navigate'
  checkSecurityPolicy('will-navigate', /will-navigate/i, 'navigation restriction');
  
  // 'setWindowOpenHandler'
  checkSecurityPolicy('setWindowOpenHandler', /setWindowOpenHandler/i, 'new window isolation');
  
  // CSP headers (Content-Security-Policy)
  checkSecurityPolicy('CSP header', /Content-Security-Policy/i, 'HTTP/session headers CSP policy');
  
  // 'setPermissionRequestHandler'
  checkSecurityPolicy('setPermissionRequestHandler', /setPermissionRequestHandler/i, 'permission request validation');
  
  // webPreferences sandbox: true
  // Let's look for webPreferences blocks containing sandbox: true (or sandbox:true)
  const sandboxRegex = /webPreferences\s*:\s*\{[\s\S]*?sandbox\s*:\s*true/i;
  checkSecurityPolicy('webPreferences.sandbox', sandboxRegex, 'BrowserWindow sandbox enabled');
}
console.log('');

// 3. Parse src/ui/index.html for SPA elements matching E2E POMs
console.log('--- 3. Validating src/ui/index.html SPA Elements ---');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('[FAIL] index.html does not exist');
  overallPassed = false;
} else {
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  const requiredIds = [
    'login-container',
    'username',
    'password',
    'login-submit-btn',
    'settings-username-input',
    'settings-password-input',
    'settings-save-auth-btn',
    'settings-auth-success-msg',
    'settings-clinic-name-input',
    'settings-clinic-header-input',
    'settings-save-clinic-btn',
    'settings-clinic-success-msg',
    'settings-theme-select',
    'settings-save-theme-btn'
  ];

  requiredIds.forEach(id => {
    // Check if ID is defined in the HTML file as an attribute value: id="id" or id='id'
    const idRegex = new RegExp(`id=["']${id}["']`, 'i');
    const matched = idRegex.test(htmlContent);
    if (matched) {
      console.log(`[PASS] index.html contains element with ID: "${id}"`);
    } else {
      console.error(`[FAIL] index.html is MISSING element with ID: "${id}"`);
      overallPassed = false;
    }
  });
}
console.log('');

console.log('=== VERIFICATION SUMMARY ===');
if (overallPassed) {
  console.log('[SUCCESS] All verification checks PASSED successfully!');
  process.exit(0);
} else {
  console.error('[FAIL] Verification checks FAILED. Please review the errors above.');
  process.exit(1);
}
