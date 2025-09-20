// Contract addresses and configuration loaded from Forge deployment artifacts
// This replaces the old manual config/addresses.ts system

import { MarketParams } from '@morpho-org/blue-sdk';

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
let deployAggregatorArtifact: DeploymentArtifact | null = null;
let deployOracleArtifact: DeploymentArtifact | null = null;
let createMarketArtifact: DeploymentArtifact | null = null;
let deployVaultArtifact: DeploymentArtifact | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployTokensArtifact = require('../../../contracts/broadcast/DeployTokens.s.sol/11155111/run-latest.json');
} catch {
  console.warn('⚠️ DeployTokens artifact not found - tokens will not be available');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployAggregatorArtifact = require('../../../contracts/broadcast/DeployAggregator.s.sol/11155111/run-latest.json');
} catch {
  console.warn('⚠️ DeployAggregator artifact not found - aggregator will not be available');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployOracleArtifact = require('../../../contracts/broadcast/DeployOracle.s.sol/11155111/run-latest.json');
} catch {
  console.warn('⚠️ DeployOracle artifact not found - oracle will not be available');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  createMarketArtifact = require('../../../contracts/broadcast/CreateMarket.s.sol/11155111/run-latest.json');
} catch {
  console.warn('⚠️ CreateMarket artifact not found - market will not be available');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deployVaultArtifact = require('../../../contracts/broadcast/DeployVault.s.sol/11155111/run-latest.json');
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
      this._addresses.fakeUSD = this.getContractAddress(deployTokensArtifact, 'FaucetERC20');
    }
    return this._addresses.fakeUSD;
  }

  get fakeTIA(): string | null {
    if (!this._addresses.fakeTIA) {
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
    return this._addresses.fakeTIA;
  }

  get aggregator(): string | null {
    if (!this._addresses.aggregator) {
      this._addresses.aggregator = this.getContractAddress(deployAggregatorArtifact, 'SettableAggregator');
    }
    return this._addresses.aggregator;
  }

  get oracle(): string | null {
    if (!this._addresses.oracle) {
      this._addresses.oracle = this.getContractAddress(deployOracleArtifact, 'OracleFromAggregator');
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
        irm: '0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c' as `0x${string}`, // Adaptive Curve IRM (Sepolia)
        lltv: BigInt('860000000000000000'), // 86% LLTV
      });
    }
    return this._addresses.marketParams;
  }

  get marketId(): string | null {
    const params = this.marketParams;
    return params ? params.id : null;
  }

  get vault(): string | null {
    if (!this._addresses.vault) {
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
  oracles: {
    aggregator: {
      pair: 'fakeTIA/fakeUSD',
      address: addressManager.aggregator,
    },
    builtOracle: addressManager.oracle,
  },

  // Morpho Blue addresses (Sepolia - these are constants)
  morpho: {
    metaMorphoFactory: '0x98CbFE4053ad6778E0E3435943aC821f565D0b03' as `0x${string}`,
    morphoBlueCore: '0xd011EE229E7459ba1ddd22631eF7bF528d424A14' as `0x${string}`,
    oracleV2Factory: '0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD' as `0x${string}`,
    publicAllocator: '0xfd32fA2ca22c76dD6E550706Ad913FC6CE91c75D' as `0x${string}`,
    adaptiveCurveIRM: '0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c' as `0x${string}`,
  },

  // Market configuration using centralized manager
  markets: {
    sandbox: {
      id: getMarketId(),
      irm: '0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c' as `0x${string}`,
      lltv: '860000000000000000', // 86% LLTV (18 decimals)
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
  network: 'sepolia',
  chainId: 11155111,
  deployer: '0x2f63f292C01A179E06f5275Cfe3278C1Efa7A1A2',
  deploymentDate: new Date().toISOString(),
  
  // Transaction hashes from deployment
  transactions: {
    deployTokens: (deployTokensArtifact as DeploymentArtifact).transactions.map((tx: DeploymentTransaction) => tx.hash),
    deployAggregator: (deployAggregatorArtifact as DeploymentArtifact).transactions.map((tx: DeploymentTransaction) => tx.hash),
    deployOracle: (deployOracleArtifact as DeploymentArtifact).transactions.map((tx: DeploymentTransaction) => tx.hash),
    createMarket: (createMarketArtifact as DeploymentArtifact).transactions.map((tx: DeploymentTransaction) => tx.hash),
  },
};

// Helper function to get Etherscan URLs
export function getEtherscanUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  const baseUrl = 'https://sepolia.etherscan.io';
  return `${baseUrl}/${type}/${address}`;
}

// Validation function to ensure all addresses are valid
export function validateContracts(): boolean {
  try {
    // Check that all addresses are valid Ethereum addresses
    const allAddresses = [
      contracts.tokens.fakeUSD,
      contracts.tokens.fakeTIA,
      contracts.oracles.aggregator.address,
      contracts.oracles.builtOracle,
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
