// scratch/test_no_variant_invoice_block.js
// Automated test verifying that products without variants CANNOT be invoiced.

const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('=== TEST: BLOCK INVOICES FOR PRODUCTS WITHOUT VARIANTS ===\n');

  // 1. Create a product WITHOUT variants
  const testPrd = {
    name: 'Unpackaged Bulk Powder ' + Date.now(),
    hsn_sac: '3004',
    category: 'Pharmaceuticals',
    rate: 150,
    bulkStock: 5000,
    bulkStockUnit: 'g',
    variants: [] // NO VARIANTS
  };

  const createPrdRes = await request('POST', '/api/products', testPrd);
  const createdProduct = createPrdRes.data.product || createPrdRes.data;
  const productId = createdProduct.id;
  console.log('1. Created product without variants:', createPrdRes.status, productId);

  // 2. Attempt to create an invoice with this product
  const invoicePayload = {
    customerName: 'Test Pharma Client',
    customer: { name: 'Test Pharma Client' },
    supplyType: 'intra',
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        productId: productId,
        name: testPrd.name,
        qty: 5,
        rate: 150,
        gst_rate: 18
      }
    ],
    subtotal: 750,
    totalTax: 135,
    grandTotal: 885,
    status: 'paid'
  };

  const invAttemptRes = await request('POST', '/api/invoices', invoicePayload);
  console.log('2. Invoicing product without variants result:', invAttemptRes.status, invAttemptRes.data);

  if (invAttemptRes.status === 400 && invAttemptRes.data.error && invAttemptRes.data.error.includes('no container / packaging variants')) {
    console.log('✅ PASS: Server properly rejected invoice creation for product without variants with HTTP 400!');
  } else {
    console.error('❌ FAIL: Server did not reject invoice properly!', invAttemptRes);
    process.exit(1);
  }

  // 3. Now add a container variant to the product
  const updatePayload = {
    ...createdProduct,
    variants: [
      {
        variantId: 'VAR-JAR-250',
        name: 'Packaged Jar - 250 g',
        bottleSize: 250,
        bottleSizeUnit: 'g',
        packagingQty: 1,
        vendorPreference: { mode: 'FIFO' },
        price: 200,
        stock: 10
      }
    ]
  };

  const updatePrdRes = await request('PUT', `/api/products/${productId}`, updatePayload);
  const updatedProduct = updatePrdRes.data.product || updatePrdRes.data;
  console.log('3. Updated product with container variant:', updatePrdRes.status, updatedProduct.variants.length, 'variant(s)');

  // 4. Create an invoice with this variant
  const validInvoicePayload = {
    customerName: 'Test Pharma Client',
    customer: { name: 'Test Pharma Client' },
    supplyType: 'intra',
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        productId: productId,
        variantId: 'VAR-JAR-250',
        name: `${testPrd.name} (250 g)`,
        qty: 2,
        rate: 200,
        gst_rate: 18
      }
    ],
    subtotal: 400,
    totalTax: 72,
    grandTotal: 472,
    status: 'paid'
  };

  const validInvRes = await request('POST', '/api/invoices', validInvoicePayload);
  const invoiceId = validInvRes.data.invoice ? validInvRes.data.invoice.id : validInvRes.data.id;
  console.log('4. Invoicing product WITH variant result:', validInvRes.status, invoiceId);

  if (validInvRes.status === 201) {
    console.log('✅ PASS: Invoice created successfully for product with variants!');
  } else {
    console.error('❌ FAIL: Invoice creation failed for valid variant!', validInvRes);
    process.exit(1);
  }

  // 5. Verify variant stock deduction
  const verifyPrdRes = await request('GET', `/api/products`);
  const productsList = verifyPrdRes.data.products || verifyPrdRes.data;
  const finalPrd = productsList.find(p => p.id === productId);
  const finalVar = finalPrd.variants.find(v => v.variantId === 'VAR-JAR-250');
  console.log('5. Variant stock after invoice (started at 10, sold 2):', finalVar.stock);

  if (finalVar.stock === 8) {
    console.log('✅ PASS: Variant stock correctly deducted to 8!');
  } else {
    console.error(`❌ FAIL: Expected variant stock to be 8, got ${finalVar.stock}`);
    process.exit(1);
  }

  // Clean up
  await request('DELETE', `/api/products/${productId}`);
  await request('DELETE', `/api/invoices/${invoiceId}?restock=false`);
  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
