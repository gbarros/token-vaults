# Ops - Debugging & Utility Scripts

> **Note**: Primary deployment is now handled by Forge scripts in `/contracts/script/`. This directory contains debugging utilities and specialized tools.

## 🛠️ Available Scripts

### Core Utilities
- **`buildOracle.ts`** - Build oracle using Morpho's OracleV2Factory (alternative to self-deployed)
- **`extractOracleAddress.ts`** - Extract oracle addresses from Morpho factory deployments
- **`extractForgeAddresses.ts`** - Extract all contract addresses from Forge deployment artifacts
- **`testMorphoSDK.ts`** - Validate Morpho Blue SDK functionality and compare with manual RPC calls

### Debugging Scripts (`temp/`)
Collection of debugging utilities for on-chain analysis:
- `checkMarketState.ts` - Analyze market conditions
- `checkTokenBalances.ts` - Check token balances across accounts
- `testOraclePrice.ts` - Verify oracle price feeds
- `debugBorrowIssue.ts` - Debug borrowing problems
- `verifyMarket.ts` - Validate market parameters
- And many more...

## 🚀 Usage

```bash
# Install dependencies
npm install

# Run oracle builder (alternative to Forge DeployOracle.s.sol)
npm run ops:build:oracle

# Extract oracle addresses
npm run ops:extract:oracle

# Extract all addresses from Forge artifacts
npm run ops:extract:addresses

# Test Morpho Blue SDK functionality
npm run test:morpho-sdk

# Run specific debugging script
npx tsx scripts/temp/checkMarketState.ts
```

## 📋 Purpose

This directory serves as:
1. **Debugging toolkit** for on-chain analysis
2. **Alternative oracle deployment** via Morpho factory
3. **Address extraction utilities** for integration
4. **Development utilities** for troubleshooting

## 🔗 Integration

- Uses `lib/updateAddresses.ts` to sync with frontend config
- Reads from `../frontend/src/config/addresses.ts`
- Complements Forge deployment artifacts from `/contracts/broadcast/`

---

## 🤖 Bot Simulation System

The bot system simulates realistic market activity to test and demonstrate the vault functionality. It includes 5 types of agents with configurable strategies and autonomous token management.

### Bot Types

1. **Lenders** 🟢 (2 agents) - Supply fakeUSD to Morpho Blue market
2. **Borrowers** 🔵 (5 agents) - Supply fakeTIA collateral and borrow fakeUSD (50% smart + 50% dumb strategies)
3. **Vault Users** 🟣 (3 agents) - Deposit into MetaMorpho vault (occasional withdrawals via probability)
4. **Oracle Changers** 🟠 (1 agent) - Adjust price feeds with random walk
5. **Liquidators** 🔴 (2 agents) - Monitor and liquidate unhealthy positions

**Total: 13 wallets** (down from original 15 after rebalancing)

### System Architecture

**Bot Wallet Management:**
- **15 wallets generated** (deterministic from seed phrase)
- **13 active wallets** (after market rebalancing)
- **Roles assigned**: 2 lenders, 5 borrowers, 3 vault users, 1 oracle, 2 liquidators
- **Persistence**: Saved in `temp/bot-wallets.json` with roles
- **Restorable**: Load same wallets across restarts

**2-Phase Funding Strategy:**

The setup uses a 2-phase funding approach to avoid nonce conflicts:

**Phase 1: Sequential ETH Distribution (~30 seconds)**
- ETH sent from deployer to each wallet (one at a time)
- Must be sequential because all transactions share the same sender
- Each wallet receives 0.1 ETH for gas

**Phase 2: Parallel Token Minting (~5 minutes)**
- Each wallet mints its own tokens from faucet
- Can be parallel because each wallet is a different sender
- Leverages per-address faucet cooldown (60 seconds)
- 5000 fakeUSD + 5000 fakeTIA per wallet (3 faucet calls each)

**Why 2-Phase?** Attempting to mint tokens before wallets have ETH causes "gas required exceeds allowance (0)" errors. Separating ETH distribution (sequential) from token minting (parallel) avoids nonce conflicts and optimizes for faucet cooldowns.

### Auto-Refill Mechanism

Bots autonomously refill tokens when running low:

**Configuration:**
```typescript
// bots.config.ts
autoRefill: {
  enabled: true,
  minBalanceThreshold: '500',   // Trigger refill when < 500 tokens
  refillAmount: '2000'           // Mint 2000 tokens (max faucet allows)
}
```

**How It Works:**
1. Before each action, bot checks token balance
2. If balance < 500 tokens, trigger refill
3. Check faucet cooldown (60 seconds per address per token)
4. Wait if on cooldown, then mint 2000 tokens
5. Continue with bot action
6. Track last refill timestamp locally

**Why Auto-Refill?** Ensures bots never run out of tokens during long-running demos. Borrowers refill both fakeUSD and fakeTIA independently.

### Market Rebalancing Configuration

**Goal:** Maintain 60-80% market utilization (supply/demand balance)

**Current Configuration:**
```typescript
// bots.config.ts
{
  lenders: {
    agentCount: 2,           // Reduced from 3 (less supply pressure)
    minInterval: 60000,      // 1 min (slower than before)
    maxInterval: 180000,     // 3 min
    minSupply: '50',         // Reduced from '100'
    maxSupply: '300',        // Reduced from '1000'
    strategy: 'random'
  },
  
  borrowers: {
    agentCount: 5,           // Increased from 4 (more borrow demand)
    smartRatio: 0.5,         // 50% smart (monitor health), 50% dumb (random)
    minInterval: 30000,      // 30 sec (faster than before)
    maxInterval: 120000,     // 2 min
    minHealthFactor: 1.5,    // Smart borrowers keep HF > 1.5
    targetUtilization: 0.75  // Target 75% collateral usage
  },
  
  vaultUsers: {
    agentCount: 3,           // Reduced from 5 (less indirect supply)
    minInterval: 60000,      // 1 min
    maxInterval: 180000,     // 3 min
    minDeposit: '50',
    maxDeposit: '400',       // Reduced from '800'
    withdrawalProbability: 0.005,  // 0.5% chance per cycle
    minAPYToStay: 2.0,       // Withdraw more if APY < 2%
    vaultCapacityThreshold: 0.95   // Pause deposits if vault 95% full
  },
  
  oracleChangers: {
    agentCount: 1,
    minInterval: 120000,     // 2 min
    maxInterval: 300000,     // 5 min
    minPriceChange: 0.02,    // ±2% per update
    maxPriceChange: 0.08,    // ±8% per update
    absoluteMin: 3.0,        // Floor: $3
    absoluteMax: 7.0         // Ceiling: $7
  },
  
  liquidators: {
    agentCount: 2,
    checkInterval: 15000,    // Check every 15 seconds
    minProfitThreshold: '10' // Only liquidate if profit > 10 fakeUSD
  }
}
```

**Why These Numbers?**
- Original configuration had too many lenders (3) and vault users (5), causing oversupply
- Market utilization was stuck at ~8% (target: 60-80%)
- Rebalanced to reduce supply and increase borrow demand
- Total wallets reduced from 15 to 13 active

### Quick Start

```bash
# 1. Setup wallets (one-time, creates temp/bot-wallets.json)
npm run bots:setup

# 2. Run individual bot types
npm run bots:lenders
npm run bots:borrowers
npm run bots:vault:users
npm run bots:oracle
npm run bots:liquidators

# 3. Or run all bots together (recommended)
npm run bots:all

# 4. Stop all bots
pkill -f 'tsx scripts/bots'
```

### How It Works

1. **Wallet Generation**: Deterministic wallets from seed phrase, assigned to roles
2. **Funding (2-Phase Strategy)**:
   - **Phase 1 (Sequential)**: ETH distribution from deployer (avoids nonce conflicts)
   - **Phase 2 (Parallel)**: Token minting by each wallet (leverages per-address faucet cooldown)
3. **Execution**: Each bot runs in independent loop with configurable intervals
4. **Error Handling**: Auto-retry with exponential backoff, auto-refill tokens when low
5. **Restart**: Load same wallets and resume from on-chain state

**✅ Status**: All 15 wallets generated, 13 active, all 5 bot types operational on Eden Testnet

### Operational Guide

**Faucet Cooldown Handling:**
- FaucetERC20 enforces 60-second cooldown per address per token
- Setup script respects this with automatic delays between mint calls
- Auto-refill checks `canMint()` and waits for cooldown to expire
- Borrowers have independent cooldowns for fakeUSD and fakeTIA

**Error Recovery Patterns:**
- Bots retry failed transactions with exponential backoff
- Auto-refill triggers before actions to prevent "insufficient balance" errors
- ETH balance monitored - warns if deployer drops below 1 ETH
- Each bot logs errors but continues running (stopOnError: false)

**Wallet Persistence:**
- Generated wallets saved to `temp/bot-wallets.json` with roles
- Format: `{ address, privateKey, role, index }`
- Restarting bots loads existing wallets (no re-funding needed)
- Delete file to regenerate fresh wallets

**Strategy Adjustments:**
To modify bot behavior, edit `bots.config.ts`:

```typescript
// Example: Make market more aggressive
borrowers: {
  agentCount: 6,        // Add more borrowers
  minInterval: 20000,   // Faster actions
  targetUtilization: 0.80  // Borrow more per agent
}
```

Then restart bots:
```bash
pkill -f 'tsx scripts/bots'
npm run bots:all
```

**Market Equilibrium Timeline:**
- **0-30 min**: Configuration changes take effect
- **30-60 min**: Supply/demand begins rebalancing
- **60+ min**: Market stabilizes at target utilization

**Performance Monitoring:**
```bash
# Watch bot activity in real-time
tail -f logs/lenders.log logs/borrowers.log

# Check market utilization on frontend
# Visit http://localhost:3000/setup

# Inspect individual wallet balances
cast balance <WALLET_ADDRESS> --rpc-url eden
cast call $LOAN_TOKEN "balanceOf(address)" <WALLET_ADDRESS> --rpc-url eden
```

### Logs

All bot activity logged to:
- **Console**: Color-coded output (green=lender, blue=borrower, purple=vault, etc.)
- **Files**: `ops/logs/bots-YYYY-MM-DD.log` and individual bot logs

```bash
# View live logs
tail -f logs/lenders.log
tail -f logs/borrowers.log
tail -f logs/vault-users.log
```

### Troubleshooting

**Problem: Bots fail with "insufficient funds"**
- Check deployer ETH balance: `cast balance $DEPLOYER_ADDRESS`
- Bots auto-refill but deployer needs > 1 ETH

**Problem: Tokens not minting**
- Faucet limits: 2000 tokens/call, 60s cooldown
- Setup script handles this automatically with delays

**Problem: Bots not making progress**
- Check individual bot logs in `ops/logs/`
- Verify market/vault addresses in `.env`
- Use `cast call` to inspect on-chain state:
  ```bash
  cast call $MORPHO_BLUE_CORE "market(bytes32)" $MARKET_ID --rpc-url eden
  ```

**Problem: Need to diagnose issues**
- Create temp scripts in `ops/scripts/temp/` for analysis
- Use `cast call/send` to manually test transactions
- Review bot wallet balances and positions on-chain

### Faucet Limits

FaucetERC20 constraints:
- Max per call: 2000 tokens
- Cooldown: 60 seconds between calls
- Setup script automatically handles multi-call + delays

### Design Notes

- **Role-based persistence**: Wallets saved with roles, enabling clean restarts
- **Mixed strategies**: Smart borrowers monitor health factor, dumb ones act randomly
- **Event-driven behavior**: Bots adjust based on market conditions (utilization, caps)
- **Unified vault users**: Single bot type handles deposits + withdrawals (probability-based)
- **Self-diagnostic**: Test with `cast` and temp scripts before escalating issues

---

**Primary deployments**: Use Forge scripts in `/contracts/script/`  
**Debugging & utilities**: Use TypeScript scripts in this directory  
**Market simulation**: Use bot system in `scripts/bots/`
