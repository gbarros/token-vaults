#!/usr/bin/env tsx

import { formatEther } from 'viem';
import { walletClient, publicClient, account } from '../lib/env.js';
import { updateAddresses, addSource } from '../lib/updateAddresses.js';

// Contract bytecode and ABI
import { readFileSync } from 'fs';
import { join } from 'path';

const CONTRACTS_DIR = '../contracts';

function getContractArtifact(name: string) {
  const artifactPath = join(process.cwd(), CONTRACTS_DIR, 'out', `${name}.sol`, `${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as `0x${string}`,
  };
}

async function deployAggregator() {
  console.log('\n🚀 Deploying SettableAggregator...');
  
  const { abi, bytecode } = getContractArtifact('SettableAggregator');
  
  // Deploy with 8 decimals (standard for price feeds) and description
  const decimals = 8;
  const description = 'fakeTIA/fakeUSD Price Feed';
  
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [decimals, description, account.address],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${hash}`);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success' && receipt.contractAddress) {
    console.log(`✅ SettableAggregator deployed at: ${receipt.contractAddress}`);
    console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
    
    // Set an initial price (e.g., 1 fakeTIA = 5 fakeUSD, with 8 decimals = 500000000)
    console.log('\n📊 Setting initial price...');
    const initialPrice = BigInt(500000000); // 5.00000000 (8 decimals)
    
    const setPriceHash = await walletClient.writeContract({
      address: receipt.contractAddress,
      abi,
      functionName: 'setAnswer',
      args: [initialPrice, BigInt(0), BigInt(0)], // auto-increment roundId, use current timestamp
      account,
      chain: walletClient.chain,
    });
    
    console.log(`📝 Set price transaction: ${setPriceHash}`);
    await publicClient.waitForTransactionReceipt({ hash: setPriceHash });
    console.log(`✅ Initial price set: 1 fakeTIA = 5.00 fakeUSD`);
    
    return { address: receipt.contractAddress, deployHash: hash, setPriceHash };
  } else {
    throw new Error('Failed to deploy SettableAggregator');
  }
}

async function main() {
  console.log('🎯 Deploying price aggregator...');
  console.log(`👤 Deployer: ${account.address}`);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${formatEther(balance)} ETH`);
  
  try {
    const result = await deployAggregator();
    
    // Update addresses.ts
    console.log('\n📝 Updating addresses.ts...');
    updateAddresses([
      { path: 'oracles.aggregator.address', value: result.address },
    ]);
    
    // Add sources
    addSource('aggregator_deploy', `https://sepolia.etherscan.io/tx/${result.deployHash}`);
    addSource('aggregator_init_price', `https://sepolia.etherscan.io/tx/${result.setPriceHash}`);
    
    console.log('\n🎉 Aggregator deployment complete!');
    console.log(`📍 Address: ${result.address}`);
    console.log(`📊 Initial price: 1 fakeTIA = 5.00 fakeUSD`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
