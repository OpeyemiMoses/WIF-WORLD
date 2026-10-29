import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits, parseUnits } from "viem";
import { WIF_DECIMALS } from "./chain/robinhood";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatWif(
  amountWei: bigint | undefined | null,
  maxFractionDigits = 2
): string {
  if (amountWei === undefined || amountWei === null) return "0";
  const formatted = formatUnits(amountWei, WIF_DECIMALS);
  const [whole, fraction = ""] = formatted.split(".");
  const wholeFormatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (maxFractionDigits === 0 || !fraction) return wholeFormatted;
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${wholeFormatted}.${trimmed}` : wholeFormatted;
}

export function parseWifInput(value: string): bigint | null {
  const cleaned = value.trim();
  if (!cleaned || !/^\d+(\.\d{0,18})?$/.test(cleaned)) return null;
  try {
    const parsed = parseUnits(cleaned, WIF_DECIMALS);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function formatRelativeTime(timestampSeconds?: number): string {
  if (!timestampSeconds) return "Confirmed onchain";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestampSeconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatCountdown(deadlineSeconds: number, nowSeconds?: number): string {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const remaining = deadlineSeconds - now;
  if (remaining <= 0) return "Ended";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

