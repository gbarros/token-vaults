# Morpho Vaults v1.1 Demo Plan (Sepolia)

This document is a working plan for building a public demo of a Vault product using **Morpho Vaults v1.1** as the yield engine, targeting **Sepolia** for development and hackathon-friendly deployment.

---

## 1. Context & Goal

* **Objective:** Showcase how to launch a yield-bearing product quickly using Morpho Vaults v1.1 on Sepolia, with a public GitHub repository that includes both backend (Solidity contracts) and frontend code to serve as an educational resource for developers.
* **Audience:** Hackathon teams, early-stage builders, and DevRel audiences.
* **Outcome:** A running multi-page demo that evolves from a simple integration (using Morpho’s vaults as-is) to a more advanced, customizable solution.

### Scope & Non‑Goals

* **Scope:** MetaMorpho v1.1 on Sepolia; focus on demoability and education.
* **Non‑Goals (for now):** Vault V2/adapters/VICs, mainnet deployments, real rewards programs, cross‑chain flows, production timelocks/hardening.
* **Upgrade path:** Add an appendix later with a migration checklist to V2 if useful.

### Implementation Stack

* **Node & package manager:** Node 20.x (add `.nvmrc`), npm (use `npm` scripts).
* **Contracts:** Foundry (Solidity, OZ), scripts via `forge script`.
* **Frontend:** React (Next.js), viem + wagmi.
* **Ops/bots:** TypeScript + viem (ts-node runtime). Prefer TS scripts over on-chain batchers when possible.
* **Env files:** `.env.local` for app, `.env` for scripts; keep minimal and document all keys.
* Version pinning to be added during scaffolding.

### Planned repo structure (to scaffold)

* `contracts/` – all Solidity code and onchain deployment scripts.
* `frontend/` – app UI (ERC‑4626 flows, APY display, setup/mocks page).
* `ops/` – bots and operational scripts (roles, caps, reallocate, borrower bot).

### Licensing

* **Apache‑2.0**

---

## 2. Demo Approach (Two Stages)

1. **Stage 1 – Simple Morpho Integration**

   * Use Morpho’s own vaults and existing infrastructure.
   * Keep Solidity requirements minimal — just transactions and frontend wiring.
   * Goal: show hackers how quickly they can deliver a working “earn” MVP.

   ```mermaid
   flowchart TD
    A["User Wallet (Sepolia)"] -->|Approve & deposit| B["MetaMorpho v1.1 Vault"]
    B -->|ERC-4626 shares minted| A
    B -->|Allocator reallocate| C["Morpho Blue Markets"]
    C -->|Interest accrues| B
    B -->|Redeem / withdraw| A
    subgraph Ops_Scripts
        D["Curator"] -->|Enable markets + set caps| B
        E["Allocator Bot"] -->|Reallocate periodically| B
    end
   ```

    Key takeaway: Fastest path — you use Morpho’s vault factory + SDK, deposit funds, allocator pushes liquidity into chosen markets, yield flows back into vault share price.

2. **Stage 2 – Custom Vault Extension**

   * Introduce a custom vault implementation (OpenZeppelin ERC-4626 or a minimal fork of Morpho Vaults).
   * Showcase how to deploy and connect it to Morpho markets for yield.
   * Explore whether to chain vaults (`CustomVault -> MorphoVault -> MorphoMarkets`) or integrate directly (`CustomVault -> MorphoMarkets`).
   * Goal: teach how to extend and own the yield logic for more complex products.
   ```mermaid
   flowchart TD
    A["User Wallet"] -->|Deposit| V["Custom ERC-4626 Vault"]
    V -->|Hold shares of| M["MetaMorpho v1.1 Vault"]
    M -->|Allocate liquidity| C["Morpho Blue Markets"]
    C -->|Interest accrues| M
    M -->|Share price grows| V
    V -->|Share price grows| A

    subgraph Option_B_Direct_Integration
        V -.->|Direct supply or withdraw| C
        V -.->|Custom allocation logic| C
    end

    subgraph Ops_Layer
        Curator -->|Market & caps mgmt| M
        AllocatorBot -->|Reallocate| M
    end
   ```

   Key takeaway:
	•	Option A (solid lines): Vault-of-Vaults for quick shipping.
	•	Option B (dashed lines): direct integration for advanced control — more Solidity but avoids stacked fees.
---

## 3. Network & Infrastructure

### Target Network: Eden Testnet

**Why Eden Testnet?**
- Educational focus with mock contracts (IRM, oracles)
- Fast block times for immediate demo feedback
- Simple oracle pattern (direct price setting vs aggregator)
- No ETH faucet rate limits
- Blockscout explorer (no API key needed for verification)
- Pre-deployed Morpho Protocol ready to use

**Network Details:**
- **Chain ID**: 3735928814
- **RPC**: https://rpc.edentestnet.com
- **WebSocket**: wss://rpc.edentestnet.com  
- **Explorer**: https://eden-testnet.blockscout.com
- **ETH Faucet**: https://faucet-eden-testnet.binarybuilders.services

### Morpho Protocol (Pre-deployed on Eden)

These contracts are already deployed and ready to use:

- **Morpho Blue Core**: `0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd`
  - Core lending protocol
  - Handles all supply, borrow, repay, withdraw operations
  
- **MetaMorpho Factory v1.1**: `0xb007ca4AD41874640F9458bF3B5e427c31Be7766`
  - Factory for deploying MetaMorpho vaults
  - Uses CREATE2 for deterministic addresses
  
- **IRM Mock**: `0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92`
  - Mock interest rate model for testing
  - Pre-configured for educational demos

**Source**: [Eden Testnet Documentation](https://docs.celestia.org/eden/testnet)

### Alternative: Sepolia Testnet

For production-like testing, you can deploy to Sepolia:

**Changes Required:**
1. **Update `contracts/foundry.toml`**:
   ```toml
   [rpc_endpoints]
   sepolia = "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
   ```

2. **Update `contracts/.env`**:
   ```bash
   RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   MORPHO_BLUE_CORE=0xd011EE229E7459ba1ddd22631eF7bF528d424A14
   METAMORPHO_FACTORY=0x98CbFE4053ad6778E0E3435943aC821f565D0b03
   IRM_ADDRESS=0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c
   ```

3. **Update `frontend/.env.local`**:
   ```bash
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
   # ... update Morpho addresses
   ```

4. **Update artifact paths**: Change `/3735928814/` to `/11155111/` in `contracts.ts`
5. **Use named endpoint**: `--rpc-url sepolia` instead of `--rpc-url eden`
6. **Oracle approach**: Use SettableAggregator + OracleFromAggregator instead of OracleMock

**Morpho Addresses on Sepolia**: [docs.morpho.org/addresses](https://docs.morpho.org/addresses)

---

## 3.1. Multi-Market Strategy Benefits

**Why Multiple Markets Matter for Vault Demos:**

Based on the Morpho documentation, vaults demonstrate their core value proposition through:

1. **Risk Diversification**: Spreading deposits across markets with different LLTV ratios (77%, 86%, 94.5%) to balance risk vs yield
2. **Yield Optimization**: Allocator can rebalance between markets based on utilization rates and APY differences
3. **Market Selection**: Curator demonstrates risk management by enabling/disabling markets and setting supply caps
4. **Real Strategy Showcase**: Multiple markets allow demonstrating actual vault strategies rather than simple pass-through

**Planned Market Risk Profiles:**
- **Conservative**: `fakeETH/fakeUSD` (94.5% LLTV) - Lower risk, stable yield
- **Balanced**: `fakeBTC/fakeUSD` (86% LLTV) - Medium risk/reward  
- **Aggressive**: `fakeTIA/fakeETH` (77% LLTV) - Higher risk, potentially higher yield
- **Cross-Asset**: `fakeTIA/fakeETH` - Demonstrates non-USD denominated lending

This enables showcasing:
- **Curator Actions**: Setting different caps per market based on risk assessment
- **Allocator Actions**: Rebalancing based on yield opportunities and utilization
- **User Benefits**: Diversified exposure without managing individual positions

---

## 4. Smart Contracts to Build

### Custom Contracts (`contracts/src/`)

Build these custom contracts for the demo:

#### 1. **FaucetERC20.sol** - Educational ERC20 with Faucet

**Purpose**: ERC20 token that anyone can mint from a public faucet

**Implementation Requirements:**
```solidity
// Key functions to implement:
function faucet(address to, uint256 amount) external;
function canMint(address user) external view returns (bool);
function remainingCooldown(address user) external view returns (uint256);
```

**Features to Add:**
- Standard ERC20 functionality (OpenZeppelin base)
- Public `faucet()` function for minting
- Per-address cooldown (60 seconds recommended)
- Max mint per call (2000 tokens for demo)
- Track last mint timestamp per address
- Emit `Faucet(address indexed to, uint256 amount)` event

**Deploy Two Instances:**
- `fakeUSD` (18 decimals) - Loan token
- `fakeTIA` (18 decimals) - Collateral token

**Why Build This?**
- Allows users to mint test tokens without deploying infrastructure
- Teaches rate-limiting patterns
- Simpler than multi-chain faucet services

#### 2. **OracleMock.sol** - Simple Price Oracle

**Purpose**: Oracle with direct price setting for testing

**Implementation Requirements:**
```solidity
// Key functions to implement:
function price() external view returns (uint256);
function setPrice(uint256 newPrice) external;
```

**Features to Add:**
- Store price as `uint256` (8 decimals: 5000e8 = $50.00)
- `price()` returns current price
- `setPrice(uint256)` updates price (owner or public for testing)
- Emit `PriceUpdated(uint256 oldPrice, uint256 newPrice)` event

**Deploy One Instance:**
- `OracleMock` for fakeTIA/fakeUSD price (e.g., initial price: 5000 = $50.00)

**Why OracleMock vs Aggregator Pattern?**
- **Simpler**: No intermediate contracts (aggregator, oracle factory)
- **Educational**: Direct price control shows oracle mechanics clearly
- **Faster**: One contract instead of two-step deployment
- **Testing**: Easy to simulate price changes in UI

**Alternative (Reference Only):**
- `SettableAggregator.sol` - Aggregator that holds price
- `OracleFromAggregator.sol` - Oracle that reads from aggregator
- Kept in repo for Sepolia compatibility and learning

### Deployment Scripts (`contracts/script/`)

Build Forge scripts for deployment automation:

#### Core Deployment Sequence

1. **DeployTokens.s.sol**
   - Deploy fakeUSD and fakeTIA (FaucetERC20)
   - Record addresses in broadcast artifacts
   - Verify on Blockscout

2. **DeployOracleMock.s.sol**
   - Deploy OracleMock with initial price
   - Set price from `INITIAL_ORACLE_PRICE` env var (default: 5000)
   - Record address in broadcast artifacts
   - Verify on Blockscout

3. **CreateMarket.s.sol**
   - Read token and oracle addresses from env
   - Create market on Morpho Blue Core
   - Use:
     - Loan token: fakeUSD
     - Collateral token: fakeTIA
     - Oracle: OracleMock
     - IRM: IRM_MOCK (pre-deployed)
     - LLTV: 86% (0.86e18)
   - Compute and record market ID

4. **DeployVault.s.sol**
   - Deploy MetaMorpho v1.1 vault via factory
   - Set timelock = 0 (hackathon speed)
   - Assign roles (owner, curator, allocator = deployer)
   - Submit and accept supply cap for market
   - Add market to supply queue
   - Record vault address in broadcast artifacts

5. **MintTokens.s.sol**
   - Mint initial tokens to deployer
   - 2000 fakeUSD + 1500 fakeTIA (for initialization)
   - Uses faucet function

6. **InitializeUtilization.s.sol**
   - Supply fakeUSD to market
   - Supply fakeTIA collateral
   - Borrow fakeUSD to create utilization
   - Target: 60-70% utilization for visible APY

#### Environment Management

**Use `update-env-from-artifacts.sh` script:**
```bash
#!/bin/bash
# Extracts addresses from Forge broadcast artifacts
# Auto-populates .env with deployed contract addresses
```

**Benefits:**
- No manual address copying
- Consistent between deployments
- Scripts read from .env automatically
- Frontend loads from broadcast artifacts

**Named RPC Endpoints:**
Define in `foundry.toml`:
```toml
[rpc_endpoints]
eden = "https://rpc.edentestnet.com"
```

Use in commands:
```bash
forge script script/DeployTokens.s.sol --rpc-url eden --broadcast
```

**Why Named Endpoints?**
- Cleaner commands
- Avoid `$RPC_URL` repetition
- Centralized configuration

#### Additional Utility Scripts

- **`UpdateOracleMockPrice.s.sol`** - Update price for testing
- **`TestBorrowing.s.sol`** - Test borrow functionality
- **`ResetMarket.s.sol`** - Withdraw all positions (reset state)
- **`AnalyzeAndInitialize.s.sol`** - Comprehensive market setup

### Deployment Flow

**Complete Sequence:**
```bash
cd contracts

# 1. Deploy tokens
forge script script/DeployTokens.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'
./update-env-from-artifacts.sh

# 2. Deploy oracle
INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'
./update-env-from-artifacts.sh

# 3. Create market
forge script script/CreateMarket.s.sol --rpc-url eden --broadcast

# 4. Deploy vault
forge script script/DeployVault.s.sol --rpc-url eden --broadcast
./update-env-from-artifacts.sh

# 5. Mint tokens
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# 6. Initialize utilization
forge script script/InitializeUtilization.s.sol --rpc-url eden --broadcast
```

**Verification:**
- Blockscout automatically indexes verified contracts
- No API key needed
- Source code appears on explorer
- ABI available for etherscan-style queries

---

## 4.1 Demo Tracks (Multi‑Page)

**Page 1 — “Pure Morpho” (no custom Solidity):**

* Use an existing **MetaMorpho v1.1** vault as the yield engine.
* Frontend does approve + `deposit()` / `redeem()` (ERC‑4626) and shows allocations/APY.
* Ops scripts handle Curator/Allocator actions (enable market, set caps, `reallocate`).
* Goal: showcase fastest path to an MVP using Morpho as a component.

**Page 2 — “Custom Vault” (educational):**
We add a minimal ERC‑4626 vault of our own and compare two wiring patterns:

* **Option A — Vault‑of‑Vaults (easiest):**

  * `<Custom ERC‑4626 Vault> → holds shares of <MetaMorpho v1.1 Vault>`
  * Pros: minimal Solidity (your vault deposits into Morpho’s ERC‑4626), reuses Morpho’s risk/ops.
  * Cons: stacked fees, dependency on Morpho’s withdraw queue/caps; APY lag vs direct.

* **Option B — Direct to Morpho Blue (cleaner, more work):**

  * `<Custom ERC‑4626 Vault> → supplies/withdraws directly to <Morpho Blue markets>`
  * Pros: one layer, full control over allocations; lower overhead.
  * Cons: you must implement allocator logic, market selection, and safety rails.

**Recommendation for hackathons:** Start with **Option A** (ship quickly), then show a branch with **Option B** for advanced teams.

**Answer to open question:** Do we need `<Custom Vault> → <Morpho Vault> → <Other Morpho yield contracts>`?

* With v1: generally **no**. If you need Morpho Blue exposure only, choose Option B. If you want to reuse MetaMorpho’s curation/ops, choose Option A and stop there.
* If you later need non‑Morpho yield, you’d be leaving v1 scope anyway (that’s a v2 adapters story).

For this demo, we will implement **Option B (Direct to Morpho Blue)** first.

---

## 5. Safety & Hackathon Notes

* **Small caps** to avoid draining testnet liquidity.
* **Timelock=0** only for hackathon; highlight production best practices.
* **Inflation protection:** seed vault with a small initial deposit before opening to users.
* **Risk disclosure:** show utilization, APY volatility, and underlying market data.

**Emergency playbook (stub):**

* Pause the vault if needed; tighten caps/queues to limit flows.
* Halt allocator/bot actions; revoke or rotate allocator role if necessary.
* Provide a safe exit checklist for participants (communicate, unwind positions where applicable).

---

## 6. Optional Enhancements

* **Use OnchainKit Earn Component** (Base Sepolia)

  * Prebuilt UI for Morpho vaults.
  * Possible gas sponsorship.
* **Rewards Display:** integrate Merkl reward claims.
* **Monitoring Dashboard:** simple chart of total assets, allocations, APY.
* **Custom Vault Demo:** dedicated second page showing how to build & deploy a vault that extends Morpho yield logic.

---

## 5. Frontend Application to Build

### Application Architecture

**Framework:** Next.js 15 with App Router

Build a three-page application:
1. `/` - Landing page with project overview
2. `/setup` - Sandbox environment (Milestone 0)
3. `/vaults` - Vault interface (Milestone 1)

### Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── page.tsx           # Landing
│   │   ├── setup/page.tsx     # M0
│   │   └── vaults/page.tsx    # M1
│   ├── components/            # React components
│   │   ├── setup/             # Setup page components
│   │   ├── vaults/            # Vaults page components
│   │   └── wallet/            # Shared components
│   ├── hooks/                 # Custom hooks
│   └── lib/                   # Utilities
├── vercel/                    # Production artifacts
└── public/                    # Static assets
```

### Setup Page (Milestone 0)

**Purpose:** Testnet sandbox for minting tokens, adjusting prices, and viewing market metrics

#### Components to Build

1. **WalletCard** (`components/setup/WalletCard.tsx`)
   - Display connected wallet address
   - Show current network (validate Eden Testnet)
   - Display ETH balance for gas
   - Connection status and quick links

2. **TokenFaucetCard** (`components/setup/TokenFaucetCard.tsx`)
   - Token selector dropdown (fakeUSD / fakeTIA)
   - Display current token info:
     - Symbol and decimals
     - User's balance
     - Total supply
     - Contract address (copy button)
   - Mint interface:
     - Amount input (max 2000 per call)
     - "Mint Tokens" button
     - Cooldown tracker (60 seconds per token)
     - Show remaining cooldown time
   - Handle `canMint()` check before minting
   - Toast notifications for success/error

3. **OracleCard** (`components/setup/OracleCard.tsx`)
   - Display current fakeTIA/fakeUSD price
   - Custom price input field
   - Preset adjustment buttons:
     - "+5%" / "-5%" (small changes)
     - "+20%" / "-20%" (larger swings)
     - "Crash" (drop to 50%)
     - "Recovery" (back to baseline)
   - Show price with proper formatting ($XX.XX)
   - "Update Price" button
   - Transaction confirmation

4. **SandboxMarketCard** (`components/setup/SandboxMarketCard.tsx`)
   - Market identification (market ID)
   - Key metrics display:
     - **Total Supplied**: Amount of fakeUSD supplied
     - **Total Borrowed**: Amount of fakeUSD borrowed
     - **Utilization Rate**: Borrowed / Supplied %
     - **Supply APY**: Current lending rate
     - **Borrow APY**: Current borrowing rate
     - **TVL**: Total value locked
   - Market parameters (read-only):
     - LLTV (86%)
     - IRM address
     - Oracle address
   - Link to run InitializeUtilization script
   - Refresh button for live updates

**Features:**
- Auto-refresh market metrics every 10 seconds
- Number formatting (thousand separators, abbreviations)
- Error handling with user-friendly messages
- Loading states for all async operations

### Vaults Page (Milestone 1)

**Purpose:** Production-like interface for MetaMorpho v1.1 vault deposits and withdrawals

#### Components to Build

1. **VaultOverview** (`components/vaults/VaultOverview.tsx`)
   - Vault identification (name, symbol, address)
   - Key metrics:
     - **Total Assets**: Total fakeUSD in vault
     - **Total Supply**: Total vault shares issued
     - **Supply Cap**: Maximum deposits allowed
     - **Pending Cap**: Queued cap changes
     - **Share Price**: Current price per share
   - Governance roles:
     - Owner address
     - Curator address
     - Allocator address
     - Guardian address
   - Vault status indicators (paused, cap reached, etc.)

2. **VaultPerformance** (`components/vaults/VaultPerformance.tsx`)
   - **APY Calculation**:
     - Weighted APY across all allocated markets
     - Individual market APYs
     - Formula explanation tooltip
   - **Share Price Tracking**:
     - Current share price
     - Historical change (if available)
   - **TVL and Outstanding Shares**:
     - Total value locked
     - Shares outstanding
     - Asset-to-share ratio

3. **VaultActions** (`components/vaults/VaultActions.tsx`)
   - **Deposit Tab**:
     - fakeUSD balance display
     - Amount input
     - "Approve" button (if allowance insufficient)
     - "Deposit" button
     - Preview shares to receive
     - Current allowance display
   - **Withdraw Tab**:
     - Vault shares balance display
     - Amount input (in shares)
     - "Withdraw" button
     - Preview assets to receive
     - No approval needed (burning own shares)
   - Input validation
     - Check balance
     - Check vault capacity
     - Check pending transactions
   - Transaction status tracking

4. **VaultAllocation** (`components/vaults/VaultAllocation.tsx`)
   - **Market Allocation Breakdown**:
     - List of markets vault supplies to
     - Amount allocated to each market
     - Percentage of total
     - Individual market APY
     - Utilization rate
   - **Supply Queue Visualization**:
     - Ordered list of markets
     - Priority indicators
     - Auto-allocation explanation
   - **Idle Assets**:
     - Amount not allocated to any market
     - Percentage idle
   - Tooltip: "This demo uses 1 market; production vaults diversify across multiple markets"

5. **VaultAdmin** (`components/vaults/VaultAdmin.tsx`)
   - **Owner-only panel** (check wallet = owner)
   - **Supply Cap Management**:
     - Current cap display
     - New cap input
     - "Submit Cap" button
     - "Accept Cap" button (after timelock)
     - Pending cap display
   - **Queue Management**:
     - "Add Market to Supply Queue" button
     - "Remove Market" option
     - Queue reordering (if multiple markets)
   - **Reallocate Function**:
     - Manual reallocation trigger
     - Show current vs target allocation
     - "Reallocate" button
   - **Status Messages**:
     - Idle assets notification
     - Auto-allocation status
     - Recent admin actions

**Features:**
- Role-based access (admin panel only for owner)
- Real-time data updates
- Preview functionality for all actions
- Comprehensive error messages
- Loading states and transaction tracking

### Data Layer (Custom Hooks)

**Purpose:** Encapsulate contract interactions and state management

**Hooks to Implement** (`hooks/`):

1. **`useVaultData.ts`** - Fetch vault state
   - `totalAssets()` - Total fakeUSD in vault
   - `totalSupply()` - Total vault shares
   - `config(marketId)` - Supply cap for market
   - `pendingCap(marketId)` - Pending cap changes
   - Returns: `{ totalAssets, totalSupply, supplyCap, pendingCap, loading, error }`
   - Auto-refresh every 10 seconds

2. **`useVaultAPY.ts`** - Calculate weighted APY
   - Fetch allocation data for each market
   - Get supply APY from each market
   - Calculate weighted average based on allocation
   - Returns: `{ weightedAPY, marketAPYs, loading }`

3. **`useVaultAllocation.ts`** - Track market allocations
   - Read supply queue from vault
   - Get idle assets
   - Calculate allocation per market
   - Returns: `{ allocations, supplyQueue, idleAssets, loading }`

4. **`useMarketData.ts`** - Fetch Morpho Blue market metrics
   - `market(marketId)` - Get market state
   - Calculate utilization rate
   - Get supply/borrow APY from IRM
   - Returns: `{ totalSupply, totalBorrow, utilization, supplyAPY, borrowAPY, loading }`

5. **`useHealthFactor.ts`** - Calculate borrowing position safety
   - Read collateral and borrow amounts
   - Get oracle price
   - Calculate health factor
   - Returns: `{ healthFactor, collateral, borrowed, isHealthy, loading }`

6. **`useTokenBalance.ts`** - Track ERC20 balances
   - `balanceOf(address)` for any token
   - Auto-refresh on block changes
   - Returns: `{ balance, formatted, loading }`

7. **`useTokenAllowance.ts`** - Check ERC20 approvals
   - `allowance(owner, spender)` for any token
   - Returns: `{ allowance, hasAllowance, loading }`

**Hook Patterns:**
- Use Wagmi's `useReadContract` for on-chain reads
- Use Wagmi's `useWriteContract` for transactions
- Implement automatic refresh with configurable intervals
- Handle loading and error states consistently
- Type-safe with TypeScript generics

### Utility Libraries (`lib/`)

Build these utility modules:

1. **`formatNumber.ts`** - Number formatting

```typescript
// Functions to implement:
formatNumber(value, options)      // Base formatter
formatTokenAmount(value, decimals) // Token displays
formatTokenString(etherValue)     // Pre-converted values
formatCurrency(value)             // USD amounts
formatPercentage(value, decimals) // Percentages
formatCompact(value)              // Always abbreviate
```

**Features:**
- Thousand separators: 1,000,000
- Smart abbreviations: 1.5k, 2.3M, 1.2B, 5.6T
- Configurable decimal places
- Handle `string`, `number`, `bigint`, or `undefined`
- Threshold-based abbreviation (10k+, 100k+ for currency)

2. **`contracts.ts`** - Address management

```typescript
// Auto-load from Forge artifacts:
const artifact = require('@contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json');

// Extract addresses from transactions:
const vaultAddress = extractContractAddress(artifact, 'MetaMorpho');

// Environment variable overrides:
const address = process.env.NEXT_PUBLIC_VAULT_ADDRESS || artifactAddress;
```

**Features:**
- Automatic artifact loading
- Address extraction utilities
- Environment variable fallbacks
- Market params construction
- Type-safe address exports

3. **`wagmi.ts`** - Web3 configuration

```typescript
// Define Eden Testnet chain:
export const edenTestnet = defineChain({
  id: 3735928814,
  name: 'Eden Testnet',
  network: 'eden-testnet',
  nativeCurrency: { name: 'TIA', symbol: 'TIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.edentestnet.com'] },
    public: { http: ['https://rpc.edentestnet.com'] }
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://eden-testnet.blockscout.com' }
  }
});

// Configure Wagmi:
export const config = createConfig({
  chains: [edenTestnet],
  transports: { [edenTestnet.id]: http() }
});
```

4. **`abis.ts`** - Contract ABIs

```typescript
// Import from Morpho SDK:
import { blueAbi, metaMorphoAbi } from '@morpho-org/blue-sdk-viem';

// Import from Forge artifacts (use require for webpack alias):
const IIrmArtifact = require('@contracts/out/IIrm.sol/IIrm.json');
const FaucetERC20Artifact = require('@contracts/out/FaucetERC20.sol/FaucetERC20.json');

// Export typed ABIs:
export const morphoBlueAbi = blueAbi;
export const faucetERC20Abi = FaucetERC20Artifact.abi;
```

**Why `require()` not `import`?**
- TypeScript checks imports at compile time
- Webpack alias resolves `@contracts` at runtime
- `require()` defers resolution to webpack

### Vercel Deployment Strategy

**Problem:** `contracts/out/` is gitignored (1000+ files)

**Solution:** Webpack alias with copied artifacts

**Implementation:**

1. **Copy Script** (`scripts/copy-contracts-for-vercel.js`)
   - Copies ~10 essential files from `contracts/` to `frontend/vercel/contracts/`
   - Runs before production builds
   - Only includes needed artifacts

2. **Webpack Alias** (`next.config.ts`)
   ```typescript
   webpack: (config, { webpack }) => {
     const contractsPath = process.env.NODE_ENV === 'production'
       ? path.resolve(__dirname, 'vercel/contracts')
       : path.resolve(__dirname, '../contracts');
     
     config.resolve.alias = {
       ...config.resolve.alias,
       '@contracts': contractsPath,
     };
     
     // Ignore optional artifacts
     config.plugins.push(
       new webpack.IgnorePlugin({
         resourceRegExp: /@contracts\/broadcast\/DeployAggregator\.s\.sol/,
       })
     );
     
     return config;
   }
   ```

3. **Git Configuration**
   - Commit `frontend/vercel/` folder (~10 files)
   - Keep `contracts/out/` ignored
   - Update `.gitignore`: Add `vercel/` to track

4. **Deployment Workflow**
   ```bash
   # After deploying contracts:
   cd frontend
   npm run copy-contracts
   git add vercel/
   git commit -m "Update contract artifacts"
   git push  # Triggers Vercel deployment
   ```

**Benefits:**
- Clean git history (no 1000+ file commits)
- Fast Vercel builds
- Works from any import depth
- Same imports work in dev and prod

---

## 6. Bot Simulation System to Build (Optional)

### Purpose

Create autonomous agents that simulate realistic market activity for testing and demonstration.

**Why Build This?**
- Demonstrates vault functionality with live data
- Creates believable market dynamics
- Tests edge cases (liquidations, capacity limits)
- Provides continuous activity for demos

### Bot Types to Implement (5)

1. **Lenders** (2 agents) - Supply fakeUSD to Morpho Blue market
   - **Strategy**: Random supply amounts within configured range
   - **Frequency**: 1-3 minute intervals with randomization
   - **Behavior**: Supplies when utilization is low, waits when high

2. **Borrowers** (5 agents) - Supply collateral and borrow
   - **Two Strategies**:
     - **Smart (50%)**: Monitors health factor, maintains HF > 1.5
     - **Dumb (50%)**: Random actions, may get liquidated
   - **Frequency**: 30 sec - 2 minute intervals
   - **Target**: 75% collateral utilization

3. **Vault Users** (3 agents) - Deposit to MetaMorpho vault
   - **Primary**: Deposits with occasional withdrawals
   - **Withdrawal**: 0.5% probability per cycle
   - **Frequency**: 1-3 minute intervals
   - **Limits**: 50-400 fakeUSD per deposit

4. **Oracle Changers** (1 agent) - Adjust price feeds
   - **Strategy**: Random walk within bounds
   - **Range**: ±2% to ±8% per update
   - **Bounds**: $3.00 - $7.00 (absolute limits)
   - **Frequency**: 2-5 minute intervals

5. **Liquidators** (2 agents) - Monitor and liquidate positions
   - **Strategy**: Scan all borrower positions
   - **Trigger**: Health factor < 1.0
   - **Frequency**: 15-second checks
   - **Profit**: Only liquidate if profit > 10 fakeUSD

**Total: 13 wallets** (down from 15 after rebalancing)

### Architecture to Build

**File Structure:**
```
ops/
├── bots.config.ts              # Configuration
├── scripts/bots/
│   ├── setup.ts                # Wallet generation & funding
│   ├── lenders.ts              # Lender bot
│   ├── borrowers.ts            # Borrower bot
│   ├── vaultUsers.ts           # Vault user bot
│   ├── oracleChangers.ts       # Oracle changer bot
│   ├── liquidators.ts          # Liquidator bot
│   └── run-all.sh              # Launch script
├── lib/
│   └── botUtils.ts             # Shared utilities
└── temp/
    └── bot-wallets.json        # Generated wallets (gitignored)
```

### Wallet Management System

**Implementation:**

1. **Generate Wallets** (`setup.ts`)
   ```typescript
   // Use deterministic mnemonic
   const mnemonic = 'test test test test test test test test test test test junk';
   
   // Generate 15 wallets with indices
   for (let i = 0; i < 15; i++) {
     const wallet = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${i}`);
     wallets.push({ address, privateKey, role, index });
   }
   
   // Assign roles
   // 0-1: Lenders (2)
   // 2-6: Borrowers (5)
   // 7-9: Vault Users (3)
   // 10: Oracle (1)
   // 11-12: Liquidators (2)
   // 13-14: Reserved
   ```

2. **Save to Persistence**
   ```typescript
   fs.writeFileSync('temp/bot-wallets.json', JSON.stringify(wallets));
   ```

3. **Load on Restart**
   ```typescript
   const wallets = JSON.parse(fs.readFileSync('temp/bot-wallets.json'));
   ```

**Why Deterministic?**
- Reproducible across deployments
- Can restore without refunding
- Easy debugging (known addresses)

### 2-Phase Funding Strategy

**Phase 1: Sequential ETH Distribution**

```typescript
// Must be sequential - all transactions from same sender (deployer)
for (const wallet of wallets) {
  const hash = await deployerWalletClient.sendTransaction({
    to: wallet.address,
    value: parseEther('0.1')  // 0.1 ETH per wallet
  });
  await publicClient.waitForTransactionReceipt({ hash });
}
```

**Why Sequential?**
- All transactions share the same sender (deployer)
- Parallel would cause nonce conflicts
- Takes ~30 seconds for 15 wallets

**Phase 2: Parallel Token Minting**

```typescript
// Can be parallel - each wallet mints for itself
await Promise.all(wallets.map(async (wallet) => {
  // Mint 5000 fakeUSD (3 faucet calls: 2000 + 2000 + 1000)
  await mintTokensWithFaucet(wallet, loanToken, '5000');
  
  // Mint 5000 fakeTIA
  await mintTokensWithFaucet(wallet, collateralToken, '5000');
}));
```

**Why Parallel?**
- Each wallet is a different sender
- Leverages per-address faucet cooldown
- Takes ~5 minutes with automatic delays

### Auto-Refill Mechanism

**Implementation** (`lib/botUtils.ts`):

```typescript
async function autoRefillTokenIfLow(
  walletClient,
  publicClient,
  wallet,
  tokenAddress,
  minThreshold,      // '500'
  refillAmount,      // '2000'
  logger
) {
  // Check balance
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: faucetERC20Abi,
    functionName: 'balanceOf',
    args: [wallet.address]
  });
  
  if (balance < parseUnits(minThreshold, 18)) {
    // Check cooldown
    const canMint = await publicClient.readContract({
      address: tokenAddress,
      abi: faucetERC20Abi,
      functionName: 'canMint',
      args: [wallet.address]
    });
    
    if (!canMint) {
      const remaining = await publicClient.readContract({
        address: tokenAddress,
        abi: faucetERC20Abi,
        functionName: 'remainingCooldown',
        args: [wallet.address]
      });
      await sleep(remaining * 1000);
    }
    
    // Mint
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: faucetERC20Abi,
      functionName: 'faucet',
      args: [wallet.address, parseUnits(refillAmount, 18)]
    });
    
    await publicClient.waitForTransactionReceipt({ hash });
    logger.info(`Refilled ${refillAmount} tokens`);
  }
}
```

**Integration Pattern:**

Each bot calls auto-refill at the start of each cycle:

```typescript
// In lenders.ts, borrowers.ts, etc.
while (true) {
  try {
    // Auto-refill if needed
    await autoRefillTokenIfLow(
      walletClient,
      publicClient,
      wallet,
      loanTokenAddress,
      config.wallets.autoRefill.minBalanceThreshold,
      config.wallets.autoRefill.refillAmount,
      logger
    );
    
    // Perform bot action
    await performLenderAction(...);
    
    // Wait before next cycle
    await sleep(randomInterval);
  } catch (error) {
    logger.error('Error:', error);
  }
}
```

**Why Auto-Refill?**
- Bots never run out of tokens
- No manual intervention needed
- Handles faucet cooldowns automatically
- Independent per token (borrowers refill both fakeUSD and fakeTIA)

### Market Rebalancing Configuration

**Goal:** Maintain 60-80% market utilization

**Configuration** (`bots.config.ts`):

```typescript
export const botConfig = {
  lenders: {
    agentCount: 2,           // Reduced from 3
    minInterval: 60000,      // 1 min
    maxInterval: 180000,     // 3 min
    minSupply: '50',         // Reduced from '100'
    maxSupply: '300',        // Reduced from '1000'
    strategy: 'random'
  },
  
  borrowers: {
    agentCount: 5,           // Increased from 4
    smartRatio: 0.5,         // 50% smart, 50% dumb
    minInterval: 30000,      // 30 sec
    maxInterval: 120000,     // 2 min
    minHealthFactor: 1.5,    // Smart borrowers keep HF > 1.5
    targetUtilization: 0.75  // 75% collateral usage
  },
  
  vaultUsers: {
    agentCount: 3,           // Reduced from 5
    minInterval: 60000,      // 1 min
    maxInterval: 180000,     // 3 min
    minDeposit: '50',
    maxDeposit: '400',       // Reduced from '800'
    withdrawalProbability: 0.005,  // 0.5% chance per cycle
    minAPYToStay: 2.0,       // Withdraw more if APY < 2%
    vaultCapacityThreshold: 0.95
  },
  
  oracleChangers: {
    agentCount: 1,
    minInterval: 120000,     // 2 min
    maxInterval: 300000,     // 5 min
    minPriceChange: 0.02,    // ±2%
    maxPriceChange: 0.08,    // ±8%
    absoluteMin: 3.0,        // Floor
    absoluteMax: 7.0         // Ceiling
  },
  
  liquidators: {
    agentCount: 2,
    checkInterval: 15000,    // 15 sec
    minProfitThreshold: '10'
  },
  
  wallets: {
    autoRefill: {
      enabled: true,
      minBalanceThreshold: '500',
      refillAmount: '2000'
    }
  }
};
```

**Why These Numbers?**
- Original config had too much supply (lenders + vault users)
- Market utilization stuck at ~8%
- Rebalanced to reduce supply, increase borrow demand
- Result: 60-80% utilization for visible APY

### Running Bots

**NPM Scripts** (`ops/package.json`):

```json
{
  "scripts": {
    "bots:setup": "tsx scripts/bots/setup.ts",
    "bots:lenders": "tsx scripts/bots/lenders.ts",
    "bots:borrowers": "tsx scripts/bots/borrowers.ts",
    "bots:vault:users": "tsx scripts/bots/vaultUsers.ts",
    "bots:oracle": "tsx scripts/bots/oracleChangers.ts",
    "bots:liquidators": "tsx scripts/bots/liquidators.ts",
    "bots:all": "./scripts/bots/run-all.sh"
  }
}
```

**Shell Script** (`scripts/bots/run-all.sh`):

```bash
#!/bin/bash
# Launch all bots in background

cd "$(dirname "$0")/../.."

echo "Starting all bots..."

npx tsx scripts/bots/lenders.ts &
npx tsx scripts/bots/borrowers.ts &
npx tsx scripts/bots/vaultUsers.ts &
npx tsx scripts/bots/oracleChangers.ts &
npx tsx scripts/bots/liquidators.ts &

echo "All bots started in background"
echo "Stop with: pkill -f 'tsx scripts/bots'"
```

**Usage:**

```bash
cd ops

# One-time setup
npm run bots:setup

# Run all bots
npm run bots:all

# Stop all bots
pkill -f 'tsx scripts/bots'

# Run individual bot
npm run bots:lenders
```

---

## 7. Implementation Milestones

These milestones provide a phased approach to building the demo, from foundational infrastructure to optional enhancements.

### Milestone 0: Foundation (Setup & Mocks Page)

**Goal:** Build testnet sandbox for token minting, price control, and market observation

**What to Build:**

1. **Smart Contracts**:
   - Deploy FaucetERC20 for fakeUSD and fakeTIA
   - Deploy OracleMock with initial price ($50)
   - Create Morpho Blue market using deployed contracts
   - Deploy MetaMorpho v1.1 vault via factory
   - Mint initial tokens for testing
   - Initialize market with 60-70% utilization

2. **Frontend `/setup` Page**:
   - **WalletCard**: Connection status, network validation, ETH balance
   - **TokenFaucetCard**: Mint tokens, track cooldowns, display balances
   - **OracleCard**: Adjust prices, preset buttons, transaction confirmation
   - **SandboxMarketCard**: Display metrics (utilization, APY, TVL)

3. **Data Layer**:
   - `useTokenBalance` hook for balance tracking
   - `useMarketData` hook for market metrics
   - Number formatting utility for displays
   - Contract address management with auto-loading

**Acceptance Criteria:**
- ✓ Tokens mintable via UI with balance updates
- ✓ Oracle price adjustable via UI presets
- ✓ Market displays live utilization and APY
- ✓ Market initialized to target utilization (60-70%)
- ✓ All numbers formatted with thousand separators/abbreviations
- ✓ Faucet cooldown (60s) properly enforced and displayed

**Estimated Time:** 2-3 days for contracts + frontend

### Milestone 1: Vault Integration

**Goal:** Build production-like MetaMorpho vault interface for deposits and withdrawals

**What to Build:**

1. **Frontend `/vaults` Page**:
   - **VaultOverview**: Metrics, governance roles, status indicators
   - **VaultPerformance**: APY calculation, share price tracking
   - **VaultActions**: Deposit/withdraw flows with approvals
   - **VaultAllocation**: Market breakdown, supply queue visualization
   - **VaultAdmin**: Owner controls (caps, queues, reallocation)

2. **Data Layer**:
   - `useVaultData` hook for vault state
   - `useVaultAPY` hook for weighted APY calculation
   - `useVaultAllocation` hook for market allocations
   - `useTokenAllowance` hook for ERC20 approvals
   - Enhanced number formatting for all vault metrics

3. **User Flows**:
   - **Deposit Flow**: Check balance → Approve (if needed) → Deposit → Confirm
   - **Withdraw Flow**: Check shares → Withdraw → Confirm
   - **Admin Flow**: Set cap → Submit → Accept (after timelock) → Add to queue

**Acceptance Criteria:**
- ✓ Users can deposit fakeUSD and receive vault shares
- ✓ Users can withdraw shares and receive underlying assets
- ✓ APY calculated correctly from market allocations
- ✓ Admin can set supply caps and manage queues
- ✓ All numbers display with formatting
- ✓ Real-time data updates every 10 seconds
- ✓ Approval flow works seamlessly
- ✓ Preview functionality shows expected shares/assets

**Estimated Time:** 3-4 days for frontend + hooks

**Post-M1 Configuration (Required):**

After deploying the vault, configure it via frontend:

1. **Set Supply Cap** (in Admin panel):
   - Enter desired cap (e.g., 1,000,000)
   - Click "Submit Cap"
   - Click "Accept Cap" (timelock=0, so immediate)

2. **Add Market to Supply Queue**:
   - Click "Add Market to Supply Queue"
   - This enables auto-allocation on deposits

3. **Verify**: Check Vault Overview shows supply cap set

### Milestone 2: Bot Simulation (Optional)

**Goal:** Add autonomous agents for realistic market activity and continuous testing

**What to Build:**

1. **Bot Infrastructure** (`ops/`):
   - `bots.config.ts` - Configuration for all bot types
   - `lib/botUtils.ts` - Shared utilities (logging, transactions, refill)
   - Wallet generation and 2-phase funding system

2. **Bot Implementations**:
   - `lenders.ts` - Supply fakeUSD to market (2 agents)
   - `borrowers.ts` - Supply collateral and borrow (5 agents, mixed strategies)
   - `vaultUsers.ts` - Deposit to vault (3 agents, occasional withdrawals)
   - `oracleChangers.ts` - Adjust prices (1 agent, random walk)
   - `liquidators.ts` - Monitor and liquidate (2 agents)

3. **Features**:
   - Auto-refill mechanism for continuous operation
   - Market rebalancing configuration for target utilization
   - Wallet persistence across restarts
   - Error recovery with exponential backoff
   - Comprehensive logging

**Acceptance Criteria:**
- ✓ 15 wallets generated and funded (13 active)
- ✓ All 5 bot types running independently
- ✓ Market utilization maintained at 60-80%
- ✓ Bots auto-refill when low on tokens
- ✓ System restartable from saved state
- ✓ Liquidations occur when health factor < 1.0

**Estimated Time:** 4-5 days for all bots + testing

**Why Optional?**
- M0 and M1 fully demonstrate vault functionality
- Bots add realism but aren't required for education
- Can manually supply/borrow/deposit for testing
- Useful for continuous demos or hackathons

---

## 8. Fast-Feedback Yield Strategy

**Goal:** Make yield movements visible within minutes, not hours

On public testnets, waiting an hour for noticeable yield is impractical for demos. Use these tactics to accelerate feedback:

### 1. High-Rate Market Configuration

**IRM Selection:**
- Use **IRM Mock** (pre-deployed on Eden) with steeper slope
- Borrow APR should be high even at modest utilization
- Target: 10-20% APR at 60% utilization for visible changes

**Market Parameters:**
- **Small supply caps**: 1,000-10,000 fakeUSD
- **Allows**: Single borrower to reach meaningful utilization quickly
- **Example**: 500 fakeUSD borrowed from 1,000 total = 50% utilization instantly

### 2. Automated Borrower Activity

**Manual Testing:**
- Mint tokens via faucet
- Supply fakeTIA as collateral
- Borrow fakeUSD to raise utilization
- Hold position for 10-20 minutes
- Watch interest accrue

**Bot-Driven (Milestone 2):**
- Borrower bots continuously borrow and repay
- Keeps utilization in 60-80% range
- Interest continuously accrues
- APY updates visible within minutes

### 3. Small Principals, High Precision

**Display Strategy:**
- Work with 1-1000 token amounts
- Show **share price** to 6-8 decimals
- Display **APY** to 2 decimals (8.67%)
- Use number formatting: 1,234.567890 → 1.23k (for large)

**Why This Works:**
- Small absolute interest (0.01 tokens) is visible in share price
- Percentage changes are immediately noticeable
- Users see yield accumulating in real-time

### 4. Observability

**Track and Display:**
- `totalAssets` in vault
- Share price (`totalAssets / totalSupply`)
- Market utilization rate
- Supply and borrow APY
- Withdraw queue length
- Time since last action

**Update Frequency:**
- Auto-refresh every 10 seconds
- Manual refresh button
- Transaction confirmations trigger immediate refresh

### 5. Demo Flow for Testing

**Recommended Sequence:**

1. **Setup** (M0):
   - Mint tokens via `/setup` page
   - Set oracle price ($50)
   - Verify market created and initialized

2. **Supply Liquidity**:
   - Deposit 100-1000 fakeUSD to vault
   - Check vault allocated funds to market
   - Note starting share price

3. **Create Utilization** (choose one):
   - **Manual**: Supply collateral, borrow fakeUSD
   - **Automated**: Run borrower bots

4. **Observe Yield**:
   - Wait 10-20 minutes
   - Watch market utilization increase
   - See supply APY rise
   - Notice vault share price increment
   - Check weighted APY calculation

5. **Adjust and Test**:
   - Change oracle price (test health factors)
   - Add more supply (watch utilization drop)
   - Borrow more (watch utilization rise)
   - Observe liquidations (if health factor < 1.0)

### Expected Timeline

| Action | Visible Effect | Time |
|--------|----------------|------|
| Deposit to vault | Share mint | Immediate (1 block) |
| Borrow from market | Utilization increase | Immediate (1 block) |
| APY calculation | Rate update | Immediate (next page load) |
| Interest accrual | Share price change | 10-30 minutes |
| Bot equilibrium | Stable utilization | 30-60 minutes |

**Note:** On Eden Testnet, fast block times (~2-3 seconds) accelerate all of these timelines compared to Ethereum mainnet.

---

## 9. Timing & Observability Reference

### Predictable Timing & Yield Observation

| Action                             | Expected Minimal Time Before Visible Effect                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Deposit into Vault                 | Immediate share mint, visible instantly.                                                    |
| Allocation (Curator/Allocator)     | Visible after transaction mined (a few seconds).                                            |
| Borrow to raise utilization        | APY jump visible within 1–5 minutes.                                                        |
| Interest accrual on share price    | Noticeable change after 10–30 minutes (with high utilization); more obvious after \~1 hour. |
| Rate drift at low/high utilization | Several hours to start being noticeable; full doubling/halving \~5 days.                    |
| Oracle price change                | Immediate effect on health factors and risk metrics after tx mined.                         |

*Tip:* Use small supply caps, high IRM slope, and an automated borrower bot to ensure that the yield signal is strong enough to be observed during a hackathon demo session.

### Demo Timing & Observability Table

| Trigger / Action                                | What it does                                          | When you should see it                                               | Tips for the demo                                                                       |
| ----------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Borrow tx that raises utilization**           | Increases borrow index; boosts supply APY             | 1–5 min after tx (often immediate upon next read)                    | Keep caps small so a tiny borrow moves utilization meaningfully                         |
| **Allocator `reallocate()`**                    | Moves vault funds into/out of markets                 | Immediate change in allocation; APY updates on next accrual          | Run after deposits so capital isn't idle                                                |
| **User `deposit()` / `redeem()` (ERC‑4626)**    | Mints/burns shares                                    | Immediate; share balances update post‑tx                             | Show share price & totalAssets so small moves are visible                               |
| **Oracle price change (mock feed)**             | Shifts collateral value & HF                          | Immediate risk metrics shift; may trigger different borrow limits    | Provide preset buttons: ±5%, ±20%, crash, recovery                                      |
| **Manual accrue (no‑op that triggers accrual)** | Forces interest snapshot                              | Within seconds of tx                                                 | Add a "Poke Accrual" button calling a cheap write (or any interaction that triggers it) |
| **Rate drift at extremes (0% / 100% util)**     | Time‑based IRM drift (halving/doubling over \~5 days) | Hours to days (slow)                                                 | Don't rely on drift; use borrower bot for fast feedback                                 |
| **Borrower bot cycle**                          | Opens small borrow, holds, then repays                | Noticeable share price/APY changes within 10–30 min; clearer by \~1h | Run every 2–5 min; log utilization & accrued interest                                   |

---

## Appendix A — Development Readiness

### Prerequisites & Environment

* Node 20.x (`.nvmrc`), npm.
* Foundry installed (`forge`/`cast`).
* `.env` file based on `.env.example`.

### ABIs & Sources

* Use reputable packages (OpenZeppelin, Morpho). Check-in JSON ABIs under `packages/abi/` if needed.

### TS-first Scripts

* Prefer TypeScript scripts for deploy/batch actions; only introduce on-chain batchers if wallet approvals become excessive.

### Defaults & Parameters

* Sandbox market defaults: LLTV preset, IRM address, small caps, target utilization ~70%, HF floor ~1.5, small principals.
* Free-tier RPCs are acceptable; provide sensible polling intervals.

---

## 11. Notes: Predictable Timing & Yield Observation

| Action                             | Expected Minimal Time Before Visible Effect                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Deposit into Vault                 | Immediate share mint, visible instantly.                                                    |
| Allocation (Curator/Allocator)     | Visible after transaction mined (a few seconds).                                            |
| Borrow to raise utilization        | APY jump visible within 1–5 minutes.                                                        |
| Interest accrual on share price    | Noticeable change after 10–30 minutes (with high utilization); more obvious after \~1 hour. |
| Rate drift at low/high utilization | Several hours to start being noticeable; full doubling/halving \~5 days.                    |
| Oracle price change                | Immediate effect on health factors and risk metrics after tx mined.                         |

*Tip:* Use small supply caps, high IRM slope, and an automated borrower bot to ensure that the yield signal is strong enough to be observed during a hackathon demo session.

---

## 12. Notes

### Demo Timing & Observability Table

| Trigger / Action                                | What it does                                          | When you should see it                                               | Tips for the demo                                                                       |
| ----------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Borrow tx that raises utilization**           | Increases borrow index; boosts supply APY             | 1–5 min after tx (often immediate upon next read)                    | Keep caps small so a tiny borrow moves utilization meaningfully                         |
| **Allocator `reallocate()`**                    | Moves vault funds into/out of markets                 | Immediate change in allocation; APY updates on next accrual          | Run after deposits so capital isn’t idle                                                |
| **User `deposit()` / `redeem()` (ERC‑4626)**    | Mints/burns shares                                    | Immediate; share balances update post‑tx                             | Show share price & totalAssets so small moves are visible                               |
| **Oracle price change (mock feed)**             | Shifts collateral value & HF                          | Immediate risk metrics shift; may trigger different borrow limits    | Provide preset buttons: ±5%, ±20%, crash, recovery                                      |
| **Manual accrue (no‑op that triggers accrual)** | Forces interest snapshot                              | Within seconds of tx                                                 | Add a “Poke Accrual” button calling a cheap write (or any interaction that triggers it) |
| **Rate drift at extremes (0% / 100% util)**     | Time‑based IRM drift (halving/doubling over \~5 days) | Hours to days (slow)                                                 | Don’t rely on drift; use borrower bot for fast feedback                                 |
| **Borrower bot cycle**                          | Opens small borrow, holds, then repays                | Noticeable share price/APY changes within 10–30 min; clearer by \~1h | Run every 2–5 min; log utilization & accrued interest                                   |

### TypeScript Bot (Reactive Allocator/Borrower)

**Goal:** Keep the market “alive” so APY/indices move without manual babysitting.

**Responsibilities**

* Poll vault + market state (utilization, caps, indexes, oracle price, HF of a managed position).
* If utilization < target, **open/scale a borrow** from a controlled EOA; if > target, **repay**.
* Optionally call an accrual‑triggering interaction after each cycle.
* Respect safety guards: max borrow, min HF, max gas per cycle, cool‑down between actions.

**Shape (suggested)**

```
/ops
  bot.config.ts         # RPC, addresses, targets
  bot.state.ts          # read helpers (indexes, util, HF)
  bot.actions.ts        # openBorrow, repay, reallocate, pokeAccrual
  bot.loop.ts           # main loop (every 2–5 min)
```

**Runtime**

* Env‑driven (`.env`): RPC\_URL, PRIVATE\_KEY, VAULT, MARKET, UTIL\_TARGET, MAX\_BORROW.
* Cron or PM2 to keep it running during the demo.
