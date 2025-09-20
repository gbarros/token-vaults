# M1 Summary – Simple Morpho Integration

## Overview
Milestone M1 delivers a working Sepolia demo that lets users deposit into a MetaMorpho v1.1 vault and observe basic vault metrics through the new `/vaults` page. The implementation follows the guidance in `plan.md` and `m1.instructions.md`, emphasizing educational UX and reuse of Morpho tooling over custom Solidity.

## Deployment Snapshot
- **Vault**: `0x0b26B391e53cB5360A29c3c7Cb5904Cf3f3C3705` (from `contracts/broadcast/DeployVault.s.sol/11155111/run-latest.json`)
- **Factory**: `0x98CbFE4053ad6778E0E3435943aC821f565D0b03`
- **Asset**: fakeUSD (first FaucetERC20 deployment in `DeployTokens.s.sol` artifacts)
- **Roles**: Script sets owner/curator/allocator to the deployer; guardian remains unset
- **Timelock**: `0` (demo convenience)
- **Supply Caps**: Not configured on deployment; the vault ships with the default `0` cap until owner submits/accepts one via UI or script

Deployment requires populating `METAMORPHO_FACTORY`, `LOAN_TOKEN`, and other addresses in `contracts/.env` before running `forge script script/DeployVault.s.sol --broadcast`.

## Frontend Implementation
- New `/vaults` route gated on wallet connection (`frontend/src/app/vaults/page.tsx`);
  when disconnected, users see a connect prompt referencing Sepolia.
- Five vault components (`frontend/src/components/vaults/`):
  - `VaultOverview`: contract metadata, fee, cap status, governance addresses (linked via `AddressLink`).
  - `VaultPerformance`: share-price calculation, current APY readout, metric tiles, and a placeholder chart.
  - `VaultActions`: approve / deposit / redeem flows with allowance tracking, share preview, and toasts.
  - `VaultAllocation`: queue placeholders and simulated allocation percentages (see known gaps).
  - `VaultAdmin`: owner-only accordions for supply-cap submission/acceptance, queue updates, and `reallocate` (uses `type(uint256).max`).
- Navigation now includes a Vaults tab, and UI copy surfaces the “What moves APY?” timing table from `plan.md`.

## Data Layer & SDK Usage
- Seven React Query hooks under `frontend/src/hooks/` (`useVaultData`, `useVaultAPY`, `useVaultAllocation`, `useSupplyCap`, `useMarketData`, `useTokenBalance`, `useTokenAllowance`) keep contract reads isolated and cache-aware.
- Contract ABIs come from `@morpho-org/blue-sdk-viem` (`frontend/src/lib/abis.ts`), avoiding bespoke JSON.
- `frontend/src/lib/contracts.ts` loads addresses from Forge broadcasts, including the CREATE2 vault address exposed via `additionalContracts`.
- Share price and APY are calculated client-side: `useVaultAPY` weights the (currently single) sandbox market’s APY; idle assets contribute 0%.

## Known Gaps & Risk Notes
- **Allocation data**: `useVaultAllocation` assumes 80% of assets are allocated to the sandbox market and only reads the first queue entry; no onchain loop over full queues yet.
- **Supply cap defaults**: Because deployment leaves caps at 0, deposits will revert until the owner submits/accepts a cap (UI provides helpers but requires the owner wallet).
- **Last update timestamp**: `useVaultData` populates `lastUpdate` with `Date.now()` as a fallback; it does not yet call the vault’s `lastTotalAssets` snapshot.
- **Share-price history**: UI reserves space for a chart but no historical sampling buffer is stored.
- **SDK fetchers**: Current hooks rely on manual `readContract` batches; migrating to helpers like `fetchVault` / `fetchVaultUser` would reduce boilerplate once prioritized.

## Next Steps
1. Replace simulated allocation logic with real queue iteration (loop over `supplyQueueLength()` / `withdrawQueueLength()`), and surface Morpho market balances directly.
2. Persist share-price snapshots (React Query or lightweight storage) so the APY panel can show realized yield over time.
3. Call the vault’s accrual/last update fields instead of using a timestamp fallback.
4. Wrap deployment/admin scripts into the README runbook so contributors can reproduce the full flow without spelunking artifacts.
5. Continue toward M2 goals: ops scripts for role management, multi-market coverage, and allocator automation.

## Meta References
- `plan.md:191` — Page 1 charter and UX expectations for the MetaMorpho vault walkthrough.
- `m1.instructions.md:1` — Detailed implementation playbook covering prerequisites, frontend build-out, and transaction flows.
- `README.md:5` — Repo quick start with environment setup, deployment sequence, and frontend launch steps.
- `contracts/README-SCRIPTS.md:7` — Forge script catalog plus broadcast-driven environment automation notes.
- `frontend/src/lib/contracts.ts:171` — Artifact-driven address loader (including vault CREATE2 detection) consumed across the app.
- `frontend/src/lib/abis.ts:1` — Centralized imports of official Morpho SDK ABIs reused by hooks and components.
