const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const unitConv = require('./unitConversion');
const ExcelJS = require('exceljs');
const crypto = require('crypto');

const app = express();
let PORT = parseInt(process.env.PORT, 10) || 3000;

// ─── Data paths ───────────────────────────────────────────────────────────────
const DATA_DIR       = process.env.INVOICEWISE_DATA_DIR || path.join(__dirname, 'data');
const PRODUCTS_FILE  = path.join(DATA_DIR, 'products.json');
const SETTINGS_FILE  = path.join(DATA_DIR, 'settings.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const INVOICES_FILE  = path.join(DATA_DIR, 'invoices.json');

// Inventory paths
const RAW_MATERIALS_FILE         = path.join(DATA_DIR, 'raw_materials.json');
const RECIPES_FILE               = path.join(DATA_DIR, 'recipes.json');
const RECIPE_HISTORY_FILE        = path.join(DATA_DIR, 'recipe_history.json');
const MANUFACTURING_BATCHES_FILE = path.join(DATA_DIR, 'manufacturing_batches.json');
const MANUFACTURING_AUDIT_FILE   = path.join(DATA_DIR, 'manufacturing_audit.json');
const RAW_MAT_TXN_FILE          = path.join(DATA_DIR, 'raw_material_transactions.json');
const RAW_MATERIAL_BATCHES_FILE  = path.join(DATA_DIR, 'raw_material_batches.json');
const FINISHED_GOODS_FILE        = path.join(DATA_DIR, 'finished_goods.json');
const FG_TXN_FILE               = path.join(DATA_DIR, 'finished_goods_transactions.json');
const NOTES_FILE                = path.join(DATA_DIR, 'notes.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const initFile = (file, defaults) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
};

initFile(PRODUCTS_FILE,  { products: [], lastUpdated: new Date().toISOString() });
initFile(CUSTOMERS_FILE, { customers: [], lastUpdated: new Date().toISOString() });
initFile(INVOICES_FILE,  { invoices: [], lastInvoiceSeq: 0, lastUpdated: new Date().toISOString() });
initFile(NOTES_FILE,     { notes: '' });
initFile(SETTINGS_FILE, {
  apiKey: '',
  modelName: 'google/gemma-4-26b-a4b-it:free',
  businessName: '',
  businessGSTIN: '',
  businessAddress: '',
  businessStateCode: '',
  businessState: '',
  businessEmail: '',
  businessPhone: '',
  businessPAN: '',
  businessWebsite: '',
  businessBankName: '',
  businessBankAcc: '',
  businessBankIFSC: '',
  businessLogoBase64: '',
  invoicePrefix: 'INV',
  invoiceTerms: 'Payment due within 30 days of invoice date.',
  invoiceNotes: ''
});
initFile(RAW_MATERIALS_FILE,         { raw_materials: [], lastUpdated: new Date().toISOString() });
initFile(RECIPES_FILE,               { recipes: [], lastUpdated: new Date().toISOString() });
initFile(RECIPE_HISTORY_FILE,        { recipe_history: [], lastUpdated: new Date().toISOString() });
initFile(MANUFACTURING_BATCHES_FILE, { manufacturing_batches: [], lastUpdated: new Date().toISOString() });
initFile(MANUFACTURING_AUDIT_FILE,   { manufacturing_audit: [], lastUpdated: new Date().toISOString() });
initFile(RAW_MAT_TXN_FILE,          { raw_material_transactions: [], lastUpdated: new Date().toISOString() });
initFile(RAW_MATERIAL_BATCHES_FILE,  { raw_material_batches: [], lastUpdated: new Date().toISOString() });
initFile(FINISHED_GOODS_FILE,        { finished_goods: [], lastUpdated: new Date().toISOString() });
initFile(FG_TXN_FILE,               { finished_goods_transactions: [], lastUpdated: new Date().toISOString() });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const readJSON  = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return null; } };
const writeJSON = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

function writeJSONAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

// ─── Concurrency & Mutex Lock ────────────────────────────────────────────────
let memoryLockPromise = Promise.resolve();

function withInventoryLock(action) {
  const next = memoryLockPromise.then(async () => {
    const lockFile = path.join(DATA_DIR, '.inventory.lock');
    let fd = null;
    const start = Date.now();
    while (Date.now() - start < 10000) {
      try {
        fd = fs.openSync(lockFile, 'wx');
        break;
      } catch (e) {
        if (e.code === 'EEXIST') {
          // If lock is older than 15s, clear stale lock
          try {
            const stat = fs.statSync(lockFile);
            if (Date.now() - stat.mtimeMs > 15000) {
              fs.unlinkSync(lockFile);
              continue;
            }
          } catch (_) {}
          await new Promise(r => setTimeout(r, 25));
        } else {
          break;
        }
      }
    }

    try {
      return await action();
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
        try { fs.unlinkSync(lockFile); } catch (_) {}
      }
    }
  });

  memoryLockPromise = next.catch(() => {});
  return next;
}

// ─── Cryptographic SHA-256 Audit Chaining ────────────────────────────────────
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

function logAuditEntry(mfgAuditData, entry) {
  if (!mfgAuditData.manufacturing_audit) mfgAuditData.manufacturing_audit = [];
  const list = mfgAuditData.manufacturing_audit;
  const precedingHash = list.length > 0 ? (list[list.length - 1].hash || 'GENESIS') : 'GENESIS';
  entry.precedingHash = precedingHash;
  entry.hash = computeAuditHash(entry, precedingHash);
  entry.immutable = true;
  list.push(entry);
}

function verifyAuditChain(entries) {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return { valid: true, count: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPreceding = i === 0 ? 'GENESIS' : entries[i - 1].hash;
    if (entry.precedingHash !== expectedPreceding) {
      return {
        valid: false,
        error: 'PRECEDING_HASH_MISMATCH',
        index: i,
        auditId: entry.auditId || entry.auditCorrelationId,
        expectedPreceding,
        actualPreceding: entry.precedingHash
      };
    }
    const computed = computeAuditHash(entry, expectedPreceding);
    if (entry.hash !== computed) {
      return {
        valid: false,
        error: 'HASH_MISMATCH',
        index: i,
        auditId: entry.auditId || entry.auditCorrelationId,
        expectedHash: computed,
        actualHash: entry.hash
      };
    }
  }

  return { valid: true, count: entries.length };
}

function ensureAuditHashChain(mfgAuditData) {
  if (!mfgAuditData || !Array.isArray(mfgAuditData.manufacturing_audit)) return false;
  const list = mfgAuditData.manufacturing_audit;
  let modified = false;
  let prevHash = 'GENESIS';
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    if (!entry.precedingHash || !entry.hash || entry.precedingHash !== prevHash) {
      entry.precedingHash = prevHash;
      entry.hash = computeAuditHash(entry, prevHash);
      entry.immutable = true;
      modified = true;
    }
    prevHash = entry.hash;
  }
  return modified;
}

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

function generateMfgId() {
  const d = new Date();
  const dateStr = d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return `MFG-${dateStr}-${rand}`;
}

// ─── Audit Correlation ID Generator & Normalizer ─────────────────────────────
function generateAuditCorrelationId() {
  const year = new Date().getFullYear();
  const prefix = `AUD-${year}-`;
  
  const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
  const rmTxns = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
  
  let maxSeq = 0;
  const checkId = (id) => {
    if (typeof id === 'string' && id.startsWith(prefix)) {
      const numPart = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) maxSeq = numPart;
    }
  };

  (mfgAudit.manufacturing_audit || []).forEach(r => {
    checkId(r.auditCorrelationId);
    checkId(r.auditId);
  });
  (rmTxns.raw_material_transactions || []).forEach(r => {
    checkId(r.auditCorrelationId);
  });

  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

// ─── Raw Material Batch ID Generator (RMB-YYYY-NNNN) ────────────────────────
function generateRMBatchId() {
  const year = new Date().getFullYear();
  const prefix = `RMB-${year}-`;
  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  let maxSeq = 0;
  (rmbData.raw_material_batches || []).forEach(b => {
    const id = b.id || b.batchId;
    if (typeof id === 'string' && id.startsWith(prefix)) {
      const num = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

// ─── Batch Inventory Invariant Reconciler ────────────────────────────────────
// Invariant: Parent Raw Material Stock = SUM(Active Batches Remaining Quantity)
function reconcileRawMaterialBatches() {
  try {
    const rmData = readJSON(RAW_MATERIALS_FILE);
    const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    if (!rmData || !Array.isArray(rmData.raw_materials)) return;
    if (!rmbData.raw_material_batches) rmbData.raw_material_batches = [];

    let rmbChanged = false;
    let rmChanged = false;
    const now = new Date().toISOString();

    rmData.raw_materials.forEach(rm => {
      // Find all batches for this material
      const batches = rmbData.raw_material_batches.filter(b => b.rawMaterialId === rm.id);
      
      // Normalize batch fields (originalQuantity, remainingQuantity, status)
      batches.forEach(b => {
        if (b.remainingQuantity === undefined) {
          b.remainingQuantity = b.remainingQty !== undefined ? b.remainingQty : (b.quantity || 0);
          rmbChanged = true;
        }
        if (b.remainingQty === undefined) {
          b.remainingQty = b.remainingQuantity;
          rmbChanged = true;
        }
        if (b.originalQuantity === undefined) {
          b.originalQuantity = b.quantity !== undefined ? b.quantity : (b.remainingQuantity || 0);
          rmbChanged = true;
        }
        if (rm.unit && b.unit !== rm.unit) {
          b.unit = rm.unit;
          rmbChanged = true;
        }
        if (rm.name && b.rawMaterialName !== rm.name) {
          b.rawMaterialName = rm.name;
          rmbChanged = true;
        }
        if (b.remainingQuantity <= 0) {
          if (b.status !== 'CONSUMED') {
            b.status = 'CONSUMED';
            rmbChanged = true;
          }
        } else {
          if (!b.status) {
            b.status = 'ACTIVE';
            rmbChanged = true;
          }
        }
      });

      const activeBatchesSum = batches
        .filter(b => b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'))
        .reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);

      const targetStock = rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0);

      // If raw material has unbatched stock (e.g. legacy), create a baseline opening stock batch
      const stockDiff = parseFloat((targetStock - activeBatchesSum).toFixed(6));
      if (stockDiff > 0.0001) {
        const batchId = generateRMBatchId();
        const corrId = generateAuditCorrelationId();
        const openingBatch = {
          id: batchId,
          batchId: batchId,
          rawMaterialId: rm.id,
          rawMaterialName: rm.name,
          supplierBatchNumber: 'OPENING-STOCK',
          lotNumber: 'OPENING-STOCK',
          originalQuantity: stockDiff,
          remainingQuantity: stockDiff,
          quantity: stockDiff,
          remainingQty: stockDiff,
          unit: rm.unit,
          vendorName: rm.supplier || 'Opening / Legacy Stock',
          vendorGstNumber: '',
          vendorBillingRef: '',
          vendorPrice: rm.cost_per_unit ? parseFloat((rm.cost_per_unit * stockDiff).toFixed(2)) : 0,
          purchaseDate: rm.purchaseDate || now.split('T')[0],
          dateFormat: 'DD/MM/YYYY',
          receivedDate: rm.purchaseDate || now.split('T')[0],
          supplier: rm.supplier || 'Opening / Legacy Stock',
          cost_per_unit: rm.cost_per_unit || 0,
          auditCorrelationId: corrId,
          status: 'ACTIVE',
          notes: 'Legacy Opening Stock Baseline',
          createdAt: rm.createdAt || now
        };
        rmbData.raw_material_batches.push(openingBatch);
        rmbChanged = true;
      }

      // Re-sum active batches and set parent stock
      const finalBatchesSum = rmbData.raw_material_batches
        .filter(b => b.rawMaterialId === rm.id && (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED')))
        .reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);

      const reconciledStock = parseFloat(finalBatchesSum.toFixed(6));
      if (rm.current_stock !== reconciledStock || rm.stock !== reconciledStock) {
        rm.current_stock = reconciledStock;
        rm.stock = reconciledStock;
        rmChanged = true;
      }
    });

    if (rmbChanged) {
      rmbData.lastUpdated = now;
      writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);
    }
    if (rmChanged) {
      rmData.lastUpdated = now;
      writeJSONAtomic(RAW_MATERIALS_FILE, rmData);
    }
  } catch (err) {
    console.error('Raw material batch reconciliation failed:', err);
  }
}

function normalizeHistoricalAuditData() {
  try {
    const year = new Date().getFullYear();
    const prefix = `AUD-${year}-`;
    let seq = 1;
    
    // Normalize manufacturing audit records
    const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE);
    if (mfgAudit && Array.isArray(mfgAudit.manufacturing_audit)) {
      let changed = false;
      mfgAudit.manufacturing_audit.forEach(r => {
        if (!r.auditCorrelationId) {
          r.auditCorrelationId = `${prefix}${String(seq++).padStart(6, '0')}`;
          changed = true;
        }
      });
      if (changed) {
        mfgAudit.lastUpdated = new Date().toISOString();
        writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
      }
    }
    
    // Normalize raw material transactions
    const rmTxns = readJSON(RAW_MAT_TXN_FILE);
    if (rmTxns && Array.isArray(rmTxns.raw_material_transactions)) {
      let changed = false;
      const mfgAuditMap = {};
      if (mfgAudit && mfgAudit.manufacturing_audit) {
        mfgAudit.manufacturing_audit.forEach(a => {
          if (a.manufacturingBatchId && a.auditCorrelationId) {
            mfgAuditMap[a.manufacturingBatchId] = a.auditCorrelationId;
          }
        });
      }
      rmTxns.raw_material_transactions.forEach(r => {
        if (!r.auditCorrelationId) {
          if (r.manufacturingBatchId && mfgAuditMap[r.manufacturingBatchId]) {
            r.auditCorrelationId = mfgAuditMap[r.manufacturingBatchId];
            changed = true;
          } else {
            r.auditCorrelationId = `${prefix}${String(seq++).padStart(6, '0')}`;
            changed = true;
          }
        }
      });
      if (changed) {
        rmTxns.lastUpdated = new Date().toISOString();
        writeJSONAtomic(RAW_MAT_TXN_FILE, rmTxns);
      }
    }

    // Normalize finished goods transactions
    const fgTxns = readJSON(FG_TXN_FILE);
    if (fgTxns && Array.isArray(fgTxns.finished_goods_transactions)) {
      let changed = false;
      fgTxns.finished_goods_transactions.forEach(f => {
        if (!f.auditCorrelationId) {
          f.auditCorrelationId = `${prefix}${String(seq++).padStart(6, '0')}`;
          changed = true;
        }
      });
      if (changed) {
        fgTxns.lastUpdated = new Date().toISOString();
        writeJSONAtomic(FG_TXN_FILE, fgTxns);
      }
    }

    // Normalize invoices
    const invData = readJSON(INVOICES_FILE);
    if (invData && Array.isArray(invData.invoices)) {
      let changed = false;
      const fgCorrMap = {};
      if (fgTxns && fgTxns.finished_goods_transactions) {
        fgTxns.finished_goods_transactions.forEach(f => {
          if (f.referenceId && f.auditCorrelationId) {
            fgCorrMap[f.referenceId] = f.auditCorrelationId;
          }
        });
      }
      invData.invoices.forEach(inv => {
        if (!inv.auditCorrelationId) {
          const invNum = inv.invoiceNumber || inv.id;
          if (fgCorrMap[invNum]) {
            inv.auditCorrelationId = fgCorrMap[invNum];
          } else {
            inv.auditCorrelationId = `${prefix}${String(seq++).padStart(6, '0')}`;
          }
          changed = true;
        }
      });
      if (changed) {
        invData.lastUpdated = new Date().toISOString();
        writeJSONAtomic(INVOICES_FILE, invData);
      }
    }
  } catch (err) {
    console.error('Audit data normalization failed:', err);
  }
}
normalizeHistoricalAuditData();
reconcileRawMaterialBatches();

// ─── FINISHED GOODS ↔ RECIPES ↔ PRODUCTS RECONCILIATION (Startup Sync) ────────
// Ensures that finished goods records are always linked to their recipe and product
// by ID. Syncs product.bulkStock from finished goods on every startup so the UI
// always shows the correct manufactured stock even if a previous commit was incomplete.
function reconcileFinishedGoodsAndProducts() {
  try {
    const fgData      = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
    const recipeData  = readJSON(RECIPES_FILE)         || { recipes: [] };
    const prdData     = readJSON(PRODUCTS_FILE)        || { products: [] };
    const batchData   = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };

    const recipes   = recipeData.recipes   || [];
    const products  = prdData.products     || [];
    const fgList    = fgData.finished_goods || [];
    const batches   = batchData.manufacturing_batches || [];

    let fgChanged  = false;
    let prdChanged = false;
    let recChanged = false;
    const now = new Date().toISOString();

    // ── Step 1: For every FG, ensure recipeId is set (look up via batch or name) ──
    fgList.forEach(fg => {
      if (!fg.recipeId) {
        // Try manufacturing batch
        const batch = batches.find(b => b.id === fg.manufacturingBatchId || b.mfgId === fg.manufacturingBatchId);
        if (batch && batch.recipeId) {
          fg.recipeId = batch.recipeId;
          fgChanged = true;
        } else {
          // Try matching recipe by name
          const recipe = recipes.find(r =>
            (r.name || '').toLowerCase() === (fg.name || '').toLowerCase() ||
            (r.productName || '').toLowerCase() === (fg.name || '').toLowerCase() ||
            (r.output_product_name || '').toLowerCase() === (fg.name || '').toLowerCase()
          );
          if (recipe) {
            fg.recipeId = recipe.id;
            fgChanged = true;
          }
        }
      }

      // ── Step 2: For every FG, ensure productId is set ──
      if (!fg.productId && fg.recipeId) {
        // First check recipe's own productId
        const recipe = recipes.find(r => r.id === fg.recipeId);
        if (recipe && recipe.productId) {
          fg.productId = recipe.productId;
          fgChanged = true;
        } else {
          // Find product that references this recipe
          const linked = products.find(p => p.recipeId === fg.recipeId);
          if (linked) {
            fg.productId = linked.id;
            fgChanged = true;
            // Back-link recipe to product if missing
            if (recipe && !recipe.productId) {
              recipe.productId = linked.id;
              recChanged = true;
            }
          }
        }
      }
    });

    // ── Step 3: Sync product.bulkStock from FG stock ──
    products.forEach(p => {
      // Find the FG record for this product
      const fg = fgList.find(f =>
        (f.productId && f.productId === p.id) ||
        (p.recipeId && f.recipeId && f.recipeId === p.recipeId) ||
        (p.name && f.name && f.name.toLowerCase() === p.name.toLowerCase())
      );
      if (!fg) return;

      // Ensure product has recipeId back-linked
      if (!p.recipeId && fg.recipeId) {
        p.recipeId = fg.recipeId;
        prdChanged = true;
      }

      // Ensure FG productId is linked
      if (!fg.productId && p.id) {
        fg.productId = p.id;
        fgChanged = true;
      }

      // Compute bulk stock from FG: fgStock (pcs) × bottleSize (unit) → bulkStock in bulkStockUnit
      const fgStock  = fg.currentStock || 0;
      const fgSize   = fg.bottleSize   || 1;
      const fgUnit   = fg.bottleSizeUnit || 'kg';

      // Convert total bulk to product's bulkStockUnit (default kg)
      const bulkUnit = p.bulkStockUnit || fgUnit;
      let totalBulk;
      try {
        const totalInFGUnit = fgStock * fgSize;
        totalBulk = unitConv.convert(totalInFGUnit, fgUnit, bulkUnit);
      } catch (_) {
        totalBulk = fgStock * fgSize;
      }
      totalBulk = parseFloat(totalBulk.toFixed(6));

      if ((p.bulkStock || 0) !== totalBulk || !p.bulkStockUnit) {
        p.bulkStock     = totalBulk;
        p.bulkStockUnit = bulkUnit;
        prdChanged = true;
      }
    });

    const ts = new Date().toISOString();
    if (fgChanged) {
      fgData.lastUpdated = ts;
      writeJSONAtomic(FINISHED_GOODS_FILE, fgData);
    }
    if (recChanged) {
      recipeData.lastUpdated = ts;
      writeJSONAtomic(RECIPES_FILE, recipeData);
    }
    if (prdChanged) {
      prdData.lastUpdated = ts;
      writeJSONAtomic(PRODUCTS_FILE, prdData);
    }
    if (fgChanged || prdChanged || recChanged) {
      console.log('✅ reconcileFinishedGoodsAndProducts: data synchronized.');
    }
  } catch (err) {
    console.error('reconcileFinishedGoodsAndProducts failed:', err);
  }
}
reconcileFinishedGoodsAndProducts();

function reconcileAuditHashChain() {
  try {
    const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE);
    if (mfgAudit && Array.isArray(mfgAudit.manufacturing_audit) && mfgAudit.manufacturing_audit.length > 0) {
      if (ensureAuditHashChain(mfgAudit)) {
        writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
        console.log('✅ reconcileAuditHashChain: audit hash chain verified and normalized.');
      }
    }
  } catch (err) {
    console.error('reconcileAuditHashChain failed:', err);
  }
}
reconcileAuditHashChain();

// ─── UNIFIED AUDIT MEMORY LOGGING FOR DELETIONS ─────────────────────────────
function logDeletionAudit({ entityType, entityId, entityName, itemName, reason, deductedQty, deductedVal, unit, details, notes }) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
  const auditCorrId = generateAuditCorrelationId();

  const auditEntry = {
    auditId: auditCorrId,
    auditCorrelationId: auditCorrId,
    date: dateStr,
    time: timeStr,
    timestamp: now.toISOString(),
    eventType: 'DATA_DELETION',
    transactionType: entityType === 'vendor' ? 'VENDOR_DELETION' : 'RECORD_DELETION',
    category: 'DELETIONS',
    entityType: entityType || 'record',
    entityId: entityId || '-',
    entityName: entityName || '-',
    itemName: itemName || `${(entityType || 'Record').toUpperCase()}: ${entityName || entityId}`,
    deletionReason: (reason || 'No reason provided').trim(),
    deductedQty: deductedQty || 0,
    deductedVal: deductedVal || 0,
    unit: unit || '',
    details: details || '',
    operatorName: 'User',
    notes: notes || `DELETED: [${(entityType || 'RECORD').toUpperCase()}] "${entityName || entityId}". Reason: ${(reason || 'No reason provided').trim()} (on ${dateStr} at ${timeStr})`
  };

  try {
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    logAuditEntry(mfgAuditData, auditEntry);
    mfgAuditData.lastUpdated = now.toISOString();
    writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAuditData);
  } catch (err) {
    console.error('Failed to log deletion to manufacturing audit:', err);
  }
  return auditEntry;
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const d = readJSON(PRODUCTS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.post('/api/products', (req, res) => {
  const d = readJSON(PRODUCTS_FILE);
  if (!req.body.name || !req.body.name.trim()) return res.status(400).json({ error: 'Product name is required' });
  const now = new Date().toISOString();

  let normalizedVariants = [];
  if (Array.isArray(req.body.variants)) {
    normalizedVariants = req.body.variants.map((v, idx) => ({
      variantId: v.variantId || `VAR-${Date.now()}-${idx}`,
      name: (v.name || `${req.body.name} (${v.bottleSize || 200} ${v.bottleSizeUnit || 'mL'})`).trim(),
      bottleSize: parseFloat(v.bottleSize) || 200,
      bottleSizeUnit: v.bottleSizeUnit || 'mL',
      packagingRawMaterialId: v.packagingRawMaterialId || null,
      packagingQty: parseFloat(v.packagingQty) || 1,
      vendorPreference: v.vendorPreference || { mode: 'FIFO', vendorId: null },
      price: parseFloat(v.price !== undefined ? v.price : (v.rate !== undefined ? v.rate : (req.body.rate || 0))),
      stock: parseFloat(v.stock !== undefined ? v.stock : 0) || 0,
      createdAt: v.createdAt || now,
      updatedAt: now
    }));
  }

  const product = {
    id: uid('PRD'),
    hsn_sac: req.body.hsn_sac || 'N/A',
    rate: parseFloat(req.body.rate) || 0,
    gst_rate: parseFloat(req.body.gst_rate) || 0,
    unit: req.body.unit || 'BTL',
    supply_type: req.body.supply_type || 'intra',
    createdAt: now,
    updatedAt: now,
    ...req.body,
    variants: normalizedVariants
  };
  d.products.push(product);
  d.lastUpdated = now;
  writeJSONAtomic(PRODUCTS_FILE, d);

  // Audit DATA_CREATE for new variations
  try {
    const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    let auditLogged = false;
    normalizedVariants.forEach(v => {
      logAuditEntry(mfgAudit, {
        auditId: generateAuditCorrelationId(),
        auditCorrelationId: generateAuditCorrelationId(),
        timestamp: now,
        date: now.split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        eventType: 'DATA_CREATE',
        category: 'MASTER_DATA',
        entityType: 'PRODUCT_VARIATION',
        entityId: v.variantId,
        entityName: v.name,
        productId: product.id,
        productName: product.name,
        snapshot: v,
        operatorName: req.body?.operatorName || 'Plant Operator',
        notes: `Created Product Variation "${v.name}" on Product "${product.name}"`
      });
      auditLogged = true;
    });
    if (auditLogged) {
      mfgAudit.lastUpdated = now;
      writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
    }
  } catch (_) {}

  res.status(201).json({ success: true, product });
});

app.put('/api/products/:id', (req, res) => {
  const d = readJSON(PRODUCTS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.products.findIndex(p => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });

  const now = new Date().toISOString();
  const oldProduct = JSON.parse(JSON.stringify(d.products[i]));

  let updatedVariants = d.products[i].variants || [];
  if (Array.isArray(req.body.variants)) {
    updatedVariants = req.body.variants.map((v, idx) => {
      const existing = (oldProduct.variants || []).find(ov => ov.variantId === v.variantId);
      return {
        variantId: v.variantId || (existing ? existing.variantId : `VAR-${Date.now()}-${idx}`),
        name: (v.name || `${req.body.name || d.products[i].name} (${v.bottleSize || 200} ${v.bottleSizeUnit || 'mL'})`).trim(),
        bottleSize: parseFloat(v.bottleSize) || (existing ? existing.bottleSize : 200),
        bottleSizeUnit: v.bottleSizeUnit || (existing ? existing.bottleSizeUnit : 'mL'),
        packagingRawMaterialId: v.packagingRawMaterialId !== undefined ? v.packagingRawMaterialId : (existing ? existing.packagingRawMaterialId : null),
        packagingQty: parseFloat(v.packagingQty !== undefined ? v.packagingQty : (existing ? existing.packagingQty : 1)) || 1,
        vendorPreference: v.vendorPreference || (existing ? existing.vendorPreference : { mode: 'FIFO', vendorId: null }),
        price: parseFloat(v.price !== undefined ? v.price : (existing ? existing.price : (req.body.rate || d.products[i].rate || 0))),
        stock: parseFloat(v.stock !== undefined ? v.stock : (existing ? existing.stock : 0)) || 0,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now
      };
    });
  }

  // Audit field-level changes for variations (DATA_UPDATE)
  try {
    const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    let auditLogged = false;
    (updatedVariants || []).forEach(newVar => {
      const oldVar = (oldProduct.variants || []).find(ov => ov.variantId === newVar.variantId);
      if (oldVar) {
        const changes = {};
        if (oldVar.price !== newVar.price) changes.price = { before: oldVar.price, after: newVar.price };
        if (oldVar.packagingQty !== newVar.packagingQty) changes.packagingQty = { before: oldVar.packagingQty, after: newVar.packagingQty };
        if (oldVar.packagingRawMaterialId !== newVar.packagingRawMaterialId) changes.packagingRawMaterialId = { before: oldVar.packagingRawMaterialId, after: newVar.packagingRawMaterialId };
        if (JSON.stringify(oldVar.vendorPreference) !== JSON.stringify(newVar.vendorPreference)) changes.vendorPreference = { before: oldVar.vendorPreference, after: newVar.vendorPreference };
        if (oldVar.name !== newVar.name) changes.name = { before: oldVar.name, after: newVar.name };

        if (Object.keys(changes).length > 0) {
          logAuditEntry(mfgAudit, {
            auditId: generateAuditCorrelationId(),
            auditCorrelationId: generateAuditCorrelationId(),
            timestamp: now,
            date: now.split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            eventType: 'DATA_UPDATE',
            category: 'MASTER_DATA',
            entityType: 'PRODUCT_VARIATION',
            entityId: newVar.variantId,
            entityName: newVar.name,
            productId: d.products[i].id,
            productName: d.products[i].name,
            changes,
            operatorName: req.body?.operatorName || 'Plant Operator',
            notes: `Updated Product Variation "${newVar.name}": ${Object.keys(changes).join(', ')} modified`
          });
          auditLogged = true;
        }
      } else {
        // New variation added via edit
        logAuditEntry(mfgAudit, {
          auditId: generateAuditCorrelationId(),
          auditCorrelationId: generateAuditCorrelationId(),
          timestamp: now,
          date: now.split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          eventType: 'DATA_CREATE',
          category: 'MASTER_DATA',
          entityType: 'PRODUCT_VARIATION',
          entityId: newVar.variantId,
          entityName: newVar.name,
          productId: d.products[i].id,
          productName: d.products[i].name,
          snapshot: newVar,
          operatorName: req.body?.operatorName || 'Plant Operator',
          notes: `Created new Product Variation "${newVar.name}" on Product "${d.products[i].name}"`
        });
        auditLogged = true;
      }
    });
    if (auditLogged) {
      mfgAudit.lastUpdated = now;
      writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
    }
  } catch (_) {}

  d.products[i] = {
    ...d.products[i],
    ...req.body,
    variants: updatedVariants,
    id: req.params.id,
    updatedAt: now
  };
  d.lastUpdated = now;
  writeJSONAtomic(PRODUCTS_FILE, d);
  res.json({ success: true, product: d.products[i] });
});

app.delete('/api/products/:id', (req, res) => {
  const d = readJSON(PRODUCTS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.products.findIndex(p => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const prod = d.products[i];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  d.products.splice(i, 1);
  d.lastUpdated = new Date().toISOString();
  writeJSONAtomic(PRODUCTS_FILE, d);

  // ── Orphan cleanup: clear references in recipes.json and finished_goods.json ──
  try {
    const recData = readJSON(RECIPES_FILE) || { recipes: [] };
    let recChanged = false;
    (recData.recipes || []).forEach(r => {
      if (r.productId === prod.id) { r.productId = null; recChanged = true; }
    });
    if (recChanged) { recData.lastUpdated = new Date().toISOString(); writeJSONAtomic(RECIPES_FILE, recData); }
  } catch (_) {}
  try {
    const fgData = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
    let fgChanged = false;
    (fgData.finished_goods || []).forEach(fg => {
      if (fg.productId === prod.id) { fg.productId = null; fgChanged = true; }
    });
    if (fgChanged) { fgData.lastUpdated = new Date().toISOString(); writeJSONAtomic(FINISHED_GOODS_FILE, fgData); }
  } catch (_) {}

  logDeletionAudit({
    entityType: 'product',
    entityId: prod.id,
    entityName: prod.name,
    itemName: `Product: ${prod.name} (SKU: ${prod.sku || prod.id})`,
    reason,
    unit: prod.unit || 'pcs',
    details: `Category: ${prod.category || 'Standard'}, Price: ₹${prod.price || prod.rate || 0}`,
    notes: `DELETED PRODUCT: "${prod.name}" (ID: ${prod.id}). Reason: ${reason}`
  });

  res.json({ success: true });
});

app.get('/api/products/:id', (req, res) => {
  const d = readJSON(PRODUCTS_FILE);
  const p = d && d.products && d.products.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// ─── PRODUCT VARIATION DELETION IMPACT & LIFECYCLE ENDPOINTS ────────────────
app.get('/api/products/:productId/variants/:variantId/deletion-impact', (req, res) => {
  const { productId, variantId } = req.params;
  const prdData = readJSON(PRODUCTS_FILE);
  if (!prdData) return res.status(500).json({ error: 'Read failed' });

  const product = (prdData.products || []).find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const variant = (product.variants || []).find(v => v.variantId === variantId || v.name === variantId);
  if (!variant) return res.status(404).json({ error: 'Product variant not found' });

  const currentFinishedStock = Math.max(0, parseFloat(variant.stock) || 0);

  // Read transactions to inspect reversible packaging history
  const rmTxnData = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
  const matchingTxns = (rmTxnData.raw_material_transactions || []).filter(t =>
    (t.operationType === 'VARIANT_PACKAGING' || t.transactionType === 'VARIANT_PACKAGING') &&
    (t.variantId === variant.variantId || t.variantId === variantId) &&
    t.reversed !== true &&
    (t.remainingReversibleQuantity === undefined || t.remainingReversibleQuantity > 0)
  );

  const historicalPackagingTransactions = (rmTxnData.raw_material_transactions || []).filter(t =>
    (t.operationType === 'VARIANT_PACKAGING' || t.transactionType === 'VARIANT_PACKAGING') &&
    (t.variantId === variant.variantId || t.variantId === variantId)
  );

  const historicalProductionTotal = historicalPackagingTransactions.reduce((acc, t) => {
    const qty = parseFloat(t.quantityProduced !== undefined ? t.quantityProduced : t.quantity) || 0;
    return acc + qty;
  }, 0);
  const totalReversiblePool = matchingTxns.reduce((acc, t) => {
    const rem = t.remainingReversibleQuantity !== undefined
      ? parseFloat(t.remainingReversibleQuantity)
      : (parseFloat(t.quantityProduced !== undefined ? t.quantityProduced : t.quantity) || 0);
    return acc + Math.max(0, rem);
  }, 0);

  const maxEligibleReversal = Math.min(currentFinishedStock, totalReversiblePool);

  let packagingRawMaterial = null;
  if (variant.packagingRawMaterialId) {
    const rmData = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
    const rm = (rmData.raw_materials || []).find(r => r.id === variant.packagingRawMaterialId);
    if (rm) {
      packagingRawMaterial = {
        id: rm.id,
        name: rm.name,
        currentStock: rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0),
        unit: rm.unit || 'pcs',
        packagingQtyPerUnit: variant.packagingQty || 1
      };
    }
  }

  res.json({
    success: true,
    productId: product.id,
    productName: product.name,
    variantId: variant.variantId,
    variantName: variant.name,
    bottleSize: variant.bottleSize,
    bottleSizeUnit: variant.bottleSizeUnit,
    currentStock: currentFinishedStock,
    currentFinishedStock,
    maxEligibleReversal,
    historicalProductionTotal,
    packagingRawMaterial,
    activePackagingTransactionsCount: matchingTxns.length,
    nonReversedTransactions: matchingTxns.map(t => ({
      transactionId: t.transactionId || t.id,
      date: t.date,
      quantityProduced: t.quantityProduced !== undefined ? t.quantityProduced : t.quantity,
      quantityReversed: t.quantityReversed || 0,
      remainingReversibleQuantity: t.remainingReversibleQuantity !== undefined ? t.remainingReversibleQuantity : (t.quantityProduced !== undefined ? t.quantityProduced : t.quantity),
      packagingQuantityConsumed: t.packagingQuantityConsumed !== undefined ? t.packagingQuantityConsumed : t.quantity,
      unit: t.unit,
      allocations: t.allocations || []
    }))
  });
});

app.delete('/api/products/:productId/variants/:variantId', (req, res) => {
  const { productId, variantId } = req.params;
  const prdData = readJSON(PRODUCTS_FILE);
  if (!prdData) return res.status(500).json({ error: 'Read failed' });

  const product = (prdData.products || []).find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const vIdx = (product.variants || []).findIndex(v => v.variantId === variantId || v.name === variantId);
  if (vIdx === -1) return res.status(404).json({ error: 'Product variant not found' });

  const variant = product.variants[vIdx];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) {
    return res.status(400).json({ error: 'Mandatory deletion reason is required to delete a product variation' });
  }

  const action = ((req.body && req.body.action) || 'DISCARD').toUpperCase(); // 'REVERSE' or 'DISCARD'
  const operatorName = (req.body && req.body.operatorName) || 'Plant Operator';
  const correlationId = generateAuditCorrelationId();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
  const timestamp = now.toISOString();

  const variantSnapshot = JSON.parse(JSON.stringify(variant));
  const currentStock = Math.max(0, parseFloat(variant.stock) || 0);

  const rmTxnData = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const rmData = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
  const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };

  let totalReversedStock = 0;
  let totalPackagingRestored = 0;
  const restoredBatchAllocations = [];

  if (action === 'REVERSE' && currentStock > 0 && variant.packagingRawMaterialId) {
    // Collect active packaging transactions for this variant, oldest first (FIFO)
    const matchingTxns = (rmTxnData.raw_material_transactions || []).filter(t =>
      (t.operationType === 'VARIANT_PACKAGING' || t.transactionType === 'VARIANT_PACKAGING') &&
      (t.variantId === variant.variantId || t.variantId === variantId) &&
      t.reversed !== true &&
      (t.remainingReversibleQuantity === undefined || t.remainingReversibleQuantity > 0)
    ).sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date));

    let stockToReverse = currentStock;

    // Safety check: verify original batches still exist before executing reversal
    for (const txn of matchingTxns) {
      if (stockToReverse <= 0) break;
      const allocs = txn.allocations || [];
      for (const alloc of allocs) {
        const batchExists = (rmbData.raw_material_batches || []).some(b => (b.id === alloc.batchId || b.batchId === alloc.batchId));
        if (!batchExists) {
          return res.status(400).json({
            error: `Original Raw Material batch ${alloc.batchId} (${alloc.supplierBatchNumber || 'Unknown'}) no longer exists. Automatic reversal is blocked. A controlled inventory adjustment is required.`
          });
        }
      }
    }

    // Now execute batch reversal
    for (const txn of matchingTxns) {
      if (stockToReverse <= 0) break;

      const remInTxn = txn.remainingReversibleQuantity !== undefined
        ? parseFloat(txn.remainingReversibleQuantity)
        : (parseFloat(txn.quantityProduced !== undefined ? txn.quantityProduced : txn.quantity) || 0);
      if (remInTxn <= 0) continue;

      const reverseUnitsThisTxn = Math.min(stockToReverse, remInTxn);
      const qtyProd = parseFloat(txn.quantityProduced !== undefined ? txn.quantityProduced : txn.quantity) || 1;
      const pkgQtyConsumed = parseFloat(txn.packagingQuantityConsumed !== undefined ? txn.packagingQuantityConsumed : txn.quantity) || 1;
      const pkgQtyPerUnit = (pkgQtyConsumed && qtyProd) ? (pkgQtyConsumed / qtyProd) : (variant.packagingQty || 1);

      let packagingToRestoreThisTxn = reverseUnitsThisTxn * pkgQtyPerUnit;
      const allocs = txn.allocations || [];

      // Restore to allocations
      for (const alloc of allocs) {
        if (packagingToRestoreThisTxn <= 0) break;
        const availableInAlloc = Math.max(0, (alloc.quantity || 0) - (alloc.quantityReversed || 0));
        if (availableInAlloc <= 0) continue;

        const restoreToAlloc = Math.min(packagingToRestoreThisTxn, availableInAlloc);
        alloc.quantityReversed = (alloc.quantityReversed || 0) + restoreToAlloc;
        packagingToRestoreThisTxn -= restoreToAlloc;
        totalPackagingRestored += restoreToAlloc;

        // Restore batch balance in raw_material_batches.json
        const batch = (rmbData.raw_material_batches || []).find(b => b.id === alloc.batchId || b.batchId === alloc.batchId);
        if (batch) {
          batch.remainingQuantity = parseFloat(((batch.remainingQuantity !== undefined ? batch.remainingQuantity : (batch.quantity || 0)) + restoreToAlloc).toFixed(6));
          batch.remainingQty = batch.remainingQuantity;
          if (batch.status === 'CONSUMED' || batch.status === 'DEPLETED') {
            batch.status = 'ACTIVE';
          }
          batch.updatedAt = timestamp;
        }

        restoredBatchAllocations.push({
          batchId: alloc.batchId,
          supplierBatchNumber: alloc.supplierBatchNumber || '-',
          vendorId: alloc.vendorId || null,
          vendorName: alloc.vendorName || '-',
          quantityRestored: restoreToAlloc,
          unitCost: alloc.unitCost || 0
        });
      }

      txn.quantityReversed = (txn.quantityReversed || 0) + reverseUnitsThisTxn;
      txn.remainingReversibleQuantity = Math.max(0, remInTxn - reverseUnitsThisTxn);
      if (txn.remainingReversibleQuantity <= 0) {
        txn.reversed = true;
      }
      txn.updatedAt = timestamp;

      stockToReverse -= reverseUnitsThisTxn;
      totalReversedStock += reverseUnitsThisTxn;

      // Append Transaction Reversal entry
      const revTxnId = uid('RMT');
      rmTxnData.raw_material_transactions.push({
        id: revTxnId,
        transactionId: uid('TXN'),
        reversalOfTransactionId: txn.transactionId || txn.id,
        auditCorrelationId: correlationId,
        operationType: 'TRANSACTION_REVERSAL',
        transactionType: 'REVERSAL_INWARD',
        action: 'Transaction Reversal',
        type: 'IN',
        rawMaterialId: variant.packagingRawMaterialId,
        rawMaterialName: txn.packagingRawMaterialName || txn.rawMaterialName,
        productId: product.id,
        productName: product.name,
        variantId: variant.variantId,
        variantName: variant.name,
        quantityReversed: reverseUnitsThisTxn,
        packagingQuantityRestored: reverseUnitsThisTxn * pkgQtyPerUnit,
        unit: txn.unit,
        allocations: restoredBatchAllocations,
        operatorName,
        reason,
        timestamp,
        date: dateStr,
        time: timeStr
      });

      // Audit log TRANSACTION_REVERSAL & INVENTORY_IN
      logAuditEntry(mfgAudit, {
        auditId: generateAuditCorrelationId(),
        auditCorrelationId: correlationId,
        timestamp,
        date: dateStr,
        time: timeStr,
        eventType: 'TRANSACTION_REVERSAL',
        category: 'REVERSALS',
        entityType: 'PRODUCT_VARIATION',
        entityId: variant.variantId,
        entityName: variant.name,
        productId: product.id,
        productName: product.name,
        reversalOfTransactionId: txn.transactionId || txn.id,
        reversedUnits: reverseUnitsThisTxn,
        packagingQuantityRestored: reverseUnitsThisTxn * pkgQtyPerUnit,
        unit: txn.unit,
        operatorName,
        notes: `Reversed packaging transaction ${txn.transactionId || txn.id} for variation "${variant.name}": returned ${reverseUnitsThisTxn * pkgQtyPerUnit} ${txn.unit} to original batch(es).`
      });

      logAuditEntry(mfgAudit, {
        auditId: generateAuditCorrelationId(),
        auditCorrelationId: correlationId,
        timestamp,
        date: dateStr,
        time: timeStr,
        eventType: 'INVENTORY_IN',
        category: 'INVENTORY',
        entityType: 'RAW_MATERIAL',
        entityId: variant.packagingRawMaterialId,
        entityName: txn.packagingRawMaterialName || txn.rawMaterialName,
        quantity: reverseUnitsThisTxn * pkgQtyPerUnit,
        unit: txn.unit,
        operatorName,
        notes: `Restored ${reverseUnitsThisTxn * pkgQtyPerUnit} ${txn.unit} to raw material batch inventory upon variation deletion reversal.`
      });
    }

    // Sync Raw Material current_stock
    const rmIdx = (rmData.raw_materials || []).findIndex(r => r.id === variant.packagingRawMaterialId);
    if (rmIdx !== -1) {
      const rm = rmData.raw_materials[rmIdx];
      const curRmStock = rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0);
      rm.current_stock = parseFloat((curRmStock + totalPackagingRestored).toFixed(6));
      rm.stock = rm.current_stock;
      rm.updatedAt = timestamp;
      writeJSONAtomic(RAW_MATERIALS_FILE, rmData);
    }

    writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);
    writeJSONAtomic(RAW_MAT_TXN_FILE, rmTxnData);
  } else if (action === 'DISCARD' && currentStock > 0) {
    // Log INVENTORY_ADJUSTMENT for discarded finished goods stock
    logAuditEntry(mfgAudit, {
      auditId: generateAuditCorrelationId(),
      auditCorrelationId: correlationId,
      timestamp,
      date: dateStr,
      time: timeStr,
      eventType: 'INVENTORY_ADJUSTMENT',
      category: 'INVENTORY',
      entityType: 'PRODUCT_VARIATION',
      entityId: variant.variantId,
      entityName: variant.name,
      productId: product.id,
      productName: product.name,
      discardedStock: currentStock,
      unit: 'pcs',
      operatorName,
      reason,
      notes: `Discarded ${currentStock} finished units of variant "${variant.name}" upon deletion without returning raw packaging.`
    });
  }

  // Physical removal from product.variants[]
  product.variants.splice(vIdx, 1);
  product.updatedAt = timestamp;
  prdData.lastUpdated = timestamp;
  writeJSONAtomic(PRODUCTS_FILE, prdData);

  // DATA_DELETION Audit Snapshot
  logAuditEntry(mfgAudit, {
    auditId: generateAuditCorrelationId(),
    auditCorrelationId: correlationId,
    timestamp,
    date: dateStr,
    time: timeStr,
    eventType: 'DATA_DELETION',
    category: 'DELETIONS',
    entityType: 'PRODUCT_VARIATION',
    entityId: variantSnapshot.variantId,
    entityName: variantSnapshot.name,
    productId: product.id,
    productName: product.name,
    reason,
    actionTaken: action,
    finishedStockRemoved: currentStock,
    stockReversedToRM: totalReversedStock,
    packagingQuantityRestored: totalPackagingRestored,
    restoredBatchAllocations,
    snapshot: variantSnapshot,
    operatorName,
    notes: `DELETED PRODUCT VARIATION: "${variantSnapshot.name}" (Variant ID: ${variantSnapshot.variantId}) from Product "${product.name}". Action: ${action}. Finished Stock: ${currentStock}. Reason: ${reason}`
  });

  mfgAudit.lastUpdated = timestamp;
  writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);

  res.json({
    success: true,
    message: `Product variation "${variantSnapshot.name}" was successfully deleted.`,
    deletedVariantId: variantSnapshot.variantId,
    actionTaken: action,
    finishedStockRemoved: currentStock,
    stockReversedToRM: totalReversedStock,
    packagingQuantityRestored: totalPackagingRestored,
    auditCorrelationId: correlationId
  });
});

// ─── BOTTLE / PACKAGE BULK STOCK DISTRIBUTION ENDPOINT ───────────────────────
app.post('/api/products/:id/fill-bottles', (req, res) => {
  return withInventoryLock(async () => {
    const rawBottles = req.body.numberOfBottles !== undefined ? req.body.numberOfBottles : req.body.bottlesToFill;
    const numBottles = Number(rawBottles);
    if (!Number.isFinite(numBottles) || numBottles <= 0 || !Number.isInteger(numBottles)) {
      return res.status(400).json({ error: `Number of containers must be a valid positive integer (received: ${rawBottles})` });
    }

    const prdData = readJSON(PRODUCTS_FILE);
    if (!prdData) return res.status(500).json({ error: 'Read failed' });

    const product = prdData.products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { variantId } = req.body;

  const variants = product.variants || [];
  const variantIndex = variants.findIndex(v => v.variantId === variantId || v.name === variantId);
  if (variantIndex === -1) {
    return res.status(404).json({ error: 'Bottle size variant not found' });
  }

  const variant = variants[variantIndex];
  const bSize = variant.bottleSize || 200;
  const bUnit = variant.bottleSizeUnit || 'mL';

  // ─── Multi-key FG lookup ─────────────────────────────────────────────────
  const fgData = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
  const fgTxnData = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  let fgIdx = fgData.finished_goods.findIndex(f => f.productId === product.id);
  if (fgIdx === -1 && product.recipeId) {
    fgIdx = fgData.finished_goods.findIndex(f => f.recipeId === product.recipeId);
  }
  if (fgIdx === -1 && product.recipeId) {
    const recData = readJSON(RECIPES_FILE) || { recipes: [] };
    const linkedRec = (recData.recipes || []).find(r => r.id === product.recipeId);
    if (linkedRec && linkedRec.name) {
      const recNameLower = linkedRec.name.toLowerCase().trim();
      fgIdx = fgData.finished_goods.findIndex(f => {
        const fgNameLower = (f.name || '').toLowerCase().trim();
        return fgNameLower === recNameLower || fgNameLower.includes(recNameLower) || recNameLower.includes(fgNameLower);
      });
    }
  }
  if (fgIdx === -1) {
    // Fall back to product name matching
    const pNameLower = product.name.toLowerCase();
    fgIdx = fgData.finished_goods.findIndex(f => {
      const fgNameLower = (f.name || '').toLowerCase();
      return fgNameLower === pNameLower || fgNameLower.includes(pNameLower) || pNameLower.includes(fgNameLower);
    });
  }

  if (fgIdx === -1) {
    return res.status(400).json({ error: 'No Manufactured Finished Goods stock found for this product. Please manufacture a batch first.' });
  }

  const fg = fgData.finished_goods[fgIdx];
  const fgCurrentStock = fg.currentStock || 0;
  const fgBaseSize = fg.bottleSize || 1;
  const fgBaseUnit = fg.bottleSizeUnit || 'kg';

  // ─── Dimension-aware conversion ──────────────────────────────────────────
  const fgDim  = unitConv.getDimension(unitConv.normalizeUnit(fgBaseUnit));
  const varDim = unitConv.getDimension(unitConv.normalizeUnit(bUnit));

  // Total FG bulk in base units
  const fgBaseSizeInBase  = unitConv.convertToBase(fgBaseSize, fgBaseUnit);
  const totalFGInBase     = fgCurrentStock * fgBaseSizeInBase;

  let totalNeededInBase = 0;
  if (fgDim === varDim || fgDim === 'custom' || varDim === 'custom') {
    const varSizeInBase = unitConv.convertToBase(bSize, bUnit);
    totalNeededInBase = numBottles * varSizeInBase;
  } else if (varDim === 'count') {
    // Packaging bulk liquid/powder/solid into discrete containers/boxes/cartons
    // Each package consumes bSize * fgBaseSizeInBase (or 1 batch unit per container)
    totalNeededInBase = numBottles * bSize * (fgBaseSizeInBase || 1);
  } else if (fgDim === 'count') {
    totalNeededInBase = numBottles * bSize;
  } else {
    // General fallback: ratio 1:1
    totalNeededInBase = numBottles * bSize;
  }

  if (totalFGInBase < totalNeededInBase) {
    return res.status(400).json({
      error: `Insufficient Manufactured Stock in Finished Goods. Required: ${totalNeededInBase.toFixed(3)} ${unitConv.getBaseUnit(fgBaseUnit)} (${numBottles} × ${bSize} ${bUnit}), but only ${totalFGInBase.toFixed(3)} ${unitConv.getBaseUnit(fgBaseUnit)} available.`
    });
  }

  // ─── Check & Prepare Raw Material Packaging Deduction ────────────────────
  let packagingNeeded = 0;
  let targetRM = null;
  let rmData = null;
  let rmbData = null;
  let packagingAllocations = [];
  let packagingTotalCost = 0;

  if (variant.packagingRawMaterialId) {
    packagingNeeded = numBottles * (parseFloat(variant.packagingQty) || 1);
    rmData = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
    targetRM = (rmData.raw_materials || []).find(r => r.id === variant.packagingRawMaterialId);

    if (!targetRM) {
      return res.status(400).json({
        error: `Packaging Raw Material with ID "${variant.packagingRawMaterialId}" assigned to this variation was not found.`
      });
    }

    const availablePackagingStock = targetRM.current_stock !== undefined ? targetRM.current_stock : (targetRM.stock || 0);
    if (availablePackagingStock < packagingNeeded) {
      return res.status(400).json({
        error: `Insufficient packaging stock for Raw Material "${targetRM.name}". Required: ${packagingNeeded} ${targetRM.unit || 'pcs'} (${numBottles} × ${variant.packagingQty || 1}), but only ${availablePackagingStock} ${targetRM.unit || 'pcs'} available.`
      });
    }

    // Read and allocate batches
    rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    let candidateBatches = (rmbData.raw_material_batches || []).filter(b =>
      b.rawMaterialId === targetRM.id &&
      (b.remainingQuantity === undefined ? ((b.remainingQty !== undefined ? b.remainingQty : b.quantity) > 0) : b.remainingQuantity > 0)
    );

    // Vendor preference ordering or FIFO
    const vPref = variant.vendorPreference || { mode: 'FIFO', vendorId: null };
    if (vPref.mode === 'VENDOR' && vPref.vendorId) {
      candidateBatches.sort((a, b) => {
        const aIsPref = (a.vendorId === vPref.vendorId || a.vendorName === vPref.vendorId || a.supplier === vPref.vendorId) ? 1 : 0;
        const bIsPref = (b.vendorId === vPref.vendorId || b.vendorName === vPref.vendorId || b.supplier === vPref.vendorId) ? 1 : 0;
        if (aIsPref !== bIsPref) return bIsPref - aIsPref;
        return new Date(a.purchaseDate || a.createdAt || 0) - new Date(b.purchaseDate || b.createdAt || 0);
      });
    } else {
      // Standard FIFO by purchaseDate / createdAt
      candidateBatches.sort((a, b) => new Date(a.purchaseDate || a.createdAt || 0) - new Date(b.purchaseDate || b.createdAt || 0));
    }

    let remainingPackagingToAllocate = packagingNeeded;
    for (const b of candidateBatches) {
      if (remainingPackagingToAllocate <= 0) break;
      const bRem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty !== undefined ? b.remainingQty : (b.quantity || 0));
      if (bRem <= 0) continue;

      const take = Math.min(remainingPackagingToAllocate, bRem);
      const unitCost = b.costPerUnit !== undefined ? parseFloat(b.costPerUnit) : (parseFloat(b.cost_per_unit) || parseFloat(targetRM.cost_per_unit) || 0);
      const totalCost = parseFloat((take * unitCost).toFixed(2));

      packagingAllocations.push({
        batchId: b.id || b.batchId,
        supplierBatchNumber: b.supplierBatchNumber || b.batchNumber || '-',
        vendorId: b.vendorId || null,
        vendorName: b.vendorName || '-',
        quantity: take,
        quantityReversed: 0,
        unitCost,
        totalCost
      });

      b.remainingQuantity = parseFloat((bRem - take).toFixed(6));
      b.remainingQty = b.remainingQuantity;
      if (b.remainingQuantity <= 0) {
        b.status = 'CONSUMED';
      }
      b.updatedAt = now.toISOString();

      packagingTotalCost += totalCost;
      remainingPackagingToAllocate -= take;
    }

    if (remainingPackagingToAllocate > 0) {
      // Invariant fallback: if batches have less than targetRM.current_stock
      const allocatedSoFar = packagingNeeded - remainingPackagingToAllocate;
      return res.status(400).json({
        error: `Insufficient active batch stock for Packaging Raw Material "${targetRM.name}". Allocated ${allocatedSoFar} ${targetRM.unit || 'pcs'}, but need ${packagingNeeded} ${targetRM.unit || 'pcs'}. Please verify raw material batches.`
      });
    }
  }

  // ─── Deduct from FG stock ────────────────────────────────────────────────
  const remainingInBase = totalFGInBase - totalNeededInBase;
  fg.currentStock = fgBaseSizeInBase > 0 ? parseFloat((remainingInBase / fgBaseSizeInBase).toFixed(6)) : 0;
  fg.updatedAt = now.toISOString();

  // ─── Sync product.bulkStock ──────────────────────────────────────────────
  const bulkUnit = product.bulkStockUnit || fgBaseUnit;
  const remainingBulkInUnit = fgBaseSizeInBase > 0 ? parseFloat(
    unitConv.convert(remainingInBase, unitConv.getBaseUnit(fgBaseUnit), bulkUnit).toFixed(6)
  ) : 0;
  product.bulkStock     = remainingBulkInUnit;
  product.bulkStockUnit = bulkUnit;

  // ─── Add to variant bottle stock ─────────────────────────────────────────
  variant.stock = (variant.stock || 0) + numBottles;
  product.updatedAt = now.toISOString();
  prdData.lastUpdated = now.toISOString();
  writeJSONAtomic(PRODUCTS_FILE, prdData);

  // ─── Deduct from Packaging Raw Material and log VARIANT_PACKAGING txn ────
  let packagingTxnId = null;
  const auditCorrelationId = generateAuditCorrelationId();

  if (targetRM && packagingNeeded > 0) {
    const curRmStock = targetRM.current_stock !== undefined ? targetRM.current_stock : (targetRM.stock || 0);
    targetRM.current_stock = parseFloat(Math.max(0, curRmStock - packagingNeeded).toFixed(6));
    targetRM.stock = targetRM.current_stock;
    targetRM.updatedAt = now.toISOString();

    writeJSONAtomic(RAW_MATERIALS_FILE, rmData);
    writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);

    const rmTxnData = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
    const rmtId = uid('RMT');
    packagingTxnId = uid('TXN');

    rmTxnData.raw_material_transactions.push({
      id: rmtId,
      transactionId: packagingTxnId,
      auditCorrelationId,
      operationType: 'VARIANT_PACKAGING',
      transactionType: 'PACKAGING_DEDUCTION',
      action: 'Packaging Deduction',
      type: 'OUT',
      rawMaterialId: targetRM.id,
      rawMaterialName: targetRM.name,
      productId: product.id,
      productName: product.name,
      variantId: variant.variantId,
      variantName: variant.name,
      quantityProduced: numBottles,
      quantityReversed: 0,
      remainingReversibleQuantity: numBottles,
      reversed: false,
      reversalTransactionId: null,
      packagingRawMaterialId: targetRM.id,
      packagingRawMaterialName: targetRM.name,
      packagingQuantityConsumed: packagingNeeded,
      unit: targetRM.unit || 'pcs',
      allocations: packagingAllocations,
      totalCost: parseFloat(packagingTotalCost.toFixed(2)),
      operatorName: req.body?.operatorName || 'Plant Operator',
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr
    });
    rmTxnData.lastUpdated = now.toISOString();
    writeJSONAtomic(RAW_MAT_TXN_FILE, rmTxnData);

    // Audit INVENTORY_OUT
    try {
      const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
      logAuditEntry(mfgAudit, {
        auditId: generateAuditCorrelationId(),
        auditCorrelationId,
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        eventType: 'INVENTORY_OUT',
        category: 'INVENTORY',
        entityType: 'RAW_MATERIAL',
        entityId: targetRM.id,
        entityName: targetRM.name,
        action: 'Packaging Deduction',
        quantity: packagingNeeded,
        unit: targetRM.unit || 'pcs',
        productId: product.id,
        productName: product.name,
        variantId: variant.variantId,
        variantName: variant.name,
        operatorName: req.body?.operatorName || 'Plant Operator',
        notes: `Consumed ${packagingNeeded} ${targetRM.unit || 'pcs'} of "${targetRM.name}" to package ${numBottles} units of variant "${variant.name}"`
      });
      mfgAudit.lastUpdated = now.toISOString();
      writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
    } catch (_) {}
  }

  // ─── Log Finished Goods transaction ───────────────────────────────────────
  fgTxnData.finished_goods_transactions.push({
    id: uid('FGT'),
    date: dateStr,
    time: timeStr,
    auditCorrelationId,
    finishedGoodId: fg.id,
    productId: product.id,
    variantId: variant.variantId,
    productName: `${product.name} (${bSize} ${bUnit})`,
    action: 'Bottle Packaging (Deducted from Manufactured Stock)',
    type: 'OUT',
    quantity: numBottles,
    unit: 'pcs',
    remainingStock: fg.currentStock,
    referenceId: product.id,
    notes: `Packaged ${numBottles} containers of ${bSize} ${bUnit} (${totalNeededInBase.toFixed(3)} ${unitConv.getBaseUnit(bUnit)} deducted from Manufactured Finished Goods stock)` +
      (targetRM ? ` and consumed ${packagingNeeded} ${targetRM.unit || 'pcs'} of "${targetRM.name}"` : ''),
    createdAt: now.toISOString()
  });

  fgData.lastUpdated = fgTxnData.lastUpdated = now.toISOString();
  writeJSONAtomic(FINISHED_GOODS_FILE, fgData);
  writeJSONAtomic(FG_TXN_FILE, fgTxnData);

  res.json({
    success: true,
    message: `Successfully packaged ${numBottles} containers of ${bSize} ${bUnit}!` +
      (targetRM ? ` Consumed ${packagingNeeded} ${targetRM.unit || 'pcs'} of packaging "${targetRM.name}".` : ''),
    product,
    variant,
    remainingFinishedGoodsStock: fg.currentStock,
    variantStock: variant.stock,
    packagingDeducted: packagingNeeded,
    packagingAllocations,
    auditCorrelationId
  });
  });
});

app.post('/api/products/:id/update-variant-stock', (req, res) => {
  const prdData = readJSON(PRODUCTS_FILE);
  if (!prdData) return res.status(500).json({ error: 'Read failed' });

  const product = prdData.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { variantId, newStock } = req.body;
  const targetStock = parseInt(newStock, 10);
  if (isNaN(targetStock) || targetStock < 0) {
    return res.status(400).json({ error: 'New stock must be a non-negative integer' });
  }

  const variants = product.variants || [];
  const variantIndex = variants.findIndex(v => v.variantId === variantId || v.name === variantId);
  if (variantIndex === -1) {
    return res.status(404).json({ error: 'Bottle size variant not found' });
  }

  const variant = variants[variantIndex];
  const oldStock = variant.stock || 0;
  const delta = targetStock - oldStock;

  const bSize = variant.bottleSize || 200;
  const bUnit = variant.bottleSizeUnit || 'mL';

  // ─── Multi-key FG lookup ─────────────────────────────────────────────────
  const fgData    = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
  const fgTxnData = readJSON(FG_TXN_FILE)         || { finished_goods_transactions: [] };
  const now       = new Date();
  const dateStr   = now.toISOString().split('T')[0];
  const timeStr   = now.toTimeString().split(' ')[0];

  let fgIdx = fgData.finished_goods.findIndex(f => f.productId === product.id);
  if (fgIdx === -1 && product.recipeId) {
    fgIdx = fgData.finished_goods.findIndex(f => f.recipeId === product.recipeId);
  }
  if (fgIdx === -1 && product.recipeId) {
    const recData = readJSON(RECIPES_FILE) || { recipes: [] };
    const linkedRec = (recData.recipes || []).find(r => r.id === product.recipeId);
    if (linkedRec && linkedRec.name) {
      const recNameLower = linkedRec.name.toLowerCase().trim();
      fgIdx = fgData.finished_goods.findIndex(f => {
        const fgNameLower = (f.name || '').toLowerCase().trim();
        return fgNameLower === recNameLower || fgNameLower.includes(recNameLower) || recNameLower.includes(fgNameLower);
      });
    }
  }
  if (fgIdx === -1) {
    const pNameLower = product.name.toLowerCase();
    fgIdx = fgData.finished_goods.findIndex(f => {
      const fgNameLower = (f.name || '').toLowerCase();
      return fgNameLower === pNameLower || fgNameLower.includes(pNameLower) || pNameLower.includes(fgNameLower);
    });
  }

  let fg;
  if (fgIdx !== -1) {
    fg = fgData.finished_goods[fgIdx];
  } else {
    fg = {
      id: uid('FG'),
      productId: product.id,
      recipeId: product.recipeId || null,
      name: product.name,
      unit: 'pcs',
      bottleSize: bSize,
      bottleSizeUnit: bUnit,
      currentStock: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    fgData.finished_goods.push(fg);
    fgIdx = fgData.finished_goods.length - 1;
  }

  const fgCurrentStock = fg.currentStock || 0;
  const fgBaseSize     = fg.bottleSize || 1;
  const fgBaseUnit     = fg.bottleSizeUnit || bUnit;

  // ─── Dimension-aware conversion ──────────────────────────────────────────
  const fgBaseSizeInBase  = unitConv.convertToBase(fgBaseSize, fgBaseUnit);
  const varSizeInBase     = unitConv.convertToBase(bSize, bUnit);
  const totalFGInBase     = fgCurrentStock * fgBaseSizeInBase;
  const deltaInBase       = delta * varSizeInBase;

  if (delta > 0) {
    if (totalFGInBase < deltaInBase) {
      return res.status(400).json({
        error: `Insufficient Manufactured Stock. Adding +${delta} containers of ${bSize} ${bUnit} requires ${deltaInBase.toFixed(3)} ${unitConv.getBaseUnit(bUnit)}, but only ${totalFGInBase.toFixed(3)} ${unitConv.getBaseUnit(fgBaseUnit)} available.`
      });
    }
    fg.currentStock = fgBaseSizeInBase > 0
      ? parseFloat(((totalFGInBase - deltaInBase) / fgBaseSizeInBase).toFixed(6))
      : 0;
  } else if (delta < 0) {
    fg.currentStock = fgBaseSizeInBase > 0
      ? parseFloat(((totalFGInBase + Math.abs(deltaInBase)) / fgBaseSizeInBase).toFixed(6))
      : 0;
  }

  fg.updatedAt = now.toISOString();

  // ─── Sync product.bulkStock ──────────────────────────────────────────────
  if (delta !== 0) {
    const bulkUnit = product.bulkStockUnit || fgBaseUnit;
    try {
      const newFGInBase   = fg.currentStock * fgBaseSizeInBase;
      const newBulk       = unitConv.convert(newFGInBase, unitConv.getBaseUnit(fgBaseUnit), bulkUnit);
      product.bulkStock     = parseFloat(newBulk.toFixed(6));
      product.bulkStockUnit = bulkUnit;
    } catch (_) {}

    fgTxnData.finished_goods_transactions.push({
      id: uid('FGT'),
      date: dateStr,
      time: timeStr,
      finishedGoodId: fg.id,
      productId: product.id,
      variantId: variant.variantId,
      productName: `${product.name} (${bSize} ${bUnit})`,
      action: delta > 0 ? 'Bottle Packaging Stock Deduction' : 'Bottle Stock Return',
      type: delta > 0 ? 'OUT' : 'IN',
      quantity: Math.abs(delta),
      unit: 'pcs',
      remainingStock: fg.currentStock,
      referenceId: product.id,
      notes: delta > 0
        ? `Added +${delta} containers of ${bSize} ${bUnit} (${deltaInBase.toFixed(3)} ${unitConv.getBaseUnit(bUnit)} deducted from Manufactured Finished Goods stock)`
        : `Reduced ${Math.abs(delta)} containers of ${bSize} ${bUnit} (${Math.abs(deltaInBase).toFixed(3)} ${unitConv.getBaseUnit(bUnit)} returned to Manufactured Finished Goods stock)`,
      createdAt: now.toISOString()
    });
    fgData.lastUpdated = fgTxnData.lastUpdated = now.toISOString();
    writeJSONAtomic(FINISHED_GOODS_FILE, fgData);
    writeJSONAtomic(FG_TXN_FILE, fgTxnData);
  }

  // ─── Update variant stock on product ─────────────────────────────────────
  variant.stock = targetStock;
  product.updatedAt = now.toISOString();
  prdData.lastUpdated = now.toISOString();
  writeJSONAtomic(PRODUCTS_FILE, prdData);

  res.json({
    success: true,
    message: `Updated ${bSize} ${bUnit} stock to ${targetStock} pcs!`,
    variant,
    remainingFinishedGoodsStock: fg.currentStock,
    variantStock: variant.stock
  });
});


// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
app.get('/api/customers', (req, res) => {
  const d = readJSON(CUSTOMERS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.post('/api/customers', (req, res) => {
  const d = readJSON(CUSTOMERS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  if (!req.body.name || !req.body.name.trim()) return res.status(400).json({ error: 'Customer name is required' });
  const customer = { id: uid('CUS'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...req.body };
  d.customers.push(customer);
  d.lastUpdated = new Date().toISOString();
  writeJSON(CUSTOMERS_FILE, d);
  res.status(201).json({ success: true, customer });
});

app.put('/api/customers/:id', (req, res) => {
  const d = readJSON(CUSTOMERS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.customers.findIndex(c => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  d.customers[i] = { ...d.customers[i], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  d.lastUpdated = new Date().toISOString();
  writeJSON(CUSTOMERS_FILE, d);
  res.json({ success: true, customer: d.customers[i] });
});

app.delete('/api/customers/:id', (req, res) => {
  const d = readJSON(CUSTOMERS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.customers.findIndex(c => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const cust = d.customers[i];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  d.customers.splice(i, 1);
  d.lastUpdated = new Date().toISOString();
  writeJSONAtomic(CUSTOMERS_FILE, d);

  logDeletionAudit({
    entityType: 'customer',
    entityId: cust.id,
    entityName: cust.name,
    itemName: `Customer: ${cust.name} (GSTIN: ${cust.gstin || cust.businessGSTIN || '-'})`,
    reason,
    details: `Email: ${cust.email || '-'}, Phone: ${cust.phone || '-'}, State: ${cust.state || '-'}`,
    notes: `DELETED CUSTOMER: "${cust.name}" (ID: ${cust.id}). Reason: ${reason}`
  });

  res.json({ success: true });
});

// ─── INVOICES ────────────────────────────────────────────────────────────────
app.get('/api/invoices', (req, res) => {
  const d = readJSON(INVOICES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.post('/api/invoices', (req, res) => {
  return withInventoryLock(async () => {
    const items = req.body.items || req.body.lineItems || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invoice must contain at least one line item' });
    }

    // Strict numeric boundary validation
    for (const item of items) {
      const rawQty = item.quantity !== undefined ? item.quantity : item.qty;
      const qty = Number(rawQty);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: `Line item quantity must be a valid finite positive number (received: ${rawQty})` });
      }
      const rawRate = item.rate !== undefined ? item.rate : 0;
      const rate = Number(rawRate);
      if (!Number.isFinite(rate) || rate < 0) {
        return res.status(400).json({ error: `Line item rate must be a valid non-negative number (received: ${rawRate})` });
      }
    }

    const d = readJSON(INVOICES_FILE);
    if (!d) return res.status(500).json({ error: 'Read failed' });
    const settings = readJSON(SETTINGS_FILE) || {};
    const prdData = readJSON(PRODUCTS_FILE) || { products: [] };

    // ── MODULE 7 CRITICAL VALIDATION: INVOICE STOCK LIMIT CHECK ──────────────────
    for (const item of items) {
      const pId = item.productId || item.product_id;
      const rawQty = item.quantity !== undefined ? item.quantity : item.qty;
      const qty = Number(rawQty);
      if (!pId || qty <= 0) continue;

      const prd = prdData.products.find(p => p.id === pId);
      if (prd) {
        if (!prd.variants || prd.variants.length === 0) {
          return res.status(400).json({
            error: `Cannot invoice "${prd.name}". This product has no container / packaging variants configured. Invoicing requires products to have at least one variant.`
          });
        }

      const varId = item.variantId || item.variant_id;
      const itemName = item.name || item.productName || item.product_name || '';
      const varName = item.variantName || item.variant_name || '';

      let bSize = 200;
      let bUnit = prd.bulkStockUnit || 'mL';
      const sizeMatch = (itemName || varName).match(/\(([\d.]+)\s*([a-zA-Z]+)?\)/) || varName.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
      if (sizeMatch) {
        bSize = parseFloat(sizeMatch[1]) || bSize;
        if (sizeMatch[2]) bUnit = sizeMatch[2];
      }

      const variant = prd.variants.find(v =>
        (varId && (v.variantId === varId || v.name === varId)) ||
        (varName && (v.name === varName || String(v.bottleSize) === String(varName))) ||
        (v.bottleSize === bSize && v.bottleSizeUnit === bUnit) ||
        (itemName && itemName.includes(String(v.bottleSize)))
      ) || prd.variants[0];

      const availableStock = variant ? (variant.stock || 0) : 0;
      if (qty > availableStock) {
        return res.status(400).json({
          error: `Insufficient stock for ${itemName || prd.name}. Requested: ${qty}, Available: ${availableStock}.`
        });
      }
    }
  }

  d.lastInvoiceSeq = (d.lastInvoiceSeq || 0) + 1;
  const now   = new Date();
  const year  = now.getFullYear();
  const fyEnd = now.getMonth() >= 3 ? year + 1 : year;
  const fyStr = `${fyEnd - 1}-${String(fyEnd).slice(-2)}`;
  const seq   = String(d.lastInvoiceSeq).padStart(4, '0');
  const prefix = settings.invoicePrefix || 'INV';
  const invoiceNumber = req.body.invoiceNumber || `${prefix}/${fyStr}/${seq}`;

  // Enrich items with batchAllocations for end-to-end traceability (Section 8 & 9)
  const fgDataStore = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
  const batchDataStore = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };

  const enrichedItems = (items || []).map(it => {
    const pId = it.productId || it.product_id;
    const matchingFG = (fgDataStore.finished_goods || []).find(f => f.productId === pId || (it.name && f.name && it.name.includes(f.name)));
    const matchingBatch = (batchDataStore.manufacturing_batches || []).slice().reverse().find(b => b.productId === pId || (it.name && b.productName && it.name.includes(b.productName)));

    const fgBatchId = it.finishedGoodsBatchId || (matchingFG && matchingFG.finishedGoodsBatchId) || (matchingBatch && matchingBatch.finishedGoodsBatchId) || 'FGB-AUTO';
    const mfgBatchId = it.manufacturingBatchId || (matchingFG && matchingFG.manufacturingBatchId) || (matchingBatch && (matchingBatch.batchNumber || matchingBatch.id)) || 'MFG-AUTO';

    return {
      ...it,
      finishedGoodsBatchId: fgBatchId,
      manufacturingBatchId: mfgBatchId,
      batchAllocations: it.batchAllocations || [
        {
          finishedGoodsBatchId: fgBatchId,
          manufacturingBatchId: mfgBatchId,
          quantity: parseFloat(it.quantity || it.qty || 1)
        }
      ]
    };
  });

  const invoice = {
    id: uid('INV'),
    invoiceNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body,
    items: enrichedItems
  };

  d.invoices.push(invoice);
  d.lastUpdated = new Date().toISOString();
  writeJSON(INVOICES_FILE, d);

  // ── INVOICE CREATION STOCK DEDUCTION RULE ─────────────────────────────────
  // Invoices ONLY deduct from the Product Catalog Variant Bottle Stock
  // (the stock section where the user sets/views ready-to-sell bottle inventory).
  // Invoices DO NOT deduct from Manufactured Stock (Finished Goods pool).
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const prdData = readJSON(PRODUCTS_FILE) || { products: [] };
    let prdModified = false;

    for (const item of items) {
      const pId = item.productId || item.product_id;
      const qty = parseFloat(item.quantity || item.qty) || 0;
      if (!pId || qty <= 0) continue;

      const prdIdx = prdData.products.findIndex(p => p.id === pId);
      if (prdIdx === -1) continue;

      const prd = prdData.products[prdIdx];
      const varId = item.variantId || item.variant_id;
      const itemName = item.name || item.productName || item.product_name || '';
      const varName = item.variantName || item.variant_name || '';

      let bSize = 200;
      let bUnit = prd.bulkStockUnit || 'mL';
      const sizeMatch = (itemName || varName).match(/\(([\d.]+)\s*([a-zA-Z]+)?\)/) || varName.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
      if (sizeMatch) {
        bSize = parseFloat(sizeMatch[1]) || bSize;
        if (sizeMatch[2]) bUnit = sizeMatch[2];
      }

      if (prd.variants && prd.variants.length > 0) {
        let varIdx = prd.variants.findIndex(v =>
          (varId && (v.variantId === varId || v.name === varId)) ||
          (varName && (v.name === varName || String(v.bottleSize) === String(varName))) ||
          (v.bottleSize === bSize && v.bottleSizeUnit === bUnit) ||
          (itemName && itemName.includes(String(v.bottleSize)))
        );
        if (varIdx === -1) varIdx = 0;

        if (varIdx !== -1) {
          const curVarStock = prd.variants[varIdx].stock || 0;
          const newVarStock = Math.max(0, curVarStock - qty);
          prd.variants[varIdx].stock = newVarStock;
          prdModified = true;

          // Log variant deduction in Audit Ledger
          try {
            const fgTxnData = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0];

            fgTxnData.finished_goods_transactions.push({
              id: uid('FGT'),
              date: invoice.date || dateStr,
              time: timeStr,
              productId: prd.id,
              variantId: prd.variants[varIdx].variantId,
              productName: `${prd.name} (${bSize} ${bUnit})`,
              action: 'Sales Invoice Variant Stock Deduction',
              type: 'OUT',
              quantity: qty,
              unit: 'pcs',
              remainingStock: newVarStock,
              referenceId: invoiceNumber,
              notes: `Deducted ${qty} bottles of ${bSize} ${bUnit} variant for Invoice ${invoiceNumber}`,
              createdAt: now.toISOString()
            });
            fgTxnData.lastUpdated = now.toISOString();
            writeJSONAtomic(FG_TXN_FILE, fgTxnData);
          } catch (e) {
            console.error('Failed to log variant stock deduction transaction:', e);
          }
        }
      }
    }

    if (prdModified) {
      prdData.lastUpdated = now.toISOString();
      writeJSONAtomic(PRODUCTS_FILE, prdData);
    }
  } catch (prdErr) {
    console.error('Product variant stock deduction failed on invoice creation:', prdErr);
  }

  // Attach audit correlation ID to invoice if missing
  const auditCorrId = generateAuditCorrelationId();
  invoice.auditCorrelationId = auditCorrId;

  // Log Sales Invoice Created event in FG Transactions
  try {
    const fgTxnData = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };
    const dateStr = invoice.date || now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const custName = invoice.customerName || (invoice.customer && invoice.customer.name) || 'Walk-in Customer';
    const statusUpper = String(invoice.status || 'paid').toUpperCase();

    fgTxnData.finished_goods_transactions.push({
      id: uid('FGT'),
      date: dateStr,
      time: timeStr,
      action: `Sales Invoice Created (${statusUpper})`,
      type: 'OUT',
      productName: (invoice.items || []).map(i => i.name || i.productName).join(', ') || `Invoice ${invoiceNumber}`,
      referenceId: invoiceNumber,
      auditCorrelationId: auditCorrId,
      quantity: (invoice.items || []).reduce((sum, it) => sum + (parseFloat(it.quantity || it.qty) || 0), 0),
      unit: 'bottles',
      remainingStock: '-',
      user: custName,
      status: statusUpper,
      notes: `Invoice ${invoiceNumber} created · Status: ${statusUpper} · Total: ₹${invoice.grandTotal || 0} · Customer: ${custName}`,
      createdAt: now.toISOString()
    });
    fgTxnData.lastUpdated = now.toISOString();
    writeJSONAtomic(FG_TXN_FILE, fgTxnData);
  } catch (e) {
    console.error('Failed to log sales invoice creation audit transaction:', e);
  }

    res.status(201).json({ success: true, invoice });
  });
});

function logInvoiceStatusAudit(invoice, oldStatus, newStatus, operatorName = 'Finance Team') {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const auditCorrId = invoice.auditCorrelationId || generateAuditCorrelationId();
  invoice.auditCorrelationId = auditCorrId;
  const custName = invoice.customerName || (invoice.customer && invoice.customer.name) || 'Walk-in Customer';
  const invNum = invoice.invoiceNumber || invoice.id;
  const grandTot = invoice.grandTotal !== undefined ? invoice.grandTotal : 0;
  const statusUpper = String(newStatus).toUpperCase();
  const oldStatusUpper = String(oldStatus || 'DRAFT').toUpperCase();

  // 1. Log to Finished Goods / Sales Transactions (FG_TXN_FILE)
  try {
    const fgTxnData = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };
    fgTxnData.finished_goods_transactions.push({
      id: uid('FGT'),
      date: dateStr,
      time: timeStr,
      action: `Invoice Status Updated: ${statusUpper}`,
      type: statusUpper === 'CANCELLED' ? 'IN' : 'STATUS_CHANGE',
      productName: `Sales Invoice ${invNum}`,
      referenceId: invNum,
      auditCorrelationId: auditCorrId,
      quantity: (invoice.items || []).reduce((sum, it) => sum + (parseFloat(it.quantity || it.qty) || 0), 0),
      unit: 'bottles',
      remainingStock: '-',
      user: operatorName,
      status: statusUpper,
      notes: `Status changed from "${oldStatusUpper}" to "${statusUpper}" · Amount: ₹${grandTot} · Customer: ${custName}`,
      createdAt: now.toISOString()
    });
    fgTxnData.lastUpdated = now.toISOString();
    writeJSONAtomic(FG_TXN_FILE, fgTxnData);
  } catch (e) {
    console.error('Failed to log invoice status change to FG transactions:', e);
  }

  // 2. Log to Unified Manufacturing Audit Ledger (MANUFACTURING_AUDIT_FILE)
  try {
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    logAuditEntry(mfgAuditData, {
      auditId: generateAuditCorrelationId(),
      auditCorrelationId: auditCorrId,
      date: dateStr,
      timestamp: now.toISOString(),
      eventType: 'INVOICE_STATUS_CHANGE',
      category: 'COMMERCIAL',
      entityType: 'INVOICE',
      entityId: invoice.id,
      entityName: invoice.invoiceNumber,
      transactionType: `INVOICE_${statusUpper}`,
      batchNumber: invNum,
      productName: (invoice.items || []).map(i => i.name || i.productName).join(', ') || `Invoice ${invNum}`,
      operatorName: operatorName,
      notes: `Invoice ${invNum} marked as ${statusUpper} (₹${grandTot}) · Customer: ${custName}`
    });
    mfgAuditData.lastUpdated = now.toISOString();
    writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAuditData);
  } catch (e) {
    console.error('Failed to log invoice status change to manufacturing audit:', e);
  }
}

app.put('/api/invoices/:id', (req, res) => {
  const d = readJSON(INVOICES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const invoice = (d.invoices || []).find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const oldStatus = invoice.status;
  const newStatus = req.body.status !== undefined ? req.body.status : oldStatus;
  const isStatusChange = req.body.status !== undefined && String(oldStatus).toLowerCase() !== String(newStatus).toLowerCase();

  if (req.body.status !== undefined) {
    invoice.status = req.body.status;
  }
  Object.keys(req.body).forEach(key => {
    if (key !== 'id' && key !== 'invoiceNumber') {
      invoice[key] = req.body[key];
    }
  });

  const now = new Date();
  invoice.updatedAt = now.toISOString();
  d.lastUpdated = now.toISOString();
  writeJSONAtomic(INVOICES_FILE, d);

  if (isStatusChange) {
    logInvoiceStatusAudit(invoice, oldStatus, newStatus, req.body.operatorName || req.body.userName);
  }

  res.json({ success: true, invoice });
});

app.patch('/api/invoices/:id', (req, res) => {
  const d = readJSON(INVOICES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const invoice = (d.invoices || []).find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const oldStatus = invoice.status;
  const newStatus = req.body.status !== undefined ? req.body.status : oldStatus;
  const isStatusChange = req.body.status !== undefined && String(oldStatus).toLowerCase() !== String(newStatus).toLowerCase();

  if (req.body.status !== undefined) {
    invoice.status = req.body.status;
  }
  Object.keys(req.body).forEach(key => {
    if (key !== 'id' && key !== 'invoiceNumber') {
      invoice[key] = req.body[key];
    }
  });

  const now = new Date();
  invoice.updatedAt = now.toISOString();
  d.lastUpdated = now.toISOString();
  writeJSONAtomic(INVOICES_FILE, d);

  if (isStatusChange) {
    logInvoiceStatusAudit(invoice, oldStatus, newStatus, req.body.operatorName || req.body.userName);
  }

  res.json({ success: true, invoice });
});

app.delete('/api/invoices/:id', (req, res) => {
  const d = readJSON(INVOICES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.invoices.findIndex(inv => inv.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Invoice not found' });
  const invoice = d.invoices[i];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });
  const shouldRestock = req.query?.restock === 'true' || req.query?.restock === true || req.body?.restock === true || (req.url && req.url.includes('restock=true'));
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const invoiceItems = invoice.items || invoice.lineItems || [];
  if (shouldRestock && invoiceItems.length > 0) {
    // ── WORKFLOW RULE ──────────────────────────────────────────────────────────
    // Invoice cancellation ONLY restores: Finished Goods stock + Variant bottle stock
    // Bulk Stock is NOT restored (it was deducted during Bottle Packaging, not invoicing)
    // Raw Materials are NOT restored (they were deducted during Manufacturing, not invoicing)
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const fgData = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
      const fgTxnData = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };
      const prdData = readJSON(PRODUCTS_FILE) || { products: [] };

      let fgModified = false;
      let prdModified = false;

      for (const item of invoiceItems) {
        const pName = (item.name || item.productName || item.product_name || '').trim();
        const pId = item.productId || item.product_id || null;
        const qty = parseFloat(item.quantity || item.qty) || 0;
        if (!pName || qty <= 0) continue;

        const cleanItemName = pName.split('(')[0].trim().toLowerCase();

        // 1. Restock Variant Bottle Stock in Product Catalog
        // Finished Goods Manufactured Stock is NOT altered (invoices only touch variant bottle stock)


        // 2. Restock Variant Bottle Stock only
        // NOTE: bulkStock is NOT restored — it belongs to the Bottle Packaging step, not invoicing
        const prdIdx = prdData.products.findIndex(p => p.id === pId);
        if (prdIdx !== -1) {
          const prd = prdData.products[prdIdx];
          const varId = item.variantId || item.variant_id;
          const itemName = item.name || item.productName || item.product_name || '';
          const varName = item.variantName || item.variant_name || '';

          let bSize = 200;
          let bUnit = prd.bulkStockUnit || 'mL';
          const sizeMatch = (itemName || varName).match(/\(([\d.]+)\s*([a-zA-Z]+)?\)/) || varName.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
          if (sizeMatch) {
            bSize = parseFloat(sizeMatch[1]) || bSize;
            if (sizeMatch[2]) bUnit = sizeMatch[2];
          }

          if (prd.variants && prd.variants.length > 0) {
            let varIdx = prd.variants.findIndex(v =>
              (varId && (v.variantId === varId || v.name === varId)) ||
              (varName && (v.name === varName || String(v.bottleSize) === String(varName))) ||
              (v.bottleSize === bSize && v.bottleSizeUnit === bUnit) ||
              (itemName && itemName.includes(String(v.bottleSize)))
            );
            if (varIdx === -1) varIdx = 0;

            if (varIdx !== -1) {
              prd.variants[varIdx].stock = (prd.variants[varIdx].stock || 0) + qty;
              prdModified = true;
            }
          }
          // bulkStock intentionally not restored here
        }
      }

      if (fgModified) {
        fgData.lastUpdated = fgTxnData.lastUpdated = now.toISOString();
        writeJSONAtomic(FINISHED_GOODS_FILE, fgData);
        writeJSONAtomic(FG_TXN_FILE, fgTxnData);
      }
      if (prdModified) {
        prdData.lastUpdated = now.toISOString();
        writeJSONAtomic(PRODUCTS_FILE, prdData);
      }
    } catch (restockErr) {
      console.error('Invoice cancellation restock failed:', restockErr);
    }
  }

  const custName = invoice.customerName || (invoice.customer && invoice.customer.name) || 'Walk-in Customer';

  d.invoices.splice(i, 1);
  d.lastUpdated = now.toISOString();
  writeJSONAtomic(INVOICES_FILE, d);

  logDeletionAudit({
    entityType: 'invoice',
    entityId: invoice.id,
    entityName: invoice.invoiceNumber || invoice.id,
    itemName: `Invoice: ${invoice.invoiceNumber || invoice.id} (${custName})`,
    reason,
    deductedVal: invoice.grandTotal || 0,
    details: `Customer: ${custName}, Total: ₹${invoice.grandTotal || 0}, Restocked: ${shouldRestock ? 'YES' : 'NO'}`,
    notes: `DELETED INVOICE: "${invoice.invoiceNumber || invoice.id}". Grand Total: ₹${invoice.grandTotal || 0}. Restocked: ${shouldRestock ? 'Yes' : 'No'}. Reason: ${reason}`
  });

  res.json({ success: true, restocked: shouldRestock });
});

// ─── CLEAR AUDIT LEDGERS ENDPOINT ────────────────────────────────────────────
app.delete('/api/audit-ledgers', (req, res) => {
  const now = new Date().toISOString();
  writeJSONAtomic(RAW_MAT_TXN_FILE,         { raw_material_transactions: [], lastUpdated: now });
  writeJSONAtomic(FG_TXN_FILE,              { finished_goods_transactions: [], lastUpdated: now });
  writeJSONAtomic(MANUFACTURING_AUDIT_FILE, { manufacturing_audit: [], lastUpdated: now });
  writeJSONAtomic(RECIPE_HISTORY_FILE,      { recipe_history: [], lastUpdated: now });
  console.log('✅ Audit ledgers cleared (4 files wiped):', new Date().toLocaleString());
  res.json({ success: true, message: 'All audit ledgers, transaction histories, and deletion records cleared successfully (including recipe history)' });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const s = readJSON(SETTINGS_FILE);
  if (!s) return res.status(500).json({ error: 'Read failed' });
  res.json(s);
});

app.put('/api/settings', (req, res) => {
  const current = readJSON(SETTINGS_FILE) || {};
  const updated = { ...current, ...req.body };
  writeJSON(SETTINGS_FILE, updated);
  res.json({ success: true });
});

// ─── FACTORY RESET / CLEAR ALL DATA ──────────────────────────────────────────
app.post('/api/system/reset-data', (req, res) => {
  try {
    const defaultSettings = {
      apiKey: '',
      modelName: 'google/gemma-4-26b-a4b-it:free',
      businessName: '',
      businessGSTIN: '',
      businessAddress: '',
      businessStateCode: '',
      businessState: '',
      businessEmail: '',
      businessPhone: '',
      businessPAN: '',
      businessWebsite: '',
      termsAndConditions: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.\n3. Subject to local jurisdiction only.',
      declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
      bankName: '',
      bankBranch: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      accentColor: '#4f46e5',
      taxRate: 18,
      currencySymbol: '₹',
      invoicePrefix: 'INV-',
      hsnCode: '',
      companyLogo: null,
      signatureImage: null,
      authPin: '',
      invoiceCustomField1: '',
      invoiceCustomField2: '',
      invoiceCustomField3: '',
      invoiceCustomField4: '',
      invoiceCustomField5: '',
      mfgCustomField1: '',
      mfgCustomField2: '',
      mfgCustomField3: '',
      mfgCustomField4: '',
      mfgCustomField5: '',
      firstLaunchCompleted: false,
      lastUpdated: new Date().toISOString()
    };

    writeJSONAtomic(SETTINGS_FILE, defaultSettings);
    writeJSONAtomic(PRODUCTS_FILE, { products: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(CUSTOMERS_FILE, { customers: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(INVOICES_FILE, { invoices: [], lastInvoiceSeq: 0, lastUpdated: new Date().toISOString() });
    writeJSONAtomic(RAW_MATERIALS_FILE, { raw_materials: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(RECIPES_FILE, { recipes: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(RECIPE_HISTORY_FILE, { recipe_history: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(MANUFACTURING_BATCHES_FILE, { manufacturing_batches: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(MANUFACTURING_AUDIT_FILE, { manufacturing_audit: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(FINISHED_GOODS_FILE, { finished_goods: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(RAW_MAT_TXN_FILE, { raw_material_transactions: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, { raw_material_batches: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(FG_TXN_FILE, { finished_goods_transactions: [], lastUpdated: new Date().toISOString() });
    writeJSONAtomic(NOTES_FILE, { notes: '' });

    if (fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR);
      files.forEach(f => {
        if (f.startsWith('pre_import_backup') || f.endsWith('.tmp') || f.endsWith('.bak')) {
          try { fs.unlinkSync(path.join(DATA_DIR, f)); } catch (_) {}
        }
      });
      try { fs.writeFileSync(path.join(DATA_DIR, '.version'), '3.1.0', 'utf8'); } catch (_) {}
    }

    res.json({ success: true, message: 'All data successfully reset to pristine factory state.' });
  } catch (err) {
    console.error('Failed to reset system data:', err);
    res.status(500).json({ error: 'Failed to reset system data: ' + err.message });
  }
});


// ─── FULL SYSTEM DATA EXPORT ENDPOINT (JSON) ──────────────────────────────
app.get('/api/export-data', (req, res) => {
  try {
    const settings      = readJSON(SETTINGS_FILE) || {};
    const products      = readJSON(PRODUCTS_FILE) || { products: [] };
    const customers     = readJSON(CUSTOMERS_FILE) || { customers: [] };
    const invoices      = readJSON(INVOICES_FILE) || { invoices: [] };
    const rawMaterials  = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
    const recipes       = readJSON(RECIPES_FILE) || { recipes: [] };
    const recipeHistory = readJSON(RECIPE_HISTORY_FILE) || { recipe_history: [] };
    const batches       = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
    const mfgAudit      = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    const finishedGoods = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
    const rawMatTxns    = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
    const rmBatches     = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    const fgTxns        = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };

    const exportBundle = {
      appName: 'InvoiceWise Manufacturing ERP',
      version: '3.1.0',
      exportTimestamp: new Date().toISOString(),
      companyProfile: settings,
      rawMaterials: rawMaterials.raw_materials || [],
      recipes: recipes.recipes || [],
      recipeHistory: recipeHistory.recipe_history || [],
      manufacturingBatches: batches.manufacturing_batches || [],
      manufacturingAudit: mfgAudit.manufacturing_audit || [],
      products: products.products || [],
      finishedGoods: finishedGoods.finished_goods || [],
      rawMaterialBatches: rmBatches.raw_material_batches || [],
      customers: customers.customers || [],
      invoices: invoices.invoices || [],
      auditLedgers: {
        rawMaterialTransactions: rawMatTxns.raw_material_transactions || [],
        finishedGoodsTransactions: fgTxns.finished_goods_transactions || []
      }
    };

    const fileName = `invoicewise_full_export_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(exportBundle, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Data export failed: ' + err.message });
  }
});

// ─── FULL SYSTEM DATA IMPORT ENDPOINT ────────────────────────────────────────
app.post('/api/import-data', (req, res) => {
  try {
    const bundle = req.body;

    // Detect root array vs object bundle
    let bundleData = bundle;
    if (Array.isArray(bundle)) {
      const sample = bundle[0] || {};
      if (sample.sku || sample.hsn_sac || sample.variants) {
        bundleData = { products: bundle };
      } else if (sample.purchaseCost || sample.cost_per_unit || sample.reorder_point) {
        bundleData = { rawMaterials: bundle };
      } else if (sample.gstin || sample.address) {
        bundleData = { customers: bundle };
      } else if (sample.invoiceNumber || sample.grandTotal) {
        bundleData = { invoices: bundle };
      } else if (sample.ingredients) {
        bundleData = { recipes: bundle };
      } else {
        bundleData = { products: bundle };
      }
    }

    const rawMaterialsList  = bundleData.rawMaterials || bundleData.raw_materials;
    const recipesList       = bundleData.recipes;
    const productsList      = bundleData.products;
    const customersList     = bundleData.customers;
    const invoicesList      = bundleData.invoices;
    const finishedGoodsList = bundleData.finishedGoods || bundleData.finished_goods;
    const mfgBatchesList    = bundleData.manufacturingBatches || bundleData.manufacturing_batches;
    const profileObj        = bundleData.companyProfile || bundleData.company_profile || bundleData.settings;
    const auditLedgersObj   = bundleData.auditLedgers || bundleData.audit_ledgers;

    // Validate that bundle contains usable ERP data
    const hasUsableData = Boolean(
      profileObj ||
      (Array.isArray(rawMaterialsList)  && rawMaterialsList.length > 0)  ||
      (Array.isArray(recipesList)       && recipesList.length > 0)       ||
      (Array.isArray(productsList)      && productsList.length > 0)      ||
      (Array.isArray(finishedGoodsList) && finishedGoodsList.length > 0) ||
      (Array.isArray(customersList)     && customersList.length > 0)     ||
      (Array.isArray(invoicesList)      && invoicesList.length > 0)      ||
      (Array.isArray(mfgBatchesList)    && mfgBatchesList.length > 0)
    );

    if (!hasUsableData) {
      return res.status(400).json({
        error: 'No importable data found. Ensure your JSON file contains products, raw materials, recipes, customers, or invoices.'
      });
    }

    // --- Pre-import safety backup of current data ---
    const backupBundle = {
      backupTimestamp: new Date().toISOString(),
      settings:                    readJSON(SETTINGS_FILE) || {},
      products:                    readJSON(PRODUCTS_FILE) || {},
      customers:                   readJSON(CUSTOMERS_FILE) || {},
      invoices:                    readJSON(INVOICES_FILE) || {},
      raw_materials:               readJSON(RAW_MATERIALS_FILE) || {},
      recipes:                     readJSON(RECIPES_FILE) || {},
      manufacturing_batches:       readJSON(MANUFACTURING_BATCHES_FILE) || {},
      finished_goods:              readJSON(FINISHED_GOODS_FILE) || {},
      raw_material_transactions:   readJSON(RAW_MAT_TXN_FILE) || {},
      finished_goods_transactions: readJSON(FG_TXN_FILE) || {}
    };
    const backupFile = path.join(DATA_DIR, 'pre_import_backup.json');
    writeJSON(backupFile, backupBundle);

    // --- Write each data store from the import bundle ---
    if (profileObj && typeof profileObj === 'object')
      writeJSON(SETTINGS_FILE, profileObj);

    if (Array.isArray(productsList))
      writeJSON(PRODUCTS_FILE, { products: productsList, lastUpdated: new Date().toISOString() });

    if (Array.isArray(customersList))
      writeJSON(CUSTOMERS_FILE, { customers: customersList, lastUpdated: new Date().toISOString() });

    if (Array.isArray(invoicesList))
      writeJSON(INVOICES_FILE, { invoices: invoicesList, lastUpdated: new Date().toISOString() });

    if (Array.isArray(rawMaterialsList))
      writeJSON(RAW_MATERIALS_FILE, { raw_materials: rawMaterialsList, lastUpdated: new Date().toISOString() });

    if (Array.isArray(recipesList))
      writeJSON(RECIPES_FILE, { recipes: recipesList, lastUpdated: new Date().toISOString() });

    if (Array.isArray(mfgBatchesList))
      writeJSON(MANUFACTURING_BATCHES_FILE, { manufacturing_batches: mfgBatchesList, lastUpdated: new Date().toISOString() });

    if (Array.isArray(finishedGoodsList))
      writeJSON(FINISHED_GOODS_FILE, { finished_goods: finishedGoodsList, lastUpdated: new Date().toISOString() });

    if (auditLedgersObj) {
      const rmTxns = auditLedgersObj.rawMaterialTransactions || auditLedgersObj.raw_material_transactions;
      const fgTxns = auditLedgersObj.finishedGoodsTransactions || auditLedgersObj.finished_goods_transactions;

      if (Array.isArray(rmTxns))
        writeJSON(RAW_MAT_TXN_FILE, { raw_material_transactions: rmTxns, lastUpdated: new Date().toISOString() });
      if (Array.isArray(fgTxns))
        writeJSON(FG_TXN_FILE, { finished_goods_transactions: fgTxns, lastUpdated: new Date().toISOString() });
    }

    res.json({
      success: true,
      message: 'All data imported successfully. A pre-import backup was saved to data/pre_import_backup.json.',
      importedAt: new Date().toISOString(),
      summary: {
        rawMaterials:         (rawMaterialsList || []).length,
        recipes:              (recipesList || []).length,
        manufacturingBatches: (mfgBatchesList || []).length,
        products:             (productsList || []).length,
        finishedGoods:        (finishedGoodsList || []).length,
        customers:            (customersList || []).length,
        invoices:             (invoicesList || []).length
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Data import failed: ' + err.message });
  }
});

// ─── MODULAR SECTION IMPORT ENDPOINT (Section 2) ─────────────────────────────
app.post('/api/import-data/:section', (req, res) => {
  try {
    const rawSection = req.params.section;
    const mode = (req.query.mode || req.body.mode || 'add').toLowerCase(); // 'add' | 'merge' | 'replace'
    const payload = req.body.data !== undefined ? req.body.data : req.body;

    // Map section name aliases
    const sectionMap = {
      'rawmaterials': 'rawMaterials',
      'raw_materials': 'rawMaterials',
      'rawmaterial': 'rawMaterials',
      'recipes': 'recipes',
      'recipe': 'recipes',
      'products': 'products',
      'product': 'products',
      'variants': 'products',
      'productvariants': 'products',
      'product_variants': 'products',
      'customers': 'customers',
      'customer': 'customers',
      'invoices': 'invoices',
      'invoice': 'invoices',
      'salesinvoices': 'invoices',
      'sales_invoices': 'invoices',
      'finishedgoods': 'finishedGoods',
      'finished_goods': 'finishedGoods',
      'manufacturingbatches': 'manufacturingBatches',
      'manufacturing_batches': 'manufacturingBatches',
      'batches': 'manufacturingBatches',
      'rawmaterialbatches': 'rawMaterialBatches',
      'raw_material_batches': 'rawMaterialBatches',
      'auditledgers': 'auditLedgers',
      'audit_ledgers': 'auditLedgers',
      'transactions': 'auditLedgers',
      'companyprofile': 'companyProfile',
      'company_profile': 'companyProfile',
      'settings': 'companyProfile'
    };

    const targetSection = sectionMap[rawSection.toLowerCase().replace(/[^a-z0-9_]/g, '')] || rawSection;

    // 1. Create timestamped safety backup
    const nowD = new Date();
    const dateStamp = nowD.toISOString().split('T')[0];
    const timeStamp = String(nowD.getHours()).padStart(2, '0') + '-' + String(nowD.getMinutes()).padStart(2, '0') + '-' + String(nowD.getSeconds()).padStart(2, '0');
    const backupFileName = `pre_import_backup_${targetSection}_${dateStamp}_${timeStamp}.json`;
    const backupFilePath = path.join(DATA_DIR, backupFileName);

    const fullBackup = {
      backupTimestamp: nowD.toISOString(),
      sectionImported: targetSection,
      importMode: mode,
      settings: readJSON(SETTINGS_FILE) || {},
      products: readJSON(PRODUCTS_FILE) || {},
      customers: readJSON(CUSTOMERS_FILE) || {},
      invoices: readJSON(INVOICES_FILE) || {},
      raw_materials: readJSON(RAW_MATERIALS_FILE) || {},
      recipes: readJSON(RECIPES_FILE) || {},
      manufacturing_batches: readJSON(MANUFACTURING_BATCHES_FILE) || {},
      finished_goods: readJSON(FINISHED_GOODS_FILE) || {},
      raw_material_transactions: readJSON(RAW_MAT_TXN_FILE) || {},
      raw_material_batches: readJSON(RAW_MATERIAL_BATCHES_FILE) || {},
      finished_goods_transactions: readJSON(FG_TXN_FILE) || {}
    };
    writeJSONAtomic(backupFilePath, fullBackup);
    writeJSONAtomic(path.join(DATA_DIR, 'pre_import_backup.json'), fullBackup);

    // 2. Normalize records to import
    let importList = [];
    if (Array.isArray(payload)) {
      importList = payload;
    } else if (typeof payload === 'object' && payload !== null) {
      if (Array.isArray(payload[targetSection])) {
        importList = payload[targetSection];
      } else if (Array.isArray(payload.items || payload.records || payload.data)) {
        importList = payload.items || payload.records || payload.data;
      } else if (targetSection === 'companyProfile' || targetSection === 'settings') {
        importList = [payload.companyProfile || payload.settings || payload];
      } else {
        // Try to find any array property
        const keys = Object.keys(payload);
        for (const k of keys) {
          if (Array.isArray(payload[k])) {
            importList = payload[k];
            break;
          }
        }
        // Fallback: If payload is a single record object (e.g. { id: "RM-...", name: "..." }), wrap it in an array
        if ((!importList || importList.length === 0) && payload && typeof payload === 'object' && !Array.isArray(payload)) {
          if (payload.name || payload.id || payload.productName || payload.customerName || payload.businessName || payload.title) {
            importList = [payload];
          }
        }
      }
    }

    if (targetSection !== 'companyProfile' && (!Array.isArray(importList) || importList.length === 0)) {
      return res.status(400).json({
        error: `No valid records found in payload for section "${targetSection}". Please provide an array of records.`
      });
    }

    const validationErrors = [];
    let newRecordsCount = 0;
    let updatedRecordsCount = 0;
    let skippedRecordsCount = 0;

    // Helper for generating IDs
    const ensureId = (rec, prefix, seq) => {
      if (!rec.id) rec.id = `${prefix}-${String(seq).padStart(6, '0')}`;
      return rec.id;
    };

    // 3. Process Section
    switch (targetSection) {
      case 'rawMaterials': {
        const d = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
        const existing = d.raw_materials || [];

        // Validate
        importList.forEach((r, idx) => {
          if (!r.name || !String(r.name).trim()) validationErrors.push(`Record #${idx + 1}: Missing name`);
          if (!r.unit) r.unit = 'kg';
        });

        if (mode === 'replace') {
          importList.forEach((r, idx) => ensureId(r, 'RM', idx + 1));
          d.raw_materials = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const matchIdx = existing.findIndex(ex => ex.id === r.id || ex.name.trim().toLowerCase() === (r.name || '').trim().toLowerCase());
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r, updatedAt: nowD.toISOString() };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              ensureId(r, 'RM', existing.length + 1);
              existing.push({
                ...r,
                stock: parseFloat(r.stock || r.current_stock) || 0,
                current_stock: parseFloat(r.current_stock || r.stock) || 0,
                createdAt: r.createdAt || nowD.toISOString(),
                updatedAt: nowD.toISOString()
              });
              newRecordsCount++;
            }
          });
          d.raw_materials = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(RAW_MATERIALS_FILE, d);
        break;
      }

      case 'recipes': {
        const d = readJSON(RECIPES_FILE) || { recipes: [] };
        const existing = d.recipes || [];

        importList.forEach((r, idx) => {
          if (!r.name) validationErrors.push(`Record #${idx + 1}: Missing recipe name`);
          if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
            validationErrors.push(`Record #${idx + 1} (${r.name || 'unnamed'}): Missing ingredients`);
          }
        });

        if (mode === 'replace') {
          importList.forEach((r, idx) => {
            ensureId(r, 'RCP', idx + 1);
            if (!r.version) r.version = 1;
          });
          d.recipes = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const matchIdx = existing.findIndex(ex => ex.id === r.id || ex.name.trim().toLowerCase() === (r.name || '').trim().toLowerCase());
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r, version: (existing[matchIdx].version || 1) + 1, updatedAt: nowD.toISOString() };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              ensureId(r, 'RCP', existing.length + 1);
              existing.push({
                ...r,
                version: r.version || 1,
                createdAt: r.createdAt || nowD.toISOString(),
                updatedAt: nowD.toISOString()
              });
              newRecordsCount++;
            }
          });
          d.recipes = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(RECIPES_FILE, d);
        break;
      }

      case 'products': {
        const d = readJSON(PRODUCTS_FILE) || { products: [] };
        const existing = d.products || [];

        importList.forEach((r, idx) => {
          if (!r.name && !r.title) validationErrors.push(`Record #${idx + 1}: Missing product name`);
        });

        if (mode === 'replace') {
          importList.forEach((r, idx) => ensureId(r, 'PRD', idx + 1));
          d.products = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const rName = (r.name || r.title || '').trim().toLowerCase();
            const matchIdx = existing.findIndex(ex => ex.id === r.id || (ex.sku && r.sku && ex.sku === r.sku) || ex.name.trim().toLowerCase() === rName);
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r, updatedAt: nowD.toISOString() };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              ensureId(r, 'PRD', existing.length + 1);
              existing.push({
                ...r,
                name: r.name || r.title,
                createdAt: r.createdAt || nowD.toISOString(),
                updatedAt: nowD.toISOString()
              });
              newRecordsCount++;
            }
          });
          d.products = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(PRODUCTS_FILE, d);
        break;
      }

      case 'customers': {
        const d = readJSON(CUSTOMERS_FILE) || { customers: [] };
        const existing = d.customers || [];

        importList.forEach((r, idx) => {
          if (!r.name) validationErrors.push(`Record #${idx + 1}: Missing customer name`);
        });

        if (mode === 'replace') {
          importList.forEach((r, idx) => ensureId(r, 'CUS', idx + 1));
          d.customers = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const rGstin = (r.gstin || '').trim().toUpperCase();
            const matchIdx = existing.findIndex(ex => ex.id === r.id || (rGstin && ex.gstin && ex.gstin.toUpperCase() === rGstin) || ex.name.trim().toLowerCase() === (r.name || '').trim().toLowerCase());
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r, updatedAt: nowD.toISOString() };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              ensureId(r, 'CUS', existing.length + 1);
              existing.push({
                ...r,
                createdAt: r.createdAt || nowD.toISOString(),
                updatedAt: nowD.toISOString()
              });
              newRecordsCount++;
            }
          });
          d.customers = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(CUSTOMERS_FILE, d);
        break;
      }

      case 'invoices': {
        const d = readJSON(INVOICES_FILE) || { invoices: [] };
        const existing = d.invoices || [];

        if (mode === 'replace') {
          importList.forEach((r, idx) => ensureId(r, 'INV', idx + 1));
          d.invoices = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const matchIdx = existing.findIndex(ex => ex.id === r.id || (r.invoiceNumber && ex.invoiceNumber === r.invoiceNumber));
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r, updatedAt: nowD.toISOString() };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              ensureId(r, 'INV', existing.length + 1);
              existing.push({
                ...r,
                createdAt: r.createdAt || nowD.toISOString(),
                updatedAt: nowD.toISOString()
              });
              newRecordsCount++;
            }
          });
          d.invoices = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(INVOICES_FILE, d);
        break;
      }

      case 'manufacturingBatches': {
        const d = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
        const existing = d.manufacturing_batches || [];

        if (mode === 'replace') {
          d.manufacturing_batches = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const matchIdx = existing.findIndex(ex => ex.id === r.id || (r.batchNumber && ex.batchNumber === r.batchNumber));
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              existing.push(r);
              newRecordsCount++;
            }
          });
          d.manufacturing_batches = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(MANUFACTURING_BATCHES_FILE, d);
        break;
      }

      case 'finishedGoods': {
        const d = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
        const existing = d.finished_goods || [];

        if (mode === 'replace') {
          d.finished_goods = importList;
          newRecordsCount = importList.length;
        } else {
          importList.forEach(r => {
            const matchIdx = existing.findIndex(ex => ex.id === r.id || (r.productId && ex.productId === r.productId));
            if (matchIdx !== -1) {
              if (mode === 'merge') {
                existing[matchIdx] = { ...existing[matchIdx], ...r, updatedAt: nowD.toISOString() };
                updatedRecordsCount++;
              } else {
                skippedRecordsCount++;
              }
            } else {
              existing.push(r);
              newRecordsCount++;
            }
          });
          d.finished_goods = existing;
        }
        d.lastUpdated = nowD.toISOString();
        writeJSONAtomic(FINISHED_GOODS_FILE, d);
        break;
      }

      case 'companyProfile': {
        const profile = importList[0] || payload;
        const current = readJSON(SETTINGS_FILE) || {};
        const updated = mode === 'replace' ? profile : { ...current, ...profile };
        writeJSONAtomic(SETTINGS_FILE, updated);
        updatedRecordsCount = 1;
        break;
      }

      default: {
        return res.status(400).json({
          error: `Unsupported section "${targetSection}". Supported: rawMaterials, recipes, products, customers, invoices, manufacturingBatches, finishedGoods, companyProfile`
        });
      }
    }

    res.json({
      success: true,
      message: `Section "${targetSection}" imported successfully via [${mode.toUpperCase()}] mode.`,
      section: targetSection,
      mode,
      backupFile: backupFileName,
      recordsDetected: importList.length,
      newRecords: newRecordsCount,
      updatedRecords: updatedRecordsCount,
      skippedRecords: skippedRecordsCount,
      validationWarnings: validationErrors
    });
  } catch (err) {
    console.error('Section Import Error:', err);
    res.status(500).json({ error: 'Section import failed: ' + err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ─── INVENTORY: RAW MATERIALS ────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/raw-materials', (req, res) => {
  const d = readJSON(RAW_MATERIALS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.get('/api/raw-materials/:id', (req, res) => {
  const d = readJSON(RAW_MATERIALS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const item = (d.raw_materials || []).find(r => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Raw material not found' });
  res.json(item);
});

app.post('/api/raw-materials', (req, res) => {
  const d = readJSON(RAW_MATERIALS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const { name, unit } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Raw material name is required' });
  if (!unit || !unit.trim()) return res.status(400).json({ error: 'Unit type is required' });

  const initialStock = parseFloat(req.body.openingStock !== undefined ? req.body.openingStock : (req.body.stock !== undefined ? req.body.stock : req.body.current_stock)) || 0;
  if (initialStock < 0) return res.status(400).json({ error: 'Initial stock cannot be negative' });

  const trimmedName = name.trim().toLowerCase();
  const exists = (d.raw_materials || []).some(r => r.name.trim().toLowerCase() === trimmedName);
  if (exists) return res.status(400).json({ error: `Raw material with name "${name.trim()}" already exists` });

  const rmId = `RM-${String((d.raw_materials || []).length + 1).padStart(6, '0')}`;
  const now = new Date().toISOString();

  const rm = {
    id: rmId,
    name: name.trim(),
    category: req.body.category || 'General',
    description: req.body.description || '',
    unit: unitConv.normalizeUnit(unit.trim()),
    stock: initialStock,
    current_stock: initialStock,
    minimumStock: parseFloat(req.body.minimumStock !== undefined ? req.body.minimumStock : req.body.reorder_point) || 0,
    reorder_point: parseFloat(req.body.minimumStock !== undefined ? req.body.minimumStock : req.body.reorder_point) || 0,
    purchaseCost: parseFloat(req.body.purchaseCost !== undefined ? req.body.purchaseCost : req.body.cost_per_unit) || 0,
    cost_per_unit: parseFloat(req.body.purchaseCost !== undefined ? req.body.purchaseCost : req.body.cost_per_unit) || 0,
    supplier: req.body.supplier || req.body.vendorName || '',
    purchaseDate: req.body.purchaseDate || new Date().toISOString().split('T')[0],
    batchNumber: req.body.batchNumber || req.body.supplierBatchNumber || '',
    notes: req.body.notes || '',
    createdAt: now,
    updatedAt: now
  };

  d.raw_materials.push(rm);
  d.lastUpdated = now;
  writeJSON(RAW_MATERIALS_FILE, d);

  // If opening stock > 0, atomically create opening batch in raw_material_batches.json and transaction in raw_material_transactions.json
  if (rm.stock > 0) {
    const openingBatchId = generateRMBatchId();
    const corrId = generateAuditCorrelationId();
    const supplierBatchNo = (req.body.batchNumber || req.body.supplierBatchNumber || 'OPENING-STOCK').trim();
    const vendorName = (req.body.vendorName || req.body.supplier || rm.supplier || 'Opening Stock').trim();

    try {
      const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
      if (!rmbData.raw_material_batches) rmbData.raw_material_batches = [];
      const openingBatch = {
        id: openingBatchId,
        batchId: openingBatchId,
        rawMaterialId: rm.id,
        rawMaterialName: rm.name,
        supplierBatchNumber: supplierBatchNo,
        lotNumber: supplierBatchNo,
        originalQuantity: rm.stock,
        remainingQuantity: rm.stock,
        quantity: rm.stock,
        remainingQty: rm.stock,
        unit: rm.unit,
        vendorName,
        vendorGstNumber: (req.body.vendorGstNumber || '').trim().toUpperCase(),
        vendorBillingRef: (req.body.vendorBillingRef || '').trim(),
        vendorInvoiceNumber: (req.body.vendorInvoiceNumber || '').trim(),
        vendorAddress: (req.body.vendorAddress || '').trim(),
        vendorContact: (req.body.vendorContact || '').trim(),
        vendorEmail: (req.body.vendorEmail || '').trim(),
        vendorPrice: rm.cost_per_unit ? parseFloat((rm.cost_per_unit * rm.stock).toFixed(2)) : 0,
        purchaseDate: rm.purchaseDate || now.split('T')[0],
        dateFormat: req.body.dateFormat || 'DD/MM/YYYY',
        receivedDate: rm.purchaseDate || now.split('T')[0],
        supplier: vendorName,
        cost_per_unit: rm.cost_per_unit || 0,
        auditCorrelationId: corrId,
        status: 'ACTIVE',
        notes: req.body.notes || 'Opening Stock / Inward Purchase',
        createdAt: now
      };
      rmbData.raw_material_batches.push(openingBatch);
      rmbData.lastUpdated = now;
      writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);
    } catch (bErr) {
      console.error('Failed to create opening batch for raw material:', bErr);
    }

    try {
      const txnData = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
      if (!txnData.raw_material_transactions) txnData.raw_material_transactions = [];
      txnData.raw_material_transactions.push({
        id: uid('RMT'),
        auditCorrelationId: corrId,
        transactionType: 'PURCHASE_INWARD',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        rawMaterialId: rm.id,
        raw_material_id: rm.id,
        rawMaterialName: rm.name,
        raw_material_name: rm.name,
        rawMaterialBatchId: openingBatchId,
        supplierBatchNumber: supplierBatchNo,
        lotNumber: supplierBatchNo,
        vendorName,
        vendorGstNumber: (req.body.vendorGstNumber || '').trim().toUpperCase(),
        vendorBillingRef: (req.body.vendorBillingRef || '').trim(),
        vendorInvoiceNumber: (req.body.vendorInvoiceNumber || '').trim(),
        vendorAddress: (req.body.vendorAddress || '').trim(),
        vendorContact: (req.body.vendorContact || '').trim(),
        vendorEmail: (req.body.vendorEmail || '').trim(),
        vendorPrice: rm.cost_per_unit ? parseFloat((rm.cost_per_unit * rm.stock).toFixed(2)) : 0,
        purchaseDate: rm.purchaseDate || now.split('T')[0],
        action: 'Purchase',
        type: 'IN',
        quantity: rm.stock,
        unit: rm.unit,
        cost_per_unit: rm.cost_per_unit,
        remainingStock: rm.stock,
        referenceId: supplierBatchNo || rm.id,
        notes: 'Initial Stock / Opening Purchase',
        createdAt: now
      });
      txnData.lastUpdated = now;
      writeJSONAtomic(RAW_MAT_TXN_FILE, txnData);
    } catch (tErr) {
      console.error('Failed to create opening transaction for raw material:', tErr);
    }
  }

  res.status(201).json({ success: true, raw_material: rm });
});

app.put('/api/raw-materials/:id', (req, res) => {
  const d = readJSON(RAW_MATERIALS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.raw_materials.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Raw material not found' });

  const stockVal = parseFloat(req.body.stock !== undefined ? req.body.stock : req.body.current_stock);
  const minStockVal = parseFloat(req.body.minimumStock !== undefined ? req.body.minimumStock : req.body.reorder_point);
  const costVal = parseFloat(req.body.purchaseCost !== undefined ? req.body.purchaseCost : req.body.cost_per_unit);

  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const materialBatches = (rmbData.raw_material_batches || []).filter(b => b.rawMaterialId === req.params.id);
  let effectiveStock = !isNaN(stockVal) ? stockVal : d.raw_materials[i].current_stock;
  if (materialBatches.length > 0) {
    const activeBatchesSum = materialBatches
      .filter(b => b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'))
      .reduce((sum, b) => sum + (b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0)), 0);
    effectiveStock = parseFloat(activeBatchesSum.toFixed(6));
  }

  const updatedRM = {
    ...d.raw_materials[i],
    ...req.body,
    id: req.params.id,
    unit: req.body.unit ? unitConv.normalizeUnit(req.body.unit) : d.raw_materials[i].unit,
    stock: effectiveStock,
    current_stock: effectiveStock,
    minimumStock: !isNaN(minStockVal) ? minStockVal : d.raw_materials[i].reorder_point,
    reorder_point: !isNaN(minStockVal) ? minStockVal : d.raw_materials[i].reorder_point,
    purchaseCost: !isNaN(costVal) ? costVal : d.raw_materials[i].cost_per_unit,
    cost_per_unit: !isNaN(costVal) ? costVal : d.raw_materials[i].cost_per_unit,
    updatedAt: new Date().toISOString()
  };

  d.raw_materials[i] = updatedRM;
  d.lastUpdated = new Date().toISOString();
  writeJSON(RAW_MATERIALS_FILE, d);

  // Synchronize unit & rawMaterialName to existing batches so batch deductions/audits never use stale units
  try {
    const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    let batchesUpdated = false;
    (rmbData.raw_material_batches || []).forEach(b => {
      if (b.rawMaterialId === req.params.id) {
        if (b.unit !== updatedRM.unit || b.rawMaterialName !== updatedRM.name) {
          b.unit = updatedRM.unit;
          b.rawMaterialName = updatedRM.name;
          batchesUpdated = true;
        }
      }
    });
    if (batchesUpdated) {
      rmbData.lastUpdated = new Date().toISOString();
      writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);
    }
  } catch (syncErr) {
    console.warn('Failed to sync updated unit to batches:', syncErr);
  }

  res.json({ success: true, raw_material: updatedRM });
});

app.delete('/api/raw-materials/:id', (req, res) => {
  const d = readJSON(RAW_MATERIALS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.raw_materials.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Raw material not found' });
  const rm = d.raw_materials[i];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  // Dependency check 1: Product Variations using this Raw Material as packaging
  const prdData = readJSON(PRODUCTS_FILE) || { products: [] };
  for (const p of (prdData.products || [])) {
    for (const v of (p.variants || [])) {
      if (v.packagingRawMaterialId === rm.id) {
        const blockReason = `Cannot delete Raw Material "${rm.name}". It is currently assigned as packaging for Product "${p.name}" (Variation: "${v.name}", Variant ID: ${v.variantId}). Please remove or reassign packaging on the variation first.`;
        try {
          const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
          logAuditEntry(mfgAudit, {
            auditId: generateAuditCorrelationId(),
            auditCorrelationId: generateAuditCorrelationId(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            timestamp: new Date().toISOString(),
            eventType: 'DEPENDENCY_BLOCK',
            category: 'SECURITY',
            entityType: 'RAW_MATERIAL',
            entityId: rm.id,
            entityName: rm.name,
            blockedReason: blockReason,
            attemptedOperation: 'DELETE_RAW_MATERIAL',
            dependentEntity: {
              type: 'PRODUCT_VARIATION',
              productId: p.id,
              productName: p.name,
              variantId: v.variantId,
              variantName: v.name
            },
            operatorName: req.body?.operatorName || 'User',
            notes: blockReason
          });
          mfgAudit.lastUpdated = new Date().toISOString();
          writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
        } catch (_) {}
        return res.status(400).json({ error: blockReason });
      }
    }
  }

  // Dependency check 2: Recipes using this Raw Material as an ingredient
  const recData = readJSON(RECIPES_FILE) || { recipes: [] };
  for (const rec of (recData.recipes || [])) {
    const isUsed = (rec.ingredients || []).some(ing => ing.rawMaterialId === rm.id || ing.raw_material_id === rm.id || (ing.name && ing.name.toLowerCase() === rm.name.toLowerCase()));
    if (isUsed) {
      const blockReason = `Cannot delete Raw Material "${rm.name}". It is currently referenced as an ingredient in Recipe "${rec.name}" (Recipe ID: ${rec.id}). Please remove this ingredient from the recipe first.`;
      try {
        const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
        logAuditEntry(mfgAudit, {
          auditId: generateAuditCorrelationId(),
          auditCorrelationId: generateAuditCorrelationId(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          timestamp: new Date().toISOString(),
          eventType: 'DEPENDENCY_BLOCK',
          category: 'SECURITY',
          entityType: 'RAW_MATERIAL',
          entityId: rm.id,
          entityName: rm.name,
          blockedReason: blockReason,
          attemptedOperation: 'DELETE_RAW_MATERIAL',
          dependentEntity: {
            type: 'RECIPE',
            recipeId: rec.id,
            recipeName: rec.name
          },
          operatorName: req.body?.operatorName || 'User',
          notes: blockReason
        });
        mfgAudit.lastUpdated = new Date().toISOString();
        writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
      } catch (_) {}
      return res.status(400).json({ error: blockReason });
    }
  }

  // Dependency check 3: Active Manufacturing Batches referencing this Raw Material
  const batchData = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
  for (const b of (batchData.manufacturing_batches || [])) {
    const isUsed = (b.materialsUsed || []).some(m => m.rawMaterialId === rm.id || m.raw_material_id === rm.id);
    if (isUsed && b.status !== 'CANCELLED' && b.status !== 'COMPLETED_ARCHIVED') {
      const blockReason = `Cannot delete Raw Material "${rm.name}". It is referenced in active Manufacturing Batch "${b.batchNumber || b.id}".`;
      try {
        const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
        logAuditEntry(mfgAudit, {
          auditId: generateAuditCorrelationId(),
          auditCorrelationId: generateAuditCorrelationId(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          timestamp: new Date().toISOString(),
          eventType: 'DEPENDENCY_BLOCK',
          category: 'SECURITY',
          entityType: 'RAW_MATERIAL',
          entityId: rm.id,
          entityName: rm.name,
          blockedReason: blockReason,
          attemptedOperation: 'DELETE_RAW_MATERIAL',
          dependentEntity: {
            type: 'MANUFACTURING_BATCH',
            batchId: b.id,
            batchNumber: b.batchNumber
          },
          operatorName: req.body?.operatorName || 'User',
          notes: blockReason
        });
        mfgAudit.lastUpdated = new Date().toISOString();
        writeJSONAtomic(MANUFACTURING_AUDIT_FILE, mfgAudit);
      } catch (_) {}
      return res.status(400).json({ error: blockReason });
    }
  }

  d.raw_materials.splice(i, 1);
  d.lastUpdated = new Date().toISOString();
  writeJSONAtomic(RAW_MATERIALS_FILE, d);

  // Purge any batches belonging to this raw material so no orphaned data remains in JSON
  try {
    const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    rmbData.raw_material_batches = (rmbData.raw_material_batches || []).filter(b => b.rawMaterialId !== rm.id);
    rmbData.lastUpdated = new Date().toISOString();
    writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);
  } catch (_) {}

  logDeletionAudit({
    entityType: 'raw_material',
    entityId: rm.id,
    entityName: rm.name,
    itemName: `Raw Material: ${rm.name} (Stock: ${rm.current_stock || rm.stock || 0} ${rm.unit})`,
    reason,
    deductedQty: rm.current_stock || rm.stock || 0,
    deductedVal: (rm.current_stock || rm.stock || 0) * (rm.cost_per_unit || 0),
    unit: rm.unit || '',
    details: `Category: ${rm.category || 'Chemical'}, Cost/Unit: ₹${rm.cost_per_unit || 0}`,
    notes: `DELETED RAW MATERIAL: "${rm.name}" (ID: ${rm.id}). Stock: ${rm.current_stock || rm.stock || 0} ${rm.unit}. Reason: ${reason}`
  });

  res.json({ success: true });
});

app.post('/api/raw-materials/:id/add-stock', (req, res) => {
  const rmData  = readJSON(RAW_MATERIALS_FILE);
  const txnData = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
  if (!rmData) return res.status(500).json({ error: 'Read failed' });

  const i = rmData.raw_materials.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Raw material not found' });

  const rawQty = req.body.qty !== undefined ? req.body.qty : (req.body.quantity !== undefined ? req.body.quantity : req.body.addedStock);
  const qty = Number(rawQty);
  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity must be a valid finite positive number' });

  const rm  = rmData.raw_materials[i];
  const actionType = req.body.action || 'Purchase';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  // Optional vendor & purchase metadata
  const vendorName = (req.body.vendorName || req.body.vendor_name || req.body.supplier || '').trim();
  const vendorGstNumber = (req.body.vendorGstNumber || req.body.vendor_gst_number || req.body.vendorGst || '').trim().toUpperCase();
  const vendorBillingRef = (req.body.vendorBillingRef || req.body.billing_info || req.body.reference || '').trim();
  const vendorInvoiceNumber = (req.body.vendorInvoiceNumber || req.body.vendor_invoice_number || req.body.invoiceNumber || '').trim();
  const vendorAddress = (req.body.vendorAddress || req.body.vendor_address || '').trim();
  const vendorContact = (req.body.vendorContact || req.body.vendor_contact || '').trim();
  const vendorEmail = (req.body.vendorEmail || req.body.vendor_email || '').trim();
  const vendorPrice = req.body.vendorPrice !== undefined && req.body.vendorPrice !== '' ? parseFloat(req.body.vendorPrice) : (parseFloat(req.body.cost_per_unit || req.body.purchaseCost) ? parseFloat(req.body.cost_per_unit || req.body.purchaseCost) * qty : 0);
  const supplierBatchNumber = (req.body.supplierBatchNumber || req.body.supplier_batch || req.body.batchNumber || req.body.lotNumber || '').trim();
  const purchaseDate = (req.body.purchaseDate || req.body.purchase_date || '').trim() || dateStr;
  const dateFormat = req.body.dateFormat || 'DD/MM/YYYY';

  // Optional GST validation if provided
  if (vendorGstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(vendorGstNumber)) {
    return res.status(400).json({ error: `Invalid GST number format: "${vendorGstNumber}". Expected format e.g. 09ABCDE1234F1Z5.` });
  }

  // Generate stable Audit Correlation ID
  const auditCorrelationId = generateAuditCorrelationId();

  // Generate sequential Batch ID (RMB-YYYY-NNNN)
  const internalBatchId = generateRMBatchId();
  const effectiveBatchNumber = supplierBatchNumber || internalBatchId;

  // Create inward batch record in raw_material_batches.json
  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  if (!rmbData.raw_material_batches) rmbData.raw_material_batches = [];
  const newBatch = {
    id: internalBatchId,
    batchId: internalBatchId,
    rawMaterialId: rm.id,
    rawMaterialName: rm.name,
    supplierBatchNumber: supplierBatchNumber || '',
    lotNumber: effectiveBatchNumber,
    originalQuantity: qty,
    remainingQuantity: qty,
    quantity: qty,
    remainingQty: qty,
    unit: rm.unit,
    vendorName,
    vendorGstNumber,
    vendorBillingRef,
    vendorInvoiceNumber,
    vendorAddress,
    vendorContact,
    vendorEmail,
    vendorPrice: vendorPrice || 0,
    purchaseDate,
    dateFormat,
    receivedDate: purchaseDate,
    supplier: vendorName || rm.supplier || '',
    cost_per_unit: (qty > 0 && vendorPrice) ? parseFloat((vendorPrice / qty).toFixed(4)) : (rm.cost_per_unit || 0),
    auditCorrelationId,
    status: 'ACTIVE',
    notes: req.body.notes || (vendorBillingRef ? `Bill Ref: ${vendorBillingRef}` : 'Inward Stock Addition'),
    createdAt: now.toISOString()
  };
  rmbData.raw_material_batches.push(newBatch);
  rmbData.lastUpdated = now.toISOString();

  // Maintain Invariant: Parent Raw Material Stock = SUM(Active Batches Remaining Quantity)
  const activeBatchesSum = rmbData.raw_material_batches
    .filter(b => b.rawMaterialId === rm.id && (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED')))
    .reduce((sum, b) => sum + (b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0)), 0);

  const newStock = parseFloat(activeBatchesSum.toFixed(6));
  rmData.raw_materials[i].current_stock = newStock;
  rmData.raw_materials[i].stock = newStock;
  if (vendorName) rmData.raw_materials[i].supplier = vendorName;
  if (req.body.cost_per_unit || req.body.purchaseCost || (vendorPrice && qty > 0)) {
    const unitPrice = parseFloat(req.body.cost_per_unit || req.body.purchaseCost) || (vendorPrice / qty);
    rmData.raw_materials[i].cost_per_unit = parseFloat(unitPrice.toFixed(4));
    rmData.raw_materials[i].purchaseCost = parseFloat(unitPrice.toFixed(4));
  }
  rmData.raw_materials[i].updatedAt = now.toISOString();
  rmData.lastUpdated = now.toISOString();

  // Create transaction record in raw_material_transactions.json
  const txn = {
    id: uid('RMT'),
    auditCorrelationId,
    transactionType: 'PURCHASE_INWARD',
    date: dateStr,
    time: timeStr,
    rawMaterialId: rm.id,
    raw_material_id: rm.id,
    rawMaterialName: rm.name,
    raw_material_name: rm.name,
    rawMaterialBatchId: internalBatchId,
    supplierBatchNumber: supplierBatchNumber || '',
    lotNumber: effectiveBatchNumber,
    vendorName,
    vendorGstNumber,
    vendorBillingRef,
    vendorInvoiceNumber,
    vendorAddress,
    vendorContact,
    vendorEmail,
    vendorPrice: vendorPrice || 0,
    purchaseDate,
    dateFormat,
    action: actionType,
    type: 'IN',
    quantity: qty,
    unit: rm.unit,
    cost_per_unit: (qty > 0 && vendorPrice) ? parseFloat((vendorPrice / qty).toFixed(4)) : (rm.cost_per_unit || 0),
    remainingStock: newStock,
    referenceId: vendorBillingRef || effectiveBatchNumber || uid('PO'),
    notes: req.body.notes || (vendorName ? `Purchased from ${vendorName}` : 'Stock Addition'),
    createdAt: now.toISOString()
  };

  txnData.raw_material_transactions.push(txn);
  txnData.lastUpdated = now.toISOString();

  writeJSONAtomic(RAW_MATERIALS_FILE, rmData);
  writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);
  writeJSONAtomic(RAW_MAT_TXN_FILE, txnData);

  res.json({
    success: true,
    raw_material: rmData.raw_materials[i],
    rawMaterial: rmData.raw_materials[i],
    transaction: txn,
    new_stock: newStock,
    batchId: internalBatchId,
    batch: newBatch,
    effectiveBatchNumber,
    auditCorrelationId
  });
});

// Alias for generic increase-stock by rawMaterialId in body or param
app.post('/api/raw-materials/:id/increase-stock', (req, res, next) => {
  req.url = `/api/raw-materials/${req.params.id}/add-stock`;
  return app._router.handle(req, res, next);
});

app.post('/api/raw-materials/increase-stock', (req, res, next) => {
  const rmId = req.body.rawMaterialId || req.body.raw_material_id || req.body.id;
  if (!rmId) return res.status(400).json({ error: 'Raw material ID is required' });
  req.url = `/api/raw-materials/${rmId}/add-stock`;
  req.params = { id: rmId };
  return app._router.handle(req, res, next);
});

// ─── RAW MATERIAL BATCHES / LOTS ──────────────────────────────────────────────
app.get('/api/raw-material-batches', (req, res) => {
  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  res.json(rmbData);
});

app.get('/api/raw-materials/:id/batches', (req, res) => {
  const rmData = readJSON(RAW_MATERIALS_FILE);
  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const rm = (rmData && rmData.raw_materials) ? rmData.raw_materials.find(r => r.id === req.params.id) : null;
  if (!rm) return res.status(404).json({ error: 'Raw material not found' });

  const batches = (rmbData.raw_material_batches || []).filter(b => b.rawMaterialId === req.params.id);
  const activeBatches = batches.filter(b => b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'));
  const consumedBatches = batches.filter(b => b.status === 'CONSUMED' || b.remainingQuantity <= 0);

  res.json({
    rawMaterial: rm,
    parentStock: rm.current_stock !== undefined ? rm.current_stock : rm.stock,
    unit: rm.unit,
    batches,
    activeBatches,
    consumedBatches,
    allBatches: batches
  });
});

app.get('/api/raw-materials/:id/history', (req, res) => {
  const rmTxnData = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
  const txns = (rmTxnData.raw_material_transactions || [])
    .filter(t => t.rawMaterialId === req.params.id || t.raw_material_id === req.params.id)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  res.json({ rawMaterialId: req.params.id, transactions: txns });
});

app.get('/api/raw-materials/:id/vendors', (req, res) => {
  const rmData = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
  const rm = (rmData.raw_materials || []).find(r => r.id === req.params.id);
  if (!rm) return res.status(404).json({ error: 'Raw material not found' });

  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const batches = (rmbData.raw_material_batches || []).filter(b => b.rawMaterialId === req.params.id);

  // Aggregate active vendors
  const vendorMap = {};
  batches.forEach(b => {
    const vName = (b.vendorName || b.supplier || '').trim();
    if (!vName) return;
    if (b.status === 'DELETED') return;

    if (!vendorMap[vName]) {
      vendorMap[vName] = {
        vendorName: vName,
        vendorGstNumber: b.vendorGstNumber || '',
        totalInwardStock: 0,
        activeStock: 0,
        valuation: 0,
        batchCount: 0,
        batches: []
      };
    }
    const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
    const orig = b.originalQuantity !== undefined ? b.originalQuantity : (b.quantity || 0);
    const cost = b.cost_per_unit || (b.vendorPrice && orig ? b.vendorPrice / orig : (rm.cost_per_unit || 0));

    vendorMap[vName].totalInwardStock += orig;
    vendorMap[vName].activeStock += rem;
    vendorMap[vName].valuation += (rem * cost);
    vendorMap[vName].batchCount += 1;
    vendorMap[vName].batches.push({
      batchId: b.id || b.batchId,
      lotNumber: b.lotNumber || b.supplierBatchNumber || '-',
      purchaseDate: b.purchaseDate || b.date || '-',
      originalQty: orig,
      remainingQty: rem,
      price: b.vendorPrice || 0,
      costPerUnit: cost
    });
  });

  const activeVendors = Object.values(vendorMap);
  const deletedVendors = rm.deleted_vendors || [];
  const totalActiveStock = activeVendors.reduce((s, v) => s + (v.activeStock || 0), 0);
  const totalActiveValuation = activeVendors.reduce((s, v) => s + (v.valuation || 0), 0);

  res.json({
    rawMaterialId: rm.id,
    rawMaterialName: rm.name,
    parentStock: rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0),
    totalActiveStock,
    totalActiveValuation,
    unit: rm.unit,
    vendors: activeVendors.map(v => v.vendorName),
    activeVendors,
    deletedVendors
  });
});

// ─── DELETE VENDOR FOR RAW MATERIAL (WITH SYNCHRONIZED TOTAL DEDUCTION) ──────
app.post('/api/raw-materials/:id/delete-vendor', (req, res) => {
  const rmData = readJSON(RAW_MATERIALS_FILE);
  if (!rmData) return res.status(500).json({ error: 'Read failed' });
  const i = rmData.raw_materials.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Raw material not found' });
  const rm = rmData.raw_materials[i];

  const vendorName = (req.body.vendorName || '').trim();
  const reason = (req.body.reason || '').trim();
  if (!vendorName) return res.status(400).json({ error: 'Vendor name is required' });
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const allBatches = rmbData.raw_material_batches || [];

  let deductedQty = 0;
  let deductedVal = 0;
  const purgedBatchIds = [];

  const remainingBatches = [];
  for (const b of allBatches) {
    const bVendor = (b.vendorName || b.supplier || '').trim();
    if (b.rawMaterialId === rm.id && bVendor.toLowerCase() === vendorName.toLowerCase()) {
      const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
      const cost = b.cost_per_unit || (rm.cost_per_unit || 0);
      if (rem > 0 && b.status !== 'DELETED') {
        deductedQty += rem;
        deductedVal += (rem * cost);
      }
      purgedBatchIds.push(b.id || b.batchId);
    } else {
      remainingBatches.push(b);
    }
  }

  rmbData.raw_material_batches = remainingBatches;
  rmbData.lastUpdated = new Date().toISOString();
  writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);

  // Recalculate Parent Raw Material Stock = sum of remaining active batches
  const activeBatchesSum = remainingBatches
    .filter(b => b.rawMaterialId === rm.id && (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED')))
    .reduce((sum, b) => sum + (b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0)), 0);

  const newStock = parseFloat(activeBatchesSum.toFixed(6));
  rm.current_stock = newStock;
  rm.stock = newStock;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  if (!rm.deleted_vendors) rm.deleted_vendors = [];
  const deletedVendorRecord = {
    vendorName,
    deductedQty: parseFloat(deductedQty.toFixed(4)),
    deductedVal: parseFloat(deductedVal.toFixed(2)),
    purgedBatchCount: purgedBatchIds.length,
    reason,
    date: dateStr,
    time: timeStr,
    timestamp: now.toISOString()
  };
  rm.deleted_vendors.push(deletedVendorRecord);

  rmData.lastUpdated = now.toISOString();
  writeJSONAtomic(RAW_MATERIALS_FILE, rmData);

  // Record deletion in immutable audit memory
  logDeletionAudit({
    entityType: 'vendor',
    entityId: rm.id,
    entityName: vendorName,
    itemName: `Vendor: ${vendorName} (Material: ${rm.name})`,
    reason,
    deductedQty,
    deductedVal,
    unit: rm.unit,
    details: `Deducted ${deductedQty} ${rm.unit} (₹${deductedVal.toFixed(2)}) from parent material "${rm.name}". Purged ${purgedBatchIds.length} batch(es).`,
    notes: `DELETED VENDOR: "${vendorName}" for Material "${rm.name}". Deducted ${deductedQty} ${rm.unit} (₹${deductedVal.toFixed(2)}). Reason: ${reason}`
  });

  res.json({
    success: true,
    message: `Vendor "${vendorName}" deleted successfully. Deducted ${deductedQty} ${rm.unit} (₹${deductedVal.toFixed(2)}) from total stock.`,
    deductedQty,
    deductedVal,
    newStock,
    deletedVendor: deletedVendorRecord
  });
});

app.get('/api/raw-material-batches/:id', (req, res) => {
  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const batch = (rmbData.raw_material_batches || []).find(b => b.id === req.params.id || b.batchId === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Raw material batch not found' });

  const mfgAudit = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
  const consumptions = (mfgAudit.manufacturing_audit || []).filter(a =>
    a.rawMaterialBatchId === batch.id || a.rawMaterialBatchId === batch.batchId
  );

  res.json({ batch, consumptions });
});

app.get('/api/raw-material-batches/:id/traceability', (req, res) => {
  try {
    const rmbData      = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    const rmTxnData    = readJSON(RAW_MAT_TXN_FILE)          || { raw_material_transactions: [] };
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE)   || { manufacturing_audit: [] };
    const mfgBatchData = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
    const fgData       = readJSON(FINISHED_GOODS_FILE)        || { finished_goods: [] };
    const invoiceData  = readJSON(INVOICES_FILE)              || { invoices: [] };

    const batchId = req.params.id;
    const batch = (rmbData.raw_material_batches || []).find(b => b.id === batchId || b.batchId === batchId);
    if (!batch) return res.status(404).json({ error: 'Raw material batch not found' });

    // 1. Origin / Inward Purchase
    const inwardTxn = (rmTxnData.raw_material_transactions || []).find(t => 
      t.rawMaterialBatchId === batchId || (t.auditCorrelationId && t.auditCorrelationId === batch.auditCorrelationId)
    );

    // 2. Manufacturing Consumptions
    const mfgConsumptions = (mfgAuditData.manufacturing_audit || []).filter(a =>
      (a.rawMaterialBatchId === batchId || a.rawMaterialBatchId === batch.id || a.rawMaterialBatchId === batch.batchId) &&
      a.transactionType !== 'RAW_MATERIAL_BATCH_CONSUMED'
    );
    const mfgBatchIds = [...new Set(mfgConsumptions.map(c => c.manufacturingBatchId))];
    const mfgBatches = (mfgBatchData.manufacturing_batches || []).filter(mb => mfgBatchIds.includes(mb.id || mb.mfgId));

    // 3. Finished Goods Produced
    const fgBatchIds = [...new Set(mfgConsumptions.map(c => c.finishedGoodsBatchId).filter(Boolean))];
    const fgBatches = (fgData.finished_goods || []).filter(fg => fgBatchIds.includes(fg.finishedGoodsBatchId));

    // 4. Sales Invoices
    const invoicesWithFG = (invoiceData.invoices || []).filter(inv => {
      if (!Array.isArray(inv.items)) return false;
      return inv.items.some(item => {
        if (item.batchAllocations && Array.isArray(item.batchAllocations)) {
          return item.batchAllocations.some(ba => fgBatchIds.includes(ba.finishedGoodsBatchId || ba.batchId));
        }
        return false;
      });
    });

    res.json({
      success: true,
      batch,
      inward: inwardTxn || {
        supplier: batch.vendorName || batch.supplier,
        vendorGstNumber: batch.vendorGstNumber,
        vendorBillingRef: batch.vendorBillingRef,
        vendorInvoiceNumber: batch.vendorInvoiceNumber,
        purchaseDate: batch.purchaseDate,
        cost_per_unit: batch.cost_per_unit,
        auditCorrelationId: batch.auditCorrelationId
      },
      manufacturing: {
        totalConsumedQty: mfgConsumptions.reduce((s, c) => s + (c.rawMaterialQuantityConsumed || 0), 0),
        batches: mfgBatches.map(mb => {
          const relatedConsumption = mfgConsumptions.filter(c => c.manufacturingBatchId === (mb.id || mb.mfgId));
          return {
            id: mb.id || mb.mfgId,
            batchNumber: mb.batchNumber,
            productName: mb.productName,
            quantityProduced: mb.quantityProduced,
            consumedFromThisBatch: relatedConsumption.reduce((s, c) => s + (c.rawMaterialQuantityConsumed || 0), 0),
            finishedGoodsBatchId: mb.finishedGoodsBatchId,
            date: mb.date || mb.createdAt
          };
        })
      },
      finishedGoods: fgBatches.map(fg => ({
        id: fg.id,
        name: fg.name,
        finishedGoodsBatchId: fg.finishedGoodsBatchId,
        currentStock: fg.currentStock
      })),
      sales: invoicesWithFG.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        customerName: inv.customerName,
        total: inv.total || inv.grandTotal
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Traceability retrieval failed: ' + err.message });
  }
});

app.post('/api/raw-materials/:id/batches', (req, res) => {
  const rmData = readJSON(RAW_MATERIALS_FILE);
  if (!rmData) return res.status(500).json({ error: 'Read failed' });
  const rm = (rmData.raw_materials || []).find(r => r.id === req.params.id);
  if (!rm) return res.status(404).json({ error: 'Raw material not found' });

  const qty = parseFloat(req.body.quantity || req.body.qty);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const batchId = req.body.lotNumber || req.body.batchId || generateRMBatchId();

  const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  if (!rmbData.raw_material_batches) rmbData.raw_material_batches = [];

  const newBatch = {
    id: batchId,
    batchId,
    rawMaterialId: rm.id,
    rawMaterialName: rm.name,
    originalQuantity: qty,
    remainingQuantity: qty,
    quantity: qty,
    remainingQty: qty,
    unit: req.body.unit || rm.unit,
    receivedDate: req.body.receivedDate || dateStr,
    purchaseDate: req.body.purchaseDate || dateStr,
    supplier: req.body.supplier || req.body.vendorName || rm.supplier || '',
    vendorName: req.body.vendorName || req.body.supplier || rm.supplier || '',
    lotNumber: req.body.lotNumber || batchId,
    supplierBatchNumber: req.body.supplierBatchNumber || '',
    cost_per_unit: parseFloat(req.body.cost_per_unit || req.body.cost) || rm.cost_per_unit || 0,
    status: 'ACTIVE',
    notes: req.body.notes || 'Inward Lot',
    createdAt: now.toISOString()
  };

  rmbData.raw_material_batches.push(newBatch);
  rmbData.lastUpdated = now.toISOString();
  writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE, rmbData);

  res.status(201).json({ success: true, batch: newBatch });
});

app.get('/api/raw-material-transactions', (req, res) => {
  const d = readJSON(RAW_MAT_TXN_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

// ════════════════════════════════════════════════════════════════════════════
// ─── INVENTORY: RECIPES / BILLS OF MATERIALS ─────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/recipes', (req, res) => {
  const d = readJSON(RECIPES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.post('/api/recipes', (req, res) => {
  const d = readJSON(RECIPES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });

  const { name, output_product_name, productId, bottleSize, bottleSizeUnit, ingredients } = req.body;
  const recipeName = (name || output_product_name || '').trim();
  if (!recipeName) return res.status(400).json({ error: 'Recipe name is required' });
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'At least one ingredient is required in the recipe' });
  }

  // Validate ingredients reference existing raw materials
  const rmData = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
  const rms = rmData.raw_materials || [];
  for (const ing of ingredients) {
    const rmId = ing.raw_material_id || ing.rawMaterialId;
    const qty = parseFloat(ing.qty || ing.quantity);
    if (!rmId) return res.status(400).json({ error: 'Each ingredient must specify a raw material' });
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Ingredient quantities must be greater than zero' });
  }

  const recipeId = `RCP-${String((d.recipes || []).length + 1).padStart(6, '0')}`;
  const now = new Date().toISOString();

  const recipe = {
    id: recipeId,
    version: 1,
    name: recipeName,
    productId: productId || req.body.output_product_id || null,
    output_product_id: productId || req.body.output_product_id || null,
    productName: req.body.productName || req.body.output_product_name || recipeName,
    output_product_name: req.body.productName || req.body.output_product_name || recipeName,
    productCategory: req.body.productCategory || req.body.category || 'General',
    description: req.body.description || '',
    sellingPrice: parseFloat(req.body.sellingPrice || req.body.rate) || 0,
    bottleSize: parseFloat(bottleSize) || 200,
    bottleSizeUnit: unitConv.normalizeUnit(bottleSizeUnit || 'mL'),
    output_qty: parseFloat(req.body.output_qty) || 1,
    output_unit: req.body.output_unit || 'pcs',
    defaultBatchSize: parseFloat(req.body.defaultBatchSize) || 100,
    ingredients: ingredients.map(ing => {
      const rmId = ing.raw_material_id || ing.rawMaterialId;
      const matchedRM = rms.find(r => r.id === rmId);
      return {
        raw_material_id: rmId,
        raw_material_name: ing.raw_material_name || ing.rawMaterialName || (matchedRM ? matchedRM.name : ''),
        qty: parseFloat(ing.qty || ing.quantity),
        unit: unitConv.normalizeUnit(ing.unit || (matchedRM ? matchedRM.unit : 'mL')),
        vendorPreference: ing.vendorPreference || ing.vendor_preference || 'DEFAULT_FIFO'
      };
    }),
    notes: req.body.notes || '',
    createdAt: now,
    updatedAt: now
  };

  d.recipes.push(recipe);
  d.lastUpdated = now;
  writeJSONAtomic(RECIPES_FILE, d);
  res.status(201).json({ success: true, recipe });
});

app.put('/api/recipes/:id', (req, res) => {
  const d = readJSON(RECIPES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.recipes.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Recipe not found' });

  const existing = d.recipes[i];
  const curVersion = existing.version || 1;
  const now = new Date().toISOString();

  // Validate ingredients if provided
  const ingredients = req.body.ingredients;
  const rmData = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
  const rms = rmData.raw_materials || [];
  if (Array.isArray(ingredients)) {
    if (ingredients.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient is required in the recipe' });
    }
    for (const ing of ingredients) {
      const rmId = ing.raw_material_id || ing.rawMaterialId;
      const qty = parseFloat(ing.qty || ing.quantity);
      if (!rmId) return res.status(400).json({ error: 'Each ingredient must specify a raw material' });
      if (!qty || qty <= 0) return res.status(400).json({ error: 'Ingredient quantities must be greater than zero' });
    }
  }

  // 1. Snapshot previous version into recipe_history.json
  try {
    const historyData = readJSON(RECIPE_HISTORY_FILE) || { recipe_history: [] };
    if (!historyData.recipe_history) historyData.recipe_history = [];
    historyData.recipe_history.push({
      historyId: uid('RHIST'),
      recipeId: existing.id,
      version: curVersion,
      recipeSnapshot: JSON.parse(JSON.stringify(existing)),
      savedAt: now,
      modifiedBy: req.body.operatorName || req.body.operator || 'System User'
    });
    historyData.lastUpdated = now;
    writeJSONAtomic(RECIPE_HISTORY_FILE, historyData);
  } catch (histErr) {
    console.error('Failed to snapshot recipe history:', histErr);
  }

  // 2. Increment version and update active recipe
  const nextVersion = curVersion + 1;
  const updatedIngredients = Array.isArray(ingredients) ? ingredients.map(ing => {
    const rmId = ing.raw_material_id || ing.rawMaterialId;
    const matchedRM = rms.find(r => r.id === rmId);
    return {
      raw_material_id: rmId,
      raw_material_name: ing.raw_material_name || ing.rawMaterialName || (matchedRM ? matchedRM.name : ''),
      qty: parseFloat(ing.qty || ing.quantity),
      unit: unitConv.normalizeUnit(ing.unit || (matchedRM ? matchedRM.unit : 'mL')),
      vendorPreference: ing.vendorPreference || ing.vendor_preference || 'DEFAULT_FIFO'
    };
  }) : existing.ingredients;

  d.recipes[i] = {
    ...existing,
    ...req.body,
    id: req.params.id,
    version: nextVersion,
    ingredients: updatedIngredients,
    bottleSize: req.body.bottleSize !== undefined ? parseFloat(req.body.bottleSize) : existing.bottleSize,
    bottleSizeUnit: req.body.bottleSizeUnit ? unitConv.normalizeUnit(req.body.bottleSizeUnit) : existing.bottleSizeUnit,
    updatedAt: now
  };

  d.lastUpdated = now;
  writeJSONAtomic(RECIPES_FILE, d);
  res.json({ success: true, recipe: d.recipes[i], previousVersion: curVersion });
});

app.get('/api/recipes/:id/history', (req, res) => {
  const recipeData = readJSON(RECIPES_FILE) || { recipes: [] };
  const recipe = (recipeData.recipes || []).find(r => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  const historyData = readJSON(RECIPE_HISTORY_FILE) || { recipe_history: [] };
  const history = (historyData.recipe_history || [])
    .filter(h => h.recipeId === req.params.id)
    .sort((a, b) => b.version - a.version);

  res.json({
    recipeId: req.params.id,
    currentVersion: recipe.version || 1,
    recipe,
    history
  });
});

app.delete('/api/recipes/:id', (req, res) => {
  const d = readJSON(RECIPES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const i = d.recipes.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Recipe not found' });
  const r = d.recipes[i];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  d.recipes.splice(i, 1);
  d.lastUpdated = new Date().toISOString();
  writeJSONAtomic(RECIPES_FILE, d);

  // ── Orphan cleanup: clear references in products.json and finished_goods.json ──
  try {
    const prdData = readJSON(PRODUCTS_FILE) || { products: [] };
    let prdChanged = false;
    (prdData.products || []).forEach(p => {
      if (p.recipeId === r.id) { p.recipeId = null; prdChanged = true; }
    });
    if (prdChanged) { prdData.lastUpdated = new Date().toISOString(); writeJSONAtomic(PRODUCTS_FILE, prdData); }
  } catch (_) {}
  try {
    const fgData = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
    let fgChanged = false;
    (fgData.finished_goods || []).forEach(fg => {
      if (fg.recipeId === r.id) { fg.recipeId = null; fgChanged = true; }
    });
    if (fgChanged) { fgData.lastUpdated = new Date().toISOString(); writeJSONAtomic(FINISHED_GOODS_FILE, fgData); }
  } catch (_) {}

  logDeletionAudit({
    entityType: 'recipe',
    entityId: r.id,
    entityName: r.name,
    itemName: `Recipe: ${r.name} (Batch: ${r.batchSize || r.batch_size || 1} ${r.outputUnit || r.unit || 'L'})`,
    reason,
    details: `Ingredients: ${(r.ingredients || []).length} items`,
    notes: `DELETED RECIPE: "${r.name}" (ID: ${r.id}). Reason: ${reason}`
  });

  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════════════
// ─── MANUFACTURING CALCULATION ENGINE (PREVIEW & ATOMIC COMMIT) ─────────────
// ════════════════════════════════════════════════════════════════════════════

function runManufacturingCalculation(recipe, desiredQty, desiredUnit, rawMaterialsList, rmbBatchesList) {
  const dQty  = parseFloat(desiredQty) || 0;
  const dUnit = unitConv.normalizeUnit(desiredUnit || 'L');

  if (!rmbBatchesList) {
    const rmbData = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
    rmbBatchesList = rmbData.raw_material_batches || [];
  }

  // Calculate bottle count & total liquid volume
  const prodCalc = unitConv.calculateProductionBottles(
    dQty,
    dUnit,
    recipe.bottleSize || 200,
    recipe.bottleSizeUnit || 'mL'
  );

  const finishedBottlesCount = prodCalc.bottles;
  const totalVolumeInML = prodCalc.totalVolumeInML;
  const totalVolumeInL  = totalVolumeInML / 1000;

  // Recipe multiplier based on recipe.output_qty (usually 1 bottle)
  const multiplier = finishedBottlesCount / (recipe.outputQty || recipe.output_qty || 1);

  const breakdown = [];
  const shortages = [];
  let canProduce = true;
  let estimatedTotalCost = 0;

  // Track simulated remaining stock across ingredients during multi-ingredient BOM calculation
  const simBatches = (rmbBatchesList || []).map(b => ({
    id: b.id || b.batchId,
    rawMaterialId: b.rawMaterialId,
    vendorName: (b.vendorName || b.supplier || '').trim(),
    supplier: (b.supplier || b.vendorName || '').trim(),
    status: b.status,
    remainingQuantity: parseFloat((b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty !== undefined ? b.remainingQty : (b.quantity || 0))).toFixed(6)),
    receivedDate: b.receivedDate || b.purchaseDate || b.createdAt || 0
  }));

  const simRmStock = {};
  for (const rm of rawMaterialsList) {
    const s = rm.quantity !== undefined ? rm.quantity : (rm.current_stock !== undefined ? rm.current_stock : rm.stock);
    simRmStock[rm.id] = parseFloat((s || 0).toFixed(6));
  }

  for (let i = 0; i < (recipe.ingredients || []).length; i++) {
    const ing = recipe.ingredients[i];
    const ingRmId = ing.rawMaterialId || ing.raw_material_id;
    const ingQty = ing.quantity !== undefined ? ing.quantity : ing.qty;
    const rm = rawMaterialsList.find(r => r.id === ingRmId);
    const rmName = rm ? rm.name : (ing.name || ing.raw_material_name || 'Unknown Material');
    const rmStockUnit = rm ? rm.unit : ing.unit;
    const rmCostPerUnit = rm ? (rm.purchaseCost || rm.cost_per_unit || 0) : 0;
    const vendorPref = (ing.vendorPreference || ing.vendor_preference || 'DEFAULT_FIFO').trim();

    const recipeNeededQty = parseFloat(((ingQty || 0) * multiplier).toFixed(6));
    let requiredInStockUnit = recipeNeededQty;

    // Convert recipe ingredient unit to raw material stock unit
    if (rm && ing.unit !== rm.unit) {
      try {
        requiredInStockUnit = parseFloat(unitConv.convert(recipeNeededQty, ing.unit, rm.unit).toFixed(6));
      } catch (err) {
        requiredInStockUnit = recipeNeededQty;
      }
    }

    let availableStock = 0;
    if (vendorPref && vendorPref !== 'DEFAULT_FIFO' && rm) {
      const vNorm = vendorPref.toLowerCase();
      const vBatches = simBatches.filter(b =>
        b.rawMaterialId === rm.id &&
        (b.vendorName.toLowerCase() === vNorm || b.supplier.toLowerCase() === vNorm) &&
        (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'))
      );
      availableStock = parseFloat(vBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(6));
    } else if (rm) {
      const activeBatches = simBatches.filter(b =>
        b.rawMaterialId === rm.id &&
        (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'))
      );
      if (activeBatches.length > 0) {
        availableStock = parseFloat(activeBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(6));
      } else {
        availableStock = simRmStock[rm.id] || 0;
      }
    }

    const shortage = Math.max(0, parseFloat((requiredInStockUnit - availableStock).toFixed(6)));
    const remainingStockAfter = Math.max(0, parseFloat((availableStock - requiredInStockUnit).toFixed(6)));
    const ingredientCost = parseFloat((requiredInStockUnit * rmCostPerUnit).toFixed(2));
    estimatedTotalCost += ingredientCost;

    const isSufficient = shortage <= 0;
    if (!isSufficient) {
      canProduce = false;
      shortages.push({
        ingredientIndex: i,
        rawMaterialId: ingRmId,
        rawMaterialName: rmName,
        vendorPreference: vendorPref,
        requiredQty: requiredInStockUnit,
        availableQty: availableStock,
        shortageQty: shortage,
        unit: rmStockUnit,
        errorReason: (vendorPref && vendorPref !== 'DEFAULT_FIFO')
          ? `Insufficient stock for preferred vendor "${vendorPref}". Required: ${requiredInStockUnit} ${rmStockUnit}, Available from "${vendorPref}": ${availableStock} ${rmStockUnit}`
          : `Insufficient stock for "${rmName}". Required: ${requiredInStockUnit} ${rmStockUnit}, Available: ${availableStock} ${rmStockUnit}`
      });
    } else {
      // Simulate deduction in local pool for subsequent ingredients in this recipe
      let toDeduct = requiredInStockUnit;
      if (vendorPref && vendorPref !== 'DEFAULT_FIFO' && rm) {
        const vNorm = vendorPref.toLowerCase();
        const vBatches = simBatches.filter(b =>
          b.rawMaterialId === rm.id &&
          (b.vendorName.toLowerCase() === vNorm || b.supplier.toLowerCase() === vNorm) &&
          (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'))
        );
        for (const bat of vBatches) {
          if (toDeduct <= 0) break;
          const take = Math.min(bat.remainingQuantity, toDeduct);
          bat.remainingQuantity = parseFloat((bat.remainingQuantity - take).toFixed(6));
          toDeduct = parseFloat((toDeduct - take).toFixed(6));
          if (bat.remainingQuantity <= 0) bat.status = 'CONSUMED';
        }
      } else if (rm) {
        const activeBatches = simBatches.filter(b =>
          b.rawMaterialId === rm.id &&
          (b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'))
        );
        for (const bat of activeBatches) {
          if (toDeduct <= 0) break;
          const take = Math.min(bat.remainingQuantity, toDeduct);
          bat.remainingQuantity = parseFloat((bat.remainingQuantity - take).toFixed(6));
          toDeduct = parseFloat((toDeduct - take).toFixed(6));
          if (bat.remainingQuantity <= 0) bat.status = 'CONSUMED';
        }
      }
      if (simRmStock[ingRmId] !== undefined) {
        simRmStock[ingRmId] = Math.max(0, parseFloat((simRmStock[ingRmId] - requiredInStockUnit).toFixed(6)));
      }
    }

    breakdown.push({
      ingredientIndex: i,
      rawMaterialId: ingRmId,
      rawMaterialName: rmName,
      recipeUnitQty: ingQty,
      recipeUnit: ing.unit,
      vendorPreference: vendorPref,
      requiredQty: recipeNeededQty,
      requiredStockUnitQty: requiredInStockUnit,
      stockUnit: rmStockUnit,
      availableStock,
      shortage,
      remainingStockAfter,
      sufficient: isSufficient,
      unitCost: rmCostPerUnit,
      ingredientCost
    });
  }

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    productName: recipe.productName || recipe.output_product_name,
    bottleSize: recipe.bottleSize || 200,
    bottleSizeUnit: recipe.bottleSizeUnit || 'mL',
    desiredQty: dQty,
    desiredUnit: dUnit,
    finishedBottlesCount,
    totalVolumeInML,
    totalVolumeInL,
    estimatedTotalCost: parseFloat(estimatedTotalCost.toFixed(2)),
    canProduce,
    breakdown,
    shortages
  };
}

// ── PREVIEW ENDPOINT ────────────────────────────────────────────────────────
app.post('/api/manufacturing-batches/preview', (req, res) => {
  const recipeData = readJSON(RECIPES_FILE);
  const rmData     = readJSON(RAW_MATERIALS_FILE);
  const rmbData    = readJSON(RAW_MATERIAL_BATCHES_FILE);
  if (!recipeData || !rmData) return res.status(500).json({ error: 'Read failed' });

  const { recipe_id, recipeId, desiredQty, desired_qty, desiredUnit, desired_unit } = req.body;
  const targetId = recipe_id || recipeId;
  const recipe = recipeData.recipes.find(r => r.id === targetId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  const qty  = parseFloat(desiredQty || desired_qty || 1);
  const unit = desiredUnit || desired_unit || 'L';

  const preview = runManufacturingCalculation(recipe, qty, unit, rmData.raw_materials || [], rmbData ? rmbData.raw_material_batches : []);
  res.json(preview);
});

// ── ATOMIC COMMIT ENDPOINT (WITH TRACEABILITY & AUDIT) ─────────────────────────
app.post('/api/manufacturing/commit', (req, res, next) => {
  req.url = '/api/manufacturing-batches/commit';
  return app._router.handle(req, res, next);
});

app.post('/api/manufacturing-batches/commit', (req, res) => {
  const {
    recipe_id, recipeId,
    desiredQty, desired_qty,
    desiredUnit, desired_unit,
    operatorName, operator_name,
    batchNumber, batch_number,
    manufacturingStartDate, manufacturing_start_date,
    manufacturingEndDate, manufacturing_end_date,
    notes
  } = req.body;

  const targetRecipeId = recipe_id || recipeId;
  const rawQty = desiredQty !== undefined ? desiredQty : (desired_qty !== undefined ? desired_qty : (req.body.batchSize !== undefined ? req.body.batchSize : (req.body.quantity !== undefined ? req.body.quantity : req.body.qty)));
  const qty = Number(rawQty);
  const unit = desiredUnit || desired_unit || 'L';
  const mfgStartDate = (manufacturingStartDate || manufacturing_start_date || '').trim() || null;
  const mfgEndDate = (manufacturingEndDate || manufacturing_end_date || '').trim() || null;

  if (!targetRecipeId) return res.status(400).json({ error: 'Recipe ID is required' });
  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'Desired production quantity must be a valid finite positive number' });

  // Optional dates validation: if both provided, End Date >= Start Date
  if (mfgStartDate && mfgEndDate) {
    const sDate = new Date(mfgStartDate);
    const eDate = new Date(mfgEndDate);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate < sDate) {
      return res.status(400).json({ error: 'Manufacturing End Date cannot be earlier than Manufacturing Start Date' });
    }
  }

  // 1. Read all required data stores into RAM
  const rmData       = readJSON(RAW_MATERIALS_FILE);
  const rmTxnData    = readJSON(RAW_MAT_TXN_FILE) || { raw_material_transactions: [] };
  const rmbData      = readJSON(RAW_MATERIAL_BATCHES_FILE) || { raw_material_batches: [] };
  const fgData       = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
  const fgTxnData    = readJSON(FG_TXN_FILE) || { finished_goods_transactions: [] };
  const batchData    = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
  const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
  const recipeData   = readJSON(RECIPES_FILE);

  if (!rmData || !recipeData) return res.status(500).json({ error: 'Read failed' });

  const recipe = recipeData.recipes.find(r => r.id === targetRecipeId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  // 2. Perform Pre-Production Calculation & Inventory Validation
  const calc = runManufacturingCalculation(recipe, qty, unit, rmData.raw_materials || [], rmbData.raw_material_batches || []);

  if (!calc.canProduce) {
    return res.status(422).json({
      error: 'Manufacturing BLOCKED due to raw material shortages',
      canProduce: false,
      shortages: calc.shortages,
      breakdown: calc.breakdown
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
  const mfgId = generateMfgId();
  const seqBatchNo = batchNumber || batch_number || `MFG-${dateStr.replace(/-/g,'')}-${String((batchData.manufacturing_batches||[]).length + 1).padStart(5,'0')}`;
  const fgBatchId = `FGB-${dateStr.replace(/-/g,'')}-${String(Math.floor(Math.random()*90000)+10000)}`;
  const opName = operatorName || operator_name || 'System Operator';

  const rmDeductionTxns = [];
  const rawMaterialConsumptionDetails = [];

  // Ensure arrays exist
  if (!rmbData.raw_material_batches) rmbData.raw_material_batches = [];
  if (!mfgAuditData.manufacturing_audit) mfgAuditData.manufacturing_audit = [];

  // 3. Deduct raw materials & consume raw-material batches (FIFO with optional vendor preference)
  for (const b of calc.breakdown) {
    const rmIdx = rmData.raw_materials.findIndex(r => r.id === b.rawMaterialId);
    if (rmIdx !== -1) {
      const currentStock = rmData.raw_materials[rmIdx].current_stock !== undefined ? rmData.raw_materials[rmIdx].current_stock : rmData.raw_materials[rmIdx].stock;
      const vendorPref = (b.vendorPreference || (b.ingredientIndex !== undefined && recipe.ingredients[b.ingredientIndex] ? (recipe.ingredients[b.ingredientIndex].vendorPreference || recipe.ingredients[b.ingredientIndex].vendor_preference) : null) || 'DEFAULT_FIFO').trim();

      // Find candidate active batches for this raw material
      let candidateBatches = rmbData.raw_material_batches.filter(
        bat => bat.rawMaterialId === b.rawMaterialId && (bat.status === 'ACTIVE' || (bat.remainingQuantity > 0 && bat.status !== 'CONSUMED'))
      );

      if (vendorPref && vendorPref !== 'DEFAULT_FIFO') {
        const vPrefNorm = vendorPref.toLowerCase();
        candidateBatches = candidateBatches.filter(bat => {
          const vName = (bat.vendorName || '').trim().toLowerCase();
          const sName = (bat.supplier || '').trim().toLowerCase();
          return vName === vPrefNorm || sName === vPrefNorm;
        });
      }

      // Check available quantity in candidate batches
      const totalAvailableInCandidates = candidateBatches.reduce((sum, bat) => sum + (bat.remainingQuantity !== undefined ? bat.remainingQuantity : (bat.remainingQty || 0)), 0);
      if (totalAvailableInCandidates < b.requiredStockUnitQty) {
        return res.status(422).json({
          error: `Manufacturing failed: Insufficient batch stock for raw material "${b.rawMaterialName}"${vendorPref && vendorPref !== 'DEFAULT_FIFO' ? ` from vendor "${vendorPref}"` : ''}. Required: ${b.requiredStockUnitQty} ${b.stockUnit}, Available: ${totalAvailableInCandidates} ${b.stockUnit}`,
          canProduce: false
        });
      }

      // Sort candidate batches FIFO: by receivedDate / purchaseDate / createdAt ascending
      candidateBatches.sort((x, y) => new Date(x.receivedDate || x.purchaseDate || x.createdAt || 0) - new Date(y.receivedDate || y.purchaseDate || y.createdAt || 0));

      let remainingNeeded = b.requiredStockUnitQty;
      const consumedBatchAllocations = [];
      const exhaustedBatches = [];

      for (const bat of candidateBatches) {
        if (remainingNeeded <= 0) break;
        const availableInBat = bat.remainingQuantity !== undefined ? bat.remainingQuantity : (bat.remainingQty !== undefined ? bat.remainingQty : (bat.quantity || 0));
        if (availableInBat <= 0) continue;

        const take = Math.min(availableInBat, remainingNeeded);
        const newBatRemaining = parseFloat((availableInBat - take).toFixed(6));
        bat.remainingQuantity = newBatRemaining;
        bat.remainingQty = newBatRemaining;
        remainingNeeded = parseFloat((remainingNeeded - take).toFixed(6));

        const isExhausted = newBatRemaining <= 0;
        if (isExhausted) {
          bat.status = 'CONSUMED';
          bat.consumedAt = now.toISOString();
          exhaustedBatches.push(bat);
        }

        consumedBatchAllocations.push({
          rawMaterialBatchId: bat.id || bat.batchId,
          supplierBatchNumber: bat.supplierBatchNumber || '',
          vendorName: bat.vendorName || bat.supplier || '',
          quantityConsumed: take,
          remainingAfter: newBatRemaining,
          isExhausted,
          unit: b.stockUnit || (rmData.raw_materials[rmIdx] ? rmData.raw_materials[rmIdx].unit : bat.unit)
        });
      }

      // If no batches were found (fallback safeguard), create baseline lot
      if (consumedBatchAllocations.length === 0) {
        const fallbackBatchId = `RMB-${b.rawMaterialId}-LOT1`;
        consumedBatchAllocations.push({
          rawMaterialBatchId: fallbackBatchId,
          supplierBatchNumber: 'FALLBACK',
          vendorName: 'Direct Stock',
          quantityConsumed: b.requiredStockUnitQty,
          remainingAfter: Math.max(0, currentStock - b.requiredStockUnitQty),
          isExhausted: false,
          unit: b.stockUnit
        });
      }

      // Invariant: Parent Raw Material Stock = SUM(Active Batches Remaining Quantity)
      const activeBatchesSum = rmbData.raw_material_batches
        .filter(bat => bat.rawMaterialId === b.rawMaterialId && (bat.status === 'ACTIVE' || (bat.remainingQuantity > 0 && bat.status !== 'CONSUMED')))
        .reduce((sum, bat) => sum + (bat.remainingQuantity !== undefined ? bat.remainingQuantity : (bat.remainingQty || 0)), 0);

      const newStock = parseFloat(activeBatchesSum.toFixed(6));
      rmData.raw_materials[rmIdx].current_stock = newStock;
      rmData.raw_materials[rmIdx].stock = newStock;
      rmData.raw_materials[rmIdx].updatedAt = now.toISOString();

      const auditCorrId = generateAuditCorrelationId();
      const primaryRmBatchId = consumedBatchAllocations[0].rawMaterialBatchId;

      // Log RAW_MATERIAL_BATCH_CONSUMED audit records for exhausted batches
      exhaustedBatches.forEach(eb => {
        logAuditEntry(mfgAuditData, {
          auditId: generateAuditCorrelationId(),
          auditCorrelationId: auditCorrId,
          date: dateStr,
          timestamp: now.toISOString(),
          eventType: 'RAW_MATERIAL_BATCH_CONSUMED',
          transactionType: 'RAW_MATERIAL_BATCH_CONSUMED',
          manufacturingBatchId: mfgId,
          batchNumber: seqBatchNo,
          rawMaterialId: b.rawMaterialId,
          rawMaterialName: b.rawMaterialName,
          rawMaterialBatchId: eb.id || eb.batchId,
          supplierBatchNumber: eb.supplierBatchNumber || '',
          vendorName: eb.vendorName || eb.supplier || '',
          consumedQuantity: eb.originalQuantity || eb.quantity,
          remainingQuantity: 0,
          status: 'CONSUMED',
          notes: `Batch ${eb.id || eb.batchId} (${eb.vendorName || 'Vendor'}) fully consumed and exhausted by MFG Batch ${seqBatchNo}`
        });
      });

      // Record transaction in raw_material_transactions.json for each batch allocation
      consumedBatchAllocations.forEach((alloc, aIdx) => {
        const rmtTxn = {
          id: uid('RMT'),
          auditCorrelationId: auditCorrId,
          date: dateStr,
          time: timeStr,
          rawMaterialId: b.rawMaterialId,
          raw_material_id: b.rawMaterialId,
          rawMaterialName: b.rawMaterialName,
          raw_material_name: b.rawMaterialName,
          rawMaterialBatchId: alloc.rawMaterialBatchId,
          supplierBatchNumber: alloc.supplierBatchNumber,
          vendorName: alloc.vendorName,
          manufacturingBatchId: mfgId,
          action: 'Manufacturing Deduction',
          transactionType: 'MANUFACTURING_CONSUMPTION',
          type: 'OUT',
          quantity: alloc.quantityConsumed,
          unit: alloc.unit,
          cost_per_unit: b.unitCost,
          remainingStock: alloc.remainingAfter,
          referenceId: mfgId,
          notes: `Production Batch ${seqBatchNo} (Consumed ${alloc.quantityConsumed} ${alloc.unit} from ${alloc.rawMaterialBatchId}${alloc.vendorName ? ` - ${alloc.vendorName}` : ''})`,
          createdAt: now.toISOString()
        };
        rmTxnData.raw_material_transactions.push(rmtTxn);
        rmDeductionTxns.push(rmtTxn);
      });

      // Record in dedicated Manufacturing Audit Ledger
      const auditRecord = {
        auditId: auditCorrId,
        auditCorrelationId: auditCorrId,
        date: dateStr,
        timestamp: now.toISOString(),
        manufacturingBatchId: mfgId,
        batchNumber: seqBatchNo,
        recipeId: recipe.id,
        recipeVersion: recipe.version || 1,
        recipeName: recipe.name,
        productId: recipe.productId || null,
        productName: calc.productName,
        manufacturingStartDate: mfgStartDate,
        manufacturingEndDate: mfgEndDate,
        manufacturedQuantity: calc.finishedBottlesCount,
        manufacturedUnit: recipe.output_unit || 'pcs',
        rawMaterialId: b.rawMaterialId,
        rawMaterialName: b.rawMaterialName,
        rawMaterialBatchId: primaryRmBatchId,
        consumedBatchAllocations,
        rawMaterialQuantityConsumed: b.requiredStockUnitQty,
        rawMaterialUnit: b.stockUnit,
        rawMaterialStockBefore: currentStock,
        rawMaterialStockAfter: newStock,
        finishedGoodsBatchId: fgBatchId,
        finishedGoodsQuantityCreated: calc.finishedBottlesCount,
        operatorName: opName,
        transactionType: 'MANUFACTURING_CONSUMPTION',
        referenceId: mfgId
      };

      logAuditEntry(mfgAuditData, auditRecord);
      rawMaterialConsumptionDetails.push({
        rawMaterialId: b.rawMaterialId,
        rawMaterialName: b.rawMaterialName,
        rawMaterialBatchId: primaryRmBatchId,
        auditCorrelationId: auditCorrId,
        consumedQty: b.requiredStockUnitQty,
        unit: b.stockUnit,
        unitCost: b.unitCost,
        totalCost: b.ingredientCost,
        stockBefore: currentStock,
        stockAfter: newStock,
        batchAllocations: consumedBatchAllocations
      });
    }
  }

  // 4. Update Finished Goods Inventory in RAM
  // Multi-key lookup: by productId, recipeId, or name
  const linkedRecipeData = readJSON(RECIPES_FILE) || { recipes: [] };
  const linkedPrdData    = readJSON(PRODUCTS_FILE) || { products: [] };
  // Find product linked to this recipe
  const linkedProduct = linkedPrdData.products.find(p =>
    (recipe.productId && p.id === recipe.productId) ||
    (p.recipeId && p.recipeId === recipe.id) ||
    (p.name && calc.productName && p.name.toLowerCase() === calc.productName.toLowerCase())
  );
  const resolvedProductId = linkedProduct ? linkedProduct.id : (recipe.productId || null);

  let fgIdx = fgData.finished_goods.findIndex(f =>
    (resolvedProductId && f.productId === resolvedProductId) ||
    (f.recipeId && f.recipeId === recipe.id) ||
    (f.name && f.name.toLowerCase() === (calc.productName || '').toLowerCase())
  );
  if (fgIdx === -1) {
    fgData.finished_goods.push({
      id: uid('FG'),
      productId: resolvedProductId,
      recipeId: recipe.id,
      name: calc.productName,
      bottleSize: calc.bottleSize,
      bottleSizeUnit: calc.bottleSizeUnit,
      unit: recipe.output_unit || 'pcs',
      currentStock: 0,
      finishedGoodsBatchId: fgBatchId,
      manufacturingBatchId: mfgId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
    fgIdx = fgData.finished_goods.length - 1;
  } else {
    // Ensure IDs are linked even on existing record
    fgData.finished_goods[fgIdx].recipeId = recipe.id;
    if (resolvedProductId) {
      fgData.finished_goods[fgIdx].productId = resolvedProductId;
    }
  }

  const fgCurrentStock = fgData.finished_goods[fgIdx].currentStock || 0;
  const fgNewStock = parseFloat((fgCurrentStock + calc.finishedBottlesCount).toFixed(6));
  fgData.finished_goods[fgIdx].currentStock = fgNewStock;
  fgData.finished_goods[fgIdx].finishedGoodsBatchId = fgBatchId;
  fgData.finished_goods[fgIdx].manufacturingBatchId = mfgId;
  fgData.finished_goods[fgIdx].updatedAt = now.toISOString();

  const fgTxn = {
    id: uid('FGT'),
    auditCorrelationId: generateAuditCorrelationId(),
    date: dateStr,
    time: timeStr,
    finishedGoodId: fgData.finished_goods[fgIdx].id,
    finishedGoodsBatchId: fgBatchId,
    manufacturingBatchId: mfgId,
    productName: calc.productName,
    action: 'Production',
    type: 'IN',
    quantity: calc.finishedBottlesCount,
    unit: recipe.output_unit || 'pcs',
    remainingStock: fgNewStock,
    referenceId: mfgId,
    notes: `Batch ${seqBatchNo} produced (FG Lot: ${fgBatchId})`,
    createdAt: now.toISOString()
  };
  fgTxnData.finished_goods_transactions.push(fgTxn);

  // 5. Build Manufacturing Batch Record with historical recipe snapshot (Section 1 & 7)
  const batchRecord = {
    id: mfgId,
    mfgId,
    batchNumber: seqBatchNo,
    recipeId: recipe.id,
    recipeVersion: recipe.version || 1,
    recipeSnapshot: JSON.parse(JSON.stringify(recipe)), // Immutable snapshot of recipe at time of batch
    recipeName: recipe.name,
    productId: recipe.productId,
    productName: calc.productName,
    bottleSize: calc.bottleSize,
    bottleSizeUnit: calc.bottleSizeUnit,
    desiredProductionQty: calc.desiredQty,
    desiredProductionUnit: calc.desiredUnit,
    quantityProduced: calc.finishedBottlesCount,
    totalVolumeInML: calc.totalVolumeInML,
    totalVolumeInL: calc.totalVolumeInL,
    estimatedTotalCost: calc.estimatedTotalCost,
    operatorName: opName,
    status: 'completed',
    finishedGoodsBatchId: fgBatchId,
    manufacturingStartDate: mfgStartDate,
    manufacturingEndDate: mfgEndDate,
    notes: notes || '',
    ingredientsConsumed: rawMaterialConsumptionDetails,
    createdAt: now.toISOString(),
    date: dateStr,
    time: timeStr
  };

  batchData.manufacturing_batches.push(batchRecord);

  // 6. Update Product Catalog Bulk Stock in products.json (dimension-aware)
  try {
    const prdData6 = readJSON(PRODUCTS_FILE) || { products: [] };
    const pIdx = prdData6.products.findIndex(p =>
      (resolvedProductId && p.id === resolvedProductId) ||
      (p.recipeId && p.recipeId === recipe.id) ||
      (p.name && p.name.toLowerCase() === (calc.productName || '').toLowerCase())
    );
    if (pIdx !== -1) {
      const prd = prdData6.products[pIdx];
      // Auto-link IDs
      if (!prd.recipeId) prd.recipeId = recipe.id;
      if (!recipe.productId && prd.id) {
        recipe.productId = prd.id;
        // persist recipe update later as part of atomic writes
      }

      // Determine the produced bulk amount in the production unit
      const producedQty  = calc.finishedBottlesCount;   // pcs produced
      const bottleSize   = calc.bottleSize;              // e.g. 1
      const bottleUnit   = calc.bottleSizeUnit;          // e.g. 'kg'
      // Total produced in bottleUnit
      const totalProducedInBottleUnit = producedQty * bottleSize;
      const bulkUnit = prd.bulkStockUnit || bottleUnit;

      let addedInBulkUnit = totalProducedInBottleUnit;
      try {
        addedInBulkUnit = unitConv.convert(totalProducedInBottleUnit, bottleUnit, bulkUnit);
      } catch (_) {
        addedInBulkUnit = totalProducedInBottleUnit;
      }

      prd.bulkStock     = parseFloat(((prd.bulkStock || 0) + addedInBulkUnit).toFixed(6));
      prd.bulkStockUnit = bulkUnit;
      prd.updatedAt     = now.toISOString();
      prdData6.lastUpdated = now.toISOString();
      writeJSONAtomic(PRODUCTS_FILE, prdData6);
    }
  } catch (prdSyncErr) {
    console.error('Failed to sync product bulk stock during manufacturing commit:', prdSyncErr);
  }

  const isoNow = now.toISOString();
  rmData.lastUpdated = rmTxnData.lastUpdated = rmbData.lastUpdated = fgData.lastUpdated = fgTxnData.lastUpdated = batchData.lastUpdated = mfgAuditData.lastUpdated = isoNow;

  // 7. Write all files to disk atomically
  try {
    writeJSONAtomic(RAW_MATERIALS_FILE,         rmData);
    writeJSONAtomic(RAW_MAT_TXN_FILE,          rmTxnData);
    writeJSONAtomic(RAW_MATERIAL_BATCHES_FILE,  rmbData);
    writeJSONAtomic(FINISHED_GOODS_FILE,        fgData);
    writeJSONAtomic(FG_TXN_FILE,               fgTxnData);
    writeJSONAtomic(MANUFACTURING_BATCHES_FILE, batchData);
    writeJSONAtomic(MANUFACTURING_AUDIT_FILE,   mfgAuditData);
  } catch (err) {
    return res.status(500).json({ error: 'Atomic write failed: ' + err.message });
  }

  res.status(201).json({ success: true, batch: batchRecord, calculation: calc });
});

app.get('/api/manufacturing-batches', (req, res) => {
  const d = readJSON(MANUFACTURING_BATCHES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

// ─── BATCH TRACEABILITY ENDPOINT ──────────────────────────────────────────────
app.get('/api/manufacturing-batches/:id/traceability', (req, res) => {
  try {
    const batchData    = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE)   || { manufacturing_audit: [] };
    const recipeData   = readJSON(RECIPES_FILE)               || { recipes: [] };
    const productData  = readJSON(PRODUCTS_FILE)              || { products: [] };
    const invoiceData  = readJSON(INVOICES_FILE)              || { invoices: [] };

    const batch = (batchData.manufacturing_batches || []).find(b => b.id === req.params.id || b.mfgId === req.params.id || b.batchNumber === req.params.id);
    if (!batch) return res.status(404).json({ error: 'Manufacturing batch not found' });

    // Recipe info (historical snapshot preferred)
    const recipe = batch.recipeSnapshot || (recipeData.recipes || []).find(r => r.id === batch.recipeId) || {};

    // Raw material consumption from audit ledger
    const auditRows = (mfgAuditData.manufacturing_audit || []).filter(
      a => a.manufacturingBatchId === batch.id || a.manufacturingBatchId === batch.mfgId
    );

    // Product info & packaging variants
    const product = (productData.products || []).find(p => p.id === batch.productId || p.name === batch.productName) || {};

    // Invoices matching this product / finished goods batch
    const matchingInvoices = [];
    for (const inv of (invoiceData.invoices || [])) {
      const matchedItems = (inv.items || []).filter(item => {
        const matchesProduct = (item.productId && item.productId === batch.productId) ||
                               (item.name && item.name.includes(batch.productName));
        const matchesBatchAlloc = (item.batchAllocations || []).some(
          alloc => alloc.manufacturingBatchId === batch.id || alloc.finishedGoodsBatchId === batch.finishedGoodsBatchId
        );
        return matchesProduct || matchesBatchAlloc;
      });

      if (matchedItems.length > 0) {
        matchingInvoices.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerName: inv.customerName || (inv.customer && inv.customer.name) || 'Customer',
          items: matchedItems.map(it => ({
            name: it.name || it.productName,
            quantity: it.quantity || it.qty,
            rate: it.rate || it.price,
            total: (it.quantity || it.qty || 0) * (it.rate || it.price || 0)
          }))
        });
      }
    }

    res.json({
      success: true,
      batch,
      recipe,
      rawMaterialConsumption: auditRows.length > 0 ? auditRows : (batch.ingredientsConsumed || []),
      finishedGoodsBatch: {
        finishedGoodsBatchId: batch.finishedGoodsBatchId,
        productName: batch.productName,
        quantity: batch.quantityProduced,
        unit: batch.desiredProductionUnit || 'pcs'
      },
      packagingVariants: product.variants || [],
      salesInvoices: matchingInvoices
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve batch traceability: ' + err.message });
  }
});

// ─── AUDIT VERIFICATION & TAMPERING DETECTION ENDPOINT ────────────────────────
app.get('/api/manufacturing-audit/verify', (req, res) => {
  try {
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    const result = verifyAuditChain(mfgAuditData.manufacturing_audit || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// ─── MANUFACTURING AUDIT LEDGER ENDPOINT ──────────────────────────────────────
// ─── UNIFIED AUDIT LEDGER ENDPOINT ──────────────────────────────────────────
app.get('/api/manufacturing-audit-ledger', (req, res) => {
  try {
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE) || { manufacturing_audit: [] };
    let rows = mfgAuditData.manufacturing_audit || [];

    const { batchId, rawMaterial, product, startDate, endDate, search, auditCorrelationId } = req.query;

    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter(r => 
        (r.auditCorrelationId && r.auditCorrelationId.toLowerCase().includes(q)) ||
        (r.batchNumber && r.batchNumber.toLowerCase().includes(q)) ||
        (r.manufacturingBatchId && r.manufacturingBatchId.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        (r.rawMaterialName && r.rawMaterialName.toLowerCase().includes(q)) ||
        (r.rawMaterialBatchId && r.rawMaterialBatchId.toLowerCase().includes(q)) ||
        (r.operatorName && r.operatorName.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    if (auditCorrelationId) {
      const q = String(auditCorrelationId).toLowerCase();
      rows = rows.filter(r => r.auditCorrelationId && r.auditCorrelationId.toLowerCase().includes(q));
    }
    if (batchId) {
      const q = String(batchId).toLowerCase();
      rows = rows.filter(r => (r.manufacturingBatchId && r.manufacturingBatchId.toLowerCase().includes(q)) ||
                              (r.batchNumber && r.batchNumber.toLowerCase().includes(q)));
    }
    if (rawMaterial) {
      const q = String(rawMaterial).toLowerCase();
      rows = rows.filter(r => (r.rawMaterialName && r.rawMaterialName.toLowerCase().includes(q)) ||
                              (r.rawMaterialId && r.rawMaterialId.toLowerCase().includes(q)));
    }
    if (product) {
      const q = String(product).toLowerCase();
      rows = rows.filter(r => (r.productName && r.productName.toLowerCase().includes(q)) ||
                              (r.productId && r.productId.toLowerCase().includes(q)));
    }
    if (startDate) {
      rows = rows.filter(r => (r.date || r.timestamp) >= startDate);
    }
    if (endDate) {
      rows = rows.filter(r => (r.date || r.timestamp) <= endDate);
    }

    res.json({
      success: true,
      count: rows.length,
      manufacturing_audit: rows,
      entries: rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve manufacturing audit ledger: ' + err.message });
  }
});

// ─── UNIFIED 6-SHEET AUDIT LEDGER EXCEL EXPORT HANDLER ────────────────────────
const handleAuditLedgerExport = async (req, res) => {
  try {
    const batchData    = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };
    const mfgAuditData = readJSON(MANUFACTURING_AUDIT_FILE)   || { manufacturing_audit: [] };
    const invoiceData  = readJSON(INVOICES_FILE)              || { invoices: [] };
    const productData  = readJSON(PRODUCTS_FILE)              || { products: [] };
    const rmTxnData    = readJSON(RAW_MAT_TXN_FILE)           || { raw_material_transactions: [] };
    const fgTxnData    = readJSON(FG_TXN_FILE)                || { finished_goods_transactions: [] };
    const rmbData      = readJSON(RAW_MATERIAL_BATCHES_FILE)  || { raw_material_batches: [] };
    const settings     = readJSON(SETTINGS_FILE)              || {};

    let batches = batchData.manufacturing_batches || [];
    let auditRows = mfgAuditData.manufacturing_audit || [];
    let invoices = invoiceData.invoices || [];
    let rmTxns = rmTxnData.raw_material_transactions || [];
    let fgTxns = fgTxnData.finished_goods_transactions || [];

    const mode = req.query.mode || 'all';
    const { search, auditCorrelationId, batchId, startDate, endDate } = req.query;

    if (mode === 'filtered') {
      if (auditCorrelationId) {
        const q = String(auditCorrelationId).toLowerCase();
        auditRows = auditRows.filter(r => r.auditCorrelationId && r.auditCorrelationId.toLowerCase().includes(q));
        rmTxns = rmTxns.filter(r => r.auditCorrelationId && r.auditCorrelationId.toLowerCase().includes(q));
      }
      if (batchId) {
        const q = String(batchId).toLowerCase();
        batches = batches.filter(b => (b.batchNumber && b.batchNumber.toLowerCase().includes(q)) || (b.id && b.id.toLowerCase().includes(q)));
        auditRows = auditRows.filter(r => (r.batchNumber && r.batchNumber.toLowerCase().includes(q)) || (r.manufacturingBatchId && r.manufacturingBatchId.toLowerCase().includes(q)));
      }
      if (startDate) {
        auditRows = auditRows.filter(r => (r.date || r.timestamp) >= startDate);
        rmTxns = rmTxns.filter(r => r.date >= startDate);
        invoices = invoices.filter(i => i.date >= startDate);
      }
      if (endDate) {
        auditRows = auditRows.filter(r => (r.date || r.timestamp) <= endDate);
        rmTxns = rmTxns.filter(r => r.date <= endDate);
        invoices = invoices.filter(i => i.date <= endDate);
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'InvoiceWise ERP 3.0';
    workbook.lastModifiedBy = settings.businessName || 'InvoiceWise Manufacturing';
    workbook.created = new Date();

    const headerStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } },
      font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'medium', color: { argb: '64748B' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      }
    };

    const formatSheet = (sheet, columns, rowData) => {
      sheet.columns = columns;
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      const hRow = sheet.getRow(1);
      hRow.height = 28;
      hRow.eachCell(cell => Object.assign(cell, headerStyle));

      rowData.forEach(r => {
        const row = sheet.addRow(r);
        row.height = 20;
        row.eachCell(cell => {
          cell.alignment = { vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'F1F5F9' } },
            bottom: { style: 'thin', color: { argb: 'F1F5F9' } },
            left: { style: 'thin', color: { argb: 'F1F5F9' } },
            right: { style: 'thin', color: { argb: 'F1F5F9' } }
          };
        });
      });

      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

      sheet.columns.forEach(col => {
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (c) => {
          const l = c.value ? String(c.value).length : 10;
          if (l > maxLen) maxLen = l;
        });
        col.width = Math.min(Math.max(maxLen + 4, 14), 45);
      });
    };

    // ─── Sheet 1: Audit Summary ──────────────────────────────────────────────
    const sheet1Cols = [
      { header: 'Metric', key: 'metric' },
      { header: 'Value', key: 'value' },
      { header: 'Details / Scope', key: 'details' }
    ];
    const totalRMInward = rmTxns.filter(t => t.type === 'IN').reduce((s, t) => s + (t.quantity || 0), 0);
    const totalRMConsumed = rmTxns.filter(t => t.type === 'OUT').reduce((s, t) => s + (t.quantity || 0), 0);
    const totalMfgBottles = batches.reduce((s, b) => s + (b.quantityProduced || 0), 0);
    const totalInvoices = invoices.length;
    const totalSalesAmount = invoices.reduce((s, i) => s + (i.grandTotal || i.total || 0), 0);

    const sheet1Rows = [
      { metric: 'Business Name', value: settings.businessName || 'InvoiceWise ERP', details: `GSTIN: ${settings.businessGSTIN || 'N/A'}` },
      { metric: 'Export Mode', value: mode.toUpperCase(), details: `Generated on ${new Date().toISOString()}` },
      { metric: 'Total Raw Material Inward Movements', value: rmTxns.filter(t => t.type === 'IN').length, details: `Total Qty Inward: ${totalRMInward}` },
      { metric: 'Total Raw Material Consumed', value: rmTxns.filter(t => t.type === 'OUT').length, details: `Total Qty Deducted: ${totalRMConsumed}` },
      { metric: 'Total Manufacturing Batches Executed', value: batches.length, details: `Total Production Output: ${totalMfgBottles} Units` },
      { metric: 'Total Finished Goods Movements', value: fgTxns.length, details: 'Inward production + invoice deductions' },
      { metric: 'Total Sales Invoices Issued', value: totalInvoices, details: `Total Sales Value: ₹${totalSalesAmount.toFixed(2)}` },
      { metric: 'Total Correlated Audit Records', value: auditRows.length, details: 'Immutable event lineage' }
    ];
    const s1 = workbook.addWorksheet('Audit Summary');
    formatSheet(s1, sheet1Cols, sheet1Rows);

    // ─── Sheet 2: Raw Material Ledger (with Vendor & Inward Purchase) ─────────
    const sheet2Cols = [
      { header: 'Audit Correlation ID', key: 'auditCorrelationId' },
      { header: 'Transaction ID', key: 'id' },
      { header: 'Date', key: 'date' },
      { header: 'Transaction Type', key: 'transactionType' },
      { header: 'Action', key: 'action' },
      { header: 'Type (IN/OUT)', key: 'type' },
      { header: 'Raw Material ID', key: 'rawMaterialId' },
      { header: 'Raw Material Name', key: 'rawMaterialName' },
      { header: 'Raw Material Batch ID', key: 'rawMaterialBatchId' },
      { header: 'Supplier Batch Number', key: 'supplierBatchNumber' },
      { header: 'Vendor Name', key: 'vendorName' },
      { header: 'Vendor GST Number', key: 'vendorGstNumber' },
      { header: 'Vendor Billing Ref', key: 'vendorBillingRef' },
      { header: 'Vendor Price (₹)', key: 'vendorPrice' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Remaining Stock', key: 'remainingStock' },
      { header: 'Purchase Date', key: 'purchaseDate' },
      { header: 'Manufacturing Batch ID', key: 'manufacturingBatchId' },
      { header: 'Notes', key: 'notes' }
    ];
    const sheet2Rows = rmTxns.map(t => ({
      auditCorrelationId: t.auditCorrelationId || 'N/A',
      id: t.id,
      date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : ''),
      transactionType: t.transactionType || (t.type === 'IN' ? 'PURCHASE_INWARD' : 'MANUFACTURING_CONSUMPTION'),
      action: t.action || (t.type === 'IN' ? 'Purchase' : 'Deduction'),
      type: t.type || 'IN',
      rawMaterialId: t.rawMaterialId,
      rawMaterialName: t.rawMaterialName,
      rawMaterialBatchId: t.rawMaterialBatchId || 'N/A',
      supplierBatchNumber: t.supplierBatchNumber || t.lotNumber || 'N/A',
      vendorName: t.vendorName || 'N/A',
      vendorGstNumber: t.vendorGstNumber || 'N/A',
      vendorBillingRef: t.vendorBillingRef || t.referenceId || 'N/A',
      vendorPrice: t.vendorPrice !== undefined ? t.vendorPrice : 0,
      quantity: t.quantity || 0,
      unit: t.unit || '',
      remainingStock: t.remainingStock !== undefined ? t.remainingStock : 'N/A',
      purchaseDate: t.purchaseDate || t.date || 'N/A',
      manufacturingBatchId: t.manufacturingBatchId || 'N/A',
      notes: t.notes || ''
    }));
    const s2 = workbook.addWorksheet('Raw Material Ledger');
    formatSheet(s2, sheet2Cols, sheet2Rows);

    // ─── Sheet 3: Manufacturing Ledger (Correlated RM -> Batch -> FG) ─────────
    const sheet3Cols = [
      { header: 'Audit Correlation ID', key: 'auditCorrelationId' },
      { header: 'Date', key: 'date' },
      { header: 'Manufacturing Batch ID', key: 'mfgBatchId' },
      { header: 'Batch Number Override', key: 'batchNumber' },
      { header: 'Recipe ID', key: 'recipeId' },
      { header: 'Recipe Version', key: 'recipeVersion' },
      { header: 'Recipe Name', key: 'recipeName' },
      { header: 'Product ID', key: 'productId' },
      { header: 'Product Name', key: 'productName' },
      { header: 'Start Date', key: 'startDate' },
      { header: 'End Date', key: 'endDate' },
      { header: 'Raw Material ID', key: 'rmId' },
      { header: 'Raw Material Name', key: 'rmName' },
      { header: 'Raw Material Batch ID', key: 'rmBatchId' },
      { header: 'Quantity Consumed', key: 'qty' },
      { header: 'Unit', key: 'unit' },
      { header: 'RM Stock Before', key: 'stockBefore' },
      { header: 'RM Stock After', key: 'stockAfter' },
      { header: 'Finished Goods Batch ID', key: 'fgBatchId' },
      { header: 'Manufactured Quantity', key: 'mfgQty' },
      { header: 'Manufactured Unit', key: 'mfgUnit' },
      { header: 'Operator', key: 'operator' },
      { header: 'Reference ID', key: 'refId' }
    ];
    const sheet3Rows = auditRows.map(a => ({
      auditCorrelationId: a.auditCorrelationId || a.auditId || 'N/A',
      date: a.date || (a.timestamp ? a.timestamp.split('T')[0] : ''),
      mfgBatchId: a.manufacturingBatchId,
      batchNumber: a.batchNumber || a.manufacturingBatchId,
      recipeId: a.recipeId || '',
      recipeVersion: a.recipeVersion ? `v${a.recipeVersion}` : 'v1',
      recipeName: a.recipeName || '',
      productId: a.productId || '',
      productName: a.productName || '',
      startDate: a.manufacturingStartDate || 'N/A',
      endDate: a.manufacturingEndDate || 'N/A',
      rmId: a.rawMaterialId,
      rmName: a.rawMaterialName,
      rmBatchId: a.rawMaterialBatchId || 'RMB-LOT1',
      qty: a.rawMaterialQuantityConsumed || 0,
      unit: a.rawMaterialUnit || a.unit || '',
      stockBefore: a.rawMaterialStockBefore !== undefined ? a.rawMaterialStockBefore : 'N/A',
      stockAfter: a.rawMaterialStockAfter !== undefined ? a.rawMaterialStockAfter : 'N/A',
      fgBatchId: a.finishedGoodsBatchId || 'N/A',
      mfgQty: a.manufacturedQuantity || a.finishedGoodsQuantityCreated || 0,
      mfgUnit: a.manufacturedUnit || 'pcs',
      operator: a.operatorName || 'System',
      refId: a.referenceId || a.manufacturingBatchId
    }));
    const s3 = workbook.addWorksheet('Manufacturing Ledger');
    formatSheet(s3, sheet3Cols, sheet3Rows);

    // ─── Sheet 4: Finished Goods Ledger ───────────────────────────────────────
    const sheet4Cols = [
      { header: 'Date', key: 'date' },
      { header: 'Action', key: 'action' },
      { header: 'Type', key: 'type' },
      { header: 'Finished Good Item', key: 'productName' },
      { header: 'Finished Goods Batch ID', key: 'fgBatchId' },
      { header: 'Manufacturing Batch ID', key: 'mfgBatchId' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Unit', key: 'unit' },
      { header: 'Remaining Stock', key: 'remainingStock' },
      { header: 'Reference ID', key: 'refId' },
      { header: 'Notes', key: 'notes' }
    ];
    const sheet4Rows = fgTxns.map(t => ({
      date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : ''),
      action: t.action || 'FG Transaction',
      type: t.type || 'IN',
      productName: t.productName || 'Finished Good',
      fgBatchId: t.finishedGoodsBatchId || 'N/A',
      mfgBatchId: t.manufacturingBatchId || 'N/A',
      quantity: t.quantity || 0,
      unit: t.unit || 'pcs',
      remainingStock: t.remainingStock !== undefined ? t.remainingStock : 'N/A',
      refId: t.referenceId || '',
      notes: t.notes || ''
    }));
    const s4 = workbook.addWorksheet('Finished Goods Ledger');
    formatSheet(s4, sheet4Cols, sheet4Rows);

    // ─── Sheet 5: Sales Ledger ────────────────────────────────────────────────
    const sheet5Cols = [
      { header: 'Invoice Date', key: 'date' },
      { header: 'Invoice Number', key: 'invoiceNumber' },
      { header: 'Customer Name', key: 'customerName' },
      { header: 'Customer GSTIN', key: 'customerGstin' },
      { header: 'Product Name', key: 'productName' },
      { header: 'SKU / Variant', key: 'variant' },
      { header: 'Finished Goods Batch ID', key: 'fgBatchId' },
      { header: 'Manufacturing Batch ID', key: 'mfgBatchId' },
      { header: 'Quantity Sold', key: 'qty' },
      { header: 'Rate (₹)', key: 'rate' },
      { header: 'Taxable Amount (₹)', key: 'taxable' },
      { header: 'GST Rate (%)', key: 'gstRate' },
      { header: 'Total (₹)', key: 'total' },
      { header: 'Payment Status', key: 'status' },
      { header: 'Audit Correlation ID', key: 'auditCorrelationId' }
    ];
    const sheet5Rows = [];
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const matchingBatch = batches.find(b => b.productId === item.productId || (b.productName && item.name && item.name.includes(b.productName)));
        const qty = parseFloat(item.quantity || item.qty || 1);
        const rate = parseFloat(item.rate || item.price || 0);
        const taxable = qty * rate;
        const gstRate = parseFloat(item.gstRate || item.gst_rate || 18);
        const total = taxable * (1 + gstRate / 100);

        sheet5Rows.push({
          date: inv.date || (inv.createdAt ? inv.createdAt.split('T')[0] : ''),
          invoiceNumber: inv.invoiceNumber || inv.id,
          customerName: inv.customerName || (inv.customer && inv.customer.name) || 'Customer',
          customerGstin: (inv.customer && inv.customer.gstin) || inv.customerGSTIN || 'N/A',
          productName: item.name || item.productName || 'Product',
          variant: item.variantName || item.sku || 'Standard',
          fgBatchId: matchingBatch ? (matchingBatch.finishedGoodsBatchId || 'N/A') : 'FGB-AUTO',
          mfgBatchId: matchingBatch ? (matchingBatch.batchNumber || matchingBatch.id) : 'MFG-AUTO',
          qty,
          rate,
          taxable,
          gstRate,
          total: parseFloat(total.toFixed(2)),
          status: String(inv.status || 'paid').toUpperCase(),
          auditCorrelationId: inv.auditCorrelationId || 'N/A'
        });
      });
    });
    const s5 = workbook.addWorksheet('Sales Ledger');
    formatSheet(s5, sheet5Cols, sheet5Rows);

    // ─── Sheet 6: Batch Traceability (Vendor -> RM Lot -> MFG -> FG -> SKU -> Invoice -> Customer)
    const sheet6Cols = [
      { header: 'Audit Correlation ID', key: 'auditCorrelationId' },
      { header: 'Vendor Name', key: 'vendorName' },
      { header: 'Supplier Batch Number', key: 'supplierBatch' },
      { header: 'Raw Material ID', key: 'rmId' },
      { header: 'Raw Material', key: 'rmName' },
      { header: 'Raw Material Batch ID', key: 'rmBatchId' },
      { header: 'Manufacturing Batch ID', key: 'mfgBatchId' },
      { header: 'Recipe ID', key: 'recipeId' },
      { header: 'Recipe Version', key: 'recipeVersion' },
      { header: 'Recipe Name', key: 'recipeName' },
      { header: 'Finished Goods Batch ID', key: 'fgBatchId' },
      { header: 'Product ID', key: 'productId' },
      { header: 'Product Name', key: 'productName' },
      { header: 'Packaging Variant / SKU', key: 'variant' },
      { header: 'Sales Invoice ID', key: 'invoiceId' },
      { header: 'Customer', key: 'customer' },
      { header: 'Quantity Consumed', key: 'qtyConsumed' },
      { header: 'Quantity Produced', key: 'qtyProduced' },
      { header: 'Quantity Sold', key: 'qtySold' },
      { header: 'Remaining Quantity', key: 'remainingQty' }
    ];
    const sheet6Rows = [];
    batches.forEach(b => {
      const bAudit = auditRows.filter(a => a.manufacturingBatchId === b.id || a.manufacturingBatchId === b.mfgId);
      const prd = (productData.products || []).find(p => p.id === b.productId || p.name === b.productName);
      const varStr = (prd && prd.variants && prd.variants.length > 0) ? prd.variants.map(v => `${v.name || v.bottleSize} (${v.stock||0} pcs)`).join(', ') : 'Standard Unit';

      const relatedInvoices = invoices.filter(inv =>
        (inv.items || []).some(item =>
          (item.productId && item.productId === b.productId) ||
          (item.name && item.name.includes(b.productName))
        )
      );

      const invStr = relatedInvoices.length > 0 ? relatedInvoices.map(i => i.invoiceNumber).join(', ') : 'None';
      const custStr = relatedInvoices.length > 0 ? relatedInvoices.map(i => i.customerName || (i.customer && i.customer.name)).filter(Boolean).join(', ') : 'N/A';
      const soldQty = relatedInvoices.reduce((sum, inv) => {
        return sum + (inv.items || []).filter(item => (item.productId === b.productId || (item.name && item.name.includes(b.productName)))).reduce((s, it) => s + (it.quantity || 0), 0);
      }, 0);

      if (bAudit.length > 0) {
        bAudit.forEach(a => {
          // Look up vendor in raw_material_batches
          const matchingRmb = (rmbData.raw_material_batches || []).find(bat => bat.id === a.rawMaterialBatchId || bat.batchId === a.rawMaterialBatchId);

          sheet6Rows.push({
            auditCorrelationId: a.auditCorrelationId || a.auditId || 'N/A',
            vendorName: (matchingRmb && matchingRmb.vendorName) || 'N/A',
            supplierBatch: (matchingRmb && matchingRmb.supplierBatchNumber) || 'N/A',
            rmId: a.rawMaterialId,
            rmName: a.rawMaterialName,
            rmBatchId: a.rawMaterialBatchId || 'RMB-LOT1',
            mfgBatchId: b.batchNumber || b.id,
            recipeId: b.recipeId || a.recipeId || '',
            recipeVersion: b.recipeVersion ? `v${b.recipeVersion}` : (a.recipeVersion ? `v${a.recipeVersion}` : 'v1'),
            recipeName: b.recipeName || a.recipeName || '',
            fgBatchId: b.finishedGoodsBatchId || a.finishedGoodsBatchId || 'N/A',
            productId: b.productId || a.productId || '',
            productName: b.productName || a.productName || '',
            variant: varStr,
            invoiceId: invStr,
            customer: custStr,
            qtyConsumed: a.rawMaterialQuantityConsumed || 0,
            qtyProduced: b.quantityProduced || 0,
            qtySold: soldQty,
            remainingQty: Math.max(0, (b.quantityProduced || 0) - soldQty)
          });
        });
      } else {
        sheet6Rows.push({
          auditCorrelationId: 'AUD-AUTO',
          vendorName: 'N/A',
          supplierBatch: 'N/A',
          rmId: 'N/A',
          rmName: 'Direct Formula',
          rmBatchId: 'RMB-DEFAULT',
          mfgBatchId: b.batchNumber || b.id,
          recipeId: b.recipeId || '',
          recipeVersion: b.recipeVersion ? `v${b.recipeVersion}` : 'v1',
          recipeName: b.recipeName || '',
          fgBatchId: b.finishedGoodsBatchId || 'N/A',
          productId: b.productId || '',
          productName: b.productName || '',
          variant: varStr,
          invoiceId: invStr,
          customer: custStr,
          qtyConsumed: 0,
          qtyProduced: b.quantityProduced || 0,
          qtySold: soldQty,
          remainingQty: Math.max(0, (b.quantityProduced || 0) - soldQty)
        });
      }
    });
    const s6 = workbook.addWorksheet('Batch Traceability');
    formatSheet(s6, sheet6Cols, sheet6Rows);

    // ─── Sheet 7: Deletions & Audit Memory ────────────────────────────────────
    const deletionRows = auditRows.filter(a => a.eventType === 'DATA_DELETION' || a.category === 'DELETIONS');
    const sheet7Cols = [
      { header: 'Date', key: 'date' },
      { header: 'Time', key: 'time' },
      { header: 'Audit Correlation ID', key: 'auditCorrelationId' },
      { header: 'Entity Type', key: 'entityType' },
      { header: 'Entity ID', key: 'entityId' },
      { header: 'Item / Record Name', key: 'itemName' },
      { header: 'Deletion Reason', key: 'deletionReason' },
      { header: 'Deducted Qty', key: 'deductedQty' },
      { header: 'Deducted Valuation (₹)', key: 'deductedVal' },
      { header: 'Operator', key: 'operatorName' },
      { header: 'Full Audit Notes', key: 'notes' }
    ];
    const sheet7Rows = deletionRows.map(d => ({
      date: d.date || (d.timestamp ? d.timestamp.split('T')[0] : ''),
      time: d.time || (d.timestamp ? d.timestamp.split('T')[1].split('.')[0] : ''),
      auditCorrelationId: d.auditCorrelationId || d.auditId || '-',
      entityType: (d.entityType || 'Record').toUpperCase(),
      entityId: d.entityId || '-',
      itemName: d.itemName || d.entityName || '-',
      deletionReason: d.deletionReason || '-',
      deductedQty: d.deductedQty ? `${d.deductedQty} ${d.unit || ''}` : '-',
      deductedVal: d.deductedVal ? parseFloat(d.deductedVal.toFixed(2)) : 0,
      operatorName: d.operatorName || 'User',
      notes: d.notes || ''
    }));
    const s7 = workbook.addWorksheet('Deletions & Audit Memory');
    formatSheet(s7, sheet7Cols, sheet7Rows);

    const nowD = new Date();
    const dateStamp = nowD.toISOString().split('T')[0];
    const timeStamp = String(nowD.getHours()).padStart(2, '0') + '-' + String(nowD.getMinutes()).padStart(2, '0');
    const fileName = `invoicewise_audit_ledger_${dateStamp}_${timeStamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ error: 'Excel generation failed: ' + err.message });
  }
};

app.get('/api/audit-ledger/export', handleAuditLedgerExport);
app.get('/api/manufacturing-audit-ledger/export', handleAuditLedgerExport);

// ─── FINISHED GOODS & TRANSACTIONS ───────────────────────────────────────────
app.get('/api/finished-goods', (req, res) => {
  const d = readJSON(FINISHED_GOODS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.delete('/api/finished-goods/:id', (req, res) => {
  const d = readJSON(FINISHED_GOODS_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const idx = d.finished_goods.findIndex(fg => fg.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Finished good item not found' });
  const fg = d.finished_goods[idx];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  const fgQty    = fg.currentStock || fg.quantity || 0;
  const fgUnit   = fg.unit || 'pcs';
  const fgSize   = fg.bottleSize || 1;
  const fgBUnit  = fg.bottleSizeUnit || 'kg';
  const totalBulk = fgQty * fgSize;

  d.finished_goods.splice(idx, 1);
  d.lastUpdated = new Date().toISOString();
  writeJSONAtomic(FINISHED_GOODS_FILE, d);

  // ── Sync product.bulkStock to 0 (or recalculate) when FG is removed ──
  try {
    const prdData = readJSON(PRODUCTS_FILE) || { products: [] };
    const recData = readJSON(RECIPES_FILE) || { recipes: [] };
    const linkedRec = (recData.recipes || []).find(r => r.id === fg.recipeId || (fg.name && r.name.toLowerCase() === fg.name.toLowerCase()));
    const linkedProduct = (prdData.products || []).find(p =>
      (fg.productId && p.id === fg.productId) ||
      (fg.recipeId && p.recipeId && p.recipeId === fg.recipeId) ||
      (linkedRec && p.recipeId && p.recipeId === linkedRec.id) ||
      (p.name && fg.name && p.name.toLowerCase() === fg.name.toLowerCase()) ||
      (linkedRec && p.name && linkedRec.name && p.name.toLowerCase() === linkedRec.name.toLowerCase())
    );
    if (linkedProduct) {
      linkedProduct.bulkStock = 0;
      linkedProduct.updatedAt = new Date().toISOString();
      prdChanged = true;
    }
    if (prdChanged) { prdData.lastUpdated = new Date().toISOString(); writeJSONAtomic(PRODUCTS_FILE, prdData); }
  } catch (_) {}

  logDeletionAudit({
    entityType: 'finished_good',
    entityId: fg.id,
    entityName: fg.productName || fg.name || fg.id,
    itemName: `Finished Good: ${fg.productName || fg.name || fg.id} (Stock: ${fgQty} ${fgUnit}, Total Bulk: ${totalBulk} ${fgBUnit})`,
    reason,
    deductedQty: fgQty,
    unit: fgUnit,
    details: `Batch: ${fg.finishedGoodsBatchId || '-'}, Mfg Batch: ${fg.manufacturingBatchId || '-'}, Bulk: ${totalBulk} ${fgBUnit}`,
    notes: `DELETED FINISHED GOOD: "${fg.productName || fg.name || fg.id}" (Stock: ${fgQty} ${fgUnit}). Reason: ${reason}`
  });

  res.json({ success: true });
});

app.get('/api/finished-goods-transactions', (req, res) => {
  const d = readJSON(FG_TXN_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  res.json(d);
});

app.delete('/api/manufacturing-batches/:id', (req, res) => {
  const d = readJSON(MANUFACTURING_BATCHES_FILE);
  if (!d) return res.status(500).json({ error: 'Read failed' });
  const idx = d.manufacturing_batches.findIndex(b => b.id === req.params.id || b.mfgId === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Batch not found' });
  const batch = d.manufacturing_batches[idx];
  const reason = ((req.body && req.body.reason) || req.query.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Mandatory deletion reason is required' });

  d.manufacturing_batches.splice(idx, 1);
  d.lastUpdated = new Date().toISOString();
  writeJSONAtomic(MANUFACTURING_BATCHES_FILE, d);

  // ── Orphan cleanup: clear fg.manufacturingBatchId if it references this batch ──
  try {
    const fgData = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
    let fgChanged = false;
    const batchMfgId = batch.id || batch.mfgId;
    (fgData.finished_goods || []).forEach(fg => {
      if (fg.manufacturingBatchId === batchMfgId) {
        fg.manufacturingBatchId = null;
        fgChanged = true;
      }
    });
    if (fgChanged) { fgData.lastUpdated = new Date().toISOString(); writeJSONAtomic(FINISHED_GOODS_FILE, fgData); }
  } catch (_) {}

  logDeletionAudit({
    entityType: 'manufacturing_batch',
    entityId: batch.id || batch.mfgId,
    entityName: batch.mfgId || batch.id || batch.recipeName,
    itemName: `Mfg Batch: ${batch.mfgId || batch.id} (${batch.recipeName || 'Recipe'})`,
    reason,
    deductedQty: batch.outputQuantity || batch.manufacturedQuantity || batch.quantityProduced || 0,
    unit: batch.outputUnit || batch.desiredProductionUnit || 'pcs',
    details: `Recipe: ${batch.recipeName || '-'}, Product: ${batch.productName || '-'}`,
    notes: `DELETED MFG BATCH: "${batch.mfgId || batch.id}" (${batch.recipeName || 'Recipe'}). Reason: ${reason}`
  });

  res.json({ success: true });
});

// ─── CONTEXT & STATS ─────────────────────────────────────────────────────────
app.get('/api/context', (req, res) => {
  const settings   = readJSON(SETTINGS_FILE) || {};
  const prodData   = readJSON(PRODUCTS_FILE) || { products: [] };
  const cusData    = readJSON(CUSTOMERS_FILE) || { customers: [] };
  const invData    = readJSON(INVOICES_FILE) || { invoices: [] };
  const rmData     = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
  const fgData     = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
  const recipeData = readJSON(RECIPES_FILE) || { recipes: [] };
  const batchData  = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };

  const rawMaterials = (rmData.raw_materials || []).map(r => ({
    id: r.id, name: r.name, unit: r.unit,
    stock: r.current_stock, minimumStock: r.reorder_point,
    purchaseCost: r.cost_per_unit, lowStock: r.current_stock <= r.reorder_point
  }));

  const recipes = (recipeData.recipes || []).map(r => ({
    id: r.id, name: r.name, bottleSize: `${r.bottleSize} ${r.bottleSizeUnit}`,
    ingredientsCount: (r.ingredients || []).length
  }));

  const finishedGoods = (fgData.finished_goods || []).map(f => ({
    id: f.id, name: f.name, currentStock: f.currentStock, unit: f.unit
  }));

  res.json({
    company: {
      name: settings.businessName || '', gstin: settings.businessGSTIN || '',
      state: settings.businessState || ''
    },
    products: prodData.products || [],
    customers: cusData.customers || [],
    recentInvoices: (invData.invoices || []).slice(-10),
    inventory: {
      rawMaterials,
      recipes,
      finishedGoods,
      totalBatches: (batchData.manufacturing_batches || []).length,
      pendingShortagesCount: rawMaterials.filter(r => r.lowStock).length
    }
  });
});

app.get('/api/stats', (req, res) => {
  const prodData   = readJSON(PRODUCTS_FILE) || { products: [] };
  const cusData    = readJSON(CUSTOMERS_FILE) || { customers: [] };
  const invData    = readJSON(INVOICES_FILE) || { invoices: [] };
  const rmData     = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
  const fgData     = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
  const batchData  = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };

  const products     = prodData.products || [];
  const customers    = cusData.customers || [];
  const invoices     = invData.invoices || [];
  const rawMaterials = rmData.raw_materials || [];
  const finishedGoods = fgData.finished_goods || [];
  const batches      = batchData.manufacturing_batches || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStr = todayStr.substring(0, 7);

  const todayBatches = batches.filter(b => b.date === todayStr);
  const monthBatches = batches.filter(b => b.date && b.date.startsWith(monthStr));

  const totalRevenue   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.grandTotal || 0), 0);
  const outstandingAmt = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + (i.grandTotal || 0), 0);

  const rawMaterialValue = rawMaterials.reduce((s, r) => {
    const stock = r.current_stock !== undefined ? r.current_stock : (r.stock || 0);
    const cost  = r.cost_per_unit !== undefined ? r.cost_per_unit : (r.purchaseCost || 0);
    return s + (stock * cost);
  }, 0);
  const lowStockCount    = rawMaterials.filter(r => (r.current_stock || 0) <= (r.reorder_point || 0)).length;
  const totalFinishedStock = finishedGoods.reduce((s, f) => s + (f.currentStock || 0), 0);

  res.json({
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'active').length,
    totalCustomers: customers.length,
    totalInvoices: invoices.length,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    outstandingAmt: parseFloat(outstandingAmt.toFixed(2)),
    recentInvoices: invoices.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    // 8 Extended Dashboard Manufacturing & Inventory Widgets
    rawMaterialsInStock: rawMaterials.length,
    lowStockMaterials: lowStockCount,
    todayProductionBatches: todayBatches.length,
    todayProductionUnits: todayBatches.reduce((s, b) => s + (b.quantityProduced || 0), 0),
    thisMonthProductionBatches: monthBatches.length,
    thisMonthProductionUnits: monthBatches.reduce((s, b) => s + (b.quantityProduced || 0), 0),
    finishedGoodsStock: totalFinishedStock,
    totalBatches: batches.length,
    recentManufacturing: [...batches].sort((a,b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)).slice(0, 5),
    pendingShortagesCount: lowStockCount,
    inventoryValue: parseFloat(rawMaterialValue.toFixed(2))
  });
});

// ─── AI (OpenRouter) ─────────────────────────────────────────────────────────
app.post('/api/ai/invoke', async (req, res) => {
  try {
    const fetch    = require('node-fetch');
    const settings = readJSON(SETTINGS_FILE);
    const { mode, payload } = req.body;

    if (!settings || !settings.apiKey) return res.status(400).json({ error: 'No API key configured. Go to Settings.' });

    const prodData   = readJSON(PRODUCTS_FILE) || { products: [] };
    const rmData     = readJSON(RAW_MATERIALS_FILE) || { raw_materials: [] };
    const recipeData = readJSON(RECIPES_FILE) || { recipes: [] };
    const fgData     = readJSON(FINISHED_GOODS_FILE) || { finished_goods: [] };
    const batchData  = readJSON(MANUFACTURING_BATCHES_FILE) || { manufacturing_batches: [] };

    const contextBlock = [
      '=== YOUR BUSINESS & INVENTORY DATA ===',
      `Company: ${settings.businessName || 'InvoiceWise Enterprise'}`,
      `Raw Materials (${(rmData.raw_materials||[]).length}):`,
      ...(rmData.raw_materials||[]).slice(0,20).map(r => `  • ${r.name} | Stock:${r.current_stock} ${r.unit} | Min:${r.reorder_point} | Cost:₹${r.cost_per_unit}`),
      `Recipes (${(recipeData.recipes||[]).length}):`,
      ...(recipeData.recipes||[]).slice(0,10).map(r => `  • ${r.name} | Bottle:${r.bottleSize}${r.bottleSizeUnit} | Ingredients:${(r.ingredients||[]).length}`),
      `Finished Goods (${(fgData.finished_goods||[]).length}):`,
      ...(fgData.finished_goods||[]).slice(0,10).map(f => `  • ${f.name} | Stock:${f.currentStock} ${f.unit}`),
      `Batches Total: ${(batchData.manufacturing_batches||[]).length}`,
      '=== END DATA ==='
    ].join('\n');

    const PROMPTS = require('./prompts');
    const modePrompt = PROMPTS.MODE_PROMPTS[mode] || PROMPTS.MODE_PROMPTS.general_chat;
    const systemPrompt = `${PROMPTS.BASE_PROMPT}\n\n${contextBlock}\n\n${modePrompt}\n\nRespond strictly in natural conversational English. Never output raw JSON or code blocks.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.modelName || 'google/gemma-4-26b-a4b-it:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: typeof payload === 'string' ? payload : JSON.stringify(payload) }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: (data.error && data.error.message) || 'OpenRouter error' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTES API ─────────────────────────────────────────────────────────────
app.get('/api/notes', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
    res.json({ notes: data.notes || '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read notes' });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const { notes } = req.body;
    fs.writeFileSync(NOTES_FILE, JSON.stringify({ notes }, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ─── Fallback SPA ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let serverInstance = null;

function startServer(preferredPort = PORT) {
  return new Promise((resolve, reject) => {
    let currentPort = preferredPort;

    function tryListen() {
      const srv = app.listen(currentPort, () => {
        PORT = currentPort;
        process.env.PORT = String(currentPort);
        serverInstance = srv;
        console.log(`\n🚀 InvoiceWise running at http://localhost:${currentPort}`);
        console.log(`📁 Data stored at: ${DATA_DIR}`);
        resolve({ server: srv, port: currentPort });
      });

      srv.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ Port ${currentPort} is already in use. Retrying on port ${currentPort + 1}...`);
          currentPort++;
          setTimeout(tryListen, 50);
        } else {
          console.error('Server error:', err);
          reject(err);
        }
      });
    }

    tryListen();
  });
}

const serverPromise = startServer(PORT);

module.exports = {
  app,
  startServer,
  getServerPromise: () => serverPromise,
  getPort: () => PORT
};
