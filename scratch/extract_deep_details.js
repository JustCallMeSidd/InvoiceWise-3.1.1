const fs = require('fs');

const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

function findLines(pattern) {
  const matches = [];
  lines.forEach((l, idx) => {
    if (l.includes(pattern)) {
      matches.push({ lineNum: idx + 1, text: l.trim() });
    }
  });
  return matches;
}

console.log('--- ID GENERATORS ---');
lines.forEach((l, idx) => {
  if (l.match(/function\s+(uid|generate|reconcile|withInventoryLock|computeAuditHash|verifyAuditChain|logAuditEntry)/) ||
      l.match(/const\s+(uid|generate|reconcile|withInventoryLock|computeAuditHash|verifyAuditChain|logAuditEntry)\s*=/)) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});

console.log('\n--- WRITE SITES ---');
const writeLines = [];
lines.forEach((l, idx) => {
  if (l.includes('writeJSON') || (l.includes('fs.writeFileSync') && !l.includes('defaults'))) {
    writeLines.push({ line: idx + 1, text: l.trim() });
  }
});
console.log('Total write lines:', writeLines.length);
writeLines.forEach(w => console.log(w.line + ': ' + w.text));
