import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { erc20Abi } from '@/lib/abis';

export function useTokenBalance(tokenAddress: string | null) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['tokenBalance', tokenAddress, address],
    queryFn: async (): Promise<bigint> => {
      if (!publicClient || !tokenAddress || !address) {
        return BigInt(0);
      }

      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      });

      return balance as bigint;
    },
    enabled: !!publicClient && !!tokenAddress && !!address,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
