const fs = require('fs');
const path = require('path');

// Use a separate test database file in the data/ directory to avoid overwriting production data
const testDbPath = path.join(__dirname, 'data', 'test-db-sandbox.json');

// Helper functions for reading/writing the database file
function readDb() {
  if (!fs.existsSync(testDbPath)) {
    return {};
  }
  const data = fs.readFileSync(testDbPath, 'utf8');
  if (!data.trim()) {
    return {};
  }
  return JSON.parse(data);
}

function writeDb(data) {
  const dir = path.dirname(testDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(testDbPath, JSON.stringify(data, null, 2), 'utf8');
}

function cleanup() {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    cleanup();
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  console.log('Starting programmatic database verification tests...');

  // Ensure fresh state
  cleanup();

  // Test 1: Reading/Writing settings
  const testSettings = {
    username: "admin-test",
    password: "password-test",
    clinicName: "Parinda Clinic Test",
    clinicHeader: "456 Test St, Bangkok",
    clinicAddress: "456 Test St, Bangkok",
    clinicTel: "02-999-9999",
    defaultPractitioner: "Dr. Test Parinda",
    theme: "soft-blue"
  };

  let db = readDb();
  db.settings = testSettings;
  writeDb(db);

  let verifiedDb = readDb();
  assert(verifiedDb.settings !== undefined, 'Settings key should exist in DB');
  assert(verifiedDb.settings.username === testSettings.username, 'Settings username should match');
  assert(verifiedDb.settings.password === testSettings.password, 'Settings password should match');
  assert(verifiedDb.settings.clinicName === testSettings.clinicName, 'Settings clinicName should match');
  assert(verifiedDb.settings.clinicTel === testSettings.clinicTel, 'Settings clinicTel should match');
  assert(verifiedDb.settings.theme === testSettings.theme, 'Settings theme should match');

  // Test 2: Saving visits, reducing stock levels, and inserting transaction records
  // Initialize with initial products and data structure
  const initialProducts = [
    {
      id: "prod-001",
      name: "Paracetamol 500mg",
      price: 50,
      stock: 200,
      minStockAlert: 50,
      unit: "tablet"
    },
    {
      id: "prod-002",
      name: "Amoxicillin 250mg",
      price: 120,
      stock: 150,
      minStockAlert: 30,
      unit: "capsule"
    }
  ];

  db = readDb();
  db.products = initialProducts;
  db.visits = [];
  db.transactions = [];
  writeDb(db);

  // Define new visit data (simulating a clinical visit check-out)
  const patientHn = "HN690001";
  const patientName = "Somsri Rakdee";
  const visitVitals = {
    bp: "120/80",
    hr: 72,
    temp: 36.5,
    weight: 70,
    height: 175,
    bmi: 22.86
  };
  const visitSymptoms = "High fever and sore throat";
  const visitDiagnosis = "Acute Pharyngitis";
  
  // Prescriptions: 10 tabs Paracetamol (prod-001) and 5 caps Amoxicillin (prod-002)
  const prescriptionsToSave = [
    { productId: "prod-001", quantity: 10 },
    { productId: "prod-002", quantity: 5 }
  ];

  // Perform database actions:
  // A. Deduct stock levels
  db = readDb();
  for (const item of prescriptionsToSave) {
    const product = db.products.find(p => p.id === item.productId);
    assert(product !== undefined, `Product ${item.productId} should exist to deduct stock`);
    assert(product.stock >= item.quantity, `Product ${item.productId} should have enough stock`);
    product.stock -= item.quantity;
  }

  // B. Save Visit record
  const visitId = `visit-${Date.now()}`;
  const dateStr = new Date().toISOString().split('T')[0];
  const totalPrice = (10 * 50) + (5 * 120); // 500 + 600 = 1100

  const newVisit = {
    id: visitId,
    hn: patientHn,
    date: dateStr,
    vitals: visitVitals,
    symptoms: visitSymptoms,
    diagnosis: visitDiagnosis,
    prescriptions: prescriptionsToSave.map(item => {
      const prod = db.products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: prod ? prod.price : 0
      };
    }),
    totalPrice: totalPrice,
    status: 'Completed'
  };
  db.visits.push(newVisit);

  // C. Insert Transaction Record
  const newTx = {
    id: `tx-${Date.now()}`,
    type: 'income',
    amount: totalPrice,
    date: dateStr,
    description: `Payment for visit-${visitId} (${patientName} - ${patientHn})`
  };
  db.transactions.push(newTx);

  // Write changes back to the JSON file
  writeDb(db);

  // D. Read and verify all actions on the JSON file
  verifiedDb = readDb();

  // Verify stock levels reduced
  const verifiedProd1 = verifiedDb.products.find(p => p.id === "prod-001");
  const verifiedProd2 = verifiedDb.products.find(p => p.id === "prod-002");
  assert(verifiedProd1.stock === 190, 'Paracetamol stock level should be reduced by 10 (200 -> 190)');
  assert(verifiedProd2.stock === 145, 'Amoxicillin stock level should be reduced by 5 (150 -> 145)');

  // Verify visit saved correctly
  assert(verifiedDb.visits.length === 1, 'Visits array should contain exactly 1 record');
  const savedVisit = verifiedDb.visits[0];
  assert(savedVisit.id === visitId, 'Saved visit ID should match');
  assert(savedVisit.hn === patientHn, 'Saved visit patient HN should match');
  assert(savedVisit.vitals.bp === visitVitals.bp, 'Saved visit blood pressure should match');
  assert(savedVisit.vitals.bmi === visitVitals.bmi, 'Saved visit BMI should match');
  assert(savedVisit.symptoms === visitSymptoms, 'Saved visit symptoms should match');
  assert(savedVisit.diagnosis === visitDiagnosis, 'Saved visit diagnosis should match');
  assert(savedVisit.totalPrice === totalPrice, 'Saved visit total price should be 1100');

  // Verify transaction record inserted
  assert(verifiedDb.transactions.length === 1, 'Transactions array should contain exactly 1 record');
  const savedTx = verifiedDb.transactions[0];
  assert(savedTx.type === 'income', 'Saved transaction type should be income');
  assert(savedTx.amount === totalPrice, 'Saved transaction amount should match total price');
  assert(savedTx.description.includes(patientHn), 'Saved transaction description should include patient HN');

  // Clean up test file
  cleanup();

  console.log('All programmatic database verification tests passed successfully!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Unhandled error during tests:', err);
  cleanup();
  process.exit(1);
});
