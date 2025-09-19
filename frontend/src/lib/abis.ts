// Centralized ABI definitions for Morpho Blue contracts
// Now using official ABIs from @morpho-org/blue-sdk-viem

import { 
  blueAbi as sdkBlueAbi, 
  adaptiveCurveIrmAbi as sdkAdaptiveCurveIrmAbi 
} from '@morpho-org/blue-sdk-viem';

/**
 * Morpho Blue Core ABI from official SDK
 * Contains all functions for market and position management
 */
export const morphoBlueAbi = sdkBlueAbi;

/**
 * Legacy morphoBlueAbi for reference (now replaced by SDK)
 * @deprecated Use morphoBlueAbi from SDK instead
 */
export const legacyMorphoBlueAbi = [
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
  {
    type: 'function',
    name: 'supply',
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
      { name: 'assets', type: 'uint256', internalType: 'uint256' },
      { name: 'shares', type: 'uint256', internalType: 'uint256' },
      { name: 'onBehalf', type: 'address', internalType: 'address' },
      { name: 'data', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      { name: 'assetsSupplied', type: 'uint256', internalType: 'uint256' },
      { name: 'sharesSupplied', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'borrow',
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
      { name: 'assets', type: 'uint256', internalType: 'uint256' },
      { name: 'shares', type: 'uint256', internalType: 'uint256' },
      { name: 'onBehalf', type: 'address', internalType: 'address' },
      { name: 'receiver', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: 'assetsBorrowed', type: 'uint256', internalType: 'uint256' },
      { name: 'sharesBorrowed', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  // Market interaction functions
  {
    type: 'function',
    name: 'supply',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsSupplied', type: 'uint256' },
      { name: 'sharesSupplied', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'borrow',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [
      { name: 'assetsBorrowed', type: 'uint256' },
      { name: 'sharesBorrowed', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supplyCollateral',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'repay',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsRepaid', type: 'uint256' },
      { name: 'sharesRepaid', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Adaptive Curve IRM ABI from official SDK
 * For getting borrow rates from the Interest Rate Model
 */
export const adaptiveCurveIrmAbi = sdkAdaptiveCurveIrmAbi;

/**
 * Legacy adaptiveCurveIrmAbi for reference (now replaced by SDK)
 * @deprecated Use adaptiveCurveIrmAbi from SDK instead
 */
export const legacyAdaptiveCurveIrmAbi = [
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

/**
 * Oracle ABI for price reading
 * Compatible with Chainlink-style price feeds and Morpho oracles
 */
export const oracleAbi = [
  {
    type: 'function',
    name: 'price',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * ERC20 ABI (minimal)
 * For token operations like approve, transfer, balanceOf
 */
export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Settable Aggregator ABI
 * For our test oracle that allows price updates
 */
export const settableAggregatorAbi = [
  {
    type: 'function',
    name: 'latestRoundData',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80', internalType: 'uint80' },
      { name: 'answer', type: 'int256', internalType: 'int256' },
      { name: 'startedAt', type: 'uint256', internalType: 'uint256' },
      { name: 'updatedAt', type: 'uint256', internalType: 'uint256' },
      { name: 'answeredInRound', type: 'uint80', internalType: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setPrice',
    inputs: [{ name: '_price', type: 'int256', internalType: 'int256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
] as const;
