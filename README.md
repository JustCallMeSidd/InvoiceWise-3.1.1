# InvoiceWise 3.1.1 — Professional GST Billing, Inventory & Manufacturing ERP

![InvoiceWise Logo](public/logo.png)

<img width="1672" height="941" alt="InvoiceWise 3 1 1 Manufacturing Control Poster" src="https://github.com/user-attachments/assets/e7cc9ced-ed3b-4c87-ba27-5042660ead69"/>

**InvoiceWise 3.1.1** is an enterprise-grade, standalone Windows desktop ERP software engineered for chemical manufacturers, pharmaceutical formulators, cosmetic labs, packaging units, and distributors. 

It unifies **BOM Formula Engineering**, **Multi-Batch Traceability**, **Multi-Unit Inventory (Weight, Volume & Count)**, **Cryptographic Audit Ledgers**, **Inward Vendor Lot Management**, **Finished Goods Inventory**, **Rule 46 GST Invoicing**, and **Embedded Desktop Utilities** into a fast, local-first application requiring zero cloud dependencies or database server configurations.

---

## 🌟 Version 3.1.0 Key Features & Enhancements

### 1. ⚖️ Multi-Unit Compatibility (Mass/Weight, Volume & Discrete Items)
- **Universal Dimension Engine**: Fully compatible with weight (`kg`, `g`, `mg`), volume (`L`, `mL`), and discrete packaging counts (`pcs`, `bottles`, `caps`, `pouches`, `jars`, `cans`, `sachets`, `units`).
- **Base Unit Normalization**: Automatically converts all quantities to dimension-specific base units (`g` for weight, `mL` for volume, `pcs` for count) during BOM simulations, batch deduction, packaging, and retail distribution.
- **Packaging Container & Custom Unit Resolution**: Container items with volume/weight descriptors (e.g. `bottle 500 ml`, `bottle 200 ml`, `vial 10ml`, `jar 100g`, `pouch`, `cap`) are natively recognized under the `count` dimension. They convert seamlessly 1:1 with `bottle` and `pcs`, preventing unit mismatch errors.
- **Automatic Custom Unit Auto-Binding in Recipe Builder**: Selecting a raw material with a custom or container unit automatically detects, selects `CUSTOM`, and pre-populates the exact custom unit into the recipe BOM formulation.
- **Atomic Batch Unit Propagation**: Updating a raw material master's unit or name via `PUT /api/raw-materials/:id` instantly synchronizes all associated inventory batches in `raw_material_batches.json`. Server startup reconciliation (`reconcileRawMaterialBatches()`) guarantees that all active child batches and transaction ledgers mirror the parent raw material's unit.
- **Dry Powder & Solid Formulations**: Seamlessly handles non-liquid recipes (e.g. powders, granules, tablets, churns) without defaulting or forcing volume (`mL`) conversions.
- **Dynamic Port Selection**: Port conflicts on `3000` automatically advance to `3001`+ in both Express and Electron without crash dialogs.

### 2. ⚡ Bidirectional Formula ↔ Product Linkage & Automatic Startup Reconciliation
- **Formula-to-Product Multi-Key Resolution**: Products (e.g., *acd churan*) linked to formulas/recipes (e.g., *abc pouder*) resolve manufactured finished goods stock bidirectionally using `recipeId`, `productId`, or formula names across the Product Catalog, Finished Goods table, and Packaging modals.
- **Zero-Config Startup Reconciler**: Automatically synchronizes recipe IDs, product IDs, and manufactured bulk stock from disk on every server launch, ensuring zero stock discrepancies after app restarts.

### 3. 🍾 Real-Time Container Packaging & Capacity Feasibility
- **Dimension-Aware Capacity Math**: Dynamically calculates `maxFeasibleBottles` across arbitrary unit pairs (e.g., $5\text{ kg}$ bulk yields exactly $10 \times 500\text{ g}$ containers or $5 \times 1\text{ kg}$ containers).
- **Overfilling & Insufficient Stock Protection**: Server-side and client-side guards reject bottling quantities exceeding available bulk inventory with clear, dimension-aware feedback.

### 4. 📦 Packaging Containers, Boxes & Multi-Unit Variation Architecture
- **Universal Container & Packaging Support**: Variations are never artificially restricted to volume (`mL`, `L`) or weight (`g`, `kg`). The system natively supports discrete packaging units: `box`, `carton`, `bottle`, `container`, `packet`, `pouch`, `jar`, `can`, `strip`, `tube`, `vial`, `bag`, `roll`, `drum`, `pcs`, and custom units. Bulk manufactured goods (liquid, powder, or granules) can be packaged into discrete containers or boxes without dimension mismatch errors.
- **Single Source of Truth for Containers**: Product Variations never manually own, duplicate, or store empty bottle/container stock. The selected packaging item (`packagingRawMaterialId`) in `data/raw_materials.json` and `data/raw_material_batches.json` serves as the sole source of truth for container stock, vendor lots, purchase costs, and FIFO balances.
- **Allocation Rules (FIFO vs. Preferred Vendor)**:
  - **FIFO (Oldest Batch First)**: Packaging containers are deducted sequentially by inward purchase date (`purchaseDate`/`createdAt`).
  - **Preferred Vendor**: Prioritizes batches from a specific chosen supplier (matching by `vendorId`, `vendorName`, or `supplier`), falling back gracefully to FIFO if the preferred vendor has insufficient container stock.
- **Dynamic Live Vendor Discovery**:
  - The variation modal dynamically detects and populates all active vendors associated with the selected packaging raw material in real time, displaying active stock per vendor (e.g. `Vendor A Bottles Pvt Ltd (40 pcs available)`).
  - Seamless fallback to all known material vendors if a container has no inward purchase batches recorded yet.
- **Synchronized Bottling & Packaging Runs**:
  - Executing a bottling run (`POST /api/products/:id/fill-bottles`) performs synchronized atomic deductions:
    1. Deducts bulk manufactured goods from Finished Goods (`finished_goods.json`).
    2. Deducts packaging containers from Raw Material inventory (`raw_materials.json`) and specific vendor batches (`raw_material_batches.json`).
- **Traceable `VARIANT_PACKAGING` Operations**: Every packaging deduction logs full allocation details (`batchId`, `supplierBatchNumber`, `vendorName`, `quantity`, `unitCost`) in `raw_material_transactions.json` and emits an `INVENTORY_OUT` event in `manufacturing_audit.json`.
- **Zero Double Deduction on Sales Invoices**: Retail sales invoices deduct **strictly and solely** from ready-to-sell packaged stock (`variant.stock`). Bulk manufacturing vats and raw material containers are never deducted upon commercial invoicing.
- **Deletion Impact Analysis (`GET .../deletion-impact`)**: Real-time impact queries calculate current finished goods stock, reversible packaging transaction history, and associated raw packaging material balances before variation deletion.
- **Controlled Reversal vs. Discard Governance (`DELETE .../variants/:id`)**:
  - **`REVERSE`**: Automatically unwinds packaging allocations, restores container inventory back to original Raw Material batches, records `TRANSACTION_REVERSAL` in transactions, and emits `TRANSACTION_REVERSAL` and `INVENTORY_IN` audit records with shared correlation IDs (`AUD-YYYY-NNNNNN`).
  - **`DISCARD`**: Safely writes off finished inventory without restoring raw packaging, emitting an `INVENTORY_ADJUSTMENT` audit record.
- **Physical JSON Removal**: Deleting a variation executes `.splice()` removal from `product.variants[]` in `products.json`.
- **Permanent Audit Memory Preservation**: Full immutable snapshots of deleted variations are saved to `manufacturing_audit.json` with mandatory user reasons.
- **Strict Dependency Guard**: Deleting a Raw Material (`DELETE /api/raw-materials/:id`) is blocked with HTTP 400 if any product variation references it as packaging, logging `DEPENDENCY_BLOCK` to the security audit trail.
- **Clear Audit Guarantees**: Clearing audit ledgers purges audit memories but **never** restores deleted variations to `products.json`.

### 5. 🗑️ Strict Destructive Actions & JSON Source Synchronization
- **Mandatory Deletion Reasons**: Every destructive action (Clear, Delete, Remove, Purge) throughout InvoiceWise requires a mandatory reason before execution.
- **Top-Level Priority Stacking**: Deletion modal is styled with priority z-index (`13000`), ensuring it always sits in front of all drawer panels and modals.
- **Instant Dialog Dismissal**: The confirmation dialog box immediately closes upon confirmation, preventing hanging overlays while data reloads.
- **Immediate JSON Source Purging**: Records are permanently spliced from primary JSON files (`products.json`, `recipes.json`, `finished_goods.json`, `manufacturing_batches.json`, `raw_materials.json`).
- **Zero-Orphan Reference Cleanup**:
  - Deleting a **Product** automatically clears `recipe.productId` in `recipes.json` and `fg.productId` in `finished_goods.json`.
  - Deleting a **Recipe** clears `product.recipeId` in `products.json` and `fg.recipeId` in `finished_goods.json`.
  - Deleting a **Manufacturing Batch** clears `fg.manufacturingBatchId` references.
  - Deleting a **Finished Good** resets `product.bulkStock` to `0` in `products.json`.
  - Deleting a **Vendor** purges the vendor lot, recalculates parent raw material stock, and logs a deleted vendor record.
- **Audit Memory Preservation**: Deleted items are recorded as permanent audit memories in `manufacturing_audit.json` with exact date, time, quantity, and valuation.
- **Complete 4-Store Audit Memory Purge**: The "Clear All Audit Ledgers" action completely wipes all 4 audit/transaction JSON files:
  1. `raw_material_transactions.json`
  2. `finished_goods_transactions.json`
  3. `manufacturing_audit.json`
  4. `recipe_history.json`

### 6. 🛡️ Multi-Batch Lineage, Inward Purchases & Quick Stock Addition
- **Quick Inward Stock Entry (`+ Add Stock`)**: One-click action button placed right alongside `+ Add Raw Material` in the Material Inventory header to immediately record inward purchase receipts, assign supplier lot numbers, and update stock without digging through sub-menus.
- **Traceable Inward Lots (`RMB-YYYY-NNNN`)**: Every raw material purchase is cataloged with supplier lot numbers, supplier GSTIN, expiry dates, received dates, warehouse storage locations, and Certificate of Analysis (COA) compliance statuses (`PASSED`).
- **Complete End-to-End Batch Lineage**: Inspect the full lifecycle of any manufacturing batch — see the exact raw material lots consumed, quantities deducted, resulting finished goods batches produced (`FGB-YYYY-NNN`), and down to the specific sales tax invoices (`INV-YYYY-NNNN`) billed to customers.
- **Strict Stock Invariants**: The backend reconciler guarantees $\text{Parent Total Stock} = \sum_{\text{active child batches}} (\text{Remaining Stock})$ across all materials.

### 7. ⛓️ Cryptographic Manufacturing Audit Ledger
- **Immutable Ledger Chaining**: Every inward receipt, lot consumption, batch completion, and stock adjustment is logged with cryptographic hash chaining (`GENESIS` $\rightarrow$ preceding entry hash $\rightarrow$ current SHA-256 hash).
- **Audit Ledger Export**: Export the complete tamper-evident audit ledger to Excel (`.xlsx`) or JSON with full correlation IDs (`AUD-YYYY-NNNNNN`) for regulatory compliance (FDA/GMP/ISO).

### 8. 🧪 Advanced BOM Recipe Engine & Vendor Preference Allocation
- **Multi-Stage Formulations**: Create BOM recipes with exact percentage ratios, yields, and step-by-step SOP instructions.
- **Vendor Preference Logic**: Assign supplier priority rules (e.g. prioritize *Apex BioCorp* lots first, or fall back to standard FIFO).
- **Multi-Vendor Ingredient BOM Support**: Add multiple ingredient rows for the same raw material sourced from different vendors.

### 9. 📝 Side-by-Side Floating Scratchpad & Docked Vertical Calculator
- **Concurrent Side-by-Side Operation**: Open both the Scratchpad (📝) and Financial Calculator (🧮) at the same time. The Calculator automatically docks neatly next to the Scratchpad without overlapping.
- **Docked Vertical Dragging (Up & Down)**: Grab the header handle (`↕️ 🧮 Calculator`) to adjust the calculator's height anywhere along your screen. It remains stably docked to the right side (or adjacent to the Scratchpad) without detaching across the desk.
- **Instant Close (`×`) & Escape Support**: Click the top-right cross button (`×`) or press `Escape` to instantly slide the calculator out of view.
- **Movable Circular Floating Tabs**: Both circle icons can be dragged freely up and down anywhere along the right screen edge. Positions persist in `localStorage`.

### 10. 🧾 GST Rule 46 Compliant Tax Invoicing & Full-Cycle Audit Trail
- **Strict Variant Invoicing Requirement & Zero Orphan Sales**: Commercial sales invoices deduct **strictly and solely** from ready-to-sell finished packaged variant stock (`variant.stock`). Products without container/packaging variants are strictly forbidden from being added to invoices or billed. The invoice builder alerts the user if an unconfigured product is chosen, marks the item in red, and disables the save action until a variant is configured in the catalog. The backend enforces this with HTTP 400 validation, eliminating silent zero-deduction invoice bypasses.
- **Real-Time Stock Depletion & Insufficient Stock Locks**: Line items highlight in red if the invoiced quantity exceeds available packaged variant stock, dynamically locking the "Save & Print" and "Save as Draft" buttons.
- **Multi-Tax Logic**: Automatic detection of Intra-State billing (CGST + SGST split) vs. Inter-State billing (IGST) based on customer state codes.
- **A4 Tax Invoice Engine**: Pixel-perfect print and PDF export with HSN/SAC summaries, company bank details, QR code placeholder, and legal disclaimers.

### 11. 💾 100% Local-First JSON Architecture & Error-Tolerant Importer
- **14 Independent Data Stores**: All data is stored in human-readable, atomic JSON files.
- **Smart Modular Section Importer**: Resilient JSON parser that handles raw snippets, stripped commas, unbracketed single records, and full backups with automatic preview and safety snapshots.

---

## 🏗️ Architecture & Multi-Tier Inventory Synchronization

InvoiceWise operates on a strict multi-tier inventory model to ensure mathematical precision and prevent stock drift:

```
[Raw Materials: Ingredients & Packaging Containers]
   │
   ├─► (1. Formulation Run) ──► [Finished Goods Bulk Pool]
   │                                   │
   └─► (2. Bottling Run) ──────────────┴──► [Packaged Product Variations (SKUs)]
                                                   │
                                                   ▼
                                       (3. GST Sales Invoicing) ──► [Sold to Customer]
```

| Event / Action | Raw Material Batches (Ingredients & Containers) | Finished Goods Bulk Pool | Variant Packaged Stock (Ready-to-Sell) |
| :--- | :--- | :--- | :--- |
| **1. Inward Purchase** | 📈 **Added** (New RMB batch lot with vendor & lot #) | ── (Untouched) | ── (Untouched) |
| **2. Bulk Manufacturing Batch** | 📉 **Deducted** (Consumed formulation ingredients via FIFO/Vendor) | 📈 **Added** (New FGB bulk yield) | ── (Untouched) |
| **3. Packaging / Bottling Run** | 📉 **Deducted** (Packaging containers deducted via FIFO or Preferred Vendor) | 📉 **Subtracted** (Consumed bulk volume/mass in base units) | 📈 **Increased** (Finished packaged bottles/jars) |
| **4. Sales Tax Invoicing** | ── (Untouched — No double deduction!) | ── (Untouched) | 📉 **Deducted** (Sold retail units) |
| **5. Invoice Cancellation** | ── (Untouched) | ── (Untouched) | 📈 **Restored** (Returned retail units) |
| **6. Variant Deletion (`REVERSE`)** | 📈 **Restored** (Unwinds packaging allocations back to original vendor batches) | ── (Untouched) | 🗑️ **Removed** (Variation spliced from `products.json`) |
| **7. Variant Deletion (`DISCARD`)** | ── (Untouched — Container inventory written off) | ── (Untouched) | 🗑️ **Removed** (Variation spliced from `products.json`) |

---

## 📁 Project Directory Structure

```
invoicewise/
├── data/                                    # Local JSON Database Stores
│   ├── settings.json                        # Company profile, GSTIN, PAN, bank info
│   ├── raw_materials.json                   # Master raw material items & reorder thresholds
│   ├── raw_material_batches.json            # Inward supplier lots (RMB-YYYY-NNNN)
│   ├── raw_material_transactions.json       # Inward & consumption transaction ledger
│   ├── products.json                        # Finished goods catalog & retail variants
│   ├── customers.json                       # Customer master & GST registration profiles
│   ├── recipes.json                         # BOM production formulas & vendor preferences
│   ├── recipe_history.json                  # Recipe version audit history
│   ├── manufacturing_batches.json           # Production batch runs (MFG-YYYYMMDD-NNNNN)
│   ├── manufacturing_audit.json             # Immutable cryptographic audit trail & deletion memories
│   ├── finished_goods.json                  # Manufactured finished goods bulk inventory
│   ├── finished_goods_transactions.json     # Finished goods inward/outward ledger
│   ├── invoices.json                        # GST tax invoices & payment tracking
│   └── notes.json                           # Scratchpad notes & SOP reminders
├── public/                                  # Frontend Single Page Application
│   ├── index.html                           # App shell, modals, calculator & scratchpad
│   ├── app.js                               # Core SPA state, ERP renderers & handlers
│   ├── style.css                            # Modern glassmorphism UI & responsive styling
│   ├── invoice-print.js                     # Rule 46 A4 invoice print formatter
│   ├── unitConversion.js                    # Unit conversion engine (mass, vol, count)
│   └── logo.png                             # Application branding icon
├── main.js                                  # Electron desktop runtime entry point
├── server.js                                # Express backend & ERP business logic
├── seed-sample-data.js                      # Comprehensive testing dataset populator
├── package.json                             # Dependencies & Electron-Builder config
└── dist/                                    # Windows Production Release Binaries
    ├── InvoiceWise 3.1.0.exe                # Standalone Portable EXE (No install needed)
    └── InvoiceWise Setup 3.1.0.exe          # Windows NSIS Installation Wizard
```

---

## 📦 Windows Release Executables

Pre-compiled production binaries for Windows (64-bit) are located in the project root and [`dist/`](dist/):

| Executable | File Path | Description |
| :--- | :--- | :--- |
| **Standalone Portable EXE** | [`InvoiceWise 3.1.0.exe`](InvoiceWise%203.1.0.exe) | Double-click to run immediately without installation. Ideal for USB drives and portable workstations. |
| **Windows NSIS Installer** | [`InvoiceWise Setup 3.1.0.exe`](InvoiceWise%20Setup%203.1.0.exe) | Standard Windows setup wizard with Start Menu shortcuts and uninstaller. |

---

## 🚀 Development & Build Instructions

### Prerequisites
- Node.js 18+ LTS
- Windows 10/11 64-bit

### 1. Installation
```bash
# Clone or navigate to the repository
cd invoicewise

# Install project dependencies
npm install
```

### 2. Run Locally in Browser
```bash
# Starts the local backend server on port 3000
npm start

# Open http://localhost:3000 in your browser
```

### 3. Run in Desktop Electron Mode
```bash
npm run electron:start
```

### 4. Deep QA, Failure Injection & Data Integrity Verification
```bash
# Execute the Master Deep QA & Hardening Test Suite (24 automated tests covering Sections 1–33)
npm run qa:deep

# Run standalone 15-point Data Integrity Scanner across all 14 stores
npm run verify:integrity
```

### 5. Production Data Sanitization (Fresh Project Reset)
```bash
# Cleans and resets all 14 data stores in both project data/ and Windows AppData to a fresh pristine state
npm run clean
```

### 6. Compile Windows Executables (.exe)
```bash
npm run dist:win
```
This packages the 100% fresh, sanitized data stores into both the **Standalone Portable Executable** and the **NSIS Installer Wizard** in `dist/`.

---

## 🔒 Cryptographic Audit Chain & Integrity Assurance

InvoiceWise 3.1.0 incorporates enterprise audit security:
- **SHA-256 Chaining**: Each audit entry hashes timestamp, event type, entity ID, previous entry hash, and transaction payloads.
- **Verification Endpoint**: `GET /api/manufacturing-audit/verify` returns cryptographic chain validation status and total verified blocks.
- **Concurrency Locks**: Synchronized in-memory mutexes and atomic `.inventory.lock` guards prevent race conditions and double-invoice inventory consumption.
- **Mathematical Invariant Assurance**: Automatic startup and test verification guarantees $\text{Parent RM Stock} = \sum \text{Batches}$ with zero floating-point drift.

---

## 📜 License
Copyright © 2026 InvoiceWise Intelligence. All rights reserved.
