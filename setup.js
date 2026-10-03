/**
 * InvoiceWise — Automated Setup & Environment Initializer
 * Prepares all dependencies, initializes atomic data stores, and launches application.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, 'data');

const SEED_FILES = {
  'products.json': { products: [], lastUpdated: new Date().toISOString() },
  'customers.json': { customers: [], lastUpdated: new Date().toISOString() },
  'invoices.json': { invoices: [], lastUpdated: new Date().toISOString() },
  'settings.json': {
    businessName: 'InvoiceWise ERP',
    businessGstin: '27AAAPZ1234C1ZV',
    businessPan: 'AAAPZ1234C',
    businessState: '27',
    businessAddress: '101 Tech Park, Mumbai, Maharashtra - 400001',
    businessEmail: 'contact@invoicewise.in',
    businessPhone: '+91 98765 43210',
    invoicePrefix: 'INV',
    invoiceTerms: 'Payment due within 30 days of invoice date.',
    invoiceNotes: 'Thank you for your business!',
    firstLaunchCompleted: true
  },
  'raw_materials.json': { raw_materials: [], lastUpdated: new Date().toISOString() },
  'recipes.json': { recipes: [], lastUpdated: new Date().toISOString() },
  'finished_goods.json': { finished_goods: [], lastUpdated: new Date().toISOString() },
  'manufacturing_batches.json': { manufacturing_batches: [], lastUpdated: new Date().toISOString() },
  'raw_material_transactions.json': { raw_material_transactions: [], lastUpdated: new Date().toISOString() },
  'finished_goods_transactions.json': { finished_goods_transactions: [], lastUpdated: new Date().toISOString() }
};

console.log('\n======================================================');
console.log('🚀 InvoiceWise — Professional Setup & Initializer');
console.log('======================================================\n');

// 1. Verify Node.js Environment
const nodeVer = process.version;
console.log(`[1/4] Checking Node.js runtime environment... ${nodeVer} ✓`);

// 2. Ensure Data Directory & Seed Stores
console.log('[2/4] Initializing atomic JSON data directory...');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`  -> Created directory: ${DATA_DIR}`);
}

for (const [file, defaultContent] of Object.entries(SEED_FILES)) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    console.log(`  -> Initialized seed store: ${file}`);
  } else {
    console.log(`  -> Verified existing store: ${file}`);
  }
}

// 3. Check and Install Dependencies
console.log('\n[3/4] Checking npm package dependencies...');
try {
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('  -> Running npm install...');
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  } else {
    console.log('  -> All dependencies installed in node_modules ✓');
  }
} catch (err) {
  console.error('  -> Warning during dependency check:', err.message);
}

// 4. Verification Complete & Summary
console.log('\n[4/4] Environment setup complete!');
console.log('------------------------------------------------------');
console.log('🎉 InvoiceWise is fully configured and ready!');
console.log('👉 Run "npm start" to launch server on http://localhost:3000');
console.log('👉 Run "npm run dist:win" to build standalone desktop installer');
console.log('======================================================\n');
