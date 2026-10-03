/**
 * InvoiceWise — Single Page Application Frontend
 * Complete GST Billing, Product & Customer Management, AI Assistant
 */

// ─── Global State ─────────────────────────────────────────────────────────────
const state = {
  products: [],
  customers: [],
  invoices: [],
  settings: {},
  stats: {},
  currentPage: 'dashboard',
  aiMode: 'anomaly_explanation',
  editProductId: null,
  editCustomerId: null,
  deleteTarget: null,
  chatHistories: {},
  // Inventory
  rawMaterials: [],
  recipes: [],
  batches: [],
  finishedGoods: [],
  rawMaterialTxns: [],
  finishedGoodsTxns: [],
  editRMId: null,
  editRecipeId: null,
  rawMaterialBatches: [],
  ledgerTab: 'all',
  manufacturingAudit: []
};

// ─── Constants & Master Data ──────────────────────────────────────────────────
const RAW_MATERIAL_UNITS = [
  'mL', 'L', 'mg', 'g', 'kg', 'pcs', 'box', 'packet', 'bottle', 'roll', 'meter', 'feet', 'inch'
];

const GST_SLAB_INFO = [
  { rate: 0,  name: 'Exempt / Zero Rated', examples: 'Fresh milk, foodgrains, salt, printed books', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  { rate: 5,  name: 'Essential Goods', examples: 'Tea, coffee, sugar, edible oil, domestic LPG', color: '#22d3ee', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
  { rate: 12, name: 'Standard Rate 1', examples: 'Processed food, computers, mobile phones, apparels > ₹1k', color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
  { rate: 18, name: 'Standard Rate 2 (Most Common)', examples: 'IT services, telecom, software, capital goods, hair oil', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  { rate: 28, name: 'DeMerit / Luxury Goods', examples: 'Automobiles, ACs, refrigerators, aerated drinks, tobacco', color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' }
];

const GST_RATES = [0, 5, 12, 18, 28];

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' }, { code: '38', name: 'Ladakh' }
];

const UQC_CODES = [
  { code: 'BAG', desc: 'Bags' }, { code: 'BAL', desc: 'Bale' },
  { code: 'BDL', desc: 'Bundles' }, { code: 'BKL', desc: 'Buckles' },
  { code: 'BOX', desc: 'Boxes' }, { code: 'BTL', desc: 'Bottles' },
  { code: 'CAN', desc: 'Cans' }, { code: 'CTN', desc: 'Cartons' },
  { code: 'DOZ', desc: 'Dozen' }, { code: 'DRM', desc: 'Drums' },
  { code: 'GGR', desc: 'Great Gross' }, { code: 'GMS', desc: 'Grams' },
  { code: 'KGS', desc: 'Kilograms' }, { code: 'KLR', desc: 'Kilolitre' },
  { code: 'MTR', desc: 'Metres' }, { code: 'NOS', desc: 'Numbers / Units' },
  { code: 'PAC', desc: 'Packs' }, { code: 'PCS', desc: 'Pieces' },
  { code: 'SET', desc: 'Sets' }, { code: 'SQM', desc: 'Square Metres' },
  { code: 'TUB', desc: 'Tubes' }
];

const PRODUCT_CATEGORIES = [
  'Electronics & IT', 'Software & SaaS', 'Office Supplies', 'Raw Materials',
  'Professional Services', 'Consulting & Advisory', 'Maintenance & Repair',
  'Logistics & Transport', 'Hardware & Tools', 'Apparel & Textiles', 'FMCG & Groceries'
];

const AI_MODES = [
  { id: 'anomaly_explanation', name: 'Anomaly Explanation', color: '#f59e0b', desc: 'Examines suspicious charges, sudden spikes, or unusual line items.' },
  { id: 'forecast_narrative', name: 'Forecast Narrative', color: '#06b6d4', desc: 'Translates cashflow trends & revenue predictions into clear business insights.' },
  { id: 'pricing_suggestion', name: 'Pricing Intelligence', color: '#10b981', desc: 'Evaluates discounts, retention pricing, and GST margin impacts.' },
  { id: 'dispute_draft', name: 'Dispute Resolution', color: '#a855f7', desc: 'Drafts professional responses for customer invoice inquiries & overages.' },
  { id: 'executive_narrative', name: 'Executive Summary', color: '#6366f1', desc: 'Generates high-level billing summaries for leadership & board review.' },
  { id: 'inventory_assistant', name: 'Inventory Assistant', color: '#f59e0b', desc: 'Answers stock level questions, production feasibility checks, and reorder recommendations.' },
  { id: 'general_chat', name: 'General GST & Q&A', color: '#ec4899', desc: 'Answers tax compliance, HSN/SAC, CGST/SGST rules, and billing questions.' }
];

// ─── DOM Helpers ─────────────────────────────────────────────────────────────
const $  = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

async function api(method, url, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server request failed');
  return data;
}

// ─── Data Loading ────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [pData, cData, iData, sData, statsData, rmData, recipeData, batchData, fgData, rmTxnData, fgTxnData, mfgAuditData, rmbData] = await Promise.all([
      api('GET', '/api/products'),
      api('GET', '/api/customers'),
      api('GET', '/api/invoices'),
      api('GET', '/api/settings'),
      api('GET', '/api/stats'),
      api('GET', '/api/raw-materials'),
      api('GET', '/api/recipes'),
      api('GET', '/api/manufacturing-batches'),
      api('GET', '/api/finished-goods'),
      api('GET', '/api/raw-material-transactions'),
      api('GET', '/api/finished-goods-transactions'),
      api('GET', '/api/manufacturing-audit-ledger').catch(() => ({ manufacturing_audit: [], entries: [] })),
      api('GET', '/api/raw-material-batches').catch(() => ({ raw_material_batches: [] }))
    ]);

    state.products         = pData.products || [];
    state.customers        = cData.customers || [];
    state.invoices         = iData.invoices || [];
    state.settings         = sData || {};
    state.stats            = statsData || {};
    state.rawMaterials     = rmData.raw_materials || [];
    state.recipes          = recipeData.recipes || [];
    state.batches          = batchData.manufacturing_batches || [];
    state.finishedGoods    = fgData.finished_goods || [];
    state.rawMaterialTxns  = rmTxnData.raw_material_transactions || [];
    state.finishedGoodsTxns= fgTxnData.finished_goods_transactions || [];
    state.manufacturingAudit = mfgAuditData.manufacturing_audit || mfgAuditData.entries || [];
    state.rawMaterialBatches = rmbData.raw_material_batches || [];

    // Update Sidebar Badges
    const pBadge = $('#product-count-badge');
    if (pBadge) pBadge.textContent = state.products.length;

    const cBadge = $('#customer-count-badge');
    if (cBadge) cBadge.textContent = state.customers.length;

    const iBadge = $('#invoice-count-badge');
    if (iBadge) iBadge.textContent = state.invoices.length;

    const rmBadge = $('#rm-count-badge');
    if (rmBadge) rmBadge.textContent = state.rawMaterials.length;

    const rcpBadge = $('#recipe-count-badge');
    if (rcpBadge) rcpBadge.textContent = state.recipes.length;

    const batchBadge = $('#batch-count-badge');
    if (batchBadge) batchBadge.textContent = state.batches.length;

    // Load Sidebar Logo
    const sidebarLogo = $('#sidebar-logo-img');
    if (sidebarLogo && state.settings.businessLogoBase64) {
      sidebarLogo.src = state.settings.businessLogoBase64;
    }

    // Real-time automatic view synchronization:
    // Whenever data loads or updates, automatically re-render the currently active page
    // so the user never has to refresh the window to see changes.
    if (state.currentPage) {
      const activeForms = ['create-invoice', 'add-customer', 'add-product'];
      if (!activeForms.includes(state.currentPage)) {
        renderActivePage(state.currentPage);
      }
    }
  } catch (err) {
    showToast('Failed to load application data: ' + err.message, 'error');
  }
}

// ─── Active Page Renderer ───────────────────────────────────────────────────
function renderActivePage(pageId) {
  switch (pageId) {
    case 'dashboard': renderDashboard(); break;
    case 'invoices': renderInvoicesList(); break;
    case 'create-invoice': renderCreateInvoice(); break;
    case 'customers': renderCustomersList(); break;
    case 'add-customer': renderCustomerForm(); break;
    case 'products': renderProductsList(); break;
    case 'add-product':
      if (state.editProductId) {
        const editP = state.products.find(item => item.id === state.editProductId);
        renderProductForm(editP || null);
      } else {
        renderProductForm(null);
      }
      break;
    case 'ai-assistant': renderAIAssistant(); break;
    case 'gst-info': renderGSTReference(); break;
    case 'raw-materials': renderRawMaterials(); break;
    case 'recipes': renderRecipes(); break;
    case 'manufacturing': renderManufacturing(); break;
    case 'inventory-history':
    case 'manufacturing-audit':
      renderInventoryHistory();
      break;
  }
}
window.renderActivePage = renderActivePage;

// ─── Navigation ──────────────────────────────────────────────────────────────
function navigateTo(pageId) {
  state.currentPage = pageId;

  // Active page DOM toggle
  $$('.page').forEach(p => p.classList.remove('active'));
  const targetPage = $(`#page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');

  // Active nav item toggle
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = $(`[data-page="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update Breadcrumb
  const breadcrumbMap = {
    'dashboard': 'Dashboard',
    'invoices': 'Invoices List',
    'create-invoice': 'Create Invoice',
    'customers': 'Customer Directory',
    'add-customer': 'Add Customer',
    'products': 'Product Catalog',
    'add-product': 'Add Product',
    'ai-assistant': 'AI Assistant',
    'gst-info': 'GST Reference',
    'raw-materials': 'Raw Materials',
    'recipes': 'Recipes & BOM',
    'manufacturing': 'Manufacturing',
    'inventory-history': 'Audit Ledger'
  };
  const breadcrumb = $('#breadcrumb');
  if (breadcrumb) breadcrumb.textContent = breadcrumbMap[pageId] || 'InvoiceWise';

  // 1. Instant optimistic render from current in-memory state
  renderActivePage(pageId);

  // 2. Real-time background sync: fetch fresh data from server without any manual refresh needed!
  // This guarantees Audit Ledger, dashboard, and all catalogs always reflect immediate real-time state.
  if (pageId !== 'create-invoice' && pageId !== 'add-customer' && pageId !== 'add-product') {
    loadData().then(() => {
      if (state.currentPage === pageId) {
        renderActivePage(pageId);
      }
    }).catch(err => console.warn('Background sync failed:', err));
  }

  // Close mobile sidebar
  $('#sidebar')?.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── PAGE 1: Dashboard ───────────────────────────────────────────────────────
function renderDashboard() {
  const el = $('#page-dashboard');
  const s = state.stats;
  const userName = state.settings.userName;
  const greeting = userName ? `Welcome back, ${escHtml(userName)}! 👋` : 'Billing & Manufacturing Overview';
  const subtitle = userName ? 'Real-time billing, inventory stock levels, and production metrics.' : 'Real-time billing, inventory stock levels, and production metrics';

  el.innerHTML = `
    <h1 class="page-title">${greeting}</h1>
    <p class="page-subtitle">${subtitle}</p>

    <!-- Financial & Billing Stats Grid -->
    <div class="stats-grid" style="margin-bottom:14px">
      <div class="stat-card" style="--card-color:#10b981">
        <div class="stat-header">
          <span class="stat-title">Total Revenue Paid</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        </div>
        <div class="stat-value">${formatCurrency(s.totalRevenue)}</div>
        <div class="stat-desc">Collected from paid invoices</div>
      </div>

      <div class="stat-card" style="--card-color:#f59e0b">
        <div class="stat-header">
          <span class="stat-title">Outstanding Due</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        </div>
        <div class="stat-value">${formatCurrency(s.outstandingAmt)}</div>
        <div class="stat-desc">${s.overdueCount || 0} overdue invoices</div>
      </div>

      <div class="stat-card" style="--card-color:#6366f1">
        <div class="stat-header">
          <span class="stat-title">Total Invoices</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
        </div>
        <div class="stat-value">${s.totalInvoices || 0}</div>
        <div class="stat-desc">${s.draftCount || 0} drafts waiting</div>
      </div>

      <div class="stat-card" style="--card-color:#06b6d4">
        <div class="stat-header">
          <span class="stat-title">Active Customers</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        </div>
        <div class="stat-value">${s.totalCustomers || 0}</div>
        <div class="stat-desc">${s.activeProducts || 0} catalog products</div>
      </div>
    </div>

    <!-- Manufacturing & Inventory Widgets Grid (8 Required Cards) -->
    <div style="margin-bottom:24px">
      <div style="font-size:0.85rem;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 20h20"/><path d="M5 20V8l5-5 5 5v12"/></svg>
        Inventory &amp; Manufacturing Overview
      </div>
      <div class="inv-stats-grid">
        <div class="inv-stat-card" style="--card-color:#06b6d4">
          <div class="inv-stat-label">Raw Materials in Stock</div>
          <div class="inv-stat-value">${s.rawMaterialsInStock || 0}</div>
          <div class="inv-stat-sub">Active ingredient items</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#f59e0b">
          <div class="inv-stat-label">Low Stock Materials</div>
          <div class="inv-stat-value" style="color:${(s.lowStockMaterials||0)>0?'#f59e0b':'#10b981'}">${s.lowStockMaterials || 0}</div>
          <div class="inv-stat-sub">Below minimum stock</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#10b981">
          <div class="inv-stat-label">Today's Production</div>
          <div class="inv-stat-value">${s.todayProductionUnits || 0}</div>
          <div class="inv-stat-sub">${s.todayProductionBatches || 0} batches today</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#818cf8">
          <div class="inv-stat-label">This Month Production</div>
          <div class="inv-stat-value">${s.thisMonthProductionUnits || 0}</div>
          <div class="inv-stat-sub">${s.thisMonthProductionBatches || 0} batches this month</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#a855f7">
          <div class="inv-stat-label">Finished Goods Inventory</div>
          <div class="inv-stat-value">${s.finishedGoodsStock || 0}</div>
          <div class="inv-stat-sub">Ready-to-sell bottles</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#6366f1">
          <div class="inv-stat-label">Recent Manufacturing</div>
          <div class="inv-stat-value">${s.totalBatches || 0}</div>
          <div class="inv-stat-sub">Total batch runs</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#ef4444">
          <div class="inv-stat-label">Pending Shortages</div>
          <div class="inv-stat-value" style="color:${(s.pendingShortagesCount||0)>0?'#ef4444':'#10b981'}">${s.pendingShortagesCount || 0}</div>
          <div class="inv-stat-sub">${(s.pendingShortagesCount||0)>0?'Action required':'All clear ✓'}</div>
        </div>

        <div class="inv-stat-card" style="--card-color:#10b981">
          <div class="inv-stat-label">Total Inventory Value</div>
          <div class="inv-stat-value" style="font-size:1.15rem">${formatCurrency(s.inventoryValue)}</div>
          <div class="inv-stat-sub">Raw material valuation</div>
        </div>
      </div>
    </div>

    <!-- Main Sections Grid -->
    <div class="dashboard-sections-grid">
      <!-- Left: Recent Invoices & Recent Manufacturing Feed -->
      <div>
        <div class="dashboard-card" style="margin-bottom:20px">
          <div class="dashboard-card-title">
            <span>Recent Invoices</span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('invoices')">View All →</button>
          </div>

          ${(!s.recentInvoices || s.recentInvoices.length === 0) ? `
            <div style="text-align:center;padding:30px 20px;color:var(--text-muted)">
              <p>No invoices created yet.</p>
              <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateTo('create-invoice')">+ Create First Invoice</button>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${s.recentInvoices.map(inv => `
                  <tr>
                    <td class="font-mono" style="font-weight:600;color:#fff">${inv.invoiceNumber}</td>
                    <td>${escHtml(inv.customer ? inv.customer.name : 'Walk-in')}</td>
                    <td>${inv.date}</td>
                    <td class="font-mono" style="font-weight:700;color:#fff">${formatCurrency(inv.grandTotal)}</td>
                    <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="triggerPrintInvoice('${inv.id}')">Print / PDF</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="dashboard-card">
          <div class="dashboard-card-title">
            <span>Recent Manufacturing Runs</span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('manufacturing')">View All →</button>
          </div>
          ${(() => {
            const list = (s.recentManufacturing && s.recentManufacturing.length > 0)
              ? s.recentManufacturing
              : (state.batches || []).slice(0, 5);

            if (list.length === 0) {
              return `
                <div style="text-align:center;padding:30px 20px;color:var(--text-muted)">
                  <p>No production batches committed yet.</p>
                  <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateTo('manufacturing')">+ Start Manufacturing</button>
                </div>
              `;
            }

            return `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${list.map(b => `
                    <tr>
                      <td class="font-mono" style="font-weight:600;color:var(--accent-secondary)">${escHtml(b.batchNumber || b.id)}</td>
                      <td><strong style="color:#fff">${escHtml(b.productName)}</strong></td>
                      <td><span class="font-mono" style="color:#10b981;font-weight:700">${b.quantityProduced}</span> ${escHtml(b.desiredProductionUnit||'bottles')}</td>
                      <td>${b.date || ''}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="printBatchReport('${b.id}')">PDF Report</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          })()}
        </div>
      </div>

      <!-- Right: Quick Actions & GST Summary -->
      <div>
        <div class="dashboard-card">
          <div class="dashboard-card-title">Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-primary" style="justify-content:flex-start" onclick="navigateTo('create-invoice')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create New Tax Invoice
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start" onclick="navigateTo('manufacturing')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 20h20"/><path d="M5 20V8l5-5 5 5v12"/></svg>
              Start New Batch Production
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start" onclick="navigateTo('recipes')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              Recipe Builder (BOM)
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start" onclick="navigateTo('raw-materials')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
              Add Raw Materials
            </button>
            <button class="btn btn-ghost" style="justify-content:flex-start" onclick="navigateTo('inventory-history')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              View Audit Ledgers
            </button>
          </div>
        </div>

        <div class="dashboard-card">
          <div class="dashboard-card-title">Company Profile</div>
          <div style="font-size:0.85rem;line-height:1.6;color:var(--text-secondary)">
            <strong style="color:#fff">${escHtml(state.settings.businessName || 'Business Name Not Set')}</strong><br>
            ${state.settings.businessGSTIN ? `<span class="font-mono" style="color:var(--accent-secondary)">GSTIN: ${state.settings.businessGSTIN}</span><br>` : ''}
            ${state.settings.businessState ? `State: ${state.settings.businessState}<br>` : ''}
            <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="openSettingsModal()">Edit Company Profile →</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── PAGE 2: Invoices List ────────────────────────────────────────────────────
function renderInvoicesList() {
  const el = $('#page-invoices');

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Invoices</h1>
        <p class="page-subtitle">Manage, track, and print GST tax invoices</p>
      </div>
      <button class="btn btn-primary" onclick="navigateTo('create-invoice')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create Invoice
      </button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="invoice-search" placeholder="Search by invoice #, customer name, GSTIN…" oninput="filterInvoicesTable()" />
        </div>
        <select id="invoice-status-filter" style="width:auto" onchange="filterInvoicesTable()">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div id="invoices-table-wrap">
        ${renderInvoicesTableRows(state.invoices)}
      </div>
    </div>
  `;
}

function renderInvoicesTableRows(invoices) {
  if (!invoices || invoices.length === 0) {
    return `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size:1rem;margin-top:12px;font-weight:600;color:var(--text-secondary)">No invoices found</p>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateTo('create-invoice')">+ Create New Invoice</button>
      </div>
    `;
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Due Date</th>
          <th>Total (incl. GST)</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${invoices.map(inv => `
          <tr>
            <td class="font-mono" style="font-weight:700;color:#fff">${inv.invoiceNumber}</td>
            <td>
              <strong style="color:#fff">${escHtml(inv.customer ? inv.customer.name : 'Walk-in Customer')}</strong>
              ${inv.customer && inv.customer.gstin ? `<br><span class="font-mono" style="font-size:0.7rem;color:var(--text-muted)">${inv.customer.gstin}</span>` : ''}
            </td>
            <td>${inv.date}</td>
            <td>${inv.dueDate || '—'}</td>
            <td class="font-mono" style="font-weight:800;color:#fff">${formatCurrency(inv.grandTotal)}</td>
            <td>
              <select onchange="updateInvoiceStatus('${inv.id}', this.value)" style="padding:4px 8px;font-size:0.75rem;border-radius:12px;background:var(--bg-elevated);color:#fff;border:1px solid var(--border-subtle);cursor:pointer">
                <option value="draft" ${(inv.status || 'draft').toLowerCase() === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="pending" ${['pending', 'sent'].includes((inv.status || '').toLowerCase()) ? 'selected' : ''}>Pending / Sent</option>
                <option value="paid" ${(inv.status || '').toLowerCase() === 'paid' ? 'selected' : ''}>Paid</option>
                <option value="overdue" ${(inv.status || '').toLowerCase() === 'overdue' ? 'selected' : ''}>Overdue</option>
                <option value="cancelled" ${(inv.status || '').toLowerCase() === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-sm" title="Print or Save PDF" onclick="triggerPrintInvoice('${inv.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print / PDF
                </button>
                <button class="btn btn-danger btn-sm" title="Delete Invoice" onclick="confirmDeleteInvoice('${inv.id}', '${inv.invoiceNumber}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function updateInvoiceStatus(id, newStatus) {
  try {
    await api('PUT', `/api/invoices/${id}`, { status: newStatus });
    const inv = state.invoices.find(i => i.id === id);
    if (inv) inv.status = newStatus;
    showToast(`Invoice status updated to ${newStatus.toUpperCase()}`, 'success');
    await loadData();
    if (state.currentPage === 'inventory-history') {
      renderInventoryHistory();
    } else if (state.currentPage === 'dashboard') {
      renderDashboard();
    }
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

function filterInvoicesTable() {
  const query = $('#invoice-search')?.value.toLowerCase().trim() || '';
  const status = $('#invoice-status-filter')?.value || '';

  const filtered = state.invoices.filter(inv => {
    const matchesQuery = !query ||
      inv.invoiceNumber.toLowerCase().includes(query) ||
      (inv.customer && inv.customer.name.toLowerCase().includes(query)) ||
      (inv.customer && inv.customer.gstin && inv.customer.gstin.toLowerCase().includes(query));
    const matchesStatus = !status || inv.status === status;
    return matchesQuery && matchesStatus;
  });

  const wrap = $('#invoices-table-wrap');
  if (wrap) wrap.innerHTML = renderInvoicesTableRows(filtered);
}

async function updateInvoiceStatus(id, newStatus) {
  try {
    await api('PUT', `/api/invoices/${id}`, { status: newStatus });
    const inv = state.invoices.find(i => i.id === id);
    if (inv) inv.status = newStatus;
    showToast(`Invoice status updated to ${newStatus}`, 'success');
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

function triggerPrintInvoice(id) {
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return showToast('Invoice not found', 'error');
  if (typeof window.printInvoice === 'function') {
    window.printInvoice(inv, state.settings);
  } else {
    showToast('Print engine not loaded', 'error');
  }
}

// ─── PAGE 3: Create Invoice Builder ──────────────────────────────────────────
let builderLineItems = [];

function renderCreateInvoice() {
  const el = $('#page-create-invoice');
  builderLineItems = [createEmptyLineItem()];

  const todayStr = new Date().toISOString().split('T')[0];
  const dueDateStr = new Date(Date.now() + 30*24*3600*1000).toISOString().split('T')[0];

  el.innerHTML = `
    <h1 class="page-title">New Tax Invoice</h1>
    <p class="page-subtitle">GST Rule 46 Compliant Invoice Builder</p>

    <div class="invoice-builder-layout">
      <!-- Main Invoice Details -->
      <div class="builder-main">
        <!-- Party Details Card -->
        <div class="builder-card">
          <div class="builder-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Customer &amp; Tax Options
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="inv-customer-select">Customer *</label>
              <select id="inv-customer-select" onchange="onInvoiceCustomerSelect(this.value)">
                <option value="">-- Select Saved Customer --</option>
                ${state.customers.map(c => `<option value="${c.id}">${escHtml(c.name)} ${c.gstin ? ' (' + c.gstin + ')' : ''}</option>`).join('')}
              </select>
              <span class="field-hint"><a href="#" onclick="navigateTo('add-customer'); return false;">+ Create New Customer</a></span>
            </div>

            <div class="form-group">
              <label for="inv-supply-type">Supply Type *</label>
              <select id="inv-supply-type" onchange="recalculateBuilder()">
                <option value="intra">Intra-State (CGST + SGST)</option>
                <option value="inter">Inter-State (IGST)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="inv-date">Invoice Date *</label>
              <input type="date" id="inv-date" value="${todayStr}" />
            </div>

            <div class="form-group">
              <label for="inv-due-date">Due Date</label>
              <input type="date" id="inv-due-date" value="${dueDateStr}" />
            </div>

            <div class="form-group">
              <label for="inv-po-no">P.O. Number (Optional)</label>
              <input type="text" id="inv-po-no" placeholder="e.g. PO-98765" />
            </div>

            <div class="form-group">
              <label for="inv-rcm">Reverse Charge Applicable?</label>
              <select id="inv-rcm">
                <option value="no">No</option>
                <option value="yes">Yes (RCM)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Line Items Card -->
        <div class="builder-card">
          <div class="builder-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            Line Items
          </div>

          <table class="line-items-table">
            <thead>
              <tr>
                <th style="width:35%">Item / Service</th>
                <th style="width:12%">HSN/SAC</th>
                <th style="width:10%">Qty</th>
                <th style="width:15%">Rate (₹)</th>
                <th style="width:10%">GST %</th>
                <th style="width:15%;text-align:right">Total (₹)</th>
                <th style="width:3%"></th>
              </tr>
            </thead>
            <tbody id="line-items-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>

          <button class="btn btn-secondary btn-sm" onclick="addBuilderRow()">+ Add Item Row</button>
        </div>

        <!-- Notes & Terms -->
        <div class="builder-card">
          <div class="form-grid-2">
            <div class="form-group">
              <label for="inv-notes">Invoice Notes</label>
              <textarea id="inv-notes" rows="3" placeholder="Notes for customer...">${state.settings.invoiceNotes || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="inv-terms">Terms &amp; Conditions</label>
              <textarea id="inv-terms" rows="3" placeholder="Terms...">${state.settings.invoiceTerms || 'Payment due within 30 days.'}</textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary Panel -->
      <div class="builder-summary-card">
        <h3 style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:16px">Summary</h3>

        <div class="summary-row">
          <span>Taxable Subtotal:</span>
          <span id="summary-subtotal" class="font-mono">₹0.00</span>
        </div>
        <div class="summary-row" id="summary-cgst-row">
          <span>CGST:</span>
          <span id="summary-cgst" class="font-mono">₹0.00</span>
        </div>
        <div class="summary-row" id="summary-sgst-row">
          <span>SGST/UTGST:</span>
          <span id="summary-sgst" class="font-mono">₹0.00</span>
        </div>
        <div class="summary-row" id="summary-igst-row" style="display:none">
          <span>IGST:</span>
          <span id="summary-igst" class="font-mono">₹0.00</span>
        </div>
        <div class="summary-row">
          <span>Freight / Shipping:</span>
          <input type="number" id="inv-shipping" value="0" min="0" style="width:90px;text-align:right;padding:4px" oninput="recalculateBuilder()" />
        </div>
        <div class="summary-row grand-total">
          <span>Grand Total:</span>
          <span id="summary-grand-total" class="font-mono" style="color:var(--accent-secondary)">₹0.00</span>
        </div>

        <div style="margin-top:24px;display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-primary btn-lg" onclick="saveInvoice('paid')">
            Save &amp; Print Invoice
          </button>
          <button class="btn btn-secondary" onclick="saveInvoice('draft')">
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  `;

  renderLineItemsTable();
}

function createEmptyLineItem() {
  return { productId: '', variantId: '', name: '', hsn_sac: '', qty: 1, rate: 0, discount_pct: 0, gst_rate: 18, unit: 'NOS', taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
}

function renderLineItemsTable() {
  const tbody = $('#line-items-tbody');
  if (!tbody) return;

  tbody.innerHTML = builderLineItems.map((item, idx) => {
    const product = state.products.find(p => p.id === item.productId);
    const variants = product && product.variants && product.variants.length > 0 ? product.variants : [];

    return `
    <tr>
      <td>
        <select class="item-select" onchange="onItemCatalogSelect(${idx}, this.value)">
          <option value="">-- Pick Product or Custom --</option>
          ${state.products.map(p => {
            const hasVars = p.variants && p.variants.length > 0;
            const badge = hasVars ? '' : ' ⚠️ (No Variants - Add Variant in Catalog First)';
            return `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${escHtml(p.name)}${badge} (₹${p.rate})</option>`;
          }).join('')}
        </select>
        
        ${variants.length > 0 ? `
          <select class="item-variant-select" onchange="onItemVariantSelect(${idx}, this.value)" style="margin-top:4px;font-size:0.78rem;background:var(--bg-elevated);color:#fff;border:1px solid var(--accent-secondary)">
            <option value="">-- Select Bottle / Container Size Variant --</option>
            ${variants.map(v => `
              <option value="${v.variantId || v.name}" ${(item.variantId === v.variantId || item.name.includes(v.bottleSize)) ? 'selected' : ''}>
                ${escHtml(v.bottleSize ? `${v.bottleSize} ${v.bottleSizeUnit || 'mL'}` : v.name)} — ₹${v.price}
              </option>
            `).join('')}
          </select>
        ` : (product ? `
          <div style="font-size:0.75rem;font-weight:700;margin-top:4px;background:rgba(239,68,68,0.15);color:#f87171;padding:5px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.4)">
            ⚠️ Cannot Invoice: "${escHtml(product.name)}" has no packaging/bottle variants configured. Add a variant in Products catalog to invoice this item.
          </div>
        ` : '')}

        ${(() => {
          if (!product) return '';
          const bulkStock = product.bulkStock !== undefined ? product.bulkStock : (product.currentStock || 10000);
          const bulkUnit  = product.bulkStockUnit || 'mL';
          const selVar = variants.find(v => (v.variantId && v.variantId === item.variantId) || (item.name && item.name.includes(v.bottleSize))) || variants[0];
          if (!selVar) return '';

          const bSize = selVar.bottleSize || 200;
          const bUnit = selVar.bottleSizeUnit || 'mL';
          let maxCap = Math.floor(bulkStock / bSize);
          if (window.unitConv && window.unitConv.areCompatible(bUnit, bulkUnit)) {
            try {
              const converted = window.unitConv.convert(bulkStock, bulkUnit, bUnit);
              maxCap = Math.floor(converted / bSize);
            } catch (e) {
              maxCap = Math.floor(bulkStock / bSize);
            }
          }

          const availStock = selVar.stock !== undefined ? selVar.stock : maxCap;
          const isExceeded = item.qty > availStock;

          return `
            <div style="font-size:0.72rem;font-weight:700;margin-top:3px;background:${isExceeded ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)'};color:${isExceeded ? '#f87171' : '#10b981'};padding:3px 6px;border-radius:3px;border:1px solid ${isExceeded ? 'rgba(239,68,68,0.3)' : 'transparent'}">
              ${isExceeded ? `⚠️ Insufficient stock! Available quantity for ${escHtml(selVar.bottleSize ? `${selVar.bottleSize} ${selVar.bottleSizeUnit||'mL'}` : selVar.name)} is ${availStock}.` : `⚡ Available Stock: ${availStock} bottles (Max ${maxCap} bottles fillable from bulk batch)`}
            </div>
          `;
        })()}

        <input type="text" placeholder="Description" value="${escHtml(item.name)}" oninput="builderLineItems[${idx}].name=this.value" style="margin-top:4px;font-size:0.78rem" />
      </td>
      <td>
        <input type="text" class="font-mono" value="${item.hsn_sac}" oninput="builderLineItems[${idx}].hsn_sac=this.value" placeholder="8471" style="font-size:0.8rem" />
      </td>
      <td>
        ${(() => {
          const product = state.products.find(p => p.id === item.productId);
          const variants = product && product.variants && product.variants.length > 0 ? product.variants : [];
          const selVar = variants.find(v => (v.variantId && v.variantId === item.variantId) || (item.name && item.name.includes(v.bottleSize))) || variants[0];
          const availStock = selVar ? (selVar.stock !== undefined ? selVar.stock : 99999) : 99999;
          const isExceeded = product && item.qty > availStock;

          return `
            <input type="number" class="item-qty-input" value="${item.qty}" min="1"
              oninput="builderLineItems[${idx}].qty=parseFloat(this.value)||0; recalculateBuilder()"
              style="${isExceeded ? 'border:2px solid #ef4444;background:rgba(239,68,68,0.15);color:#f87171;font-weight:800' : ''}"
              title="${isExceeded ? `Cannot exceed available stock of ${availStock} bottles` : ''}"
            />
          `;
        })()}
      </td>
      <td>
        <input type="number" class="item-rate-input" value="${item.rate}" min="0" step="0.01" oninput="builderLineItems[${idx}].rate=parseFloat(this.value)||0; recalculateBuilder()" />
      </td>
      <td>
        <select style="padding:6px;font-size:0.8rem" onchange="builderLineItems[${idx}].gst_rate=parseFloat(this.value)||0; recalculateBuilder()">
          ${GST_RATES.map(r => `<option value="${r}" ${item.gst_rate === r ? 'selected' : ''}>${r}%</option>`).join('')}
        </select>
      </td>
      <td style="text-align:right" class="font-mono font-bold">
        <span id="line-total-${idx}">${formatCurrency(item.total)}</span>
      </td>
      <td>
        ${builderLineItems.length > 1 ? `<button class="btn btn-ghost btn-sm" onclick="removeBuilderRow(${idx})" style="color:var(--accent-danger);padding:4px">✕</button>` : ''}
      </td>
    </tr>
  `;
  }).join('');

  recalculateBuilder();
}

function onItemCatalogSelect(idx, productId) {
  const product = state.products.find(p => p.id === productId);
  if (product) {
    if (!product.variants || product.variants.length === 0) {
      alert(`⚠️ Cannot Invoice Product: "${product.name}"\n\nThis product does not have any packaging/bottle variants configured.\n\nIn InvoiceWise, commercial sales invoices deduct from finished packaged variant stock.\n\nPlease go to Products Catalog and add at least one container/packaging variant before invoicing this item.`);
      showToast(`Cannot invoice "${product.name}": No container/packaging variants configured. Add a variant in catalog first.`, 'error');
      builderLineItems[idx].productId = '';
      builderLineItems[idx].variantId = '';
      builderLineItems[idx].name = '';
      renderLineItemsTable();
      return;
    }

    builderLineItems[idx].productId = product.id;
    builderLineItems[idx].name = product.name;
    builderLineItems[idx].hsn_sac = product.hsn_sac || '';
    builderLineItems[idx].rate = parseFloat(product.rate) || 0;
    builderLineItems[idx].gst_rate = parseFloat(product.gst_rate) || 18;
    builderLineItems[idx].unit = product.unit || 'NOS';
    builderLineItems[idx].variantId = '';

    if (product.variants && product.variants.length > 0) {
      const firstVar = product.variants[0];
      builderLineItems[idx].variantId = firstVar.variantId || firstVar.name;
      builderLineItems[idx].name = `${product.name} (${firstVar.bottleSize} ${firstVar.bottleSizeUnit || 'mL'})`;
      builderLineItems[idx].rate = parseFloat(firstVar.price) || builderLineItems[idx].rate;
    }
  }
  renderLineItemsTable();
}

function onItemVariantSelect(idx, variantKey) {
  const item = builderLineItems[idx];
  if (!item || !item.productId) return;
  const product = state.products.find(p => p.id === item.productId);
  if (!product || !product.variants) return;

  const variant = product.variants.find(v => (v.variantId && v.variantId === variantKey) || v.name === variantKey);
  if (variant) {
    item.variantId = variant.variantId || variant.name;
    item.name = `${product.name} (${variant.bottleSize} ${variant.bottleSizeUnit || 'mL'})`;
    item.rate = parseFloat(variant.price) || item.rate;
  }
  renderLineItemsTable();
}

function addBuilderRow() {
  builderLineItems.push(createEmptyLineItem());
  renderLineItemsTable();
}

function removeBuilderRow(idx) {
  if (builderLineItems.length > 1) {
    builderLineItems.splice(idx, 1);
    renderLineItemsTable();
  }
}

function onInvoiceCustomerSelect(customerId) {
  const customer = state.customers.find(c => c.id === customerId);
  if (customer && customer.state && state.settings.businessState) {
    const isInter = customer.state.toLowerCase() !== state.settings.businessState.toLowerCase();
    const select = $('#inv-supply-type');
    if (select) select.value = isInter ? 'inter' : 'intra';
    recalculateBuilder();
  }
}

function recalculateBuilder() {
  const supplyType = $('#inv-supply-type')?.value || 'intra';
  const isInter = supplyType === 'inter';

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  builderLineItems.forEach((item, idx) => {
    const qty = item.qty || 0;
    const rate = item.rate || 0;
    const gstRate = item.gst_rate || 0;

    const taxable = qty * rate;
    let cgst = 0, sgst = 0, igst = 0;

    if (isInter) {
      igst = taxable * (gstRate / 100);
    } else {
      cgst = taxable * ((gstRate / 2) / 100);
      sgst = taxable * ((gstRate / 2) / 100);
    }

    const rowTotal = taxable + cgst + sgst + igst;

    item.taxableValue = taxable;
    item.cgst = cgst;
    item.sgst = sgst;
    item.igst = igst;
    item.total = rowTotal;

    subtotal += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    const rowEl = $(`#line-total-${idx}`);
    if (rowEl) rowEl.textContent = formatCurrency(rowTotal);
  });

  const shipping = parseFloat($('#inv-shipping')?.value) || 0;
  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = subtotal + totalTax + shipping;

  const subEl = $('#summary-subtotal'); if (subEl) subEl.textContent = formatCurrency(subtotal);
  const cgstEl = $('#summary-cgst'); if (cgstEl) cgstEl.textContent = formatCurrency(totalCgst);
  const sgstEl = $('#summary-sgst'); if (sgstEl) sgstEl.textContent = formatCurrency(totalSgst);
  const igstEl = $('#summary-igst'); if (igstEl) igstEl.textContent = formatCurrency(totalIgst);
  const grandEl = $('#summary-grand-total'); if (grandEl) grandEl.textContent = formatCurrency(grandTotal);

  const cgstRow = $('#summary-cgst-row'); if (cgstRow) cgstRow.style.display = isInter ? 'none' : 'flex';
  const sgstRow = $('#summary-sgst-row'); if (sgstRow) sgstRow.style.display = isInter ? 'none' : 'flex';
  const igstRow = $('#summary-igst-row'); if (igstRow) igstRow.style.display = isInter ? 'flex' : 'none';

  // Real-time stock limit validation check for invoice creation buttons
  let hasStockError = false;
  let stockErrorMessage = '';

  for (const item of builderLineItems) {
    if (!item.productId) continue;
    const product = state.products.find(p => p.id === item.productId);
    if (!product) continue;
    if (!product.variants || product.variants.length === 0) {
      hasStockError = true;
      stockErrorMessage = `Product "${product.name}" has no container/packaging variants configured. Products must have at least one variant to be invoiced.`;
      break;
    }
    const selVar = product.variants.find(v => (v.variantId && v.variantId === item.variantId) || (item.name && item.name.includes(v.bottleSize))) || product.variants[0];
    const avail = selVar ? (selVar.stock !== undefined ? selVar.stock : 99999) : 99999;
    if (item.qty > avail) {
      hasStockError = true;
      stockErrorMessage = `Insufficient stock. Available quantity for ${selVar ? (selVar.bottleSize ? `${selVar.bottleSize} ${selVar.bottleSizeUnit||'mL'}` : selVar.name) : item.name} is ${avail}.`;
      break;
    }
  }

  const saveBtns = $$('.builder-summary-card button');
  saveBtns.forEach(btn => {
    btn.disabled = hasStockError;
  });

  let warnBox = $('#invoice-stock-warning');
  if (hasStockError) {
    if (!warnBox) {
      warnBox = document.createElement('div');
      warnBox.id = 'invoice-stock-warning';
      warnBox.style.cssText = 'margin-top:12px;padding:10px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:6px;color:#f87171;font-size:0.78rem;font-weight:700';
      const summaryCard = $('.builder-summary-card');
      if (summaryCard) summaryCard.appendChild(warnBox);
    }
    warnBox.textContent = `⚠️ ${stockErrorMessage}`;
    warnBox.style.display = 'block';
  } else if (warnBox) {
    warnBox.style.display = 'none';
  }
}

async function saveInvoice(targetStatus = 'paid') {
  const customerId = $('#inv-customer-select')?.value;
  const customer = state.customers.find(c => c.id === customerId);

  const validItems = builderLineItems.filter(i => i.name && i.name.trim() !== '');
  if (validItems.length === 0) {
    return showToast('Add at least one line item with a name', 'error');
  }

  // Pre-check stock limit and packaging variants
  for (const item of validItems) {
    if (!item.productId) continue;
    const product = state.products.find(p => p.id === item.productId);
    if (!product) continue;
    if (!product.variants || product.variants.length === 0) {
      const msg = `Product "${product.name}" cannot be invoiced because it has no packaging/bottle variants configured. Please add a variant in Products catalog first.`;
      alert(`⚠️ Cannot Invoice Product: "${product.name}"\n\n${msg}`);
      return showToast(msg, 'error');
    }
    const selVar = product.variants.find(v => (v.variantId && v.variantId === item.variantId) || (item.name && item.name.includes(v.bottleSize))) || product.variants[0];
    const avail = selVar ? (selVar.stock !== undefined ? selVar.stock : 99999) : 99999;
    if (item.qty > avail) {
      return showToast(`Insufficient stock. Available quantity for ${selVar ? (selVar.bottleSize ? `${selVar.bottleSize} ${selVar.bottleSizeUnit||'mL'}` : selVar.name) : item.name} is ${avail}.`, 'error');
    }
  }

  const supplyType = $('#inv-supply-type')?.value || 'intra';
  const isInter = supplyType === 'inter';

  const subtotal = validItems.reduce((s, i) => s + i.taxableValue, 0);
  const totalTax = validItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
  const shippingCharges = parseFloat($('#inv-shipping')?.value) || 0;
  const grandTotal = subtotal + totalTax + shippingCharges;

  // Normalize items: ensure both qty and quantity fields exist for server-side deduction compatibility
  const normalizedItems = validItems.map(i => ({
    ...i,
    quantity: i.qty,           // server reads item.quantity || item.qty
    product_name: i.name,      // server reads item.name || item.product_name
    product_id: i.productId    // server reads item.productId || item.product_id
  }));

  const payload = {
    customer: customer || { name: 'Walk-in Customer' },
    customerName: customer ? customer.name : 'Walk-in Customer',  // for audit notes
    supplyType,
    date: $('#inv-date')?.value || new Date().toISOString().split('T')[0],
    dueDate: $('#inv-due-date')?.value || '',
    poNumber: $('#inv-po-no')?.value || '',
    reverseCharge: $('#inv-rcm')?.value || 'no',
    items: normalizedItems,      // key field: server reads invoice.items
    lineItems: normalizedItems,  // keep both for print engine compatibility
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    totalGst: parseFloat(totalTax.toFixed(2)),  // alias for print engine
    shippingCharges,
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    notes: $('#inv-notes')?.value || '',
    terms: $('#inv-terms')?.value || '',
    status: targetStatus
  };

  try {
    const res = await api('POST', '/api/invoices', payload);
    showToast('Invoice created successfully!', 'success');
    await loadData();

    if (res.invoice && targetStatus !== 'draft') {
      window.printInvoice(res.invoice, state.settings);
    }
    navigateTo('invoices');
  } catch (err) {
    showToast('Failed to save invoice: ' + err.message, 'error');
  }
}

// ─── PAGE 4: Customers Directory ─────────────────────────────────────────────
function renderCustomersList() {
  const el = $('#page-customers');

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Customers</h1>
        <p class="page-subtitle">Manage customer profiles and GSTIN details</p>
      </div>
      <button class="btn btn-primary" onclick="navigateTo('add-customer')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
        Add Customer
      </button>
    </div>

    ${state.customers.length === 0 ? `
      <div style="text-align:center;padding:60px 20px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-subtle)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="color:var(--text-muted)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p style="font-size:1rem;margin-top:12px;font-weight:600;color:var(--text-secondary)">No customers added yet</p>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateTo('add-customer')">+ Add First Customer</button>
      </div>
    ` : `
      <div class="customers-grid">
        ${state.customers.map(c => `
          <div class="customer-card">
            <div class="customer-card-header">
              <div>
                <div class="customer-name">${escHtml(c.name)}</div>
                <span class="customer-type-badge">${c.type || 'B2B'}</span>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button>
            </div>
            <div style="font-size:0.8rem;line-height:1.6;color:var(--text-secondary)">
              ${c.gstin ? `<strong>GSTIN:</strong> <span class="font-mono" style="color:var(--accent-secondary)">${c.gstin}</span><br>` : '<span style="color:var(--text-muted)">Unregistered (B2C)</span><br>'}
              ${c.state ? `State: ${c.state}<br>` : ''}
              ${c.phone ? `Phone: ${c.phone}<br>` : ''}
              ${c.email ? `Email: ${c.email}` : ''}
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:10px">
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteCustomer('${c.id}', '${escHtml(c.name)}')">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderCustomerForm(customerData = null) {
  const el = $('#page-add-customer');
  const isEdit = !!customerData;
  state.editCustomerId = isEdit ? customerData.id : null;
  const c = customerData || {};

  el.innerHTML = `
    <h1 class="page-title">${isEdit ? 'Edit Customer' : 'Add New Customer'}</h1>
    <p class="page-subtitle">${isEdit ? `Editing ${escHtml(c.name)}` : 'Enter customer details for GST billing'}</p>

    <div class="builder-card" style="max-width:700px">
      <form onsubmit="handleCustomerSubmit(event)">
        <div class="form-grid-2">
          <div class="form-group full-width">
            <label for="c-name">Customer / Company Name *</label>
            <input type="text" id="c-name" value="${escHtml(c.name || '')}" required placeholder="Acme Technologies Pvt Ltd" />
          </div>

          <div class="form-group">
            <label for="c-type">Customer Type</label>
            <select id="c-type">
              <option value="B2B" ${c.type === 'B2B' ? 'selected' : ''}>B2B (Registered Business)</option>
              <option value="B2C" ${c.type === 'B2C' ? 'selected' : ''}>B2C (Consumer / Unregistered)</option>
              <option value="SEZ" ${c.type === 'SEZ' ? 'selected' : ''}>SEZ Developer / Unit</option>
            </select>
          </div>

          <div class="form-group">
            <label for="c-gstin">GSTIN (15-digit)</label>
            <input type="text" id="c-gstin" class="font-mono" maxlength="15" value="${c.gstin || ''}" placeholder="27AABCU9603R1ZX" />
          </div>

          <div class="form-group">
            <label for="c-state">State / UT *</label>
            <select id="c-state" required>
              <option value="">-- Select State --</option>
              ${INDIAN_STATES.map(s => `<option value="${s.name}" ${c.state === s.name ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="c-pan">PAN Number</label>
            <input type="text" id="c-pan" class="font-mono" maxlength="10" value="${c.pan || ''}" placeholder="AABCU9603R" />
          </div>

          <div class="form-group">
            <label for="c-email">Email Address</label>
            <input type="email" id="c-email" value="${c.email || ''}" placeholder="billing@acme.com" />
          </div>

          <div class="form-group">
            <label for="c-phone">Phone Number</label>
            <input type="tel" id="c-phone" value="${c.phone || ''}" placeholder="+91 98765 43210" />
          </div>

          <div class="form-group full-width">
            <label for="c-address">Billing Address</label>
            <textarea id="c-address" rows="3" placeholder="Full address details...">${escHtml(c.address || '')}</textarea>
          </div>
        </div>

        <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="navigateTo('customers')">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Customer'}</button>
        </div>
      </form>
    </div>
  `;
}

async function handleCustomerSubmit(e) {
  e.preventDefault();
  const payload = {
    name: $('#c-name')?.value.trim(),
    type: $('#c-type')?.value,
    gstin: $('#c-gstin')?.value.trim().toUpperCase(),
    state: $('#c-state')?.value,
    pan: $('#c-pan')?.value.trim().toUpperCase(),
    email: $('#c-email')?.value.trim(),
    phone: $('#c-phone')?.value.trim(),
    address: $('#c-address')?.value.trim()
  };

  try {
    if (state.editCustomerId) {
      await api('PUT', `/api/customers/${state.editCustomerId}`, payload);
      showToast('Customer updated', 'success');
    } else {
      await api('POST', '/api/customers', payload);
      showToast('Customer created', 'success');
    }
    state.editCustomerId = null;
    await loadData();
    navigateTo('customers');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

function editCustomer(id) {
  const c = state.customers.find(item => item.id === id);
  if (!c) return;
  state.editCustomerId = id;
  renderCustomerForm(c);
  navigateTo('add-customer');
}

// ─── PAGE 5: Products Catalog ────────────────────────────────────────────────
function renderProductsList() {
  const el = $('#page-products');

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Products Catalog</h1>
        <p class="page-subtitle">Manage products, HSN/SAC codes, pricing, and GST tax slabs</p>
      </div>
      <button class="btn btn-primary" onclick="openAddProductForm()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Product
      </button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="product-search" placeholder="Search by product name, SKU, HSN/SAC code…" oninput="filterProductsTable()" />
        </div>
      </div>

      <div id="products-table-wrap">
        ${renderProductsTableRows(state.products)}
      </div>
    </div>
  `;
}

function openAddProductForm() {
  state.editProductId = null;
  navigateTo('add-product');
}

function renderProductsTableRows(products) {
  if (!products || products.length === 0) {
    return `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <p style="font-size:1rem;font-weight:600;color:var(--text-secondary)">No products found</p>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateTo('add-product')">+ Add Product</button>
      </div>
    `;
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Product / Service</th>
          <th>Linked Formula (Recipe)</th>
          <th>Stock &amp; Container Capacities</th>
          <th>Price (₹)</th>
          <th>GST Rate</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(p => {
          const recipe = state.recipes.find(r => r.id === p.recipeId);
          const variants = p.variants && p.variants.length > 0 ? p.variants : [];

          // ── Multi-key Finished Goods Inventory lookup ──────────────────────────
          const fgEntry = (state.finishedGoods || []).find(fg => {
            if (fg.productId && fg.productId === p.id) return true;
            if (p.recipeId && fg.recipeId && fg.recipeId === p.recipeId) return true;
            if (recipe && fg.name && fg.name.toLowerCase().trim() === (recipe.name || '').toLowerCase().trim()) return true;
            const fgName = (fg.name || '').toLowerCase().trim();
            const pName  = p.name.toLowerCase().trim();
            return fgName === pName || fgName.includes(pName) || pName.includes(fgName);
          });
          const fgStock = fgEntry ? (fgEntry.currentStock || 0) : 0;
          const fgUnit = fgEntry ? (fgEntry.unit || 'pcs') : 'pcs';

          return `
          <tr>
            <td>
              <strong style="color:#fff">${escHtml(p.name)}</strong>
              ${p.sku ? `<br><span class="font-mono" style="font-size:0.7rem;color:var(--text-muted)">SKU: ${p.sku}</span>` : ''}
              ${p.hsn_sac ? `<br><span class="font-mono" style="font-size:0.72rem;color:var(--accent-secondary)">HSN/SAC: ${p.hsn_sac}</span>` : ''}
            </td>
            <td>
              ${recipe ? `
                <span class="status-badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:700">
                  ⚡ ${escHtml(recipe.name)}
                </span>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Base: ${recipe.bottleSize||1} ${escHtml(recipe.bottleSizeUnit||'kg')}</div>
              ` : `<span style="font-size:0.75rem;color:var(--text-muted)">No Recipe Linked</span>`}
            </td>
            <td>
              <div style="font-size:0.78rem;font-weight:700;color:${fgStock > 0 ? 'var(--accent-secondary)' : '#f87171'};margin-bottom:4px">
                Available Finished Goods Stock: ${fgStock} ${escHtml(fgUnit)}
                ${fgStock <= 0 ? '<span style="font-size:0.68rem;color:#f87171"> (⚠ Out of Manufactured Stock)</span>' : ''}
              </div>
              ${(() => {
                // ── Dimension-aware total bulk calculation ──────────────────────
                let totalBulkInBase = 0;
                let fgBaseUnit = 'g';
                if (fgEntry) {
                  const baseSize = fgEntry.bottleSize || 1;
                  const baseUnit = fgEntry.bottleSizeUnit || 'kg';
                  const baseQty  = fgEntry.currentStock || 0;
                  fgBaseUnit = (window.unitConv && window.unitConv.getBaseUnit) ? window.unitConv.getBaseUnit(baseUnit) : 'g';
                  const baseSizeInBase = (window.unitConv && window.unitConv.convertToBase) ? window.unitConv.convertToBase(baseSize, baseUnit) : baseSize;
                  totalBulkInBase = baseQty * baseSizeInBase;
                }

                if (variants.length > 0) {
                  return `
                    <div style="display:flex;flex-direction:column;gap:4px">
                      ${variants.map((v, idx) => {
                        const bSize = v.bottleSize || 1;
                        const bUnit = v.bottleSizeUnit || 'kg';
                        // Dimension-aware max feasible calculation
                        let maxFeasible = 0;
                        if (window.unitConv && window.unitConv.maxFeasibleBottles && fgEntry) {
                          maxFeasible = window.unitConv.maxFeasibleBottles(
                            (fgEntry.currentStock || 0) * (fgEntry.bottleSize || 1),
                            fgEntry.bottleSizeUnit || 'kg',
                            bSize,
                            bUnit
                          );
                        } else if (fgEntry) {
                          const vSizeInBase = (window.unitConv && window.unitConv.convertToBase) ? window.unitConv.convertToBase(bSize, bUnit) : bSize;
                          maxFeasible = vSizeInBase > 0 ? Math.floor(totalBulkInBase / vSizeInBase) : 0;
                        }
                        const vStock = v.stock !== undefined ? v.stock : 0;
                        const inputId = `inline-stock-${p.id}-${idx}`;

                        return `
                          <div style="font-size:0.73rem;background:var(--bg-input);padding:4px 8px;border-radius:4px;display:flex;align-items:center;justify-content:space-between;gap:8px">
                            <div style="display:flex;align-items:center;gap:6px">
                              <strong style="color:#fff;min-width:60px">${escHtml(v.bottleSize ? `${v.bottleSize} ${v.bottleSizeUnit||'kg'}` : v.name)}:</strong>
                              <span style="color:var(--text-muted);font-size:0.7rem">Stock:</span>
                              <input type="number" min="0" step="1" value="${vStock}" data-orig="${vStock}"
                                id="${inputId}"
                                style="width:52px;padding:2px 4px;font-size:0.75rem;background:rgba(255,255,255,0.08);border:1px solid var(--border-subtle);border-radius:3px;color:#fff;text-align:center;font-weight:700"
                                title="Set packaged container stock for this variant"
                              />
                              <button type="button" class="btn btn-primary btn-sm" style="padding:1px 6px;font-size:0.68rem;height:auto"
                                onclick="quickUpdateVariantStock('${p.id}', '${v.variantId || v.name}', '${inputId}')">Save</button>
                            </div>
                            <div style="text-align:right;display:flex;align-items:center;gap:8px">
                              <div>
                                <span style="color:${vStock > 0 ? '#10b981' : 'var(--text-muted)'};font-weight:600;font-size:0.68rem;display:block">
                                  ${vStock > 0 ? `${vStock} in stock` : '0 in stock'}
                                </span>
                                <span style="color:var(--accent-secondary);font-size:0.65rem;font-weight:600">
                                  (Max Feasible: ${maxFeasible} bottles)
                                </span>
                              </div>
                              <button type="button" class="btn btn-danger btn-sm" style="padding:1px 6px;font-size:0.68rem;height:auto;line-height:1.2"
                                onclick="openDeleteVariantModal('${p.id}', '${v.variantId || v.name}')" title="Delete this variation">✕</button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  `;
                } else {
                  return `<span style="font-size:0.72rem;color:var(--text-muted)">Single Variant</span>`;
                }
              })()}
            </td>
            <td class="font-mono" style="font-weight:700;color:#fff">${formatCurrency(p.rate)}</td>
            <td><span class="status-badge" style="background:rgba(99,102,241,0.15);color:var(--accent-primary-light)">${p.gst_rate||0}%</span></td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" style="font-weight:700;color:var(--accent-secondary);border-color:var(--accent-secondary)" onclick="openFillBottlesModal('${p.id}')">
                  🍾 Package Bottles
                </button>
                <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct('${p.id}', '${escHtml(p.name)}')">Delete</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ─── BOTTLE / CONTAINER SIZE PACKAGING & DISTRIBUTION MODAL ────────────────
let _currentFillProductId = null;

function openFillBottlesModal(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return showToast('Product not found', 'error');

  // ── Multi-key FG lookup to get live manufactured stock ──────────────────────
  const recipe = state.recipes.find(r => r.id === p.recipeId);
  const fgEntry = (state.finishedGoods || []).find(fg => {
    if (fg.productId && fg.productId === p.id) return true;
    if (p.recipeId && fg.recipeId && fg.recipeId === p.recipeId) return true;
    if (recipe && fg.name && fg.name.toLowerCase().trim() === (recipe.name || '').toLowerCase().trim()) return true;
    const fgName = (fg.name || '').toLowerCase().trim();
    const pName  = p.name.toLowerCase().trim();
    return fgName === pName || fgName.includes(pName) || pName.includes(fgName);
  });

  const fgStock  = fgEntry ? (fgEntry.currentStock || 0) : 0;
  const fgSize   = fgEntry ? (fgEntry.bottleSize   || 1) : 1;
  const fgUnit   = fgEntry ? (fgEntry.bottleSizeUnit || 'kg') : 'kg';
  const totalBulkInFGUnit = fgStock * fgSize;
  const bulkDisplayUnit   = fgUnit;

  const variants = p.variants && p.variants.length > 0 ? p.variants : [
    { variantId: 'VAR-1', name: `${p.name} Default`, bottleSize: fgSize, bottleSizeUnit: fgUnit, price: p.rate, stock: 0 }
  ];

  _currentFillProductId = productId;

  const modal = $('#fill-bottles-modal');
  const body = $('#fill-bottles-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="margin-bottom:14px">
      <h3 style="color:#fff;font-size:1.05rem;margin-bottom:4px">${escHtml(p.name)}</h3>
      <div style="font-size:0.8rem;color:#10b981;font-weight:700">
        Available Manufactured Stock: <span id="fill-bulk-stock-val" class="font-mono">${fgStock} pcs</span>
        &nbsp;=&nbsp;<span class="font-mono">${totalBulkInFGUnit} ${escHtml(bulkDisplayUnit)}</span>
        ${fgStock <= 0 ? '<span style="color:#f87171;font-size:0.72rem;margin-left:6px">⚠ No manufactured stock available</span>' : ''}
      </div>
    </div>

    <div class="form-group" style="margin-bottom:14px">
      <label for="fill-variant-select">Select Container Size Variant to Package *</label>
      <select id="fill-variant-select" onchange="updateFillBottlesCalc('${productId}')">
        ${variants.map(v => {
          const pkgRM = (state.rawMaterials || []).find(r => r.id === v.packagingRawMaterialId);
          const pkgName = pkgRM ? ` [Packaging: ${pkgRM.name}]` : '';
          return `
            <option value="${v.variantId || v.name}" data-size="${v.bottleSize||fgSize}" data-unit="${v.bottleSizeUnit||fgUnit}" data-stock="${v.stock||0}" data-pkgid="${v.packagingRawMaterialId||''}" data-pkgqty="${v.packagingQty||1}">
              ${escHtml(v.bottleSize ? `${v.bottleSize} ${v.bottleSizeUnit||fgUnit}` : v.name)}${escHtml(pkgName)} (Finished Stock: ${v.stock||0} pcs) — ₹${v.price || 0}
            </option>
          `;
        }).join('')}
      </select>
    </div>

    <div class="form-group" style="margin-bottom:14px">
      <label for="fill-qty-input">Quantity of Containers to Fill / Package *</label>
      <input type="number" id="fill-qty-input" value="50" min="1" step="1" oninput="updateFillBottlesCalc('${productId}')" placeholder="e.g. 50" />
    </div>

    <div id="fill-bottles-info" style="font-size:0.8rem;background:var(--bg-input);padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle)">
      <!-- Rendered dynamically -->
    </div>
  `;

  modal.classList.add('open');
  updateFillBottlesCalc(productId);
}

function updateFillBottlesCalc(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;

  const select = $('#fill-variant-select');
  const qtyInput = $('#fill-qty-input');
  const info = $('#fill-bottles-info');
  if (!select || !qtyInput || !info) return;

  const opt = select.options[select.selectedIndex];
  if (!opt) return;

  const bSize = parseFloat(opt.dataset.size) || 1;
  const bUnit = opt.dataset.unit || 'kg';
  const curStock = parseFloat(opt.dataset.stock) || 0;
  const numBottles = parseInt(qtyInput.value, 10) || 0;
  const pkgRMId = opt.dataset.pkgid || '';
  const pkgQtyPerUnit = parseFloat(opt.dataset.pkgqty) || 1;

  // ── Multi-key FG lookup ────────────────────────────────────────────────────
  const recipe = state.recipes.find(r => r.id === p.recipeId);
  const fgEntry = (state.finishedGoods || []).find(fg => {
    if (fg.productId && fg.productId === p.id) return true;
    if (p.recipeId && fg.recipeId && fg.recipeId === p.recipeId) return true;
    if (recipe && fg.name && fg.name.toLowerCase().trim() === (recipe.name || '').toLowerCase().trim()) return true;
    const fgName = (fg.name || '').toLowerCase().trim();
    const pName  = p.name.toLowerCase().trim();
    return fgName === pName || fgName.includes(pName) || pName.includes(fgName);
  });

  const fgStock    = fgEntry ? (fgEntry.currentStock || 0) : 0;
  const fgSize     = fgEntry ? (fgEntry.bottleSize   || 1) : 1;
  const fgBaseUnit = fgEntry ? (fgEntry.bottleSizeUnit || 'kg') : 'kg';

  // ── Dimension-aware calculation ────────────────────────────────────────────
  const uc = window.unitConv;
  let totalFGInBase   = fgStock * fgSize;
  let neededInBase    = numBottles * bSize;
  let displayUnit     = fgBaseUnit;

  if (uc && uc.convertToBase) {
    try {
      const fgDim = uc.getDimension ? uc.getDimension(fgBaseUnit) : '';
      const varDim = uc.getDimension ? uc.getDimension(bUnit) : '';
      const fgBaseInBase = uc.convertToBase(fgSize, fgBaseUnit);
      totalFGInBase = fgStock * fgBaseInBase;
      displayUnit   = uc.getBaseUnit ? uc.getBaseUnit(fgBaseUnit) : fgBaseUnit;

      if (fgDim === varDim || !varDim || varDim === 'custom') {
        neededInBase = numBottles * uc.convertToBase(bSize, bUnit);
      } else if (varDim === 'count') {
        neededInBase = numBottles * bSize * (fgBaseInBase || 1);
      } else {
        neededInBase = numBottles * bSize;
      }
    } catch (_) {}
  }

  const isFGSufficient = totalFGInBase >= neededInBase;
  const maxFeasibleFG  = (neededInBase > 0 && numBottles > 0)
    ? Math.floor(totalFGInBase / (neededInBase / numBottles))
    : 0;

  // ── Packaging RM stock evaluation ──────────────────────────────────────────
  let targetRM = null;
  let packagingNeeded = 0;
  let availablePackagingStock = Infinity;
  let maxFeasiblePackaging = Infinity;
  let isPackagingSufficient = true;

  if (pkgRMId) {
    targetRM = (state.rawMaterials || []).find(r => r.id === pkgRMId);
    if (targetRM) {
      availablePackagingStock = targetRM.current_stock !== undefined ? targetRM.current_stock : (targetRM.stock || 0);
      packagingNeeded = numBottles * pkgQtyPerUnit;
      isPackagingSufficient = availablePackagingStock >= packagingNeeded;
      maxFeasiblePackaging = pkgQtyPerUnit > 0 ? Math.floor(availablePackagingStock / pkgQtyPerUnit) : 0;
    }
  }

  const effectiveMaxFeasible = Math.min(maxFeasibleFG, maxFeasiblePackaging);
  const isOverallSufficient = isFGSufficient && isPackagingSufficient && numBottles > 0;

  info.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span>Bulk Required for ${numBottles} containers:</span>
      <strong class="font-mono" style="color:${isFGSufficient ? 'var(--accent-secondary)' : 'var(--accent-danger)'}">
        ${neededInBase.toFixed(3)} ${escHtml(displayUnit)}
      </strong>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span>Available Manufactured Stock:</span>
      <strong class="font-mono" style="color:#10b981">
        ${totalFGInBase.toFixed(3)} ${escHtml(displayUnit)}
      </strong>
    </div>

    ${targetRM ? `
      <div style="margin:8px 0;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:4px;border:1px solid var(--border-subtle)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--accent-primary-light);font-weight:600">📦 Packaging Required (${escHtml(targetRM.name)}):</span>
          <strong class="font-mono" style="color:${isPackagingSufficient ? '#38bdf8' : '#f87171'}">
            ${packagingNeeded} ${escHtml(targetRM.unit || 'pcs')}
          </strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Available Container Inventory:</span>
          <strong class="font-mono" style="color:${availablePackagingStock > 0 ? '#10b981' : '#f87171'}">
            ${availablePackagingStock} ${escHtml(targetRM.unit || 'pcs')}
          </strong>
        </div>
        ${!isPackagingSufficient ? `
          <div style="color:#f87171;font-size:0.72rem;margin-top:4px;font-weight:600">
            ⚠ Insufficient packaging containers! Maximum packable by containers: ${maxFeasiblePackaging} units.
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span>Effective Max Feasible Containers:</span>
      <strong class="font-mono" style="color:var(--accent-secondary)">${effectiveMaxFeasible}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
      <span>Resulting Finished Stock:</span>
      <strong class="font-mono" style="color:#10b981">
        ${curStock} + ${numBottles} = ${curStock + numBottles} pcs
      </strong>
    </div>
    <div style="font-size:0.75rem;color:${isOverallSufficient ? '#10b981' : '#f87171'};font-weight:700">
      ${isOverallSufficient ? '✓ Sufficient manufactured stock & packaging containers available' : '⚠ Exceeds available stock or packaging!'}
    </div>
  `;

  const confirmBtn = $('#confirm-fill-bottles-btn');
  if (confirmBtn) confirmBtn.disabled = !isOverallSufficient || numBottles <= 0;
}

function closeFillBottlesModal() {
  $('#fill-bottles-modal')?.classList.remove('open');
  _currentFillProductId = null;
}

async function submitFillBottles() {
  if (!_currentFillProductId) return;
  const variantId = $('#fill-variant-select')?.value;
  const numBottles = parseInt($('#fill-qty-input')?.value, 10);

  if (!variantId || !numBottles || numBottles <= 0) {
    return showToast('Select a variant and positive bottle count', 'error');
  }

  try {
    const res = await api('POST', `/api/products/${_currentFillProductId}/fill-bottles`, {
      variantId,
      numberOfBottles: numBottles
    });

    showToast(res.message || 'Bottling completed & stocks updated! ✓', 'success');
    closeFillBottlesModal();
    await loadData();
    renderProductsList();
  } catch (err) {
    showToast('Failed to fill bottles: ' + err.message, 'error');
  }
}

async function quickUpdateVariantStock(productId, variantId, inputId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  const newStock = parseInt(inputEl.value, 10);
  const origStock = parseInt(inputEl.dataset.orig, 10) || 0;

  if (isNaN(newStock) || newStock < 0) {
    showToast('Please enter a valid non-negative integer stock count', 'error');
    inputEl.value = origStock;
    return;
  }

  if (newStock === origStock) {
    return showToast('No change in stock quantity', 'info');
  }

  try {
    const res = await api('POST', `/api/products/${productId}/update-variant-stock`, {
      variantId,
      newStock
    });

    showToast(res.message || 'Variant stock updated & Finished Goods stock deducted! ✓', 'success');
    inputEl.dataset.orig = String(newStock);
    await loadData();
    renderProductsList();
  } catch (err) {
    showToast('Stock Update Failed: ' + err.message, 'error');
    inputEl.value = origStock;
  }
}
window.quickUpdateVariantStock = quickUpdateVariantStock;

// ─── PRODUCT VARIATION DELETION GOVERNANCE MODAL ────────────────────────────
let _delVarContext = null;

async function openDeleteVariantModal(productId, variantId) {
  const p = (state.products || []).find(item => item.id === productId);
  if (!p) return showToast('Product not found', 'error');

  const v = (p.variants || []).find(item => item.variantId === variantId || item.name === variantId);
  if (!v) return showToast('Variant not found', 'error');

  const modal = $('#delete-variant-modal');
  const body = $('#delete-variant-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="text-align:center;padding:30px 10px;color:var(--text-muted)">
      Loading deletion impact analysis…
    </div>
  `;
  modal.classList.add('open');

  try {
    const impact = await api('GET', `/api/products/${productId}/variants/${encodeURIComponent(v.variantId || variantId)}/deletion-impact`);
    _delVarContext = {
      productId,
      variantId: v.variantId || variantId,
      impact
    };

    const curStock = impact.currentFinishedStock || 0;
    const maxRev = impact.maxEligibleReversal || 0;
    const pkgRM = impact.packagingRawMaterial;

    body.innerHTML = `
      <div style="margin-bottom:14px;border-bottom:1px solid var(--border-subtle);padding-bottom:12px">
        <h3 style="color:#fff;font-size:1.05rem;margin-bottom:4px">
          ${escHtml(impact.variantName || v.name)}
        </h3>
        <div style="font-size:0.78rem;color:var(--text-secondary)">
          Product: <strong style="color:#fff">${escHtml(impact.productName || p.name)}</strong> · Variant ID: <span class="font-mono">${escHtml(impact.variantId || v.variantId)}</span>
        </div>
      </div>

      <!-- Impact Analysis Summary Card -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:10px 12px">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">Finished Stock to be Removed</div>
          <div class="font-mono" style="font-size:1.2rem;font-weight:700;color:#f87171">${curStock} pcs</div>
        </div>
        <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.25);border-radius:6px;padding:10px 12px">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">Eligible Packaging Reversal</div>
          <div class="font-mono" style="font-size:1.2rem;font-weight:700;color:#10b981">${maxRev} units</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Returns containers to original batch(es)</div>
        </div>
      </div>

      ${pkgRM ? `
        <div style="font-size:0.78rem;background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:6px;padding:10px 12px;margin-bottom:14px">
          <div style="color:var(--accent-primary-light);font-weight:600;margin-bottom:4px">📦 Associated Packaging Raw Material:</div>
          <div>${escHtml(pkgRM.name)} · Current Stock: <strong class="font-mono">${pkgRM.currentStock} ${escHtml(pkgRM.unit)}</strong></div>
        </div>
      ` : ''}

      ${curStock > 0 && maxRev > 0 ? `
        <div class="form-group" style="margin-bottom:16px">
          <label style="font-weight:700;color:#fff">Inventory Action for Finished Stock *</label>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
            <label style="font-size:0.82rem;color:var(--text-primary);display:flex;align-items:flex-start;gap:8px;cursor:pointer;background:rgba(16,185,129,0.08);padding:10px 12px;border-radius:6px;border:1px solid rgba(16,185,129,0.3)">
              <input type="radio" name="delvar-action" value="REVERSE" checked style="margin-top:2px" />
              <div>
                <strong>Reverse Packaging Stock (Recommended)</strong>
                <div style="font-size:0.72rem;color:var(--text-secondary)">
                  Returns up to ${maxRev} containers back to original Raw Material batches with complete batch lineage restoration.
                </div>
              </div>
            </label>
            <label style="font-size:0.82rem;color:var(--text-primary);display:flex;align-items:flex-start;gap:8px;cursor:pointer;background:rgba(239,68,68,0.06);padding:10px 12px;border-radius:6px;border:1px solid rgba(239,68,68,0.2)">
              <input type="radio" name="delvar-action" value="DISCARD" style="margin-top:2px" />
              <div>
                <strong>Discard Finished Goods</strong>
                <div style="font-size:0.72rem;color:var(--text-secondary)">
                  Permanently writes off ${curStock} finished units without returning containers to Raw Material batches.
                </div>
              </div>
            </label>
          </div>
        </div>
      ` : ''}

      <div class="form-group" style="margin-bottom:6px">
        <label for="delvar-reason-input" style="font-weight:700;color:#fff">
          Mandatory Deletion Reason *
        </label>
        <textarea id="delvar-reason-input" rows="2" placeholder="e.g. Discontinued 500 mL bottle size due to new supplier packaging standard"
          oninput="onDelVarReasonInput()" style="width:100%;font-size:0.82rem;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:6px;color:#fff"></textarea>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">
          Required for tamper-proof regulatory audit snapshot and physical JSON removal.
        </div>
      </div>
    `;

    const confirmBtn = $('#confirm-delete-variant-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.5';
      confirmBtn.style.cursor = 'not-allowed';
    }
  } catch (err) {
    body.innerHTML = `
      <div style="color:#f87171;padding:20px;text-align:center">
        Failed to analyze variation deletion impact: ${escHtml(err.message)}
      </div>
    `;
  }
}
window.openDeleteVariantModal = openDeleteVariantModal;

function onDelVarReasonInput() {
  const reason = $('#delvar-reason-input')?.value.trim() || '';
  const confirmBtn = $('#confirm-delete-variant-btn');
  if (confirmBtn) {
    const isValid = reason.length > 0;
    confirmBtn.disabled = !isValid;
    confirmBtn.style.opacity = isValid ? '1' : '0.5';
    confirmBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
  }
}
window.onDelVarReasonInput = onDelVarReasonInput;

function closeDeleteVariantModal() {
  $('#delete-variant-modal')?.classList.remove('open');
  _delVarContext = null;
}
window.closeDeleteVariantModal = closeDeleteVariantModal;

async function submitDeleteVariant() {
  if (!_delVarContext) return;
  const reason = $('#delvar-reason-input')?.value.trim();
  if (!reason) {
    return showToast('Mandatory deletion reason is required', 'error');
  }

  const actionRadio = document.querySelector('input[name="delvar-action"]:checked');
  const action = actionRadio ? actionRadio.value : 'DISCARD';

  try {
    const res = await api('DELETE', `/api/products/${_delVarContext.productId}/variants/${encodeURIComponent(_delVarContext.variantId)}`, {
      reason,
      action,
      operatorName: 'Plant Operator'
    });

    showToast(res.message || 'Product variation deleted successfully ✓', 'success');
    closeDeleteVariantModal();
    await loadData();
    renderProductsList();
  } catch (err) {
    showToast('Failed to delete variation: ' + err.message, 'error');
  }
}
window.submitDeleteVariant = submitDeleteVariant;



function filterProductsTable() {
  const query = $('#product-search')?.value.toLowerCase().trim() || '';
  const filtered = state.products.filter(p => !query || p.name.toLowerCase().includes(query) || (p.hsn_sac && p.hsn_sac.includes(query)));
  const wrap = $('#products-table-wrap');
  if (wrap) wrap.innerHTML = renderProductsTableRows(filtered);
}

const RAW_MATERIAL_UNIT_OPTIONS = [
  'mL', 'L', 'g', 'kg', 'mg', 't', 'pcs', 'box', 'bottle', 'roll'
];

function toggleCustomUnit(selectEl) {
  const customInput = selectEl.parentElement?.querySelector('.ving-custom-unit');
  if (!customInput) return;
  if (selectEl.value === 'CUSTOM') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = selectEl.value;
  }
}

function calculateRecipeCostPerBottle(recipe, rawMaterialsList = state.rawMaterials) {
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return 0;
  let totalCost = 0;
  for (const ing of recipe.ingredients) {
    const rm = rawMaterialsList.find(m => m.id === ing.raw_material_id || m.name === ing.raw_material_name);
    if (!rm) continue;
    const costPerUnit = parseFloat(rm.purchaseCost || rm.cost_per_unit || 0);
    const ingQty = parseFloat(ing.qty) || 0;
    const ingUnit = ing.unit || rm.unit;

    let qtyInStockUnit = ingQty;
    if (ingUnit !== rm.unit && window.unitConv && window.unitConv.areCompatible(ingUnit, rm.unit)) {
      try {
        qtyInStockUnit = window.unitConv.convert(ingQty, ingUnit, rm.unit);
      } catch (e) {
        qtyInStockUnit = ingQty;
      }
    }
    totalCost += (qtyInStockUnit * costPerUnit);
  }
  return parseFloat(totalCost.toFixed(2));
}

const PACKAGING_CONTAINER_UNITS = [
  // Containers, Boxes & Packaging
  { code: 'box', label: 'box — Box', group: '📦 Containers, Boxes & Packaging' },
  { code: 'carton', label: 'carton — Carton', group: '📦 Containers, Boxes & Packaging' },
  { code: 'bottle', label: 'bottle — Bottle', group: '📦 Containers, Boxes & Packaging' },
  { code: 'container', label: 'container — Container', group: '📦 Containers, Boxes & Packaging' },
  { code: 'packet', label: 'packet — Packet', group: '📦 Containers, Boxes & Packaging' },
  { code: 'pouch', label: 'pouch — Pouch', group: '📦 Containers, Boxes & Packaging' },
  { code: 'jar', label: 'jar — Jar', group: '📦 Containers, Boxes & Packaging' },
  { code: 'can', label: 'can — Can', group: '📦 Containers, Boxes & Packaging' },
  { code: 'strip', label: 'strip — Strip', group: '📦 Containers, Boxes & Packaging' },
  { code: 'tube', label: 'tube — Tube', group: '📦 Containers, Boxes & Packaging' },
  { code: 'vial', label: 'vial — Vial', group: '📦 Containers, Boxes & Packaging' },
  { code: 'bag', label: 'bag — Bag', group: '📦 Containers, Boxes & Packaging' },
  { code: 'roll', label: 'roll — Roll', group: '📦 Containers, Boxes & Packaging' },
  { code: 'drum', label: 'drum — Drum', group: '📦 Containers, Boxes & Packaging' },
  { code: 'pcs', label: 'pcs — Pieces / Units', group: '📦 Containers, Boxes & Packaging' },
  { code: 'unit', label: 'unit — Unit / Nos', group: '📦 Containers, Boxes & Packaging' },

  // Liquid / Volume
  { code: 'mL', label: 'mL — Millilitres', group: '🧪 Liquid / Volume' },
  { code: 'L', label: 'L — Litres', group: '🧪 Liquid / Volume' },

  // Weight / Mass
  { code: 'g', label: 'g — Grams', group: '⚖️ Weight / Mass' },
  { code: 'kg', label: 'kg — Kilograms', group: '⚖️ Weight / Mass' },
  { code: 'mg', label: 'mg — Milligrams', group: '⚖️ Weight / Mass' }
];

function renderContainerUnitOptions(selectedUnit) {
  const groups = [
    {
      group: '📦 Containers, Boxes & Packaging',
      units: PACKAGING_CONTAINER_UNITS.filter(u => u.group === '📦 Containers, Boxes & Packaging')
    },
    {
      group: '🧪 Liquid / Volume',
      units: PACKAGING_CONTAINER_UNITS.filter(u => u.group === '🧪 Liquid / Volume')
    },
    {
      group: '⚖️ Weight / Mass',
      units: PACKAGING_CONTAINER_UNITS.filter(u => u.group === '⚖️ Weight / Mass')
    }
  ];

  const allCodes = PACKAGING_CONTAINER_UNITS.map(u => u.code);
  let customHtml = '';
  if (selectedUnit && !allCodes.includes(selectedUnit)) {
    customHtml = `<optgroup label="Custom Unit"><option value="${escHtml(selectedUnit)}" selected>${escHtml(selectedUnit)} (Custom)</option></optgroup>`;
  }

  return customHtml + groups.map(g => `
    <optgroup label="${g.group}">
      ${g.units.map(u => `<option value="${u.code}" ${u.code === selectedUnit ? 'selected' : ''}>${u.label}</option>`).join('')}
    </optgroup>
  `).join('');
}

function getCompatibleUnitsForRecipe(recipe) {
  return PACKAGING_CONTAINER_UNITS;
}

function onProductRecipeSelect(selectEl, vIdx = null) {
  const recipeId = selectEl.value;
  const card = selectEl.closest('.variant-card') || selectEl.closest('.builder-card');
  const infoWrap = card ? card.querySelector('.linked-recipe-info-wrap') : null;

  const recipe = state.recipes.find(r => r.id === recipeId);

  if (!infoWrap) return;

  if (!recipeId || !recipe) {
    infoWrap.innerHTML = '';
    return;
  }

  const mfgCost = calculateRecipeCostPerBottle(recipe);
  const priceInput = card.querySelector('.v-price') || $('#p-rate');
  const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
  const profit = price > 0 ? parseFloat((price - mfgCost).toFixed(2)) : 0;
  const marginPct = price > 0 ? Math.round((profit / price) * 100) : 0;

  infoWrap.innerHTML = `
    <div style="font-size:0.8rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);padding:10px 14px;border-radius:var(--radius-sm);margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="color:#10b981">Formula: ${escHtml(recipe.name)}</strong> (${recipe.bottleSize||200} ${escHtml(recipe.bottleSizeUnit||'mL')})
        </div>
        <div class="font-mono" style="font-weight:700;color:#fff">
          Cost: ${formatCurrency(mfgCost)} / Bottle
        </div>
      </div>
      ${price > 0 ? `
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;display:flex;justify-content:space-between">
          <span>Selling Price: ${formatCurrency(price)}</span>
          <span style="color:${profit>=0?'#10b981':'#f87171'}">Est. Profit: ${formatCurrency(profit)} (${marginPct}% margin)</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderProductForm(productData = null) {
  const el = $('#page-add-product');
  const isEdit = !!productData;
  state.editProductId = isEdit ? productData.id : null;
  const p = productData || {};

  // Existing variants or default single variant
  const existingVariants = isEdit && p.variants && p.variants.length > 0
    ? p.variants
    : [
        {
          variantId: 'VAR-1',
          name: p.name || 'Default Variant',
          bottleSize: p.bottleSize || 200,
          bottleSizeUnit: p.bottleSizeUnit || 'mL',
          price: p.rate || 120,
          recipeId: p.recipeId || ''
        }
      ];

  const recipeOptions = state.recipes.map(r =>
    `<option value="${r.id}">${escHtml(r.name)} (${r.bottleSize||200} ${escHtml(r.bottleSizeUnit||'mL')})</option>`
  ).join('');

  window._recipeOptions = recipeOptions;
  window._currentProductVariants = existingVariants;

  el.innerHTML = `
    <h1 class="page-title">${isEdit ? 'Edit Product' : 'Add New Product'}</h1>
    <p class="page-subtitle">${isEdit ? `Editing ${escHtml(p.name)}` : 'Define product pricing, bottle variants, and link manufacturing formulas'}</p>

    <div class="builder-card" style="max-width:820px">
      <form onsubmit="handleProductSubmit(event)">
        <div class="form-grid-2">
          <div class="form-group full-width">
            <label for="p-name">Base Product Name *</label>
            <input type="text" id="p-name" value="${escHtml(p.name || '')}" required placeholder="e.g. Premium Air Freshener" />
          </div>

          <div class="form-group">
            <label for="p-sku">SKU Code</label>
            <input type="text" id="p-sku" class="font-mono" value="${p.sku || ''}" placeholder="PAF-001" />
          </div>

          <div class="form-group">
            <label for="p-hsn">HSN / SAC Code (Optional)</label>
            <input type="text" id="p-hsn" class="font-mono" value="${p.hsn_sac || ''}" placeholder="e.g. 3307" />
          </div>

          <div class="form-group">
            <label for="p-rate">Default / Base Unit Price (₹) (Optional)</label>
            <input type="number" id="p-rate" step="0.01" value="${p.rate !== undefined ? p.rate : ''}" placeholder="e.g. 120.00" />
          </div>

          <div class="form-group">
            <label for="p-gst">GST Rate (Optional)</label>
            <select id="p-gst">
              ${GST_RATES.map(r => `<option value="${r}" ${p.gst_rate === r ? 'selected' : ''}>${r}%</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="p-unit">Unit of Measurement (UQC) (Optional)</label>
            <select id="p-unit">
              ${UQC_CODES.map(u => `<option value="${u.code}" ${(p.unit || 'BTL') === u.code ? 'selected' : ''}>${u.code} - ${u.desc}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="p-supply">Default Supply Type</label>
            <select id="p-supply">
              <option value="intra" ${p.supply_type === 'intra' ? 'selected' : ''}>Intra-State</option>
              <option value="inter" ${p.supply_type === 'inter' ? 'selected' : ''}>Inter-State</option>
            </select>
          </div>

          <div class="form-group">
            <label for="p-bulk-stock">Total Bulk Inventory Stock (Optional)</label>
            <input type="number" id="p-bulk-stock" min="0" step="any" value="${p.bulkStock !== undefined ? p.bulkStock : 10000}" placeholder="e.g. 10000" />
          </div>

          <div class="form-group">
            <label for="p-bulk-unit">Bulk Stock Unit</label>
            <select id="p-bulk-unit">
              ${RAW_MATERIAL_UNIT_OPTIONS.map(u => `<option value="${u}" ${(p.bulkStockUnit||'mL')===u?'selected':''}>${u}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="p-recipe">Pick Manufacturing Formula / Recipe (Optional)</label>
            <select id="p-recipe" onchange="onProductRecipeSelect(this)">
              <option value="">-- No Formula (Standard Purchased Product) --</option>
              ${state.recipes.map(r => `<option value="${r.id}" ${p.recipeId===r.id?'selected':''}>${escHtml(r.name)} (${r.bottleSize||200} ${escHtml(r.bottleSizeUnit||'mL')})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="linked-recipe-info-wrap"></div>

        <!-- Packaging Containers, Boxes & Variants Section -->
        <div style="margin-top:28px;border-top:1px solid var(--border-subtle);padding-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px">
            <div>
              <h3 style="font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:4px;display:flex;align-items:center;gap:6px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                Packaging Containers, Boxes &amp; Variants
              </h3>
              <p style="font-size:0.75rem;color:var(--text-secondary)">
                Add multiple packaging sizes / containers (e.g. 50 mL, 100 mL, 200 mL, 1 kg, 1 Box, 1 Carton, 1 Pouch, 1 Jar) with specific selling prices &amp; available stock.
              </p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addVariantCard()">
              + Add Container / Packaging Variant
            </button>
          </div>

          <div id="product-variant-cards-wrap" style="display:flex;flex-direction:column;gap:18px"></div>
        </div>

        <div style="margin-top:28px;display:flex;gap:12px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="navigateTo('products')">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Product &amp; Variants'}</button>
        </div>
      </form>
    </div>
  `;

  // Render initial variant cards
  const container = $('#product-variant-cards-wrap');
  if (container) {
    container.innerHTML = '';
    existingVariants.forEach((v, idx) => {
      renderVariantCardHTML(v, idx, container);
    });
  }

  if (p.recipeId) {
    setTimeout(() => {
      const sel = $('#p-recipe');
      if (sel) onProductRecipeSelect(sel);
    }, 10);
  }
}

let _vCardCount = 0;
function addVariantCard(initialData = null) {
  const container = $('#product-variant-cards-wrap');
  if (!container) return;
  const idx = container.children.length;
  const defaultVar = initialData || {
    variantId: `VAR-${Date.now()}-${idx}`,
    name: `Package Variant #${idx + 1}`,
    bottleSize: idx === 0 ? 1 : (idx === 1 ? 50 : 200),
    bottleSizeUnit: 'pcs',
    packagingRawMaterialId: '',
    packagingQty: 1,
    vendorPreference: { mode: 'FIFO', vendorId: null },
    price: idx === 0 ? 45 : (idx === 1 ? 80 : 150),
    stock: 0
  };
  renderVariantCardHTML(defaultVar, idx, container);
}

function renderVariantCardHTML(v, vIdx, container) {
  const card = document.createElement('div');
  card.className = 'variant-card';
  card.id = `vcard-${vIdx}`;
  card.dataset.vidx = vIdx;
  card.dataset.variantId = v.variantId || `VAR-${Date.now()}-${vIdx}`;
  card.style.cssText = 'background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:18px 20px;';

  // Available raw materials for packaging (bottles, containers, caps, pouches, boxes, cartons, etc.)
  const rawMaterials = state.rawMaterials || [];
  const selectedRMId = v.packagingRawMaterialId || '';
  const selectedRM = rawMaterials.find(r => r.id === selectedRMId);

  // Live detection info for packaging RM
  const rmStock = selectedRM ? (selectedRM.current_stock !== undefined ? selectedRM.current_stock : (selectedRM.stock || 0)) : 0;
  const rmUnit = selectedRM ? (selectedRM.unit || 'pcs') : '';
  const rmCost = selectedRM ? (selectedRM.cost_per_unit || 0) : 0;

  // Extract vendors for this raw material if available
  const rmBatches = (state.rawMaterialBatches || []).filter(b => b.rawMaterialId === selectedRMId);
  const vendorsMap = new Map();
  rmBatches.forEach(b => {
    if (b.vendorName && b.vendorName !== '-') {
      vendorsMap.set(b.vendorId || b.vendorName, b.vendorName);
    }
  });

  const vPrefMode = (v.vendorPreference && v.vendorPreference.mode) || 'FIFO';
  const vPrefVendorId = (v.vendorPreference && v.vendorPreference.vendorId) || '';

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--border-subtle);padding-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <strong style="color:var(--accent-secondary);font-size:0.88rem">Packaging / Container Variant #${vIdx + 1}</strong>
        <span class="font-mono" style="font-size:0.72rem;color:var(--text-muted)">(${escHtml(v.variantId || 'New Variant')})</span>
      </div>
      ${vIdx > 0 ? `<button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('vcard-${vIdx}').remove()">Remove Variant</button>` : ''}
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label>Container / Pack Size *</label>
        <input type="number" class="v-size" value="${v.bottleSize !== undefined ? v.bottleSize : 1}" min="0.001" step="any" required placeholder="e.g. 1, 50, 200, 500" />
      </div>
      <div class="form-group">
        <label>Container / Pack Unit *</label>
        <select class="v-unit">
          ${renderContainerUnitOptions(v.bottleSizeUnit || 'pcs')}
        </select>
      </div>
      <div class="form-group">
        <label>Selling Price for this Pack / Container (₹) *</label>
        <input type="number" class="v-price" value="${v.price !== undefined ? v.price : 120}" min="0" step="0.01" required placeholder="e.g. 45.00" />
      </div>
      <div class="form-group">
        <label>Finished Packaged Goods Stock (Ready to Sell)</label>
        <input type="number" class="v-stock" value="${v.stock !== undefined ? v.stock : 0}" min="0" step="1" placeholder="0" />
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">Created via bottling/packaging runs. Does not hold empty containers/boxes.</div>
      </div>
    </div>

    <!-- Packaging Raw Material Association (Single Source of Truth) -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:6px;padding:12px 14px;margin-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <label style="font-size:0.78rem;font-weight:700;color:var(--accent-primary-light);margin-bottom:0">
          📦 Packaging Raw Material (Box / Carton / Bottle / Jar / Container / Cap)
        </label>
        <span style="font-size:0.7rem;color:var(--text-muted)">Single Source of Truth for Packaging Stock &amp; FIFO</span>
      </div>
        <span style="font-size:0.7rem;color:var(--text-muted)">Single Source of Truth for Container Stock &amp; FIFO</span>
      </div>

      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom:6px">
          <label style="font-size:0.72rem">Select Packaging Item from Raw Materials</label>
          <select class="v-pkg-rm" onchange="onVariantPackagingRMChange(this, ${vIdx})">
            <option value="">-- None (No Packaging Deduction) --</option>
            ${rawMaterials.map(rm => `
              <option value="${rm.id}" ${rm.id === selectedRMId ? 'selected' : ''} data-stock="${rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0)}" data-unit="${escHtml(rm.unit || 'pcs')}" data-cost="${rm.cost_per_unit || 0}">
                ${escHtml(rm.name)} (Stock: ${rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0)} ${escHtml(rm.unit || 'pcs')}) — ₹${rm.cost_per_unit || 0}/${escHtml(rm.unit || 'pcs')}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:6px">
          <label style="font-size:0.72rem">Packaging Qty Per Finished Unit</label>
          <input type="number" class="v-pkg-qty" value="${v.packagingQty !== undefined ? v.packagingQty : 1}" min="0.001" step="any" placeholder="1" />
        </div>
      </div>

      <!-- Live Packaging Badges -->
      <div id="v-pkg-badge-${vIdx}" class="v-pkg-badge" style="display:${selectedRM ? 'flex' : 'none'};align-items:center;gap:12px;margin-top:8px;padding:6px 10px;background:rgba(99,102,241,0.08);border-radius:4px;font-size:0.74rem">
        <div>
          <span style="color:var(--text-muted)">Available Container Stock:</span>
          <strong class="font-mono v-pkg-stock-val" style="color:${rmStock > 0 ? '#10b981' : '#f87171'}">${rmStock} ${escHtml(rmUnit)}</strong>
        </div>
        <div style="border-left:1px solid var(--border-subtle);padding-left:12px">
          <span style="color:var(--text-muted)">Unit Type:</span>
          <strong class="v-pkg-unit-val" style="color:var(--accent-secondary)">${escHtml(rmUnit || '-')}</strong>
        </div>
        <div style="border-left:1px solid var(--border-subtle);padding-left:12px">
          <span style="color:var(--text-muted)">Purchase Cost:</span>
          <strong class="v-pkg-cost-val" style="color:#fff">₹${formatCurrency(rmCost)}</strong>
        </div>
      </div>

      <!-- Vendor & FIFO Preference -->
      <div style="margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px">
          <label style="font-size:0.72rem;margin-bottom:0;color:var(--text-muted)">Allocation Rule:</label>
          <select class="v-vendor-mode" style="padding:4px 8px;font-size:0.75rem;border-radius:4px" onchange="onVariantVendorModeChange(this, ${vIdx})">
            <option value="FIFO" ${vPrefMode === 'FIFO' ? 'selected' : ''}>FIFO (Oldest Batch First)</option>
            <option value="VENDOR" ${vPrefMode === 'VENDOR' ? 'selected' : ''}>Preferred Vendor</option>
          </select>
        </div>

        <div id="v-vendor-select-wrap-${vIdx}" class="v-vendor-select-wrap" style="display:${vPrefMode === 'VENDOR' ? 'flex' : 'none'};align-items:center;gap:6px">
          <label style="font-size:0.72rem;margin-bottom:0;color:var(--text-muted)">Vendor:</label>
          <select class="v-vendor-id" style="padding:4px 8px;font-size:0.75rem;border-radius:4px">
            <option value="">-- Any / Fallback to FIFO --</option>
            ${Array.from(vendorsMap.entries()).map(([vId, vName]) => `
              <option value="${escHtml(vId)}" ${vId === vPrefVendorId ? 'selected' : ''}>${escHtml(vName)}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>
  `;

  container.appendChild(card);
  populateVariantVendorDropdown(card, selectedRMId, vPrefVendorId);
}

function populateVariantVendorDropdown(card, selectedRMId, preferredVendorId) {
  if (!card) return;
  const vendorSelect = card.querySelector('.v-vendor-id');
  if (!vendorSelect) return;

  if (!selectedRMId) {
    vendorSelect.innerHTML = '<option value="">-- Any / Fallback to FIFO --</option>';
    return;
  }

  // 1. Batches for this packaging RM
  const rmBatches = (state.rawMaterialBatches || []).filter(b => b.rawMaterialId === selectedRMId && b.status !== 'DELETED');
  const vendorsMap = new Map();

  rmBatches.forEach(b => {
    const vName = (b.vendorName || b.supplier || '').trim();
    if (vName && vName !== '-') {
      const vId = b.vendorId || vName;
      const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
      if (!vendorsMap.has(vId)) {
        vendorsMap.set(vId, { id: vId, name: vName, stock: 0, batchCount: 0 });
      }
      const entry = vendorsMap.get(vId);
      entry.stock += rem;
      entry.batchCount += 1;
    }
  });

  // 2. Primary supplier on RM record itself
  const rm = (state.rawMaterials || []).find(r => r.id === selectedRMId);
  if (rm && rm.supplier && rm.supplier.trim() && rm.supplier.trim() !== '-') {
    const sName = rm.supplier.trim();
    if (!vendorsMap.has(sName)) {
      vendorsMap.set(sName, { id: sName, name: sName, stock: rm.current_stock !== undefined ? rm.current_stock : (rm.stock || 0), batchCount: 1 });
    }
  }

  // 3. Fallback: If no vendors found on this item, show all known vendors across all batches
  if (vendorsMap.size === 0) {
    (state.rawMaterialBatches || []).forEach(b => {
      const vName = (b.vendorName || b.supplier || '').trim();
      if (vName && vName !== '-' && !vendorsMap.has(vName)) {
        vendorsMap.set(b.vendorId || vName, { id: b.vendorId || vName, name: vName, stock: 0, batchCount: 0 });
      }
    });
  }

  let html = '<option value="">-- Any / Fallback to FIFO --</option>';
  if (vendorsMap.size === 0) {
    html += '<option value="" disabled>No purchase batches or vendors found</option>';
  } else {
    vendorsMap.forEach((info, vId) => {
      const isSelected = (preferredVendorId && (preferredVendorId === vId || preferredVendorId === info.name)) ? 'selected' : '';
      const stockBadge = info.stock > 0 ? ` (${info.stock} available)` : (info.batchCount > 0 ? ` (0 stock)` : '');
      html += `<option value="${escHtml(vId)}" ${isSelected}>${escHtml(info.name)}${stockBadge}</option>`;
    });
  }
  vendorSelect.innerHTML = html;
}

function onVariantPackagingRMChange(selectEl, vIdx) {
  const card = selectEl.closest('.variant-card') || (vIdx !== undefined ? document.getElementById(`vcard-${vIdx}`) : null);
  const opt = selectEl.options[selectEl.selectedIndex];
  const badgeWrap = card ? (card.querySelector('.v-pkg-badge') || document.getElementById(`v-pkg-badge-${vIdx}`)) : document.getElementById(`v-pkg-badge-${vIdx}`);

  if (!selectEl.value || !opt) {
    if (badgeWrap) badgeWrap.style.display = 'none';
    if (card) populateVariantVendorDropdown(card, '', null);
    return;
  }

  const stock = opt.dataset.stock || '0';
  const unit = opt.dataset.unit || 'pcs';
  const cost = parseFloat(opt.dataset.cost) || 0;

  if (badgeWrap) {
    const stockEl = badgeWrap.querySelector('.v-pkg-stock-val');
    if (stockEl) {
      stockEl.textContent = `${stock} ${unit}`;
      stockEl.style.color = parseFloat(stock) > 0 ? '#10b981' : '#f87171';
    }
    const unitEl = badgeWrap.querySelector('.v-pkg-unit-val');
    if (unitEl) unitEl.textContent = unit;
    const costEl = badgeWrap.querySelector('.v-pkg-cost-val');
    if (costEl) costEl.textContent = `₹${formatCurrency(cost)}`;
    badgeWrap.style.display = 'flex';
  }

  // Dynamically refresh vendor options for this card
  if (card) {
    const curVendorVal = card.querySelector('.v-vendor-id')?.value || null;
    populateVariantVendorDropdown(card, selectEl.value, curVendorVal);
  }
}

function onVariantVendorModeChange(selectEl, vIdx) {
  const card = selectEl.closest('.variant-card') || (vIdx !== undefined ? document.getElementById(`vcard-${vIdx}`) : null);
  const vendorWrap = card ? (card.querySelector('.v-vendor-select-wrap') || document.getElementById(`v-vendor-select-wrap-${vIdx}`)) : document.getElementById(`v-vendor-select-wrap-${vIdx}`);
  if (!vendorWrap) return;

  const isVendor = selectEl.value === 'VENDOR';
  vendorWrap.style.display = isVendor ? 'flex' : 'none';

  if (isVendor && card) {
    const pkgRMSelect = card.querySelector('.v-pkg-rm');
    const selectedRMId = pkgRMSelect ? pkgRMSelect.value : '';
    const curVendorVal = card.querySelector('.v-vendor-id')?.value || null;
    populateVariantVendorDropdown(card, selectedRMId, curVendorVal);
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const baseName = $('#p-name')?.value.trim();
  const baseRate = parseFloat($('#p-rate')?.value) || 0;
  const bulkStock = parseFloat($('#p-bulk-stock')?.value) || 0;
  const bulkStockUnit = $('#p-bulk-unit')?.value || 'mL';

  // Collect all variant cards
  const cards = $$('.variant-card');
  const variants = [];

  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx];
    const sizeVal = parseFloat(card.querySelector('.v-size')?.value) || 200;
    const sizeUnit = card.querySelector('.v-unit')?.value || 'mL';
    const priceVal = parseFloat(card.querySelector('.v-price')?.value) || baseRate;
    const stockVal = parseFloat(card.querySelector('.v-stock')?.value) || 0;
    const pkgRMId = card.querySelector('.v-pkg-rm')?.value || null;
    const pkgQty = parseFloat(card.querySelector('.v-pkg-qty')?.value) || 1;
    const vendorMode = card.querySelector('.v-vendor-mode')?.value || 'FIFO';
    const vendorId = card.querySelector('.v-vendor-id')?.value || null;
    const variantId = card.dataset.variantId || `VAR-${Date.now()}-${idx}`;

    variants.push({
      variantId,
      name: `${baseName} (${sizeVal} ${sizeUnit})`,
      bottleSize: sizeVal,
      bottleSizeUnit: sizeUnit,
      packagingRawMaterialId: pkgRMId,
      packagingQty: pkgQty,
      vendorPreference: {
        mode: vendorMode,
        vendorId: vendorMode === 'VENDOR' ? vendorId : null
      },
      price: priceVal,
      stock: stockVal
    });
  }

  const payload = {
    name: baseName,
    sku: $('#p-sku')?.value.trim(),
    hsn_sac: $('#p-hsn')?.value.trim() || 'N/A',
    rate: baseRate,
    bulkStock,
    bulkStockUnit,
    gst_rate: parseFloat($('#p-gst')?.value) || 0,
    unit: $('#p-unit')?.value || 'BTL',
    supply_type: $('#p-supply')?.value || 'intra',
    recipeId: $('#p-recipe')?.value || '',
    variants,
    status: 'active'
  };

  try {
    let savedProduct;
    if (state.editProductId) {
      const res = await api('PUT', `/api/products/${state.editProductId}`, payload);
      savedProduct = res.product || res;
      showToast('Product updated with bottle size variants ✓', 'success');
    } else {
      const res = await api('POST', '/api/products', payload);
      savedProduct = res.product || res;
      showToast('Product created with bottle size variants ✓', 'success');
    }

    state.editProductId = null;
    await loadData();
    navigateTo('products');
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

function editProduct(id) {
  const p = state.products.find(item => item.id === id);
  if (!p) return;
  state.editProductId = id;
  renderProductForm(p);
  navigateTo('add-product');
}

// ─── PAGE 6: AI Assistant ────────────────────────────────────────────────────
function getChatHistory(mode = state.aiMode) {
  if (!state.chatHistories[mode]) {
    state.chatHistories[mode] = [];
  }
  return state.chatHistories[mode];
}

function clearCurrentModeChat() {
  state.chatHistories[state.aiMode] = [];
  renderAIAssistant();
}

function formatNaturalLanguageText(str) {
  if (!str) return '';

  let htmlOutput = '';

  try {
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('```json') && trimmed.endsWith('```'))) {
      const cleanJsonStr = trimmed.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed.summary) htmlOutput += `<strong>${escHtml(parsed.summary)}</strong><br><br>`;
      if (parsed.headline) htmlOutput += `<strong>${escHtml(parsed.headline)}</strong><br><br>`;
      if (parsed.direct_answer) htmlOutput += `<strong>${escHtml(parsed.direct_answer)}</strong><br><br>`;
      if (parsed.recommendation) htmlOutput += `<strong>Recommendation:</strong> ${escHtml(parsed.recommendation)}<br><br>`;
      if (parsed.narrative) htmlOutput += `${escHtml(parsed.narrative)}<br><br>`;
      if (parsed.draft_response) htmlOutput += `<strong>Draft Response:</strong><br>${escHtml(parsed.draft_response)}<br><br>`;

      if (Array.isArray(parsed.evidence) && parsed.evidence.length) {
        htmlOutput += `<strong>Key Evidence:</strong><ul>` + parsed.evidence.map(e => `<li>${escHtml(e)}</li>`).join('') + `</ul>`;
      }
      if (Array.isArray(parsed.likely_explanations) && parsed.likely_explanations.length) {
        htmlOutput += `<strong>Likely Causes:</strong><ul>` + parsed.likely_explanations.map(e => `<li>${escHtml(e)}</li>`).join('') + `</ul>`;
      }
      if (Array.isArray(parsed.key_numbers) && parsed.key_numbers.length) {
        htmlOutput += `<strong>Key Figures:</strong><ul>` + parsed.key_numbers.map(e => `<li>${escHtml(e)}</li>`).join('') + `</ul>`;
      }
      if (Array.isArray(parsed.suggested_actions) && parsed.suggested_actions.length) {
        htmlOutput += `<strong>Suggested Actions:</strong><ul>` + parsed.suggested_actions.map(e => `<li>${escHtml(e)}</li>`).join('') + `</ul>`;
      }
      if (parsed.recommended_action) {
        htmlOutput += `<br><strong>Next Action:</strong> ${escHtml(parsed.recommended_action)}<br>`;
      }
    }
  } catch (e) {
    // Ignore JSON parse error and fallback
  }

  if (!htmlOutput) {
    htmlOutput = escHtml(str)
      .replace(/###\s*(.*?)(?:\n|<br>|$)/g, '<h4 style="color:#fff;margin:10px 0 4px;font-size:0.95rem;font-weight:700">$1</h4>')
      .replace(/\n\s*•\s*/g, '<br>• ')
      .replace(/\n\s*-\s*/g, '<br>• ')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // Parse any **asterisks** in the text (multiline supported)
  htmlOutput = htmlOutput.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  return htmlOutput;
}

function renderAIAssistant() {
  const el = $('#page-ai-assistant');
  const currentMode = AI_MODES.find(m => m.id === state.aiMode) || AI_MODES[0];
  const modeHistory = getChatHistory(state.aiMode);

  el.innerHTML = `
    <h1 class="page-title">AI Assistant</h1>
    <p class="page-subtitle">Text-to-text intelligence layer connected to your live business database</p>

    <div class="ai-chat-layout">
      <!-- Left Mode Panel -->
      <div class="ai-modes-panel">
        <div class="ai-modes-panel-label">Analysis Modes</div>
        ${AI_MODES.map(m => `
          <div class="ai-mode-card ${state.aiMode === m.id ? 'active' : ''}" style="--mode-color:${m.color}" onclick="setAIMode('${m.id}')">
            <div class="ai-mode-name">
              <div class="ai-mode-dot"></div>
              ${m.name}
            </div>
            <div class="ai-mode-desc">${m.desc}</div>
          </div>
        `).join('')}
      </div>

      <!-- Right Chat Window -->
      <div class="ai-chat-window">
        <div class="ai-chat-header">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="ai-mode-dot" style="background:${currentMode.color}"></div>
            <strong style="color:#fff">${currentMode.name}</strong>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="clearCurrentModeChat()">Clear ${currentMode.name} Chat</button>
        </div>

        <div class="ai-messages" id="ai-messages">
          ${modeHistory.length === 0 ? `
            <div style="text-align:center;margin:auto;color:var(--text-muted);max-width:420px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="color:${currentMode.color};margin-bottom:12px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <h3 style="color:#fff;font-size:1.05rem;margin-bottom:6px">${currentMode.name}</h3>
              <p style="font-size:0.82rem;line-height:1.5">${currentMode.desc}</p>
              <p style="font-size:0.78rem;color:var(--accent-secondary);margin-top:10px">Type a question in plain English to get started.</p>
            </div>
          ` : modeHistory.map(msg => `
            <div class="chat-message ${msg.role}">
              <div class="chat-bubble">${msg.role === 'user' ? escHtml(msg.text) : formatNaturalLanguageText(msg.text)}</div>
            </div>
          `).join('')}
        </div>

        <div class="ai-input-bar">
          <div class="ai-input-wrap">
            <textarea id="ai-user-input" class="ai-textarea" rows="1" placeholder="Ask ${currentMode.name} in plain English..." onkeydown="onAIChatKeydown(event)"></textarea>
          </div>
          <button class="ai-send-btn" onclick="sendAIChatMessage()" style="background:${currentMode.color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const msgs = $('#ai-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    $('#ai-user-input')?.focus();
  }, 50);
}

function setAIMode(modeId) {
  state.aiMode = modeId;
  renderAIAssistant();
}

function onAIChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIChatMessage();
  }
}

async function sendAIChatMessage() {
  const textarea = $('#ai-user-input');
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) return;

  const currentHistory = getChatHistory(state.aiMode);
  currentHistory.push({ role: 'user', text });
  textarea.value = '';
  renderAIAssistant();

  try {
    const data = await api('POST', '/api/ai/invoke', {
      mode: state.aiMode,
      payload: text
    });

    const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : 'No response generated.';
    currentHistory.push({ role: 'assistant', text: reply });
  } catch (err) {
    currentHistory.push({ role: 'assistant', text: 'Error: ' + err.message });
  }

  renderAIAssistant();
}

// ─── PAGE 7: GST Reference ───────────────────────────────────────────────────
function renderGSTReference() {
  const el = $('#page-gst-info');

  el.innerHTML = `
    <h1 class="page-title">GST Tax Reference</h1>
    <p class="page-subtitle">Official rate slabs, HSN/SAC guidelines, state codes, and UQC codes</p>

    <div style="display:flex;flex-direction:column;gap:20px">
      <!-- Slabs Grid -->
      <div class="builder-card">
        <h3 style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:14px">GST Tax Rate Slabs</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px">
          ${GST_SLAB_INFO.map(s => `
            <div style="background:${s.bg};border:1px solid ${s.border};padding:14px;border-radius:var(--radius-md)">
              <div style="font-size:1.4rem;font-weight:800;color:${s.color}">${s.rate}%</div>
              <div style="font-size:0.85rem;font-weight:700;color:#fff;margin-top:2px">${s.name}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:6px">${s.examples}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── Settings Modal & Tab Controls ───────────────────────────────────────────
function openSettingsModal() {
  const modal = $('#settings-modal');
  if (!modal) return;

  // Populate form fields
  $('#s-business-name').value = state.settings.businessName || '';
  $('#s-business-pan').value = state.settings.businessPAN || '';
  $('#s-business-gstin').value = state.settings.businessGSTIN || '';
  $('#s-business-address').value = state.settings.businessAddress || '';
  $('#s-business-email').value = state.settings.businessEmail || '';
  $('#s-business-phone').value = state.settings.businessPhone || '';
  $('#s-business-website').value = state.settings.businessWebsite || '';
  $('#s-bank-name').value = state.settings.businessBankName || '';
  $('#s-bank-acc').value = state.settings.businessBankAcc || '';
  $('#s-bank-ifsc').value = state.settings.businessBankIFSC || '';
  $('#s-invoice-prefix').value = state.settings.invoicePrefix || 'INV';
  $('#s-invoice-terms').value = state.settings.invoiceTerms || '';
  $('#s-invoice-notes').value = state.settings.invoiceNotes || '';
  $('#s-api-key').value = state.settings.apiKey || '';
  $('#s-model-name').value = state.settings.modelName || '';

  // State dropdown
  const stateSel = $('#s-business-state');
  if (stateSel) {
    stateSel.innerHTML = '<option value="">-- Select State --</option>' +
      INDIAN_STATES.map(s => `<option value="${s.name}" ${state.settings.businessState === s.name ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join('');
  }

  modal.classList.add('open');
}

async function saveSettings() {
  const payload = {
    businessName: $('#s-business-name')?.value.trim(),
    businessPAN: $('#s-business-pan')?.value.trim().toUpperCase(),
    businessGSTIN: $('#s-business-gstin')?.value.trim().toUpperCase(),
    businessState: $('#s-business-state')?.value,
    businessAddress: $('#s-business-address')?.value.trim(),
    businessEmail: $('#s-business-email')?.value.trim(),
    businessPhone: $('#s-business-phone')?.value.trim(),
    businessWebsite: $('#s-business-website')?.value.trim(),
    businessBankName: $('#s-bank-name')?.value.trim(),
    businessBankAcc: $('#s-bank-acc')?.value.trim(),
    businessBankIFSC: $('#s-bank-ifsc')?.value.trim().toUpperCase(),
    invoicePrefix: $('#s-invoice-prefix')?.value.trim() || 'INV',
    invoiceTerms: $('#s-invoice-terms')?.value.trim(),
    invoiceNotes: $('#s-invoice-notes')?.value.trim(),
    apiKey: $('#s-api-key')?.value.trim(),
    modelName: $('#s-model-name')?.value.trim() || 'google/gemma-4-26b-a4b-it:free'
  };

  try {
    await api('PUT', '/api/settings', payload);
    showToast('Settings saved successfully', 'success');
    $('#settings-modal')?.classList.remove('open');
    await loadData();
  } catch (err) {
    showToast('Failed to save settings: ' + err.message, 'error');
  }
}

// ─── CENTRAL MANDATORY DELETION CONTROLLER ────────────────────────────────────
let _currentDeleteCallback = null;

function promptDeletion({ title, itemName, details, showRestock, onConfirm }) {
  const modal = $('#delete-modal');
  if (!modal) return;

  const titleEl = $('#delete-modal-title');
  const nameEl = $('#delete-item-name');
  const detailsEl = $('#delete-item-details');
  const restockContainer = $('#delete-restock-container');
  const reasonInput = $('#delete-reason-input');
  const reasonError = $('#delete-reason-error');
  const btn = $('#confirm-delete');

  if (titleEl) {
    titleEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="color:#ef4444"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>${escHtml(title || 'Confirm Deletion')}</span>
    `;
  }
  if (nameEl) nameEl.textContent = itemName || 'this item';
  if (detailsEl) detailsEl.innerHTML = details || 'This action will remove the record from active data.';
  if (restockContainer) restockContainer.style.display = showRestock ? 'block' : 'none';
  if (reasonInput) {
    reasonInput.value = '';
    reasonInput.style.borderColor = 'var(--border-subtle)';
  }
  if (reasonError) reasonError.style.display = 'none';
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Confirm &amp; Delete`;
  }

  _currentDeleteCallback = onConfirm;
  modal.style.zIndex = '13000';
  modal.style.display = 'flex';
  modal.classList.add('open');
  setTimeout(() => {
    reasonInput?.focus();
  }, 100);
}

function closeDeleteModal() {
  const modal = $('#delete-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  _currentDeleteCallback = null;
  const reasonInput = $('#delete-reason-input');
  if (reasonInput) {
    reasonInput.value = '';
    reasonInput.style.borderColor = 'var(--border-subtle)';
  }
  const reasonError = $('#delete-reason-error');
  if (reasonError) reasonError.style.display = 'none';
  const btn = $('#confirm-delete');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Confirm &amp; Delete`;
  }
}

async function handleConfirmDelete() {
  const reasonInput = $('#delete-reason-input');
  const reasonError = $('#delete-reason-error');
  const reason = (reasonInput?.value || '').trim();

  if (!reason) {
    if (reasonError) reasonError.style.display = 'block';
    if (reasonInput) {
      reasonInput.style.borderColor = '#ef4444';
      reasonInput.focus();
    }
    return;
  }

  const shouldRestock = $('#delete-restock-checkbox')?.checked || false;
  const cb = _currentDeleteCallback;

  // Immediately close and hide the delete dialog box so it does not remain open
  closeDeleteModal();

  if (typeof cb === 'function') {
    try {
      await cb({ reason, shouldRestock });
    } catch (err) {
      showToast('Deletion failed: ' + err.message, 'error');
    }
  }
}

function confirmDeleteCustomer(id, name) {
  const c = state.customers.find(item => item.id === id);
  const custName = c ? c.name : (name || 'Customer');
  promptDeletion({
    title: 'Delete Customer',
    itemName: custName,
    details: `Customer ID: <code>${escHtml(id)}</code>. This will permanently remove the client profile from active records.`,
    onConfirm: async ({ reason }) => {
      await api('DELETE', `/api/customers/${id}`, { reason });
      showToast(`Customer "${custName}" deleted ✓`, 'success');
      await loadData();
      renderCustomers();
    }
  });
}

function confirmDeleteProduct(id, name) {
  const p = state.products.find(item => item.id === id);
  const prodName = p ? p.name : (name || 'Product');
  promptDeletion({
    title: 'Delete Product',
    itemName: prodName,
    details: `Product ID: <code>${escHtml(id)}</code> · Price: ₹${p?.price || p?.rate || 0}. This will permanently remove the product item from active inventory.`,
    onConfirm: async ({ reason }) => {
      await api('DELETE', `/api/products/${id}`, { reason });
      showToast(`Product "${prodName}" deleted ✓`, 'success');
      await loadData();
      renderProducts();
    }
  });
}

function confirmDeleteInvoice(id, number) {
  const inv = state.invoices.find(item => item.id === id);
  const invNum = inv ? (inv.invoiceNumber || inv.id) : (number || id);
  const total = inv ? (inv.grandTotal || 0) : 0;
  promptDeletion({
    title: 'Delete Invoice',
    itemName: `Invoice ${invNum}`,
    details: `Grand Total: <strong>₹${formatCurrency(total)}</strong>. Customer: ${escHtml(inv?.customerName || 'Customer')}.`,
    showRestock: true,
    onConfirm: async ({ reason, shouldRestock }) => {
      await api('DELETE', `/api/invoices/${id}?restock=${shouldRestock ? 'true' : 'false'}`, { reason, restock: shouldRestock });
      showToast(`Invoice ${invNum} deleted ${shouldRestock ? '& inventory restocked' : ''} ✓`, 'success');
      await loadData();
      renderInvoices();
    }
  });
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation binding
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) navigateTo(page);
    });
  });

  // Hamburger toggle
  $('#hamburger')?.addEventListener('click', () => {
    $('#sidebar')?.classList.toggle('open');
  });

  // Settings Modal bindings
  $('#open-settings')?.addEventListener('click', openSettingsModal);
  $('#close-settings')?.addEventListener('click', () => $('#settings-modal')?.classList.remove('open'));
  $('#cancel-settings')?.addEventListener('click', () => $('#settings-modal')?.classList.remove('open'));
  $('#save-settings')?.addEventListener('click', saveSettings);

  // Settings Modal Tabs
  $$('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.settings-tab').forEach(t => t.classList.remove('active'));
      $$('.settings-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(`#tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  // Delete modal bindings
  $('#close-delete-modal')?.addEventListener('click', closeDeleteModal);
  $('#cancel-delete')?.addEventListener('click', closeDeleteModal);
  $('#confirm-delete')?.addEventListener('click', handleConfirmDelete);
  $('#delete-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });

  // Logo file upload handler
  const logoArea = $('#logo-upload-area');
  const logoInput = $('#logo-file-input');
  if (logoArea && logoInput) {
    logoArea.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return showToast('Logo image must be smaller than 5MB', 'error');
      const reader = new FileReader();
      reader.onload = async evt => {
        const base64 = evt.target.result;
        await api('PUT', '/api/settings', { businessLogoBase64: base64 });
        state.settings.businessLogoBase64 = base64;
        showToast('Logo updated successfully!', 'success');
        loadData();
      };
      reader.readAsDataURL(file);
    });
  }

  $('#remove-logo-btn')?.addEventListener('click', async () => {
    await api('PUT', '/api/settings', { businessLogoBase64: '' });
    state.settings.businessLogoBase64 = '';
    showToast('Logo removed', 'success');
    loadData();
  });

  // Toggle API key visibility
  $('#toggle-api-key')?.addEventListener('click', () => {
    const input = $('#s-api-key');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
      showToast(`API Key ${input.type === 'text' ? 'visible' : 'hidden'}`, 'info');
    }
  });

  // Replay tour button
  $('#replay-tour-btn')?.addEventListener('click', () => {
    $('#settings-modal')?.classList.remove('open');
    replayWelcomeTour();
  });

  // Initial Data Load
  await loadData();
  navigateTo('dashboard');
  checkFirstLaunch();
});

// ─── Animated Welcome Tour Logic ─────────────────────────────────────────────
let currentTourSlide = 1;

function checkFirstLaunch() {
  if (!state.settings.firstLaunchCompleted) {
    showWelcomeTour();
  }
}

function showWelcomeTour() {
  currentTourSlide = 1;
  updateTourSlideView();
  $('#welcome-modal')?.classList.add('open');
}

function nextTourSlide() {
  if (currentTourSlide === 1) {
    currentTourSlide = 2;
    updateTourSlideView();
  } else {
    finishTour(false);
  }
}

function updateTourSlideView() {
  const s1 = $('#tour-slide-1');
  const s2 = $('#tour-slide-2');
  const dot1 = $('#dot-1');
  const dot2 = $('#dot-2');
  const nextBtn = $('#next-tour-btn');

  if (currentTourSlide === 1) {
    if (s1) s1.style.display = 'block';
    if (s2) s2.style.display = 'none';
    if (dot1) dot1.classList.add('active');
    if (dot2) dot2.classList.remove('active');
    if (nextBtn) nextBtn.textContent = 'Next →';
  } else {
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'block';
    if (dot1) dot1.classList.remove('active');
    if (dot2) dot2.classList.add('active');
    if (nextBtn) nextBtn.textContent = 'Get Started 🚀';
    setTimeout(() => $('#w-user-name')?.focus(), 100);
  }
}

async function finishTour(skipped = false) {
  $('#welcome-modal')?.classList.remove('open');
  const userName = $('#w-user-name')?.value.trim();
  const companyName = $('#w-company-name')?.value.trim();
  const apiKey = $('#w-api-key')?.value.trim();

  const updates = { firstLaunchCompleted: true };
  if (!skipped && userName) updates.userName = userName;
  if (!skipped && companyName && !state.settings.businessName) updates.businessName = companyName;
  if (!skipped && apiKey) updates.apiKey = apiKey;

  try {
    await api('PUT', '/api/settings', updates);
    await loadData();
    if (!skipped && userName) {
      showToast(`Welcome aboard, ${userName}! 🎉`, 'success');
    }
    renderDashboard();
  } catch (err) {
    console.error('Failed to save tour preferences:', err);
  }
}

function replayWelcomeTour() {
  showWelcomeTour();
}

// Window Globals
window.navigateTo = navigateTo;
window.editCustomer = editCustomer;
window.editProduct = editProduct;
window.confirmDeleteCustomer = confirmDeleteCustomer;
window.confirmDeleteProduct = confirmDeleteProduct;
window.confirmDeleteInvoice = confirmDeleteInvoice;
window.triggerPrintInvoice = triggerPrintInvoice;
window.onInvoiceCustomerSelect = onInvoiceCustomerSelect;
window.nextTourSlide = nextTourSlide;
window.finishTour = finishTour;
window.replayWelcomeTour = replayWelcomeTour;
window.onItemCatalogSelect = onItemCatalogSelect;
window.onItemVariantSelect = onItemVariantSelect;
window.addBuilderRow = addBuilderRow;
window.removeBuilderRow = removeBuilderRow;
window.recalculateBuilder = recalculateBuilder;
window.saveInvoice = saveInvoice;
window.filterInvoicesTable = filterInvoicesTable;
window.updateInvoiceStatus = updateInvoiceStatus;
window.filterProductsTable = filterProductsTable;
window.openAddProductForm = openAddProductForm;
window.editProduct = editProduct;
window.setAIMode = setAIMode;
window.clearCurrentModeChat = clearCurrentModeChat;
window.onAIChatKeydown = onAIChatKeydown;
window.sendAIChatMessage = sendAIChatMessage;
function openAddStockForm(rmId = null) {
  return openIncreaseStockModal(rmId);
}
function submitAddStock() {
  return submitIncreaseStock();
}
window.openAddStockForm  = openAddStockForm;
window.submitAddStock    = submitAddStock;
window.confirmDeleteRM   = confirmDeleteRM;
window.addIngredientRow  = addIngredientRow;
window.removeIngredientRow = removeIngredientRow;
window.addVariantCard    = addVariantCard;
window.toggleCustomUnit  = toggleCustomUnit;
window.onProductRecipeSelect = onProductRecipeSelect;
window.calculateRecipeCostPerBottle = calculateRecipeCostPerBottle;
window.submitRecipeForm  = submitRecipeForm;
window.openRecipeForm    = openRecipeForm;
window.closeRecipeForm   = closeRecipeForm;
window.openProductionPreview = openProductionPreview;
window.closeProductionPreview = closeProductionPreview;
window.commitBatch       = commitBatch;
window.deleteRecipe      = deleteRecipe;
window.printBatchReport  = printBatchReport;
window.deleteBatch       = deleteBatch;
window.setLedgerTab      = setLedgerTab;
window.openAddRMForm     = openAddRMForm;
window.openEditRMForm    = openEditRMForm;
window.closeRMForm       = closeRMForm;
window.saveRM            = saveRM;
window.filterRMTable     = filterRMTable;
window.mfgPreview        = mfgPreview;
window.deleteFinishedGood = deleteFinishedGood;
window.clearAuditLedgers  = clearAuditLedgers;

// ═══════════════════════════════════════════════════════════════════════════
// ─── PAGE: RAW MATERIALS ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function stockStatus(current, reorder) {
  const c = Number(current || 0);
  const r = Number(reorder || 0);
  if (c <= 0)         return { cls: 'zero',     label: '⚠ Out of Stock' };
  if (c <= r)         return { cls: 'critical',  label: '⚠ Critical' };
  if (c <= r * 1.5)   return { cls: 'low',   label: '↓ Low Stock' };
  return                 { cls: 'ok',        label: '✓ In Stock' };
}

function renderRawMaterials() {
  const el = $('#page-raw-materials');
  if (!el) return;
  const lowCount = state.rawMaterials.filter(r => (r.current_stock||r.stock) <= (r.reorder_point||r.minimumStock)).length;
  const totalVal = state.rawMaterials.reduce((s,r) => s + ((r.current_stock||r.stock||0) * (r.cost_per_unit||r.purchaseCost||0)), 0);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Raw Materials Inventory</h1>
        <p class="page-subtitle">Track chemical ingredients, bottles, caps, labels, and stock movements</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="openIncreaseStockModal()" id="add-stock-btn" style="display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--accent-secondary);border-color:rgba(6,182,212,0.4)" title="Inward Purchase / Add Stock to Raw Material">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          + Add Stock
        </button>
        <button class="btn btn-primary" onclick="openAddRMModal()" id="add-rm-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Add Raw Material
        </button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="inv-stats-grid">
      <div class="inv-stat-card" style="--card-color:#06b6d4">
        <div class="inv-stat-label">Total Raw Materials</div>
        <div class="inv-stat-value">${state.rawMaterials.length}</div>
        <div class="inv-stat-sub">${lowCount > 0 ? `${lowCount} need reorder` : 'All stocked'}</div>
      </div>
      <div class="inv-stat-card" style="--card-color:#f59e0b">
        <div class="inv-stat-label">Low / Critical Stock</div>
        <div class="inv-stat-value" style="color:${lowCount>0?'#f59e0b':'#10b981'}">${lowCount}</div>
        <div class="inv-stat-sub">Below minimum stock</div>
      </div>
      <div class="inv-stat-card" style="--card-color:#10b981">
        <div class="inv-stat-label">Total Stock Valuation</div>
        <div class="inv-stat-value" style="font-size:1.15rem">${formatCurrency(totalVal)}</div>
        <div class="inv-stat-sub">At purchase cost</div>
      </div>
    </div>

    <!-- Form container -->
    <div id="rm-form-area"></div>

    <!-- Materials Table -->
    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="rm-search" placeholder="Search raw materials, ID, or supplier…" oninput="filterRMTable()" />
        </div>
      </div>
      ${state.rawMaterials.length === 0 ? `
        <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="margin-bottom:12px;opacity:0.4"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
          <p style="margin-bottom:14px">No raw materials yet. Add your first ingredient to get started.</p>
          <button class="btn btn-primary" onclick="openAddRMModal()" id="add-first-rm-btn">+ Add First Raw Material</button>
        </div>
      ` : `
        <table class="data-table" id="rm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Material Name</th>
              <th>Parent Total Stock</th>
              <th>Active Batches / Vendors</th>
              <th>Minimum Stock</th>
              <th>Cost / Unit</th>
              <th>Status</th>
              <th style="min-width:240px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.rawMaterials.map(rm => {
              const curStock = rm.current_stock !== undefined ? rm.current_stock : rm.stock;
              const minStock = rm.minimumStock !== undefined ? rm.minimumStock : rm.reorder_point;
              const costUnit = rm.purchaseCost !== undefined ? rm.purchaseCost : rm.cost_per_unit;
              const st = stockStatus(curStock, minStock);
              const pct = minStock > 0 ? Math.min(100, Math.round((curStock / (minStock * 2)) * 100)) : (curStock > 0 ? 100 : 0);

              const batches = (state.rawMaterialBatches || []).filter(b => b.rawMaterialId === rm.id);
              const activeBatches = batches.filter(b => b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'));

              return `
              <tr data-rm-name="${escHtml((rm.name + ' ' + (rm.id||'') + ' ' + (rm.supplier||'')).toLowerCase())}">
                <td class="font-mono" style="font-size:0.78rem;color:var(--accent-secondary)">${escHtml(rm.id)}</td>
                <td>
                  <a href="javascript:void(0)" onclick="openEditRMForm('${rm.id}')" style="color:#fff;text-decoration:none" title="Open master edit & view vendor purchase origins">
                    <strong style="color:#fff;border-bottom:1px dashed var(--accent-secondary);cursor:pointer">${escHtml(rm.name)}</strong>
                  </a>
                  ${rm.category ? `<br><span style="font-size:0.72rem;color:var(--text-muted)">${escHtml(rm.category)}</span>` : ''}
                </td>
                <td>
                  <div class="stock-bar-wrap">
                    <div class="stock-bar"><div class="stock-bar-fill ${st.cls}" style="width:${pct}%"></div></div>
                    <span class="font-mono" style="color:#fff;font-size:0.82rem;white-space:nowrap">${curStock} ${escHtml(rm.unit)}</span>
                  </div>
                </td>
                <td>
                  ${activeBatches.length === 0 ? `
                    <span style="color:var(--text-muted);font-size:0.75rem">No active batches</span>
                  ` : `
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      ${activeBatches.map(b => {
                        const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
                        return `
                          <span class="badge" style="font-size:0.7rem;background:rgba(6,182,212,0.12);color:var(--accent-secondary);border:1px solid rgba(6,182,212,0.25);padding:2px 6px;border-radius:4px" title="Batch: ${escHtml(b.id || b.batchId)}">
                            ${escHtml(b.vendorName || 'Batch')}: ${rem} ${escHtml(rm.unit)}
                          </span>
                        `;
                      }).join('')}
                    </div>
                  `}
                </td>
                <td style="color:var(--text-secondary)">${minStock} ${escHtml(rm.unit)}</td>
                <td class="font-mono">${formatCurrency(costUnit)}/${escHtml(rm.unit)}</td>
                <td><span class="stock-tag ${st.cls}">${st.label}</span></td>
                <td style="white-space:normal">
                  <div style="display:flex;gap:5px;flex-wrap:wrap">
                    <button class="btn btn-secondary btn-sm" onclick="openIncreaseStockModal('${rm.id}')" title="Increase Stock" style="color:var(--accent-secondary)">+ Stock</button>
                    <button class="btn btn-ghost btn-sm" onclick="openRMVendorsModal('${rm.id}')" title="View & manage associated vendors" style="color:#38bdf8;font-weight:600">🏢 Vendors</button>
                    <button class="btn btn-ghost btn-sm" onclick="openRMBatchesModal('${rm.id}')" title="View all purchase batches" style="color:#60a5fa">Batches (${activeBatches.length})</button>
                    <button class="btn btn-ghost btn-sm" onclick="viewRMHistory('${rm.id}')" title="View stock ledger history">History</button>
                    <button class="btn btn-ghost btn-sm" onclick="openEditRMForm('${rm.id}')" title="Edit Master & View Vendor Purchase Origins">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteRM('${rm.id}')" title="Delete Raw Material">Delete</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;

  // Attach direct DOM event listeners for maximum responsiveness and fail-safe operation
  const addRmBtn = $('#add-rm-btn');
  if (addRmBtn) {
    addRmBtn.onclick = (e) => {
      e.preventDefault();
      openAddRMModal();
    };
  }
  const addFirstBtn = $('#add-first-rm-btn');
  if (addFirstBtn) {
    addFirstBtn.onclick = (e) => {
      e.preventDefault();
      openAddRMModal();
    };
  }
}

function filterRMTable() {
  const q = ($('#rm-search')?.value || '').toLowerCase();
  $$('#rm-table tbody tr').forEach(tr => {
    tr.style.display = tr.dataset.rmName?.includes(q) ? '' : 'none';
  });
}

function openAddRMForm(existing = null) {
  const area = $('#rm-form-area');
  if (!area) return;
  const isEdit = !!existing;

  const curStock = isEdit ? (existing.current_stock !== undefined ? existing.current_stock : existing.stock) : 0;
  const minStock = isEdit ? (existing.minimumStock !== undefined ? existing.minimumStock : existing.reorder_point) : 0;
  const costUnit = isEdit ? (existing.purchaseCost !== undefined ? existing.purchaseCost : existing.cost_per_unit) : 0;

  // Gather batches for this raw material if in edit mode
  let batches = [];
  let activeBatches = [];
  let consumedBatches = [];
  let totalPurchased = 0;
  let totalRemaining = 0;
  let uniqueVendors = [];

  if (isEdit) {
    batches = (state.rawMaterialBatches || []).filter(b => b.rawMaterialId === existing.id);
    activeBatches = batches.filter(b => b.status === 'ACTIVE' || (b.remainingQuantity > 0 && b.status !== 'CONSUMED'));
    consumedBatches = batches.filter(b => b.status === 'CONSUMED' || b.remainingQuantity <= 0);
    totalPurchased = batches.reduce((sum, b) => sum + (b.originalQuantity !== undefined ? b.originalQuantity : (b.quantity || 0)), 0);
    totalRemaining = activeBatches.reduce((sum, b) => sum + (b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0)), 0);
    uniqueVendors = Array.from(new Set(batches.map(b => (b.vendorName || b.supplier || '').trim()).filter(Boolean)));
  }

  area.innerHTML = `
    <div class="add-stock-form" style="margin-bottom:24px;border:1px solid ${isEdit ? 'rgba(6,182,212,0.3)' : 'var(--border-subtle)'};padding:22px;border-radius:var(--radius-md)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <h3 style="font-size:1.05rem;font-weight:700;color:#fff;margin:0;display:flex;align-items:center;gap:8px">
            ${isEdit ? `✏️ Editing Raw Material: <span style="color:var(--accent-secondary)">${escHtml(existing.name)}</span>` : '✨ New Raw Material Master Entry'}
          </h3>
          ${isEdit ? `
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px">
              ID: <span class="font-mono" style="color:var(--accent-secondary)">${escHtml(existing.id)}</span> • Parent Total Stock: <strong style="color:#10b981">${curStock} ${escHtml(existing.unit)}</strong> (${activeBatches.length} active batches)
            </div>
          ` : ''}
        </div>
        <div style="display:flex;gap:8px">
          ${isEdit ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="openIncreaseStockModal('${existing.id}')" style="color:var(--accent-secondary);border-color:rgba(6,182,212,0.3)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Inward Stock from Vendor
            </button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="openRMVendorsModal('${existing.id}')" style="color:#38bdf8;font-weight:600;border:1px solid rgba(56,189,248,0.3)">
              🏢 Manage Vendors
            </button>
          ` : ''}
          <button type="button" class="btn btn-ghost btn-sm" onclick="closeRMForm()">✕ Close</button>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label>Raw Material Name *</label>
          <input type="text" id="rm-name" value="${isEdit ? escHtml(existing.name) : ''}" placeholder="e.g. Perfume Oil, Ethanol, Plastic Bottle" />
        </div>
        <div class="form-group">
          <label>Unit Type *</label>
          <select id="rm-unit-select" onchange="if(this.value==='CUSTOM'){ $('#rm-unit-custom-wrap').style.display='block'; } else { $('#rm-unit-custom-wrap').style.display='none'; }">
            ${RAW_MATERIAL_UNITS.map(u => `<option value="${u}" ${isEdit && existing.unit===u ? 'selected':''}>${u}</option>`).join('')}
            <option value="CUSTOM" ${isEdit && !RAW_MATERIAL_UNITS.includes(existing.unit) ? 'selected':''}>+ Custom Unit…</option>
          </select>
        </div>
        <div class="form-group" id="rm-unit-custom-wrap" style="display:${isEdit && !RAW_MATERIAL_UNITS.includes(existing.unit)?'block':'none'}">
          <label>Custom Unit Name</label>
          <input type="text" id="rm-unit-custom" value="${isEdit ? escHtml(existing.unit) : ''}" placeholder="e.g. drum, vial, canister" />
        </div>
        <div class="form-group">
          <label>${isEdit ? 'Current Parent Total Stock (Maintained by Batches)' : 'Opening Stock Quantity'}</label>
          <div style="display:flex;gap:8px">
            <input type="number" id="rm-stock" value="${curStock}" ${isEdit ? 'readonly style="background:rgba(255,255,255,0.05);cursor:not-allowed"' : 'min="0" step="any"'} />
            ${isEdit ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="openIncreaseStockModal('${existing.id}')" style="white-space:nowrap;color:var(--accent-secondary)" title="Add purchase batch">
                + Stock
              </button>
            ` : ''}
          </div>
          ${isEdit ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">Strict invariant: = Sum of remaining quantities in active batches (${curStock} ${escHtml(existing.unit)})</div>` : ''}
        </div>
        <div class="form-group">
          <label>Minimum Stock (Reorder Point)</label>
          <input type="number" id="rm-reorder" value="${minStock}" min="0" step="any" />
        </div>
        <div class="form-group">
          <label>Default Purchase Cost Per Unit (₹)</label>
          <input type="number" id="rm-cost" value="${costUnit}" min="0" step="any" />
        </div>
        <div class="form-group">
          <label>Primary / Default Supplier Name</label>
          <input type="text" id="rm-supplier" value="${isEdit ? escHtml(existing.supplier||'') : ''}" placeholder="e.g. ABC Chemicals" />
        </div>
        <div class="form-group">
          <label>Category</label>
          <input type="text" id="rm-category" value="${isEdit ? escHtml(existing.category||'') : ''}" placeholder="e.g. Essential Oils, Solvents, Packaging" />
        </div>
        <div class="form-group">
          <label>Purchase Date / Setup Date</label>
          <input type="date" id="rm-pdate" value="${isEdit ? (existing.purchaseDate || '') : new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Batch / Lot Number</label>
          <input type="text" id="rm-batchno" value="${isEdit ? escHtml(existing.batchNumber||'') : ''}" placeholder="e.g. BATCH-OIL-99" />
        </div>
        <div class="form-group full-width">
          <label>Notes / Specification</label>
          <input type="text" id="rm-notes" value="${isEdit ? escHtml(existing.notes||'') : ''}" placeholder="Storage conditions, purity grade..." />
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="save-rm-btn" onclick="saveRM('${isEdit ? existing.id : ''}')">${isEdit ? 'Save Master Changes' : 'Create Raw Material'}</button>
        <button class="btn btn-ghost" onclick="closeRMForm()">Cancel</button>
      </div>

      ${isEdit ? `
        <!-- ════════ SUB-RENDER: WHERE THIS RAW MATERIAL WAS BOUGHT ════════ -->
        <div class="rm-subrender-box">
          <div class="rm-subrender-header">
            <div>
              <h4 style="font-size:0.92rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px;margin:0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="color:var(--accent-secondary)"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Where This Material Has Been Bought From (Vendor Inwards)
              </h4>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">
                Vendor purchase batches, supplier invoice numbers, lots, rates, and stock consumption breakdown
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openIncreaseStockModal('${existing.id}')" style="color:var(--accent-secondary);border-color:rgba(6,182,212,0.3)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                + Inward Stock from Vendor
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="openRMVendorsModal('${existing.id}')" style="color:#38bdf8;font-weight:600">
                🏢 Vendors Panel
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="openRMBatchesModal('${existing.id}')" style="color:#60a5fa">
                Batches Modal (${batches.length})
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="viewRMHistory('${existing.id}')">
                Ledger History →
              </button>
            </div>
          </div>

          <!-- Summary Metrics Cards -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:14px">
            <div class="rm-subrender-stat">
              <div class="rm-subrender-stat-label">Total Purchased</div>
              <div class="rm-subrender-stat-val font-mono">${totalPurchased} ${escHtml(existing.unit)}</div>
            </div>
            <div class="rm-subrender-stat">
              <div class="rm-subrender-stat-label">Remaining Active Stock</div>
              <div class="rm-subrender-stat-val font-mono" style="color:#10b981">${totalRemaining} ${escHtml(existing.unit)}</div>
            </div>
            <div class="rm-subrender-stat">
              <div class="rm-subrender-stat-label">Active Batches</div>
              <div class="rm-subrender-stat-val font-mono" style="color:var(--accent-secondary)">${activeBatches.length}</div>
            </div>
            <div class="rm-subrender-stat">
              <div class="rm-subrender-stat-label">Depleted Batches</div>
              <div class="rm-subrender-stat-val font-mono" style="color:${consumedBatches.length>0?'#ef4444':'var(--text-muted)'}">${consumedBatches.length}</div>
            </div>
            <div class="rm-subrender-stat">
              <div class="rm-subrender-stat-label">Supplying Vendors</div>
              <div class="rm-subrender-stat-val" style="font-size:0.82rem;font-weight:600">${uniqueVendors.length > 0 ? escHtml(uniqueVendors.join(', ')) : 'None registered'}</div>
            </div>
          </div>

          <!-- Batches Table -->
          ${batches.length === 0 ? `
            <div style="text-align:center;padding:26px 16px;background:var(--bg-card);border:1px dashed var(--border-subtle);border-radius:var(--radius-sm);color:var(--text-muted);font-size:0.82rem">
              <div style="margin-bottom:8px">No vendor purchase batches recorded yet for "${escHtml(existing.name)}".</div>
              <button type="button" class="btn btn-primary btn-sm" onclick="openIncreaseStockModal('${existing.id}')">
                + Record First Vendor Purchase
              </button>
            </div>
          ` : `
            <div class="table-container" style="overflow-x:auto;max-height:360px">
              <table class="data-table" style="font-size:0.78rem">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Vendor / Supplier</th>
                    <th>Vendor Invoice #</th>
                    <th>Supplier Lot #</th>
                    <th>Purchase Date</th>
                    <th>Rate / Unit</th>
                    <th>Remaining / Original</th>
                    <th>Status</th>
                    <th style="min-width:130px">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${batches.map(b => {
                    const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
                    const orig = b.originalQuantity !== undefined ? b.originalQuantity : (b.quantity || rem);
                    const pct = orig > 0 ? Math.round((rem / orig) * 100) : 0;
                    const isConsumed = b.status === 'CONSUMED' || rem <= 0;
                    return `
                      <tr>
                        <td class="font-mono" style="font-weight:700;color:${isConsumed?'var(--text-muted)':'var(--accent-secondary)'}">${escHtml(b.id || b.batchId)}</td>
                        <td>
                          <strong style="color:#fff">${escHtml(b.vendorName || b.supplier || 'Opening / Unassigned')}</strong>
                          ${b.vendorGstNumber ? `<br><span class="font-mono" style="font-size:0.68rem;color:var(--text-muted)">GST: ${escHtml(b.vendorGstNumber)}</span>` : ''}
                        </td>
                        <td class="font-mono">${escHtml(b.vendorInvoiceNumber || b.vendorBillingRef || '-')}</td>
                        <td class="font-mono">${escHtml(b.supplierBatchNumber || b.lotNumber || '-')}</td>
                        <td>${escHtml(b.purchaseDate || '-')}</td>
                        <td class="font-mono">₹${b.cost_per_unit || 0}/${escHtml(existing.unit)}</td>
                        <td>
                          <div class="font-mono" style="font-weight:600">${rem} / ${orig} ${escHtml(existing.unit)}</div>
                          <div style="font-size:0.68rem;color:var(--text-muted)">${pct}% remaining</div>
                          <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-top:2px">
                            <div style="height:100%;width:${pct}%;background:${isConsumed?'#ef4444':'#10b981'}"></div>
                          </div>
                        </td>
                        <td>
                          <span class="badge" style="font-size:0.68rem;background:${isConsumed?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)'};color:${isConsumed?'#ef4444':'#10b981'};border:1px solid ${isConsumed?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)'}">
                            ${isConsumed ? 'CONSUMED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div style="display:flex;gap:4px">
                            <button type="button" class="btn btn-ghost btn-sm" onclick="openRMBatchDetailsModal('${b.id || b.batchId}')" title="Full Vendor &amp; Consumption Details">Details</button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="openRMBatchTraceModal('${b.id || b.batchId}')" style="color:var(--accent-secondary)" title="Trace Batch Lineage">Trace</button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      ` : ''}
    </div>
  `;
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openEditRMForm(id) {
  const rm = state.rawMaterials.find(r => r.id === id);
  if (rm) openAddRMForm(rm);
}

function closeRMForm() {
  const area = $('#rm-form-area');
  if (area) area.innerHTML = '';
}

async function saveRM(existingId) {
  const unitSel = $('#rm-unit-select')?.value;
  const customUnit = $('#rm-unit-custom')?.value.trim();
  const unit = unitSel === 'CUSTOM' ? customUnit : unitSel;

  const payload = {
    name: $('#rm-name')?.value.trim(),
    unit,
    stock: parseFloat($('#rm-stock')?.value) || 0,
    current_stock: parseFloat($('#rm-stock')?.value) || 0,
    minimumStock: parseFloat($('#rm-reorder')?.value) || 0,
    reorder_point: parseFloat($('#rm-reorder')?.value) || 0,
    purchaseCost: parseFloat($('#rm-cost')?.value) || 0,
    cost_per_unit: parseFloat($('#rm-cost')?.value) || 0,
    supplier: $('#rm-supplier')?.value.trim(),
    category: $('#rm-category')?.value.trim(),
    purchaseDate: $('#rm-pdate')?.value,
    batchNumber: $('#rm-batchno')?.value.trim(),
    notes: $('#rm-notes')?.value.trim()
  };

  if (!payload.name) { showToast('Raw Material name is required', 'error'); return; }
  if (!payload.unit) { showToast('Unit type is required', 'error'); return; }

  const submitBtn = $('#save-rm-btn') || $('#rm-form-area')?.querySelector('.btn-primary');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Changes…';
  }

  try {
    if (existingId) {
      await api('PUT', `/api/raw-materials/${existingId}`, payload);
      showToast('Raw material updated ✓', 'success');
    } else {
      await api('POST', '/api/raw-materials', payload);
      showToast('Raw material created ✓', 'success');
    }
    await loadData();
    renderRawMaterials();
    closeRMForm();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = existingId ? 'Save Master Changes' : 'Create Raw Material';
    }
  }
}

function openIncreaseStockModal(preselectedRmId = null) {
  if (!state.rawMaterials || state.rawMaterials.length === 0) {
    showToast('No raw materials in inventory yet. Please create your first raw material master record first.', 'warning');
    openAddRMModal(true);
    return;
  }

  const modal = $('#increase-stock-modal');
  if (!modal) return;

  const select = $('#incstock-rm-select');
  if (select) {
    select.innerHTML = (state.rawMaterials || []).map(rm => `
      <option value="${rm.id}" ${rm.id === preselectedRmId ? 'selected' : ''}>
        ${escHtml(rm.name)} (ID: ${escHtml(rm.id)}) — Current Stock: ${rm.current_stock !== undefined ? rm.current_stock : rm.stock} ${escHtml(rm.unit)}
      </option>
    `).join('');
  }

  // Populate vendor datalist with unique supplier/vendor names
  const vendorList = $('#incstock-vendor-list');
  if (vendorList) {
    const vendors = new Set();
    (state.rawMaterials || []).forEach(r => { if (r.supplier) vendors.add(r.supplier); });
    (state.rawMaterialTxns || []).forEach(t => { if (t.vendorName) vendors.add(t.vendorName); });
    (state.customers || []).forEach(c => { if (c.name) vendors.add(c.name); });
    vendorList.innerHTML = Array.from(vendors).map(v => `<option value="${escHtml(v)}">`).join('');
  }

  // Reset inputs
  if ($('#incstock-qty')) $('#incstock-qty').value = '';
  if ($('#incstock-vendor-name')) $('#incstock-vendor-name').value = '';
  if ($('#incstock-vendor-gst')) $('#incstock-vendor-gst').value = '';
  if ($('#incstock-vendor-billref')) $('#incstock-vendor-billref').value = '';
  if ($('#incstock-vendor-inv')) $('#incstock-vendor-inv').value = '';
  if ($('#incstock-vendor-address')) $('#incstock-vendor-address').value = '';
  if ($('#incstock-vendor-contact')) $('#incstock-vendor-contact').value = '';
  if ($('#incstock-vendor-email')) $('#incstock-vendor-email').value = '';
  if ($('#incstock-vendor-price')) $('#incstock-vendor-price').value = '';
  if ($('#incstock-batch-no')) $('#incstock-batch-no').value = '';
  if ($('#incstock-purchase-date')) $('#incstock-purchase-date').value = new Date().toISOString().split('T')[0];
  if ($('#incstock-action')) $('#incstock-action').value = 'Purchase';
  if ($('#incstock-notes')) $('#incstock-notes').value = '';

  onIncreaseStockRMChange();
  modal.classList.add('open');
  setTimeout(() => $('#incstock-qty')?.focus(), 100);
}

function closeIncreaseStockModal() {
  $('#increase-stock-modal')?.classList.remove('open');
}

function onIncreaseStockRMChange() {
  const select = $('#incstock-rm-select');
  const rmId = select?.value;
  const rm = (state.rawMaterials || []).find(r => r.id === rmId);
  const curStock = rm ? (rm.current_stock !== undefined ? rm.current_stock : rm.stock) : 0;
  const unit = rm?.unit || 'units';

  if ($('#incstock-unit')) $('#incstock-unit').value = unit;
  if ($('#incstock-cur-stock')) $('#incstock-cur-stock').textContent = `${curStock} ${unit}`;
  if ($('#incstock-vendor-name') && rm?.supplier && !$('#incstock-vendor-name').value) {
    $('#incstock-vendor-name').value = rm.supplier;
  }

  updateIncreaseStockCalc();
}

function updateIncreaseStockCalc() {
  const rmId = $('#incstock-rm-select')?.value;
  const rm = (state.rawMaterials || []).find(r => r.id === rmId);
  const curStock = rm ? (rm.current_stock !== undefined ? rm.current_stock : rm.stock) : 0;
  const unit = rm?.unit || 'units';

  const addQty = parseFloat($('#incstock-qty')?.value) || 0;
  const newStock = parseFloat((curStock + addQty).toFixed(4));

  if ($('#incstock-cur-stock')) $('#incstock-cur-stock').textContent = `${curStock} ${unit}`;
  if ($('#incstock-add-qty')) $('#incstock-add-qty').textContent = addQty > 0 ? `+${addQty} ${unit}` : `0 ${unit}`;
  if ($('#incstock-new-stock')) $('#incstock-new-stock').textContent = `${newStock} ${unit}`;
}

async function submitIncreaseStock() {
  const rmId = $('#incstock-rm-select')?.value;
  const qty = parseFloat($('#incstock-qty')?.value);
  const vendorName = $('#incstock-vendor-name')?.value.trim();
  const vendorGstNumber = $('#incstock-vendor-gst')?.value.trim().toUpperCase();
  const vendorBillingRef = $('#incstock-vendor-billref')?.value.trim();
  const vendorInvoiceNumber = $('#incstock-vendor-inv')?.value.trim();
  const vendorAddress = $('#incstock-vendor-address')?.value.trim();
  const vendorContact = $('#incstock-vendor-contact')?.value.trim();
  const vendorEmail = $('#incstock-vendor-email')?.value.trim();
  const vendorPrice = $('#incstock-vendor-price')?.value ? parseFloat($('#incstock-vendor-price')?.value) : undefined;
  const supplierBatchNumber = $('#incstock-batch-no')?.value.trim();
  const purchaseDate = $('#incstock-purchase-date')?.value || undefined;
  const dateFormat = $('#incstock-date-format')?.value || 'DD/MM/YYYY';
  const action = $('#incstock-action')?.value || 'Purchase';
  const notes = $('#incstock-notes')?.value.trim();

  if (!rmId) { showToast('Select a raw material', 'error'); return; }
  if (!qty || qty <= 0) { showToast('Quantity purchased must be greater than zero', 'error'); return; }

  if (vendorGstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(vendorGstNumber)) {
    showToast('Invalid GST number format (expected 15 characters, e.g. 09ABCDE1234F1Z5)', 'error');
    return;
  }

  const btn = $('#incstock-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding Stock…'; }

  try {
    const payload = {
      qty,
      action,
      vendorName,
      vendorGstNumber,
      vendorBillingRef,
      vendorInvoiceNumber,
      vendorAddress,
      vendorContact,
      vendorEmail,
      vendorPrice,
      supplierBatchNumber,
      purchaseDate,
      dateFormat,
      notes
    };

    const res = await api('POST', `/api/raw-materials/${rmId}/add-stock`, payload);
    const rm = (state.rawMaterials || []).find(r => r.id === rmId);
    showToast(`✓ Stock increased — ${rm?.name || 'Raw Material'} (+${qty} ${rm?.unit || ''}) | Batch: ${res.effectiveBatchNumber || res.batchId} | Ref: ${res.auditCorrelationId}`, 'success');

    closeIncreaseStockModal();
    await loadData();
    renderRawMaterials();
  } catch (err) {
    showToast('Failed to increase stock: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Add Stock'; }
  }
}

// ── ADD RAW MATERIAL MASTER MODAL ───────────────────────────────────────────
function openAddRMModal(isFromIncreaseStock = false) {
  const modal = $('#add-rm-modal');
  if (!modal) return;
  const title = $('#add-rm-modal-title');
  if (title) {
    title.textContent = isFromIncreaseStock 
      ? 'Add Raw Material Master (Opening Stock)' 
      : 'New Raw Material Entry';
  }
  if ($('#modal-rm-name')) $('#modal-rm-name').value = '';
  if ($('#modal-rm-category')) $('#modal-rm-category').value = '';
  if ($('#modal-rm-unit')) $('#modal-rm-unit').value = 'kg';
  if ($('#modal-rm-custom-unit-wrap')) $('#modal-rm-custom-unit-wrap').style.display = 'none';
  if ($('#modal-rm-custom-unit')) $('#modal-rm-custom-unit').value = '';
  if ($('#modal-rm-opening-stock')) $('#modal-rm-opening-stock').value = '';
  if ($('#modal-rm-reorder')) $('#modal-rm-reorder').value = '';
  if ($('#modal-rm-cost')) $('#modal-rm-cost').value = '';
  if ($('#modal-rm-supplier')) $('#modal-rm-supplier').value = '';
  if ($('#modal-rm-notes')) $('#modal-rm-notes').value = '';
  modal.classList.add('open');
  setTimeout(() => $('#modal-rm-name')?.focus(), 100);
}

function closeAddRMModal() {
  $('#add-rm-modal')?.classList.remove('open');
}

async function submitAddRM() {
  const name = $('#modal-rm-name')?.value.trim();
  const unitSelect = $('#modal-rm-unit')?.value;
  const customUnit = $('#modal-rm-custom-unit')?.value.trim();
  const unit = unitSelect === 'CUSTOM' ? (customUnit || 'kg') : unitSelect;
  const category = $('#modal-rm-category')?.value.trim() || 'General';
  const openingStock = parseFloat($('#modal-rm-opening-stock')?.value) || 0;
  const minimumStock = parseFloat($('#modal-rm-reorder')?.value) || 0;
  const purchaseCost = parseFloat($('#modal-rm-cost')?.value) || 0;
  const supplier = $('#modal-rm-supplier')?.value.trim() || '';
  const notes = $('#modal-rm-notes')?.value.trim() || '';

  if (!name) { showToast('Raw material name is required', 'error'); return; }
  if (!unit) { showToast('Unit of measure is required', 'error'); return; }

  const btn = $('#add-rm-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving Material…'; }

  try {
    const payload = {
      name,
      unit,
      category,
      openingStock,
      stock: openingStock,
      current_stock: openingStock,
      minimumStock,
      reorder_point: minimumStock,
      purchaseCost,
      cost_per_unit: purchaseCost,
      supplier,
      vendorName: supplier,
      notes
    };

    const res = await api('POST', '/api/raw-materials', payload);
    showToast(`✓ Raw material "${res.raw_material?.name || name}" created successfully!`, 'success');
    closeAddRMModal();
    await loadData();
    renderRawMaterials();
  } catch (err) {
    showToast('Failed to create raw material: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Save Material Master'; }
  }
}

// ── RAW MATERIAL BATCHES MODAL ───────────────────────────────────────────────
let _currentRMBatchesData = null;
let _currentRMBatchesTab = 'active';

async function openRMBatchesModal(rmId) {
  const modal = $('#view-rm-batches-modal');
  const body = $('#rm-batches-modal-body');
  const title = $('#rm-batches-modal-title');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading batches…</div>';
  modal.classList.add('open');

  try {
    const data = await api('GET', `/api/raw-materials/${rmId}/batches`);
    _currentRMBatchesData = data;
    const rm = data.rawMaterial;
    if (title) title.textContent = `${rm.name} — Batch Inventory`;

    renderRMBatchesModalContent();
  } catch (err) {
    body.innerHTML = `<div style="color:var(--accent-danger);padding:20px;text-align:center">Failed to load batches: ${escHtml(err.message)}</div>`;
  }
}

function closeRMBatchesModal() {
  $('#view-rm-batches-modal')?.classList.remove('open');
}

function switchRMBatchesTab(tab) {
  _currentRMBatchesTab = tab;
  renderRMBatchesModalContent();
}

function renderRMBatchesModalContent() {
  const body = $('#rm-batches-modal-body');
  if (!body || !_currentRMBatchesData) return;

  const { rawMaterial: rm, parentStock, unit, activeBatches, consumedBatches, allBatches } = _currentRMBatchesData;
  const isTabActive = _currentRMBatchesTab === 'active';
  const displayBatches = isTabActive ? activeBatches : consumedBatches;

  body.innerHTML = `
    <!-- Parent Stock Invariant Banner -->
    <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Parent Total Stock (Live Invariant)</div>
        <div style="font-size:1.3rem;font-weight:700;color:#fff" class="font-mono">${parentStock} ${escHtml(unit)}</div>
        <div style="font-size:0.75rem;color:var(--accent-secondary)">Parent Stock strictly equals sum of active child batches (${activeBatches.length} active)</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="openIncreaseStockModal('${rm.id}')" style="color:var(--accent-secondary)">+ Inward Purchase</button>
      </div>
    </div>

    <!-- Active vs Consumed Tabs -->
    <div style="display:flex;gap:8px;border-bottom:1px solid var(--border-subtle);margin-bottom:16px">
      <button class="btn btn-sm ${isTabActive ? 'btn-primary' : 'btn-ghost'}" onclick="switchRMBatchesTab('active')">
        Active Batches (${activeBatches.length})
      </button>
      <button class="btn btn-sm ${!isTabActive ? 'btn-primary' : 'btn-ghost'}" onclick="switchRMBatchesTab('consumed')">
        Consumed / Depleted Batches (${consumedBatches.length})
      </button>
    </div>

    <!-- Batches List -->
    ${displayBatches.length === 0 ? `
      <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
        No ${isTabActive ? 'active' : 'consumed'} batches found for this raw material.
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:12px">
        ${displayBatches.map(b => {
          const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
          const orig = b.originalQuantity !== undefined ? b.originalQuantity : (b.quantity || rem);
          const pct = orig > 0 ? Math.round((rem / orig) * 100) : 0;
          const isConsumed = b.status === 'CONSUMED' || rem <= 0;

          return `
            <div style="background:var(--bg-card);border:1px solid ${isConsumed ? 'var(--border-subtle)' : 'rgba(6,182,212,0.3)'};border-radius:var(--radius-md);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
              <div style="flex:1;min-width:240px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span class="font-mono" style="font-weight:700;color:${isConsumed ? 'var(--text-muted)' : 'var(--accent-secondary)'};font-size:0.88rem">${escHtml(b.id || b.batchId)}</span>
                  <span class="badge" style="font-size:0.68rem;background:${isConsumed ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'};color:${isConsumed ? '#ef4444' : '#10b981'};border:1px solid ${isConsumed ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}">
                    ${isConsumed ? 'CONSUMED' : 'ACTIVE'}
                  </span>
                  ${b.supplierBatchNumber ? `<span style="font-size:0.72rem;color:var(--text-muted)">Lot: ${escHtml(b.supplierBatchNumber)}</span>` : ''}
                </div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">
                  Vendor: <strong style="color:#fff">${escHtml(b.vendorName || b.supplier || 'Opening / Unassigned')}</strong>
                  ${b.purchaseDate ? ` • Purchased: ${escHtml(b.purchaseDate)}` : ''}
                  ${b.cost_per_unit ? ` • ₹${b.cost_per_unit}/${escHtml(unit)}` : ''}
                </div>
                ${b.auditCorrelationId ? `<div style="font-size:0.72rem;color:var(--text-muted);font-family:monospace;margin-top:2px">Ref: ${escHtml(b.auditCorrelationId)}</div>` : ''}
              </div>

              <!-- Stock progress -->
              <div style="min-width:160px;text-align:right">
                <div style="font-size:0.95rem;font-weight:700;color:${isConsumed ? 'var(--text-muted)' : '#fff'}" class="font-mono">
                  ${rem} / ${orig} ${escHtml(unit)}
                </div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">${pct}% Remaining</div>
                <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${isConsumed ? '#ef4444' : '#10b981'}"></div>
                </div>
              </div>

              <!-- Actions -->
              <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="openRMBatchDetailsModal('${b.id || b.batchId}')" title="View Full Batch & Vendor Details">Details</button>
                <button class="btn btn-secondary btn-sm" onclick="openRMBatchTraceModal('${b.id || b.batchId}')" style="color:var(--accent-secondary)" title="Trace Batch Lineage">Trace</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

// ─── DEDICATED RAW MATERIAL VENDORS MODAL & MANAGEMENT ──────────────────────
let _currentRMVendorsData = null;
let _currentRMVendorsTab = 'active';

async function openRMVendorsModal(rmId) {
  const modal = $('#rm-vendors-modal');
  const body = $('#rm-vendors-modal-body');
  const title = $('#rm-vendors-modal-title');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading vendor details…</div>';
  modal.classList.add('open');

  try {
    const data = await api('GET', `/api/raw-materials/${rmId}/vendors`);
    _currentRMVendorsData = data;
    if (title) title.textContent = `${data.rawMaterialName} — Vendor Management`;
    renderRMVendorsModalContent();
  } catch (err) {
    body.innerHTML = `<div style="color:var(--accent-danger);padding:20px;text-align:center">Failed to load vendors: ${escHtml(err.message)}</div>`;
  }
}

function closeRMVendorsModal() {
  $('#rm-vendors-modal')?.classList.remove('open');
  _currentRMVendorsData = null;
}

function switchRMVendorsTab(tab) {
  _currentRMVendorsTab = tab;
  renderRMVendorsModalContent();
}

function renderRMVendorsModalContent() {
  const body = $('#rm-vendors-modal-body');
  if (!body || !_currentRMVendorsData) return;

  const { rawMaterialId: rmId, rawMaterialName: rmName, parentStock, unit, activeVendors, deletedVendors } = _currentRMVendorsData;
  const isTabActive = _currentRMVendorsTab === 'active';
  const totalValuation = (activeVendors || []).reduce((s, v) => s + (v.valuation || 0), 0);

  body.innerHTML = `
    <!-- Top Stats Banner -->
    <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Parent Material &amp; Active Stock</div>
        <div style="font-size:1.3rem;font-weight:700;color:#fff" class="font-mono">${escHtml(rmName)}: ${parentStock} ${escHtml(unit)}</div>
        <div style="font-size:0.75rem;color:#38bdf8">Active Vendors: ${(activeVendors || []).length} · Total Active Valuation: ₹${formatCurrency(totalValuation)}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="closeRMVendorsModal();openIncreaseStockModal('${rmId}')" style="color:var(--accent-secondary)">+ Inward Purchase (Add Vendor)</button>
      </div>
    </div>

    <!-- Active vs Deleted Vendors Tabs -->
    <div style="display:flex;gap:8px;border-bottom:1px solid var(--border-subtle);margin-bottom:16px">
      <button class="btn btn-sm ${isTabActive ? 'btn-primary' : 'btn-ghost'}" onclick="switchRMVendorsTab('active')">
        Active Vendors (${(activeVendors || []).length})
      </button>
      <button class="btn btn-sm ${!isTabActive ? 'btn-primary' : 'btn-ghost'}" onclick="switchRMVendorsTab('deleted')">
        Deleted Vendors Archive (${(deletedVendors || []).length})
      </button>
    </div>

    ${isTabActive ? `
      ${(!activeVendors || activeVendors.length === 0) ? `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          No active vendors found for this raw material.
        </div>
      ` : `
        <table class="data-table" style="width:100%">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>GSTIN</th>
              <th>Batches</th>
              <th>Total Inward Qty</th>
              <th>Active Stock</th>
              <th>Valuation (₹)</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${activeVendors.map(v => `
              <tr>
                <td><strong style="color:#fff">${escHtml(v.vendorName)}</strong></td>
                <td class="font-mono" style="font-size:0.78rem">${escHtml(v.vendorGstNumber || '-')}</td>
                <td><span class="badge" style="background:rgba(56,189,248,0.15);color:#38bdf8">${v.batchCount} batch${v.batchCount>1?'es':''}</span></td>
                <td class="font-mono">${v.totalInwardStock} ${escHtml(unit)}</td>
                <td class="font-mono" style="color:#6ee7b7;font-weight:700">${v.activeStock} ${escHtml(unit)}</td>
                <td class="font-mono">₹${formatCurrency(v.valuation)}</td>
                <td style="text-align:right">
                  <button class="btn btn-danger btn-sm" onclick="promptDeleteRMVendor('${rmId}', '${escHtml(v.vendorName)}')" style="font-size:0.75rem">
                    🗑️ Delete Vendor
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    ` : `
      ${(!deletedVendors || deletedVendors.length === 0) ? `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          No deleted vendors on record for this raw material.
        </div>
      ` : `
        <table class="data-table" style="width:100%">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Deducted Stock</th>
              <th>Deducted Valuation</th>
              <th>Deletion Reason</th>
              <th>Date &amp; Time Deleted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${deletedVendors.map(v => `
              <tr>
                <td><strong style="color:#f87171">${escHtml(v.vendorName)}</strong></td>
                <td class="font-mono" style="color:#fca5a5">-${v.deductedQty} ${escHtml(unit)}</td>
                <td class="font-mono" style="color:#fca5a5">-₹${formatCurrency(v.deductedVal)}</td>
                <td style="font-size:0.8rem;max-width:240px;word-break:break-word">
                  <span style="background:rgba(239,68,68,0.1);padding:3px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.2);color:#fca5a5">
                    ${escHtml(v.reason || 'No reason specified')}
                  </span>
                </td>
                <td class="font-mono" style="font-size:0.75rem;color:var(--text-secondary)">${v.date} ${v.time}</td>
                <td><span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)">DELETED</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    `}
  `;
}

function promptDeleteRMVendor(rmId, vendorName) {
  const rm = state.rawMaterials.find(r => r.id === rmId);
  const rmName = rm ? rm.name : 'Raw Material';
  const batches = (state.rawMaterialBatches || []).filter(b => b.rawMaterialId === rmId && (b.vendorName || b.supplier || '').trim().toLowerCase() === vendorName.toLowerCase() && b.status !== 'DELETED');
  const vStock = batches.reduce((s, b) => s + (b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0)), 0);
  const vCost = rm?.cost_per_unit || 0;
  const vVal = vStock * vCost;

  promptDeletion({
    title: `Delete Vendor — ${vendorName}`,
    itemName: `Vendor: ${vendorName}`,
    details: `Material: <strong>${escHtml(rmName)}</strong>.<br>Associated Active Stock: <strong>${vStock} ${escHtml(rm?.unit || '')}</strong> (Valuation: <strong>₹${formatCurrency(vVal)}</strong>).<br><span style="color:#f87171">⚠️ This stock and valuation will be immediately deducted from the parent raw material stock and the raw material inventory main grand total.</span>`,
    onConfirm: async ({ reason }) => {
      const res = await api('POST', `/api/raw-materials/${rmId}/delete-vendor`, { vendorName, reason });
      if (res && res.success) {
        showToast(`Vendor "${vendorName}" deleted & ${res.deductedQty} ${rm?.unit || ''} deducted from stock ✓`, 'success');
        await loadData();
        renderRawMaterials();
        openRMVendorsModal(rmId);
      } else {
        throw new Error((res && res.error) || 'Failed to delete vendor');
      }
    }
  });
}

// ── RAW MATERIAL BATCH DETAILS MODAL ─────────────────────────────────────────
async function openRMBatchDetailsModal(batchId) {
  const modal = $('#rm-batch-details-modal');
  const body = $('#rm-batch-details-modal-body');
  const title = $('#rm-batch-details-title');
  if (!modal || !body) return;

  if (title) title.textContent = `Batch Details: ${batchId}`;
  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Loading batch details…</div>';
  modal.classList.add('open');

  try {
    const data = await api('GET', `/api/raw-material-batches/${batchId}`);
    const b = data.batch;
    const consumptions = data.consumptions || [];
    const rem = b.remainingQuantity !== undefined ? b.remainingQuantity : (b.remainingQty || 0);
    const orig = b.originalQuantity !== undefined ? b.originalQuantity : (b.quantity || rem);

    body.innerHTML = `
      <!-- Overview Card -->
      <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:16px;margin-bottom:18px;display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:12px">
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted)">BATCH ID</div>
          <div class="font-mono" style="font-size:0.9rem;font-weight:700;color:var(--accent-secondary)">${escHtml(b.id || b.batchId)}</div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted)">STATUS</div>
          <div style="font-size:0.9rem;font-weight:700;color:${b.status==='CONSUMED'?'#ef4444':'#10b981'}">${escHtml(b.status || 'ACTIVE')}</div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted)">REMAINING STOCK</div>
          <div class="font-mono" style="font-size:0.9rem;font-weight:700;color:#fff">${rem} ${escHtml(b.unit || '')}</div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted)">ORIGINAL STOCK</div>
          <div class="font-mono" style="font-size:0.9rem;font-weight:700;color:var(--text-secondary)">${orig} ${escHtml(b.unit || '')}</div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted)">PURCHASE COST</div>
          <div class="font-mono" style="font-size:0.9rem;font-weight:700;color:#fff">${formatCurrency(b.cost_per_unit || 0)}/${escHtml(b.unit || '')}</div>
        </div>
        <div>
          <div style="font-size:0.72rem;color:var(--text-muted)">CORRELATION ID</div>
          <div class="font-mono" style="font-size:0.75rem;color:var(--text-muted)">${escHtml(b.auditCorrelationId || 'N/A')}</div>
        </div>
      </div>

      <!-- Vendor / Supplier Information -->
      <div style="margin-bottom:20px">
        <h4 style="color:#fff;font-size:0.85rem;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.04em">Vendor &amp; Invoice Metadata</h4>
        <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.82rem">
          <div><span style="color:var(--text-muted)">Vendor Name:</span> <strong style="color:#fff">${escHtml(b.vendorName || b.supplier || 'N/A')}</strong></div>
          <div><span style="color:var(--text-muted)">Vendor GSTIN:</span> <strong style="color:#fff" class="font-mono">${escHtml(b.vendorGstNumber || 'N/A')}</strong></div>
          <div><span style="color:var(--text-muted)">Vendor Billing Ref:</span> <span style="color:#fff">${escHtml(b.vendorBillingRef || 'N/A')}</span></div>
          <div><span style="color:var(--text-muted)">Vendor Invoice #:</span> <span style="color:#fff">${escHtml(b.vendorInvoiceNumber || 'N/A')}</span></div>
          <div><span style="color:var(--text-muted)">Supplier Lot #:</span> <span style="color:#fff">${escHtml(b.supplierBatchNumber || b.lotNumber || 'N/A')}</span></div>
          <div><span style="color:var(--text-muted)">Purchase Date:</span> <span style="color:#fff">${escHtml(b.purchaseDate || 'N/A')}</span></div>
          <div><span style="color:var(--text-muted)">Vendor Contact:</span> <span style="color:#fff">${escHtml(b.vendorContact || 'N/A')}</span></div>
          <div><span style="color:var(--text-muted)">Vendor Email:</span> <span style="color:#fff">${escHtml(b.vendorEmail || 'N/A')}</span></div>
          <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Vendor Address:</span> <span style="color:#fff">${escHtml(b.vendorAddress || 'N/A')}</span></div>
          ${b.notes ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Notes:</span> <span style="color:#fff">${escHtml(b.notes)}</span></div>` : ''}
        </div>
      </div>

      <!-- Manufacturing Consumption History -->
      <div>
        <h4 style="color:#fff;font-size:0.85rem;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.04em">Manufacturing Consumption History</h4>
        ${consumptions.length === 0 ? `
          <div style="font-size:0.8rem;color:var(--text-muted);padding:14px;background:var(--bg-card);border-radius:var(--radius-md);text-align:center">
            This batch has not yet been consumed by any manufacturing batch.
          </div>
        ` : `
          <table class="data-table" style="font-size:0.8rem">
            <thead>
              <tr>
                <th>Date</th>
                <th>MFG Batch #</th>
                <th>Product Produced</th>
                <th>Qty Consumed</th>
                <th>Ref ID</th>
              </tr>
            </thead>
            <tbody>
              ${consumptions.map(c => `
                <tr>
                  <td>${escHtml(c.date || '')}</td>
                  <td class="font-mono" style="color:var(--accent-secondary)">${escHtml(c.batchNumber || c.manufacturingBatchId || '')}</td>
                  <td><strong>${escHtml(c.productName || '')}</strong></td>
                  <td class="font-mono">${c.rawMaterialQuantityConsumed || c.consumedQuantity || 0} ${escHtml(b.unit || '')}</td>
                  <td class="font-mono" style="font-size:0.75rem;color:var(--text-muted)">${escHtml(c.auditCorrelationId || c.auditId || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color:var(--accent-danger);padding:20px;text-align:center">Failed to load batch details: ${escHtml(err.message)}</div>`;
  }
}

function closeRMBatchDetailsModal() {
  $('#rm-batch-details-modal')?.classList.remove('open');
}

// ── RAW MATERIAL BATCH TRACEABILITY MODAL ────────────────────────────────────
async function openRMBatchTraceModal(batchId) {
  const modal = $('#trace-batch-modal');
  const body = $('#trace-batch-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Tracing batch lineage across vendor, inward, manufacturing, finished goods, and sales…</div>';
  modal.classList.add('open');

  try {
    const data = await api('GET', `/api/raw-material-batches/${batchId}/traceability`);
    const b = data.batch;
    const inward = data.inward;
    const mfg = data.manufacturing || { batches: [], totalConsumedQty: 0 };
    const fg = data.finishedGoods || [];
    const sales = data.sales || [];

    body.innerHTML = `
      <div style="margin-bottom:18px">
        <h3 style="color:#fff;font-size:1rem;margin-bottom:4px">
          Batch Traceability Lineage: <span class="font-mono" style="color:var(--accent-secondary)">${escHtml(b.id || b.batchId)}</span>
        </h3>
        <div style="font-size:0.8rem;color:var(--text-secondary)">
          Material: <strong>${escHtml(b.rawMaterialName || '')}</strong> • Status: <span style="color:${b.status==='CONSUMED'?'#ef4444':'#10b981'};font-weight:700">${escHtml(b.status || 'ACTIVE')}</span> • Ref: ${escHtml(b.auditCorrelationId || 'N/A')}
        </div>
      </div>

      <!-- Lineage Steps Grid -->
      <div style="display:flex;flex-direction:column;gap:14px">
        <!-- 1. Origin / Vendor Inward -->
        <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-left:4px solid var(--accent-secondary);border-radius:var(--radius-md);padding:14px">
          <div style="font-size:0.75rem;font-weight:700;color:var(--accent-secondary);text-transform:uppercase;margin-bottom:6px">1. Purchase Origin &amp; Inward Invariant</div>
          <div style="font-size:0.82rem;display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <div>Vendor: <strong style="color:#fff">${escHtml(inward.vendorName || inward.supplier || 'N/A')}</strong></div>
            <div>GSTIN: <span class="font-mono" style="color:#fff">${escHtml(inward.vendorGstNumber || 'N/A')}</span></div>
            <div>Purchase Date: <span style="color:#fff">${escHtml(inward.purchaseDate || 'N/A')}</span></div>
            <div>Original Inward Qty: <strong style="color:#fff" class="font-mono">${b.originalQuantity !== undefined ? b.originalQuantity : b.quantity} ${escHtml(b.unit || '')}</strong></div>
            <div>Remaining Stock: <strong style="color:#10b981" class="font-mono">${b.remainingQuantity !== undefined ? b.remainingQuantity : b.remainingQty} ${escHtml(b.unit || '')}</strong></div>
            <div>Correlation ID: <span class="font-mono" style="color:var(--text-muted);font-size:0.75rem">${escHtml(b.auditCorrelationId || 'N/A')}</span></div>
          </div>
        </div>

        <!-- 2. Manufacturing Consumption -->
        <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-left:4px solid #60a5fa;border-radius:var(--radius-md);padding:14px">
          <div style="font-size:0.75rem;font-weight:700;color:#60a5fa;text-transform:uppercase;margin-bottom:6px">2. Manufacturing Deductions (${mfg.batches.length} batch executions)</div>
          ${mfg.batches.length === 0 ? `
            <div style="font-size:0.8rem;color:var(--text-muted)">No manufacturing batches have consumed from this lot yet.</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:6px">
              ${mfg.batches.map(mb => `
                <div style="font-size:0.8rem;background:var(--bg-elevated);padding:8px 12px;border-radius:4px;display:flex;align-items:center;justify-content:space-between">
                  <div>
                    <span class="font-mono" style="color:var(--accent-secondary);font-weight:700">${escHtml(mb.batchNumber || mb.id)}</span>:
                    Produced <strong style="color:#fff">${escHtml(mb.productName || '')}</strong> (${mb.quantityProduced} units)
                  </div>
                  <div class="font-mono" style="color:#f59e0b">-${mb.consumedFromThisBatch} ${escHtml(b.unit || '')}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 3. Finished Goods Produced -->
        <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-left:4px solid #10b981;border-radius:var(--radius-md);padding:14px">
          <div style="font-size:0.75rem;font-weight:700;color:#10b981;text-transform:uppercase;margin-bottom:6px">3. Finished Goods Lots (${fg.length})</div>
          ${fg.length === 0 ? `
            <div style="font-size:0.8rem;color:var(--text-muted)">No finished goods lots linked directly.</div>
          ` : `
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${fg.map(f => `
                <span class="badge" style="font-size:0.75rem;background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:4px 8px">
                  ${escHtml(f.name)} (Lot: ${escHtml(f.finishedGoodsBatchId)}) • Stock: ${f.currentStock}
                </span>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 4. Sales Distribution -->
        <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-left:4px solid #a855f7;border-radius:var(--radius-md);padding:14px">
          <div style="font-size:0.75rem;font-weight:700;color:#a855f7;text-transform:uppercase;margin-bottom:6px">4. Sales Invoices &amp; Distribution (${sales.length})</div>
          ${sales.length === 0 ? `
            <div style="font-size:0.8rem;color:var(--text-muted)">No downstream sales invoices recorded for products from this batch yet.</div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:6px">
              ${sales.map(s => `
                <div style="font-size:0.8rem;background:var(--bg-elevated);padding:8px 12px;border-radius:4px;display:flex;align-items:center;justify-content:space-between">
                  <div>
                    <span class="font-mono" style="color:var(--accent-secondary);font-weight:700">${escHtml(s.invoiceNumber)}</span> •
                    Customer: <strong style="color:#fff">${escHtml(s.customerName)}</strong> • Date: ${escHtml(s.date)}
                  </div>
                  <div class="font-mono" style="color:#10b981">${formatCurrency(s.total || 0)}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color:var(--accent-danger);padding:20px;text-align:center">Traceability retrieval failed: ${escHtml(err.message)}</div>`;
  }
}

function viewRMHistory(rmId) {
  const rm = (state.rawMaterials || []).find(r => r.id === rmId);
  navigateTo('inventory-history');
  setLedgerTab('rm');
  if (rm) {
    setTimeout(() => {
      const searchInput = $('#unified-audit-search');
      if (searchInput) {
        searchInput.value = rm.name;
        filterUnifiedAudit();
      }
    }, 100);
  }
}

function confirmDeleteRM(id) {
  const rm = state.rawMaterials.find(r => r.id === id);
  const name = rm ? rm.name : 'Raw Material';
  const curStock = rm ? (rm.current_stock !== undefined ? rm.current_stock : rm.stock) : 0;
  promptDeletion({
    title: 'Delete Raw Material',
    itemName: name,
    details: `Material ID: <code>${escHtml(id)}</code> · Current Stock: <strong>${curStock} ${escHtml(rm?.unit || '')}</strong>. All associated purchase batches will be permanently purged.`,
    onConfirm: async ({ reason }) => {
      await api('DELETE', `/api/raw-materials/${id}`, { reason });
      showToast(`Raw material "${name}" deleted ✓`, 'success');
      await loadData();
      renderRawMaterials();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PAGE: RECIPES & BILLS OF MATERIALS (BOM) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderRecipes() {
  const el = $('#page-recipes');
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Manufactured Product Library &amp; Recipe Builder</h1>
        <p class="page-subtitle">Define Bill of Materials (BOM) recipes linking catalog products to raw material proportions</p>
      </div>
      <button class="btn btn-primary" onclick="openRecipeForm()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Recipe / BOM
      </button>
    </div>

    <!-- Recipe form container -->
    <div id="recipe-form-area"></div>

    <!-- Production Preview Modal -->
    <div class="modal-overlay" id="preview-modal">
      <div class="modal" style="max-width:640px">
        <div class="modal-header">
          <h2 id="preview-modal-title">Pre-Production Feasibility Preview</h2>
          <button class="modal-close" onclick="closeProductionPreview()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="preview-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeProductionPreview()">Close</button>
          <button class="btn btn-primary" id="preview-go-mfg-btn" onclick="navigateTo('manufacturing');closeProductionPreview()">
            Go to Manufacturing Screen →
          </button>
        </div>
      </div>
    </div>

    <!-- Recipes Grid -->
    ${state.recipes.length === 0 ? `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="margin-bottom:12px;opacity:0.4"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        <p style="margin-bottom:14px">No recipes built yet. Define your first manufactured product BOM.</p>
        <button class="btn btn-primary" onclick="openRecipeForm()">+ Build First Recipe</button>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
        ${state.recipes.map(r => {
          const costPerBottle = calculateRecipeCostPerBottle(r, state.rawMaterials);
          return `
          <div class="recipe-card">
            <div class="recipe-card-header">
              <div>
                <div class="recipe-card-title">${escHtml(r.name || r.productName)}</div>
                <div class="recipe-card-output">
                  Bottle Size: <strong>${r.bottleSize || 200} ${escHtml(r.bottleSizeUnit || 'mL')}</strong>
                </div>
              </div>
              <span class="font-mono" style="font-size:0.78rem;color:#10b981;font-weight:700">Cost: ~${formatCurrency(costPerBottle)}/bot</span>
            </div>
            ${r.description ? `<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">${escHtml(r.description)}</p>` : ''}
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em">Bill of Materials (${(r.ingredients||[]).length} Ingredients):</div>
            <div class="recipe-ingredients-list">
              ${(r.ingredients||[]).map(ing => `
                <span class="recipe-ingredient-chip">
                  ${escHtml(ing.raw_material_name)} · ${ing.qty} ${escHtml(ing.unit)}
                  ${ing.vendorPreference && ing.vendorPreference !== 'DEFAULT_FIFO' ? `<span style="color:var(--accent-secondary);font-weight:700;margin-left:4px">[Vendor: ${escHtml(ing.vendorPreference)}]</span>` : ''}
                </span>
              `).join('')}
            </div>
            <div class="recipe-card-actions">
              <button class="btn btn-secondary btn-sm" onclick="openProductionPreview('${r.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Feasibility Preview
              </button>
              <button class="btn btn-secondary btn-sm" onclick="editRecipe('${r.id}')" style="color:#f59e0b">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="btn btn-ghost btn-sm" onclick="openRecipeHistoryModal('${r.id}')" style="color:var(--accent-primary-light)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                History
              </button>
              <button class="btn btn-ghost btn-sm" onclick="deleteRecipe('${r.id}')">Delete</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `}
  `;
}

function openRecipeForm() {
  const area = $('#recipe-form-area');
  if (!area) return;

  const productOptions = state.products.map(p =>
    `<option value="${p.id}" data-name="${escHtml(p.name)}" data-rate="${p.rate}">${escHtml(p.name)} (${p.unit})</option>`
  ).join('');

  const rmOptions = state.rawMaterials.map(rm =>
    `<option value="${rm.id}" data-unit="${escHtml(rm.unit)}" data-cost="${rm.cost_per_unit||rm.purchaseCost||0}">${escHtml(rm.name)} (${escHtml(rm.unit)})</option>`
  ).join('');

  area.innerHTML = `
    <div class="add-stock-form" style="margin-bottom:24px">
      <h3 style="font-size:0.9rem;font-weight:700;color:#fff;margin-bottom:14px">Recipe / Bill of Materials Builder</h3>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Link Catalog Product (Optional)</label>
          <select id="rcp-product-select" onchange="const opt=this.options[this.selectedIndex]; if(opt.value){ $('#rcp-name').value = opt.dataset.name; }">
            <option value="">Create standalone manufactured product recipe…</option>
            ${productOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Manufactured Product Name *</label>
          <input type="text" id="rcp-name" placeholder="e.g. Premium Air Freshener" />
        </div>
        <div class="form-group">
          <label>Bottle / Unit Size *</label>
          <input type="number" id="rcp-bottle-size" value="200" min="1" step="any" placeholder="e.g. 200" />
        </div>
        <div class="form-group">
          <label>Bottle Unit *</label>
          <select id="rcp-bottle-unit">
            <option value="mL">mL (Millilitres)</option>
            <option value="L">L (Litres)</option>
            <option value="g">g (Grams)</option>
            <option value="kg">kg (Kilograms)</option>
            <option value="pcs">pcs (Pieces / Units)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Selling Price Per Bottle (₹)</label>
          <input type="number" id="rcp-price" value="0" min="0" step="any" />
        </div>
        <div class="form-group">
          <label>Default Batch Size (Bottles)</label>
          <input type="number" id="rcp-default-batch" value="500" min="1" step="any" />
        </div>
        <div class="form-group full-width">
          <label>Description / Formula Notes</label>
          <input type="text" id="rcp-desc" placeholder="e.g. Standard 200mL air freshener formulation" />
        </div>
      </div>

      <div style="margin-top:16px">
        <label style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Raw Material Ingredients (Per Bottle / Unit)</label>
        <div class="ingredient-rows" id="ingredient-rows"></div>
        ${state.rawMaterials.length > 0
          ? `<button type="button" class="add-ingredient-btn" onclick="addIngredientRow()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Raw Material Ingredient
             </button>`
          : `<p style="font-size:0.78rem;color:var(--accent-warning);margin-top:8px">⚠ No raw materials found in catalog. <a href="javascript:void(0)" onclick="navigateTo('raw-materials')" style="color:var(--accent-primary-light)">Add raw materials first.</a></p>`
        }
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" onclick="submitRecipeForm()">Save Recipe / BOM</button>
        <button class="btn btn-ghost" onclick="closeRecipeForm()">Cancel</button>
      </div>
    </div>
  `;

  window._rmOptions = rmOptions;
  addIngredientRow();
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let _ingredientIdx = 0;
function addIngredientRow(existing = null) {
  const container = $('#ingredient-rows');
  if (!container) return;
  const idx = _ingredientIdx++;
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.id = `ing-row-${idx}`;

  const isStandardUnit = existing && RAW_MATERIAL_UNIT_OPTIONS.includes(existing.unit);
  const selectedUnit = existing ? (isStandardUnit ? existing.unit : 'CUSTOM') : 'mL';

  row.innerHTML = `
    <select id="ing-rm-${idx}">
      <option value="">Select Raw Material…</option>
      ${window._rmOptions || ''}
    </select>
    <input type="number" id="ing-qty-${idx}" value="${existing ? existing.qty : ''}" min="0.0001" step="any" placeholder="Qty per bottle" />

    <!-- Unit dropdown with CUSTOM / Other option -->
    <select class="ving-unit-select" id="ing-unit-sel-${idx}" onchange="toggleCustomUnit(this)">
      ${RAW_MATERIAL_UNIT_OPTIONS.map(u => `<option value="${u}" ${selectedUnit===u?'selected':''}>${u}</option>`).join('')}
      <option value="CUSTOM" ${selectedUnit==='CUSTOM'?'selected':''}>Other...</option>
    </select>

    <input type="text" class="ving-custom-unit" id="ing-unit-custom-${idx}" value="${existing ? escHtml(existing.unit) : ''}" placeholder="Unit name" style="display:${selectedUnit==='CUSTOM'?'block':'none'};max-width:90px" />

    <!-- Vendor Preference Dropdown (Default / FIFO or Specific Vendor) -->
    <select class="ving-vendor-select" id="ing-vendor-sel-${idx}" style="max-width:160px;font-size:0.75rem;" title="Vendor Preference: FIFO Default or Specific Vendor">
      <option value="DEFAULT_FIFO">Default / FIFO (All)</option>
    </select>

    <button type="button" class="ingredient-remove-btn" onclick="removeIngredientRow('ing-row-${idx}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const updateVendorsForSelect = (rmId, preferredVendor) => {
    const vSel = row.querySelector(`#ing-vendor-sel-${idx}`);
    if (!vSel) return;
    const vendors = new Set();
    (state.rawMaterialBatches || []).forEach(b => {
      if (b.rawMaterialId === rmId && b.vendorName && b.vendorName.trim()) {
        vendors.add(b.vendorName.trim());
      }
    });
    let html = `<option value="DEFAULT_FIFO">Default / FIFO (All)</option>`;
    vendors.forEach(v => {
      const isSel = (preferredVendor === v) ? 'selected' : '';
      html += `<option value="${escHtml(v)}" ${isSel}>Vendor: ${escHtml(v)}</option>`;
    });
    if (preferredVendor && preferredVendor !== 'DEFAULT_FIFO' && !vendors.has(preferredVendor)) {
      html += `<option value="${escHtml(preferredVendor)}" selected>Vendor: ${escHtml(preferredVendor)}</option>`;
    }
    vSel.innerHTML = html;
  };

  if (existing) {
    setTimeout(() => {
      const sel = row.querySelector(`#ing-rm-${idx}`);
      const rmId = existing.raw_material_id || existing.rawMaterialId || '';
      if (sel) sel.value = rmId;
      updateVendorsForSelect(rmId, existing.vendorPreference || 'DEFAULT_FIFO');
    }, 10);
  }

  row.querySelector(`#ing-rm-${idx}`).addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    const unitSelect = row.querySelector(`#ing-unit-sel-${idx}`);
    const customInput = row.querySelector(`#ing-unit-custom-${idx}`);
    if (unitSelect && opt.dataset.unit) {
      const rmUnit = opt.dataset.unit;
      if (RAW_MATERIAL_UNIT_OPTIONS.includes(rmUnit)) {
        unitSelect.value = rmUnit;
        if (customInput) { customInput.style.display = 'none'; customInput.value = rmUnit; }
      } else {
        unitSelect.value = 'CUSTOM';
        if (customInput) { customInput.style.display = 'block'; customInput.value = rmUnit; }
      }
    }
    updateVendorsForSelect(this.value, 'DEFAULT_FIFO');
  });

  container.appendChild(row);
}

function removeIngredientRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
}

async function submitRecipeForm() {
  const productId  = $('#rcp-product-select')?.value || null;
  const name       = $('#rcp-name')?.value.trim();
  const bottleSize = parseFloat($('#rcp-bottle-size')?.value) || 200;
  const bottleUnit = $('#rcp-bottle-unit')?.value || 'mL';
  const price      = parseFloat($('#rcp-price')?.value) || 0;
  const batchSize  = parseFloat($('#rcp-default-batch')?.value) || 500;
  const desc       = $('#rcp-desc')?.value.trim();

  if (!name) { showToast('Recipe product name is required', 'error'); return; }

  const rows = $$('.ingredient-row');
  const ingredients = [];
  for (const row of rows) {
    const rmSel      = row.querySelector('select');
    const qtyIn      = row.querySelector('input[type="number"]');
    const unitSel    = row.querySelector('.ving-unit-select')?.value;
    const customUnit = row.querySelector('.ving-custom-unit')?.value.trim();
    const vendorSel  = row.querySelector('.ving-vendor-select')?.value || 'DEFAULT_FIFO';

    if (!rmSel?.value) continue;
    const qty = parseFloat(qtyIn?.value);
    if (!qty || qty <= 0) { showToast('All ingredient quantities must be positive numbers', 'error'); return; }
    const rm = state.rawMaterials.find(r => r.id === rmSel.value);
    const finalUnit = unitSel === 'CUSTOM' ? (customUnit || rm?.unit || 'mL') : (unitSel || rm?.unit || 'mL');
    ingredients.push({
      raw_material_id: rmSel.value,
      raw_material_name: rm?.name || '',
      qty,
      unit: finalUnit,
      vendorPreference: vendorSel
    });
  }

  if (ingredients.length === 0) { showToast('Add at least one raw material ingredient', 'error'); return; }

  const payload = {
    name,
    productName: name,
    productId,
    bottleSize,
    bottleSizeUnit: bottleUnit,
    sellingPrice: price,
    defaultBatchSize: batchSize,
    description: desc,
    ingredients
  };

  const submitBtn = $('#recipe-form-area')?.querySelector('.btn-primary');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Recipe…';
  }

  try {
    if (state.editRecipeId) {
      await api('PUT', `/api/recipes/${state.editRecipeId}`, payload);
      showToast('Recipe updated ✓ (new version saved)', 'success');
      state.editRecipeId = null;
    } else {
      await api('POST', '/api/recipes', payload);
      showToast('Recipe / BOM saved ✓', 'success');
    }
    await loadData();
    renderRecipes();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = state.editRecipeId ? 'Update Recipe (Creates New Version)' : 'Save Recipe / BOM';
    }
  }
}

function editRecipe(recipeId) {
  const recipe = state.recipes.find(r => r.id === recipeId);
  if (!recipe) { showToast('Recipe not found', 'error'); return; }

  state.editRecipeId = recipeId;
  openRecipeForm();

  // Pre-fill form fields after a short delay (DOM needs to render)
  setTimeout(() => {
    const nameEl = $('#rcp-name');
    const productSel = $('#rcp-product-select');
    const bottleSizeEl = $('#rcp-bottle-size');
    const bottleUnitEl = $('#rcp-bottle-unit');
    const priceEl = $('#rcp-price');
    const batchEl = $('#rcp-default-batch');
    const descEl = $('#rcp-desc');

    if (nameEl) nameEl.value = recipe.name || recipe.productName || '';
    if (productSel && recipe.productId) productSel.value = recipe.productId;
    if (bottleSizeEl) bottleSizeEl.value = recipe.bottleSize || 200;
    if (bottleUnitEl) bottleUnitEl.value = recipe.bottleSizeUnit || 'mL';
    if (priceEl) priceEl.value = recipe.sellingPrice || 0;
    if (batchEl) batchEl.value = recipe.defaultBatchSize || 500;
    if (descEl) descEl.value = recipe.description || '';

    // Clear auto-added empty ingredient row and add existing ones
    const container = $('#ingredient-rows');
    if (container) container.innerHTML = '';
    (recipe.ingredients || []).forEach(ing => addIngredientRow(ing));

    // Update form title
    const formTitle = $('#recipe-form-area')?.querySelector('h3');
    if (formTitle) formTitle.textContent = `✏️ Editing Recipe: ${recipe.name || recipe.productName}`;

    // Update submit button text
    const submitBtn = $('#recipe-form-area')?.querySelector('.btn-primary');
    if (submitBtn) submitBtn.textContent = 'Update Recipe (Creates New Version)';
  }, 50);
}

function closeRecipeForm() {
  state.editRecipeId = null;
  const area = $('#recipe-form-area');
  if (area) area.innerHTML = '';
}

function deleteRecipe(id) {
  const r = state.recipes.find(item => item.id === id);
  const name = r ? r.name : 'Recipe';
  promptDeletion({
    title: 'Delete Recipe',
    itemName: name,
    details: `Recipe ID: <code>${escHtml(id)}</code> · Ingredients: ${(r?.ingredients || []).length} items.`,
    onConfirm: async ({ reason }) => {
      await api('DELETE', `/api/recipes/${id}`, { reason });
      showToast(`Recipe "${name}" deleted ✓`, 'success');
      await loadData();
      renderRecipes();
    }
  });
}

async function openProductionPreview(recipeId) {
  const r = state.recipes.find(rec => rec.id === recipeId);
  const qtyStr = prompt(`Enter desired production for "${r?.name||'Product'}" (e.g. "100 L" or "500 bottles"):`, "100 L");
  if (!qtyStr) return;

  const match = qtyStr.trim().match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  const val  = match ? parseFloat(match[1]) : 100;
  const unit = match && match[2] ? match[2] : 'L';

  try {
    const result = await api('POST', '/api/manufacturing-batches/preview', {
      recipe_id: recipeId, desiredQty: val, desiredUnit: unit
    });

    const modal = $('#preview-modal');
    if (!modal) return;
    const title = modal.querySelector('#preview-modal-title');
    const body  = modal.querySelector('#preview-modal-body');

    if (title) title.textContent = `Pre-Production Preview: ${result.productName}`;
    if (body) {
      const banner = result.canProduce
        ? `<div class="prod-result-banner success">✓ Production Feasible — All raw materials available in stock (Est. Cost: ${formatCurrency(result.estimatedTotalCost)})</div>`
        : `<div class="prod-result-banner error">✗ MANUFACTURING BLOCKED — ${result.shortages.length} material shortfall(s) detected</div>`;

      body.innerHTML = `
        ${banner}
        <div style="font-size:0.8rem;background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:12px;display:flex;justify-content:space-between">
          <div>Desired Input: <strong>${result.desiredQty} ${result.desiredUnit}</strong></div>
          <div>Calculated Output: <strong style="color:#10b981">${result.finishedBottlesCount} Bottles (${result.totalVolumeInL} L)</strong></div>
        </div>

        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);margin-bottom:6px">Raw Material Requirement &amp; Stock Check:</div>
        <div class="preview-breakdown">
          ${result.breakdown.map(b => `
            <div class="preview-ingredient-row ${b.sufficient?'':'insufficient'}">
              <div class="preview-ing-name">
                ${escHtml(b.rawMaterialName)}
                ${b.vendorPreference && b.vendorPreference !== 'DEFAULT_FIFO' ? `<span style="color:var(--accent-secondary);font-size:0.75rem;font-weight:700;margin-left:6px">[Vendor: ${escHtml(b.vendorPreference)}]</span>` : ''}
              </div>
              <div class="preview-ing-need">
                Required: <strong>${b.requiredStockUnitQty} ${escHtml(b.stockUnit)}</strong> | Stock: ${b.availableStock} ${escHtml(b.stockUnit)}
              </div>
              <div class="preview-ing-status ${b.sufficient?'ok':'bad'}">
                ${b.sufficient ? '✓ OK' : `Shortage: -${b.shortage !== undefined ? b.shortage : (b.shortfall || 0)} ${escHtml(b.stockUnit)}`}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    modal.classList.add('open');
  } catch (err) {
    showToast('Preview failed: ' + err.message, 'error');
  }
}

function closeProductionPreview() {
  $('#preview-modal')?.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PAGE: MANUFACTURING BATCH PRODUCTION ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderManufacturing() {
  const el = $('#page-manufacturing');
  if (!el) return;

  const recentBatches = [...state.batches].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30);

  el.innerHTML = `
    <h1 class="page-title">Manufacturing Subsystem</h1>
    <p class="page-subtitle" style="margin-bottom:22px">Execute production runs — automatically calculates bottle counts, deducts raw materials, &amp; logs finished goods</p>

    <div class="inv-two-col">
      <!-- Left: New Batch Form -->
      <div>
        <div class="mfg-form-card">
          <div class="mfg-form-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M2 20h20"/><path d="M5 20V8l5-5 5 5v12"/></svg>
            Start Production Batch
          </div>

          ${state.recipes.length === 0
            ? `<div style="color:var(--accent-warning);font-size:0.85rem">⚠ No recipes found. <a href="javascript:void(0)" onclick="navigateTo('recipes')" style="color:var(--accent-primary-light)">Create a recipe BOM first.</a></div>`
            : `
              <div class="form-grid-2">
                <div class="form-group full-width">
                  <label>Select Manufactured Product / Recipe *</label>
                  <select id="mfg-recipe" onchange="onMfgRecipeSelected(this.value)">
                    <option value="">Select Recipe BOM…</option>
                    ${state.recipes.map(r => `<option value="${r.id}">${escHtml(r.name)} (${r.bottleSize||200} ${r.bottleSizeUnit||'mL'})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Desired Production *</label>
                  <input type="number" id="mfg-qty" value="100" min="0.001" step="any" placeholder="e.g. 100" oninput="mfgPreview()" />
                </div>
                <div class="form-group">
                  <label>Production Unit *</label>
                  <select id="mfg-unit" onchange="mfgPreview()">
                    <option value="bottles" selected>Bottles / Pieces (pcs)</option>
                    <option value="L">Litres (L)</option>
                    <option value="mL">Millilitres (mL)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Operator Name</label>
                  <input type="text" id="mfg-operator" value="${escHtml(state.settings.userName||'Plant Operator')}" placeholder="Operator name" />
                </div>
                <div class="form-group">
                  <label>Batch Number Override</label>
                  <input type="text" id="mfg-batchno" placeholder="Auto-generated if empty" />
                </div>
                <div class="form-group">
                  <label>Manufacturing Start Date</label>
                  <input type="date" id="mfg-start-date" />
                </div>
                <div class="form-group">
                  <label>Manufacturing End Date</label>
                  <input type="date" id="mfg-end-date" />
                </div>
                <div class="form-group full-width">
                  <label>Production Notes</label>
                  <input type="text" id="mfg-notes" placeholder="e.g. Shift A production run" />
                </div>
              </div>
              <div style="display:flex;gap:10px;margin-top:6px">
                <button class="btn btn-secondary" onclick="mfgPreview()">Calculate &amp; Validate Stock →</button>
                <button class="btn btn-primary" id="mfg-commit-btn" onclick="commitBatch()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Manufacture &amp; Deduct Stock
                </button>
              </div>
              <div id="mfg-result-area" style="margin-top:14px"></div>
            `
          }
        </div>

        <!-- Finished Goods Stock -->
        <div class="dashboard-card">
          <div class="dashboard-card-title">Finished Goods Inventory</div>
          ${state.finishedGoods.length === 0
            ? `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.82rem">No finished goods in stock yet</div>`
            : `
            <div class="table-container" style="overflow-x:auto;max-width:100%">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Linked Formula (Recipe)</th>
                    <th>Current Batch Stock</th>
                    <th>Container Sizes &amp; Max Fillable Capacities</th>
                    <th style="min-width:100px">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.finishedGoods.map(fg => {
                    const fgName = fg.name || fg.productName || '';
                    // ── Multi-key product lookup ────────────────────────────────
                    const product = state.products.find(p =>
                      (fg.productId && p.id === fg.productId) ||
                      (fg.recipeId && p.recipeId && p.recipeId === fg.recipeId) ||
                      (p.name && fgName && p.name.toLowerCase() === fgName.toLowerCase()) ||
                      (p.name && fgName && fgName.toLowerCase().includes(p.name.toLowerCase()))
                    );
                    const recipe = state.recipes.find(r => r.id === (fg.recipeId || product?.recipeId));
                    const variants = product && product.variants && product.variants.length > 0 ? product.variants : [];
                    const baseSize = fg.bottleSize || (recipe ? recipe.bottleSize : 1);
                    const baseUnit = fg.bottleSizeUnit || (recipe ? recipe.bottleSizeUnit : 'kg');
                    const fgStock = fg.currentStock !== undefined ? fg.currentStock : (fg.quantity || 0);
                    const totalBulk = fgStock * baseSize;

                    return `
                      <tr>
                        <td>
                          <strong style="color:#fff">${escHtml(fgName || 'Finished Product')}</strong>
                          ${fg.batchNumber ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Lot: <span class="font-mono" style="color:var(--accent-secondary)">${escHtml(fg.batchNumber)}</span></div>` : ''}
                        </td>
                        <td>
                          ${recipe ? `
                            <span class="status-badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:700">
                              ⚡ ${escHtml(recipe.name)}
                            </span>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Recipe Base: ${recipe.bottleSize||1} ${escHtml(recipe.bottleSizeUnit||'kg')}</div>
                          ` : `<span style="font-size:0.75rem;color:var(--text-muted)">Standard Batch</span>`}
                        </td>
                        <td class="font-mono" style="font-weight:700;color:#10b981">
                          ${fgStock} ${escHtml(fg.unit || 'pcs')}
                          <div style="font-size:0.72rem;color:var(--text-secondary)">Total Vol: ${totalBulk} ${escHtml(baseUnit)}</div>
                        </td>
                        <td>
                          ${variants.length > 0 ? `
                            <div style="display:flex;flex-direction:column;gap:3px">
                              ${variants.map(v => {
                                const vSize = v.bottleSize || 1;
                                const vUnit = v.bottleSizeUnit || 'kg';
                                // ── Dimension-aware max fill ───────────────────
                                let maxFill = 0;
                                if (window.unitConv && window.unitConv.maxFeasibleBottles) {
                                  maxFill = window.unitConv.maxFeasibleBottles(totalBulk, baseUnit, vSize, vUnit);
                                } else if (window.unitConv && window.unitConv.areCompatible(vUnit, baseUnit)) {
                                  try {
                                    const convertedVol = window.unitConv.convert(totalBulk, baseUnit, vUnit);
                                    maxFill = Math.floor(convertedVol / vSize);
                                  } catch (e) {
                                    maxFill = Math.floor(totalBulk / vSize);
                                  }
                                } else {
                                  maxFill = Math.floor(totalBulk / vSize);
                                }

                                return `
                                  <div style="font-size:0.73rem;background:var(--bg-input);padding:3px 8px;border-radius:4px;display:flex;justify-content:space-between;gap:8px">
                                    <span><strong style="color:#fff">${escHtml(v.bottleSize ? `${v.bottleSize} ${v.bottleSizeUnit||'kg'}` : v.name)}</strong></span>
                                    <span style="color:#10b981;font-weight:700">Max ${maxFill} fillable</span>
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          ` : `
                            <span style="font-size:0.75rem;color:var(--text-muted)">Standard Bottle Size (${baseSize} ${baseUnit})</span>
                          `}
                        </td>
                        <td>
                          ${product ? `<button class="btn btn-secondary btn-sm" style="margin-bottom:4px" onclick="openFillBottlesModal('${product.id}')">🍾 Package Bottles</button><br>` : ''}
                          <button class="btn btn-danger btn-sm" onclick="deleteFinishedGood('${fg.id}', '${escHtml(fgName)}')">Remove</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Right: Manufacturing History Feed -->
      <div>
        <div class="dashboard-card" style="overflow:hidden">
          <div class="dashboard-card-title">
            <span>Manufacturing History</span>
            <span style="font-size:0.72rem;color:var(--text-muted)">${state.batches.length} Total</span>
          </div>
          ${recentBatches.length === 0
            ? `<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:0.82rem">No batches logged yet</div>`
            : recentBatches.map(b => {
                const batchId = b.id || b.mfgId || b.batchNumber;
                const batchNumber = b.batchNumber || b.mfgId || b.id || 'N/A';
                const pName = b.productName || b.recipeName || 'Batch';
                const qtyProduced = b.quantityProduced !== undefined ? b.quantityProduced : (b.actualQty !== undefined ? b.actualQty : (b.plannedQty || 0));
                const bDate = b.date || b.completedDate || b.startDate || '';
                const operator = b.operatorName || b.operator || 'System';
                const status = b.status || 'COMPLETED';

                return `
              <div style="padding:12px 0;border-bottom:1px solid var(--border-subtle)">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:4px">
                  <strong style="color:#fff;font-size:0.83rem">${escHtml(pName)}</strong>
                  <span class="batch-badge completed">${escHtml(status)}</span>
                </div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px">
                  Batch: <span class="font-mono" style="color:var(--accent-secondary)">${escHtml(batchNumber)}</span> · ${qtyProduced} Bottles (${b.totalVolumeInL||0} L)
                </div>
                <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:6px">
                  <span style="font-size:0.72rem;color:var(--text-muted);word-break:break-all">${escHtml(bDate)} by ${escHtml(operator)}</span>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    <button class="btn btn-ghost btn-sm" onclick="openTraceBatchModal('${escHtml(batchId)}')" style="color:var(--accent-secondary)" title="Trace Batch Lineage">Trace</button>
                    <button class="btn btn-ghost btn-sm" onclick="printBatchReport('${escHtml(batchId)}')" title="Print Batch Report">Print PDF</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBatch('${escHtml(batchId)}')" title="Delete Manufacturing Batch">Delete</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function onMfgRecipeSelected(recipeId) {
  if (!recipeId) return;
  const recipe = state.recipes.find(r => r.id === recipeId);
  if (!recipe) return;

  const qtyInput = $('#mfg-qty');
  const unitSelect = $('#mfg-unit');
  if (qtyInput && (!qtyInput.value || qtyInput.value === '100')) {
    qtyInput.value = recipe.defaultBatchSize || 100;
  }
  if (unitSelect) {
    unitSelect.value = 'bottles';
  }
  mfgPreview();
}

async function mfgPreview() {
  const recipeId = $('#mfg-recipe')?.value;
  const qty      = parseFloat($('#mfg-qty')?.value);
  const unit     = $('#mfg-unit')?.value;

  if (!recipeId) { showToast('Select a recipe BOM first', 'error'); return; }
  if (!qty || qty <= 0) { showToast('Enter a valid desired production quantity', 'error'); return; }

  try {
    const result = await api('POST', '/api/manufacturing-batches/preview', {
      recipe_id: recipeId, desiredQty: qty, desiredUnit: unit
    });

    const area = $('#mfg-result-area');
    if (!area) return;

    if (result.canProduce) {
      area.innerHTML = `
        <div class="prod-result-banner success">
          ✓ Production Validated — All materials available in stock (Estimated Cost: ${formatCurrency(result.estimatedTotalCost)})
        </div>
        <div style="font-size:0.8rem;background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:10px">
          Desired Input: <strong>${result.desiredQty} ${result.desiredUnit}</strong> → Output: <strong style="color:#10b981">${result.finishedBottlesCount} Bottles (${result.totalVolumeInL} L)</strong>
        </div>
      `;
    } else {
      area.innerHTML = `
        <div class="prod-result-banner error" style="margin-bottom:12px">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:6px">
            ⚠ Raw Material Shortage Detected (${result.shortages.length} item)
          </div>
          <div style="font-size:0.8rem;opacity:0.95;margin-bottom:10px">
            Your inventory is missing raw materials needed for this production run. Please navigate to the Raw Materials tab and increase your stock via Vendor Purchases.
          </div>
        </div>

        <div style="font-size:0.78rem;font-weight:700;color:var(--accent-danger);margin-bottom:6px">Shortage Breakdown:</div>
        <div class="preview-breakdown">
          ${result.shortages.map(s => `
            <div class="preview-ingredient-row insufficient">
              <div class="preview-ing-name">
                ${escHtml(s.rawMaterialName)}
                ${s.vendorPreference && s.vendorPreference !== 'DEFAULT_FIFO' ? `<span style="color:var(--accent-secondary);font-size:0.75rem;font-weight:700;margin-left:6px">[Vendor: ${escHtml(s.vendorPreference)}]</span>` : ''}
              </div>
              <div class="preview-ing-need">Required: ${s.requiredQty} ${s.unit} | Available: ${s.availableQty} ${s.unit}</div>
              <div class="preview-ing-status bad">Shortage: -${s.shortageQty} ${s.unit}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (err) {
    showToast('Validation failed: ' + err.message, 'error');
  }
}


async function commitBatch() {
  const recipeId = $('#mfg-recipe')?.value;
  const qty      = parseFloat($('#mfg-qty')?.value);
  const unit     = $('#mfg-unit')?.value;
  const operator = $('#mfg-operator')?.value.trim();
  const batchno  = $('#mfg-batchno')?.value.trim();
  const notes    = $('#mfg-notes')?.value.trim();
  const startDate = $('#mfg-start-date')?.value || '';
  const endDate   = $('#mfg-end-date')?.value || '';

  if (!recipeId) { showToast('Select a recipe BOM first', 'error'); return; }
  if (!qty || qty <= 0) { showToast('Enter a valid production quantity', 'error'); return; }

  const btn = $('#mfg-commit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Executing Manufacturing…'; }

  try {
    const result = await api('POST', '/api/manufacturing-batches/commit', {
      recipe_id: recipeId,
      desiredQty: qty,
      desiredUnit: unit,
      operatorName: operator,
      batchNumber: batchno,
      notes,
      manufacturingStartDate: startDate || undefined,
      manufacturingEndDate: endDate || undefined
    });

    showToast(`Batch Committed Successfully ✓ — ${result.batch.quantityProduced} Bottles of ${result.batch.productName}`, 'success');
    await loadData();
    renderManufacturing();
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Manufacture & Deduct Stock'; }
    // Render shortage breakdown if stock error
    if (err.message.includes('shortage') || err.message.includes('Shortage') || err.message.includes('stock') || err.message.includes('BLOCKED')) {
      mfgPreview();
      showToast('⚠️ Production Blocked: Raw material shortages detected. See details below.', 'warning');
      $('#mfg-result-area')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      showToast(err.message, 'error');
    }
  }
}

function printBatchReport(batchId) {
  const batch = state.batches.find(b => b.id === batchId || b.mfgId === batchId);
  if (!batch) { showToast('Batch not found', 'error'); return; }
  if (window.printManufacturingBatch) {
    window.printManufacturingBatch(batch, state.settings);
  } else {
    showToast('Print module not initialized', 'error');
  }
}

function deleteBatch(batchId) {
  const b = (state.manufacturingBatches || []).find(item => item.id === batchId || item.mfgId === batchId);
  const name = b ? (b.mfgId || b.id || b.recipeName) : batchId;
  promptDeletion({
    title: 'Delete Manufacturing Batch',
    itemName: `Batch ${name}`,
    details: `Recipe: ${b?.recipeName || '-'} · Output: ${b?.outputQuantity || b?.manufacturedQuantity || 0} ${b?.outputUnit || 'L'}.`,
    onConfirm: async ({ reason }) => {
      await api('DELETE', `/api/manufacturing-batches/${batchId}`, { reason });
      showToast(`Manufacturing batch "${name}" deleted ✓`, 'success');
      await loadData();
      renderManufacturing();
    }
  });
}

function deleteFinishedGood(id, name) {
  const fg = (state.finishedGoods || []).find(item => item.id === id);
  const fgName = fg ? (fg.productName || fg.name) : (name || 'Finished Good');
  promptDeletion({
    title: 'Delete Finished Good Item',
    itemName: fgName,
    details: `Item ID: <code>${escHtml(id)}</code> · Available Quantity: <strong>${fg?.quantity || 0} ${escHtml(fg?.unit || 'pcs')}</strong>.`,
    onConfirm: async ({ reason }) => {
      await api('DELETE', `/api/finished-goods/${id}`, { reason });
      showToast(`Finished good item "${fgName}" deleted ✓`, 'success');
      await loadData();
      renderManufacturing();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PAGE: AUDIT LEDGERS & HISTORY ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// ─── PAGE: UNIFIED AUDIT LEDGER & TRACEABILITY ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
state.auditFilters = state.auditFilters || { search: '', startDate: '', endDate: '', product: '', batch: '' };

function renderInventoryHistory() {
  const el = $('#page-inventory-history');
  if (!el) return;

  const currentTab = state.ledgerTab || 'all';
  const filters = state.auditFilters || { search: '', startDate: '', endDate: '', product: '', batch: '' };

  const sQuery = (filters.search || '').toLowerCase();
  const sStart = filters.startDate || '';
  const sEnd   = filters.endDate || '';
  const sProd  = (filters.product || '').toLowerCase();
  const sBatch = (filters.batch || '').toLowerCase();

  const matchDate = (d) => {
    const dateStr = String(d || '').split('T')[0];
    if (sStart && dateStr < sStart) return false;
    if (sEnd && dateStr > sEnd) return false;
    return true;
  };

  // 1. Raw Material Records
  const rmRows = (state.rawMaterialTxns || []).map(t => ({
    timestamp: t.createdAt || `${t.date} ${t.time || ''}`,
    date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : ''),
    category: 'RAW MATERIAL',
    categoryKey: 'rm',
    action: t.action || (t.type === 'IN' ? 'Purchase Inward' : 'Deduction'),
    type: t.type || (t.action === 'Manufacturing Deduction' ? 'OUT' : 'IN'),
    correlationId: t.auditCorrelationId || '-',
    refId: t.referenceId || t.supplierBatchNumber || t.rawMaterialBatchId || '-',
    itemName: t.rawMaterialName || t.raw_material_name || 'Raw Material',
    batchNo: t.supplierBatchNumber || t.rawMaterialBatchId || '-',
    rawMaterialId: t.rawMaterialId,
    vendorName: t.vendorName || '-',
    vendorGstNumber: t.vendorGstNumber || '',
    vendorPrice: t.vendorPrice || 0,
    purchaseDate: t.purchaseDate || t.date || '-',
    qty: t.quantity || 0,
    unit: t.unit || '',
    remainingStock: t.remainingStock !== undefined ? t.remainingStock : '-',
    user: t.vendorName ? `Vendor: ${t.vendorName}` : 'System',
    notes: t.notes || ''
  }));

  // 2. Manufacturing & Inventory Audit Records
  const mfgRows = (state.manufacturingAudit || []).filter(a => a.eventType !== 'DATA_DELETION' && a.category !== 'DELETIONS').map(a => {
    let cat = 'MANUFACTURING';
    let catKey = 'mfg';
    let act = a.transactionType || a.action || 'Batch Commit';
    let typ = 'OUT';
    let itmName = `${a.recipeName || 'Recipe'} (consumed ${a.rawMaterialName || 'RM'})`;
    let qtyVal = a.rawMaterialQuantityConsumed || a.quantityConsumed || a.quantity || a.reversedUnits || 0;
    let unitVal = a.rawMaterialUnit || a.unit || '';
    let refIdVal = a.manufacturingBatchId || a.batchNumber || a.reversalOfTransactionId || a.entityId || '-';

    if (a.eventType === 'TRANSACTION_REVERSAL') {
      cat = 'REVERSALS';
      catKey = 'mfg';
      act = 'Packaging Reversal';
      typ = 'IN';
      itmName = `Reversal: ${a.entityName || a.productName || 'Variation'}`;
      qtyVal = a.reversedUnits || a.quantity || 0;
      refIdVal = a.reversalOfTransactionId || a.entityId || '-';
    } else if (a.eventType === 'INVENTORY_IN') {
      cat = 'INVENTORY';
      catKey = 'rm';
      act = 'Packaging Restored';
      typ = 'IN';
      itmName = a.entityName || 'Packaging RM';
      qtyVal = a.quantity || 0;
    } else if (a.eventType === 'INVENTORY_OUT') {
      cat = 'INVENTORY';
      catKey = 'rm';
      act = 'Packaging Deduction';
      typ = 'OUT';
      itmName = `${a.entityName || 'Packaging'} for ${a.productName || 'Product'}`;
      qtyVal = a.quantity || 0;
    } else if (a.eventType === 'INVENTORY_ADJUSTMENT') {
      cat = 'ADJUSTMENT';
      catKey = 'fg';
      act = 'Discard Write-off';
      typ = 'OUT';
      itmName = `Discarded: ${a.entityName || 'Finished Variation'}`;
      qtyVal = a.discardedStock || a.quantity || 0;
      unitVal = 'pcs';
    } else if (a.eventType === 'DEPENDENCY_BLOCK') {
      cat = 'SECURITY';
      catKey = 'rm';
      act = 'Deletion Blocked';
      typ = 'OUT';
      itmName = `Blocked: ${a.entityName || 'Raw Material'}`;
      qtyVal = 0;
    } else if (a.eventType === 'DATA_CREATE' || a.eventType === 'DATA_UPDATE') {
      cat = 'MASTER DATA';
      catKey = 'mfg';
      act = a.eventType === 'DATA_CREATE' ? 'Variation Created' : 'Variation Updated';
      typ = 'IN';
      itmName = a.entityName || 'Variation';
      qtyVal = 0;
    }

    return {
      timestamp: a.timestamp || a.createdAt || `${a.date || ''} 00:00:00`,
      date: a.date || (a.timestamp ? a.timestamp.split('T')[0] : ''),
      category: cat,
      categoryKey: catKey,
      action: act,
      type: typ,
      correlationId: a.auditCorrelationId || a.auditId || '-',
      refId: refIdVal,
      mfgBatchId: a.manufacturingBatchId || a.batchNumber || refIdVal,
      recipeId: a.recipeId || '-',
      recipeVersion: a.recipeVersion || 1,
      recipeName: a.recipeName || 'Recipe',
      itemName: itmName,
      rawMaterialName: a.rawMaterialName || a.entityName || 'Raw Material',
      rawMaterialBatchId: a.rawMaterialBatchId || '-',
      productName: a.productName || 'Product',
      batchNo: a.rawMaterialBatchId || a.batchNumber || refIdVal,
      fgBatchId: a.finishedGoodsBatchId || '-',
      mfgQty: a.manufacturedQuantity || 0,
      mfgUnit: a.manufacturedUnit || 'pcs',
      qty: qtyVal,
      unit: unitVal,
      remainingStock: a.rawMaterialStockAfter !== undefined ? a.rawMaterialStockAfter : '-',
      user: a.operatorName || 'Operator',
      notes: a.notes || `Event: ${a.eventType || act}`
    };
  });

  // 3. Finished Goods Records
  const fgRows = (state.finishedGoodsTxns || []).map(t => ({
    timestamp: t.createdAt || `${t.date} ${t.time || ''}`,
    date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : ''),
    category: 'FINISHED GOODS',
    categoryKey: 'fg',
    action: t.action || (t.type === 'IN' ? 'Production Output' : 'Inventory Deduction'),
    type: t.type || 'IN',
    correlationId: t.auditCorrelationId || '-',
    refId: t.referenceId || t.manufacturingBatchId || '-',
    itemName: t.productName || 'Finished Good',
    batchNo: t.finishedGoodsBatchId || '-',
    mfgBatchId: t.manufacturingBatchId || '-',
    qty: t.quantity || 0,
    unit: t.unit || 'pcs',
    remainingStock: t.remainingStock !== undefined ? t.remainingStock : '-',
    user: 'System',
    notes: t.notes || ''
  }));

  // 4. Sales Records & Invoices
  const invoiceFgTxns = (state.finishedGoodsTxns || []).filter(t => (t.action || '').toLowerCase().includes('invoice'));
  const invoiceRmTxns = (state.rawMaterialTxns || []).filter(t => (t.action || '').toLowerCase().includes('invoice'));
  const invoiceListRows = (state.invoices || []).map(inv => {
    const custName = inv.customerName || (inv.customer && inv.customer.name) || 'Walk-in Customer';
    const itemsList = (inv.items || []).map(it => `${it.quantity || it.qty || 1}x ${it.name || it.productName || 'Item'}`).join(', ');
    const totalBottles = (inv.items || []).reduce((s, it) => s + (parseFloat(it.quantity || it.qty) || 0), 0);
    const statusUpper = String(inv.status || 'draft').toUpperCase();
    return {
      timestamp: inv.updatedAt || inv.createdAt || `${inv.date} 00:00:00`,
      date: inv.date || (inv.createdAt ? inv.createdAt.split('T')[0] : ''),
      category: 'SALES',
      categoryKey: 'sales',
      action: `Invoice (${statusUpper})`,
      type: statusUpper === 'CANCELLED' ? 'IN' : 'OUT',
      correlationId: inv.auditCorrelationId || '-',
      refId: inv.invoiceNumber || inv.id,
      itemName: itemsList || 'Sales Invoice',
      batchNo: inv.id,
      qty: totalBottles,
      unit: 'bottles',
      remainingStock: '-',
      user: custName,
      status: statusUpper,
      notes: `Invoice ${inv.invoiceNumber || inv.id} · Status: ${statusUpper} · Grand Total: ₹${formatCurrency(inv.grandTotal || 0)} · Customer: ${custName}`
    };
  });

  const salesRows = [
    ...invoiceListRows,
    ...invoiceFgTxns.map(t => ({
      timestamp: t.createdAt || `${t.date} ${t.time || ''}`,
      date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : ''),
      category: 'SALES',
      categoryKey: 'sales',
      action: t.action || 'Sales Invoice',
      type: t.type || 'OUT',
      correlationId: t.auditCorrelationId || '-',
      refId: t.referenceId || '-',
      itemName: t.productName || 'Product',
      batchNo: t.finishedGoodsBatchId || '-',
      qty: t.quantity || 0,
      unit: t.unit || 'pcs',
      remainingStock: t.remainingStock !== undefined ? t.remainingStock : '-',
      user: t.user || 'Sales Invoice',
      status: t.status || (t.action && t.action.includes(':') ? t.action.split(':')[1].trim() : 'RECORDED'),
      notes: t.notes || ''
    })),
    ...invoiceRmTxns.map(t => ({
      timestamp: t.createdAt || `${t.date} ${t.time || ''}`,
      date: t.date || (t.createdAt ? t.createdAt.split('T')[0] : ''),
      category: 'SALES',
      categoryKey: 'sales',
      action: t.action || 'Formula RM Deduction',
      type: 'OUT',
      correlationId: t.auditCorrelationId || '-',
      refId: t.referenceId || '-',
      itemName: t.rawMaterialName || 'Formula Material',
      batchNo: t.rawMaterialBatchId || '-',
      qty: t.quantity || 0,
      unit: t.unit || '',
      remainingStock: t.remainingStock !== undefined ? t.remainingStock : '-',
      user: 'Sales Invoice',
      status: 'DEDUCTED',
      notes: t.notes || ''
    }))
  ];

  // 5. Deletion Audit Memory Records
  const deletionRows = (state.manufacturingAudit || []).filter(a => a.eventType === 'DATA_DELETION' || a.category === 'DELETIONS').map(a => {
    let delQty = a.deductedQty || a.finishedStockRemoved || 0;
    let delUnit = a.unit || (a.entityType === 'PRODUCT_VARIATION' ? 'pcs' : '');
    let itemTitle = a.itemName || `${(a.entityType || 'RECORD').toUpperCase()}: ${a.entityName || '-'}`;
    if (a.entityType === 'PRODUCT_VARIATION') {
      itemTitle = `VARIATION: ${a.entityName || 'Product Variation'}${a.productName ? ` (Product: ${a.productName})` : ''}`;
    }

    let notesText = a.notes || `Reason: "${a.deletionReason || a.reason || ''}" · Deleted on ${a.date} at ${a.time}`;
    if (a.stockReversedToRM > 0) {
      notesText += ` · Reversed: ${a.stockReversedToRM} units (${a.packagingQuantityRestored || a.stockReversedToRM} containers returned to RM)`;
    }

    return {
      timestamp: a.timestamp || `${a.date || ''} ${a.time || ''}`,
      date: a.date || (a.timestamp ? a.timestamp.split('T')[0] : ''),
      time: a.time || (a.timestamp && a.timestamp.includes('T') ? a.timestamp.split('T')[1].split('.')[0] : ''),
      category: 'DELETIONS',
      categoryKey: 'deletions',
      action: a.transactionType || a.actionTaken ? `DELETION (${a.actionTaken || 'REMOVED'})` : 'RECORD_DELETION',
      type: 'OUT',
      correlationId: a.auditCorrelationId || a.auditId || '-',
      refId: a.entityId || '-',
      itemName: itemTitle,
      entityType: a.entityType || 'record',
      entityName: a.entityName || '',
      batchNo: a.entityId || '-',
      deletionReason: a.deletionReason || a.reason || 'No reason specified',
      deductedQty: delQty,
      deductedVal: a.deductedVal || 0,
      unit: delUnit,
      qty: delQty,
      remainingStock: '-',
      user: a.operatorName || 'User',
      notes: notesText
    };
  });

  // 6. Combined Timeline (All)
  const allRows = [...rmRows, ...mfgRows, ...fgRows, ...salesRows, ...deletionRows].sort(
    (a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
  );

  // Filter application helper
  const filterList = (items) => {
    return items.filter(r => {
      if (!matchDate(r.date || r.timestamp)) return false;
      if (sBatch && !(String(r.batchNo).toLowerCase().includes(sBatch) || String(r.refId).toLowerCase().includes(sBatch))) return false;
      if (sProd && !String(r.itemName).toLowerCase().includes(sProd)) return false;
      if (sQuery) {
        const joined = `${r.correlationId} ${r.itemName} ${r.batchNo} ${r.refId} ${r.action} ${r.user} ${r.notes} ${r.deletionReason || ''}`.toLowerCase();
        if (!joined.includes(sQuery)) return false;
      }
      return true;
    });
  };

  const filteredAll = filterList(allRows);
  const filteredRm = filterList(rmRows);
  const filteredMfg = filterList(mfgRows);
  const filteredFg = filterList(fgRows);
  const filteredSales = filterList(salesRows);
  const filteredDeletions = filterList(deletionRows);

  let activeRows = filteredAll;
  if (currentTab === 'rm') activeRows = filteredRm;
  else if (currentTab === 'mfg') activeRows = filteredMfg;
  else if (currentTab === 'fg') activeRows = filteredFg;
  else if (currentTab === 'sales') activeRows = filteredSales;
  else if (currentTab === 'deletions') activeRows = filteredDeletions;

  // Build unique product/item list for dropdown
  const productOptions = Array.from(new Set([
    ...(state.products || []).map(p => p.name),
    ...(state.rawMaterials || []).map(r => r.name)
  ])).filter(Boolean);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Audit Ledger</h1>
        <p class="page-subtitle">Unified immutable event ledger across Raw Materials, Manufacturing Runs, Finished Goods, and Sales</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="downloadAuditLedgerExcel()" style="display:inline-flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          📊 Download Audit Ledger Excel
        </button>
        <button class="btn btn-primary" onclick="downloadAuditLedgerPDF()" style="display:inline-flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          📄 Download Audit Ledger PDF
        </button>
        <button class="btn btn-danger btn-sm" onclick="clearAuditLedgers()" style="font-size:0.8rem">
          Clear History
        </button>
      </div>
    </div>

    <!-- Category Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn ${currentTab==='all'?'btn-primary':'btn-ghost'}" onclick="setLedgerTab('all')">
        All (${allRows.length})
      </button>
      <button class="btn ${currentTab==='rm'?'btn-primary':'btn-ghost'}" onclick="setLedgerTab('rm')">
        Raw Material (${rmRows.length})
      </button>
      <button class="btn ${currentTab==='mfg'?'btn-primary':'btn-ghost'}" onclick="setLedgerTab('mfg')">
        Manufacturing (${mfgRows.length})
      </button>
      <button class="btn ${currentTab==='fg'?'btn-primary':'btn-ghost'}" onclick="setLedgerTab('fg')">
        Finished Goods (${fgRows.length})
      </button>
      <button class="btn ${currentTab==='sales'?'btn-primary':'btn-ghost'}" onclick="setLedgerTab('sales')">
        Sales (${salesRows.length})
      </button>
      <button class="btn ${currentTab==='deletions'?'btn-primary':'btn-ghost'}" onclick="setLedgerTab('deletions')" style="${currentTab==='deletions'?'background:#ef4444;border-color:#ef4444;color:#fff':'color:#f87171'}">
        🗑️ Deletions (${deletionRows.length})
      </button>
    </div>

    <!-- Table Container with Controlled Scroll Wrap & Sticky Toolbar -->
    <div class="table-container">
      <div class="audit-sticky-toolbar">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="search-input-wrap" style="min-width:260px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="audit-filter-search" value="${escHtml(filters.search)}" placeholder="Search by Correlation ID, batch, item, vendor, notes…" oninput="updateAuditFilters()" />
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:130px">
            <label style="font-size:0.72rem">Start Date</label>
            <input type="date" id="audit-filter-start" value="${filters.startDate}" onchange="updateAuditFilters()" style="padding:6px 10px;font-size:0.82rem" />
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:130px">
            <label style="font-size:0.72rem">End Date</label>
            <input type="date" id="audit-filter-end" value="${filters.endDate}" onchange="updateAuditFilters()" style="padding:6px 10px;font-size:0.82rem" />
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:150px">
            <label style="font-size:0.72rem">Product / Item</label>
            <select id="audit-filter-product" onchange="updateAuditFilters()" style="padding:6px 10px;font-size:0.82rem">
              <option value="">All Items ▼</option>
              ${productOptions.map(p => `<option value="${escHtml(p)}" ${filters.product.toLowerCase() === p.toLowerCase() ? 'selected':''}>${escHtml(p)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;min-width:130px">
            <label style="font-size:0.72rem">Batch / Lot #</label>
            <input type="text" id="audit-filter-batch" value="${escHtml(filters.batch)}" placeholder="Batch ID…" oninput="updateAuditFilters()" style="padding:6px 10px;font-size:0.82rem" />
          </div>
          <button class="btn btn-ghost btn-sm" onclick="resetAuditFilters()" style="padding:8px 12px">Reset Filters</button>
        </div>
      </div>

      <!-- Controlled Table Scrolling -->
      <div class="audit-table-scroll-wrap">
        ${activeRows.length === 0 ? `
          <div style="text-align:center;padding:50px 20px;color:var(--text-muted);font-size:0.88rem">
            No audit records match the current filters.
          </div>
        ` : `
          <table class="data-table">
            <thead>
              ${currentTab === 'all' ? `
                <tr>
                  <th>Timestamp</th>
                  <th>Category</th>
                  <th>Audit Correlation ID</th>
                  <th>Reference / Batch</th>
                  <th>Item / Material</th>
                  <th>Lot / Batch #</th>
                  <th>Quantity Movement</th>
                  <th>Remaining Stock</th>
                  <th>User / Party</th>
                  <th>Notes</th>
                </tr>
              ` : (currentTab === 'rm' ? `
                <tr>
                  <th>Timestamp</th>
                  <th>Audit Correlation ID</th>
                  <th>Action / Type</th>
                  <th>Raw Material</th>
                  <th>Vendor / Supplier</th>
                  <th>Lot / Supplier Batch</th>
                  <th>Quantity</th>
                  <th>Remaining Stock</th>
                  <th>Purchase Date</th>
                  <th>Notes</th>
                </tr>
              ` : (currentTab === 'mfg' ? `
                <tr>
                  <th>Timestamp</th>
                  <th>Audit Correlation ID</th>
                  <th>Manufacturing Batch ID</th>
                  <th>Recipe &amp; Version</th>
                  <th>Raw Material Consumed</th>
                  <th>RM Batch Lot</th>
                  <th>Product Output</th>
                  <th>FG Batch Lot</th>
                  <th>Produced Qty</th>
                  <th>Operator</th>
                </tr>
              ` : (currentTab === 'fg' ? `
                <tr>
                  <th>Timestamp</th>
                  <th>Audit Correlation ID</th>
                  <th>Action</th>
                  <th>Finished Good Item</th>
                  <th>FG Batch ID</th>
                  <th>MFG Batch ID</th>
                  <th>Quantity</th>
                  <th>Remaining Stock</th>
                  <th>Reference ID</th>
                  <th>Notes</th>
                </tr>
              ` : (currentTab === 'sales' ? `
                <tr>
                  <th>Timestamp</th>
                  <th>Invoice Ref #</th>
                  <th>Audit Correlation ID</th>
                  <th>Item / SKU</th>
                  <th>Action</th>
                  <th>Deduction (- OUT)</th>
                  <th>Remaining Stock</th>
                  <th>FG Batch ID</th>
                  <th>Notes</th>
                </tr>
              ` : `
                <tr>
                  <th>Date &amp; Exact Time</th>
                  <th>Audit Correlation ID</th>
                  <th>Deleted Item / Entity</th>
                  <th>Entity Type</th>
                  <th>Deducted Stock / Value</th>
                  <th>Mandatory Deletion Reason</th>
                  <th>Deleted By</th>
                </tr>
              `))))}
            </thead>
            <tbody>
              ${activeRows.map(r => {
                const corrBadge = r.correlationId && r.correlationId !== '-' ? `
                  <button class="correlation-chip" onclick="filterAuditByCorrelation('${escHtml(r.correlationId)}')" title="Filter by this correlation lineage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    ${escHtml(r.correlationId)}
                  </button>
                ` : `<span style="color:var(--text-muted);font-size:0.75rem">-</span>`;

                const typeBadge = r.type === 'IN' 
                  ? `<span class="font-mono" style="color:#10b981;font-weight:700">+ ${r.qty} ${escHtml(r.unit||'')}</span>`
                  : `<span class="font-mono" style="color:#f87171;font-weight:700">- ${r.qty} ${escHtml(r.unit||'')}</span>`;

                if (currentTab === 'all') {
                  const catColor = r.categoryKey === 'rm' ? '#06b6d4' : (r.categoryKey === 'mfg' ? '#a855f7' : (r.categoryKey === 'fg' ? '#10b981' : (r.categoryKey === 'deletions' ? '#ef4444' : '#f59e0b')));
                  const isDel = r.categoryKey === 'deletions';
                  return `
                    <tr style="${isDel ? 'background:rgba(239,68,68,0.04)' : ''}">
                      <td style="font-size:0.75rem">${escHtml(r.timestamp)}</td>
                      <td><span class="status-badge" style="background:color-mix(in srgb, ${catColor} 15%, transparent);color:${catColor};border:1px solid color-mix(in srgb, ${catColor} 30%, transparent)">${escHtml(r.category)}</span></td>
                      <td>${corrBadge}</td>
                      <td class="font-mono" style="font-size:0.78rem;color:var(--accent-secondary)">${escHtml(r.refId)}</td>
                      <td><strong style="color:${isDel ? '#f87171' : '#fff'}">${escHtml(r.itemName)}</strong></td>
                      <td class="font-mono" style="font-size:0.75rem">${escHtml(r.batchNo)}</td>
                      <td>${typeBadge}</td>
                      <td class="font-mono" style="color:var(--accent-secondary)">${escHtml(r.remainingStock)}</td>
                      <td style="font-size:0.78rem">${escHtml(r.user)}</td>
                      <td style="font-size:0.75rem;color:${isDel ? '#fca5a5' : 'var(--text-secondary)'};max-width:200px;overflow:hidden;text-overflow:ellipsis">${escHtml(r.notes)}</td>
                    </tr>
                  `;
                } else if (currentTab === 'rm') {
                  return `
                    <tr>
                      <td style="font-size:0.75rem">${escHtml(r.timestamp)}</td>
                      <td>${corrBadge}</td>
                      <td><span class="stock-tag ${r.type==='IN'?'ok':'critical'}">${escHtml(r.action)}</span></td>
                      <td><strong style="color:#fff">${escHtml(r.itemName)}</strong></td>
                      <td>${escHtml(r.vendorName)}</td>
                      <td class="font-mono" style="font-size:0.78rem;color:var(--accent-secondary)">${escHtml(r.batchNo)}</td>
                      <td>${typeBadge}</td>
                      <td class="font-mono">${escHtml(r.remainingStock)}</td>
                      <td style="font-size:0.75rem">${escHtml(r.purchaseDate)}</td>
                      <td style="font-size:0.75rem;color:var(--text-secondary)">${escHtml(r.notes)}</td>
                    </tr>
                  `;
                } else if (currentTab === 'mfg') {
                  return `
                    <tr>
                      <td style="font-size:0.75rem">${escHtml(r.timestamp)}</td>
                      <td>${corrBadge}</td>
                      <td class="font-mono" style="color:var(--accent-secondary);font-weight:700">${escHtml(r.mfgBatchId)}</td>
                      <td><strong style="color:#fff">${escHtml(r.recipeName)}</strong> <span style="font-size:0.72rem;color:var(--text-muted)">v${r.recipeVersion}</span></td>
                      <td style="color:#f87171">${escHtml(r.rawMaterialName)} (-${r.qty} ${escHtml(r.unit)})</td>
                      <td class="font-mono" style="font-size:0.75rem">${escHtml(r.rawMaterialBatchId)}</td>
                      <td style="color:#10b981;font-weight:600">${escHtml(r.productName)}</td>
                      <td class="font-mono" style="font-size:0.75rem">${escHtml(r.fgBatchId)}</td>
                      <td class="font-mono" style="color:#10b981">+${r.mfgQty} ${escHtml(r.mfgUnit)}</td>
                      <td style="font-size:0.78rem">${escHtml(r.user)}</td>
                    </tr>
                  `;
                } else if (currentTab === 'fg') {
                  return `
                    <tr>
                      <td style="font-size:0.75rem">${escHtml(r.timestamp)}</td>
                      <td>${corrBadge}</td>
                      <td><span class="stock-tag ${r.type==='IN'?'ok':'critical'}">${escHtml(r.action)}</span></td>
                      <td><strong style="color:#fff">${escHtml(r.itemName)}</strong></td>
                      <td class="font-mono" style="font-size:0.78rem;color:var(--accent-secondary)">${escHtml(r.batchNo)}</td>
                      <td class="font-mono" style="font-size:0.78rem">${escHtml(r.mfgBatchId)}</td>
                      <td>${typeBadge}</td>
                      <td class="font-mono">${escHtml(r.remainingStock)}</td>
                      <td class="font-mono" style="font-size:0.75rem">${escHtml(r.refId)}</td>
                      <td style="font-size:0.75rem;color:var(--text-secondary)">${escHtml(r.notes)}</td>
                    </tr>
                  `;
                } else if (currentTab === 'deletions') {
                  const valText = r.deductedVal > 0 ? ` (${formatCurrency(r.deductedVal)})` : '';
                  const qtyText = r.deductedQty > 0 ? `-${r.deductedQty} ${escHtml(r.unit)}${valText}` : '-';
                  return `
                    <tr style="background:rgba(239,68,68,0.03)">
                      <td style="font-size:0.75rem;white-space:nowrap">
                        <strong>${escHtml(r.date)}</strong>
                        <div style="color:var(--text-muted);font-size:0.7rem">${escHtml(r.time || '')}</div>
                      </td>
                      <td>${corrBadge}</td>
                      <td><strong style="color:#f87171">${escHtml(r.itemName)}</strong></td>
                      <td><span class="badge" style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);text-transform:uppercase;font-size:0.7rem">${escHtml(r.entityType)}</span></td>
                      <td class="font-mono" style="color:#f87171;font-weight:600">${qtyText}</td>
                      <td style="color:#fff;font-size:0.82rem;background:rgba(239,68,68,0.06);padding:8px 12px;border-radius:4px;border-left:3px solid #ef4444">
                        "${escHtml(r.deletionReason)}"
                      </td>
                      <td style="font-size:0.78rem">${escHtml(r.user)}</td>
                    </tr>
                  `;
                } else {
                  const statusUpper = String(r.status || (r.action && r.action.includes(':') ? r.action.split(':')[1].trim() : (r.action && r.action.includes('(') ? r.action.split('(')[1].replace(')', '').trim() : ''))).toUpperCase();
                  const isOk = ['PAID', 'OK', 'COMPLETED'].includes(statusUpper);
                  const isPending = ['PENDING', 'SENT', 'DRAFT'].includes(statusUpper);
                  const badgeClass = isOk ? 'ok' : (isPending ? 'warning' : 'critical');
                  return `
                    <tr>
                      <td style="font-size:0.75rem">${escHtml(r.timestamp)}</td>
                      <td class="font-mono" style="color:var(--accent-secondary);font-weight:700">${escHtml(r.refId)}</td>
                      <td>${corrBadge}</td>
                      <td><strong style="color:#fff">${escHtml(r.itemName)}</strong></td>
                      <td><span class="stock-tag ${badgeClass}">${escHtml(r.action)}</span></td>
                      <td>${typeBadge}</td>
                      <td class="font-mono">${escHtml(r.remainingStock)}</td>
                      <td style="font-size:0.78rem">${escHtml(r.user)}</td>
                      <td style="font-size:0.75rem;color:var(--text-secondary)">${escHtml(r.notes)}</td>
                    </tr>
                  `;
                }
              }).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;
}

function setLedgerTab(tab) {
  state.ledgerTab = tab;
  renderInventoryHistory();
}

function updateAuditFilters() {
  state.auditFilters = {
    search: $('#audit-filter-search')?.value || '',
    startDate: $('#audit-filter-start')?.value || '',
    endDate: $('#audit-filter-end')?.value || '',
    product: $('#audit-filter-product')?.value || '',
    batch: $('#audit-filter-batch')?.value || ''
  };
  renderInventoryHistory();
}

function resetAuditFilters() {
  state.auditFilters = { search: '', startDate: '', endDate: '', product: '', batch: '' };
  renderInventoryHistory();
}

function filterAuditByCorrelation(corrId) {
  state.auditFilters = state.auditFilters || {};
  state.auditFilters.search = corrId;
  renderInventoryHistory();
  showToast(`Filtered by Correlation ID: ${corrId}`, 'info');
}

async function downloadAuditLedgerExcel(forcedMode = null) {
  let mode = forcedMode;
  if (!mode) {
    const hasFilters = state.auditFilters && (state.auditFilters.search || state.auditFilters.startDate || state.auditFilters.endDate || state.auditFilters.product || state.auditFilters.batch);
    if (hasFilters) {
      const choice = confirm('Download complete Audit Workbook:\n\n• Click OK to download All Records (Default)\n• Click Cancel to download only Filtered Records');
      mode = choice ? 'all' : 'filtered';
    } else {
      mode = 'all';
    }
  }

  try {
    showToast('Generating unified 6-sheet Excel workbook…', 'info');
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (mode === 'filtered' && state.auditFilters) {
      if (state.auditFilters.search) params.set('search', state.auditFilters.search);
      if (state.auditFilters.startDate) params.set('startDate', state.auditFilters.startDate);
      if (state.auditFilters.endDate) params.set('endDate', state.auditFilters.endDate);
      if (state.auditFilters.batch) params.set('batchId', state.auditFilters.batch);
    }

    const response = await fetch(`/api/audit-ledger/export?${params.toString()}`);
    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `invoicewise_audit_ledger_${new Date().toISOString().split('T')[0]}.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ Complete Audit Workbook downloaded successfully!', 'success');
  } catch (err) {
    showToast('❌ Excel download failed: ' + err.message, 'error');
  }
}

async function downloadAuditLedgerPDF() {
  const hasFilters = state.auditFilters && (state.auditFilters.search || state.auditFilters.startDate || state.auditFilters.endDate || state.auditFilters.product || state.auditFilters.batch);
  let mode = 'all';
  if (hasFilters) {
    const choice = confirm('Download complete Audit PDF:\n\n• Click OK to download All Records (Default)\n• Click Cancel to download only Filtered Records');
    mode = choice ? 'all' : 'filtered';
  }
  
  showToast('Preparing Comprehensive Audit Dossier...', 'info');
  try {
    await loadData();
    if (typeof window.printAuditLedger === 'function') {
      const filtersToPass = mode === 'filtered' ? state.auditFilters : null;
      window.printAuditLedger(state, filtersToPass, state.settings);
      showToast('Audit Dossier ready for printing / saving as PDF.', 'success');
    } else {
      showToast('Print engine not loaded', 'error');
    }
  } catch (err) {
    showToast('Unable to generate PDF: ' + err.message, 'error');
  }
}

async function clearAuditLedgers() {
  promptDeletion({
    title: 'Clear All Audit Ledgers',
    itemName: 'All Audit Ledgers & Histories',
    details: 'This will permanently erase ALL raw material transaction logs, finished goods movement logs, manufacturing audit entries, recipe history, and deletion memory records. No residual data will remain in any audit JSON file.',
    onConfirm: async ({ reason }) => {
      try {
        await api('DELETE', '/api/audit-ledgers');
        state.manufacturingAudit = [];
        state.rawMaterialTxns = [];
        state.finishedGoodsTxns = [];
        if (state.recipeHistory !== undefined) state.recipeHistory = [];
        showToast('All 4 audit ledger files wiped permanently ✓', 'success');
        await loadData();
        renderInventoryHistory();
      } catch (err) {
        showToast('Failed to clear audit ledgers: ' + err.message, 'error');
      }
    }
  });
}

// NOTE: Main initialization is handled by the DOMContentLoaded listener above (~line 2043).
// Do NOT add a second DOMContentLoaded here — it would double-initialize the app.

// ─── FULL SYSTEM DATA EXPORT ──────────────────────────────────────────────────
async function downloadFullDataJSON() {
  const btn = $('#export-json-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Preparing export…'; }

  try {
    const response = await fetch('/api/export-data');
    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `invoicewise_export_${new Date().toISOString().split('T')[0]}.json`;

    // Trigger browser file download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ Complete ERP data exported successfully!', 'success');
  } catch (err) {
    showToast('❌ Export failed: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 📥 Download Complete ERP Data (JSON)`;
    }
  }
}

// ─── FULL SYSTEM DATA IMPORT ──────────────────────────────────────────────────
let _importFileData = null; // Holds parsed JSON ready to send

function _setImportFile(parsedJSON, fileName) {
  _importFileData = parsedJSON;
  const btn = $('#import-json-btn');
  const label = $('#import-drop-label');
  const result = $('#import-result');

  if (label) label.innerHTML = `✅ <strong style="color:#10b981">${fileName}</strong> — ready to import`;
  if (result) result.style.display = 'none';

  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

function isValidInvoiceWiseJSON(parsed) {
  if (!parsed) return false;
  if (Array.isArray(parsed) && parsed.length > 0) return true;
  if (typeof parsed !== 'object') return false;

  const hasAppName = typeof parsed.appName === 'string' && parsed.appName.toLowerCase().includes('invoicewise');
  const hasDataKeys = Array.isArray(parsed.products) ||
    Array.isArray(parsed.rawMaterials) || Array.isArray(parsed.raw_materials) ||
    Array.isArray(parsed.customers) ||
    Array.isArray(parsed.invoices) ||
    Array.isArray(parsed.recipes) ||
    Array.isArray(parsed.finishedGoods) || Array.isArray(parsed.finished_goods) ||
    Array.isArray(parsed.manufacturingBatches) || Array.isArray(parsed.manufacturing_batches) ||
    Boolean(parsed.companyProfile || parsed.settings || parsed.company_profile);

  return hasAppName || hasDataKeys;
}

function handleImportFileSelect(input) {
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showToast('❌ Please select a valid .json file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!isValidInvoiceWiseJSON(parsed)) {
        showToast('❌ Invalid file — must contain valid InvoiceWise ERP data (e.g. products, rawMaterials, customers)', 'error');
        return;
      }
      _setImportFile(parsed, file.name);
    } catch {
      showToast('❌ Failed to parse JSON — file may be corrupted', 'error');
    }
  };
  reader.readAsText(file);
}

function handleImportDrop(event) {
  event.preventDefault();
  const zone = $('#import-drop-zone');
  if (zone) { zone.style.borderColor = 'var(--border-subtle)'; zone.style.background = ''; }

  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showToast('❌ Please drop a valid .json file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!isValidInvoiceWiseJSON(parsed)) {
        showToast('❌ Invalid file — must contain valid InvoiceWise ERP data (e.g. products, rawMaterials, customers)', 'error');
        return;
      }
      _setImportFile(parsed, file.name);
    } catch {
      showToast('❌ Failed to parse JSON — file may be corrupted', 'error');
    }
  };
  reader.readAsText(file);
}

async function importDataJSON() {
  if (!_importFileData) return;

  const confirmed = confirm(
    '⚠️ OVERWRITE WARNING\n\n' +
    'This will replace ALL current data with the imported file.\n' +
    'A pre-import safety backup will be saved to data/pre_import_backup.json.\n\n' +
    'Are you sure you want to continue?'
  );
  if (!confirmed) return;

  const btn = $('#import-json-btn');
  const result = $('#import-result');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Importing…'; }

  try {
    const res = await fetch('/api/import-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_importFileData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');

    const s = data.summary;
    if (result) {
      result.style.display = 'block';
      result.innerHTML = `
        <strong style="color:#10b981;font-size:0.88rem">✅ Import Successful!</strong>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
          <span>📦 Raw Materials</span><strong>${s.rawMaterials}</strong>
          <span>🧪 Recipes</span><strong>${s.recipes}</strong>
          <span>🏭 Mfg Batches</span><strong>${s.manufacturingBatches}</strong>
          <span>🛍️ Products</span><strong>${s.products}</strong>
          <span>📦 Finished Goods</span><strong>${s.finishedGoods}</strong>
          <span>👥 Customers</span><strong>${s.customers}</strong>
          <span>🧾 Invoices</span><strong>${s.invoices}</strong>
        </div>
        <div style="margin-top:8px;font-size:0.77rem;color:var(--text-muted)">Imported at ${new Date(data.importedAt).toLocaleString()}</div>
      `;
    }

    showToast('✅ Data imported & restored successfully! Reloading system…', 'success');
    _importFileData = null;

    // Refresh application after 1.2s to reflect imported data cleanly across all screens
    setTimeout(() => {
      window.location.reload();
    }, 1200);

  } catch (err) {
    showToast('❌ Import failed: ' + err.message, 'error');
    if (result) {
      result.style.display = 'block';
      result.style.background = 'rgba(239,68,68,0.08)';
      result.style.borderColor = 'rgba(239,68,68,0.3)';
      result.style.color = '#fca5a5';
      result.textContent = '❌ ' + err.message;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 📤 Import &amp; Restore Data`;
    }
  }
}

window.importDataJSON = importDataJSON;
window.handleImportFileSelect = handleImportFileSelect;
window.handleImportDrop = handleImportDrop;

// ─── FACTORY RESET / CLEAN SLATE ─────────────────────────────────────────
async function executeFactoryReset() {
  const confirmMsg = "Are you sure you want to reset ALL data?\n\nThis will permanently delete all raw materials, products, recipes, batches, invoices, customers, and audit logs to give you a completely fresh, empty panel.\n\nType 'RESET' in the next prompt to proceed.";
  if (!confirm(confirmMsg)) return;

  const typed = prompt("To confirm irreversible factory reset, type 'RESET':");
  if (typed !== 'RESET') {
    if (typeof showToast === 'function') showToast('Reset cancelled — input did not match.', 'info');
    return;
  }

  const btn = $('#reset-all-data-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Clearing all data...';
  }

  try {
    const res = await api('POST', '/api/system/reset-data', {});
    if (res && res.success) {
      if (typeof showToast === 'function') showToast('All data wiped successfully! Reloading...', 'success');
      try { localStorage.removeItem('invoicewise_tour_completed'); } catch (_) {}
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      alert((res && res.error) || 'Failed to reset data');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> 🗑️ Reset All Data (Start Fresh)`;
      }
    }
  } catch (err) {
    alert('Factory reset failed: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> 🗑️ Reset All Data (Start Fresh)`;
    }
  }
}
window.executeFactoryReset = executeFactoryReset;


// ═══════════════════════════════════════════════════════════════════════════
// ─── RECIPE VERSION HISTORY MODAL ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
async function openRecipeHistoryModal(recipeId) {
  const modal = $('#recipe-history-modal');
  const body  = $('#recipe-history-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Loading version history…</div>';
  modal.classList.add('open');

  try {
    const data = await api('GET', `/api/recipes/${recipeId}/history`);
    const versions = data.history || [];
    const current = data.current;

    if (versions.length === 0 && current) {
      body.innerHTML = `
        <div style="text-align:center;padding:30px;color:var(--text-muted)">
          <p>No previous versions found. This is the original recipe (v${current.version || 1}).</p>
        </div>
      `;
      return;
    }

    const allVersions = current ? [current, ...versions] : versions;

    body.innerHTML = `
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px">
        Showing ${allVersions.length} version(s) for <strong style="color:#fff">${escHtml(current?.name || recipeId)}</strong>
      </div>
      ${allVersions.map((v, idx) => `
        <div style="background:var(--bg-input);border:1px solid ${idx===0?'var(--accent-primary)':'var(--border-subtle)'};border-radius:var(--radius-md);padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="color:#fff;font-size:0.88rem">
              ${idx === 0 ? '🟢 Current' : '📜 Previous'} — Version ${v.version || (allVersions.length - idx)}
            </strong>
            <span style="font-size:0.72rem;color:var(--text-muted)">${v.updatedAt || v.createdAt || ''}</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:6px">
            ${escHtml(v.name || v.productName || '')} · Bottle: ${v.bottleSize||200} ${escHtml(v.bottleSizeUnit||'mL')} · Batch: ${v.defaultBatchSize||500}
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Ingredients (${(v.ingredients||[]).length}):</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${(v.ingredients||[]).map(ing => `
              <span style="background:rgba(99,102,241,0.1);color:var(--accent-primary-light);padding:2px 8px;border-radius:4px;font-size:0.73rem">
                ${escHtml(ing.raw_material_name||'')} · ${ing.qty} ${escHtml(ing.unit||'')}
              </span>
            `).join('')}
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;padding:30px;color:#f87171">Failed to load history: ${escHtml(err.message)}</div>`;
  }
}

function closeRecipeHistoryModal() {
  $('#recipe-history-modal')?.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── BATCH TRACEABILITY MODAL ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
async function openTraceBatchModal(batchId) {
  const modal = $('#trace-batch-modal');
  const body  = $('#trace-batch-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Loading traceability data…</div>';
  modal.classList.add('open');

  try {
    const data = await api('GET', `/api/manufacturing-batches/${batchId}/traceability`);
    const t = data.traceability || data;

    body.innerHTML = `
      <div style="margin-bottom:16px">
        <h3 style="color:#fff;font-size:0.95rem;margin-bottom:4px">Manufacturing Batch: <span class="font-mono" style="color:var(--accent-secondary)">${escHtml(t.batch?.batchNumber || t.batch?.id || batchId)}</span></h3>
        <div style="font-size:0.8rem;color:var(--text-secondary)">
          Product: <strong>${escHtml(t.batch?.productName || '')}</strong> ·
          Produced: ${t.batch?.quantityProduced || 0} bottles ·
          Date: ${t.batch?.date || ''}
          ${t.batch?.manufacturingStartDate ? ` · Start: ${t.batch.manufacturingStartDate}` : ''}
          ${t.batch?.manufacturingEndDate ? ` · End: ${t.batch.manufacturingEndDate}` : ''}
        </div>
      </div>

      <!-- Raw Materials Consumed -->
      <div style="margin-bottom:16px">
        <div style="font-size:0.78rem;font-weight:700;color:var(--accent-primary-light);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
          🧪 Raw Materials Consumed (${(t.rawMaterialBatches || t.ingredientsConsumed || []).length} items)
        </div>
        ${(t.rawMaterialBatches || t.ingredientsConsumed || []).map(rm => `
          <div style="background:var(--bg-input);padding:8px 12px;border-radius:6px;margin-bottom:4px;font-size:0.78rem;display:flex;justify-content:space-between;align-items:center">
            <span><strong style="color:#fff">${escHtml(rm.rawMaterialName || rm.raw_material_name || '')}</strong></span>
            <span class="font-mono" style="color:#f87171">- ${rm.quantityUsed || rm.qty || 0} ${escHtml(rm.unit || '')}</span>
          </div>
        `).join('')}
      </div>

      <!-- Finished Goods -->
      ${t.finishedGoods ? `
        <div style="margin-bottom:16px">
          <div style="font-size:0.78rem;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            📦 Finished Goods Output
          </div>
          <div style="background:var(--bg-input);padding:8px 12px;border-radius:6px;font-size:0.78rem">
            <strong style="color:#fff">${escHtml(t.finishedGoods.name || '')}</strong> ·
            Stock Added: <span class="font-mono" style="color:#10b981">${t.finishedGoods.quantityAdded || 0} ${escHtml(t.finishedGoods.unit || 'pcs')}</span>
          </div>
        </div>
      ` : ''}

      <!-- Sales / Invoice Links -->
      ${(t.invoices || []).length > 0 ? `
        <div style="margin-bottom:16px">
          <div style="font-size:0.78rem;font-weight:700;color:var(--accent-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            🧾 Sales Invoices Linked (${t.invoices.length})
          </div>
          ${t.invoices.map(inv => `
            <div style="background:var(--bg-input);padding:8px 12px;border-radius:6px;margin-bottom:4px;font-size:0.78rem;display:flex;justify-content:space-between">
              <span>Invoice <strong class="font-mono" style="color:var(--accent-secondary)">${escHtml(inv.invoiceNumber || inv.id || '')}</strong></span>
              <span>Customer: ${escHtml(inv.customerName || '')} · ${escHtml(inv.date || '')}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Recipe Snapshot -->
      ${t.recipeSnapshot ? `
        <div>
          <div style="font-size:0.78rem;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            📋 Recipe Snapshot (v${t.recipeSnapshot.version || '?'})
          </div>
          <div style="background:var(--bg-input);padding:8px 12px;border-radius:6px;font-size:0.78rem">
            ${escHtml(t.recipeSnapshot.name || '')} — ${(t.recipeSnapshot.ingredients||[]).length} ingredients
          </div>
        </div>
      ` : ''}
    `;
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;padding:30px;color:#f87171">Failed to load traceability: ${escHtml(err.message)}</div>`;
  }
}

function closeTraceBatchModal() {
  $('#trace-batch-modal')?.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── UNIFIED AUDIT LEDGER COMPATIBILITY WRAPPERS ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderManufacturingAudit() {
  state.ledgerTab = 'mfg';
  navigateTo('inventory-history');
}

function filterMfgAudit() {
  renderInventoryHistory();
}

function downloadMfgAuditExcel() {
  downloadAuditLedgerExcel();
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── MODULAR SECTION IMPORT FUNCTIONS ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
let _secImportData = null;
let _secImportMode = 'file'; // 'file' or 'paste'

function toggleSecImportInput(mode) {
  _secImportMode = mode;
  const fileContainer = $('#sec-import-file-container');
  const pasteContainer = $('#sec-import-paste-container');
  const fileBtn = $('#sec-import-mode-file-btn');
  const pasteBtn = $('#sec-import-mode-paste-btn');

  if (mode === 'file') {
    if (fileContainer) fileContainer.style.display = '';
    if (pasteContainer) pasteContainer.style.display = 'none';
    if (fileBtn) { fileBtn.className = 'btn btn-sm btn-secondary'; }
    if (pasteBtn) { pasteBtn.className = 'btn btn-sm btn-ghost'; }
  } else {
    if (fileContainer) fileContainer.style.display = 'none';
    if (pasteContainer) pasteContainer.style.display = '';
    if (fileBtn) { fileBtn.className = 'btn btn-sm btn-ghost'; }
    if (pasteBtn) { pasteBtn.className = 'btn btn-sm btn-secondary'; }
  }
}

function handleSecImportFileSelect(input) {
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showToast('Please select a valid .json file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      _secImportData = JSON.parse(e.target.result);
      const label = $('#sec-import-file-label');
      if (label) label.innerHTML = `✅ <strong style="color:#10b981">${file.name}</strong> — loaded`;
    } catch {
      showToast('Failed to parse JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

function handleSecImportDrop(event) {
  event.preventDefault();
  const zone = $('#sec-import-drop-zone');
  if (zone) { zone.style.borderColor = 'var(--border-subtle)'; }

  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showToast('Please drop a valid .json file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      _secImportData = JSON.parse(e.target.result);
      const label = $('#sec-import-file-label');
      if (label) label.innerHTML = `✅ <strong style="color:#10b981">${file.name}</strong> — loaded`;
    } catch {
      showToast('Failed to parse JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

function updateSectionImportPlaceholder() {
  // Just visual feedback — no-op for now
}

function parseFlexibleSectionJSON(rawText, section = '') {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();
  // Strip leading and trailing commas, semicolons, whitespace
  text = text.replace(/^[\s,;]+/, '').replace(/[\s,;]+$/, '').trim();
  if (!text) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e1) {
    try {
      parsed = JSON.parse('[' + text + ']');
    } catch (e2) {
      try {
        const withoutTrailing = text.replace(/,(\s*[\]}])/g, '$1');
        parsed = JSON.parse(withoutTrailing);
      } catch (e3) {
        try {
          const wrappedNoTrailing = '[' + text.replace(/,(\s*[\]}])/g, '$1') + ']';
          parsed = JSON.parse(wrappedNoTrailing);
        } catch (e4) {
          throw new Error('Invalid JSON format: ' + e1.message);
        }
      }
    }
  }

  let records = parsed;
  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === 'object') {
      const candidates = [section, 'raw_materials', 'rawMaterials', 'recipes', 'products', 'customers', 'invoices', 'manufacturing_batches', 'manufacturingBatches', 'finished_goods', 'finishedGoods', 'items', 'records', 'data'];
      let found = false;
      for (const k of candidates) {
        if (k && Array.isArray(parsed[k])) {
          records = parsed[k];
          found = true;
          break;
        }
      }
      if (!found) records = [parsed];
    } else {
      records = [parsed];
    }
  }
  return { raw: parsed, records };
}

async function previewSectionImport() {
  const section = $('#sec-import-target')?.value;
  const modeRadio = document.querySelector('input[name="sec-import-mode"]:checked');
  const mode = modeRadio?.value || 'add';

  let records = null;
  if (_secImportMode === 'paste') {
    const text = $('#sec-import-paste-text')?.value;
    if (!text || !text.trim()) { showToast('Paste JSON data first', 'error'); return; }
    try {
      const parsedRes = parseFlexibleSectionJSON(text, section);
      if (!parsedRes || !parsedRes.records || parsedRes.records.length === 0) {
        showToast('No valid records found in pasted JSON', 'error');
        return;
      }
      _secImportData = parsedRes.records;
      records = parsedRes.records;
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  } else {
    let data = _secImportData;
    if (!data) { showToast('Load or paste JSON data first', 'error'); return; }
    if (!Array.isArray(data)) {
      records = data[section] || data.raw_materials || data.rawMaterials || data.recipes || data.products || data.customers || data.invoices || data.manufacturing_batches || data.manufacturingBatches || data.finished_goods || data.finishedGoods || [];
      if (!Array.isArray(records) && typeof records === 'object') {
        records = [records];
      }
    } else {
      records = data;
    }
  }

  const preview = $('#sec-import-preview-area');
  const submitBtn = $('#sec-import-submit-btn');
  if (!preview) return;

  const count = Array.isArray(records) ? records.length : 1;

  preview.style.display = 'block';
  preview.innerHTML = `
    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:12px;font-size:0.82rem;color:var(--text-primary)">
      <strong style="color:#fff">Preview Summary:</strong><br>
      Section: <strong>${escHtml(section)}</strong> · Mode: <strong>${escHtml(mode)}</strong> · Records found: <strong>${count}</strong>
      ${count > 0 && Array.isArray(records) ? `
        <div style="margin-top:8px;max-height:150px;overflow-y:auto;font-size:0.73rem;color:var(--text-muted)">
          ${records.slice(0, 5).map((r, i) => `<div>${i+1}. ID: ${escHtml(r.id||'auto')} · ${escHtml(r.name || r.productName || r.customerName || r.businessName || JSON.stringify(r).substring(0,80))}</div>`).join('')}
          ${count > 5 ? `<div style="color:var(--text-muted)">…and ${count - 5} more</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;

  if (submitBtn && count > 0) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }
}

async function executeSectionImport() {
  const section = $('#sec-import-target')?.value;
  const modeRadio = document.querySelector('input[name="sec-import-mode"]:checked');
  const mode = modeRadio?.value || 'add';

  let data = _secImportData;
  if (_secImportMode === 'paste') {
    const text = $('#sec-import-paste-text')?.value;
    if (!text || !text.trim()) { showToast('No data to import', 'error'); return; }
    try {
      const parsedRes = parseFlexibleSectionJSON(text, section);
      data = parsedRes.records;
    } catch (err) {
      showToast('Invalid JSON: ' + err.message, 'error');
      return;
    }
  }

  if (!data) { showToast('No data loaded', 'error'); return; }

  if (!confirm(`Import ${section} data in "${mode}" mode?\n\nA safety backup will be created automatically.`)) return;

  const submitBtn = $('#sec-import-submit-btn');
  const resultArea = $('#sec-import-result-area');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Importing…'; }

  try {
    const result = await api('POST', `/api/import-data/${section}`, { data, mode });

    if (resultArea) {
      resultArea.style.display = 'block';
      resultArea.innerHTML = `
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:12px;font-size:0.82rem;color:#6ee7b7">
          <strong>✅ Section Import Successful!</strong><br>
          Section: ${escHtml(section)} · Mode: ${escHtml(mode)}<br>
          ${result.added !== undefined ? `Added: ${result.added}` : ''}
          ${result.updated !== undefined ? ` · Updated: ${result.updated}` : ''}
          ${result.skipped !== undefined ? ` · Skipped: ${result.skipped}` : ''}
          ${result.total !== undefined ? ` · Total: ${result.total}` : ''}
        </div>
      `;
    }

    showToast('✅ Section import completed!', 'success');
    _secImportData = null;
    await loadData();

  } catch (err) {
    showToast('❌ Import failed: ' + err.message, 'error');
    if (resultArea) {
      resultArea.style.display = 'block';
      resultArea.innerHTML = `
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;font-size:0.82rem;color:#fca5a5">
          ❌ ${escHtml(err.message)}
        </div>
      `;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 Confirm & Import Section';
    }
  }
}

// ─── Window Exports (v3.0) ────────────────────────────────────────────────
window.editRecipe = editRecipe;
window.openRecipeHistoryModal = openRecipeHistoryModal;
window.closeRecipeHistoryModal = closeRecipeHistoryModal;
window.openTraceBatchModal = openTraceBatchModal;
window.closeTraceBatchModal = closeTraceBatchModal;
window.renderManufacturingAudit = renderManufacturingAudit;
window.filterMfgAudit = filterMfgAudit;
window.downloadMfgAuditExcel = downloadMfgAuditExcel;
window.toggleSecImportInput = toggleSecImportInput;
window.handleSecImportFileSelect = handleSecImportFileSelect;
window.handleSecImportDrop = handleSecImportDrop;
window.previewSectionImport = previewSectionImport;
window.executeSectionImport = executeSectionImport;
window.updateSectionImportPlaceholder = updateSectionImportPlaceholder;
window.openIncreaseStockModal = openIncreaseStockModal;
window.closeIncreaseStockModal = closeIncreaseStockModal;
window.onIncreaseStockRMChange = onIncreaseStockRMChange;
window.updateIncreaseStockCalc = updateIncreaseStockCalc;
window.submitIncreaseStock = submitIncreaseStock;
window.downloadAuditLedgerExcel = downloadAuditLedgerExcel;
window.downloadAuditLedgerPDF = downloadAuditLedgerPDF;
window.filterAuditByCorrelation = filterAuditByCorrelation;
window.updateAuditFilters = updateAuditFilters;
window.resetAuditFilters = resetAuditFilters;
window.setLedgerTab = setLedgerTab;
window.openAddRMModal = openAddRMModal;
window.closeAddRMModal = closeAddRMModal;
window.submitAddRM = submitAddRM;
window.openRMBatchesModal = openRMBatchesModal;
window.closeRMBatchesModal = closeRMBatchesModal;
window.switchRMBatchesTab = switchRMBatchesTab;
window.openRMBatchDetailsModal = openRMBatchDetailsModal;
window.closeRMBatchDetailsModal = closeRMBatchDetailsModal;
window.openRMBatchTraceModal = openRMBatchTraceModal;

// ─── NOTES PANEL LOGIC ──────────────────────────────────────────────────
let notesTimeout = null;

function toggleNotesPanel() {
  const panel = $('#notes-panel');
  if (panel) {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      $('#notes-textarea')?.focus();
      fetchNotes();
    }
  }
}
window.toggleNotesPanel = toggleNotesPanel;

async function fetchNotes() {
  try {
    const res = await fetch('/api/notes');
    const data = await res.json();
    if (data && data.notes !== undefined) {
      const ta = $('#notes-textarea');
      if (ta) ta.value = data.notes;
    }
  } catch (err) {
    console.error('Failed to fetch notes', err);
  }
}

function debouncedSaveNotes() {
  const status = $('#notes-status');
  if (status) status.textContent = 'Saving...';
  
  if (notesTimeout) clearTimeout(notesTimeout);
  notesTimeout = setTimeout(async () => {
    try {
      const notes = $('#notes-textarea')?.value || '';
      await api('POST', '/api/notes', { notes });
      if (status) {
        status.textContent = 'Saved at ' + new Date().toLocaleTimeString();
      }
    } catch (err) {
      if (status) status.textContent = 'Save failed';
    }
  }, 1000);
}
window.debouncedSaveNotes = debouncedSaveNotes;

// Initial fetch on load
window.addEventListener('DOMContentLoaded', () => {
  fetchNotes();
});
// ─── CALCULATOR PANEL LOGIC ──────────────────────────────────────────────
let calcCurrentVal = '0';
let calcPrevVal = '';
let calcOperator = null;
let calcJustEvaluated = false;

function toggleCalcPanel() {
  const panel = $('#calc-panel');
  const tab = $('#calc-tab');
  if (panel) {
    panel.style.right = ''; // Clear any inline right offset so CSS handles docking and slide-in/out
    panel.classList.toggle('open');
    if (tab) {
      tab.style.display = panel.classList.contains('open') ? 'none' : 'flex';
    }
  }
}
window.toggleCalcPanel = toggleCalcPanel;

function calcAction(btn) {
  if (calcCurrentVal === 'Cannot divide by zero.' || calcCurrentVal === 'Error') {
    calcCurrentVal = '0';
    calcPrevVal = '';
    calcOperator = null;
  }
  
  if (btn === 'C') {
    calcCurrentVal = '0';
    calcPrevVal = '';
    calcOperator = null;
    calcJustEvaluated = false;
  } else if (btn === 'DEL') {
    if (calcJustEvaluated) {
      calcCurrentVal = '0';
      calcJustEvaluated = false;
    } else {
      calcCurrentVal = calcCurrentVal.slice(0, -1);
      if (calcCurrentVal === '' || calcCurrentVal === '-') calcCurrentVal = '0';
    }
  } else if (['+', '-', '*', '/'].includes(btn)) {
    if (calcOperator && !calcJustEvaluated) {
      calcEvaluate();
    }
    calcPrevVal = calcCurrentVal;
    calcOperator = btn;
    calcJustEvaluated = true;
  } else if (btn === '=') {
    if (calcOperator && calcPrevVal !== '') {
      calcEvaluate();
      calcOperator = null;
      calcPrevVal = '';
      calcJustEvaluated = true;
    }
  } else if (btn === '%') {
    let val = parseFloat(calcCurrentVal);
    if (!isNaN(val)) {
      calcCurrentVal = (val / 100).toString();
    }
  } else if (btn === '+/-') {
    if (calcCurrentVal !== '0') {
      calcCurrentVal = calcCurrentVal.startsWith('-') ? calcCurrentVal.slice(1) : '-' + calcCurrentVal;
    }
  } else if (btn === '.') {
    if (calcJustEvaluated) {
      calcCurrentVal = '0.';
      calcJustEvaluated = false;
    } else if (!calcCurrentVal.includes('.')) {
      calcCurrentVal += '.';
    }
  } else {
    // Number
    if (calcCurrentVal === '0' || calcJustEvaluated) {
      calcCurrentVal = btn;
      calcJustEvaluated = false;
    } else {
      calcCurrentVal += btn;
    }
  }
  updateCalcDisplay();
}
window.calcAction = calcAction;

function calcEvaluate() {
  const prev = parseFloat(calcPrevVal);
  const curr = parseFloat(calcCurrentVal);
  if (isNaN(prev) || isNaN(curr)) return;
  
  let result = 0;
  switch (calcOperator) {
    case '+': result = prev + curr; break;
    case '-': result = prev - curr; break;
    case '*': result = prev * curr; break;
    case '/': 
      if (curr === 0) {
        calcCurrentVal = 'Cannot divide by zero.';
        return;
      }
      result = prev / curr; 
      break;
  }
  
  // Format very large numbers or decimals correctly without losing precision unnecessarily
  if (!isFinite(result)) {
    calcCurrentVal = 'Error';
  } else {
    let resStr = result.toString();
    // Handle floating point weirdness
    if (resStr.length > 15) {
      resStr = parseFloat(result.toPrecision(12)).toString();
    }
    calcCurrentVal = resStr;
  }
}

function updateCalcDisplay() {
  const display = $('#calc-display');
  const history = $('#calc-history');
  if (display) display.value = calcCurrentVal;
  if (history) {
    let opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    history.textContent = calcOperator ? `${calcPrevVal} ${opMap[calcOperator]}` : '';
  }
}

// Global Keyboard listener for Calculator
document.addEventListener('keydown', (e) => {
  const panel = $('#calc-panel');
  if (!panel || !panel.classList.contains('open')) return;
  
  // Don't interfere if typing in an input (unless it's the calc display itself)
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.target.id !== 'calc-display') return;
  }
  
  if (e.key >= '0' && e.key <= '9') { calcAction(e.key); e.preventDefault(); }
  else if (e.key === '.') { calcAction('.'); e.preventDefault(); }
  else if (e.key === '+') { calcAction('+'); e.preventDefault(); }
  else if (e.key === '-') { calcAction('-'); e.preventDefault(); }
  else if (e.key === '*') { calcAction('*'); e.preventDefault(); }
  else if (e.key === '/') { calcAction('/'); e.preventDefault(); }
  else if (e.key === '%') { calcAction('%'); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === '=') { calcAction('='); e.preventDefault(); }
  else if (e.key === 'Backspace') { calcAction('DEL'); e.preventDefault(); }
  else if (e.key === 'Escape') { 
    if (calcCurrentVal !== '0' || calcPrevVal !== '') {
      calcAction('C');
    } else {
      toggleCalcPanel();
    }
    e.preventDefault(); 
  }
});

// ─── MOVABLE CIRCLE ICONS & DRAGGABLE UTILITIES ──────────────────────────────
function makeTabMovable(tabEl, storageKey, defaultRatio, onMoveCallback = null) {
  if (!tabEl) return;

  function clampTop(topPx) {
    const minTop = 10;
    const maxTop = Math.max(minTop, window.innerHeight - 66);
    return Math.max(minTop, Math.min(topPx, maxTop));
  }

  function applyTop(topPx, save = false) {
    const clamped = clampTop(topPx);
    tabEl.style.bottom = 'auto';
    tabEl.style.top = clamped + 'px';
    if (save) {
      localStorage.setItem(storageKey, String(clamped));
    }
    if (typeof onMoveCallback === 'function') {
      onMoveCallback(clamped);
    }
    return clamped;
  }

  // Restore saved position or use default
  const saved = localStorage.getItem(storageKey);
  if (saved !== null && !isNaN(parseInt(saved, 10))) {
    applyTop(parseInt(saved, 10));
  } else {
    applyTop(Math.round(window.innerHeight * defaultRatio));
  }

  let isDragging = false;
  let startY = 0;
  let startTop = 0;
  let hasMoved = false;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return; // left click only
    isDragging = true;
    hasMoved = false;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    startTop = tabEl.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
    tabEl.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const dy = clientY - startY;
    if (Math.abs(dy) > 4) {
      hasMoved = true;
    }
    if (hasMoved) {
      if (e.cancelable && e.type && e.type.startsWith('touch')) e.preventDefault();
      applyTop(startTop + dy, true);
    }
  }

  let lastDragEndTime = 0;

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = '';
    tabEl.style.cursor = 'grab';
    if (hasMoved) {
      lastDragEndTime = Date.now();
    }
  }

  // Intercept and cancel click event immediately following a drag
  tabEl.addEventListener('click', (ev) => {
    if (Date.now() - lastDragEndTime < 300) {
      ev.stopImmediatePropagation();
      ev.preventDefault();
    }
  }, true);

  tabEl.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);

  tabEl.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  window.addEventListener('resize', () => {
    const curTop = tabEl.getBoundingClientRect().top;
    applyTop(curTop, false);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const calcTab = $('#calc-tab');
  const calcPanel = $('#calc-panel');
  const notesTab = $('#notes-tab');
  const dragHandle = $('#calc-drag-handle');

  // Make Calculator Circle Icon movable from top to bottom
  if (calcTab) {
    makeTabMovable(calcTab, 'calc-tab-top', 0.48, (tabTop) => {
      if (calcPanel) {
        const minTop = 10;
        const maxTop = Math.max(minTop, window.innerHeight - 480);
        const panelTop = Math.max(minTop, Math.min(tabTop - 20, maxTop));
        calcPanel.style.bottom = 'auto';
        calcPanel.style.top = panelTop + 'px';
      }
    });
  }

  // Make Scratchpad Notes Circle Icon movable from top to bottom
  if (notesTab) {
    makeTabMovable(notesTab, 'notes-tab-top', 0.60);
  }

  // Draggable Calculator Panel Header (Vertical up/down only, stays docked to the side)
  if (dragHandle && calcPanel) {
    let isDraggingCalc = false;
    let dragStartY = 0;
    let dragStartTop = 0;

    const startDrag = (clientY) => {
      isDraggingCalc = true;
      dragStartY = clientY;
      const rect = calcPanel.getBoundingClientRect();
      dragStartTop = rect.top;
      calcPanel.style.transition = 'none';
      calcPanel.style.right = ''; // Ensure CSS controls docking to the right margin
      document.body.style.userSelect = 'none';
      dragHandle.style.cursor = 'grabbing';
    };

    const moveDrag = (clientY) => {
      if (!isDraggingCalc) return;
      const dy = clientY - dragStartY;
      const minTop = 10;
      const maxTop = Math.max(minTop, window.innerHeight - calcPanel.offsetHeight - 10);
      const newTop = Math.max(minTop, Math.min(dragStartTop + dy, maxTop));

      calcPanel.style.bottom = 'auto';
      calcPanel.style.top = newTop + 'px';
      calcPanel.style.right = ''; // Stays docked to side
      if (calcTab) {
        const tabClamped = Math.max(10, Math.min(newTop + 20, window.innerHeight - 66));
        calcTab.style.top = tabClamped + 'px';
        localStorage.setItem('calc-tab-top', String(tabClamped));
      }
    };

    const endDrag = () => {
      if (isDraggingCalc) {
        isDraggingCalc = false;
        calcPanel.style.transition = '';
        calcPanel.style.right = '';
        document.body.style.userSelect = '';
        dragHandle.style.cursor = 'grab';
      }
    };

    dragHandle.addEventListener('mousedown', (e) => {
      // Ignore clicks on buttons inside header (e.g. the close button)
      if (e.target.closest('button')) return;
      startDrag(e.clientY);
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingCalc) {
        moveDrag(e.clientY);
      }
    });

    window.addEventListener('mouseup', endDrag);

    // Touch support for mobile/touch screens
    dragHandle.addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) return;
      if (e.touches.length > 0) {
        startDrag(e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isDraggingCalc && e.touches.length > 0) {
        moveDrag(e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', endDrag);
  }
});

window.toggleCalcPanel = toggleCalcPanel;
window.calcAction = calcAction;
window.openAddRMModal = openAddRMModal;
window.closeAddRMModal = closeAddRMModal;
window.submitAddRM = submitAddRM;
window.openIncreaseStockModal = openIncreaseStockModal;
window.closeIncreaseStockModal = closeIncreaseStockModal;
window.onIncreaseStockRMChange = onIncreaseStockRMChange;
window.updateIncreaseStockCalc = updateIncreaseStockCalc;
window.submitIncreaseStock = submitIncreaseStock;
window.openRMBatchesModal = openRMBatchesModal;
window.closeRMBatchesModal = closeRMBatchesModal;
window.openRMBatchDetailsModal = openRMBatchDetailsModal;
window.closeRMBatchDetailsModal = closeRMBatchDetailsModal;
window.openRMBatchTraceModal = openRMBatchTraceModal;
window.viewRMHistory = viewRMHistory;
window.openEditRMForm = openEditRMForm;
window.closeRMForm = closeRMForm;
window.saveRM = saveRM;
window.confirmDeleteRM = confirmDeleteRM;
window.openAddRMForm = openAddRMForm;
window.filterRMTable = filterRMTable;
window.deleteBatch = deleteBatch;
window.deleteFinishedGood = deleteFinishedGood;
window.deleteRecipe = deleteRecipe;
window.printBatchReport = printBatchReport;
window.onMfgRecipeSelected = onMfgRecipeSelected;
window.mfgPreview = mfgPreview;
window.commitBatch = commitBatch;
window.openProductionPreview = openProductionPreview;
window.closeProductionPreview = closeProductionPreview;
window.openRecipeForm = openRecipeForm;
window.closeRecipeForm = closeRecipeForm;
window.submitRecipeForm = submitRecipeForm;
window.addIngredientRow = addIngredientRow;
window.removeIngredientRow = removeIngredientRow;
window.openRMVendorsModal = openRMVendorsModal;
window.closeRMVendorsModal = closeRMVendorsModal;
window.switchRMVendorsTab = switchRMVendorsTab;
window.promptDeleteRMVendor = promptDeleteRMVendor;
window.closeDeleteModal = closeDeleteModal;
window.handleConfirmDelete = handleConfirmDelete;
window.renderVariantCardHTML = renderVariantCardHTML;
window.addVariantCard = addVariantCard;
window.onVariantPackagingRMChange = onVariantPackagingRMChange;
window.onVariantVendorModeChange = onVariantVendorModeChange;
window.populateVariantVendorDropdown = populateVariantVendorDropdown;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.handleProductSubmit = handleProductSubmit;
window.renderContainerUnitOptions = renderContainerUnitOptions;
