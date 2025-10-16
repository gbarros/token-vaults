// Advanced market insights using Morpho Blue SDK
import { formatEther } from 'viem';
import { Market } from '@morpho-org/blue-sdk';
import { getMarketParams } from '@/lib/contracts';
import { parseMarketData } from '@/lib/sdkUtils';
import { useMarketDataRaw } from './useMarketDataRaw';
import { useOraclePrice } from './useOraclePrice';

export interface MarketInsights {
  // Liquidity metrics
  availableLiquidity: string;
  liquidityUtilization: string;
  
  // Rate insights
  rateAtTarget: string;
  optimalUtilization: string;
  
  // Market efficiency
  isIdle: boolean;
  lastUpdateTime: string;
  
  // Advanced metrics
  totalValueLocked: string;
  borrowCapacity: string;
  
  // Loading and error states
  isLoading: boolean;
  error: boolean;
}

/**
 * Hook to get advanced market insights using Morpho SDK
 * Uses shared base hooks to avoid duplication
 */
export function useMarketInsights(): MarketInsights {
  const marketParams = getMarketParams();
  const { data: marketData, isLoading: marketLoading, error: marketError } = useMarketDataRaw();
  const { data: oraclePrice, isLoading: priceLoading, error: priceError } = useOraclePrice();

  const isLoading = marketLoading || priceLoading;
  const hasError = !!marketError || !!priceError;

  if (!marketData || !oraclePrice || !marketParams || hasError) {
    return {
      availableLiquidity: '0.00',
      liquidityUtilization: '0.00',
      rateAtTarget: '0.00',
      optimalUtilization: '0.00',
      isIdle: false,
      lastUpdateTime: 'Unknown',
      totalValueLocked: '0.00',
      borrowCapacity: '0.00',
      isLoading,
      error: hasError,
    };
  }

  try {
    // Parse SDK ABI tuple to structured object
    const marketDataStruct = parseMarketData(marketData as readonly [bigint, bigint, bigint, bigint, bigint, bigint]);

    // Create SDK Market instance with oracle price
    const market = new Market({
      params: marketParams,
      totalSupplyAssets: marketDataStruct.totalSupplyAssets,
      totalSupplyShares: marketDataStruct.totalSupplyShares,
      totalBorrowAssets: marketDataStruct.totalBorrowAssets,
      totalBorrowShares: marketDataStruct.totalBorrowShares,
      lastUpdate: marketDataStruct.lastUpdate,
      fee: marketDataStruct.fee,
      price: oraclePrice as bigint,
      // rateAtTarget: undefined - SDK handles basic IRM automatically
    });

    // Use SDK getters directly for accurate calculations
    const availableLiquidity = market.liquidity; // BigInt
    const utilization = market.utilization; // BigInt in WAD (18 decimals)
    const isIdle = market.isIdle; // boolean
    const apyAtTarget = market.apyAtTarget; // BigInt or undefined
    
    // Calculate total value locked (supply + collateral value would need position data)
    const totalValueLocked = marketDataStruct.totalSupplyAssets;
    
    // Available borrow capacity (same as liquidity for this demo)
    const borrowCapacity = availableLiquidity;
    
    // Last update timestamp
    const lastUpdateTime = new Date(Number(marketDataStruct.lastUpdate) * 1000).toLocaleString();

    return {
      availableLiquidity: formatEther(availableLiquidity),
      liquidityUtilization: (Number(utilization) / 1e18 * 100).toFixed(2),
      rateAtTarget: apyAtTarget ? (Number(apyAtTarget) / 1e18 * 100).toFixed(2) : '0.00',
      optimalUtilization: '80.00', // This would typically come from IRM parameters
      isIdle,
      lastUpdateTime,
      totalValueLocked: formatEther(totalValueLocked),
      borrowCapacity: formatEther(borrowCapacity),
      isLoading: false,
      error: false,
    };
  } catch (error) {
    console.error('Failed to create Morpho SDK Market for insights:', error);
    
    // Return basic fallback data
    const marketDataStruct = parseMarketData(marketData as readonly [bigint, bigint, bigint, bigint, bigint, bigint]);
    const utilization = marketDataStruct.totalSupplyAssets > BigInt(0)
      ? (Number(marketDataStruct.totalBorrowAssets) / Number(marketDataStruct.totalSupplyAssets) * 100).toFixed(2)
      : '0.00';
    
    return {
      availableLiquidity: formatEther(marketDataStruct.totalSupplyAssets - marketDataStruct.totalBorrowAssets),
      liquidityUtilization: utilization,
      rateAtTarget: '0.00',
      optimalUtilization: '80.00',
      isIdle: false,
      lastUpdateTime: new Date(Number(marketDataStruct.lastUpdate) * 1000).toLocaleString(),
      totalValueLocked: formatEther(marketDataStruct.totalSupplyAssets),
      borrowCapacity: formatEther(marketDataStruct.totalSupplyAssets - marketDataStruct.totalBorrowAssets),
      isLoading: false,
      error: false,
    };
  }
}

