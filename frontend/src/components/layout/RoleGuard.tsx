"use client";

import { useRole, type Role } from "@/hooks/useRole";
import { useDemo } from "@/context/DemoContext";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface RoleGuardProps {
  required: Role | Role[];
  children: React.ReactNode;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

export function RoleGuard({ required, children }: RoleGuardProps) {
  const { isConnected }                    = useAccount();
  const { isDemoMode, hydrated }           = useDemo();
  const { role, isLoading }               = useRole();

  const allowed = Array.isArray(required) ? required : [required];

  // Wait for localStorage to be read before making any role decision
  if (!hydrated) return <Spinner />;

  // ── Demo mode path ────────────────────────────────────────────────────────
  if (isDemoMode) {
    if (allowed.includes(role)) return <>{children}</>;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-400 text-lg font-medium">Wrong dashboard for this preview role</p>
        <p className="text-gray-500 text-sm">
          Use the <span className="text-white">"Preview as"</span> dropdown in the navbar to switch roles.
        </p>
      </div>
    );
  }

  // ── Live wallet path ──────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <p className="text-gray-400 text-lg">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  if (!allowed.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-400 text-lg font-medium">Access denied</p>
        <p className="text-gray-500 text-sm">
          This dashboard requires role: <span className="text-white">{allowed.join(" or ")}</span>.
          Your wallet role: <span className="text-white">{role}</span>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
