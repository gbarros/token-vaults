#!/usr/bin/env tsx

import { parseEther } from 'viem';
import { walletClient, publicClient, account } from '../lib/env.js';

// Contract bytecode and ABI
import { readFileSync } from 'fs';
import { join } from 'path';

// Import addresses
import { addresses } from '../../config/addresses.js';

const CONTRACTS_DIR = '../contracts';

function getContractArtifact(name: string) {
  const artifactPath = join(process.cwd(), CONTRACTS_DIR, 'out', `${name}.sol`, `${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as `0x${string}`,
  };
}

async function mintTokens() {
  console.log('🪙 Minting tokens for utilization initialization...');
  console.log(`👤 Account: ${account.address}`);
  
  const { abi } = getContractArtifact('FaucetERC20');
  
  // Mint fakeUSD
  console.log('\n💰 Minting 200 fakeUSD...');
  const usdHash = await walletClient.writeContract({
    address: addresses.tokens.fakeUSD as `0x${string}`,
    abi,
    functionName: 'mint',
    args: [account.address, parseEther('200')],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${usdHash}`);
  await publicClient.waitForTransactionReceipt({ hash: usdHash });
  console.log('✅ fakeUSD minted successfully');
  
  // Mint fakeTIA
  console.log('\n🔗 Minting 100 fakeTIA...');
  const tiaHash = await walletClient.writeContract({
    address: addresses.tokens.fakeTIA as `0x${string}`,
    abi,
    functionName: 'mint',
    args: [account.address, parseEther('100')],
    account,
    chain: walletClient.chain,
  });
  
  console.log(`📝 Transaction hash: ${tiaHash}`);
  await publicClient.waitForTransactionReceipt({ hash: tiaHash });
  console.log('✅ fakeTIA minted successfully');
  
  // Check balances
  console.log('\n📊 Checking balances...');
  const usdBalance = await publicClient.readContract({
    address: addresses.tokens.fakeUSD as `0x${string}`,
    abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  const tiaBalance = await publicClient.readContract({
    address: addresses.tokens.fakeTIA as `0x${string}`,
    abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  console.log(`💰 fakeUSD balance: ${usdBalance.toString()}`);
  console.log(`🔗 fakeTIA balance: ${tiaBalance.toString()}`);
  
  console.log('\n🎉 Token minting complete!');
  console.log('💡 Now you can run: npm run ops:init:util');
}

async function main() {
  try {
    await mintTokens();
  } catch (error) {
    console.error('❌ Minting failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}



