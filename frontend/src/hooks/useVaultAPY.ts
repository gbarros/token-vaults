import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { useMarketData } from '@/hooks/useMarketData';
import { useVaultAllocation } from '@/hooks/useVaultAllocation';

export function useVaultAPY() {
  const publicClient = usePublicClient();
  const { data: marketData } = useMarketData();
  const { data: allocation } = useVaultAllocation();

  return useQuery({
    queryKey: [
      'vaultAPY', 
      marketData ? {
        ...marketData,
        totalSupplyAssets: marketData.totalSupplyAssets.toString(),
        totalBorrowAssets: marketData.totalBorrowAssets.toString(),
        totalSupplyShares: marketData.totalSupplyShares.toString(),
        totalBorrowShares: marketData.totalBorrowShares.toString(),
        lastUpdate: marketData.lastUpdate.toString(),
        fee: marketData.fee.toString(),
      } : null,
      allocation ? {
        ...allocation,
        totalAssets: allocation.totalAssets.toString(),
        idleAssets: allocation.idleAssets.toString(),
        marketAllocations: allocation.marketAllocations?.map(ma => ({
          ...ma,
          assets: ma.assets.toString(),
          supplyCap: ma.supplyCap.toString(),
        })) || [],
      } : null
    ],
    queryFn: async (): Promise<number> => {
      if (!publicClient || !marketData || !allocation) {
        return 0;
      }

      // Calculate weighted APY based on allocation
      let weightedAPY = 0;
      
      if (allocation.totalAssets > BigInt(0)) {
        // Market allocation APY
        if (allocation.marketAllocations && allocation.marketAllocations.length > 0) {
          const marketAllocation = allocation.marketAllocations[0];
          if (marketAllocation.assets > BigInt(0)) {
            const marketWeight = Number(marketAllocation.assets) / Number(allocation.totalAssets);
            const marketAPY = marketData.supplyAPY || 0;
            weightedAPY += marketWeight * marketAPY;
          }
        }

        // Idle position has 0% APY (already initialized to 0)
      }

      return weightedAPY;
    },
    enabled: !!publicClient && !!marketData && !!allocation,
    refetchInterval: 30000, // 30s - derived data refresh rate
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new data
    staleTime: 15000, // 15s - consider data fresh
  });
}
