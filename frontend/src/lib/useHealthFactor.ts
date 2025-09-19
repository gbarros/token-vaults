import { useReadContract, useAccount } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { contracts } from './contracts';

// Import the shared ABI from ops
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
  {
    type: 'function',
    name: 'position',
    inputs: [
      { name: 'id', type: 'bytes32', internalType: 'Id' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      {
        name: 'p',
        type: 'tuple',
        components: [
          { name: 'supplyShares', type: 'uint256', internalType: 'uint256' },
          { name: 'borrowShares', type: 'uint128', internalType: 'uint128' },
          { name: 'collateral', type: 'uint128', internalType: 'uint128' },
        ],
        internalType: 'struct Position',
      },
    ],
    stateMutability: 'view',
  },
] as const;

// Oracle ABI for price reading
const oracleAbi = [
  {
    type: 'function',
    name: 'price',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

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

export function useHealthFactor(customPrice?: bigint): HealthFactorData {
  const { address: userAddress } = useAccount();

  // Read user position
  const { data: positionData, isLoading: positionLoading, error: positionError } = useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'position',
    args: userAddress ? [contracts.markets.sandbox.id as `0x${string}`, userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Read market data
  const { data: marketData, isLoading: marketLoading, error: marketError } = useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'market',
    args: [contracts.markets.sandbox.id as `0x${string}`],
    query: {
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Read current oracle price (unless custom price is provided)
  const { data: oraclePrice, isLoading: priceLoading, error: priceError } = useReadContract({
    address: contracts.markets.sandbox.oracle, // Use the market's oracle address
    abi: oracleAbi,
    functionName: 'price',
    query: {
      enabled: !customPrice, // Only fetch if no custom price provided
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Use custom price if provided, otherwise use oracle price
  const currentPrice = customPrice || oraclePrice || BigInt(0);

  // Calculate health metrics (accessing the tuple fields correctly)
  const borrowShares = positionData?.borrowShares || BigInt(0);
  const collateralAmount = positionData?.collateral || BigInt(0);
  const hasPosition = borrowShares > BigInt(0) || collateralAmount > BigInt(0);

  // Calculate borrowed amount using share-to-assets conversion
  // borrowed = borrowShares * totalBorrowAssets / totalBorrowShares (rounded up)
  const totalBorrowAssets = marketData?.totalBorrowAssets || BigInt(0);
  const totalBorrowShares = marketData?.totalBorrowShares || BigInt(0);
  
  const borrowedAmount = totalBorrowShares > BigInt(0)
    ? (borrowShares * totalBorrowAssets + totalBorrowShares - BigInt(1)) / totalBorrowShares // Round up
    : BigInt(0);

  // Calculate max borrow capacity
  // maxBorrow = collateral * price / ORACLE_PRICE_SCALE * lltv
  const ORACLE_PRICE_SCALE = BigInt('1000000000000000000000000000000000000'); // 1e36
  const lltv = BigInt(contracts.markets.sandbox.lltv); // Already in 18 decimals
  
  const maxBorrowCapacity = collateralAmount > BigInt(0) && currentPrice > BigInt(0)
    ? (collateralAmount * currentPrice * lltv) / (ORACLE_PRICE_SCALE * BigInt('1000000000000000000')) // Divide by 1e18 for lltv
    : BigInt(0);

  // Calculate health factor
  // Health Factor = maxBorrowCapacity / borrowedAmount
  const healthFactor = borrowedAmount > BigInt(0) && maxBorrowCapacity > BigInt(0)
    ? (Number(maxBorrowCapacity) / Number(borrowedAmount)).toFixed(3)
    : borrowedAmount > BigInt(0) ? '0.000' : '∞';

  const isHealthy = borrowedAmount === BigInt(0) || maxBorrowCapacity >= borrowedAmount;

  // Calculate liquidation price
  // liquidationPrice = (borrowedAmount * ORACLE_PRICE_SCALE * 1e18) / (collateralAmount * lltv)
  const liquidationPrice = collateralAmount > BigInt(0) && borrowedAmount > BigInt(0)
    ? (borrowedAmount * ORACLE_PRICE_SCALE * BigInt('1000000000000000000')) / (collateralAmount * lltv)
    : BigInt(0);

  return {
    healthFactor,
    isHealthy,
    borrowedAmount: formatEther(borrowedAmount),
    collateralAmount: formatEther(collateralAmount),
    maxBorrowCapacity: formatEther(maxBorrowCapacity),
    liquidationPrice: liquidationPrice > BigInt(0) ? formatUnits(liquidationPrice, 36) : '0',
    hasPosition,
    isLoading: positionLoading || marketLoading || priceLoading,
    error: !!(positionError || marketError || priceError),
  };
}

// Hook for simulating health factor with different prices
export function useHealthFactorSimulation(simulatedPrice: string) {
  // Convert simulated price to the same format as the oracle
  // The aggregator uses 8 decimals, so we need to scale the input price accordingly
  // Then scale to 36 decimals like the oracle does: price * 10^(36-8)
  const aggregatorDecimals = 8;
  const morphoOracleDecimals = 36;
  
  const priceInWei = simulatedPrice 
    ? BigInt(Math.floor(parseFloat(simulatedPrice) * (10 ** aggregatorDecimals))) * BigInt(10 ** (morphoOracleDecimals - aggregatorDecimals))
    : BigInt(0);
  
  return useHealthFactor(priceInWei);
}
