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

The bot system simulates realistic market activity to test and demonstrate the vault functionality. It includes 5 types of agents with configurable strategies.

### Bot Types

1. **Lenders** 🟢 - Supply fakeUSD to Morpho Blue market
2. **Borrowers** 🔵 - Supply fakeTIA collateral and borrow fakeUSD (smart + dumb strategies)
3. **Vault Users** 🟣 - Deposit into MetaMorpho vault (occasional withdrawals via luck draw)
4. **Oracle Changers** 🟠 - Adjust price feeds with random walk
5. **Liquidators** 🔴 - Monitor and liquidate unhealthy positions

### Configuration

**Files:**
- `bots.config.ts` - Bot behavior (strategies, intervals, thresholds)
- `.env` - Chain config (copied from `../contracts/.env`)

**Key Settings:**
```typescript
// bots.config.ts
{
  lenders: { agentCount: 3, minSupply: '100', maxSupply: '1000' },
  borrowers: { agentCount: 4, smartRatio: 0.5 },  // 50% smart
  vaultUsers: { agentCount: 5, withdrawalProbability: 0.005 },  // 0.5% chance
  oracleChangers: { agentCount: 1, minPriceChange: 0.02 },
  liquidators: { agentCount: 2, checkInterval: 15000 }
}
```

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
4. **Error Handling**: Auto-retry with exponential backoff, auto-refill ETH on low gas
5. **Restart**: Load same wallets and resume from on-chain state

**✅ Status**: All 15 wallets funded, all 5 bot types operational on Eden Testnet

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
