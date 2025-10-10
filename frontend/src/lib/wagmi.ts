import { createConfig, http } from 'wagmi';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';
import { createPublicClient, http as viemHttp } from 'viem';

/**
 * Eden Testnet Chain Configuration
 * Single source of truth for chain configuration
 * Can be overridden with environment variables (see frontend/env.example)
 */
export const edenTestnet = {
  id: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '3735928814'),
  name: process.env.NEXT_PUBLIC_CHAIN_NAME || 'Eden Testnet',
  network: 'eden-testnet',
  nativeCurrency: {
    name: process.env.NEXT_PUBLIC_NATIVE_CURRENCY_NAME || 'TIA',
    symbol: process.env.NEXT_PUBLIC_NATIVE_CURRENCY_SYMBOL || 'TIA',
    decimals: parseInt(process.env.NEXT_PUBLIC_NATIVE_CURRENCY_DECIMALS || '18'),
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545'],
      webSocket: ['https://ev-reth-eden-testnet.binarybuilders.services:8546'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545'],
      webSocket: ['https://ev-reth-eden-testnet.binarybuilders.services:8546'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://eden-testnet.blockscout.com',
    },
  },
  testnet: true,
} as const;

// Get project ID from environment (optional for basic setup)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Use local proxy to bypass CORS issues with Eden RPC
// Browser calls -> /api/rpc (HTTP) or /api/rpc-ws (WebSocket) -> Eden RPC
// MetaMask uses its own provider and bypasses this
const USE_WS_PROXY = process.env.NEXT_PUBLIC_USE_WS_PROXY === 'true';
const rpcUrl = typeof window !== 'undefined' 
  ? (USE_WS_PROXY ? '/api/rpc-ws' : '/api/rpc')  // Browser: use Next.js proxy (HTTP or WS)
  : process.env.NEXT_PUBLIC_RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545'; // SSR: use direct

export const config = createConfig({
  chains: [edenTestnet],
  connectors: [
    injected(),
    metaMask(),
    // Only include WalletConnect if project ID is provided
    ...(projectId ? [walletConnect({ 
      projectId,
      metadata: {
        name: 'Morpho Vaults Demo',
        description: 'A demo application for Morpho Vaults on Eden Testnet',
        url: 'https://localhost:3000',
        icons: ['https://avatars.githubusercontent.com/u/86327202?s=200&v=4'],
      },
    })] : []),
  ],
  transports: {
    // IMPORTANT: This transport bypasses CORS by routing through our Next.js proxy
    // However, when MetaMask is connected, wagmi may prefer MetaMask's provider for reads
    // To ensure reads use our proxy, we also export a separate publicClient below
    [edenTestnet.id]: http(rpcUrl, {
      batch: true, // Batch multiple requests into a single HTTP call
    }),
  },
});

/**
 * Public Client for Read Operations
 * 
 * This client ALWAYS uses our proxy for reads, regardless of wallet connection.
 * Use this when you need to ensure reads go through the proxy (to avoid CORS).
 * 
 * Usage in components:
 *   import { publicClient } from '@/lib/wagmi';
 *   const data = await publicClient.readContract({ ... });
 */
export const publicClient = createPublicClient({
  chain: edenTestnet,
  transport: viemHttp(rpcUrl, {
    batch: true,
  }),
});

