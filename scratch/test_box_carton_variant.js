const http = require('http');
const assert = require('assert');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const request = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (_) {
          resolve({ status: res.statusCode, body: buf });
        }
      });
    });
    request.on('error', reject);
    if (data) request.write(data);
    request.end();
  });
}

async function run() {
  console.log('Testing Box and Carton Variant Packaging...');
  const runId = Date.now();

  // 1. Create a packaging RM for boxes
  const boxRM = await req('POST', '/api/raw-materials', {
    name: `Cardboard Master Box ${runId}`,
    category: 'Packaging',
    unit: 'box',
    current_stock: 50,
    cost_per_unit: 12
  });
  assert(boxRM.status === 201 || boxRM.status === 200, 'Box RM created');
  const boxRMId = boxRM.body.raw_material ? boxRM.body.raw_material.id : boxRM.body.id;

  // Add a batch for this box
  await req('POST', `/api/raw-materials/${boxRMId}/batches`, {
    supplierBatchNumber: 'LOT-BOX-01',
    quantity: 50,
    cost_per_unit: 12,
    vendorName: 'Apex Packaging Supplies',
    purchaseDate: '2026-09-20'
  });

  // 2. Create raw material for formulation
  const ingRes = await req('POST', '/api/raw-materials', {
    name: `Tea Powder Base ${runId}`,
    unit: 'kg',
    current_stock: 100,
    cost_per_unit: 50
  });
  const ingId = ingRes.body.raw_material.id;
  await req('POST', `/api/raw-materials/${ingId}/batches`, {
    quantity: 100,
    cost_per_unit: 50,
    supplierBatchNumber: `LOT-TEA-${runId}`
  });

  // 3. Create product with a box variant
  const pRes = await req('POST', '/api/products', {
    name: `Herbal Infusion Tea ${runId}`,
    rate: 250,
    bulkStock: 50,
    bulkStockUnit: 'kg',
    variants: [
      {
        variantId: `VAR-BOX-${runId}`,
        name: `Herbal Infusion Tea (1 box)`,
        bottleSize: 1,
        bottleSizeUnit: 'box',
        packagingRawMaterialId: boxRMId,
        packagingQty: 1,
        vendorPreference: { mode: 'FIFO', vendorId: null },
        price: 250,
        stock: 0
      }
    ]
  });
  assert(pRes.status === 201 || pRes.status === 200, 'Product created');
  const prod = pRes.body.product || pRes.body;
  const productId = prod.id;
  const variantId = prod.variants[0].variantId;

  // 4. Create recipe and commit a manufacturing batch
  const recRes = await req('POST', '/api/recipes', {
    name: `Herbal Tea Formula ${runId}`,
    productId: productId,
    bottleSize: 1,
    bottleSizeUnit: 'kg',
    output_qty: 1,
    output_unit: 'kg',
    ingredients: [
      { rawMaterialId: ingId, quantity: 1, unit: 'kg' }
    ]
  });
  const recipeId = recRes.body.recipe.id;

  // Link recipe to product
  await req('PUT', `/api/products/${productId}`, {
    ...prod,
    recipeId: recipeId
  });

  // Commit manufacturing batch of 50 kg
  const commitRes = await req('POST', '/api/manufacturing-batches/commit', {
    recipeId: recipeId,
    desiredQty: 50,
    desiredUnit: 'kg',
    operatorName: 'Test Operator',
    batchNotes: 'Production run for tea boxes'
  });
  assert(commitRes.status === 201, 'Batch committed');

  // 5. Package 10 boxes (variant unit: 'box', FG unit: 'kg')
  const fillRes = await req('POST', `/api/products/${productId}/fill-bottles`, {
    variantId: variantId,
    numberOfBottles: 10
  });

  assert(fillRes.status === 200, `Fill boxes succeeded: ${JSON.stringify(fillRes.body)}`);
  assert(fillRes.body.variant.stock === 10, 'Variant stock is 10 boxes');
  console.log('✓ Successfully packaged 10 boxes without unit dimension mismatch!');

  // Check packaging RM remaining stock (was 50, deducted 10 -> 40)
  const rmCheck = await req('GET', '/api/raw-materials');
  const foundRM = rmCheck.body.raw_materials.find(r => r.id === boxRMId);
  assert(foundRM.current_stock === 40, `RM stock is 40 boxes (found ${foundRM.current_stock})`);
  console.log('✓ Packaging RM stock correctly reduced by 10 boxes!');

  console.log('🎉 Box and Carton variant packaging verified successfully!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
