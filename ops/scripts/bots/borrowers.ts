/**
 * Borrower Bots
 * 
 * Bots that supply fakeTIA collateral and borrow fakeUSD from Morpho Blue market.
 * Implements mixed strategies: smart borrowers monitor health factor, dumb borrowers act randomly.
 * 
 * Usage: npm run bots:borrowers
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther, type Address, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { blueAbi } from '@morpho-org/blue-sdk-viem';
import { Position, Market, MarketParams as SDKMarketParams } from '@morpho-org/blue-sdk';
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

async function runBorrowerBot(wallet: BotWallet, isSmart: boolean) {
  const logger = createLogger(wallet.role, wallet.index);
  logger.info(`Strategy: ${isSmart ? 'SMART' : 'DUMB'}`);
  
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
  
  logger.success('Borrower bot started');
  logger.info(`Wallet: ${wallet.address}`);
  
  const marketParams = {
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
  };
  
  let cycleCount = 0;
  const maxCycles = botConfig.execution.maxCycles;
  
  while (maxCycles === 0 || cycleCount < maxCycles) {
    try {
      cycleCount++;
      logger.info(`--- Cycle ${cycleCount} ---`);
      
      // Auto-refill tokens if low and enabled
      if (botConfig.wallets.autoRefill.enabled) {
        // Refill fakeUSD (for repayments)
        await autoRefillTokenIfLow(
          walletClient,
          publicClient,
          wallet,
          loanToken,
          botConfig.wallets.autoRefill.minBalanceThreshold,
          botConfig.wallets.autoRefill.refillAmount,
          logger
        );
        
        // Refill fakeTIA (for collateral)
        await autoRefillTokenIfLow(
          walletClient,
          publicClient,
          wallet,
          collateralToken,
          botConfig.wallets.autoRefill.minBalanceThreshold,
          botConfig.wallets.autoRefill.refillAmount,
          logger
        );
      }
      
      // Compute market ID using keccak256 hash of ABI-encoded market params
      const marketId = keccak256(
        encodeAbiParameters(
          parseAbiParameters('address, address, address, address, uint256'),
          [loanToken, collateralToken, oracle, irm, lltv]
        )
      );
      
      // Get current position
      const positionData = await publicClient.readContract({
        address: morphoAddress,
        abi: blueAbi,
        functionName: 'position',
        args: [marketId, wallet.address],
      }) as any;
      
      // Position data is a tuple: [supplyShares, borrowShares, collateral]
      const currentCollateral = positionData[2] || 0n;
      const currentBorrowShares = positionData[1] || 0n;
      
      logger.info(`Current collateral: ${formatEther(currentCollateral)} fakeTIA`);
      logger.info(`Current borrow shares: ${formatEther(currentBorrowShares)}`);
      
      // Get market data
      const marketData = await publicClient.readContract({
        address: morphoAddress,
        abi: blueAbi,
        functionName: 'market',
        args: [marketId],
      }) as any;
      
      // Market data is a tuple: [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
      const totalBorrowAssets = marketData[2] || 0n;
      const totalBorrowShares = marketData[3] || 1n;
      const currentBorrowAssets = currentBorrowShares > 0n ? (currentBorrowShares * totalBorrowAssets) / totalBorrowShares : 0n;
      
      logger.info(`Current borrow: ${formatEther(currentBorrowAssets)} fakeUSD`);
      
      // Smart strategy: monitor health factor
      if (isSmart && currentBorrowAssets > 0n) {
        try {
          // Get oracle price
          const price = await publicClient.readContract({
            address: oracle,
            abi: [
              {
                type: 'function',
                name: 'price',
                inputs: [],
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
              },
            ],
            functionName: 'price',
          }) as bigint;
          
          // Calculate health factor: (collateral * price * lltv) / debt
          // Health factor in WAD (1e18 = 1.0)
          const collateralValue = (currentCollateral * price) / (10n ** 36n); // Oracle price is in 36 decimals
          const maxBorrow = (collateralValue * lltv) / (10n ** 18n);
          const healthFactor = currentBorrowAssets > 0n 
            ? (maxBorrow * (10n ** 18n)) / currentBorrowAssets 
            : (10n ** 18n);
          
          const hf = Number(healthFactor) / 1e18;
          logger.info(`Health factor: ${hf.toFixed(3)}`);
          
          // If HF < minHealthFactor, repay some debt
          if (hf < botConfig.borrowers.minHealthFactor) {
            logger.warning(`Health factor below ${botConfig.borrowers.minHealthFactor}, repaying debt...`);
            
            const repayAmount = currentBorrowAssets / 4n; // Repay 25%
            const fakeUSDBalance = await checkBalance(publicClient, wallet, loanToken);
            const actualRepay = repayAmount > fakeUSDBalance ? fakeUSDBalance : repayAmount;
            
            if (actualRepay > 0n) {
              logger.info(`Repaying ${formatEther(actualRepay)} fakeUSD`);
              
              // Approve if needed
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
              
              if (allowance < actualRepay) {
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
                      args: [morphoAddress, actualRepay],
                    });
                    await publicClient.waitForTransactionReceipt({ hash });
                  },
                  wallet,
                  walletClient,
                  publicClient,
                  logger
                );
              }
              
              // Repay
              await executeWithRetry(
                async () => {
                  const hash = await walletClient.writeContract({
                    address: morphoAddress,
                    abi: blueAbi,
                    functionName: 'repay',
                    args: [marketParams as any, actualRepay, 0n, wallet.address, '0x'],
                  });
                  await publicClient.waitForTransactionReceipt({ hash });
                },
                wallet,
                walletClient,
                publicClient,
                logger
              );
              
              logger.success('Debt repaid, health factor improved');
            }
            
            await randomDelay(botConfig.borrowers.minInterval, botConfig.borrowers.maxInterval);
            continue;
          }
        } catch (error: any) {
          logger.warning(`Could not calculate health factor: ${error.message}`);
        }
      }
      
      // Supply collateral or borrow
      const action = Math.random() < 0.6 ? 'supply' : 'borrow'; // 60% supply, 40% borrow
      
      if (action === 'supply') {
        const tiaBalance = await checkBalance(publicClient, wallet, collateralToken);
        
        if (tiaBalance < parseEther('10')) {
          logger.warning('fakeTIA balance too low');
        } else {
          const supplyAmount = parseEther(randomInRange(50, 500).toFixed(2));
          const actualSupply = supplyAmount > tiaBalance ? tiaBalance : supplyAmount;
          
          logger.info(`Supplying ${formatEther(actualSupply)} fakeTIA collateral`);
          
          // Approve
          const allowance = await publicClient.readContract({
            address: collateralToken,
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
            await executeWithRetry(
              async () => {
                const hash = await walletClient.writeContract({
                  address: collateralToken,
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
          }
          
          // Supply collateral
          await executeWithRetry(
            async () => {
              const hash = await walletClient.writeContract({
                address: morphoAddress,
                abi: blueAbi,
                functionName: 'supplyCollateral',
                args: [marketParams as any, actualSupply, wallet.address, '0x'],
              });
              await publicClient.waitForTransactionReceipt({ hash });
            },
            wallet,
            walletClient,
            publicClient,
            logger
          );
          
          logger.success(`Supplied ${formatEther(actualSupply)} fakeTIA collateral`);
        }
      } else {
        // Borrow action
        if (currentCollateral === 0n) {
          logger.info('No collateral, skipping borrow');
        } else {
          // Calculate max borrow based on collateral
          const price = await publicClient.readContract({
            address: oracle,
            abi: [
              {
                type: 'function',
                name: 'price',
                inputs: [],
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
              },
            ],
            functionName: 'price',
          }) as bigint;
          
          const collateralValue = (currentCollateral * price) / (10n ** 36n);
          const maxBorrow = (collateralValue * lltv) / (10n ** 18n);
          const safeMaxBorrow = isSmart 
            ? (maxBorrow * BigInt(Math.floor(botConfig.borrowers.targetUtilization * 100))) / 100n
            : maxBorrow * 95n / 100n; // Dumb borrows up to 95%
          
          const availableToBorrow = safeMaxBorrow > currentBorrowAssets ? safeMaxBorrow - currentBorrowAssets : 0n;
          
          if (availableToBorrow < parseEther('10')) {
            logger.info('Insufficient borrow capacity');
          } else {
            const borrowAmount = parseEther(randomInRange(10, 200).toFixed(2));
            const actualBorrow = borrowAmount > availableToBorrow ? availableToBorrow : borrowAmount;
            
            logger.info(`Borrowing ${formatEther(actualBorrow)} fakeUSD`);
            
            await executeWithRetry(
              async () => {
                const hash = await walletClient.writeContract({
                  address: morphoAddress,
                  abi: blueAbi,
                  functionName: 'borrow',
                  args: [marketParams as any, actualBorrow, 0n, wallet.address, wallet.address],
                });
                await publicClient.waitForTransactionReceipt({ hash });
              },
              wallet,
              walletClient,
              publicClient,
              logger
            );
            
            logger.success(`Borrowed ${formatEther(actualBorrow)} fakeUSD`);
          }
        }
      }
      
      // Wait before next action
      const delay = randomInRange(botConfig.borrowers.minInterval, botConfig.borrowers.maxInterval);
      logger.info(`Waiting ${(delay / 1000).toFixed(0)}s before next cycle\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error: any) {
      logger.error(`Cycle failed: ${error.message}`);
      if (botConfig.execution.stopOnError) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  logger.success('Borrower bot completed all cycles');
}

async function main() {
  console.log('🔵 Starting Borrower Bots\n');
  
  const wallets = loadWallets(WALLET_FILE);
  const borrowerWallets = wallets.filter(w => w.role === 'borrower');
  
  if (borrowerWallets.length === 0) {
    console.log('No borrower wallets found. Run npm run bots:setup first.');
    process.exit(1);
  }
  
  console.log(`Found ${borrowerWallets.length} borrower wallet(s)\n`);
  
  // Assign smart/dumb strategies based on ratio
  const smartCount = Math.floor(borrowerWallets.length * botConfig.borrowers.smartRatio);
  const strategies = borrowerWallets.map((_, i) => i < smartCount);
  
  console.log(`Smart borrowers: ${smartCount}`);
  console.log(`Dumb borrowers: ${borrowerWallets.length - smartCount}\n`);
  
  // Run all borrowers in parallel
  await Promise.all(
    borrowerWallets.map((wallet, i) => runBorrowerBot(wallet, strategies[i]))
  );
}

main().catch((error) => {
  console.error('Borrower bots failed:', error);
  process.exit(1);
});

