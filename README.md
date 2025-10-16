# Morpho Vaults v1.1 Demo (Eden Testnet)

**Powered by Celestia Eden**

A comprehensive demonstration of building yield-bearing products using **Morpho Vaults v1.1** as the yield engine on **Eden Testnet**. This repository includes smart contracts, a Next.js frontend, and optional bot simulation for testing vault functionality.

## 🎯 What This Project Demonstrates

- **MetaMorpho v1.1 Vault** deployment and integration
- **Morpho Blue** lending market creation
- **ERC-4626** vault interface with deposit/withdraw flows
- **Real-time APY** calculation from market allocations
- **Vault governance** (Owner, Curator, Allocator roles)
- **Educational sandbox** with token faucets and controllable oracles

## 📚 Documentation

- **[`plan.md`](plan.md)** - Complete implementation guide (how to build this)
- **[`tutorial.md`](tutorial.md)** - Learning-focused walkthrough (understanding Morpho Vaults)
- **[`contracts/README.md`](contracts/README.md)** - Contract deployment guide
- **[`frontend/README.md`](frontend/README.md)** - Frontend architecture and utilities
- **[`ops/README.md`](ops/README.md)** - Bot simulation system documentation

## 🌐 Network Configuration

### Eden Testnet (Default)

This project is pre-configured for **Eden Testnet** (Powered by Celestia):

- **Chain ID**: 3735928814
- **RPC**: https://rpc.edentestnet.com
- **Explorer**: https://eden-testnet.blockscout.com
- **Faucet**: https://faucet-eden-testnet.binarybuilders.services

**Named RPC Endpoints**: We use Foundry's named endpoints defined in `contracts/foundry.toml`:
```bash
# Cleaner than: --rpc-url $RPC_URL
forge script script/DeployTokens.s.sol --rpc-url eden --broadcast
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (check: `node --version`)
- **npm** (comes with Node)
- **Foundry** (install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- **Eden Testnet TIA** ([Get from faucet](https://faucet-eden-testnet.binarybuilders.services))

### 1. Environment Setup

**Contracts:**
```bash
cd contracts
cp env.example .env
# Edit .env with your PRIVATE_KEY and RPC_URL
forge install
```

**Frontend:**
```bash
cd frontend
cp env.example .env.local
# Optional: Edit .env.local (defaults work for Eden)
npm install
```

**Ops (optional, for bots):**
```bash
cd ops
npm install
# Copy .env from contracts after deployment
```

### 2. Deploy Contracts

Run deployment sequence on Eden Testnet:

```bash
cd contracts

# 1. Deploy test tokens (fakeUSD, fakeTIA)
forge script script/DeployTokens.s.sol --rpc-url eden --broadcast
./update-env-from-artifacts.sh

# 2. Deploy oracle
INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol --rpc-url eden --broadcast
./update-env-from-artifacts.sh

# 3. Create Morpho Blue market
forge script script/CreateMarket.s.sol --rpc-url eden --broadcast
./update-env-from-artifacts.sh

# 4. Deploy MetaMorpho vault
forge script script/DeployVault.s.sol --rpc-url eden --broadcast
./update-env-from-artifacts.sh

# 5. Mint initial tokens
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# 6. Initialize market utilization
forge script script/InitializeUtilization.s.sol --rpc-url eden --broadcast
```

**Verification (optional):**
Add to any script:
```bash
--verify --verifier blockscout --verifier-url 'https://eden-testnet.blockscout.com/api/'
```

### 3. Run Frontend

```bash
cd frontend
npm run dev
```

Visit:
- **Landing**: http://localhost:3000
- **Setup (Sandbox)**: http://localhost:3000/setup
- **Vaults**: http://localhost:3000/vaults

### 4. Configure Vault (First Time Only)

After deployment, configure the vault via the frontend:

1. Connect wallet (must be deployer account)
2. Navigate to `/vaults`
3. Expand **"Vault Administration"** panel
4. **Set Supply Cap**: Enter amount (e.g., 1000000) → Submit → Accept
5. **Add Market to Supply Queue**: Click to enable market

Now the vault is ready for deposits!

### 5. Optional: Run Bot Simulation

For continuous market activity:

```bash
cd ops
cp ../contracts/.env .env  # Sync addresses

# One-time: Generate and fund bot wallets
npm run bots:setup

# Run all bots in background
npm run bots:all

# Stop bots
pkill -f 'tsx scripts/bots'
```

Bots include: 2 lenders, 5 borrowers, 3 vault users, 1 oracle changer, 2 liquidators.

## 🏗️ Project Structure

```
├── contracts/              # Foundry smart contracts
│   ├── src/
│   │   ├── FaucetERC20.sol           # ERC20 with public faucet
│   │   ├── OracleMock.sol            # Mock oracle for testing (deployed)
│   │   ├── SettableAggregator.sol    # Alternative aggregator pattern
│   │   └── OracleFromAggregator.sol  # Alternative oracle pattern
│   ├── script/              # Deployment scripts
│   │   ├── DeployTokens.s.sol
│   │   ├── DeployOracleMock.s.sol
│   │   ├── CreateMarket.s.sol
│   │   ├── DeployVault.s.sol
│   │   └── ... (utilities)
│   └── foundry.toml         # Network configuration
│
├── frontend/               # Next.js 15 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── setup/page.tsx       # Sandbox environment
│   │   │   └── vaults/page.tsx      # Vault interface
│   │   ├── components/
│   │   │   ├── setup/               # Faucet, oracle, market cards
│   │   │   └── vaults/              # Vault UI components
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useVaultData.ts
│   │   │   ├── useVaultAPY.ts
│   │   │   └── ... (7 hooks total)
│   │   └── lib/                     # Utilities
│   │       ├── contracts.ts         # Address management
│   │       ├── abis.ts              # Contract ABIs
│   │       ├── formatNumber.ts      # Number formatting
│   │       └── wagmi.ts             # Web3 config
│   ├── vercel/              # Production artifacts (committed)
│   │   └── contracts/       # ~10 essential Forge artifacts
│   └── next.config.ts       # Webpack aliases for contracts
│
├── ops/                    # Operations & bot simulation
│   ├── scripts/
│   │   └── bots/           # Autonomous agent scripts
│   │       ├── setup.ts              # Wallet generation
│   │       ├── lenders.ts            # Supply bots
│   │       ├── borrowers.ts          # Borrow bots
│   │       ├── vaultUsers.ts         # Vault deposit bots
│   │       ├── oracleChangers.ts     # Price adjustment bots
│   │       └── liquidators.ts        # Liquidation bots
│   ├── lib/
│   │   └── botUtils.ts     # Shared utilities
│   └── bots.config.ts      # Bot behavior configuration
│
├── plan.md                 # Complete builder's guide
└── tutorial.md             # Learning-focused walkthrough
```

## 🔧 Technical Stack

### Smart Contracts
- **Foundry** - Solidity development environment
- **OpenZeppelin** - Battle-tested contract libraries
- **Morpho Blue v1.1** - Core lending protocol (pre-deployed on Eden)

### Frontend
- **Next.js 15** - React framework with App Router
- **Wagmi + Viem** - Type-safe Ethereum interactions
- **Morpho Blue SDK** - Official SDK (`@morpho-org/blue-sdk@4.11.0`)
- **TailwindCSS** - Utility-first styling
- **React Hot Toast** - User notifications

### Operations
- **TypeScript** - Bot scripts and utilities
- **Viem** - Ethereum client for contract interactions
- **Node.js 20** - Runtime environment

## 📖 Morpho Integration

This demo integrates with pre-deployed Morpho contracts on Eden Testnet:

- **Morpho Blue Core**: `0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd`
  - Core lending protocol
  - Handles supply, borrow, repay, withdraw operations
  
- **MetaMorpho Factory v1.1**: `0xb007ca4AD41874640F9458bF3B5e427c31Be7766`
  - Factory for deploying vaults via CREATE2
  - Standardized vault implementation
  
- **IRM Mock**: `0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92`
  - Mock interest rate model for testing
  - Simpler than production AdaptiveCurveIRM

**Source**: [Eden Testnet Documentation](https://docs.celestia.org/eden/testnet)

**Note**: Eden uses mock contracts for educational purposes. Production deployments should use audited IRM implementations and Chainlink/Pyth oracles.

**Morpho Blue SDK** provides:
- Type-safe market parameter creation
- Automatic market ID calculation
- Official ABIs (`blueAbi`, `metaMorphoAbi`)
- Reduced boilerplate vs manual RPC calls

## ✨ Key Components

Learn from these reusable patterns:

### Custom Contracts

**`FaucetERC20.sol`** - ERC20 with public minting:
- `faucet(address to, uint256 amount)` - Public mint function
- `canMint(address user)` - Check cooldown status
- `remainingCooldown(address user)` - Time until next mint
- 60-second per-address cooldown
- Max 2000 tokens per call

**`OracleMock.sol`** - Simple price oracle:
- `price()` - Returns current price (2 decimals)
- `setPrice(uint256 newPrice)` - Update price
- Educational pattern for testing scenarios
- Production: Use Chainlink or Pyth

### Frontend Hooks

**`useVaultData`** - Vault state management:
- Fetches `totalAssets`, `totalSupply`, supply caps
- Calculates share price
- Auto-refresh with configurable intervals

**`useVaultAPY`** - APY calculation:
- Weighted average across allocated markets
- Per-market APY breakdown
- Real-time updates

**`useVaultAllocation`** - Market allocations:
- Supply queue tracking
- Idle assets calculation
- Per-market allocation amounts

**`useMarketData`** - Morpho Blue market metrics:
- Total supply and borrowed amounts
- Utilization rate calculation
- Supply/borrow APY from IRM

See `frontend/README.md` for complete hook documentation.

### Utility Libraries

**`lib/formatNumber.ts`** - Number formatting:
```typescript
formatNumber(1234567, { abbreviate: true })  // "1.23M"
formatTokenString("2224849.62", 2)           // "2.22M"
formatCurrency(419000)                       // "$419k"
formatPercentage(0.0867, 2)                  // "8.67%"
```

**`lib/contracts.ts`** - Auto-load addresses:
```typescript
// Loads from Forge artifacts automatically
const artifact = require('@contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json');
export const VAULT_ADDRESS = artifact.transactions.find(...)?.contractAddress;
```

**`lib/wagmi.ts`** - Network configuration:
```typescript
// Define custom chain for Eden Testnet
export const edenTestnet = defineChain({
  id: 3735928814,
  name: 'Eden Testnet',
  // ... complete config
});
```

### [Bonus] Bot System

**2-Phase Funding Strategy**:
1. Sequential ETH distribution (avoids nonce conflicts)
2. Parallel token minting (leverages per-address cooldowns)

**Auto-Refill Mechanism**:
- Bots check balance before each action
- Auto-mint from faucet when low (< 500 tokens)
- Respects 60-second cooldown per token
- Independent refill for loan and collateral tokens

**Market Rebalancing**:
- Configured to maintain 60-80% utilization
- 2 lenders (reduced supply), 5 borrowers (increased demand)
- 3 vault users, 1 oracle changer, 2 liquidators
- See `ops/README.md` for configuration details

### Vercel Deployment

**Problem**: `contracts/out/` is gitignored (1000+ files)

**Solution**: Webpack alias with selective copying
1. `scripts/copy-contracts-for-vercel.js` copies ~10 essential files
2. `next.config.ts` webpack alias redirects `@contracts` path
3. `vercel/contracts/` is committed to git
4. Works seamlessly in dev and production

See `frontend/README.md#vercel-deployment` for complete guide.

## 🔍 Troubleshooting

### Contract Deployment

**"Insufficient funds"**
- Check deployer has Eden TIA: `cast balance $DEPLOYER_ADDRESS --rpc-url eden`
- Visit faucet: https://faucet-eden-testnet.binarybuilders.services

**"Contract verification failed"**
- Blockscout verification is optional (no API key needed)
- Remove `--verify` flags if causing issues
- Contracts work without verification

**"Nonce too low"**
- Reset wallet nonce in MetaMask: Settings → Advanced → Clear Activity
- Or use `--broadcast --resume` to retry failed script

### Frontend

**"Wrong network"**
- Switch wallet to Eden Testnet (Chain ID: 3735928814)
- Add network manually if needed (RPC: https://rpc.edentestnet.com)

**"Module not found: @contracts/..."**
- Run `npm run copy-contracts` in frontend directory
- Restart dev server: `npm run dev`
- Check `vercel/contracts/` exists and has JSON files

**"Insufficient allowance" on deposit**
- Click "Approve" button before "Deposit"
- Wait for approval transaction to confirm
- Check token balance is sufficient

**APY shows 0%**
- Market has no utilization (no borrowers)
- Run `InitializeUtilization.s.sol` to create borrow activity
- Or start borrower bots: `cd ops && npm run bots:borrowers`

**Numbers not formatting**
- Check `lib/formatNumber.ts` is imported
- Verify value is passed as string, number, or bigint
- See `frontend/NUMBER-FORMATTING.md` for usage examples

### Bots

**"Bots running out of tokens"**
- Check `bots.config.ts` has `autoRefill.enabled: true`
- Increase `refillAmount` if bots consume tokens faster than faucet allows
- Monitor logs: `tail -f logs/lenders.log`

**"Cannot mint: cooldown active"**
- Faucet enforces 60-second per-address cooldown
- Auto-refill waits automatically
- Check `remainingCooldown` on token contract

**Market utilization stuck at 0%**
- Borrowers need collateral and loan tokens
- Check bot wallets have both fakeUSD and fakeTIA
- Verify market has liquidity from lenders

### Transaction Failures

**"Out of gas" error**
- Eden testnet quirk with gas estimation
- Retry transaction (usually succeeds on second attempt)
- Or manually increase gas limit in wallet

**"Health factor below 1.0" (borrowers)**
- Collateral price dropped too much
- Oracle changer bot may have set extreme price
- Adjust price back: Visit `/setup` → Oracle Controls → "Recovery"

**"Vault capacity reached"**
- Supply cap is full
- Owner must increase cap: `/vaults` → Admin → Set Supply Cap
- Or withdraw funds to free capacity

## 📄 License

**This demo project** does not have a specified license. It's provided as an educational demonstration.

**Dependencies use the following licenses:**
- **Morpho Blue**: Business Source License 1.1 (BSL 1.1)
  - Non-production use allowed (educational demos qualify)
  - Converts to GPL v2.0+ on 2026-01-01 or earlier
  - See `morpho-blue/LICENSE` for full terms
- **OpenZeppelin Contracts**: MIT License
- **Next.js**: MIT License
- **Foundry**: MIT/Apache-2.0

## 🤝 Contributing

This is a demo project for educational purposes. Feel free to:
- Fork and experiment
- Report issues for learning improvements
- Submit PRs for bug fixes or documentation

**Not intended for production use without significant security review.**

## 📚 Learn More

- **Morpho Documentation**: https://docs.morpho.org
- **ERC-4626 Standard**: https://eips.ethereum.org/EIPS/eip-4626
- **Eden Testnet**: https://eden-docs.celestia.org
- **Implementation Guide**: [`plan.md`](plan.md) (complete technical details)
- **Tutorial**: [`tutorial.md`](tutorial.md) (learning-focused walkthrough)

---

**Built with Morpho Blue & MetaMorpho v1.1 on Celestia Eden Testnet**