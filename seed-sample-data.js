/**
 * InvoiceWise — Comprehensive Raw Testing Data Generator
 * Seeds realistic, interconnected test data across every single field and data store.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const now = new Date();
const isoNow = now.toISOString();
const dateStr = now.toISOString().split('T')[0];

console.log('Seeding rich test data across all InvoiceWise data stores...');

// 1. SETTINGS
const settingsData = {
  businessName: 'Apex Bio-Chemicals & Cosmetics Pvt. Ltd.',
  companyName: 'Apex Bio-Chemicals & Cosmetics Pvt. Ltd.',
  businessGstin: '27AAPCA1234F1Z8',
  businessPan: 'AAPCA1234F',
  businessState: '27',
  businessStateCode: '27',
  businessAddress: 'Plot 42-A, TTC Industrial Area, MIDC Pawane, Navi Mumbai, Maharashtra - 400705',
  businessEmail: 'billing@apexbio.in',
  businessPhone: '+91 98201 54321',
  businessWebsite: 'https://www.apexbio.in',
  businessBankName: 'HDFC Bank Ltd.',
  businessBankAcc: '50200098765432',
  businessBankIFSC: 'HDFC0000123',
  invoicePrefix: 'INV',
  invoiceTerms: 'Payment due within 30 days of invoice date. 18% p.a. interest applicable on delayed payments.',
  invoiceNotes: 'Goods once inspected and accepted cannot be returned without Return Material Authorization (RMA). Subject to Mumbai jurisdiction.',
  firstLaunchCompleted: true,
  userName: 'Siddharth Gupta'
};

// 2. RAW MATERIALS
const rawMaterialsData = {
  raw_materials: [
    {
      id: 'RM-000001',
      name: 'Glycogen USP (99.5% Pure Active)',
      category: 'Active Ingredient',
      unit: 'kg',
      stock: 120,
      current_stock: 120,
      reorder_point: 25,
      minimumStock: 25,
      cost_per_unit: 450,
      purchaseCost: 450,
      supplier: 'Apex BioCorp International',
      notes: 'Pharma grade active ingredient for anti-aging serums. Store between 15-25°C in sealed nitrogen drums.'
    },
    {
      id: 'RM-000002',
      name: 'Ethanol Extra Pure (99.9% Denatured)',
      category: 'Solvent',
      unit: 'L',
      stock: 350,
      current_stock: 350,
      reorder_point: 50,
      minimumStock: 50,
      cost_per_unit: 85,
      purchaseCost: 85,
      supplier: 'Nexus Solvents Ltd',
      notes: 'USP Grade denatured ethanol for cosmetic formulation and sanitizers.'
    },
    {
      id: 'RM-000003',
      name: 'Organic Damask Rose Hydrosol',
      category: 'Botanical Extract',
      unit: 'L',
      stock: 80,
      current_stock: 80,
      reorder_point: 20,
      minimumStock: 20,
      cost_per_unit: 220,
      purchaseCost: 220,
      supplier: 'Kashmir Herbal Extracts',
      notes: 'Steam-distilled organic rose water distillate. Store in cool dark room.'
    },
    {
      id: 'RM-000004',
      name: 'Vegetable Glycerin (Pharma Grade)',
      category: 'Solvent',
      unit: 'kg',
      stock: 15,
      current_stock: 15,
      reorder_point: 30,
      minimumStock: 30,
      cost_per_unit: 140,
      purchaseCost: 140,
      supplier: 'Gujarat Oleo-Chemicals',
      notes: 'Humectant base. Stock is currently below reorder minimum of 30kg (Alert Triggered).'
    },
    {
      id: 'RM-000005',
      name: '50mL Amber Glass Dropper Bottle',
      category: 'Packaging',
      unit: 'pcs',
      stock: 850,
      current_stock: 850,
      reorder_point: 200,
      minimumStock: 200,
      cost_per_unit: 18,
      purchaseCost: 18,
      supplier: 'Standard Glass & Packaging',
      notes: 'UV-protective amber glass bottle with calibrated silicone dropper pipettes.'
    },
    {
      id: 'RM-000006',
      name: '100mL PET Mist Spray Bottle',
      category: 'Packaging',
      unit: 'pcs',
      stock: 450,
      current_stock: 450,
      reorder_point: 150,
      minimumStock: 150,
      cost_per_unit: 14,
      purchaseCost: 14,
      supplier: 'Polypack Industries',
      notes: 'Clear PET bottle with ultra-fine mist atomizing pump.'
    },
    {
      id: 'RM-000007',
      name: 'Tamper-Evident Luxury Metallic Label',
      category: 'Packaging',
      unit: 'pcs',
      stock: 1200,
      current_stock: 1200,
      reorder_point: 300,
      minimumStock: 300,
      cost_per_unit: 3.5,
      purchaseCost: 3.5,
      supplier: 'Printech Solutions',
      notes: 'Gold foil embossed waterproof labels with QR verification.'
    },
    {
      id: 'RM-000008',
      name: 'Niacinamide Pure Powder (Vitamin B3)',
      category: 'Active Ingredient',
      unit: 'kg',
      stock: 0,
      current_stock: 0,
      reorder_point: 10,
      minimumStock: 10,
      cost_per_unit: 750,
      purchaseCost: 750,
      supplier: 'Apex BioCorp International',
      notes: 'Out of stock - previous batch fully exhausted. Reorder pending.'
    }
  ],
  lastUpdated: isoNow
};

// 3. RAW MATERIAL BATCHES
const rawMaterialBatchesData = {
  raw_material_batches: [
    // RM-000001 (Glycogen: 50kg + 70kg = 120kg active, + 1 consumed batch)
    {
      batchId: 'RMB-2026-0001',
      rawMaterialId: 'RM-000001',
      rawMaterialName: 'Glycogen USP (99.5% Pure Active)',
      vendorName: 'Apex BioCorp International',
      vendorGstNumber: '27AAPCA9876E1Z2',
      vendorBillingRef: 'ABC-INV-2026-104',
      vendorInvoiceNumber: 'INV-77821',
      vendorAddress: 'Plot 12, GIDC Industrial Estate, Vadodara, Gujarat - 390010',
      vendorContact: '+91 98980 12345',
      vendorEmail: 'sales@apexbio.com',
      vendorPrice: 22500,
      supplierBatchNumber: 'LOT-GLY-26-09A',
      purchaseDate: '2026-08-10',
      originalQuantity: 50,
      remainingQuantity: 50,
      unit: 'kg',
      costPerUnit: 450,
      status: 'ACTIVE',
      notes: 'High assay 99.8% verified by COA. First in FIFO queue.',
      auditCorrelationId: 'AUD-2026-000001',
      createdAt: isoNow
    },
    {
      batchId: 'RMB-2026-0002',
      rawMaterialId: 'RM-000001',
      rawMaterialName: 'Glycogen USP (99.5% Pure Active)',
      vendorName: 'Nexus Bio-Life Pvt. Ltd.',
      vendorGstNumber: '24AAACN4432G1ZM',
      vendorBillingRef: 'NEX-PO-8891',
      vendorInvoiceNumber: 'BILL-4439',
      vendorAddress: '104 Phase 2, Vatva Industrial Zone, Ahmedabad - 382445',
      vendorContact: '+91 97234 56789',
      vendorEmail: 'orders@nexusbio.com',
      vendorPrice: 31500,
      supplierBatchNumber: 'LOT-GLY-26-09B',
      purchaseDate: '2026-08-25',
      originalQuantity: 70,
      remainingQuantity: 70,
      unit: 'kg',
      costPerUnit: 450,
      status: 'ACTIVE',
      notes: 'Second procurement batch from secondary certified vendor.',
      auditCorrelationId: 'AUD-2026-000002',
      createdAt: isoNow
    },
    {
      batchId: 'RMB-2026-0003',
      rawMaterialId: 'RM-000001',
      rawMaterialName: 'Glycogen USP (99.5% Pure Active)',
      vendorName: 'Apex BioCorp International',
      vendorGstNumber: '27AAPCA9876E1Z2',
      vendorBillingRef: 'ABC-INV-2026-089',
      vendorInvoiceNumber: 'INV-76510',
      vendorAddress: 'Plot 12, GIDC Industrial Estate, Vadodara, Gujarat',
      vendorContact: '+91 98980 12345',
      vendorEmail: 'sales@apexbio.com',
      vendorPrice: 13500,
      supplierBatchNumber: 'LOT-GLY-26-08',
      purchaseDate: '2026-07-15',
      originalQuantity: 30,
      remainingQuantity: 0,
      unit: 'kg',
      costPerUnit: 450,
      status: 'CONSUMED',
      notes: 'Fully consumed in production batch MFG-20260815-10442.',
      auditCorrelationId: 'AUD-2026-000003',
      createdAt: isoNow
    },
    // RM-000002 (Ethanol: 350L)
    {
      batchId: 'RMB-2026-0004',
      rawMaterialId: 'RM-000002',
      rawMaterialName: 'Ethanol Extra Pure (99.9% Denatured)',
      vendorName: 'Nexus Solvents Ltd',
      vendorGstNumber: '27AAACN9988D1Z5',
      vendorBillingRef: 'NEX-ETH-092',
      vendorInvoiceNumber: 'INV-9982',
      vendorAddress: 'Plot 88, Chemical Zone, Roha, Raigad - 402116',
      vendorContact: '+91 98220 33445',
      vendorEmail: 'dispatch@nexussolvents.com',
      vendorPrice: 29750,
      supplierBatchNumber: 'SUP-ETH-2026-21',
      purchaseDate: '2026-08-18',
      originalQuantity: 400,
      remainingQuantity: 350,
      unit: 'L',
      costPerUnit: 85,
      status: 'ACTIVE',
      notes: '50L consumed in previous production runs. 350L remaining in active drum storage.',
      auditCorrelationId: 'AUD-2026-000004',
      createdAt: isoNow
    },
    // RM-000003 (Rose Hydrosol: 80L)
    {
      batchId: 'RMB-2026-0005',
      rawMaterialId: 'RM-000003',
      rawMaterialName: 'Organic Damask Rose Hydrosol',
      vendorName: 'Kashmir Herbal Extracts',
      vendorGstNumber: '01AABCK1122C1ZF',
      vendorBillingRef: 'KHE-PO-441',
      vendorInvoiceNumber: 'INV-4410',
      vendorAddress: 'Herbal Valley, Pampore, Jammu & Kashmir - 192121',
      vendorContact: '+91 99061 22334',
      vendorEmail: 'sales@kashmirherbals.com',
      vendorPrice: 17600,
      supplierBatchNumber: 'KHE-ROSE-26-AUG',
      purchaseDate: '2026-08-20',
      originalQuantity: 80,
      remainingQuantity: 80,
      unit: 'L',
      costPerUnit: 220,
      status: 'ACTIVE',
      notes: 'Organic certified pure steam distillate.',
      auditCorrelationId: 'AUD-2026-000005',
      createdAt: isoNow
    },
    // RM-000004 (Glycerin: 15kg)
    {
      batchId: 'RMB-2026-0006',
      rawMaterialId: 'RM-000004',
      rawMaterialName: 'Vegetable Glycerin (Pharma Grade)',
      vendorName: 'Gujarat Oleo-Chemicals',
      vendorGstNumber: '24AABCG5544B1ZX',
      vendorBillingRef: 'GOC-GLY-2026',
      vendorInvoiceNumber: 'INV-3109',
      vendorAddress: 'Plot 7, Ankleshwar Industrial Estate, Bharuch - 393002',
      vendorContact: '+91 98250 88776',
      vendorEmail: 'orders@gujarattoleo.com',
      vendorPrice: 7000,
      supplierBatchNumber: 'GOC-LOT-5541',
      purchaseDate: '2026-08-12',
      originalQuantity: 50,
      remainingQuantity: 15,
      unit: 'kg',
      costPerUnit: 140,
      status: 'ACTIVE',
      notes: 'Remaining 15kg in carboy. Low stock alert active.',
      auditCorrelationId: 'AUD-2026-000006',
      createdAt: isoNow
    },
    // Packaging RM-000005 (50mL Amber Bottles: 850 pcs)
    {
      batchId: 'RMB-2026-0007',
      rawMaterialId: 'RM-000005',
      rawMaterialName: '50mL Amber Glass Dropper Bottle',
      vendorName: 'Standard Glass & Packaging',
      vendorGstNumber: '27AABCS3322E1Z8',
      vendorBillingRef: 'SGP-INV-9921',
      vendorInvoiceNumber: 'BILL-8891',
      vendorAddress: 'Plot 4, MIDC Bhosari, Pune - 411026',
      vendorContact: '+91 98221 66554',
      vendorEmail: 'orders@standardglass.com',
      vendorPrice: 18000,
      supplierBatchNumber: 'SGP-AMB-50-2026',
      purchaseDate: '2026-08-05',
      originalQuantity: 1000,
      remainingQuantity: 850,
      unit: 'pcs',
      costPerUnit: 18,
      status: 'ACTIVE',
      notes: 'Cartons inspected, zero breakage verified.',
      auditCorrelationId: 'AUD-2026-000007',
      createdAt: isoNow
    },
    // Packaging RM-000006 (100mL Spray Bottles: 450 pcs)
    {
      batchId: 'RMB-2026-0008',
      rawMaterialId: 'RM-000006',
      rawMaterialName: '100mL PET Mist Spray Bottle',
      vendorName: 'Polypack Industries',
      vendorGstNumber: '27AABCP7766A1ZQ',
      vendorBillingRef: 'POLY-PO-332',
      vendorInvoiceNumber: 'INV-1104',
      vendorAddress: 'Sector 3, Vasai Industrial Estate, Palghar - 401208',
      vendorContact: '+91 98200 44556',
      vendorEmail: 'sales@polypack.in',
      vendorPrice: 7000,
      supplierBatchNumber: 'POLY-PET-100-26',
      purchaseDate: '2026-08-14',
      originalQuantity: 500,
      remainingQuantity: 450,
      unit: 'pcs',
      costPerUnit: 14,
      status: 'ACTIVE',
      notes: 'Fine mist sprayers pre-fitted with protective caps.',
      auditCorrelationId: 'AUD-2026-000008',
      createdAt: isoNow
    },
    // Packaging RM-000007 (Metallic Labels: 1200 pcs)
    {
      batchId: 'RMB-2026-0009',
      rawMaterialId: 'RM-000007',
      rawMaterialName: 'Tamper-Evident Luxury Metallic Label',
      vendorName: 'Printech Solutions',
      vendorGstNumber: '27AABCP4411K1Z2',
      vendorBillingRef: 'PRT-2026-554',
      vendorInvoiceNumber: 'INV-5540',
      vendorAddress: 'Unit 9, Lower Parel Industrial Park, Mumbai - 400013',
      vendorContact: '+91 98210 99887',
      vendorEmail: 'sales@printechlabels.com',
      vendorPrice: 5250,
      supplierBatchNumber: 'PRT-LBL-26-AUG',
      purchaseDate: '2026-08-08',
      originalQuantity: 1500,
      remainingQuantity: 1200,
      unit: 'pcs',
      costPerUnit: 3.5,
      status: 'ACTIVE',
      notes: 'Roll format labels for automatic applicator.',
      auditCorrelationId: 'AUD-2026-000009',
      createdAt: isoNow
    },
    // RM-000008 (Niacinamide: 0kg, CONSUMED)
    {
      batchId: 'RMB-2026-0010',
      rawMaterialId: 'RM-000008',
      rawMaterialName: 'Niacinamide Pure Powder (Vitamin B3)',
      vendorName: 'Apex BioCorp International',
      vendorGstNumber: '27AAPCA9876E1Z2',
      vendorBillingRef: 'ABC-INV-2026-042',
      vendorInvoiceNumber: 'INV-71022',
      vendorAddress: 'Plot 12, GIDC Industrial Estate, Vadodara, Gujarat',
      vendorContact: '+91 98980 12345',
      vendorEmail: 'sales@apexbio.com',
      vendorPrice: 18750,
      supplierBatchNumber: 'LOT-NIA-26-07',
      purchaseDate: '2026-07-20',
      originalQuantity: 25,
      remainingQuantity: 0,
      unit: 'kg',
      costPerUnit: 750,
      status: 'CONSUMED',
      notes: 'Fully consumed in batch MFG-20260810-09822. Depleted status.',
      auditCorrelationId: 'AUD-2026-000010',
      createdAt: isoNow
    }
  ],
  lastUpdated: isoNow
};

// 4. RAW MATERIAL TRANSACTIONS
const rawMaterialTxnsData = {
  raw_material_transactions: [
    {
      id: 'RMTXN-000001',
      raw_material_id: 'RM-000001',
      batch_id: 'RMB-2026-0001',
      quantity: 50,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received initial inward purchase from Apex BioCorp',
      vendorName: 'Apex BioCorp International',
      vendorGstNumber: '27AAPCA9876E1Z2',
      auditCorrelationId: 'AUD-2026-000001',
      timestamp: '2026-08-10T10:30:00.000Z'
    },
    {
      id: 'RMTXN-000002',
      raw_material_id: 'RM-000001',
      batch_id: 'RMB-2026-0002',
      quantity: 70,
      type: 'IN',
      action: 'Purchase',
      notes: 'Secondary procurement batch received from Nexus Bio-Life',
      vendorName: 'Nexus Bio-Life Pvt. Ltd.',
      vendorGstNumber: '24AAACN4432G1ZM',
      auditCorrelationId: 'AUD-2026-000002',
      timestamp: '2026-08-25T14:15:00.000Z'
    },
    {
      id: 'RMTXN-000003',
      raw_material_id: 'RM-000002',
      batch_id: 'RMB-2026-0004',
      quantity: 400,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received 400L bulk drum from Nexus Solvents',
      vendorName: 'Nexus Solvents Ltd',
      vendorGstNumber: '27AAACN9988D1Z5',
      auditCorrelationId: 'AUD-2026-000004',
      timestamp: '2026-08-18T11:00:00.000Z'
    },
    {
      id: 'RMTXN-000004',
      raw_material_id: 'RM-000003',
      batch_id: 'RMB-2026-0005',
      quantity: 80,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received organic rose water shipment from Kashmir Herbal Extracts',
      vendorName: 'Kashmir Herbal Extracts',
      vendorGstNumber: '01AABCK1122C1ZF',
      auditCorrelationId: 'AUD-2026-000005',
      timestamp: '2026-08-20T09:45:00.000Z'
    },
    {
      id: 'RMTXN-000005',
      raw_material_id: 'RM-000004',
      batch_id: 'RMB-2026-0006',
      quantity: 50,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received glycerin drum from Gujarat Oleo-Chemicals',
      vendorName: 'Gujarat Oleo-Chemicals',
      vendorGstNumber: '24AABCG5544B1ZX',
      auditCorrelationId: 'AUD-2026-000006',
      timestamp: '2026-08-12T16:20:00.000Z'
    },
    {
      id: 'RMTXN-000006',
      raw_material_id: 'RM-000005',
      batch_id: 'RMB-2026-0007',
      quantity: 1000,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received glass bottles from Standard Glass',
      vendorName: 'Standard Glass & Packaging',
      vendorGstNumber: '27AABCS3322E1Z8',
      auditCorrelationId: 'AUD-2026-000007',
      timestamp: '2026-08-05T13:10:00.000Z'
    },
    {
      id: 'RMTXN-000007',
      raw_material_id: 'RM-000006',
      batch_id: 'RMB-2026-0008',
      quantity: 500,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received PET spray bottles from Polypack',
      vendorName: 'Polypack Industries',
      vendorGstNumber: '27AABCP7766A1ZQ',
      auditCorrelationId: 'AUD-2026-000008',
      timestamp: '2026-08-14T11:30:00.000Z'
    },
    {
      id: 'RMTXN-000008',
      raw_material_id: 'RM-000007',
      batch_id: 'RMB-2026-0009',
      quantity: 1500,
      type: 'IN',
      action: 'Purchase',
      notes: 'Received embossed luxury labels from Printech',
      vendorName: 'Printech Solutions',
      vendorGstNumber: '27AABCP4411K1Z2',
      auditCorrelationId: 'AUD-2026-000009',
      timestamp: '2026-08-08T15:45:00.000Z'
    }
  ],
  lastUpdated: isoNow
};

// 5. PRODUCTS CATALOG
const productsData = {
  products: [
    {
      id: 'PRD-000001',
      name: 'Bio-Glycogen Cellular Youth Serum 50mL',
      sku: 'SKU-GLY-SER-50',
      category: 'Cosmetics & Skincare',
      hsn: '33049910',
      unit: 'BTL',
      price: 1450,
      gstRate: 18,
      stock: 75,
      description: 'Ultra-potent anti-aging facial serum formulated with 99.5% pure glycogen and skin-identical humectants.',
      linkedRecipeId: 'RCP-000001',
      variants: [
        { name: 'Standard 50mL', size: '50mL', price: 1450, stock: 75 }
      ]
    },
    {
      id: 'PRD-000002',
      name: 'Aroma Rose Water Refreshing Mist 100mL',
      sku: 'SKU-ROSE-MST-100',
      category: 'Cosmetics & Skincare',
      hsn: '33049920',
      unit: 'BTL',
      price: 420,
      gstRate: 18,
      stock: 120,
      description: 'Pure organic Damask rose distillate face toner and revitalizing hydration mist.',
      linkedRecipeId: 'RCP-000002',
      variants: [
        { name: 'Standard 100mL', size: '100mL', price: 420, stock: 120 }
      ]
    },
    {
      id: 'PRD-000003',
      name: 'PharmaGrade Pure Hand Sanitizer Gel 500mL',
      sku: 'SKU-SAN-GEL-500',
      category: 'Healthcare & Hygiene',
      hsn: '38089400',
      unit: 'BTL',
      price: 210,
      gstRate: 12,
      stock: 40,
      description: 'WHO-compliant 75% v/v denatured ethanol hand rub sanitizer gel with moisturizing glycerin.',
      linkedRecipeId: null,
      variants: []
    },
    {
      id: 'PRD-000004',
      name: 'Niacinamide Clarifying Facial Essence 30mL',
      sku: 'SKU-NIA-ESS-30',
      category: 'Cosmetics & Skincare',
      hsn: '33049910',
      unit: 'BTL',
      price: 980,
      gstRate: 18,
      stock: 0,
      description: 'Pore-refining 10% Vitamin B3 treatment essence. Currently awaiting raw material batch restock.',
      linkedRecipeId: null,
      variants: []
    }
  ],
  lastUpdated: isoNow
};

// 6. CUSTOMERS DIRECTORY
const customersData = {
  customers: [
    {
      id: 'CUST-000001',
      name: 'Lotus Wellness & Medi-Spa Pvt. Ltd.',
      gstin: '27AABCL8976C1Z4',
      pan: 'AABCL8976C',
      stateCode: '27',
      stateName: 'Maharashtra',
      address: '24/B Luxury Arcade, Linking Road, Bandra West, Mumbai - 400050',
      email: 'purchasing@lotuswellness.in',
      phone: '+91 98200 11223',
      contactPerson: 'Ms. Ananya Deshmukh (Procurement Manager)',
      notes: 'Premium luxury spa chain client. Regular 30-day payment cycle. Intra-state billing (CGST + SGST).'
    },
    {
      id: 'CUST-000002',
      name: 'Apollo Pharma Distributors Ltd.',
      gstin: '24AABCA5432B1ZM',
      pan: 'AABCA5432B',
      stateCode: '24',
      stateName: 'Gujarat',
      address: '88 Apollo Logistics Hub, Sarkhej-Bavla Highway, Ahmedabad - 382210',
      email: 'orders.gujarat@apollopharma.com',
      phone: '+91 97240 88990',
      contactPerson: 'Mr. Rajesh Patel (Head of Sourcing)',
      notes: 'Major pharmacy retail distributor in Gujarat. Inter-state billing (IGST).'
    },
    {
      id: 'CUST-000003',
      name: 'Bangalore Dermatological Care LLP',
      gstin: '29AABCB1122D1ZK',
      pan: 'AABCB1122D',
      stateCode: '29',
      stateName: 'Karnataka',
      address: 'Shop 102, 100 Feet Road, Indiranagar, Bengaluru - 560038',
      email: 'clinic@bangalorederm.com',
      phone: '+91 98450 77665',
      contactPerson: 'Dr. Vivek Menon',
      notes: 'Specialist skin clinics across Bengaluru. Inter-state billing (IGST).'
    },
    {
      id: 'CUST-000004',
      name: 'Capital Organics Superstore',
      gstin: '07AAACG9988H1ZT',
      pan: 'AAACG9988H',
      stateCode: '07',
      stateName: 'Delhi',
      address: '15 Connaught Place, Inner Circle, New Delhi - 110001',
      email: 'inventory@capitalorganics.in',
      phone: '+91 98110 33442',
      contactPerson: 'Mr. Rohan Malhotra',
      notes: 'Organic lifestyle retail outlet. Inter-state billing (IGST).'
    },
    {
      id: 'CUST-000005',
      name: 'Dr. Priya Sharma (Clinic Direct)',
      gstin: '',
      pan: '',
      stateCode: '27',
      stateName: 'Maharashtra',
      address: 'Flat 4A, Green Park Heights, Pune - 411007',
      email: 'drpriyasharma@gmail.com',
      phone: '+91 98900 55443',
      contactPerson: 'Dr. Priya Sharma',
      notes: 'Unregistered direct physician customer. B2C retail invoice.'
    }
  ],
  lastUpdated: isoNow
};

// 7. RECIPES & BOM
const recipesData = {
  recipes: [
    {
      id: 'RCP-000001',
      name: 'Bio-Glycogen Cellular Youth Serum 50mL (Batch 100 BTL)',
      productId: 'PRD-000001',
      outputQty: 100,
      outputUnit: 'BTL',
      version: '1.0',
      description: 'Master formula for 100 units of 50mL finished dropper bottles. Uses certified glycogen with vendor preference.',
      ingredients: [
        {
          rawMaterialId: 'RM-000001',
          name: 'Glycogen USP (99.5% Pure Active)',
          quantity: 5,
          unit: 'kg',
          vendorPreference: 'Apex BioCorp International'
        },
        {
          rawMaterialId: 'RM-000004',
          name: 'Vegetable Glycerin (Pharma Grade)',
          quantity: 2,
          unit: 'kg',
          vendorPreference: 'DEFAULT_FIFO'
        },
        {
          rawMaterialId: 'RM-000002',
          name: 'Ethanol Extra Pure (99.9% Denatured)',
          quantity: 10,
          unit: 'L',
          vendorPreference: 'DEFAULT_FIFO'
        },
        {
          rawMaterialId: 'RM-000005',
          name: '50mL Amber Glass Dropper Bottle',
          quantity: 100,
          unit: 'pcs',
          vendorPreference: 'DEFAULT_FIFO'
        },
        {
          rawMaterialId: 'RM-000007',
          name: 'Tamper-Evident Luxury Metallic Label',
          quantity: 100,
          unit: 'pcs',
          vendorPreference: 'DEFAULT_FIFO'
        }
      ],
      createdAt: isoNow,
      lastUpdated: isoNow
    },
    {
      id: 'RCP-000002',
      name: 'Aroma Rose Water Refreshing Mist 100mL (Batch 200 BTL)',
      productId: 'PRD-000002',
      outputQty: 200,
      outputUnit: 'BTL',
      version: '1.0',
      description: 'Master formula for 200 units of 100mL finished mist bottles.',
      ingredients: [
        {
          rawMaterialId: 'RM-000003',
          name: 'Organic Damask Rose Hydrosol',
          quantity: 20,
          unit: 'L',
          vendorPreference: 'DEFAULT_FIFO'
        },
        {
          rawMaterialId: 'RM-000004',
          name: 'Vegetable Glycerin (Pharma Grade)',
          quantity: 1,
          unit: 'kg',
          vendorPreference: 'DEFAULT_FIFO'
        },
        {
          rawMaterialId: 'RM-000006',
          name: '100mL PET Mist Spray Bottle',
          quantity: 200,
          unit: 'pcs',
          vendorPreference: 'DEFAULT_FIFO'
        },
        {
          rawMaterialId: 'RM-000007',
          name: 'Tamper-Evident Luxury Metallic Label',
          quantity: 200,
          unit: 'pcs',
          vendorPreference: 'DEFAULT_FIFO'
        }
      ],
      createdAt: isoNow,
      lastUpdated: isoNow
    }
  ],
  lastUpdated: isoNow
};

// 8. RECIPE HISTORY
const recipeHistoryData = {
  recipe_history: [
    {
      historyId: 'RHIST-000001',
      recipeId: 'RCP-000001',
      recipeName: 'Bio-Glycogen Cellular Youth Serum 50mL (Batch 100 BTL)',
      version: '1.0',
      timestamp: '2026-08-01T10:00:00.000Z',
      action: 'INITIAL_CREATION',
      snapshot: recipesData.recipes[0]
    }
  ],
  lastUpdated: isoNow
};

// 9. MANUFACTURING BATCHES
const manufacturingBatchesData = {
  manufacturing_batches: [
    {
      id: 'MFG-20260915-10291',
      mfgId: 'MFG-20260915-10291',
      batchNumber: 'MFG-20260915-10291',
      recipeId: 'RCP-000001',
      recipeName: 'Bio-Glycogen Cellular Youth Serum 50mL (Batch 100 BTL)',
      productId: 'PRD-000001',
      productName: 'Bio-Glycogen Cellular Youth Serum 50mL',
      plannedQty: 100,
      actualQty: 100,
      quantityProduced: 100,
      totalVolumeInL: 5,
      status: 'COMPLETED',
      startDate: '2026-09-15',
      completedDate: '2026-09-15',
      date: '2026-09-15',
      createdAt: '2026-09-15T16:00:00.000Z',
      operatorName: 'Siddharth Gupta',
      auditCorrelationId: 'AUD-2026-000011',
      consumptions: [
        {
          rawMaterialId: 'RM-000001',
          rawMaterialName: 'Glycogen USP (99.5% Pure Active)',
          batchId: 'RMB-2026-0001',
          vendorName: 'Apex BioCorp International',
          consumedQty: 5,
          unit: 'kg'
        },
        {
          rawMaterialId: 'RM-000004',
          rawMaterialName: 'Vegetable Glycerin (Pharma Grade)',
          batchId: 'RMB-2026-0006',
          vendorName: 'Gujarat Oleo-Chemicals',
          consumedQty: 2,
          unit: 'kg'
        },
        {
          rawMaterialId: 'RM-000002',
          rawMaterialName: 'Ethanol Extra Pure (99.9% Denatured)',
          batchId: 'RMB-2026-0004',
          vendorName: 'Nexus Solvents Ltd',
          consumedQty: 10,
          unit: 'L'
        },
        {
          rawMaterialId: 'RM-000005',
          rawMaterialName: '50mL Amber Glass Dropper Bottle',
          batchId: 'RMB-2026-0007',
          vendorName: 'Standard Glass & Packaging',
          consumedQty: 100,
          unit: 'pcs'
        },
        {
          rawMaterialId: 'RM-000007',
          rawMaterialName: 'Tamper-Evident Luxury Metallic Label',
          batchId: 'RMB-2026-0009',
          vendorName: 'Printech Solutions',
          consumedQty: 100,
          unit: 'pcs'
        }
      ],
      notes: 'Standard production cycle completed with 100% yield. Quality QC passed.'
    }
  ],
  lastUpdated: isoNow
};

// 10. MANUFACTURING AUDIT LEDGER
const manufacturingAuditData = {
  manufacturing_audit: [
    {
      auditCorrelationId: 'AUD-2026-000001',
      eventType: 'RAW_MATERIAL_INWARD',
      timestamp: '2026-08-10T10:30:00.000Z',
      rawMaterialId: 'RM-000001',
      rawMaterialName: 'Glycogen USP (99.5% Pure Active)',
      batchId: 'RMB-2026-0001',
      vendorName: 'Apex BioCorp International',
      quantityChanged: 50,
      unit: 'kg',
      details: 'Inward purchase receipt under vendor invoice INV-77821'
    },
    {
      auditCorrelationId: 'AUD-2026-000010',
      eventType: 'RAW_MATERIAL_BATCH_CONSUMED',
      timestamp: '2026-08-10T12:00:00.000Z',
      rawMaterialId: 'RM-000008',
      rawMaterialName: 'Niacinamide Pure Powder (Vitamin B3)',
      batchId: 'RMB-2026-0010',
      vendorName: 'Apex BioCorp International',
      quantityChanged: 0,
      unit: 'kg',
      details: 'Batch RMB-2026-0010 remaining quantity reached 0. Transitioned to CONSUMED status.'
    },
    {
      auditCorrelationId: 'AUD-2026-000011',
      eventType: 'MANUFACTURING_BATCH_COMPLETED',
      timestamp: '2026-09-15T16:00:00.000Z',
      mfgBatchNumber: 'MFG-20260915-10291',
      productId: 'PRD-000001',
      productName: 'Bio-Glycogen Cellular Youth Serum 50mL',
      quantityProduced: 100,
      unit: 'BTL',
      details: 'Completed manufacturing run for 100 units of PRD-000001. All materials verified and depleted.'
    }
  ],
  entries: [],
  lastUpdated: isoNow
};

// 11. FINISHED GOODS
const finishedGoodsData = {
  finished_goods: [
    {
      id: 'FG-000001',
      productId: 'PRD-000001',
      name: 'Bio-Glycogen Cellular Youth Serum 50mL',
      productName: 'Bio-Glycogen Cellular Youth Serum 50mL',
      batchNumber: 'FGB-2026-001',
      finishedGoodsBatchId: 'FGB-2026-001',
      mfgBatchNumber: 'MFG-20260915-10291',
      quantity: 75,
      currentStock: 75,
      unit: 'BTL',
      bottleSize: 50,
      bottleSizeUnit: 'mL',
      mfgDate: '2026-09-15',
      expiryDate: '2028-09-14',
      costPerUnit: 285.5,
      mrp: 1450,
      status: 'AVAILABLE',
      location: 'Warehouse Bay 2 - Air Conditioned',
      notes: 'Freshly manufactured batch with 24 months shelf life. 25 bottles already invoiced.'
    },
    {
      id: 'FG-000002',
      productId: 'PRD-000002',
      name: 'Aroma Rose Water Refreshing Mist 100mL',
      productName: 'Aroma Rose Water Refreshing Mist 100mL',
      batchNumber: 'FGB-2026-002',
      finishedGoodsBatchId: 'FGB-2026-002',
      mfgBatchNumber: 'MFG-20260910-09811',
      quantity: 120,
      currentStock: 120,
      unit: 'BTL',
      bottleSize: 100,
      bottleSizeUnit: 'mL',
      mfgDate: '2026-09-10',
      expiryDate: '2028-09-09',
      costPerUnit: 78.2,
      mrp: 420,
      status: 'AVAILABLE',
      location: 'Warehouse Bay 1 - General Ambient',
      notes: 'Steam distilled natural mist. Ready for retail distribution.'
    }
  ],
  lastUpdated: isoNow
};

// 12. FINISHED GOODS TRANSACTIONS
const finishedGoodsTxnsData = {
  finished_goods_transactions: [
    {
      id: 'FGTXN-000001',
      fgId: 'FG-000001',
      batchNumber: 'FGB-2026-001',
      productId: 'PRD-000001',
      quantity: 100,
      type: 'IN',
      action: 'Manufacturing Production Conversion',
      notes: 'Initial production batch conversion from MFG-20260915-10291',
      timestamp: '2026-09-15T16:05:00.000Z'
    },
    {
      id: 'FGTXN-000002',
      fgId: 'FG-000001',
      batchNumber: 'FGB-2026-001',
      productId: 'PRD-000001',
      quantity: 25,
      type: 'OUT',
      action: 'Sales Invoice Dispatch',
      notes: 'Dispatched 25 bottles against Tax Invoice INV-2026-0001',
      invoiceNumber: 'INV-2026-0001',
      timestamp: '2026-09-18T11:30:00.000Z'
    }
  ],
  lastUpdated: isoNow
};

// 13. INVOICES
const invoicesData = {
  lastInvoiceSeq: 3,
  invoices: [
    {
      id: 'INV-2026-0001',
      invoiceNumber: 'INV-2026-0001',
      date: '2026-09-18',
      dueDate: '2026-10-18',
      customerId: 'CUST-000001',
      customerName: 'Lotus Wellness & Medi-Spa Pvt. Ltd.',
      customerGstin: '27AABCL8976C1Z4',
      customerAddress: '24/B Luxury Arcade, Linking Road, Bandra West, Mumbai - 400050',
      customerStateCode: '27',
      isInterState: false,
      status: 'PAID',
      paymentMode: 'NEFT / Bank Transfer',
      notes: 'Delivered in full via secure refrigerated courier. Received and signed.',
      items: [
        {
          productId: 'PRD-000001',
          name: 'Bio-Glycogen Cellular Youth Serum 50mL',
          hsn: '33049910',
          batchNumber: 'FGB-2026-001',
          quantity: 25,
          unit: 'BTL',
          price: 1450,
          discount: 10,
          gstRate: 18,
          taxableAmount: 32625,
          cgstAmount: 2936.25,
          sgstAmount: 2936.25,
          igstAmount: 0,
          totalAmount: 38497.5
        }
      ],
      subtotal: 36250,
      totalDiscount: 3625,
      taxableSubtotal: 32625,
      cgstTotal: 2936.25,
      sgstTotal: 2936.25,
      igstTotal: 0,
      totalTax: 5872.5,
      grandTotal: 38498,
      roundOff: 0.5,
      createdAt: '2026-09-18T11:30:00.000Z'
    },
    {
      id: 'INV-2026-0002',
      invoiceNumber: 'INV-2026-0002',
      date: '2026-09-20',
      dueDate: '2026-10-20',
      customerId: 'CUST-000002',
      customerName: 'Apollo Pharma Distributors Ltd.',
      customerGstin: '24AABCA5432B1ZM',
      customerAddress: '88 Apollo Logistics Hub, Sarkhej-Bavla Highway, Ahmedabad - 382210',
      customerStateCode: '24',
      isInterState: true,
      status: 'PAID',
      paymentMode: 'RTGS',
      notes: 'Inter-State dispatch to Gujarat warehouse. IGST 18% billed.',
      items: [
        {
          productId: 'PRD-000002',
          name: 'Aroma Rose Water Refreshing Mist 100mL',
          hsn: '33049920',
          batchNumber: 'FGB-2026-002',
          quantity: 50,
          unit: 'BTL',
          price: 420,
          discount: 5,
          gstRate: 18,
          taxableAmount: 19950,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 3591,
          totalAmount: 23541
        }
      ],
      subtotal: 21000,
      totalDiscount: 1050,
      taxableSubtotal: 19950,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 3591,
      totalTax: 3591,
      grandTotal: 23541,
      roundOff: 0,
      createdAt: '2026-09-20T14:45:00.000Z'
    },
    {
      id: 'INV-2026-0003',
      invoiceNumber: 'INV-2026-0003',
      date: dateStr,
      dueDate: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
      customerId: 'CUST-000003',
      customerName: 'Bangalore Dermatological Care LLP',
      customerGstin: '29AABCB1122D1ZK',
      customerAddress: 'Shop 102, 100 Feet Road, Indiranagar, Bengaluru - 560038',
      customerStateCode: '29',
      isInterState: true,
      status: 'PENDING',
      paymentMode: 'Awaiting Payment',
      notes: 'New order for Bengaluru clinics. Awaiting payment confirmation.',
      items: [
        {
          productId: 'PRD-000001',
          name: 'Bio-Glycogen Cellular Youth Serum 50mL',
          hsn: '33049910',
          batchNumber: 'FGB-2026-001',
          quantity: 20,
          unit: 'BTL',
          price: 1450,
          discount: 0,
          gstRate: 18,
          taxableAmount: 29000,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 5220,
          totalAmount: 34220
        },
        {
          productId: 'PRD-000002',
          name: 'Aroma Rose Water Refreshing Mist 100mL',
          hsn: '33049920',
          batchNumber: 'FGB-2026-002',
          quantity: 30,
          unit: 'BTL',
          price: 420,
          discount: 0,
          gstRate: 18,
          taxableAmount: 12600,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 2268,
          totalAmount: 14868
        }
      ],
      subtotal: 41600,
      totalDiscount: 0,
      taxableSubtotal: 41600,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 7488,
      totalTax: 7488,
      grandTotal: 49088,
      roundOff: 0,
      createdAt: isoNow
    }
  ],
  lastUpdated: isoNow
};

// 14. NOTES / SCRATCHPAD
const notesData = {
  notes: `📋 INVOICEWISE ERP — OPERATIONAL NOTES & PRODUCTION RUN CHECKLIST
─────────────────────────────────────────────────────────────
📅 Current Period: September 2026

1. PRIORITY PRODUCTION SCHEDULE:
   • Bio-Glycogen Serum 50mL (Batch RCP-000001):
     - Target: 100 units
     - RM Allocated: Glycogen Batch RMB-2026-0001 (50kg available)
     - Note: Use preferred vendor Apex BioCorp for optimal assay.

2. RAW MATERIAL REORDER ALERTS:
   • ⚠️ Vegetable Glycerin (RM-000004): 15 kg remaining (Reorder threshold: 30 kg).
     Contact Gujarat Oleo-Chemicals (+91 98250 88776) for 100kg drum PO.
   • ⚠️ Niacinamide (RM-000008): 0 kg remaining. Pending import release.

3. DISPATCH & BILLING LOG:
   • Lotus Wellness (INV-2026-0001): ₹38,498 received via NEFT.
   • Apollo Pharma (INV-2026-0002): ₹23,541 received via RTGS.
   • Bangalore Derm Care (INV-2026-0003): ₹49,088 pending payment. Follow up next Monday.

4. QC CONTACTS:
   • In-house QC Lab: Ext 104 (Dr. K. Mehta)
   • Microbiological Testing Lab: AccuLab Mumbai (Ref: ACC-2026-409)
─────────────────────────────────────────────────────────────`
};

// WRITE ALL FILES
const stores = [
  ['settings.json', settingsData],
  ['raw_materials.json', rawMaterialsData],
  ['raw_material_batches.json', rawMaterialBatchesData],
  ['raw_material_transactions.json', rawMaterialTxnsData],
  ['products.json', productsData],
  ['customers.json', customersData],
  ['recipes.json', recipesData],
  ['recipe_history.json', recipeHistoryData],
  ['manufacturing_batches.json', manufacturingBatchesData],
  ['manufacturing_audit.json', manufacturingAuditData],
  ['finished_goods.json', finishedGoodsData],
  ['finished_goods_transactions.json', finishedGoodsTxnsData],
  ['invoices.json', invoicesData],
  ['notes.json', notesData]
];

const targetDirs = [DATA_DIR];
if (process.env.APPDATA) {
  const appDataDir = path.join(process.env.APPDATA, 'InvoiceWise', 'InvoiceWiseData');
  if (fs.existsSync(path.dirname(appDataDir))) {
    if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
    targetDirs.push(appDataDir);
  }
}

for (const dir of targetDirs) {
  console.log(`Writing to target directory: ${dir}`);
  for (const [filename, data] of stores) {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✓ Seeded: ${filename}`);
  }
}

console.log('\n🎉 Comprehensive raw testing data successfully seeded across all 14 data stores!');
