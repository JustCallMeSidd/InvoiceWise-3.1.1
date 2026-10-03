const fs = require('fs');
const path = require('path');

const markdownContent = `# InvoiceWise 2.0 — Complete System Workflow, Direction, Architecture, Data Input & Value Formation Document

**Document Identifier:** DOC-IW-V2-MASTER  
**Release Version:** Version 2.0.0 (Enterprise ERP Edition)  
**Classification:** Master Technical Architecture & System Reference Blueprint  
**Date:** August 2026  
**Author:** InvoiceWise Core Architecture & Engineering Team  

---

## Executive Summary

**InvoiceWise 2.0** is a specialized, standalone Manufacturing Enterprise Resource Planning (ERP) and GST Tax Billing system engineered specifically for batch-formulation manufacturers, chemical processors, cosmetic producers, and FMCG distributors. 

Version 2.0 introduces a decoupled multi-layer inventory architecture, an atomic Bill of Materials (BOM) calculation engine, dynamic unit conversion pipelines, real-time packaging yield calculators, strict inventory isolation rules, and multi-format JSON enterprise data portability—all operating within a secure, zero-cloud-overhead local desktop environment.

This document serves as the master end-to-end technical reference and operational blueprint for Version 2.0.

---

# 1. Overall System Direction

### 1.1 Vision & Purpose
The overarching vision of InvoiceWise 2.0 is to eliminate the severe operational disconnect between **raw material chemical formulation**, **shop-floor batch manufacturing**, **container bottling packaging**, and **statutory GST commercial invoicing** for small-to-midsize industrial enterprises (SMEs).

Traditional billing applications treat inventory as static numbers, ignoring the conversion of liquid chemical batches into multiple packaged stock-keeping units (SKUs). Conversely, heavy enterprise ERPs introduce excessive cost, internet latency, complex configuration, and rigid cloud architectures. InvoiceWise 2.0 bridges this gap with an intuitive, deterministic, local-first ERP that operates with micro-unit precision down to the milliliter and milligram.

### 1.2 Core Problems Solved
1. **Chemical Conversion Disconnect:** Formulating raw ingredients into bulk liquids and packaging that liquid into multiple container sizes (e.g., $100\\text{ mL}$, $200\\text{ mL}$, $500\\text{ mL}$, $5\\text{ L}$) without stock double-counting or unit mismatch.
2. **Inventory Overdraft & Stock Corruption:** Accidental deductions where invoice creation erroneously pulls from bulk manufacturing vats rather than packaged retail inventory.
3. **Complex Unit Interoperability:** Discrepancies when purchasing raw materials in kilograms or liters, formulating in grams or milliliters, and invoicing in bottles or boxes.
4. **GST Rule 46 Compliance Friction:** Manual tax calculation errors across intra-state (CGST + SGST) and inter-state (IGST) sales, HSN/SAC code tracking, and tax invoice generation.
5. **Data Lock-in & Backup Fragility:** Inability to easily migrate or back up complete operational datasets without specialized database administration skills.

### 1.3 Primary Stakeholders & User Personas
- **Chemical / Formulation Engineers & R&D:** Define precise BOM recipes, constituent ingredient ratios, and cost-per-bottle projections.
- **Plant Operations & Production Managers:** Check raw material feasibility, execute manufacturing runs, track batch yields, and package bulk liquids into finished variants.
- **Warehouse & Inventory Controllers:** Monitor raw material stocks, track minimum reorder points, record supplier inward deliveries, and maintain audit integrity.
- **Billing & Sales Accountants:** Issue GST Rule 46 tax invoices, manage customer credit/payment terms, and handle sales returns with restock controls.
- **Business Owners & Managing Directors:** Review executive dashboards, anomaly analytics, production gross margins, and overall business health.

### 1.4 Major Capabilities Matrix
- **BOM Formulation Engine:** Multi-ingredient recipe builder with dynamic base batch scaling and real-time cost-per-container analysis.
- **Atomic Batch Manufacturing:** Automated feasibility checks, shortage detection, atomic raw material deduction, and bulk finished goods logging.
- **Multi-Variant Packaging Engine:** Real-time container capacity determination with live "Max Feasible Stock" metrics.
- **Decoupled 4-Rule Stock Isolation:** Strict isolation guaranteeing invoice sales deduct only packaged variant units without altering bulk manufacturing vats.
- **Rule 46 GST Compliance:** Automated tax engine with B2B/B2C categorization, HSN lookup, and print-ready A4 documentation.
- **Universal Multi-Format Data Portability:** Smart JSON import/export parser supporting camelCase, snake_case, and raw single-entity arrays with automated pre-import backup safeguards.

### 1.5 Key Principles & Design Philosophy
- **Local-First Determinism:** Zero external database server dependencies; all operational state is deterministically maintained in atomic JSON files.
- **Physical Reality Modeling:** Software states strictly mirror factory physical states (Raw Material Vat $\\rightarrow$ Manufacturing Reactor $\\rightarrow$ Bottling Line $\\rightarrow$ Retail Shelf $\\rightarrow$ Customer Delivery).
- **Zero-Loss Data Safety:** Every modifying operation writes atomically with snapshot backups created prior to major mutations.

### 1.6 Evolution from Version 1.0 to Version 2.0

| Architectural Dimension | Version 1.0 (Legacy) | Version 2.0 (Current ERP) |
| :--- | :--- | :--- |
| **Inventory Model** | Monolithic variant stock linked directly to product rows. | **Decoupled 3-Tier Hierarchy** (Raw Materials $\\rightarrow$ Finished Goods Bulk $\\rightarrow$ Variant SKUs). |
| **Manufacturing Logic** | Manual stock updates without recipe consumption. | **Atomic BOM Engine** with real-time chemical ingredient deductions. |
| **Unit Compatibility** | Limited basic unit handling. | **Multi-Dimension Unit Conversion Matrix** (Volume, Mass, Count). |
| **Packaging Workflow** | Implicit stock editing. | **Dedicated Bottling Modal & Max Feasible Yield Calculator**. |
| **Invoice Deduction** | Cascaded into bulk pools. | **Isolated Deduction** (Deducts only packaged bottle inventory). |
| **Data Import/Export** | Rigid string matching. | **Smart Multi-Format Parser** (camelCase, snake_case, standalone arrays). |
| **User Interface** | Basic dashboard. | **Glassmorphic Responsive Design System** with fluid micro-animations. |

---

# 2. End-to-End Workflow

The complete operational lifecycle of InvoiceWise 2.0 represents a closed-loop cyber-physical manufacturing and commerce pipeline:

\`\`\`
[Input] ──► [Validation] ──► [Processing] ──► [Transformation] ──► [Decision] ──► [Value Formation] ──► [Output] ──► [Feedback & Optimization]
\`\`\`

### 2.1 Stage-by-Stage Workflow Breakdown

\`\`\`mermaid
flowchart TD
    A[Procurement / Inward Stock] -->|Input Raw Materials| B(Raw Material Storage)
    B --> C{Recipe BOM Builder}
    C -->|Define Formulations| D[BOM Master Database]
    D --> E{Production Run Trigger}
    B -->|Feasibility Check| E
    E -->|Sufficient Stock| F[Execute Manufacturing Batch]
    E -->|Shortage Detected| G[Block Run & Generate PO Alert]
    F -->|Consume Ingredients| B
    F -->|Produce Bulk Yield| H[(Finished Goods Bulk Pool)]
    H --> I{Bottle Packaging Engine}
    I -->|Convert Bulk Volume| J[(Packaged Variant SKUs)]
    J --> K{Sales Invoicing Module}
    K -->|Issue GST Tax Invoice| L[Customer Delivery & Payment]
    K -->|Deduct Packaged Stock| J
    L --> M[Financial & Audit Ledgers]
    M --> N[Business Insights & Optimization]
    N -->|Reorder Triggers| A
\`\`\`

#### Stage 1: Data Acquisition & Procurement Inward
- **Trigger:** Delivery of chemical drums, solvents, oils, packaging boxes, or customer purchase orders.
- **Input:** Raw material name, category, measurement unit, purchase cost, inward quantity, supplier metadata.
- **Validation:** Unit normalization, positive integer/float bounds checking, duplicate name prevention.
- **Processing & Storage:** Update \`raw_materials.json\`; append transaction entry to \`raw_material_transactions.json\`.
- **Output:** Active raw material inventory with weighted average cost basis.

#### Stage 2: Recipe & BOM Formulation
- **Trigger:** Formulation engineer defining a standard product recipe.
- **Input:** Target product, base reference volume (e.g., $200\\text{ mL}$), constituent ingredient list with exact proportions.
- **Validation:** Compatibility check between ingredient measurement units and raw material inventory stock units.
- **Transformation:** Ingredient normalization into standard base units ($1\\text{ L} \\rightarrow 1,000\\text{ mL}$, $1\\text{ kg} \\rightarrow 1,000\\text{ g}$).
- **Output:** Stored BOM blueprint in \`recipes.json\` with automated cost-per-bottle projection.

#### Stage 3: Manufacturing Feasibility & Batch Execution
- **Trigger:** Plant operator initiating a production order for $N$ batch units.
- **Processing:** System runs real-time consumption calculations:
  $$\\text{Required Ingredient Qty} = \\text{Batch Units} \\times \\text{Recipe Qty}$$
- **Decision Engine:** If $\\text{Available Stock} < \\text{Required Qty}$ for *any* ingredient, transaction is aborted with explicit shortage metrics. If sufficient, the atomic commit executes:
  - Consumes exact quantities from raw material stores.
  - Adds produced liquid volume into **Finished Goods Bulk Pool** (\`finished_goods.json\`).
  - Logs immutable records in \`manufacturing_batches.json\` and transaction ledgers.
- **Output:** Manufactured bulk liquid ready for container packaging.

#### Stage 4: Container Packaging & Variant Distribution
- **Trigger:** Warehouse packaging line filling manufactured liquid into specific container sizes ($100\\text{ mL}$, $200\\text{ mL}$, $500\\text{ mL}$).
- **Processing:** Converts container sizes into standard volumetric units ($V_{\\text{container}}$ in $\\text{mL}$).
- **Transformation:**
  $$\\Delta V_{\\text{bulk}} = \\text{Bottles Filled} \\times V_{\\text{container}}$$
- **Decision:** Deducts $\\Delta V_{\\text{bulk}}$ from Finished Goods bulk inventory and adds equivalent bottle counts to retail variant stock in \`products.json\`.
- **Output:** Ready-to-sell packaged SKUs available for billing.

#### Stage 5: Commercial Invoicing & Statutory Tax Billing
- **Trigger:** Customer sales order placement.
- **Input:** Customer selection, line item selection (product + bottle variant), quantity, agreed unit rate.
- **Validation:** Verifies $\\text{Invoiced Qty} \\le \\text{Packaged Variant Stock}$.
- **Tax Processing:** Determines supply type based on State Code ($27 = \\text{Maharashtra}$):
  - **Intra-State:** $\\text{CGST} = \\text{Rate}/2$, $\\text{SGST} = \\text{Rate}/2$
  - **Inter-State:** $\\text{IGST} = \\text{Rate}$
- **Action & Isolation:** Deducts sold bottles from variant stock. **Finished Goods bulk stock and Raw Materials are 100% untouched.**
- **Output:** Printable GST Rule 46 Tax Invoice with unique fiscal serial number and transaction ledger recording.

#### Stage 6: Feedback, Auditing & Optimization Loops
- **Feedback:** Real-time stock reorder alerts when inventory drops below safety thresholds.
- **Audit:** Continuous movement tracking across \`raw_material_transactions.json\` and \`finished_goods_transactions.json\`.
- **Optimization:** Anomaly explanations, pricing intelligence, and production forecast recommendations via AI Assistant.

---

# 3. System Architecture

InvoiceWise 2.0 is structured as a **Four-Tier Clean Architecture** deployed within a high-performance desktop framework.

\`\`\`
┌──────────────────────────────────────────────────────────────────────────┐
│                   TIER 1: PRESENTATION & USER EXPERIENCE                 │
│  Single Page Application (SPA) • Glassmorphism UI • DOM Rendering Engine │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ REST HTTP / JSON APIs
┌────────────────────────────────────▼─────────────────────────────────────┐
│                 TIER 2: BUSINESS LOGIC & APPLICATION CORE                │
│  Manufacturing Calculator • Unit Conversion Matrix • GST Rule 46 Engine  │
│  Variant Stock Feasibility Calculator • Multi-Format JSON Parser Engine  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ File System I/O
┌────────────────────────────────────▼─────────────────────────────────────┐
│                 TIER 3: DATA PERSISTENCE & TRANSACTION LOGS              │
│  Atomic JSON Stores • Pre-Import Safety Snapshots • Immutable Ledgers    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Native OS Bindings
┌────────────────────────────────────▼─────────────────────────────────────┐
│                 TIER 4: DESKTOP RUNTIME & HOST CONTAINER                 │
│  Electron 28 Host Container • Chromium Engine • Node.js Runtime Bridge   │
└──────────────────────────────────────────────────────────────────────────┘
\`\`\`

### 3.1 Component Responsibility Matrix

| Architectural Layer | Core Module | Technical Implementation | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Presentation Tier** | **App SPA Container** | \`public/index.html\`, \`public/style.css\` | Responsive viewport, navigation state, design tokens, modal controllers. |
| **Presentation Tier** | **Reactive UI Engine** | \`public/app.js\` | Client-side routing, DOM updates, toast notifications, inline editors. |
| **Presentation Tier** | **Document Renderer** | \`public/invoice-print.js\` | Pixel-perfect A4 tax invoice print popups, CSS media print rules. |
| **Application Core** | **Express API Server** | \`server.js\` | HTTP routing, payload validation, atomic CRUD operations. |
| **Application Core** | **Unit Conversion Matrix** | \`unitConversion.js\` | Unit normalization, cross-dimension conversion, precision rounding. |
| **Application Core** | **Manufacturing Engine** | \`server.js\` (\`runManufacturingCalculation\`) | BOM scaling, ingredient shortage detection, production execution. |
| **Application Core** | **Tax Calculation Engine** | \`server.js\` (\`/api/invoices\`) | GST Rule 46 calculation, State Code determination, financial rounding. |
| **Application Core** | **Smart Import Parser** | \`server.js\` (\`/api/import-data\`) | Universal schema detection (camelCase, snake_case, raw arrays). |
| **Persistence Tier** | **Atomic File Engine** | \`server.js\` (\`writeJSONAtomic\`) | Temp-file staging, safe atomic replacement, snapshot backups. |
| **Persistence Tier** | **Database Stores** | \`data/*.json\` | Flat atomic JSON storage for products, customers, batches, ledgers. |
| **Runtime Container**| **Desktop Shell** | \`main.js\`, \`package.json\` | Single-instance lock, window lifecycle, embedded server orchestration. |

---

# 4. Data Input Architecture

### 4.1 Input Specification & Ingestion Matrix

| Data Entity | Primary Source | Ingestion Channel | Required Fields | Validation Constraints | Target Data Store |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Company Profile** | User Setup | Settings Form / JSON Import | \`businessName\`, \`businessGSTIN\`, \`businessState\` | 15-char GSTIN regex, valid 2-digit state code. | \`settings.json\` |
| **Raw Material** | Inward Procurement | UI Form / JSON Import | \`name\`, \`unit\`, \`stock\`, \`cost_per_unit\` | Unique name, normalized unit code, non-negative stock. | \`raw_materials.json\` |
| **BOM Recipe** | R&D / Production | Recipe Builder Modal | \`name\`, \`productId\`, \`ingredients[]\` | Valid linked product ID, non-empty ingredient array, valid qty. | \`recipes.json\` |
| **Product & SKU** | Catalog Manager | Catalog Form | \`name\`, \`sku\`, \`rate\`, \`gst_rate\` | Unique SKU, valid GST rate (0, 5, 12, 18, 28%), positive rate. | \`products.json\` |
| **Variant Bottle** | Packaging Line | Inline Catalog / Packaging Modal | \`bottleSize\`, \`bottleSizeUnit\`, \`price\` | Compatible volumetric unit, valid positive container capacity. | \`products.json\` (\`variants[]\`) |
| **Manufacturing Batch**| Plant Floor | Manufacturing Run Modal | \`recipeId\`, \`desiredQty\`, \`desiredUnit\` | Sufficient raw material stock, valid active recipe reference. | \`manufacturing_batches.json\` |
| **Customer** | Sales Desk | Customer Directory Form | \`name\`, \`state\`, \`phone\` | Valid phone format, optional GSTIN structure validation. | \`customers.json\` |
| **Sales Invoice** | Commercial Billing | Invoice Creator Workspace | \`customerName\`, \`date\`, \`items[]\` | Non-empty items array, requested quantity $\\le$ variant stock. | \`invoices.json\` |
| **Bulk Import Bundle** | External File | JSON File Upload / Drag-Drop | Valid JSON object or array | Schema validation (contains ERP data arrays or app identifier).| All Data Stores |

---

# 5. Data Flow & State Lifecycle

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as User / Operator
    participant UI as Browser SPA (app.js)
    participant API as Express API Server (server.js)
    participant Engine as Calculation Engine
    participant Disk as Atomic JSON Files (data/)

    Note over User,Disk: 1. Manufacturing Production Run
    User->>UI: Select Recipe & Enter Desired Qty (100 units)
    UI->>API: POST /api/manufacturing-batches/commit
    API->>Engine: runManufacturingCalculation(recipe, 100)
    Engine-->>API: Required Ingredients & Feasibility (OK)
    API->>Disk: Deduct Ingredients in raw_materials.json
    API->>Disk: Add Produced Bulk Volume in finished_goods.json
    API->>Disk: Append Log in manufacturing_batches.json
    API-->>UI: 200 OK (Batch Committed & Stocks Updated)
    UI-->>User: Success Notification & Updated Dashboard

    Note over User,Disk: 2. Bottle Packaging
    User->>UI: Package 30 Bottles of 100 mL
    UI->>API: POST /api/products/:id/fill-bottles
    API->>Disk: Deduct 3,000 mL from finished_goods.json
    API->>Disk: Add +30 Bottles to products.json (variants)
    API-->>UI: 200 OK (Bottles Packaged)
    UI-->>User: Display Packaged Stock (30 pcs)

    Note over User,Disk: 3. Commercial Invoicing
    User->>UI: Create Invoice (5x 100 mL Bottles)
    UI->>API: POST /api/invoices
    API->>Engine: Validate Invoiced Qty <= Variant Stock
    API->>Disk: Deduct -5 Bottles in products.json (variants)
    API->>Disk: Append Invoice in invoices.json
    Note over API,Disk: Finished Goods and Raw Materials are 100% UNTOUCHED
    API-->>UI: 201 Created (Invoice Generated)
    UI-->>User: Open Print-Ready A4 Tax Invoice
\`\`\`

### 5.1 State Persistence Lifecycle
1. **Creation:** Initialized via REST endpoints; assigned formatted unique IDs (\`RM-XXXXXX\`, \`RCP-XXXXXX\`, \`PRD-XXXXXX\`, \`INV-XXXXXX\`, \`MFG-XXXXXX\`).
2. **Mutation:** Updated through atomic writes. In-memory data structures are deeply cloned, modified, validated, and flushed via atomic temporary file renaming.
3. **Retention:** Historical production batches, invoices, and transaction ledgers are retained indefinitely for statutory compliance.
4. **Disposal:** Hard deletions (e.g., deleting a customer or product) perform integrity checks and update disk collections immediately.

---

# 6. Value Formation Architecture

InvoiceWise 2.0 transforms raw business inputs into multi-dimensional enterprise value through a structured transformation hierarchy:

\`\`\`
Raw Input Data ──► Structured Information ──► Operational Insights ──► Deterministic Decisions ──► Enterprise Value
\`\`\`

### 6.1 Value Transformation Stages

\`\`\`
┌──────────────────┐
│  RAW DATA INPUT  │ Chemical inward prices, raw inventory counts, batch volumes, customer state codes.
└────────┬─────────┘
         ▼
┌──────────────────┐
│   INFORMATION    │ Standardized units (mL, g), normalized GSTINs, BOM recipe cost-per-bottle.
└────────┬─────────┘
         ▼
┌──────────────────┐
│     INSIGHT      │ Real-time production feasibility, ingredient shortage gaps, max feasible yields.
└────────┬─────────┘
         ▼
┌──────────────────┐
│     DECISION     │ Block unfeasible batches, deduct exact liquid volumes, enforce variant stock limits.
└────────┬─────────┘
         ▼
┌──────────────────┐
│      ACTION      │ Automated atomic commits, generation of Rule 46 invoices, ledger journaling.
└────────┬─────────┘
         ▼
┌──────────────────┐
│ ENTERPRISE VALUE │ 100% stock precision, zero tax penalties, optimized working capital, instant audits.
└──────────────────┘
\`\`\`

### 6.2 Dimensions of Value Realization
- **Operational Precision:** Elimination of manual inventory math errors; formulations scale automatically without volumetric discrepancies.
- **Financial & Working Capital Control:** Real-time visibility into raw material holding costs, preventing over-purchasing and dead stock accumulation.
- **Statutory & Tax Compliance Value:** Error-free GST Rule 46 invoices with automated state determination protect the enterprise from statutory audit penalties.
- **Automation & Velocity Value:** Immediate conversion of production runs into invoiceable bottle inventory accelerates order-to-cash cycles.
- **Governance & Audit Value:** Immutable dual-ledger tracking provides complete transparency for statutory auditors and management.

---

# 7. Business & Decision Logic

### 7.1 Unit Conversion Matrix
The conversion engine (\`unitConversion.js\`) standardizes measurements across three fundamental dimensions:

$$\\text{Dimension Compatibility Matrix}$$

| Dimension | Standard Base Unit | Supported Units & Conversion Multipliers |
| :--- | :--- | :--- |
| **Volume** | Milliliter ($\\text{mL}$) | $\\text{mL} = 1$, $\\text{L} = 1,000$, $\\text{kL} = 1,000,000$ |
| **Mass** | Gram ($\\text{g}$) | $\\text{mg} = 0.001$, $\\text{g} = 1$, $\\text{kg} = 1,000$, $\\text{t} = 1,000,000$ |
| **Count** | Piece ($\\text{pcs}$) | $\\text{pcs} = 1$, $\\text{bottle} = 1$, $\\text{box} = 1$, $\\text{roll} = 1$, $\\text{dozen} = 12$ |

- **Conversion Formula:**
  $$\\text{Value}_{\\text{target}} = \\frac{\\text{Value}_{\\text{source}} \\times \\text{Factor}_{\\text{source}}}{\\text{Factor}_{\\text{target}}}$$
- **Safety Fallback:** If units are mutually incompatible (e.g., attempting to convert $\\text{mL}$ to $\\text{kg}$ without specified density), the engine gracefully falls back to raw values while logging a warning.

### 7.2 Manufacturing Feasibility & Shortage Decision Logic
When an operator triggers a batch run of quantity $Q$ for recipe $R$:
1. For every ingredient $I_k \\in R.\\text{ingredients}$:
   - Locate corresponding raw material $M_k \\in \\text{raw\\_materials}$.
   - Convert required quantity $I_k.\\text{qty} \\times Q$ into $M_k.\\text{unit}$.
   - Compute available stock: $S_k = M_k.\\text{current\\_stock}$.
   - Compute gap: $G_k = S_k - (I_k.\\text{qty} \\times Q)$.
2. **Decision Rule:**
   $$\\text{If } \\min(G_k) < 0 \\implies \\mathbf{BLOCK\\_PRODUCTION}$$
   Return HTTP 400 with a detailed shortage breakdown for missing ingredients.
   $$\\text{If } \\min(G_k) \\ge 0 \\implies \\mathbf{EXECUTE\\_ATOMIC\\_COMMIT}$$

### 7.3 Maximum Feasible Container Yield Calculation
In the Product Catalog, every bottle variant displays the maximum number of containers that could be filled from remaining manufactured bulk liquid:

$$\\text{Max Feasible Bottles} = \\left\\lfloor \\frac{\\text{Available Bulk Volume (mL)}}{\\text{Variant Bottle Capacity (mL)}} \\right\\rfloor$$

### 7.4 Decoupled 4-Rule Stock Isolation Logic
InvoiceWise 2.0 enforces strict transactional isolation across inventory pools:

$$\\begin{cases}
\\text{Manufacturing Commit} & \\implies \\Delta \\text{RawMaterials} < 0, \\; \\Delta \\text{FinishedGoods} > 0, \\; \\Delta \\text{VariantStock} = 0 \\\\
\\text{Bottle Packaging} & \\implies \\Delta \\text{RawMaterials} = 0, \\; \\Delta \\text{FinishedGoods} < 0, \\; \\Delta \\text{VariantStock} > 0 \\\\
\\text{Invoice Creation} & \\implies \\Delta \\text{RawMaterials} = 0, \\; \\Delta \\text{FinishedGoods} = 0, \\; \\Delta \\text{VariantStock} < 0 \\\\
\\text{Invoice Cancellation} & \\implies \\Delta \\text{RawMaterials} = 0, \\; \\Delta \\text{FinishedGoods} = 0, \\; \\Delta \\text{VariantStock} > 0
\\end{cases}$$

### 7.5 Statutory GST Rule 46 Tax Logic
- **State Code Determination:**
  $$\\text{Tax Regimen} = \\begin{cases} \\text{Intra-State (CGST + SGST)}, & \\text{if } \\text{Customer State Code} = \\text{Company State Code} \\\\ \\text{Inter-State (IGST)}, & \\text{if } \\text{Customer State Code} \\ne \\text{Company State Code} \\end{cases}$$
- **Line Item Computations:**
  $$\\text{Taxable Value} = \\text{Quantity} \\times \\text{Unit Price} - \\text{Discount}$$
  $$\\text{CGST Amount} = \\text{Taxable Value} \\times \\left( \\frac{\\text{GST Rate}}{200} \\right)$$
  $$\\text{SGST Amount} = \\text{Taxable Value} \\times \\left( \\frac{\\text{GST Rate}}{200} \\right)$$
  $$\\text{IGST Amount} = \\text{Taxable Value} \\times \\left( \\frac{\\text{GST Rate}}{100} \\right)$$
  $$\\text{Grand Total} = \\text{Taxable Value} + \\text{Total Tax Amount}$$

---

# 8. Data Model Specification

\`\`\`mermaid
erDiagram
    COMPANY_SETTINGS ||--o{ PRODUCTS : manages
    COMPANY_SETTINGS ||--o{ CUSTOMERS : bills
    RAW_MATERIALS ||--o{ RECIPE_INGREDIENTS : used_in
    RECIPES ||--|{ RECIPE_INGREDIENTS : contains
    PRODUCTS ||--o{ RECIPES : formulated_by
    PRODUCTS ||--|{ PRODUCT_VARIANTS : packages_into
    PRODUCTS ||--o{ FINISHED_GOODS : bulk_pool
    RECIPES ||--o{ MANUFACTURING_BATCHES : executed_as
    CUSTOMERS ||--o{ INVOICES : billed_to
    INVOICES ||--|{ INVOICE_ITEMS : contains
    PRODUCT_VARIANTS ||--o{ INVOICE_ITEMS : sold_as
    RAW_MATERIALS ||--o{ RAW_MATERIAL_TRANSACTIONS : audited_in
    FINISHED_GOODS ||--o{ FINISHED_GOODS_TRANSACTIONS : audited_in
\`\`\`

### 8.1 Core Entities & Field Definitions

#### Entity 1: \`raw_materials\`
- \`id\` (String, Primary Key): Unique identifier (\`RM-000001\`).
- \`name\` (String): Name of raw material / chemical.
- \`category\` (String): Functional category (Solvent, Oil, Packaging).
- \`unit\` (String): Normalized unit code (\`mL\`, \`g\`, \`kg\`, \`pcs\`).
- \`current_stock\` (Float): Current physical balance on hand.
- \`reorder_point\` (Float): Minimum safety threshold trigger.
- \`cost_per_unit\` (Float): Unit acquisition cost basis (INR).
- \`supplier\` (String): Primary vendor name.

#### Entity 2: \`recipes\`
- \`id\` (String, Primary Key): Unique identifier (\`RCP-000001\`).
- \`name\` (String): Descriptive formulation title.
- \`productId\` (String, Foreign Key): Associated product reference.
- \`bottleSize\` (Float): Reference batch volume.
- \`bottleSizeUnit\` (String): Unit of reference volume (\`mL\`).
- \`ingredients\` (Array): Array of ingredient objects:
  - \`raw_material_id\` (String, Foreign Key)
  - \`raw_material_name\` (String)
  - \`qty\` (Float): Required quantity per reference unit.
  - \`unit\` (String): Measurement unit.

#### Entity 3: \`products\`
- \`id\` (String, Primary Key): Unique identifier (\`PRD-000001\`).
- \`name\` (String): Finished product brand name.
- \`sku\` (String): Stock Keeping Unit master code.
- \`hsn_sac\` (String): 4-to-8 digit statutory GST classification code.
- \`rate\` (Float): Default wholesale / retail selling price.
- \`gst_rate\` (Float): Statutory GST slab percentage (0, 5, 12, 18, 28).
- \`recipeId\` (String, Foreign Key): Linked active BOM recipe.
- \`variants\` (Array): Packaged SKU containers:
  - \`variantId\` (String, Primary Key)
  - \`name\` (String): Full variant title (e.g., "Lavender Spray 100 mL").
  - \`bottleSize\` (Float): Container volume capacity.
  - \`bottleSizeUnit\` (String): Measurement unit (\`mL\`).
  - \`price\` (Float): Variant-specific selling price.
  - \`stock\` (Integer): Packaged, ready-to-sell inventory balance.

#### Entity 4: \`finished_goods\`
- \`id\` (String, Primary Key): Unique identifier (\`FG-000001\`).
- \`productId\` (String, Foreign Key): Linked product reference.
- \`name\` (String): Bulk stock name.
- \`bottleSize\` (Float): Base unit size.
- \`bottleSizeUnit\` (String): Unit code (\`mL\`).
- \`currentStock\` (Float): Available bulk manufactured batch stock.

#### Entity 5: \`invoices\`
- \`id\` (String, Primary Key): Unique identifier (\`INV-000001\`).
- \`invoiceNumber\` (String): Statutory invoice serial (\`INV/2026-27/0001\`).
- \`date\` (String, ISO Date): Billing date.
- \`customerName\` (String): Customer business name.
- \`customerGSTIN\` (String): Customer tax registration.
- \`items\` (Array): Invoiced line items (\`productId\`, \`variantId\`, \`quantity\`, \`rate\`, \`gstRate\`).
- \`subtotal\` (Float): Total taxable value.
- \`gstAmount\` (Float): Total statutory tax component.
- \`grandTotal\` (Float): Final payable amount (INR).
- \`status\` (String): Payment status (\`Paid\`, \`Pending\`, \`Overdue\`).

---

# 9. APIs & Integrations Catalog

All endpoints communicate via standard HTTP REST with JSON payloads.

| Method | Route | Purpose | Request Body Highlights | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| \`GET\` | \`/api/stats\` | Dashboard metrics | None | Revenue, low stock counts, manufacturing runs. |
| \`GET\` | \`/api/products\` | Retrieve product catalog | None | Array of products with nested variants. |
| \`POST\` | \`/api/products\` | Create/update product | \`name\`, \`sku\`, \`rate\`, \`variants[]\` | Created product entity. |
| \`POST\` | \`/api/products/:id/update-variant-stock\` | Direct variant stock set | \`variantId\`, \`newStock\` | Updated variant & deducted FG bulk stock. |
| \`POST\` | \`/api/products/:id/fill-bottles\` | Package bulk liquid | \`variantId\`, \`numberOfBottles\` | Updated variant stock & deducted bulk stock. |
| \`GET\` | \`/api/raw-materials\` | List raw materials | None | Raw material records with stock balances. |
| \`POST\` | \`/api/raw-materials\` | Add raw material | \`name\`, \`unit\`, \`stock\`, \`cost_per_unit\` | Created raw material record. |
| \`GET\` | \`/api/recipes\` | List BOM recipes | None | Array of active recipes with ingredients. |
| \`POST\` | \`/api/recipes\` | Save BOM recipe | \`name\`, \`productId\`, \`ingredients[]\` | Stored recipe blueprint. |
| \`POST\` | \`/api/manufacturing-batches/commit\` | Execute production | \`recipeId\`, \`desiredQty\`, \`desiredUnit\` | Batch record; deducts RM & adds FG stock. |
| \`GET\` | \`/api/finished-goods\` | List manufactured bulk | None | Current bulk liquid pool records. |
| \`GET\` | \`/api/invoices\` | List tax invoices | None | Complete invoice repository. |
| \`POST\` | \`/api/invoices\` | Generate tax invoice | \`customerName\`, \`items[]\` | Created invoice; deducts packaged stock. |
| \`DELETE\`| \`/api/invoices/:id\` | Cancel tax invoice | Query \`?restock=true\` | Deletion confirmation; restocks variant stock. |
| \`GET\` | \`/api/export-data\` | Full system backup | None | Timestamped JSON bundle download. |
| \`POST\` | \`/api/import-data\` | Universal data restore | Raw JSON bundle or array | Restoration summary & safety backup path. |

---

# 10. Security, Governance & Failure Handling

### 10.1 Security Architecture
- **Air-Gapped & Local-First:** InvoiceWise 2.0 operates entirely offline without mandatory cloud connections, protecting confidential proprietary chemical formulas and customer billing registries.
- **Single-Instance Enforcement:** Electron host enforces single-instance OS locks (\`requestSingleInstanceLock\`) to eliminate concurrent file-write conflicts.
- **Pre-Import Disaster Safeguards:** Prior to overwriting data during an import operation, the server automatically flushes an immutable snapshot to \`data/pre_import_backup.json\`.

### 10.2 Failure Recovery Matrix

| Scenario | Detection Mechanism | System Action & Response | User Impact |
| :--- | :--- | :--- | :--- |
| **Raw Material Shortage** | Pre-commit feasibility calculation. | Rejects manufacturing commit with HTTP 400 and explicit shortage metrics. | Operator is notified of exact missing quantities; inventory is preserved. |
| **Variant Overdraft on Billing** | Invoice item stock limit check. | Blocks invoice creation with HTTP 400 stating requested vs. available bottles. | Prevents overselling unbottled stock. |
| **Malformed JSON Import** | Smart schema validation parser. | Rejects import with explicit schema requirements; preserves existing database. | Displays toast error; zero data corruption. |
| **File I/O Interruption** | Atomic temporary file writing. | Writes to \`file.tmp\` first before atomic replacement. | Prevents partial or corrupted JSON state. |

---

# 11. Concrete Traceability Walkthrough

To demonstrate exact end-to-end data lineage in Version 2.0, trace the lifecycle of **Lavender Oil ($10,000\\text{ mL}$)** through to a customer invoice:

\`\`\`
1. Inward Delivery:
   - 10,000 mL Lavender Oil entered (RM-000001). Stock = 10,000 mL.
   
2. BOM Recipe Association:
   - Recipe "Lavender Sanitizer" (RCP-000001) configured with 40 mL Lavender Oil per 200 mL bottle base.
   
3. Batch Manufacturing Commit:
   - Operator manufactures 100 units (20,000 mL total liquid).
   - System consumes: 100 × 40 mL = 4,000 mL Lavender Oil.
   - Raw Material Balance: 10,000 - 4,000 = 6,000 mL.
   - Finished Goods Bulk Stock Created: 100 pcs (20,000 mL).
   
4. Container Packaging:
   - Packaging line boxes 50 bottles of 100 mL size.
   - Liquid volume packaged: 50 × 100 mL = 5,000 mL (25 base units).
   - Finished Goods Bulk Balance: 100 - 25 = 75 pcs (15,000 mL).
   - Variant SKU Stock (100 mL): 0 + 50 = 50 bottles in stock.
   - Max Feasible 100 mL Bottles Remaining: 15,000 / 100 = 150 bottles.
   
5. Tax Invoicing:
   - Sales desk bills 10 bottles of 100 mL to Acme Stores (INV/2026-27/0001).
   - Variant SKU Stock (100 mL): 50 - 10 = 40 bottles.
   - Finished Goods Bulk Stock: 75 pcs (100% UNTOUCHED).
   - Raw Material Stock: 6,000 mL (100% UNTOUCHED).
\`\`\`

---

# 12. Master System Blueprint

\`\`\`
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             INVOICEWISE 2.0 MASTER BLUEPRINT                             │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  [PROCUREMENT] ──► Raw Materials (mL, g, kg, pcs) ──► Inward Audit Ledger                │
│                            │                                                             │
│                            ▼                                                             │
│  [FORMULATION] ──► BOM Recipe Engine (Scaled Ingredient Proportions & Costing)           │
│                            │                                                             │
│                            ▼                                                             │
│  [MANUFACTURING] ─► Atomic Batch Execution ──► Bulk Finished Goods Pool (L / mL)         │
│                            │                                                             │
│                            ▼                                                             │
│  [PACKAGING] ────► Container Distribution ──► Packaged Variant SKUs (100mL, 200mL...)     │
│                            │                                                             │
│                            ▼                                                             │
│  [COMMERCIAL] ───► GST Rule 46 Tax Invoicing ──► Customer Delivery & Sales Ledgers       │
│                            │                                                             │
│                            ▼                                                             │
│  [GOVERNANCE] ───► Universal JSON Export / Import • Pre-Import Safety Snapshots          │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
\`\`\`

---
*End of Master Technical Blueprint — InvoiceWise Version 2.0.0*
`;

// Save markdown file in artifacts directory
const artifactDir = path.join(__dirname, '../../antigravity/brain/3bec7351-96fc-4397-bfb7-cb648772135e');
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}
const artifactMdPath = path.join(artifactDir, 'invoicewise_v2_system_document.md');
fs.writeFileSync(artifactMdPath, markdownContent, 'utf8');
console.log('Saved Markdown artifact to:', artifactMdPath);

// Generate HTML and render to PDF using Electron
const htmlPath = path.join(__dirname, 'temp_blueprint.html');
const pdfOutPath = path.join(__dirname, 'InvoiceWise_v2.0_Technical_Blueprint.pdf');
const desktopPdfPath = 'E:\\one drive data\\Desktop\\InvoiceWise_v2.0_Technical_Blueprint.pdf';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>InvoiceWise 2.0 — Master Technical Document</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  
  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-right {
      content: counter(page);
    }
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.6;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }

  /* Cover Page Styling */
  .cover-page {
    page-break-after: always;
    height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-bottom: 4px solid #4f46e5;
    padding: 40px 20px;
  }

  .badge-v2 {
    display: inline-block;
    background: #4f46e5;
    color: #ffffff;
    font-weight: 800;
    font-size: 11pt;
    padding: 6px 14px;
    border-radius: 6px;
    letter-spacing: 0.05em;
    margin-bottom: 20px;
    text-transform: uppercase;
  }

  .cover-title {
    font-size: 26pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin: 0 0 16px 0;
  }

  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    font-weight: 500;
    margin-bottom: 40px;
    line-height: 1.5;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    font-size: 9pt;
  }

  .meta-item strong {
    color: #0f172a;
  }

  /* Headings */
  h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 28px;
    margin-bottom: 14px;
    page-break-after: avoid;
  }

  h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }

  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 10px 0;
    color: #334155;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }

  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
  }

  td {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Code & Pre */
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  pre {
    background: #0f172a;
    color: #f8fafc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    padding: 12px 14px;
    border-radius: 6px;
    overflow-x: auto;
    line-height: 1.45;
    margin: 12px 0;
    page-break-inside: avoid;
  }

  pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    border: none;
  }

  .box-highlight {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
    font-size: 9pt;
  }

  .box-highlight strong {
    color: #1d4ed8;
  }

  .page-break {
    page-break-before: always;
  }
</style>
</head>
<body>

<div class="cover-page">
  <div class="badge-v2">Master Architecture & Specification Document</div>
  <div class="cover-title">InvoiceWise 2.0<br>Enterprise Workflow, Architecture, Data Input & Value Formation Blueprint</div>
  <div class="cover-subtitle">A comprehensive, end-to-end technical reference and operational design specification for chemical, formulation, FMCG, and batch manufacturing ERP with GST tax billing compliance.</div>
  
  <div class="meta-grid">
    <div class="meta-item"><strong>Document ID:</strong> DOC-IW-V2-MASTER</div>
    <div class="meta-item"><strong>Release Target:</strong> Version 2.0.0 (Production Release)</div>
    <div class="meta-item"><strong>Classification:</strong> Master Engineering Architecture</div>
    <div class="meta-item"><strong>Date:</strong> August 2026</div>
    <div class="meta-item"><strong>Technology:</strong> Node.js, Electron, Express, Atomic JSON</div>
    <div class="meta-item"><strong>Compliance:</strong> Statutory GST Rule 46 A4 Billing</div>
  </div>
</div>

${markdownContent
  .replace(/^# (.*$)/gim, '<h1 class="page-break">$1</h1>')
  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
  .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
  .replace(/`([^`]+)`/gim, '<code>$1</code>')
  .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
  .replace(/\|(.+)\|/gim, (match) => {
    // Basic table row converter
    const cols = match.split('|').filter((c, i, a) => i > 0 && i < a.length - 1);
    if (cols.some(c => c.includes('---'))) return '';
    return '<tr>' + cols.map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
  })
}

</body>
</html>`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML blueprint written to:', htmlPath);

// Electron PDF Rendering script
const renderScript = `
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true }
  });

  await win.loadFile('${htmlPath.replace(/\\/g, '/')}');

  const pdfData = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
  });

  fs.writeFileSync('${pdfOutPath.replace(/\\/g, '/')}', pdfData);
  try {
    fs.writeFileSync('${desktopPdfPath.replace(/\\/g, '/')}', pdfData);
  } catch(e) {
    console.log('Could not write to Desktop path:', e.message);
  }

  console.log('PDF Generated Successfully at:', '${pdfOutPath.replace(/\\/g, '/')}');
  app.quit();
});
`;

fs.writeFileSync(path.join(__dirname, 'generate_pdf_worker.js'), renderScript, 'utf8');
console.log('Worker script prepared.');
