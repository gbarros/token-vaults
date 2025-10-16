import { formatEther } from 'viem';
import { getMarketParams } from '@/lib/contracts';
import { parseMarketData } from '@/lib/sdkUtils';
import { useMarketDataRaw } from './useMarketDataRaw';
import { useOraclePrice } from './useOraclePrice';
import { useIRMRate } from './useIRMRate';

// Raw market data interface (for VaultAllocation and other components)
export interface MarketData {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
  utilization: number;
  supplyAPY: number;
  borrowAPY: number;
}

// Formatted market metrics interface (for SandboxMarketCard)
export interface MarketMetrics {
  totalSupply: string;
  totalBorrow: string;
  utilization: string;
  supplyAPR: string;
  borrowAPR: string;
  isLoading: boolean;
  error: boolean;
}

/**
 * Hook to get market data with APY calculations
 * Uses shared base hooks (useMarketDataRaw, useOraclePrice, useIRMRate) to avoid duplication
 * Note: APY is calculated directly from IRM Mock, NOT via Morpho SDK (see comments in implementation)
 */
export function useMarketData() {
  const marketParams = getMarketParams();
  const { data: marketDataRaw, isLoading: marketLoading, error: marketError } = useMarketDataRaw();
  const { data: oraclePrice, isLoading: priceLoading, error: priceError } = useOraclePrice();
  const { data: irmRate, isLoading: irmLoading } = useIRMRate(marketDataRaw);

  const isLoading = marketLoading || priceLoading || irmLoading;
  const error = marketError || priceError;

  // Return loading/error state if data not available
  if (!marketDataRaw || !oraclePrice || !marketParams || error) {
    return {
      data: undefined,
      isLoading,
      error: !!error,
      isFetching: isLoading,
    };
  }

  try {
    // Parse market data tuple
    const marketDataStruct = parseMarketData(marketDataRaw as readonly [bigint, bigint, bigint, bigint, bigint, bigint]);

    // Calculate utilization (simple math, no SDK needed)
    const utilization = marketDataStruct.totalSupplyAssets > BigInt(0) 
      ? Number(marketDataStruct.totalBorrowAssets) / Number(marketDataStruct.totalSupplyAssets)
      : 0;

    // EDUCATIONAL NOTE: IRM Mock compatibility & SDK limitations
    // 
    // The Morpho Blue SDK's Market class requires `rateAtTarget` (specific to AdaptiveCurveIRM).
    // When `rateAtTarget` is undefined, SDK's getAccrualBorrowRates() returns 0, making supplyApy/borrowApy = 0.
    // 
    // IRM Mock doesn't have `rateAtTarget` - it uses simple utilization-based calculations:
    //   borrowRate = BASE_RATE + (utilization * SLOPE)
    // 
    // Solution: Bypass SDK and call IRM's borrowRateView() directly via useIRMRate hook.
    //           Then calculate APY ourselves using the compound interest formula.
    
    let supplyAPY = 0;
    let borrowAPY = 0;

    if (irmRate) {
      // Convert borrow rate (per second, WAD) to APY (percentage)
      // Formula: APY = ((1 + rate/WAD)^SECONDS_PER_YEAR - 1) * 100
      const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;
      const ratePerSecond = Number(irmRate) / 1e18;
      borrowAPY = (Math.pow(1 + ratePerSecond, SECONDS_PER_YEAR) - 1) * 100;
      
      // Supply APY = Borrow APY * Utilization * (1 - Fee)
      // Lenders earn the interest paid by borrowers, adjusted for utilization and protocol fee
      const feeRate = Number(marketDataStruct.fee) / 1e18;
      supplyAPY = borrowAPY * utilization * (1 - feeRate);
    }

    const data: MarketData = {
      totalSupplyAssets: marketDataStruct.totalSupplyAssets,
      totalSupplyShares: marketDataStruct.totalSupplyShares,
      totalBorrowAssets: marketDataStruct.totalBorrowAssets,
      totalBorrowShares: marketDataStruct.totalBorrowShares,
      lastUpdate: marketDataStruct.lastUpdate,
      fee: marketDataStruct.fee,
      utilization,
      supplyAPY,
      borrowAPY,
    };

    return {
      data,
      isLoading: false,
      error: false,
      isFetching: false,
    };
  } catch (error) {
    console.error('Error calculating market data:', error);
    
    // Fallback: return basic data without APY
    const marketDataStruct = parseMarketData(marketDataRaw as readonly [bigint, bigint, bigint, bigint, bigint, bigint]);
    const utilization = marketDataStruct.totalSupplyAssets > BigInt(0) 
      ? Number(marketDataStruct.totalBorrowAssets) / Number(marketDataStruct.totalSupplyAssets)
      : 0;

    const data: MarketData = {
      totalSupplyAssets: marketDataStruct.totalSupplyAssets,
      totalSupplyShares: marketDataStruct.totalSupplyShares,
      totalBorrowAssets: marketDataStruct.totalBorrowAssets,
      totalBorrowShares: marketDataStruct.totalBorrowShares,
      lastUpdate: marketDataStruct.lastUpdate,
      fee: marketDataStruct.fee,
      utilization,
      supplyAPY: 0,
      borrowAPY: 0,
    };

    return {
      data,
      isLoading: false,
      error: false,
      isFetching: false,
    };
  }
}

/**
 * Formatted market metrics hook for UI components (like SandboxMarketCard)
 * Returns formatted strings instead of raw bigints/numbers
 */
export function useMarketMetrics(): MarketMetrics {
  const { data: marketData, isLoading, error } = useMarketData();

  if (!marketData || error) {
    return {
      totalSupply: '0.00',
      totalBorrow: '0.00',
      utilization: '0.00',
      supplyAPR: error ? 'Error' : '0.00',
      borrowAPR: error ? 'Error' : '0.00',
      isLoading,
      error: !!error,
    };
  }

  return {
    totalSupply: formatEther(marketData.totalSupplyAssets),
    totalBorrow: formatEther(marketData.totalBorrowAssets),
    utilization: (marketData.utilization * 100).toFixed(2),
    supplyAPR: marketData.supplyAPY.toFixed(2),
    borrowAPR: marketData.borrowAPY.toFixed(2),
    isLoading,
    error: false,
  };
}
