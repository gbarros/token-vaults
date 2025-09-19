# Milestone M0: Setting the Stage - Status Report

## Overview
This milestone focused on building a sandbox environment for a Morpho Vaults v1.1 demo on Sepolia testnet. The goal was to create faucet tokens, a steerable oracle, and a sandbox Morpho Blue market with initialized utilization.

## ✅ Completed Components

### 1. Project Structure
- **Monorepo setup**: `contracts/`, `frontend/`, `ops/` directories
- **Environment templates**: `.env.example` files
- **Modern Address Management**: Forge broadcast artifacts system (replaces manual config)
- **License**: Apache 2.0
- **Frontend**: Next.js app with TypeScript, Tailwind, app router, ESLint, Morpho SDK integration
- **Contracts**: Foundry project with Solidity 0.8.24

### 2. Smart Contracts Deployed

#### FaucetERC20 Tokens (Current Deployment)
- **fakeUSD**: `0x1b909218c474807550209a7e83875289004ae969`
- **fakeTIA**: `0xb4a6e570425295856e688323befe9529aac84688`
- Features: Mint function with cooldown (24h) and max per call (100 tokens)
- OpenZeppelin ERC20 + Ownable implementation

#### SettableAggregator (Mock Chainlink Oracle)
- **Address**: `0xc0337076098567e1f3d4637c63383cbfe3a50b73`
- **Purpose**: Chainlink `AggregatorV3Interface` compatible oracle for price manipulation
- **Decimals**: 8 decimals
- **Features**: `setAnswer()` function for demo price control

#### OracleFromAggregator (Custom Oracle)
- **Address**: `0xbd10202762e1a5a56cec413c59265da14396fa5c`
- **Critical Fix**: Scales prices to **36 decimals** (not 18) for Morpho Blue compatibility
- **Max Staleness**: 3600 seconds (1 hour)
- **Key Learning**: Morpho Blue uses `ORACLE_PRICE_SCALE = 1e36` in health calculations

### 3. Morpho Blue Market
- **Market ID**: `0xea92e61142cd5cffe448fc20f12bc9a8686b6ced67829651d7563e277bea118d`
- **Loan Token**: fakeUSD
- **Collateral Token**: fakeTIA  
- **Oracle**: Custom OracleFromAggregator (36-decimal scaling)
- **IRM**: Adaptive Curve IRM (`0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c`)
- **LLTV**: 86% (860000000000000000 wei)
- **Status**: ✅ Created and functional

### 4. Market Utilization
- **Liquidity Supplied**: 100 fakeUSD
- **Collateral Supplied**: 50 fakeTIA
- **Amount Borrowed**: 60 fakeUSD
- **Utilization Rate**: ~60%
- **Status**: ✅ Active borrowing and lending

## 🔧 Technical Discoveries & Fixes

### Critical Oracle Scaling Issue
**Problem**: Initial oracle implementation scaled prices to 18 decimals, causing "insufficient collateral" errors even with massive overcollateralization.

**Root Cause**: Morpho Blue's health check in `src/Morpho.sol` line 535:
```solidity
uint256 maxBorrow = uint256(position[id][borrower].collateral)
    .mulDivDown(collateralPrice, ORACLE_PRICE_SCALE)  // ORACLE_PRICE_SCALE = 1e36
    .wMulDown(marketParams.lltv);
```

**Solution**: Updated `OracleFromAggregator.sol` to scale to 36 decimals:
```solidity
// Scale to 36 decimals (Morpho Blue ORACLE_PRICE_SCALE)
if (aggregatorDecimals < 36) {
    return rawPrice * (10 ** (36 - aggregatorDecimals));
}
```

**Result**: Borrowing now works perfectly. Test borrowed 0.0001 USD successfully.

### Migration to Modern Architecture
**Evolution**: Migrated from manual address management to automated Forge broadcast artifacts system.

**Changes Made**: 
- Replaced `config/addresses.ts` with `frontend/src/lib/contracts.ts` that reads from Forge artifacts
- Migrated TypeScript deployment scripts to Forge scripts for better reliability
- Integrated Morpho SDK for type-safe contract interactions
- Eliminated manual address extraction and management

## 📁 Key Files & Configurations

### Contract Artifacts
- `contracts/out/FaucetERC20.sol/FaucetERC20.json`
- `contracts/out/SettableAggregator.sol/SettableAggregator.json`  
- `contracts/out/OracleFromAggregator.sol/OracleFromAggregator.json`

### Deployment Scripts (Forge-based)
**Primary Deployment (contracts/script/):**
- `DeployTokens.s.sol` - Deploy faucet ERC20 tokens ✅
- `DeployAggregator.s.sol` - Deploy settable price aggregator ✅
- `DeployOracle.s.sol` - Deploy custom oracle with 36-decimal scaling ✅
- `CreateMarket.s.sol` - Create Morpho Blue market ✅
- `InitializeUtilization.s.sol` - Initialize market with liquidity and borrowing
- `MintTokens.s.sol` - Mint tokens for testing
- `TestBorrowing.s.sol` - Test borrowing functionality
- `UpdateAggregatorPrice.s.sol` - Update oracle prices

**Legacy TypeScript Scripts (ops/scripts/) - DEPRECATED:**
- `buildOracle.ts`, `extractOracleAddress.ts`, `extractForgeAddresses.ts` - Replaced by Forge scripts
- `testMorphoSDK.ts` - Still useful for SDK validation

### Modern Address Management (`frontend/src/lib/contracts.ts`)
**Replaces manual config files - reads directly from Forge broadcast artifacts:**

```typescript
// Automatically loads from contracts/broadcast/*/11155111/run-latest.json
export const contracts = {
  tokens: {
    fakeUSD: "0x1b909218c474807550209a7e83875289004ae969", // From DeployTokens artifact
    fakeTIA: "0xb4a6e570425295856e688323befe9529aac84688", // From DeployTokens artifact
  },
  oracles: {
    aggregator: {
      pair: "fakeTIA/fakeUSD",
      address: "0xc0337076098567e1f3d4637c63383cbfe3a50b73", // From DeployAggregator artifact
    },
    builtOracle: "0xbd10202762e1a5a56cec413c59265da14396fa5c", // From DeployOracle artifact
  },
  morpho: {
    morphoBlueCore: "0xd011EE229E7459ba1ddd22631eF7bF528d424A14",
    adaptiveCurveIRM: "0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c",
    // ... other Morpho Sepolia addresses
  },
  markets: {
    sandbox: {
      // Market ID calculated from MarketParams via Morpho SDK
      loanToken: "0x1b909218c474807550209a7e83875289004ae969",
      collateralToken: "0xb4a6e570425295856e688323befe9529aac84688",
      oracle: "0xbd10202762e1a5a56cec413c59265da14396fa5c",
      lltv: "860000000000000000",
    }
  }
}
```

## 🧪 Test Results

### Successful Tests
1. **Token Deployment**: ✅ Both fakeUSD and fakeTIA deployed and mintable
2. **Aggregator**: ✅ Price setting and reading functional
3. **Oracle**: ✅ 36-decimal price scaling working correctly
4. **Market Creation**: ✅ Morpho Blue market created successfully
5. **Borrowing**: ✅ Successfully borrowed 60 USD + additional 0.0001 USD in tests
6. **Utilization**: ✅ Market initialized with ~60% utilization

### Key Test Transactions
- Market Creation: `0x8365834c5bc16499b92edc9c5802ec6381df45715efa7e3cfabc4c72a5526522`
- Initial Borrow: `0x46399b0446797f4d091fec26d3284d092443fa42e680b7106cd916a8828b0073`
- Final Test Borrow: `0x0325541aba6c2a4e55b8adbfdf1f4d4423ad0a9fa533a604f5ee442adccdc071`

## 🚧 Current Status & Remaining Work

### 1. ✅ Completed Infrastructure
- **Smart Contracts**: All core contracts deployed and functional
- **Address Management**: Modern Forge broadcast artifacts system implemented
- **Frontend Integration**: Setup page exists with automatic address loading
- **SDK Integration**: Morpho Blue SDK integrated for type-safe interactions

### 2. 🔄 Deployment Status
- **Tokens**: ✅ Deployed via Forge scripts
- **Oracle Infrastructure**: ✅ Deployed via Forge scripts  
- **Market Creation**: ✅ Market created via Forge scripts
- **Market Utilization**: ⚠️ Needs verification - InitializeUtilization.s.sol available but status unclear

### 3. 🧹 Cleanup Completed
- **Legacy Scripts**: TypeScript deployment scripts converted to deprecation notices
- **Stale Code**: Removed redundant ABIs and address management utilities
- **Modern Architecture**: Fully migrated to Forge + SDK approach

## 🎯 Next Steps for M1 (Vault Development)

1. **Verify Market Utilization** - Confirm InitializeUtilization.s.sol has been run successfully
2. **Deploy MetaMorpho Vault** - Use MetaMorpho factory to create vault for the sandbox market
3. **Test Frontend Integration** - Verify setup page works with current deployment artifacts
4. **Vault Role Assignment** - Set up Owner, Curator, Allocator, Guardian roles
5. **Documentation Update** - Create M0 → M1 transition guide

## 💡 Key Learnings for Future Milestones

1. **Oracle Compatibility**: Always check the expected decimal scaling for target protocols
2. **Module Resolution**: TypeScript + dynamic imports work better than static imports in mixed environments
3. **Market ID Calculation**: Use `encodeAbiParameters` for structs, not `encodePacked`
4. **Debugging Strategy**: Source code examination was crucial for finding the oracle scaling issue
5. **Address Management**: Centralized address book with proper compilation is essential

## 🔗 Useful Resources

- **Morpho Blue Core**: `0xd011EE229E7459ba1ddd22631eF7bF528d424A14`
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Oracle Price Scale**: `ORACLE_PRICE_SCALE = 1e36` (from `src/libraries/ConstantsLib.sol`)
- **Market Explorer**: Use market ID to check state on Morpho's interface

This milestone successfully created a functional sandbox environment with working borrowing/lending, setting the foundation for vault development in subsequent milestones.
