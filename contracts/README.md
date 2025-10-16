# Forge Deployment Scripts

This directory contains Forge scripts that replace the TypeScript ops scripts for cleaner, more standard contract deployment and interaction.

## 📁 Available Scripts

### Core Deployment Scripts
- **`DeployTokens.s.sol`** - Deploy fakeUSD and fakeTIA faucet tokens

**Oracle Options (choose one):**
- **`DeployOracleMock.s.sol`** - Deploy simple OracleMock ⭐ **Recommended for Eden Testnet**
  - Direct price setting for educational purposes
  - No intermediate contracts needed
  - Simpler to understand and test
- **`DeployAggregator.s.sol`** + **`DeployOracle.s.sol`** - Deploy SettableAggregator + OracleFromAggregator
  - Alternative pattern showing aggregator architecture
  - Kept for reference and Sepolia compatibility
  - More complex but closer to production patterns

**Market & Vault:**
- **`CreateMarket.s.sol`** - Create Morpho Blue sandbox market
- **`DeployVault.s.sol`** - Deploy MetaMorpho v1.1 vault with role setup and auto-configure market (submitCap + acceptCap)
- **`InitializeUtilization.s.sol`** - Initialize market with liquidity and borrowing (basic)

### Improved Initialization Scripts
- **`InitializeUtilizationImproved.s.sol`** - Advanced market initialization with multiple scenarios
- **`ResetMarket.s.sol`** - Reset market by withdrawing all positions (fixes abnormal ratios)
- **`AnalyzeAndInitialize.s.sol`** - Comprehensive market analysis and auto-initialization

### Utility Scripts
- **`MintTokens.s.sol`** - Mint tokens (2000 fakeUSD + 1500 fakeTIA) - **Required before initialization**
- **`SetSupplyQueue.s.sol`** - Set supply queue for vault (use if vault cannot accept deposits)
- **`AcceptCap.s.sol`** - Accept pending supply cap (use if DeployVault didn't call acceptCap)
- **`UpdateOracleMockPrice.s.sol`** - Update OracleMock price for testing
- **`UpdateAggregatorPrice.s.sol`** - Update aggregator price for testing (if using OracleFromAggregator)
- **`TestBorrowing.s.sol`** - Test borrowing functionality

### Alternative Scripts (Not Typically Used)
- **`BuildMorphoOracle.s.sol`** - Build oracle using Morpho's factory (requires MORPHO_ORACLE_FACTORY on network)

## 🚀 Usage

### 1. Setup Environment
```bash
# Copy and fill REQUIRED variables only
cp env.example .env
# Edit .env with your private key and RPC URL (Eden Testnet)
# ETHERSCAN_API_KEY not required for Blockscout verification
# DO NOT manually fill contract addresses - they auto-populate from deployments
```

**Notes:**
- We use the named RPC endpoint `eden` (defined in `foundry.toml`) instead of `--rpc-url $RPC_URL`. This is cleaner and avoids redundancy.
- **Blockscout Verification**: Eden Testnet uses Blockscout (not Etherscan), which doesn't require an API key. Simply add `--verify --verifier blockscout --verifier-url 'https://eden-testnet.blockscout.com/api/'` to your forge script commands.

### 2. Deploy in Sequence

#### Deployment Sequence (Eden Testnet)
```bash
# Note: Using 'eden' RPC endpoint defined in foundry.toml

# 1. Deploy tokens
forge script script/DeployTokens.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'
./update-env-from-artifacts.sh  # Auto-populate LOAN_TOKEN, COLLATERAL_TOKEN

# 2. Deploy OracleMock (simple, no aggregator needed)
INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'
./update-env-from-artifacts.sh  # Auto-populate ORACLE_ADDRESS

# 3. Create market
forge script script/CreateMarket.s.sol --rpc-url eden --broadcast

# 4. Deploy MetaMorpho vault (auto-configures market with supply cap)
# Note: Script submits AND accepts the cap (timelock=0 for hackathon speed)
forge script script/DeployVault.s.sol --rpc-url eden --broadcast
./update-env-from-artifacts.sh # Auto-populate VAULT_ADDRESS

# 5. Mint tokens for initialization
# IMPORTANT: Fresh deployments start with 0 balance
# MintTokens gives 2000 fakeUSD + 1500 fakeTIA (enough for all scenarios)
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# 6. Initialize utilization (choose one)
# Option A: Basic initialization
forge script script/InitializeUtilization.s.sol --rpc-url eden --broadcast

# Option B: Improved initialization with scenarios
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast

# Option C: Analyze and auto-initialize
AUTO_FIX=true forge script script/AnalyzeAndInitialize.s.sol --rpc-url eden --broadcast
```

**Note**: For Eden Testnet, we use a simple `OracleMock` instead of the more complex `SettableAggregator` + `OracleFromAggregator` pattern. The aggregator-based scripts are kept in the repo for educational reference only.

### 3. Initialization Scenarios

The improved initialization scripts support multiple scenarios:

```bash
# Low utilization (30%) - Conservative
INIT_SCENARIO=0 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast

# Medium utilization (60%) - Balanced (default)
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast

# High utilization (80%) - Aggressive
INIT_SCENARIO=2 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast

# Custom amounts
INIT_SCENARIO=3 CUSTOM_SUPPLY_AMOUNT=2000000000000000000000 CUSTOM_COLLATERAL_AMOUNT=1600000000000000000000 CUSTOM_BORROW_AMOUNT=1200000000000000000000 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast
```

### 4. Market Analysis and Troubleshooting

```bash
# Analyze current market state
forge script script/AnalyzeAndInitialize.s.sol --rpc-url eden

# Auto-fix detected issues
AUTO_FIX=true forge script script/AnalyzeAndInitialize.s.sol --rpc-url eden --broadcast

# Reset market if shares/assets ratio is abnormal
forge script script/ResetMarket.s.sol --rpc-url eden --broadcast
```

### 5. Update Prices (Optional)

**If using OracleMock:**
```bash
# Update oracle price to 5000 (50.00 with 2 decimals)
PRICE=5000 forge script script/UpdateOracleMockPrice.s.sol --rpc-url eden --broadcast
```

**If using OracleFromAggregator:**
```bash
# Update aggregator price to 5000 (50.00 with 2 decimals)
PRICE=5000 forge script script/UpdateAggregatorPrice.s.sol --rpc-url eden --broadcast
```

## 📋 Environment Variables

**REQUIRED** (set manually):
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=https://ev-reth-eden-testnet.binarybuilders.services:8545
```

**OPTIONAL** (for verification only - not needed for Eden Testnet):
```bash
ETHERSCAN_API_KEY=your_etherscan_api_key_here  # Not required for Blockscout
```

**AUTO-POPULATED** (via `./update-env-from-artifacts.sh`):
```bash
LOAN_TOKEN=        # From DeployTokens.s.sol
COLLATERAL_TOKEN=  # From DeployTokens.s.sol  
AGGREGATOR_ADDRESS=# From DeployAggregator.s.sol
ORACLE_ADDRESS=    # From DeployOracle.s.sol
```

**CONSTANTS** (pre-configured for Eden Testnet):
```bash
MORPHO_BLUE_CORE=0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd
METAMORPHO_FACTORY=0xb007ca4AD41874640F9458bF3B5e427c31Be7766
IRM_ADDRESS=0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92  # IRM Mock (deployed)
LLTV=800000000000000000

# Note: MORPHO_ORACLE_FACTORY not deployed on Eden (use mock oracles instead)
```

**OPTIONAL** (for advanced scripts):
```bash
# Initial oracle price (only for DeployOracleMock.s.sol)
INITIAL_ORACLE_PRICE=5000  # 50.00 with 2 decimals (default: 5000)

# Initialization scenarios (0=LOW, 1=MEDIUM, 2=HIGH, 3=CUSTOM)
INIT_SCENARIO=1

# Custom initialization amounts (only used with INIT_SCENARIO=3)
CUSTOM_SUPPLY_AMOUNT=1000000000000000000000    # 1000 tokens
CUSTOM_COLLATERAL_AMOUNT=800000000000000000000 # 800 tokens  
CUSTOM_BORROW_AMOUNT=600000000000000000000     # 600 tokens

# Auto-fix flag for AnalyzeAndInitialize.s.sol
AUTO_FIX=false

# Price for UpdateOracleMockPrice.s.sol or UpdateAggregatorPrice.s.sol
PRICE=5000  # 50.00 with 2 decimals
```

## 🔮 Oracle Options: Which to Choose?

### OracleMock (⭐ Recommended for Testnets)
**Best for:** EDEN testnet, quick demos, maximum simplicity

✅ **Pros:**
- Simplest setup (no aggregator needed)
- Direct price control via `setPrice()`
- Built into Morpho Blue (no custom contracts)
- Perfect for testnets without oracle infrastructure

❌ **Cons:**
- Manual price updates only (no automation)
- Educational/testnet use only
- Not recommended for production

**Deploy with:**
```bash
INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol --rpc-url eden --broadcast
```

### OracleFromAggregator (Production-Like)
**Best for:** Testing production-like oracle setup

✅ **Pros:**
- Standard aggregator interface
- Staleness checks and validation
- Separates price source from oracle logic
- Better for production testing

❌ **Cons:**
- Requires aggregator deployment first
- More complex setup (2 contracts)
- Custom contract (not built-in)

**Deploy with:**
```bash
forge script script/DeployAggregator.s.sol --rpc-url eden --broadcast
forge script script/DeployOracle.s.sol --rpc-url eden --broadcast
```

## 🔧 Benefits of Forge Scripts

- **Native Forge Integration** - Built-in deployment tracking and gas estimation
- **Automatic Verification** - Blockscout verification with `--verify` flag on Eden Testnet
- **Deployment Artifacts** - JSON outputs with addresses and transaction data
- **Environment Automation** - Auto-populate addresses with `update-env-from-artifacts.sh`
- **No Dependencies** - Pure Solidity, no TypeScript/Node.js complications

## 📋 Contract Verification

Contract verification is **optional** and only affects block explorer readability. Contracts work perfectly without verification.

### Etherscan (Sepolia)
Most contracts deploy directly and verify automatically with the `--verify` flag:
```bash
forge script script/DeployTokens.s.sol --rpc-url eden --broadcast --verify
```

**Note:** Requires `ETHERSCAN_API_KEY` in your `.env` file.

### Blockscout (EDEN Testnet & Other Networks)
Blockscout doesn't require an API key. Either:

**Option 1:** Skip verification (contracts work without it):
```bash
forge script script/DeployTokens.s.sol --rpc-url eden --broadcast
```

**Option 2:** Use Blockscout verifier (no `foundry.toml` changes needed):
```bash
forge script script/DeployTokens.s.sol --rpc-url eden --broadcast \
  --verify --verifier blockscout --verifier-url https://eden-testnet.blockscout.com/api
```

**Option 3:** Configure Blockscout in `foundry.toml` for easier use:
```toml
[etherscan]
eden = { key = "no-key-required", url = "https://eden-testnet.blockscout.com/api" }
```
Then use: `forge script script/DeployTokens.s.sol --rpc-url eden --broadcast --verify`

Many Blockscout explorers auto-verify contracts, making manual verification unnecessary.

### Factory-Deployed Contracts (MetaMorpho Vaults)
The `DeployVault.s.sol` script deploys vaults through the MetaMorpho factory, which requires manual verification:

```bash
# 1. Deploy the vault (verification will fail, but deployment succeeds)
forge script script/DeployVault.s.sol --rpc-url eden --broadcast --verify

# 2. Extract the deployed vault address from the logs
# Look for: "MetaMorpho vault deployed at: 0x..."

# 3. Verify the factory-deployed contract manually
forge verify-contract <VAULT_ADDRESS> \
  lib/metamorpho-v1.1/src/MetaMorphoV1_1.sol:MetaMorphoV1_1 \
  --rpc-url eden \
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
  --rpc-url eden \
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
  --rpc-url eden \
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

### Problem: Deposits failing / maxDeposit returns 0

**Cause**: Supply queue is empty. MetaMorpho requires TWO separate steps:
1. `submitCap` + `acceptCap` - adds to withdraw queue
2. `setSupplyQueue` - adds to supply queue (**REQUIRED for deposits**)

**Check**:
```bash
cast call $VAULT_ADDRESS "supplyQueueLength()(uint256)" --rpc-url eden
# If returns 0, supply queue is empty
```

**Solution**: Run SetSupplyQueue script to add market to supply queue:
```bash
forge script script/SetSupplyQueue.s.sol --rpc-url eden --broadcast
```

**Note**: The updated `DeployVault.s.sol` script now automatically sets the supply queue, so this should only be needed for vaults deployed with the old script.

### Problem: APRs showing 0.00% in frontend

**Cause**: Abnormal shares/assets ratio in the market (e.g., 1,000,000:1 instead of 1:1)

**Solution**:
```bash
# 1. Analyze the market
forge script script/AnalyzeAndInitialize.s.sol --rpc-url eden

# 2. If abnormal ratio detected, reset and reinitialize
forge script script/ResetMarket.s.sol --rpc-url eden --broadcast
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast
```

### Problem: Vault shows "No Supply Cap"

**Cause**: The supply cap was submitted but not accepted. MetaMorpho requires two steps: `submitCap()` then `acceptCap()`.

**Solution**: Run the AcceptCap script to accept the pending cap:
```bash
forge script script/AcceptCap.s.sol --rpc-url eden --broadcast
```

**Note**: The updated `DeployVault.s.sol` script now automatically accepts the cap, so this should only be needed for vaults deployed with the old script.

### Problem: "Insufficient token balance" errors

**Cause**: Fresh deployments start with 0 token balance.

**Solution**: Run the MintTokens script before initialization:
```bash
forge script script/MintTokens.s.sol --rpc-url eden --broadcast
```

This mints **2000 fakeUSD + 1500 fakeTIA**, which covers all initialization scenarios:
- **Low (30%)**: ~1,300 fakeUSD + 400 fakeTIA ✅
- **Medium (60%)**: ~1,600 fakeUSD + 800 fakeTIA ✅
- **High (80%)**: ~1,900 fakeUSD + 1,200 fakeTIA ✅

**If you need more tokens later** (for testing or additional operations):
```bash
forge script script/MintTokens.s.sol --rpc-url eden --broadcast
# Can be called multiple times to mint additional tokens
```

### Problem: Oracle price is stale

**Solution**:
```bash
# Update oracle price
PRICE=5000 forge script script/UpdateAggregatorPrice.s.sol --rpc-url eden --broadcast
```

### Problem: Want to test different utilization scenarios

**Solution**:
```bash
# Try different scenarios
INIT_SCENARIO=0 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast  # 30%
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast  # 60%  
INIT_SCENARIO=2 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast  # 80%
```

### Problem: Market analysis shows "MARKET_HEALTHY" but frontend still has issues

**Cause**: Frontend might be caching old data or using wrong contract addresses

**Solution**:
1. Check that `frontend/src/lib/contracts.ts` is reading the correct deployment artifacts
2. Clear browser cache and refresh
3. Verify contract addresses match between deployment artifacts and frontend config
