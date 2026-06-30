const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', '..', 'src', 'ui', 'app.js');
const content = fs.readFileSync(appJsPath, 'utf8');

console.log('App.js length:', content.length);

// Search for login, submit, credentials, authentication, bypass, test
const lines = content.split('\n');

function findMatches(regex) {
  const matches = [];
  lines.forEach((line, index) => {
    if (regex.test(line)) {
      matches.push({ lineNum: index + 1, text: line.trim() });
    }
  });
  return matches;
}

console.log('--- Login Form Submit handler ---');
const loginMatches = findMatches(/login-form|submit/i);
loginMatches.slice(0, 30).forEach(m => console.log(`${m.lineNum}: ${m.text}`));

console.log('--- Settings or credential references ---');
const credMatches = findMatches(/username|password|med1234|admin/i);
credMatches.forEach(m => console.log(`${m.lineNum}: ${m.text}`));

console.log('--- IPC / api calls ---');
const apiMatches = findMatches(/window\.api|api\./i);
apiMatches.forEach(m => console.log(`${m.lineNum}: ${m.text}`));
