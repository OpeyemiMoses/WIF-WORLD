"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnect, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Menu,
  User,
  Wallet,
  X,
} from "lucide-react";
import { WifTokenEmblem, WifWorldsLogo } from "@/components/brand/WifWorldsLogo";
import { useRobinhoodWallet } from "@/lib/contract/useWorldState";
import { explorerAddressUrl, ROBINHOOD_CHAIN_ID } from "@/lib/chain/robinhood";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/world", label: "World" },
  { href: "/events", label: "Events" },
  { href: "/profile", label: "Profile" },
];

export function TopNav() {
  const pathname = usePathname();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    address,
    isConnected,
    isWrongNetwork,
    isSwitchingChain,
    switchToRobinhood,
    wifBalance,
    ethBalance,
  } = useRobinhoodWallet();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleConnect = async () => {
    setConnectError(null);
    const preferred = connectors[0];
    if (!preferred) {
      setConnectError("No compatible EVM browser wallet detected.");
      return;
    }
    try {
      await connectAsync({ connector: preferred });
      setConnectModalOpen(false);
    } catch (err: unknown) {
      const msg = String((err as { shortMessage?: string; message?: string })?.shortMessage || (err as { message?: string })?.message || "");
      if (msg.toLowerCase().includes("provider not found") || msg.toLowerCase().includes("no ethereum")) {
        setConnectError(
          "No EVM wallet detected in this browser. Install MetaMask, Rabby, or Coinbase Wallet to sign transactions on Robinhood Chain."
        );
      } else if (msg.toLowerCase().includes("rejected")) {
        setConnectError("Connection request was cancelled in your wallet.");
      } else {
        setConnectError(msg || "Unable to connect wallet.");
      }
    }
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-16 w-full border-b border-white/[0.07] bg-[#0B0D0C]/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand + Primary Navigation */}
          <div className="flex items-center gap-8 lg:gap-12">
            <Link
              href="/"
              className="group flex items-center focus:outline-none"
              aria-label="WIF WORLDS Home"
            >
              <WifWorldsLogo size="md" />
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Main">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative px-4 py-2 text-sm font-semibold transition-colors rounded-lg",
                      isActive
                        ? "text-crimson-accent"
                        : "text-ink-secondary hover:text-ink-primary hover:bg-white/[0.03]"
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-crimson-accent shadow-[0_0_10px_#FF4D5A]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Network Validation + Wallet Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {isConnected && isWrongNetwork && (
              <button
                type="button"
                onClick={switchToRobinhood}
                disabled={isSwitchingChain}
                className="inline-flex items-center gap-1.5 rounded-lg border border-crimson/50 bg-crimson-muted/80 px-3 py-1.5 text-xs font-semibold text-crimson-accent hover:bg-crimson hover:text-white transition-all"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>
                  {isSwitchingChain ? "Switching..." : "Switch to Robinhood Chain"}
                </span>
              </button>
            )}

            {isConnected && !isWrongNetwork && (
              <div className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-surface/90 px-3 py-1.5 text-xs text-ink-secondary">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>Robinhood Chain</span>
                <span className="text-white/20">|</span>
                <WifTokenEmblem className="w-4 h-4" />
                <span className="font-mono font-semibold text-ink-primary">
                  {formatWif(wifBalance, 2)} $WIF
                </span>
              </div>
            )}

            {!isConnected ? (
              <button
                type="button"
                onClick={() => {
                  setConnectError(null);
                  setConnectModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-crimson-accent to-crimson px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-crimson-sm hover:brightness-110 active:scale-[0.99] transition-all"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2.5 rounded-lg border border-white/[0.1] bg-[#161918] hover:bg-[#1E2220] px-3 py-1.5 text-xs sm:text-sm font-medium text-ink-primary transition-colors"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-crimson-accent to-crimson-deep text-[10px] font-bold text-white">
                    {address ? address.slice(2, 4).toUpperCase() : "WW"}
                  </span>
                  <span className="font-mono text-xs sm:text-[13px]">
                    {shortenAddress(address)}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
                </button>

                {menuOpen && address && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/[0.1] bg-[#131615] p-3.5 shadow-panel z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-ink-muted">
                          Connected Wallet
                        </p>
                        <p className="font-mono text-xs text-ink-primary mt-0.5">
                          {shortenAddress(address, 6)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleCopyAddress}
                          className="rounded-md p-1.5 text-ink-secondary hover:bg-white/[0.06] hover:text-white transition-colors"
                          title="Copy address"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={explorerAddressUrl(address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md p-1.5 text-ink-secondary hover:bg-white/[0.06] hover:text-white transition-colors"
                          title="View on Robinhood Chain Explorer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    <div className="py-3 space-y-2 border-b border-white/[0.07]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">$WIF Balance</span>
                        <span className="font-mono font-semibold text-ink-primary">
                          {formatWif(wifBalance, 2)} $WIF
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">Gas Balance (ETH)</span>
                        <span className="font-mono text-ink-secondary">
                          {Number(formatUnits(ethBalance, 18)).toFixed(4)} ETH
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">Network</span>
                        <span
                          className={cn(
                            "font-medium",
                            isWrongNetwork ? "text-crimson-accent" : "text-emerald-400"
                          )}
                        >
                          {isWrongNetwork
                            ? "Wrong Network"
                            : `Robinhood (${ROBINHOOD_CHAIN_ID})`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 space-y-1">
                      <Link
                        href={`/profile/${address}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-secondary hover:bg-white/[0.06] hover:text-white transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-crimson-accent" />
                        <span>View Builder Profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          disconnect();
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-crimson-accent hover:bg-crimson/10 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden rounded-lg border border-white/[0.08] bg-surface p-2 text-ink-secondary hover:text-white"
              aria-label="Toggle Menu"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-white/[0.08] bg-[#0E1110] px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-semibold",
                    isActive
                      ? "bg-crimson/15 text-crimson-accent"
                      : "text-ink-secondary hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Wallet Connection Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#121514] p-6 shadow-panel">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-primary">
                  Connect to WIF WORLDS
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  Connect an EVM wallet on Robinhood Chain (Chain ID {ROBINHOOD_CHAIN_ID}).
                  Never enter a seed phrase or private key.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex w-full items-center justify-between rounded-xl border border-crimson/40 bg-gradient-to-r from-[#221114] to-[#171A19] px-4 py-3.5 text-left hover:border-crimson-accent transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink-primary">
                      {isConnecting ? "Requesting Wallet..." : "Browser EVM Wallet"}
                    </div>
                    <div className="text-xs text-ink-muted">
                      MetaMask, Rabby, Coinbase Wallet, or injected provider
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-crimson-accent">
                  Connect →
                </span>
              </button>

              {connectError && (
                <div className="rounded-xl border border-crimson/40 bg-crimson-muted/40 p-3 text-xs text-ink-secondary">
                  {connectError}
                </div>
              )}

              <div className="rounded-xl border border-white/[0.06] bg-obsidian/70 p-3.5 text-[11px] text-ink-muted space-y-1">
                <div className="flex justify-between">
                  <span>Target Network:</span>
                  <span className="font-mono text-ink-secondary">
                    Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Action Token:</span>
                  <span className="font-mono text-ink-secondary">$WIF (ERC-20)</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Gas:</span>
                  <span className="font-mono text-ink-secondary">ETH (paid separately)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

