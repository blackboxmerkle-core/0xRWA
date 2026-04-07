"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { type Address } from "viem";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatCard } from "@/components/ui/StatCard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useDemo } from "@/context/DemoContext";
import { useProjects } from "@/hooks/useProjects";
import { ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";
import { formatUsdc } from "@/lib/utils";
import { DEMO_PROJECTS, DEMO_ADMIN, type ProjectStatus } from "@/lib/demo-data";
import {
  ShieldCheck, Ban, UserCheck, Plus, AlertTriangle, CheckCircle,
  Pause, Play, XCircle, LogOut, BarChart2, Wallet, Zap, Clock,
  FileText, Users, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";

export default function AdminDashboard() {
  return (
    <RoleGuard required="admin">
      <AdminContent />
    </RoleGuard>
  );
}

type Tab = "projects" | "approve" | "bans";

function AdminContent() {
  const { isDemoMode } = useDemo();
  const { projects: liveProjects } = useProjects();
  const [tab, setTab] = useState<Tab>("projects");

  const projects    = isDemoMode ? DEMO_PROJECTS : liveProjects;
  const activeCount = projects.filter((p) => p.active).length;
  const totalRaised = isDemoMode
    ? DEMO_PROJECTS.reduce((acc, p) => acc + p.totalRaised, 0n)
    : 0n;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-emerald-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">System oversight and governance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Projects"  value={activeCount} accent />
        <StatCard label="Total Raised"     value={`$${formatUsdc(totalRaised, 0)}`} sub="across all raises" />
        <StatCard label="Treasury Balance" value={`$${formatUsdc(isDemoMode ? DEMO_ADMIN.treasuryBalance : 0n, 0)}`} sub="Protocol fees" />
        <StatCard label="Banned Addresses" value={isDemoMode ? DEMO_ADMIN.recentBans.length : 0} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-px">
        {([
          ["projects", "Projects"],
          ["approve",  "Approve Project"],
          ["bans",     "Bans"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t ? "bg-white/10 text-white border-b-2 border-indigo-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "projects" && <ProjectsTab projects={projects} isDemoMode={isDemoMode} />}
      {tab === "approve"  && <ApproveTab  isDemoMode={isDemoMode} />}
      {tab === "bans"     && <BansTab     isDemoMode={isDemoMode} />}
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────
function ProjectsTab({ projects, isDemoMode }: { projects: typeof DEMO_PROJECTS; isDemoMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">All Projects ({projects.length})</h2>
      {projects.length === 0 && <p className="text-gray-500 text-sm">No projects registered yet.</p>}
      <div className="space-y-3">
        {projects.map((p) => (
          <div key={p.operator} className="rounded-xl border border-white/10 bg-white/5">
            {/* Summary row */}
            <div
              className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 cursor-pointer"
              onClick={() => setExpanded(expanded === p.operator ? null : p.operator)}
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white text-lg">{p.name}</span>
                  <StatusBadge status={p.status} />
                  {p.finalized && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Finalized</span>}
                  {p.transfersPaused && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">Transfers Paused</span>}
                  {p.emissionsPaused && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">Emissions Paused</span>}
                  {p.disbursementPaused && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Disbursement Paused</span>}
                  {p.missedEpochs > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/20 text-red-300">{p.missedEpochs} Missed Epoch{p.missedEpochs !== 1 ? "s" : ""}</span>}
                </div>
                <AddressDisplay address={p.operator} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    { label: "Raised",    value: `$${formatUsdc(p.totalRaised, 0)}` },
                    { label: "Holders",   value: (p.holderCount ?? 0).toLocaleString() },
                    { label: "Epoch",     value: p.currentEpoch.toString() },
                    { label: "Interval",  value: p.disbursementInterval },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-medium text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                {expanded === p.operator ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {/* Expanded controls */}
            {expanded === p.operator && (
              <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-6">
                <ProjectStats project={p} />
                <ProjectControls project={p} isDemoMode={isDemoMode} />
                <DisbursementControls project={p} isDemoMode={isDemoMode} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, string> = {
    Active:    "bg-emerald-500/20 text-emerald-400",
    Paused:    "bg-yellow-500/20 text-yellow-300",
    Cancelled: "bg-red-500/20 text-red-400",
    Withdrawn: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

// ── Project Statistics ────────────────────────────────────────────────────────
function ProjectStats({ project }: { project: typeof DEMO_PROJECTS[0] }) {
  const disbursedPct = project.totalFunded > 0n
    ? Number((project.totalDisbursed * 100n) / project.totalFunded)
    : 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-indigo-400" /> Project Statistics
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Holders",       value: (project.holderCount ?? 0).toLocaleString(), icon: <Users className="h-3 w-3" /> },
          { label: "Transactions",  value: (project.transactionCount ?? 0).toLocaleString(), icon: <TrendingUp className="h-3 w-3" /> },
          { label: "Disbursed",     value: `$${formatUsdc(project.totalDisbursed, 0)}`, icon: <Wallet className="h-3 w-3" /> },
          { label: "Remaining",     value: `$${formatUsdc(project.totalFunded - project.totalDisbursed, 0)}`, icon: <Clock className="h-3 w-3" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
            <p className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>
      {/* Disbursement progress */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Funds disbursed to project</span>
          <span>{disbursedPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-indigo-500"
            style={{ width: `${Math.min(disbursedPct, 100)}%` }}
          />
        </div>
        {project.missedEpochs > 0 && (
          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Disbursement blocked — {project.missedEpochs} missed emission epoch{project.missedEpochs !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Admin Controls ────────────────────────────────────────────────────────────
function ProjectControls({ project, isDemoMode }: { project: typeof DEMO_PROJECTS[0]; isDemoMode: boolean }) {
  const [simMsg, setSimMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const sim = (msg: string) => {
    setSimMsg(msg);
    setConfirmAction(null);
    setTimeout(() => setSimMsg(null), 3000);
  };

  const isActive    = project.status === "Active";
  const isCancelled = project.status === "Cancelled";
  const isWithdrawn = project.status === "Withdrawn";
  const isSettled   = isCancelled || isWithdrawn;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" /> Admin Controls
      </h3>

      {simMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {simMsg}
        </div>
      )}

      {/* Confirmation gate */}
      {confirmAction && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-900/20 p-4 space-y-2">
          <p className="text-sm text-red-300 font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {confirmAction === "cancel"   && "Cancel project? Investors will receive 150% of burn value (15% of ICO price per token). Undistributed funds returned minus 10% platform fee."}
            {confirmAction === "withdraw" && "Withdraw project? This removes the project from the platform. Only valid if no funds have been received."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => sim(`Project ${confirmAction === "cancel" ? "cancelled" : "withdrawn"} (simulated)`)}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-xs font-medium hover:bg-white/20 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Pause / Unpause Transfers */}
        {isActive && !project.transfersPaused && (
          <ControlBtn
            icon={<Pause className="h-3.5 w-3.5" />}
            label="Pause Transfers"
            color="yellow"
            onClick={() => isDemoMode ? sim("Token transfers paused (simulated)") : undefined}
          />
        )}
        {isActive && project.transfersPaused && (
          <ControlBtn
            icon={<Play className="h-3.5 w-3.5" />}
            label="Unpause Transfers"
            color="emerald"
            onClick={() => isDemoMode ? sim("Token transfers unpaused (simulated)") : undefined}
          />
        )}

        {/* Pause / Unpause Emissions */}
        {isActive && !project.emissionsPaused && (
          <ControlBtn
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Pause Emissions"
            color="orange"
            onClick={() => isDemoMode ? sim("Emissions paused (simulated)") : undefined}
          />
        )}
        {isActive && project.emissionsPaused && (
          <ControlBtn
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Unpause Emissions"
            color="emerald"
            onClick={() => isDemoMode ? sim("Emissions unpaused (simulated)") : undefined}
          />
        )}

        {/* Cancel */}
        {!isSettled && (
          <ControlBtn
            icon={<XCircle className="h-3.5 w-3.5" />}
            label="Cancel Project"
            color="red"
            onClick={() => isDemoMode ? setConfirmAction("cancel") : undefined}
          />
        )}

        {/* Withdraw (pre-launch only) */}
        {isActive && !project.finalized && !project.failed && !project.cancelled && (
          <ControlBtn
            icon={<LogOut className="h-3.5 w-3.5" />}
            label="Withdraw Project"
            color="red"
            onClick={() => isDemoMode ? setConfirmAction("withdraw") : undefined}
          />
        )}
      </div>

      {!isDemoMode && isActive && (
        <p className="mt-2 text-xs text-gray-600 italic">Connect as admin to execute on-chain</p>
      )}
    </div>
  );
}

// ── Disbursement Controls ─────────────────────────────────────────────────────
function DisbursementControls({ project, isDemoMode }: { project: typeof DEMO_PROJECTS[0]; isDemoMode: boolean }) {
  const [interval, setInterval] = useState(project.disbursementInterval);
  const [simMsg, setSimMsg]     = useState<string | null>(null);

  const sim = (msg: string) => { setSimMsg(msg); setTimeout(() => setSimMsg(null), 3000); };

  const intervals = ["Monthly", "Bi-Monthly", "Quarterly", "Half-Yearly"] as const;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-blue-400" /> Disbursement Controls
      </h3>

      {simMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {simMsg}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {/* Interval selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Release Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as typeof interval)}
            className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {intervals.map((iv) => (
              <option key={iv} value={iv} className="bg-gray-900">{iv}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => isDemoMode ? sim(`Interval changed to ${interval} (simulated)`) : undefined}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
        >
          Update Interval
        </button>

        {/* Pause / Unpause */}
        {!project.disbursementPaused ? (
          <ControlBtn
            icon={<Pause className="h-3.5 w-3.5" />}
            label="Pause Disbursement"
            color="yellow"
            onClick={() => isDemoMode ? sim("Disbursement paused (simulated)") : undefined}
          />
        ) : (
          <ControlBtn
            icon={<Play className="h-3.5 w-3.5" />}
            label="Unpause Disbursement"
            color="emerald"
            onClick={() => isDemoMode ? sim("Disbursement unpaused (simulated)") : undefined}
          />
        )}
      </div>

      {project.missedEpochs > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Disbursement auto-held: operator has {project.missedEpochs} unfunded emission epoch{project.missedEpochs !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ── Shared button component ───────────────────────────────────────────────────
function ControlBtn({
  icon, label, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: "yellow" | "orange" | "red" | "emerald" | "blue";
  onClick?: () => void;
}) {
  const colors = {
    yellow:  "border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20",
    orange:  "border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20",
    red:     "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    blue:    "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition ${colors[color]}`}
    >
      {icon} {label}
    </button>
  );
}

// ── Approve Tab ───────────────────────────────────────────────────────────────
function ApproveTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [operator, setOperator] = useState("");
  const [name,     setName]     = useState("");
  const [success,  setSuccess]  = useState(false);
  const { writeContract, isPending } = useWriteContract();

  const submit = () => {
    if (!operator || !name) return;
    if (isDemoMode) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); return; }
    writeContract({ address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "approveProject", args: [operator as Address, name] });
  };

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-white">Approve Mining Project</h2>
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-amber-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Preview mode — form actions are simulated
        </div>
      )}
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Operator Address</label>
          <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="0x..."
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Project Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gold Mine Alpha"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button onClick={submit} disabled={isPending || !operator || !name}
          className={`w-full rounded-lg px-4 py-2.5 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${
            success ? "bg-green-600" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {success ? <><CheckCircle className="h-4 w-4" />Approved!</> : isPending ? "Confirming…" : "Approve Project"}
        </button>
      </div>
    </div>
  );
}

// ── Bans Tab ──────────────────────────────────────────────────────────────────
function BansTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [single, setSingle] = useState("");
  const [bulk,   setBulk]   = useState("");
  const [mode,   setMode]   = useState<"ban" | "unban">("ban");
  const [success, setSuccess] = useState<string | null>(null);
  const { writeContract, isPending } = useWriteContract();

  const doAction = (fn: () => void) => {
    if (isDemoMode) { setSuccess("Simulated in preview mode"); setTimeout(() => setSuccess(null), 3000); return; }
    fn();
  };

  return (
    <div className="space-y-6">
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-amber-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Preview mode — ban actions are simulated
        </div>
      )}

      {isDemoMode && (
        <div className="space-y-3">
          <h3 className="font-medium text-white">Recent Bans</h3>
          {DEMO_ADMIN.recentBans.map((b) => (
            <div key={b.address} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-4">
              <Ban className="h-4 w-4 text-red-400 shrink-0" />
              <div className="flex-1">
                <AddressDisplay address={b.address} />
                <p className="text-xs text-gray-500 mt-0.5">{b.reason}</p>
              </div>
              <p className="text-xs text-gray-600">{new Date(b.timestamp).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["ban","unban"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              mode === m
                ? m === "ban" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {m === "ban" ? <><Ban className="inline h-3.5 w-3.5 mr-1" />Ban</> : <><UserCheck className="inline h-3.5 w-3.5 mr-1" />Unban</>}
          </button>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-medium text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Single Address
          </h3>
          <input value={single} onChange={(e) => setSingle(e.target.value)} placeholder="0x..."
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => doAction(() => {
              const fn = mode === "ban" ? "banAddress" : "unbanAddress";
              writeContract({ address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: fn, args: [single as Address] });
              setSingle("");
            })}
            disabled={isPending || !single}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${mode === "ban" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {isPending ? "Confirming…" : `${mode === "ban" ? "Ban" : "Unban"} Address`}
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-amber-400" /> Bulk (one address per line)
          </h3>
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5}
            placeholder={"0x...\n0x...\n0x..."}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono resize-none"
          />
          <button
            onClick={() => doAction(() => {
              const addrs = bulk.split("\n").map((a) => a.trim()).filter(Boolean) as Address[];
              const fn = mode === "ban" ? "bulkBan" : "bulkUnban";
              writeContract({ address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: fn, args: [addrs] });
              setBulk("");
            })}
            disabled={isPending || !bulk.trim()}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${mode === "ban" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {isPending ? "Confirming…" : `Bulk ${mode === "ban" ? "Ban" : "Unban"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
