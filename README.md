# Morpho Vaults v1.1 Demo (Sepolia)

A comprehensive demonstration of building yield-bearing products using **Morpho Vaults v1.1** as the yield engine on **Sepolia** testnet. This repository includes both smart contracts and a frontend application to showcase how to integrate with Morpho's infrastructure.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x (see `.nvmrc`)
- npm
- Foundry (for smart contracts)
- Sepolia testnet ETH

### Environment Setup

1. **Forge Scripts** (for contract deployment):
   ```bash
   cd contracts
   cp env.example .env
   # Edit .env with your RPC_URL, PRIVATE_KEY, and ETHERSCAN_API_KEY
   forge install
   ```

2. **Frontend** (for the demo UI):
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local with optional custom RPC URL
   npm install
   ```

### Running the Demo

1. **Deploy Contracts** (using Forge scripts):
   ```bash
   cd contracts
   # Deploy all contracts in sequence with automatic verification
   forge script script/DeployTokens.s.sol --rpc-url $RPC_URL --broadcast --verify
   ./update-env-from-artifacts.sh  # Auto-populate addresses
   
   forge script script/DeployAggregator.s.sol --rpc-url $RPC_URL --broadcast --verify
   ./update-env-from-artifacts.sh  # Auto-populate addresses
   
   forge script script/DeployOracle.s.sol --rpc-url $RPC_URL --broadcast --verify
   ./update-env-from-artifacts.sh  # Auto-populate addresses
   
   forge script script/CreateMarket.s.sol --rpc-url $RPC_URL --broadcast --verify
   forge script script/MintTokens.s.sol --rpc-url $RPC_URL --broadcast
   forge script script/InitializeUtilization.s.sol --rpc-url $RPC_URL --broadcast
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   
   The frontend automatically loads contract addresses from Forge deployment artifacts in `contracts/broadcast/`. No manual configuration needed!

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
- **TypeScript Environment**: Debugging utilities and on-chain analysis tools
- **Utility Scripts**:
  - `buildOracle.ts`: Create Morpho oracle using Chainlink factory (alternative to Forge)
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
- **Morpho Blue v1.1**: Core lending protocol on Sepolia

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
- **Node.js 20**: Runtime environment

## 📖 Morpho Integration

This demo integrates with Morpho's infrastructure on Sepolia:

- **Morpho Blue Core**: `0xd011EE229E7459ba1ddd22631eF7bF528d424A14`
- **MetaMorpho Factory v1.1**: `0x98CbFE4053ad6778E0E3435943aC821f565D0b03`
- **Oracle V2 Factory**: `0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD`
- **Adaptive Curve IRM**: `0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c`
- **Public Allocator**: `0xfd32fA2ca22c76dD6E550706Ad913FC6CE91c75D`

*Source: [Morpho Addresses](https://docs.morpho.org/get-started/resources/addresses?utm_source=chatgpt.com), [IRM on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c#code)*

## 🔧 SDK Integration

This project includes comprehensive **Morpho Blue SDK** integration:

### SDK Validation
```bash
# Test SDK functionality on Sepolia
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
