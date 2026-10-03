const http = require('http');

function req(method, path, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function testAllAuditSections() {
  console.log('================================================================');
  console.log('🔍 INVOICEWISE 3.0 — EXHAUSTIVE AUDIT SECTIONS VERIFICATION');
  console.log('================================================================\n');

  let passes = 0;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passes++;
    } else {
      console.log(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: RAW MATERIAL AUDIT & INWARD LEDGER
  // ─────────────────────────────────────────────────────────
  console.log('📦 [SECTION 1] Testing Raw Material Audit & Inward Ledger...');
  const rmListRes = await req('GET', '/api/raw-materials');
  const rms = rmListRes.data.raw_materials || [];
  assert(rms.length > 0, `Raw materials catalog loaded (${rms.length} items)`);

  const testRm = rms[0];
  const stockBefore = testRm.quantity !== undefined ? testRm.quantity : (testRm.current_stock || 0);

  // Inward add stock
  const addStockRes = await req('POST', `/api/raw-materials/${testRm.id}/add-stock`, {
    quantity: 15,
    vendorName: 'Audit Test Vendor Labs',
    vendorGstNumber: '27AAAPZ1234C1ZV',
    vendorPrice: 1500,
    vendorInvoiceNumber: 'INV-TEST-0099',
    purchaseDate: '2026-09-23',
    notes: 'Audit verification test inward batch'
  });
  assert(addStockRes.status === 200, 'POST /api/raw-materials/:id/add-stock returns 200');

  // Verify transaction logged in raw_material_transactions
  const rmTxnRes = await req('GET', '/api/raw-material-transactions');
  const rmTxns = rmTxnRes.data.raw_material_transactions || [];
  const latestRmTxn = rmTxns[rmTxns.length - 1];
  assert(
    latestRmTxn && latestRmTxn.rawMaterialId === testRm.id && latestRmTxn.quantity === 15 && latestRmTxn.auditCorrelationId,
    `RM Transaction created with Correlation ID: ${latestRmTxn?.auditCorrelationId}`
  );

  // Verify RMB Batch created
  const rmbRes = await req('GET', `/api/raw-materials/${testRm.id}/batches`);
  const rmbList = rmbRes.data.allBatches || rmbRes.data.activeBatches || [];
  const matchingRmb = rmbList.find(b => b.vendorName === 'Audit Test Vendor Labs' || b.supplierBatchNumber === 'INV-TEST-0099');
  assert(matchingRmb && matchingRmb.remainingQuantity === 15, `Raw Material Batch created with remaining stock 15 ${testRm.unit}`);

  // ─────────────────────────────────────────────────────────
  // SECTION 2: MANUFACTURING AUDIT & PRODUCTION COMMIT
  // ─────────────────────────────────────────────────────────
  console.log('\n⚙️ [SECTION 2] Testing Manufacturing Audit & Production Commit...');
  const recRes = await req('GET', '/api/recipes');
  const recipes = recRes.data.recipes || [];
  assert(recipes.length > 0, `Recipe loaded: ${recipes[0]?.name}`);

  const recipe = recipes[0];
  const previewRes = await req('POST', '/api/manufacturing-batches/preview', {
    recipeId: recipe.id,
    quantity: 10,
    unit: 'L'
  });
  assert(previewRes.status === 200, 'Pre-production calculation preview executed (200 OK)');
  assert(previewRes.data.breakdown && previewRes.data.breakdown.length > 0, `Calculation breakdown generated (${previewRes.data.breakdown?.length} ingredients evaluated)`);

  // ─────────────────────────────────────────────────────────
  // SECTION 3: FINISHED GOODS & PACKAGING AUDIT
  // ─────────────────────────────────────────────────────────
  console.log('\n🧴 [SECTION 3] Testing Finished Goods & Packaging Audit...');
  const fgRes = await req('GET', '/api/finished-goods');
  const fgList = fgRes.data.finished_goods || [];
  assert(fgList.length > 0, `Finished goods inventory loaded (${fgList.length} bulk items)`);

  const fgTxnRes = await req('GET', '/api/finished-goods-transactions');
  const fgTxns = fgTxnRes.data.finished_goods_transactions || [];
  assert(fgTxns.length > 0, `Finished goods transaction ledger active (${fgTxns.length} records)`);
  const fgHasCorr = fgTxns.every(t => !!t.auditCorrelationId);
  assert(fgHasCorr, 'All Finished Goods transactions have valid Audit Correlation IDs');

  // ─────────────────────────────────────────────────────────
  // SECTION 4: SALES & INVOICE AUDIT
  // ─────────────────────────────────────────────────────────
  console.log('\n💰 [SECTION 4] Testing Sales & Invoice Audit Lifecycle...');
  const invRes = await req('GET', '/api/invoices');
  const invoices = invRes.data.invoices || [];
  assert(invoices.length > 0, `Invoices ledger loaded (${invoices.length} invoices)`);

  const testInv = invoices[0];
  const testInvId = testInv.id;
  const oldStatus = testInv.status;

  // 1. Update status to SENT
  const putSentRes = await req('PUT', `/api/invoices/${testInvId}`, { status: 'sent', operatorName: 'Sales Lead QA' });
  assert(putSentRes.status === 200, `PUT /api/invoices/${testInvId} -> SENT returns 200 OK`);

  // 2. Update status to PAID
  const putPaidRes = await req('PUT', `/api/invoices/${testInvId}`, { status: 'paid', operatorName: 'Head Accountant' });
  assert(putPaidRes.status === 200, `PUT /api/invoices/${testInvId} -> PAID returns 200 OK`);

  // 3. Verify audit ledger entry generated in Finished Goods Transactions
  const fgTxnAfter = await req('GET', '/api/finished-goods-transactions');
  const latestFgTxn = (fgTxnAfter.data.finished_goods_transactions || []).pop();
  assert(
    latestFgTxn && latestFgTxn.action.includes('PAID') && latestFgTxn.referenceId === (testInv.invoiceNumber || testInvId),
    `Sales audit event logged: "${latestFgTxn?.action}" [Ref: ${latestFgTxn?.referenceId}]`
  );

  // 4. Verify unified manufacturing audit ledger reflects the event
  const mfgAuditRes = await req('GET', `/api/manufacturing-audit-ledger?search=${testInv.invoiceNumber || testInvId}`);
  const mfgAuditEntries = mfgAuditRes.data.entries || [];
  assert(
    mfgAuditEntries.length > 0,
    `Unified Audit Ledger search returned ${mfgAuditEntries.length} entries for invoice ${testInv.invoiceNumber || testInvId}`
  );

  // ─────────────────────────────────────────────────────────
  // SECTION 5: CORRELATION LINEAGE & TRACEABILITY
  // ─────────────────────────────────────────────────────────
  console.log('\n🔗 [SECTION 5] Testing Audit Lineage & 360° Traceability...');
  const mfgBatchesRes = await req('GET', '/api/manufacturing-batches');
  const mfgBatches = mfgBatchesRes.data.manufacturing_batches || [];
  if (mfgBatches.length > 0) {
    const mfgBatch = mfgBatches[0];
    const traceRes = await req('GET', `/api/manufacturing-batches/${mfgBatch.id || mfgBatch.mfgId}/traceability`);
    assert(traceRes.status === 200, `Batch Traceability endpoint /api/manufacturing-batches/:id/traceability returns 200`);
    assert(traceRes.data.batch !== undefined, 'Traceability tree contains Batch master docket');
    assert(traceRes.data.rawMaterialConsumption !== undefined, 'Traceability tree contains RM consumption lot allocation');
    assert(traceRes.data.finishedGoodsBatch !== undefined, 'Traceability tree contains Finished Goods lot lineage');
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6: UNIFIED 6-SHEET EXCEL AUDIT LEDGER EXPORT
  // ─────────────────────────────────────────────────────────
  console.log('\n📊 [SECTION 6] Testing 6-Sheet Audit Ledger Excel Engine...');
  const exportRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/audit-ledger/export', res => {
      resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
    }).on('error', reject);
  });
  assert(exportRes.status === 200, 'GET /api/audit-ledger/export returns 200 OK');
  assert(exportRes.contentType.includes('spreadsheetml'), 'Content-Type is valid application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT ASSERTIONS: ${passes + failures} | ✅ PASSED: ${passes} | ❌ FAILED: ${failures}`);
  console.log('================================================================\n');

  // Restore original status
  await req('PUT', `/api/invoices/${testInvId}`, { status: oldStatus });
}

testAllAuditSections().catch(console.error);
