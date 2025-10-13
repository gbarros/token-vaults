/**
 * Vault User Bots
 * 
 * Bots that deposit fakeUSD into MetaMorpho vault and occasionally withdraw.
 * Uses probability-based withdrawal mechanism (default 0.5% chance per cycle).
 * 
 * Usage: npm run bots:vault:users
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  edenTestnet,
  loadWallets,
  createLogger,
  executeWithRetry,
  randomInRange,
  randomDelay,
  checkBalance,
  autoRefillTokenIfLow,
  type BotWallet,
} from '../../lib/botUtils';
import { botConfig } from '../../bots.config';

dotenv.config();

const WALLET_FILE = path.resolve(process.cwd(), 'temp', 'bot-wallets.json');

// Simple ERC-4626 vault ABI (just what we need)
const vaultAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'redeem',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxDeposit',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxRedeem',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

async function runVaultUserBot(wallet: BotWallet) {
  const logger = createLogger(wallet.role, wallet.index);
  
  if (!process.env.VAULT_ADDRESS || !process.env.LOAN_TOKEN) {
    throw new Error('Missing required environment variables');
  }
  
  const vaultAddress = process.env.VAULT_ADDRESS as Address;
  const loanToken = process.env.LOAN_TOKEN as Address;
  
  const account = privateKeyToAccount(wallet.privateKey);
  const publicClient = createPublicClient({
    chain: edenTestnet,
    transport: http(process.env.RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain: edenTestnet,
    transport: http(process.env.RPC_URL),
  });
  
  logger.success('Vault user bot started');
  logger.info(`Wallet: ${wallet.address}`);
  
  let cycleCount = 0;
  const maxCycles = botConfig.execution.maxCycles;
  
  while (maxCycles === 0 || cycleCount < maxCycles) {
    try {
      cycleCount++;
      logger.info(`--- Cycle ${cycleCount} ---`);
      
      // Auto-refill tokens if low and enabled
      if (botConfig.wallets.autoRefill.enabled) {
        await autoRefillTokenIfLow(
          walletClient,
          publicClient,
          wallet,
          loanToken,
          botConfig.wallets.autoRefill.minBalanceThreshold,
          botConfig.wallets.autoRefill.refillAmount,
          logger
        );
      }
      
      // Check fakeUSD balance and vault shares
      const fakeUSDBalance = await checkBalance(publicClient, wallet, loanToken);
      const vaultShares = await publicClient.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'balanceOf',
        args: [wallet.address],
      }) as bigint;
      
      logger.info(`fakeUSD balance: ${formatEther(fakeUSDBalance)}`);
      logger.info(`Vault shares: ${formatEther(vaultShares)}`);
      
      // Determine action: withdraw or deposit
      const shouldWithdraw = Math.random() < botConfig.vaultUsers.withdrawalProbability;
      
      if (shouldWithdraw && vaultShares > 0n) {
        // WITHDRAW ACTION
        logger.info('Withdrawal triggered by probability draw!');
        
        const maxRedeem = await publicClient.readContract({
          address: vaultAddress,
          abi: vaultAbi,
          functionName: 'maxRedeem',
          args: [wallet.address],
        }) as bigint;
        
        if (maxRedeem === 0n) {
          logger.warning('Vault has no liquidity for withdrawal, skipping');
          await randomDelay(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
          continue;
        }
        
        // Withdraw random amount (10% to 50% of shares)
        const minWithdraw = parseEther(botConfig.vaultUsers.minWithdraw);
        const maxWithdraw = parseEther(botConfig.vaultUsers.maxWithdraw);
        let sharesToRedeem = minWithdraw + BigInt(Math.floor(Math.random() * Number(maxWithdraw - minWithdraw)));
        
        // Cap at available shares and maxRedeem
        if (sharesToRedeem > vaultShares) sharesToRedeem = vaultShares;
        if (sharesToRedeem > maxRedeem) sharesToRedeem = maxRedeem;
        
        if (sharesToRedeem === 0n) {
          logger.warning('No shares to redeem, skipping withdrawal');
          await randomDelay(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
          continue;
        }
        
        logger.info(`Redeeming ${formatEther(sharesToRedeem)} shares from vault`);
        
        await executeWithRetry(
          async () => {
            const hash = await walletClient.writeContract({
              address: vaultAddress,
              abi: vaultAbi,
              functionName: 'redeem',
              args: [sharesToRedeem, wallet.address, wallet.address],
            });
            await publicClient.waitForTransactionReceipt({ hash });
          },
          wallet,
          walletClient,
          publicClient,
          logger
        );
        
        logger.success(`Redeemed ${formatEther(sharesToRedeem)} shares`);
        
      } else {
        // DEPOSIT ACTION
        if (fakeUSDBalance < parseEther('10')) {
          logger.warning('Insufficient fakeUSD balance for deposit, skipping cycle');
          await randomDelay(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
          continue;
        }
        
        // Check vault capacity
        const maxDeposit = await publicClient.readContract({
          address: vaultAddress,
          abi: vaultAbi,
          functionName: 'maxDeposit',
          args: [wallet.address],
        }) as bigint;
        
        if (maxDeposit === 0n) {
          logger.warning('Vault at capacity, cannot deposit');
          await randomDelay(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
          continue;
        }
        
        const totalAssets = await publicClient.readContract({
          address: vaultAddress,
          abi: vaultAbi,
          functionName: 'totalAssets',
        }) as bigint;
        
        const utilizationRatio = maxDeposit > 0n ? Number(totalAssets) / Number(maxDeposit) : 0;
        
        if (utilizationRatio > botConfig.vaultUsers.vaultCapacityThreshold) {
          logger.warning(`Vault near capacity (${(utilizationRatio * 100).toFixed(1)}%), pausing deposits`);
          await randomDelay(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
          continue;
        }
        
        // Determine deposit amount
        const minDeposit = parseEther(botConfig.vaultUsers.minDeposit);
        const maxDepositConfig = parseEther(botConfig.vaultUsers.maxDeposit);
        let depositAmount = minDeposit + BigInt(Math.floor(Math.random() * Number(maxDepositConfig - minDeposit)));
        
        // Cap at balance and vault capacity
        if (depositAmount > fakeUSDBalance) depositAmount = fakeUSDBalance;
        if (depositAmount > maxDeposit) depositAmount = maxDeposit;
        
        if (depositAmount === 0n) {
          logger.warning('Calculated deposit amount is 0, skipping');
          await randomDelay(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
          continue;
        }
        
        logger.info(`Depositing ${formatEther(depositAmount)} fakeUSD to vault`);
        
        // Check allowance
        const allowance = await publicClient.readContract({
          address: loanToken,
          abi: [
            {
              type: 'function',
              name: 'allowance',
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
              ],
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
            },
          ],
          functionName: 'allowance',
          args: [wallet.address, vaultAddress],
        }) as bigint;
        
        if (allowance < depositAmount) {
          logger.info('Approving vault to spend fakeUSD...');
          await executeWithRetry(
            async () => {
              const hash = await walletClient.writeContract({
                address: loanToken,
                abi: [
                  {
                    type: 'function',
                    name: 'approve',
                    inputs: [
                      { name: 'spender', type: 'address' },
                      { name: 'amount', type: 'uint256' },
                    ],
                    outputs: [{ name: '', type: 'bool' }],
                    stateMutability: 'nonpayable',
                  },
                ],
                functionName: 'approve',
                args: [vaultAddress, depositAmount * 10n], // Approve 10x for future deposits
              });
              await publicClient.waitForTransactionReceipt({ hash });
            },
            wallet,
            walletClient,
            publicClient,
            logger
          );
          logger.success('Approval granted');
        }
        
        // Deposit to vault
        await executeWithRetry(
          async () => {
            const hash = await walletClient.writeContract({
              address: vaultAddress,
              abi: vaultAbi,
              functionName: 'deposit',
              args: [depositAmount, wallet.address],
            });
            await publicClient.waitForTransactionReceipt({ hash });
          },
          wallet,
          walletClient,
          publicClient,
          logger
        );
        
        logger.success(`Deposited ${formatEther(depositAmount)} fakeUSD`);
      }
      
      // Wait before next action
      const delay = randomInRange(botConfig.vaultUsers.minInterval, botConfig.vaultUsers.maxInterval);
      logger.info(`Waiting ${(delay / 1000).toFixed(0)}s before next cycle\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error: any) {
      logger.error(`Cycle failed: ${error.message}`);
      if (botConfig.execution.stopOnError) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  logger.success('Vault user bot completed all cycles');
}

async function main() {
  console.log('💰 Starting Vault User Bots\n');
  
  const wallets = loadWallets(WALLET_FILE);
  const vaultUserWallets = wallets.filter(w => w.role === 'vaultUser');
  
  if (vaultUserWallets.length === 0) {
    console.log('No vault user wallets found. Run npm run bots:setup first.');
    process.exit(1);
  }
  
  console.log(`Found ${vaultUserWallets.length} vault user wallet(s)\n`);
  
  // Run all vault users in parallel
  await Promise.all(vaultUserWallets.map(wallet => runVaultUserBot(wallet)));
}

main().catch((error) => {
  console.error('Vault user bots failed:', error);
  process.exit(1);
});
