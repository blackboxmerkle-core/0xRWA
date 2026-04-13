"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContracts, useReadContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatCard } from "@/components/ui/StatCard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useDemo } from "@/context/DemoContext";
import { ADDRESSES, REGISTRY_ABI, TOKEN_SALE_ABI, STAKING_ABI, REVENUE_ROUTER_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatUsdc, formatToken, formatDate, progressPercent, parseUsdc } from "@/lib/utils";
import {
  DEMO_PROJECTS, DEMO_GOLD_PRICE_USD_PER_OZ, DEMO_ANNOUNCEMENTS, DEMO_HOLDER_GEO,
  type EmissionDeposit, type EmissionDepositStatus, type RevenueSubmission,
  type Announcement, type AnnouncementPriority, type EpochDetail,
} from "@/lib/demo-data";
import { IpfsUpload } from "@/components/ui/IpfsUpload";
import {
  Pickaxe, AlertTriangle, CheckCircle, Clock, TrendingUp,
  ExternalLink, Activity, Zap, XCircle, BarChart3, ArrowUpRight,
  DollarSign, History, Megaphone, Pin, ChevronDown, ChevronUp,
  Shield, TriangleAlert, FileText, MapPin,
} from "lucide-react";

const DEMO_PROJECT = DEMO_PROJECTS[0];
const MIN_RAISE = 3_000_000n * 10n ** 6n;

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(deadline: bigint | undefined) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const secs = Number(deadline) - Math.floor(Date.now() / 1000);
      if (secs <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true }); return; }
      setTimeLeft({
        d: Math.floor(secs / 86400),
        h: Math.floor((secs % 86400) / 3600),
        m: Math.floor((secs % 3600) / 60),
        s: secs % 60,
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return timeLeft;
}

// ── Countdown display ─────────────────────────────────────────────────────────
function CountdownTimer({ deadline }: { deadline: bigint | undefined }) {
  const t = useCountdown(deadline);
  if (!deadline) return null;
  if (t.expired) return (
    <div className="flex items-center gap-2 text-red-400 font-medium">
      <XCircle className="h-4 w-4" /> Sale Closed
    </div>
  );
  return (
    <div className="flex items-center gap-3">
      <Clock className="h-4 w-4 text-amber-400 shrink-0" />
      <div className="flex gap-2 font-mono text-sm">
        {[{ v: t.d, l: "d" }, { v: t.h, l: "h" }, { v: t.m, l: "m" }, { v: t.s, l: "s" }].map(({ v, l }) => (
          <div key={l} className="flex items-baseline gap-0.5">
            <span className="text-white font-bold text-base tabular-nums">{String(v).padStart(2, "0")}</span>
            <span className="text-gray-500 text-xs">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function Badge({ label, variant }: { label: string; variant: "green" | "amber" | "red" | "blue" | "gray" }) {
  const colours = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10  text-amber-400  border-amber-500/20",
    red:   "bg-red-500/10    text-red-400    border-red-500/20",
    blue:  "bg-blue-500/10   text-blue-400   border-blue-500/20",
    gray:  "bg-white/5       text-gray-400   border-white/10",
  };
  return <span className={`text-xs rounded-full border px-2.5 py-0.5 font-medium ${colours[variant]}`}>{label}</span>;
}

function emissionBadge(s: EmissionDepositStatus) {
  const m: Record<EmissionDepositStatus, "amber" | "green" | "blue" | "red"> = {
    Pending: "amber", Verified: "blue", Distributed: "green", Rejected: "red",
  };
  return <Badge label={s} variant={m[s]} />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ProjectDashboard() {
  return (
    <RoleGuard required="project">
      <ProjectContent />
    </RoleGuard>
  );
}

type Tab = "overview" | "deploy" | "sale" | "production" | "revenue-emissions" | "history" | "announcements" | "activity" | "geography";

function ProjectContent() {
  const { address }    = useAccount();
  const { isDemoMode } = useDemo();
  const [tab, setTab]  = useState<Tab>("overview");

  const { data: contracts } = useReadContract({
    address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "getProjectContracts",
    args: [address!], query: { enabled: !!address && !isDemoMode },
  });

  const liveDeployed = !isDemoMode && contracts && (contracts as any)[0] !== "0x0000000000000000000000000000000000000000";
  const deployed     = isDemoMode || liveDeployed;
  const [, sale, staking, , revenueRouter] = isDemoMode
    ? [DEMO_PROJECT.token, DEMO_PROJECT.sale, DEMO_PROJECT.staking, DEMO_PROJECT.burnVault, DEMO_PROJECT.revenueRouter]
    : ((contracts as any) ?? []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",          label: "Overview"            },
    { id: "deploy",            label: "Deploy"              },
    { id: "sale",              label: "Token Sale"          },
    { id: "production",        label: "Production"          },
    { id: "revenue-emissions", label: "Revenue & Emissions" },
    { id: "history",           label: "History"             },
    { id: "announcements",     label: "Announcements"       },
    { id: "geography",         label: "Holder Geography"    },
    { id: "activity",          label: "Activity"            },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Pickaxe className="h-8 w-8 text-amber-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isDemoMode ? DEMO_PROJECT.name : "Mining Project Dashboard"}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {isDemoMode ? <AddressDisplay address={DEMO_PROJECT.operator} /> : address ? <AddressDisplay address={address} /> : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDemoMode && DEMO_PROJECT.oversubscribed && (
            <Badge label="⚡ Oversubscribed" variant="amber" />
          )}
          {isDemoMode && DEMO_PROJECT.cancellationPending && (
            <Badge label="⏳ Cancellation Pending" variant="red" />
          )}
          {isDemoMode && (
            <span className="text-xs rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-400">
              Preview Data
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-px flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t.id ? "bg-white/10 text-white border-b-2 border-amber-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview"          && <OverviewTab          isDemoMode={isDemoMode} />}
      {tab === "deploy"            && <DeployTab            isDemoMode={isDemoMode} deployed={!!deployed} />}
      {tab === "sale"              && <SaleTab              isDemoMode={isDemoMode} sale={sale} deployed={!!deployed} />}
      {tab === "production"        && <ProductionTab        isDemoMode={isDemoMode} deployed={!!deployed} />}
      {tab === "revenue-emissions" && <RevenueEmissionsTab  isDemoMode={isDemoMode} revenueRouter={revenueRouter} deployed={!!deployed} />}
      {tab === "history"           && <HistoryTab           isDemoMode={isDemoMode} />}
      {tab === "announcements"     && <AnnouncementsTab     isDemoMode={isDemoMode} />}
      {tab === "geography"         && <HolderGeographyTab   isDemoMode={isDemoMode} />}
      {tab === "activity"          && <ActivityTab          isDemoMode={isDemoMode} />}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ isDemoMode }: { isDemoMode: boolean }) {
  const p   = DEMO_PROJECT;
  const pct = progressPercent(p.totalRaised, MIN_RAISE);
  const annualOunces = (Number(p.productionEstimate.ouncesPerDay) / 1e6) * (p.productionEstimate.schedule === "SevenDays" ? 365 : 260);
  const annualRevEst = annualOunces * DEMO_GOLD_PRICE_USD_PER_OZ;

  if (!isDemoMode) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {["Total Raised", "Sale Status", "Tokens Sold", "Total Staked"].map((l) => (
        <StatCard key={l} label={l} value="—" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Raised"    value={`$${formatUsdc(p.totalRaised, 0)}`}                                    sub="USDC" accent />
        <StatCard label="Sale Status"     value={p.oversubscribed ? "Oversubscribed" : p.finalized ? "Finalized" : "Live"} />
        <StatCard label="Tokens Sold"     value={`${(Number(p.totalTokensSold / 10n**18n)).toLocaleString()} ${p.symbol}`} />
        <StatCard label="Total Staked"    value={`${(Number(p.totalStaked / 10n**18n)).toLocaleString()} ${p.symbol}`}     />
        <StatCard label="Burn Bucket"     value={`$${formatUsdc(p.burnBucketBalance, 0)}`}                               sub="10% of raise" />
        <StatCard label="Comp. Bucket"    value={`$${formatUsdc(p.compensationBucketBalance, 0)}`}                       sub="5% of raise"  />
        <StatCard label="Annual Rev Est." value={`$${annualRevEst.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`@ $${DEMO_GOLD_PRICE_USD_PER_OZ}/oz`} />
        <StatCard label="Current Epoch"   value={p.currentEpoch.toString()}                                              sub="Staking epoch" />
      </div>

      {/* Raise progress */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Raise Progress</span>
          <span className="text-white font-medium">{pct.toFixed(1)}% of $3M minimum</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>${formatUsdc(p.totalRaised, 0)} raised</span>
          <CountdownTimer deadline={p.deadline} />
        </div>
      </div>

      {/* Oversubscription notice */}
      {p.oversubscribed && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-medium">
            <AlertTriangle className="h-4 w-4" /> Oversubscription Detected
          </div>
          <p className="text-sm text-gray-400">
            Raised <strong className="text-white">${formatUsdc(p.totalRaised, 0)}</strong> vs $3M minimum.
            Go to <strong>Token Sale</strong> tab to choose: claim target funds only or claim full raise
            (requires production payback viability).
          </p>
        </div>
      )}

      {/* Emission history table */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h3 className="font-medium text-white">Emission History (EmissionsVault)</h3>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 text-xs">
            {["#", "Amount", "Fee (10%)", "Net (90%)", "Status", "Epoch"].map((h) => (
              <th key={h} className="text-left px-5 py-2.5">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {p.emissions.map((e) => (
              <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-gray-400">#{e.id}</td>
                <td className="px-5 py-3 text-white">${formatUsdc(e.amount, 0)}</td>
                <td className="px-5 py-3 text-red-400">{e.feeAmount > 0n ? `$${formatUsdc(e.feeAmount, 0)}` : "—"}</td>
                <td className="px-5 py-3 text-emerald-400">{e.netAmount > 0n ? `$${formatUsdc(e.netAmount, 0)}` : "—"}</td>
                <td className="px-5 py-3">{emissionBadge(e.status)}</td>
                <td className="px-5 py-3 text-gray-400">{e.epochId > 0 ? `#${e.epochId}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Deploy ────────────────────────────────────────────────────────────────────
function DeployTab({ isDemoMode, deployed }: { isDemoMode: boolean; deployed: boolean }) {
  const [form, setForm] = useState({ name: "", symbol: "", totalSupply: "", priceUsd: "", daysOpen: "30" });
  const [simSuccess, setSimSuccess] = useState(false);
  const { writeContract, isPending, isSuccess } = useWriteContract();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (deployed) return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-center gap-3 text-emerald-400">
      <CheckCircle className="h-5 w-5 shrink-0" />
      <div>
        <p className="font-medium">Project contracts deployed</p>
        {isDemoMode && <p className="text-sm text-emerald-300/70 mt-0.5">Demo: {DEMO_PROJECT.name} · Token: {DEMO_PROJECT.symbol}</p>}
      </div>
    </div>
  );

  const deploy = () => {
    if (isDemoMode) { setSimSuccess(true); return; }
    const supply   = parseUnits(form.totalSupply, 18);
    const price    = parseUsdc(form.priceUsd);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.daysOpen) * 86400);
    writeContract({
      address: ADDRESSES.factory,
      abi: [{ name: "deployProject", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "tokenName", type: "string" }, { name: "tokenSymbol", type: "string" },
          { name: "totalSupply", type: "uint256" }, { name: "salePricePerToken", type: "uint256" },
          { name: "saleDeadline", type: "uint256" }], outputs: [] }],
      functionName: "deployProject", args: [form.name, form.symbol, supply, price, deadline],
    });
  };

  if (simSuccess) return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-center gap-3 text-emerald-400">
      <CheckCircle className="h-5 w-5" /> Deployment simulated in preview mode!
    </div>
  );

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-white">Deploy Token + Sale</h2>
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-amber-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Preview mode — deployment is simulated
        </div>
      )}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        {[
          { key: "name",        label: "Token Name",             placeholder: "Gold Mine Alpha Token" },
          { key: "symbol",      label: "Token Symbol",           placeholder: "GMA"                   },
          { key: "totalSupply", label: "Total Supply (tokens)",  placeholder: "10000000"              },
          { key: "priceUsd",    label: "Price per Token (USDC)", placeholder: "0.30"                  },
          { key: "daysOpen",    label: "Sale Duration (days)",   placeholder: "30"                    },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm text-gray-400 mb-1">{label}</label>
            <input value={form[key as keyof typeof form]} onChange={set(key)} placeholder={placeholder}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        ))}
        <div className="text-xs text-gray-500 space-y-1">
          <p>Minimum raise: $3,000,000 USDC. Protocol fee: 10%.</p>
          <p>At finalization: 10% → BurnVault burn bucket, 5% → BurnVault comp bucket, 75% → DisbursementScheduler.</p>
        </div>
        <button onClick={deploy} disabled={!isDemoMode && (isPending || !form.name || !form.symbol || !form.totalSupply || !form.priceUsd)}
          className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2.5 text-white font-medium transition"
        >
          {isPending ? "Deploying…" : isSuccess ? "Deployed!" : "Deploy Project Contracts"}
        </button>
      </div>
    </div>
  );
}

// ── Sale ──────────────────────────────────────────────────────────────────────
function SaleTab({ isDemoMode, sale, deployed }: { isDemoMode: boolean; sale: Address; deployed: boolean }) {
  const { writeContract, isPending } = useWriteContract();
  const [simMsg, setSimMsg] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);

  if (!deployed) return <p className="text-gray-400">Deploy your project first.</p>;

  const p        = DEMO_PROJECT;
  const raised   = isDemoMode ? p.totalRaised   : undefined;
  const deadline = isDemoMode ? p.deadline       : undefined;
  const price    = isDemoMode ? p.pricePerToken  : undefined;
  const finalized = isDemoMode ? p.finalized     : false;
  const oversubscribed = isDemoMode ? p.oversubscribed : false;
  const pct = raised && MIN_RAISE ? progressPercent(raised, MIN_RAISE) : 0;

  // Payback viability (demo)
  const annualOutput = isDemoMode ? (Number(p.productionEstimate.ouncesPerDay) / 1e6) * (p.productionEstimate.schedule === "SevenDays" ? 365 : 260) : 0;
  const annualRevenue = annualOutput * DEMO_GOLD_PRICE_USD_PER_OZ;
  const totalRaisedUsd = isDemoMode ? Number(p.totalRaised) / 1e6 : 0;
  const paybackViable = annualRevenue >= totalRaisedUsd;

  return (
    <div className="space-y-6 max-w-2xl">
      {simMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {simMsg}
        </div>
      )}

      {/* Countdown + Stats */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sale Closes</p>
            <p className="text-sm text-gray-300">{deadline ? formatDate(deadline) : "—"}</p>
          </div>
          <CountdownTimer deadline={deadline} />
        </div>
        <div className="h-px bg-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Raised"   value={raised    ? `$${formatUsdc(raised, 0)}`  : "—"} sub="USDC" accent />
          <StatCard label="Target"   value="$3,000,000"                                       sub="Minimum raise" />
          <StatCard label="Progress" value={`${Math.min(pct, 100).toFixed(1)}%`} />
          <StatCard label="Price"    value={price      ? `$${formatUsdc(price)}`       : "—"} sub="per token" />
          <StatCard label="Status"   value={finalized  ? "Finalized" : oversubscribed ? "Oversubscribed" : "Live"} />
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      {/* Oversubscription choice */}
      {oversubscribed && !finalized && isDemoMode && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-400">Oversubscribed — Choose Finalization Path</p>
              <p className="text-sm text-gray-400 mt-1">
                Raised ${formatUsdc(p.totalRaised, 0)} vs $3M minimum (
                {((Number(p.totalRaised) / 3_000_000e6 - 1) * 100).toFixed(1)}% over).
              </p>
            </div>
          </div>

          {/* Payback viability */}
          <div className={`rounded-lg border p-3 text-sm ${paybackViable ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <div className="flex items-center gap-2 mb-1">
              {paybackViable ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
              <span className={paybackViable ? "text-emerald-400" : "text-red-400"}>
                Full raise payback {paybackViable ? "viable" : "NOT viable"} at current price
              </span>
            </div>
            <p className="text-gray-400 ml-6">
              Annual output: {annualOutput.toFixed(2)} oz/yr × ${DEMO_GOLD_PRICE_USD_PER_OZ.toLocaleString()}/oz
              = <strong className="text-white">${annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
              {" "}vs raise <strong className="text-white">${totalRaisedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
              <p className="font-medium text-white">Option A: Target Only ($3M)</p>
              <p className="text-xs text-gray-400">
                Take $3M. Investors receive pro-rata excess USDC refund (~${formatUsdc((p.totalRaised - MIN_RAISE), 0)} returned).
              </p>
              <button
                onClick={() => setSimMsg("Target-only path chosen. Excess USDC will be refundable by investors.")}
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-white text-sm font-medium transition"
              >
                Claim Target Funds
              </button>
            </div>
            <div className={`rounded-lg border p-4 space-y-2 ${paybackViable ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/20 bg-red-500/5 opacity-60"}`}>
              <p className="font-medium text-white">Option B: Full Raise (${formatUsdc(p.totalRaised, 0)})</p>
              <p className="text-xs text-gray-400">
                Claim full amount. Requires production payback viability check to pass.
              </p>
              <button
                onClick={() => paybackViable ? setSimMsg("Full raise claimed. Payback viability confirmed by production oracle.") : setSimMsg("Cannot claim full raise — annual revenue insufficient.")}
                className={`w-full rounded-lg px-3 py-2 text-white text-sm font-medium transition ${paybackViable ? "bg-amber-600 hover:bg-amber-500" : "bg-red-900/30 cursor-not-allowed"}`}
              >
                {paybackViable ? "Claim Full Raise" : "Not Viable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize button (normal case) */}
      {!finalized && !oversubscribed && (
        <button
          onClick={() => {
            if (isDemoMode) { setSimMsg("Sale finalized. Funds routed to BurnVault (15%) and DisbursementScheduler (75%)."); return; }
            writeContract({ address: sale, abi: TOKEN_SALE_ABI, functionName: "finalize", args: [] });
          }}
          disabled={!isDemoMode && isPending}
          className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-6 py-2.5 text-white font-medium transition"
        >
          {isPending ? "Finalizing…" : "Finalize Sale"}
        </button>
      )}

      {/* Cancellation request */}
      {!finalized && !p.cancellationPending && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
          <p className="font-medium text-red-400">Request Cancellation</p>
          <p className="text-sm text-gray-400">
            Requesting cancellation pauses the sale and requires Admin Operator + Platform Exec approval before executing.
          </p>
          {cancelConfirm ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelConfirm(false); setSimMsg("Cancellation request submitted. Awaiting AO + Exec approval."); }}
                className="flex-1 rounded-lg bg-red-700 hover:bg-red-600 px-4 py-2 text-white text-sm font-medium transition"
              >
                Confirm Request
              </button>
              <button onClick={() => setCancelConfirm(false)} className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-white text-sm transition">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setCancelConfirm(true)} className="rounded-lg border border-red-500/30 px-4 py-2 text-red-400 text-sm hover:bg-red-500/10 transition">
              Request Cancellation
            </button>
          )}
        </div>
      )}
      {p.cancellationPending && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center gap-3 text-orange-400">
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-sm">Cancellation request pending — awaiting Admin Operator and Platform Exec approval.</p>
        </div>
      )}
    </div>
  );
}

// ── Production ────────────────────────────────────────────────────────────────
function ProductionTab({ isDemoMode, deployed }: { isDemoMode: boolean; deployed: boolean }) {
  const [estForm, setEstForm] = useState({ ouncesPerDay: "", schedule: "FiveDays", commodity: "GOLD", unit: "troy oz" });
  const [reportForm, setReportForm] = useState({ date: "", ounces: "" });
  const [evidenceCid, setEvidenceCid] = useState("");
  const [simMsg, setSimMsg] = useState("");

  if (!deployed) return <p className="text-gray-400">Deploy your project first.</p>;

  const p   = DEMO_PROJECT;
  const est = p.productionEstimate;

  // Annual output estimate (6-dec fixed → real)
  const ozPerDay    = Number(est.ouncesPerDay) / 1e6;
  const daysPerYear = est.schedule === "SevenDays" ? 365 : 260;
  const annualOz    = ozPerDay * daysPerYear;
  const annualRevEst = annualOz * DEMO_GOLD_PRICE_USD_PER_OZ;

  // 30-day avg from daily reports
  const recent30 = p.dailyReports.filter(r => r.date >= Date.now() - 30 * 86400 * 1000);
  const avgOz30  = recent30.length > 0
    ? recent30.reduce((acc, r) => acc + Number(r.actualOunces), 0) / recent30.length / 1e6
    : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      {simMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {simMsg}
        </div>
      )}

      {/* Current estimate */}
      {isDemoMode && est.set && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h3 className="font-semibold text-white">Production Estimate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Daily Output"    value={`${ozPerDay.toFixed(4)}`}                       sub={est.unit} />
            <StatCard label="Schedule"        value={est.schedule === "SevenDays" ? "7-day" : "5-day"} sub={`${daysPerYear} days/yr`} />
            <StatCard label="Annual Estimate" value={`${annualOz.toFixed(2)}`}                       sub={est.unit + "/yr"} />
            <StatCard label="Revenue Est."    value={`$${annualRevEst.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="@ current price" accent />
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center justify-between text-sm flex-wrap gap-2">
            <span className="text-gray-400">Live {est.commodityName} price:</span>
            <span className="text-white font-bold">${DEMO_GOLD_PRICE_USD_PER_OZ.toLocaleString()} / {est.unit}</span>
            <span className="text-emerald-400 text-xs">↑ +1.2% today</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">30-day avg actual output:</span>
            <span className="text-white font-medium">{avgOz30.toFixed(4)} {est.unit}/day</span>
            <span className={`text-xs ${avgOz30 >= ozPerDay ? "text-emerald-400" : "text-red-400"}`}>
              ({avgOz30 >= ozPerDay ? "+" : ""}{((avgOz30 / ozPerDay - 1) * 100).toFixed(1)}% vs estimate)
            </span>
          </div>
        </div>
      )}

      {/* Set estimate form */}
      {isDemoMode && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h3 className="font-semibold text-white">{est.set ? "Update" : "Set"} Production Estimate</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Daily Output (real units, e.g. 0.01 for 0.01 oz)</label>
              <input value={estForm.ouncesPerDay} onChange={e => setEstForm(f => ({ ...f, ouncesPerDay: e.target.value }))} placeholder="0.01"
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Operating Schedule</label>
              <select value={estForm.schedule} onChange={e => setEstForm(f => ({ ...f, schedule: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="FiveDays">5-day / week (260 days/yr)</option>
                <option value="SevenDays">7-day / week (365 days/yr)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Commodity</label>
              <input value={estForm.commodity} onChange={e => setEstForm(f => ({ ...f, commodity: e.target.value }))} placeholder="GOLD"
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Unit</label>
              <input value={estForm.unit} onChange={e => setEstForm(f => ({ ...f, unit: e.target.value }))} placeholder="troy oz"
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <button
            onClick={() => setSimMsg(`Estimate set: ${estForm.ouncesPerDay} ${estForm.unit}/day (${estForm.schedule}).`)}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-white text-sm font-medium transition"
          >
            Set Estimate On-Chain
          </button>
        </div>
      )}

      {/* Daily reports */}
      {isDemoMode && (
        <>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h3 className="font-semibold text-white">Submit Daily Output Report</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input type="date" value={reportForm.date} onChange={e => setReportForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Actual Output (in {est.unit})</label>
                <input value={reportForm.ounces} onChange={e => setReportForm(f => ({ ...f, ounces: e.target.value }))} placeholder="0.0098"
                  className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <IpfsUpload
                  label="Evidence (IPFS)"
                  value={evidenceCid}
                  onChange={setEvidenceCid}
                  isDemoMode={isDemoMode}
                  accept="image/*,.pdf"
                />
              </div>
            </div>
            {reportForm.ounces && parseFloat(reportForm.ounces) > 0 && (
              <div className="rounded-lg bg-white/5 p-3 text-sm text-gray-400">
                Notional value: <span className="text-white font-medium">
                  ${(parseFloat(reportForm.ounces) * DEMO_GOLD_PRICE_USD_PER_OZ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>{" "}@ ${DEMO_GOLD_PRICE_USD_PER_OZ}/oz
              </div>
            )}
            <button
              onClick={() => { setSimMsg(`Daily output reported: ${reportForm.ounces} ${est.unit} with IPFS evidence.`); setEvidenceCid(""); }}
              className="rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-white text-sm font-medium transition"
            >
              Submit Report On-Chain
            </button>
          </div>

          {/* Report history */}
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10">
              <h3 className="font-medium text-white text-sm">Daily Output History</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-500 text-xs">
                {["Date", "Actual Output", "vs Estimate", "Notional Value", "Evidence"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {p.dailyReports.slice().reverse().map((r) => {
                  const actualOz = Number(r.actualOunces) / 1e6;
                  const diff     = ozPerDay > 0 ? ((actualOz / ozPerDay) - 1) * 100 : 0;
                  return (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-5 py-3 text-gray-300">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-white">{actualOz.toFixed(4)} {est.unit}</td>
                      <td className={`px-5 py-3 font-medium ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                      </td>
                      <td className="px-5 py-3 text-gray-300">
                        ${(actualOz * DEMO_GOLD_PRICE_USD_PER_OZ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <a href={`https://ipfs.io/ipfs/${r.evidenceCid}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs"
                        >
                          IPFS <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Revenue & Emissions (merged) ──────────────────────────────────────────────
function RevenueEmissionsTab({ isDemoMode, revenueRouter, deployed }: { isDemoMode: boolean; revenueRouter: Address; deployed: boolean }) {
  const [grossStr, setGrossStr]       = useState("");
  const [taxRate,  setTaxRate]        = useState(28);
  const [proofCid, setProofCid]       = useState("");
  const [reportCid, setReportCid]     = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [simMsg, setSimMsg]           = useState("");
  const { writeContract: approve } = useWriteContract();
  const { writeContract: submit, isPending } = useWriteContract();

  if (!deployed) return <p className="text-gray-400">Deploy your project first.</p>;

  const gross       = parseFloat(grossStr) || 0;
  const taxProvision = gross * (taxRate / 100);
  const postTax      = gross - taxProvision;
  const platformFee  = postTax * 0.1;
  const netToStakers = postTax * 0.9;

  const canSubmit = gross > 0 && proofCid && reportCid && periodLabel;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isDemoMode) {
      setSimMsg(
        `Revenue for "${periodLabel}" submitted. Gross $${gross.toLocaleString(undefined, { maximumFractionDigits: 0 })} → ` +
        `Tax provision $${taxProvision.toLocaleString(undefined, { maximumFractionDigits: 0 })} → ` +
        `Net to stakers $${netToStakers.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Awaiting AO verification.`
      );
      setGrossStr(""); setProofCid(""); setReportCid(""); setPeriodLabel("");
      return;
    }
    const grossUsdc = parseUsdc(grossStr);
    approve({ address: ADDRESSES.usdc, abi: ERC20_ABI, functionName: "approve", args: [revenueRouter, grossUsdc] });
    submit({ address: revenueRouter, abi: REVENUE_ROUTER_ABI, functionName: "submitRevenue", args: [grossUsdc] });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {simMsg && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> {simMsg}
        </div>
      )}

      {/* Workflow */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="font-semibold text-white mb-3">Revenue → Emissions Workflow</h3>
        <ol className="space-y-2 text-sm text-gray-400">
          {[
            "Submit gross revenue with proof document and earnings report (both stored on IPFS)",
            "System deducts tax provision and 10% platform fee → calculates net to stakers",
            "Admin Operator reviews, uploads verification proof on-chain",
            "AO approves → 10% platform fee sent to admin, 90% of post-tax distributed to StakingPool",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="rounded-full bg-amber-500/20 text-amber-400 text-xs w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Submission form */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-400" /> Submit Revenue
        </h3>

        {/* Period + Gross + Tax Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Period</label>
            <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="e.g. March 2026"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gross Revenue (USDC)</label>
            <input value={grossStr} onChange={e => setGrossStr(e.target.value)} placeholder="350000" type="number"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tax Rate (%)</label>
            <input value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} type="number" min="0" max="100"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Live breakdown */}
        {gross > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2 text-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Emissions Breakdown</p>
            <div className="flex justify-between">
              <span className="text-gray-400">Gross Revenue</span>
              <span className="text-white font-medium">${gross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tax Provision ({taxRate}%)</span>
              <span className="text-red-400">− ${taxProvision.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Post-Tax Amount</span>
              <span className="text-gray-200">${postTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform Fee (10%)</span>
              <span className="text-red-400">− ${platformFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between font-semibold">
              <span className="text-gray-300">Net to Stakers (90%)</span>
              <span className="text-emerald-400">${netToStakers.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* IPFS uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <IpfsUpload
            label="Revenue Proof Document"
            value={proofCid}
            onChange={setProofCid}
            isDemoMode={isDemoMode}
            accept=".pdf,image/*"
          />
          <IpfsUpload
            label="Earnings Report"
            value={reportCid}
            onChange={setReportCid}
            isDemoMode={isDemoMode}
            accept=".pdf,.xlsx,.csv"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isDemoMode ? (isPending || !canSubmit) : !canSubmit}
          className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2.5 text-white font-medium transition"
        >
          {isPending ? "Confirming…" : "Submit Revenue & Trigger Emissions"}
        </button>
      </div>
    </div>
  );
}

// ── History ────────────────────────────────────────────────────────────────────
type HistorySubTab = "emissions" | "revenue";

function HistoryTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [sub, setSub] = useState<HistorySubTab>("revenue");
  const p = DEMO_PROJECT;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2 flex-wrap">
        <History className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">History</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-px">
        {([
          ["revenue",   "Revenue History"],
          ["emissions", "Emissions History"],
        ] as [HistorySubTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              sub === id ? "bg-white/10 text-white border-b-2 border-amber-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "revenue"   && <RevenueHistoryTable  isDemoMode={isDemoMode} submissions={p.revenueHistory} />}
      {sub === "emissions" && <EmissionsHistoryTable isDemoMode={isDemoMode} emissions={p.emissions} />}
    </div>
  );
}

function revStatusBadge(s: string) {
  const map: Record<string, string> = {
    Pending:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Verified:    "bg-blue-500/10  text-blue-400  border-blue-500/20",
    Distributed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Rejected:    "bg-red-500/10   text-red-400   border-red-500/20",
  };
  return (
    <span className={`text-xs rounded-full border px-2.5 py-0.5 font-medium ${map[s] ?? map.Pending}`}>{s}</span>
  );
}

function RevenueHistoryTable({ isDemoMode, submissions }: { isDemoMode: boolean; submissions: RevenueSubmission[] }) {
  if (!isDemoMode) return <p className="text-gray-400 text-sm">Connect wallet to view revenue history.</p>;
  if (submissions.length === 0) return <p className="text-gray-400 text-sm">No revenue submissions yet.</p>;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-white/10">
            {["Period", "Gross", "Tax", "Post-Tax", "Platform Fee", "Net to Stakers", "Status", "Proof", "Report"].map(h => (
              <th key={h} className="text-left px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {submissions.slice().reverse().map(r => (
            <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.periodLabel}</td>
              <td className="px-4 py-3 text-white">${formatUsdc(r.grossAmount, 0)}</td>
              <td className="px-4 py-3 text-red-400">−${formatUsdc(r.taxProvision, 0)}<span className="text-gray-600 ml-1">({r.taxRate}%)</span></td>
              <td className="px-4 py-3 text-gray-200">${formatUsdc(r.postTaxAmount, 0)}</td>
              <td className="px-4 py-3 text-red-400">−${formatUsdc(r.platformFee, 0)}</td>
              <td className="px-4 py-3 text-emerald-400 font-medium">${formatUsdc(r.netToStakers, 0)}</td>
              <td className="px-4 py-3">{revStatusBadge(r.status)}</td>
              <td className="px-4 py-3">
                {r.proofCid ? (
                  <a href={`https://ipfs.io/ipfs/${r.proofCid}`} target="_blank" rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                    Proof <ExternalLink className="h-3 w-3" />
                  </a>
                ) : <span className="text-gray-600 text-xs">Pending</span>}
              </td>
              <td className="px-4 py-3">
                <a href={`https://ipfs.io/ipfs/${r.earningsReportCid}`} target="_blank" rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 text-xs flex items-center gap-1">
                  Report <ExternalLink className="h-3 w-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Epoch Detail Panel (project view) ─────────────────────────────────────────
function EpochDetailPanel({ epoch }: { epoch: EpochDetail }) {
  const issueSeverityStyle = (s: EpochDetail["issues"][number]["severity"]) =>
    s === "high" ? "text-red-400 bg-red-500/10 border-red-500/20"
    : s === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-blue-400 bg-blue-500/10 border-blue-500/20";

  const openIssues = epoch.issues.filter(i => !i.resolved).length;

  return (
    <div className="bg-gray-950/60 border-t border-white/5 px-4 py-5 space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ore Mined",       value: `${epoch.totalOreMinedTonnes.toLocaleString()} t`,  icon: <Pickaxe className="h-4 w-4 text-amber-400" /> },
          { label: "Reported Purity", value: `${epoch.reportedPurity.toFixed(2)}%`,               icon: <BarChart3 className="h-4 w-4 text-emerald-400" /> },
          { label: "Processing Time", value: `${epoch.processingTimeHours}h`,                     icon: <Clock className="h-4 w-4 text-blue-400" /> },
          { label: "Output",          value: `${epoch.outputOunces.toFixed(2)} oz`,               icon: <Zap className="h-4 w-4 text-violet-400" /> },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 flex items-center gap-2">
            {m.icon}
            <div>
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-sm font-semibold text-white">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Operator Notes */}
      {epoch.notes && (
        <div className="text-sm text-gray-400 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Operator Notes</p>
          <p className="text-gray-300 leading-relaxed">{epoch.notes}</p>
        </div>
      )}

      {/* Certifications */}
      {epoch.certifications.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400" /> Certifications / Approvals
          </p>
          <div className="space-y-1.5">
            {epoch.certifications.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">Issued by {c.issuedBy} · {formatDate(c.issuedAt)}</p>
                </div>
                <a href={`https://ipfs.io/ipfs/${c.documentCid}`} target="_blank" rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Doc
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {epoch.issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <TriangleAlert className="h-3.5 w-3.5 text-amber-400" /> Issues ({openIssues} open)
          </p>
          <div className="space-y-1.5">
            {epoch.issues.map((iss, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2.5 space-y-1 ${issueSeverityStyle(iss.severity)}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{iss.description}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium capitalize ${issueSeverityStyle(iss.severity)}`}>{iss.severity}</span>
                    {iss.resolved
                      ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Resolved</span>
                      : <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Open</span>
                    }
                  </div>
                </div>
                {iss.resolved && iss.resolution && (
                  <p className="text-xs text-gray-400 italic">Resolution: {iss.resolution}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full report link */}
      <div className="flex items-center gap-3 pt-1">
        <a href={`https://ipfs.io/ipfs/${epoch.reportCid}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 px-3 py-2 text-amber-300 text-xs font-medium transition">
          <FileText className="h-3.5 w-3.5" /> Full Epoch Report (IPFS)
        </a>
        {epoch.verifiedAt
          ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Verified {formatDate(epoch.verifiedAt)}</span>
          : <span className="text-xs text-amber-400 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Awaiting verification</span>
        }
      </div>
    </div>
  );
}

function EmissionsHistoryTable({ isDemoMode, emissions }: { isDemoMode: boolean; emissions: EmissionDeposit[] }) {
  const [expandedEpochId, setExpandedEpochId] = useState<number | null>(null);
  if (!isDemoMode) return <p className="text-gray-400 text-sm">Connect wallet to view emissions history.</p>;
  if (emissions.length === 0) return <p className="text-gray-400 text-sm">No emissions recorded yet.</p>;

  const epochMap = new Map(DEMO_PROJECT.epochDetails.map(ed => [ed.epochId, ed]));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-white/10">
            {["#", "Amount", "Platform Fee (10%)", "Net to Stakers (90%)", "Status", "Epoch", "Earnings Report", "AO Proof", ""].map(h => (
              <th key={h} className="text-left px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emissions.slice().reverse().map(e => {
            const epochDetail = e.epochId > 0 ? epochMap.get(e.epochId) : undefined;
            const isExpanded = expandedEpochId === e.epochId;
            return (
              <>
                <tr key={e.id} className={`border-t border-white/5 transition ${epochDetail ? "cursor-pointer hover:bg-white/5" : ""} ${isExpanded ? "bg-white/5" : ""}`}
                  onClick={() => epochDetail && setExpandedEpochId(isExpanded ? null : e.epochId)}>
                  <td className="px-4 py-3 text-gray-500">#{e.id}</td>
                  <td className="px-4 py-3 text-white">${formatUsdc(e.amount, 0)}</td>
                  <td className="px-4 py-3 text-red-400">{e.feeAmount > 0n ? `$${formatUsdc(e.feeAmount, 0)}` : "—"}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">{e.netAmount > 0n ? `$${formatUsdc(e.netAmount, 0)}` : "—"}</td>
                  <td className="px-4 py-3">{emissionBadge(e.status)}</td>
                  <td className="px-4 py-3 text-gray-400">{e.epochId > 0 ? `#${e.epochId}` : "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`https://ipfs.io/ipfs/${e.earningsReportCid}`} target="_blank" rel="noopener noreferrer"
                      onClick={ev => ev.stopPropagation()}
                      className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {e.proofCid ? (
                      <a href={`https://ipfs.io/ipfs/${e.proofCid}`} target="_blank" rel="noopener noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                        Proof <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-gray-600 text-xs">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {epochDetail && (
                      isExpanded
                        ? <ChevronUp className="h-4 w-4 text-amber-400" />
                        : <ChevronDown className="h-4 w-4" />
                    )}
                  </td>
                </tr>
                {isExpanded && epochDetail && (
                  <tr key={`${e.id}-detail`} className="border-t border-amber-500/20">
                    <td colSpan={9} className="p-0">
                      <EpochDetailPanel epoch={epochDetail} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared announcement helpers ────────────────────────────────────────────────
function priorityStyle(p: AnnouncementPriority) {
  return {
    info:      { border: "border-blue-500/20",   bg: "bg-blue-500/5",   badge: "bg-blue-500/20 text-blue-300",   icon: <Megaphone className="h-4 w-4 text-blue-400" /> },
    warning:   { border: "border-amber-500/20",  bg: "bg-amber-500/5",  badge: "bg-amber-500/20 text-amber-300", icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
    important: { border: "border-red-500/20",    bg: "bg-red-500/5",    badge: "bg-red-500/20 text-red-300",     icon: <AlertTriangle className="h-4 w-4 text-red-400" /> },
  }[p];
}

export function AnnouncementCard({ ann }: { ann: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const s = priorityStyle(ann.priority);
  const age = Math.floor((Date.now() - ann.publishedAt) / 86400000);
  const ageStr = age === 0 ? "Today" : age === 1 ? "Yesterday" : `${age}d ago`;
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 space-y-2 cursor-pointer`} onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {s.icon}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              {ann.pinned && <Pin className="h-3 w-3 text-gray-400" />}
              <span className="text-sm font-semibold text-white">{ann.title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.badge}`}>{ann.priority}</span>
            </div>
            <p className="text-xs text-gray-500">{ann.authorName} · {ageStr}</p>
          </div>
        </div>
      </div>
      {expanded && <p className="text-sm text-gray-300 pt-1 pl-6 leading-relaxed">{ann.body}</p>}
    </div>
  );
}

// ── Holder Geography Tab ──────────────────────────────────────────────────────
function HolderGeographyTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-400 text-sm">Connect wallet to view holder geography data.</p>;

  const myGeo = DEMO_HOLDER_GEO.find(g => g.projectIndex === 0);
  if (!myGeo) return <p className="text-gray-400 text-sm">No geography data available yet.</p>;

  const maxConnections = Math.max(...myGeo.geoBreakdown.map(g => g.connections));

  const flagEmoji = (code: string) => {
    if (code === "XX") return "🌍";
    return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <MapPin className="h-5 w-5 text-blue-400" />
        <div>
          <h2 className="font-semibold text-white">Holder Geography</h2>
          <p className="text-xs text-gray-400">
            Indicative breakdown of where your token holders are connecting from.
            Updated: {new Date(myGeo.lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h3 className="font-medium text-white">Connection Origin Breakdown</h3>
        </div>
        <div className="p-5 space-y-4">
          {myGeo.geoBreakdown.map(geo => (
            <div key={geo.countryCode} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white">
                  <span className="text-base">{flagEmoji(geo.countryCode)}</span>
                  {geo.country}
                </span>
                <span className="text-gray-400">
                  {geo.connections.toLocaleString()} · <span className="text-blue-400 font-medium">{geo.percentage}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(geo.connections / maxConnections) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-xs text-gray-500">
            Total connections: <span className="text-white font-medium">
              {myGeo.geoBreakdown.reduce((a, g) => a + g.connections, 0).toLocaleString()}
            </span>
            {" · "}Connections from sanctioned jurisdictions are blocked by the platform.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Announcements Tab (project → investors) ───────────────────────────────────
function AnnouncementsTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("info");
  const [simMsg, setSimMsg]     = useState("");

  // This project's past announcements (projectIndex === 0 for demo)
  const mine = DEMO_ANNOUNCEMENTS.filter(a => a.from === "project" && a.projectIndex === 0);
  // Platform notifications sent TO projects
  const platform = DEMO_ANNOUNCEMENTS.filter(a => a.from === "platform" && (a.target === "projects" || a.target === "all"));

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    setSimMsg(`Announcement "${title}" published to all investors (simulated).`);
    setTitle(""); setBody("");
    setTimeout(() => setSimMsg(""), 5000);
  };

  return (
    <div className="space-y-7 max-w-2xl">
      {/* Platform notifications to this project */}
      {platform.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-violet-400" /> Platform Notifications
          </h2>
          {platform.map(a => <AnnouncementCard key={a.id} ann={a} />)}
        </div>
      )}

      {/* Compose new announcement */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-400" /> Post Announcement to Investors
        </h2>
        {isDemoMode && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-amber-300 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Preview mode — publish is simulated
          </div>
        )}
        {simMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-300 text-sm">
            <CheckCircle className="h-4 w-4 shrink-0" /> {simMsg}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q1 Production Update"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as AnnouncementPriority)}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="info" className="bg-gray-900">Info</option>
              <option value="warning" className="bg-gray-900">Warning</option>
              <option value="important" className="bg-gray-900">Important</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
            placeholder="Write your announcement for investors…"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
        <button onClick={submit} disabled={!title.trim() || !body.trim()}
          className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-5 py-2.5 text-white text-sm font-medium transition flex items-center gap-2"
        >
          <Megaphone className="h-4 w-4" /> Publish to Investors
        </button>
      </div>

      {/* Past announcements from this project */}
      {mine.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Your Past Announcements</h2>
          {mine.map(a => <AnnouncementCard key={a.id} ann={a} />)}
        </div>
      )}
    </div>
  );
}

// ── Activity ──────────────────────────────────────────────────────────────────
function ActivityTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-400">Connect wallet to view on-chain activity.</p>;

  const p   = DEMO_PROJECT;
  const act = p.onChainActivity;

  const txIcon: Record<string, React.ReactNode> = {
    Transfer: <ArrowUpRight className="h-3.5 w-3.5 text-blue-400"   />,
    Stake:    <TrendingUp   className="h-3.5 w-3.5 text-emerald-400" />,
    Unstake:  <TrendingUp   className="h-3.5 w-3.5 text-amber-400 rotate-180" />,
    Burn:     <Zap          className="h-3.5 w-3.5 text-red-400"     />,
    Claim:    <CheckCircle  className="h-3.5 w-3.5 text-purple-400"  />,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Holders"        value={p.holderCount.toLocaleString()} />
        <StatCard label="Total Txns"     value={p.transactionCount.toLocaleString()} />
        <StatCard label="DeFi Locked"    value={`${(Number(act.totalDeFiLocked) / 1e18 / 1000).toFixed(0)}K ${p.symbol}`} />
        <StatCard label="Protocols"      value={act.defiProtocols.length.toString()} sub="active" />
      </div>

      {/* DeFi protocol breakdown */}
      {act.defiProtocols.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            <h3 className="font-medium text-white text-sm">DeFi Protocol Exposure</h3>
          </div>
          <div className="p-4 space-y-3">
            {act.defiProtocols.map((proto) => {
              const pct = Number(act.totalDeFiLocked) > 0
                ? (Number(proto.locked) / Number(act.totalDeFiLocked)) * 100 : 0;
              return (
                <div key={proto.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <a href={proto.link} target="_blank" rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
                        {proto.name} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <span>{(Number(proto.locked) / 1e18 / 1000).toFixed(0)}K {p.symbol}</span>
                      <span className="text-gray-500">≈</span>
                      <span className="text-emerald-400">${formatUsdc(proto.tvlUsdc, 0)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-400" />
          <h3 className="font-medium text-white text-sm">Recent Token Activity</h3>
        </div>
        <div className="divide-y divide-white/5">
          {act.recentTxs.map((tx) => {
            const age = Math.floor((Date.now() - tx.timestamp) / 60000);
            const ageStr = age < 60 ? `${age}m ago` : `${Math.floor(age / 60)}h ago`;
            const isUsdc = tx.type === "Claim";
            const amount = isUsdc
              ? `$${formatUsdc(tx.amount, 0)}`
              : `${(Number(tx.amount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${p.symbol}`;
            return (
              <div key={tx.hash} className="px-5 py-3 flex items-center gap-3 hover:bg-white/5">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  {txIcon[tx.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{tx.type}</span>
                    <span className="text-sm text-gray-300">{amount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="truncate">From: {tx.from}</span>
                    <span>→</span>
                    <span className="truncate">To: {tx.to}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">{ageStr}</span>
                  <a href={tx.blockExplorer} target="_blank" rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Basescan link */}
      <a
        href={`https://basescan.org/token/${DEMO_PROJECT.token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
      >
        View all {DEMO_PROJECT.symbol} activity on Basescan <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
