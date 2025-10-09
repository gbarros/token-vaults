import { createConfig, http, type Chain } from 'wagmi';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

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
      url: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://explorer-eden-testnet.binarybuilders.services',
    },
  },
  testnet: true,
} as const satisfies Chain;

// Get project ID from environment (optional for basic setup)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Use local proxy to bypass CORS issues with Eden RPC
// Browser calls -> /api/rpc -> Eden RPC
// MetaMask uses its own provider and bypasses this
const rpcUrl = typeof window !== 'undefined' 
  ? '/api/rpc'  // Browser: use Next.js proxy
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
    [edenTestnet.id]: http(rpcUrl),
  },
});

