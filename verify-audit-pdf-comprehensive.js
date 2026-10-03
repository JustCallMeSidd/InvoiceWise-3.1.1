const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 VERIFYING AUDIT PDF ENGINE — COMPREHENSIVE MULTI-MODULE TEST');
console.log('================================================================\n');

// 1. Load actual data files
const appState = {
  rawMaterials: (JSON.parse(fs.readFileSync('data/raw_materials.json', 'utf8'))).raw_materials || [],
  rawMaterialBatches: (JSON.parse(fs.readFileSync('data/raw_material_batches.json', 'utf8'))).raw_material_batches || [],
  rawMaterialTxns: (JSON.parse(fs.readFileSync('data/raw_material_transactions.json', 'utf8'))).raw_material_transactions || [],
  manufacturingAudit: (JSON.parse(fs.readFileSync('data/manufacturing_audit.json', 'utf8'))).manufacturing_audit || (JSON.parse(fs.readFileSync('data/manufacturing_audit.json', 'utf8'))).entries || [],
  batches: (JSON.parse(fs.readFileSync('data/manufacturing_batches.json', 'utf8'))).manufacturing_batches || [],
  finishedGoods: (JSON.parse(fs.readFileSync('data/finished_goods.json', 'utf8'))).finished_goods || [],
  finishedGoodsTxns: (JSON.parse(fs.readFileSync('data/finished_goods_transactions.json', 'utf8'))).finished_goods_transactions || [],
  invoices: (JSON.parse(fs.readFileSync('data/invoices.json', 'utf8'))).invoices || [],
  settings: JSON.parse(fs.readFileSync('data/settings.json', 'utf8'))
};

// 2. Mock browser environment to load invoice-print.js
let capturedFn = null;
global.window = {
  printAuditLedger: null,
  printInvoice: null,
  printManufacturingBatch: null
};

// Read invoice-print.js
const invoicePrintCode = fs.readFileSync('public/invoice-print.js', 'utf8');

// Evaluate inside VM or sandbox
const vm = require('vm');
const context = vm.createContext({
  window: global.window,
  Date: Date,
  Number: Number,
  String: String,
  alert: console.log,
  console: console
});

try {
  vm.runInContext(invoicePrintCode, context);
  console.log('✅ PASS: public/invoice-print.js evaluated successfully without syntax errors');
} catch (e) {
  console.error('❌ FAIL: Syntax error evaluating public/invoice-print.js:', e);
  process.exit(1);
}

// Extract generateAuditLedgerHTML from window.printAuditLedger or regex
// Let's test the HTML output generator:
// In context, we can override window.open to intercept the HTML
let generatedHTML = '';
context.window.open = function(url, target, features) {
  return {
    document: {
      open: () => {},
      write: (html) => { generatedHTML += html; },
      close: () => {}
    }
  };
};

context.window.printAuditLedger(appState, null, appState.settings);

console.log('Generated HTML Size:', (generatedHTML.length / 1024).toFixed(2), 'KB');

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('\n📋 [ASSERTION GROUP 1: Document Structure & Executive Header]');
assert(generatedHTML.includes('<!DOCTYPE html>'), 'Generated document is valid HTML5');
assert(generatedHTML.includes('Comprehensive Audit &amp; Traceability Dossier') || generatedHTML.includes('Comprehensive Audit & Traceability Dossier'), 'Contains executive dossier title');
assert(generatedHTML.includes(appState.settings.businessName), 'Contains company business name');
assert(generatedHTML.includes(appState.settings.businessGstin || appState.settings.gstin), 'Contains company GSTIN');
assert(generatedHTML.includes(appState.settings.businessPan || appState.settings.pan), 'Contains company PAN');
assert(generatedHTML.includes('no-print-bar'), 'Includes screen navigation action bar');
assert(generatedHTML.includes('Print / Save as PDF'), 'Includes Print / Save as PDF action button');

console.log('\n📦 [ASSERTION GROUP 2: Section 1 — Raw Material Inward & Movements]');
assert(generatedHTML.includes('Section 1: Raw Materials Inward'), 'Contains Section 1 Header');
assert(generatedHTML.includes('Supplier Batch / Lot #'), 'Contains Supplier Batch / Lot # column');
assert(generatedHTML.includes('Balance Stock'), 'Contains Balance Stock column');
assert(generatedHTML.includes('Purchase Date'), 'Contains Purchase Date column');
// Check that raw materials from our dataset are present
const sampleRM = appState.rawMaterialBatches[0] || appState.rawMaterials[0];
if (sampleRM) {
  const rmName = sampleRM.rawMaterialName || sampleRM.name;
  assert(generatedHTML.includes(rmName.replace(/&/g, '&amp;')), `Contains raw material record: ${rmName}`);
}

console.log('\n⚙️ [ASSERTION GROUP 3: Section 2 — Manufacturing Runs & Consumptions]');
assert(generatedHTML.includes('Section 2: Manufacturing Production Runs'), 'Contains Section 2 Header');
assert(generatedHTML.includes('MFG Batch ID'), 'Contains MFG Batch ID column');
assert(generatedHTML.includes('BOM Recipe &amp; Version') || generatedHTML.includes('BOM Recipe & Version'), 'Contains Recipe & Version column');
assert(generatedHTML.includes('Consumed Raw Material'), 'Contains Consumed Raw Material column');
assert(generatedHTML.includes('Product Output'), 'Contains Product Output column');
assert(generatedHTML.includes('Produced Yield'), 'Contains Produced Yield column');
assert(generatedHTML.includes('Operator'), 'Contains Operator column');
const sampleMfg = appState.batches[0];
if (sampleMfg) {
  assert(generatedHTML.includes(sampleMfg.batchNumber || sampleMfg.id), `Contains batch ID: ${sampleMfg.batchNumber || sampleMfg.id}`);
  assert(generatedHTML.includes(sampleMfg.recipeName.replace(/&/g, '&amp;')), `Contains recipe name: ${sampleMfg.recipeName}`);
}

console.log('\n🧴 [ASSERTION GROUP 4: Section 3 — Finished Goods Movement Ledger]');
assert(generatedHTML.includes('Section 3: Finished Goods Pool &amp; Packaging Movement') || generatedHTML.includes('Section 3: Finished Goods Pool & Packaging Movement'), 'Contains Section 3 Header');
assert(generatedHTML.includes('FG Batch Lot #'), 'Contains FG Batch Lot # column');
assert(generatedHTML.includes('Linked MFG Batch'), 'Contains Linked MFG Batch column');
assert(generatedHTML.includes('Remaining Stock'), 'Contains Remaining Stock column');
const sampleFG = appState.finishedGoodsTxns[0];
if (sampleFG) {
  assert(generatedHTML.includes(sampleFG.batchNumber || sampleFG.productId), 'Contains finished goods transaction records');
}

console.log('\n💰 [ASSERTION GROUP 5: Section 4 — Sales Invoices & Customer Billing]');
assert(generatedHTML.includes('Section 4: Sales Invoices &amp; Revenue Audit') || generatedHTML.includes('Section 4: Sales Invoices & Revenue Audit'), 'Contains Section 4 Header');
assert(generatedHTML.includes('Invoice #'), 'Contains Invoice # column');
assert(generatedHTML.includes('Customer Name'), 'Contains Customer Name column');
assert(generatedHTML.includes('Customer GSTIN / State') || generatedHTML.includes('GSTIN / State'), 'Contains Customer GSTIN/State column');
assert(generatedHTML.includes('Billed Items &amp; Quantities') || generatedHTML.includes('Billed Items & Quantities'), 'Contains Billed Items column');
assert(generatedHTML.includes('Taxable (₹)'), 'Contains Taxable amount column');
assert(generatedHTML.includes('GST Tax (₹)'), 'Contains GST Tax column');
assert(generatedHTML.includes('Grand Total (₹)'), 'Contains Grand Total column');
const sampleInv = appState.invoices[0];
if (sampleInv) {
  assert(generatedHTML.includes(sampleInv.invoiceNumber), `Contains invoice number: ${sampleInv.invoiceNumber}`);
  assert(generatedHTML.includes(sampleInv.customerName.replace(/&/g, '&amp;')), `Contains customer name: ${sampleInv.customerName}`);
}

console.log('\n🔗 [ASSERTION GROUP 6: Section 5 — Master Chronological Stream & Attestation]');
assert(generatedHTML.includes('Section 5: Master Unified Chronological Event Stream'), 'Contains Section 5 Header');
assert(generatedHTML.includes('Primary Ref / Lot #'), 'Contains Primary Ref / Lot # column');
assert(generatedHTML.includes('Lead Production Pharmacist / Chemist'), 'Contains Lead Pharmacist sign-off block');
assert(generatedHTML.includes('QA Compliance Auditor (FDA / GMP / ISO)'), 'Contains QA Compliance Auditor sign-off block');
assert(generatedHTML.includes('Executive Officer / Plant Director'), 'Contains Executive Officer sign-off block');
assert(generatedHTML.includes('Rule 46 GST, GMP &amp; FDA 21 CFR Part 11 Compliant') || generatedHTML.includes('Rule 46 GST, GMP & FDA 21 CFR Part 11 Compliant'), 'Contains regulatory compliance badge in footer');

console.log('\n================================================================');
console.log(`TOTAL AUDIT PDF ASSERTIONS: ${totalAssertions} | ✅ PASSED: ${passedAssertions} | ❌ FAILED: ${totalAssertions - passedAssertions}`);
console.log('================================================================\n');

if (passedAssertions !== totalAssertions) {
  process.exit(1);
}
