"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useDemo } from "@/context/DemoContext";
import {
  DEMO_PROJECTS, DEMO_ADMIN_OPERATOR, DEMO_ANNOUNCEMENTS,
  DEMO_PROJECT_SIGNUPS, DEMO_INVESTOR_SIGNUPS, DEMO_BLACKLIST_FLAGS,
  DEMO_HOLDER_GEO, DEMO_SANCTIONED_COUNTRIES,
  type ProjectDocument, type VerificationStatus, type AnnouncementPriority,
  type ProjectSignupRequest, type BlacklistFlag, type SanctionedCountry,
} from "@/lib/demo-data";
import { formatUsdc, formatDate } from "@/lib/utils";
import { IpfsUpload } from "@/components/ui/IpfsUpload";
import { AnnouncementCard } from "@/app/project/page";
import {
  Briefcase, FileText, CheckCircle, XCircle, Clock, Upload,
  User, Globe, AlertTriangle, ChevronDown, ChevronUp,
  ShieldCheck, Eye, ExternalLink, Zap, Ban, Inbox, Megaphone,
  ShieldAlert, MapPin, Flag, Send, TriangleAlert, Search,
  Filter, Plus, Trash2,
} from "lucide-react";

export default function AdminOperatorDashboard() {
  return (
    <RoleGuard required="adminOperator">
      <AdminOperatorContent />
    </RoleGuard>
  );
}

type Tab = "queue" | "projects" | "upload" | "inbox" | "announcements" | "blacklist" | "geography" | "sanctions";

function AdminOperatorContent() {
  const { isDemoMode } = useDemo();
  const [tab, setTab] = useState<Tab>("queue");

  const pendingCount      = isDemoMode ? DEMO_ADMIN_OPERATOR.pendingVerifications.length : 0;
  const pendingEmissions  = isDemoMode ? DEMO_ADMIN_OPERATOR.pendingEmissions.length : 0;
  const pendingCancels    = isDemoMode ? DEMO_ADMIN_OPERATOR.pendingCancellations.length : 0;
  const inboxCount        = isDemoMode ? DEMO_PROJECT_SIGNUPS.filter(s => s.status === "pending").length : 0;
  const blacklistCount    = isDemoMode ? DEMO_BLACKLIST_FLAGS.filter(f => !f.resolved).length : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Briefcase className="h-8 w-8 text-violet-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Operator</h1>
          <p className="text-gray-400 text-sm mt-0.5">Document review, verification & team onboarding</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Pending Reviews</p>
          <p className="text-2xl font-bold text-white mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Verified Docs</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isDemoMode ? DEMO_PROJECTS.flatMap((p) => p.documents).filter((d) => d.status === "Verified").length : 0}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Pending Meetings</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isDemoMode ? DEMO_ADMIN_OPERATOR.pendingMeetings.length : 0}
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Open Change Proposals</p>
          <p className="text-2xl font-bold text-white mt-1">
            {isDemoMode ? DEMO_PROJECTS.flatMap((p) => p.pendingChanges).filter((c) => !c.executed).length : 0}
          </p>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Pending Emissions</p>
          <p className="text-2xl font-bold text-white mt-1">{pendingEmissions}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-xs text-gray-500">Pending Cancellations</p>
          <p className="text-2xl font-bold text-white mt-1">{pendingCancels}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-px">
        {([
          ["queue",         `Review Queue (${pendingCount})`],
          ["inbox",         `Signups Inbox (${inboxCount})`],
          ["projects",      "All Projects"],
          ["announcements", "Announcements"],
          ["blacklist",     blacklistCount > 0 ? `⚠ Blacklist (${blacklistCount})` : "Blacklist"],
          ["geography",     "Geography"],
          ["sanctions",     "Sanctioned Countries"],
          ["upload",        "Upload Documents"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t ? "bg-white/10 text-white border-b-2 border-violet-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "queue"         && <ReviewQueueTab     isDemoMode={isDemoMode} />}
      {tab === "inbox"         && <SignupsInboxTab     isDemoMode={isDemoMode} />}
      {tab === "projects"      && <AllProjectsTab      isDemoMode={isDemoMode} />}
      {tab === "announcements" && <AnnouncementsTab    isDemoMode={isDemoMode} />}
      {tab === "blacklist"     && <BlacklistTab        isDemoMode={isDemoMode} />}
      {tab === "geography"     && <GeographyTab        isDemoMode={isDemoMode} />}
      {tab === "sanctions"     && <SanctionsTab        isDemoMode={isDemoMode} />}
      {tab === "upload"        && <UploadDocTab        isDemoMode={isDemoMode} />}
    </div>
  );
}

// ── Signups Inbox ─────────────────────────────────────────────────────────────
function SignupsInboxTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [simMsgs, setSimMsgs] = useState<Record<number, string>>({});
  const sim = (id: number, msg: string) => {
    setSimMsgs(p => ({ ...p, [id]: msg }));
    setTimeout(() => setSimMsgs(p => { const n = { ...p }; delete n[id]; return n; }), 3000);
  };
  const projects = isDemoMode ? DEMO_PROJECT_SIGNUPS : [];
  const investors = isDemoMode ? DEMO_INVESTOR_SIGNUPS : [];

  return (
    <div className="space-y-7">
      {/* Project signups */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-amber-400" /> Project Applications
          <span className="ml-2 text-xs rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5">
            {projects.filter(p => p.status === "pending").length} pending
          </span>
        </h2>
        <div className="space-y-3">
          {projects.map(req => (
            <div key={req.id} className={`rounded-xl border p-5 space-y-3 ${
              req.status === "pending" ? "border-amber-500/20 bg-amber-500/5"
              : req.status === "approved" ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{req.companyName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.status === "pending" ? "bg-amber-500/20 text-amber-300"
                      : req.status === "approved" ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-red-500/20 text-red-300"
                    }`}>{req.status}</span>
                    {req.commodity && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">{req.commodity}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-400 mt-2">
                    <span>Contact: <span className="text-gray-300">{req.contactName}</span></span>
                    <span>Email: <span className="text-gray-300">{req.email}</span></span>
                    <span>Country: <span className="text-gray-300">{req.country}</span></span>
                    <span>Est. Raise: <span className="text-gray-300">${req.estimatedRaise.toLocaleString()}</span></span>
                    <span>Submitted: <span className="text-gray-300">{new Date(req.submittedAt).toLocaleDateString()}</span></span>
                    {req.website && (
                      <a href={req.website} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 font-mono mt-1 truncate">{req.walletAddress}</p>
                  {req.notes && <p className="text-xs text-gray-400 mt-1 italic">{req.notes}</p>}
                </div>
                {req.status === "pending" && (
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <button onClick={() => sim(req.id, `${req.companyName} approved — onboarding started`)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => sim(req.id, `${req.companyName} application rejected`)}
                      className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-medium transition flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                    {simMsgs[req.id] && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {simMsgs[req.id]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investor signups */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-blue-400" /> Investor Sign-Ups
          <span className="ml-2 text-xs rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5">
            {investors.filter(i => i.status === "pending").length} pending
          </span>
        </h2>
        <div className="space-y-3">
          {investors.map(inv => (
            <div key={inv.id} className={`rounded-xl border p-4 ${
              inv.flagged ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-white">{inv.name}</span>
                    {inv.flagged && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1">
                        <TriangleAlert className="h-3 w-3" /> Flagged
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === "pending" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                    }`}>{inv.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                    <span>{inv.email}</span>
                    <span>{inv.country}</span>
                    <span className="font-mono text-gray-600 truncate max-w-[200px]">{inv.walletAddress}</span>
                  </div>
                </div>
                {inv.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => sim(100 + inv.id, "Investor approved")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition">
                      Approve
                    </button>
                    <button onClick={() => sim(100 + inv.id, "Investor rejected")}
                      className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-medium transition">
                      Reject
                    </button>
                  </div>
                )}
                {simMsgs[100 + inv.id] && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {simMsgs[100 + inv.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Announcements Tab (Admin Operator → investors / projects) ─────────────────
function AnnouncementsTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [title,    setTitle]    = useState("");
  const [body,     setBody]     = useState("");
  const [target,   setTarget]   = useState<"investors" | "projects" | "all">("all");
  const [priority, setPriority] = useState<AnnouncementPriority>("info");
  const [simMsg,   setSimMsg]   = useState("");

  const platformAnns = isDemoMode ? DEMO_ANNOUNCEMENTS.filter(a => a.from === "platform") : [];

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    setSimMsg(`Announcement published to "${target}" (simulated).`);
    setTitle(""); setBody("");
    setTimeout(() => setSimMsg(""), 5000);
  };

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-violet-400" /> Broadcast Announcement
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
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target Audience</label>
            <select value={target} onChange={e => setTarget(e.target.value as typeof target)}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
              <option value="all" className="bg-gray-900">Everyone</option>
              <option value="investors" className="bg-gray-900">Investors only</option>
              <option value="projects" className="bg-gray-900">Projects only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as AnnouncementPriority)}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
              <option value="info" className="bg-gray-900">Info</option>
              <option value="warning" className="bg-gray-900">Warning</option>
              <option value="important" className="bg-gray-900">Important</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              placeholder="Write your announcement…"
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
        </div>
        <button onClick={submit} disabled={!title.trim() || !body.trim()}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-2.5 text-white text-sm font-medium transition flex items-center gap-2">
          <Send className="h-4 w-4" /> Publish Announcement
        </button>
      </div>

      {platformAnns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Past Platform Announcements</h2>
          {platformAnns.map(a => <AnnouncementCard key={a.id} ann={a} />)}
        </div>
      )}
    </div>
  );
}

// ── Blacklist Flagging Console ────────────────────────────────────────────────
function BlacklistTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [simMsgs, setSimMsgs] = useState<Record<number, string>>({});
  const sim = (id: number, msg: string) => {
    setSimMsgs(p => ({ ...p, [id]: msg }));
    setTimeout(() => setSimMsgs(p => { const n = { ...p }; delete n[id]; return n; }), 3000);
  };
  const flags: BlacklistFlag[] = isDemoMode ? DEMO_BLACKLIST_FLAGS : [];
  const open   = flags.filter(f => !f.resolved);
  const closed = flags.filter(f => f.resolved);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-red-400" />
        <div>
          <h2 className="font-semibold text-white">Blacklist Flagging Console</h2>
          <p className="text-xs text-gray-400">Investors whose wallets have interacted with OFAC-listed or high-risk addresses</p>
        </div>
      </div>

      {open.length === 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> No unresolved blacklist flags
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" /> Open Flags ({open.length})
          </h3>
          {open.map(flag => (
            <div key={flag.id} className="rounded-xl border border-red-500/25 bg-red-500/5 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-medium text-white">Investor: <span className="font-mono text-red-300">{flag.investorAddress}</span></p>
                  <p className="text-xs text-gray-400">Linked address: <span className="font-mono text-gray-300">{flag.linkedAddress}</span></p>
                  <p className="text-xs text-amber-300 flex items-center gap-1">
                    <TriangleAlert className="h-3.5 w-3.5" /> {flag.reason}
                  </p>
                  <p className="text-xs text-gray-500">Detected: {new Date(flag.detectedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => sim(flag.id, "Flag resolved — investor notified")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                  </button>
                  <button onClick={() => sim(flag.id, "Investor suspended (simulated)")}
                    className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-medium transition flex items-center gap-1">
                    <Ban className="h-3.5 w-3.5" /> Suspend Investor
                  </button>
                  {simMsgs[flag.id] && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {simMsgs[flag.id]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">Resolved ({closed.length})</h3>
          {closed.map(flag => (
            <div key={flag.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-gray-400">Investor: <span className="font-mono text-gray-300">{flag.investorAddress}</span></p>
              <p className="text-xs text-gray-500 mt-1">{flag.reason}</p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Geography Tab ─────────────────────────────────────────────────────────────
function GeographyTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [selectedProject, setSelectedProject] = useState<number>(0);
  const geoData = isDemoMode ? DEMO_HOLDER_GEO : [];
  const current = geoData[selectedProject] ?? geoData[0];

  if (!isDemoMode || geoData.length === 0) {
    return <p className="text-gray-400 text-sm">Geography data unavailable in live mode.</p>;
  }

  const flagEmoji = (code: string) => {
    if (code === "XX") return "🌍";
    return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
  };

  const maxConnections = Math.max(...current.geoBreakdown.map(g => g.connections));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <MapPin className="h-5 w-5 text-blue-400" />
        <div>
          <h2 className="font-semibold text-white">Holder Geography</h2>
          <p className="text-xs text-gray-400">Where token holders are connecting from (based on wallet connection origin)</p>
        </div>
      </div>

      {/* Project selector */}
      <div className="flex flex-wrap gap-2">
        {geoData.map((g, i) => (
          <button key={i} onClick={() => setSelectedProject(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              selectedProject === i ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400 hover:text-white"
            }`}>
            {g.projectName}
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-medium text-white">{current.projectName}</h3>
            <span className="text-xs text-gray-500">Updated {new Date(current.lastUpdated).toLocaleString()}</span>
          </div>
          <div className="p-5 space-y-3">
            {current.geoBreakdown.map(geo => (
              <div key={geo.countryCode} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-white">
                    <span className="text-base">{flagEmoji(geo.countryCode)}</span>
                    {geo.country}
                  </span>
                  <span className="text-gray-400">{geo.connections.toLocaleString()} connections · <span className="text-blue-400 font-medium">{geo.percentage}%</span></span>
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
                {current.geoBreakdown.reduce((a, g) => a + g.connections, 0).toLocaleString()}
              </span>
              {" · "}Connections from sanctioned jurisdictions are automatically blocked.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sanctioned Countries Tab ──────────────────────────────────────────────────
function SanctionsTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [countries, setCountries] = useState<SanctionedCountry[]>(isDemoMode ? DEMO_SANCTIONED_COUNTRIES : []);
  const [newCode, setNewCode]     = useState("");
  const [newName, setNewName]     = useState("");
  const [uploadCid, setUploadCid] = useState("");
  const [simMsg, setSimMsg]       = useState("");
  const doSim = (msg: string) => { setSimMsg(msg); setTimeout(() => setSimMsg(""), 4000); };

  const addCountry = () => {
    if (!newCode.trim() || !newName.trim()) return;
    const entry: SanctionedCountry = {
      countryCode: newCode.toUpperCase().slice(0, 2),
      countryName: newName.trim(),
      addedAt: Date.now(),
      addedBy: "0xAO...demo",
    };
    setCountries(prev => [...prev, entry]);
    setNewCode(""); setNewName("");
    doSim(`${entry.countryName} added to sanctioned list`);
  };

  const removeCountry = (code: string) => {
    setCountries(prev => prev.filter(c => c.countryCode !== code));
    doSim(`${code} removed from sanctioned list (simulated)`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Flag className="h-5 w-5 text-red-400" />
        <div>
          <h2 className="font-semibold text-white">Sanctioned Country List</h2>
          <p className="text-xs text-gray-400">Connections from these jurisdictions are blocked platform-wide. Upload a CSV or add manually.</p>
        </div>
      </div>

      {simMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {simMsg}
        </div>
      )}

      {/* Upload CSV */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Upload className="h-4 w-4 text-violet-400" /> Upload Sanctions List (CSV)
        </h3>
        <p className="text-xs text-gray-500">CSV format: countryCode,countryName (one per line, no header)</p>
        <IpfsUpload
          label="Sanctions List CSV"
          value={uploadCid}
          onChange={setUploadCid}
          isDemoMode={true}
          accept=".csv,.txt"
          placeholder="Upload CSV or paste CID…"
        />
        <button
          onClick={() => uploadCid && doSim("Sanctions list uploaded and applied (simulated)")}
          disabled={!uploadCid}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-2">
          <Upload className="h-4 w-4" /> Apply List
        </button>
      </div>

      {/* Manual add */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-400" /> Add Country Manually
        </h3>
        <div className="flex gap-2 flex-wrap">
          <input value={newCode} onChange={e => setNewCode(e.target.value.slice(0, 2))} maxLength={2}
            placeholder="ISO code (e.g. KP)"
            className="w-28 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm uppercase placeholder-gray-600 focus:outline-none focus:border-red-500"
          />
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Country name"
            className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500"
          />
          <button onClick={addCountry} disabled={!newCode.trim() || !newName.trim()}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Current list */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h3 className="font-medium text-white">Active Sanctions List ({countries.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-white/10">
              {["Code", "Country", "Added", "By", ""].map(h => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.map(c => (
              <tr key={c.countryCode} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-red-300 font-medium">{c.countryCode}</td>
                <td className="px-4 py-3 text-white">{c.countryName}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.addedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-600 text-xs font-mono truncate max-w-[100px]">{c.addedBy}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeCountry(c.countryCode)}
                    className="text-red-500 hover:text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Review Queue ──────────────────────────────────────────────────────────────
function ReviewQueueTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [simMsg, setSimMsg] = useState<Record<string, string>>({});
  const sim = (key: string, msg: string) => {
    setSimMsg((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => setSimMsg((prev) => { const n = { ...prev }; delete n[key]; return n; }), 3000);
  };

  const queue = isDemoMode ? DEMO_ADMIN_OPERATOR.pendingVerifications : [];
  const meetings = isDemoMode ? DEMO_ADMIN_OPERATOR.pendingMeetings : [];

  return (
    <div className="space-y-6">
      {/* Document review queue */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-400" /> Pending Document Reviews
        </h2>
        {queue.length === 0 && <p className="text-gray-500 text-sm">No documents awaiting review.</p>}
        <div className="space-y-3">
          {queue.map((item) => {
            const project = DEMO_PROJECTS[item.projectIndex];
            const doc     = project.documents.find((d) => d.id === item.docId)!;
            const key     = `${item.projectIndex}-${item.docId}`;
            return (
              <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-white">{item.label}</span>
                      <DocTypeBadge type={doc.docType} />
                      <VerifBadge status={doc.status} />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Project: <span className="text-gray-300">{item.projectName}</span></p>
                    <p className="text-xs text-gray-600 font-mono break-all">{doc.ipfsHash}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <a
                        href={`https://ipfs.io/ipfs/${doc.ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
                      >
                        <Eye className="h-3.5 w-3.5" /> View on IPFS
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <NotesInput onVerify={(notes, status) => sim(key, `${status === "Verified" ? "Verified" : "Rejected"}: ${item.label}`)} />
                    {simMsg[key] && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {simMsg[key]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emissions verification queue */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-400" /> Pending Emissions Verification
        </h2>
        {DEMO_ADMIN_OPERATOR.pendingEmissions.length === 0 && (
          <p className="text-gray-500 text-sm">No pending emissions.</p>
        )}
        <div className="space-y-3">
          {(isDemoMode ? DEMO_ADMIN_OPERATOR.pendingEmissions : []).map((item) => {
            const key = `emission-${item.projectIndex}-${item.depositId}`;
            const deposit = DEMO_PROJECTS[item.projectIndex].emissions.find(e => e.id === item.depositId)!;
            return (
              <div key={key} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-white">{item.projectName}</span>
                      <span className="text-xs rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-orange-400">Pending</span>
                    </div>
                    <p className="text-sm text-gray-300">Amount: <strong className="text-white">${formatUsdc(item.amount, 0)}</strong></p>
                    <p className="text-xs text-gray-500 mt-0.5">Submitted: {new Date(item.submittedAt).toLocaleDateString()}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <a href={`https://ipfs.io/ipfs/${deposit.earningsReportCid}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                        Earnings Report <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2 min-w-[200px]">
                    <ProofUploadInput onUpload={(proofCid) => {}} onApprove={() => {}} onReject={() => {}} simKey={key} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancellation approvals */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Ban className="h-4 w-4 text-red-400" /> Pending Cancellation Approvals (AO Step)
        </h2>
        {DEMO_ADMIN_OPERATOR.pendingCancellations.length === 0 && (
          <p className="text-gray-500 text-sm">No pending cancellations.</p>
        )}
        <div className="space-y-3">
          {(isDemoMode ? DEMO_ADMIN_OPERATOR.pendingCancellations : []).map((item, i) => {
            const key = `cancel-${i}`;
            return (
              <div key={key} className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.projectName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cancellation requested by operator: {new Date(item.requestedAt).toLocaleDateString()}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className={item.aoApproved ? "text-emerald-400" : "text-amber-400"}>
                        {item.aoApproved ? "✓ AO Approved" : "○ AO Pending"}
                      </span>
                      <span className={item.execApproved ? "text-emerald-400" : "text-gray-500"}>
                        {item.execApproved ? "✓ Exec Approved" : "○ Exec Pending"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!item.aoApproved && (
                      <button
                        onClick={() => {/* sim */}}
                        className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-medium transition"
                      >
                        Approve (AO Step)
                      </button>
                    )}
                    {item.aoApproved && (
                      <span className="px-3 py-1.5 text-emerald-400 text-xs flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Forwarded to Exec
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming meetings */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-violet-400" /> Scheduled Team Meetings
        </h2>
        {meetings.length === 0 && <p className="text-gray-500 text-sm">No meetings scheduled.</p>}
        <div className="space-y-3">
          {meetings.map((m, i) => {
            const project = DEMO_PROJECTS[m.projectIndex];
            const key     = `mtg-${i}`;
            return (
              <div key={key} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{m.memberName}</p>
                  <p className="text-xs text-gray-500">{project.name}</p>
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Scheduled: {new Date(m.scheduledAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => sim(key, "Team member verified (simulated)")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Mark Verified
                  </button>
                </div>
                {simMsg[key] && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {simMsg[key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── All Projects (document status overview) ───────────────────────────────────
function AllProjectsTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [simMsg, setSimMsg]     = useState<Record<string, string>>({});
  const sim = (key: string, msg: string) => {
    setSimMsg((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => setSimMsg((prev) => { const n = { ...prev }; delete n[key]; return n; }), 3000);
  };

  const projects = isDemoMode ? DEMO_PROJECTS : [];

  return (
    <div className="space-y-3">
      {projects.map((p) => {
        const verifiedCount = p.documents.filter((d) => d.status === "Verified").length;
        const pendingCount  = p.documents.filter((d) => d.status === "Pending").length;
        const rejectedCount = p.documents.filter((d) => d.status === "Rejected").length;
        const teamVerified  = p.team.filter((m) => m.verified).length;

        return (
          <div key={p.operator} className="rounded-xl border border-white/10 bg-white/5">
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 cursor-pointer"
              onClick={() => setExpanded(expanded === p.operator ? null : p.operator)}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-white">{p.name}</span>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 flex items-center gap-0.5 hover:text-blue-300">
                      <Globe className="h-3 w-3" /> website
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="text-emerald-400">{verifiedCount} verified</span>
                  <span className="text-amber-400">{pendingCount} pending</span>
                  {rejectedCount > 0 && <span className="text-red-400">{rejectedCount} rejected</span>}
                  <span className="text-blue-400">{teamVerified}/{p.team.length} team verified</span>
                </div>
              </div>
              {expanded === p.operator ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </div>

            {expanded === p.operator && (
              <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
                {/* Documents */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documents</h3>
                  <div className="space-y-2">
                    {p.documents.map((doc) => {
                      const key = `${p.operator}-doc-${doc.id}`;
                      return (
                        <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="text-sm text-white">{doc.label}</span>
                              <DocTypeBadge type={doc.docType} />
                              <VerifBadge status={doc.status} />
                            </div>
                            <p className="text-xs text-gray-600 font-mono">{doc.ipfsHash.slice(0, 24)}…</p>
                          </div>
                          {doc.status === "Pending" && (
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                              <NotesInput onVerify={(notes, status) => sim(key, `${status}: ${doc.label}`)} />
                              {simMsg[key] && <p className="text-xs text-emerald-400">{simMsg[key]}</p>}
                            </div>
                          )}
                          {doc.status !== "Pending" && (
                            <p className="text-xs text-gray-500">{doc.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Team Members</h3>
                  <div className="space-y-2">
                    {p.team.map((member) => {
                      const key = `${p.operator}-member-${member.id}`;
                      return (
                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm text-white">{member.name}</span>
                              <span className="text-xs text-gray-500">— {member.role}</span>
                              {member.verified
                                ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Verified</span>
                                : <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Pending</span>
                              }
                            </div>
                            <p className="text-xs text-gray-500">{member.bio}</p>
                          </div>
                          {!member.verified && (
                            <button
                              onClick={() => sim(key, `${member.name} verified (simulated)`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shrink-0"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Verify
                            </button>
                          )}
                          {simMsg[key] && <p className="text-xs text-emerald-400 shrink-0">{simMsg[key]}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Propose change button */}
                <ProposeChangeForm project={p} isDemoMode={isDemoMode} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Upload Documents ──────────────────────────────────────────────────────────
function UploadDocTab({ isDemoMode }: { isDemoMode: boolean }) {
  const [selectedProject, setSelectedProject] = useState("");
  const [docType,         setDocType]         = useState("GovernmentVerification");
  const [label,           setLabel]           = useState("");
  const [hash,            setHash]            = useState("");
  const [notes,           setNotes]           = useState("");
  const [success,         setSuccess]         = useState(false);

  const submit = () => {
    if (!selectedProject || !hash || !label) return;
    if (isDemoMode) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-base font-semibold text-white">Upload Government Verification / Proof</h2>
      <p className="text-sm text-gray-400">
        Upload documents secured from government authorities. These are encrypted and stored on IPFS.
        Upload directly via the file picker below, or switch to paste-CID mode.
      </p>

      {isDemoMode && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-amber-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Preview mode — actions are simulated
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> Document record saved (simulated)
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="" className="bg-gray-900">Select a project…</option>
            {DEMO_PROJECTS.map((p) => (
              <option key={p.operator} value={p.operator} className="bg-gray-900">{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Document Type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
          >
            {["GovernmentVerification", "OwnershipProof", "TeamPhoto", "TeamBio", "WebsiteEvidence", "Other"].map((t) => (
              <option key={t} value={t} className="bg-gray-900">{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Document Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Export Permit — Zambia Ministry of Mines"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <IpfsUpload
            label="Document File (encrypted)"
            value={hash}
            onChange={setHash}
            isDemoMode={true}
            accept=".pdf,image/*,.doc,.docx"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Verification Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Reference number, authority name, date of confirmation…"
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={!selectedProject || !hash || !label}
          className="w-full rounded-lg px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" /> Save Document Record
        </button>
      </div>
    </div>
  );
}

// ── Propose Change ────────────────────────────────────────────────────────────
function ProposeChangeForm({ project, isDemoMode }: { project: typeof DEMO_PROJECTS[0]; isDemoMode: boolean }) {
  const [field,    setField]    = useState("website");
  const [newValue, setNewValue] = useState("");
  const [simMsg,   setSimMsg]   = useState<string | null>(null);

  const submit = () => {
    if (!newValue) return;
    if (isDemoMode) {
      setSimMsg("Change proposed — awaiting Platform Exec approval (simulated)");
      setNewValue("");
      setTimeout(() => setSimMsg(null), 4000);
    }
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Propose Metadata Change</h3>
      <p className="text-xs text-gray-500 mb-3">Changes require Platform Exec approval before taking effect.</p>

      {simMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {simMsg}
        </div>
      )}

      {project.pendingChanges.filter((c) => !c.executed).map((ch) => (
        <div key={ch.id} className="mb-3 flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-300">
              Pending: change <span className="font-medium">{ch.field}</span> → <span className="font-medium">{ch.newValue}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Proposed {new Date(ch.proposedAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
        >
          {["website", "projectName", "description"].map((f) => (
            <option key={f} value={f} className="bg-gray-900">{f}</option>
          ))}
        </select>
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="New value…"
          className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={submit}
          disabled={!newValue}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition disabled:opacity-50"
        >
          Propose
        </button>
      </div>
    </div>
  );
}

// ── Proof upload + emission approval ─────────────────────────────────────────
function ProofUploadInput({
  onUpload, onApprove, onReject, simKey,
}: {
  onUpload: (cid: string) => void;
  onApprove: () => void;
  onReject: () => void;
  simKey: string;
}) {
  const [proofCid, setProofCid] = useState("");
  const [simMsg,   setSimMsg]   = useState("");

  const doSim = (msg: string) => {
    setSimMsg(msg);
    setTimeout(() => setSimMsg(""), 3000);
  };

  return (
    <div className="space-y-2">
      <IpfsUpload
        label="Verification Proof"
        value={proofCid}
        onChange={setProofCid}
        isDemoMode={true}
        accept=".pdf,image/*"
        placeholder="bafybei…"
      />
      <div className="flex gap-1.5">
        <button
          disabled={!proofCid}
          onClick={() => { onUpload(proofCid); doSim("Proof CID uploaded on-chain."); }}
          className="flex-1 px-2 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium transition"
        >
          Upload Proof
        </button>
        <button
          disabled={!proofCid}
          onClick={() => { onApprove(); doSim("Emission approved — fee sent to admin, 90% to stakers."); }}
          className="flex-1 px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium transition"
        >
          Approve
        </button>
        <button
          onClick={() => { onReject(); doSim("Emission rejected — funds returned to operator."); }}
          className="px-2 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-medium transition"
        >
          Reject
        </button>
      </div>
      {simMsg && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {simMsg}</p>}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function NotesInput({ onVerify }: { onVerify: (notes: string, status: VerificationStatus) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-1.5">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Verification notes…"
        className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-violet-500"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => { onVerify(notes, "Verified"); setNotes(""); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
        >
          <CheckCircle className="h-3 w-3" /> Verify
        </button>
        <button
          onClick={() => { onVerify(notes, "Rejected"); setNotes(""); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-medium transition"
        >
          <XCircle className="h-3 w-3" /> Reject
        </button>
      </div>
    </div>
  );
}

function DocTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    OwnershipProof:        "bg-blue-500/20 text-blue-300",
    GovernmentVerification:"bg-violet-500/20 text-violet-300",
    TeamPhoto:             "bg-amber-500/20 text-amber-300",
    TeamBio:               "bg-indigo-500/20 text-indigo-300",
    WebsiteEvidence:       "bg-cyan-500/20 text-cyan-300",
    Other:                 "bg-gray-500/20 text-gray-300",
  };
  const labels: Record<string, string> = {
    OwnershipProof:        "Ownership",
    GovernmentVerification:"Gov. Verified",
    TeamPhoto:             "Team Photo",
    TeamBio:               "Team Bio",
    WebsiteEvidence:       "Website",
    Other:                 "Other",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${map[type] ?? map.Other}`}>
      {labels[type] ?? type}
    </span>
  );
}

function VerifBadge({ status }: { status: VerificationStatus }) {
  const map = {
    Pending:  { bg: "bg-amber-500/20 text-amber-300",   icon: <Clock className="h-3 w-3" /> },
    Verified: { bg: "bg-emerald-500/20 text-emerald-400", icon: <CheckCircle className="h-3 w-3" /> },
    Rejected: { bg: "bg-red-500/20 text-red-400",       icon: <XCircle className="h-3 w-3" /> },
  };
  const { bg, icon } = map[status];
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${bg}`}>
      {icon} {status}
    </span>
  );
}
