import { type Address } from "viem";

// ─── Deployed addresses (populated from env / deployment artifacts) ────────
export const ADDRESSES = {
  registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x0") as Address,
  factory:  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS  || "0x0") as Address,
  usdc:     (process.env.NEXT_PUBLIC_USDC_ADDRESS     || "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address, // Base Sepolia USDC
} as const;

// ─── ABIs ───────────────────────────────────────────────────────────────────
export const REGISTRY_ABI = [
  // Read
  { name: "admin",               type: "function", stateMutability: "view", inputs: [],                                     outputs: [{ type: "address" }] },
  { name: "adminOperator",       type: "function", stateMutability: "view", inputs: [],                                     outputs: [{ type: "address" }] },
  { name: "platformExec",        type: "function", stateMutability: "view", inputs: [],                                     outputs: [{ type: "address" }] },
  { name: "factory",             type: "function", stateMutability: "view", inputs: [],                                     outputs: [{ type: "address" }] },
  { name: "protocolTreasury",    type: "function", stateMutability: "view", inputs: [],                                     outputs: [{ type: "address" }] },
  { name: "isApprovedProject",   type: "function", stateMutability: "view", inputs: [{ name: "op",   type: "address" }],    outputs: [{ type: "bool" }] },
  { name: "isBanned",            type: "function", stateMutability: "view", inputs: [{ name: "addr", type: "address" }],    outputs: [{ type: "bool" }] },
  { name: "getAllOperators",      type: "function", stateMutability: "view", inputs: [],                                     outputs: [{ type: "address[]" }] },
  { name: "getProjectContracts", type: "function", stateMutability: "view",
    inputs: [{ name: "operator", type: "address" }],
    outputs: [
      { name: "token",         type: "address" },
      { name: "sale",          type: "address" },
      { name: "staking",       type: "address" },
      { name: "burnReserve",   type: "address" },
      { name: "revenueRouter", type: "address" },
    ]
  },
  { name: "getProjectName",      type: "function", stateMutability: "view", inputs: [{ name: "op", type: "address" }],      outputs: [{ type: "string" }] },
  { name: "isProjectActive",     type: "function", stateMutability: "view", inputs: [{ name: "op", type: "address" }],      outputs: [{ type: "bool" }] },
  // Write
  { name: "approveProject",      type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "name", type: "string" }], outputs: [] },
  { name: "revokeProject",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }],    outputs: [] },
  { name: "banAddress",          type: "function", stateMutability: "nonpayable", inputs: [{ name: "target",   type: "address" }],    outputs: [] },
  { name: "unbanAddress",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "target",   type: "address" }],    outputs: [] },
  { name: "bulkBan",             type: "function", stateMutability: "nonpayable", inputs: [{ name: "targets",  type: "address[]" }],  outputs: [] },
  { name: "bulkUnban",           type: "function", stateMutability: "nonpayable", inputs: [{ name: "targets",  type: "address[]" }],  outputs: [] },
  // Events
  { name: "ProjectApproved",     type: "event", inputs: [{ name: "operator", type: "address", indexed: true }, { name: "name", type: "string" }] },
  { name: "ProjectRevoked",      type: "event", inputs: [{ name: "operator", type: "address", indexed: true }] },
  { name: "AddressBanned",       type: "event", inputs: [{ name: "target", type: "address", indexed: true }, { name: "by", type: "address", indexed: true }] },
] as const;

export const FACTORY_ABI = [
  { name: "deployProject", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "tokenName",         type: "string"   },
      { name: "tokenSymbol",       type: "string"   },
      { name: "totalSupply",       type: "uint256"  },
      { name: "salePricePerToken", type: "uint256"  },
      { name: "saleDeadline",      type: "uint256"  },
    ],
    outputs: [
      { name: "tokenAddr",        type: "address" },
      { name: "saleAddr",         type: "address" },
      { name: "stakingAddr",      type: "address" },
      { name: "burnReserveAddr",  type: "address" },
      { name: "revenueRouterAddr",type: "address" },
    ]
  },
  { name: "ProjectDeployed", type: "event",
    inputs: [
      { name: "operator",       type: "address", indexed: true },
      { name: "token",          type: "address" },
      { name: "sale",           type: "address" },
      { name: "staking",        type: "address" },
      { name: "burnReserve",    type: "address" },
      { name: "revenueRouter",  type: "address" },
    ]
  },
] as const;

export const TOKEN_SALE_ABI = [
  { name: "pricePerToken",    type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "uint256" }] },
  { name: "deadline",         type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "uint256" }] },
  { name: "totalRaised",      type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "uint256" }] },
  { name: "totalTokensSold",  type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "uint256" }] },
  { name: "finalized",        type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "bool" }] },
  { name: "failed",           type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "bool" }] },
  { name: "MIN_RAISE_USDC",   type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "uint256" }] },
  { name: "contributions",    type: "function", stateMutability: "view",        inputs: [{ name: "addr", type: "address" }],   outputs: [{ type: "uint256" }] },
  { name: "tokensPurchased",  type: "function", stateMutability: "view",        inputs: [{ name: "addr", type: "address" }],   outputs: [{ type: "uint256" }] },
  { name: "remainingTokens",  type: "function", stateMutability: "view",        inputs: [],                                    outputs: [{ type: "uint256" }] },
  { name: "buy",              type: "function", stateMutability: "nonpayable",  inputs: [{ name: "usdcAmount", type: "uint256" }], outputs: [] },
  { name: "finalize",         type: "function", stateMutability: "nonpayable",  inputs: [],                                    outputs: [] },
  { name: "claimRefund",      type: "function", stateMutability: "nonpayable",  inputs: [],                                    outputs: [] },
  { name: "TokensPurchased",  type: "event",    inputs: [{ name: "buyer", type: "address", indexed: true }, { name: "usdcAmount", type: "uint256" }, { name: "tokenAmount", type: "uint256" }] },
  { name: "SaleFinalized",    type: "event",    inputs: [{ name: "totalRaised", type: "uint256" }, { name: "fee", type: "uint256" }, { name: "netToOperator", type: "uint256" }] },
] as const;

export const STAKING_ABI = [
  { name: "stakedBalance",       type: "function", stateMutability: "view",       inputs: [{ name: "addr", type: "address" }],                        outputs: [{ type: "uint256" }] },
  { name: "totalStaked",         type: "function", stateMutability: "view",       inputs: [],                                                          outputs: [{ type: "uint256" }] },
  { name: "currentEpoch",        type: "function", stateMutability: "view",       inputs: [],                                                          outputs: [{ type: "uint256" }] },
  { name: "lastSnapshotTime",    type: "function", stateMutability: "view",       inputs: [],                                                          outputs: [{ type: "uint256" }] },
  { name: "EPOCH_DURATION",      type: "function", stateMutability: "view",       inputs: [],                                                          outputs: [{ type: "uint256" }] },
  { name: "claimed",             type: "function", stateMutability: "view",       inputs: [{ name: "staker", type: "address" }, { name: "epochId", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "pendingEmission",     type: "function", stateMutability: "view",       inputs: [{ name: "staker", type: "address" }, { name: "epochId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "getEpoch",            type: "function", stateMutability: "view",       inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "snapshotId",            type: "uint256" },
      { name: "totalStakedAtSnapshot", type: "uint256" },
      { name: "usdcEmission",          type: "uint256" },
      { name: "timestamp",             type: "uint256" },
    ]}]
  },
  { name: "timeUntilNextSnapshot", type: "function", stateMutability: "view",     inputs: [],                                                          outputs: [{ type: "uint256" }] },
  { name: "stake",               type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                        outputs: [] },
  { name: "unstake",             type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                        outputs: [] },
  { name: "claimEmission",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "epochId", type: "uint256" }],                        outputs: [] },
  { name: "claimMultipleEpochs", type: "function", stateMutability: "nonpayable", inputs: [{ name: "epochIds", type: "uint256[]" }],                     outputs: [] },
  { name: "takeWeeklySnapshot",  type: "function", stateMutability: "nonpayable", inputs: [],                                                            outputs: [{ name: "epochId", type: "uint256" }] },
  { name: "depositEmission",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "epochId", type: "uint256" }, { name: "usdcAmount", type: "uint256" }], outputs: [] },
  { name: "Staked",              type: "event",    inputs: [{ name: "staker", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "Unstaked",            type: "event",    inputs: [{ name: "staker", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "EmissionClaimed",     type: "event",    inputs: [{ name: "staker", type: "address", indexed: true }, { name: "epochId", type: "uint256", indexed: true }, { name: "usdcAmount", type: "uint256" }] },
] as const;

export const BURN_RESERVE_ABI = [
  { name: "icoPricePerToken",  type: "function", stateMutability: "view",       inputs: [],                                             outputs: [{ type: "uint256" }] },
  { name: "totalReserve",      type: "function", stateMutability: "view",       inputs: [],                                             outputs: [{ type: "uint256" }] },
  { name: "totalBurned",       type: "function", stateMutability: "view",       inputs: [],                                             outputs: [{ type: "uint256" }] },
  { name: "burnPayout",        type: "function", stateMutability: "view",       inputs: [{ name: "tokenAmount", type: "uint256" }],      outputs: [{ type: "uint256" }] },
  { name: "reserveBalance",    type: "function", stateMutability: "view",       inputs: [],                                             outputs: [{ type: "uint256" }] },
  { name: "burn",              type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenAmount", type: "uint256" }],      outputs: [] },
  { name: "TokensBurned",      type: "event",    inputs: [{ name: "burner", type: "address", indexed: true }, { name: "tokenAmount", type: "uint256" }, { name: "usdcPayout", type: "uint256" }] },
] as const;

export const REVENUE_ROUTER_ABI = [
  { name: "totalRevenueSubmitted", type: "function", stateMutability: "view",       inputs: [],                                             outputs: [{ type: "uint256" }] },
  { name: "submitRevenue",         type: "function", stateMutability: "nonpayable", inputs: [{ name: "grossAmount", type: "uint256" }],      outputs: [] },
  { name: "RevenueSubmitted",      type: "event",    inputs: [
    { name: "operator",         type: "address", indexed: true },
    { name: "gross",            type: "uint256" },
    { name: "burnReserveShare", type: "uint256" },
    { name: "operatorShare",    type: "uint256" },
    { name: "timestamp",        type: "uint256" },
  ]},
] as const;

export const ERC20_ABI = [
  { name: "balanceOf",   type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }],                                   outputs: [{ type: "uint256" }] },
  { name: "allowance",   type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "decimals",    type: "function", stateMutability: "view",       inputs: [],                                                                         outputs: [{ type: "uint8" }] },
  { name: "symbol",      type: "function", stateMutability: "view",       inputs: [],                                                                         outputs: [{ type: "string" }] },
  { name: "name",        type: "function", stateMutability: "view",       inputs: [],                                                                         outputs: [{ type: "string" }] },
  { name: "totalSupply", type: "function", stateMutability: "view",       inputs: [],                                                                         outputs: [{ type: "uint256" }] },
  { name: "transfersEnabled", type: "function", stateMutability: "view",  inputs: [],                                                                         outputs: [{ type: "bool" }] },
] as const;
