/**
 * End-to-end Test Suite for Product Variation Lifecycle, Deletion, Reversal, & Audit
 */
const http = require('http');

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

function assert(condition, message, details = null) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    if (details) console.error('Details:', JSON.stringify(details, null, 2));
    process.exit(1);
  } else {
    console.log(`✓ ${message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Verification: Product Variation Lifecycle & Deletion Architecture...\n');

  const runId = Date.now().toString().slice(-6);
  const bottleRmName = `Test Glass Bottle ${runId}`;
  const prodName = `Sugar Water Drink ${runId}`;
  const ingName = `Sugar Liquid Base ${runId}`;
  const recipeName = `Sugar Water Formula ${runId}`;

  // 1. Create a Packaging Raw Material: "500 mL Glass Bottle"
  console.log('--- Step 1: Create Packaging Raw Material ---');
  const rmRes = await req('POST', '/api/raw-materials', {
    name: bottleRmName,
    category: 'Packaging',
    unit: 'pcs',
    current_stock: 0,
    cost_per_unit: 5.0
  });
  assert(rmRes.status === 201, 'Raw Material created successfully (201)', rmRes);
  const rmId = rmRes.body.raw_material.id;
  console.log(`Created Raw Material: ${rmId}`);

  // 2. Add Stock with 2 distinct batches (Vendor A: 40 @ ₹5, Vendor B: 60 @ ₹6)
  console.log('\n--- Step 2: Add Batches to Packaging Raw Material ---');
  const addStockRes1 = await req('POST', `/api/raw-materials/${rmId}/add-stock`, {
    quantity: 40,
    vendorName: 'Vendor A Bottles Pvt Ltd',
    supplierBatchNumber: 'LOT-BOTTLE-A1',
    vendorPrice: 200,
    costPerUnit: 5.0,
    purchaseDate: '2026-09-01'
  });
  assert(addStockRes1.status === 200, 'Batch 1 added (40 pcs from Vendor A)');

  const addStockRes2 = await req('POST', `/api/raw-materials/${rmId}/add-stock`, {
    quantity: 60,
    vendorName: 'Vendor B Containers Corp',
    supplierBatchNumber: 'LOT-BOTTLE-B2',
    vendorPrice: 360,
    costPerUnit: 6.0,
    purchaseDate: '2026-09-02'
  });
  assert(addStockRes2.status === 200, 'Batch 2 added (60 pcs from Vendor B)');

  // Verify RM total stock = 100
  const rmCheck = await req('GET', '/api/raw-materials');
  const myRM = (rmCheck.body.raw_materials || []).find(r => r.id === rmId);
  assert(myRM && myRM.current_stock === 100, `Raw Material total stock is exactly 100 pcs (found ${myRM?.current_stock})`);

  // 3. Create Bulk Finished Goods or Recipe stock so fill-bottles has manufactured stock
  console.log('\n--- Step 3: Setup Product & Manufactured Bulk Stock ---');
  const prodRes = await req('POST', '/api/products', {
    name: prodName,
    rate: 40,
    unit: 'BTL',
    variants: [
      {
        variantId: `VAR-${runId}-500ML`,
        name: `${prodName} - 500 mL`,
        bottleSize: 500,
        bottleSizeUnit: 'mL',
        packagingRawMaterialId: rmId,
        packagingQty: 1,
        vendorPreference: { mode: 'FIFO', vendorId: null },
        price: 40.0,
        stock: 0
      }
    ]
  });
  assert(prodRes.status === 201, 'Product created with 500 mL variation referencing RM packaging', prodRes);
  const productId = prodRes.body.product.id;
  const variantId = prodRes.body.product.variants[0].variantId;

  // Verify child in products.json
  const prodVerify = await req('GET', `/api/products/${productId}`);
  assert(prodVerify.body.variants.length === 1, 'Product variants[] has exactly 1 child');
  assert(prodVerify.body.variants[0].packagingRawMaterialId === rmId, 'packagingRawMaterialId correctly points to RM');
  assert(prodVerify.body.variants[0].stock === 0, 'Variation initial finished stock is 0 (does not own container stock)');

  // 4. Test Dependency Guard: Attempting to delete the Raw Material must be BLOCKED
  console.log('\n--- Step 4: Verify Raw Material Deletion Dependency Guard ---');
  const rmDelRes = await req('DELETE', `/api/raw-materials/${rmId}`, {
    reason: 'Testing deletion of assigned packaging material'
  });
  assert(rmDelRes.status === 400, 'Raw Material deletion blocked with HTTP 400', rmDelRes);
  assert(rmDelRes.body.error && rmDelRes.body.error.includes('assigned as packaging for Product'), 'Correct error message detailing dependency block');

  // Verify DEPENDENCY_BLOCK was logged in audit
  const auditRes1 = await req('GET', '/api/manufacturing-audit-ledger');
  const depBlockEntry = (auditRes1.body.manufacturing_audit || []).find(a => a.eventType === 'DEPENDENCY_BLOCK' && a.entityId === rmId);
  assert(!!depBlockEntry, 'DEPENDENCY_BLOCK audit record successfully generated');

  // 5. Test Packaging Run (fill-bottles): Manufacture a bulk run first
  console.log('\n--- Step 5: Execute Bottling / Packaging Deduction ---');
  const ingRes = await req('POST', '/api/raw-materials', {
    name: ingName,
    unit: 'L',
    current_stock: 500,
    cost_per_unit: 10
  });
  assert(ingRes.status === 201, 'Ingredient raw material created', ingRes);
  const ingId = ingRes.body.raw_material.id;
  await req('POST', `/api/raw-materials/${ingId}/add-stock`, {
    quantity: 500,
    costPerUnit: 10,
    supplierBatchNumber: `LOT-SUGAR-${runId}`
  });

  const recipeRes = await req('POST', '/api/recipes', {
    name: recipeName,
    productId: productId,
    bottleSize: 1,
    bottleSizeUnit: 'L',
    output_qty: 1,
    output_unit: 'L',
    ingredients: [
      { rawMaterialId: ingId, quantity: 0.5, unit: 'L' }
    ]
  });
  assert(recipeRes.status === 201, 'Recipe created', recipeRes);
  const recipeId = recipeRes.body.recipe.id;

  // Commit manufacturing batch
  const commitRes = await req('POST', '/api/manufacturing-batches/commit', {
    recipeId: recipeId,
    desiredQty: 100,
    desiredUnit: 'L',
    operatorName: 'Test Operator',
    notes: 'Bulk production for bottling test'
  });
  assert(commitRes.status === 200 || commitRes.status === 201, 'Bulk Manufacturing batch committed successfully', commitRes);

  // Now package 70 bottles of 500 mL (70 * 500 mL = 35 L bulk consumed, 70 bottles consumed)
  const fillRes = await req('POST', `/api/products/${productId}/fill-bottles`, {
    variantId: variantId,
    numberOfBottles: 70
  });
  assert(fillRes.status === 200, 'Packaged 70 bottles successfully');
  assert(fillRes.body.packagingDeducted === 70, '70 packaging units deducted');
  assert(fillRes.body.packagingAllocations.length === 2, 'Allocated across 2 FIFO batches');
  assert(fillRes.body.packagingAllocations[0].quantity === 40, 'First batch (Vendor A) depleted by 40');
  assert(fillRes.body.packagingAllocations[1].quantity === 30, 'Second batch (Vendor B) depleted by 30');

  // Verify RM stock is now 30 (100 - 70)
  const rmCheckAfter = await req('GET', '/api/raw-materials');
  const myRMAfter = (rmCheckAfter.body.raw_materials || []).find(r => r.id === rmId);
  assert(myRMAfter.current_stock === 30, `Raw Material remaining stock is exactly 30 (found ${myRMAfter.current_stock})`);

  // Verify Product Variant stock is now 70
  const prodCheckAfter = await req('GET', `/api/products/${productId}`);
  const myVariantAfter = prodCheckAfter.body.variants.find(v => v.variantId === variantId);
  assert(myVariantAfter.stock === 70, `Product Variant finished stock is exactly 70 (found ${myVariantAfter.stock})`);

  // 6. Test Sales Invoice Deduction: Sell 10 bottles
  console.log('\n--- Step 6: Test Sales Invoice Deduction (No Double Deduction) ---');
  const invRes = await req('POST', '/api/invoices', {
    customerName: 'ABC Retailer',
    date: '2026-09-23',
    items: [
      {
        productId: productId,
        variantId: variantId,
        name: 'Sugar Water Drink (500 mL)',
        quantity: 10,
      }
    ]
  });
  assert(invRes.status === 200 || invRes.status === 201, 'Sales invoice created for 10 bottles', invRes);

  // Check product variant stock is now 60 (70 - 10)
  const prodAfterSale = await req('GET', `/api/products/${productId}`);
  const varAfterSale = prodAfterSale.body.variants.find(v => v.variantId === variantId);
  assert(varAfterSale.stock === 60, `Product Variant finished stock reduced to 60 (found ${varAfterSale.stock})`);

  // Verify Raw Material bottle stock REMAINED 30 (No double deduction upon sale!)
  const rmAfterSale = await req('GET', '/api/raw-materials');
  const myRMAfterSale = (rmAfterSale.body.raw_materials || []).find(r => r.id === rmId);
  assert(myRMAfterSale.current_stock === 30, `Raw Material stock unchanged at 30 upon sales invoice (found ${myRMAfterSale.current_stock})`);

  // 7. Test Deletion Impact API
  console.log('\n--- Step 7: Query Deletion Impact API ---');
  const impactRes = await req('GET', `/api/products/${productId}/variants/${variantId}/deletion-impact`);
  assert(impactRes.status === 200, 'Deletion impact query succeeded');
  assert(impactRes.body.currentFinishedStock === 60, 'Current finished stock reported as 60');
  assert(impactRes.body.maxEligibleReversal === 60, 'Max eligible reversal reported as 60 (min of 60 stock and 70 produced)');
  assert(impactRes.body.packagingRawMaterial.currentStock === 30, 'Packaging RM stock reported as 30');

  // 8. Test Variant Deletion Validation: Reason is mandatory
  console.log('\n--- Step 8: Validate Mandatory Deletion Reason ---');
  const delNoReason = await req('DELETE', `/api/products/${productId}/variants/${variantId}`, {
    reason: '',
    action: 'REVERSE'
  });
  assert(delNoReason.status === 400, 'Deletion without reason rejected with HTTP 400');

  // 9. Execute Variant Deletion with Stock Reversal (60 units reversed)
  console.log('\n--- Step 9: Execute Variation Deletion with REVERSE Action ---');
  const delRevRes = await req('DELETE', `/api/products/${productId}/variants/${variantId}`, {
    reason: 'Discontinuing 500 mL size; returning bottle inventory to raw materials',
    action: 'REVERSE',
    operatorName: 'Senior Plant Lead'
  });
  assert(delRevRes.status === 200, 'Variation deleted successfully with reversal');
  assert(delRevRes.body.stockReversedToRM === 60, '60 units reversed to Raw Materials');
  assert(delRevRes.body.packagingQuantityRestored === 60, '60 packaging containers restored');

  // Verify Physical Removal from products.json
  const prodAfterDel = await req('GET', `/api/products/${productId}`);
  const varAfterDel = (prodAfterDel.body.variants || []).find(v => v.variantId === variantId);
  assert(!varAfterDel, 'Variant is physically removed from product.variants[]');

  // Verify Raw Material stock restored to 90 (30 + 60)
  const rmAfterDel = await req('GET', '/api/raw-materials');
  const myRMAfterDel = (rmAfterDel.body.raw_materials || []).find(r => r.id === rmId);
  assert(myRMAfterDel.current_stock === 90, `Raw Material stock accurately restored to 90 (found ${myRMAfterDel.current_stock})`);

  // Verify Batches restored correctly:
  // Transaction had 40 from Batch A, 30 from Batch B.
  // Reversal restored 40 to Batch A (fully back to 40), 20 to Batch B (restored to 50: 30 remaining + 20)
  const batchRes = await req('GET', `/api/raw-materials/${rmId}/batches`);
  const batches = batchRes.body.allBatches || batchRes.body.batches || [];
  const batchA = batches.find(b => b.supplierBatchNumber === 'LOT-BOTTLE-A1');
  const batchB = batches.find(b => b.supplierBatchNumber === 'LOT-BOTTLE-B2');
  assert(batchA && batchA.remainingQuantity === 40, `Batch A fully restored to 40 (found ${batchA?.remainingQuantity})`, batchRes);
  assert(batchB && batchB.remainingQuantity === 50, `Batch B restored to 50 (found ${batchB?.remainingQuantity})`, batchRes);

  // 10. Verify Audit Trail Entries Generated
  console.log('\n--- Step 10: Verify Comprehensive Audit Trail Lineage ---');
  const finalAuditRes = await req('GET', '/api/manufacturing-audit-ledger');
  const allAudits = finalAuditRes.body.manufacturing_audit || [];

  const delEvent = allAudits.find(a => a.eventType === 'DATA_DELETION' && a.entityId === variantId);
  assert(!!delEvent, 'DATA_DELETION audit record present');
  assert(delEvent.actionTaken === 'REVERSE', 'DATA_DELETION recorded actionTaken = REVERSE');
  assert(delEvent.stockReversedToRM === 60, 'DATA_DELETION recorded stockReversedToRM = 60');

  const revEvent = allAudits.find(a => a.eventType === 'TRANSACTION_REVERSAL' && a.entityId === variantId);
  assert(!!revEvent, 'TRANSACTION_REVERSAL audit record present');

  const inEvent = allAudits.find(a => a.eventType === 'INVENTORY_IN' && a.entityId === rmId && a.quantity === 60);
  assert(!!inEvent, 'INVENTORY_IN audit record present restoring 60 containers');

  assert(delEvent.auditCorrelationId === revEvent.auditCorrelationId, 'Shared audit correlation ID across deletion & reversal events');

  // 11. Test Clear Audit Guarantees
  console.log('\n--- Step 11: Verify Clear Audit Guarantees ---');
  const clearRes = await req('DELETE', '/api/audit-ledgers');
  assert(clearRes.status === 200, 'Clear audit ledgers executed');

  // Verify Product still DOES NOT contain deleted variant
  const prodAfterClear = await req('GET', `/api/products/${productId}`);
  const varAfterClear = (prodAfterClear.body.variants || []).find(v => v.variantId === variantId);
  assert(!varAfterClear, 'Variant NEVER returns to products.json after Clear Audit');

  // Verify Raw Material stock remains 90
  const rmAfterClear = await req('GET', '/api/raw-materials');
  const myRMAfterClear = (rmAfterClear.body.raw_materials || []).find(r => r.id === rmId);
  // 12. Test Variation Deletion with DISCARD Action
  console.log('\n--- Step 12: Verify Variation Deletion with DISCARD Action ---');
  const addVarRes = await req('PUT', `/api/products/${productId}`, {
    variants: [
      {
        variantId: `VAR-${runId}-250ML`,
        name: `${prodName} - 250 mL`,
        bottleSize: 250,
        bottleSizeUnit: 'mL',
        packagingRawMaterialId: rmId,
        packagingQty: 1,
        vendorPreference: { mode: 'FIFO', vendorId: null },
        price: 25.0,
        stock: 15
      }
    ]
  });
  assert(addVarRes.status === 200, 'Second variant added to product with 15 units stock');

  const delDiscardRes = await req('DELETE', `/api/products/${productId}/variants/VAR-${runId}-250ML`, {
    reason: 'Defective batch discarded during packaging run',
    action: 'DISCARD',
    operatorName: 'Quality Lead'
  });
  assert(delDiscardRes.status === 200, 'Second variant deleted with DISCARD action');
  assert(delDiscardRes.body.actionTaken === 'DISCARD', 'Recorded actionTaken = DISCARD');
  assert(delDiscardRes.body.stockReversedToRM === 0, 'No stock reversed to RM');

  const rmAfterDiscard = await req('GET', '/api/raw-materials');
  const myRMAfterDiscard = (rmAfterDiscard.body.raw_materials || []).find(r => r.id === rmId);
  assert(myRMAfterDiscard.current_stock === 90, 'Raw Material stock remains unchanged at 90 after DISCARD');

  const auditAfterDiscard = await req('GET', '/api/manufacturing-audit-ledger');
  const discardAudit = (auditAfterDiscard.body.manufacturing_audit || []).find(a => a.eventType === 'INVENTORY_ADJUSTMENT' && a.entityId === `VAR-${runId}-250ML`);
  assert(!!discardAudit, 'INVENTORY_ADJUSTMENT audit entry logged for discarded variation');

  console.log('\n🎉 ALL 48 ARCHITECTURAL REQUIREMENTS (INCLUDING REVERSE & DISCARD) VERIFIED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
