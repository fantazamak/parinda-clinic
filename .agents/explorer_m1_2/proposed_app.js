/**
 * Parinda Clinic Management System
 * Frontend SPA Router & Controller
 * Milestone 1 Implementation
 */

// --- Global Application State ---
let currentUser = null;
let currentClinicSettings = {
  username: 'admin',
  password: 'med1234',
  clinicName: 'Parinda Clinic',
  clinicAddress: '123 Sukhumvit Road, Bangkok',
  clinicTel: '02-123-4567',
  defaultPractitioner: 'Dr. Parinda',
  theme: 'clinic-green'
};

// Selected patient for active clinical visit
let activeVisitPatient = null;
let activePrescriptionCart = [];

// --- Mock Database (In-Memory fallback for Milestone 1) ---
let mockPatients = [
  {
    hn: 'HN690001',
    name: 'Somchai Jaidee',
    gender: 'Male',
    dob: '1985-05-15',
    phone: '0812345678',
    address: '123 Sukhumvit Rd, Bangkok',
    history: 'Hypertension. Allergy to Penicillin.'
  },
  {
    hn: 'HN690002',
    name: 'Somsri Rakdee',
    gender: 'Female',
    dob: '1990-08-22',
    phone: '0898765432',
    address: '456 Phahonyothin Rd, Bangkok',
    history: 'Asthma. No known drug allergies.'
  }
];

let mockProducts = [
  {
    id: 'p1',
    code: 'P001',
    name: 'Paracetamol 500mg',
    category: 'Medicine',
    price: 2.0,
    stock: 500,
    unit: 'tablets',
    alertLevel: 100
  },
  {
    id: 'p2',
    code: 'P002',
    name: 'Amoxicillin 250mg',
    category: 'Medicine',
    price: 5.0,
    stock: 80,
    unit: 'capsules',
    alertLevel: 100
  },
  {
    id: 'p3',
    code: 'P003',
    name: 'Saline 0.9% 100ml',
    category: 'Medical Supply',
    price: 50.0,
    stock: 15,
    unit: 'bottles',
    alertLevel: 10
  },
  {
    id: 'p4',
    code: 'P004',
    name: 'Consultation Fee',
    category: 'Service',
    price: 300.0,
    stock: 99999, // services have infinite stock
    unit: 'session',
    alertLevel: 0
  }
];

let mockVisits = [
  {
    id: 'v1',
    hn: 'HN690001',
    date: '2026-06-25',
    vitals: { weight: 70, height: 175, bp_sys: 130, bp_dia: 85, hr: 72, temp: 36.8, rr: 16, bmi: 22.9 },
    symptoms: 'Headache for 2 days, mild fever',
    diagnosis: 'Tension headache',
    prescriptions: [
      { code: 'P001', name: 'Paracetamol 500mg', quantity: 20, price: 2.0, instructions: '1 tablet every 4-6 hours as needed for pain' }
    ],
    doctorFee: 200,
    totalPrice: 240
  }
];

let mockTransactions = [
  {
    id: 't1',
    date: '2026-06-25',
    type: 'Income',
    description: 'Visit Charge (HN690001)',
    amount: 240.0
  },
  {
    id: 't2',
    date: '2026-06-24',
    type: 'Expense',
    description: 'Clinic Cleaning Supplies',
    amount: 150.0
  }
];

// --- POS Shopping Cart State ---
let posCart = [];

// --- Helper Functions ---
function calculateAge(dobString) {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatCurrency(amount) {
  return '฿' + parseFloat(amount).toFixed(2);
}

function applyTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
}

// IPC Wrappers with Fallbacks
async function getSettings() {
  try {
    if (window.api && window.api.settingsGet) {
      const dbSettings = await window.api.settingsGet();
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        currentClinicSettings = { ...currentClinicSettings, ...dbSettings };
      }
    }
  } catch (error) {
    console.warn("Failed to load settings via IPC, using defaults:", error);
  }
  return currentClinicSettings;
}

async function saveSettings(settings) {
  try {
    if (window.api && window.api.settingsSave) {
      await window.api.settingsSave(settings);
    }
    currentClinicSettings = { ...settings };
  } catch (error) {
    console.warn("Failed to save settings via IPC, saving locally only:", error);
    currentClinicSettings = { ...settings };
  }
}

// --- View Router ---
const routes = {
  'dashboard': { title: 'Dashboard', render: renderDashboard },
  'patients': { title: 'Patient Records', render: renderPatients },
  'visit-form': { title: 'New Visit Record', render: renderVisitForm },
  'inventory': { title: 'Product Inventory', render: renderInventory },
  'pos': { title: 'Point of Sale Checkout', render: renderPOS },
  'settings': { title: 'Clinic Settings', render: renderSettings }
};

function navigateTo(route) {
  window.location.hash = route;
}

function handleRouting() {
  // If not logged in, redirect to login container
  if (!currentUser) {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    return;
  }

  document.getElementById('login-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';

  let hash = window.location.hash.substring(1);
  if (!hash || !routes[hash]) {
    hash = 'dashboard';
    window.location.hash = 'dashboard';
    return;
  }

  // Update navbar links active state
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.getElementById(`nav-${hash}`);
  if (activeLink) activeLink.classList.add('active');

  // Toggle active view sections
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });
  const activeView = document.getElementById(`view-${hash}`);
  if (activeView) activeView.classList.add('active');

  // Update Page Title
  document.getElementById('page-title').textContent = routes[hash].title;

  // Run view render function
  routes[hash].render();
}

// --- View Renderers ---

// 1. Dashboard View
function renderDashboard() {
  // Update Clinic and Staff Top Bar Headers
  document.getElementById('sidebar-clinic-name').textContent = currentClinicSettings.clinicName;
  document.getElementById('topbar-practitioner').textContent = currentClinicSettings.defaultPractitioner;
  document.getElementById('topbar-tel').textContent = currentClinicSettings.clinicTel;

  // Calculate statistics
  const patientCount = mockPatients.length;
  const visitCount = mockVisits.length;

  let totalIncome = 0;
  let totalExpense = 0;

  mockTransactions.forEach(t => {
    if (t.type === 'Income') {
      totalIncome += t.amount;
    } else if (t.type === 'Expense') {
      totalExpense += t.amount;
    }
  });

  const netProfit = totalIncome - totalExpense;

  // Render values
  document.getElementById('stat-patients').textContent = patientCount;
  document.getElementById('stat-visits').textContent = visitCount;
  document.getElementById('stat-income').textContent = formatCurrency(totalIncome);
  document.getElementById('stat-expenses').textContent = formatCurrency(totalExpense);
  document.getElementById('stat-profit').textContent = formatCurrency(netProfit);

  // Render Transaction List
  const tbody = document.getElementById('dashboard-transactions-table-body');
  tbody.innerHTML = '';

  if (mockTransactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No transactions recorded yet.</td></tr>`;
  } else {
    // Reverse array to show newest first
    [...mockTransactions].reverse().forEach(t => {
      const tr = document.createElement('tr');
      const isIncome = t.type === 'Income';
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><span class="badge-${isIncome ? 'ok-stock' : 'low-stock'}">${t.type}</span></td>
        <td>${t.description}</td>
        <td style="color: ${isIncome ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: 600;">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Inventory Stock Alerts
  const alertList = document.getElementById('dashboard-stock-alerts');
  alertList.innerHTML = '';

  const lowStockItems = mockProducts.filter(p => p.category !== 'Service' && p.stock <= p.alertLevel);
  if (lowStockItems.length === 0) {
    alertList.innerHTML = `<li class="text-center" style="background: none; border-left: none; padding: 0;">✅ All product stocks are adequate.</li>`;
  } else {
    lowStockItems.forEach(item => {
      const li = document.createElement('li');
      if (item.stock === 0) {
        li.className = 'critical';
      }
      li.innerHTML = `
        <span><strong>${item.name}</strong> (${item.code})</span>
        <span>Stock: ${item.stock} / Alert: ${item.alertLevel} ${item.unit}</span>
      `;
      alertList.appendChild(li);
    });
  }
}

// 2. Patients View
function renderPatients() {
  const tbody = document.getElementById('patients-table-body');
  tbody.innerHTML = '';

  const query = document.getElementById('patient-search-input').value.toLowerCase().trim();

  const filteredPatients = mockPatients.filter(p => {
    return p.hn.toLowerCase().includes(query) ||
           p.name.toLowerCase().includes(query) ||
           p.phone.includes(query);
  });

  if (filteredPatients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No patients found.</td></tr>`;
  } else {
    filteredPatients.forEach(p => {
      const age = calculateAge(p.dob);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.hn}</strong></td>
        <td>${p.name}</td>
        <td>${p.gender}</td>
        <td>${age} yrs</td>
        <td>${p.phone}</td>
        <td class="text-muted" style="font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.history}">
          ${p.history || 'None'}
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editPatient('${p.hn}')">✏️ Edit</button>
          <button class="btn btn-accent btn-sm" onclick="startVisit('${p.hn}')">🩺 Create Visit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Start Visit Action
window.startVisit = function(hn) {
  const patient = mockPatients.find(p => p.hn === hn);
  if (patient) {
    activeVisitPatient = patient;
    activePrescriptionCart = [];
    navigateTo('visit-form');
  }
};

// Edit Patient Action
window.editPatient = function(hn) {
  const patient = mockPatients.find(p => p.hn === hn);
  if (patient) {
    document.getElementById('patient-edit-hn').value = patient.hn;
    document.getElementById('patient-name').value = patient.name;
    document.getElementById('patient-gender').value = patient.gender;
    document.getElementById('patient-dob').value = patient.dob;
    document.getElementById('patient-phone').value = patient.phone;
    document.getElementById('patient-address').value = patient.address;
    document.getElementById('patient-history').value = patient.history;

    document.getElementById('patient-form-title').textContent = `Edit Patient: ${patient.hn}`;
    document.getElementById('patient-form-container').style.display = 'block';
    document.getElementById('patient-form-container').scrollIntoView({ behavior: 'smooth' });
  }
};

// 3. Visit Form View
function renderVisitForm() {
  const alertBox = document.getElementById('visit-no-patient-alert');
  const formBox = document.getElementById('visit-form-container');

  if (!activeVisitPatient) {
    alertBox.style.display = 'block';
    formBox.style.display = 'none';
    return;
  }

  alertBox.style.display = 'none';
  formBox.style.display = 'block';

  // Populate Patient Header details
  document.getElementById('visit-patient-hn').textContent = activeVisitPatient.hn;
  document.getElementById('visit-patient-name').textContent = activeVisitPatient.name;
  document.getElementById('visit-patient-gender').textContent = activeVisitPatient.gender;
  document.getElementById('visit-patient-age').textContent = `${calculateAge(activeVisitPatient.dob)} yrs`;
  document.getElementById('visit-patient-phone').textContent = activeVisitPatient.phone;

  // Initialize prescription product dropdown
  const select = document.getElementById('presc-product-select');
  select.innerHTML = '<option value="">-- Choose Product/Service --</option>';

  mockProducts.forEach(p => {
    // Show available products
    const stockStatus = p.category === 'Service' ? '' : ` (Stock: ${p.stock})`;
    const option = document.createElement('option');
    option.value = p.code;
    option.textContent = `${p.code} - ${p.name} [฿${p.price.toFixed(2)}]${stockStatus}`;
    select.appendChild(option);
  });

  renderPrescriptionTable();
}

function calculateBMI() {
  const w = parseFloat(document.getElementById('vitals-weight').value);
  const h = parseFloat(document.getElementById('vitals-height').value);
  const bmiDisplay = document.getElementById('vitals-bmi-display');

  if (w > 0 && h > 0) {
    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    bmiDisplay.textContent = bmi.toFixed(1);
    
    // Color code BMI
    if (bmi < 18.5) {
      bmiDisplay.style.color = '#0284c7'; // Underweight
    } else if (bmi >= 18.5 && bmi < 23) {
      bmiDisplay.style.color = 'var(--success-color)'; // Normal (Thai Criteria)
    } else if (bmi >= 23 && bmi < 25) {
      bmiDisplay.style.color = 'var(--warning-color)'; // Overweight
    } else {
      bmiDisplay.style.color = 'var(--danger-color)'; // Obese
    }
  } else {
    bmiDisplay.textContent = '-';
    bmiDisplay.style.color = 'var(--text-primary)';
  }
}

function renderPrescriptionTable() {
  const tbody = document.getElementById('prescription-table-body');
  tbody.innerHTML = '';

  let total = 0;

  activePrescriptionCart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    // Get original stock details
    const originalProd = mockProducts.find(p => p.code === item.code);
    let stockPreview = '-';
    if (originalProd && originalProd.category !== 'Service') {
      const remainingStock = originalProd.stock - item.quantity;
      stockPreview = `${originalProd.stock} ➔ <span style="font-weight:700; color:${remainingStock < 0 ? 'var(--danger-color)' : 'var(--success-color)'}">${remainingStock}</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${item.quantity}</td>
      <td>${item.instructions || 'N/A'}</td>
      <td>${formatCurrency(subtotal)}</td>
      <td>${stockPreview}</td>
      <td>
        <button type="button" class="btn btn-danger btn-sm" onclick="removePrescriptionItem(${index})">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Calculate grand total
  document.getElementById('visit-presc-total').textContent = formatCurrency(total);
  const doctorFee = parseFloat(document.getElementById('visit-doctor-fee').value) || 0;
  const grandTotal = total + doctorFee;
  document.getElementById('visit-grand-total').textContent = formatCurrency(grandTotal);
}

window.removePrescriptionItem = function(index) {
  activePrescriptionCart.splice(index, 1);
  renderPrescriptionTable();
};

// 4. Inventory View
function renderInventory() {
  const tbody = document.getElementById('inventory-table-body');
  tbody.innerHTML = '';

  const query = document.getElementById('inventory-search-input').value.toLowerCase().trim();

  const filteredProducts = mockProducts.filter(p => {
    return p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query);
  });

  if (filteredProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No products found.</td></tr>`;
  } else {
    filteredProducts.forEach(p => {
      // Determine Stock Status Alert
      let statusBadge = '';
      if (p.category === 'Service') {
        statusBadge = '<span class="badge-ok-stock">Service</span>';
      } else if (p.stock === 0) {
        statusBadge = '<span class="badge-low-stock">Out of Stock</span>';
      } else if (p.stock <= p.alertLevel) {
        statusBadge = '<span class="badge-low-stock">Low Stock</span>';
      } else {
        statusBadge = '<span class="badge-ok-stock">OK</span>';
      }

      const isLowStock = p.category !== 'Service' && p.stock <= p.alertLevel;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.code}</strong></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${formatCurrency(p.price)}</td>
        <td style="${isLowStock ? 'color: var(--danger-color); font-weight:700;' : ''}">${p.category === 'Service' ? 'N/A' : p.stock}</td>
        <td>${p.category === 'Service' ? 'N/A' : p.alertLevel}</td>
        <td>${p.unit}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">✏️ Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

window.editProduct = function(id) {
  const product = mockProducts.find(p => p.id === id);
  if (product) {
    document.getElementById('product-edit-id').value = product.id;
    document.getElementById('product-code').value = product.code;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-alert').value = product.alertLevel;
    document.getElementById('product-unit').value = product.unit;

    // Toggle fields if service
    toggleProductFieldsByCategory(product.category);

    document.getElementById('product-form-title').textContent = `Edit Product: ${product.code}`;
    document.getElementById('product-form-container').style.display = 'block';
    document.getElementById('product-form-container').scrollIntoView({ behavior: 'smooth' });
  }
};

function toggleProductFieldsByCategory(category) {
  const isService = category === 'Service';
  const stockInput = document.getElementById('product-stock');
  const alertInput = document.getElementById('product-alert');
  
  if (isService) {
    stockInput.value = '99999';
    stockInput.disabled = true;
    alertInput.value = '0';
    alertInput.disabled = true;
  } else {
    stockInput.disabled = false;
    alertInput.disabled = false;
  }
}

// 5. POS View
function renderPOS() {
  // Render Product Catalog Cards
  const catalogContainer = document.getElementById('pos-catalog-container');
  catalogContainer.innerHTML = '';

  const searchVal = document.getElementById('pos-product-search').value.toLowerCase().trim();

  const posProducts = mockProducts.filter(p => {
    return (p.code.toLowerCase().includes(searchVal) || p.name.toLowerCase().includes(searchVal));
  });

  if (posProducts.length === 0) {
    catalogContainer.innerHTML = `<div class="text-center w-100 p-4">No matching items found.</div>`;
  } else {
    posProducts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'pos-product-card';
      
      let stockInfo = '';
      if (p.category === 'Service') {
        stockInfo = `<div class="pos-product-stock">Service</div>`;
      } else {
        const isLow = p.stock <= p.alertLevel;
        stockInfo = `<div class="pos-product-stock ${isLow ? 'low-stock' : ''}">Stock: ${p.stock} ${p.unit}</div>`;
      }

      card.innerHTML = `
        <div>
          <div class="pos-product-name">${p.name}</div>
          <div class="pos-product-code">${p.code}</div>
        </div>
        <div>
          <div class="pos-product-price">${formatCurrency(p.price)}</div>
          ${stockInfo}
        </div>
      `;

      card.addEventListener('click', () => {
        addToPOSCart(p.code);
      });
      catalogContainer.appendChild(card);
    });
  }

  renderPOSCartTable();
}

function addToPOSCart(code) {
  const product = mockProducts.find(p => p.code === code);
  if (!product) return;

  // Check if already in POS cart
  const cartItem = posCart.find(item => item.code === code);
  if (cartItem) {
    if (product.category !== 'Service' && cartItem.quantity >= product.stock) {
      alert(`Cannot add more. Insufficient stock for ${product.name}.`);
      return;
    }
    cartItem.quantity++;
  } else {
    if (product.category !== 'Service' && product.stock <= 0) {
      alert(`Insufficient stock for ${product.name}.`);
      return;
    }
    posCart.push({
      code: product.code,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit: product.unit,
      category: product.category
    });
  }

  renderPOSCartTable();
}

function renderPOSCartTable() {
  const tbody = document.getElementById('pos-cart-table-body');
  tbody.innerHTML = '';

  let total = 0;

  posCart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${item.name}</strong><br>
        <span class="text-muted" style="font-size:0.75rem">${item.code}</span>
      </td>
      <td>${formatCurrency(item.price)}</td>
      <td>
        <input type="number" min="1" value="${item.quantity}" style="width:60px; padding:0.2rem;" onchange="updatePOSCartQty(${index}, this.value)">
      </td>
      <td>${formatCurrency(subtotal)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removePOSCartItem(${index})">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('pos-cart-total').textContent = formatCurrency(total);
  calculatePOSChange();
}

window.updatePOSCartQty = function(index, val) {
  const qty = parseInt(val) || 1;
  const item = posCart[index];
  const originalProduct = mockProducts.find(p => p.code === item.code);

  if (originalProduct && originalProduct.category !== 'Service' && qty > originalProduct.stock) {
    alert(`Cannot set quantity to ${qty}. Only ${originalProduct.stock} left in stock.`);
    item.quantity = originalProduct.stock;
  } else {
    item.quantity = qty;
  }

  renderPOSCartTable();
};

window.removePOSCartItem = function(index) {
  posCart.splice(index, 1);
  renderPOSCartTable();
};

function calculatePOSChange() {
  const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tendered = parseFloat(document.getElementById('pos-amount-tendered').value) || 0;
  const changeDueDisplay = document.getElementById('pos-change-due');

  if (tendered >= total && total > 0) {
    const change = tendered - total;
    changeDueDisplay.textContent = formatCurrency(change);
    changeDueDisplay.style.color = 'var(--success-color)';
  } else {
    changeDueDisplay.textContent = '฿0.00';
    changeDueDisplay.style.color = 'var(--text-primary)';
  }
}

// 6. Settings View
function renderSettings() {
  document.getElementById('settings-clinic-name').value = currentClinicSettings.clinicName;
  document.getElementById('settings-clinic-address').value = currentClinicSettings.clinicAddress;
  document.getElementById('settings-clinic-tel').value = currentClinicSettings.clinicTel;
  document.getElementById('settings-practitioner').value = currentClinicSettings.defaultPractitioner;
  document.getElementById('settings-theme-select').value = currentClinicSettings.theme;
}

// --- DOM Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings via IPC/Defaults
  const settings = await getSettings();
  applyTheme(settings.theme);

  // Router Listeners
  window.addEventListener('hashchange', handleRouting);
  
  // 1. LOGIN Form submission
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const errorAlert = document.getElementById('login-error-msg');

    if (user === currentClinicSettings.username && pass === currentClinicSettings.password) {
      currentUser = user;
      document.getElementById('user-display-name').textContent = user === 'admin' ? 'Administrator' : user;
      errorAlert.style.display = 'none';
      errorAlert.textContent = '';
      navigateTo('dashboard');
      handleRouting();
    } else {
      errorAlert.textContent = 'Invalid username or password.';
      errorAlert.style.display = 'block';
    }
  });

  // LOGOUT button
  document.getElementById('btn-logout').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    activeVisitPatient = null;
    posCart = [];
    activePrescriptionCart = [];
    navigateTo('dashboard');
    handleRouting();
  });

  // 2. DASHBOARD filter handling
  document.getElementById('dashboard-filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const startStr = document.getElementById('filter-start-date').value;
    const endStr = document.getElementById('filter-end-date').value;
    
    if (!startStr || !endStr) return;

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999); // include entire end day

    // Filter transaction lists
    const filteredTransactions = mockTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    // Update transactions table body and counts
    let totalIncome = 0;
    let totalExpense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'Income') totalIncome += t.amount;
      else if (t.type === 'Expense') totalExpense += t.amount;
    });

    document.getElementById('stat-income').textContent = formatCurrency(totalIncome);
    document.getElementById('stat-expenses').textContent = formatCurrency(totalExpense);
    document.getElementById('stat-profit').textContent = formatCurrency(totalIncome - totalExpense);

    const tbody = document.getElementById('dashboard-transactions-table-body');
    tbody.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">No transactions in selected range.</td></tr>`;
    } else {
      [...filteredTransactions].reverse().forEach(t => {
        const tr = document.createElement('tr');
        const isIncome = t.type === 'Income';
        tr.innerHTML = `
          <td>${t.date}</td>
          <td><span class="badge-${isIncome ? 'ok-stock' : 'low-stock'}">${t.type}</span></td>
          <td>${t.description}</td>
          <td style="color: ${isIncome ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight:600;">
            ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  });

  // Reset Dashboard filters
  document.getElementById('btn-reset-filter').addEventListener('click', () => {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    renderDashboard();
  });

  // 3. PATIENTS Screen event listeners
  document.getElementById('btn-patient-search').addEventListener('click', renderPatients);
  document.getElementById('patient-search-input').addEventListener('input', renderPatients);
  document.getElementById('btn-patient-clear').addEventListener('click', () => {
    document.getElementById('patient-search-input').value = '';
    renderPatients();
  });

  document.getElementById('btn-add-patient-toggle').addEventListener('click', () => {
    // Clear form and toggle display
    document.getElementById('patient-form').reset();
    document.getElementById('patient-edit-hn').value = '';
    document.getElementById('patient-form-title').textContent = 'Register New Patient';
    
    const container = document.getElementById('patient-form-container');
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btn-cancel-patient-form').addEventListener('click', () => {
    document.getElementById('patient-form-container').style.display = 'none';
  });

  document.getElementById('btn-reset-patient-form').addEventListener('click', () => {
    document.getElementById('patient-form').reset();
  });

  document.getElementById('patient-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editHn = document.getElementById('patient-edit-hn').value;
    const name = document.getElementById('patient-name').value.trim();
    const gender = document.getElementById('patient-gender').value;
    const dob = document.getElementById('patient-dob').value;
    const phone = document.getElementById('patient-phone').value.trim();
    const address = document.getElementById('patient-address').value.trim();
    const history = document.getElementById('patient-history').value.trim();

    if (editHn) {
      // Edit existing patient
      const index = mockPatients.findIndex(p => p.hn === editHn);
      if (index !== -index) {
        mockPatients[index] = { hn: editHn, name, gender, dob, phone, address, history };
      }
    } else {
      // Register new patient - AutoHN generation
      let nextNum = 690003;
      if (mockPatients.length > 0) {
        // Parse current largest HN value
        const hns = mockPatients.map(p => parseInt(p.hn.replace('HN', '')) || 0);
        const maxHn = Math.max(...hns);
        if (maxHn >= 690000) {
          nextNum = maxHn + 1;
        }
      }
      const newHn = `HN${nextNum}`;
      mockPatients.push({ hn: newHn, name, gender, dob, phone, address, history });
    }

    // Reset, close and reload
    document.getElementById('patient-form').reset();
    document.getElementById('patient-form-container').style.display = 'none';
    renderPatients();
  });

  // 4. VISIT RECORD Form event listeners
  document.getElementById('vitals-weight').addEventListener('input', calculateBMI);
  document.getElementById('vitals-height').addEventListener('input', calculateBMI);
  document.getElementById('visit-doctor-fee').addEventListener('input', renderPrescriptionTable);

  document.getElementById('btn-add-presc-item').addEventListener('click', () => {
    const code = document.getElementById('presc-product-select').value;
    const qty = parseInt(document.getElementById('presc-qty').value) || 1;
    const instr = document.getElementById('presc-instructions').value.trim();

    if (!code) {
      alert("Please select a product or service.");
      return;
    }

    const prod = mockProducts.find(p => p.code === code);
    if (!prod) return;

    // Check stock availability
    if (prod.category !== 'Service') {
      const existingInPresc = activePrescriptionCart.find(item => item.code === code);
      const activePrescQty = existingInPresc ? existingInPresc.quantity : 0;
      if (prod.stock < (activePrescQty + qty)) {
        alert(`Insufficient stock. Only ${prod.stock} units available for ${prod.name}.`);
        return;
      }
    }

    const existingIndex = activePrescriptionCart.findIndex(item => item.code === code);
    if (existingIndex > -1) {
      activePrescriptionCart[existingIndex].quantity += qty;
      if (instr) {
        activePrescriptionCart[existingIndex].instructions = instr;
      }
    } else {
      activePrescriptionCart.push({
        code: prod.code,
        name: prod.name,
        price: prod.price,
        quantity: qty,
        instructions: instr,
        category: prod.category
      });
    }

    // Reset fields
    document.getElementById('presc-product-select').value = '';
    document.getElementById('presc-qty').value = '1';
    document.getElementById('presc-instructions').value = '';

    renderPrescriptionTable();
  });

  document.getElementById('visit-record-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const weight = parseFloat(document.getElementById('vitals-weight').value);
    const height = parseFloat(document.getElementById('vitals-height').value);
    const sys = parseInt(document.getElementById('vitals-bp-sys').value) || null;
    const dia = parseInt(document.getElementById('vitals-bp-dia').value) || null;
    const hr = parseInt(document.getElementById('vitals-hr').value) || null;
    const temp = parseFloat(document.getElementById('vitals-temp').value) || null;
    const rr = parseInt(document.getElementById('vitals-rr').value) || null;
    const bmi = document.getElementById('vitals-bmi-display').textContent;

    const symptoms = document.getElementById('visit-symptoms').value.trim();
    const diagnosis = document.getElementById('visit-diagnosis').value.trim();
    const doctorFee = parseFloat(document.getElementById('visit-doctor-fee').value) || 0;

    // Validate
    if (activePrescriptionCart.length === 0 && doctorFee === 0) {
      alert("Please prescribe some medications/services or add a consultation doctor fee.");
      return;
    }

    // Deduct stock levels in product database
    activePrescriptionCart.forEach(prescItem => {
      const product = mockProducts.find(p => p.code === prescItem.code);
      if (product && product.category !== 'Service') {
        product.stock = Math.max(0, product.stock - prescItem.quantity);
      }
    });

    // Create visit record
    const visitId = `v${mockVisits.length + 1}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const totalPrescVal = activePrescriptionCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = totalPrescVal + doctorFee;

    const newVisit = {
      id: visitId,
      hn: activeVisitPatient.hn,
      date: todayStr,
      vitals: { weight, height, bp_sys: sys, bp_dia: dia, hr, temp, rr, bmi: bmi === '-' ? null : parseFloat(bmi) },
      symptoms,
      diagnosis,
      prescriptions: [...activePrescriptionCart],
      doctorFee,
      totalPrice: grandTotal
    };

    mockVisits.push(newVisit);

    // Record Income Transaction
    mockTransactions.push({
      id: `t${mockTransactions.length + 1}`,
      date: todayStr,
      type: 'Income',
      description: `Visit Charge (${activeVisitPatient.hn})`,
      amount: grandTotal
    });

    // Clear visit form state
    activeVisitPatient = null;
    activePrescriptionCart = [];
    document.getElementById('visit-record-form').reset();
    document.getElementById('vitals-bmi-display').textContent = '-';

    alert("Clinical visit record saved successfully!");
    navigateTo('dashboard');
    handleRouting();
  });

  document.getElementById('btn-cancel-visit').addEventListener('click', () => {
    activeVisitPatient = null;
    activePrescriptionCart = [];
    document.getElementById('visit-record-form').reset();
    navigateTo('patients');
    handleRouting();
  });

  // 5. INVENTORY Screen event listeners
  document.getElementById('btn-inventory-search').addEventListener('click', renderInventory);
  document.getElementById('inventory-search-input').addEventListener('input', renderInventory);
  document.getElementById('btn-inventory-clear').addEventListener('click', () => {
    document.getElementById('inventory-search-input').value = '';
    renderInventory();
  });

  document.getElementById('product-category').addEventListener('change', (e) => {
    toggleProductFieldsByCategory(e.target.value);
  });

  document.getElementById('btn-add-product-toggle').addEventListener('click', () => {
    document.getElementById('product-form').reset();
    document.getElementById('product-edit-id').value = '';
    document.getElementById('product-stock').disabled = false;
    document.getElementById('product-alert').disabled = false;
    document.getElementById('product-form-title').textContent = 'Add New Product / Service';

    const container = document.getElementById('product-form-container');
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btn-cancel-product-form').addEventListener('click', () => {
    document.getElementById('product-form-container').style.display = 'none';
  });

  document.getElementById('btn-reset-product-form').addEventListener('click', () => {
    document.getElementById('product-form').reset();
  });

  document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('product-edit-id').value;
    const code = document.getElementById('product-code').value.trim().toUpperCase();
    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    const price = parseFloat(document.getElementById('product-price').value) || 0;
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    const alertLevel = parseInt(document.getElementById('product-alert').value) || 0;
    const unit = document.getElementById('product-unit').value.trim();

    if (editId) {
      // Edit existing product
      const idx = mockProducts.findIndex(p => p.id === editId);
      if (idx !== -1) {
        mockProducts[idx] = {
          id: editId,
          code,
          name,
          category,
          price,
          stock: category === 'Service' ? 99999 : stock,
          alertLevel: category === 'Service' ? 0 : alertLevel,
          unit
        };
      }
    } else {
      // Check code duplication
      if (mockProducts.some(p => p.code === code)) {
        alert("Product code already exists. Please choose a unique code.");
        return;
      }

      // Add new product
      const newId = `p${mockProducts.length + 1}`;
      mockProducts.push({
        id: newId,
        code,
        name,
        category,
        price,
        stock: category === 'Service' ? 99999 : stock,
        alertLevel: category === 'Service' ? 0 : alertLevel,
        unit
      });
    }

    document.getElementById('product-form').reset();
    document.getElementById('product-form-container').style.display = 'none';
    renderInventory();
  });

  // 6. POS Screen event listeners
  document.getElementById('pos-product-search').addEventListener('input', renderPOS);
  document.getElementById('pos-amount-tendered').addEventListener('input', calculatePOSChange);
  
  document.getElementById('btn-pos-clear-cart').addEventListener('click', () => {
    posCart = [];
    document.getElementById('pos-amount-tendered').value = '';
    renderPOSCartTable();
  });

  document.getElementById('btn-pos-checkout').addEventListener('click', () => {
    if (posCart.length === 0) {
      alert("Your shopping cart is empty.");
      return;
    }

    const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tendered = parseFloat(document.getElementById('pos-amount-tendered').value) || 0;

    if (tendered < total) {
      alert(`Insufficient cash tendered. Total is ${formatCurrency(total)}.`);
      return;
    }

    // Deduct stock and finalize checkout
    posCart.forEach(cartItem => {
      const prod = mockProducts.find(p => p.code === cartItem.code);
      if (prod && prod.category !== 'Service') {
        prod.stock = Math.max(0, prod.stock - cartItem.quantity);
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const transId = `t${mockTransactions.length + 1}`;
    
    // Add transaction
    mockTransactions.push({
      id: transId,
      date: todayStr,
      type: 'Income',
      description: `POS Direct Checkout [${posCart.length} items]`,
      amount: total
    });

    const change = tendered - total;

    alert(`POS Checkout Completed!\nTotal: ${formatCurrency(total)}\nTendered: ${formatCurrency(tendered)}\nChange: ${formatCurrency(change)}`);

    // Reset checkout states
    posCart = [];
    document.getElementById('pos-amount-tendered').value = '';
    document.getElementById('pos-change-due').textContent = '฿0.00';

    renderPOS();
  });

  // 7. SETTINGS Screen event listeners
  document.getElementById('settings-theme-select').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  document.getElementById('settings-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('settings-clinic-name').value.trim();
    const address = document.getElementById('settings-clinic-address').value.trim();
    const tel = document.getElementById('settings-clinic-tel').value.trim();
    const practitioner = document.getElementById('settings-practitioner').value.trim();
    const theme = document.getElementById('settings-theme-select').value;

    const updatedSettings = {
      ...currentClinicSettings,
      clinicName: name,
      clinicAddress: address,
      clinicTel: tel,
      defaultPractitioner: practitioner,
      theme: theme
    };

    await saveSettings(updatedSettings);

    // Sync views
    document.getElementById('sidebar-clinic-name').textContent = name;
    document.getElementById('topbar-practitioner').textContent = practitioner;
    document.getElementById('topbar-tel').textContent = tel;
    applyTheme(theme);

    const alertMsg = document.getElementById('settings-profile-success');
    alertMsg.style.display = 'block';
    setTimeout(() => { alertMsg.style.display = 'none'; }, 3000);
  });

  document.getElementById('settings-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const curr = document.getElementById('settings-curr-pass').value;
    const newPass = document.getElementById('settings-new-pass').value;
    const confPass = document.getElementById('settings-confirm-pass').value;
    const successAlert = document.getElementById('settings-password-success');
    const errorAlert = document.getElementById('settings-password-error');

    successAlert.style.display = 'none';
    errorAlert.style.display = 'none';

    if (curr !== currentClinicSettings.password) {
      errorAlert.textContent = 'Current password is incorrect.';
      errorAlert.style.display = 'block';
      return;
    }

    if (newPass !== confPass) {
      errorAlert.textContent = 'New passwords do not match.';
      errorAlert.style.display = 'block';
      return;
    }

    if (newPass.length < 4) {
      errorAlert.textContent = 'Password must be at least 4 characters long.';
      errorAlert.style.display = 'block';
      return;
    }

    const updatedSettings = {
      ...currentClinicSettings,
      password: newPass
    };

    await saveSettings(updatedSettings);

    document.getElementById('settings-password-form').reset();
    successAlert.style.display = 'block';
    setTimeout(() => { successAlert.style.display = 'none'; }, 3000);
  });

  // Initial Routing Execution
  handleRouting();
});
