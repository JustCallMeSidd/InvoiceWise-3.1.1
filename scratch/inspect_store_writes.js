const fs = require('fs');

const serverCode = fs.readFileSync('server.js', 'utf8');
const lines = serverCode.split('\n');
const details = JSON.parse(fs.readFileSync('scratch/store_details.json', 'utf8'));

Object.entries(details).forEach(([filename, ops]) => {
  console.log(`\n======================================================`);
  console.log(`STORE: ${filename}`);
  console.log(`Writes (${ops.writes.length}):`);
  ops.writes.forEach(w => {
    console.log(`  Line ${w.lineNum} [${w.route}]:`);
    console.log(`    ${w.lineText}`);
  });
  console.log(`Reads (${ops.reads.length}):`);
  ops.reads.forEach(r => {
    console.log(`  Line ${r.lineNum} [${r.route}]: ${r.lineText}`);
  });
});
