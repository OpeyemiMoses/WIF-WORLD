"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpCircle,
  Castle,
  CheckCircle2,
  Compass,
  ExternalLink,
  Filter,
  Flag,
  Flame,
  Hammer,
  RefreshCw,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { PageCastleBackdrop } from "@/components/layout/PageCastleBackdrop";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import { AnimatedNumber, ScrollReveal } from "@/components/ui/ScrollReveal";
import { useRobinhoodWallet, useWorldData } from "@/lib/contract/useWorldState";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/chain/robinhood";
import {
  formatCoords,
  getRegionLabel,
  STRUCTURE_META,
  VerifiedActivityItem,
} from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

type ActivityFilter =
  | "all"
  | "construction"
  | "claims"
  | "upgrades"
  | "missions"
  | "events";

const FILTERS: Array<{ key: ActivityFilter; label: string }> = [
  { key: "all", label: "All Activity" },
  { key: "construction", label: "Construction" },
  { key: "claims", label: "Land Claims" },
  { key: "upgrades", label: "Settlement Upgrades" },
  { key: "missions", label: "Missions" },
  { key: "events", label: "World Events" },
];

export default function WorldActivityPage() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const { address } = useRobinhoodWallet();
  const {
    activities,
    missions,
    worldSummary,
    worldEvent,
    isLoadingWorld,
    refreshAllWorldState,
  } = useWorldData(address, 0);

  const completedMissions = useMemo(
    () => missions.filter((m) => m.completed),
    [missions]
  );

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities;
    if (filter === "claims") {
      return activities.filter((a) => a.kind === "claim");
    }
    if (filter === "construction") {
      return activities.filter(
        (a) => a.kind === "settlement" || a.kind === "structure"
      );
    }
    if (filter === "upgrades") {
      return activities.filter((a) => a.kind === "upgrade");
    }
    if (filter === "events") {
      return activities.filter(
        (a) => a.kind === "event" || a.kind === "region_unlock"
      );
    }
    return [];
  }, [activities, filter]);

  return (
    <div className="animate-page-enter relative flex-1 bg-[#070B0E]">
      <PageCastleBackdrop />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Header */}
        <ScrollReveal variant="pop">
          <section className="rounded-3xl border border-amber-200/20 bg-gradient-to-b from-[#13181D]/90 to-[#0B0F12]/95 p-6 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-crimson/40 bg-crimson/15 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Verified Onchain World Ledger • Robinhood Chain (4663)</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Live World Activity Feed
                </h1>
                <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
                  Every land claim, Settlement Hall, production structure, upgrade,
                  and World Event contribution in WIF WORLDS is indexed directly
                  from verified smart contract events.
                </p>
              </div>

              {/* Live World Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3">
                  <div className="text-[11px] text-ink-muted">Claimed Tiles</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-white">
                    <AnimatedNumber value={worldSummary.claimedTiles} />
                    <span className="text-xs font-normal text-ink-muted">
                      /42
                    </span>
                  </div>
                </div>
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3">
                  <div className="text-[11px] text-ink-muted">Settlements</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-[#2DD4BF]">
                    <AnimatedNumber value={worldSummary.settlements} />
                  </div>
                </div>
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3">
                  <div className="text-[11px] text-ink-muted">Structures</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-amber-300">
                    <AnimatedNumber value={worldSummary.structures} />
                  </div>
                </div>
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3">
                  <div className="text-[11px] text-ink-muted">Active Builders</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-crimson-accent">
                    <AnimatedNumber value={worldSummary.uniqueBuilders} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Filter Bar + Refresh Button */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.1] bg-[#101413]/92 p-3 backdrop-blur-md shadow-panel">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink-muted">
              <Filter className="h-3.5 w-3.5 text-crimson-accent" />
              Filter:
            </span>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
                    active
                      ? "bg-gradient-to-b from-crimson-accent to-crimson text-white shadow-crimson-sm"
                      : "text-ink-secondary hover:text-white hover:bg-white/[0.05]"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={refreshAllWorldState}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-white transition-colors"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isLoadingWorld && "animate-spin")}
            />
            <span>Sync Chain Logs</span>
          </button>
        </section>

        {/* Missions Filter View */}
        {filter === "missions" ? (
          <section className="rounded-3xl border border-amber-200/15 bg-[#101413]/92 p-6 backdrop-blur-xl shadow-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Verified Mission Accomplishments
                </h2>
                <p className="text-xs text-ink-muted">
                  Personal and regional milestones verified from your connected
                  wallet&apos;s onchain settlement state.
                </p>
              </div>
              <Link
                href="/missions"
                className="text-xs font-semibold text-crimson-accent hover:underline"
              >
                Open Full Missions Board →
              </Link>
            </div>

            {completedMissions.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-obsidian/70 p-8 text-center space-y-2">
                <Target className="h-8 w-8 text-crimson-accent mx-auto" />
                <div className="text-sm font-bold text-white">
                  No Missions Completed Yet
                </div>
                <p className="text-xs text-ink-muted max-w-md mx-auto">
                  Claim your first tile and establish a Settlement Hall on the
                  World Map to record your first mission milestone.
                </p>
                <div className="pt-2">
                  <Link
                    href="/world"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-crimson px-4 py-2 text-xs font-bold text-white"
                  >
                    Enter World Map
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedMissions.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.08] p-4 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>{m.title}</span>
                      </div>
                      <p className="text-xs text-ink-secondary">
                        {m.description}
                      </p>
                      <div className="text-[11px] font-semibold text-amber-300">
                        Unlocked: {m.rewardLabel}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
                      VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Blockchain Event Feed List */
          <section className="rounded-3xl border border-amber-200/15 bg-[#101413]/92 p-6 backdrop-blur-xl shadow-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Chronological Blockchain Chronicles
                </h2>
                <p className="text-xs text-ink-muted">
                  Showing {filteredActivities.length} verified onchain events on
                  Robinhood Chain
                </p>
              </div>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-obsidian/70 p-10 text-center space-y-3">
                <Compass className="h-9 w-9 text-amber-300/80 mx-auto" />
                <div className="text-base font-bold text-white">
                  The Living Map Awaits Its First Pioneers
                </div>
                <p className="text-xs text-ink-secondary max-w-lg mx-auto leading-relaxed">
                  Zero mock or simulated events are shown. As players claim
                  tiles, establish settlements, construct production buildings,
                  and contribute to{" "}
                  <span className="text-white font-semibold">
                    {worldEvent.title}
                  </span>
                  , every confirmed transaction appears here in real time.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href="/world"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-5 py-2.5 text-xs font-bold text-white shadow-crimson"
                  >
                    Claim First Territory on Map
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-ink-primary hover:bg-white/[0.08]"
                  >
                    View World Event
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.07]">
                {filteredActivities.map((item) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    eventTitle={worldEvent.title}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ActivityRow({
  item,
  eventTitle,
}: {
  item: VerifiedActivityItem;
  eventTitle: string;
}) {
  const badge = (() => {
    switch (item.kind) {
      case "claim":
        return {
          label: "Land Claim",
          icon: Flag,
          cls: "border-[#2DD4BF]/35 bg-[#2DD4BF]/10 text-[#2DD4BF]",
        };
      case "settlement":
        return {
          label: "Settlement Founded",
          icon: Castle,
          cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
        };
      case "upgrade":
        return {
          label: "Settlement Upgrade",
          icon: ArrowUpCircle,
          cls: "border-amber-400/35 bg-amber-400/10 text-amber-300",
        };
      case "structure":
        return {
          label: "Construction",
          icon: Hammer,
          cls: "border-sky-400/35 bg-sky-400/10 text-sky-300",
        };
      case "harvest":
        return {
          label: "Resource Harvest",
          icon: Sparkles,
          cls: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
        };
      default:
        return {
          label: "World Event",
          icon: Flame,
          cls: "border-crimson/40 bg-crimson/15 text-crimson-accent",
        };
    }
  })();

  const Icon = badge.icon;

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            badge.cls
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                badge.cls
              )}
            >
              {badge.label}
            </span>

            {item.kind !== "region_unlock" && (
              <Link
                href={`/profile/${item.player}`}
                className="inline-flex items-center gap-1 font-mono font-bold text-white hover:text-crimson-accent transition-colors"
              >
                <User className="h-3 w-3 text-crimson-accent" />
                {shortenAddress(item.player, 5)}
              </Link>
            )}

            {typeof item.tileId === "number" && (
              <Link
                href="/world"
                className="font-mono text-[11px] text-amber-300 hover:underline"
              >
                Tile {formatCoords(item.tileId)} • {getRegionLabel(item.tileId)}
              </Link>
            )}
          </div>

          <p className="text-xs sm:text-sm text-ink-secondary">
            {item.kind === "claim" &&
              `Claimed territory tile ${formatCoords(item.tileId ?? 0)} and unlocked starter materials.`}
            {item.kind === "settlement" &&
              `Established a Level 1 Settlement Hall at ${formatCoords(
                item.tileId ?? 0
              )}.`}
            {item.kind === "upgrade" &&
              `Upgraded Settlement Hall at ${formatCoords(
                item.tileId ?? 0
              )} to Level ${item.newLevel}.`}
            {item.kind === "structure" &&
              `Constructed ${
                item.structureType
                  ? STRUCTURE_META[item.structureType].name
                  : "Structure"
              } at ${formatCoords(item.tileId ?? 0)}.`}
            {item.kind === "harvest" &&
              `Harvested +${item.resourcesAdded?.wood ?? 0} Wood, +${
                item.resourcesAdded?.stone ?? 0
              } Stone, +${item.resourcesAdded?.food ?? 0} Food into warehouse.`}
            {item.kind === "event" &&
              `Contributed ${formatWif(
                item.wifAmount,
                2
              )} $WIF toward ${eventTitle}.`}
            {item.kind === "region_unlock" &&
              `Regional Milestone Achieved! The Wild Frontier is now unlocked for all pioneers.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
        {item.wifAmount > 0n && (
          <span className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-obsidian px-3 py-1.5 font-mono text-xs font-bold text-crimson-accent">
            <WifTokenEmblem className="h-3.5 w-3.5" />
            {formatWif(item.wifAmount, 2)} $WIF
          </span>
        )}

        <a
          href={explorerAddressUrl(item.player)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-mono text-ink-secondary hover:text-white"
        >
          Builder
        </a>

        <a
          href={explorerTxUrl(item.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-mono text-ink-primary hover:border-crimson/50"
        >
          <span>Tx</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
