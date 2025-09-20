import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { markets, morpho } from '@/lib/contracts';
import { morphoBlueAbi, adaptiveCurveIrmAbi } from '@/lib/abis';
import { getMarketParams } from '@/lib/contracts';

export interface MarketData {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
  utilization: number;
  supplyAPY: number;
  borrowAPY: number;
}

export function useMarketData() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['marketData', markets.sandbox.id],
    queryFn: async (): Promise<MarketData> => {
      if (!publicClient || !markets.sandbox.id) {
        throw new Error('Public client or market ID not available');
      }

      const marketParams = getMarketParams();
      if (!marketParams) {
        throw new Error('Market parameters not available');
      }

      // Get market data from Morpho Blue
      const marketData = await publicClient.readContract({
        address: morpho.morphoBlueCore,
        abi: morphoBlueAbi,
        functionName: 'market',
        args: [markets.sandbox.id as `0x${string}`],
      });

      // marketData is a tuple: [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
      const marketTuple = marketData as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
      const market = {
        totalSupplyAssets: marketTuple[0],
        totalSupplyShares: marketTuple[1],
        totalBorrowAssets: marketTuple[2],
        totalBorrowShares: marketTuple[3],
        lastUpdate: marketTuple[4],
        fee: marketTuple[5],
      };

      // Calculate utilization
      const utilization = market.totalSupplyAssets > BigInt(0) 
        ? Number(market.totalBorrowAssets) / Number(market.totalSupplyAssets)
        : 0;

      console.log('Market data debug:', {
        totalSupplyAssets: market.totalSupplyAssets.toString(),
        totalBorrowAssets: market.totalBorrowAssets.toString(),
        utilization: (utilization * 100).toFixed(2) + '%',
        marketId: markets.sandbox.id,
      });

      // Get borrow rate from IRM
      let borrowAPY = 0;
      let supplyAPY = 0;

      try {
        const borrowRate = await publicClient.readContract({
          address: morpho.adaptiveCurveIRM,
          abi: adaptiveCurveIrmAbi,
          functionName: 'borrowRateView',
          args: [
            {
              loanToken: marketParams.loanToken,
              collateralToken: marketParams.collateralToken,
              oracle: marketParams.oracle,
              irm: marketParams.irm,
              lltv: marketParams.lltv,
            },
            market,
          ],
        });

        // Convert from per-second rate to APY
        // borrowRate is in ray (1e27), per second
        const borrowRatePerSecond = Number(borrowRate as bigint) / 1e27;
        const secondsPerYear = 365.25 * 24 * 60 * 60;
        borrowAPY = (Math.pow(1 + borrowRatePerSecond, secondsPerYear) - 1) * 100;

        // Supply APY = Borrow APY * Utilization * (1 - Fee)
        const feeRate = Number(market.fee) / 1e18;
        supplyAPY = borrowAPY * utilization * (1 - feeRate);
        
        console.log('APY calculation debug:', {
          borrowRateRaw: (borrowRate as bigint).toString(),
          borrowRatePerSecond: borrowRatePerSecond,
          borrowAPY: borrowAPY.toFixed(4) + '%',
          utilization: (utilization * 100).toFixed(2) + '%',
          feeRate: (feeRate * 100).toFixed(4) + '%',
          supplyAPY: supplyAPY.toFixed(4) + '%',
        });
      } catch (error) {
        console.error('Could not fetch interest rates:', error);
        console.error('Market params for IRM call:', marketParams);
        console.error('Market data for IRM call:', market);
      }

      return {
        totalSupplyAssets: market.totalSupplyAssets,
        totalSupplyShares: market.totalSupplyShares,
        totalBorrowAssets: market.totalBorrowAssets,
        totalBorrowShares: market.totalBorrowShares,
        lastUpdate: market.lastUpdate,
        fee: market.fee,
        utilization,
        supplyAPY,
        borrowAPY,
      };
    },
    enabled: !!publicClient && !!markets.sandbox.id,
    refetchInterval: 35000, // Refetch every 35 seconds (less aggressive)
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new data
    staleTime: 15000, // Consider data fresh for 15 seconds
  });
}
