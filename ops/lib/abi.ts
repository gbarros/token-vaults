/**
 * Custom ABI fragments for contracts not covered by Morpho SDK
 * 
 * CLEANED UP: Removed redundant ABIs now covered by Morpho SDK:
 * - morphoBlueAbi -> Use @morpho-org/blue-sdk
 * - Standard ERC20 functions -> Use viem's built-in erc20Abi
 * 
 * REMAINING: Only custom/non-standard ABIs that aren't available elsewhere:
 * - faucetErc20Abi: Custom faucet functionality (mint, cooldown, etc.)
 * - settableAggregatorAbi: Test oracle aggregator for price control
 * - morphoChainlinkOracleV2FactoryAbi: Oracle factory (if not in SDK)
 */

import { erc20Abi } from 'viem';

// Keep only custom/non-standard ABIs that aren't in Morpho SDK

export const faucetErc20Abi = [
  ...erc20Abi,
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'canMint',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'remainingCooldown',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxMintPerCall',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'cooldownSeconds',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const settableAggregatorAbi = [
  {
    type: 'function',
    name: 'setAnswer',
    inputs: [
      { name: 'answer', type: 'int256', internalType: 'int256' },
      { name: 'roundId', type: 'uint80', internalType: 'uint80' },
      { name: 'updatedAt', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
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
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'description',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
] as const;

// Note: Morpho Blue ABIs are now available via @morpho-org/blue-sdk
// Use the SDK for all Morpho Blue contract interactions instead of manual ABIs

// Morpho Chainlink Oracle V2 Factory
export const morphoChainlinkOracleV2FactoryAbi = [
  {
    type: 'function',
    name: 'createMorphoChainlinkOracleV2',
    inputs: [
      { name: 'baseVault', type: 'address', internalType: 'address' },
      { name: 'baseVaultDecimals', type: 'uint256', internalType: 'uint256' },
      { name: 'baseFeed1', type: 'address', internalType: 'address' },
      { name: 'baseFeed2', type: 'address', internalType: 'address' },
      { name: 'baseTokenDecimals', type: 'uint256', internalType: 'uint256' },
      { name: 'quoteVault', type: 'address', internalType: 'address' },
      { name: 'quoteVaultDecimals', type: 'uint256', internalType: 'uint256' },
      { name: 'quoteFeed1', type: 'address', internalType: 'address' },
      { name: 'quoteFeed2', type: 'address', internalType: 'address' },
      { name: 'quoteTokenDecimals', type: 'uint256', internalType: 'uint256' },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [{ name: 'oracle', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
] as const;
