import { config } from 'dotenv';
import { createWalletClient, createPublicClient, http, type Address, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Load environment variables
config();

// Define Eden Testnet chain
export const edenTestnet = {
  id: 3735928814,
  name: 'Eden Testnet',
  network: 'eden-testnet',
  nativeCurrency: {
    name: 'TIA',
    symbol: 'TIA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://ev-reth-eden-testnet.binarybuilders.services:8545'],
      webSocket: ['https://ev-reth-eden-testnet.binarybuilders.services:8546'],
    },
    public: {
      http: ['https://ev-reth-eden-testnet.binarybuilders.services:8545'],
      webSocket: ['https://ev-reth-eden-testnet.binarybuilders.services:8546'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer-eden-testnet.binarybuilders.services',
    },
  },
  testnet: true,
} as const satisfies Chain;

export const RPC_URL = process.env.RPC_URL || edenTestnet.rpcUrls.default.http[0];
export const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

// Create account from private key
export const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

// Create clients
export const publicClient = createPublicClient({
  chain: edenTestnet,
  transport: http(RPC_URL),
});

export const walletClient: ReturnType<typeof createWalletClient> = createWalletClient({
  account,
  chain: edenTestnet,
  transport: http(RPC_URL),
});

export const CHAIN: Chain = edenTestnet;

console.log(`🔗 Connected to ${CHAIN.name} (${CHAIN.id})`);
console.log(`📍 Account: ${account.address}`);
