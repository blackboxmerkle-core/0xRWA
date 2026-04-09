# 0xRWA — Mining Edition

> **Real-World Asset tokenisation for the mining industry, fully on-chain on Base.**

0xRWA is a decentralised platform that enables mining companies to raise capital from global investors by tokenising their future revenue streams. Mining projects issue ERC-20 tokens via an on-chain raise, then submit production revenue periodically — 90 % of which flows back to token stakers as weekly USDC emissions, all enforced by audited smart contracts with no intermediaries.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Platform Roles](#platform-roles)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Mode](#demo-mode)

---

## Overview

Traditional mining finance is slow, opaque, and geographically restricted. 0xRWA removes these barriers:

| Feature | Detail |
|---|---|
| **Settlement chain** | Base (L2 Ethereum) |
| **Payment currency** | USDC |
| **Minimum raise** | $3 M per project |
| **Revenue split** | 90 % to stakers · 10 % platform fee |
| **Burn protection** | 10 % of raise held in a burn-reserve vault |
| **Emissions schedule** | Weekly epoch snapshots |
| **Compliance** | Full KYC/AML, sanctioned-jurisdiction blocking, IPFS document trail |

---

## How It Works

```
1. Mine Applies       → KYC/AML review by Admin Operator → Platform Exec approval
2. Token Raise        → ERC-20 token deployed via Factory · USDC raise ($3M+ min)
3. Revenue Submitted  → Mine submits monthly USDC revenue on-chain
4. Weekly Emissions   → 90% distributed to stakers each epoch · 10% to treasury
```

**Investor exit options:**
- Sell tokens on secondary market (when transfers are enabled post-raise)
- Burn tokens directly against the burn-reserve vault for guaranteed USDC payout

---

## Platform Roles

The platform has five distinct roles, each with its own dashboard, determined on-chain via the Registry contract:

| Role | Dashboard | Responsibilities |
|---|---|---|
| **Investor** | `/investor` | Buy into raises, stake tokens, claim weekly USDC emissions, burn tokens |
| **Mining Project** | `/project` | Deploy token via factory, manage the token sale, submit monthly revenue |
| **Admin** | `/admin` | Approve/revoke projects, control disbursements, manage emissions |
| **Admin Operator** | `/admin-operator` | Review KYC documents, onboard projects, manage project detail pages |
| **Platform Executive** | `/platform-exec` | Final governance authority — ultimate approval over all platform actions |

Role resolution happens automatically when a wallet connects: the `useRole` hook reads the on-chain Registry contract and routes the user to their correct dashboard.

---

## Smart Contract Architecture

The platform deploys a suite of five contracts per mining project via a central **Factory**:

```
Registry                  — central authority; stores approved operators, banned addresses
│
Factory                   — deploys the per-project contract suite
│
└── Per-Project Suite
    ├── ProjectToken       — ERC-20 mine token (transfers locked during sale)
    ├── TokenSale          — USDC raise with $3M minimum; refund if raise fails
    ├── Staking            — epoch-based staking with weekly snapshot & USDC claims
    ├── BurnReserve        — holds 10% of raise; redeemable by burning tokens
    └── RevenueRouter      — accepts monthly revenue; splits 90% → staking, 10% → treasury
```

All ABIs are defined in [`src/lib/contracts.ts`](./src/lib/contracts.ts). Contract addresses are injected at runtime via environment variables.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Blockchain** | [wagmi v2](https://wagmi.sh) + [viem](https://viem.sh) |
| **Wallet UI** | [RainbowKit](https://www.rainbowkit.com) |
| **Network** | Base · Base Sepolia (testnet) |
| **Data fetching** | TanStack Query v5 |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (hero, how-it-works, CTAs)
│   ├── investor/             # Investor dashboard
│   ├── project/              # Mining project dashboard
│   ├── admin/                # Admin dashboard
│   ├── admin-operator/       # Admin Operator dashboard
│   └── platform-exec/        # Platform Executive dashboard
│
├── context/
│   └── DemoContext.tsx       # Demo/preview mode state
│
├── hooks/
│   ├── useRole.ts            # On-chain role resolution
│   └── useProjects.ts        # Project data fetching
│
├── lib/
│   ├── contracts.ts          # ABIs + deployed contract addresses
│   ├── wagmi.ts              # wagmi / RainbowKit config (Base + Base Sepolia)
│   ├── demo-data.ts          # Mock data for preview / demo mode
│   └── utils.ts              # Shared utilities
│
└── providers/                # App-level React providers
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)

### Install & run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

> **Turbopack cache note:** If you see a `Can't resolve 'tailwindcss'` error after moving the project directory, delete the `.next` folder and restart the dev server.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Deployed Registry contract address |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed Factory contract address |
| `NEXT_PUBLIC_USDC_ADDRESS` | USDC token address (Base Sepolia default pre-filled) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [WalletConnect Cloud](https://cloud.walletconnect.com) project ID |
| `NEXT_PUBLIC_BASE_RPC` | *(optional)* Custom Base mainnet RPC URL |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | *(optional)* Custom Base Sepolia RPC URL |

---

## Demo Mode

Every dashboard can be previewed **without connecting a wallet** by clicking any **"Preview"** button on the landing page. Demo mode uses mock data from `src/lib/demo-data.ts` and does not interact with any smart contracts.

To exit demo mode, click **"Exit preview mode"** on the landing page or disconnect your wallet session.
