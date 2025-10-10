import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { erc20Abi } from '@/lib/abis';

export function useTokenAllowance(tokenAddress: string | null, spenderAddress: string | null) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['tokenAllowance', tokenAddress, spenderAddress, address],
    queryFn: async (): Promise<bigint> => {
      if (!publicClient || !tokenAddress || !spenderAddress || !address) {
        return BigInt(0);
      }

      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, spenderAddress as `0x${string}`],
      });

      return allowance as bigint;
    },
    enabled: !!publicClient && !!tokenAddress && !!spenderAddress && !!address,
    refetchInterval: 10000, // 10s - simple data refresh rate
    staleTime: 5000, // 5s - consider data fresh
  });
}
