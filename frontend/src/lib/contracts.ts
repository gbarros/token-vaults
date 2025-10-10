/**
 * Contract Addresses and Configuration
 * 
 * This module serves as the single source of truth for all contract addresses:
 * - Deployed contracts: Loaded from Forge deployment artifacts
 * - Morpho protocol: Read from environment variables (see frontend/env.example)
 * - Market params: Computed from deployed contracts
 * 
 * Environment variables override defaults for Morpho addresses, allowing
 * easy switching between networks or testnet resets.
 */

import { MarketParams } from '@morpho-org/blue-sdk';

// Morpho Protocol Addresses from Environment
// These can be overridden in .env.local (see frontend/env.example)
const MORPHO_ADDRESSES = {
  morphoBlueCore: (process.env.NEXT_PUBLIC_MORPHO_BLUE_CORE || '0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd') as `0x${string}`,
  metaMorphoFactory: (process.env.NEXT_PUBLIC_METAMORPHO_FACTORY || '0xb007ca4AD41874640F9458bF3B5e427c31Be7766') as `0x${string}`,
  irmMock: (process.env.NEXT_PUBLIC_IRM_MOCK || '0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92') as `0x${string}`,
};

// Environment Variable Overrides for Deployed Contracts
// If set, these override the Forge artifact addresses
const ENV_OVERRIDES = {
  loanToken: process.env.NEXT_PUBLIC_LOAN_TOKEN as `0x${string}` | undefined,
  collateralToken: process.env.NEXT_PUBLIC_COLLATERAL_TOKEN as `0x${string}` | undefined,
  aggregator: process.env.NEXT_PUBLIC_AGGREGATOR_ADDRESS as `0x${string}` | undefined,
  oracle: process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}` | undefined,
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}` | undefined,
  marketId: process.env.NEXT_PUBLIC_MARKET_ID as `0x${string}` | undefined,
};

// Types for Forge deployment artifacts
interface DeploymentTransaction {
  hash: string;
  transactionType: string;
  contractName: string | null;
  contractAddress: string;
  function: string | null;
  arguments: unknown[];
  // Additional fields that may be present
  transaction?: unknown;
  additionalContracts?: unknown[];
  isFixedGasLimit?: boolean;
}

interface DeploymentArtifact {
  transactions: DeploymentTransaction[];
}

// Import deployment artifacts directly from Forge broadcast directory
// These imports will fail gracefully if artifacts don't exist
let deployTokensArtifact: DeploymentArtifact | null = null;
let deployOracleMockArtifact: DeploymentArtifact | null = null;
let deployAggregatorArtifact: DeploymentArtifact | null = null; // Optional - for Chainlink-compatible approach
let deployOracleArtifact: DeploymentArtifact | null = null; // Optional - for Chainlink-compatible approach
let createMarketArtifact: DeploymentArtifact | null = null;
let deployVaultArtifact: DeploymentArtifact | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployTokensArtifact = require('../../../contracts/broadcast/DeployTokens.s.sol/3735928814/run-latest.json');
} catch {
  console.warn('⚠️ DeployTokens artifact not found - tokens will not be available');
}

// Try OracleMock first (Eden approach - default)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployOracleMockArtifact = require('../../../contracts/broadcast/DeployOracleMock.s.sol/3735928814/run-latest.json');
} catch {
  console.warn('ℹ️ DeployOracleMock artifact not found - trying Chainlink-compatible approach');
}

// Optional: Try aggregator + oracle (Chainlink-compatible approach - fallback)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployAggregatorArtifact = require('../../../contracts/broadcast/DeployAggregator.s.sol/3735928814/run-latest.json');
} catch {
  // Silently fail - aggregator is optional
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployOracleArtifact = require('../../../contracts/broadcast/DeployOracle.s.sol/3735928814/run-latest.json');
} catch {
  // Silently fail - oracle is optional
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  createMarketArtifact = require('../../../contracts/broadcast/CreateMarket.s.sol/3735928814/run-latest.json');
} catch {
  console.warn('⚠️ CreateMarket artifact not found - market will not be available');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployVaultArtifact = require('../../../contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json');
} catch {
  console.warn('⚠️ DeployVault artifact not found - vault will not be available');
}

// Centralized address management singleton
class ContractAddressManager {
  private static instance: ContractAddressManager;
  private _addresses: {
    fakeUSD?: string | null;
    fakeTIA?: string | null;
    aggregator?: string | null;
    oracle?: string | null;
    marketParams?: MarketParams | null;
    vault?: string | null;
  } = {};

  private constructor() {}

  static getInstance(): ContractAddressManager {
    if (!ContractAddressManager.instance) {
      ContractAddressManager.instance = new ContractAddressManager();
    }
    return ContractAddressManager.instance;
  }

  private getContractAddress(artifact: DeploymentArtifact | null, contractName: string): string | null {
    if (!artifact) {
      console.warn(`⚠️ Artifact not available for ${contractName}`);
      return null;
    }
    
    const transaction = artifact.transactions.find((tx: DeploymentTransaction) => 
      tx.contractName === contractName && tx.transactionType === 'CREATE'
    );
    if (!transaction) {
      console.warn(`⚠️ Contract ${contractName} not found in deployment artifacts`);
      return null;
    }
    return transaction.contractAddress;
  }

  get fakeUSD(): string | null {
    if (!this._addresses.fakeUSD) {
      // Check environment variable override first
      if (ENV_OVERRIDES.loanToken) {
        this._addresses.fakeUSD = ENV_OVERRIDES.loanToken;
      } else {
        this._addresses.fakeUSD = this.getContractAddress(deployTokensArtifact, 'FaucetERC20');
      }
    }
    return this._addresses.fakeUSD;
  }

  get fakeTIA(): string | null {
    if (!this._addresses.fakeTIA) {
      // Check environment variable override first
      if (ENV_OVERRIDES.collateralToken) {
        this._addresses.fakeTIA = ENV_OVERRIDES.collateralToken;
      } else {
        if (!deployTokensArtifact) {
          console.warn('⚠️ DeployTokens artifact not available for fakeTIA');
          return null;
        }
        
        const faucetDeployments = deployTokensArtifact.transactions.filter((tx: DeploymentTransaction) =>
          tx.contractName === 'FaucetERC20' && tx.transactionType === 'CREATE'
        );
        if (faucetDeployments.length < 2) {
          console.warn('⚠️ fakeTIA deployment not found - need at least 2 FaucetERC20 deployments');
          return null;
        }
        this._addresses.fakeTIA = faucetDeployments[1].contractAddress;
      }
    }
    return this._addresses.fakeTIA;
  }

  get aggregator(): string | null {
    if (!this._addresses.aggregator) {
      // Check environment variable override first
      if (ENV_OVERRIDES.aggregator) {
        this._addresses.aggregator = ENV_OVERRIDES.aggregator;
      } else {
        this._addresses.aggregator = this.getContractAddress(deployAggregatorArtifact, 'SettableAggregator');
      }
    }
    return this._addresses.aggregator;
  }

      get oracle(): string | null {
        if (!this._addresses.oracle) {
          // Check environment variable override first
          if (ENV_OVERRIDES.oracle) {
            this._addresses.oracle = ENV_OVERRIDES.oracle;
          } else {
            // Try OracleMock first (Eden/testnet approach - default)
            this._addresses.oracle = this.getContractAddress(deployOracleMockArtifact, 'OracleMock');
            
            // Fallback to OracleFromAggregator (Chainlink-compatible approach)
            if (!this._addresses.oracle) {
              this._addresses.oracle = this.getContractAddress(deployOracleArtifact, 'OracleFromAggregator');
            }
          }
        }
        return this._addresses.oracle;
      }

  get marketParams(): MarketParams | null {
    if (!this._addresses.marketParams) {
      const fakeUSD = this.fakeUSD;
      const fakeTIA = this.fakeTIA;
      const oracle = this.oracle;
      
      if (!fakeUSD || !fakeTIA || !oracle) {
        console.warn('⚠️ Cannot create market params - missing required addresses');
        return null;
      }
      
      this._addresses.marketParams = new MarketParams({
        loanToken: fakeUSD as `0x${string}`,
        collateralToken: fakeTIA as `0x${string}`,
        oracle: oracle as `0x${string}`,
        irm: MORPHO_ADDRESSES.irmMock,
            lltv: BigInt(process.env.NEXT_PUBLIC_LLTV || '800000000000000000'),
      });
    }
    return this._addresses.marketParams;
  }

  get marketId(): string | null {
    // Check environment variable override first
    if (ENV_OVERRIDES.marketId) {
      return ENV_OVERRIDES.marketId;
    }
    const params = this.marketParams;
    return params ? params.id : null;
  }

  get vault(): string | null {
    if (!this._addresses.vault) {
      // Check environment variable override first
      if (ENV_OVERRIDES.vault) {
        this._addresses.vault = ENV_OVERRIDES.vault;
      } else {
        // Extract vault address from deployment artifacts (factory-deployed via CREATE2)
        if (deployVaultArtifact) {
          // Look for MetaMorpho factory call transaction
          const factoryTransaction = deployVaultArtifact.transactions.find((tx: DeploymentTransaction) => 
            tx.transactionType === 'CALL' && tx.function && tx.function.includes('createMetaMorpho')
          );
          
          if (factoryTransaction && factoryTransaction.additionalContracts) {
            // Find the CREATE2 deployment in additionalContracts
            const additionalContracts = factoryTransaction.additionalContracts as Array<{
              transactionType: string;
              address: string;
            }>;
            
            const vaultContract = additionalContracts.find(contract => 
              contract.transactionType === 'CREATE2'
            );
            
            if (vaultContract) {
              this._addresses.vault = vaultContract.address;
            } else {
              console.warn('⚠️ Vault CREATE2 deployment not found in additionalContracts');
              this._addresses.vault = null;
            }
          } else {
            console.warn('⚠️ MetaMorpho factory transaction not found in deployment artifacts');
            this._addresses.vault = null;
          }
        } else {
          console.warn('⚠️ DeployVault artifact not available');
          this._addresses.vault = null;
        }
      }
    }
    return this._addresses.vault;
  }
}

// Singleton instance
const addressManager = ContractAddressManager.getInstance();

// Export the address manager and market params for use in other files
export { addressManager };
export const getMarketParams = () => addressManager.marketParams;

// Legacy function for backward compatibility
function getMarketId(): string | null {
  return addressManager.marketId;
}

// Contract addresses from Forge deployment artifacts using centralized manager
export const contracts = {
  // Deployed tokens
  tokens: {
    fakeUSD: addressManager.fakeUSD,
    fakeTIA: addressManager.fakeTIA,
  },

  // Oracle infrastructure
  // Defaults to OracleMock (Eden/testnet approach)
  // Falls back to Aggregator + OracleFromAggregator (Chainlink-compatible approach)
  oracles: {
    oracle: addressManager.oracle, // OracleMock or OracleFromAggregator
    aggregator: {
      pair: 'fakeTIA/fakeUSD',
      address: addressManager.aggregator, // Optional - only for Chainlink-compatible approach
    },
  },

  // Morpho Blue addresses (from environment variables)
  morpho: MORPHO_ADDRESSES,

  // Market configuration using centralized manager
  markets: {
    sandbox: {
      id: getMarketId(),
      irm: MORPHO_ADDRESSES.irmMock,
          lltv: process.env.NEXT_PUBLIC_LLTV || '800000000000000000',
      loanToken: addressManager.fakeUSD,
      collateralToken: addressManager.fakeTIA,
      oracle: addressManager.oracle,
    },
  },

  // Vault configuration
  vaults: {
    metaMorphoDemo: {
      address: addressManager.vault,
      asset: addressManager.fakeUSD, // fakeUSD is the vault's underlying asset
      name: 'Morpho Demo Vault',
      symbol: 'mdUSD',
    },
  },
} as const;

// Export individual addresses for convenience
export const {
  tokens,
  oracles,
  morpho,
  markets,
  vaults,
} = contracts;

// Deployment metadata
export const deploymentInfo = {
  network: process.env.NEXT_PUBLIC_CHAIN_NAME?.toLowerCase().replace(/\s+/g, '-') || 'eden-testnet',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '3735928814'),
  deployer: '0x2f63f292C01A179E06f5275Cfe3278C1Efa7A1A2',
  deploymentDate: new Date().toISOString(),
  
  // Transaction hashes from deployment (only include artifacts that exist)
  transactions: {
    deployTokens: deployTokensArtifact?.transactions.map((tx: DeploymentTransaction) => tx.hash) || [],
    deployOracleMock: deployOracleMockArtifact?.transactions.map((tx: DeploymentTransaction) => tx.hash) || [],
    // Optional: Chainlink-compatible approach
    deployAggregator: deployAggregatorArtifact?.transactions.map((tx: DeploymentTransaction) => tx.hash) || [],
    deployOracle: deployOracleArtifact?.transactions.map((tx: DeploymentTransaction) => tx.hash) || [],
    createMarket: createMarketArtifact?.transactions.map((tx: DeploymentTransaction) => tx.hash) || [],
    deployVault: deployVaultArtifact?.transactions.map((tx: DeploymentTransaction) => tx.hash) || [],
  },
};

// Helper function to get block explorer URLs
// Reads from environment variable, allowing easy network switching
export function getEtherscanUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  const baseUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://eden-testnet.blockscout.com';
  return `${baseUrl}/${type}/${address}`;
}

// Alias for better clarity (keeping getEtherscanUrl for backward compatibility)
export const getExplorerUrl = getEtherscanUrl;

// Validation function to ensure all addresses are valid
export function validateContracts(): boolean {
  try {
    // Check that all addresses are valid Ethereum addresses
    const allAddresses = [
      contracts.tokens.fakeUSD,
      contracts.tokens.fakeTIA,
      contracts.oracles.aggregator.address,
      contracts.oracles.oracle,
      contracts.morpho.morphoBlueCore,
      contracts.markets.sandbox.loanToken,
      contracts.markets.sandbox.collateralToken,
      contracts.markets.sandbox.oracle,
      contracts.vaults.metaMorphoDemo.address,
    ];

    for (const address of allAddresses) {
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        console.error('Invalid address:', address);
        return false;
      }
    }

    console.log('✅ All contract addresses validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Contract validation failed:', error);
    return false;
  }
}
