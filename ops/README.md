# Ops - Debugging & Utility Scripts

> **Note**: Primary deployment is now handled by Forge scripts in `/contracts/script/`. This directory contains debugging utilities and specialized tools.

## 🛠️ Available Scripts

### Core Utilities
- **`buildOracle.ts`** - Build oracle using Morpho's ChainlinkOracleV2Factory (alternative to self-deployed)
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

**Primary deployments**: Use Forge scripts in `/contracts/script/`  
**Debugging & utilities**: Use TypeScript scripts in this directory
