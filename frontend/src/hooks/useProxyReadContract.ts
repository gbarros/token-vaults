/**
 * Custom hook for reading contracts using our RPC proxy
 * 
 * This hook ensures all reads go through our Next.js proxy instead of MetaMask's provider,
 * which avoids CORS issues with Eden RPC.
 */

import { useQuery } from '@tanstack/react-query';
import { type Abi, type Address } from 'viem';
import { publicClient } from '@/lib/wagmi';

interface UseProxyReadContractParams<TAbi extends Abi = Abi> {
  address: Address | undefined;
  abi: TAbi;
  functionName: string;
  args?: readonly unknown[];
  query?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  };
}

interface UseProxyReadContractResult<TData = unknown> {
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Read from a contract using our RPC proxy (avoids MetaMask's provider)
 * 
 * This is a drop-in replacement for wagmi's useReadContract that ensures
 * all reads go through our Next.js proxy to bypass CORS issues.
 * 
 * @example
 * const { data, isLoading, error } = useProxyReadContract({
 *   address: '0x...',
 *   abi: myAbi,
 *   functionName: 'balanceOf',
 *   args: [userAddress],
 * });
 */
export function useProxyReadContract<TAbi extends Abi = Abi, TData = unknown>({
  address,
  abi,
  functionName,
  args,
  query,
}: UseProxyReadContractParams<TAbi>): UseProxyReadContractResult<TData> {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['proxyReadContract', address, functionName, args],
    queryFn: async () => {
      if (!address) {
        throw new Error('Contract address is required');
      }

      const result = await publicClient.readContract({
        address,
        abi,
        functionName,
        args,
      } as any);

      return result as TData;
    },
    enabled: query?.enabled !== false && !!address,
    refetchInterval: query?.refetchInterval,
    staleTime: query?.staleTime,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

