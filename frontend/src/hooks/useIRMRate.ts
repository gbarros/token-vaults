import { useReadContract } from 'wagmi';
import { getMarketParams } from '@/lib/contracts';
import { irmAbi } from '@/lib/abis';

/**
 * Hook to read IRM borrow rate directly from the IRM contract
 * 
 * EDUCATIONAL NOTE: This bypasses the Morpho Blue SDK
 * The SDK's Market class requires `rateAtTarget` (specific to AdaptiveCurveIRM).
 * When `rateAtTarget` is undefined, SDK returns 0 for APY calculations.
 * IRM Mock doesn't have `rateAtTarget` - it uses simple utilization-based math.
 * Solution: Call IRM's borrowRateView() directly using IIrm.sol ABI from Forge artifacts.
 */
export function useIRMRate(marketDataRaw: readonly [bigint, bigint, bigint, bigint, bigint, bigint] | undefined) {
  const marketParams = getMarketParams();

  return useReadContract({
    address: marketParams?.irm as `0x${string}`,
    abi: irmAbi,
    functionName: 'borrowRateView',
    args: marketDataRaw && marketParams ? [
      {
        loanToken: marketParams.loanToken,
        collateralToken: marketParams.collateralToken,
        oracle: marketParams.oracle,
        irm: marketParams.irm,
        lltv: marketParams.lltv,
      },
      {
        totalSupplyAssets: marketDataRaw[0],
        totalSupplyShares: marketDataRaw[1],
        totalBorrowAssets: marketDataRaw[2],
        totalBorrowShares: marketDataRaw[3],
        lastUpdate: marketDataRaw[4],
        fee: marketDataRaw[5],
      },
    ] : undefined,
    query: {
      enabled: !!marketDataRaw && !!marketParams,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 15000, // Consider data fresh for 15 seconds
    },
  });
}

