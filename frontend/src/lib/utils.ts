import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits, parseUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(amount: bigint, decimals = 2): string {
  return parseFloat(formatUnits(amount, 6)).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatToken(amount: bigint, symbol = "", decimals = 4): string {
  const value = parseFloat(formatUnits(amount, 18));
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function parseUsdc(amount: string): bigint {
  return parseUnits(amount, 6);
}

export function parseToken(amount: string): bigint {
  return parseUnits(amount, 18);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDuration(seconds: bigint | number): string {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (s <= 0) return "Ready";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDate(timestamp: bigint | number): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function progressPercent(raised: bigint, target: bigint): number {
  if (target === 0n) return 0;
  return Math.min(100, Number((raised * 100n) / target));
}
