#!/usr/bin/env tsx

/**
 * Extract addresses from Forge deployment artifacts
 * This script reads the broadcast artifacts and updates the frontend addresses.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { updateAddresses } from '../lib/updateAddresses.js';

interface ForgeArtifact {
  transactions: Array<{
    contractName: string;
    contractAddress: string;
    transactionType: string;
  }>;
}

function extractAddressFromArtifact(scriptName: string, contractName: string): string | null {
  const artifactPath = join(process.cwd(), '../contracts/broadcast', scriptName, '11155111', 'run-latest.json');
  
  if (!existsSync(artifactPath)) {
    console.log(`⚠️  Artifact not found: ${artifactPath}`);
    return null;
  }

  try {
    const artifact: ForgeArtifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
    const deployment = artifact.transactions.find(tx => 
      tx.contractName === contractName && tx.transactionType === 'CREATE'
    );
    
    return deployment?.contractAddress || null;
  } catch (error) {
    console.error(`❌ Error reading artifact ${scriptName}:`, error);
    return null;
  }
}

function extractAllAddresses(): Record<string, string> {
  console.log('🔍 Extracting addresses from Forge artifacts...\n');

  const addresses: Record<string, string> = {};

  // Extract token addresses
  const artifactPath = join(process.cwd(), '../contracts/broadcast/DeployTokens.s.sol/11155111/run-latest.json');
  if (existsSync(artifactPath)) {
    try {
      const artifact: ForgeArtifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
      const tokenDeployments = artifact.transactions.filter(tx => 
        tx.contractName === 'FaucetERC20' && tx.transactionType === 'CREATE'
      );
      
      if (tokenDeployments.length >= 2) {
        addresses.fakeUSD = tokenDeployments[0].contractAddress;
        addresses.fakeTIA = tokenDeployments[1].contractAddress;
        console.log(`✅ fakeUSD: ${addresses.fakeUSD}`);
        console.log(`✅ fakeTIA: ${addresses.fakeTIA}`);
      }
    } catch (error) {
      console.error('❌ Error extracting token addresses:', error);
    }
  }

  // Extract aggregator address
  const aggregatorAddress = extractAddressFromArtifact('DeployAggregator.s.sol', 'SettableAggregator');
  if (aggregatorAddress) {
    addresses.aggregator = aggregatorAddress;
    console.log(`✅ Aggregator: ${aggregatorAddress}`);
  }

  // Extract oracle address
  const oracleAddress = extractAddressFromArtifact('DeployOracle.s.sol', 'OracleFromAggregator');
  if (oracleAddress) {
    addresses.oracle = oracleAddress;
    console.log(`✅ Oracle: ${oracleAddress}`);
  }

  return addresses;
}

async function updateAddressBook() {
  const addresses = extractAllAddresses();
  
  if (Object.keys(addresses).length === 0) {
    console.log('⚠️  No addresses found in Forge artifacts');
    console.log('💡 Make sure contracts are deployed first:');
    console.log('   cd ../contracts');
    console.log('   forge script script/DeployTokens.s.sol --rpc-url $RPC_URL --broadcast');
    console.log('   forge script script/DeployAggregator.s.sol --rpc-url $RPC_URL --broadcast');
    console.log('   forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --broadcast');
    return;
  }

  console.log('\n📝 Updating frontend address book...');

  const updates = [];

  if (addresses.fakeUSD) {
    updates.push({ path: 'tokens.fakeUSD', value: addresses.fakeUSD });
  }
  if (addresses.fakeTIA) {
    updates.push({ path: 'tokens.fakeTIA', value: addresses.fakeTIA });
  }
  if (addresses.aggregator) {
    updates.push({ path: 'oracles.aggregator.address', value: addresses.aggregator });
  }
  if (addresses.oracle) {
    updates.push({ path: 'markets.sandbox.oracle', value: addresses.oracle });
  }

  if (updates.length > 0) {
    try {
      updateAddresses(updates);
      console.log('✅ Address book updated successfully');
    } catch (error) {
      console.error('❌ Failed to update address book:', error);
    }
  }

  console.log('\n🎯 Ready for SDK testing!');
  console.log('   Run: npm run test:morpho-sdk');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateAddressBook().catch(console.error);
}
