import { useReadContract } from 'wagmi';
import { contracts } from '@/lib/contracts';
import { oracleAbi } from '@/lib/abis';

/**
 * Shared hook to read current oracle price
 * Returns the current price from the market's oracle
 * 
 * This is a base hook used by multiple other hooks to avoid duplication
 */
export function useOraclePrice() {
  return useReadContract({
    address: contracts.markets.sandbox.oracle as `0x${string}`,
    abi: oracleAbi,
    functionName: 'price',
    query: {
      refetchInterval: 30000, // 30s - oracle price refresh rate
      staleTime: 15000, // 15s - consider data fresh
    },
  });
}

