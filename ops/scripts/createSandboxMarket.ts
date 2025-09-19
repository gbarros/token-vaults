#!/usr/bin/env tsx

import { formatEther, zeroAddress, keccak256, encodeAbiParameters } from 'viem';
import { walletClient, publicClient, account } from '../lib/env.js';
import { updateAddresses, addSource } from '../lib/updateAddresses.js';
import { morphoBlueAbi } from '../lib/abi.js';

// Import addresses - use dynamic import to avoid module resolution issues
// import { addresses } from '../../config/addresses.js';

function computeMarketId(marketParams: {
  loanToken: string;
  collateralToken: string;
  oracle: string;
  irm: string;
  lltv: bigint;
}) {
  // Market ID is keccak256 of encoded market parameters
  const encoded = encodeAbiParameters(
    [
      { type: 'address', name: 'loanToken' },
      { type: 'address', name: 'collateralToken' },
      { type: 'address', name: 'oracle' },
      { type: 'address', name: 'irm' },
      { type: 'uint256', name: 'lltv' },
    ],
    [
      marketParams.loanToken as `0x${string}`,
      marketParams.collateralToken as `0x${string}`,
      marketParams.oracle as `0x${string}`,
      marketParams.irm as `0x${string}`,
      marketParams.lltv,
    ]
  );
  
  return keccak256(encoded);
}

async function createMarket() {
  console.log('\n🚀 Creating Morpho Blue sandbox market...');
  
  // Use dynamic import to avoid module resolution issues
  const { addresses } = await import('../../config/addresses.js');
  
  const morphoBlueAddress = addresses.morpho.morphoBlueCore;
  const loanToken = addresses.tokens.fakeUSD;
  const collateralToken = addresses.tokens.fakeTIA;
  const oracle = addresses.oracles.builtOracle;
  const irm = addresses.morpho.adaptiveCurveIRM;
  const lltv = BigInt(addresses.markets.sandbox.lltv);
  
  // Validate addresses
  const requiredAddresses = {
    morphoBlue: morphoBlueAddress,
    loanToken,
    collateralToken,
    oracle,
    irm,
  };
  
  for (const [name, addr] of Object.entries(requiredAddresses)) {
    if (!addr || addr === zeroAddress) {
      throw new Error(`${name} address not set. Please run previous deployment steps first.`);
    }
  }
  
  console.log(`🏭 Morpho Blue: ${morphoBlueAddress}`);
  console.log(`💰 Loan Token (fakeUSD): ${loanToken}`);
  console.log(`🔒 Collateral Token (fakeTIA): ${collateralToken}`);
  console.log(`📊 Oracle: ${oracle}`);
  console.log(`📈 IRM: ${irm}`);
  console.log(`📊 LLTV: ${(Number(lltv) / 1e18 * 100).toFixed(2)}%`);
  
  const marketParams = {
    loanToken: loanToken as `0x${string}`,
    collateralToken: collateralToken as `0x${string}`,
    oracle: oracle as `0x${string}`,
    irm: irm as `0x${string}`,
    lltv,
  };
  
  // Compute market ID
  const marketId = computeMarketId(marketParams);
  console.log(`🆔 Market ID: ${marketId}`);
  
  // Create the market
  const hash = await walletClient.writeContract({
    address: morphoBlueAddress as `0x${string}`,
    abi: morphoBlueAbi,
    functionName: 'createMarket',
    args: [marketParams],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${hash}`);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log(`✅ Market created successfully`);
    console.log(`🔗 Explorer: https://sepolia.etherscan.io/tx/${hash}`);
    
    return { marketId, hash, marketParams };
  } else {
    throw new Error('Market creation transaction failed');
  }
}

async function main() {
  console.log('🎯 Creating sandbox market...');
  console.log(`👤 Account: ${account.address}`);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${formatEther(balance)} ETH`);
  
  try {
    const result = await createMarket();
    
    // Update addresses.ts
    console.log('\n📝 Updating addresses.ts...');
    updateAddresses([
      { path: 'markets.sandbox.id', value: result.marketId },
      { path: 'markets.sandbox.irm', value: result.marketParams.irm },
      { path: 'markets.sandbox.loanToken', value: result.marketParams.loanToken },
      { path: 'markets.sandbox.collateralToken', value: result.marketParams.collateralToken },
      { path: 'markets.sandbox.oracle', value: result.marketParams.oracle },
    ]);
    
    // Add source
    addSource('market_create', `https://sepolia.etherscan.io/tx/${result.hash}`);
    
    console.log('\n🎉 Market creation complete!');
    console.log(`🆔 Market ID: ${result.marketId}`);
    console.log(`📊 LLTV: ${(Number(result.marketParams.lltv) / 1e18 * 100).toFixed(2)}%`);
    console.log(`💰 Loan: fakeUSD (${result.marketParams.loanToken})`);
    console.log(`🔒 Collateral: fakeTIA (${result.marketParams.collateralToken})`);
    
  } catch (error) {
    console.error('❌ Market creation failed:', error);
    
    if (error instanceof Error && error.message.includes('address not set')) {
      console.log('\n💡 Next steps:');
      console.log('1. Run deployTokens.ts to deploy faucet tokens');
      console.log('2. Run deployAggregator.ts to deploy price aggregator');
      console.log('3. Run buildOracle.ts to build Morpho oracle');
      console.log('4. Update config/addresses.ts with correct Morpho addresses');
      console.log('5. Run this script again');
    }
    
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
