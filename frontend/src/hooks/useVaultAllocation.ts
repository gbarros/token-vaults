import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { vaults, getMarketParams, contracts, morpho, tokens } from '@/lib/contracts';
import { metaMorphoAbi, morphoBlueAbi, erc20Abi } from '@/lib/abis';

export interface MarketAllocation {
  marketId: string;
  assets: bigint;
  supplyCap: bigint;
}

export interface VaultAllocation {
  totalAssets: bigint;
  idleAssets: bigint;
  marketAllocations: MarketAllocation[];
  supplyQueue: string[];
  withdrawQueue: string[];
}

export function useVaultAllocation() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['vaultAllocation', vaults.metaMorphoDemo.address],
    queryFn: async (): Promise<VaultAllocation> => {
      if (!publicClient || !vaults.metaMorphoDemo.address) {
        throw new Error('Public client or vault address not available');
      }

      const vaultAddress = vaults.metaMorphoDemo.address as `0x${string}`;

      // Get basic vault data
      const [totalAssets, supplyQueue, withdrawQueue, vaultTokenBalance] = await Promise.all([
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'totalAssets',
        }),
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'supplyQueue',
          args: [BigInt(0)], // Get first element
        }).catch(() => null), // Handle if queue is empty
        publicClient.readContract({
          address: vaultAddress,
          abi: metaMorphoAbi,
          functionName: 'withdrawQueue',
          args: [BigInt(0)], // Get first element
        }).catch(() => null), // Handle if queue is empty
        // Get vault's actual token balance (idle assets)
        publicClient.readContract({
          address: tokens.fakeUSD as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [vaultAddress],
        }),
      ]);

      // Get actual market allocation data
      const marketAllocations: MarketAllocation[] = [];
      const marketParams = getMarketParams();
      
      if (marketParams) {
        try {
          // Get the vault's actual position in the Morpho Blue market
          const [position, marketData, supplyCap] = await Promise.all([
            // Get vault's position (supply shares, borrow shares, collateral)
            publicClient.readContract({
              address: morpho.morphoBlueCore,
              abi: morphoBlueAbi,
              functionName: 'position',
              args: [marketParams.id, vaultAddress],
            }),
            // Get market data to convert shares to assets
            publicClient.readContract({
              address: morpho.morphoBlueCore,
              abi: morphoBlueAbi,
              functionName: 'market',
              args: [marketParams.id],
            }),
            // Get supply cap from vault config
            publicClient.readContract({
              address: vaultAddress,
              abi: metaMorphoAbi,
              functionName: 'config',
              args: [marketParams.id],
            }),
          ]);

          // Extract supply shares from position (first element of the tuple)
          const supplyShares = (position as readonly [bigint, bigint, bigint])[0];
          
          // Extract market data
          const [totalSupplyAssets, totalSupplyShares] = marketData as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
          
          console.log('Market allocation debug:', {
            supplyShares: supplyShares.toString(),
            totalSupplyAssets: totalSupplyAssets.toString(),
            totalSupplyShares: totalSupplyShares.toString(),
            vaultAddress,
            marketId: marketParams.id,
          });
          
          // Convert shares to assets: assets = shares * totalSupplyAssets / totalSupplyShares
          let marketAssets = BigInt(0);
          if (totalSupplyShares > BigInt(0) && supplyShares > BigInt(0)) {
            marketAssets = (supplyShares * totalSupplyAssets) / totalSupplyShares;
            console.log('Calculated market assets:', marketAssets.toString());
            console.log('Calculated market assets (formatted):', parseFloat(formatUnits(marketAssets, 18)).toFixed(6) + ' fakeUSD');
          } else {
            console.warn('Zero shares or zero total shares detected');
          }

          // Extract supply cap from config (first element of the tuple)
          const capFromConfig = (supplyCap as readonly [bigint, boolean, bigint])[0];
          
          marketAllocations.push({
            marketId: marketParams.id,
            assets: marketAssets,
            supplyCap: capFromConfig,
          });
        } catch (error) {
          console.error('Could not fetch market allocation:', error);
          console.error('Market params:', marketParams);
          console.error('Vault address:', vaultAddress);
          console.error('Contracts:', contracts);
          // Fallback: assume all assets are idle if we can't read the market
        }
      }

      // Use the actual vault token balance as idle assets (more accurate)
      const idleAssets = vaultTokenBalance as bigint;

      console.log('Final allocation summary:', {
        totalAssets: formatUnits(totalAssets as bigint, 18) + ' fakeUSD',
        idleAssets: formatUnits(idleAssets, 18) + ' fakeUSD',
        marketAllocations: marketAllocations.map(ma => ({
          marketId: ma.marketId.slice(0, 10) + '...',
          assets: formatUnits(ma.assets, 18) + ' fakeUSD',
          supplyCap: formatUnits(ma.supplyCap, 18) + ' fakeUSD',
        })),
        supplyQueueLength: supplyQueue ? 1 : 0,
      });

      return {
        totalAssets: totalAssets as bigint,
        idleAssets,
        marketAllocations,
        supplyQueue: supplyQueue ? [supplyQueue as string] : [],
        withdrawQueue: withdrawQueue ? [withdrawQueue as string] : [],
      };
    },
    enabled: !!publicClient && !!vaults.metaMorphoDemo.address,
    refetchInterval: 30000, // 30s - derived data refresh rate
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new data
    staleTime: 15000, // 15s - consider data fresh
  });
}
