"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useDemo } from "@/context/DemoContext";
import {
  DEMO_PROJECTS, DEMO_PLATFORM_EXEC, DEMO_ADMIN_USERS, DEMO_PLATFORM_DOMAIN,
  type AdminUser, type AdminStatus,
} from "@/lib/demo-data";
import {
  Gavel, CheckCircle, XCircle, Clock, AlertTriangle, Globe,
  FileText, Users, TrendingUp, Ban, ShieldCheck, UserX, UserCheck,
  Crown, Mail, Wallet, ArrowRight, Plus, TriangleAlert,
} from "lucide-react";

export default function PlatformExecDashboard() {
  return (
    <RoleGuard required="platformExec">
      <PlatformExecContent />
    </RoleGuard>
  );
}

type Tab = "approvals" | "overview" | "admins" | "authority";

function PlatformExecContent() {
  const { isDemoMode } = useDemo();
  const [tab, setTab] = useState<Tab>("approvals");

  const openApprovals        = isDemoMode ? DEMO_PLATFORM_EXEC.pendingApprovals.length : 0;
  const pendingCancellations = isDemoMode ? DEMO_PLATFORM_EXEC.pendingCancellationApprovals.length : 0;
  const pendingAdmins        = isDemoMode ? DEMO_ADMIN_USERS.filter(a => a.status === "pending").length : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Gavel className="h-8 w-8 text-rose-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Executive</h1>
          <p className="text-gray-400 text-sm mt-0.5">Approve Admin Operator proposed changes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Pending Approvals</p>
          <p className="text-2xl font-bold text-white mt-1">{openApprovals}</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Active Projects</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isDemoMode ? DEMO_PROJECTS.filter((p) => p.status === "Active").length : 0}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Verified Docs</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isDemoMode ? DEMO_PROJECTS.flatMap((p) => p.documents).filter((d) => d.status === "Verified").length : 0}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Verified Team Members</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isDemoMode ? DEMO_PROJECTS.flatMap((p) => p.team).filter((m) => m.verified).length : 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-px">
        {([
          ["approvals", `Pending Approvals (${openApprovals})`],
          ["admins",    `Admin Users${pendingAdmins > 0 ? ` (${pendingAdmins} pending)` : ""}`],
          ["authority", "Transfer Authority"],
          ["overview",  "Project Overview"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t ? "bg-white/10 text-white border-b-2 border-rose-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "approvals" && <ApprovalsTab isDemoMode={isDemoMode} />}
      {tab === "admins"    && <AdminUsersTab isDemoMode={isDemoMode} />}
      {tab === "authority" && <AuthorityTab  isDemoMode={isDemoMode} />}
      {tab === "overview"  && <OverviewTab  isDemoMode={isDemoMode} />}
    </div>
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────
function ApprovalsTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [decisions, setDecisions] = useState<Record<number, "approved" | "rejected">>({});
  const [simMsg,    setSimMsg]    = useState<Record<number, string>>({});

  const decide = (changeId: number, action: "approved" | "rejected") => {
    setDecisions((prev) => ({ ...prev, [changeId]: action }));
    const msg = action === "approved"
      ? "Change approved and applied (simulated)"
      : "Change rejected (simulated)";
    setSimMsg((prev) => ({ ...prev, [changeId]: msg }));
    setTimeout(() => setSimMsg((prev) => { const n = { ...prev }; delete n[changeId]; return n; }), 4000);
  };

  const approvals = isDemoMode ? DEMO_PLATFORM_EXEC.pendingApprovals : [];

  return (
    <div className="space-y-6">
      {/* Cancellation approvals (exec step — only shown after AO approves) */}
      {isDemoMode && DEMO_PLATFORM_EXEC.pendingCancellationApprovals.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-400" /> Pending Cancellation Approvals (Exec Step)
          </h3>
          <div className="space-y-3">
            {DEMO_PLATFORM_EXEC.pendingCancellationApprovals.map((item, i) => {
              const project = DEMO_PROJECTS[item.projectIndex];
              return (
                <div key={i} className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.projectName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Requested: {new Date(item.requestedAt).toLocaleDateString()} ·
                        AO approved: {new Date(item.aoApprovedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Admin Operator has approved this cancellation. Your approval will execute it immediately.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition">
                        <CheckCircle className="h-3.5 w-3.5" /> Approve &amp; Execute
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-500/30 text-gray-400 hover:bg-white/5 text-sm transition">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" /> Metadata Change Approvals
        </h3>
        {approvals.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-gray-400">No pending approvals. All changes are up to date.</p>
          </div>
        )}
      </div>

      {approvals.map((item) => {
        const project = DEMO_PROJECTS[item.projectIndex];
        const decided   = decisions[item.changeId];
        const isApproved = decided === "approved";
        const isRejected = decided === "rejected";

        return (
          <div
            key={item.changeId}
            className={`rounded-xl border p-6 transition ${
              isApproved ? "border-emerald-500/30 bg-emerald-500/5"
              : isRejected ? "border-red-500/30 bg-red-500/5"
              : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              <Clock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-white">{project.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Proposed by Admin Operator · {new Date(item.proposedAt).toLocaleString()}
                </p>
              </div>
              {isApproved && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Approved</span>}
              {isRejected && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Rejected</span>}
            </div>

            {/* Change details */}
            <div className="rounded-lg bg-white/5 p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Proposed Change</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <p className="text-xs text-gray-600">Field</p>
                  <p className="text-sm font-medium text-white">{item.field}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current Value</p>
                  <p className="text-sm text-gray-400 font-mono">{item.oldValue || "(empty)"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">New Value</p>
                  <p className="text-sm text-emerald-300 font-mono">{item.newValue}</p>
                </div>
              </div>
            </div>

            {simMsg[item.changeId] && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-gray-300 text-sm">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> {simMsg[item.changeId]}
              </div>
            )}

            {!decided && (
              <div className="flex gap-3">
                <button
                  onClick={() => isDemoMode ? decide(item.changeId, "approved") : undefined}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                >
                  <CheckCircle className="h-4 w-4" /> Approve Change
                </button>
                <button
                  onClick={() => isDemoMode ? decide(item.changeId, "rejected") : undefined}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Project Overview (read-only) ──────────────────────────────────────────────
function OverviewTab({ isDemoMode }: { isDemoMode: boolean }) {
  const projects = isDemoMode ? DEMO_PROJECTS : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Read-only view of project compliance status. Contact Admin Operator to propose changes.
      </p>
      {projects.map((p) => {
        const docScore   = p.documents.length > 0
          ? Math.round((p.documents.filter((d) => d.status === "Verified").length / p.documents.length) * 100)
          : 0;
        const teamScore  = p.team.length > 0
          ? Math.round((p.team.filter((m) => m.verified).length / p.team.length) * 100)
          : 0;

        return (
          <div key={p.operator} className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-lg">{p.name}</span>
                  <StatusChip status={p.status} />
                </div>
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-3">
                    <Globe className="h-3 w-3" /> {p.website}
                  </a>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Document Compliance", value: `${docScore}%`,           icon: <FileText className="h-3.5 w-3.5" />, color: docScore >= 80 ? "text-emerald-400" : docScore >= 50 ? "text-amber-400" : "text-red-400" },
                    { label: "Team Verified",        value: `${teamScore}%`,          icon: <Users className="h-3.5 w-3.5" />,    color: teamScore >= 80 ? "text-emerald-400" : teamScore >= 50 ? "text-amber-400" : "text-red-400" },
                    { label: "Holders",              value: p.holderCount.toLocaleString(), icon: <TrendingUp className="h-3.5 w-3.5" />, color: "text-white" },
                    { label: "Missed Epochs",        value: p.missedEpochs.toString(), icon: <AlertTriangle className="h-3.5 w-3.5" />, color: p.missedEpochs > 0 ? "text-red-400" : "text-emerald-400" },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</p>
                      <p className={`text-sm font-semibold mt-0.5 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Document list */}
            <div className="mt-4 space-y-1.5">
              {p.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 text-sm">
                  {doc.status === "Verified"
                    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    : doc.status === "Rejected"
                    ? <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    : <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  }
                  <span className="text-gray-300">{doc.label}</span>
                  <span className={`text-xs ml-auto ${
                    doc.status === "Verified" ? "text-emerald-400"
                    : doc.status === "Rejected" ? "text-red-400"
                    : "text-amber-400"
                  }`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Admin Users Tab (Exec manages all admin accounts) ─────────────────────────
function AdminUsersTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>(isDemoMode ? DEMO_ADMIN_USERS : []);
  const [simMsgs, setSimMsgs] = useState<Record<number, string>>({});
  const [newEmail, setNewEmail] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const sim = (id: number, msg: string) => {
    setSimMsgs(p => ({ ...p, [id]: msg }));
    setTimeout(() => setSimMsgs(p => { const n = { ...p }; delete n[id]; return n; }), 3000);
  };

  const setStatus = (id: number, status: AdminStatus) => {
    setUsers(prev => prev.map(u => u.id === id
      ? { ...u, status, approvedAt: status === "active" ? Date.now() : u.approvedAt }
      : u));
    sim(id, `User ${status === "active" ? "approved" : status === "suspended" ? "suspended" : "deleted"} (simulated)`);
  };

  const addPending = () => {
    if (!newEmail.endsWith(`@${DEMO_PLATFORM_DOMAIN}`)) return;
    const entry: AdminUser = {
      id: Date.now(), email: newEmail, walletAddress: newWallet || "0xPending…",
      role: "admin", status: "pending", approvedBy: null, approvedAt: null,
      joinedAt: Date.now(),
    };
    setUsers(prev => [...prev, entry]);
    setNewEmail(""); setNewWallet("");
    sim(entry.id, "Admin invitation sent");
  };

  const statusBadge = (s: AdminStatus) => {
    const m: Record<AdminStatus, string> = {
      active:    "bg-emerald-500/20 text-emerald-400",
      suspended: "bg-amber-500/20 text-amber-300",
      pending:   "bg-blue-500/20 text-blue-300",
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m[s]}`}>{s}</span>;
  };

  const pending   = users.filter(u => u.status === "pending");
  const active    = users.filter(u => u.status === "active");
  const suspended = users.filter(u => u.status === "suspended");

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-rose-400" />
        <div>
          <h2 className="font-semibold text-white">Admin User Management</h2>
          <p className="text-xs text-gray-400">
            All admin and admin-operator addresses must be approved by the Platform Executive.
            Email must match <span className="text-rose-300">@{DEMO_PLATFORM_DOMAIN}</span>
          </p>
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pending Approval ({pending.length})
          </h3>
          {pending.map(u => (
            <div key={u.id} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-blue-400" />
                    <span className="text-white font-medium">{u.email}</span>
                    {statusBadge(u.status)}
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{u.walletAddress}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Applied: {new Date(u.joinedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStatus(u.id, "active")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => setStatus(u.id, "suspended")}
                    className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-medium transition flex items-center gap-1">
                    <UserX className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
                {simMsgs[u.id] && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {simMsgs[u.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active admins */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Active Admins ({active.length})
        </h3>
        {active.map(u => (
          <div key={u.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {u.role === "exec"
                    ? <Crown className="h-4 w-4 text-yellow-400" />
                    : <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  }
                  <span className="text-white font-medium">{u.email}</span>
                  {statusBadge(u.status)}
                  <span className="text-xs text-gray-500 capitalize">{u.role}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono">{u.walletAddress}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Approved: {u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : "—"}
                </p>
              </div>
              {u.role !== "exec" && (
                <button onClick={() => setStatus(u.id, "suspended")}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium transition hover:bg-amber-500/20 flex items-center gap-1">
                  <UserX className="h-3.5 w-3.5" /> Suspend
                </button>
              )}
              {simMsgs[u.id] && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {simMsgs[u.id]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suspended */}
      {suspended.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <UserX className="h-4 w-4" /> Suspended ({suspended.length})
          </h3>
          {suspended.map(u => (
            <div key={u.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 font-medium">{u.email}</span>
                    {statusBadge(u.status)}
                  </div>
                  <p className="text-xs text-gray-600 font-mono">{u.walletAddress}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStatus(u.id, "active")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> Reinstate
                  </button>
                </div>
                {simMsgs[u.id] && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {simMsgs[u.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new admin */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-rose-400" /> Invite Admin
        </h3>
        <p className="text-xs text-gray-500">
          Email must end in <span className="text-rose-300">@{DEMO_PLATFORM_DOMAIN}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder={`admin@${DEMO_PLATFORM_DOMAIN}`}
              className="w-full rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-rose-500"
            />
          </div>
          <div className="relative flex-1">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input value={newWallet} onChange={e => setNewWallet(e.target.value)}
              placeholder="Wallet address (0x…)"
              className="w-full rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-rose-500"
            />
          </div>
          <button onClick={addPending}
            disabled={!newEmail.endsWith(`@${DEMO_PLATFORM_DOMAIN}`)}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-2">
            <Plus className="h-4 w-4" /> Invite
          </button>
        </div>
        {newEmail && !newEmail.endsWith(`@${DEMO_PLATFORM_DOMAIN}`) && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <TriangleAlert className="h-3.5 w-3.5" /> Email must end in @{DEMO_PLATFORM_DOMAIN}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Transfer Authority Tab ─────────────────────────────────────────────────────
function AuthorityTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [newEmail,  setNewEmail]  = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [confirm,   setConfirm]   = useState(false);
  const [done,      setDone]      = useState(false);
  const execUser = DEMO_ADMIN_USERS.find(u => u.role === "exec");

  const transfer = () => {
    if (!newEmail.endsWith(`@${DEMO_PLATFORM_DOMAIN}`)) return;
    setDone(true);
    setConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Crown className="h-5 w-5 text-yellow-400" />
        <div>
          <h2 className="font-semibold text-white">Transfer Executive Authority</h2>
          <p className="text-xs text-gray-400">
            Transfer the Platform Executive role to another address. The new Exec email must match
            <span className="text-rose-300"> @{DEMO_PLATFORM_DOMAIN}</span>. This action is irreversible.
          </p>
        </div>
      </div>

      {/* Current exec */}
      {execUser && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Current Executive</p>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span className="text-white font-medium">{execUser.email}</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">{execUser.walletAddress}</p>
        </div>
      )}

      {done ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
          <p className="font-semibold text-white">Authority Transfer Initiated (Simulated)</p>
          <p className="text-sm text-gray-400">
            The new executive ({newEmail}) must confirm acceptance from their wallet within 48 hours.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Irreversible Action</span>
          </div>
          <p className="text-xs text-gray-400">
            After transfer, you will lose all executive privileges immediately. The new Exec will be able to approve or remove all admin users.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setConfirm(false); }}
                placeholder={`newexec@${DEMO_PLATFORM_DOMAIN}`}
                className="w-full rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input value={newWallet} onChange={e => setNewWallet(e.target.value)}
                placeholder="New Exec wallet address (0x…)"
                className="w-full rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500"
              />
            </div>
            {newEmail && !newEmail.endsWith(`@${DEMO_PLATFORM_DOMAIN}`) && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <TriangleAlert className="h-3.5 w-3.5" /> Email must end in @{DEMO_PLATFORM_DOMAIN}
              </p>
            )}
          </div>

          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              disabled={!newEmail.endsWith(`@${DEMO_PLATFORM_DOMAIN}`) || !newWallet}
              className="w-full rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2">
              <ArrowRight className="h-4 w-4" /> Initiate Transfer
            </button>
          ) : (
            <div className="rounded-lg border border-red-500/40 bg-red-900/20 p-4 space-y-3">
              <p className="text-sm text-red-300 font-medium">
                Confirm transfer of executive authority to <span className="text-white">{newEmail}</span>?
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={transfer}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition">
                  Yes, Transfer Authority
                </button>
                <button onClick={() => setConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm font-medium transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active:    "bg-emerald-500/20 text-emerald-400",
    Paused:    "bg-yellow-500/20 text-yellow-300",
    Cancelled: "bg-red-500/20 text-red-400",
    Withdrawn: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? map.Active}`}>
      {status}
    </span>
  );
}
