import { useReadContract } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { contracts } from './contracts';

// Morpho Blue ABI for market reading
const morphoBlueAbi = [
  {
    type: 'function',
    name: 'market',
    inputs: [{ name: 'id', type: 'bytes32', internalType: 'Id' }],
    outputs: [
      {
        name: 'm',
        type: 'tuple',
        components: [
          { name: 'totalSupplyAssets', type: 'uint128', internalType: 'uint128' },
          { name: 'totalSupplyShares', type: 'uint128', internalType: 'uint128' },
          { name: 'totalBorrowAssets', type: 'uint128', internalType: 'uint128' },
          { name: 'totalBorrowShares', type: 'uint128', internalType: 'uint128' },
          { name: 'lastUpdate', type: 'uint128', internalType: 'uint128' },
          { name: 'fee', type: 'uint128', internalType: 'uint128' },
        ],
        internalType: 'struct Market',
      },
    ],
    stateMutability: 'view',
  },
] as const;

// IRM ABI for getting borrow rate
const irmAbi = [
  {
    type: 'function',
    name: 'borrowRateView',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address', internalType: 'address' },
          { name: 'collateralToken', type: 'address', internalType: 'address' },
          { name: 'oracle', type: 'address', internalType: 'address' },
          { name: 'irm', type: 'address', internalType: 'address' },
          { name: 'lltv', type: 'uint256', internalType: 'uint256' },
        ],
        internalType: 'struct MarketParams',
      },
      {
        name: 'market',
        type: 'tuple',
        components: [
          { name: 'totalSupplyAssets', type: 'uint128', internalType: 'uint128' },
          { name: 'totalSupplyShares', type: 'uint128', internalType: 'uint128' },
          { name: 'totalBorrowAssets', type: 'uint128', internalType: 'uint128' },
          { name: 'totalBorrowShares', type: 'uint128', internalType: 'uint128' },
          { name: 'lastUpdate', type: 'uint128', internalType: 'uint128' },
          { name: 'fee', type: 'uint128', internalType: 'uint128' },
        ],
        internalType: 'struct Market',
      },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

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
  // Read market data from Morpho Blue
  const { data: marketData, isLoading: marketLoading, error: marketError } = useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'market',
    args: [contracts.markets.sandbox.id as `0x${string}`],
    query: {
      // Refresh every 30 seconds to minimize RPC calls
      refetchInterval: 30000,
      // Cache for 15 seconds
      staleTime: 15000,
    },
  });

  // Market parameters for IRM call
  const marketParams = {
    loanToken: contracts.markets.sandbox.loanToken,
    collateralToken: contracts.markets.sandbox.collateralToken,
    oracle: contracts.markets.sandbox.oracle,
    irm: contracts.markets.sandbox.irm,
    lltv: BigInt(contracts.markets.sandbox.lltv),
  };

  // Read borrow rate from IRM (only if we have market data)
  const { data: borrowRateData, isLoading: rateLoading, error: rateError } = useReadContract({
    address: contracts.morpho.adaptiveCurveIRM,
    abi: irmAbi,
    functionName: 'borrowRateView',
    args: marketData ? [marketParams, marketData] : undefined,
    query: {
      enabled: !!marketData,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Calculate metrics
  const totalSupplyAssets = marketData?.totalSupplyAssets || BigInt(0);
  const totalBorrowAssets = marketData?.totalBorrowAssets || BigInt(0);
  
  // Format values
  const totalSupply = formatEther(totalSupplyAssets);
  const totalBorrow = formatEther(totalBorrowAssets);
  
  // Calculate utilization rate
  const utilization = totalSupplyAssets > BigInt(0) 
    ? ((Number(totalBorrowAssets) / Number(totalSupplyAssets)) * 100).toFixed(2)
    : '0.00';

  // Calculate real APR from IRM data
  const borrowRatePerSecond = borrowRateData || BigInt(0);
  
  // Convert from per-second rate to APR (assuming 18 decimal places)
  // Formula: APR = (rate_per_second * seconds_per_year) / 1e18 * 100
  const secondsPerYear = 365.25 * 24 * 60 * 60; // ~31,557,600
  const borrowAPR = borrowRatePerSecond > BigInt(0)
    ? ((Number(formatUnits(borrowRatePerSecond, 18)) * secondsPerYear) * 100).toFixed(2)
    : '0.00';

  // Supply APR = Borrow APR * Utilization Rate (simplified, ignoring fees)
  const supplyAPR = totalSupplyAssets > BigInt(0) && borrowRatePerSecond > BigInt(0)
    ? ((parseFloat(borrowAPR) * parseFloat(utilization)) / 100).toFixed(2)
    : '0.00';

  return {
    totalSupply,
    totalBorrow,
    utilization,
    supplyAPR,
    borrowAPR,
    isLoading: marketLoading || rateLoading || false,
    error: !!(marketError || rateError),
  };
}
