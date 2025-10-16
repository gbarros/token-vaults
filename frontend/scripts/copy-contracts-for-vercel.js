#!/usr/bin/env node
/**
 * Copy Contract Artifacts for Vercel Production Build
 * 
 * This script copies only the necessary contract artifacts from the contracts
 * directory to frontend/vercel/contracts/ for production builds on Vercel.
 * 
 * Why? To avoid:
 * - Committing contracts/out/ to git
 * - Setting Vercel root to monorepo root
 * - Slow builds with unnecessary files
 * 
 * Development uses ../../../contracts/ directly via filesystem.
 * Production uses this minimal copy via webpack alias.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = __dirname + '/..';
const CONTRACTS_DIR = path.resolve(FRONTEND_DIR, '../contracts');
const VERCEL_DIR = path.join(FRONTEND_DIR, 'vercel/contracts');

// Files to copy (relative to contracts/ directory)
const FILES_TO_COPY = [
  // Deployment artifacts (addresses)
  'broadcast/DeployTokens.s.sol/3735928814/run-latest.json',
  'broadcast/DeployOracleMock.s.sol/3735928814/run-latest.json',
  'broadcast/DeployAggregator.s.sol/3735928814/run-latest.json',
  'broadcast/DeployOracle.s.sol/3735928814/run-latest.json',
  'broadcast/CreateMarket.s.sol/3735928814/run-latest.json',
  'broadcast/DeployVault.s.sol/3735928814/run-latest.json',
  
  // Contract ABIs
  'out/IIrm.sol/IIrm.json',
  'out/IOracle.sol/IOracle.json',
  'out/FaucetERC20.sol/FaucetERC20.json',
  'out/OracleMock.sol/OracleMock.json',
];

/**
 * Ensure directory exists, creating it recursively if needed
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Copy a single file, creating destination directory if needed
 */
function copyFile(relativePath) {
  const sourcePath = path.join(CONTRACTS_DIR, relativePath);
  const destPath = path.join(VERCEL_DIR, relativePath);
  
  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  Skipping ${relativePath} (not found)`);
    return false;
  }
  
  // Create destination directory
  ensureDir(path.dirname(destPath));
  
  // Copy file
  fs.copyFileSync(sourcePath, destPath);
  console.log(`✓ Copied ${relativePath}`);
  return true;
}

/**
 * Main execution
 */
function main() {
  console.log('📦 Copying contract artifacts for Vercel build...\n');
  
  // Clean existing vercel directory
  if (fs.existsSync(VERCEL_DIR)) {
    console.log('🧹 Cleaning existing vercel directory...');
    fs.rmSync(VERCEL_DIR, { recursive: true, force: true });
  }
  
  // Create fresh vercel directory
  ensureDir(VERCEL_DIR);
  
  // Copy files
  let copied = 0;
  let skipped = 0;
  
  FILES_TO_COPY.forEach(file => {
    if (copyFile(file)) {
      copied++;
    } else {
      skipped++;
    }
  });
  
  console.log(`\n✅ Done! Copied ${copied} files` + (skipped > 0 ? `, skipped ${skipped}` : ''));
  
  if (skipped > 0) {
    console.log('\n⚠️  Some files were not found. This is OK if you haven\'t deployed all contracts yet.');
    console.log('   The frontend will handle missing artifacts gracefully.');
  }
}

// Run
try {
  main();
} catch (error) {
  console.error('❌ Error copying contracts:', error.message);
  process.exit(1);
}

