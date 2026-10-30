"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useBalance,
  useConnect,
  useReadContract,
  useSignMessage,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import {
  Activity,
  CheckCircle2,
  Coins,
  Compass,
  ExternalLink,
  Flame,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageCastleBackdrop } from "@/components/layout/PageCastleBackdrop";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import {
  ADMIN_WALLET_ADDRESS,
  explorerAddressUrl,
  explorerTxUrl,
  isAuthorizedAdminAddress,
  ROBINHOOD_CHAIN_ID,
  TREASURY_ADDRESS,
  WIF_DECIMALS,
  WIF_TOKEN_ADDRESS,
} from "@/lib/chain/robinhood";
import { ERC20_ABI, WIF_WORLDS_ABI } from "@/lib/contract/abi";
import { useRobinhoodWallet, useWorldData } from "@/lib/contract/useWorldState";
import {
  formatCoords,
  REGIONS,
  STRUCTURE_META,
  TERRAIN_META,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

type AdminTab =
  | "overview"
  | "players"
  | "world"
  | "events"
  | "treasury"
  | "transactions"
  | "settings";

interface AuditEntry {
  id: string;
  walletAddress: string;
  action: string;
  category: string;
  details: string;
  txHash?: string;
  timestamp: number;
}

export default function PrivateAdminDashboardPage() {
  const router = useRouter();
  const { connectors, connectAsync } = useConnect();
  const {
    address,
    isConnected,
    isWrongNetwork,
    switchToRobinhood,
  } = useRobinhoodWallet();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const connectWallet = async () => {
    const preferred = connectors[0];
    if (!preferred) return;
    try {
      await connectAsync({ connector: preferred });
    } catch {
      // handled by wallet prompt
    }
  };

  const isAuthorizedWallet = Boolean(
    isConnected && address && isAuthorizedAdminAddress(address)
  );

  const [sessionVerified, setSessionVerified] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingAuth, setSigningAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [playerSearch, setPlayerSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // Event configuration form state
  const [cfgEventId, setCfgEventId] = useState("1");
  const [cfgTitle, setCfgTitle] = useState("The Great Bridge");
  const [cfgTargetWif, setCfgTargetWif] = useState("500");
  const [cfgTargetTile, setCfgTargetTile] = useState("3");
  const [cfgTargetRegion, setCfgTargetRegion] = useState("1");
  const [cfgWood, setCfgWood] = useState("1200");
  const [cfgStone, setCfgStone] = useState("900");
  const [cfgFood, setCfgFood] = useState("600");
  const [cfgActive, setCfgActive] = useState(true);
  const [adminTxStatus, setAdminTxStatus] = useState<string | null>(null);
  const [isSubmittingAdminAction, setIsSubmittingAdminAction] = useState(false);

  // Immediately clear admin session if wallet disconnects or changes to a non-admin address
  useEffect(() => {
    if (!isAuthorizedWallet || !address) {
      setSessionVerified(false);
      setAuditLog([]);
      setCheckingSession(false);
      fetch("/api/admin/auth", { method: "DELETE" }).catch(() => {});
      return;
    }

    let cancelled = false;
    setCheckingSession(true);
    fetch(`/api/admin/auth?wallet=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setSessionVerified(Boolean(data?.authenticated));
      })
      .catch(() => {
        if (!cancelled) setSessionVerified(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, isAuthorizedWallet]);

  const loadAuditLog = useCallback(async () => {
    if (!isAuthorizedWallet || !address || !sessionVerified) return;
    try {
      const res = await fetch(
        `/api/admin/audit?wallet=${encodeURIComponent(address)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.auditLog)) {
        setAuditLog(data.auditLog);
      }
    } catch {
      // ignore
    }
  }, [address, isAuthorizedWallet, sessionVerified]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const handleSignAdminChallenge = async () => {
    if (!address || !isAuthorizedWallet) return;
    setAuthError(null);
    setSigningAuth(true);
    try {
      const challengeRes = await fetch(
        `/api/admin/auth?wallet=${encodeURIComponent(
          address
        )}&action=challenge`
      );
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok || !challengeData.nonce || !challengeData.message) {
        throw new Error(
          challengeData.error || "Unable to issue admin security nonce"
        );
      }

      const signature = await signMessageAsync({
        message: challengeData.message,
      });

      const verifyRes = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          nonce: challengeData.nonce,
          signature,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.authenticated) {
        throw new Error(
          verifyData.error || "Signature verification failed"
        );
      }

      setSessionVerified(true);
      await loadAuditLog();
    } catch (err: unknown) {
      const msg =
        (err as { shortMessage?: string; message?: string })?.shortMessage ||
        (err as { message?: string })?.message ||
        "Admin authentication cancelled or failed.";
      setAuthError(msg);
    } finally {
      setSigningAuth(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => {});
    setSessionVerified(false);
    router.push("/world");
  };

  // World & Blockchain Data (Only displayed when authorized & authenticated)
  const {
    isContractDeployed,
    contractAddress,
    treasuryAddress,
    allPlayableTiles,
    regionUnlockedMap,
    worldEvent,
    regionalRankings,
    activities,
    isLoadingWorld,
    refreshAllWorldState,
  } = useWorldData(isAuthorizedWallet ? address : undefined, 0);

  const effectiveTreasury =
    treasuryAddress ?? TREASURY_ADDRESS;

  // Live Treasury Current Balance on Robinhood Chain
  const { data: treasuryWifRaw, refetch: refetchTreasuryWif } = useReadContract({
    address: WIF_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [effectiveTreasury],
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: isAuthorizedWallet && sessionVerified,
    },
  });

  const { data: treasuryEthData } = useBalance({
    address: effectiveTreasury,
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: isAuthorizedWallet && sessionVerified,
    },
  });

  const currentTreasuryWif = (treasuryWifRaw as bigint | undefined) ?? 0n;

  // Financial Metrics: Clearly separate Current Balance vs Historical Total Received vs Event Contributions
  const treasuryMetrics = useMemo(() => {
    let historicalTotalReceived = 0n;
    let eventContributionsReceived = 0n;
    let constructionAndClaimReceived = 0n;

    for (const act of activities) {
      if (act.wifAmount > 0n) {
        historicalTotalReceived += act.wifAmount;
        if (act.kind === "event") {
          eventContributionsReceived += act.wifAmount;
        } else {
          constructionAndClaimReceived += act.wifAmount;
        }
      }
    }

    return {
      historicalTotalReceived,
      eventContributionsReceived,
      constructionAndClaimReceived,
    };
  }, [activities]);

  // Global World Analytics across all playable regions
  const globalStats = useMemo(() => {
    let claimed = 0;
    let claimable = 0;
    let settlements = 0;
    let structures = 0;

    for (const t of allPlayableTiles) {
      if (TERRAIN_META[t.terrain].claimable) claimable++;
      const owned = t.owner && t.owner.toLowerCase() !== ZERO_ADDRESS;
      if (owned) claimed++;
      if (t.settlementLevel > 0) settlements++;
      if (t.structureType !== 0) structures++;
    }

    return {
      totalTiles: allPlayableTiles.length,
      claimable,
      claimed,
      unclaimed: Math.max(0, claimable - claimed),
      settlements,
      structures,
    };
  }, [allPlayableTiles]);

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return regionalRankings;
    return regionalRankings.filter(
      (p) =>
        p.address.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q)
    );
  }, [playerSearch, regionalRankings]);

  const filteredTxs = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.player.toLowerCase().includes(q) ||
        a.txHash.toLowerCase().includes(q) ||
        a.kind.toLowerCase().includes(q)
    );
  }, [activities, txSearch]);

  const handleSaveAndConfigureEvent = async () => {
    if (!isAuthorizedWallet || !sessionVerified || !address) return;
    setIsSubmittingAdminAction(true);
    setAdminTxStatus(null);

    try {
      let submittedHash: `0x${string}` | undefined;

      // If WIFWorlds contract is deployed on Robinhood Chain, execute onchain configureEvent
      if (isContractDeployed && contractAddress && !isWrongNetwork) {
        const targetWei = parseUnits(cfgTargetWif || "500", WIF_DECIMALS);
        submittedHash = await writeContractAsync({
          address: contractAddress,
          abi: WIF_WORLDS_ABI,
          functionName: "configureEvent",
          args: [
            BigInt(Number(cfgEventId) || 1),
            cfgTitle,
            Number(cfgTargetTile) || 3,
            Number(cfgTargetRegion) || 1,
            targetWei,
            0n,
            cfgActive,
            cfgActive,
          ],
          chainId: ROBINHOOD_CHAIN_ID,
        });
      }

      // Record event metadata & immutable audit log entry on server
      const targetRegionObj =
        REGIONS.find((r) => r.id === Number(cfgTargetRegion)) ?? REGIONS[1];

      const res = await fetch(
        `/api/admin/audit?wallet=${encodeURIComponent(address)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "configure_event",
            txHash: submittedHash,
            eventMeta: {
              eventId: Number(cfgEventId) || 1,
              title: cfgTitle,
              subtitle: `Regional Objective • Unlocks ${targetRegionObj.name}`,
              story: `Community objective targeting ${targetRegionObj.name}.`,
              targetRegionId: targetRegionObj.id,
              targetRegionName: targetRegionObj.name,
              targetTileId: Number(cfgTargetTile) || 3,
              targetWifDisplay: cfgTargetWif,
              requiredMaterials: {
                wood: Number(cfgWood) || 0,
                stone: Number(cfgStone) || 0,
                food: Number(cfgFood) || 0,
              },
              unlockReward: `Unlocks ${targetRegionObj.name}`,
              active: cfgActive,
              completed: false,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.auditLog)) setAuditLog(data.auditLog);
      }

      await refreshAllWorldState();
      setAdminTxStatus(
        submittedHash
          ? `Event #${cfgEventId} configured onchain & logged (${shortenAddress(
              submittedHash
            )}).`
          : `Event #${cfgEventId} configuration saved & recorded in Admin Audit Log.`
      );
    } catch (err: unknown) {
      const msg =
        (err as { shortMessage?: string; message?: string })?.shortMessage ||
        (err as { message?: string })?.message ||
        "Failed to configure event.";
      setAdminTxStatus(msg);
    } finally {
      setIsSubmittingAdminAction(false);
    }
  };

  const handleToggleRegionUnlock = async (
    regionId: number,
    unlocked: boolean
  ) => {
    if (!isAuthorizedWallet || !sessionVerified || !address) return;
    setIsSubmittingAdminAction(true);
    setAdminTxStatus(null);
    try {
      let submittedHash: `0x${string}` | undefined;
      if (isContractDeployed && contractAddress && !isWrongNetwork) {
        submittedHash = await writeContractAsync({
          address: contractAddress,
          abi: WIF_WORLDS_ABI,
          functionName: "setRegionUnlocked",
          args: [regionId, unlocked],
          chainId: ROBINHOOD_CHAIN_ID,
        });
      }

      await fetch(`/api/admin/audit?wallet=${encodeURIComponent(address)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `${unlocked ? "Unlocked" : "Locked"} Region ${regionId}`,
          category: "world",
          details: `Region ${regionId} (${
            REGIONS[regionId]?.name ?? "Region"
          }) set to unlocked=${unlocked}`,
          txHash: submittedHash,
        }),
      });

      await Promise.all([refreshAllWorldState(), loadAuditLog()]);
      setAdminTxStatus(`Region ${regionId} state updated.`);
    } catch (err: unknown) {
      const msg =
        (err as { shortMessage?: string; message?: string })?.shortMessage ||
        "Failed to update region.";
      setAdminTxStatus(msg);
    } finally {
      setIsSubmittingAdminAction(false);
    }
  };

  // ==========================================================================
  // STRICT ACCESS GATE 1: NON-ADMIN OR DISCONNECTED WALLETS SEE ZERO ADMIN UI
  // ==========================================================================
  if (!isAuthorizedWallet) {
    return (
      <div className="relative flex-1 flex items-center justify-center bg-[#070B0E] p-6">
        <PageCastleBackdrop />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#101413]/95 p-8 text-center shadow-panel backdrop-blur-xl space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-crimson/40 bg-crimson/15 text-crimson-accent">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-white">
              Restricted Area
            </h1>
            <p className="text-xs text-ink-secondary leading-relaxed">
              This route is strictly reserved for the designated WIF WORLDS
              owner wallet. Player accounts do not have access to this area.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
            {!isConnected && (
              <button
                type="button"
                onClick={connectWallet}
                className="rounded-xl border border-white/[0.12] bg-white/[0.05] px-5 py-2.5 text-xs font-bold text-white hover:bg-white/[0.1]"
              >
                Connect Wallet
              </button>
            )}
            <Link
              href="/world"
              className="rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-5 py-2.5 text-xs font-bold text-white shadow-crimson"
            >
              Return to World Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STRICT ACCESS GATE 2: CRYPTOGRAPHIC SIGNATURE VERIFICATION FOR TREASURY OWNER
  // ==========================================================================
  if (checkingSession || !sessionVerified) {
    return (
      <div className="relative flex-1 flex items-center justify-center bg-[#070B0E] p-6">
        <PageCastleBackdrop />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-amber-300/30 bg-[#101413]/96 p-8 shadow-panel backdrop-blur-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/15 text-amber-300">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
                Private Owner Verification
              </span>
              <h1 className="text-xl font-extrabold text-white">
                Verify Treasury Admin Signature
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Connected wallet matches the designated Treasury Administrator (
            <span className="font-mono text-white">
              {shortenAddress(address, 6)}
            </span>
            ). Sign a one-time cryptographic challenge to unlock operational
            controls and audit logs. No gas fee is required.
          </p>

          {authError && (
            <div className="rounded-xl border border-crimson/40 bg-crimson-muted/40 p-3 text-xs text-crimson-accent">
              {authError}
            </div>
          )}

          <button
            type="button"
            disabled={checkingSession || signingAuth}
            onClick={handleSignAdminChallenge}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 py-3.5 text-sm font-extrabold text-black shadow-lg hover:brightness-105 disabled:opacity-50"
          >
            {(checkingSession || signingAuth) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>
              {checkingSession
                ? "Checking Session..."
                : signingAuth
                ? "Awaiting Signature in Wallet..."
                : "Sign Cryptographic Admin Challenge"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VERIFIED PRIVATE ADMINISTRATION DASHBOARD
  // ==========================================================================
  return (
    <div className="relative flex-1 overflow-y-auto bg-[#070B0E]">
      <PageCastleBackdrop />

      <div className="relative z-10 mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Private Admin Header */}
        <section className="rounded-3xl border border-amber-300/25 bg-[#101413]/94 p-6 backdrop-blur-xl shadow-panel flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Private Treasury Administration • Session Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              WIF WORLDS Operations Command
            </h1>
            <p className="text-xs text-ink-muted font-mono">
              Authorized Owner: {ADMIN_WALLET_ADDRESS}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isWrongNetwork && (
              <button
                type="button"
                onClick={switchToRobinhood}
                className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-black"
              >
                Switch to Robinhood Chain
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await Promise.all([
                  refreshAllWorldState(),
                  refetchTreasuryWif(),
                  loadAuditLog(),
                ]);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-white"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isLoadingWorld && "animate-spin")}
              />
              <span>Refresh Chain Data</span>
            </button>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="rounded-xl border border-crimson/40 bg-crimson/15 px-3.5 py-2 text-xs font-bold text-crimson-accent hover:bg-crimson hover:text-white transition-colors"
            >
              End Admin Session
            </button>
          </div>
        </section>

        {/* 7-Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/[0.1] bg-[#101413]/92 p-2 backdrop-blur-md">
          {(
            [
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "players", label: "Players", icon: Users },
              { id: "world", label: "World", icon: Compass },
              { id: "events", label: "Events", icon: Flame },
              { id: "treasury", label: "Treasury", icon: Coins },
              { id: "transactions", label: "Transactions", icon: Activity },
              {
                id: "settings",
                label: "Settings & Audit Log",
                icon: Settings,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                  active
                    ? "bg-gradient-to-b from-amber-400 to-amber-500 text-black shadow"
                    : "text-ink-secondary hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {adminTxStatus && (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200 flex items-center justify-between">
            <span>{adminTxStatus}</span>
            <button
              type="button"
              onClick={() => setAdminTxStatus(null)}
              className="text-emerald-300 underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Active Builders"
                value={String(regionalRankings.length)}
                sub="Unique wallets owning tiles or contributing"
              />
              <MetricCard
                label="Claimed World Tiles"
                value={`${globalStats.claimed} / ${globalStats.claimable}`}
                sub={`${globalStats.unclaimed} claimable tiles remaining`}
              />
              <MetricCard
                label="Settlements & Structures"
                value={`${globalStats.settlements} Settl • ${globalStats.structures} Struct`}
                sub="Verified permanent onchain buildings"
              />
              <MetricCard
                label="Current Treasury $WIF"
                value={`${formatWif(currentTreasuryWif, 2)} $WIF`}
                sub="Live ERC-20 balance on Robinhood Chain"
                accent
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-3">
                <h2 className="text-base font-bold text-white">
                  Active World Event Status
                </h2>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Event #1</span>
                  <span className="font-bold text-white">
                    {worldEvent.title === "Build the Beacon"
                      ? "The Great Bridge"
                      : worldEvent.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Onchain Progress</span>
                  <span className="font-mono font-bold text-crimson-accent">
                    {formatWif(worldEvent.totalContributed, 2)} /{" "}
                    {formatWif(worldEvent.targetAmount, 0)} $WIF
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Target Unlock</span>
                  <span className="text-amber-300 font-semibold">
                    Region 2: The Wild Frontier (
                    {regionUnlockedMap[1] ? "Unlocked" : "Locked"})
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-3">
                <h2 className="text-base font-bold text-white">
                  Player Ownership Safeguards
                </h2>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  By smart contract design, player-owned tiles, settlement
                  halls, and harvested materials are immutable to administrative
                  actions. Admin permissions are strictly scoped to creating new
                  world events, unlocking future frontier regions, and managing
                  treasury parameters.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: PLAYERS */}
        {activeTab === "players" && (
          <section className="rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Registered Realm Builders ({filteredPlayers.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Read-only directory indexed from verified Robinhood Chain tile
                  ownership & events
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Search wallet address..."
                  className="w-full rounded-xl border border-white/[0.1] bg-obsidian pl-9 pr-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-obsidian/70 p-8 text-center text-xs text-ink-muted">
                No player wallets have claimed land yet (clean genesis state).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-ink-muted">
                      <th className="py-2.5 pr-4">Wallet</th>
                      <th className="py-2.5 pr-4">Title</th>
                      <th className="py-2.5 pr-4">Tiles</th>
                      <th className="py-2.5 pr-4">Settlements</th>
                      <th className="py-2.5 pr-4">Structures</th>
                      <th className="py-2.5 pr-4">Hourly Output</th>
                      <th className="py-2.5 pr-4">Standing</th>
                      <th className="py-2.5 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredPlayers.map((p) => (
                      <tr key={p.address}>
                        <td className="py-3 pr-4 font-mono font-bold text-white">
                          {shortenAddress(p.address, 6)}
                        </td>
                        <td className="py-3 pr-4 text-amber-300">{p.title}</td>
                        <td className="py-3 pr-4 font-mono">
                          {p.tilesClaimed}
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {p.settlementsBuilt} (Max Lv.{p.maxSettlementLevel})
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {p.structuresBuilt}
                        </td>
                        <td className="py-3 pr-4 font-mono text-ink-secondary">
                          +{p.woodPerHour}W / +{p.stonePerHour}S / +
                          {p.foodPerHour}F
                        </td>
                        <td className="py-3 pr-4 font-mono font-bold text-crimson-accent">
                          {p.activityScore} pts
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/profile/${p.address}`}
                            className="text-amber-300 hover:underline font-semibold"
                          >
                            Public Profile →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: WORLD */}
        {activeTab === "world" && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REGIONS.map((reg) => {
              const regTiles = allPlayableTiles.filter(
                (t) => t.regionId === reg.id
              );
              const claimed = regTiles.filter(
                (t) => t.owner && t.owner.toLowerCase() !== ZERO_ADDRESS
              ).length;
              const settlements = regTiles.filter(
                (t) => t.settlementLevel > 0
              ).length;
              const unlocked = Boolean(regionUnlockedMap[reg.id]);

              return (
                <div
                  key={reg.id}
                  className="rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[11px] text-ink-muted">
                        Region #{reg.id}
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        {reg.name}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        unlocked
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                          : "bg-amber-400/15 text-amber-300 border border-amber-400/35"
                      )}
                    >
                      {unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>

                  <p className="text-xs text-ink-secondary">{reg.subtitle}</p>

                  {reg.mvpPlayable ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-obsidian p-3">
                        <div className="text-ink-muted text-[10px]">
                          Claimed
                        </div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          {claimed} / {regTiles.length}
                        </div>
                      </div>
                      <div className="rounded-xl bg-obsidian p-3">
                        <div className="text-ink-muted text-[10px]">
                          Settlements
                        </div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          {settlements}
                        </div>
                      </div>
                      <div className="rounded-xl bg-obsidian p-3">
                        <div className="text-ink-muted text-[10px]">Grid</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          7 × 7
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-obsidian/70 p-3 text-xs text-ink-muted">
                      Charted future expansion region (7 × 7 grid).
                    </div>
                  )}

                  {reg.id > 0 && reg.mvpPlayable && (
                    <button
                      type="button"
                      disabled={isSubmittingAdminAction}
                      onClick={() => handleToggleRegionUnlock(reg.id, !unlocked)}
                      className="rounded-xl border border-amber-300/35 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/20"
                    >
                      {unlocked
                        ? "Lock Region (Admin)"
                        : "Unlock Region for All Players"}
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* TAB 4: EVENTS */}
        {activeTab === "events" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Create or Configure World Event
                </h2>
                <p className="text-xs text-ink-muted">
                  Configure onchain event target ($WIF), target region, and
                  material benchmarks
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-ink-muted mb-1">Event ID</label>
                  <input
                    type="number"
                    value={cfgEventId}
                    onChange={(e) => setCfgEventId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={cfgTitle}
                    onChange={(e) => setCfgTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">
                    Required $WIF Goal
                  </label>
                  <input
                    type="text"
                    value={cfgTargetWif}
                    onChange={(e) => setCfgTargetWif(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">
                    Unlocks Region ID
                  </label>
                  <input
                    type="number"
                    value={cfgTargetRegion}
                    onChange={(e) => setCfgTargetRegion(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">
                    Target Tile ID (0..48)
                  </label>
                  <input
                    type="number"
                    value={cfgTargetTile}
                    onChange={(e) => setCfgTargetTile(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2.5 text-white font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 cursor-pointer py-2.5">
                    <input
                      type="checkbox"
                      checked={cfgActive}
                      onChange={(e) => setCfgActive(e.target.checked)}
                    />
                    <span className="font-semibold text-white">
                      Event Active for Contributions
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-ink-muted mb-1">Wood Goal</label>
                  <input
                    type="number"
                    value={cfgWood}
                    onChange={(e) => setCfgWood(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">
                    Stone Goal
                  </label>
                  <input
                    type="number"
                    value={cfgStone}
                    onChange={(e) => setCfgStone(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-muted mb-1">Food Goal</label>
                  <input
                    type="number"
                    value={cfgFood}
                    onChange={(e) => setCfgFood(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-obsidian px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmittingAdminAction}
                onClick={handleSaveAndConfigureEvent}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-6 py-3 text-xs font-extrabold text-black hover:brightness-105 disabled:opacity-50"
              >
                {isSubmittingAdminAction && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>Publish Event Configuration</span>
              </button>
            </div>

            {/* Quick-Load Templates */}
            <div className="lg:col-span-5 rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-3">
              <h3 className="text-base font-bold text-white">
                Load Official Event Preset
              </h3>
              {[
                {
                  id: "1",
                  title: "The Great Bridge",
                  wif: "500",
                  region: "1",
                  tile: "3",
                  wood: "1200",
                  stone: "900",
                  food: "600",
                },
                {
                  id: "2",
                  title: "The Great Harvest",
                  wif: "750",
                  region: "1",
                  tile: "24",
                  wood: "800",
                  stone: "400",
                  food: "1800",
                },
                {
                  id: "3",
                  title: "The Frontier",
                  wif: "1000",
                  region: "2",
                  tile: "49",
                  wood: "1500",
                  stone: "1200",
                  food: "900",
                },
                {
                  id: "4",
                  title: "The Forgotten Monument",
                  wif: "1250",
                  region: "2",
                  tile: "24",
                  wood: "1000",
                  stone: "2000",
                  food: "800",
                },
                {
                  id: "5",
                  title: "The Northern Passage",
                  wif: "1500",
                  region: "3",
                  tile: "3",
                  wood: "1600",
                  stone: "2400",
                  food: "1200",
                },
              ].map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setCfgEventId(preset.id);
                    setCfgTitle(preset.title);
                    setCfgTargetWif(preset.wif);
                    setCfgTargetRegion(preset.region);
                    setCfgTargetTile(preset.tile);
                    setCfgWood(preset.wood);
                    setCfgStone(preset.stone);
                    setCfgFood(preset.food);
                  }}
                  className="w-full rounded-xl border border-white/[0.08] bg-obsidian/80 p-3 text-left hover:border-amber-300/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>
                      #{preset.id} — {preset.title}
                    </span>
                    <span className="font-mono text-crimson-accent">
                      {preset.wif} $WIF
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-ink-muted">
                    {preset.wood}W • {preset.stone}S • {preset.food}F
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: TREASURY */}
        {activeTab === "treasury" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-amber-300/30 bg-[#101413]/95 p-6 space-y-2">
                <div className="text-xs font-semibold text-amber-300">
                  1. Current Treasury Balance (Live Onchain)
                </div>
                <div className="flex items-center gap-2 font-mono text-2xl font-extrabold text-white">
                  <WifTokenEmblem className="h-6 w-6" />
                  {formatWif(currentTreasuryWif, 2)} $WIF
                </div>
                <div className="font-mono text-xs text-ink-muted">
                  Native Gas:{" "}
                  {treasuryEthData
                    ? Number(formatUnits(treasuryEthData.value, 18)).toFixed(4)
                    : "0.0000"}{" "}
                  ETH
                </div>
                <p className="text-[11px] text-ink-secondary pt-1">
                  Real-time ERC-20 balance currently held at{" "}
                  <span className="font-mono">
                    {shortenAddress(effectiveTreasury)}
                  </span>
                  .
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.09] bg-[#101413]/95 p-6 space-y-2">
                <div className="text-xs font-semibold text-emerald-300">
                  2. Historical Total $WIF Received
                </div>
                <div className="font-mono text-2xl font-extrabold text-white">
                  {formatWif(treasuryMetrics.historicalTotalReceived, 2)} $WIF
                </div>
                <div className="font-mono text-xs text-ink-muted">
                  Claims & Construction:{" "}
                  {formatWif(treasuryMetrics.constructionAndClaimReceived, 2)}{" "}
                  $WIF
                </div>
                <p className="text-[11px] text-ink-secondary pt-1">
                  Cumulative $WIF routed from verified gameplay & world events.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.09] bg-[#101413]/95 p-6 space-y-2">
                <div className="text-xs font-semibold text-crimson-accent">
                  3. World Event Contributions
                </div>
                <div className="font-mono text-2xl font-extrabold text-white">
                  {formatWif(treasuryMetrics.eventContributionsReceived, 2)}{" "}
                  $WIF
                </div>
                <div className="font-mono text-xs text-ink-muted">
                  Active Event Counter:{" "}
                  {formatWif(worldEvent.totalContributed, 2)} $WIF
                </div>
                <p className="text-[11px] text-ink-secondary pt-1">
                  $WIF contributed specifically toward community World Events.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <div className="text-ink-muted">Designated Treasury Wallet</div>
                <div className="font-mono text-sm font-bold text-white mt-0.5">
                  {effectiveTreasury}
                </div>
              </div>
              <a
                href={explorerAddressUrl(effectiveTreasury)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 font-semibold text-white hover:bg-white/[0.1]"
              >
                <span>Inspect Treasury on Blockscout</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>
        )}

        {/* TAB 6: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <section className="rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Verified Onchain $WIF Transactions ({filteredTxs.length})
                </h2>
                <p className="text-xs text-ink-muted">
                  Chronological audit of every contract interaction on Robinhood
                  Chain
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Filter by wallet, hash, or type..."
                  className="w-full rounded-xl border border-white/[0.1] bg-obsidian pl-9 pr-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {filteredTxs.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-obsidian/70 p-8 text-center text-xs text-ink-muted">
                No verified transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-ink-muted">
                      <th className="py-2.5 pr-4">Action</th>
                      <th className="py-2.5 pr-4">Player</th>
                      <th className="py-2.5 pr-4">Location</th>
                      <th className="py-2.5 pr-4">$WIF</th>
                      <th className="py-2.5 pr-4">Block</th>
                      <th className="py-2.5 text-right">Explorer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredTxs.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-3 pr-4 font-semibold text-white uppercase">
                          {tx.kind}
                          {tx.structureType
                            ? ` (${STRUCTURE_META[tx.structureType].name})`
                            : ""}
                        </td>
                        <td className="py-3 pr-4 font-mono text-ink-secondary">
                          {shortenAddress(tx.player, 5)}
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {typeof tx.tileId === "number"
                            ? formatCoords(tx.tileId)
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 font-mono font-bold text-crimson-accent">
                          {formatWif(tx.wifAmount, 2)} $WIF
                        </td>
                        <td className="py-3 pr-4 font-mono text-ink-muted">
                          #{tx.blockNumber.toString()}
                        </td>
                        <td className="py-3 text-right">
                          <a
                            href={explorerTxUrl(tx.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-amber-300 hover:underline"
                          >
                            {shortenAddress(tx.txHash, 4)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 7: SETTINGS & AUDIT LOG */}
        {activeTab === "settings" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-4 text-xs">
              <h2 className="text-lg font-bold text-white">
                System Configuration
              </h2>
              <div className="space-y-3">
                <div className="rounded-xl bg-obsidian p-3">
                  <div className="text-ink-muted">Authorized Admin Wallet</div>
                  <div className="font-mono text-white mt-0.5 break-all">
                    {ADMIN_WALLET_ADDRESS}
                  </div>
                </div>
                <div className="rounded-xl bg-obsidian p-3">
                  <div className="text-ink-muted">$WIF Token Contract</div>
                  <div className="font-mono text-white mt-0.5 break-all">
                    {WIF_TOKEN_ADDRESS}
                  </div>
                </div>
                <div className="rounded-xl bg-obsidian p-3">
                  <div className="text-ink-muted">WIFWorlds Game Contract</div>
                  <div className="font-mono text-white mt-0.5 break-all">
                    {contractAddress ?? "Pending Mainnet Deployment (Phase 2)"}
                  </div>
                </div>
                <div className="rounded-xl bg-obsidian p-3">
                  <div className="text-ink-muted">Chain ID</div>
                  <div className="font-mono text-emerald-400 mt-0.5">
                    Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-white/[0.09] bg-[#101413]/92 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Administrative Audit Log
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Chronological log of verified owner sessions & privileged
                    operations
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-300">
                  {auditLog.length} entries
                </span>
              </div>

              {auditLog.length === 0 ? (
                <p className="text-xs text-ink-muted">No audit entries yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/[0.07] bg-obsidian/80 p-3.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          {entry.action}
                        </span>
                        <span className="font-mono text-[10px] text-ink-muted">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-ink-secondary">{entry.details}</p>
                      {entry.txHash && (
                        <a
                          href={explorerTxUrl(entry.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300 hover:underline"
                        >
                          Tx: {shortenAddress(entry.txHash, 6)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 space-y-1.5",
        accent
          ? "border-amber-300/35 bg-amber-400/[0.07]"
          : "border-white/[0.09] bg-[#101413]/92"
      )}
    >
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <div className="font-mono text-xl font-extrabold text-white">{value}</div>
      <div className="text-[11px] text-ink-secondary">{sub}</div>
    </div>
  );
}
