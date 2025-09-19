# Forge Deployment Scripts

This directory contains Forge scripts that replace the TypeScript ops scripts for cleaner, more standard contract deployment and interaction.

## 📁 Available Scripts

### Core Deployment Scripts
- **`DeployTokens.s.sol`** - Deploy fakeUSD and fakeTIA faucet tokens
- **`DeployAggregator.s.sol`** - Deploy SettableAggregator for price control
- **`DeployOracle.s.sol`** - Deploy custom OracleFromAggregator (36-decimal scaling)
- **`CreateMarket.s.sol`** - Create Morpho Blue sandbox market
- **`InitializeUtilization.s.sol`** - Initialize market with liquidity and borrowing

### Utility Scripts
- **`UpdateAggregatorPrice.s.sol`** - Update aggregator price for testing
- **`BuildMorphoOracle.s.sol`** - Build oracle using Morpho's factory (alternative)

## 🚀 Usage

### 1. Setup Environment
```bash
# Copy and fill REQUIRED variables only
cp env.example .env
# Edit .env with your private key, RPC URL, and Etherscan API key
# DO NOT manually fill contract addresses - they auto-populate from deployments
```

### 2. Deploy in Sequence
```bash
# 1. Deploy tokens
forge script script/DeployTokens.s.sol --rpc-url $RPC_URL --broadcast --verify
./update-env-from-artifacts.sh  # Auto-populate LOAN_TOKEN, COLLATERAL_TOKEN

# 2. Deploy aggregator  
forge script script/DeployAggregator.s.sol --rpc-url $RPC_URL --broadcast --verify
./update-env-from-artifacts.sh  # Auto-populate AGGREGATOR_ADDRESS

# 3. Deploy oracle
forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --broadcast --verify
./update-env-from-artifacts.sh  # Auto-populate ORACLE_ADDRESS

# 4. Create market
forge script script/CreateMarket.s.sol --rpc-url $RPC_URL --broadcast --verify

# 5. Initialize utilization
forge script script/InitializeUtilization.s.sol --rpc-url $RPC_URL --broadcast
```

### 3. Update Prices (Optional)
```bash
# Update aggregator price to 15000
PRICE=15000 forge script script/UpdateAggregatorPrice.s.sol --rpc-url $RPC_URL --broadcast
```

## 📋 Environment Variables

**REQUIRED** (set manually):
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=https://sepolia.infura.io/v3/your_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**AUTO-POPULATED** (via `./update-env-from-artifacts.sh`):
```bash
LOAN_TOKEN=        # From DeployTokens.s.sol
COLLATERAL_TOKEN=  # From DeployTokens.s.sol  
AGGREGATOR_ADDRESS=# From DeployAggregator.s.sol
ORACLE_ADDRESS=    # From DeployOracle.s.sol
```

**CONSTANTS** (pre-configured for Sepolia):
```bash
MORPHO_BLUE_CORE=0xd011EE229E7459ba1ddd22631eF7bF528d424A14
MORPHO_ORACLE_FACTORY=0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD
IRM_ADDRESS=0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c
LLTV=860000000000000000
```

## 🔧 Benefits of Forge Scripts

- **Native Forge Integration** - Built-in deployment tracking and gas estimation
- **Automatic Verification** - Etherscan verification with `--verify` flag
- **Deployment Artifacts** - JSON outputs with addresses and transaction data
- **Environment Automation** - Auto-populate addresses with `update-env-from-artifacts.sh`
- **No Dependencies** - Pure Solidity, no TypeScript/Node.js complications

## 📊 Deployment Outputs

Forge automatically creates:
- `broadcast/` directory with deployment artifacts
- JSON files with contract addresses and transaction hashes
- Gas usage reports and verification status

These artifacts can be parsed by other tools for address book updates.
