const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Deep Multi-Vendor Recipe Deduction Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Fetch raw materials and batches before
  console.log('--- Step 1: Pre-Condition Check ---');
  const rmRes = await request('GET', '/api/raw-materials');
  const rm15 = rmRes.body.raw_materials.find(r => r.id === 'RM-000015');
  assert(!!rm15, 'Raw Material RM-000015 exists');
  const initialStock = rm15.current_stock !== undefined ? rm15.current_stock : rm15.stock;
  console.log(`  Initial RM-000015 stock: ${initialStock} ${rm15.unit}`);

  const rmbRes = await request('GET', '/api/raw-material-batches');
  const batches15 = rmbRes.body.raw_material_batches.filter(b => b.rawMaterialId === 'RM-000015' && b.status === 'ACTIVE');
  console.log(`  Active batches for RM-000015: ${batches15.length}`);
  
  const batchVendorA = batches15.find(b => b.vendorName === 'A');
  const batchVendorB = batches15.find(b => b.vendorName === 'B');
  assert(!!batchVendorA, `Vendor A batch exists (${batchVendorA ? batchVendorA.id : 'N/A'}, remaining: ${batchVendorA ? batchVendorA.remainingQuantity : 'N/A'})`);
  assert(!!batchVendorB, `Vendor B batch exists (${batchVendorB ? batchVendorB.id : 'N/A'}, remaining: ${batchVendorB ? batchVendorB.remainingQuantity : 'N/A'})`);

  const initialVendorAQty = batchVendorA.remainingQuantity;
  const initialVendorBQty = batchVendorB.remainingQuantity;

  // 2. Fetch recipe RCP-000004
  console.log('\n--- Step 2: Recipe Inspection ---');
  const rcpRes = await request('GET', '/api/recipes');
  const recipe = rcpRes.body.recipes.find(r => r.id === 'RCP-000004');
  assert(!!recipe, 'Recipe RCP-000004 ("aa mash") exists');
  assert(recipe.ingredients.length === 2, `Recipe has 2 ingredients (found ${recipe.ingredients.length})`);
  assert(recipe.ingredients[0].raw_material_id === 'RM-000015' && recipe.ingredients[0].vendorPreference === 'A' && recipe.ingredients[0].qty === 1,
    'Ingredient 1 is RM-000015, vendor A, qty 1');
  assert(recipe.ingredients[1].raw_material_id === 'RM-000015' && recipe.ingredients[1].vendorPreference === 'B' && recipe.ingredients[1].qty === 2,
    'Ingredient 2 is RM-000015, vendor B, qty 2');

  // 3. Test Preview endpoint
  console.log('\n--- Step 3: Pre-Production Preview Validation ---');
  const prevRes = await request('POST', '/api/manufacturing-batches/preview', {
    recipe_id: 'RCP-000004',
    desiredQty: 1,
    desiredUnit: 'pcs'
  });
  assert(prevRes.status === 200, `Preview HTTP status 200 (got ${prevRes.status})`);
  assert(prevRes.body.canProduce === true, `Preview canProduce is true (got ${prevRes.body.canProduce})`);
  assert(prevRes.body.breakdown.length === 2, `Preview breakdown has 2 entries`);
  assert(prevRes.body.breakdown[0].vendorPreference === 'A', 'Preview breakdown row 0 has vendorPreference "A"');
  assert(prevRes.body.breakdown[1].vendorPreference === 'B', 'Preview breakdown row 1 has vendorPreference "B"');
  assert(prevRes.body.breakdown[0].sufficient === true, 'Preview breakdown row 0 is sufficient');
  assert(prevRes.body.breakdown[1].sufficient === true, 'Preview breakdown row 1 is sufficient');

  // 4. Test Commit endpoint
  console.log('\n--- Step 4: Atomic Commit Execution ---');
  const commitRes = await request('POST', '/api/manufacturing-batches/commit', {
    recipe_id: 'RCP-000004',
    desiredQty: 1,
    desiredUnit: 'pcs',
    operatorName: 'Multi-Vendor QA Auditor',
    notes: 'Testing concurrent vendor deduction for RM-000015'
  });
  assert(commitRes.status === 200 || commitRes.status === 201, `Commit HTTP status is 200/201 OK (NOT 422! Got ${commitRes.status})`);
  assert(!!commitRes.body.batch, 'Commit returned created batch');
  const mfgId = commitRes.body.batch ? (commitRes.body.batch.mfgId || commitRes.body.batch.id) : null;
  console.log(`  Created batch ID: ${mfgId}`);

  // 5. Verify Post-Conditions: Both Vendor A and Vendor B batches were deducted
  console.log('\n--- Step 5: Post-Commit Stock & Batch Deduction Verification ---');
  const postRmbRes = await request('GET', '/api/raw-material-batches');
  const postBatchA = postRmbRes.body.raw_material_batches.find(b => b.id === batchVendorA.id);
  const postBatchB = postRmbRes.body.raw_material_batches.find(b => b.id === batchVendorB.id);

  assert(postBatchA.remainingQuantity === initialVendorAQty - 1,
    `Vendor A batch (${postBatchA.id}) deducted by exactly 1 kg (was ${initialVendorAQty}, now ${postBatchA.remainingQuantity})`);
  assert(postBatchB.remainingQuantity === initialVendorBQty - 2,
    `Vendor B batch (${postBatchB.id}) deducted by exactly 2 kg (was ${initialVendorBQty}, now ${postBatchB.remainingQuantity})`);

  // Verify parent raw material stock
  const postRmRes = await request('GET', '/api/raw-materials');
  const postRm15 = postRmRes.body.raw_materials.find(r => r.id === 'RM-000015');
  const postStock = postRm15.current_stock !== undefined ? postRm15.current_stock : postRm15.stock;
  assert(postStock === initialStock - 3,
    `Parent RM-000015 stock decreased by exactly 3 kg (was ${initialStock}, now ${postStock})`);

  // Verify active batch sum invariant
  const activeBatchesRM15 = postRmbRes.body.raw_material_batches.filter(b => b.rawMaterialId === 'RM-000015' && b.status === 'ACTIVE');
  const activeSum = activeBatchesRM15.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
  assert(Math.abs(activeSum - postStock) < 0.0001,
    `Inventory Invariant strictly preserved: Parent Stock (${postStock}) === SUM(Active Batches) (${activeSum})`);

  // 6. Verify Raw Material Transactions & Audit Ledger
  console.log('\n--- Step 6: Transaction and Audit Ledger Verification ---');
  const txnRes = await request('GET', '/api/raw-material-transactions');
  const recentTxns = (txnRes.body.raw_material_transactions || [])
    .filter(t => t.rawMaterialId === 'RM-000015' && (t.referenceId === mfgId || t.manufacturingBatchId === mfgId));
  
  assert(recentTxns.length === 2, `Recorded exactly 2 raw material transactions for the 2 vendor ingredients (found ${recentTxns.length})`);
  const txnA = recentTxns.find(t => t.vendorName === 'A' || (t.notes && t.notes.includes('from ' + batchVendorA.id)));
  const txnB = recentTxns.find(t => t.vendorName === 'B' || (t.notes && t.notes.includes('from ' + batchVendorB.id)));
  assert(!!txnA && txnA.quantity === 1, `Transaction for Vendor A correctly logged deduction of 1 kg`);
  assert(!!txnB && txnB.quantity === 2, `Transaction for Vendor B correctly logged deduction of 2 kg`);

  const auditRes = await request('GET', '/api/manufacturing-audit-ledger');
  const recentAudits = (auditRes.body.manufacturing_audit || [])
    .filter(a => a.manufacturingBatchId === mfgId);
  assert(recentAudits.length === 2, `Recorded 2 manufacturing audit entries for the two ingredients (found ${recentAudits.length})`);

  // 7. Edge Case: Multi-ingredient sequential shortage detection
  console.log('\n--- Step 7: Edge Case - Sequential Multi-Ingredient Shortage Detection ---');
  // Attempt to produce 10 units (requires 10kg from Vendor A, but Vendor A now has only postBatchA.remainingQuantity kg)
  const previewShortage = await request('POST', '/api/manufacturing-batches/preview', {
    recipe_id: 'RCP-000004',
    desiredQty: 10,
    desiredUnit: 'pcs'
  });
  assert(previewShortage.body.canProduce === false, 'Preview correctly detects shortage for large batch size');
  assert(previewShortage.body.shortages.length > 0, `Shortage reported: ${previewShortage.body.shortages[0]?.errorReason}`);

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
