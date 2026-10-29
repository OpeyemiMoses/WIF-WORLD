"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import {
  ArrowRight,
  ArrowUpCircle,
  Castle,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Flag,
  Flame,
  Hammer,
  Info,
  Search,
  Wallet,
} from "lucide-react";
import { TerritoryMiniMap } from "@/components/world/IsometricWorldMap";
import { FeatureFooterStrip } from "@/components/layout/FeatureFooterStrip";
import { WifWorldsLogo } from "@/components/brand/WifWorldsLogo";
import {
  explorerAddressUrl,
  explorerTxUrl,
} from "@/lib/chain/robinhood";
import {
  useRobinhoodWallet,
  useWorldData,
} from "@/lib/contract/useWorldState";
import {
  formatCoords,
  getBuilderTitle,
  getRegionLabel,
  PROGRESSION_STAGES,
  SETTLEMENT_TIER_META,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
} from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

type ProfileTab = "activity" | "settlements" | "structures" | "events";

export function PlayerProfileView({
  inspectedAddress,
}: {
  inspectedAddress?: string;
}) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useRobinhoodWallet();

  const validTargetAddress: `0x${string}` | undefined = useMemo(() => {
    if (inspectedAddress && isAddress(inspectedAddress)) {
      return inspectedAddress as `0x${string}`;
    }
    if (!inspectedAddress && connectedAddress) {
      return connectedAddress;
    }
    return undefined;
  }, [connectedAddress, inspectedAddress]);

  const isInvalidUrlAddress = Boolean(
    inspectedAddress && !isAddress(inspectedAddress)
  );

  const {
    tiles,
    allPlayableTiles,
    playerStats,
    activities,
    isContractDeployed,
  } = useWorldData(validTargetAddress);

  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [lookupInput, setLookupInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ownedTiles = useMemo(() => {
    if (!validTargetAddress) return [];
    const lower = validTargetAddress.toLowerCase();
    return allPlayableTiles.filter((t) => t.owner.toLowerCase() === lower);
  }, [allPlayableTiles, validTargetAddress]);

  const ownedSettlements = useMemo(
    () => ownedTiles.filter((t) => t.settlementLevel > 0),
    [ownedTiles]
  );

  const ownedStructures = useMemo(
    () => ownedTiles.filter((t) => t.structureType !== StructureType.None),
    [ownedTiles]
  );

  const playerActivities = useMemo(() => {
    if (!validTargetAddress) return [];
    const lower = validTargetAddress.toLowerCase();
    return activities.filter((a) => a.player.toLowerCase() === lower);
  }, [activities, validTargetAddress]);

  const playerEventContributions = useMemo(
    () => playerActivities.filter((a) => a.kind === "event"),
    [playerActivities]
  );

  const builderTitle = getBuilderTitle(playerStats.activityScore);
  const isOwnProfile =
    Boolean(validTargetAddress && connectedAddress) &&
    validTargetAddress?.toLowerCase() === connectedAddress?.toLowerCase();

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupInput.trim();
    if (!isAddress(cleaned)) {
      setLookupError("Enter a valid 0x EVM wallet address.");
      return;
    }
    setLookupError(null);
    router.push(`/profile/${cleaned}`);
  };

  const handleCopy = () => {
    if (!validTargetAddress) return;
    navigator.clipboard.writeText(validTargetAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="flex-1 flex flex-col bg-obsidian">
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Wallet Lookup Bar (Inspect any player on the shared map) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-primary">
              Builder Profile & Verifiable Reputation
            </h1>
            <p className="text-xs text-ink-muted">
              Derived strictly from confirmed world actions on Robinhood Chain —
              never ranked by idle wallet balance.
            </p>
          </div>

          <form
            onSubmit={handleLookupSubmit}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <div className="relative flex-1 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => {
                  setLookupInput(e.target.value);
                  setLookupError(null);
                }}
                placeholder="Inspect builder 0x address..."
                className="w-full rounded-xl border border-white/[0.1] bg-[#131716] pl-9 pr-3 py-2 font-mono text-xs text-ink-primary placeholder:font-sans placeholder:text-ink-dim focus:border-crimson-accent focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl border border-white/[0.12] bg-[#181D1B] px-3.5 py-2 text-xs font-semibold text-ink-primary hover:border-crimson/50 transition-colors"
            >
              Inspect
            </button>
          </form>
        </div>

        {lookupError && (
          <p className="text-xs text-crimson-accent">{lookupError}</p>
        )}

        {isInvalidUrlAddress ? (
          <div className="rounded-2xl border border-crimson/40 bg-[#181012] p-8 text-center space-y-3">
            <h2 className="text-lg font-bold text-ink-primary">
              Invalid Wallet Address
            </h2>
            <p className="text-xs text-ink-secondary">
              The address <code className="font-mono">{inspectedAddress}</code>{" "}
              is not a valid EVM address.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-2.5 text-xs font-bold text-white"
            >
              Back to Profile
            </Link>
          </div>
        ) : !validTargetAddress ? (
          /* Disconnected Empty Onboarding State (Requirement 8: useful even before playing) */
          <div className="rounded-3xl border border-white/[0.09] bg-[#121615] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5 my-8 shadow-panel">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-crimson/40 bg-crimson/15 text-crimson-accent shadow-crimson-sm">
              <Wallet className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-ink-primary">
                Your Builder Chronicle Starts Here
              </h2>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Connect your EVM wallet in the top navigation bar to view your
                personal territory, settlements, structures, and verified
                transaction history — or paste any builder&apos;s{" "}
                <code className="font-mono text-ink-primary">0x</code> address
                above to inspect their impact on the Living Map.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/world"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-6 py-3 text-sm font-bold text-white shadow-crimson hover:brightness-110 transition-all"
              >
                <span>Explore the Shared Map</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* TOP PROFILE HEADER GRID — Matches Panel 5 Reference */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (7 cols): Crest, Identity & 4 Stat Counters */}
              <div className="lg:col-span-7 rounded-2xl border border-white/[0.09] bg-[#121615] p-6 flex flex-col justify-between space-y-6 shadow-panel">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Double-Ring Crimson Geometric Crest (Matches Panel 5) */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-crimson-accent bg-[#1A0E10] shadow-[0_0_24px_rgba(230,57,70,0.35)]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-crimson/40 bg-[#120A0C]">
                      <WifWorldsLogo size="sm" className="gap-0 [&>div]:hidden" />
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-extrabold text-ink-primary">
                        {builderTitle}
                      </h2>
                      {isOwnProfile && (
                        <span className="rounded-full border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF]">
                          Connected Wallet
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm text-ink-secondary">
                        {shortenAddress(validTargetAddress, 6)}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded-md p-1 text-ink-muted hover:bg-white/[0.06] hover:text-white transition-colors"
                        title="Copy wallet address"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <a
                        href={explorerAddressUrl(validTargetAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-obsidian px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:text-white transition-colors"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 4 Verified Stat Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.07]">
                  <StatBlock
                    label="Settlements"
                    value={playerStats.settlementsBuilt}
                  />
                  <StatBlock
                    label="Tiles Claimed"
                    value={playerStats.tilesClaimed}
                  />
                  <StatBlock
                    label="Structures Built"
                    value={playerStats.structuresBuilt}
                  />
                  <StatBlock
                    label="Events Contributed"
                    value={playerStats.eventsContributedCount}
                  />
                </div>
              </div>

              {/* Right (5 cols): Activity Score + Player Territory Mini-Map (Matches Panel 5!) */}
              <div className="lg:col-span-5 rounded-2xl border border-white/[0.09] bg-[#121615] p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-panel">
                <div className="space-y-3 w-full sm:w-auto flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
                    <span>Activity Score</span>
                    <span
                      title="Claim = 50 pts | Settlement = 200 pts | Structure = 150 pts | Event Contribution = 100 pts"
                      className="text-ink-muted cursor-help"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div className="font-mono text-4xl font-extrabold text-crimson-accent">
                    {playerStats.activityScore.toLocaleString()}
                  </div>

                  <div className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-accent"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((playerStats.activityScore / 1200) * 100)
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    50 pts/claim • 200 pts/settlement • 150 pts/structure • 100
                    pts/event
                  </p>
                </div>

                {/* Isometric Territory Mini-Map highlighting this builder's tiles */}
                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/85 p-3 shrink-0">
                  <TerritoryMiniMap
                    tiles={tiles}
                    highlightOwner={validTargetAddress}
                    size={165}
                  />
                  <div className="mt-1.5 text-center text-[10px] font-medium text-ink-muted">
                    Controlled Territory ({ownedTiles.length}/49)
                  </div>
                </div>
              </div>
            </section>

            {/* BOTTOM ACTIVITY & ASSETS SECTION — Matches Panel 5 Reference */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (8 cols): Tabs + Verified Feed */}
              <div className="lg:col-span-8 rounded-2xl border border-white/[0.08] bg-[#121615] p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] pb-3">
                  {(
                    [
                      { key: "activity", label: "Activity" },
                      {
                        key: "settlements",
                        label: `Settlements (${ownedSettlements.length})`,
                      },
                      {
                        key: "structures",
                        label: `Structures (${ownedStructures.length})`,
                      },
                      {
                        key: "events",
                        label: `Events (${playerEventContributions.length})`,
                      },
                    ] as const
                  ).map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          "relative rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors",
                          active
                            ? "bg-crimson/15 text-crimson-accent"
                            : "text-ink-secondary hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* TAB 1: VERIFIED ACTIVITY */}
                {activeTab === "activity" && (
                  <>
                    {playerActivities.length === 0 ? (
                      <EmptyBuilderState
                        isOwnProfile={isOwnProfile}
                        isContractDeployed={isContractDeployed}
                      />
                    ) : (
                      <ul className="divide-y divide-white/[0.06]">
                        {playerActivities.map((act) => (
                          <li
                            key={act.id}
                            className="flex items-center justify-between gap-3 py-3.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-crimson/35 bg-crimson/15 text-crimson-accent">
                                {act.kind === "claim" ? (
                                  <Flag className="h-4 w-4" />
                                ) : act.kind === "settlement" ? (
                                  <Castle className="h-4 w-4" />
                                ) : act.kind === "upgrade" ? (
                                  <ArrowUpCircle className="h-4 w-4" />
                                ) : act.kind === "structure" ? (
                                  <Hammer className="h-4 w-4" />
                                ) : (
                                  <Flame className="h-4 w-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-ink-primary">
                                  {act.kind === "claim" &&
                                    `Claimed tile ${formatCoords(act.tileId ?? 0)}`}
                                  {act.kind === "settlement" &&
                                    `Founded Settlement Hall at ${formatCoords(
                                      act.tileId ?? 0
                                    )}`}
                                  {act.kind === "upgrade" &&
                                    `Upgraded Hall to Lv.${act.newLevel ?? 2} at ${formatCoords(
                                      act.tileId ?? 0
                                    )}`}
                                  {act.kind === "structure" &&
                                    `Built ${
                                      act.structureType
                                        ? STRUCTURE_META[act.structureType].name
                                        : "Structure"
                                    } at ${formatCoords(act.tileId ?? 0)}`}
                                  {act.kind === "event" &&
                                    `Contributed ${formatWif(
                                      act.wifAmount,
                                      2
                                    )} $WIF to Build the Beacon`}
                                </div>
                                <div className="font-mono text-[11px] text-ink-dim">
                                  Block #{act.blockNumber.toString()} •{" "}
                                  {formatWif(act.wifAmount, 2)} $WIF
                                </div>
                              </div>
                            </div>

                            <a
                              href={explorerTxUrl(act.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-accent hover:underline shrink-0"
                            >
                              <span>View Tx</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {/* TAB 2: SETTLEMENTS */}
                {activeTab === "settlements" && (
                  <>
                    {ownedSettlements.length === 0 ? (
                      <p className="py-8 text-center text-xs text-ink-muted">
                        No Settlements established by this wallet yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ownedSettlements.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-obsidian/70 p-4"
                          >
                            <div>
                              <div className="text-sm font-bold text-ink-primary">
                                {
                                  SETTLEMENT_TIER_META[
                                    (t.settlementLevel || 1) as 1 | 2 | 3
                                  ].name
                                }{" "}
                                {formatCoords(t.id)}
                              </div>
                              <div className="text-xs text-ink-muted">
                                {TERRAIN_META[t.terrain].name} •{" "}
                                {getRegionLabel(t.id)}
                              </div>
                            </div>
                            <Link
                              href="/world"
                              className="text-xs font-semibold text-crimson-accent hover:underline"
                            >
                              View Map →
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* TAB 3: STRUCTURES */}
                {activeTab === "structures" && (
                  <>
                    {ownedStructures.length === 0 ? (
                      <p className="py-8 text-center text-xs text-ink-muted">
                        No structures constructed by this wallet yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ownedStructures.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-obsidian/70 p-4"
                          >
                            <div>
                              <div className="text-sm font-bold text-ink-primary">
                                {t.structureType !== StructureType.None
                                  ? STRUCTURE_META[t.structureType].name
                                  : "Structure"}{" "}
                                {formatCoords(t.id)}
                              </div>
                              <div className="text-xs text-ink-muted">
                                {TERRAIN_META[t.terrain].name}
                              </div>
                            </div>
                            <Link
                              href="/world"
                              className="text-xs font-semibold text-crimson-accent hover:underline"
                            >
                              View Map →
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* TAB 4: EVENTS */}
                {activeTab === "events" && (
                  <>
                    {playerEventContributions.length === 0 ? (
                      <p className="py-8 text-center text-xs text-ink-muted">
                        No world event contributions recorded for this wallet yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-white/[0.06]">
                        {playerEventContributions.map((ev) => (
                          <li
                            key={ev.id}
                            className="flex items-center justify-between py-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-ink-primary">
                                Build the Beacon
                              </span>
                              <span className="ml-2 font-mono text-emerald-400">
                                +{formatWif(ev.wifAmount, 2)} $WIF
                              </span>
                            </div>
                            <a
                              href={explorerTxUrl(ev.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-crimson-accent hover:underline"
                            >
                              View Tx
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {/* Right (4 cols): Builder Summary & Quick World Entry */}
              <div className="lg:col-span-4 space-y-5">
                <div className="rounded-2xl border border-white/[0.08] bg-[#121615] p-6 space-y-4">
                  <h3 className="text-sm font-bold text-ink-primary">
                    World Impact Summary
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Progression Stage</span>
                      <span className="font-mono font-bold text-crimson-accent">
                        Stage {playerStats.progressionStage} / 5
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Territory Capacity</span>
                      <span className="font-mono font-bold text-ink-primary">
                        {playerStats.tilesClaimed} /{" "}
                        {playerStats.maxClaimableTiles} tiles
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">
                        Event $WIF Contributed
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatWif(playerStats.totalEventWifContributed, 2)} $WIF
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Builder Standing</span>
                      <span className="font-semibold text-ink-primary">
                        {builderTitle}
                      </span>
                    </div>
                  </div>

                  {/* 5-Stage Personal Progression List */}
                  <div className="pt-3 border-t border-white/[0.07] space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Civilization Milestones
                    </div>
                    {([1, 2, 3, 4, 5] as const).map((st) => {
                      const info = PROGRESSION_STAGES[st];
                      const reached = st <= playerStats.progressionStage;
                      const current = st === playerStats.progressionStage;
                      return (
                        <div
                          key={st}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-[11px]",
                            current
                              ? "border-crimson/45 bg-crimson/10 text-ink-primary"
                              : reached
                              ? "border-emerald-500/25 bg-emerald-500/[0.06] text-ink-secondary"
                              : "border-white/[0.05] bg-obsidian/50 text-ink-dim"
                          )}
                        >
                          <div className="font-bold">{info.title}</div>
                          <div className="text-[10px] opacity-85">
                            {info.shortGoal}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-white/[0.07]">
                    <Link
                      href="/world"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson py-3 text-xs font-bold text-white shadow-crimson-sm hover:brightness-110 transition-all"
                    >
                      <Compass className="h-4 w-4" />
                      <span>Return to Living Map</span>
                    </Link>
                  </div>
                </div>

                {isConnected && !isOwnProfile && connectedAddress && (
                  <Link
                    href={`/profile/${connectedAddress}`}
                    className="block rounded-xl border border-white/[0.08] bg-[#121615] px-4 py-3 text-center text-xs font-semibold text-ink-secondary hover:text-white transition-colors"
                  >
                    Switch to My Connected Profile →
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <FeatureFooterStrip />
    </main>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-obsidian/70 px-3.5 py-3">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className="font-mono text-2xl font-extrabold text-ink-primary mt-1">
        {value}
      </div>
    </div>
  );
}

function EmptyBuilderState({
  isOwnProfile,
  isContractDeployed,
}: {
  isOwnProfile: boolean;
  isContractDeployed: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.09] bg-obsidian/50 p-8 text-center space-y-3">
      <Compass className="mx-auto h-7 w-7 text-crimson-accent/75" />
      <div className="text-sm font-bold text-ink-primary">
        {isOwnProfile
          ? "You haven't shaped a tile yet"
          : "No verified world actions for this wallet yet"}
      </div>
      <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
        {!isContractDeployed
          ? "WIFWorlds.sol is awaiting deployment to Robinhood Chain. Once live, every confirmed tile claim, settlement, structure, and Beacon contribution appears here with its Blockscout link."
          : "Select any neutral Plains, Forest, Hills, or Rocky tile on the 7 × 7 Living Map to claim territory with $WIF."}
      </p>
      <div className="pt-1">
        <Link
          href="/world"
          className="inline-flex items-center gap-1.5 rounded-lg bg-crimson/20 border border-crimson/40 px-4 py-2 text-xs font-semibold text-crimson-accent hover:bg-crimson hover:text-white transition-colors"
        >
          <span>Open World Map</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
