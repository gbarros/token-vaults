# Frontend - Morpho Vaults v1.1 Demo

Next.js application for interacting with Morpho Blue and MetaMorpho vaults on Eden Testnet.

## Overview

This frontend provides an educational interface for:
- **Setup Page** (`/setup`) - Sandbox environment for minting tokens, adjusting prices, and viewing market metrics
- **Vaults Page** (`/vaults`) - Complete MetaMorpho vault interface for deposits, withdrawals, and administration

## Technical Stack

- **Next.js 15** - React framework with App Router
- **Wagmi + Viem** - Type-safe Ethereum interactions
- **Morpho Blue SDK** - Official SDK for protocol integration (`@morpho-org/blue-sdk`, `@morpho-org/blue-sdk-viem`)
- **TailwindCSS** - Utility-first styling
- **React Hot Toast** - User notifications
- **Custom RPC Proxy** - WebSocket proxy for Eden Testnet connectivity

## Architecture

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── setup/             # M0: Sandbox environment
│   │   │   └── page.tsx       # Token faucet, oracle, market metrics
│   │   ├── vaults/            # M1: Vault interface
│   │   │   └── page.tsx       # Deposit, withdraw, admin
│   │   └── api/               # API routes
│   │       └── rpc-ws/        # WebSocket RPC proxy
│   ├── components/
│   │   ├── setup/             # Setup page components
│   │   │   ├── WalletCard.tsx           # Connection status
│   │   │   ├── TokenFaucetCard.tsx      # Token minting
│   │   │   ├── OracleCard.tsx           # Price controls
│   │   │   └── SandboxMarketCard.tsx    # Market metrics
│   │   ├── vaults/            # Vaults page components
│   │   │   ├── VaultOverview.tsx        # Metrics & governance
│   │   │   ├── VaultPerformance.tsx     # APY & share price
│   │   │   ├── VaultActions.tsx         # Deposit/withdraw UI
│   │   │   ├── VaultAllocation.tsx      # Market breakdown
│   │   │   └── VaultAdmin.tsx           # Owner controls
│   │   └── wallet/            # Shared components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useVaultData.ts              # Vault state management
│   │   ├── useVaultAPY.ts               # APY calculation
│   │   ├── useVaultAllocation.ts        # Allocation tracking
│   │   ├── useMarketData.ts             # Market metrics
│   │   ├── useHealthFactor.ts           # Borrowing safety
│   │   ├── useTokenBalance.ts           # ERC20 balances
│   │   └── useTokenAllowance.ts         # ERC20 approvals
│   └── lib/                   # Utilities
│       ├── wagmi.ts                     # Web3 configuration
│       ├── contracts.ts                 # Address management
│       ├── abis.ts                      # Contract ABIs
│       ├── formatNumber.ts              # Number formatting
│       └── networkUtils.ts              # Network helpers
├── vercel/                    # Production build artifacts
│   └── contracts/             # Copied contract artifacts (~10 files)
└── public/                    # Static assets
```

## Key Features

### Setup Page (M0 - Milestone 0)

**Purpose:** Testnet sandbox for experimenting with tokens and markets

**Components:**
1. **WalletCard** - Connection status, network validation, ETH balance
2. **TokenFaucetCard** - Mint test tokens with cooldown tracking
3. **OracleCard** - Adjust prices with presets (+/-5%, +/-20%, crash, recovery)
4. **SandboxMarketCard** - Display market utilization, APY, and TVL

**Features:**
- Mint fakeUSD and fakeTIA via FaucetERC20 contracts
- Control oracle prices for testing market dynamics
- View live market metrics (utilization, supply/borrow rates)
- 60-second faucet cooldown per token per address

### Vaults Page (M1 - Milestone 1)

**Purpose:** Production-like interface for MetaMorpho v1.1 vaults

**Components:**
1. **VaultOverview** - Total assets, supply cap, share price, governance roles
2. **VaultPerformance** - Weighted APY, share price tracking, historical performance
3. **VaultActions** - Deposit/withdraw flows with approval handling
4. **VaultAllocation** - Market allocation breakdown, supply queue visualization
5. **VaultAdmin** - Owner-only controls (supply caps, queue management, reallocation)

**Features:**
- ERC-4626 compliant deposit/withdraw interface
- Real-time APY calculation weighted across allocated markets
- Automatic share price updates
- Preview functionality for deposit/withdraw amounts
- Admin panel for vault configuration (owner only)

### Data Layer (Custom Hooks)

**Purpose:** Encapsulate contract interactions and state management

**Key Hooks:**
- `useVaultData` - Fetches vault state (totalAssets, totalSupply, cap, etc.)
- `useVaultAPY` - Calculates weighted APY from market allocations
- `useVaultAllocation` - Tracks how vault funds are distributed across markets
- `useMarketData` - Fetches underlying Morpho Blue market metrics
- `useHealthFactor` - Calculates borrowing position safety
- `useTokenBalance` / `useTokenAllowance` - ERC20 token management

**Benefits:**
- Reusable across components
- Automatic refresh with configurable intervals
- Type-safe with TypeScript
- Error handling built-in

### Number Formatting System

**Purpose:** Human-readable display of large numbers

**Utility:** `lib/formatNumber.ts`

**Functions:**
- `formatNumber(value, options)` - Base formatter with thousand separators
- `formatTokenAmount(value, decimals)` - For token displays with abbreviations
- `formatTokenString(etherValue, decimals)` - For pre-converted ether strings
- `formatCurrency(value)` - For USD amounts with 2 decimals
- `formatPercentage(value, decimals)` - For percentages with % suffix
- `formatCompact(value)` - Always abbreviate (for badges)

**Examples:**
```typescript
formatTokenString("2224849.62", 2)  // "2.22M"
formatNumber(419000, { abbreviate: true })  // "419k"
formatCurrency(304143.40)  // "$304.14k"
formatPercentage(0.0867, 2)  // "8.67%"
```

**Smart Abbreviations:**
- 1,000+ → 1k, 1.5k, 2.3k
- 1,000,000+ → 1M, 1.5M, 2.3M
- 1,000,000,000+ → 1B, 1.5B
- 1,000,000,000,000+ → 1T

### Contract Address Management

**Auto-loading from Forge Artifacts:**

The frontend automatically loads deployed contract addresses from Forge broadcast artifacts:

```typescript
// lib/contracts.ts
const deployTokensArtifact = require('@contracts/broadcast/DeployTokens.s.sol/3735928814/run-latest.json');
const deployVaultArtifact = require('@contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json');
```

**Environment Variable Overrides:**

You can override addresses in `.env.local`:

```bash
# Optional - override specific contracts
NEXT_PUBLIC_LOAN_TOKEN=0x...
NEXT_PUBLIC_COLLATERAL_TOKEN=0x...
NEXT_PUBLIC_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_MARKET_ID=0x...
```

**Benefits:**
- No manual address copying after deployment
- Consistent with contract deployment state
- Easy to switch between deployments
- Type-safe address access

## Development

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

```bash
# Copy example environment file
cp env.example .env.local

# Edit .env.local (optional - defaults work for Eden Testnet)
```

**Key Environment Variables:**
```bash
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=3735928814
NEXT_PUBLIC_RPC_URL=https://rpc.edentestnet.com
NEXT_PUBLIC_RPC_WS_URL=wss://rpc.edentestnet.com
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://eden-testnet.blockscout.com

# Morpho Protocol (Eden Testnet)
NEXT_PUBLIC_MORPHO_BLUE_CORE=0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd
NEXT_PUBLIC_METAMORPHO_FACTORY=0xb007ca4AD41874640F9458bF3B5e427c31Be7766
NEXT_PUBLIC_IRM_MOCK=0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92
```

### Running Locally

```bash
# Development mode (hot reload)
npm run dev

# Production build (local test)
npm run build
npm run start

# Linting
npm run lint
```

**Access Points:**
- Development: http://localhost:3000
- Setup Page: http://localhost:3000/setup
- Vaults Page: http://localhost:3000/vaults

### Local vs Production Builds

**Development (`npm run dev`):**
- Uses `../contracts/` directly via filesystem
- Hot reload enabled
- Fast refresh
- Source maps included

**Production (`npm run build`):**
- Sets `NODE_ENV=production`
- Webpack alias redirects `@contracts` → `vercel/contracts/`
- Optimized bundles
- Static page generation where possible

## Vercel Deployment

### Overview

The frontend uses a conditional import strategy to handle contract artifacts:

**Problem:** `contracts/out/` is gitignored (1000+ files, ~100MB)

**Solution:** Copy only needed files to committed `vercel/` folder

### Deployment Strategy

**Webpack Alias Configuration:**

`next.config.ts` uses webpack to redirect imports based on environment:

```typescript
webpack: (config, { webpack }) => {
  const contractsPath = process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, 'vercel/contracts')
    : path.resolve(__dirname, '../contracts');
  
  config.resolve.alias = {
    ...config.resolve.alias,
    '@contracts': contractsPath,
  };
  
  // Ignore optional contract artifacts
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /@contracts\/broadcast\/DeployAggregator\.s\.sol/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /@contracts\/broadcast\/DeployOracle\.s\.sol/,
    })
  );
  
  return config;
}
```

**Copy Script:**

`scripts/copy-contracts-for-vercel.js` copies minimal artifacts:

```bash
# Copy contract artifacts to vercel/ folder
npm run copy-contracts
```

**Files Copied (~10 files):**
- `broadcast/DeployTokens.s.sol/3735928814/run-latest.json`
- `broadcast/DeployOracleMock.s.sol/3735928814/run-latest.json`
- `broadcast/CreateMarket.s.sol/3735928814/run-latest.json`
- `broadcast/DeployVault.s.sol/3735928814/run-latest.json`
- `out/IIrm.sol/IIrm.json`
- `out/IOracle.sol/IOracle.json`
- `out/FaucetERC20.sol/FaucetERC20.json`
- `out/OracleMock.sol/OracleMock.json`

### Deployment Workflow

**When contracts change:**

```bash
# 1. Deploy contracts
cd ../contracts
forge script script/DeployVault.s.sol --broadcast

# 2. Copy artifacts to vercel folder
cd ../frontend
npm run copy-contracts

# 3. Commit the updated vercel folder
git add vercel/
git commit -m "Update contract artifacts for Vercel"

# 4. Push (triggers Vercel deployment)
git push
```

**Vercel Configuration:**

Dashboard Settings:
- **Framework**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (default)
- **Install Command**: `npm ci` (default)

### Import Compatibility

**Using `@contracts` Alias:**

All contract imports use `require()` to avoid TypeScript compile-time checks:

```typescript
// lib/abis.ts
const IIrmArtifact = require('@contracts/out/IIrm.sol/IIrm.json');
const FaucetERC20Artifact = require('@contracts/out/FaucetERC20.sol/FaucetERC20.json');

// lib/contracts.ts
deployVaultArtifact = require('@contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json');
```

**Why `require()` not `import`?**
- TypeScript checks imports at compile time
- On Vercel, TypeScript can't resolve `@contracts` path
- `require()` defers resolution to webpack at runtime
- Webpack alias handles the redirection

## Troubleshooting

### Common Issues

**Issue: "Module not found: @contracts/..."**
- Run `npm run copy-contracts` to populate `vercel/` folder
- Check `next.config.ts` has correct webpack alias
- Verify `vercel/contracts/` contains required files

**Issue: "Wrong network" or "Cannot read contract"**
- Check wallet is connected to Eden Testnet (chain ID 3735928814)
- Verify contract addresses in `.env.local` or Forge artifacts
- Check RPC endpoint is accessible

**Issue: "Insufficient allowance" on deposit**
- Click "Approve" button before "Deposit"
- Wait for approval transaction to confirm
- Check token balance is sufficient

**Issue: Numbers not formatting correctly**
- Ensure `formatNumber.ts` is imported
- Check value is passed as string, number, or bigint
- Verify decimals parameter is correct

**Issue: APY shows 0%**
- Market may have no borrowers (normal in testing)
- Run borrower bots to create utilization
- Check market has liquidity allocated

### Debug Tips

**Check Contract State:**
```bash
# From contracts directory
source .env

# Check vault total assets
cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url eden

# Check market state
cast call $MORPHO_BLUE_CORE "market(bytes32)" $MARKET_ID --rpc-url eden

# Check token balance
cast call $LOAN_TOKEN "balanceOf(address)(uint256)" <YOUR_ADDRESS> --rpc-url eden
```

**Browser Console:**
- Open DevTools (F12)
- Check Console tab for hook errors
- Network tab shows RPC calls
- React DevTools shows component state

**Verify Deployment:**
```bash
# Check what's deployed
ls -la ../contracts/broadcast/*/3735928814/run-latest.json

# Verify addresses match
cat ../contracts/broadcast/DeployVault.s.sol/3735928814/run-latest.json | grep contractAddress
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [Morpho Documentation](https://docs.morpho.org)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## Links

- **Root README**: `../README.md` - Full project overview
- **Contracts README**: `../contracts/README-SCRIPTS.md` - Deployment scripts
- **Ops README**: `../ops/README.md` - Bot simulation system
- **Plan**: `../plan.md` - Implementation guide
