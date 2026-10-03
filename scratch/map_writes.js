const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

function findRoute(l) {
  for (let i = l - 1; i >= 0; i--) {
    const m = lines[i].match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
    if (m) return { method: m[1].toUpperCase(), path: m[2], line: i + 1 };
  }
  return { method: 'STARTUP/HELPER', path: 'N/A', line: 1 };
}

const fileMap = {
  'RAW_MATERIALS_FILE': 'raw_materials.json',
  'RAW_MATERIAL_BATCHES_FILE': 'raw_material_batches.json',
  'RAW_MAT_TXN_FILE': 'raw_material_transactions.json',
  'PRODUCTS_FILE': 'products.json',
  'CUSTOMERS_FILE': 'customers.json',
  'RECIPES_FILE': 'recipes.json',
  'RECIPE_HISTORY_FILE': 'recipe_history.json',
  'MANUFACTURING_BATCHES_FILE': 'manufacturing_batches.json',
  'MANUFACTURING_AUDIT_FILE': 'manufacturing_audit.json',
  'FINISHED_GOODS_FILE': 'finished_goods.json',
  'FG_TXN_FILE': 'finished_goods_transactions.json',
  'INVOICES_FILE': 'invoices.json',
  'NOTES_FILE': 'notes.json',
  'SETTINGS_FILE': 'settings.json'
};

const report = {};

Object.entries(fileMap).forEach(([fc, filename]) => {
  report[filename] = { writes: [], reads: [] };
  lines.forEach((line, i) => {
    if (line.includes(fc)) {
      const r = findRoute(i + 1);
      const isWrite = line.includes('writeJSON') || line.includes('writeFileSync');
      const isRead = line.includes('readJSON') || line.includes('readFileSync');
      if (isWrite) {
        report[filename].writes.push({
          line: i + 1,
          endpoint: `${r.method} ${r.path}`,
          endpointLine: r.line,
          code: line.trim()
        });
      }
      if (isRead) {
        report[filename].reads.push({
          line: i + 1,
          endpoint: `${r.method} ${r.path}`,
          endpointLine: r.line,
          code: line.trim()
        });
      }
    }
  });
});

fs.writeFileSync('scratch/exact_writes_reads.json', JSON.stringify(report, null, 2));
console.log('Mapped exact writes and reads to scratch/exact_writes_reads.json');
