#!/usr/bin/env tsx

import { parseEther } from 'viem';
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

async function deployOracle() {
  console.log('\n🚀 Deploying Oracle from Aggregator...');
  
  // Use dynamic import to avoid module resolution issues
  const { addresses } = await import('../../config/addresses.js');
  
  const aggregatorAddress = addresses.oracles.aggregator.address;
  
  if (!aggregatorAddress) {
    throw new Error('Aggregator address not found. Run deployAggregator.ts first.');
  }
  
  console.log(`📊 Using aggregator: ${aggregatorAddress}`);
  
  const { abi, bytecode } = getContractArtifact('OracleFromAggregator');
  
  // Deploy with 1 hour staleness tolerance
  const maxStaleness = 3600; // 1 hour in seconds
  
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [aggregatorAddress, maxStaleness],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${hash}`);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success' && receipt.contractAddress) {
    console.log(`✅ Oracle deployed at: ${receipt.contractAddress}`);
    console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
    
    // Test the oracle by reading the current price
    try {
      const price = await publicClient.readContract({
        address: receipt.contractAddress,
        abi,
        functionName: 'price',
      });
      
      console.log(`📊 Current price from oracle: ${price.toString()}`);
      
      // Also get aggregator data for debugging
      const aggregatorData = await publicClient.readContract({
        address: receipt.contractAddress,
        abi,
        functionName: 'getAggregatorData',
      });
      
      console.log(`🔍 Aggregator data:`, {
        roundId: aggregatorData[0].toString(),
        answer: aggregatorData[1].toString(),
        decimals: aggregatorData[5].toString(),
      });
      
    } catch (error) {
      console.warn('⚠️  Could not read price from oracle (this might be expected if aggregator has no data yet)');
      console.warn('Error:', error);
    }
    
    return {
      address: receipt.contractAddress,
      hash,
      maxStaleness,
    };
  } else {
    throw new Error('Failed to deploy Oracle');
  }
}

async function main() {
  console.log('🎯 Deploying Oracle contract...');
  console.log(`👤 Deployer: ${account.address}`);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${balance} wei`);
  
  if (balance < parseEther('0.01')) {
    console.warn('⚠️  Low balance! You may need more ETH for deployment.');
  }
  
  try {
    const result = await deployOracle();
    
    // Update addresses.ts
    console.log('\n📝 Updating addresses.ts...');
    updateAddresses([
      { path: 'oracles.builtOracle', value: result.address },
    ]);
    
    // Add sources
    addSource('oracle_deploy', `https://sepolia.etherscan.io/tx/${result.hash}`);
    
    console.log('\n🎉 Oracle deployment complete!');
    console.log(`📍 Address: ${result.address}`);
    console.log(`⏰ Max staleness: ${result.maxStaleness} seconds`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}



