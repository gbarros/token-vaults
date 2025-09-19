import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Get project ID from environment (optional for basic setup)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ 
      projectId,
      metadata: {
        name: 'Morpho Vaults Demo',
        description: 'A demo application for Morpho Vaults on Sepolia',
        url: 'https://localhost:3000',
        icons: ['https://avatars.githubusercontent.com/u/86327202?s=200&v=4'],
      },
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});

