/**
 * Bot Wallet Setup Script
 * 
 * Generates or loads bot wallets and funds them from the deployer account.
 * Wallets are saved with role assignments for restart/recovery.
 * 
 * Usage: npm run bots:setup
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import {
  edenTestnet,
  generateWallets,
  saveWallets,
  loadWallets,
  checkBalance,
  createLogger,
  warnDeployerLow,
  mintTokensWithFaucet,
  type BotWallet,
} from '../../lib/botUtils';
import { botConfig } from '../../bots.config';

// Load environment variables
dotenv.config();

const WALLET_FILE = path.resolve(process.cwd(), 'temp', 'bot-wallets.json');

async function main() {
  console.log('🤖 Bot Wallet Setup\n');
  
  // Validate environment
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in .env');
  }
  if (!process.env.LOAN_TOKEN || !process.env.COLLATERAL_TOKEN) {
    throw new Error('LOAN_TOKEN and COLLATERAL_TOKEN must be set in .env (run deployment scripts first)');
  }
  
  const deployerAccount = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({
    chain: edenTestnet,
    transport: http(),
  });
  const deployerWalletClient = createWalletClient({
    account: deployerAccount,
    chain: edenTestnet,
    transport: http(),
  });
  
  const logger = createLogger('oracle', 0); // Use oracle logger for setup
  
  logger.info('Deployer address: ' + deployerAccount.address);
  
  // Check deployer balance
  const deployerBalance = await publicClient.getBalance({ address: deployerAccount.address });
  logger.info(`Deployer balance: ${formatEther(deployerBalance)} ETH`);
  
  if (deployerBalance < parseEther('0.5')) {
    logger.warning('⚠️  Deployer balance is low! Consider adding more ETH.');
  }
  
  // Determine wallet count by role from config
  const countByRole: Record<BotWallet['role'], number> = {
    lender: botConfig.lenders.enabled ? botConfig.lenders.agentCount : 0,
    borrower: botConfig.borrowers.enabled ? botConfig.borrowers.agentCount : 0,
    vaultUser: botConfig.vaultUsers.enabled ? botConfig.vaultUsers.agentCount : 0,
    oracle: botConfig.oracleChangers.enabled ? botConfig.oracleChangers.agentCount : 0,
    liquidator: botConfig.liquidators.enabled ? botConfig.liquidators.agentCount : 0,
  };
  
  const totalCount = Object.values(countByRole).reduce((sum, count) => sum + count, 0);
  logger.info(`Total agents needed: ${totalCount}`);
  logger.info(`  - Lenders: ${countByRole.lender}`);
  logger.info(`  - Borrowers: ${countByRole.borrower}`);
  logger.info(`  - Vault Users: ${countByRole.vaultUser}`);
  logger.info(`  - Oracle Changers: ${countByRole.oracle}`);
  logger.info(`  - Liquidators: ${countByRole.liquidator}\n`);
  
  // Generate or load wallets
  let wallets: BotWallet[];
  if (fs.existsSync(WALLET_FILE)) {
    logger.info('Loading existing wallets from ' + WALLET_FILE);
    wallets = loadWallets(WALLET_FILE);
    
    // Verify wallet count matches config
    const existingByRole = wallets.reduce((acc, w) => {
      acc[w.role] = (acc[w.role] || 0) + 1;
      return acc;
    }, {} as Record<BotWallet['role'], number>);
    
    const mismatch = Object.keys(countByRole).some(role => {
      const r = role as BotWallet['role'];
      return countByRole[r] !== (existingByRole[r] || 0);
    });
    
    if (mismatch) {
      logger.warning('Wallet count mismatch! Regenerating wallets...');
      wallets = generateWallets(countByRole, botConfig.wallets.seedPhrase);
      saveWallets(wallets, WALLET_FILE);
      logger.success('Wallets regenerated and saved');
    } else {
      logger.success('Wallets loaded successfully');
    }
  } else {
    logger.info('Generating new wallets...');
    wallets = generateWallets(countByRole, botConfig.wallets.seedPhrase);
    saveWallets(wallets, WALLET_FILE);
    logger.success('Wallets generated and saved to ' + WALLET_FILE);
  }
  
  console.log('\n📋 Wallet Summary:\n');
  console.log('Role'.padEnd(15) + 'Index'.padEnd(8) + 'Address');
  console.log('-'.repeat(70));
  for (const wallet of wallets) {
    console.log(
      wallet.role.padEnd(15) +
      `#${wallet.index}`.padEnd(8) +
      wallet.address
    );
  }
  
  console.log('\n💰 Funding wallets in 2 phases...\n');
  console.log('ℹ️  Phase 1: Send ETH sequentially (all from deployer = same nonce)');
  console.log('ℹ️  Phase 2: Mint tokens in parallel (each wallet uses own nonce)\n');

  const loanToken = process.env.LOAN_TOKEN as Address;
  const collateralToken = process.env.COLLATERAL_TOKEN as Address;

  // === PHASE 1: Send ETH to all wallets SEQUENTIALLY ===
  // All transactions come from deployer, so must be sequential to avoid nonce conflicts
  console.log('🔄 Phase 1: Distributing ETH (sequential)...\n');

  const ethResults = [];
  for (const wallet of wallets) {
    const roleLogger = createLogger(wallet.role, wallet.index);
    
    try {
      const ethBalance = await checkBalance(publicClient, wallet);
      const targetETH = parseEther(botConfig.wallets.ethPerWallet);
      const minETH = (targetETH * 8n) / 10n; // 80% threshold
      
      if (ethBalance < minETH) {
        const ethToSend = targetETH - ethBalance;
        roleLogger.info(`Sending ${formatEther(ethToSend)} ETH...`);
        
        const hash = await deployerWalletClient.sendTransaction({
          to: wallet.address,
          value: ethToSend,
          maxFeePerGas: parseEther('0.000000001'), // 1 gwei
          maxPriorityFeePerGas: parseEther('0.000000001'),
        });
        await publicClient.waitForTransactionReceipt({ hash });
        roleLogger.success('ETH sent');
        ethResults.push({ wallet, success: true });
      } else {
        roleLogger.info(`ETH balance sufficient: ${formatEther(ethBalance)} ETH`);
        ethResults.push({ wallet, success: true });
      }
    } catch (error: any) {
      roleLogger.error(`ETH transfer failed: ${error.message}`);
      ethResults.push({ wallet, success: false, error: error.message });
    }
  }
  
  const ethFailures = ethResults.filter(r => !r.success);
  if (ethFailures.length > 0) {
    console.log(`\n⚠️  ${ethFailures.length} wallet(s) failed to receive ETH. They will be skipped in Phase 2.\n`);
  } else {
    console.log('\n✅ Phase 1 complete: All wallets have ETH\n');
  }
  
  // === PHASE 2: Mint tokens for all wallets in parallel ===
  console.log('🔄 Phase 2: Minting tokens for all wallets...\n');
  
  const successfulWallets = ethResults.filter(r => r.success).map(r => r.wallet);
  
  const fundingPromises = successfulWallets.map(async (wallet) => {
    const roleLogger = createLogger(wallet.role, wallet.index);
    
    try {
      // Create wallet client for this bot
      const account = privateKeyToAccount(wallet.privateKey);
      const botWalletClient = createWalletClient({
        account,
        chain: edenTestnet,
        transport: http(process.env.RPC_URL),
      });
      
      // Check current token balances
      const usdBalance = await checkBalance(publicClient, wallet, loanToken);
      const tiaBalance = await checkBalance(publicClient, wallet, collateralToken);
      
      // Fund fakeUSD if needed
      if (usdBalance < parseEther(botConfig.wallets.tokensPerWallet)) {
        await mintTokensWithFaucet(
          botWalletClient,
          publicClient,
          wallet,
          loanToken,
          botConfig.wallets.tokensPerWallet,
          roleLogger
        );
      } else {
        roleLogger.info('fakeUSD balance sufficient');
      }
      
      // Fund fakeTIA if needed
      if (tiaBalance < parseEther(botConfig.wallets.tokensPerWallet)) {
        await mintTokensWithFaucet(
          botWalletClient,
          publicClient,
          wallet,
          collateralToken,
          botConfig.wallets.tokensPerWallet,
          roleLogger
        );
      } else {
        roleLogger.info('fakeTIA balance sufficient');
      }
      
      roleLogger.success('Wallet funded\n');
      return { wallet, success: true };
      
    } catch (error: any) {
      roleLogger.error(`Token minting failed: ${error.message}`);
      return { wallet, success: false, error: error.message };
    }
  });
  
  // Wait for all token minting operations to complete
  const tokenResults = await Promise.all(fundingPromises);
  
  // Combine results
  const fundingResults = [
    ...ethFailures.map(r => ({ ...r, success: false })),
    ...tokenResults
  ];
  
  // Final deployer balance check
  await warnDeployerLow(
    publicClient,
    deployerAccount.address,
    botConfig.wallets.minDeployerBalance,
    logger
  );
  
  // Display funding summary
  const successCount = fundingResults.filter(r => r.success).length;
  const failCount = fundingResults.filter(r => !r.success).length;
  
  console.log('\n📊 Funding Summary\n');
  console.log(`Total wallets: ${wallets.length}`);
  console.log(`✅ Successfully funded: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
    console.log('\nFailed wallets:');
    fundingResults.filter(r => !r.success).forEach(result => {
      console.log(`  ${result.wallet.role} #${result.wallet.index} (${result.wallet.address})`);
      console.log(`    Error: ${result.error?.substring(0, 100)}...`);
    });
  }
  
  console.log('\n✅ Setup complete!\n');
  console.log('Wallets saved to:', WALLET_FILE);
  console.log('Run individual bots with:');
  console.log('  npm run bots:lenders');
  console.log('  npm run bots:borrowers');
  console.log('  npm run bots:vault:users');
  console.log('  npm run bots:oracle');
  console.log('  npm run bots:liquidators');
  console.log('\nOr run all bots with:');
  console.log('  npm run bots:all\n');
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});

