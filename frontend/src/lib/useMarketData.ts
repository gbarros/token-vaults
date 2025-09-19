import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Market } from '@morpho-org/blue-sdk';
import { contracts, getMarketParams } from './contracts';
import { morphoBlueAbi, oracleAbi } from './abis';
import { parseMarketData, formatApy } from './sdkUtils';

export interface MarketMetrics {
  totalSupply: string;
  totalBorrow: string;
  utilization: string;
  supplyAPR: string;
  borrowAPR: string;
  isLoading: boolean;
  error: boolean;
}

export function useMarketData(): MarketMetrics {
  // Use centralized market parameters from singleton
  const marketParams = getMarketParams();

  // Read raw market data from Morpho Blue using SDK-generated market ID
  const { data: marketData, isLoading: marketLoading, error: marketError } = useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'market',
    args: marketParams ? [marketParams.id as `0x${string}`] : undefined, // SDK-generated ID
    query: {
      // Refresh every 30 seconds to minimize RPC calls
      refetchInterval: 30000,
      // Cache for 15 seconds
      staleTime: 15000,
    },
  });

  // Read oracle price for SDK calculations (may fail if stale)
  const { data: oraclePrice, isLoading: priceLoading, error: priceError } = useReadContract({
    address: contracts.markets.sandbox.oracle as `0x${string}`,
    abi: oracleAbi,
    functionName: 'price',
    query: {
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // If no market data or params, return loading/error state
  if (!marketData || !marketParams) {
    return {
      totalSupply: '0.00',
      totalBorrow: '0.00',
      utilization: '0.00',
      supplyAPR: marketParams ? '0.00' : 'No Market',
      borrowAPR: marketParams ? '0.00' : 'No Market',
      isLoading: marketLoading,
      error: !!marketError || !marketParams,
    };
  }

  // Parse SDK ABI tuple to structured object
  const marketDataStruct = parseMarketData(marketData);

  // Try SDK calculations if oracle price is available
  if (oraclePrice && !priceError) {
    try {
      // Create SDK Market instance with real data including oracle price
      const market = new Market({
        params: marketParams,
        totalSupplyAssets: marketDataStruct.totalSupplyAssets,
        totalSupplyShares: marketDataStruct.totalSupplyShares,
        totalBorrowAssets: marketDataStruct.totalBorrowAssets,
        totalBorrowShares: marketDataStruct.totalBorrowShares,
        lastUpdate: marketDataStruct.lastUpdate,
        fee: marketDataStruct.fee,
        price: oraclePrice, // Include oracle price for APY calculations
      });

      // Use SDK properties for accurate calculations (they are properties, not methods!)
      const utilization = market.utilization; // BigInt in wei (18 decimals)
      const supplyApy = market.supplyApy; // BigInt or Number (SDK returns BigInt for very small values)
      const borrowApy = market.borrowApy; // BigInt or Number (SDK returns BigInt for very small values)

      // Use centralized APY formatting

        return {
          totalSupply: formatEther(marketDataStruct.totalSupplyAssets),
          totalBorrow: formatEther(marketDataStruct.totalBorrowAssets),
          utilization: (Number(formatEther(utilization)) * 100).toFixed(2), // Convert from wei to percentage
          supplyAPR: formatApy(supplyApy),
          borrowAPR: formatApy(borrowApy),
          isLoading: false,
          error: false,
        };
    } catch (error) {
      console.error('SDK calculation error:', error);
      // Fall through to manual calculations
    }
  }

  // Fallback to manual calculations when SDK fails or oracle is stale
  console.warn('Using manual calculations - SDK failed or oracle price is stale');
  
  const totalSupplyAssets = marketDataStruct.totalSupplyAssets;
  const totalBorrowAssets = marketDataStruct.totalBorrowAssets;
  
  const utilization = totalSupplyAssets > BigInt(0) 
    ? ((Number(totalBorrowAssets) / Number(totalSupplyAssets)) * 100).toFixed(2)
    : '0.00';

  // Show appropriate status based on the error type
  const borrowAPR = priceError ? 'Oracle Stale' : 'SDK Error';
  const supplyAPR = priceError ? 'Oracle Stale' : 'SDK Error';

  return {
    totalSupply: formatEther(totalSupplyAssets),
    totalBorrow: formatEther(totalBorrowAssets),
    utilization,
    supplyAPR,
    borrowAPR,
    isLoading: priceLoading,
    error: false, // Don't show error - we have basic data
  };
}
