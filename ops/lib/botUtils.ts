/**
 * Bot Simulation Utilities
 * 
 * Shared functions for logging, wallet management, balance monitoring,
 * transaction execution with retry, and strategy helpers.
 */

import { createWalletClient, createPublicClient, http, type Address, type WalletClient, type PublicClient, parseEther, formatEther } from 'viem';
import { privateKeyToAccount, mnemonicToAccount, english } from 'viem/accounts';
import { defineChain } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import { botConfig } from '../bots.config';

// Eden Testnet chain definition
export const edenTestnet = defineChain({
  id: 3735928814,
  name: 'Eden Testnet',
  network: 'eden-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Eden ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545'],
    },
    public: {
      http: [process.env.RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://eden-testnet.blockscout.com' },
  },
});

// Wallet with role assignment
export interface BotWallet {
  address: Address;
  privateKey: `0x${string}`;
  role: 'lender' | 'borrower' | 'vaultUser' | 'oracle' | 'liquidator';
  index: number;
}

// Logger colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  purple: '\x1b[35m',
  orange: '\x1b[38;5;208m',
  gray: '\x1b[90m',
};

const roleColors: Record<BotWallet['role'], string> = {
  lender: colors.green,
  borrower: colors.blue,
  vaultUser: colors.purple,
  oracle: colors.orange,
  liquidator: colors.red,
};

/**
 * Create a logger with color-coded output
 */
export function createLogger(role: BotWallet['role'], agentIndex: number) {
  const roleColor = roleColors[role];
  const prefix = `${roleColor}[${role.toUpperCase()} #${agentIndex}]${colors.reset}`;
  
  const log = (level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string) => {
    const timestamp = new Date().toISOString();
    const levelColor = {
      INFO: colors.gray,
      SUCCESS: colors.green,
      WARNING: colors.yellow,
      ERROR: colors.red,
    }[level];
    
    const logLine = `${colors.gray}${timestamp}${colors.reset} ${prefix} ${levelColor}${level}${colors.reset}: ${message}`;
    
    // Console output
    if (botConfig.logging.console) {
      console.log(logLine);
    }
    
    // File output
    if (botConfig.logging.file) {
      const logDir = path.resolve(process.cwd(), botConfig.logging.logDir);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(logDir, `bots-${today}.log`);
      const plainLine = `${timestamp} [${role.toUpperCase()} #${agentIndex}] ${level}: ${message}\n`;
      fs.appendFileSync(logFile, plainLine);
    }
  };
  
  return {
    info: (msg: string) => log('INFO', msg),
    success: (msg: string) => log('SUCCESS', msg),
    warning: (msg: string) => log('WARNING', msg),
    error: (msg: string) => log('ERROR', msg),
  };
}

/**
 * Generate deterministic wallets from seed phrase
 */
export function generateWallets(countByRole: Record<BotWallet['role'], number>, seedPhrase: string): BotWallet[] {
  const wallets: BotWallet[] = [];
  let globalIndex = 0;
  
  const roles: BotWallet['role'][] = ['lender', 'borrower', 'vaultUser', 'oracle', 'liquidator'];
  
  for (const role of roles) {
    const count = countByRole[role] || 0;
    for (let i = 0; i < count; i++) {
      const account = mnemonicToAccount(seedPhrase, {
        addressIndex: globalIndex,
        changeIndex: 0,
        accountIndex: 0,
      });
      
      wallets.push({
        address: account.address,
        privateKey: account.getHdKey().privateKey ? `0x${Buffer.from(account.getHdKey().privateKey!).toString('hex')}` as `0x${string}` : '0x' as `0x${string}`,
        role,
        index: i,
      });
      
      globalIndex++;
    }
  }
  
  return wallets;
}

/**
 * Save wallets to JSON file
 */
export function saveWallets(wallets: BotWallet[], filepath: string) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, JSON.stringify(wallets, null, 2));
}

/**
 * Load wallets from JSON file
 */
export function loadWallets(filepath: string): BotWallet[] {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Wallet file not found: ${filepath}. Run 'npm run bots:setup' first.`);
  }
  const data = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Check token or ETH balance
 */
export async function checkBalance(
  publicClient: PublicClient,
  wallet: BotWallet,
  tokenAddress?: Address
): Promise<bigint> {
  if (!tokenAddress) {
    // Check ETH balance
    return await publicClient.getBalance({ address: wallet.address });
  }
  
  // Check ERC20 balance
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: [
      {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
    ],
    functionName: 'balanceOf',
    args: [wallet.address],
  });
  
  return balance as bigint;
}

/**
 * Check if wallet needs ETH refill
 */
export function needsRefill(balance: bigint, minETH: string): boolean {
  return balance < parseEther(minETH);
}

/**
 * Refill wallet from deployer account
 */
export async function refillFromDeployer(
  walletClient: WalletClient,
  publicClient: PublicClient,
  targetWallet: BotWallet,
  amount: string,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  logger.info(`Refilling ${amount} ETH from deployer...`);
  
  const hash = await walletClient.sendTransaction({
    to: targetWallet.address,
    value: parseEther(amount),
  });
  
  await publicClient.waitForTransactionReceipt({ hash });
  logger.success(`Refilled ${amount} ETH`);
}

/**
 * Warn if deployer balance is low
 */
export async function warnDeployerLow(
  publicClient: PublicClient,
  deployerAddress: Address,
  minBalance: string,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const balance = await publicClient.getBalance({ address: deployerAddress });
  if (balance < parseEther(minBalance)) {
    logger.warning(`⚠️  Deployer balance low: ${formatEther(balance)} ETH (min: ${minBalance} ETH)`);
  }
}

// Track last mint time per wallet per token to respect cooldowns
const lastMintTimes: Map<string, number> = new Map();

/**
 * Auto-refill token if balance is below threshold
 * Respects faucet cooldown (60s between calls)
 * Returns true if refilled, false if skipped
 */
export async function autoRefillTokenIfLow(
  walletClient: WalletClient,
  publicClient: PublicClient,
  wallet: BotWallet,
  tokenAddress: Address,
  minThreshold: string,
  refillAmount: string,
  logger: ReturnType<typeof createLogger>
): Promise<boolean> {
  // Check current balance
  const balance = await checkBalance(publicClient, wallet, tokenAddress);
  const threshold = parseEther(minThreshold);
  
  if (balance >= threshold) {
    return false; // No refill needed
  }
  
  logger.warning(`Token balance low (${formatEther(balance)}), refilling...`);
  
  // Check cooldown
  const cooldownKey = `${wallet.address}-${tokenAddress}`;
  const lastMint = lastMintTimes.get(cooldownKey) || 0;
  const now = Date.now();
  const timeSinceLastMint = now - lastMint;
  const cooldownMs = 61000; // 61 seconds to be safe
  
  if (timeSinceLastMint < cooldownMs) {
    const waitTime = cooldownMs - timeSinceLastMint;
    logger.info(`Faucet cooldown active, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Check if can mint (contract-level check)
  const faucetAbi = [
    {
      type: 'function',
      name: 'canMint',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'remainingCooldown',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'mint',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ];
  
  const canMint = await publicClient.readContract({
    address: tokenAddress,
    abi: faucetAbi,
    functionName: 'canMint',
    args: [wallet.address],
  }) as boolean;
  
  if (!canMint) {
    const remainingCooldown = await publicClient.readContract({
      address: tokenAddress,
      abi: faucetAbi,
      functionName: 'remainingCooldown',
      args: [wallet.address],
    }) as bigint;
    
    const waitTime = Number(remainingCooldown) * 1000 + 2000; // Add 2s buffer
    logger.info(`Contract cooldown active, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Mint tokens (max 2000 per call)
  const maxPerCall = parseEther('2000');
  const amountToMint = parseEther(refillAmount) > maxPerCall ? maxPerCall : parseEther(refillAmount);
  
  logger.info(`Minting ${formatEther(amountToMint)} tokens from faucet...`);
  
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: faucetAbi,
    functionName: 'mint',
    args: [wallet.address, amountToMint],
  });
  
  await publicClient.waitForTransactionReceipt({ hash });
  
  // Update last mint time
  lastMintTimes.set(cooldownKey, Date.now());
  
  logger.success(`Refilled ${formatEther(amountToMint)} tokens`);
  return true;
}

/**
 * Execute transaction with automatic retry and error handling
 * CRITICAL: All bots must use this for reliable transaction execution
 */
export async function executeWithRetry<T>(
  txFn: () => Promise<T>,
  wallet: BotWallet,
  walletClient: WalletClient,
  publicClient: PublicClient,
  logger: ReturnType<typeof createLogger>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Executing transaction (attempt ${attempt}/${maxRetries})...`);
      const result = await txFn();
      logger.success(`Transaction successful`);
      return result;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || String(error);
      
      // Check for insufficient ETH
      if (errorMsg.includes('insufficient funds') || errorMsg.includes('insufficient balance')) {
        logger.warning(`Insufficient ETH detected, refilling...`);
        const deployerPK = process.env.PRIVATE_KEY;
        if (!deployerPK) {
          throw new Error('PRIVATE_KEY not set in .env');
        }
        
        const deployerAccount = privateKeyToAccount(deployerPK as `0x${string}`);
        const deployerWalletClient = createWalletClient({
          account: deployerAccount,
          chain: edenTestnet,
          transport: http(),
        });
        
        await refillFromDeployer(deployerWalletClient, publicClient, wallet, botConfig.wallets.ethPerWallet, logger);
        
        // Retry immediately after refill
        continue;
      }
      
      // Check for RPC timeout or nonce issues
      if (errorMsg.includes('timeout') || errorMsg.includes('nonce')) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        logger.warning(`${errorMsg.includes('timeout') ? 'Timeout' : 'Nonce issue'} detected, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, log and retry with backoff
      logger.error(`Transaction failed: ${errorMsg}`);
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Mint tokens via faucet, respecting 2000 token limit and 60s cooldown
 */
export async function mintTokensWithFaucet(
  walletClient: WalletClient,
  publicClient: PublicClient,
  wallet: BotWallet,
  tokenAddress: Address,
  totalAmount: string,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const amount = parseEther(totalAmount);
  const maxPerCall = parseEther('2000');
  const cooldownMs = 61000; // 61 seconds to be safe
  
  const faucetAbi = [
    {
      type: 'function',
      name: 'canMint',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'remainingCooldown',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'mint',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ];
  
  let remaining = amount;
  let callCount = 0;
  
  while (remaining > 0n) {
    // Check if we can mint
    const canMint = await publicClient.readContract({
      address: tokenAddress,
      abi: faucetAbi,
      functionName: 'canMint',
      args: [wallet.address],
    }) as boolean;
    
    if (!canMint) {
      const remainingCooldown = await publicClient.readContract({
        address: tokenAddress,
        abi: faucetAbi,
        functionName: 'remainingCooldown',
        args: [wallet.address],
      }) as bigint;
      
      const waitTime = Number(remainingCooldown) * 1000 + 2000; // Add 2s buffer
      logger.info(`Cooldown active. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const mintAmount = remaining > maxPerCall ? maxPerCall : remaining;
    callCount++;
    
    logger.info(`Minting ${formatEther(mintAmount)} tokens (call ${callCount})...`);
    
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: faucetAbi,
      functionName: 'mint',
      args: [wallet.address, mintAmount],
    });
    
    await publicClient.waitForTransactionReceipt({ hash });
    logger.success(`Minted ${formatEther(mintAmount)} tokens`);
    
    remaining -= mintAmount;
    
    // Wait for cooldown if more calls needed
    if (remaining > 0n) {
      logger.info(`Waiting ${cooldownMs / 1000}s for next faucet call...`);
      await new Promise(resolve => setTimeout(resolve, cooldownMs));
    }
  }
  
  logger.success(`Total minted: ${totalAmount} tokens in ${callCount} call(s)`);
}

/**
 * Random number in range [min, max]
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Random delay in milliseconds
 */
export async function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = randomInRange(minMs, maxMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Calculate safe random amount within balance bounds
 */
export function calculateSafeAmount(balance: bigint, minPercent: number, maxPercent: number): bigint {
  const percent = randomInRange(minPercent, maxPercent);
  return (balance * BigInt(Math.floor(percent * 100))) / 10000n;
}

/**
 * Luck draw for probabilistic events (e.g., 0.5% chance)
 */
export function shouldTriggerEvent(probability: number): boolean {
  return Math.random() < probability;
}

