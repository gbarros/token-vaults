/**
 * Bot Simulation System Configuration
 * 
 * This file controls bot behavior, strategies, and execution parameters.
 * For chain configuration (RPC, addresses, etc.), see .env file.
 */

export interface BotConfig {
  logging: {
    console: boolean;
    file: boolean;
    logDir: string;
  };
  wallets: {
    seedPhrase: string;
    ethPerWallet: string;
    tokensPerWallet: string;
    minDeployerBalance: string;
    autoRefill: {
      enabled: boolean;
      minBalanceThreshold: string;
      refillAmount: string;
    };
  };
  execution: {
    maxCycles: number;
    stopOnError: boolean;
  };
  lenders: {
    enabled: boolean;
    agentCount: number;
    minInterval: number;
    maxInterval: number;
    minSupply: string;
    maxSupply: string;
    strategy: 'random' | 'aggressive' | 'conservative';
  };
  borrowers: {
    enabled: boolean;
    agentCount: number;
    smartRatio: number;
    minInterval: number;
    maxInterval: number;
    minHealthFactor: number;
    targetUtilization: number;
  };
  vaultUsers: {
    enabled: boolean;
    agentCount: number;
    minInterval: number;
    maxInterval: number;
    minDeposit: string;
    maxDeposit: string;
    minWithdraw: string;
    maxWithdraw: string;
    withdrawalProbability: number;
    minAPYToStay: number;
    vaultCapacityThreshold: number;
  };
  oracleChangers: {
    enabled: boolean;
    agentCount: number;
    minInterval: number;
    maxInterval: number;
    minPriceChange: number;
    maxPriceChange: number;
    absoluteMin: number;
    absoluteMax: number;
  };
  liquidators: {
    enabled: boolean;
    agentCount: number;
    checkInterval: number;
    minProfitThreshold: string;
  };
}

export const botConfig: BotConfig = {
  logging: {
    console: true,
    file: true,
    logDir: './logs'
  },
  
  wallets: {
    // Deterministic seed for reproducible wallets
    seedPhrase: 'test test test test test test test test test test test junk',
    // ETH is scarce - only 0.1 per wallet for gas
    ethPerWallet: '0.1',
    // Tokens are generous but respect 2000/call faucet limit
    // 5000 = 3 faucet calls (2000 + 2000 + 1000) with 60s delays
    tokensPerWallet: '5000',
    // Warn if deployer drops below 1 ETH
    minDeployerBalance: '1.0',
    // Auto-refill thresholds (bots auto-mint from faucet when low)
    autoRefill: {
      enabled: true,
      minBalanceThreshold: '500',  // Refill when balance < 500 tokens
      refillAmount: '2000'          // Mint 2000 tokens per refill (max faucet allows)
    }
  },
  
  execution: {
    // 0 = run forever, >0 = stop after N cycles
    maxCycles: 0,
    // Continue on individual bot errors
    stopOnError: false
  },
  
  lenders: {
    enabled: true,
    agentCount: 2,        // Reduced from 3 to 2
    minInterval: 60000,   // 1 minute (reduced frequency)
    maxInterval: 180000,  // 3 minutes (reduced frequency)
    minSupply: '50',      // 50 fakeUSD (reduced from 100)
    maxSupply: '300',     // 300 fakeUSD (reduced from 1000)
    strategy: 'random'
    // Event-driven: if utilization > 90%, supply more aggressively
  },
  
  borrowers: {
    enabled: true,
    agentCount: 5,        // Increased from 4 to 5
    // 50% smart (monitor health factor), 50% dumb (random actions)
    smartRatio: 0.5,
    minInterval: 30000,   // 30 seconds (increased frequency)
    maxInterval: 120000,  // 2 minutes (increased frequency)
    // Smart borrowers keep health factor above 1.5
    minHealthFactor: 1.5,
    // Target 75% utilization of collateral (increased from 70%)
    targetUtilization: 0.75
    // Event-driven: if market utilization < 20%, borrow more
  },
  
  vaultUsers: {
    enabled: true,
    agentCount: 3,        // Reduced from 5 to 3
    minInterval: 60000,   // 1 minute (reduced frequency)
    maxInterval: 180000,  // 3 minutes (reduced frequency)
    minDeposit: '50',     // 50 fakeUSD
    maxDeposit: '400',    // 400 fakeUSD (reduced from 800)
    minWithdraw: '50',    // 50 shares minimum
    maxWithdraw: '500',   // 500 shares maximum
    // 0.5% chance per cycle to withdraw instead of deposit
    withdrawalProbability: 0.005,
    // If APY drops below 2%, increase withdrawal probability
    minAPYToStay: 2.0,
    // Pause deposits if vault is above 95% capacity
    vaultCapacityThreshold: 0.95
  },
  
  oracleChangers: {
    enabled: true,
    agentCount: 1,
    minInterval: 120000,  // 2 minutes
    maxInterval: 300000,  // 5 minutes
    minPriceChange: 0.02, // ±2% per change
    maxPriceChange: 0.08, // ±8% per change
    absoluteMin: 3.0,     // Never go below $3
    absoluteMax: 7.0      // Never go above $7
  },
  
  liquidators: {
    enabled: true,
    agentCount: 2,
    checkInterval: 15000, // Check every 15 seconds
    // Only liquidate if profit > 10 fakeUSD
    minProfitThreshold: '10'
  }
};

