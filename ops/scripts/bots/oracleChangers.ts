/**
 * Oracle Changer Bots
 * 
 * Bots that adjust OracleMock price to simulate market volatility.
 * Uses random walk with configurable bounds and absolute min/max limits.
 * 
 * Usage: npm run bots:oracle
 */

import { createWalletClient, createPublicClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  edenTestnet,
  loadWallets,
  createLogger,
  executeWithRetry,
  randomInRange,
  type BotWallet,
} from '../../lib/botUtils';
import { botConfig } from '../../bots.config';

dotenv.config();

const WALLET_FILE = path.resolve(process.cwd(), 'temp', 'bot-wallets.json');

// OracleMock ABI (just what we need)
const oracleMockAbi = [
  {
    type: 'function',
    name: 'price',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setPrice',
    inputs: [{ name: 'newPrice', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

async function runOracleChangerBot(wallet: BotWallet) {
  const logger = createLogger(wallet.role, wallet.index);
  
  if (!process.env.ORACLE_ADDRESS) {
    throw new Error('Missing required environment variable: ORACLE_ADDRESS');
  }
  
  const oracleAddress = process.env.ORACLE_ADDRESS as Address;
  
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
  
  logger.success('Oracle changer bot started');
  logger.info(`Wallet: ${wallet.address}`);
  logger.info(`Oracle: ${oracleAddress}`);
  logger.info(`Price bounds: $${botConfig.oracleChangers.absoluteMinPrice} - $${botConfig.oracleChangers.absoluteMaxPrice}`);
  logger.info(`Change range: ±${botConfig.oracleChangers.minPriceChange * 100}% to ±${botConfig.oracleChangers.maxPriceChange * 100}%`);
  
  let cycleCount = 0;
  const maxCycles = botConfig.execution.maxCycles;
  
  while (maxCycles === 0 || cycleCount < maxCycles) {
    try {
      cycleCount++;
      logger.info(`--- Cycle ${cycleCount} ---`);
      
      // Read current price (in 36 decimals for Morpho standard)
      const currentPrice = await publicClient.readContract({
        address: oracleAddress,
        abi: oracleMockAbi,
        functionName: 'price',
      }) as bigint;
      
      const currentPriceValue = Number(currentPrice) / 1e36;
      logger.info(`Current price: $${currentPriceValue.toFixed(6)}`);
      
      // Calculate random price change
      const changeDirection = Math.random() < 0.5 ? -1 : 1;
      const changePercent = randomInRange(
        botConfig.oracleChangers.minPriceChange,
        botConfig.oracleChangers.maxPriceChange
      ) * changeDirection;
      
      let newPriceValue = currentPriceValue * (1 + changePercent);
      
      // Apply absolute bounds
      if (newPriceValue < botConfig.oracleChangers.absoluteMinPrice) {
        newPriceValue = botConfig.oracleChangers.absoluteMinPrice;
        logger.warning(`Price hit minimum bound, clamping to $${newPriceValue}`);
      }
      if (newPriceValue > botConfig.oracleChangers.absoluteMaxPrice) {
        newPriceValue = botConfig.oracleChangers.absoluteMaxPrice;
        logger.warning(`Price hit maximum bound, clamping to $${newPriceValue}`);
      }
      
      const newPrice = BigInt(Math.floor(newPriceValue * 1e36));
      const actualChange = ((newPriceValue - currentPriceValue) / currentPriceValue) * 100;
      
      logger.info(`New price: $${newPriceValue.toFixed(6)} (${actualChange > 0 ? '+' : ''}${actualChange.toFixed(2)}%)`);
      
      // Set new price
      await executeWithRetry(
        async () => {
          const hash = await walletClient.writeContract({
            address: oracleAddress,
            abi: oracleMockAbi,
            functionName: 'setPrice',
            args: [newPrice],
          });
          await publicClient.waitForTransactionReceipt({ hash });
        },
        wallet,
        walletClient,
        publicClient,
        logger
      );
      
      logger.success(`Price updated: $${currentPriceValue.toFixed(6)} → $${newPriceValue.toFixed(6)}`);
      
      // Wait before next price change (longer intervals for oracle)
      const delay = randomInRange(botConfig.oracleChangers.minInterval, botConfig.oracleChangers.maxInterval);
      logger.info(`Waiting ${(delay / 1000).toFixed(0)}s before next price change\n`);
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
  
  logger.success('Oracle changer bot completed all cycles');
}

async function main() {
  console.log('🔮 Starting Oracle Changer Bots\n');
  
  const wallets = loadWallets(WALLET_FILE);
  const oracleWallets = wallets.filter(w => w.role === 'oracle');
  
  if (oracleWallets.length === 0) {
    console.log('No oracle wallets found. Run npm run bots:setup first.');
    process.exit(1);
  }
  
  console.log(`Found ${oracleWallets.length} oracle wallet(s)\n`);
  
  // Run all oracle changers in parallel (typically just 1)
  await Promise.all(oracleWallets.map(wallet => runOracleChangerBot(wallet)));
}

main().catch((error) => {
  console.error('Oracle changer bots failed:', error);
  process.exit(1);
});
