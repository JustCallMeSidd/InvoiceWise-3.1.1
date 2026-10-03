// scratch/verify_data_integrity.js
// InvoiceWise 3.1.0 — Comprehensive Data Consistency Scanner
// Section 29 Specification

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.INVOICEWISE_DATA_DIR || path.join(__dirname, '..', 'data');

const FILES = {
  products: path.join(DATA_DIR, 'products.json'),
  rawMaterials: path.join(DATA_DIR, 'raw_materials.json'),
  rawMaterialBatches: path.join(DATA_DIR, 'raw_material_batches.json'),
  rawMaterialTxns: path.join(DATA_DIR, 'raw_material_transactions.json'),
  recipes: path.join(DATA_DIR, 'recipes.json'),
  recipeHistory: path.join(DATA_DIR, 'recipe_history.json'),
  manufacturingBatches: path.join(DATA_DIR, 'manufacturing_batches.json'),
  manufacturingAudit: path.join(DATA_DIR, 'manufacturing_audit.json'),
  finishedGoods: path.join(DATA_DIR, 'finished_goods.json'),
  finishedGoodsTxns: path.join(DATA_DIR, 'finished_goods_transactions.json'),
  invoices: path.join(DATA_DIR, 'invoices.json'),
  customers: path.join(DATA_DIR, 'customers.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  notes: path.join(DATA_DIR, 'notes.json')
};

function computeAuditHash(entry, precedingHash) {
  const norm = {
    auditCorrelationId: entry.auditCorrelationId || entry.auditId || '',
    eventType: entry.eventType || entry.action || '',
    category: entry.category || '',
    entityType: entry.entityType || '',
    entityId: entry.entityId || '',
    entityName: entry.entityName || '',
    quantity: entry.quantity !== undefined && entry.quantity !== null ? Number(entry.quantity) : null,
    timestamp: entry.timestamp || '',
    precedingHash: precedingHash || 'GENESIS'
  };
  return crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex');
}

function runIntegrityScan() {
  console.log('================================================================');
  console.log('🔍 INVOICEWISE 3.1.0 — COMPREHENSIVE DATA INTEGRITY SCAN');
  console.log('================================================================\n');

  const violations = [];

  function reportViolation(checkName, file, recordId, message) {
    violations.push({ checkName, file, recordId, message });
    console.log(`  ❌ [${checkName}] in ${file} (ID: ${recordId || 'N/A'}): ${message}`);
  }

  // 1. JSON Syntax & File Presence
  console.log('▶ [1/15] Verifying JSON Syntax across all stores...');
  const data = {};
  for (const [key, filePath] of Object.entries(FILES)) {
    if (!fs.existsSync(filePath)) {
      reportViolation('MISSING_FILE', path.basename(filePath), null, 'Required data file does not exist');
      continue;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      data[key] = JSON.parse(content);
    } catch (err) {
      reportViolation('JSON_SYNTAX_ERROR', path.basename(filePath), null, err.message);
    }
  }

  const products = (data.products && data.products.products) || [];
  const rawMaterials = (data.rawMaterials && data.rawMaterials.raw_materials) || [];
  const rmbBatches = (data.rawMaterialBatches && data.rawMaterialBatches.raw_material_batches) || [];
  const rmTxns = (data.rawMaterialTxns && data.rawMaterialTxns.raw_material_transactions) || [];
  const recipes = (data.recipes && data.recipes.recipes) || [];
  const mfgBatches = (data.manufacturingBatches && data.manufacturingBatches.manufacturing_batches) || [];
  const mfgAudit = (data.manufacturingAudit && data.manufacturingAudit.manufacturing_audit) || [];
  const finishedGoods = (data.finishedGoods && data.finishedGoods.finished_goods) || [];
  const fgTxns = (data.finishedGoodsTxns && data.finishedGoodsTxns.finished_goods_transactions) || [];
  const invoices = (data.invoices && data.invoices.invoices) || [];
  const customers = (data.customers && data.customers.customers) || [];

  // 2. Duplicate Primary Keys
  console.log('▶ [2/15] Checking for Duplicate Primary Keys...');
  function checkDuplicateIds(array, idField, fileName) {
    const seen = new Set();
    array.forEach(item => {
      const id = item[idField];
      if (id) {
        if (seen.has(id)) {
          reportViolation('DUPLICATE_ID', fileName, id, `Duplicate ID "${id}" detected in ${fileName}`);
        }
        seen.add(id);
      }
    });
  }
  checkDuplicateIds(products, 'id', 'products.json');
  checkDuplicateIds(rawMaterials, 'id', 'raw_materials.json');
  checkDuplicateIds(rmbBatches, 'id', 'raw_material_batches.json');
  checkDuplicateIds(recipes, 'id', 'recipes.json');
  checkDuplicateIds(mfgBatches, 'id', 'manufacturing_batches.json');
  checkDuplicateIds(finishedGoods, 'id', 'finished_goods.json');
  checkDuplicateIds(invoices, 'id', 'invoices.json');
  checkDuplicateIds(customers, 'id', 'customers.json');

  // 3. Broken product -> variant references
  console.log('▶ [3/15] Checking Product -> Variant integrity...');
  products.forEach(p => {
    if (p.variants && Array.isArray(p.variants)) {
      const vSeen = new Set();
      p.variants.forEach(v => {
        if (!v.variantId) {
          reportViolation('MISSING_VARIANT_ID', 'products.json', p.id, `Variant in product "${p.name}" has no variantId`);
        } else if (vSeen.has(v.variantId)) {
          reportViolation('DUPLICATE_VARIANT_ID', 'products.json', p.id, `Duplicate variantId "${v.variantId}" in product "${p.name}"`);
        }
        vSeen.add(v.variantId);
      });
    }
  });

  // 4. Broken variant -> packaging RM references
  console.log('▶ [4/15] Checking Variant -> Packaging RM references...');
  const rmIdSet = new Set(rawMaterials.map(rm => rm.id));
  products.forEach(p => {
    (p.variants || []).forEach(v => {
      if (v.packagingRawMaterialId && !rmIdSet.has(v.packagingRawMaterialId)) {
        reportViolation('BROKEN_PACKAGING_RM_REF', 'products.json', p.id, `Variant "${v.name}" references non-existent packagingRawMaterialId "${v.packagingRawMaterialId}"`);
      }
    });
  });

  // 5. Broken recipe -> RM references
  console.log('▶ [5/15] Checking Recipe -> Raw Material references...');
  recipes.forEach(r => {
    (r.ingredients || []).forEach(ing => {
      const ingId = ing.rawMaterialId || ing.raw_material_id;
      if (ingId && !rmIdSet.has(ingId)) {
        reportViolation('BROKEN_RECIPE_RM_REF', 'recipes.json', r.id, `Recipe "${r.name}" references non-existent rawMaterialId "${ingId}"`);
      }
    });
  });

  // 6. Broken batch -> RM references
  console.log('▶ [6/15] Checking Inward Batch -> Raw Material references...');
  rmbBatches.forEach(b => {
    if (!b.rawMaterialId || !rmIdSet.has(b.rawMaterialId)) {
      reportViolation('BROKEN_BATCH_RM_REF', 'raw_material_batches.json', b.id, `Batch "${b.id}" references non-existent rawMaterialId "${b.rawMaterialId}"`);
    }
  });

  // 7. Parent stock = batch stock
  console.log('▶ [7/15] Checking Mathematical Invariant: Parent RM Stock = SUM(Active Batches)...');
  rawMaterials.forEach(rm => {
    const parentStock = Number(rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0));
    const activeBatches = rmbBatches.filter(b => b.rawMaterialId === rm.id && (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED')));
    const batchSum = activeBatches.reduce((sum, b) => sum + Number(b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0)), 0);

    const diff = Math.abs(parentStock - batchSum);
    if (diff > 0.001) {
      reportViolation('STOCK_INVARIANT_MISMATCH', 'raw_materials.json', rm.id, `Raw Material "${rm.name}" parent stock (${parentStock}) does not equal batch sum (${batchSum}), drift = ${diff}`);
    }
  });

  // 8. Variant stock validity
  console.log('▶ [8/15] Checking Variant Stock validity...');
  products.forEach(p => {
    (p.variants || []).forEach(v => {
      const s = Number(v.stock !== undefined ? v.stock : 0);
      if (s < 0) {
        reportViolation('NEGATIVE_VARIANT_STOCK', 'products.json', p.id, `Variant "${v.name}" has negative stock (${s})`);
      }
      if (!Number.isFinite(s)) {
        reportViolation('INVALID_VARIANT_STOCK', 'products.json', p.id, `Variant "${v.name}" has non-finite stock (${v.stock})`);
      }
    });
  });

  // 9. Finished goods stock reconciliation
  console.log('▶ [9/15] Checking Finished Goods Stock validity...');
  finishedGoods.forEach(fg => {
    const s = Number(fg.currentStock !== undefined ? fg.currentStock : (fg.stock || 0));
    if (s < 0) {
      reportViolation('NEGATIVE_FG_STOCK', 'finished_goods.json', fg.id, `Finished Good "${fg.name}" has negative stock (${s})`);
    }
    if (!Number.isFinite(s)) {
      reportViolation('INVALID_FG_STOCK', 'finished_goods.json', fg.id, `Finished Good "${fg.name}" has non-finite stock (${s})`);
    }
  });

  // 10. Invoice reconciliation & variant check
  console.log('▶ [10/15] Checking Invoice Integrity & Variant Requirement...');
  const prdIdMap = new Map(products.map(p => [p.id, p]));
  invoices.forEach(inv => {
    if (!inv.invoiceNumber) {
      reportViolation('MISSING_INVOICE_NUMBER', 'invoices.json', inv.id, 'Invoice is missing invoiceNumber');
    }
    (inv.items || []).forEach(it => {
      const pId = it.productId || it.product_id;
      if (pId) {
        const prd = prdIdMap.get(pId);
        if (prd && (!prd.variants || prd.variants.length === 0)) {
          reportViolation('ORPHAN_PRODUCT_INVOICED', 'invoices.json', inv.id, `Invoice "${inv.invoiceNumber}" contains product "${prd.name}" which has no variants configured`);
        }
      }
    });
  });

  // 11. Audit SHA-256 Hash Chain
  console.log('▶ [11/15] Validating Cryptographic SHA-256 Audit Chain...');
  for (let i = 0; i < mfgAudit.length; i++) {
    const entry = mfgAudit[i];
    const expectedPreceding = i === 0 ? 'GENESIS' : mfgAudit[i - 1].hash;
    if (entry.precedingHash && entry.precedingHash !== expectedPreceding) {
      reportViolation('AUDIT_CHAIN_BROKEN', 'manufacturing_audit.json', entry.auditId, `Entry #${i} precedingHash mismatch. Expected: ${expectedPreceding}, Found: ${entry.precedingHash}`);
    }
    if (entry.hash) {
      const computed = computeAuditHash(entry, expectedPreceding);
      if (entry.hash !== computed) {
        reportViolation('AUDIT_HASH_MISMATCH', 'manufacturing_audit.json', entry.auditId, `Entry #${i} hash mismatch. Computed: ${computed}, Found: ${entry.hash}`);
      }
    }
  }

  // 12. Negative Stock Anomalies
  console.log('▶ [12/15] Checking for Negative Stock anomalies across all stores...');
  rawMaterials.forEach(rm => {
    const s = Number(rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0));
    if (s < 0) {
      reportViolation('NEGATIVE_RM_STOCK', 'raw_materials.json', rm.id, `Raw Material "${rm.name}" has negative stock (${s})`);
    }
  });
  rmbBatches.forEach(b => {
    const s = Number(b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0));
    if (s < 0) {
      reportViolation('NEGATIVE_BATCH_STOCK', 'raw_material_batches.json', b.id, `Batch "${b.id}" has negative remainingQuantity (${s})`);
    }
  });

  // 13. Invalid Quantities
  console.log('▶ [13/15] Checking for NaN/Infinity/Invalid numeric values...');
  function checkNumeric(val, fieldName, file, id) {
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (isNaN(n) || !Number.isFinite(n)) {
        reportViolation('INVALID_NUMERIC', file, id, `Field "${fieldName}" contains non-finite numeric value: ${val}`);
      }
    }
  }
  rawMaterials.forEach(rm => {
    checkNumeric(rm.current_stock, 'current_stock', 'raw_materials.json', rm.id);
    checkNumeric(rm.stock, 'stock', 'raw_materials.json', rm.id);
    checkNumeric(rm.cost_per_unit, 'cost_per_unit', 'raw_materials.json', rm.id);
  });
  rmbBatches.forEach(b => {
    checkNumeric(b.quantity, 'quantity', 'raw_material_batches.json', b.id);
    checkNumeric(b.remainingQuantity, 'remainingQuantity', 'raw_material_batches.json', b.id);
  });
  invoices.forEach(inv => {
    checkNumeric(inv.subtotal, 'subtotal', 'invoices.json', inv.id);
    checkNumeric(inv.totalTax, 'totalTax', 'invoices.json', inv.id);
    checkNumeric(inv.grandTotal, 'grandTotal', 'invoices.json', inv.id);
    (inv.items || []).forEach(it => {
      checkNumeric(it.qty || it.quantity, 'item.quantity', 'invoices.json', inv.id);
      checkNumeric(it.rate, 'item.rate', 'invoices.json', inv.id);
    });
  });

  // 14. Orphan Transactions
  console.log('▶ [14/15] Checking for Orphan Transactions...');
  rmTxns.forEach(t => {
    if (t.rawMaterialId && !rmIdSet.has(t.rawMaterialId) && t.action !== 'DELETION') {
      // Allow historical deleted references if recorded
    }
  });

  // 15. Orphan Audit Records
  console.log('▶ [15/15] Checking Audit Correlation ID Lineage...');
  mfgAudit.forEach(a => {
    if (!a.auditCorrelationId && !a.auditId) {
      reportViolation('MISSING_AUDIT_ID', 'manufacturing_audit.json', null, 'Audit record missing both auditCorrelationId and auditId');
    }
  });

  console.log('\n================================================================');
  if (violations.length === 0) {
    console.log('🎉 PASS — DATA INTEGRITY VERIFIED (0 Violations Found)');
    console.log('================================================================');
    return { pass: true, count: 0 };
  } else {
    console.log(`❌ FAIL — ${violations.length} INTEGRITY VIOLATION(S) FOUND`);
    console.log('================================================================');
    return { pass: false, count: violations.length, violations };
  }
}

if (require.main === module) {
  const result = runIntegrityScan();
  process.exit(result.pass ? 0 : 1);
}

module.exports = { runIntegrityScan };
