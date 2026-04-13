# 0xRWA

**0xRWA** is a blockchain-based platform that enables mining project operators to tokenize their revenues and access a new form of financing. Operators launch token sales to raise capital from investors, who in turn receive staking rewards and revenue-linked emissions distributions — all settled in USDC on the **Base** blockchain.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Fund Flow](#fund-flow)
- [Role Hierarchy](#role-hierarchy)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Key Parameters](#key-parameters)

---

## Overview

Mining operators use 0xRWA to:

1. **Deploy** a per-project contract suite via `ProjectFactory`
2. **Run a token sale** (minimum $3M USDC raise)
3. **Receive tranche disbursements** from a scheduler over up to 365 days
4. **Submit mining revenue** which is routed back to investors via emissions
5. **Manage production metrics** tracked on-chain via a production oracle

Investors use 0xRWA to:

1. **Buy tokens** during the public sale
2. **Stake tokens** to earn weekly USDC emissions
3. **Claim emissions** once admin-verified earnings are distributed
4. **Burn tokens for USDC** from the burn vault (after project cancellation)

---

## Architecture

```
0xRWA/
├── contracts/
│   ├── core/
│   │   ├── RWARegistry.sol          # Central governance & project state machine
│   │   ├── ProjectFactory.sol       # Deploys per-project contract suites
│   │   └── ProtocolTreasury.sol     # Holds 10% protocol fees
│   ├── project/
│   │   ├── RWAToken.sol             # ERC20 with snapshot support
│   │   ├── TokenSale.sol            # Token fundraising & oversubscription logic
│   │   ├── StakingPool.sol          # Weekly epoch staking & emissions
│   │   ├── DisbursementScheduler.sol# Tranche releases to operator
│   │   ├── RevenueRouter.sol        # Routes mining revenue (10% burn / 90% operator)
│   │   ├── BurnVault.sol            # Dual-bucket burn + compensation reserve
│   │   ├── EmissionsVault.sol       # USDC earnings verification & distribution
│   │   ├── ProductionOracle.sol     # Production estimates & daily output reports
│   │   └── ProjectDocuments.sol     # IPFS document hash storage
│   └── interfaces/
│       ├── IRegistry.sol
│       └── IRWAToken.sol
├── frontend/                        # Next.js application (role-based dashboards)
├── scripts/
│   └── deploy/deploy.ts             # Core contract deployment
├── deployments/                     # Deployed addresses per chain (JSON)
├── artifacts/                       # Compiled ABIs
├── typechain-types/                 # TypeScript contract bindings
├── hardhat.config.ts
└── package.json
```

---

## Smart Contracts

### Core Contracts

| Contract | Description |
|---|---|
| `RWARegistry` | Central governance hub. Manages project lifecycle states (Pending → Active → Paused / Cancelled / Withdrawn), admin roles (admin, adminOperator, platformExec), and per-project controls (pause transfers, emissions, disbursement). Implements two-step cancellation approval. |
| `ProjectFactory` | Atomically deploys all 9 per-project contracts, wires cross-references between them, and registers the suite in the registry. |
| `ProtocolTreasury` | Receives and holds the 10% protocol fee from each token sale finalization. |

### Per-Project Contracts

| Contract | Description |
|---|---|
| `RWAToken` | ERC20 with ERC20Snapshot support. Transfers are gated until the token sale finalizes. Supports burn and pausable emissions. |
| `TokenSale` | Public raise mechanism. Enforces a $3M minimum. Handles oversubscription — operator can choose target-only or full-raise (subject to oracle payback check). On finalize: 10% → treasury, 15% → BurnVault, 75% → DisbursementScheduler. |
| `StakingPool` | Token staking with weekly snapshot epochs. Distributes USDC emissions pro-rata to stakers. Tracks missed epochs to gate disbursements. |
| `DisbursementScheduler` | Holds 75% of net raise and releases in configurable tranches (Monthly / BiMonthly / Quarterly / HalfYearly) over up to 365 days. Withholds if operator missed staking epochs. |
| `RevenueRouter` | Single entry point for mining revenue submission. Splits 10% to BurnVault and returns 90% to the operator. |
| `BurnVault` | Dual-bucket design: 10% burn bucket (investors burn tokens for USDC) + 5% compensation bucket (safety net for cancelled projects). Receives top-ups from RevenueRouter. |
| `EmissionsVault` | Operator submits USDC earnings with an IPFS CID report. Admin Operator verifies (Pending → Verified → Distributed or Rejected). Takes 10% admin fee; sends 90% to StakingPool for epoch distribution. |
| `ProductionOracle` | Stores production estimates (oz/day, commodity type, schedule). Accepts daily actual output reports. Provides `annualOutputEstimate()` used in oversubscription payback checks and `thirtyDayAvgOutput()` for performance tracking. |
| `ProjectDocuments` | Stores IPFS document hashes and metadata for a project on-chain. |

---

## Frontend

Built with Next.js (App Router), TypeScript, Wagmi v2, Viem, and RainbowKit. Each role has a dedicated dashboard.

| Route | Role | Description |
|---|---|---|
| `/` | Public | Landing page with role selection, investor signup modal, and platform overview. |
| `/admin` | Admin | System overview: active projects, total raised, treasury balance, project approval/revocation, ban management. |
| `/admin-operator` | Admin Operator | Document submission review, emissions approval/rejection, first-step cancellation approvals. |
| `/platform-exec` | Platform Exec | Second-step cancellation approvals and security oversight. |
| `/project` | Project Operator | 7 tabs: Overview, Deploy, Sale (incl. oversubscription handling), Production (oracle estimates + daily reports), Emissions (vault submissions), Revenue (routing), Activity (DeFi exposure + tx history). |
| `/investor` | Investor | Portfolio with live gold price, notional daily earnings, claimable emission epochs, and claim/burn actions. |

**Tech stack:**
- Next.js 16 / React 19
- Wagmi 2 + Viem 2 + RainbowKit 2
- TanStack React Query 5
- Tailwind CSS 4 + Lucide React

---

## Fund Flow

```
Token Sale Gross Raise (≥ $3M USDC)
  │
  ├── 10% ──► ProtocolTreasury       (protocol fee)
  │
  ├── 15% ──► BurnVault
  │              ├── 10% → burnBucket        (investors burn tokens for USDC)
  │              └──  5% → compensationBucket (cancelled project safety net)
  │
  └── 75% ──► DisbursementScheduler  (operator tranches over ≤ 365 days)

Mining Revenue (submitted via RevenueRouter)
  ├── 10% ──► BurnVault (top-up burnBucket)
  └── 90% ──► Operator

Emissions (submitted via EmissionsVault)
  ├── 10% ──► Admin fee
  └── 90% ──► StakingPool → pro-rata to stakers
```

### Oversubscription

When `totalRaised > $3M`, the sale pauses and sets `oversubscribed = true`. The operator then chooses:

- **TargetOnly** — release exactly $3M, refund the excess USDC to contributors
- **FullRaise** — oracle payback check (`annualRevenue ≥ totalRaised`), then release the full amount if viable

### Operator-Requested Cancellation (Two-Step)

1. Operator calls `requestCancellation()` → `cancellationPending = true`
2. Admin Operator calls `registry.approveCancellationAO()` (document review)
3. Platform Exec calls `registry.approveCancellationExec()` → triggers `sale.executeCancellation()`, project status → **Cancelled**

---

## Role Hierarchy

| Role | Responsibilities |
|---|---|
| **Admin** | System governance, project approval/revocation, bans, treasury management |
| **Admin Operator** | Document review, emissions verification, first-step cancellation approval |
| **Platform Exec** | Second-signer on cancellations, security oversight |
| **Project Operator** | Deploys contract suite, manages sale, submits revenue/emissions, controls disbursement tranches |
| **Investor** | Buys tokens, stakes, claims emissions, burns tokens for USDC after cancellation |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install dependencies

```bash
# Root (contracts + tooling)
npm install

# Frontend
npm install --prefix frontend
```

### Run the frontend locally

```bash
npm run dev
# or
npm run frontend
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

### Root (contract deployment)

Create a `.env` file in the project root:

```env
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
BASESCAN_API_KEY=YOUR_BASESCAN_KEY
```

### Frontend

Create `frontend/.env.local`:

```env
# Populated automatically by the deploy script
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...

# Base Sepolia USDC
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID

# Optional RPC overrides
NEXT_PUBLIC_BASE_RPC=
NEXT_PUBLIC_BASE_SEPOLIA_RPC=
```

---

## Deployment

### Compile contracts

```bash
npm run compile
```

### Deploy to Base Sepolia (testnet)

```bash
npm run deploy:sepolia
```

### Deploy to Base Mainnet

```bash
npm run deploy:base
```

The deploy script:
1. Deploys `RWARegistry`
2. Deploys `ProtocolTreasury`
3. Deploys `ProjectFactory`
4. Wires the registry (`setFactory`, `setTreasury`)
5. Saves deployed addresses to `deployments/{chainId}.json`
6. Outputs the `NEXT_PUBLIC_*` env vars for the frontend

### Verify contracts on Basescan

```bash
npm run verify
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run compile` | Compile all Solidity contracts |
| `npm run test` | Run Hardhat contract tests |
| `npm run deploy:sepolia` | Deploy core contracts to Base Sepolia |
| `npm run deploy:base` | Deploy core contracts to Base mainnet |
| `npm run verify` | Verify contracts on Basescan |
| `npm run dev` | Start the Next.js frontend dev server |

---

## Key Parameters

| Parameter | Value |
|---|---|
| Minimum raise | $3,000,000 USDC |
| Protocol fee | 10% of gross raise |
| Burn vault allocation | 15% (10% burn + 5% compensation) |
| Operator disbursement | 75% of gross raise |
| Staking epoch duration | 7 days |
| Max disbursement window | 365 days from funding |
| Disbursement intervals | Monthly (30d), BiMonthly (60d), Quarterly (90d), HalfYearly (180d) |
| Revenue split | 10% → BurnVault, 90% → Operator |
| Emissions split | 10% → Admin fee, 90% → StakingPool |
| Token standard | ERC20 + ERC20Snapshot (18 decimals) |
| USDC decimals | 6 |
| Target networks | Base Mainnet (8453), Base Sepolia (84532) |

---

## License

No License — all rights reserved. This code is proprietary and may not be copied, modified, distributed, or used without explicit written permission from the authors.
