// Minimal ABI fragments for the contracts we need to interact with

export const erc20Abi = [
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
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
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
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
] as const;

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

// Morpho Blue core functions (minimal + market reading + position reading)
export const morphoBlueAbi = [
  // Market reading function
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
  // Position reading function
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
    name: 'createMarket',
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
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'Id' }],
    stateMutability: 'nonpayable',
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
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
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
          { name: 'loanToken', type: 'address', internalType: 'address' },
          { name: 'collateralToken', type: 'address', internalType: 'address' },
          { name: 'oracle', type: 'address', internalType: 'address' },
          { name: 'irm', type: 'address', internalType: 'address' },
          { name: 'lltv', type: 'uint256', internalType: 'uint256' },
        ],
        internalType: 'struct MarketParams',
      },
      { name: 'assets', type: 'uint256', internalType: 'uint256' },
      { name: 'onBehalf', type: 'address', internalType: 'address' },
      { name: 'data', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
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
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

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
