import { useReadContract } from 'wagmi';
import { vaults } from '@/lib/contracts';
import { metaMorphoAbi } from '@morpho-org/blue-sdk-viem';

/**
 * Hook to check the supply queue configuration for the vault
 * 
 * CRITICAL: Supply queue MUST be configured for deposits to work!
 * Without markets in the supply queue, maxDeposit() returns 0 and deposits fail.
 * 
 * See: VAULT-DEPOSIT-INVESTIGATION.md for full details
 */
export function useSupplyQueue() {
  return useReadContract({
    address: vaults.metaMorphoDemo.address as `0x${string}`,
    abi: metaMorphoAbi,
    functionName: 'supplyQueueLength',
    query: {
      enabled: !!vaults.metaMorphoDemo.address,
      refetchInterval: 30000, // 30s - queue doesn't change often
      staleTime: 15000, // 15s - consider data fresh
    },
  });
}

