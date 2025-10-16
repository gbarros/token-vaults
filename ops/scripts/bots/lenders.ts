/**
 * Lender Bots
 * 
 * Bots that supply fakeUSD to the Morpho Blue market.
 * Implements random supply amounts with event-driven behavior based on utilization.
 * 
 * Usage: npm run bots:lenders
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { blueAbi } from '@morpho-org/blue-sdk-viem';
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

async function runLenderBot(wallet: BotWallet) {
  const logger = createLogger(wallet.role, wallet.index);
  
  if (!process.env.MORPHO_BLUE_CORE || !process.env.LOAN_TOKEN || !process.env.COLLATERAL_TOKEN || !process.env.ORACLE_ADDRESS || !process.env.IRM_ADDRESS) {
    throw new Error('Missing required environment variables');
  }
  
  const morphoAddress = process.env.MORPHO_BLUE_CORE as Address;
  const loanToken = process.env.LOAN_TOKEN as Address;
  const collateralToken = process.env.COLLATERAL_TOKEN as Address;
  const oracle = process.env.ORACLE_ADDRESS as Address;
  const irm = process.env.IRM_ADDRESS as Address;
  const lltv = BigInt(process.env.LLTV || '800000000000000000');
  
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
  
  logger.success('Lender bot started');
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
      
      // Check fakeUSD balance
      const balance = await checkBalance(publicClient, wallet, loanToken);
      logger.info(`fakeUSD balance: ${formatEther(balance)}`);
      
      if (balance < parseEther('10')) {
        logger.warning('Balance too low to supply, skipping cycle');
        await randomDelay(botConfig.lenders.minInterval, botConfig.lenders.maxInterval);
        continue;
      }
      
      // Check market utilization for event-driven behavior
      const marketParams = {
        loanToken,
        collateralToken,
        oracle,
        irm,
        lltv,
      };
      
      // Compute market ID using keccak256 hash of ABI-encoded market params
      const { keccak256, encodeAbiParameters, parseAbiParameters } = await import('viem');
      const marketId = keccak256(
        encodeAbiParameters(
          parseAbiParameters('address, address, address, address, uint256'),
          [loanToken, collateralToken, oracle, irm, lltv]
        )
      );
      
      const marketData = await publicClient.readContract({
        address: morphoAddress,
        abi: blueAbi,
        functionName: 'market',
        args: [marketId],
      }) as any;
      
      // Market data is returned as a tuple: [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
      const totalSupply = marketData[0] || 0n;
      const totalBorrow = marketData[2] || 0n;
      const utilization = totalSupply > 0n ? Number(totalBorrow) / Number(totalSupply) : 0;
      
      logger.info(`Market utilization: ${(utilization * 100).toFixed(2)}%`);
      
      // Determine supply amount based on strategy and utilization
      let minSupply = parseEther(botConfig.lenders.minSupply);
      let maxSupply = parseEther(botConfig.lenders.maxSupply);
      
      // Event-driven: if utilization > 90%, be more aggressive
      if (utilization > 0.9) {
        logger.info('High utilization detected, increasing supply amounts');
        maxSupply = maxSupply * 15n / 10n; // 1.5x max
      }
      
      const supplyAmount = minSupply + BigInt(Math.floor(Math.random() * Number(maxSupply - minSupply)));
      const actualSupply = supplyAmount > balance ? balance : supplyAmount;
      
      logger.info(`Supplying ${formatEther(actualSupply)} fakeUSD to market`);
      
      // Approve Morpho if needed
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
        args: [wallet.address, morphoAddress],
      }) as bigint;
      
      if (allowance < actualSupply) {
        logger.info('Approving Morpho to spend fakeUSD...');
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
              args: [morphoAddress, actualSupply],
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
      
      // Supply to market
      await executeWithRetry(
        async () => {
          const hash = await walletClient.writeContract({
            address: morphoAddress,
            abi: blueAbi,
            functionName: 'supply',
            args: [
              marketParams as any,
              actualSupply,
              0n,
              wallet.address,
              '0x',
            ],
          });
          await publicClient.waitForTransactionReceipt({ hash });
        },
        wallet,
        walletClient,
        publicClient,
        logger
      );
      
      logger.success(`Supplied ${formatEther(actualSupply)} fakeUSD`);
      
      // Wait before next action
      const delay = randomInRange(botConfig.lenders.minInterval, botConfig.lenders.maxInterval);
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
  
  logger.success('Lender bot completed all cycles');
}

async function main() {
  console.log('🟢 Starting Lender Bots\n');
  
  const wallets = loadWallets(WALLET_FILE);
  const lenderWallets = wallets.filter(w => w.role === 'lender');
  
  if (lenderWallets.length === 0) {
    console.log('No lender wallets found. Run npm run bots:setup first.');
    process.exit(1);
  }
  
  console.log(`Found ${lenderWallets.length} lender wallet(s)\n`);
  
  // Run all lenders in parallel
  await Promise.all(lenderWallets.map(wallet => runLenderBot(wallet)));
}

main().catch((error) => {
  console.error('Lender bots failed:', error);
  process.exit(1);
});

