const fs = require('fs');

const serverCode = fs.readFileSync('server.js', 'utf8');
const lines = serverCode.split('\n');

// Find all routes and their line ranges
const routeRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
const routes = [];
let match;
while ((match = routeRegex.exec(serverCode)) !== null) {
  const lineNum = serverCode.substring(0, match.index).split('\n').length;
  routes.push({
    method: match[1].toUpperCase(),
    path: match[2],
    startLine: lineNum
  });
}
for (let i = 0; i < routes.length; i++) {
  routes[i].endLine = (i < routes.length - 1) ? routes[i+1].startLine - 1 : lines.length;
}

const fileConstants = {
  'raw_materials.json': 'RAW_MATERIALS_FILE',
  'raw_material_batches.json': 'RAW_MATERIAL_BATCHES_FILE',
  'raw_material_transactions.json': 'RAW_MAT_TXN_FILE',
  'products.json': 'PRODUCTS_FILE',
  'customers.json': 'CUSTOMERS_FILE',
  'recipes.json': 'RECIPES_FILE',
  'recipe_history.json': 'RECIPE_HISTORY_FILE',
  'manufacturing_batches.json': 'MANUFACTURING_BATCHES_FILE',
  'manufacturing_audit.json': 'MANUFACTURING_AUDIT_FILE',
  'finished_goods.json': 'FINISHED_GOODS_FILE',
  'finished_goods_transactions.json': 'FG_TXN_FILE',
  'invoices.json': 'INVOICES_FILE',
  'notes.json': 'NOTES_FILE',
  'settings.json': 'SETTINGS_FILE'
};

const storeDetails = {};

Object.entries(fileConstants).forEach(([filename, constName]) => {
  storeDetails[filename] = {
    reads: [],
    writes: []
  };

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (lineText.includes(constName)) {
      // Find which route it belongs to
      const route = routes.find(r => lineNum >= r.startLine && lineNum <= r.endLine);
      const isRead = lineText.includes('readJSON') || lineText.includes('readFileSync');
      const isWrite = lineText.includes('writeJSON') || lineText.includes('writeFileSync');

      if (isRead) {
        storeDetails[filename].reads.push({
          lineNum,
          lineText: lineText.trim(),
          route: route ? `${route.method} ${route.path}` : 'Startup / Helper'
        });
      }
      if (isWrite) {
        storeDetails[filename].writes.push({
          lineNum,
          lineText: lineText.trim(),
          route: route ? `${route.method} ${route.path}` : 'Startup / Helper'
        });
      }
    }
  });
});

fs.writeFileSync('scratch/store_details.json', JSON.stringify(storeDetails, null, 2));
console.log('Store details written to scratch/store_details.json');
