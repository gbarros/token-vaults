# Morpho Vaults v1.1 Demo (Sepolia)

A comprehensive demonstration of building yield-bearing products using **Morpho Vaults v1.1** as the yield engine on **Sepolia** testnet. This repository includes both smart contracts and a frontend application to showcase how to integrate with Morpho's infrastructure.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x (see `.nvmrc`)
- npm
- Foundry (for smart contracts)
- Sepolia testnet ETH

### Environment Setup

1. **Ops Scripts** (for contract deployment):
   ```bash
   cd ops
   cp .env.example .env
   # Edit .env with your RPC_URL and PRIVATE_KEY
   npm install
   ```

2. **Frontend** (for the demo UI):
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local with optional custom RPC URL
   npm install
   ```

### Running the Demo

1. **Deploy Contracts** (in order):
   ```bash
   cd ops
   npm run ops:deploy:tokens      # Deploy faucet tokens
   npm run ops:deploy:aggregator  # Deploy price aggregator
   npm run ops:build:oracle       # Build Morpho oracle
   npm run ops:create:market      # Create sandbox market
   npm run ops:init:util          # Initialize market utilization
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Demo**:
   - Open http://localhost:3000
   - Connect your wallet (Sepolia testnet)
   - Visit `/setup` to interact with the sandbox

## 📋 Milestone M0: "Setting the Stage"

**Status: ✅ COMPLETED**

This milestone provides the sandbox infrastructure needed to demo Morpho vault flows without production risk.

### ✅ Deliverables Completed

#### 1. Smart Contracts (`contracts/`)
- **FaucetERC20.sol**: ERC20 token with public faucet, cooldown mechanism, and configurable limits
- **SettableAggregator.sol**: Chainlink-compatible price aggregator for testing oracle functionality
- **Foundry Setup**: Complete build environment with OpenZeppelin dependencies

#### 2. Operations Scripts (`ops/`)
- **TypeScript Environment**: Full TS project with viem, dotenv, and deployment helpers
- **Deployment Scripts**:
  - `deployTokens.ts`: Deploy fakeUSD and fakeTIA tokens
  - `deployAggregator.ts`: Deploy and initialize price aggregator
  - `buildOracle.ts`: Create Morpho oracle using Chainlink factory
  - `createSandboxMarket.ts`: Create Morpho Blue market with demo parameters
  - `initUtilization.ts`: Supply liquidity and create borrowing to establish ~60% utilization
- **Address Management**: Automatic updates to `config/addresses.ts` after deployments

#### 3. Frontend Setup Page (`frontend/src/app/setup/`)
- **WalletCard**: Connection status, network validation, ETH balance, quick links
- **TokenFaucetCard**: Token selection, balance display, minting with cooldown tracking
- **OracleCard**: Current price display, custom price setting, preset adjustments (+/-5%, +/-20%, crash/recovery)
- **SandboxMarketCard**: Market configuration display, creation status, utilization initialization
- **Web3 Integration**: Wagmi + Viem setup with Sepolia testnet support

#### 4. Infrastructure
- **Address Book**: Typed configuration with Morpho Sepolia addresses from official docs
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
├── ops/               # TypeScript deployment scripts
│   ├── scripts/       # Deployment scripts
│   ├── lib/          # Shared utilities
│   └── package.json
├── config/           # Shared configuration
│   └── addresses.ts  # Typed address book
└── packages/         # Shared packages
    └── abi/         # Contract ABIs
```

## 🔧 Technical Stack

### Smart Contracts
- **Foundry**: Solidity development environment
- **OpenZeppelin**: Battle-tested contract libraries
- **Morpho Blue v1.1**: Core lending protocol on Sepolia

### Frontend
- **Next.js 15**: React framework with App Router
- **Viem + Wagmi**: Ethereum interaction libraries
- **TailwindCSS**: Utility-first styling
- **React Hot Toast**: User notifications

### Operations
- **TypeScript**: Type-safe deployment scripts
- **Viem**: Ethereum client for contract interactions
- **Node.js 20**: Runtime environment

## 📖 Morpho Integration

This demo integrates with Morpho's infrastructure on Sepolia:

- **Morpho Blue Core**: `0xd011EE229E7459ba1ddd22631eF7bF528d424A14`
- **MetaMorpho Factory v1.1**: `0x98CbFE4053ad6778E0E3435943aC821f565D0b03`
- **Oracle V2 Factory**: `0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD`
- **Adaptive Curve IRM**: `0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c`
- **Public Allocator**: `0xfd32fA2ca22c76dD6E550706Ad913FC6CE91c75D`

*Source: [Morpho Addresses](https://docs.morpho.org/get-started/resources/addresses?utm_source=chatgpt.com), [IRM on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c#code)*

## 🚧 Next Steps (Future Milestones)

### M1: Simple Morpho Integration
- Use existing MetaMorpho vaults for yield
- ERC-4626 deposit/withdraw flows
- APY display and vault metrics

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

## 🤝 Contributing

This project is built for educational purposes and hackathon use. Feel free to fork, modify, and extend for your own Morpho integrations.

For questions or support, refer to the [Morpho Documentation](https://docs.morpho.org) or join the [Morpho Discord](https://discord.morpho.org/).
