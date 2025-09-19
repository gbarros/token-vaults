// Contract addresses and configuration loaded from Forge deployment artifacts
// This replaces the old manual config/addresses.ts system

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
import deployTokensArtifact from '../../../contracts/broadcast/DeployTokens.s.sol/11155111/run-latest.json';
import deployAggregatorArtifact from '../../../contracts/broadcast/DeployAggregator.s.sol/11155111/run-latest.json';
import deployOracleArtifact from '../../../contracts/broadcast/DeployOracle.s.sol/11155111/run-latest.json';
import createMarketArtifact from '../../../contracts/broadcast/CreateMarket.s.sol/11155111/run-latest.json';

// Extract contract addresses from deployment artifacts
function getContractAddress(artifact: DeploymentArtifact, contractName: string): string {
  const transaction = artifact.transactions.find((tx: DeploymentTransaction) => 
    tx.contractName === contractName && tx.transactionType === 'CREATE'
  );
  if (!transaction) {
    throw new Error(`Contract ${contractName} not found in deployment artifacts`);
  }
  return transaction.contractAddress;
}

// Extract market ID from market creation logs
function getMarketId(): string {
  // The market ID is computed as keccak256(abi.encode(marketParams))
  // For now, we'll use the hardcoded value from our deployment
  // TODO: Parse from transaction logs or compute dynamically
  return '0x0761d379cc7d1212f71ad42bba304a80f1250baa0ad7a615a2501ac5f0e6ccb5';
}

// Contract addresses from Forge deployment artifacts
export const contracts = {
  // Deployed tokens
  tokens: {
    fakeUSD: getContractAddress(deployTokensArtifact as DeploymentArtifact, 'FaucetERC20') as `0x${string}`,
    fakeTIA: (() => {
      // Get the second FaucetERC20 deployment (fakeTIA)
      const faucetDeployments = (deployTokensArtifact as DeploymentArtifact).transactions.filter((tx: DeploymentTransaction) => 
        tx.contractName === 'FaucetERC20' && tx.transactionType === 'CREATE'
      );
      if (faucetDeployments.length < 2) {
        throw new Error('fakeTIA deployment not found');
      }
      return faucetDeployments[1].contractAddress;
    })() as `0x${string}`,
  },

  // Oracle infrastructure
  oracles: {
    aggregator: {
      pair: 'fakeTIA/fakeUSD',
      address: getContractAddress(deployAggregatorArtifact as DeploymentArtifact, 'SettableAggregator') as `0x${string}`,
    },
    builtOracle: getContractAddress(deployOracleArtifact as DeploymentArtifact, 'OracleFromAggregator') as `0x${string}`,
  },

  // Morpho Blue addresses (Sepolia - these are constants)
  morpho: {
    metaMorphoFactory: '0x98CbFE4053ad6778E0E3435943aC821f565D0b03' as `0x${string}`,
    morphoBlueCore: '0xd011EE229E7459ba1ddd22631eF7bF528d424A14' as `0x${string}`,
    oracleV2Factory: '0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD' as `0x${string}`,
    publicAllocator: '0xfd32fA2ca22c76dD6E550706Ad913FC6CE91c75D' as `0x${string}`,
    adaptiveCurveIRM: '0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c' as `0x${string}`,
  },

  // Market configuration
  markets: {
    sandbox: {
      id: getMarketId(),
      irm: '0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c' as `0x${string}`,
      lltv: '860000000000000000', // 86% LLTV (18 decimals)
      loanToken: getContractAddress(deployTokensArtifact as DeploymentArtifact, 'FaucetERC20') as `0x${string}`,
      collateralToken: (() => {
        const faucetDeployments = (deployTokensArtifact as DeploymentArtifact).transactions.filter((tx: DeploymentTransaction) => 
          tx.contractName === 'FaucetERC20' && tx.transactionType === 'CREATE'
        );
        return faucetDeployments[1].contractAddress;
      })() as `0x${string}`,
      oracle: getContractAddress(deployOracleArtifact as DeploymentArtifact, 'OracleFromAggregator') as `0x${string}`,
    },
  },
} as const;

// Export individual addresses for convenience
export const {
  tokens,
  oracles,
  morpho,
  markets,
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
