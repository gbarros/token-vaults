import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { vaults, getMarketParams } from '@/lib/contracts';
import { metaMorphoAbi } from '@/lib/abis';

export interface SupplyCapData {
  supplyCap: bigint;
  pendingCap: {
    value: bigint;
    validAt: bigint;
  } | null;
}

export function useSupplyCap() {
  const publicClient = usePublicClient();
  const marketParams = getMarketParams();

  return useQuery({
    queryKey: [
      'supplyCap', 
      vaults.metaMorphoDemo.address,
      marketParams ? {
        loanToken: marketParams.loanToken,
        collateralToken: marketParams.collateralToken,
        oracle: marketParams.oracle,
        irm: marketParams.irm,
        lltv: marketParams.lltv.toString(),
      } : null
    ],
    queryFn: async (): Promise<SupplyCapData> => {
      if (!publicClient || !vaults.metaMorphoDemo.address || !marketParams) {
        throw new Error('Public client, vault address, or market params not available');
      }

      const vaultAddress = vaults.metaMorphoDemo.address as `0x${string}`;

      // Use the market ID from the Morpho SDK MarketParams instance
      const marketId = marketParams.id as `0x${string}`;

      try {
        // Get current supply cap using market ID
        const configResult = await publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'config',
          args: [marketId],
        }) as readonly [bigint, boolean, bigint]; // [cap, enabled, removableAt]

        const supplyCap = {
          cap: configResult[0],
          enabled: configResult[1],
          removableAt: configResult[2],
        };

        // Get pending cap if any
        let pendingCap = null;
        try {
          const pendingCapData = await publicClient.readContract({
            address: vaultAddress,
            abi: metaMorphoAbi,
            functionName: 'pendingCap',
            args: [marketId],
          }) as readonly [bigint, bigint]; // [value, validAt]

          // Only include pending cap if it's actually pending (validAt > current time)
          if (pendingCapData[1] > BigInt(Math.floor(Date.now() / 1000))) {
            pendingCap = {
              value: pendingCapData[0],
              validAt: pendingCapData[1],
            };
          }
        } catch (error) {
          // No pending cap or error reading it
          console.log('No pending cap or error reading pending cap:', error);
        }

        return {
          supplyCap: supplyCap.cap,
          pendingCap,
        };
      } catch (error) {
        console.error('Error fetching supply cap:', error);
        // Return default values if there's an error
        return {
          supplyCap: BigInt(0),
          pendingCap: null,
        };
      }
    },
    enabled: !!publicClient && !!vaults.metaMorphoDemo.address && !!marketParams,
    refetchInterval: 25000, // Refetch every 25 seconds (less aggressive)
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new data
    staleTime: 12000, // Consider data fresh for 12 seconds
  });
}
