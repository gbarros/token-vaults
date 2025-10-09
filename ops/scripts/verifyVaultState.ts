#!/usr/bin/env tsx

/**
 * Comprehensive Vault State Verification Script
 * 
 * This script verifies the actual on-chain state of the MetaMorpho vault
 * and compares it with what the frontend should be displaying.
 * 
 * Usage: npx tsx scripts/verifyVaultState.ts
 */

import { createPublicClient, http, formatEther, formatUnits, parseUnits, type Chain } from 'viem';
import { config } from 'dotenv';

// Load environment variables from contracts/.env
config({ path: '../../contracts/.env' });

// Define Eden Testnet chain
const edenTestnet = {
  id: 3735928814,
  name: 'Eden Testnet',
  network: 'eden-testnet',
  nativeCurrency: {
    name: 'TIA',
    symbol: 'TIA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://ev-reth-eden-testnet.binarybuilders.services:8545'],
    },
    public: {
      http: ['https://ev-reth-eden-testnet.binarybuilders.services:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer-eden-testnet.binarybuilders.services',
    },
  },
  testnet: true,
} as const satisfies Chain;

// Define addresses from deployment artifacts and environment
const addresses = {
  morpho: {
    morphoBlueCore: '0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd' as const,
    adaptiveCurveIRM: '0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92' as const,
  },
  tokens: {
    fakeUSD: process.env.LOAN_TOKEN as `0x${string}`,
    fakeTIA: process.env.COLLATERAL_TOKEN as `0x${string}`,
  },
  vault: process.env.VAULT_ADDRESS as `0x${string}`,
  oracle: process.env.ORACLE_ADDRESS as `0x${string}`,
  market: {
    id: '0x0761d379cc7d1212f71ad42bba304a80f1250baa0ad7a615a2501ac5f0e6ccb5' as const,
  },
};

// Create viem client
const client = createPublicClient({
  chain: edenTestnet,
  transport: http(process.env.RPC_URL || edenTestnet.rpcUrls.default.http[0])
});

// ABI definitions (minimal for what we need)
const morphoBlueAbi = [
  {
    type: 'function',
    name: 'market',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{
      name: 'm',
      type: 'tuple',
      components: [
        { name: 'totalSupplyAssets', type: 'uint128' },
        { name: 'totalSupplyShares', type: 'uint128' },
        { name: 'totalBorrowAssets', type: 'uint128' },
        { name: 'totalBorrowShares', type: 'uint128' },
        { name: 'lastUpdate', type: 'uint128' },
        { name: 'fee', type: 'uint128' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'position',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'user', type: 'address' }
    ],
    outputs: [{
      name: 'p',
      type: 'tuple',
      components: [
        { name: 'supplyShares', type: 'uint256' },
        { name: 'borrowShares', type: 'uint128' },
        { name: 'collateral', type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
  }
] as const;

const metaMorphoAbi = [
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'config',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'cap', type: 'uint184' },
        { name: 'enabled', type: 'bool' },
        { name: 'removableAt', type: 'uint64' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supplyQueue',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supplyQueueLength',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

interface VaultState {
  // Vault basics
  totalAssets: bigint;
  totalSupply: bigint;
  sharePrice: number;
  
  // Vault token balance (idle funds)
  vaultTokenBalance: bigint;
  
  // Market position
  vaultSupplyShares: bigint;
  vaultSupplyAssets: bigint;
  
  // Market data
  marketTotalSupplyAssets: bigint;
  marketTotalSupplyShares: bigint;
  marketTotalBorrowAssets: bigint;
  marketUtilization: number;
  
  // Vault config
  supplyCap: bigint;
  supplyQueueLength: number;
  marketInQueue: boolean;
}

async function verifyVaultState(): Promise<void> {
  console.log('🔍 Comprehensive Vault State Verification\n');
  console.log('📋 Addresses:');
  console.log(`   Vault: ${addresses.vault}`);
  console.log(`   fakeUSD: ${addresses.tokens.fakeUSD}`);
  console.log(`   Morpho Blue: ${addresses.morpho.morphoBlueCore}`);
  console.log(`   Market ID: ${addresses.market.id}\n`);
  
  try {
    // 1. Get vault basic data
    console.log('📊 1. Vault Basic Data');
    const [totalAssets, totalSupply] = await Promise.all([
      client.readContract({
        address: addresses.vault,
        abi: metaMorphoAbi,
        functionName: 'totalAssets',
      }),
      client.readContract({
        address: addresses.vault,
        abi: metaMorphoAbi,
        functionName: 'totalSupply',
      }),
    ]);
    
    const sharePrice = totalSupply > 0n ? Number(totalAssets) / Number(totalSupply) : 1;
    
    console.log(`   Total Assets: ${formatEther(totalAssets)} fakeUSD`);
    console.log(`   Total Supply: ${formatEther(totalSupply)} mdUSD`);
    console.log(`   Share Price: ${sharePrice.toFixed(8)} fakeUSD per mdUSD\n`);
    
    // 2. Get vault token balance (idle funds)
    console.log('💰 2. Idle Funds Check');
    const vaultTokenBalance = await client.readContract({
      address: addresses.tokens.fakeUSD,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [addresses.vault],
    });
    
    console.log(`   Vault fakeUSD Balance (Idle): ${formatEther(vaultTokenBalance)} fakeUSD`);
    
    if (vaultTokenBalance > 0n) {
      console.log(`   ⚠️  WARNING: Vault has ${formatEther(vaultTokenBalance)} idle funds!`);
      console.log(`   💡 These funds are NOT earning yield and should be allocated to markets.`);
    } else {
      console.log(`   ✅ All funds are allocated (no idle balance)`);
    }
    console.log('');
    
    // 3. Get vault position in Morpho Blue market
    console.log('🏦 3. Vault Position in Morpho Blue Market');
    const [vaultPosition, marketData] = await Promise.all([
      client.readContract({
        address: addresses.morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'position',
        args: [addresses.market.id, addresses.vault],
      }),
      client.readContract({
        address: addresses.morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'market',
        args: [addresses.market.id],
      }),
    ]);
    
    const vaultSupplyShares = vaultPosition.supplyShares;
    const marketTotalSupplyAssets = marketData.totalSupplyAssets;
    const marketTotalSupplyShares = marketData.totalSupplyShares;
    const marketTotalBorrowAssets = marketData.totalBorrowAssets;
    
    // Convert vault shares to assets
    const vaultSupplyAssets = marketTotalSupplyShares > 0n 
      ? (vaultSupplyShares * marketTotalSupplyAssets) / marketTotalSupplyShares
      : 0n;
    
    const marketUtilization = marketTotalSupplyAssets > 0n 
      ? (Number(marketTotalBorrowAssets) / Number(marketTotalSupplyAssets)) * 100
      : 0;
    
    console.log(`   Vault Supply Shares: ${formatEther(vaultSupplyShares)}`);
    console.log(`   Vault Supply Assets: ${formatEther(vaultSupplyAssets)} fakeUSD`);
    console.log(`   Market Total Supply: ${formatEther(marketTotalSupplyAssets)} fakeUSD`);
    console.log(`   Market Total Borrow: ${formatEther(marketTotalBorrowAssets)} fakeUSD`);
    console.log(`   Market Utilization: ${marketUtilization.toFixed(2)}%\n`);
    
    // 4. Get vault configuration
    console.log('⚙️  4. Vault Configuration');
    const [supplyCap, supplyQueueLength] = await Promise.all([
      client.readContract({
        address: addresses.vault,
        abi: metaMorphoAbi,
        functionName: 'config',
        args: [addresses.market.id],
      }),
      client.readContract({
        address: addresses.vault,
        abi: metaMorphoAbi,
        functionName: 'supplyQueueLength',
      }),
    ]);
    
    console.log(`   Supply Cap: ${formatEther(supplyCap.cap)} fakeUSD`);
    console.log(`   Supply Queue Length: ${supplyQueueLength}`);
    
    // Check if market is in supply queue
    let marketInQueue = false;
    if (supplyQueueLength > 0n) {
      const firstMarketInQueue = await client.readContract({
        address: addresses.vault,
        abi: metaMorphoAbi,
        functionName: 'supplyQueue',
        args: [0n],
      });
      marketInQueue = firstMarketInQueue === addresses.market.id;
      console.log(`   Market in Supply Queue: ${marketInQueue ? 'YES' : 'NO'}`);
      if (marketInQueue) {
        console.log(`   Queue Position: 0 (first)`);
      }
    } else {
      console.log(`   Market in Supply Queue: NO (queue is empty)`);
    }
    console.log('');
    
    // 5. Data consistency analysis
    console.log('🔍 5. Data Consistency Analysis');
    const calculatedTotalAssets = vaultTokenBalance + vaultSupplyAssets;
    const assetsDifference = totalAssets - calculatedTotalAssets;
    
    console.log(`   Reported Total Assets: ${formatEther(totalAssets)} fakeUSD`);
    console.log(`   Calculated Total Assets: ${formatEther(calculatedTotalAssets)} fakeUSD`);
    console.log(`     = Idle (${formatEther(vaultTokenBalance)}) + Allocated (${formatEther(vaultSupplyAssets)})`);
    console.log(`   Difference: ${formatEther(assetsDifference)} fakeUSD`);
    
    if (assetsDifference === 0n) {
      console.log(`   ✅ Perfect consistency!`);
    } else if (assetsDifference < parseUnits('0.01', 18)) {
      console.log(`   ✅ Minor difference (likely rounding/accrued interest)`);
    } else {
      console.log(`   ⚠️  Significant difference detected!`);
    }
    console.log('');
    
    // 6. Frontend expectations vs reality
    console.log('🖥️  6. Frontend Display Expectations');
    console.log(`   Expected Allocation Strategy:`);
    console.log(`     Market Allocation: ${formatEther(vaultSupplyAssets)} fakeUSD (${vaultSupplyAssets > 0n ? ((Number(vaultSupplyAssets) / Number(totalAssets)) * 100).toFixed(1) : '0'}%)`);
    console.log(`     Idle Position: ${formatEther(vaultTokenBalance)} fakeUSD (${vaultTokenBalance > 0n ? ((Number(vaultTokenBalance) / Number(totalAssets)) * 100).toFixed(1) : '0'}%)`);
    console.log(`   Expected APY: ${marketUtilization > 0 ? '>0%' : '0%'} (based on ${marketUtilization.toFixed(2)}% market utilization)`);
    console.log(`   Expected Admin Status: ${vaultTokenBalance > 0n ? 'Rebalancing Needed' : 'Fully Allocated'}`);
    console.log('');
    
    // 7. Key findings and recommendations
    console.log('📋 7. Key Findings');
    if (vaultTokenBalance > 0n) {
      console.log(`   🔴 ISSUE: Vault has ${formatEther(vaultTokenBalance)} fakeUSD in idle funds`);
      console.log(`   💡 CAUSE: Funds were deposited but not allocated to markets`);
      console.log(`   🔧 SOLUTION: Use the "Rebalance Portfolio" button to allocate idle funds`);
      console.log(`   📊 IMPACT: ${((Number(vaultTokenBalance) / Number(totalAssets)) * 100).toFixed(1)}% of vault is not earning yield`);
    } else {
      console.log(`   ✅ All funds are properly allocated to earning positions`);
    }
    
    if (!marketInQueue && vaultTokenBalance > 0n) {
      console.log(`   🔴 ISSUE: Market not in supply queue but idle funds exist`);
      console.log(`   💡 CAUSE: Supply queue not configured properly`);
      console.log(`   🔧 SOLUTION: Use "Add Market to Supply Queue" button first`);
    }
    
    if (marketUtilization === 0 && vaultSupplyAssets > 0n) {
      console.log(`   ℹ️  INFO: Market has no borrowers (0% utilization)`);
      console.log(`   📊 IMPACT: APY will be 0% until borrowers use the market`);
    }
    
    console.log('\n🎯 Summary:');
    console.log(`   Total Vault Assets: ${formatEther(totalAssets)} fakeUSD`);
    console.log(`   Allocated to Market: ${formatEther(vaultSupplyAssets)} fakeUSD`);
    console.log(`   Idle (Not Earning): ${formatEther(vaultTokenBalance)} fakeUSD`);
    console.log(`   Market Utilization: ${marketUtilization.toFixed(2)}%`);
    console.log(`   Expected APY: ${marketUtilization > 0 ? 'Above 0%' : '0% (no borrowers)'}`);
    
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

// Run the verification
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyVaultState().catch(console.error);
}
