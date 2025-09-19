#!/usr/bin/env tsx

import { parseEther, formatEther } from 'viem';
import { walletClient, publicClient, account } from '../lib/env.js';
import { updateAddresses, addSource } from '../lib/updateAddresses.js';

// Contract bytecode and ABI (we'll get these from forge)
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

async function deployToken(name: string, symbol: string) {
  console.log(`\n🚀 Deploying ${name} (${symbol})...`);
  
  const { abi, bytecode } = getContractArtifact('FaucetERC20');
  
  // Deploy the contract
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [name, symbol, account.address],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${hash}`);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success' && receipt.contractAddress) {
    console.log(`✅ ${name} deployed at: ${receipt.contractAddress}`);
    console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
    
    return { address: receipt.contractAddress, hash };
  } else {
    throw new Error(`Failed to deploy ${name}`);
  }
}

async function main() {
  console.log('🎯 Deploying faucet tokens...');
  console.log(`👤 Deployer: ${account.address}`);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${formatEther(balance)} ETH`);
  
  if (balance < parseEther('0.01')) {
    console.warn('⚠️  Low balance! You may need more ETH for deployment.');
  }
  
  try {
    // Deploy fakeUSD
    const fakeUSDResult = await deployToken('Fake USD', 'fakeUSD');
    
    // Deploy fakeTIA
    const fakeTIAResult = await deployToken('Fake TIA', 'fakeTIA');
    
    // Update addresses.ts
    console.log('\n📝 Updating addresses.ts...');
    updateAddresses([
      { path: 'tokens.fakeUSD', value: fakeUSDResult.address },
      { path: 'tokens.fakeTIA', value: fakeTIAResult.address },
    ]);
    
    // Add sources
    addSource('fakeUSD_deploy', `https://sepolia.etherscan.io/tx/${fakeUSDResult.hash}`);
    addSource('fakeTIA_deploy', `https://sepolia.etherscan.io/tx/${fakeTIAResult.hash}`);
    
    console.log('\n🎉 Token deployment complete!');
    console.log(`📍 fakeUSD: ${fakeUSDResult.address}`);
    console.log(`📍 fakeTIA: ${fakeTIAResult.address}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
