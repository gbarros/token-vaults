# Building with Morpho Vaults: A Practical Tutorial

**Learn by building a complete yield-bearing vault interface on Eden Testnet**

---

## What You'll Learn

This tutorial teaches you how to integrate **MetaMorpho v1.1 vaults** into a web application, focusing on:

1. **Understanding Morpho's architecture** - How vaults, markets, and allocators work together
2. **Deploying a working vault** - Using the MetaMorpho factory on Eden Testnet
3. **Building a vault interface** - ERC-4626 deposit/withdraw flows with real-time APY
4. **Vault governance** - Supply caps, allocation queues, and reallocation strategies
5. **Testing realistic scenarios** - Price changes, market utilization, and liquidations

**What this tutorial is NOT:**
- A Next.js or TypeScript basics course (assumed knowledge)
- A Solidity development guide (we deploy, not write contracts)
- Production deployment instructions (testnet educational demo only)

**Time to complete:** 2-3 hours (contracts + frontend + configuration)

---

## Prerequisites

### Required Knowledge
- Node.js/TypeScript development
- Next.js 15 (App Router)
- Basic Ethereum concepts (wallets, transactions, contracts)
- React hooks and state management

### Required Tools
- **Node.js 20+** (check: `node --version`)
- **npm** (comes with Node)
- **Foundry** (install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- **Eden Testnet TIA** (faucet: https://faucet-eden-testnet.binarybuilders.services)

### Clone Repository

```bash
git clone <YOUR_REPO_URL>
cd vaults-example
```

---

## Part 1: Understanding Morpho's Architecture

Before diving into code, let's understand what we're building.

### The Three Layers

```
┌─────────────────────────────────────┐
│   Your Application (Frontend)       │  ← You build this
│   - Vault deposit/withdraw UI       │
│   - APY display                     │
│   - Admin controls                  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   MetaMorpho Vault (ERC-4626)       │  ← Deploy via factory
│   - Aggregates capital               │
│   - Allocates to multiple markets   │
│   - Manages governance roles        │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Morpho Blue (Lending Markets)     │  ← Pre-deployed on Eden
│   - Individual lending markets      │
│   - Each: loan token + collateral   │
│   - IRM + Oracle + LLTV             │
└─────────────────────────────────────┘
```

### Key Concepts

**MetaMorpho Vault (ERC-4626):**
- Users deposit a single asset (e.g., fakeUSD)
- Vault distributes funds across multiple Morpho Blue markets
- Users receive shares representing their ownership
- Vault earns yield from market supply APY
- Share price increases as interest accrues

**Morpho Blue Market:**
- Isolated lending market with specific parameters
- **Loan Token**: What lenders supply (e.g., fakeUSD)
- **Collateral Token**: What borrowers pledge (e.g., fakeTIA)
- **Oracle**: Price feed for collateral valuation
- **IRM**: Interest rate model (determines APY based on utilization)
- **LLTV**: Liquidation Loan-to-Value (e.g., 86% = liquidate at 86% borrowed)

**Vault Governance Roles:**
- **Owner**: Top-level control, assigns other roles
- **Curator**: Enables markets, sets supply caps, manages queue
- **Allocator**: Executes reallocation between markets
- **Guardian**: Emergency pause functionality

### Why Vaults?

**Without Vaults (Direct to Morpho Blue):**
- Users must choose specific markets
- Manual rebalancing between markets
- Gas costs for multiple deposits
- Complex UI for market comparison

**With Vaults (MetaMorpho):**
- Single deposit, automatic diversification
- Curator manages allocation strategy
- One-click deposit/withdraw (ERC-4626)
- Simplified UX for end users

---

## Part 2: Environment Setup

### Step 1: Configure Contracts

```bash
cd contracts
cp env.example .env
```

Edit `contracts/.env`:

```bash
# Required: Your private key (deployer wallet)
PRIVATE_KEY=0x...

# Required: RPC endpoint (public or dedicated)
RPC_URL=https://rpc.edentestnet.com

# Pre-deployed Morpho contracts on Eden (don't change)
MORPHO_BLUE_CORE=0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd
METAMORPHO_FACTORY=0xb007ca4AD41874640F9458bF3B5e427c31Be7766
IRM_MOCK=0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92

# Optional: ETHERSCAN_API_KEY not needed (Blockscout doesn't require it)
```

**Important:** Your deployer wallet needs Eden TIA for gas. Visit the faucet if needed.

Install dependencies:

```bash
forge install
```

### Step 2: Configure Frontend

```bash
cd ../frontend
cp env.example .env.local
npm install
```

Edit `frontend/.env.local` (optional, defaults work):

```bash
# Network (Eden Testnet)
NEXT_PUBLIC_CHAIN_ID=3735928814
NEXT_PUBLIC_RPC_URL=https://rpc.edentestnet.com
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://eden-testnet.blockscout.com

# Pre-deployed Morpho contracts
NEXT_PUBLIC_MORPHO_BLUE_CORE=0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd
NEXT_PUBLIC_METAMORPHO_FACTORY=0xb007ca4AD41874640F9458bF3B5e427c31Be7766
NEXT_PUBLIC_IRM_MOCK=0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92
```

---

## Part 3: Deploy Contracts (Understanding the Flow)

We'll deploy 4 contract types. Each step teaches you about Morpho's architecture.

### Step 1: Deploy Test Tokens (Learn: ERC20 Faucets)

```bash
cd contracts
forge script script/DeployTokens.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'
```

**What this does:**
- Deploys **fakeUSD** (loan token) - What users lend
- Deploys **fakeTIA** (collateral token) - What users borrow against
- Both have public `faucet()` function for minting test tokens
- 60-second cooldown per address per token

**Why educational faucets?**
- No need for external token bridges
- Students can mint tokens on-demand
- Tests rate-limiting patterns

**Learning checkpoint:** 
✓ Understand that Morpho markets need pre-existing ERC20 tokens
✓ Recognize that production vaults use real tokens (USDC, WETH, etc.)

Update environment:

```bash
./update-env-from-artifacts.sh
source .env  # Reload variables
```

### Step 2: Deploy Oracle (Learn: Price Feeds)

```bash
INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'

./update-env-from-artifacts.sh
source .env
```

**What this does:**
- Deploys **OracleMock** with initial price of $50.00 (5000 = 50.00 with 2 decimals)
- Returns fakeTIA price in fakeUSD terms
- Public `setPrice()` function for testing scenarios

**Why OracleMock vs Production Oracles?**
- **Education**: Direct price setting, no aggregator complexity
- **Testing**: Simulate price crashes, recoveries, liquidations
- **Production**: Would use Chainlink, Pyth, or other audited oracles

**Learning checkpoint:**
✓ Understand that Morpho markets need price feeds for collateral valuation
✓ Recognize that health factor = (collateral value) / (borrowed value)
✓ Price changes affect liquidation risk

### Step 3: Create Morpho Blue Market (Learn: Market Parameters)

```bash
forge script script/CreateMarket.s.sol --rpc-url eden --broadcast

./update-env-from-artifacts.sh
source .env
```

**What this does:**
- Creates a market on **Morpho Blue Core** (pre-deployed)
- Parameters:
  - **Loan Token**: fakeUSD (what lenders supply)
  - **Collateral Token**: fakeTIA (what borrowers pledge)
  - **Oracle**: OracleMock (price feed)
  - **IRM**: IRM_MOCK (interest rate model, pre-deployed)
  - **LLTV**: 86% (0.86e18) - liquidate when borrowed/collateral ratio > 86%
- Generates **Market ID** (bytes32 hash of parameters)

**Why these parameters?**
- **86% LLTV**: Balanced risk (higher = riskier for lenders, better for borrowers)
- **IRM Mock**: Simplified rate model for education (production uses AdaptiveCurveIRM)

**Learning checkpoint:**
✓ Understand that Morpho Blue is a market factory, not a single market
✓ Each market is isolated with specific parameters
✓ Market ID uniquely identifies the loan/collateral/oracle/IRM/LLTV combination
✓ Markets are permissionless - anyone can create them

### Step 4: Deploy MetaMorpho Vault (Learn: Vault Factory Pattern)

```bash
forge script script/DeployVault.s.sol --rpc-url eden --broadcast

./update-env-from-artifacts.sh
source .env
```

**What this does:**
- Calls **MetaMorpho Factory** to deploy a new vault
- Sets **timelock = 0** (instant governance, educational only)
- Assigns roles (Owner, Curator, Allocator = deployer)
- Vault is an **ERC-4626** compliant contract
- Returns vault address

**Vault Configuration (Automatic):**
- **submitCap()**: Submit supply cap for our market
- **acceptCap()**: Accept the cap (instant with timelock=0)
- **updateSupplyQueue()**: Add market to supply queue

**Why use the factory?**
- Standardized vault deployment
- CREATE2 for predictable addresses
- Inherits vetted MetaMorpho implementation
- Automatic role assignment

**Learning checkpoint:**
✓ Understand ERC-4626 vault standard (deposit, withdraw, totalAssets, totalSupply)
✓ Recognize that vaults aggregate capital from multiple users
✓ Supply queue determines allocation priority
✓ Supply caps limit exposure to individual markets

### Step 5: Initialize Market Activity (Learn: Utilization & APY)

Mint tokens for testing:

```bash
forge script script/MintTokens.s.sol --rpc-url eden --broadcast
```

Create market utilization:

```bash
forge script script/InitializeUtilization.s.sol --rpc-url eden --broadcast
```

**What this does:**
- Supplies 1000 fakeUSD to the market (creates liquidity)
- Supplies 1500 fakeTIA as collateral
- Borrows 600 fakeUSD against the collateral
- **Result**: 60% utilization (600 borrowed / 1000 supplied)

**Why initialize utilization?**
- Zero utilization = zero APY (no borrowing activity)
- 60-70% utilization = visible APY for demo purposes
- Higher utilization = higher supply APY (IRM curve)

**Learning checkpoint:**
✓ Utilization = Total Borrowed / Total Supplied
✓ Supply APY increases with utilization (more demand)
✓ Borrow APY is always higher than supply APY (spread)
✓ Vault share price increases as interest accrues to suppliers

---

## Part 4: Build the Frontend Interface

Now that contracts are deployed, let's build the UI. The frontend teaches you how applications interact with vaults.

### Architecture Overview

Your frontend will have three pages:

1. **`/` (Landing)** - Project overview and navigation
2. **`/setup` (Sandbox)** - Mint tokens, adjust prices, view market
3. **`/vaults` (Main)** - Deposit, withdraw, view APY, admin controls

### Key Learning: Auto-Loading Contract Addresses

The frontend automatically loads deployed addresses from Forge artifacts:

**`frontend/src/lib/contracts.ts`:**

```typescript
// Automatically load vault address from deployment
const deployVaultArtifact = require('@contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json');

// Extract contract address from transactions
const vaultAddress = deployVaultArtifact.transactions.find(
  tx => tx.contractName === 'MetaMorphoV1_1'
)?.contractAddress;

export const VAULT_ADDRESS = 
  process.env.NEXT_PUBLIC_VAULT_ADDRESS || vaultAddress;
```

**Why this pattern?**
- No manual address copying after deployment
- Frontend stays in sync with contracts
- Environment variables can override for testing
- Type-safe with TypeScript

### Key Learning: Reading Vault State

Vaults expose their state via standard ERC-4626 + MetaMorpho functions:

**Custom Hook Pattern (`hooks/useVaultData.ts`):**

```typescript
import { useReadContract } from 'wagmi';
import { metaMorphoAbi } from '@morpho-org/blue-sdk-viem';

export function useVaultData(vaultAddress: Address) {
  // Total assets under management
  const { data: totalAssets } = useReadContract({
    address: vaultAddress,
    abi: metaMorphoAbi,
    functionName: 'totalAssets',
  });

  // Total shares issued
  const { data: totalSupply } = useReadContract({
    address: vaultAddress,
    abi: metaMorphoAbi,
    functionName: 'totalSupply',
  });

  // Share price = totalAssets / totalSupply
  const sharePrice = totalAssets && totalSupply && totalSupply > 0n
    ? Number(totalAssets) / Number(totalSupply)
    : 1.0;

  return { totalAssets, totalSupply, sharePrice };
}
```

**Why custom hooks?**
- Encapsulate complex contract interactions
- Reusable across components
- Automatic refresh with Wagmi
- Type-safe return values

### Key Learning: ERC-4626 Deposit Flow

The deposit flow teaches you about approval patterns:

**Two-Step Process:**

1. **Approve**: User approves vault to spend their tokens
2. **Deposit**: Vault transfers tokens and mints shares

**Component Logic (`components/vaults/VaultActions.tsx`):**

```typescript
// Step 1: Check allowance
const { data: allowance } = useReadContract({
  address: LOAN_TOKEN_ADDRESS,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [userAddress, vaultAddress]
});

const needsApproval = allowance < depositAmount;

// Step 2a: Approve if needed
const { write: approve } = useWriteContract({
  address: LOAN_TOKEN_ADDRESS,
  abi: erc20Abi,
  functionName: 'approve',
  args: [vaultAddress, depositAmount]
});

// Step 2b: Deposit after approval
const { write: deposit } = useWriteContract({
  address: vaultAddress,
  abi: metaMorphoAbi,
  functionName: 'deposit',
  args: [depositAmount, userAddress]
});
```

**Learning checkpoint:**
✓ ERC-4626 vaults are ERC20-like (shares are tokens)
✓ Two-transaction flow: approve then deposit
✓ Shares represent proportional ownership of totalAssets
✓ Share price increases as interest accrues (totalAssets grows faster than totalSupply)

### Key Learning: Calculating Vault APY

Vaults earn yield from underlying markets. Calculate weighted APY:

**Logic (`hooks/useVaultAPY.ts`):**

```typescript
export function useVaultAPY(vaultAddress: Address) {
  // 1. Get vault's market allocations
  const { data: supplyQueue } = useReadContract({
    address: vaultAddress,
    abi: metaMorphoAbi,
    functionName: 'supplyQueue',
  });

  // 2. For each market, get supply and APY
  const marketAPYs = supplyQueue.map(marketId => {
    const allocation = getMarketAllocation(vaultAddress, marketId);
    const supplyAPY = getMarketSupplyAPY(marketId);
    
    return {
      marketId,
      allocation,
      supplyAPY
    };
  });

  // 3. Calculate weighted average
  const weightedAPY = marketAPYs.reduce((sum, market) => {
    const weight = market.allocation / totalAssets;
    return sum + (market.supplyAPY * weight);
  }, 0);

  return { weightedAPY, marketAPYs };
}
```

**Why weighted average?**
- Vault allocates different amounts to different markets
- Each market has different utilization → different APY
- Weighted calculation reflects actual yield distribution

**Learning checkpoint:**
✓ Vault APY = weighted average of underlying market APYs
✓ Market APY depends on utilization (borrowed / supplied)
✓ Higher utilization = higher supply APY (from IRM curve)
✓ APY is annualized - share price changes continuously

### Start Development Server

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 and explore:

1. **Setup Page** (`/setup`):
   - Mint fakeUSD and fakeTIA via faucet
   - Adjust oracle price to see health factor changes
   - View market utilization and APY

2. **Vaults Page** (`/vaults`):
   - Deposit fakeUSD to receive vault shares
   - Watch share price and APY update
   - View allocation breakdown
   - (Owner only) Configure supply caps and queues

---

## Part 5: Understanding Vault Mechanics

Now that everything is deployed and running, let's explore vault behavior.

### Experiment 1: Supply Caps and Queue Management

**Concept:** Vaults limit exposure to markets via supply caps and allocation queues.

**Try this:**

1. Go to **Vaults page → Admin panel** (you're the owner)
2. Note the current **Supply Cap** for the market
3. Click **"Set Supply Cap"**
4. Enter a new cap (e.g., 10,000 fakeUSD)
5. Click **"Submit Cap"** then **"Accept Cap"** (instant with timelock=0)

**What happened:**
- Curator (you) set a maximum amount vault can allocate to this market
- Protects against over-concentration in a single market
- In production, caps require timelock delay for security

**Learning checkpoint:**
✓ Supply caps are per-market risk management
✓ Curator role manages allocation strategy
✓ Supply queue determines allocation order on deposits
✓ Caps can be increased or decreased (with timelock in production)

### Experiment 2: Price Changes and Health Factor

**Concept:** Collateral price affects borrowing positions and liquidation risk.

**Try this:**

1. Go to **Setup page → Oracle Controls**
2. Current price: ~$50.00
3. Click **"-20%"** to drop price to $40.00
4. Check market metrics - what changed?

**What happened:**
- fakeTIA price dropped 20%
- Existing borrowers' collateral value decreased
- Health factor = (collateral value) / (borrowed value) decreased
- If HF drops below 1.0, position becomes liquidatable

**Calculation:**
```
Before: 1500 fakeTIA @ $50 = $75,000 collateral
        600 fakeUSD borrowed
        HF = 75,000 / 600 = 125 ✓ Healthy

After:  1500 fakeTIA @ $40 = $60,000 collateral
        600 fakeUSD borrowed
        HF = 60,000 / 600 = 100 ✓ Still healthy

At $33: 1500 fakeTIA @ $33 = $49,500 collateral
        600 fakeUSD borrowed
        HF = 49,500 / 600 = 82.5 ✗ Liquidatable!
```

**Learning checkpoint:**
✓ Oracle price directly affects liquidation risk
✓ LLTV (86%) is the threshold for liquidation
✓ Borrowers must maintain health factor > 1.0
✓ Price volatility increases liquidation risk

### Experiment 3: Utilization and APY

**Concept:** Market utilization drives interest rates via the IRM.

**Try this:**

1. Open **Setup page** in one window
2. Open **Vaults page** in another window
3. Mint 1000 fakeUSD on Setup page
4. Deposit 1000 fakeUSD to vault on Vaults page
5. Watch APY change

**What happened:**
- Total supplied increased (600 → 1600 fakeUSD)
- Utilization dropped (600 / 1600 = 37.5% vs 60%)
- Supply APY decreased (lower demand for borrowing)
- Your vault share price still increases, but slower

**Utilization Formula:**
```
Utilization = Total Borrowed / Total Supplied

Initial: 600 / 1000 = 60% → ~10% APY
After:   600 / 1600 = 37.5% → ~6% APY
```

**Learning checkpoint:**
✓ Utilization affects APY via Interest Rate Model
✓ Higher utilization = higher supply APY (more borrowers competing)
✓ Lower utilization = lower supply APY (excess liquidity)
✓ Vaults automatically allocate to highest-yield markets

---

## Part 6: Optional - Bot Simulation System

For continuous market activity and realistic demos, deploy autonomous bots.

### What Bots Do

Bots simulate real user behavior:

1. **Lenders** - Supply fakeUSD to market (2 agents)
2. **Borrowers** - Supply collateral and borrow (5 agents, mixed strategies)
3. **Vault Users** - Deposit to vault (3 agents)
4. **Oracle Changers** - Adjust prices (1 agent, random walk)
5. **Liquidators** - Monitor and liquidate unhealthy positions (2 agents)

**Result:** Market maintains 60-80% utilization with continuous activity.

### Setup Bots

```bash
cd ops
npm install
cp ../contracts/.env .env  # Reuse contract addresses
```

Edit `ops/bots.config.ts` to adjust bot behavior (optional):

```typescript
export const botConfig = {
  lenders: {
    agentCount: 2,
    minSupply: '50',
    maxSupply: '300',
    minInterval: 60000,  // 1 min
    maxInterval: 180000  // 3 min
  },
  borrowers: {
    agentCount: 5,
    smartRatio: 0.5,  // 50% smart (monitor HF), 50% dumb
    targetUtilization: 0.75
  },
  // ... see bots.config.ts for full configuration
};
```

### Run Bots

```bash
# One-time: Generate and fund 15 bot wallets
npm run bots:setup

# Run all 5 bot types in background
npm run bots:all

# Stop all bots
pkill -f 'tsx scripts/bots'
```

### Watch Activity

With bots running:

1. **Setup page** - Watch utilization fluctuate
2. **Vaults page** - Watch vault TVL grow as bot users deposit
3. **Oracle** - Watch price changes affect health factors
4. **Console logs** - Each bot logs its actions

**Learning checkpoint:**
✓ Bots demonstrate realistic market dynamics
✓ Auto-refill mechanism prevents bots from running out of tokens
✓ Market rebalancing maintains target utilization
✓ Liquidators activate when price drops cause HF < 1.0

---

## Part 7: Key Takeaways

### Morpho Vault Architecture

✅ **MetaMorpho vaults** aggregate capital and allocate across multiple Morpho Blue markets

✅ **Morpho Blue markets** are isolated lending pools with specific loan/collateral/oracle/IRM/LLTV parameters

✅ **ERC-4626 standard** provides deposit/withdraw interface, making vaults composable

✅ **Governance roles** (Owner, Curator, Allocator, Guardian) manage vault strategy

### Vault Mechanics

✅ **Share price** = totalAssets / totalSupply, increases as interest accrues

✅ **APY calculation** requires weighted average across allocated markets

✅ **Supply caps** limit per-market exposure for risk management

✅ **Supply queue** determines allocation priority when depositing

### Market Dynamics

✅ **Utilization** drives interest rates via Interest Rate Model (IRM)

✅ **Oracle prices** affect collateral valuation and liquidation risk

✅ **Health factor** = (collateral value) / (borrowed value) must stay above 1.0

✅ **LLTV** (Liquidation Loan-to-Value) determines liquidation threshold

### Integration Patterns

✅ **Auto-loading addresses** from Forge artifacts keeps frontend in sync

✅ **Custom hooks** encapsulate complex contract interactions

✅ **Two-step approve + deposit** flow for ERC-4626 vaults

✅ **Number formatting** makes large values human-readable

---

## Next Steps

### Extend the Demo

1. **Multi-Market Strategy**: Deploy additional tokens and markets, configure vault to allocate across multiple markets with different risk profiles

2. **Rebalancing Logic**: Implement allocator bot that moves funds between markets based on yield opportunities

3. **Historical Tracking**: Store share price snapshots, calculate realized APY over time

4. **Advanced UI**: Add charts for share price history, allocation pie chart, APY trends

### Production Considerations

**For a production vault, you would need:**

1. **Audited Contracts**: Use production IRM, real oracles (Chainlink/Pyth)
2. **Security**: Implement timelocks, multisig ownership, emergency pause
3. **Risk Management**: Careful market selection, conservative supply caps
4. **Monitoring**: Off-chain monitoring for health factor alerts
5. **User Protection**: Slippage protection, withdrawal queues for liquidity

### Learn More

- **Morpho Documentation**: https://docs.morpho.org
- **ERC-4626 Standard**: https://eips.ethereum.org/EIPS/eip-4626
- **Morpho Blue Whitepaper**: See `research/morpho-blue/morpho-blue-whitepaper.pdf`
- **Code Reference**: See `plan.md` for complete implementation details

---

## Troubleshooting

### "Insufficient allowance" on deposit

**Problem:** Vault can't spend your tokens

**Solution:** Click "Approve" button before "Deposit"

### "Wrong network" error

**Problem:** Wallet connected to wrong chain

**Solution:** Switch to Eden Testnet (Chain ID: 3735928814) in your wallet

### APY shows 0%

**Problem:** No market utilization (no borrowing activity)

**Solution:** Run `InitializeUtilization.s.sol` or start borrower bots

### Transaction failed with "Out of gas"

**Problem:** Gas estimation too low (Eden testnet quirk)

**Solution:** Retry transaction, usually succeeds on second attempt

### Frontend can't find contract addresses

**Problem:** Forge artifacts not loaded

**Solution:** 
```bash
cd contracts
./update-env-from-artifacts.sh
cd ../frontend
npm run dev  # Restart dev server
```

### Bots running out of tokens

**Problem:** Auto-refill disabled or faucet cooldown too aggressive

**Solution:** Check `bots.config.ts`:
```typescript
autoRefill: {
  enabled: true,
  minBalanceThreshold: '500',
  refillAmount: '2000'
}
```

---

## Congratulations! 🎉

You've built a complete Morpho Vaults integration with:

- ✅ Deployed contracts on Eden Testnet
- ✅ Working vault interface with deposit/withdraw
- ✅ Real-time APY calculation
- ✅ Admin controls for vault configuration
- ✅ Optional bot simulation system

**You now understand:**
- How MetaMorpho vaults aggregate capital and allocate across markets
- How Morpho Blue markets work with loan/collateral/oracle/IRM/LLTV
- How to build ERC-4626 vault interfaces in React
- How vault governance roles manage allocation strategy
- How market utilization drives interest rates
- How oracle prices affect liquidation risk

Keep building! 🚀

