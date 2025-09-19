#!/usr/bin/env tsx

import { formatEther, zeroAddress } from 'viem';
import { walletClient, publicClient, account } from '../lib/env.js';
import { updateAddresses, addSource } from '../lib/updateAddresses.js';
import { morphoChainlinkOracleV2FactoryAbi } from '../lib/abi.js';

// Import addresses
import { addresses } from '../../config/addresses.js';

async function buildOracle() {
  console.log('\n🚀 Building Morpho Chainlink Oracle...');
  
  const factoryAddress = addresses.morpho.oracleV2Factory;
  const aggregatorAddress = addresses.oracles.aggregator.address;
  
  if (!factoryAddress || factoryAddress === zeroAddress) {
    throw new Error('OracleV2Factory address not set. Please update addresses.ts with Morpho Sepolia addresses.');
  }
  
  if (!aggregatorAddress) {
    throw new Error('Aggregator address not found. Run deployAggregator.ts first.');
  }
  
  console.log(`🏭 Factory: ${factoryAddress}`);
  console.log(`📊 Aggregator: ${aggregatorAddress}`);
  
  // Build oracle using the factory
  // For a simple price feed, we use the aggregator as both base and quote feeds
  // Parameters for createMorphoChainlinkOracleV2:
  // - baseVault: zero address (no vault)
  // - baseVaultDecimals: 0
  // - baseFeed1: our aggregator (fakeTIA price)
  // - baseFeed2: zero address (no second feed)
  // - baseTokenDecimals: 18 (fakeTIA decimals)
  // - quoteVault: zero address (no vault)
  // - quoteVaultDecimals: 0
  // - quoteFeed1: zero address (fakeUSD is the quote, so no feed needed)
  // - quoteFeed2: zero address
  // - quoteTokenDecimals: 18 (fakeUSD decimals)
  // - salt: random bytes32
  
  const salt = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
  
  const hash = await walletClient.writeContract({
    address: factoryAddress as `0x${string}`,
    abi: morphoChainlinkOracleV2FactoryAbi,
    functionName: 'createMorphoChainlinkOracleV2',
    args: [
      zeroAddress, // baseVault
      BigInt(0), // baseVaultDecimals
      aggregatorAddress as `0x${string}`, // baseFeed1 (our aggregator)
      zeroAddress, // baseFeed2
      BigInt(18), // baseTokenDecimals (fakeTIA)
      zeroAddress, // quoteVault
      BigInt(0), // quoteVaultDecimals
      zeroAddress, // quoteFeed1 (fakeUSD is quote)
      zeroAddress, // quoteFeed2
      BigInt(18), // quoteTokenDecimals (fakeUSD)
      salt,
    ],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${hash}`);
  
  // Wait for confirmation and get the oracle address from logs
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    // The oracle address should be in the transaction logs
    // For now, we'll need to parse the logs or use a different method
    // This is a simplified version - in practice, you'd parse the event logs
    console.log(`✅ Oracle creation transaction confirmed`);
    console.log(`🔗 Explorer: https://sepolia.etherscan.io/tx/${hash}`);
    
    // TODO: Parse logs to get the actual oracle address
    // For now, we'll use a placeholder and note that it needs to be updated manually
    const oracleAddress = '0x0000000000000000000000000000000000000000'; // Placeholder
    
    console.log(`⚠️  Oracle address needs to be extracted from transaction logs`);
    console.log(`📝 Please check the transaction and update addresses.ts manually`);
    
    return { address: oracleAddress, hash };
  } else {
    throw new Error('Oracle creation transaction failed');
  }
}

async function main() {
  console.log('🎯 Building Morpho Chainlink Oracle...');
  console.log(`👤 Account: ${account.address}`);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${formatEther(balance)} ETH`);
  
  try {
    const result = await buildOracle();
    
    // Update addresses.ts (with placeholder for now)
    console.log('\n📝 Updating addresses.ts...');
    updateAddresses([
      { path: 'oracles.builtOracle', value: result.address },
    ]);
    
    // Add source
    addSource('oracle_build', `https://sepolia.etherscan.io/tx/${result.hash}`);
    
    console.log('\n🎉 Oracle build transaction complete!');
    console.log(`📝 Transaction: ${result.hash}`);
    console.log(`⚠️  Please extract the oracle address from the transaction logs and update addresses.ts`);
    
  } catch (error) {
    console.error('❌ Oracle build failed:', error);
    
    if (error instanceof Error && error.message.includes('OracleV2Factory address not set')) {
      console.log('\n💡 Next steps:');
      console.log('1. Find Morpho Sepolia addresses from https://docs.morpho.org/addresses');
      console.log('2. Update config/addresses.ts with the correct addresses');
      console.log('3. Run this script again');
    }
    
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
