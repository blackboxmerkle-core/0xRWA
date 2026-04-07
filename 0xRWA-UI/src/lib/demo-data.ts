// ─── Rich mock data for demo / preview mode ───────────────────────────────────

// ProjectStatus enum mirrors contracts/core/RWARegistry.sol
export type ProjectStatus       = "Active" | "Paused" | "Cancelled" | "Withdrawn";
export type DisbursementInterval = "Monthly" | "Bi-Monthly" | "Quarterly" | "Half-Yearly";
export type DocType =
  | "OwnershipProof"
  | "GovernmentVerification"
  | "TeamPhoto"
  | "TeamBio"
  | "WebsiteEvidence"
  | "Other";
export type VerificationStatus  = "Pending" | "Verified" | "Rejected";
export type EmissionDepositStatus = "Pending" | "Verified" | "Distributed" | "Rejected";
export type OperatingSchedule   = "FiveDays" | "SevenDays";

export interface ProjectDocument {
  id:         number;
  ipfsHash:   string;
  docType:    DocType;
  uploadedBy: "operator" | "adminOperator";
  uploadedAt: number;   // unix ms
  status:     VerificationStatus;
  notes:      string;
  label:      string;
}

export interface TeamMember {
  id:       number;
  name:     string;
  role:     string;
  bio:      string;
  photoCid: string;
  verified: boolean;
}

export interface PendingChange {
  id:         number;
  field:      string;
  oldValue:   string;
  newValue:   string;
  proposedBy: string;
  proposedAt: number;
  executed:   boolean;
}

export interface EmissionDeposit {
  id:               number;
  amount:           bigint;        // USDC 6-dec
  earningsReportCid: string;
  proofCid:         string;
  submittedAt:      number;        // unix ms
  verifiedAt:       number;
  distributedAt:    number;
  status:           EmissionDepositStatus;
  feeAmount:        bigint;        // 10% to admin
  netAmount:        bigint;        // 90% to stakers
  epochId:          number;
}

export interface DailyReport {
  id:          number;
  date:        number;             // unix ms (start of day)
  actualOunces: bigint;            // 6-dec fixed point (1_000_000 = 1 oz)
  evidenceCid: string;
  reportedAt:  number;             // unix ms
}

export interface ProductionEstimate {
  ouncesPerDay:  bigint;           // 6-dec fixed point
  schedule:      OperatingSchedule;
  commodityName: string;
  unit:          string;
  submittedAt:   number;           // unix ms
  set:           boolean;
}

export type RevenueSubmissionStatus = "Pending" | "Verified" | "Distributed" | "Rejected";

export interface RevenueSubmission {
  id:                number;
  periodLabel:       string;          // e.g. "March 2026", "Q1 2026"
  grossAmount:       bigint;          // USDC 6-dec (total revenue received)
  taxRate:           number;          // percent, e.g. 30
  taxProvision:      bigint;          // grossAmount × taxRate / 100
  postTaxAmount:     bigint;          // grossAmount - taxProvision
  platformFee:       bigint;          // postTaxAmount × 10%
  netToStakers:      bigint;          // postTaxAmount × 90%
  proofCid:          string;          // IPFS CID of revenue proof document
  earningsReportCid: string;          // IPFS CID of earnings report
  submittedAt:       number;          // unix ms
  status:            RevenueSubmissionStatus;
  emissionDepositId: number | null;   // links to EmissionDeposit when created
}

// ── Social links ──────────────────────────────────────────────────────────────
export interface SocialLinks {
  x?:        string;   // X / Twitter URL
  linkedin?: string;
  discord?:  string;
  telegram?: string;
}

// ── External news ─────────────────────────────────────────────────────────────
export interface ProjectNews {
  id:          number;
  title:       string;
  url:         string;
  source:      string;   // e.g. "Mining Weekly", "Reuters"
  snippet:     string;   // short preview text (kept brief for copyright)
  publishedAt: number;   // unix ms
}

// ── Epoch detail ──────────────────────────────────────────────────────────────
export interface EpochCertification {
  name:        string;   // e.g. "Responsible Gold Certification"
  issuedBy:    string;   // e.g. "Bureau Veritas"
  issuedAt:    number;   // unix ms
  documentCid: string;   // IPFS CID
}

export type IssueSeverity = "low" | "medium" | "high";

export interface EpochIssue {
  description: string;
  severity:    IssueSeverity;
  resolved:    boolean;
  resolution?: string;
}

export interface EpochDetail {
  epochId:              number;
  periodStart:          number;   // unix ms
  periodEnd:            number;   // unix ms
  totalOreMinedTonnes:  number;   // metric tonnes of raw ore
  reportedPurity:       number;   // percent, e.g. 98.7
  processingTimeHours:  number;   // total processing hours this epoch
  outputOunces:         number;   // troy oz of refined gold
  certifications:       EpochCertification[];
  issues:               EpochIssue[];
  reportCid:            string;   // IPFS CID of full report
  notes:                string;
  verifiedAt:           number | null;
}

// ── Announcements ─────────────────────────────────────────────────────────────
export type AnnouncementTarget   = "investors" | "projects" | "all";
export type AnnouncementFrom     = "platform" | "project";
export type AnnouncementPriority = "info" | "warning" | "important";

export interface Announcement {
  id:           number;
  from:         AnnouncementFrom;
  projectIndex?: number;   // set when from === "project"
  authorName:   string;    // "Platform" | project name
  title:        string;
  body:         string;
  publishedAt:  number;    // unix ms
  target:       AnnouncementTarget;
  priority:     AnnouncementPriority;
  pinned:       boolean;
}

export interface OnChainActivity {
  totalDeFiLocked: bigint;         // tokens (18-dec)
  defiProtocols: Array<{
    name:    string;
    locked:  bigint;               // tokens
    tvlUsdc: bigint;               // USDC 6-dec
    link:    string;
  }>;
  recentTxs: Array<{
    hash:      string;
    type:      "Transfer" | "Stake" | "Unstake" | "Burn" | "Claim";
    amount:    bigint;
    from:      string;
    to:        string;
    timestamp: number;             // unix ms
    blockExplorer: string;
  }>;
}

// ── Live gold price (in production: fetched from metals.live or similar API) ──
export const DEMO_GOLD_PRICE_USD_PER_OZ = 2_312.45;   // USD per troy oz

// ── Projects ──────────────────────────────────────────────────────────────────
export const DEMO_PROJECTS = [
  {
    operator:      "0xA1B2C3D4E5F6a1b2c3d4e5f6A1B2C3D4E5F6A1B2" as `0x${string}`,
    name:          "Apex Gold Mine",
    status:        "Active" as ProjectStatus,
    active:        true,
    token:         "0x1111111111111111111111111111111111111111" as `0x${string}`,
    sale:          "0x2222222222222222222222222222222222222222" as `0x${string}`,
    staking:       "0x3333333333333333333333333333333333333333" as `0x${string}`,
    burnVault:     "0x4444444444444444444444444444444444444444" as `0x${string}`,
    revenueRouter: "0x5555555555555555555555555555555555555555" as `0x${string}`,
    disbursement:  "0x5a55555555555555555555555555555555555555" as `0x${string}`,
    emissionsVault:"0x5b55555555555555555555555555555555555555" as `0x${string}`,

    // Sale data
    totalRaised:    4_820_000n * 10n ** 6n,   // oversubscribed
    pricePerToken:  300_000n,                  // $0.30 in 6-dec
    deadline:       BigInt(Math.floor(Date.now() / 1000) + 12 * 86400),
    finalized:      false,
    failed:         false,
    cancelled:      false,
    oversubscribed: true,
    cancellationPending: false,
    finalizeChoice: "None" as "None" | "TargetOnly" | "FullRaise",
    totalTokensSold: 16_066_667n * 10n ** 18n,

    // Token
    symbol:           "APXG",
    totalSupply:      50_000_000n * 10n ** 18n,
    transfersEnabled: false,
    transfersPaused:  false,

    // Staking
    totalStaked:           2_400_000n * 10n ** 18n,
    currentEpoch:          3n,
    lastSnapshotTime:      BigInt(Math.floor(Date.now() / 1000) - 3 * 86400),
    timeUntilNextSnapshot: BigInt(4 * 86400),
    emissionsPaused:       false,
    missedEpochs:          0,

    // Burn vault
    burnBucketBalance:         482_000n * 10n ** 6n,   // 10% of raise
    compensationBucketBalance: 241_000n * 10n ** 6n,   // 5% of raise
    totalBurnedTokens:         125_000n * 10n ** 18n,

    // Revenue
    totalRevenueSubmitted: 875_000n * 10n ** 6n,

    // Epochs
    epochs: [
      { snapshotId: 1n, totalStakedAtSnapshot: 1_800_000n * 10n ** 18n, usdcEmission: 12_400n * 10n ** 6n, timestamp: BigInt(Math.floor(Date.now() / 1000) - 21 * 86400), funded: true  },
      { snapshotId: 2n, totalStakedAtSnapshot: 2_100_000n * 10n ** 18n, usdcEmission: 18_700n * 10n ** 6n, timestamp: BigInt(Math.floor(Date.now() / 1000) - 14 * 86400), funded: true  },
      { snapshotId: 3n, totalStakedAtSnapshot: 2_400_000n * 10n ** 18n, usdcEmission: 22_300n * 10n ** 6n, timestamp: BigInt(Math.floor(Date.now() / 1000) -  7 * 86400), funded: true  },
    ],

    // Disbursement
    disbursementInterval: "Quarterly" as DisbursementInterval,
    disbursementPaused:   false,
    totalDisbursed:       1_085_000n * 10n ** 6n,
    totalFunded:          3_615_000n * 10n ** 6n,   // 75% of 4.82M
    nextDisbursementAt:   BigInt(Math.floor(Date.now() / 1000) + 18 * 86400),

    // Emissions vault history
    emissions: [
      {
        id: 0, amount: 45_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb101",
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb201",
        submittedAt: Date.now() - 21 * 86400 * 1000, verifiedAt: Date.now() - 20 * 86400 * 1000,
        distributedAt: Date.now() - 20 * 86400 * 1000, status: "Distributed" as EmissionDepositStatus,
        feeAmount: 4_500n * 10n ** 6n, netAmount: 40_500n * 10n ** 6n, epochId: 1,
      },
      {
        id: 1, amount: 62_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb102",
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb202",
        submittedAt: Date.now() - 14 * 86400 * 1000, verifiedAt: Date.now() - 13 * 86400 * 1000,
        distributedAt: Date.now() - 13 * 86400 * 1000, status: "Distributed" as EmissionDepositStatus,
        feeAmount: 6_200n * 10n ** 6n, netAmount: 55_800n * 10n ** 6n, epochId: 2,
      },
      {
        id: 2, amount: 58_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb103",
        proofCid: "",
        submittedAt: Date.now() - 2 * 86400 * 1000, verifiedAt: 0, distributedAt: 0,
        status: "Pending" as EmissionDepositStatus,
        feeAmount: 0n, netAmount: 0n, epochId: 0,
      },
    ] as EmissionDeposit[],

    // Production
    productionEstimate: {
      ouncesPerDay:  10_000n,         // 6-dec: 0.01 troy oz per day
      schedule:      "FiveDays" as OperatingSchedule,
      commodityName: "GOLD",
      unit:          "troy oz",
      submittedAt:   Date.now() - 30 * 86400 * 1000,
      set:           true,
    } as ProductionEstimate,

    dailyReports: [
      { id: 0, date: Date.now() - 3 * 86400 * 1000, actualOunces: 9_800n,  evidenceCid: "bafybeig...r1", reportedAt: Date.now() - 3 * 86400 * 1000 + 28800000 },
      { id: 1, date: Date.now() - 2 * 86400 * 1000, actualOunces: 10_200n, evidenceCid: "bafybeig...r2", reportedAt: Date.now() - 2 * 86400 * 1000 + 28800000 },
      { id: 2, date: Date.now() - 1 * 86400 * 1000, actualOunces: 10_100n, evidenceCid: "bafybeig...r3", reportedAt: Date.now() - 1 * 86400 * 1000 + 28800000 },
    ] as DailyReport[],

    // On-chain activity
    onChainActivity: {
      totalDeFiLocked: 1_250_000n * 10n ** 18n,
      defiProtocols: [
        { name: "Uniswap v3",   locked: 850_000n * 10n ** 18n, tvlUsdc: 255_000n * 10n ** 6n, link: "https://app.uniswap.org" },
        { name: "Aerodrome",    locked: 400_000n * 10n ** 18n, tvlUsdc: 120_000n * 10n ** 6n, link: "https://aerodrome.finance" },
      ],
      recentTxs: [
        { hash: "0xabc1...", type: "Transfer", amount: 50_000n * 10n ** 18n, from: "0xDEMO...001", to: "0xDEMO...002", timestamp: Date.now() - 1800000,  blockExplorer: "https://basescan.org/tx/0xabc1" },
        { hash: "0xabc2...", type: "Stake",    amount: 20_000n * 10n ** 18n, from: "0xDEMO...003", to: "0x3333...333", timestamp: Date.now() - 3600000,  blockExplorer: "https://basescan.org/tx/0xabc2" },
        { hash: "0xabc3...", type: "Burn",     amount:  5_000n * 10n ** 18n, from: "0xDEMO...004", to: "0x0000...000", timestamp: Date.now() - 7200000,  blockExplorer: "https://basescan.org/tx/0xabc3" },
        { hash: "0xabc4...", type: "Claim",    amount:  1_200n * 10n ** 6n,  from: "0x3333...333", to: "0xDEMO...005", timestamp: Date.now() - 10800000, blockExplorer: "https://basescan.org/tx/0xabc4" },
      ],
    } as OnChainActivity,

    // Revenue submission history
    revenueHistory: [
      {
        id: 0, periodLabel: "January 2026",
        grossAmount: 350_000n * 10n ** 6n, taxRate: 28,
        taxProvision: 98_000n * 10n ** 6n,
        postTaxAmount: 252_000n * 10n ** 6n,
        platformFee: 25_200n * 10n ** 6n,
        netToStakers: 226_800n * 10n ** 6n,
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb301",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb101",
        submittedAt: Date.now() - 50 * 86400 * 1000, status: "Distributed" as RevenueSubmissionStatus,
        emissionDepositId: 0,
      },
      {
        id: 1, periodLabel: "February 2026",
        grossAmount: 420_000n * 10n ** 6n, taxRate: 28,
        taxProvision: 117_600n * 10n ** 6n,
        postTaxAmount: 302_400n * 10n ** 6n,
        platformFee: 30_240n * 10n ** 6n,
        netToStakers: 272_160n * 10n ** 6n,
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb302",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb102",
        submittedAt: Date.now() - 18 * 86400 * 1000, status: "Distributed" as RevenueSubmissionStatus,
        emissionDepositId: 1,
      },
      {
        id: 2, periodLabel: "March 2026 (partial)",
        grossAmount: 175_000n * 10n ** 6n, taxRate: 28,
        taxProvision: 49_000n * 10n ** 6n,
        postTaxAmount: 126_000n * 10n ** 6n,
        platformFee: 12_600n * 10n ** 6n,
        netToStakers: 113_400n * 10n ** 6n,
        proofCid: "",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb103",
        submittedAt: Date.now() - 2 * 86400 * 1000, status: "Pending" as RevenueSubmissionStatus,
        emissionDepositId: 2,
      },
    ] as RevenueSubmission[],

    // Social media & community
    socialLinks: {
      x:        "https://x.com/apexgoldmine",
      linkedin: "https://linkedin.com/company/apex-gold-mine",
      discord:  "https://discord.gg/apexgoldmine",
      telegram: "https://t.me/apexgoldmine",
    } as SocialLinks,

    // External news
    news: [
      {
        id: 0, source: "Mining Weekly",
        title: "Apex Gold Mine expands processing capacity by 15%",
        url: "https://miningweekly.example.com/apex-gold-expansion",
        snippet: "Apex Gold Mine announced a significant upgrade to its ore processing facility...",
        publishedAt: Date.now() - 10 * 86400 * 1000,
      },
      {
        id: 1, source: "Reuters",
        title: "Gold prices rally on safe-haven demand — APXG token up 8%",
        url: "https://reuters.example.com/gold-rally",
        snippet: "Gold rose to multi-month highs as investors sought safe-haven assets...",
        publishedAt: Date.now() - 5 * 86400 * 1000,
      },
      {
        id: 2, source: "Apex Gold Blog",
        title: "Q1 2026 Production Report: Record oz output achieved",
        url: "https://apexgoldmine.example.com/blog/q1-2026",
        snippet: "We are pleased to announce that Q1 2026 saw our highest-ever quarterly output...",
        publishedAt: Date.now() - 2 * 86400 * 1000,
      },
    ] as ProjectNews[],

    // Rich epoch detail data
    epochDetails: [
      {
        epochId: 1,
        periodStart: Date.now() - 56 * 86400 * 1000,
        periodEnd:   Date.now() - 49 * 86400 * 1000,
        totalOreMinedTonnes: 142.5,
        reportedPurity:      98.4,
        processingTimeHours: 162,
        outputOunces:        68.3,
        certifications: [
          { name: "Responsible Gold Certification", issuedBy: "Bureau Veritas", issuedAt: Date.now() - 50 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb501" },
          { name: "ISO 9001:2015 Compliance", issuedBy: "SGS Group", issuedAt: Date.now() - 51 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb502" },
        ],
        issues: [
          { description: "Minor conveyor belt jam on day 3 — 4-hour stoppage", severity: "low", resolved: true, resolution: "Belt replaced, maintenance schedule updated" },
        ],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb500",
        notes: "Strong week — ore grade above estimate. Processing team performed ahead of schedule.",
        verifiedAt: Date.now() - 48 * 86400 * 1000,
      },
      {
        epochId: 2,
        periodStart: Date.now() - 28 * 86400 * 1000,
        periodEnd:   Date.now() - 21 * 86400 * 1000,
        totalOreMinedTonnes: 138.2,
        reportedPurity:      97.9,
        processingTimeHours: 168,
        outputOunces:        72.1,
        certifications: [
          { name: "Export Permit — Zambia Ministry of Mines", issuedBy: "Zambia Ministry of Mines", issuedAt: Date.now() - 22 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb511" },
        ],
        issues: [],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb510",
        notes: "Clean epoch — no interruptions. Purity slightly below target but within acceptable range.",
        verifiedAt: Date.now() - 20 * 86400 * 1000,
      },
      {
        epochId: 3,
        periodStart: Date.now() - 7 * 86400 * 1000,
        periodEnd:   Date.now(),
        totalOreMinedTonnes: 151.0,
        reportedPurity:      99.1,
        processingTimeHours: 155,
        outputOunces:        81.4,
        certifications: [],
        issues: [
          { description: "Power grid instability on day 5 — operations ran on backup generator for 6 hours", severity: "medium", resolved: true, resolution: "Grid supplier notified, backup system fully operational" },
          { description: "Water treatment test flagged trace minerals — under review", severity: "medium", resolved: false },
        ],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb520",
        notes: "Best output this quarter. Power issue resolved quickly. Water treatment review ongoing.",
        verifiedAt: null,
      },
    ] as EpochDetail[],

    // Statistics
    holderCount:      312,
    transactionCount: 1_847,
    website: "https://apexgoldmine.example.com",

    documents: [
      { id: 0, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", docType: "OwnershipProof",        uploadedBy: "operator",      uploadedAt: Date.now() - 10 * 86400 * 1000, status: "Verified", notes: "Title deed confirmed with Ministry of Mines",    label: "Mining Title Deed" },
      { id: 1, ipfsHash: "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq", docType: "GovernmentVerification", uploadedBy: "adminOperator", uploadedAt: Date.now() -  8 * 86400 * 1000, status: "Verified", notes: "Confirmed with Dept. of Natural Resources",        label: "Government Approval Certificate" },
      { id: 2, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", docType: "TeamPhoto",             uploadedBy: "operator",      uploadedAt: Date.now() -  5 * 86400 * 1000, status: "Verified", notes: "Team meeting photo verified",                     label: "Team Verification Photo" },
      { id: 3, ipfsHash: "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq", docType: "WebsiteEvidence",      uploadedBy: "operator",      uploadedAt: Date.now() -  3 * 86400 * 1000, status: "Pending",  notes: "",                                             label: "Website Screenshot" },
    ] as ProjectDocument[],
    team: [
      { id: 0, name: "James Okonkwo", role: "CEO & Founder",  bio: "20+ years in West African mining operations.", photoCid: "bafybeig...", verified: true  },
      { id: 1, name: "Amara Diallo",  role: "Chief Geologist", bio: "PhD Geology, University of Cape Town.",       photoCid: "bafybeih...", verified: true  },
      { id: 2, name: "Tom Rivers",    role: "CFO",             bio: "Former Goldman Sachs, natural resources.",    photoCid: "bafybeij...", verified: false },
    ] as TeamMember[],
    pendingChanges: [] as PendingChange[],
  },

  {
    operator:      "0xB2C3D4E5F6a1b2c3d4e5f6A1B2C3D4E5F6A1B2C3" as `0x${string}`,
    name:          "Silverstone Mining Co.",
    status:        "Active" as ProjectStatus,
    active:        true,
    token:         "0x6666666666666666666666666666666666666666" as `0x${string}`,
    sale:          "0x7777777777777777777777777777777777777777" as `0x${string}`,
    staking:       "0x8888888888888888888888888888888888888888" as `0x${string}`,
    burnVault:     "0x9999999999999999999999999999999999999999" as `0x${string}`,
    revenueRouter: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" as `0x${string}`,
    disbursement:  "0xAa55555555555555555555555555555555555555" as `0x${string}`,
    emissionsVault:"0xAb55555555555555555555555555555555555555" as `0x${string}`,

    totalRaised:    3_150_000n * 10n ** 6n,
    pricePerToken:  500_000n,
    deadline:       BigInt(Math.floor(Date.now() / 1000) + 25 * 86400),
    finalized:      false,
    failed:         false,
    cancelled:      false,
    oversubscribed: false,
    cancellationPending: true,   // waiting for AO + exec approval
    finalizeChoice: "None" as "None" | "TargetOnly" | "FullRaise",
    totalTokensSold: 6_300_000n * 10n ** 18n,

    symbol:           "SLVR",
    totalSupply:      20_000_000n * 10n ** 18n,
    transfersEnabled: false,
    transfersPaused:  false,

    totalStaked:           980_000n * 10n ** 18n,
    currentEpoch:          1n,
    lastSnapshotTime:      BigInt(Math.floor(Date.now() / 1000) - 1 * 86400),
    timeUntilNextSnapshot: BigInt(6 * 86400),
    emissionsPaused:       false,
    missedEpochs:          1,

    burnBucketBalance:         315_000n * 10n ** 6n,
    compensationBucketBalance: 157_500n * 10n ** 6n,
    totalBurnedTokens:         0n,

    totalRevenueSubmitted: 315_000n * 10n ** 6n,

    epochs: [
      { snapshotId: 1n, totalStakedAtSnapshot: 980_000n * 10n ** 18n, usdcEmission: 0n, timestamp: BigInt(Math.floor(Date.now() / 1000) - 7 * 86400), funded: false },
    ],

    disbursementInterval: "Monthly" as DisbursementInterval,
    disbursementPaused:   false,
    totalDisbursed:       0n,
    totalFunded:          2_362_500n * 10n ** 6n,   // 75% of 3.15M
    nextDisbursementAt:   BigInt(Math.floor(Date.now() / 1000) + 5 * 86400),

    emissions: [
      {
        id: 0, amount: 18_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb111",
        proofCid: "",
        submittedAt: Date.now() - 5 * 86400 * 1000, verifiedAt: 0, distributedAt: 0,
        status: "Pending" as EmissionDepositStatus,
        feeAmount: 0n, netAmount: 0n, epochId: 0,
      },
    ] as EmissionDeposit[],

    productionEstimate: {
      ouncesPerDay:  8_000n,
      schedule:      "SevenDays" as OperatingSchedule,
      commodityName: "SILVER",
      unit:          "troy oz",
      submittedAt:   Date.now() - 60 * 86400 * 1000,
      set:           true,
    } as ProductionEstimate,

    dailyReports: [
      { id: 0, date: Date.now() - 2 * 86400 * 1000, actualOunces: 7_900n, evidenceCid: "bafybeig...s1", reportedAt: Date.now() - 2 * 86400 * 1000 + 32400000 },
    ] as DailyReport[],

    onChainActivity: {
      totalDeFiLocked: 0n,
      defiProtocols: [],
      recentTxs: [
        { hash: "0xbbb1...", type: "Transfer", amount: 10_000n * 10n ** 18n, from: "0xBBB0...001", to: "0xBBB0...002", timestamp: Date.now() - 86400000, blockExplorer: "https://basescan.org/tx/0xbbb1" },
      ],
    } as OnChainActivity,

    // Revenue submission history
    revenueHistory: [
      {
        id: 0, periodLabel: "March 2026 (partial)",
        grossAmount: 85_000n * 10n ** 6n, taxRate: 30,
        taxProvision: 25_500n * 10n ** 6n,
        postTaxAmount: 59_500n * 10n ** 6n,
        platformFee: 5_950n * 10n ** 6n,
        netToStakers: 53_550n * 10n ** 6n,
        proofCid: "",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb111",
        submittedAt: Date.now() - 5 * 86400 * 1000, status: "Pending" as RevenueSubmissionStatus,
        emissionDepositId: 0,
      },
    ] as RevenueSubmission[],

    socialLinks: {
      x:        "https://x.com/silverstonemine",
      telegram: "https://t.me/silverstonemine",
    } as SocialLinks,
    news: [
      {
        id: 0, source: "Silver Investing News",
        title: "Silverstone Mining Co. secures new processing contract",
        url: "https://silverinvestingnews.example.com/silverstone",
        snippet: "Silverstone Mining has signed a multi-year agreement with a regional refinery...",
        publishedAt: Date.now() - 8 * 86400 * 1000,
      },
    ] as ProjectNews[],
    epochDetails: [
      {
        epochId: 1,
        periodStart: Date.now() - 14 * 86400 * 1000,
        periodEnd:   Date.now() - 7 * 86400 * 1000,
        totalOreMinedTonnes: 88.0,
        reportedPurity:      96.2,
        processingTimeHours: 140,
        outputOunces:        31.5,
        certifications: [
          { name: "Responsible Minerals Assurance", issuedBy: "RJC", issuedAt: Date.now() - 8 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb601" },
        ],
        issues: [
          { description: "Drill head replacement required — 8 hour planned downtime", severity: "low", resolved: true, resolution: "New drill head installed per maintenance schedule" },
        ],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb600",
        notes: "First full epoch since sale finalized. On track with production estimates.",
        verifiedAt: Date.now() - 6 * 86400 * 1000,
      },
    ] as EpochDetail[],

    holderCount:      89,
    transactionCount: 412,
    website: "",

    documents: [
      { id: 0, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb001", docType: "OwnershipProof", uploadedBy: "operator", uploadedAt: Date.now() - 14 * 86400 * 1000, status: "Pending", notes: "", label: "Mining Concession Agreement" },
      { id: 1, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb002", docType: "TeamBio",       uploadedBy: "operator", uploadedAt: Date.now() - 12 * 86400 * 1000, status: "Pending", notes: "", label: "Team Bios Package" },
    ] as ProjectDocument[],
    team: [
      { id: 0, name: "Elena Marchetti", role: "CEO", bio: "15 years silver mining, Europe & Africa.", photoCid: "bafybeik...", verified: false },
    ] as TeamMember[],
    pendingChanges: [
      { id: 0, field: "website", oldValue: "", newValue: "https://silverstonemine.example.com", proposedBy: "0xOPERATOR001", proposedAt: Date.now() - 2 * 86400 * 1000, executed: false },
    ] as PendingChange[],
  },

  {
    operator:      "0xC3D4E5F6a1b2c3d4e5f6A1B2C3D4E5F6A1B2C3D4" as `0x${string}`,
    name:          "Ironridge Copper",
    status:        "Active" as ProjectStatus,
    active:        true,
    token:         "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" as `0x${string}`,
    sale:          "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" as `0x${string}`,
    staking:       "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD" as `0x${string}`,
    burnVault:     "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE" as `0x${string}`,
    revenueRouter: "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF" as `0x${string}`,
    disbursement:  "0xFF55555555555555555555555555555555555555" as `0x${string}`,
    emissionsVault:"0xFF66666666666666666666666666666666666666" as `0x${string}`,

    totalRaised:    5_000_000n * 10n ** 6n,
    pricePerToken:  200_000n,
    deadline:       BigInt(Math.floor(Date.now() / 1000) - 5 * 86400),
    finalized:      true,
    failed:         false,
    cancelled:      false,
    oversubscribed: false,
    cancellationPending: false,
    finalizeChoice: "FullRaise" as "None" | "TargetOnly" | "FullRaise",
    totalTokensSold: 25_000_000n * 10n ** 18n,

    symbol:           "IRCU",
    totalSupply:      100_000_000n * 10n ** 18n,
    transfersEnabled: true,
    transfersPaused:  false,

    totalStaked:           8_200_000n * 10n ** 18n,
    currentEpoch:          8n,
    lastSnapshotTime:      BigInt(Math.floor(Date.now() / 1000) - 2 * 86400),
    timeUntilNextSnapshot: BigInt(5 * 86400),
    emissionsPaused:       false,
    missedEpochs:          0,

    burnBucketBalance:         500_000n * 10n ** 6n,
    compensationBucketBalance: 250_000n * 10n ** 6n,
    totalBurnedTokens:         500_000n * 10n ** 18n,

    totalRevenueSubmitted: 2_400_000n * 10n ** 6n,

    epochs: [
      { snapshotId: 6n, totalStakedAtSnapshot: 7_800_000n * 10n ** 18n, usdcEmission: 28_400n * 10n ** 6n, timestamp: BigInt(Math.floor(Date.now() / 1000) - 21 * 86400), funded: true },
      { snapshotId: 7n, totalStakedAtSnapshot: 8_000_000n * 10n ** 18n, usdcEmission: 31_200n * 10n ** 6n, timestamp: BigInt(Math.floor(Date.now() / 1000) - 14 * 86400), funded: true },
      { snapshotId: 8n, totalStakedAtSnapshot: 8_200_000n * 10n ** 18n, usdcEmission: 35_600n * 10n ** 6n, timestamp: BigInt(Math.floor(Date.now() / 1000) -  7 * 86400), funded: true },
    ],

    disbursementInterval: "Half-Yearly" as DisbursementInterval,
    disbursementPaused:   false,
    totalDisbursed:       2_250_000n * 10n ** 6n,
    totalFunded:          3_750_000n * 10n ** 6n,   // 75% of 5M
    nextDisbursementAt:   BigInt(Math.floor(Date.now() / 1000) + 90 * 86400),

    emissions: [
      {
        id: 0, amount: 85_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb121",
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb221",
        submittedAt: Date.now() - 21 * 86400 * 1000, verifiedAt: Date.now() - 20 * 86400 * 1000,
        distributedAt: Date.now() - 20 * 86400 * 1000, status: "Distributed" as EmissionDepositStatus,
        feeAmount: 8_500n * 10n ** 6n, netAmount: 76_500n * 10n ** 6n, epochId: 6,
      },
      {
        id: 1, amount: 92_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb122",
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb222",
        submittedAt: Date.now() - 14 * 86400 * 1000, verifiedAt: Date.now() - 13 * 86400 * 1000,
        distributedAt: Date.now() - 13 * 86400 * 1000, status: "Distributed" as EmissionDepositStatus,
        feeAmount: 9_200n * 10n ** 6n, netAmount: 82_800n * 10n ** 6n, epochId: 7,
      },
      {
        id: 2, amount: 110_000n * 10n ** 6n,
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb123",
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb223",
        submittedAt: Date.now() - 7 * 86400 * 1000, verifiedAt: Date.now() - 6 * 86400 * 1000,
        distributedAt: 0, status: "Verified" as EmissionDepositStatus,
        feeAmount: 0n, netAmount: 0n, epochId: 0,
      },
    ] as EmissionDeposit[],

    productionEstimate: {
      ouncesPerDay:  50_000_000n,   // 6-dec: 50 tonnes per day (copper in kg × 1e6)
      schedule:      "FiveDays" as OperatingSchedule,
      commodityName: "COPPER",
      unit:          "kg",
      submittedAt:   Date.now() - 90 * 86400 * 1000,
      set:           true,
    } as ProductionEstimate,

    dailyReports: [
      { id: 0, date: Date.now() - 5 * 86400 * 1000, actualOunces: 48_000_000n, evidenceCid: "bafybeig...c1", reportedAt: Date.now() - 5 * 86400 * 1000 + 28800000 },
      { id: 1, date: Date.now() - 4 * 86400 * 1000, actualOunces: 51_000_000n, evidenceCid: "bafybeig...c2", reportedAt: Date.now() - 4 * 86400 * 1000 + 28800000 },
      { id: 2, date: Date.now() - 3 * 86400 * 1000, actualOunces: 52_000_000n, evidenceCid: "bafybeig...c3", reportedAt: Date.now() - 3 * 86400 * 1000 + 28800000 },
      { id: 3, date: Date.now() - 2 * 86400 * 1000, actualOunces: 49_500_000n, evidenceCid: "bafybeig...c4", reportedAt: Date.now() - 2 * 86400 * 1000 + 28800000 },
    ] as DailyReport[],

    onChainActivity: {
      totalDeFiLocked: 4_500_000n * 10n ** 18n,
      defiProtocols: [
        { name: "Uniswap v3",   locked: 2_800_000n * 10n ** 18n, tvlUsdc: 560_000n * 10n ** 6n, link: "https://app.uniswap.org"   },
        { name: "Aerodrome",    locked: 1_200_000n * 10n ** 18n, tvlUsdc: 240_000n * 10n ** 6n, link: "https://aerodrome.finance" },
        { name: "Curve Finance",locked:   500_000n * 10n ** 18n, tvlUsdc: 100_000n * 10n ** 6n, link: "https://curve.fi"          },
      ],
      recentTxs: [
        { hash: "0xccc1...", type: "Transfer", amount:  200_000n * 10n ** 18n, from: "0xCCC0...001", to: "0xCCC0...002", timestamp: Date.now() -  900000, blockExplorer: "https://basescan.org/tx/0xccc1" },
        { hash: "0xccc2...", type: "Stake",    amount:  500_000n * 10n ** 18n, from: "0xCCC0...003", to: "0xDDDD...DDD", timestamp: Date.now() - 1800000, blockExplorer: "https://basescan.org/tx/0xccc2" },
        { hash: "0xccc3...", type: "Unstake",  amount:  100_000n * 10n ** 18n, from: "0xDDDD...DDD", to: "0xCCC0...004", timestamp: Date.now() - 3600000, blockExplorer: "https://basescan.org/tx/0xccc3" },
        { hash: "0xccc4...", type: "Burn",     amount:   50_000n * 10n ** 18n, from: "0xCCC0...005", to: "0x0000...000", timestamp: Date.now() - 5400000, blockExplorer: "https://basescan.org/tx/0xccc4" },
        { hash: "0xccc5...", type: "Claim",    amount:    2_170n * 10n ** 6n,  from: "0xDDDD...DDD", to: "0xCCC0...006", timestamp: Date.now() - 7200000, blockExplorer: "https://basescan.org/tx/0xccc5" },
      ],
    } as OnChainActivity,

    // Revenue submission history
    revenueHistory: [
      {
        id: 0, periodLabel: "January 2026",
        grossAmount: 850_000n * 10n ** 6n, taxRate: 25,
        taxProvision: 212_500n * 10n ** 6n,
        postTaxAmount: 637_500n * 10n ** 6n,
        platformFee: 63_750n * 10n ** 6n,
        netToStakers: 573_750n * 10n ** 6n,
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb401",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb121",
        submittedAt: Date.now() - 55 * 86400 * 1000, status: "Distributed" as RevenueSubmissionStatus,
        emissionDepositId: 0,
      },
      {
        id: 1, periodLabel: "February 2026",
        grossAmount: 920_000n * 10n ** 6n, taxRate: 25,
        taxProvision: 230_000n * 10n ** 6n,
        postTaxAmount: 690_000n * 10n ** 6n,
        platformFee: 69_000n * 10n ** 6n,
        netToStakers: 621_000n * 10n ** 6n,
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb402",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb122",
        submittedAt: Date.now() - 22 * 86400 * 1000, status: "Distributed" as RevenueSubmissionStatus,
        emissionDepositId: 1,
      },
      {
        id: 2, periodLabel: "March 2026 (partial)",
        grossAmount: 630_000n * 10n ** 6n, taxRate: 25,
        taxProvision: 157_500n * 10n ** 6n,
        postTaxAmount: 472_500n * 10n ** 6n,
        platformFee: 47_250n * 10n ** 6n,
        netToStakers: 425_250n * 10n ** 6n,
        proofCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb403",
        earningsReportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb123",
        submittedAt: Date.now() - 8 * 86400 * 1000, status: "Verified" as RevenueSubmissionStatus,
        emissionDepositId: 2,
      },
    ] as RevenueSubmission[],

    socialLinks: {
      x:        "https://x.com/ironridgecopper",
      linkedin: "https://linkedin.com/company/ironridge-copper",
      discord:  "https://discord.gg/ironridgecu",
      telegram: "https://t.me/ironridgecopper",
    } as SocialLinks,
    news: [
      {
        id: 0, source: "Copper Investing News",
        title: "Copper demand surges — Ironridge output up 12% YoY",
        url: "https://copperinvestingnews.example.com/ironridge-q1",
        snippet: "Ironridge Copper reports a 12% year-over-year increase in refined copper output...",
        publishedAt: Date.now() - 15 * 86400 * 1000,
      },
      {
        id: 1, source: "Financial Times",
        title: "Ironridge Copper signs long-term off-take agreement with automotive OEM",
        url: "https://ft.example.com/ironridge-offtake",
        snippet: "A multi-year supply contract was announced securing forward revenue for the operation...",
        publishedAt: Date.now() - 3 * 86400 * 1000,
      },
    ] as ProjectNews[],
    epochDetails: [
      {
        epochId: 1,
        periodStart: Date.now() - 60 * 86400 * 1000,
        periodEnd:   Date.now() - 53 * 86400 * 1000,
        totalOreMinedTonnes: 2_840,
        reportedPurity:      99.1,
        processingTimeHours: 168,
        outputOunces:        48_200,
        certifications: [
          { name: "London Metal Exchange Approved", issuedBy: "LME", issuedAt: Date.now() - 54 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb701" },
          { name: "ISO 14001 Environmental Management", issuedBy: "TÜV Rheinland", issuedAt: Date.now() - 55 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb702" },
        ],
        issues: [],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb700",
        notes: "Flawless epoch — all KPIs met or exceeded. New shift roster performing well.",
        verifiedAt: Date.now() - 52 * 86400 * 1000,
      },
      {
        epochId: 2,
        periodStart: Date.now() - 30 * 86400 * 1000,
        periodEnd:   Date.now() - 23 * 86400 * 1000,
        totalOreMinedTonnes: 2_910,
        reportedPurity:      98.8,
        processingTimeHours: 165,
        outputOunces:        49_500,
        certifications: [
          { name: "Responsible Copper Standard", issuedBy: "Copper Mark", issuedAt: Date.now() - 24 * 86400 * 1000, documentCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb711" },
        ],
        issues: [
          { description: "Tailings pond pump failure — 12 hour shutdown", severity: "high", resolved: true, resolution: "Replacement pump installed; secondary pump added as redundancy" },
          { description: "Environmental monitoring data delayed 2 days", severity: "low", resolved: true, resolution: "Data submitted retroactively; monitoring system upgraded" },
        ],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb710",
        notes: "Good output despite pump incident. Redundancy upgrade prevents recurrence.",
        verifiedAt: Date.now() - 22 * 86400 * 1000,
      },
      {
        epochId: 3,
        periodStart: Date.now() - 10 * 86400 * 1000,
        periodEnd:   Date.now() - 3 * 86400 * 1000,
        totalOreMinedTonnes: 3_020,
        reportedPurity:      99.3,
        processingTimeHours: 168,
        outputOunces:        52_100,
        certifications: [],
        issues: [],
        reportCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb720",
        notes: "Record epoch — highest output to date. New processing line fully operational.",
        verifiedAt: null,
      },
    ] as EpochDetail[],

    holderCount:      1_204,
    transactionCount: 9_312,
    website: "https://ironridgecopper.example.com",

    documents: [
      { id: 0, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb003", docType: "OwnershipProof",        uploadedBy: "operator",      uploadedAt: Date.now() - 30 * 86400 * 1000, status: "Verified", notes: "Confirmed",                       label: "Mining Licence"              },
      { id: 1, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb004", docType: "GovernmentVerification", uploadedBy: "adminOperator", uploadedAt: Date.now() - 28 * 86400 * 1000, status: "Verified", notes: "Copper export permit confirmed", label: "Export Permit"               },
      { id: 2, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb005", docType: "TeamPhoto",             uploadedBy: "operator",      uploadedAt: Date.now() - 25 * 86400 * 1000, status: "Verified", notes: "Photo with platform staff",       label: "Team Verification Photo"     },
      { id: 3, ipfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fb006", docType: "WebsiteEvidence",      uploadedBy: "operator",      uploadedAt: Date.now() - 20 * 86400 * 1000, status: "Verified", notes: "Domain ownership confirmed",     label: "Website Evidence"            },
    ] as ProjectDocument[],
    team: [
      { id: 0, name: "Marcus Chen",    role: "CEO",             bio: "30+ years copper mining, Chile & Zambia.", photoCid: "bafybeig...", verified: true },
      { id: 1, name: "Fatima Al-Said", role: "COO",             bio: "Operations & logistics specialist.",       photoCid: "bafybeih...", verified: true },
      { id: 2, name: "David Nkosi",    role: "Head of Geology", bio: "PhD, specialising in copper porphyry.",   photoCid: "bafybeij...", verified: true },
    ] as TeamMember[],
    pendingChanges: [] as PendingChange[],
  },
];

// ── Investor demo data ────────────────────────────────────────────────────────
export const DEMO_INVESTOR = {
  address: "0xDEMO000000000000000000000000000000000001" as `0x${string}`,
  usdcBalance: 45_000n * 10n ** 6n,
  holdings: [
    {
      projectIndex: 0,
      tokenBalance:  200_000n * 10n ** 18n,
      stakedBalance: 150_000n * 10n ** 18n,
      contribution:   60_000n * 10n ** 6n,
      pendingTokens: 200_000n * 10n ** 18n,
      claimableEpochs: [
        { epochId: 1n, amount: 1_033n * 10n ** 6n },
        { epochId: 2n, amount: 1_342n * 10n ** 6n },
      ],
    },
    {
      projectIndex: 2,
      tokenBalance:  500_000n * 10n ** 18n,
      stakedBalance: 500_000n * 10n ** 18n,
      contribution:  100_000n * 10n ** 6n,
      pendingTokens: 0n,
      claimableEpochs: [
        { epochId: 6n, amount: 1_820n * 10n ** 6n },
        { epochId: 7n, amount: 1_950n * 10n ** 6n },
        { epochId: 8n, amount: 2_170n * 10n ** 6n },
      ],
    },
  ],
};

// ── Admin demo data ───────────────────────────────────────────────────────────
export const DEMO_ADMIN = {
  address: "0xADMIN00000000000000000000000000000000001" as `0x${string}`,
  treasuryBalance: 812_000n * 10n ** 6n,
  recentBans: [
    { address: "0xBAD0000000000000000000000000000000000001", reason: "Suspicious activity", timestamp: Date.now() - 2 * 86400 * 1000 },
    { address: "0xBAD0000000000000000000000000000000000002", reason: "Duplicate account",   timestamp: Date.now() - 5 * 86400 * 1000 },
  ],
};

// ── Admin Operator demo data ──────────────────────────────────────────────────
export const DEMO_ADMIN_OPERATOR = {
  address: "0xOPERATOR0000000000000000000000000000001" as `0x${string}`,
  pendingVerifications: [
    { projectIndex: 0, docId: 3, label: "Website Screenshot",  projectName: "Apex Gold Mine"        },
    { projectIndex: 1, docId: 0, label: "Mining Concession",   projectName: "Silverstone Mining Co." },
    { projectIndex: 1, docId: 1, label: "Team Bios Package",   projectName: "Silverstone Mining Co." },
  ],
  // Emissions awaiting proof upload and approval
  pendingEmissions: [
    { projectIndex: 0, depositId: 2, projectName: "Apex Gold Mine",        amount: 58_000n * 10n ** 6n, submittedAt: Date.now() - 2 * 86400 * 1000 },
    { projectIndex: 1, depositId: 0, projectName: "Silverstone Mining Co.", amount: 18_000n * 10n ** 6n, submittedAt: Date.now() - 5 * 86400 * 1000 },
  ],
  // Projects with pending cancellation requests
  pendingCancellations: [
    { projectIndex: 1, projectName: "Silverstone Mining Co.", requestedAt: Date.now() - 1 * 86400 * 1000, aoApproved: false, execApproved: false },
  ],
  pendingMeetings: [
    { projectIndex: 1, memberName: "Elena Marchetti", scheduledAt: Date.now() + 3 * 86400 * 1000 },
  ],
};

// ── Platform Exec demo data ───────────────────────────────────────────────────
export const DEMO_PLATFORM_EXEC = {
  address: "0xPLATFORM000000000000000000000000000001" as `0x${string}`,
  pendingApprovals: [
    { projectIndex: 1, changeId: 0, field: "website", oldValue: "", newValue: "https://silverstonemine.example.com", proposedAt: Date.now() - 2 * 86400 * 1000 },
  ],
  // Cancellation approvals (only appear after AO has approved)
  pendingCancellationApprovals: [] as Array<{
    projectIndex: number; projectName: string; requestedAt: number; aoApprovedAt: number;
  }>,
};

// ── Platform-wide & project announcements ────────────────────────────────────
export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  // Platform → all investors
  {
    id: 0, from: "platform", authorName: "0xRWA Platform",
    title: "Platform Upgrade — Enhanced Epoch Reporting Live",
    body: "We have upgraded the epoch reporting dashboard to include detailed ore grades, processing times, and certification tracking. All projects will now submit richer operational data each epoch.",
    publishedAt: Date.now() - 3 * 86400 * 1000,
    target: "investors", priority: "info", pinned: true,
  },
  {
    id: 1, from: "platform", authorName: "0xRWA Platform",
    title: "New KYC Requirement for Investments over $50,000",
    body: "Effective from next month, investors placing orders above $50,000 USDC in a single sale will be required to complete enhanced KYC verification. Please ensure your documents are up to date in your profile.",
    publishedAt: Date.now() - 8 * 86400 * 1000,
    target: "investors", priority: "warning", pinned: false,
  },
  // Platform → all projects
  {
    id: 2, from: "platform", authorName: "0xRWA Platform",
    title: "Reminder: Monthly Production Reports Due by 5th",
    body: "All active projects must submit their monthly production reports and revenue submissions by the 5th of each month. Late submissions may affect your project's compliance rating on the platform.",
    publishedAt: Date.now() - 2 * 86400 * 1000,
    target: "projects", priority: "important", pinned: false,
  },
  {
    id: 3, from: "platform", authorName: "0xRWA Platform",
    title: "New: Epoch Detail Reporting Fields Required",
    body: "Starting this quarter, epoch reports must include: tonnes of ore mined, reported purity percentage, total processing time, and any certifications received. Use the updated reporting form in your dashboard.",
    publishedAt: Date.now() - 12 * 86400 * 1000,
    target: "projects", priority: "info", pinned: false,
  },
  // Project → investors (Apex Gold Mine)
  {
    id: 4, from: "project", projectIndex: 0, authorName: "Apex Gold Mine",
    title: "Q1 2026 Record Output — Investor Update",
    body: "We are excited to share that Q1 2026 was our best quarter on record, with 81.4 troy oz produced in epoch #3 alone. The new processing facility upgrade is delivering above expectations. Revenue submission for March will be processed this week.",
    publishedAt: Date.now() - 1 * 86400 * 1000,
    target: "investors", priority: "info", pinned: true,
  },
  {
    id: 5, from: "project", projectIndex: 0, authorName: "Apex Gold Mine",
    title: "Power Backup System Upgraded — Operations Fully Secured",
    body: "Following a brief power grid instability event in epoch #3, we have completed installation of an industrial-grade backup power system. All operations are fully secured against future grid events with zero interruption capability.",
    publishedAt: Date.now() - 4 * 86400 * 1000,
    target: "investors", priority: "info", pinned: false,
  },
  // Project → investors (Ironridge Copper)
  {
    id: 6, from: "project", projectIndex: 2, authorName: "Ironridge Copper",
    title: "Long-Term Off-Take Agreement Signed — Revenue Secured",
    body: "Ironridge Copper has signed a 3-year off-take agreement with a major automotive OEM for 80% of our annual copper production. This significantly de-risks revenue projections and underpins future emissions to stakers.",
    publishedAt: Date.now() - 3 * 86400 * 1000,
    target: "investors", priority: "important", pinned: true,
  },
];

// ── Signup / Inbox types ──────────────────────────────────────────────────────
export type SignupRole = "investor" | "project";
export type SignupStatus = "pending" | "approved" | "rejected";

export interface ProjectSignupRequest {
  id:            number;
  companyName:   string;
  contactName:   string;
  email:         string;
  country:       string;
  commodity:     string;           // e.g. "Gold", "Copper"
  estimatedRaise: number;          // USD
  website:       string;
  walletAddress: string;
  submittedAt:   number;           // unix ms
  status:        SignupStatus;
  notes:         string;           // AO review notes
}

export interface InvestorSignupRequest {
  id:            number;
  name:          string;
  email:         string;
  country:       string;
  walletAddress: string;
  submittedAt:   number;
  status:        SignupStatus;
  flagged:       boolean;          // connected with blacklisted address
}

// ── Blacklist / geography ─────────────────────────────────────────────────────
export interface BlacklistFlag {
  id:            number;
  investorAddress: string;
  linkedAddress:  string;          // the blacklisted address they interacted with
  reason:         string;
  detectedAt:     number;
  resolved:       boolean;
}

export interface GeoDataPoint {
  country:     string;
  countryCode: string;             // ISO 3166-1 alpha-2
  connections: number;
  percentage:  number;
}

export interface HolderGeoData {
  projectIndex:   number;
  projectName:    string;
  lastUpdated:    number;
  geoBreakdown:   GeoDataPoint[];
}

// ── Sanctioned country list ───────────────────────────────────────────────────
export interface SanctionedCountry {
  countryCode: string;
  countryName: string;
  addedAt:     number;
  addedBy:     string;             // AO address
}

// ── Admin / Exec user types ───────────────────────────────────────────────────
export type AdminRole = "exec" | "admin";
export type AdminStatus = "active" | "suspended" | "pending";

export interface AdminUser {
  id:            number;
  email:         string;
  walletAddress: string;
  role:          AdminRole;
  status:        AdminStatus;
  approvedBy:    string | null;    // exec wallet address
  approvedAt:    number | null;
  joinedAt:      number;
}

// ── Demo data: Signup inbox ───────────────────────────────────────────────────
export const DEMO_PROJECT_SIGNUPS: ProjectSignupRequest[] = [
  {
    id: 1, companyName: "Kalahari Silver Corp", contactName: "David Nkosi",
    email: "david@kalahari-silver.co.za", country: "South Africa",
    commodity: "Silver", estimatedRaise: 2_500_000, website: "https://kalahari-silver.co.za",
    walletAddress: "0xAaaa1111111111111111111111111111111111AA",
    submittedAt: Date.now() - 2 * 86400 * 1000, status: "pending", notes: "",
  },
  {
    id: 2, companyName: "Andean Lithium Partners", contactName: "Maria Espinoza",
    email: "m.espinoza@andean-lithium.cl", country: "Chile",
    commodity: "Lithium", estimatedRaise: 5_000_000, website: "https://andean-lithium.cl",
    walletAddress: "0xBbbb2222222222222222222222222222222222BB",
    submittedAt: Date.now() - 4 * 86400 * 1000, status: "pending", notes: "",
  },
  {
    id: 3, companyName: "Arctic Nickel AS", contactName: "Lars Eriksen",
    email: "l.eriksen@arcticnickel.no", country: "Norway",
    commodity: "Nickel", estimatedRaise: 3_200_000, website: "https://arcticnickel.no",
    walletAddress: "0xCccc3333333333333333333333333333333333CC",
    submittedAt: Date.now() - 7 * 86400 * 1000, status: "approved", notes: "All documents verified. Onboarding in progress.",
  },
];

export const DEMO_INVESTOR_SIGNUPS: InvestorSignupRequest[] = [
  {
    id: 1, name: "James Whitfield", email: "j.whitfield@example.com",
    country: "United Kingdom", walletAddress: "0xDddd4444444444444444444444444444444444DD",
    submittedAt: Date.now() - 1 * 86400 * 1000, status: "pending", flagged: false,
  },
  {
    id: 2, name: "Mei Lin", email: "mei.lin@example.com",
    country: "Singapore", walletAddress: "0xEeee5555555555555555555555555555555555EE",
    submittedAt: Date.now() - 3 * 86400 * 1000, status: "pending", flagged: true,
  },
];

// ── Demo data: Blacklist flags ────────────────────────────────────────────────
export const DEMO_BLACKLIST_FLAGS: BlacklistFlag[] = [
  {
    id: 1,
    investorAddress: "0xEeee5555555555555555555555555555555555EE",
    linkedAddress:   "0xDeaD0000000000000000000000000000000DeaD",
    reason: "OFAC-listed address detected in transaction history",
    detectedAt: Date.now() - 3 * 86400 * 1000, resolved: false,
  },
  {
    id: 2,
    investorAddress: "0xF1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1",
    linkedAddress:   "0xBadC0ffee000000000000000000000000000000",
    reason: "Interaction with mixer contract identified",
    detectedAt: Date.now() - 5 * 86400 * 1000, resolved: true,
  },
];

// ── Demo data: Holder geography ───────────────────────────────────────────────
export const DEMO_HOLDER_GEO: HolderGeoData[] = [
  {
    projectIndex: 0, projectName: "Apex Gold Mine",
    lastUpdated: Date.now() - 6 * 3600 * 1000,
    geoBreakdown: [
      { country: "United States",   countryCode: "US", connections: 412, percentage: 32.4 },
      { country: "United Kingdom",  countryCode: "GB", connections: 197, percentage: 15.5 },
      { country: "Singapore",       countryCode: "SG", connections: 156, percentage: 12.3 },
      { country: "Germany",         countryCode: "DE", connections: 98,  percentage: 7.7  },
      { country: "Australia",       countryCode: "AU", connections: 87,  percentage: 6.8  },
      { country: "Canada",          countryCode: "CA", connections: 74,  percentage: 5.8  },
      { country: "UAE",             countryCode: "AE", connections: 61,  percentage: 4.8  },
      { country: "Other",           countryCode: "XX", connections: 186, percentage: 14.7 },
    ],
  },
  {
    projectIndex: 1, projectName: "Silverstone Mining Co.",
    lastUpdated: Date.now() - 12 * 3600 * 1000,
    geoBreakdown: [
      { country: "United States",   countryCode: "US", connections: 280, percentage: 38.1 },
      { country: "Switzerland",     countryCode: "CH", connections: 132, percentage: 18.0 },
      { country: "Netherlands",     countryCode: "NL", connections: 89,  percentage: 12.1 },
      { country: "United Kingdom",  countryCode: "GB", connections: 71,  percentage: 9.7  },
      { country: "Japan",           countryCode: "JP", connections: 54,  percentage: 7.3  },
      { country: "Other",           countryCode: "XX", connections: 108, percentage: 14.8 },
    ],
  },
];

// ── Demo data: Sanctioned countries ──────────────────────────────────────────
export const DEMO_SANCTIONED_COUNTRIES: SanctionedCountry[] = [
  { countryCode: "KP", countryName: "North Korea",       addedAt: Date.now() - 90 * 86400 * 1000, addedBy: "0xAO...0001" },
  { countryCode: "IR", countryName: "Iran",               addedAt: Date.now() - 90 * 86400 * 1000, addedBy: "0xAO...0001" },
  { countryCode: "SY", countryName: "Syria",              addedAt: Date.now() - 90 * 86400 * 1000, addedBy: "0xAO...0001" },
  { countryCode: "CU", countryName: "Cuba",               addedAt: Date.now() - 60 * 86400 * 1000, addedBy: "0xAO...0001" },
  { countryCode: "RU", countryName: "Russia",             addedAt: Date.now() - 30 * 86400 * 1000, addedBy: "0xAO...0002" },
  { countryCode: "BY", countryName: "Belarus",            addedAt: Date.now() - 30 * 86400 * 1000, addedBy: "0xAO...0002" },
];

// ── Demo data: Admin users ────────────────────────────────────────────────────
export const DEMO_PLATFORM_DOMAIN = "0xrwa.io";

export const DEMO_ADMIN_USERS: AdminUser[] = [
  {
    id: 1, email: "exec@0xrwa.io", walletAddress: "0xExec0000000000000000000000000000000Exec",
    role: "exec", status: "active", approvedBy: null, approvedAt: null,
    joinedAt: Date.now() - 365 * 86400 * 1000,
  },
  {
    id: 2, email: "admin1@0xrwa.io", walletAddress: "0xAdmin11111111111111111111111111111Admin1",
    role: "admin", status: "active",
    approvedBy: "0xExec0000000000000000000000000000000Exec",
    approvedAt: Date.now() - 120 * 86400 * 1000,
    joinedAt: Date.now() - 120 * 86400 * 1000,
  },
  {
    id: 3, email: "admin2@0xrwa.io", walletAddress: "0xAdmin22222222222222222222222222222Admin2",
    role: "admin", status: "suspended",
    approvedBy: "0xExec0000000000000000000000000000000Exec",
    approvedAt: Date.now() - 90 * 86400 * 1000,
    joinedAt: Date.now() - 90 * 86400 * 1000,
  },
  {
    id: 4, email: "pending@0xrwa.io", walletAddress: "0xPend0000000000000000000000000000000Pend",
    role: "admin", status: "pending", approvedBy: null, approvedAt: null,
    joinedAt: Date.now() - 2 * 86400 * 1000,
  },
];
