"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContracts } from "wagmi";
import { type Address } from "viem";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatCard } from "@/components/ui/StatCard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useDemo } from "@/context/DemoContext";
import { ADDRESSES, TOKEN_SALE_ABI, STAKING_ABI, BURN_RESERVE_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatUsdc, formatToken, parseUsdc, parseToken, progressPercent, formatDate } from "@/lib/utils";
import { DEMO_PROJECTS, DEMO_INVESTOR, DEMO_GOLD_PRICE_USD_PER_OZ, DEMO_ANNOUNCEMENTS } from "@/lib/demo-data";
import { TrendingUp, Flame, Coins, ShoppingCart, CheckCircle, AlertTriangle, FileText, Clock, XCircle, Globe, Users, Zap, ExternalLink, Megaphone, Newspaper, Twitter, Linkedin, MessageCircle, Send, ChevronDown, ChevronUp, Shield, TriangleAlert } from "lucide-react";
import type { ProjectDocument, EpochDetail } from "@/lib/demo-data";
import { AnnouncementCard } from "@/app/project/page";

const MIN_RAISE = 3_000_000n * 10n ** 6n;

export default function InvestorDashboard() {
  return (
    <RoleGuard required="investor">
      <InvestorContent />
    </RoleGuard>
  );
}

function InvestorContent() {
  const { isDemoMode } = useDemo();
  const [tab, setTab]  = useState<"explore" | "portfolio" | "stake" | "burn" | "earnings" | "news" | "docs">("explore");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Investor Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Invest · Stake · Earn · Burn</p>
          </div>
        </div>
        {isDemoMode && (
          <span className="text-xs rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-400">
            Preview Data
          </span>
        )}
      </div>

      {/* Portfolio summary (demo) */}
      {isDemoMode && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="USDC Balance"      value={`$${formatUsdc(DEMO_INVESTOR.usdcBalance, 0)}`} accent />
          <StatCard label="Projects Invested" value={DEMO_INVESTOR.holdings.length.toString()} />
          <StatCard label="Claimable USDC"
            value={`$${formatUsdc(DEMO_INVESTOR.holdings.reduce((a, h) => a + h.claimableEpochs.reduce((b, e) => b + e.amount, 0n), 0n))}`}
            sub="Pending emissions"
          />
          <StatCard label="Tokens Staked"     value={DEMO_INVESTOR.holdings.map((h) => {
            const p = DEMO_PROJECTS[h.projectIndex];
            return `${(Number(h.stakedBalance / 10n**18n)).toLocaleString()} ${p.symbol}`;
          }).join(", ")} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-px flex-wrap">
        {([
          { id: "explore",   label: "Explore Sales",    icon: <ShoppingCart className="h-3.5 w-3.5" /> },
          { id: "portfolio", label: "Portfolio",         icon: <TrendingUp   className="h-3.5 w-3.5" /> },
          { id: "stake",     label: "Stake & Earn",     icon: <Coins        className="h-3.5 w-3.5" /> },
          { id: "burn",      label: "Burn",              icon: <Flame        className="h-3.5 w-3.5" /> },
          { id: "earnings",  label: "Earnings",          icon: <Zap          className="h-3.5 w-3.5" /> },
          { id: "news",      label: "News & Updates",   icon: <Newspaper    className="h-3.5 w-3.5" /> },
          { id: "docs",      label: "Project Docs",     icon: <FileText     className="h-3.5 w-3.5" /> },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition flex items-center gap-1.5 ${
              tab === t.id ? "bg-white/10 text-white border-b-2 border-indigo-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "explore"   && <ExploreTab   isDemoMode={isDemoMode} />}
      {tab === "portfolio" && <PortfolioTab isDemoMode={isDemoMode} />}
      {tab === "stake"     && <StakeTab     isDemoMode={isDemoMode} />}
      {tab === "burn"      && <BurnTab      isDemoMode={isDemoMode} />}
      {tab === "earnings"  && <EarningsTab  isDemoMode={isDemoMode} />}
      {tab === "news"      && <NewsTab      isDemoMode={isDemoMode} />}
      {tab === "docs"      && <DocsTab      isDemoMode={isDemoMode} />}
    </div>
  );
}

// ── Earnings Tab ──────────────────────────────────────────────────────────────
function EarningsTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-500 text-sm">Connect wallet to view earnings.</p>;

  const totalClaimable = DEMO_INVESTOR.holdings.reduce(
    (a, h) => a + h.claimableEpochs.reduce((b, e) => b + e.amount, 0n), 0n
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Live commodity price banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Live Gold Price</p>
            <p className="text-2xl font-bold text-amber-400">${DEMO_GOLD_PRICE_USD_PER_OZ.toLocaleString()} / troy oz</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">24h change</p>
            <p className="text-emerald-400 font-medium">+1.2% (+$27.42)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Source</p>
            <a href="https://metals.live" target="_blank" rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              metals.live <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Claimable summary */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Claimable" value={`$${formatUsdc(totalClaimable, 0)}`} sub="Pending staking rewards" accent />
        <StatCard label="Projects with Earnings" value={DEMO_INVESTOR.holdings.filter(h => h.claimableEpochs.length > 0).length.toString()} />
      </div>

      {/* Per-project earnings + notional daily output */}
      {DEMO_INVESTOR.holdings.map((holding) => {
        const project = DEMO_PROJECTS[holding.projectIndex];
        const est     = project.productionEstimate;
        const totalHeld = holding.tokenBalance + holding.stakedBalance;
        const totalSupply = project.totalSupply;
        const investorShare = totalSupply > 0n ? Number(totalHeld * 10_000n / totalSupply) / 100 : 0;

        // Notional daily earnings = investor's share × project daily output × gold price
        const ozPerDay       = est.set ? Number(est.ouncesPerDay) / 1e6 : 0;
        const investorOzDay  = ozPerDay * (investorShare / 100);
        const dailyNotional  = investorOzDay * DEMO_GOLD_PRICE_USD_PER_OZ;

        const claimable = holding.claimableEpochs.reduce((a, e) => a + e.amount, 0n);

        return (
          <div key={holding.projectIndex} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{project.name}</h3>
                <p className="text-xs text-gray-500">{investorShare.toFixed(3)}% of total supply</p>
              </div>
              <span className="text-xs rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-indigo-300">{project.symbol}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Your Tokens" value={`${(Number(totalHeld / 10n**18n)).toLocaleString()}`} sub={project.symbol} />
              <StatCard label="Claimable" value={`$${formatUsdc(claimable, 0)}`} sub="Staking rewards" accent={claimable > 0n} />
              {est.set && (
                <>
                  <StatCard label="Daily Output (est.)" value={`${investorOzDay.toFixed(6)}`} sub={est.unit + "/day"} />
                  <StatCard label="Notional Daily" value={`$${dailyNotional.toFixed(2)}`} sub="@ current gold price" />
                </>
              )}
            </div>

            {/* Claimable epochs */}
            {holding.claimableEpochs.length > 0 && (
              <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs font-medium text-gray-400">Claimable Epochs</p>
                </div>
                <div className="divide-y divide-white/5">
                  {holding.claimableEpochs.map((epoch) => (
                    <div key={epoch.epochId.toString()} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-300">Epoch #{epoch.epochId.toString()}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-medium text-sm">${formatUsdc(epoch.amount, 2)}</span>
                        <button className="text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-white transition">
                          Claim
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emissions history from EmissionsVault (distributed) */}
            {project.emissions.filter(e => e.status === "Distributed").length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Emissions Distributed (your share)</p>
                <div className="space-y-1.5">
                  {project.emissions.filter(e => e.status === "Distributed").map(e => {
                    const yourShare = totalSupply > 0n && e.netAmount > 0n
                      ? Number(e.netAmount) * investorShare / 100
                      : 0;
                    return (
                      <div key={e.id} className="flex justify-between text-sm text-gray-400 rounded-lg bg-white/5 px-3 py-2">
                        <span>Epoch #{e.epochId} emission</span>
                        <span className="text-white">${(yourShare / 1e6).toFixed(2)} your share</span>
                        <span className="text-gray-500">/ ${formatUsdc(e.netAmount, 0)} total</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Epoch Detail Panel ────────────────────────────────────────────────────────
function EpochDetailPanel({ epoch, symbol }: { epoch: EpochDetail; symbol: string }) {
  const [open, setOpen] = useState(false);
  const severityStyle = { low: "text-amber-400", medium: "text-orange-400", high: "text-red-400" };
  const severityBg   = { low: "bg-amber-500/10 border-amber-500/20", medium: "bg-orange-500/10 border-orange-500/20", high: "bg-red-500/10 border-red-500/20" };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-white">Epoch #{epoch.epochId}</span>
          <span className="text-xs text-gray-500">
            {new Date(epoch.periodStart).toLocaleDateString()} – {new Date(epoch.periodEnd).toLocaleDateString()}
          </span>
          <span className="text-sm text-emerald-400 font-medium">{epoch.outputOunces.toLocaleString()} oz output</span>
          {epoch.issues.filter(i => !i.resolved).length > 0 && (
            <span className="text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5">
              {epoch.issues.filter(i => !i.resolved).length} open issue{epoch.issues.filter(i => !i.resolved).length > 1 ? "s" : ""}
            </span>
          )}
          {epoch.verifiedAt
            ? <span className="text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified</span>
            : <span className="text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending verification</span>
          }
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />}
      </button>

      {/* Detail content */}
      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-5">
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Raw Ore Mined</p>
              <p className="text-sm font-semibold text-white mt-0.5">{epoch.totalOreMinedTonnes.toLocaleString()} t</p>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Reported Purity</p>
              <p className={`text-sm font-semibold mt-0.5 ${epoch.reportedPurity >= 99 ? "text-emerald-400" : epoch.reportedPurity >= 97 ? "text-amber-400" : "text-red-400"}`}>
                {epoch.reportedPurity.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Processing Time</p>
              <p className="text-sm font-semibold text-white mt-0.5">{epoch.processingTimeHours}h</p>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-500">Output</p>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5">{epoch.outputOunces.toLocaleString()} oz</p>
            </div>
          </div>

          {/* Notes */}
          {epoch.notes && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Operator Notes</p>
              <p className="text-sm text-gray-300">{epoch.notes}</p>
            </div>
          )}

          {/* Certifications */}
          {epoch.certifications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" /> Certifications & Approvals
              </p>
              <div className="space-y-2">
                {epoch.certifications.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-4 py-2.5">
                    <div>
                      <p className="text-sm text-white font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">Issued by {c.issuedBy} · {new Date(c.issuedAt).toLocaleDateString()}</p>
                    </div>
                    {c.documentCid && (
                      <a href={`https://ipfs.io/ipfs/${c.documentCid}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {epoch.issues.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5 text-amber-400" /> Issues Encountered
              </p>
              <div className="space-y-2">
                {epoch.issues.map((issue, i) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 ${severityBg[issue.severity]}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${severityStyle[issue.severity]}`}>{issue.description}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${issue.resolved ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                        {issue.resolved ? "Resolved" : "Open"}
                      </span>
                    </div>
                    {issue.resolution && (
                      <p className="text-xs text-gray-400 mt-1.5 pl-0">Resolution: {issue.resolution}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report link */}
          <div className="flex items-center gap-3 pt-1">
            <a href={`https://ipfs.io/ipfs/${epoch.reportCid}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
              <FileText className="h-3.5 w-3.5" /> Full Report (IPFS) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── News & Updates Tab ─────────────────────────────────────────────────────────
function NewsTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-500 text-sm">Connect wallet to view news and announcements.</p>;

  // Platform-wide announcements targeted at investors
  const platformAnns  = DEMO_ANNOUNCEMENTS.filter(a => a.from === "platform" && (a.target === "investors" || a.target === "all"));
  // Project announcements from projects the investor holds
  const projectAnns   = DEMO_ANNOUNCEMENTS.filter(a => a.from === "project" && (a.target === "investors" || a.target === "all"));

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Platform announcements */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-violet-400" /> Platform Announcements
        </h2>
        {platformAnns.length === 0 && <p className="text-gray-500 text-sm">No platform announcements.</p>}
        {platformAnns.map(a => <AnnouncementCard key={a.id} ann={a} />)}
      </section>

      {/* Project announcements */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-400" /> Project Announcements
        </h2>
        {projectAnns.length === 0 && <p className="text-gray-500 text-sm">No project announcements.</p>}
        {projectAnns.map(a => <AnnouncementCard key={a.id} ann={a} />)}
      </section>

      {/* Per-project: news feed + social links + epoch details */}
      {DEMO_PROJECTS.map((p, pi) => (
        <section key={pi} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-amber-400" /> {p.name}
            </h2>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {p.socialLinks?.x && (
                <a href={p.socialLinks.x} target="_blank" rel="noopener noreferrer" title="X / Twitter"
                  className="text-gray-400 hover:text-white transition">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {p.socialLinks?.linkedin && (
                <a href={p.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn"
                  className="text-gray-400 hover:text-blue-400 transition">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {p.socialLinks?.discord && (
                <a href={p.socialLinks.discord} target="_blank" rel="noopener noreferrer" title="Discord"
                  className="text-gray-400 hover:text-indigo-400 transition">
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
              {p.socialLinks?.telegram && (
                <a href={p.socialLinks.telegram} target="_blank" rel="noopener noreferrer" title="Telegram"
                  className="text-gray-400 hover:text-sky-400 transition">
                  <Send className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* News feed */}
          {p.news?.length > 0 && (
            <div className="space-y-2">
              {p.news.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs rounded-full bg-white/10 text-gray-400 px-2 py-0.5">{item.source}</span>
                        <span className="text-xs text-gray-500">{new Date(item.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-medium text-white group-hover:text-amber-300 transition">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.snippet}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-amber-400 transition shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Epoch details */}
          {p.epochDetails?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Epoch Reports</p>
              {p.epochDetails.slice().reverse().map(ep => (
                <EpochDetailPanel key={ep.epochId} epoch={ep} symbol={p.symbol} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
function DocsTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) {
    return <p className="text-gray-500 text-sm">Connect wallet to view project documents.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Project documentation verified by the platform Admin Operator. Documents marked{" "}
        <span className="text-emerald-400">Verified</span> have been confirmed with relevant government authorities.
      </p>

      {DEMO_PROJECTS.map((p) => {
        const verifiedCount = p.documents.filter((d) => d.status === "Verified").length;
        const teamVerified  = p.team.filter((m) => m.verified).length;

        return (
          <div key={p.operator} className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white text-lg">{p.name}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">{p.symbol}</span>
                </div>
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    <Globe className="h-3 w-3" /> {p.website}
                  </a>
                )}
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-400">{verifiedCount}/{p.documents.length} docs verified</span>
                <span className="text-blue-400 flex items-center gap-1">
                  <Users className="h-3 w-3" />{teamVerified}/{p.team.length} team verified
                </span>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2 mb-4">
              {p.documents.map((doc) => (
                <DocRow key={doc.id} doc={doc} />
              ))}
            </div>

            {/* Team */}
            {p.team.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Personnel</p>
                <div className="flex flex-wrap gap-3">
                  {p.team.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                      {member.verified
                        ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        : <Clock       className="h-3.5 w-3.5 text-amber-400"  />
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DocRow({ doc }: { doc: ProjectDocument }) {
  const typeLabel: Record<string, string> = {
    OwnershipProof:        "Ownership",
    GovernmentVerification:"Gov. Verified",
    TeamPhoto:             "Team Photo",
    TeamBio:               "Team Bio",
    WebsiteEvidence:       "Website",
    Other:                 "Other",
  };
  const typeBg: Record<string, string> = {
    OwnershipProof:        "bg-blue-500/20 text-blue-300",
    GovernmentVerification:"bg-violet-500/20 text-violet-300",
    TeamPhoto:             "bg-amber-500/20 text-amber-300",
    TeamBio:               "bg-indigo-500/20 text-indigo-300",
    WebsiteEvidence:       "bg-cyan-500/20 text-cyan-300",
    Other:                 "bg-gray-500/20 text-gray-300",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
      {doc.status === "Verified"
        ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
        : doc.status === "Rejected"
        ? <XCircle     className="h-4 w-4 text-red-400 shrink-0"     />
        : <Clock       className="h-4 w-4 text-amber-400 shrink-0"   />
      }
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white">{doc.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBg[doc.docType] ?? typeBg.Other}`}>
            {typeLabel[doc.docType] ?? doc.docType}
          </span>
          <span className={`text-xs font-medium ${
            doc.status === "Verified" ? "text-emerald-400"
            : doc.status === "Rejected" ? "text-red-400"
            : "text-amber-400"
          }`}>{doc.status}</span>
        </div>
        {doc.notes && <p className="text-xs text-gray-500 mt-0.5">{doc.notes}</p>}
      </div>
      <a
        href={`https://ipfs.io/ipfs/${doc.ipfsHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 hover:text-blue-300 shrink-0 transition"
      >
        View
      </a>
    </div>
  );
}

// ── Explore Tab ───────────────────────────────────────────────────────────────
function ExploreTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (isDemoMode) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEMO_PROJECTS.map((p, i) => <DemoSaleCard key={i} project={p} />)}
      </div>
    );
  }
  return (
    <div className="text-gray-500 text-sm">
      Connect wallet to view live sales.
    </div>
  );
}

function DemoSaleCard({ project }: { project: typeof DEMO_PROJECTS[0] }) {
  const [buyAmount, setBuyAmount] = useState("");
  const [simMsg,    setSimMsg]    = useState("");
  const pct = progressPercent(project.totalRaised, MIN_RAISE);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{project.name}</h3>
          <AddressDisplay address={project.operator} />
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          project.finalized ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
        }`}>
          {project.finalized ? "Finalized" : "Live"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-400">Token: <span className="text-white">{project.symbol}</span></span>
        <span className="text-gray-400">Price: <span className="text-white">${formatUsdc(project.pricePerToken)}</span></span>
        <span className="text-gray-400">Raised: <span className="text-white">${formatUsdc(project.totalRaised, 0)}</span></span>
        <span className="text-gray-400">Closes: <span className="text-white">{project.finalized ? "Done" : formatDate(project.deadline)}</span></span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{pct.toFixed(1)}% of $3M min</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      {simMsg ? (
        <div className="flex items-center gap-2 text-emerald-300 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> {simMsg}
        </div>
      ) : !project.finalized ? (
        <div className="flex gap-2">
          <input value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} placeholder="USDC amount"
            className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={() => { setSimMsg(`Bought ${(parseFloat(buyAmount) / Number(formatUsdc(project.pricePerToken))).toFixed(0)} ${project.symbol}!`); setBuyAmount(""); }}
            disabled={!buyAmount}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-white text-sm font-medium transition"
          >
            Buy
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-1">Sale complete — tokens are tradeable</p>
      )}
    </div>
  );
}

// ── Portfolio Tab ─────────────────────────────────────────────────────────────
function PortfolioTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-500 text-sm">Connect wallet to view your portfolio.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">My Holdings</h2>
      <div className="space-y-4">
        {DEMO_INVESTOR.holdings.map((h, i) => {
          const project = DEMO_PROJECTS[h.projectIndex];
          const totalClaimable = h.claimableEpochs.reduce((a, e) => a + e.amount, 0n);
          return (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">{project.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{project.symbol} · ${formatUsdc(project.pricePerToken)}/token</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  project.finalized ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {project.finalized ? "Finalized" : "Active Sale"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Token Balance",  value: `${(Number(h.tokenBalance / 10n**18n)).toLocaleString()} ${project.symbol}` },
                  { label: "Staked",         value: `${(Number(h.stakedBalance / 10n**18n)).toLocaleString()} ${project.symbol}` },
                  { label: "USDC Invested",  value: `$${formatUsdc(h.contribution, 0)}` },
                  { label: "Claimable",      value: `$${formatUsdc(totalClaimable)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Claimable epochs */}
              {h.claimableEpochs.length > 0 && (
                <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/20 px-4 py-3">
                  <p className="text-xs text-indigo-300 font-medium mb-2">Pending Emissions</p>
                  <div className="flex flex-wrap gap-2">
                    {h.claimableEpochs.map((e) => (
                      <span key={e.epochId.toString()} className="text-xs rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-indigo-300">
                        Epoch #{e.epochId.toString()} · ${formatUsdc(e.amount)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stake Tab ─────────────────────────────────────────────────────────────────
function StakeTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-500 text-sm">Connect wallet to stake tokens.</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Stake Tokens &amp; Earn Weekly USDC</h2>
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-300">
        <Coins className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Staked tokens earn proportional USDC from weekly mine emissions. Only wallets staked at the snapshot receive that week's emission.</p>
      </div>
      {DEMO_PROJECTS.map((p, i) => <DemoStakePanel key={i} project={p} holding={DEMO_INVESTOR.holdings.find((h) => h.projectIndex === i)} />)}
    </div>
  );
}

function DemoStakePanel({ project, holding }: { project: typeof DEMO_PROJECTS[0]; holding?: typeof DEMO_INVESTOR.holdings[0] }) {
  const [amount,     setAmount]     = useState("");
  const [claimEpoch, setClaimEpoch] = useState("");
  const [simMsg,     setSimMsg]     = useState("");

  const staked    = holding?.stakedBalance ?? 0n;
  const available = holding ? holding.tokenBalance - holding.stakedBalance : 0n;
  const shareOfPool = project.totalStaked > 0n ? Number(staked * 10000n / project.totalStaked) / 100 : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">{project.name}</h3>
          <p className="text-sm text-gray-400">{project.symbol}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-white font-medium">{(Number(staked / 10n**18n)).toLocaleString()} {project.symbol} staked</p>
          <p className="text-gray-500">{shareOfPool.toFixed(2)}% of pool</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Epoch</p>
          <p className="text-white font-medium">{project.currentEpoch.toString()}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Pool Total</p>
          <p className="text-white font-medium">{(Number(project.totalStaked / 10n**18n)).toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Available</p>
          <p className="text-white font-medium">{(Number(available / 10n**18n)).toLocaleString()}</p>
        </div>
      </div>

      {simMsg && (
        <div className="flex items-center gap-2 text-emerald-300 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> {simMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Stake / Unstake */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Amount to stake/unstake</label>
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Token amount"
              className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={() => { setSimMsg(`Staked ${amount} ${project.symbol}`); setAmount(""); }} disabled={!amount}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2 text-white text-sm font-medium transition"
            >Stake</button>
            <button onClick={() => { setSimMsg(`Unstaked ${amount} ${project.symbol}`); setAmount(""); }} disabled={!amount}
              className="rounded-lg border border-white/20 hover:bg-white/10 disabled:opacity-50 px-3 py-2 text-white text-sm font-medium transition"
            >Out</button>
          </div>
        </div>

        {/* Claim */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Claim epoch emission</label>
          <div className="flex gap-2">
            <input value={claimEpoch} onChange={(e) => setClaimEpoch(e.target.value)} placeholder="Epoch ID"
              className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => {
                const epoch = holding?.claimableEpochs.find((e) => e.epochId.toString() === claimEpoch);
                setSimMsg(epoch ? `Claimed $${formatUsdc(epoch.amount)} USDC for epoch #${claimEpoch}` : `Claimed epoch #${claimEpoch}`);
                setClaimEpoch("");
              }}
              disabled={!claimEpoch}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-white text-sm font-medium transition whitespace-nowrap"
            >
              Claim USDC
            </button>
          </div>
        </div>
      </div>

      {/* Claimable epochs hint */}
      {holding && holding.claimableEpochs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {holding.claimableEpochs.map((e) => (
            <button key={e.epochId.toString()}
              onClick={() => { setClaimEpoch(e.epochId.toString()); }}
              className="text-xs rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-indigo-300 hover:bg-indigo-500/20 transition"
            >
              Epoch #{e.epochId.toString()} → ${formatUsdc(e.amount)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Burn Tab ──────────────────────────────────────────────────────────────────
function BurnTab({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) return <p className="text-gray-500 text-sm">Connect wallet to burn tokens.</p>;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
          <Flame className="h-4 w-4 shrink-0" /> Token Burn — Permanent &amp; Irreversible
        </div>
        <p className="text-sm text-gray-400">
          Burning tokens permanently removes them from supply. In return you receive{" "}
          <strong className="text-white">10% of the original sale price</strong> per token, paid
          from the project's BurnVault burn bucket (funded at 10% of the total raise).
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm text-gray-400">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">How Burn Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {[
            { step: "1", label: "You send tokens", detail: "Tokens are sent to the BurnVault and permanently destroyed" },
            { step: "2", label: "BurnVault pays out", detail: "10% of sale price per token deducted from the burn bucket" },
            { step: "3", label: "You receive USDC", detail: "Payout sent directly to your wallet" },
          ].map(({ step, label, detail }) => (
            <div key={step} className="rounded-lg bg-white/5 p-3">
              <span className="rounded-full bg-red-500/20 text-red-400 text-xs w-6 h-6 flex items-center justify-center mx-auto mb-2">{step}</span>
              <p className="text-white font-medium text-xs">{label}</p>
              <p className="text-gray-500 text-xs mt-1">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {DEMO_PROJECTS.map((p, i) => (
        <DemoBurnPanel key={i} project={p} holding={DEMO_INVESTOR.holdings.find((h) => h.projectIndex === i)} />
      ))}
    </div>
  );
}

function DemoBurnPanel({ project, holding }: { project: typeof DEMO_PROJECTS[0]; holding?: typeof DEMO_INVESTOR.holdings[0] }) {
  const [amount, setAmount] = useState("");
  const [simMsg, setSimMsg] = useState("");

  // pricePerToken is in 6-decimal USDC (e.g. 300_000 = $0.30)
  const salePriceUsd  = Number(project.pricePerToken) / 1e6;
  const payoutPerTok  = salePriceUsd * 0.1;                    // 10% of sale price
  const tokenAmt      = parseFloat(amount || "0");
  const payout        = tokenAmt * payoutPerTok;
  const balance       = holding ? Number(holding.tokenBalance / 10n**18n) : 0;
  const burnBucket    = project.burnBucketBalance;             // USDC 6-dec
  const totalBurned   = Number(project.totalBurnedTokens / 10n**18n);
  const canBurn       = tokenAmt > 0 && tokenAmt <= balance && payout <= Number(burnBucket) / 1e6;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">{project.name}</h3>
          <p className="text-xs text-gray-500">{project.symbol}</p>
        </div>
        <Flame className="h-5 w-5 text-red-400" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sale Price",       value: `$${salePriceUsd.toFixed(2)}/token` },
          { label: "Burn Payout Rate", value: `$${payoutPerTok.toFixed(3)}/token`, sub: "10% of sale price" },
          { label: "Burn Bucket",      value: `$${formatUsdc(burnBucket, 0)}`,     sub: "Available to pay out" },
          { label: "Your Balance",     value: `${balance.toLocaleString()} ${project.symbol}` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-white mt-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Total burned so far */}
      {totalBurned > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Flame className="h-3 w-3 text-red-500" />
          {totalBurned.toLocaleString()} {project.symbol} already burned by all investors
        </div>
      )}

      {simMsg ? (
        <div className="flex items-center gap-2 text-emerald-300 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0" /> {simMsg}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tokens to burn</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`e.g. 1000 (balance: ${balance.toLocaleString()})`}
              type="number"
              min="0"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500"
            />
          </div>

          {tokenAmt > 0 && (
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Tokens burned</span>
                <span className="text-white">{tokenAmt.toLocaleString()} {project.symbol}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Rate</span>
                <span className="text-gray-200">{tokenAmt.toLocaleString()} × ${payoutPerTok.toFixed(3)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between font-semibold">
                <span className="text-gray-300">USDC received</span>
                <span className="text-emerald-400">${payout.toFixed(2)}</span>
              </div>
              {tokenAmt > balance && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Exceeds your token balance
                </p>
              )}
              {payout > Number(burnBucket) / 1e6 && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Exceeds burn bucket balance
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              if (!canBurn) return;
              setSimMsg(`Burned ${tokenAmt.toLocaleString()} ${project.symbol} → received $${payout.toFixed(2)} USDC from BurnVault`);
              setAmount("");
            }}
            disabled={!canBurn}
            className="w-full rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 px-4 py-2.5 text-white font-medium transition flex items-center justify-center gap-2"
          >
            <Flame className="h-4 w-4" /> Burn Tokens for USDC
          </button>
        </div>
      )}
    </div>
  );
}
