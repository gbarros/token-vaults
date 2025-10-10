# Morpho Vaults Knowledge Base

**For students, hackers, and developers building with Morpho Blue and MetaMorpho**

This document consolidates critical learnings, pitfalls, and solutions discovered while building a production-ready Morpho vaults demo on Eden Testnet. Use this as a quick reference when things don't work as expected.

---

## Table of Contents

1. [Critical Concepts](#critical-concepts)
2. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
3. [Morpho Blue SDK Patterns](#morpho-blue-sdk-patterns)
4. [Development Workflow](#development-workflow)
5. [Frontend Integration](#frontend-integration)
6. [Debugging Techniques](#debugging-techniques)
7. [Quick Reference Commands](#quick-reference-commands)

---

## Critical Concepts

### MetaMorpho Vault Architecture

#### Supply Queue vs Withdraw Queue ⚠️ CRITICAL

MetaMorpho vaults have **TWO SEPARATE QUEUES** - this is the #1 source of confusion and deposit failures:

**Supply Queue** (for deposits):
- Markets where the vault can **deposit** user funds
- **MUST be explicitly set** via `setSupplyQueue()`
- If empty: `maxDeposit()` returns 0, all deposits fail with `AllCapsReached`
- Check: `cast call $VAULT "supplyQueueLength()(uint256)" --rpc-url eden`

**Withdraw Queue** (for withdrawals):
- Markets where the vault can **withdraw** funds from
- Automatically populated by `submitCap()` + `acceptCap()`
- Required for withdrawals to work
- Check: `cast call $VAULT "withdrawQueueLength()(uint256)" --rpc-url eden`

**Common Mistake**:
```solidity
// ❌ WRONG - This only adds to withdraw queue
vaultContract.submitCap(marketParams, supplyCap);
vaultContract.acceptCap(marketParams);
// Deposits still fail because supply queue is empty!

// ✅ CORRECT - Must also set supply queue
Id[] memory supplyQueue = new Id[](1);
supplyQueue[0] = marketParams.id();
vaultContract.setSupplyQueue(supplyQueue);  // NOW deposits work!
```

#### Supply Cap Flow

Setting supply caps is a multi-step process:

```solidity
// Step 1: Submit cap (adds to withdraw queue)
vaultContract.submitCap(marketParams, supplyCap);

// Step 2: Wait for timelock (0 for testnets)
// ...

// Step 3: Accept cap (activates the cap)
vaultContract.acceptCap(marketParams);

// Step 4: Set supply queue (enables deposits) ⚠️ OFTEN FORGOTTEN
Id[] memory queue = new Id[](1);
queue[0] = marketParams.id();
vaultContract.setSupplyQueue(queue);
```

**Verification**:
```bash
# Check if cap is set (withdraw queue)
cast call $VAULT "config(bytes32)((uint184,bool,uint64))" $MARKET_ID --rpc-url eden
# Should return: (non-zero cap, true, ...)

# Check if deposits are enabled (supply queue)
cast call $VAULT "supplyQueueLength()(uint256)" --rpc-url eden
# Should return: > 0
```

### Morpho Blue Virtual Shares

Morpho Blue multiplies all shares by `10^6` (1,000,000x) internally to prevent donation attacks.

**Impact**:
- `totalSupplyShares` = `totalSupplyAssets * 10^6`
- `totalBorrowShares` = `totalBorrowAssets * 10^6`
- Market appears to have 1,000,000:1 shares-to-assets ratio
- External contracts (like IRM Mock) may not handle this correctly

**Symptoms**:
- APRs showing 0.00% despite market activity
- `borrowRateView()` reverting with StackOverflow
- Abnormal shares/assets ratios in market data

**Solutions**:
- Use Morpho SDK (handles virtual shares automatically)
- For custom calculations, always divide shares by `10^6`
- For IRMs: Use AdaptiveCurveIRM or ensure mock IRMs handle large numbers
- Reset market if ratio is corrupted: `forge script script/ResetMarket.s.sol`

---

## Common Pitfalls & Solutions

### 1. Deposits Failing (AllCapsReached) 🚨

**Symptoms**:
- Deposit transactions revert with `AllCapsReached` error
- `maxDeposit(user)` returns 0
- Frontend shows "deposits disabled" or similar

**Root Causes** (in order of likelihood):
1. **Empty supply queue** (90% of cases) - most common!
2. Supply cap reached (all markets full)
3. Supply cap not accepted (pending)
4. Market not created in Morpho Blue

**Diagnosis**:
```bash
# Quick check - if this returns 0, supply queue is empty
cast call $VAULT_ADDRESS "supplyQueueLength()(uint256)" --rpc-url eden

# Check max deposit for a user
cast call $VAULT_ADDRESS "maxDeposit(address)(uint256)" 0x... --rpc-url eden

# If maxDeposit is 0, check withdraw queue (should have markets)
cast call $VAULT_ADDRESS "withdrawQueueLength()(uint256)" --rpc-url eden
```

**Solution** (Empty Supply Queue):
```bash
# Option 1: Use the helper script
forge script script/SetSupplyQueue.s.sol --rpc-url eden --broadcast

# Option 2: Manual fix
cd contracts && source .env
MARKET_ID=$(cast call $VAULT_ADDRESS "withdrawQueue(uint256)(bytes32)" 0 --rpc-url $RPC_URL)
cast send $VAULT_ADDRESS "setSupplyQueue(bytes32[])" "[$MARKET_ID]" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

**Prevention**:
Use the updated `DeployVault.s.sol` script which automatically calls `setSupplyQueue()`.

### 2. APRs Showing 0.00% 📉

**Symptoms**:
- Frontend displays 0% for all interest rates
- Market has activity but no yield calculation
- Console shows "Could not calculate APYs"

**Root Causes**:
1. **IRM Mock incompatibility** with Morpho SDK (most common)
2. Abnormal shares/assets ratio (1,000,000:1 instead of 1:1)
3. Market not initialized (zero supply/borrow)
4. Virtual shares causing overflow in IRM calculations

**Diagnosis**:
```bash
# Check market state
cast call $MORPHO_BLUE "market(bytes32)" $MARKET_ID --rpc-url eden

# Check shares/assets ratio
# totalSupplyShares should be ≈ totalSupplyAssets * 10^6
# If the ratio is off, market needs reset
```

**Solutions**:

**A. IRM Mock Issue** (Eden Testnet):
- The Morpho SDK assumes AdaptiveCurveIRM and cannot calculate rates for simple mocks
- IRM Mock contracts work fine for operations, but SDK can't compute APYs
- Solution: Accept that APYs won't display, or deploy AdaptiveCurveIRM

**B. Abnormal Ratio**:
```bash
# Reset the market to fix corrupted shares/assets ratio
forge script script/ResetMarket.s.sol --rpc-url eden --broadcast

# Reinitialize with proper amounts
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast
```

**C. Insufficient Initialization**:
```bash
# Mint tokens first
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# Initialize with sufficient amounts (2000 fakeUSD + 1500 fakeTIA)
forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast
```

**Prevention**:
- Initialize markets with sufficient amounts (>= 100 tokens)
- Use scenarios 1-2 in InitializeUtilizationImproved.s.sol
- Avoid tiny initialization amounts that cause rounding issues

### 3. IRM Stack Overflow 💥

**Symptoms**:
- `borrowRateView()` reverts with `StackOverflow` error
- Frontend can't fetch interest rates
- Direct IRM calls work, but when combined with virtual shares fail

**Root Cause**:
- IRM Mock doesn't handle Morpho Blue's virtual shares (10^6 multiplier)
- The 1,000,000x scaled numbers cause arithmetic overflow
- Morpho SDK's internal calculations fail when using IRM Mocks

**Evidence**:
```bash
# Direct IRM call works (with normal numbers)
cast call $IRM_ADDRESS "borrowRateView(...)" \
  "(100e18,100e18,60e18,60e18,...)" --rpc-url eden
# ✅ Returns valid rate

# IRM call with virtual shares fails
cast call $IRM_ADDRESS "borrowRateView(...)" \
  "(100e18,100e24,60e18,60e24,...)" --rpc-url eden
# ❌ StackOverflow
```

**Solutions**:
1. **Deploy AdaptiveCurveIRM** (recommended for production)
2. **Use manual rate calculations** (bypass SDK)
3. **Accept limitation** for demos (show "N/A" for rates)

**SDK Limitation**:
The Morpho Blue SDK hardcodes IRM behavior and never calls the IRM contract directly. It only works with AdaptiveCurveIRM. This is by design, not a bug.

### 4. CORS/RPC Issues in Frontend 🌐

**Symptoms**:
- Browser console shows CORS errors
- Contract reads fail with "blocked by CORS policy"
- MetaMask connected but reads don't work

**Root Cause**:
When MetaMask is connected, wagmi's `useReadContract` uses MetaMask's provider, which calls Eden RPC directly from the browser, triggering CORS policies.

**Solution - RPC Proxy**:

Create a Next.js API route that proxies RPC calls server-side:

```typescript
// frontend/src/app/api/rpc/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  const response = await fetch(process.env.RPC_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return new Response(await response.text(), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Then create a custom hook:

```typescript
// frontend/src/hooks/useProxyReadContract.ts
import { createPublicClient, http } from 'viem';

const proxyClient = createPublicClient({
  chain: edenTestnet,
  transport: http('/api/rpc'), // Use proxy instead of direct RPC
});

export function useProxyReadContract(config) {
  return useQuery({
    queryKey: ['proxyRead', config],
    queryFn: () => proxyClient.readContract(config),
  });
}
```

**Why This Works**:
```
Before: Browser → wagmi → MetaMask → Eden RPC ❌ CORS
After:  Browser → useProxyReadContract → /api/rpc → Eden RPC ✅ No CORS
```

### 5. LLTV Not Enabled ⚖️

**Symptoms**:
- Market creation fails with "LLTV not enabled"
- Transaction reverts during `CreateMarket.s.sol`

**Root Cause**:
Morpho Blue only allows whitelisted LLTV (Liquidation Loan-to-Value) values. Each network has a specific set of enabled LLTVs.

**Check Enabled LLTVs**:
```bash
cast call $MORPHO_BLUE "isLltvEnabled(uint256)(bool)" 800000000000000000 --rpc-url eden
# Should return: true
```

**Eden Testnet LLTVs**:
- 80% = `800000000000000000` (0.8e18) ✅
- 90% = `900000000000000000` (0.9e18) ✅

**Solution**:
Use one of the enabled LLTVs in your `.env`:
```bash
LLTV=800000000000000000  # 80%
```

### 6. Insufficient Token Balance 💰

**Symptoms**:
- "Insufficient loan token balance" during market initialization
- Transactions fail even after minting tokens

**Root Cause**:
Fresh deployments start with 0 balance. The old `MintTokens` script minted small amounts insufficient for all operations.

**Solution**:
```bash
# Mint sufficient tokens (2000 fakeUSD + 1500 fakeTIA)
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# Can be called multiple times if more tokens are needed
```

**Updated Amounts**:
- fakeUSD: 2000 (covers initialization scenarios 0-3)
- fakeTIA: 1500 (sufficient collateral for all scenarios)

### 7. Factory Contract Verification 🔍

**Symptoms**:
- Vault contract shows as "unverified" on Blockscout
- Manual verification attempts fail
- Factory deployment doesn't auto-verify child contracts

**Root Cause**:
Factory-deployed contracts (CREATE2) require manual verification with exact constructor arguments.

**Solution for MetaMorpho Vaults**:
```bash
# 1. Get vault address from deployment logs
VAULT_ADDRESS=0x...

# 2. Prepare constructor args
OWNER=0x...
TIMELOCK=0
ASSET=0x...
NAME="Morpho Demo Vault"
SYMBOL="mdUSD"

# 3. Encode constructor args
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,uint256,address,string,string)" \
  $OWNER $TIMELOCK $ASSET "$NAME" "$SYMBOL")

# 4. Verify
forge verify-contract $VAULT_ADDRESS \
  lib/metamorpho-v1.1/src/MetaMorphoV1_1.sol:MetaMorphoV1_1 \
  --rpc-url eden \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/' \
  --constructor-args $CONSTRUCTOR_ARGS \
  --compiler-version "v0.8.26+commit.8a97fa7a" \
  --num-of-optimizations 999999
```

**Note**: Blockscout often auto-verifies factory contracts as "Similar Match", which is sufficient for most use cases.

---

## Morpho Blue SDK Patterns

### When to Use the SDK

**✅ Use SDK For:**
- Market/Position calculations (APY, utilization, health factor)
- Type-safe market parameter creation (`MarketParams`)
- Standardized data structures and interfaces
- Conversion calculations (shares ↔ assets)
- SDK automatically handles virtual shares

**❌ Don't Use SDK For:**
- IRM Mock contracts (SDK assumes AdaptiveCurveIRM)
- Custom oracle implementations
- Non-standard market configurations
- When you need direct IRM contract calls

### SDK Usage Examples

**Creating Market Parameters**:
```typescript
import { MarketParams } from '@morpho-org/blue-sdk';

const marketParams = new MarketParams({
  loanToken: '0x...',
  collateralToken: '0x...',
  oracle: '0x...',
  irm: '0x...',
  lltv: 800000000000000000n,  // 80%
});

// Automatically generates correct market ID
const marketId = marketParams.id;  // Property, not method!
```

**Market Calculations**:
```typescript
import { Market } from '@morpho-org/blue-sdk';

// Create Market instance with real data
const market = new Market({
  params: marketParams,
  totalSupplyAssets: marketData.totalSupplyAssets,
  totalSupplyShares: marketData.totalSupplyShares,  // SDK handles virtual shares
  totalBorrowAssets: marketData.totalBorrowAssets,
  totalBorrowShares: marketData.totalBorrowShares,
  lastUpdate: marketData.lastUpdate,
  fee: marketData.fee,
  price: oraclePrice,  // Must include oracle price!
});

// Access as properties, NOT methods
const utilization = market.utilization;  // BigInt in wei
const supplyApy = market.supplyApy;      // BigInt in wei (percentage * 1e18)
const borrowApy = market.borrowApy;      // BigInt in wei
const liquidity = market.liquidity;      // BigInt
```

**Position Health Calculations**:
```typescript
import { Position } from '@morpho-org/blue-sdk';

const position = new Position({
  user: userAddress,
  marketId: marketParams.id,
  supplyShares: positionData.supplyShares,
  borrowShares: positionData.borrowShares,
  collateral: positionData.collateral,
});

// Calculate health and risk
const isHealthy = market.isHealthy(position);
const healthFactor = market.getHealthFactor(position);
const liquidationPrice = market.getLiquidationPrice(position);
const maxBorrow = market.getMaxBorrowAssets(position.collateral);
```

### SDK Gotchas

1. **Properties vs Methods**: 
   - Use `market.supplyApy`, NOT `market.supplyApy()`
   - SDK properties are getters, not functions

2. **Always Include Oracle Price**:
   ```typescript
   // ❌ Wrong - missing price
   const market = new Market({ params, ...marketData });
   
   // ✅ Correct - includes price
   const market = new Market({ params, ...marketData, price: oraclePrice });
   ```

3. **Virtual Shares Handled Automatically**:
   - Don't divide shares by 10^6 when using SDK
   - SDK does this internally

4. **SDK Returns BigInt in Wei**:
   ```typescript
   const supplyApy = market.supplyApy;  // e.g., 50000000000000000n
   const percentage = Number(supplyApy) / 1e18 * 100;  // 5%
   ```

---

## Development Workflow

### Deployment Order (Critical)

Follow this exact sequence:

```bash
# 1. Deploy tokens
forge script script/DeployTokens.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'

# 2. Auto-populate addresses
./update-env-from-artifacts.sh

# 3. Deploy oracle (mock for testnets)
INITIAL_ORACLE_PRICE=5000 forge script script/DeployOracleMock.s.sol \
  --rpc-url eden \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url 'https://eden-testnet.blockscout.com/api/'

# 4. Auto-populate oracle address
./update-env-from-artifacts.sh

# 5. Create market
forge script script/CreateMarket.s.sol --rpc-url eden --broadcast

# 6. Deploy vault (auto-configures supply queue)
forge script script/DeployVault.s.sol --rpc-url eden --broadcast

# 7. Auto-populate vault address
./update-env-from-artifacts.sh

# 8. Mint tokens (REQUIRED before initialization)
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# 9. Initialize market with utilization
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast
```

### Post-Deployment Verification Checklist

Run these checks after deployment:

```bash
cd contracts && source .env

# ✅ 1. Verify supply queue is configured
cast call $VAULT_ADDRESS "supplyQueueLength()(uint256)" --rpc-url $RPC_URL
# Expected: 1 or more

# ✅ 2. Verify deposits are enabled
cast call $VAULT_ADDRESS "maxDeposit(address)(uint256)" $DEPLOYER_ADDRESS --rpc-url $RPC_URL
# Expected: > 0 (large number = unlimited)

# ✅ 3. Verify market has liquidity
cast call $MORPHO_BLUE_CORE "market(bytes32)" $MARKET_ID --rpc-url $RPC_URL
# Expected: non-zero totalSupplyAssets and totalBorrowAssets

# ✅ 4. Verify supply cap is set
cast call $VAULT_ADDRESS "config(bytes32)" $MARKET_ID --rpc-url $RPC_URL
# Expected: (non-zero cap, true, ...)

# ✅ 5. Test deposit simulation
cast call $VAULT_ADDRESS "previewDeposit(uint256)(uint256)" 1000000000000000000 --rpc-url $RPC_URL
# Expected: > 0 shares returned
```

### Debugging with Cast

Cast commands are **much faster** than TypeScript for investigations:

```bash
# Load environment variables
cd contracts && source .env

# Quick checks
cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $RPC_URL
cast call $VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $RPC_URL
cast call $MORPHO_BLUE_CORE "market(bytes32)" $MARKET_ID --rpc-url $RPC_URL

# Decode error from failed transaction
cast run $FAILED_TX_HASH --rpc-url $RPC_URL

# Get receipt with status
cast receipt $TX_HASH --rpc-url $RPC_URL | grep -E "(status|gasUsed)"

# Check transaction input data
cast tx $TX_HASH --rpc-url $RPC_URL | grep "input"
```

**Why Cast is Better for Debugging**:
- No TypeScript compilation needed
- All ABIs available in `contracts/lib/`
- Results in seconds vs minutes
- Direct access to Foundry cheatcodes
- Works with `source .env` for addresses

### Environment Variable Management

**REQUIRED** (set manually in `contracts/.env`):
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=https://ev-reth-eden-testnet.binarybuilders.services:8545
```

**AUTO-POPULATED** (via `./update-env-from-artifacts.sh`):
```bash
LOAN_TOKEN=        # From DeployTokens.s.sol
COLLATERAL_TOKEN=  # From DeployTokens.s.sol
ORACLE_ADDRESS=    # From DeployOracleMock.s.sol
VAULT_ADDRESS=     # From DeployVault.s.sol
```

**CONSTANTS** (pre-configured for Eden):
```bash
MORPHO_BLUE_CORE=0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd
METAMORPHO_FACTORY=0xb007ca4AD41874640F9458bF3B5e427c31Be7766
IRM_ADDRESS=0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92
LLTV=800000000000000000  # 80%
```

**Never manually set** addresses that come from deployments - let the script populate them automatically.

---

## Frontend Integration

### Network Switching

Always validate network before operations:

```typescript
import { useChainId, useSwitchChain } from 'wagmi';
import { edenTestnet } from '@/lib/wagmi';

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  if (chainId !== edenTestnet.id) {
    return (
      <div className="text-red-600">
        Wrong network! Please switch to Eden Testnet.
        <button onClick={() => switchChain({ chainId: edenTestnet.id })}>
          Switch Network
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
}
```

### Contract Read Patterns

**Use wagmi's useReadContract for data fetching**:

```typescript
import { useReadContract } from 'wagmi';
import { metaMorphoAbi } from '@morpho-org/blue-sdk-viem';

export function useVaultData() {
  const { data, isLoading, error } = useReadContract({
    address: vaults.metaMorphoDemo.address,
    abi: metaMorphoAbi,
    functionName: 'totalAssets',
    query: {
      refetchInterval: 30000,  // 30s for vault data
      staleTime: 15000,         // Consider fresh for 15s
    },
  });
  
  return { data, isLoading, error };
}
```

**Optimize with shared hooks**:

```typescript
// Create base hooks for common data
export function useMarketDataRaw() {
  return useReadContract({
    address: contracts.morpho.morphoBlueCore,
    abi: morphoBlueAbi,
    functionName: 'market',
    args: [marketId],
    // ... config
  });
}

// Reuse in multiple hooks
export function useMarketAPY() {
  const { data: marketData } = useMarketDataRaw();  // Shared read
  const { data: oraclePrice } = useOraclePrice();   // Shared read
  
  // Calculate APY using SDK...
}

export function useMarketUtilization() {
  const { data: marketData } = useMarketDataRaw();  // Same shared read
  
  // Calculate utilization...
}
```

### Error Handling & Validation

**Check preconditions before allowing actions**:

```typescript
export function VaultDeposit() {
  const { address } = useAccount();
  const maxDeposit = useReadContract({
    abi: metaMorphoAbi,
    functionName: 'maxDeposit',
    args: [address],
  });
  
  const canDeposit = maxDeposit.data && maxDeposit.data > 0n;
  
  if (!canDeposit) {
    return (
      <div className="text-red-600">
        ⚠️ Vault cannot accept deposits
        <br />
        Supply queue may be empty or all caps reached.
        <br />
        <a href="/docs">Learn how to fix</a>
      </div>
    );
  }
  
  // Show deposit form...
}
```

**Decode custom errors**:

```typescript
import { decodeErrorResult } from 'viem';

try {
  await writeContract(config);
} catch (error: any) {
  if (error.data) {
    try {
      const decoded = decodeErrorResult({
        abi: metaMorphoAbi,
        data: error.data,
      });
      
      if (decoded.errorName === 'AllCapsReached') {
        toast.error('Vault is full. All market caps reached.');
      } else if (decoded.errorName === 'ERC20InsufficientAllowance') {
        toast.error('Please approve tokens first.');
      }
    } catch {
      toast.error('Transaction failed: ' + error.message);
    }
  }
}
```

### State Management Best Practices

**Centralize configuration**:

```typescript
// lib/contracts.ts - Single source of truth
export const contracts = {
  morpho: {
    morphoBlueCore: process.env.NEXT_PUBLIC_MORPHO_BLUE_CORE,
    metaMorphoFactory: process.env.NEXT_PUBLIC_METAMORPHO_FACTORY,
  },
  markets: {
    sandbox: {
      id: process.env.NEXT_PUBLIC_MARKET_ID,
      loanToken: process.env.NEXT_PUBLIC_LOAN_TOKEN,
      collateralToken: process.env.NEXT_PUBLIC_COLLATERAL_TOKEN,
      oracle: process.env.NEXT_PUBLIC_ORACLE_ADDRESS,
      irm: process.env.NEXT_PUBLIC_IRM_ADDRESS,
      lltv: BigInt(process.env.NEXT_PUBLIC_LLTV || '800000000000000000'),
    },
  },
  vaults: {
    metaMorphoDemo: {
      address: process.env.NEXT_PUBLIC_VAULT_ADDRESS,
      name: 'Morpho Demo Vault',
      symbol: 'mdUSD',
    },
  },
};
```

**Optimal refetch intervals**:
- Balances: 10s (users care about immediate updates)
- Market data: 30s (changes gradually)
- Vault metrics: 30s (changes gradually)
- Static data (caps, roles): 60s or manual refetch

---

## Debugging Techniques

### Investigation Methodology

When something doesn't work, follow this systematic approach:

1. **Check the transaction** (if available):
   ```bash
   cast receipt $TX_HASH --rpc-url eden | grep status
   cast run $TX_HASH --rpc-url eden  # Decode revert reason
   ```

2. **Check maxDeposit/maxWithdraw**:
   ```bash
   cast call $VAULT "maxDeposit(address)(uint256)" $USER --rpc-url eden
   cast call $VAULT "maxWithdraw(address)(uint256)" $USER --rpc-url eden
   ```

3. **Check supply queue**:
   ```bash
   cast call $VAULT "supplyQueueLength()(uint256)" --rpc-url eden
   ```

4. **Check market state**:
   ```bash
   cast call $MORPHO_BLUE "market(bytes32)" $MARKET_ID --rpc-url eden
   ```

5. **Check balances**:
   ```bash
   cast call $TOKEN "balanceOf(address)(uint256)" $USER --rpc-url eden
   cast call $TOKEN "allowance(address,address)(uint256)" $USER $VAULT --rpc-url eden
   ```

### Creating Investigation Scripts

For complex issues, create TypeScript investigation scripts in `ops/scripts/temp/`:

```typescript
// ops/scripts/temp_investigate_issue.ts
import { createPublicClient, http } from 'viem';
import { edenTestnet } from '../lib/env';

const client = createPublicClient({
  chain: edenTestnet,
  transport: http(process.env.RPC_URL),
});

async function investigate() {
  console.log('🔍 Investigating vault issue...\n');
  
  // 1. Check vault state
  const maxDeposit = await client.readContract({
    address: vaultAddress,
    abi: metaMorphoAbi,
    functionName: 'maxDeposit',
    args: [userAddress],
  });
  
  console.log(`Max Deposit: ${formatEther(maxDeposit)}`);
  
  // 2. Check supply queue
  const queueLength = await client.readContract({
    address: vaultAddress,
    abi: metaMorphoAbi,
    functionName: 'supplyQueueLength',
  });
  
  console.log(`Supply Queue Length: ${queueLength}`);
  
  // 3. If queue is empty, that's the issue!
  if (queueLength === 0n) {
    console.log('\n❌ ISSUE FOUND: Supply queue is empty!');
    console.log('Fix: Run SetSupplyQueue.s.sol script');
  }
}

investigate().catch(console.error);
```

### Common Error Codes

**Morpho Errors**:
- `0xe5f408a5` = `NoPendingValue()` - trying to accept non-existent pending value
- `0x6dfcc650` = `SafeCastOverflowedUintDowncast` - number too large for type
- (Custom error) `AllCapsReached` - vault supply queue exhausted

**ERC20 Errors**:
- `ERC20InsufficientAllowance` - need to approve first
- `ERC20InsufficientBalance` - user doesn't have enough tokens

**ERC4626 Errors**:
- `ERC4626ExceededMaxDeposit` - trying to deposit more than maxDeposit
- `ERC4626DepositFailed` - generic deposit failure

**Decode errors**:
```bash
# Get error selector
cast 4byte 0xe5f408a5

# Or use cast run to decode automatically
cast run $FAILED_TX_HASH --rpc-url eden
```

---

## Quick Reference Commands

### Vault Health Checks

```bash
cd contracts && source .env

# Essential checks (run these first)
cast call $VAULT_ADDRESS "supplyQueueLength()(uint256)" --rpc-url $RPC_URL
cast call $VAULT_ADDRESS "maxDeposit(address)(uint256)" $USER_ADDRESS --rpc-url $RPC_URL
cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $RPC_URL

# Supply cap check
MARKET_ID=$(cast call $VAULT_ADDRESS "withdrawQueue(uint256)(bytes32)" 0 --rpc-url $RPC_URL)
cast call $VAULT_ADDRESS "config(bytes32)((uint184,bool,uint64))" $MARKET_ID --rpc-url $RPC_URL

# Market health check
cast call $MORPHO_BLUE_CORE "market(bytes32)" $MARKET_ID --rpc-url $RPC_URL
```

### Emergency Fixes

```bash
# Fix empty supply queue
forge script script/SetSupplyQueue.s.sol --rpc-url eden --broadcast

# Reset corrupted market
forge script script/ResetMarket.s.sol --rpc-url eden --broadcast

# Reinitialize market
INIT_SCENARIO=1 forge script script/InitializeUtilizationImproved.s.sol --rpc-url eden --broadcast

# Mint more tokens
forge script script/MintTokens.s.sol --rpc-url eden --broadcast

# Accept pending cap
forge script script/AcceptCap.s.sol --rpc-url eden --broadcast
```

### One-Line Diagnostics

```bash
# Is vault healthy?
[ $(cast call $VAULT_ADDRESS "supplyQueueLength()(uint256)" --rpc-url $RPC_URL) -gt 0 ] && echo "✅ Supply queue OK" || echo "❌ Supply queue EMPTY"

# Can user deposit?
[ $(cast call $VAULT_ADDRESS "maxDeposit(address)(uint256)" $USER_ADDRESS --rpc-url $RPC_URL) -gt 0 ] && echo "✅ Deposits enabled" || echo "❌ Deposits disabled"

# Is market initialized?
SUPPLY=$(cast call $MORPHO_BLUE_CORE "market(bytes32)" $MARKET_ID --rpc-url $RPC_URL | head -1)
[ "$SUPPLY" != "0" ] && echo "✅ Market has liquidity" || echo "❌ Market empty"
```

### Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Morpho aliases
alias morpho-check-vault='cast call $VAULT_ADDRESS "supplyQueueLength()(uint256)" --rpc-url $RPC_URL && cast call $VAULT_ADDRESS "maxDeposit(address)(uint256)" $USER_ADDRESS --rpc-url $RPC_URL'

alias morpho-fix-queue='forge script script/SetSupplyQueue.s.sol --rpc-url eden --broadcast'

alias morpho-mint='forge script script/MintTokens.s.sol --rpc-url eden --broadcast'

alias morpho-env='cd contracts && source .env'
```

---

## Additional Resources

### Official Documentation
- **Morpho Docs**: https://docs.morpho.org
- **Morpho Blue**: https://github.com/morpho-org/morpho-blue
- **MetaMorpho v1.1**: https://github.com/morpho-org/metamorpho-v1.1
- **Morpho Blue SDK**: https://www.npmjs.com/package/@morpho-org/blue-sdk
- **Morpho Blue SDK Viem**: https://www.npmjs.com/package/@morpho-org/blue-sdk-viem

### Eden Testnet
- **Chain ID**: 3735928814
- **RPC**: https://ev-reth-eden-testnet.binarybuilders.services:8545
- **Explorer**: https://eden-testnet.blockscout.com
- **Faucet**: https://ev-faucet-eden-testnet.binarybuilders.services
- **Powered by**: Celestia (https://celestia.org)

### Deployed Morpho Contracts (Eden Testnet)
- **Morpho Blue Core**: `0xe3F8380851ee3A0BBcedDD0bCDe92d423812C1Cd`
- **MetaMorpho Factory**: `0xb007ca4AD41874640F9458bF3B5e427c31Be7766`
- **IRM Mock**: `0x9F16Bf4ef111fC4cE7A75F9aB3a3e20CD9754c92`

### Project READMEs
- **Root README**: Project overview and setup
- **contracts/README-SCRIPTS.md**: Complete script reference
- **frontend/README.md**: Frontend setup and development
- **ops/README.md**: Operations tools documentation

---

## Contributing

Found an issue or have a tip to add? This knowledge base is meant to evolve as more developers use Morpho. 

Key learnings from this project:
1. MetaMorpho's two-queue system is unintuitive and causes 90% of deposit issues
2. Virtual shares (10^6 multiplier) break naive IRM implementations
3. Morpho SDK doesn't work with IRM Mocks (by design)
4. Cast commands are 10x faster than TypeScript for debugging
5. Supply queue configuration is separate from cap acceptance
6. Factory-deployed contracts need manual verification
7. Eden Testnet provides a great Celestia-powered environment for testing

---

**Document Version**: 1.0  
**Last Updated**: October 10, 2025  
**Network**: Celestia Eden Testnet  
**Morpho Version**: Morpho Blue + MetaMorpho v1.1

