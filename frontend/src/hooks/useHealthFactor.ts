import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { Market, Position } from '@morpho-org/blue-sdk';
import { contracts, getMarketParams } from '@/lib/contracts';
import { morphoBlueAbi } from '@/lib/abis';
import { parseMarketData, parsePositionData } from '@/lib/sdkUtils';
import { useMarketDataRaw } from './useMarketDataRaw';
import { useOraclePrice } from './useOraclePrice';

export interface HealthFactorData {
  healthFactor: string;
  isHealthy: boolean;
  borrowedAmount: string;
  collateralAmount: string;
  maxBorrowCapacity: string;
  liquidationPrice: string;
  hasPosition: boolean;
  isLoading: boolean;
  error: boolean;
}

/**
 * Hook to calculate health factor and position data using Morpho SDK
 * Uses shared base hooks to avoid duplication
 */
export function useHealthFactor(customPrice?: bigint): HealthFactorData {
  const { address: userAddress } = useAccount();
  const marketParams = getMarketParams();
  
  // Use shared hooks for market data and oracle price
  const { data: marketData, isLoading: marketLoading, error: marketError } = useMarketDataRaw();
  const { data: oraclePrice, isLoading: priceLoading, error: priceError } = useOraclePrice();

  // Read user position - keep using useReadContract (wagmi standard)
  const { data: positionData, isLoading: positionLoading, error: positionError } = useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'position',
    args: userAddress && marketParams ? [marketParams.id as `0x${string}`, userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Use custom price if provided, otherwise use oracle price
  const currentPrice = customPrice || oraclePrice || BigInt(0);

  // Check if we have all required data
  if (!marketData || !positionData || !currentPrice || !marketParams) {
    return {
      healthFactor: 'N/A',
      isHealthy: true,
      borrowedAmount: '0.00',
      collateralAmount: '0.00',
      maxBorrowCapacity: '0.00',
      liquidationPrice: '0.00',
      hasPosition: false,
      isLoading: positionLoading || marketLoading || priceLoading,
      error: !!(positionError || marketError || priceError),
    };
  }

  // Parse SDK ABI tuple to structured object
  const positionDataStruct = parsePositionData(positionData as readonly [bigint, bigint, bigint]);
  const borrowShares = positionDataStruct.borrowShares || BigInt(0);
  const collateralAmount = positionDataStruct.collateral || BigInt(0);
  const hasPosition = borrowShares > BigInt(0) || collateralAmount > BigInt(0);

  if (!hasPosition) {
    return {
      healthFactor: 'N/A',
      isHealthy: true,
      borrowedAmount: '0.00',
      collateralAmount: '0.00',
      maxBorrowCapacity: '0.00',
      liquidationPrice: '0.00',
      hasPosition: false,
      isLoading: false,
      error: false,
    };
  }

  try {
    // Parse SDK ABI tuple to structured object
    const marketDataStruct = parseMarketData(marketData as readonly [bigint, bigint, bigint, bigint, bigint, bigint]);

    // Create SDK Market instance with real data including price
    const market = new Market({
      params: marketParams,
      totalSupplyAssets: marketDataStruct.totalSupplyAssets,
      totalSupplyShares: marketDataStruct.totalSupplyShares,
      totalBorrowAssets: marketDataStruct.totalBorrowAssets,
      totalBorrowShares: marketDataStruct.totalBorrowShares,
      lastUpdate: marketDataStruct.lastUpdate,
      fee: marketDataStruct.fee,
      price: currentPrice,
      // rateAtTarget: undefined - SDK handles basic IRM automatically
    });

    // Create SDK Position instance
    const position = new Position({
      user: userAddress as `0x${string}`,
      marketId: marketParams.id,
      supplyShares: positionDataStruct.supplyShares || BigInt(0),
      borrowShares: positionDataStruct.borrowShares || BigInt(0),
      collateral: positionDataStruct.collateral || BigInt(0),
    });

    // Use SDK methods for accurate calculations
    const isHealthy = market.isHealthy(position);
    const healthFactor = market.getHealthFactor(position);
    const liquidationPrice = market.getLiquidationPrice(position);
    const borrowedAssets = market.toBorrowAssets(position.borrowShares);
    const maxBorrowCapacity = market.getMaxBorrowAssets(position.collateral);

    // Format liquidation price properly (it's returned in oracle format - 36 decimals)
    const formatLiquidationPrice = (price: bigint | number | null | undefined): string => {
      if (!price) return '0.00';
      
      if (typeof price === 'bigint') {
        // SDK returns liquidation price in oracle format (36 decimals)
        // Convert to normal price format (aggregator has 8 decimals)
        const priceInAggregatorDecimals = Number(price) / (10 ** 36) * (10 ** 8);
        return (priceInAggregatorDecimals / (10 ** 8)).toFixed(8);
      } else if (typeof price === 'number') {
        return price.toFixed(8);
      }
      return '0.00';
    };

    return {
      healthFactor: (() => {
        if (typeof healthFactor === 'number') {
          return healthFactor === Infinity ? '∞' : (healthFactor as number).toFixed(3);
        } else if (typeof healthFactor === 'bigint') {
          return formatEther(healthFactor as bigint);
        } else {
          return 'N/A';
        }
      })(),
      isHealthy: isHealthy ?? false,
      borrowedAmount: formatEther(borrowedAssets || BigInt(0)),
      collateralAmount: formatEther(position.collateral),
      maxBorrowCapacity: formatEther(maxBorrowCapacity || BigInt(0)),
      liquidationPrice: formatLiquidationPrice(liquidationPrice),
      hasPosition: true,
      isLoading: false,
      error: false,
    };
  } catch (error) {
    console.error('SDK health factor calculation error:', error);
    
    // Fallback to basic calculations if SDK fails
    const marketDataStruct = parseMarketData(marketData as readonly [bigint, bigint, bigint, bigint, bigint, bigint]);
    
    const borrowedAmount = marketDataStruct.totalBorrowShares > BigInt(0)
      ? (borrowShares * marketDataStruct.totalBorrowAssets + marketDataStruct.totalBorrowShares - BigInt(1)) / marketDataStruct.totalBorrowShares
      : BigInt(0);

    return {
      healthFactor: 'Error',
      isHealthy: false,
      borrowedAmount: formatEther(borrowedAmount),
      collateralAmount: formatEther(collateralAmount),
      maxBorrowCapacity: '0.00',
      liquidationPrice: '0.00',
      hasPosition: true,
      isLoading: false,
      error: true,
    };
  }
}

/**
 * Hook for simulating health factor with different prices
 */
export function useHealthFactorSimulation(simulatedPrice: string) {
  // Convert simulated price to the same format as the oracle
  // The aggregator uses 8 decimals, so we need to scale the input price accordingly
  // Then scale to 36 decimals like the oracle does: price * 10^(36-8)
  const aggregatorDecimals = 8;
  const morphoOracleDecimals = 36;
  
  // Only simulate if we have a valid price string
  const priceInWei = simulatedPrice && !isNaN(parseFloat(simulatedPrice)) && parseFloat(simulatedPrice) > 0
    ? BigInt(Math.floor(parseFloat(simulatedPrice) * (10 ** aggregatorDecimals))) * BigInt(10 ** (morphoOracleDecimals - aggregatorDecimals))
    : undefined; // Use undefined to fall back to current oracle price
  
  return useHealthFactor(priceInWei);
}

