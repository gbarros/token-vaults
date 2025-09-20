import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { vaults } from '@/lib/contracts';
import { metaMorphoAbi } from '@/lib/abis';

export interface VaultData {
  totalAssets: bigint;
  totalSupply: bigint;
  owner: string;
  curator: string;
  guardian: string;
  fee: bigint;
  lastUpdate: bigint;
  userShares?: bigint;
  userAssets?: bigint;
  maxDeposit?: bigint;
  maxWithdraw?: bigint;
}

export function useVaultData() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['vaultData', vaults.metaMorphoDemo.address, address],
    queryFn: async (): Promise<VaultData> => {
      if (!publicClient || !vaults.metaMorphoDemo.address) {
        throw new Error('Public client or vault address not available');
      }

      const vaultAddress = vaults.metaMorphoDemo.address as `0x${string}`;

      // Batch read vault data
      const [
        totalAssets,
        totalSupply,
        owner,
        curator,
        guardian,
        fee,
        userShares,
        userAssets,
        maxDeposit,
        maxWithdraw,
      ] = await Promise.all([
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'totalAssets',
        }),
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'owner',
        }),
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'curator',
        }),
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'guardian',
        }),
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'fee',
        }),
        // User-specific data (only if address is available)
        address ? publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'balanceOf',
          args: [address],
        }) : Promise.resolve(BigInt(0)),
        address ? publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'convertToAssets',
          args: [await publicClient.readContract({
            address: vaultAddress,
            abi: metaMorphoAbi,
            functionName: 'balanceOf',
            args: [address],
          })],
        }) : Promise.resolve(BigInt(0)),
        address ? publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'maxDeposit',
          args: [address],
        }) : Promise.resolve(BigInt(0)),
        address ? publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'maxWithdraw',
          args: [address],
        }) : Promise.resolve(BigInt(0)),
      ]);

      return {
        totalAssets: totalAssets as bigint,
        totalSupply: totalSupply as bigint,
        owner: owner as string,
        curator: curator as string,
        guardian: guardian as string,
        fee: fee as bigint,
        lastUpdate: BigInt(Math.floor(Date.now() / 1000)), // Use current timestamp as fallback
        userShares: userShares as bigint,
        userAssets: userAssets as bigint,
        maxDeposit: maxDeposit as bigint,
        maxWithdraw: maxWithdraw as bigint,
      };
    },
    enabled: !!publicClient && !!vaults.metaMorphoDemo.address,
    refetchInterval: 20000, // Refetch every 20 seconds (less aggressive)
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new data
    staleTime: 8000, // Consider data fresh for 8 seconds
  });
}
