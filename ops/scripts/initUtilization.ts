#!/usr/bin/env tsx

import { formatEther, parseEther, formatUnits } from 'viem';
import { walletClient, publicClient, account } from '../lib/env.js';
import { addSource } from '../lib/updateAddresses.js';
import { morphoBlueAbi, erc20Abi } from '../lib/abi.js';

// Import addresses - use dynamic import to avoid module resolution issues
// import { addresses } from '../../config/addresses.js';

async function initializeUtilization() {
  console.log('\n🚀 Initializing market utilization...');
  
  // Use dynamic import to avoid module resolution issues
  const { addresses } = await import('../../config/addresses.js');
  
  const morphoBlueAddress = addresses.morpho.morphoBlueCore;
  const loanToken = addresses.tokens.fakeUSD;
  const collateralToken = addresses.tokens.fakeTIA;
  const oracle = addresses.oracles.builtOracle;
  const irm = addresses.morpho.adaptiveCurveIRM;
  const lltv = BigInt(addresses.markets.sandbox.lltv);
  
  const marketParams = {
    loanToken: loanToken as `0x${string}`,
    collateralToken: collateralToken as `0x${string}`,
    oracle: oracle as `0x${string}`,
    irm: irm as `0x${string}`,
    lltv,
  };
  
  console.log(`🏭 Market: ${addresses.markets.sandbox.id}`);
  console.log(`💰 Loan Token: ${loanToken}`);
  console.log(`🔒 Collateral Token: ${collateralToken}`);
  
  // Define amounts for demo (small amounts to avoid draining testnet)
  const supplyAmount = parseEther('100'); // 100 fakeUSD to supply
  const collateralAmount = parseEther('50'); // 50 fakeTIA as collateral
  const borrowAmount = parseEther('60'); // 60 fakeUSD to borrow (targeting ~60% utilization)
  
  console.log(`📊 Target setup:`);
  console.log(`   Supply: ${formatEther(supplyAmount)} fakeUSD`);
  console.log(`   Collateral: ${formatEther(collateralAmount)} fakeTIA`);
  console.log(`   Borrow: ${formatEther(borrowAmount)} fakeUSD`);
  console.log(`   Target utilization: ~60%`);
  
  // Check token balances
  const usdBalance = await publicClient.readContract({
    address: loanToken as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  const tiaBalance = await publicClient.readContract({
    address: collateralToken as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  console.log(`\n💰 Current balances:`);
  console.log(`   fakeUSD: ${formatEther(usdBalance)}`);
  console.log(`   fakeTIA: ${formatEther(tiaBalance)}`);
  
  if (usdBalance < supplyAmount) {
    throw new Error(`Insufficient fakeUSD balance. Need ${formatEther(supplyAmount)}, have ${formatEther(usdBalance)}`);
  }
  
  if (tiaBalance < collateralAmount) {
    throw new Error(`Insufficient fakeTIA balance. Need ${formatEther(collateralAmount)}, have ${formatEther(tiaBalance)}`);
  }
  
  const transactions: string[] = [];
  
  // Step 1: Approve tokens
  console.log('\n📝 Step 1: Approving tokens...');
  
  const approveUSDHash = await walletClient.writeContract({
    address: loanToken as `0x${string}`,
    abi: erc20Abi,
    functionName: 'approve',
    args: [morphoBlueAddress as `0x${string}`, supplyAmount],
    account,
    chain: walletClient.chain,
  });
  
  await publicClient.waitForTransactionReceipt({ hash: approveUSDHash });
  transactions.push(approveUSDHash);
  console.log(`✅ Approved fakeUSD: ${approveUSDHash}`);
  
  const approveTIAHash = await walletClient.writeContract({
    address: collateralToken as `0x${string}`,
    abi: erc20Abi,
    functionName: 'approve',
    args: [morphoBlueAddress as `0x${string}`, collateralAmount],
    account,
    chain: walletClient.chain,
  });
  
  await publicClient.waitForTransactionReceipt({ hash: approveTIAHash });
  transactions.push(approveTIAHash);
  console.log(`✅ Approved fakeTIA: ${approveTIAHash}`);
  
  // Step 2: Supply liquidity
  console.log('\n📝 Step 2: Supplying liquidity...');
  
  const supplyHash = await walletClient.writeContract({
    address: morphoBlueAddress as `0x${string}`,
    abi: morphoBlueAbi,
    functionName: 'supply',
    args: [
      marketParams,
      supplyAmount,
      BigInt(0), // shares (0 = calculate from assets)
      account.address,
      '0x', // no callback data
    ],
    account,
    chain: walletClient.chain,
  });
  
  await publicClient.waitForTransactionReceipt({ hash: supplyHash });
  transactions.push(supplyHash);
  console.log(`✅ Supplied ${formatEther(supplyAmount)} fakeUSD: ${supplyHash}`);
  
  // Step 3: Supply collateral
  console.log('\n📝 Step 3: Supplying collateral...');
  
  const supplyCollateralHash = await walletClient.writeContract({
    address: morphoBlueAddress as `0x${string}`,
    abi: morphoBlueAbi,
    functionName: 'supplyCollateral',
    args: [
      marketParams,
      collateralAmount,
      account.address,
      '0x', // no callback data
    ],
    account,
    chain: walletClient.chain,
  });
  
  await publicClient.waitForTransactionReceipt({ hash: supplyCollateralHash });
  transactions.push(supplyCollateralHash);
  console.log(`✅ Supplied ${formatEther(collateralAmount)} fakeTIA collateral: ${supplyCollateralHash}`);
  
  // Step 4: Borrow to create utilization
  console.log('\n📝 Step 4: Borrowing to create utilization...');
  
  const borrowHash = await walletClient.writeContract({
    address: morphoBlueAddress as `0x${string}`,
    abi: morphoBlueAbi,
    functionName: 'borrow',
    args: [
      marketParams,
      borrowAmount,
      BigInt(0), // shares (0 = calculate from assets)
      account.address, // onBehalf
      account.address, // receiver
    ],
    account,
    chain: walletClient.chain,
  });
  
  await publicClient.waitForTransactionReceipt({ hash: borrowHash });
  transactions.push(borrowHash);
  console.log(`✅ Borrowed ${formatEther(borrowAmount)} fakeUSD: ${borrowHash}`);
  
  return transactions;
}

async function main() {
  console.log('🎯 Initializing market utilization...');
  console.log(`👤 Account: ${account.address}`);
  
  // Check ETH balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 ETH Balance: ${formatEther(balance)}`);
  
  try {
    const transactions = await initializeUtilization();
    
    // Add sources for all transactions
    console.log('\n📝 Recording transactions...');
    transactions.forEach((hash, index) => {
      addSource(`init_util_step_${index + 1}`, `https://sepolia.etherscan.io/tx/${hash}`);
    });
    
    console.log('\n🎉 Market utilization initialized!');
    console.log(`📊 Market should now have ~60% utilization`);
    console.log(`📈 Interest should start accruing immediately`);
    console.log(`\n🔗 Transaction hashes:`);
    transactions.forEach((hash, index) => {
      console.log(`   ${index + 1}. ${hash}`);
    });
    
    console.log('\n💡 Next steps:');
    console.log('1. Check market utilization in the frontend');
    console.log('2. Monitor APY changes over time');
    console.log('3. Test vault deposits and withdrawals');
    
  } catch (error) {
    console.error('❌ Utilization initialization failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Insufficient')) {
        console.log('\n💡 Solution: Use the faucet to mint more tokens');
        console.log('   Run: npm run ops:deploy:tokens (if not done)');
        console.log('   Then use the frontend /setup page to mint tokens');
      } else if (error.message.includes('address not set')) {
        console.log('\n💡 Solution: Complete previous deployment steps');
        console.log('   1. Deploy tokens: npm run ops:deploy:tokens');
        console.log('   2. Deploy aggregator: npm run ops:deploy:aggregator');
        console.log('   3. Build oracle: npm run ops:build:oracle');
        console.log('   4. Create market: npm run ops:create:market');
      }
    }
    
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
