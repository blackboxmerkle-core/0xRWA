"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Role } from "@/hooks/useRole";

interface DemoContextType {
  demoRole:    Role | null;
  setDemoRole: (role: Role | null) => void;
  isDemoMode:  boolean;
  hydrated:    boolean;   // true once localStorage has been read client-side
}

const DemoContext = createContext<DemoContextType>({
  demoRole:    null,
  setDemoRole: () => {},
  isDemoMode:  false,
  hydrated:    false,
});

const STORAGE_KEY = "0xrwa_demo_role";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demoRole,  _setDemoRole] = useState<Role | null>(null);
  const [hydrated,  setHydrated]  = useState(false);

  // Read localStorage after first client-side paint — avoids SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored) _setDemoRole(stored);
    } catch {}
    setHydrated(true);
  }, []);

  const setDemoRole = (role: Role | null) => {
    _setDemoRole(role);
    try {
      if (role) localStorage.setItem(STORAGE_KEY, role);
      else       localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <DemoContext.Provider value={{ demoRole, setDemoRole, isDemoMode: demoRole !== null, hydrated }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
