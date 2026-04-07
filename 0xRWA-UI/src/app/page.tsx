"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRole } from "@/hooks/useRole";
import { useDemo } from "@/context/DemoContext";
import { useAccount } from "wagmi";
import {
  Pickaxe, TrendingUp, ShieldCheck, Briefcase, Gavel, ArrowRight, Eye,
  Zap, Globe, ChevronRight, CheckCircle, Building2, Coins, BarChart3,
  Lock, Layers, Star, X, Send, User, Mail, Phone, MapPin, DollarSign,
} from "lucide-react";
import type { Role } from "@/hooks/useRole";

// ── Nano banana colour tokens ──────────────────────────────────────────────────
// Primary:  yellow-400  (#FACC15)
// Glow:     yellow-500  (#EAB308)
// Muted:    yellow-300  (#FDE047)
// BG tint:  yellow-950/10

const IS_PRODUCTION =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

// ── Signup modal ───────────────────────────────────────────────────────────────
function InvestorSignupModal({ onClose }: { onClose: () => void }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [wallet, setWallet] = useState("");
  const [done,  setDone]  = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-gray-950 shadow-2xl shadow-yellow-500/10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            <span className="font-semibold text-white">Investor Sign-Up</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-yellow-500/20 p-4">
              <CheckCircle className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Application Submitted!</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              Our team will review your application and contact you within 24 hours. Welcome to 0xRWA.
            </p>
            <button onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <FormField icon={<User className="h-4 w-4" />} label="Full Name" value={name}
              onChange={setName} placeholder="John Smith" required />
            <FormField icon={<Mail className="h-4 w-4" />} label="Email Address" type="email"
              value={email} onChange={setEmail} placeholder="john@example.com" required />
            <FormField icon={<MapPin className="h-4 w-4" />} label="Country of Residence"
              value={country} onChange={setCountry} placeholder="e.g. United Kingdom" required />
            <FormField icon={<Coins className="h-4 w-4" />} label="Wallet Address (optional)"
              value={wallet} onChange={setWallet} placeholder="0x…" />
            <p className="text-xs text-gray-500">
              By submitting you consent to KYC verification. Investments subject to eligibility check.
            </p>
            <button type="submit"
              className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 text-sm transition flex items-center justify-center gap-2">
              <Send className="h-4 w-4" /> Submit Application
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ProjectSignupModal({ onClose }: { onClose: () => void }) {
  const [company, setCompany]   = useState("");
  const [contact, setContact]   = useState("");
  const [email, setEmail]       = useState("");
  const [country, setCountry]   = useState("");
  const [commodity, setCommodity] = useState("");
  const [raise, setRaise]       = useState("");
  const [website, setWebsite]   = useState("");
  const [done, setDone]         = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-gray-950 shadow-2xl shadow-amber-500/10 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-gray-950 z-10">
          <div className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5 text-amber-400" />
            <span className="font-semibold text-white">Mining Project Sign-Up</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-amber-500/20 p-4">
              <CheckCircle className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Application Received!</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              Our Admin Operator will review your submission and reach out within 48 hours for KYC onboarding.
            </p>
            <button onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <FormField icon={<Building2 className="h-4 w-4" />} label="Company / Project Name"
              value={company} onChange={setCompany} placeholder="Apex Gold Mine Ltd" required />
            <FormField icon={<User className="h-4 w-4" />} label="Primary Contact Name"
              value={contact} onChange={setContact} placeholder="Jane Doe" required />
            <FormField icon={<Mail className="h-4 w-4" />} label="Business Email" type="email"
              value={email} onChange={setEmail} placeholder="jane@minecompany.com" required />
            <FormField icon={<MapPin className="h-4 w-4" />} label="Country of Operation"
              value={country} onChange={setCountry} placeholder="e.g. South Africa" required />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Commodity Type</label>
              <select value={commodity} onChange={e => setCommodity(e.target.value)} required
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="" className="bg-gray-900">Select commodity…</option>
                {["Gold","Silver","Copper","Nickel","Lithium","Cobalt","Platinum","Other"].map(c => (
                  <option key={c} value={c} className="bg-gray-900">{c}</option>
                ))}
              </select>
            </div>
            <FormField icon={<DollarSign className="h-4 w-4" />} label="Estimated Capital Raise (USD)"
              value={raise} onChange={setRaise} placeholder="e.g. 3,000,000" required />
            <FormField icon={<Globe className="h-4 w-4" />} label="Website (optional)"
              value={website} onChange={setWebsite} placeholder="https://minecompany.com" />
            <p className="text-xs text-gray-500">
              All projects must meet the $3M minimum raise and pass full KYC/AML verification before listing.
            </p>
            <button type="submit"
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 text-sm transition flex items-center justify-center gap-2">
              <Send className="h-4 w-4" /> Submit for Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FormField({
  icon, label, type = "text", value, onChange, placeholder, required,
}: {
  icon: React.ReactNode; label: string; type?: string;
  value: string; onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          className="w-full rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500"
        />
      </div>
    </div>
  );
}

// ── Role card ──────────────────────────────────────────────────────────────────
const DASHBOARD_CARDS = [
  {
    role:        "investor"      as Role,
    href:        "/investor",
    label:       "Investor Dashboard",
    icon:        <TrendingUp  className="h-5 w-5" />,
    color:       "indigo",
    description: "Buy into raises, stake tokens, claim weekly USDC emissions.",
  },
  {
    role:        "project"       as Role,
    href:        "/project",
    label:       "Mining Project Dashboard",
    icon:        <Pickaxe     className="h-5 w-5" />,
    color:       "amber",
    description: "Issue your project token, run a compliant raise, submit revenue.",
  },
  {
    role:        "admin"         as Role,
    href:        "/admin",
    label:       "Admin Dashboard",
    icon:        <ShieldCheck className="h-5 w-5" />,
    color:       "emerald",
    description: "Approve projects, control disbursements and emissions.",
    adminOnly:   true,
  },
  {
    role:        "adminOperator" as Role,
    href:        "/admin-operator",
    label:       "Admin Operator",
    icon:        <Briefcase   className="h-5 w-5" />,
    color:       "violet",
    description: "Review documents, manage project onboarding.",
    adminOnly:   true,
  },
  {
    role:        "platformExec"  as Role,
    href:        "/platform-exec",
    label:       "Platform Executive",
    icon:        <Gavel       className="h-5 w-5" />,
    color:       "rose",
    description: "Final approval authority for all governance actions.",
    adminOnly:   true,
  },
];

export default function Home() {
  const { isConnected }             = useAccount();
  const { role }                    = useRole();
  const { setDemoRole, isDemoMode } = useDemo();
  const router                      = useRouter();
  const [investorModal, setInvestorModal] = useState(false);
  const [projectModal,  setProjectModal]  = useState(false);

  const dashboardCard = DASHBOARD_CARDS.find((c) => c.role === role);
  const myDashboard   = dashboardCard?.href ?? null;

  const handlePreview = (r: Role, href: string) => {
    setDemoRole(r);
    router.push(href);
  };

  const visibleCards = IS_PRODUCTION
    ? DASHBOARD_CARDS.filter((c) => !(c as any).adminOnly)
    : DASHBOARD_CARDS;

  return (
    <>
      {investorModal && <InvestorSignupModal onClose={() => setInvestorModal(false)} />}
      {projectModal  && <ProjectSignupModal  onClose={() => setProjectModal(false)}  />}

      <div className="space-y-20 pb-20">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center text-center gap-8 pt-12 pb-4">
          {/* Banana glow backdrop */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-yellow-500/8 blur-[80px] pointer-events-none" />

          {/* Logo mark */}
          <div className="relative flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 p-3 shadow-lg shadow-yellow-500/30">
              <Pickaxe className="h-8 w-8 text-black" />
            </div>
            <div className="text-left">
              <p className="text-xs text-yellow-400 font-semibold tracking-widest uppercase">0xRWA</p>
              <p className="text-xl font-black text-white leading-tight tracking-tight">Mining Edition</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-sm text-yellow-300">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            Built on Base · Settled in USDC · Fully On-Chain
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight max-w-4xl">
            Mining Revenue,<br />
            <span className="text-yellow-400">Tokenised On-Chain</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            Mining projects raise capital, issue tokens, and share weekly USDC revenue with investors —
            all enforced by audited smart contracts on Base. No intermediaries. No delays.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setInvestorModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-7 py-3.5 text-black font-bold transition shadow-lg shadow-yellow-500/20 text-sm">
              <TrendingUp className="h-4 w-4" /> Invest Now
            </button>
            <button onClick={() => setProjectModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-7 py-3.5 text-white font-semibold transition text-sm">
              <Pickaxe className="h-4 w-4" /> List Your Mine
            </button>
            {myDashboard && (
              <Link href={myDashboard}
                className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 px-7 py-3.5 text-yellow-300 font-semibold transition text-sm">
                My Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {!isConnected && !isDemoMode && (
              <ConnectButton label="Connect Wallet" />
            )}
          </div>

          {isDemoMode && (
            <button onClick={() => setDemoRole(null)}
              className="text-sm text-gray-500 hover:text-gray-300 underline transition">
              Exit preview mode
            </button>
          )}
        </section>

        {/* ── Stats bar ───────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/10 overflow-hidden">
          {[
            { label: "Projects Live",      value: "3"      },
            { label: "Total Capital Raised",value: "$13M+"  },
            { label: "Weekly Emissions",    value: "USDC"   },
            { label: "Settlement Chain",    value: "Base"   },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-6 text-center">
              <p className="text-3xl font-bold text-yellow-400">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">How 0xRWA Works</h2>
            <p className="text-gray-400">From mine to staker in four transparent steps</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: "01", icon: <Building2 className="h-6 w-6 text-yellow-400" />,
                title: "Mine Applies",
                desc: "Mining company passes KYC/AML, submits proof of ownership, and is approved by the platform.",
              },
              {
                step: "02", icon: <Coins className="h-6 w-6 text-amber-400" />,
                title: "Token Raise",
                desc: "Project deploys ERC-20 token and runs a regulated $3M+ USDC raise on-chain.",
              },
              {
                step: "03", icon: <BarChart3 className="h-6 w-6 text-yellow-400" />,
                title: "Revenue Submitted",
                desc: "Mine submits monthly revenue. Platform takes 10% fee; 90% flows to token stakers as USDC.",
              },
              {
                step: "04", icon: <Zap className="h-6 w-6 text-amber-400" />,
                title: "Weekly Emissions",
                desc: "Stakers claim weekly USDC proportional to their stake. Burn tokens at any time for USDC from the burn vault.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 relative overflow-hidden">
                <span className="absolute top-4 right-4 text-5xl font-black text-yellow-500/8 select-none">{step}</span>
                <div className="rounded-xl bg-white/5 w-10 h-10 flex items-center justify-center">{icon}</div>
                <h3 className="font-bold text-white">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Cards ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Investor CTA */}
          <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-8 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-yellow-500/20 p-3">
                <TrendingUp className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Invest in Mining</h3>
                <p className="text-gray-400 text-sm mt-1">Earn weekly USDC from real gold, copper, and silver production</p>
              </div>
            </div>
            <ul className="space-y-2.5 flex-1">
              {[
                "Access fully verified, on-chain mining projects",
                "Stake tokens → earn weekly USDC emissions",
                "Burn tokens for USDC from the burn vault (10% of raise)",
                "Real-time epoch reporting & production transparency",
                "Exit via secondary market or burn mechanism",
              ].map(p => (
                <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" /> {p}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setInvestorModal(true)}
                className="rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 text-sm transition shadow-lg shadow-yellow-500/20 flex items-center gap-2">
                <Send className="h-4 w-4" /> Apply as Investor
              </button>
              <button onClick={() => handlePreview("investor", "/investor")}
                className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 font-medium px-6 py-3 text-sm transition flex items-center gap-2">
                <Eye className="h-4 w-4" /> Preview Dashboard
              </button>
            </div>
          </div>

          {/* Project CTA */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-8 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/20 p-3">
                <Pickaxe className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">List Your Mine</h3>
                <p className="text-gray-400 text-sm mt-1">Raise capital from global investors with full compliance built in</p>
              </div>
            </div>
            <ul className="space-y-2.5 flex-1">
              {[
                "$3M+ minimum raise via smart contract token sale",
                "10% of raise held in burn vault for investor protection",
                "Monthly revenue submission with on-chain verification",
                "Automated USDC disbursement to token stakers each epoch",
                "Full document & team verification by Admin Operator",
              ].map(p => (
                <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {p}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setProjectModal(true)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 text-sm transition shadow-lg shadow-amber-500/20 flex items-center gap-2">
                <Send className="h-4 w-4" /> Apply to List
              </button>
              <button onClick={() => handlePreview("project", "/project")}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium px-6 py-3 text-sm transition flex items-center gap-2">
                <Eye className="h-4 w-4" /> Preview Dashboard
              </button>
            </div>
          </div>
        </section>

        {/* ── Trust / Security ──────────────────────────────────────────── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Built for Trust</h2>
            <p className="text-gray-400">Every safeguard is enforced by code, not promises</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: <Lock className="h-6 w-6 text-yellow-400" />,
                title: "Smart Contract Enforced",
                desc: "Revenue flows, burn mechanics, and disbursements are executed by audited contracts — no human can divert funds.",
              },
              {
                icon: <Layers className="h-6 w-6 text-yellow-400" />,
                title: "IPFS Document Trail",
                desc: "All KYC documents, production reports, certifications, and earnings reports are stored immutably on IPFS.",
              },
              {
                icon: <Globe className="h-6 w-6 text-yellow-400" />,
                title: "Geography Compliance",
                desc: "Connections from sanctioned jurisdictions are blocked automatically. Blacklisted wallet interactions trigger immediate flags.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                <div className="rounded-xl bg-yellow-500/10 w-10 h-10 flex items-center justify-center">{icon}</div>
                <h3 className="font-bold text-white">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dashboard previews ─────────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-gray-500">
              Preview any dashboard instantly — no wallet required
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleCards.map((card) => {
              const colorMap: Record<string, { border: string; icon: string; btn: string }> = {
                indigo:  { border: "border-indigo-500/20",  icon: "bg-indigo-500/15 text-indigo-400",  btn: "bg-indigo-600 hover:bg-indigo-500" },
                amber:   { border: "border-amber-500/20",   icon: "bg-amber-500/15 text-amber-400",    btn: "bg-amber-600 hover:bg-amber-500"   },
                emerald: { border: "border-emerald-500/20", icon: "bg-emerald-500/15 text-emerald-400",btn: "bg-emerald-600 hover:bg-emerald-500"},
                violet:  { border: "border-violet-500/20",  icon: "bg-violet-500/15 text-violet-400",  btn: "bg-violet-600 hover:bg-violet-500" },
                rose:    { border: "border-rose-500/20",    icon: "bg-rose-500/15 text-rose-400",      btn: "bg-rose-600 hover:bg-rose-500"     },
              };
              const c = colorMap[card.color];
              const isActive = role === card.role;
              return (
                <div key={card.role}
                  className={`rounded-xl border ${c.border} bg-white/5 p-5 flex flex-col gap-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${c.icon}`}>{card.icon}</div>
                    <div>
                      <p className="font-semibold text-white text-sm">{card.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{card.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handlePreview(card.role, card.href)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 ${c.btn}`}>
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                    {isActive && myDashboard === card.href && (
                      <Link href={card.href}
                        className="rounded-lg border border-white/20 hover:bg-white/10 px-3 py-2 text-xs font-medium text-white transition flex items-center gap-1">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <section className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 p-1.5">
              <Pickaxe className="h-4 w-4 text-black" />
            </div>
            <span className="font-semibold text-gray-400">0xRWA Mining Edition</span>
          </div>
          <p>Built on Base · All contracts are open source · Powered by USDC</p>
        </section>
      </div>
    </>
  );
}
