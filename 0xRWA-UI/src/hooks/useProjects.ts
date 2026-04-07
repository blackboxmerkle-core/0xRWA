"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";
import { type Address } from "viem";

export type ProjectInfo = {
  operator: Address;
  name: string;
  active: boolean;
  token: Address;
  sale: Address;
  staking: Address;
  burnReserve: Address;
  revenueRouter: Address;
};

export function useProjects(): { projects: ProjectInfo[]; isLoading: boolean } {
  const { data: operators, isLoading: loadingOps } = useReadContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getAllOperators",
  });

  const opList = (operators as Address[] | undefined) ?? [];

  const { data: details, isLoading: loadingDetails } = useReadContracts({
    contracts: opList.flatMap((op) => [
      { address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "getProjectName",      args: [op] },
      { address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "isProjectActive",     args: [op] },
      { address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "getProjectContracts", args: [op] },
    ]),
    query: { enabled: opList.length > 0 },
  });

  const projects: ProjectInfo[] = opList.map((op, i) => {
    const base = i * 3;
    const contracts = details?.[base + 2]?.result as { token: Address; sale: Address; staking: Address; burnReserve: Address; revenueRouter: Address } | undefined;
    return {
      operator:      op,
      name:          (details?.[base]?.result as string) ?? "",
      active:        (details?.[base + 1]?.result as boolean) ?? false,
      token:         contracts?.token         ?? "0x0",
      sale:          contracts?.sale          ?? "0x0",
      staking:       contracts?.staking       ?? "0x0",
      burnReserve:   contracts?.burnReserve   ?? "0x0",
      revenueRouter: contracts?.revenueRouter ?? "0x0",
    };
  });

  return { projects, isLoading: loadingOps || loadingDetails };
}
