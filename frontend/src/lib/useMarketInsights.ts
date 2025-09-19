// Advanced market insights using Morpho Blue SDK
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Market } from '@morpho-org/blue-sdk';
import { contracts, getMarketParams } from './contracts';
import { morphoBlueAbi, oracleAbi } from './abis';
import { parseMarketData } from './sdkUtils';

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

export function useMarketInsights(): MarketInsights {
  const marketParams = getMarketParams();

  // Read market data
  const { data: marketData, isLoading: marketLoading, error: marketError } = useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'market',
    args: marketParams ? [marketParams.id as `0x${string}`] : undefined,
    query: {
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Read oracle price
  const { data: oraclePrice, isLoading: priceLoading, error: priceError } = useReadContract({
    address: contracts.markets.sandbox.oracle as `0x${string}`,
    abi: oracleAbi,
    functionName: 'price',
    query: {
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  if (!marketData || !oraclePrice || !marketParams) {
    return {
      availableLiquidity: '0.00',
      liquidityUtilization: '0.00',
      rateAtTarget: '0.00',
      optimalUtilization: '0.00',
      isIdle: false,
      lastUpdateTime: 'Unknown',
      totalValueLocked: '0.00',
      borrowCapacity: '0.00',
      isLoading: marketLoading || priceLoading,
      error: !!(marketError || priceError) || !marketParams,
    };
  }

  try {
    // Parse SDK ABI tuple to structured object
    const marketDataStruct = parseMarketData(marketData);

    // Create SDK Market instance with oracle price
    const market = new Market({
      params: marketParams,
      totalSupplyAssets: marketDataStruct.totalSupplyAssets,
      totalSupplyShares: marketDataStruct.totalSupplyShares,
      totalBorrowAssets: marketDataStruct.totalBorrowAssets,
      totalBorrowShares: marketDataStruct.totalBorrowShares,
      lastUpdate: marketDataStruct.lastUpdate,
      fee: marketDataStruct.fee,
      price: oraclePrice, // Include oracle price for calculations
    });

    // Calculate advanced insights using SDK (properties, not methods!)
    const availableLiquidity = market.liquidity; // BigInt
    const utilization = market.utilization; // BigInt in wei
    const isIdle = market.isIdle; // boolean
    const apyAtTarget = market.apyAtTarget; // number
    
    // Calculate total value locked (supply + collateral value would need position data)
    const totalValueLocked = marketDataStruct.totalSupplyAssets;
    
    // Available borrow capacity (same as liquidity for this demo)
    
    // Last update timestamp
    const lastUpdateTime = new Date(Number(marketDataStruct.lastUpdate) * 1000).toLocaleString();

    return {
      availableLiquidity: formatEther(availableLiquidity),
      liquidityUtilization: (Number(formatEther(utilization)) * 100).toFixed(2),
      rateAtTarget: (Number(apyAtTarget || 0) * 100).toFixed(2),
      optimalUtilization: '80.00', // This would typically come from IRM parameters
      isIdle,
      lastUpdateTime,
      totalValueLocked: formatEther(totalValueLocked),
      borrowCapacity: formatEther(availableLiquidity), // Available liquidity is the borrow capacity
      isLoading: false,
      error: false,
    };
  } catch (error) {
    console.error('SDK market insights calculation error:', error);
    
    const marketDataStruct = parseMarketData(marketData);
    
    return {
      availableLiquidity: formatEther(marketDataStruct.totalSupplyAssets - marketDataStruct.totalBorrowAssets),
      liquidityUtilization: marketDataStruct.totalSupplyAssets > BigInt(0) 
        ? ((Number(marketDataStruct.totalBorrowAssets) / Number(marketDataStruct.totalSupplyAssets)) * 100).toFixed(2)
        : '0.00',
      rateAtTarget: '0.00',
      optimalUtilization: '80.00',
      isIdle: marketDataStruct.totalBorrowAssets === BigInt(0),
      lastUpdateTime: new Date(Number(marketDataStruct.lastUpdate) * 1000).toLocaleString(),
      totalValueLocked: formatEther(marketDataStruct.totalSupplyAssets),
      borrowCapacity: formatEther(marketDataStruct.totalSupplyAssets - marketDataStruct.totalBorrowAssets),
      isLoading: false,
      error: true,
    };
  }
}
