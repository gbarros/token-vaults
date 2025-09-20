# Forge Deployment Scripts

This directory contains Forge scripts that replace the TypeScript ops scripts for cleaner, more standard contract deployment and interaction.

## 📁 Available Scripts

### Core Deployment Scripts
- **`DeployTokens.s.sol`** - Deploy fakeUSD and fakeTIA faucet tokens
- **`DeployAggregator.s.sol`** - Deploy SettableAggregator for price control
- **`DeployOracle.s.sol`** - Deploy custom OracleFromAggregator (36-decimal scaling)
- **`CreateMarket.s.sol`** - Create Morpho Blue sandbox market
- **`DeployVault.s.sol`** - Deploy MetaMorpho v1.1 vault with role setup
- **`InitializeUtilization.s.sol`** - Initialize market with liquidity and borrowing (basic)

### Improved Initialization Scripts
- **`InitializeUtilizationImproved.s.sol`** - Advanced market initialization with multiple scenarios
- **`ResetMarket.s.sol`** - Reset market by withdrawing all positions (fixes abnormal ratios)
- **`AnalyzeAndInitialize.s.sol`** - Comprehensive market analysis and auto-initialization

### Utility Scripts
- **`UpdateAggregatorPrice.s.sol`** - Update aggregator price for testing
- **`BuildMorphoOracle.s.sol`** - Build oracle using Morpho's factory (alternative)
- **`TestBorrowing.s.sol`** - Test borrowing functionality
- **`MintTokens.s.sol`** - Mint additional tokens for testing

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

# 5. Deploy MetaMorpho vault (NEW in M1)
forge script script/DeployVault.s.sol --rpc-url $RPC_URL --broadcast --verify

# 6. Initialize utilization (choose one)
# Option A: Basic initialization (original)
forge script script/InitializeUtilization.s.sol --rpc-url $RPC_URL --broadcast

# Option B: Improved initialization with scenarios
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast

# Option C: Analyze and auto-initialize
AUTO_FIX=true forge script script/AnalyzeAndInitialize.s.sol --rpc-url $RPC_URL --broadcast
```

### 3. Initialization Scenarios

The improved initialization scripts support multiple scenarios:

```bash
# Low utilization (30%) - Conservative
INIT_SCENARIO=0 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast

# Medium utilization (60%) - Balanced (default)
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast

# High utilization (80%) - Aggressive
INIT_SCENARIO=2 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast

# Custom amounts
INIT_SCENARIO=3 CUSTOM_SUPPLY_AMOUNT=2000000000000000000000 CUSTOM_COLLATERAL_AMOUNT=1600000000000000000000 CUSTOM_BORROW_AMOUNT=1200000000000000000000 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast
```

### 4. Market Analysis and Troubleshooting

```bash
# Analyze current market state
forge script script/AnalyzeAndInitialize.s.sol --rpc-url $RPC_URL

# Auto-fix detected issues
AUTO_FIX=true forge script script/AnalyzeAndInitialize.s.sol --rpc-url $RPC_URL --broadcast

# Reset market if shares/assets ratio is abnormal
forge script script/ResetMarket.s.sol --rpc-url $RPC_URL --broadcast
```

### 5. Update Prices (Optional)
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
METAMORPHO_FACTORY=0x98CbFE4053ad6778E0E3435943aC821f565D0b03
MORPHO_ORACLE_FACTORY=0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD
IRM_ADDRESS=0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c
LLTV=860000000000000000
```

**OPTIONAL** (for advanced scripts):
```bash
# Initialization scenarios (0=LOW, 1=MEDIUM, 2=HIGH, 3=CUSTOM)
INIT_SCENARIO=1

# Custom initialization amounts (only used with INIT_SCENARIO=3)
CUSTOM_SUPPLY_AMOUNT=1000000000000000000000    # 1000 tokens
CUSTOM_COLLATERAL_AMOUNT=800000000000000000000 # 800 tokens  
CUSTOM_BORROW_AMOUNT=600000000000000000000     # 600 tokens

# Auto-fix flag for AnalyzeAndInitialize.s.sol
AUTO_FIX=false

# Price for UpdateAggregatorPrice.s.sol
PRICE=5000  # 50.00 with 2 decimals
```

## 🔧 Benefits of Forge Scripts

- **Native Forge Integration** - Built-in deployment tracking and gas estimation
- **Automatic Verification** - Etherscan verification with `--verify` flag
- **Deployment Artifacts** - JSON outputs with addresses and transaction data
- **Environment Automation** - Auto-populate addresses with `update-env-from-artifacts.sh`
- **No Dependencies** - Pure Solidity, no TypeScript/Node.js complications

## 📋 Contract Verification

### Standard Contracts (Direct Deployment)
Most contracts deploy directly and verify automatically with the `--verify` flag:
```bash
forge script script/DeployTokens.s.sol --rpc-url $RPC_URL --broadcast --verify
```

### Factory-Deployed Contracts (MetaMorpho Vaults)
The `DeployVault.s.sol` script deploys vaults through the MetaMorpho factory, which requires manual verification:

```bash
# 1. Deploy the vault (verification will fail, but deployment succeeds)
forge script script/DeployVault.s.sol --rpc-url $RPC_URL --broadcast --verify

# 2. Extract the deployed vault address from the logs
# Look for: "MetaMorpho vault deployed at: 0x..."

# 3. Verify the factory-deployed contract manually
forge verify-contract <VAULT_ADDRESS> \
  lib/metamorpho-v1.1/src/MetaMorphoV1_1.sol:MetaMorphoV1_1 \
  --rpc-url $RPC_URL \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,uint256,address,string,string)" \
    <OWNER_ADDRESS> \
    <TIMELOCK> \
    <ASSET_ADDRESS> \
    "<NAME>" \
    "<SYMBOL>")
```

### Example Vault Verification
```bash
# Example for vault deployed at 0x0717BC7BF201bA2d6B07B6F0A3F703b9d1A97C32
forge verify-contract 0x0717BC7BF201bA2d6B07B6F0A3F703b9d1A97C32 \
  lib/metamorpho-v1.1/src/MetaMorphoV1_1.sol:MetaMorphoV1_1 \
  --rpc-url $RPC_URL \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,uint256,address,string,string)" \
    0x2f63f292C01A179E06f5275Cfe3278C1Efa7A1A2 \
    0 \
    0x1b909218c474807550209a7E83875289004Ae969 \
    "Morpho Demo Vault" \
    "mdUSD")
```

### Factory-Deployed Contract Verification Status
**Note**: MetaMorpho vaults deployed through the factory typically show as "Similar Match Source Code" on Etherscan, which means:
- ✅ The bytecode is verified and matches known MetaMorphoV1_1 contracts
- ✅ The source code is visible and readable on Etherscan
- ✅ All contract interactions work normally
- ⚠️ The contract may not show a green "✓" verified checkmark

This is **normal and expected** for factory-deployed contracts and does not affect functionality.

### Manual Verification (Optional)
If you need full verification, you can try:

```bash
# Method 1: Using flattened source (recommended)
forge flatten lib/metamorpho-v1.1/src/MetaMorphoV1_1.sol > MetaMorphoV1_1_flattened.sol
# Then verify via Etherscan web interface using the flattened file

# Method 2: Direct verification (may fail due to complex dependencies)
forge verify-contract $VAULT_ADDRESS \
  lib/metamorpho-v1.1/src/MetaMorphoV1_1.sol:MetaMorphoV1_1 \
  --rpc-url $RPC_URL \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Etherscan Web Interface Verification
1. Go to your vault address on [Sepolia Etherscan](https://sepolia.etherscan.io)
2. If you see "Similar Match Source Code", the contract is effectively verified
3. For full verification: Click "Contract" → "Verify and Publish"
4. Use the flattened source file created above

## 📊 Deployment Outputs

Forge automatically creates:
- `broadcast/` directory with deployment artifacts
- JSON files with contract addresses and transaction hashes
- Gas usage reports and verification status

These artifacts can be parsed by other tools for address book updates.

## 🔧 Troubleshooting

### Problem: APRs showing 0.00% in frontend

**Cause**: Abnormal shares/assets ratio in the market (e.g., 1,000,000:1 instead of 1:1)

**Solution**:
```bash
# 1. Analyze the market
forge script script/AnalyzeAndInitialize.s.sol --rpc-url $RPC_URL

# 2. If abnormal ratio detected, reset and reinitialize
forge script script/ResetMarket.s.sol --rpc-url $RPC_URL --broadcast
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast
```

### Problem: "Insufficient token balance" errors

**Solution**:
```bash
# Mint more tokens
forge script script/MintTokens.s.sol --rpc-url $RPC_URL --broadcast
```

### Problem: Oracle price is stale

**Solution**:
```bash
# Update oracle price
PRICE=5000 forge script script/UpdateAggregatorPrice.s.sol --rpc-url $RPC_URL --broadcast
```

### Problem: Want to test different utilization scenarios

**Solution**:
```bash
# Try different scenarios
INIT_SCENARIO=0 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast  # 30%
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast  # 60%  
INIT_SCENARIO=2 forge script script/InitializeUtilizationImproved.s.sol --rpc-url $RPC_URL --broadcast  # 80%
```

### Problem: Market analysis shows "MARKET_HEALTHY" but frontend still has issues

**Cause**: Frontend might be caching old data or using wrong contract addresses

**Solution**:
1. Check that `frontend/src/lib/contracts.ts` is reading the correct deployment artifacts
2. Clear browser cache and refresh
3. Verify contract addresses match between deployment artifacts and frontend config
