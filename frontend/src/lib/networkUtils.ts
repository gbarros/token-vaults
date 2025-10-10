/**
 * Network Utilities
 * 
 * Helper functions for network detection and switching in MetaMask/Web3 wallets
 */

import { toast } from 'react-hot-toast';

/**
 * Expected chain ID for the application
 */
export const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '3735928814');

/**
 * Check if the current chain matches the expected chain
 */
export function isWrongNetwork(currentChain: { id: number } | undefined): boolean {
  return currentChain !== undefined && currentChain.id !== EXPECTED_CHAIN_ID;
}

/**
 * Get chain configuration for network switching
 */
export function getChainConfig() {
  return {
    chainId: EXPECTED_CHAIN_ID,
    chainIdHex: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
    chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || 'Eden Testnet',
    nativeCurrency: {
      name: process.env.NEXT_PUBLIC_NATIVE_CURRENCY_NAME || 'TIA',
      symbol: process.env.NEXT_PUBLIC_NATIVE_CURRENCY_SYMBOL || 'TIA',
      decimals: parseInt(process.env.NEXT_PUBLIC_NATIVE_CURRENCY_DECIMALS || '18'),
    },
    rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'https://ev-reth-eden-testnet.binarybuilders.services:8545'],
    blockExplorerUrls: [process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://eden-testnet.blockscout.com'],
  };
}

/**
 * Switch to the expected network in MetaMask
 * If the network doesn't exist, prompts to add it
 */
export async function switchToExpectedNetwork(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    toast.error('MetaMask not detected');
    return false;
  }

  const config = getChainConfig();

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: config.chainIdHex }],
    });
    
    toast.success(`Switched to ${config.chainName}`);
    return true;
  } catch (switchError: any) {
    // Error code 4902 means the chain hasn't been added to MetaMask yet
    if (switchError.code === 4902) {
      try {
        // Add the network to MetaMask
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: config.chainIdHex,
              chainName: config.chainName,
              nativeCurrency: config.nativeCurrency,
              rpcUrls: config.rpcUrls,
              blockExplorerUrls: config.blockExplorerUrls,
            },
          ],
        });
        
        toast.success(`Added and switched to ${config.chainName}`);
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        toast.error(`Failed to add ${config.chainName} to MetaMask`);
        return false;
      }
    } else {
      console.error('Failed to switch network:', switchError);
      toast.error(`Failed to switch to ${config.chainName}`);
      return false;
    }
  }
}

/**
 * Get user-friendly network name and info
 */
export function getNetworkInfo(currentChain: { id: number; name?: string } | undefined) {
  const config = getChainConfig();
  
  return {
    current: {
      name: currentChain?.name || 'Unknown Network',
      id: currentChain?.id || 0,
    },
    expected: {
      name: config.chainName,
      id: config.chainId,
    },
  };
}

