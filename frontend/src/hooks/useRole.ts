"use client";

import { useAccount, useReadContracts } from "wagmi";
import { ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";
import { useDemo } from "@/context/DemoContext";

export type Role = "admin" | "adminOperator" | "platformExec" | "project" | "investor" | "unknown";

export function useRole(): { role: Role; isLoading: boolean } {
  const { address, isConnected }           = useAccount();
  const { demoRole, isDemoMode, hydrated } = useDemo();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "admin" },
      { address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "adminOperator" },
      { address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "platformExec" },
      {
        address: ADDRESSES.registry, abi: REGISTRY_ABI,
        functionName: "isApprovedProject",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
      {
        address: ADDRESSES.registry, abi: REGISTRY_ABI,
        functionName: "isBanned",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
    ],
    query: { enabled: hydrated && !isDemoMode && isConnected && !!address },
  });

  if (!hydrated) return { role: "unknown", isLoading: true };
  if (isDemoMode && demoRole) return { role: demoRole, isLoading: false };
  if (!isConnected || !address) return { role: "unknown", isLoading: false };
  if (isLoading)                return { role: "unknown", isLoading: true  };

  const adminAddr         = data?.[0].result as string  | undefined;
  const adminOperatorAddr = data?.[1].result as string  | undefined;
  const platformExecAddr  = data?.[2].result as string  | undefined;
  const isProject         = data?.[3].result as boolean | undefined;
  const isBanned          = data?.[4].result as boolean | undefined;

  if (isBanned)                                                    return { role: "unknown",       isLoading: false };
  if (adminAddr?.toLowerCase()         === address.toLowerCase())  return { role: "admin",         isLoading: false };
  if (adminOperatorAddr?.toLowerCase() === address.toLowerCase())  return { role: "adminOperator", isLoading: false };
  if (platformExecAddr?.toLowerCase()  === address.toLowerCase())  return { role: "platformExec",  isLoading: false };
  if (isProject)                                                   return { role: "project",       isLoading: false };
  return                                                                  { role: "investor",      isLoading: false };
}
