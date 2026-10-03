/**
 * InvoiceWise 3.1.0 — Production Deployment Data Sanitizer
 * Cleans all sample data and prepares atomic JSON data stores for deployment.
 * Sanitizes both the repository data folder and the Electron Windows AppData folder.
 */

const fs = require('fs');
const path = require('path');

const now = new Date().toISOString();

const CLEAN_STORES = {
  'products.json': { products: [], lastUpdated: now },
  'customers.json': { customers: [], lastUpdated: now },
  'invoices.json': { invoices: [], lastInvoiceSeq: 0, lastUpdated: now },
  'settings.json': {
    companyName: '',
    businessName: '',
    businessGstin: '',
    businessPan: '',
    businessState: '',
    businessStateCode: '',
    businessAddress: '',
    businessEmail: '',
    businessPhone: '',
    businessWebsite: '',
    businessBankName: '',
    businessBankAcc: '',
    businessBankIFSC: '',
    invoicePrefix: 'INV-',
    invoiceTerms: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.\n3. Subject to local jurisdiction only.',
    invoiceNotes: 'Thank you for your business!',
    firstLaunchCompleted: false,
    userName: '',
    businessPAN: '',
    businessGSTIN: '',
    apiKey: '',
    modelName: 'google/gemma-4-26b-a4b-it:free'
  },
  'raw_materials.json': { raw_materials: [], lastUpdated: now },
  'raw_material_batches.json': { raw_material_batches: [], lastUpdated: now },
  'recipes.json': { recipes: [], lastUpdated: now },
  'recipe_history.json': { recipe_history: [], lastUpdated: now },
  'finished_goods.json': { finished_goods: [], lastUpdated: now },
  'manufacturing_batches.json': { manufacturing_batches: [], lastUpdated: now },
  'manufacturing_audit.json': { manufacturing_audit: [], lastUpdated: now },
  'raw_material_transactions.json': { raw_material_transactions: [], lastUpdated: now },
  'finished_goods_transactions.json': { finished_goods_transactions: [], lastUpdated: now },
  'notes.json': { notes: '' }
};

const TARGET_DIRS = [
  path.join(__dirname, 'data'),
  process.env.APPDATA ? path.join(process.env.APPDATA, 'InvoiceWise', 'InvoiceWiseData') : null
].filter(Boolean);

console.log('\n======================================================');
console.log('🧹 InvoiceWise 3.1.0 — Production Data Sanitizer');
console.log('======================================================\n');

for (const dir of TARGET_DIRS) {
  console.log(`Processing directory: ${dir}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Remove temporary backup and scratch files
  const filesInDir = fs.readdirSync(dir);
  for (const file of filesInDir) {
    if (
      file.startsWith('pre_import_backup') ||
      file.endsWith('.bak') ||
      file.endsWith('.tmp') ||
      (!CLEAN_STORES[file] && file !== '.version')
    ) {
      const fullPath = path.join(dir, file);
      try {
        if (fs.statSync(fullPath).isFile()) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed scratch/backup file: ${file}`);
        }
      } catch (err) {}
    }
  }

  // 2. Write pristine clean data stores
  for (const [filename, content] of Object.entries(CLEAN_STORES)) {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`  ✓ Sanitized: ${filename}`);
  }

  // 3. Write version tag
  fs.writeFileSync(path.join(dir, '.version'), '3.1.1', 'utf8');
  console.log(`  ✓ Version tagged: 3.1.1\n`);
}

console.log('------------------------------------------------------');
console.log('✅ All old test data removed from project and AppData!');
console.log('🚀 System is 100% sanitized and ready for fresh deployment!');
console.log('======================================================\n');
