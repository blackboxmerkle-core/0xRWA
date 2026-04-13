"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRole, type Role } from "@/hooks/useRole";
import { useDemo } from "@/context/DemoContext";
import { ShieldCheck, Pickaxe, TrendingUp, Briefcase, Gavel, ChevronDown, Eye, X } from "lucide-react";

const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
                      process.env.NODE_ENV === "production";

const ROLE_OPTIONS: {
  role: Role;
  label: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  adminOnly?: boolean;
}[] = [
  { role: "investor",      label: "Investor",        icon: <TrendingUp  className="h-4 w-4" />, color: "text-indigo-400",  href: "/investor"      },
  { role: "project",       label: "Mining Project",  icon: <Pickaxe     className="h-4 w-4" />, color: "text-amber-400",   href: "/project"       },
  { role: "admin",         label: "Admin",           icon: <ShieldCheck className="h-4 w-4" />, color: "text-emerald-400", href: "/admin",         adminOnly: true },
  { role: "adminOperator", label: "Admin Operator",  icon: <Briefcase   className="h-4 w-4" />, color: "text-violet-400",  href: "/admin-operator",adminOnly: true },
  { role: "platformExec",  label: "Platform Exec",   icon: <Gavel       className="h-4 w-4" />, color: "text-rose-400",    href: "/platform-exec", adminOnly: true },
];

const DASHBOARD_ICON: Partial<Record<Role, React.ReactNode>> = {
  admin:         <ShieldCheck className="h-4 w-4 text-emerald-400" />,
  adminOperator: <Briefcase   className="h-4 w-4 text-violet-400"  />,
  platformExec:  <Gavel       className="h-4 w-4 text-rose-400"    />,
  project:       <Pickaxe     className="h-4 w-4 text-amber-400"   />,
  investor:      <TrendingUp  className="h-4 w-4 text-indigo-400"  />,
};

export function Navbar() {
  const { role }                              = useRole();
  const { demoRole, setDemoRole, isDemoMode } = useDemo();
  const [open, setOpen]                       = useState(false);
  const ref                                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dashboardOpt = ROLE_OPTIONS.find((o) => o.role === role);
  const activeOption = ROLE_OPTIONS.find((o) => o.role === demoRole);

  const visibleOptions = IS_PRODUCTION
    ? ROLE_OPTIONS.filter((o) => !o.adminOnly)
    : ROLE_OPTIONS;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 p-1.5">
              <Pickaxe className="h-4 w-4 text-black" />
            </div>
            <div className="leading-none">
              <span className="text-base font-black text-white tracking-tight">0xRWA</span>
              <span className="hidden sm:inline text-xs text-yellow-400 font-semibold ml-1.5 tracking-wider uppercase">Mining</span>
            </div>
          </Link>

          {/* Dashboard link for current role */}
          {dashboardOpt && (
            <Link
              href={dashboardOpt.href}
              className="hidden sm:flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition"
            >
              {DASHBOARD_ICON[role]}
              My Dashboard
            </Link>
          )}

          <div className="flex items-center gap-3 ml-auto">
            {isDemoMode && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-400">
                <Eye className="h-3 w-3" /> Preview
              </span>
            )}

            {/* Role selector dropdown */}
            <div ref={ref} className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  isDemoMode
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {activeOption ? (
                  <>
                    <span className={activeOption.color}>{activeOption.icon}</span>
                    <span className="hidden sm:inline">{activeOption.label}</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Preview as</span>
                  </>
                )}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-gray-900 shadow-xl overflow-hidden z-50">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Preview as role</p>
                  </div>

                  {visibleOptions.map((opt) => (
                    <button
                      key={opt.role}
                      onClick={() => {
                        setDemoRole(demoRole === opt.role ? null : opt.role);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition hover:bg-white/5 ${
                        demoRole === opt.role ? "bg-white/5" : ""
                      }`}
                    >
                      <span className={opt.color}>{opt.icon}</span>
                      <span className="text-gray-200">{opt.label}</span>
                      {demoRole === opt.role && (
                        <span className="ml-auto text-xs text-green-400 font-medium">Active</span>
                      )}
                    </button>
                  ))}

                  {isDemoMode && (
                    <>
                      <div className="border-t border-white/10" />
                      <button
                        onClick={() => { setDemoRole(null); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left text-red-400 hover:bg-white/5 transition"
                      >
                        <X className="h-4 w-4" />
                        Exit Preview
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Wallet connect */}
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </div>
    </nav>
  );
}
