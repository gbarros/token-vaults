/**
 * Liquidator Bots
 * 
 * Bots that monitor borrower positions and execute profitable liquidations.
 * Checks all known borrower wallets for unhealthy positions (health factor < 1.0).
 * 
 * Usage: npm run bots:liquidators
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther, type Address, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { blueAbi } from '@morpho-org/blue-sdk-viem';
import {
  edenTestnet,
  loadWallets,
  createLogger,
  executeWithRetry,
  checkBalance,
  autoRefillTokenIfLow,
  type BotWallet,
} from '../../lib/botUtils';
import { botConfig } from '../../bots.config';

dotenv.config();

const WALLET_FILE = path.resolve(process.cwd(), 'temp', 'bot-wallets.json');

async function runLiquidatorBot(wallet: BotWallet, borrowerWallets: BotWallet[]) {
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
  
  logger.success('Liquidator bot started');
  logger.info(`Wallet: ${wallet.address}`);
  logger.info(`Monitoring ${borrowerWallets.length} borrower wallet(s)`);
  
  // Compute market ID
  const marketId = keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, address, address, address, uint256'),
      [loanToken, collateralToken, oracle, irm, lltv]
    )
  );
  
  logger.info(`Market ID: ${marketId}`);
  
  let cycleCount = 0;
  const maxCycles = botConfig.execution.maxCycles;
  
  while (maxCycles === 0 || cycleCount < maxCycles) {
    try {
      cycleCount++;
      logger.info(`--- Scan ${cycleCount} ---`);
      
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
      
      // Get market data
      const marketData = await publicClient.readContract({
        address: morphoAddress,
        abi: blueAbi,
        functionName: 'market',
        args: [marketId],
      }) as any;
      
      // Market data tuple: [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
      const totalBorrowAssets = marketData[2] || 0n;
      const totalBorrowShares = marketData[3] || 1n;
      
      // Get oracle price
      const oraclePrice = await publicClient.readContract({
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
      
      logger.info(`Oracle price: $${(Number(oraclePrice) / 1e36).toFixed(6)}`);
      
      let liquidatableCount = 0;
      
      // Scan all borrower positions
      for (const borrower of borrowerWallets) {
        try {
          const positionData = await publicClient.readContract({
            address: morphoAddress,
            abi: blueAbi,
            functionName: 'position',
            args: [marketId, borrower.address],
          }) as any;
          
          // Position tuple: [supplyShares, borrowShares, collateral]
          const borrowShares = positionData[1] || 0n;
          const collateral = positionData[2] || 0n;
          
          if (borrowShares === 0n) continue; // No position
          
          // Calculate borrow amount
          const borrowAssets = (borrowShares * totalBorrowAssets) / totalBorrowShares;
          
          // Calculate health factor
          // HF = (collateral * price * LLTV) / borrowAssets
          // Price is in 36 decimals, we need to scale properly
          // collateral is in 18 decimals (fakeTIA)
          // borrowAssets is in 18 decimals (fakeUSD)
          // price is in 36 decimals (Morpho standard)
          
          // Collateral value in fakeUSD = (collateral * price) / 1e36
          const collateralValueInUSD = (collateral * oraclePrice) / BigInt(1e36);
          
          // Max borrow based on LLTV = collateralValueInUSD * LLTV / 1e18
          const maxBorrow = (collateralValueInUSD * lltv) / BigInt(1e18);
          
          // Health Factor = maxBorrow / borrowAssets
          let healthFactor = 0;
          if (borrowAssets > 0n) {
            healthFactor = Number(maxBorrow * BigInt(1e18) / borrowAssets) / 1e18;
          }
          
          if (healthFactor > 0 && healthFactor < 1.0) {
            liquidatableCount++;
            logger.warning(`🎯 Liquidatable position found!`);
            logger.warning(`  Borrower: ${borrower.address}`);
            logger.warning(`  Collateral: ${formatEther(collateral)} fakeTIA`);
            logger.warning(`  Borrow: ${formatEther(borrowAssets)} fakeUSD`);
            logger.warning(`  Health Factor: ${healthFactor.toFixed(4)}`);
            
            // Check if liquidator has enough fakeUSD to seize
            const liquidatorBalance = await checkBalance(publicClient, wallet, loanToken);
            
            // Liquidation amount should be up to 50% of borrow (typical liquidation close factor)
            const maxLiquidation = borrowAssets / 2n;
            
            if (liquidatorBalance < maxLiquidation) {
              logger.warning(`  Insufficient fakeUSD balance (have ${formatEther(liquidatorBalance)}, need ${formatEther(maxLiquidation)})`);
              continue;
            }
            
            // Estimate profit
            // Seized collateral = (repaidAssets * price) / 1e36 * (1 + liquidationIncentive)
            // For Morpho Blue, liquidation incentive is embedded in LLTV
            // Approximate profit = seized collateral value - repaid amount
            const seizedCollateral = (maxLiquidation * BigInt(1e36)) / oraclePrice;
            const seizedValue = (seizedCollateral * oraclePrice) / BigInt(1e36);
            const profit = seizedValue - maxLiquidation;
            const profitThreshold = parseEther(botConfig.liquidators.minProfitThreshold);
            
            logger.info(`  Estimated profit: ${formatEther(profit)} fakeUSD`);
            
            if (profit < profitThreshold) {
              logger.warning(`  Profit below threshold (${botConfig.liquidators.minProfitThreshold} fakeUSD), skipping`);
              continue;
            }
            
            // Check allowance for Morpho
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
            
            if (allowance < maxLiquidation) {
              logger.info('  Approving Morpho to spend fakeUSD...');
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
                    args: [morphoAddress, maxLiquidation * 2n], // Approve 2x for future liquidations
                  });
                  await publicClient.waitForTransactionReceipt({ hash });
                },
                wallet,
                walletClient,
                publicClient,
                logger
              );
              logger.success('  Approval granted');
            }
            
            // Execute liquidation
            logger.info(`  Executing liquidation of ${formatEther(maxLiquidation)} fakeUSD...`);
            
            await executeWithRetry(
              async () => {
                const hash = await walletClient.writeContract({
                  address: morphoAddress,
                  abi: blueAbi,
                  functionName: 'liquidate',
                  args: [
                    {
                      loanToken,
                      collateralToken,
                      oracle,
                      irm,
                      lltv,
                    } as any,
                    borrower.address,
                    maxLiquidation,
                    0n, // seizedAssets (0 = max)
                    '0x', // data
                  ],
                });
                await publicClient.waitForTransactionReceipt({ hash });
              },
              wallet,
              walletClient,
              publicClient,
              logger
            );
            
            logger.success(`✅ Liquidation successful!`);
            logger.success(`  Repaid: ${formatEther(maxLiquidation)} fakeUSD`);
            logger.success(`  Profit: ~${formatEther(profit)} fakeUSD`);
            
          } else if (healthFactor > 0) {
            // Position exists but healthy
            // Healthy position (uncomment for verbose logging)
            // logger.info(`${borrower.address.substring(0, 10)}... HF: ${healthFactor.toFixed(4)}`);
          }
          
        } catch (error: any) {
          // Silently skip errors (uncomment for debugging)
          // logger.info(`Error checking ${borrower.address}: ${error.message}`);
        }
      }
      
      if (liquidatableCount === 0) {
        logger.info(`No liquidatable positions found`);
      }
      
      // Wait before next scan
      const delay = botConfig.liquidators.checkInterval;
      logger.info(`Waiting ${(delay / 1000).toFixed(0)}s before next scan\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error: any) {
      logger.error(`Scan failed: ${error.message}`);
      if (botConfig.execution.stopOnError) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  logger.success('Liquidator bot completed all cycles');
}

async function main() {
  console.log('⚡ Starting Liquidator Bots\n');
  
  const allWallets = loadWallets(WALLET_FILE);
  const liquidatorWallets = allWallets.filter(w => w.role === 'liquidator');
  const borrowerWallets = allWallets.filter(w => w.role === 'borrower');
  
  if (liquidatorWallets.length === 0) {
    console.log('No liquidator wallets found. Run npm run bots:setup first.');
    process.exit(1);
  }
  
  if (borrowerWallets.length === 0) {
    console.log('Warning: No borrower wallets found. Liquidators have nothing to monitor.');
  }
  
  console.log(`Found ${liquidatorWallets.length} liquidator wallet(s)`);
  console.log(`Monitoring ${borrowerWallets.length} borrower wallet(s)\n`);
  
  // Run all liquidators in parallel
  await Promise.all(liquidatorWallets.map(wallet => runLiquidatorBot(wallet, borrowerWallets)));
}

main().catch((error) => {
  console.error('Liquidator bots failed:', error);
  process.exit(1);
});

