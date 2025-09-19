#!/usr/bin/env tsx

/**
 * DEPRECATED: This script is no longer needed
 * Addresses are now read directly from contracts/broadcast artifacts
 * 
 * The frontend uses contracts.ts which automatically reads from Forge deployment artifacts.
 * No manual extraction or config file management is needed.
 */

console.log('❌ DEPRECATED: Address extraction no longer needed');
console.log('   Frontend automatically reads from: contracts/broadcast/*/11155111/run-latest.json');
console.log('   See: frontend/src/lib/contracts.ts');
process.exit(1);
