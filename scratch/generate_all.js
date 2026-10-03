const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'DATA_LAYER_REFERENCE.md');

// Initialize/clear targetPath
fs.writeFileSync(targetPath, '', 'utf8');

function append(content) {
  fs.appendFileSync(targetPath, content, 'utf8');
}

console.log('Building DATA_LAYER_REFERENCE.md...');

const genPart1 = require('./gen_part1');
const genPart1Batches = require('./gen_part1_batches');
const genPart2 = require('./gen_part2');
const genPart3 = require('./gen_part3');
const genPart4 = require('./gen_part4');
const genPart5 = require('./gen_part5');

genPart1(append);
genPart1Batches(append);
genPart2(append);
genPart3(append);
genPart4(append);
genPart5(append);

const stats = fs.statSync(targetPath);
console.log(`DATA_LAYER_REFERENCE.md generated successfully! Size: ${stats.size} bytes`);
