import { useReadContract } from 'wagmi';
import { contracts, getMarketParams } from '@/lib/contracts';
import { morphoBlueAbi } from '@/lib/abis';

/**
 * Shared hook to read raw market data from Morpho Blue Core
 * Returns the market tuple: [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
 * 
 * This is a base hook used by multiple other hooks to avoid duplication
 */
export function useMarketDataRaw() {
  const marketParams = getMarketParams();
  
  return useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'market',
    args: marketParams ? [marketParams.id as `0x${string}`] : undefined,
    query: {
      enabled: !!marketParams,
      refetchInterval: 30000, // 30s - market data refresh rate
      staleTime: 15000, // 15s - consider data fresh
    },
  });
}

