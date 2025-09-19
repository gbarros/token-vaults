import { config } from 'dotenv';
import { createWalletClient, createPublicClient, http, type Address, type Chain } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Load environment variables
config();

export const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org';
export const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

// Create account from private key
export const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

// Create clients
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

export const walletClient: ReturnType<typeof createWalletClient> = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
});

export const CHAIN: Chain = sepolia;

console.log(`🔗 Connected to ${CHAIN.name} (${CHAIN.id})`);
console.log(`📍 Account: ${account.address}`);
