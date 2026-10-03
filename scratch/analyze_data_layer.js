const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

// 1. Identify all file constants and files
const fileConstants = {
  'PRODUCTS_FILE': 'products.json',
  'SETTINGS_FILE': 'settings.json',
  'CUSTOMERS_FILE': 'customers.json',
  'INVOICES_FILE': 'invoices.json',
  'RAW_MATERIALS_FILE': 'raw_materials.json',
  'RECIPES_FILE': 'recipes.json',
  'RECIPE_HISTORY_FILE': 'recipe_history.json',
  'MANUFACTURING_BATCHES_FILE': 'manufacturing_batches.json',
  'MANUFACTURING_AUDIT_FILE': 'manufacturing_audit.json',
  'RAW_MAT_TXN_FILE': 'raw_material_transactions.json',
  'RAW_MATERIAL_BATCHES_FILE': 'raw_material_batches.json',
  'FINISHED_GOODS_FILE': 'finished_goods.json',
  'FG_TXN_FILE': 'finished_goods_transactions.json',
  'NOTES_FILE': 'notes.json'
};

// 2. Map routes and functions
const routeRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
let match;
const routes = [];
while ((match = routeRegex.exec(content)) !== null) {
  const line = content.substring(0, match.index).split('\n').length;
  routes.push({ method: match[1].toUpperCase(), path: match[2], line });
}

// Map each line to its containing route or helper function
function getContextAtLine(lineNum) {
  // Find route before or at lineNum
  let currentRoute = null;
  for (let i = 0; i < routes.length; i++) {
    if (routes[i].line <= lineNum) {
      if (!routes[i+1] || routes[i+1].line > lineNum) {
        currentRoute = routes[i];
        break;
      }
    }
  }
  return currentRoute;
}

// 3. Find all reads and writes
const fileOperations = {};
Object.entries(fileConstants).forEach(([fc, filename]) => {
  fileOperations[filename] = { reads: [], writes: [] };
});

lines.forEach((lineText, idx) => {
  const lineNum = idx + 1;
  Object.entries(fileConstants).forEach(([fc, filename]) => {
    if (lineText.includes(fc)) {
      const ctx = getContextAtLine(lineNum);
      const isRead = lineText.includes('readJSON') || lineText.includes('readFileSync');
      const isWrite = lineText.includes('writeJSONAtomic') || lineText.includes('writeJSON(') || lineText.includes('writeFileSync');
      
      if (isRead) {
        fileOperations[filename].reads.push({
          lineNum,
          code: lineText.trim(),
          route: ctx ? `${ctx.method} ${ctx.path}` : 'Startup / Helper'
        });
      }
      if (isWrite) {
        fileOperations[filename].writes.push({
          lineNum,
          code: lineText.trim(),
          route: ctx ? `${ctx.method} ${ctx.path}` : 'Startup / Helper'
        });
      }
    }
  });
});

fs.writeFileSync('scratch/data_layer_analysis.json', JSON.stringify({
  routes,
  fileOperations
}, null, 2));

console.log('Analysis written to scratch/data_layer_analysis.json');
