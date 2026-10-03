const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test that app.js exports and functions are properly structured
const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

// Check that functions are defined
assert(appJs.includes('function populateVariantVendorDropdown'), 'populateVariantVendorDropdown defined');
assert(appJs.includes('function onVariantPackagingRMChange'), 'onVariantPackagingRMChange defined');
assert(appJs.includes('function onVariantVendorModeChange'), 'onVariantVendorModeChange defined');

// Check that window exports are present
assert(appJs.includes('window.onVariantVendorModeChange = onVariantVendorModeChange;'), 'window export onVariantVendorModeChange');
assert(appJs.includes('window.onVariantPackagingRMChange = onVariantPackagingRMChange;'), 'window export onVariantPackagingRMChange');
assert(appJs.includes('window.populateVariantVendorDropdown = populateVariantVendorDropdown;'), 'window export populateVariantVendorDropdown');

console.log('✓ All vendor selection functions and window exports are verified!');
