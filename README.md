# Morpho Vaults v1.1 Demo (Eden Testnet)

**Powered by Celestia Eden**

A comprehensive demonstration of building yield-bearing products using **Morpho Vaults v1.1** as the yield engine on **Eden Testnet**. This repository includes both smart contracts and a frontend application to showcase how to integrate with Morpho's infrastructure.

## 🌐 Network Support

This project is configured for **Eden Testnet** (Powered by Celestia). 

**Using Named RPC Endpoints**: We use Foundry's named RPC endpoints defined in `contracts/foundry.toml`:
```bash
# Instead of: --rpc-url $RPC_URL
# We use: --rpc-url eden
```

This is cleaner and avoids redundancy since the endpoint is already configured in `foundry.toml` and `.env`.

**Redeploying on Sepolia**: Thanks to centralized configuration, switching networks is simple:

1. **Update `contracts/foundry.toml`**:
   ```toml
   [rpc_endpoints]
   sepolia = "https://sepolia.infura.io/v3/your_project_id"
   ```

2. **Update `contracts/.env`**:
   ```bash
   RPC_URL=https://sepolia.infura.io/v3/your_project_id
   MORPHO_BLUE_CORE=0xd011EE229E7459ba1ddd22631eF7bF528d424A14
   METAMORPHO_FACTORY=0x98CbFE4053ad6778E0E3435943aC821f565D0b03
   IRM_ADDRESS=0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c
   ```

3. **Update `frontend/.env.local`**:
   ```bash
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_CHAIN_NAME="Sepolia"
   NEXT_PUBLIC_MORPHO_BLUE_CORE=0xd011EE229E7459ba1ddd22631eF7bF528d424A14
   NEXT_PUBLIC_METAMORPHO_FACTORY=0x98CbFE4053ad6778E0E3435943aC821f565D0b03
   NEXT_PUBLIC_IRM_MOCK=0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c
   NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
   ```

4. **Update artifact paths in `contracts.ts`**: Change `/3735928814/` to `/11155111/`
5. **Use named endpoint**: `--rpc-url sepolia` instead of `--rpc-url eden`

That's it! No code changes needed thanks to environment-driven configuration.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x (see `.nvmrc`)
- npm
- Foundry (for smart contracts)
- Eden Testnet TIA ([Get from faucet](https://faucet-eden-testnet.binarybuilders.services))

### Environment Setup

#### Configuration Architecture

This project uses a **centralized configuration** approach:

**Contracts** (`contracts/.env`):
- Deploy-time configuration (RPC, private key, Morpho addresses)
- Updated by Forge broadcast artifacts automatically

**Frontend** (`frontend/.env.local`):
- **Chain configuration**: Single source in `src/lib/wagmi.ts`
- **Morpho addresses**: Environment variables in `src/lib/contracts.ts`
- **Deployed contracts**: Auto-loaded from Forge artifacts

This eliminates duplication and makes network switching simple!

#### Setup Steps

1. **Forge Scripts** (for contract deployment):
   ```bash
   cd contracts
   cp env.example .env
   # Edit .env with your RPC_URL and PRIVATE_KEY
   # Note: ETHERSCAN_API_KEY not required for Blockscout verification
   forge install
   ```
   
   **RPC Configuration**: The default RPC URL is `https://ev-reth-eden-testnet.binarybuilders.services:8545`. You can use this public endpoint or obtain a dedicated RPC from an Eden provider. The `ETHERSCAN_API_KEY` is optional and not required for Blockscout verification on Eden Testnet.

2. **Frontend** (for the demo UI):
   ```bash
   cd frontend
   cp env.example .env.local
   # Edit .env.local to customize network settings (optional)
   # Default values work for Eden Testnet out of the box
   npm install
   ```
   
   **Note**: Frontend configuration is centralized and flexible:
   - **Chain config**: `src/lib/wagmi.ts` (single source of truth)
   - **Morpho addresses**: Environment variables with defaults
   - **Deployed contracts**: Auto-loaded from Forge artifacts, override with env vars
   - See `frontend/env.example` for all available configuration options
   
   **Default behavior**: Contracts auto-load from `contracts/broadcast/` artifacts
   
   **Override deployed contracts** (optional): Set these in `.env.local`:
   ```bash
   NEXT_PUBLIC_LOAN_TOKEN=0x...
   NEXT_PUBLIC_COLLATERAL_TOKEN=0x...
   NEXT_PUBLIC_ORACLE_ADDRESS=0x...
   NEXT_PUBLIC_VAULT_ADDRESS=0x...
   NEXT_PUBLIC_MARKET_ID=0x...
   ```

### Running the Demo

1. **Deploy Contracts** (using Forge scripts):
   ```bash
   cd contracts
   git submodule update --init --recursive
   source .env
   
   # Deploy all contracts in sequence with automatic verification
   # Note: Using 'eden' RPC endpoint defined in foundry.toml
   # Eden uses OracleMock for simplicity
   
   forge script script/DeployTokens.s.sol \
     --rpc-url eden \
     --broadcast \
     --verify \
     --verifier blockscout \
     --verifier-url 'https://eden-testnet.blockscout.com/api/'
   ./update-env-from-artifacts.sh

   INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol \
     --rpc-url eden \
     --broadcast \
     --verify \
     --verifier blockscout \
     --verifier-url 'https://eden-testnet.blockscout.com/api/'
   ./update-env-from-artifacts.sh

   forge script script/CreateMarket.s.sol \
     --rpc-url eden \
     --broadcast

       forge script script/DeployVault.s.sol \
         --rpc-url eden \
         --broadcast
       ./update-env-from-artifacts.sh

       # Mint tokens (fresh deployments have 0 balance)
       forge script script/MintTokens.s.sol --rpc-url eden --broadcast
     
   forge script script/InitializeUtilization.s.sol \
     --rpc-url eden \
     --broadcast
   ```
   
   **Note**: Fresh deployments start with 0 token balance. MintTokens gives 2000 fakeUSD + 1500 fakeTIA, covering all initialization scenarios.
   
   See `contracts/README-SCRIPTS.md` for detailed explanations and alternative initialization options.

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The frontend automatically loads contract addresses from Forge deployment artifacts in `contracts/broadcast/`. No manual configuration needed!

3. **Access Demo**:
   - Open http://localhost:3000
   - Connect your wallet (Eden Testnet - chain ID 3735928814)
   - Visit `/setup` to interact with the sandbox. Set a supply cap and "Submit Cap" and "Accept Cap". Then Add Market to Supply Queue, click to enable deposits.
   - Use same account to set oracle as deploying vaults.
   - Visit `/vaults` to interact with the MetaMorpho vault

## 📋 Milestone M0: "Setting the Stage"

**Status: ✅ COMPLETED**

This milestone provides the sandbox infrastructure needed to demo Morpho vault flows without production risk.

### ✅ Deliverables Completed

#### 1. Smart Contracts (`contracts/`)
- **FaucetERC20.sol**: ERC20 token with public faucet, cooldown mechanism, and configurable limits
- **SettableAggregator.sol**: Standard price aggregator for testing oracle functionality
- **Foundry Setup**: Complete build environment with OpenZeppelin dependencies

#### 2. Operations Scripts (`ops/`)
- **TypeScript Environment**: Debugging utilities and on-chain analysis tools
- **Utility Scripts**:
  - `buildOracle.ts`: Create Morpho oracle using oracle factory (alternative to Forge)
  - `extractOracleAddress.ts`: Extract oracle addresses from factory deployments
  - `extractForgeAddresses.ts`: Extract all contract addresses from Forge deployment artifacts
  - `testMorphoSDK.ts`: Validate Morpho Blue SDK functionality and compare with manual RPC calls
- **Debugging Tools** (`temp/`): Collection of scripts for market analysis, balance checking, and troubleshooting
- **Address Management**: Utilities to sync with `config/addresses.ts`
- **SDK Integration**: Morpho Blue SDK validation and migration analysis

#### 3. Frontend Setup Page (`frontend/src/app/setup/`)
- **WalletCard**: Connection status, network validation, ETH balance, quick links
- **TokenFaucetCard**: Token selection, balance display, minting with cooldown tracking
- **OracleCard**: Current price display, custom price setting, preset adjustments (+/-5%, +/-20%, crash/recovery)
- **SandboxMarketCard**: Market configuration display, creation status, utilization initialization
- **Web3 Integration**: Wagmi + Viem setup with Eden Testnet support

#### 4. Infrastructure
- **Address Book**: Typed configuration with Morpho Eden Testnet addresses from official docs
- **Environment Templates**: `.env.example` files for both ops and frontend
- **Navigation**: Clean UI with wallet connection and page routing
- **Error Handling**: Toast notifications and transaction status tracking

### 🎯 Acceptance Criteria Met

- ✅ Faucet tokens deployable and mintable via UI with balance updates
- ✅ Settable aggregator deployed with price control via UI presets
- ✅ Morpho oracle buildable via factory (transaction-based, address extraction needed)
- ✅ Sandbox market creatable with configurable parameters
- ✅ Utilization initialization script for immediate APY visibility
- ✅ `config/addresses.ts` automatically updated by deployment scripts
- ✅ Complete runbook in README for end-to-end M0 execution

## 🏗️ Project Structure

```
├── contracts/           # Foundry smart contracts
│   ├── src/
│   │   ├── FaucetERC20.sol
│   │   └── SettableAggregator.sol
│   └── foundry.toml
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── setup/   # Setup & mocks page
│   │   │   └── page.tsx # Home page
│   │   └── components/
│   │       ├── setup/   # Setup page components
│   │       └── providers/
│   └── package.json
├── ops/               # TypeScript debugging & utility scripts
│   ├── scripts/       # Utility and debugging scripts
│   │   ├── testMorphoSDK.ts      # SDK validation
│   │   ├── extractForgeAddresses.ts  # Address extraction
│   │   └── temp/      # Debugging utilities
│   ├── lib/          # Shared utilities
│   ├── MORPHO-SDK-ANALYSIS.md    # SDK migration guide
│   └── package.json
```

## 🔧 Technical Stack

### Smart Contracts
- **Foundry**: Solidity development environment
- **OpenZeppelin**: Battle-tested contract libraries
- **Morpho Blue v1.1**: Core lending protocol on Eden Testnet

### Frontend
- **Next.js 15**: React framework with App Router
- **Viem + Wagmi**: Ethereum interaction libraries
- **Morpho Blue SDK**: Official SDK for type-safe Morpho integration (`@morpho-org/blue-sdk@4.11.0`)
- **TailwindCSS**: Utility-first styling
- **React Hot Toast**: User notifications

### Operations
- **TypeScript**: Debugging utilities and on-chain analysis
- **Viem**: Ethereum client for contract interactions
- **Morpho Blue SDK**: SDK validation and testing utilities
- **Bot Simulation System**: Autonomous agents for realistic market activity
- **Node.js 20**: Runtime environment

## ✨ Key Features

### 🤖 Bot Simulation System
Autonomous agents that simulate realistic market activity for continuous testing and demonstration. Includes lenders, borrowers, vault users, oracle changers, and liquidators with auto-refill mechanisms and market rebalancing.

📖 See [`ops/README.md`](ops/README.md) for complete bot system documentation.

### 📊 Number Formatting
Custom utility for displaying large numbers in a human-readable format with:
- Thousand separators (1,000,000)
- Smart abbreviations (1.5k, 2.3M, 1.2B)
- Consistent formatting across all components

📖 See [`frontend/README.md`](frontend/README.md) for frontend architecture and utilities.

### 🚀 Vercel Deployment
Production-ready deployment strategy using webpack aliases to handle contract artifacts:
- Copies only essential files (~10) to committed `frontend/vercel/` folder
- Keeps `contracts/out/` gitignored (1000+ files)
- Works seamlessly in both development and production environments

📖 See [`frontend/README.md`](frontend/README.md#vercel-deployment) for deployment guide.

## 📖 Morpho Integration

This demo integrates with Morpho's infrastructure on Eden Testnet:

- **Morpho Blue Core**: `0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd`
- **MetaMorpho Factory v1.1**: `0xb007ca4AD41874640F9458bF3B5e427c31Be7766`
- **IRM Mock**: `0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92`

*Source: [Eden Testnet Documentation](https://docs.celestia.org/eden/testnet) | [View on Blockscout](https://eden-testnet.blockscout.com)*

**Note**: Eden Testnet uses mock contracts for IRM (Interest Rate Model) and oracles for educational purposes. For production deployments, use audited IRM implementations.

## 🔧 SDK Integration

This project includes comprehensive **Morpho Blue SDK** integration:

### SDK Validation
```bash
# Test SDK functionality (Note: SDK testing script references Sepolia for validation)
cd ops
npm run test:morpho-sdk
```

### Key Features
- **Type-safe market parameter creation** with automatic ID generation
- **Verified data consistency** between SDK and manual RPC calls
- **Performance optimization** with no significant overhead
- **Migration guide** available in `ops/MORPHO-SDK-ANALYSIS.md`

### SDK Packages Used
- `@morpho-org/blue-sdk@4.11.0` - Core Morpho Blue SDK
- `@morpho-org/morpho-ts@2.4.2` - Additional Morpho utilities

The SDK provides significant advantages over manual RPC calls including type safety, automatic market ID calculation, and reduced boilerplate code. See the complete analysis in `ops/MORPHO-SDK-ANALYSIS.md`.

## 📋 Milestone M1: "Simple Morpho Integration"

**Status: ✅ COMPLETED**

This milestone implements a complete frontend for interacting with MetaMorpho v1.1 vaults on Eden Testnet.

### ✅ Deliverables Completed

#### 1. Vault Deployment Infrastructure (`contracts/script/`)
- **DeployVault.s.sol**: Complete Forge script for MetaMorpho vault deployment
- **Role Management**: Automated setup of Owner, Curator, Allocator roles
- **Simplified Deployment**: Core vault creation only (configuration via frontend)
- **Environment Integration**: Uses addresses from `update-env-from-artifacts.sh`

#### 2. Frontend Vault Interface (`frontend/src/app/vaults/`)
- **Vault Overview**: Real-time vault metrics, governance info, and status
- **Performance Dashboard**: APY calculation, share price tracking, and performance metrics
- **Allocation Strategy**: Market allocation breakdown and queue visualization
- **Transaction Interface**: Deposit/withdraw flows with approval handling
- **Vault Administration**: Owner-only panel for supply caps, queue management, and reallocation
- **Educational Content**: Timing expectations, yield mechanics, and MetaMorpho behavior explanation

#### 3. Data Layer (`frontend/src/hooks/`)
- **useVaultData**: Complete vault state management with real-time updates
- **useVaultAPY**: Weighted APY calculation based on market allocations
- **useVaultAllocation**: Market allocation tracking and queue management
- **useMarketData**: Underlying market metrics and utilization rates
- **useSupplyCap**: Supply cap monitoring and pending cap tracking
- **useTokenBalance/useTokenAllowance**: ERC20 token interaction helpers

#### 4. Integration Features
- **Morpho SDK Integration**: Official ABIs from `@morpho-org/blue-sdk-viem`
- **Real-time Updates**: Automatic data refresh with configurable intervals
- **Transaction Handling**: Complete approve/deposit/withdraw flows with status tracking
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

### 🎯 Key Features Implemented

1. **ERC-4626 Vault Interface**
   - Deposit fakeUSD tokens to receive vault shares
   - Withdraw vault shares to receive underlying assets
   - Real-time share price calculation and display
   - Preview functionality for deposit/withdraw amounts

2. **Yield Optimization Display**
   - Weighted APY calculation across allocated markets
   - Market utilization and supply rate tracking
   - Allocation strategy visualization
   - Performance metrics and timing expectations

3. **Risk Management Visualization**
   - Supply caps and utilization limits
   - Queue-based withdrawal mechanics
   - Governance role transparency
   - Market risk profile display

4. **Developer Experience**
   - Automatic address loading from Forge deployment artifacts
   - Type-safe contract interactions with official Morpho ABIs
   - Comprehensive error handling and loading states
   - Educational content for hackathon participants

### 🔧 Technical Implementation

- **Smart Contracts**: Foundry-based deployment with MetaMorpho factory integration
- **Frontend**: Next.js 15 with React Query for state management
- **Web3 Integration**: Wagmi + Viem for Ethereum interactions
- **Type Safety**: Full TypeScript implementation with Morpho SDK types
- **Real-time Data**: Configurable polling intervals for live updates

### 🚀 Usage Instructions

1. **Deploy Vault** (requires valid private key):
   ```bash
   cd contracts
   forge script script/DeployVault.s.sol --rpc-url $RPC_URL --broadcast --verify
   ./update-env-from-artifacts.sh  # Auto-populate VAULT_ADDRESS
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Configure Vault** (owner-only, required for first use):
   - Connect wallet to Eden Testnet (must be the deployer account)
   - Navigate to `/vaults` page
   - **Expand "Vault Administration"** panel (purple header)
   - **Set Supply Cap**: Enter desired cap (e.g., 1000000) and click "Submit Cap" → "Accept Cap"
   - **Add Market to Supply Queue**: Click to enable the market for deposits
   - **Verify Configuration**: Check that supply cap shows in Vault Overview

4. **Use Vault Interface**:
   - **Get Test Tokens**: Visit `/setup` page to mint fakeUSD if needed
   - **Deposit**: Use Vault Actions → Deposit tab (auto-allocated to markets)
   - **Monitor Performance**: Watch real-time APY and allocation
   - **Withdraw**: Use Vault Actions → Withdraw tab to redeem shares

### 🔄 What's New in M1

The M1 milestone adds complete MetaMorpho vault functionality to the existing M0 sandbox:

#### New Deployment Script
- **`DeployVault.s.sol`**: Deploys MetaMorpho v1.1 vault using environment variables
- **Automatic Role Setup**: Owner, Curator, Allocator roles assigned to deployer
- **No Hardcoded Addresses**: Uses environment variables populated by `update-env-from-artifacts.sh`

#### New Frontend Route
- **`/vaults` page**: Complete vault interface for deposit/withdraw operations
- **Real-time APY**: Weighted APY calculation based on market allocations
- **Share Price Tracking**: Live ERC-4626 share price updates
- **Transaction Flows**: Approve/deposit/withdraw with status tracking

#### Enhanced Address Management
- **Automatic Detection**: Frontend loads vault address from Forge deployment artifacts
- **Artifact-First Approach**: No hardcoded fallbacks - ensures deployment consistency
- **Factory Contract Support**: Handles CREATE2 deployments from MetaMorpho factory
- **Type Safety**: Full TypeScript integration with Morpho SDK ABIs

The M0 sandbox (tokens, oracle, market) remains unchanged and is required for M1 vault functionality.

## 🔧 Vault Configuration Guide

### 📋 Post-Deployment Setup (Required)

After deploying the vault, you **must configure it** before users can deposit:

#### **Step 1: Set Supply Cap**
```
1. Connect deployer wallet to frontend
2. Navigate to /vaults page
3. Expand "Vault Administration" (purple panel)
4. In "Supply Cap Management":
   - Enter desired cap (e.g., 1000000 for 1M fakeUSD)
   - Click "Submit Cap"
   - Click "Accept Cap" (available immediately since timelock = 0)
```

#### **Step 2: Add Market to Supply Queue**
```
1. In "Supply Queue Management":
   - Click "Add Market to Supply Queue"
   - This enables the market for automatic deposit allocation
```

#### **Step 3: Verify Configuration**
```
1. Check Vault Overview shows "Supply Cap: 1,000,000 fakeUSD" (green)
2. Admin panel should show "Portfolio Auto-Allocated" status
3. Allocation Strategy should show the market in Supply Queue
```

### 🎯 Understanding MetaMorpho Auto-Allocation

**Key Insight**: MetaMorpho vaults **automatically allocate deposits** to markets in the supply queue.

#### **When Deposits Auto-Allocate:**
- ✅ Market is in `supplyQueue`
- ✅ Market has `supplyCap > 0`
- ✅ Deposit amount ≤ remaining cap space
- ✅ Market is healthy (no reverts)

#### **When Manual Reallocation is Needed:**
- 🔄 **Strategy changes**: Moving funds between different markets
- 🔄 **Preparing for withdrawals**: Moving funds from markets to idle
- 🔄 **Risk management**: Adjusting exposure across markets
- 🔄 **Queue is empty**: No markets configured for auto-allocation

#### **Common Issues:**
- **"AllCapsReached" error**: Supply cap too low or not set
- **"0% APY"**: Market has no borrowers (normal in testing)
- **Funds not allocating**: Market not in supply queue

### 🛠️ Troubleshooting

#### **Issue: Deposits Fail with "AllCapsReached"**
```bash
# Check supply cap
cd contracts && source .env
cast call 0x0b26B391e53cB5360A29c3c7Cb5904Cf3f3C3705 "config(bytes32)" "0x0761d379cc7d1212f71ad42bba304a80f1250baa0ad7a615a2501ac5f0e6ccb5" --rpc-url $RPC_URL

# Solution: Increase supply cap via frontend admin panel
```

#### **Issue: 0% APY Despite Deposits**
```bash
# Check market utilization
cd contracts && source .env
cast call $MORPHO_BLUE_CORE "market(bytes32)" "0x0761d379cc7d1212f71ad42bba304a80f1250baa0ad7a615a2501ac5f0e6ccb5" --rpc-url $RPC_URL

# If no borrowers: APY will be 0% (normal in testing)
# Solution: Create borrow activity or wait for organic usage
```

#### **Issue: Frontend Shows Incorrect Data**
```bash
# Verify actual vault state
cd ops
npx tsx scripts/verifyVaultState.ts

# Check browser console for hook debugging logs
```

## 🚧 Next Steps (Future Milestones)

### M2: Custom Vault Implementation
- Deploy custom ERC-4626 vault
- Direct integration with Morpho Blue markets
- Advanced allocation strategies

### M3: Production Readiness
- Security hardening and timelocks
- Comprehensive testing suite
- Mainnet deployment guide

## 📄 License

Apache-2.0

## 🍴 Forking This Repository

### 📋 For Hackathon Developers

This repository is designed to be **fork-friendly** for hackathon participants:

#### **Quick Fork Setup:**
```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/vaults-example.git
cd vaults-example

# 3. Set up environment
cd contracts
cp env.example .env
# Edit .env with your PRIVATE_KEY and RPC_URL
# Note: ETHERSCAN_API_KEY is optional for Eden Testnet

cd ../frontend
cp env.example .env.local
# Edit .env.local if needed (optional - defaults work for Eden)

# 4. Deploy your own contracts
cd ../contracts
source .env
    forge script script/DeployTokens.s.sol \
      --rpc-url eden \
      --broadcast \
      --verify \
      --verifier blockscout \
      --verifier-url 'https://eden-testnet.blockscout.com/api/'
    ./update-env-from-artifacts.sh
    # ... continue with DeployOracleMock, CreateMarket, DeployVault, MintTokens, and InitializeUtilization
    # See contracts/README-SCRIPTS.md for full sequence

# 5. Configure your vault via frontend
cd ../frontend
npm run dev
# Follow vault configuration steps above
```

#### **Customization Options:**
- **Vault Parameters**: Change name, symbol, timelock in `DeployVault.s.sol`
- **Supply Caps**: Adjust via frontend admin panel
- **Market Selection**: Modify `getMarketParams()` in `contracts.ts` to use different markets
- **Frontend Styling**: Customize Tailwind CSS components
- **Polling Intervals**: Adjust refresh rates in hook files

### 📚 Key Files to Understand:
- **`contracts/script/DeployVault.s.sol`**: Vault deployment logic
- **`frontend/src/lib/contracts.ts`**: Address management and market configuration
- **`frontend/src/hooks/`**: Data fetching and state management
- **`frontend/src/components/vaults/`**: UI components for vault interaction

## 🤝 Contributing

This project is built for educational purposes and hackathon use. Feel free to fork, modify, and extend for your own Morpho integrations.

For questions or support, refer to the [Morpho Documentation](https://docs.morpho.org) or join the [Morpho Discord](https://discord.morpho.org/).
