// SDK utility functions to eliminate code duplication
// Centralizes common patterns for working with Morpho Blue SDK

import { MarketParams } from '@morpho-org/blue-sdk';

/**
 * Converts SDK ABI market tuple to structured object
 * SDK ABI returns: [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
 */
export function parseMarketData(marketTuple: readonly [bigint, bigint, bigint, bigint, bigint, bigint]) {
  return {
    totalSupplyAssets: marketTuple[0],
    totalSupplyShares: marketTuple[1], 
    totalBorrowAssets: marketTuple[2],
    totalBorrowShares: marketTuple[3],
    lastUpdate: marketTuple[4],
    fee: marketTuple[5],
  };
}

/**
 * Converts SDK ABI position tuple to structured object  
 * SDK ABI returns: [supplyShares, borrowShares, collateral]
 */
export function parsePositionData(positionTuple: readonly [bigint, bigint, bigint]) {
  return {
    supplyShares: positionTuple[0],
    borrowShares: positionTuple[1],
    collateral: positionTuple[2],
  };
}

/**
 * Converts MarketParams SDK class to plain object for ABI calls
 * SDK ABIs expect plain objects with 0x${string} addresses
 */
export function marketParamsToAbi(params: MarketParams) {
  return {
    loanToken: params.loanToken as `0x${string}`,
    collateralToken: params.collateralToken as `0x${string}`,
    oracle: params.oracle as `0x${string}`,
    irm: params.irm as `0x${string}`,
    lltv: params.lltv,
  };
}

/**
 * Formats APY values that can be either BigInt (wei) or Number (decimal)
 * Handles very small rates with higher precision
 */
export function formatApy(apy: bigint | number | unknown): string {
  if (typeof apy === 'bigint') {
    // Convert BigInt wei to percentage with higher precision
    const apyNumber = Number(apy) / 1e18 * 100;
    return apyNumber < 0.01 ? apyNumber.toFixed(6) : apyNumber.toFixed(2);
  } else if (typeof apy === 'number') {
    // Already a decimal, convert to percentage
    const apyPercent = apy * 100;
    return apyPercent < 0.01 ? apyPercent.toFixed(6) : apyPercent.toFixed(2);
  }
  return '0.00';
}
