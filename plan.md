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

### Implementation Stack (tentative)

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

## 3. What Morpho Offers on Sepolia

* **Morpho Blue Core** deployed on Sepolia.
* Note: On Sepolia, we will deploy our own oracle contracts instead of using a `MorphoChainlinkOracleV2Factory`.
* MetaMorpho v1.1 factory availability on Sepolia is not assumed; Page 2 focuses on Option B (direct to Morpho Blue).
* **Public Allocator** and **Pre-Liquidation Factory**.
* **Addresses are published** on [docs.morpho.org](https://docs.morpho.org/addresses).

---

## 4. Demo Architecture

1. **Create a Morpho Market (optional)**

   * Loan asset: mock ERC20 (USDC on Sepolia).
   * Collateral: mock WETH.
   * Oracle: Chainlink price feed from factory.
   * Configure LLTV, IRM.

2. **Deploy a MetaMorpho v1.1 Vault**

   * Use the Factory.
   * Set `timelock = 0` for hackathon speed.
   * Give it a name & symbol (mutable in v1.1).

3. **Assign Roles**

   * **Owner:** multisig or EOA.
   * **Curator:** configures markets, caps, queues.
   * **Allocator:** executes `reallocate`.
   * **Guardian:** can pause in emergencies.

4. **Enable Market & Set Caps**

   * Curator enables your market.
   * Configure `supplyCap` and `withdrawQueue`.
   * Publish these params for participants.

5. **Allocate Liquidity**

   * Allocator uses `reallocate()` to push funds to markets.
   * Can run a simple bot to rebalance daily.

6. **Frontend UX (ERC-4626)**

   * Deposit, withdraw, and show APY.
   * Use Morpho SDK or viem scripts.

   **APY display (minimal approach):**

   * Compute realized APY from ERC‑4626 share price delta over time (sampled periodically in the UI).
   * Note zero‑deposit edge case (no change until initial seed deposit or first allocation).
   * Optionally show underlying market supply APY as a reference.

   **UX states to surface:**

   * Vault paused; cap reached; withdraw queue length > 1; insufficient liquidity.
   * Provide simple guidance per state (disable actions, show explanation, suggest next steps).

---

## 4.5 Demo Tracks (Multi‑Page)

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

## 5. Code Snippets (Minimal)

### User Deposit/Withdraw (TS + viem)

```ts
import { createWalletClient, http, parseUnits } from "viem";
import { sepolia } from "viem/chains";

const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

await wallet.writeContract({
  address: TOKEN,
  abi: erc20,
  functionName: "approve",
  args: [VAULT, parseUnits("100", 18)]
});

await wallet.writeContract({
  address: VAULT,
  abi: erc4626,
  functionName: "deposit",
  args: [parseUnits("100", 18), account.address]
});
```

### Allocator Reallocate (TS + viem)

```ts
await allocator.writeContract({
  address: VAULT,
  abi: vaultAbi,
  functionName: "reallocate",
  args: [[{ market: MARKET, assets: parseUnits("50", 18) }]]
});
```

---

## 6. Safety & Hackathon Notes

* **Small caps** to avoid draining testnet liquidity.
* **Timelock=0** only for hackathon; highlight production best practices.
* **Inflation protection:** seed vault with a small initial deposit before opening to users.
* **Risk disclosure:** show utilization, APY volatility, and underlying market data.

**Emergency playbook (stub):**

* Pause the vault if needed; tighten caps/queues to limit flows.
* Halt allocator/bot actions; revoke or rotate allocator role if necessary.
* Provide a safe exit checklist for participants (communicate, unwind positions where applicable).

---

## 7. Optional Enhancements

* **Use OnchainKit Earn Component** (Base Sepolia)

  * Prebuilt UI for Morpho vaults.
  * Possible gas sponsorship.
* **Rewards Display:** integrate Merkl reward claims.
* **Monitoring Dashboard:** simple chart of total assets, allocations, APY.
* **Custom Vault Demo:** dedicated second page showing how to build & deploy a vault that extends Morpho yield logic.

---

## 8. Milestones & Next Steps

**Milestones (acceptance criteria)**

* **M0:** Setting the Stage (Setup & Mocks Page)
  * Faucet tokens live; balances + totalSupply visible; mint via UI works.
  * Chainlink‑compatible aggregator deployed; self‑deployed oracle contract wired to it (no factory on Sepolia); price controllable in UI with presets.
  * Sandbox market ready: either deployed via UI (or script) using our tokens + oracle + IRM, and seeded to target utilization via an "Initialize utilization" action.
  * Address book (`config/addresses.ts`) populated; `.env.example` ready; all sources linked.
* **M1:** Page 1 live on Sepolia (deposit/withdraw + APY view working against a MetaMorpho v1.1 vault or our sandbox vault).
* **M2:** Ops scripts runnable on Sepolia (roles assigned, caps set, `reallocate` succeeds with visible effect).
* **M3:** Page 2 prototype implementing **Option B (Custom vault → Morpho Blue)** with minimal but working flow.

* [ ] Collect Sepolia addresses from Morpho docs.
* [ ] Deploy a toy market (or use an existing test market).
* [ ] Prefer: deploy a sandbox market (own tokens, oracle, IRM) from UI or script.
* [ ] Deploy MetaMorpho vault via factory.
* [ ] Script role assignment, cap setup, reallocation.
* [ ] Build minimal front-end (deposit/withdraw + APY display).
* [ ] Create second-page demo with custom vault (**Option B: direct to Morpho Blue**).
* [ ] Publish guide + GitHub repo for hackers to fork.
* [x] Scaffold repo directories: `contracts/`, `frontend/`, `ops/`.
* [x] Create a basic `forge` project gitignore file in `contracts/`.
* [ ] Add `.env.example` (RPC, keys) and `config/addresses.ts` placeholders.
* [ ] Verify Sepolia addresses against docs; record source links.
* [ ] Add Apache‑2.0 LICENSE file.

---

## 9. Setup & Mocks Page (Testnet UX)

**Purpose:** Provide a single place to mint test assets, inspect balances/supply, and steer oracle prices to simulate market dynamics.

### Components (Sandbox-first)

* **Test Tokens**

  * `fakeUSD` (18 decimals) – ERC20 with faucet `mint(address to, uint256 amount)` gated by a simple rate-limit.
  * `fakeTIA` (18 decimals) – ERC20 with the same faucet.
  * UI: show **symbol, decimals, totalSupply, faucet status**, and **addresses**.

* **Faucet Panel**

  * Connect wallet → choose token → input amount → `mint()`.
  * Rate-limit per address per 60s; max faucet mint per call.
  * Display user balances for both tokens.

* **Oracle Controls (Chainlink-compatible)**

  * Deploy a **Settable Aggregator** (implements `AggregatorV3Interface`) per pair we need (e.g., `fakeTIA/fakeUSD`).
  * Expose UI to **set price**, **roundId**, and **updatedAt\`** (sanity checks) → emits a new round.
  * Wire the aggregator into a **self-deployed Oracle contract** that reads from the Settable Aggregator and exposes the interface required by Morpho Blue on Sepolia (since the factory is not available).
  * UI shows current on-chain **answer** and last update time; add buttons for common scenarios (±5%, ±20%, crash, recovery).

* **Sandbox Market**

  * Option A (default): **Deploy a sandbox market** using our faucet tokens + built oracle + selected IRM/LLTV. Parameters are defined in the UI with sensible demo defaults; minimal guardrails only.
  * Option B: Select an existing test market from the address book.
  * Provide an **Initialize Utilization** action: small scripted supply+borrow to reach a target utilization quickly for visible APY.
  * Read **LLTV**, **IRM params**, **utilization**, **supply/borrow rates**; helper to compute example health factors under current price.

### Frontend Blocks

* Wallet card (connected address, network, ETH balance)
* Token tables (symbol, totalSupply, your balance, faucet button)
* Oracle card (current price, update controls)
* Market metrics (utilization, rates, caps)

### Routes & Ops Console

* Routes: `/setup`, `/morphoVaults`, `/advancedVaults`.
* Ops Console page: components per role. Human-like roles (Owner/Curator/Guardian) expose guarded buttons for actions; bot-like roles expose a param form and a "Run" button to keep a background loop alive while navigating.
* Notifications: prefer toasts over modals.

---

## 10. Fast-Feedback Yield (Don’t Wait an Hour)

**Goal:** Make yield movements visible within minutes on Sepolia.

**Tactics**

1. **High-rate test market**

   * Select/parameterize an **Adaptive Curve IRM** with steeper slope so borrow APR is high even at modest utilization.
   * Use **small supply caps** so one borrower can reach meaningful utilization quickly.

2. **Borrower Bot** (script)

   * Script mints `fakeUSD`, supplies as collateral (or `fakeTIA` if that’s our collateral), then **borrows** against it to raise utilization.
   * Keep a small borrow open for \~10–20 minutes while blocks accrue, then repay.
   * Loop every few minutes so interest is continuously accruing.

3. **Tiny Principals, Big Signal**

   * Work with 1–100 units and show **share price** and **APY** to 6–8 decimals; small absolute interest will still be visible.

4. **Force Accrual Hooks**

   * Add UI buttons to poke any read/write that triggers interest snapshotting if needed (e.g., `redeem(0)` no-op, or a market read that updates indexes on-chain if applicable). (Note: on public testnets we can’t time-travel.)

5. **Optional Rewards Overlay**

   * If we want exaggerated signal, we can stream a tiny mock reward token to the vault and show a **“Rewards APY”** alongside base APR (clearly marked as demo-only).

6. **Observability (minimal)**

   * Track and display: `totalAssets`, share price, utilization, withdraw queue length, last accrual timestamp.

**Demo Script Order**

* Mint tokens → set oracle price → create market → deposit to vault → run borrower bot → watch utilization & APY tick → withdraw.

---

## 11. Open Questions / TODOs

* Confirm which **IRM** contracts are available on Sepolia and how configurable the slope is.
* Decide collateral/loan asset direction (`fakeTIA` vs `fakeUSD`) for simplest UX.
* Whether to include a **Merkl-like rewards mock** or keep the demo purely interest-based.
* Add diagrams for both **Page 1** and **Page 2** flows.
* Build a **TypeScript bot** that continuously monitors utilization, accrues interest (if needed), and rebalances/borrows to keep APY visible.
* Write short docs for Page 1 and Page 2 after implementation (how to run, how it works).

---

## Appendix A — Agent Readiness

### Prerequisites & Environment

* Node 20.x (`.nvmrc`), npm.
* Foundry installed (`forge`/`cast`).
* `.env.local` (app) and `.env` (scripts) with: `RPC_URL`, `PRIVATE_KEY`, optional `ALCHEMY_KEY`/`INFURA_KEY`.

### Address Book Schema (`config/addresses.ts`)

```
export const addresses = {
  tokens: { fakeUSD: "", fakeTIA: "" },
  oracles: { aggregator: { pair: "fakeTIA/fakeUSD", address: "" }, builtOracle: "" },
  morpho: {
    metaMorphoFactory: "",
    morphoBlueCore: "",
    oracleV2Factory: "",
    preLiquidationFactory: "",
    publicAllocator: "",
    adaptiveCurveIRM: ""
  },
  markets: { sandbox: { id: "", irm: "", lltv: "", loanToken: "", collateralToken: "", oracle: "" } },
  vaults: { page1Vault: "", customVault: "" },
  sources: { /* docs links or tx hashes per address */ }
} as const;
```

### ABIs & Sources

* Use reputable packages (OpenZeppelin, Morpho). Check-in JSON ABIs under `packages/abi/` if needed.

### TS-first Scripts

* Prefer TypeScript scripts for deploy/batch actions; only introduce on-chain batchers if wallet approvals become excessive.

### Defaults & Parameters

* Sandbox market defaults: LLTV preset, IRM address, small caps, target utilization ~70%, HF floor ~1.5, small principals.
* Free-tier RPCs are acceptable; provide sensible polling intervals.

---

## 12. Notes: Predictable Timing & Yield Observation

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
* Cron/PM2/Docker to keep it running during the demo.
