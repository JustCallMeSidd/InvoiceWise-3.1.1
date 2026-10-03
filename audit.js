const fs = require('fs');

const path = 'C:\\Users\\siddharth gupta\\.gemini\\antigravity\\scratch\\invoicewise\\public\\app.js';
const code = fs.readFileSync(path, 'utf8');
const lines = code.split('\n');

const issues = [];

function check(regex, description, severity, multiline = false) {
    if (multiline) {
        let match;
        while ((match = regex.exec(code)) !== null) {
            const lineNo = code.substring(0, match.index).split('\n').length;
            issues.push({ line: lineNo, code: match[0].substring(0, 100), desc: description, severity: severity });
        }
    } else {
        lines.forEach((line, i) => {
            if (regex.test(line)) {
                issues.push({ line: i + 1, code: line.trim().substring(0, 100), desc: description, severity: severity });
            }
        });
    }
}

// 1. Dead Code
check(/\/\/.*(TODO|FIXME|HACK)/i, 'TODO/FIXME/HACK comment', 'LOW');
check(/console\.log/i, 'console.log left in production', 'LOW');
check(/alert\(/i, 'alert() call left in code', 'MEDIUM');
// empty function
check(/function\s+[a-zA-Z0-9_]*\s*\([^\)]*\)\s*\{\s*\}/, 'Empty function body', 'LOW');

// 2. Null Safety
check(/\.includes\(/, 'Potentially unsafe .includes()', 'HIGH');
check(/\.toLowerCase\(/, 'Potentially unsafe .toLowerCase()', 'HIGH');
check(/\.split\(/, 'Potentially unsafe .split()', 'HIGH');
check(/\.map\(/, 'Potentially unsafe .map()', 'HIGH');
check(/\.filter\(/, 'Potentially unsafe .filter()', 'HIGH');

// 3. Event Listeners
check(/\.addEventListener\(/, 'addEventListener call - check if duplicate', 'MEDIUM');
check(/onclick\s*=/, 'onclick assignment - check if duplicate', 'MEDIUM');
check(/innerHTML\s*[\+]=.*onclick/, 'Inline onclick in innerHTML', 'LOW');

fs.writeFileSync('C:\\Users\\siddharth gupta\\.gemini\\antigravity\\scratch\\invoicewise\\audit_results.json', JSON.stringify(issues, null, 2));
