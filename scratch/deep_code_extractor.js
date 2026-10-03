const fs = require('fs');

const serverCode = fs.readFileSync('server.js', 'utf8');
const lines = serverCode.split('\n');

function getSnippet(startLine, count) {
  return lines.slice(Math.max(0, startLine - 1), Math.min(lines.length, startLine - 1 + count)).join('\n');
}

// Extract endpoint info for a given line
function findEnclosingRoute(lineNum) {
  for (let i = lineNum - 1; i >= 0; i--) {
    const l = lines[i];
    const m = l.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
    if (m) {
      return { method: m[1].toUpperCase(), path: m[2], line: i + 1 };
    }
  }
  return { method: 'STARTUP/HELPER', path: 'N/A', line: 1 };
}

// Print detailed inspection of RAW_MATERIALS_FILE
console.log('=== RAW_MATERIALS_FILE WRITES ===');
lines.forEach((l, i) => {
  if (l.includes('RAW_MATERIALS_FILE') && (l.includes('writeJSON') || l.includes('writeFileSync'))) {
    const route = findEnclosingRoute(i + 1);
    console.log(`\n--- Line ${i + 1}: ${route.method} ${route.path} ---`);
    console.log(lines.slice(Math.max(0, i - 15), Math.min(lines.length, i + 5)).join('\n'));
  }
});
