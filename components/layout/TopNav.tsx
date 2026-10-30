"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Connector, useConnect, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Menu,
  ShieldAlert,
  User,
  Wallet,
  X,
} from "lucide-react";
import {
  WifTokenEmblem,
  WifWorldsGameIcon,
  WifWorldsLogo,
} from "@/components/brand/WifWorldsLogo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useRobinhoodWallet } from "@/lib/contract/useWorldState";
import {
  explorerAddressUrl,
  isAuthorizedAdminAddress,
  ROBINHOOD_CHAIN_ID,
} from "@/lib/chain/robinhood";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

const PUBLIC_NAV_ITEMS = [
  { href: "/world", label: "World" },
  { href: "/events", label: "Events" },
  { href: "/missions", label: "Missions" },
  { href: "/activity", label: "Activity" },
  { href: "/profile", label: "Profile" },
  { href: "/rules", label: "How to Play" },
];

function WalletBrandIcon({
  name,
  iconUrl,
}: {
  name: string;
  iconUrl?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const lower = name.toLowerCase();

  if (iconUrl && !imgFailed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={iconUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        className="h-7 w-7 rounded-md object-contain"
      />
    );
  }

  if (lower.includes("metamask")) {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="8" fill="#1F140E" />
        <path d="M26.5 6L18.2 12.2L19.7 8.5L26.5 6Z" fill="#E17726" />
        <path d="M5.5 6L13.7 12.3L12.3 8.5L5.5 6Z" fill="#E27625" />
        <path d="M23.4 20.8L21.1 24.4L26 25.8L27.4 20.9L23.4 20.8Z" fill="#E27625" />
        <path d="M4.6 20.9L6 25.8L10.9 24.4L8.6 20.8L4.6 20.9Z" fill="#E27625" />
        <path d="M10.6 14.5L9.2 16.6L14.1 16.8L13.9 11.5L10.6 14.5Z" fill="#E27625" />
        <path d="M21.4 14.5L18 11.4L17.9 16.8L22.8 16.6L21.4 14.5Z" fill="#E27625" />
        <path d="M10.9 24.4L13.8 23L11.3 21L10.9 24.4Z" fill="#E27625" />
        <path d="M18.2 23L21.1 24.4L20.7 21L18.2 23Z" fill="#E27625" />
        <path d="M13.9 16.8L11.3 21L14.5 22L13.9 16.8Z" fill="#F5841F" />
        <path d="M18.1 16.8L17.5 22L20.7 21L18.1 16.8Z" fill="#F5841F" />
      </svg>
    );
  }

  if (lower.includes("okx")) {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="8" fill="#0B0D0E" stroke="#333" />
        <rect x="7" y="7" width="6" height="6" rx="1" fill="#FFF" />
        <rect x="19" y="7" width="6" height="6" rx="1" fill="#FFF" />
        <rect x="13" y="13" width="6" height="6" rx="1" fill="#FFF" />
        <rect x="7" y="19" width="6" height="6" rx="1" fill="#FFF" />
        <rect x="19" y="19" width="6" height="6" rx="1" fill="#FFF" />
      </svg>
    );
  }

  if (lower.includes("rabby")) {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="8" fill="#7084FF" />
        <path
          d="M11.5 9C9.5 9 8 10.6 8 12.6V17.5C8 20.5 10.5 23 13.5 23H19.5C22 23 24 21 24 18.5C24 16.2 22.2 14.4 20 14.2V12.5C20 10.5 18.5 9 16.5 9C15.2 9 14.1 9.7 13.5 10.7C13 9.7 12.3 9 11.5 9Z"
          fill="#FFF"
        />
        <circle cx="18.5" cy="17.5" r="1.4" fill="#7084FF" />
      </svg>
    );
  }

  if (lower.includes("coinbase")) {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="8" fill="#0052FF" />
        <circle cx="16" cy="16" r="9" fill="#FFF" />
        <rect x="13" y="13" width="6" height="6" rx="1.5" fill="#0052FF" />
      </svg>
    );
  }

  if (lower.includes("phantom")) {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="8" fill="#AB9FF2" />
        <path
          d="M23.5 15.5C23.5 11.36 20.14 8 16 8C11.3 8 7.5 11.8 7.5 16.5C7.5 20.2 10.1 23 13.2 23C14.5 23 15.6 22.3 16.2 21.3C16.6 22.1 17.4 22.6 18.4 22.6C19.8 22.6 20.9 21.5 21.1 20.1C22.5 19.3 23.5 17.6 23.5 15.5Z"
          fill="#FFF"
        />
        <circle cx="14.2" cy="15" r="1.3" fill="#2C254B" />
        <circle cx="18.2" cy="15" r="1.3" fill="#2C254B" />
      </svg>
    );
  }

  if (lower.includes("trust")) {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="8" fill="#0500FF" />
        <path
          d="M16 7L9 10V15.8C9 20.3 12 24.3 16 25.5C20 24.3 23 20.3 23 15.8V10L16 7Z"
          stroke="#FFF"
          strokeWidth="2.2"
          fill="none"
        />
      </svg>
    );
  }

  return <Wallet className="h-5 w-5 text-crimson-accent" />;
}

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
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Discover all EIP-6963 & injected EVM browser wallets so it never falls back to only OKX
  const detectedWallets = useMemo(() => {
    const specific: Array<{
      key: string;
      name: string;
      subtitle: string;
      icon?: string;
      connector: Connector;
      detected: boolean;
    }> = [];
    const seenNames = new Set<string>();

    for (const c of connectors) {
      const isGenericInjected =
        c.id === "injected" &&
        (c.name.toLowerCase() === "injected" ||
          c.name.toLowerCase() === "browser wallet");
      if (isGenericInjected) continue;

      const norm = c.name.trim().toLowerCase();
      if (seenNames.has(norm)) continue;
      seenNames.add(norm);

      specific.push({
        key: c.uid || c.id,
        name: c.name,
        subtitle: "Detected EVM Browser Extension",
        icon: c.icon,
        connector: c,
        detected: true,
      });
    }

    // Always also include the fallback generic Injected connector if present, or if no EIP-6963 wallets were announced
    const fallbackConnector =
      connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (fallbackConnector) {
      const fallbackName =
        specific.length === 0 &&
        fallbackConnector.name &&
        fallbackConnector.name.toLowerCase() !== "injected"
          ? fallbackConnector.name
          : "Standard Browser EVM Wallet";

      if (!seenNames.has(fallbackName.toLowerCase())) {
        specific.push({
          key: `${fallbackConnector.uid}-fallback`,
          name: fallbackName,
          subtitle:
            specific.length > 0
              ? "Default window.ethereum provider"
              : "MetaMask, Rabby, OKX, Coinbase, or injected wallet",
          icon: fallbackConnector.icon,
          connector: fallbackConnector,
          detected: specific.length === 0,
        });
      }
    }

    return specific;
  }, [connectors]);

  const isAdminWallet = Boolean(
    isConnected && address && isAuthorizedAdminAddress(address)
  );

  // Immediately revoke any server-side admin session if wallet disconnects or is not the Treasury Admin
  useEffect(() => {
    if (!isAdminWallet) {
      fetch("/api/admin/auth", { method: "DELETE" }).catch(() => {});
    }
  }, [isAdminWallet, address]);

  const navItems = isAdminWallet
    ? [...PUBLIC_NAV_ITEMS, { href: "/admin", label: "Admin" }]
    : PUBLIC_NAV_ITEMS;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleConnect = async (chosenConnector?: Connector) => {
    setConnectError(null);
    const preferred = chosenConnector ?? detectedWallets[0]?.connector ?? connectors[0];
    if (!preferred) {
      setConnectError("No compatible EVM browser wallet detected.");
      return;
    }
    setConnectingId(preferred.uid || preferred.id);
    try {
      await connectAsync({ connector: preferred });
      setConnectModalOpen(false);
    } catch (err: unknown) {
      const msg = String(
        (err as { shortMessage?: string; message?: string })?.shortMessage ||
          (err as { message?: string })?.message ||
          ""
      );
      if (
        msg.toLowerCase().includes("provider not found") ||
        msg.toLowerCase().includes("no ethereum")
      ) {
        setConnectError(
          "No EVM wallet detected in this browser. Install MetaMask, Rabby, OKX Wallet, or Coinbase Wallet to sign transactions on Robinhood Chain."
        );
      } else if (msg.toLowerCase().includes("rejected")) {
        setConnectError("Connection request was cancelled in your wallet.");
      } else {
        setConnectError(msg || "Unable to connect wallet.");
      }
    } finally {
      setConnectingId(null);
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
      <header className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 max-lg:landscape:h-12 w-full border-b border-white/[0.07] bg-[#0B0D0C]/92 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          {/* Left: Brand + Primary Navigation */}
          <div className="flex items-center gap-4 lg:gap-10 min-w-0">
            <Link
              href="/"
              className="group flex items-center shrink-0 focus:outline-none"
              aria-label="WIF WORLDS Home"
            >
              <WifWorldsLogo size="sm" className="sm:hidden max-lg:landscape:inline-flex" />
              <WifWorldsLogo size="md" className="hidden sm:inline-flex max-lg:landscape:hidden" />
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                const isAdminTab = item.href === "/admin";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative whitespace-nowrap px-3.5 py-2 text-sm font-semibold transition-colors rounded-lg inline-flex items-center gap-1.5",
                      isAdminTab
                        ? isActive
                          ? "bg-amber-400/15 text-amber-300 border border-amber-400/35"
                          : "text-amber-300/90 hover:text-amber-200 hover:bg-amber-400/10"
                        : isActive
                        ? "text-crimson-accent"
                        : "text-ink-secondary hover:text-ink-primary hover:bg-white/[0.03]"
                    )}
                  >
                    {isAdminTab && <ShieldAlert className="h-3.5 w-3.5" />}
                    {item.label}
                    {isActive && !isAdminTab && (
                      <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-crimson-accent shadow-[0_0_10px_#FF4D5A]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Network Validation + Notification Bell + Wallet Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationCenter />
            {isConnected && isWrongNetwork && (
              <button
                type="button"
                onClick={switchToRobinhood}
                disabled={isSwitchingChain}
                className="whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg border border-crimson/50 bg-crimson-muted/80 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-crimson-accent hover:bg-crimson hover:text-white transition-all"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isSwitchingChain ? "Switching..." : "Switch Network"}
                </span>
              </button>
            )}

            {isConnected && !isWrongNetwork && (
              <div className="hidden xl:inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-surface/90 px-3 py-1.5 text-xs text-ink-secondary whitespace-nowrap">
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
                className="gamified-btn whitespace-nowrap inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-gradient-to-b from-crimson-accent to-crimson px-3 sm:px-4 py-1.5 sm:py-2 max-lg:landscape:py-1.5 text-xs sm:text-sm max-lg:landscape:text-xs font-semibold text-white shadow-crimson-sm hover:brightness-110 transition-all"
              >
                <WifWorldsGameIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" animated={false} />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="gamified-btn whitespace-nowrap inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#161918] hover:border-crimson/40 hover:bg-[#1E2220] px-2.5 sm:px-3 py-1.5 max-lg:landscape:py-1 text-xs sm:text-sm font-medium text-ink-primary transition-all"
                >
                  <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-crimson/45 bg-[#1B0E11] p-1 shadow-[0_0_10px_rgba(230,57,70,0.35)]">
                    <WifWorldsGameIcon className="w-full h-full" animated={false} />
                  </span>
                  <span className="font-mono text-xs sm:text-[13px]">
                    {shortenAddress(address)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-ink-muted transition-transform duration-200",
                      menuOpen && "rotate-180 text-crimson-accent"
                    )}
                  />
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
              className="lg:hidden rounded-lg border border-white/[0.08] bg-surface p-2 max-lg:landscape:p-1.5 text-ink-secondary hover:text-white"
              aria-label="Toggle Menu"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile & Landscape navigation drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden border-b border-white/[0.1] bg-[#0E1110]/98 backdrop-blur-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 shadow-2xl">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-center sm:text-left transition-colors",
                    isActive
                      ? "bg-crimson/20 text-crimson-accent border border-crimson/35"
                      : "bg-white/[0.03] text-ink-secondary hover:bg-white/[0.07] hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div
            className="my-auto w-full max-w-md max-h-[92dvh] flex flex-col rounded-2xl border border-amber-200/20 bg-[#0F1413] p-4 sm:p-6 shadow-[0_28px_90px_rgba(0,0,0,0.95)] overflow-hidden"
            style={{ backgroundColor: "#0F1413" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Connect to WIF WORLDS
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Select your detected EVM browser wallet on Robinhood Chain (Chain ID{" "}
                  {ROBINHOOD_CHAIN_ID}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {detectedWallets.map((w) => {
                const isThisConnecting =
                  isConnecting &&
                  (connectingId === w.connector.uid ||
                    connectingId === w.connector.id);
                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => handleConnect(w.connector)}
                    disabled={isConnecting}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.12] bg-[#161D1B] hover:bg-[#1D2623] hover:border-crimson-accent px-4 py-3 text-left transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[#0D1110] p-1.5 shadow-inner">
                        <WalletBrandIcon name={w.name} iconUrl={w.icon} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {isThisConnecting
                              ? `Connecting ${w.name}...`
                              : w.name}
                          </span>
                          {w.detected && (
                            <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                              Detected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {w.subtitle}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-crimson-accent group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                      Connect →
                    </span>
                  </button>
                );
              })}

              {connectError && (
                <div className="rounded-xl border border-crimson/50 bg-[#241114] p-3 text-xs text-slate-200">
                  {connectError}
                </div>
              )}

              <div className="rounded-xl border border-white/[0.08] bg-[#0A0E0D] p-3.5 text-[11px] text-slate-300 space-y-1.5 mt-3">
                <div className="flex justify-between">
                  <span>Target Network:</span>
                  <span className="font-mono text-white">
                    Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Action Token:</span>
                  <span className="font-mono text-white">$WIF (ERC-20)</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Gas:</span>
                  <span className="font-mono text-white">ETH (paid separately)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

