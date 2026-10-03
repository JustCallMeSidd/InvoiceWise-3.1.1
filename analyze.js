const fs = require('fs');
const serverCode = fs.readFileSync('server.js', 'utf8');
const routeRegex = /app\.(get|post|put|delete)\(['"](\/api\/[^'"]+)['"]/g;
let match;
const backendRoutes = new Set();
while ((match = routeRegex.exec(serverCode)) !== null) {
  backendRoutes.add(match[1].toUpperCase() + ' ' + match[2]);
}

const appCode = fs.readFileSync('public/app.js', 'utf8');
const frontendRegex = /api\(['"]([^'"]+)['"]/g;
const frontendMatches = new Set();
while ((match = frontendRegex.exec(appCode)) !== null) {
  let endpoint = match[1];
  frontendMatches.add(endpoint);
}

const fetchRegex = /fetch\(['"]([^'"]+)['"]/g;
while ((match = fetchRegex.exec(appCode)) !== null) {
  frontendMatches.add(match[1]);
}

console.log('Backend routes:', backendRoutes.size);
console.log([...backendRoutes].sort());
console.log('Frontend calls:', frontendMatches.size);
console.log([...frontendMatches].sort());
