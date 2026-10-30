"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpCircle,
  BookOpen,
  Castle,
  CheckCircle2,
  ChevronRight,
  Compass,
  Eye,
  ExternalLink,
  Flag,
  Flame,
  Hammer,
  Lock,
  Mountain,
  RefreshCw,
  Sparkles,
  Target,
  Trees,
  Trophy,
  Wheat,
  X,
} from "lucide-react";
import { IsometricWorldMap } from "@/components/world/IsometricWorldMap";
import { MobileLandscapeGuard } from "@/components/world/MobileLandscapeGuard";
import { IsometricTilePreview } from "@/components/tiles/IsometricTilePreview";
import { BuildActionModal } from "@/components/build/BuildActionModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import {
  GameEventCelebration,
  GamifiedCelebrationEvent,
} from "@/components/ui/GameEventCelebration";
import { AnimatedNumber } from "@/components/ui/ScrollReveal";
import {
  useRobinhoodWallet,
  useWorldActionExecutor,
  useWorldData,
} from "@/lib/contract/useWorldState";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/chain/robinhood";
import {
  BEACON_TARGET_TILE_ID,
  formatCoords,
  getNextSettlementCost,
  getRegionLabel,
  getWorldTileId,
  manhattanDistance,
  MAX_SETTLEMENT_LEVEL,
  MAX_SETTLEMENTS_PER_REGION,
  MIN_SETTLEMENT_MANHATTAN_DISTANCE,
  PROGRESSION_STAGES,
  REGIONS,
  SETTLEMENT_TIER_META,
  SettlementLevel,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
  WorldActionKind,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

type HudDrawerTab = "feed" | "missions" | "rankings" | null;

export default function WorldScreen() {
  const [activeRegionId, setActiveRegionId] = useState<number>(0);
  // Default selected tile: (3, 4) in Region 0 -> localId = 31 (Forest tile)
  const [selectedTileId, setSelectedTileId] = useState<number>(31);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [buildModalInitialAction, setBuildModalInitialAction] =
    useState<WorldActionKind>("claim");
  const [activeDrawer, setActiveDrawer] = useState<HudDrawerTab>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [visitedBuilderAddress, setVisitedBuilderAddress] = useState<
    `0x${string}` | null
  >(null);
  const [celebrationEvent, setCelebrationEvent] =
    useState<GamifiedCelebrationEvent | null>(null);
  const seenActivityIdRef = useRef<string | null>(null);

  const triggerCelebration = useCallback(
    (evt: Omit<GamifiedCelebrationEvent, "id">, durationMs = 3100) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setCelebrationEvent({ ...evt, id });
      window.setTimeout(() => {
        setCelebrationEvent((cur) => (cur?.id === id ? null : cur));
      }, durationMs);
    },
    []
  );

  const { address, effectivePlayerAddress } = useRobinhoodWallet();

  // Check if wallet has completed/skipped onboarding; open once for new pioneers
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/onboarding?wallet=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.onboarding) return;
        if (!data.onboarding.completed && !data.onboarding.skipped) {
          setOnboardingOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);
  const {
    isContractDeployed,
    contractAddress,
    treasuryAddress,
    effectiveProfileAddress,
    tiles,
    allPlayableTiles,
    regionUnlockedMap,
    costs,
    worldEvent,
    worldSummary,
    playerStats,
    missions,
    regionalRankings,
    computePlayerStatsForAddress,
    activities,
    isLoadingWorld,
    isWorldReadError,
    refreshAllWorldState,
  } = useWorldData(address, activeRegionId);

  const activePlayerAddr = isContractDeployed
    ? address
    : effectivePlayerAddress;

  const { stage: harvestStage, executeGameAction } = useWorldActionExecutor(
    refreshAllWorldState,
    activePlayerAddr
  );

  const isHarvesting =
    harvestStage === "awaiting_wallet" ||
    harvestStage === "pending" ||
    harvestStage === "submitted" ||
    harvestStage === "refreshing";

  const handleHarvestResources = async () => {
    await executeGameAction({ action: "harvest" });
  };

  const activeRegion = REGIONS[activeRegionId] ?? REGIONS[0];
  const isCurrentRegionUnlocked = Boolean(regionUnlockedMap[activeRegionId]);

  // Trigger gamified celebration banner whenever a new world action is confirmed
  useEffect(() => {
    const newest = activities[0];
    if (!newest) return;
    if (seenActivityIdRef.current === null) {
      seenActivityIdRef.current = newest.id;
      return;
    }
    if (seenActivityIdRef.current === newest.id) return;
    seenActivityIdRef.current = newest.id;

    const coords = formatCoords(newest.tileId ?? selectedTileId);
    if (newest.kind === "upgrade") {
      const tier =
        SETTLEMENT_TIER_META[
          Math.min(5, Math.max(1, newest.newLevel ?? 2)) as SettlementLevel
        ];
      triggerCelebration(
        {
          kind: "upgrade",
          title: `Upgraded to ${tier.name}!`,
          subtitle: `Settlement at Tile ${coords} ascended to Lv.${newest.newLevel ?? 2}`,
          rewardChips: [`+2 Territory Cap`, `Lv.${newest.newLevel ?? 2} Tier`],
        },
        3800
      );
    } else if (newest.kind === "settlement") {
      triggerCelebration({
        kind: "settlement",
        title: `Settlement Hall Founded!`,
        subtitle: `Permanent stronghold established at Tile ${coords}`,
        rewardChips: ["+3 Territory Cap", "+20W / +10S / +20F per hr"],
      });
    } else if (newest.kind === "structure") {
      const stMeta = newest.structureType
        ? STRUCTURE_META[newest.structureType]
        : null;
      triggerCelebration({
        kind: "structure",
        title: `${stMeta?.name ?? "Structure"} Constructed!`,
        subtitle: `Built at Tile ${coords} • ${stMeta?.gameplayFunction ?? "Active"}`,
        rewardChips: [stMeta?.shortPurpose ?? "Production Online"],
      });
    } else if (newest.kind === "claim") {
      triggerCelebration({
        kind: "claim",
        title: `Territory Claimed at ${coords}!`,
        subtitle: `Sovereign border expanded in ${activeRegion.name}`,
        rewardChips: ["+1 Sovereign Tile", "+10 Activity Score"],
      });
    } else if (newest.kind === "harvest") {
      const w = newest.resourcesAdded?.wood ?? 0;
      const s = newest.resourcesAdded?.stone ?? 0;
      const f = newest.resourcesAdded?.food ?? 0;
      triggerCelebration({
        kind: "harvest",
        title: "Resources Harvested!",
        subtitle: "Collected into your Settlement Warehouse",
        rewardChips: [`+${w} Wood`, `+${s} Stone`, `+${f} Food`],
      });
    }
  }, [activities, activeRegion.name, selectedTileId, triggerCelebration]);

  const handleCameraFly = useCallback(
    (tileId: number | null, zoomedIn: boolean) => {
      if (tileId === null) return;
      const t = tiles.find((item) => item.id === tileId);
      const tMeta = t ? TERRAIN_META[t.terrain] : null;
      triggerCelebration(
        {
          kind: "camera_fly",
          title: zoomedIn
            ? `Flying to Tile ${formatCoords(tileId)}`
            : "Overview Camera Restored",
          subtitle: zoomedIn
            ? `Inspecting ${tMeta?.name ?? "Terrain"} in ${activeRegion.name}`
            : `Viewing full ${activeRegion.name} archipelago`,
        },
        1900
      );
    },
    [activeRegion.name, tiles, triggerCelebration]
  );

  const handleSelectRegion = (regionId: number) => {
    setActiveRegionId(regionId);
    setSelectedTileId(getWorldTileId(regionId, regionId === 0 ? 31 : 24));
    const reg = REGIONS[regionId];
    if (reg) {
      triggerCelebration(
        {
          kind: "camera_fly",
          title: `Entered ${reg.name}`,
          subtitle: reg.subtitle,
        },
        2000
      );
    }
  };

  const selectedTile = useMemo(
    () => tiles.find((t) => t.id === selectedTileId) ?? tiles[0],
    [selectedTileId, tiles]
  );

  const terrain = TERRAIN_META[selectedTile.terrain];
  const isUnowned =
    !selectedTile.owner || selectedTile.owner.toLowerCase() === ZERO_ADDRESS;
  const isYours =
    !isUnowned &&
    Boolean(activePlayerAddr) &&
    selectedTile.owner.toLowerCase() === activePlayerAddr?.toLowerCase();

  const playerRegionSettlements = useMemo(() => {
    if (!activePlayerAddr) return [];
    const lower = activePlayerAddr.toLowerCase();
    return tiles.filter(
      (t) => t.owner.toLowerCase() === lower && t.settlementLevel > 0
    );
  }, [activePlayerAddr, tiles]);

  const visitedBuilderStats = useMemo(() => {
    if (!visitedBuilderAddress) return null;
    return computePlayerStatsForAddress(visitedBuilderAddress);
  }, [computePlayerStatsForAddress, visitedBuilderAddress]);

  const visitedBuilderRanking = useMemo(() => {
    if (!visitedBuilderAddress) return null;
    return (
      regionalRankings.find(
        (r) => r.address.toLowerCase() === visitedBuilderAddress.toLowerCase()
      ) ?? null
    );
  }, [regionalRankings, visitedBuilderAddress]);

  const handleVisitRealm = (builderAddr: `0x${string}`) => {
    setVisitedBuilderAddress(builderAddr);
    const builderTile = allPlayableTiles.find(
      (t) =>
        t.owner.toLowerCase() === builderAddr.toLowerCase() &&
        t.settlementLevel > 0
    ) ??
      allPlayableTiles.find(
        (t) => t.owner.toLowerCase() === builderAddr.toLowerCase()
      );
    if (builderTile) {
      setActiveRegionId(builderTile.regionId);
      setSelectedTileId(builderTile.id);
    }
  };

  const eventProgressRatio = useMemo(() => {
    if (worldEvent.targetAmount <= 0n) return 0;
    const pct =
      Number((worldEvent.totalContributed * 10000n) / worldEvent.targetAmount) /
      10000;
    return Math.min(1, Math.max(0, pct));
  }, [worldEvent.targetAmount, worldEvent.totalContributed]);

  const openActionModal = (kind: WorldActionKind) => {
    setBuildModalInitialAction(kind);
    setBuildModalOpen(true);
  };

  const claimDisabledReason = !isCurrentRegionUnlocked
    ? "Region locked until Build the Beacon completes"
    : !terrain.claimable
    ? `${terrain.name} cannot be privately claimed`
    : !isUnowned
    ? isYours
      ? "Already owned by your civilization"
      : `Claimed by ${shortenAddress(selectedTile.owner)}`
    : playerStats.tilesClaimed >= playerStats.maxClaimableTiles
    ? `Territory cap full (${playerStats.tilesClaimed}/${playerStats.maxClaimableTiles}) — build Settlement or Outpost`
    : null;

  const settlementDisabledReason = useMemo(() => {
    if (!isCurrentRegionUnlocked) return "Region locked until Beacon completes";
    if (isUnowned) return "Requires tile ownership first";
    if (!isYours) return "Owned by another builder";
    if (selectedTile.settlementLevel > 0)
      return "Settlement Hall already built on tile";
    if (playerRegionSettlements.length >= MAX_SETTLEMENTS_PER_REGION)
      return `Region max (${MAX_SETTLEMENTS_PER_REGION} Settlements) reached`;
    const tooClose = playerRegionSettlements.some(
      (s) =>
        manhattanDistance(s.id, selectedTile.id) <
        MIN_SETTLEMENT_MANHATTAN_DISTANCE
    );
    if (tooClose) return "Must be Manhattan distance ≥ 2 from your Settlements";
    if (
      playerStats.settlementsBuilt === 1 &&
      (playerStats.maxSettlementLevel < 2 ||
        playerStats.structuresBuilt < 2 ||
        playerStats.tilesClaimed < 3)
    ) {
      return "2nd Settlement needs Lv.2 Keep + 2 structures + 3 tiles";
    }
    if (
      playerStats.settlementsBuilt >= 2 &&
      (playerStats.maxSettlementLevel < 3 ||
        playerStats.structuresBuilt < 4 ||
        playerStats.eventsContributedCount < 1)
    ) {
      return "3rd Settlement needs Lv.3 Stronghold + 4 structures + Event contribution";
    }
    return null;
  }, [
    isCurrentRegionUnlocked,
    isUnowned,
    isYours,
    playerRegionSettlements,
    playerStats,
    selectedTile.id,
    selectedTile.settlementLevel,
  ]);

  const nextLevelForSelectedTile = Math.min(
    MAX_SETTLEMENT_LEVEL,
    Math.max(2, selectedTile.settlementLevel + 1)
  ) as SettlementLevel;

  const upgradeDisabledReason = !isCurrentRegionUnlocked
    ? "Region locked"
    : !isYours || selectedTile.settlementLevel === 0
    ? "Requires an owned Settlement Hall on this tile"
    : selectedTile.settlementLevel >= MAX_SETTLEMENT_LEVEL
    ? "Maximum Sovereign Capital tier (Lv. 5) reached"
    : selectedTile.settlementLevel === 1 &&
      (playerStats.tilesClaimed < 2 || playerStats.structuresBuilt < 1)
    ? "Lv. 2 Keep requires ≥ 2 claimed tiles & ≥ 1 structure"
    : selectedTile.settlementLevel === 2 && playerStats.workshopsBuilt < 1
    ? "Lv. 3 Stronghold requires ≥ 1 active Workshop"
    : selectedTile.settlementLevel === 3 &&
      (playerStats.structuresBuilt < 3 || playerStats.tilesClaimed < 4)
    ? "Lv. 4 Fortress requires ≥ 4 tiles & ≥ 3 structures"
    : selectedTile.settlementLevel === 4 &&
      playerStats.beaconsBuilt < 1 &&
      playerStats.eventsContributedCount < 1
    ? "Lv. 5 Sovereign Capital requires Signal Beacon or Regional Event contribution"
    : null;

  const structureDisabledReason = !isCurrentRegionUnlocked
    ? "Region locked until Beacon completes"
    : isUnowned
    ? "Requires tile ownership first"
    : !isYours
    ? "Owned by another builder"
    : selectedTile.structureType !== StructureType.None
    ? `${STRUCTURE_META[selectedTile.structureType].name} already built`
    : null;

  const nextSettlementCost = getNextSettlementCost(playerStats.settlementsBuilt);
  const currentStageInfo = PROGRESSION_STAGES[playerStats.progressionStage];
  const completedMissionsCount = missions.filter((m) => m.completed).length;

  return (
    <div className="animate-page-enter flex-1 flex flex-col landscape:flex-row lg:flex-row w-full h-full min-h-0 overflow-hidden bg-[#050C0F]">
      {/* Mobile Portrait Blocker Overlay — instructs mobile users to rotate to Landscape Mode */}
      <MobileLandscapeGuard />

      {/* Gamified Action, Upgrade & Camera Movement Celebration Overlay */}
      <GameEventCelebration event={celebrationEvent} />

      {/* LEFT / CENTER: Interactive 7x7 Isometric World Viewport */}
      <div className="relative flex-1 min-h-[340px] landscape:min-h-0 lg:min-h-0 h-full w-full overflow-hidden bg-[#050C0F]">
        {/* Top-Left Floating HUD: World Briefing + Multiplayer Tabs (Feed / Missions / Rankings) */}
        <div className="absolute left-3 top-3 sm:left-4 sm:top-4 z-20 w-[268px] sm:w-[336px] max-lg:landscape:w-[250px] max-lg:landscape:p-2.5 rounded-2xl border border-white/[0.1] bg-[#101413]/92 p-4 shadow-panel backdrop-blur-md space-y-2.5 max-lg:landscape:space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-crimson-accent">
              <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse shadow-[0_0_8px_#FF4D5A]" />
              <span>
                {worldEvent.completed
                  ? "Milestone Unlocked"
                  : "Regional Project • Active"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveRegionId(0);
                setSelectedTileId(BEACON_TARGET_TILE_ID);
              }}
              className="font-mono text-[11px] text-ink-muted hover:text-white transition-colors"
            >
              Tile {formatCoords(worldEvent.targetTileId)}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-primary">
              {worldEvent.title}
            </h2>
            <Link
              href="/events"
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-crimson-accent hover:underline"
            >
              <span>Contribute</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-accent transition-all duration-500"
              style={{
                width: `${Math.max(
                  eventProgressRatio > 0 ? 3 : 0,
                  Math.round(eventProgressRatio * 100)
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-ink-primary">
              <WifTokenEmblem className="w-3.5 h-3.5" />
              {formatWif(worldEvent.totalContributed, 0)} /{" "}
              {formatWif(worldEvent.targetAmount, 0)} $WIF
            </span>
            <span className="font-mono text-[10px] text-ink-muted">
              Unlocks Wild Frontier
            </span>
          </div>

          {/* 3-Tab Multiplayer & Missions Bar */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() =>
                setActiveDrawer((cur) => (cur === "missions" ? null : "missions"))
              }
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-all",
                activeDrawer === "missions"
                  ? "bg-crimson text-white shadow-crimson-sm"
                  : "bg-white/[0.04] text-ink-secondary hover:text-white"
              )}
            >
              <Target className="h-3 w-3" />
              <span>
                Missions ({completedMissionsCount}/{missions.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveDrawer((cur) => (cur === "rankings" ? null : "rankings"))
              }
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-all",
                activeDrawer === "rankings"
                  ? "bg-crimson text-white shadow-crimson-sm"
                  : "bg-white/[0.04] text-ink-secondary hover:text-white"
              )}
            >
              <Trophy className="h-3 w-3" />
              <span>Rankings ({regionalRankings.length})</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveDrawer((cur) => (cur === "feed" ? null : "feed"))
              }
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-all",
                activeDrawer === "feed"
                  ? "bg-crimson text-white shadow-crimson-sm"
                  : "bg-white/[0.04] text-ink-secondary hover:text-white"
              )}
            >
              <Activity className="h-3 w-3" />
              <span>Feed ({activities.length})</span>
            </button>
          </div>
        </div>

        {/* Top Region Switcher + Live Resource Economy Bar (All 4 Onchain Maps wired) */}
        <div className="hidden md:flex landscape:flex absolute left-[264px] sm:left-[356px] right-[52px] top-3 sm:top-4 z-20 flex-col items-end xl:items-center gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1 rounded-xl border border-white/[0.1] bg-[#101413]/92 p-1 backdrop-blur-md shadow-panel">
            {REGIONS.map((reg) => {
              const unlocked = Boolean(regionUnlockedMap[reg.id]);
              const selected = activeRegionId === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => handleSelectRegion(reg.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold transition-all",
                    selected
                      ? "bg-crimson text-white shadow-crimson-sm"
                      : "text-ink-secondary hover:text-white hover:bg-white/[0.04]"
                  )}
                  title={`${reg.name} — ${reg.unlockRequirementLabel}`}
                >
                  {unlocked ? (
                    <Compass className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                  )}
                  <span className=" whitespace-nowrap">{reg.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20 transition-colors ml-1"
              title="Open 7-Step Guided Onboarding Tutorial"
            >
              <BookOpen className="h-3 w-3" />
              <span>Tutorial</span>
            </button>
          </div>

          {/* Live In-Game Resource Ticker Pill (Wood, Stone, Food + Harvest CTA) */}
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#101413]/92 px-3.5 py-1.5 text-xs backdrop-blur-md shadow-panel">
            <div
              className="flex items-center gap-1.5"
              title="Wood — Construction Material (Produced by Lumber Camps)"
            >
              <Trees className="h-3.5 w-3.5 text-[#D99B52]" />
              <span className="font-mono font-bold text-ink-primary">
                <AnimatedNumber value={Math.floor(playerStats.wood)} />
              </span>
              <span className="font-mono text-[10px] text-[#D99B52]">
                +{playerStats.woodPerHour}/h
              </span>
            </div>

            <span className="h-3.5 w-px bg-white/10" />

            <div
              className="flex items-center gap-1.5"
              title="Stone — Advanced Buildings (Produced by Quarries)"
            >
              <Mountain className="h-3.5 w-3.5 text-slate-300" />
              <span className="font-mono font-bold text-ink-primary">
                <AnimatedNumber value={Math.floor(playerStats.stone)} />
              </span>
              <span className="font-mono text-[10px] text-slate-300">
                +{playerStats.stonePerHour}/h
              </span>
            </div>

            <span className="h-3.5 w-px bg-white/10" />

            <div
              className="flex items-center gap-1.5"
              title="Food — Settlement Development (Produced by Farms)"
            >
              <Wheat className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-mono font-bold text-ink-primary">
                <AnimatedNumber value={Math.floor(playerStats.food)} />
              </span>
              <span className="font-mono text-[10px] text-amber-400">
                +{playerStats.foodPerHour}/h
              </span>
            </div>

            <span className="h-3.5 w-px bg-white/10" />

            <button
              type="button"
              onClick={handleHarvestResources}
              disabled={isHarvesting || playerStats.tilesClaimed === 0}
              className={cn(
                "gamified-btn inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                playerStats.tilesClaimed > 0
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/30"
                  : "bg-white/[0.04] text-ink-muted cursor-not-allowed"
              )}
              title="Collect accrued resources into your settlement warehouse"
            >
              <Sparkles className="h-3 w-3" />
              <span>{isHarvesting ? "Collecting..." : "Harvest"}</span>
            </button>

            <button
              type="button"
              onClick={refreshAllWorldState}
              className="text-ink-muted hover:text-white transition-colors"
              title="Refresh world state"
            >
              <RefreshCw
                className={cn("h-3 w-3", isLoadingWorld && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {/* Settlement Visit Banner ("Inspect Another Builder's Realm Mode") */}
        {visitedBuilderAddress && visitedBuilderStats && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-16 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-[#2DD4BF]/45 bg-[#0D1918]/95 px-4 py-2.5 text-xs shadow-panel backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#2DD4BF]" />
              <div>
                <div className="font-bold text-ink-primary">
                  Visiting Realm:{" "}
                  <span className="text-[#2DD4BF]">
                    {visitedBuilderRanking?.displayName ||
                      shortenAddress(visitedBuilderAddress)}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-ink-secondary">
                  {visitedBuilderStats.tilesClaimed} Tiles •{" "}
                  {visitedBuilderStats.settlementsBuilt} Settlements (Max Lv.
                  {visitedBuilderStats.maxSettlementLevel}) • +
                  {visitedBuilderStats.woodPerHour}W / +
                  {visitedBuilderStats.stonePerHour}S / +
                  {visitedBuilderStats.foodPerHour}F per hr
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisitedBuilderAddress(null)}
              className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-ink-primary hover:bg-white/[0.12]"
            >
              Exit Visit
            </button>
          </div>
        )}

        {/* Floating Drawer: Missions / Regional Rankings / World Feed */}
        {activeDrawer && (
          <div
            key={activeDrawer}
            className="animate-gamified-pop absolute left-4 top-[198px] z-30 w-[328px] sm:w-[372px] max-h-[390px] flex flex-col rounded-2xl border border-white/[0.12] bg-[#101413]/96 shadow-panel backdrop-blur-md overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div>
                <div className="text-xs font-bold text-ink-primary">
                  {activeDrawer === "missions" &&
                    "Missions & World Challenges"}
                  {activeDrawer === "rankings" &&
                    "Regional Rankings & Settlement Visits"}
                  {activeDrawer === "feed" && "Live World Activity Feed"}
                </div>
                <div className="text-[10px] text-ink-muted">
                  {activeDrawer === "missions" &&
                    "Complete personal & regional objectives to advance your realm"}
                  {activeDrawer === "rankings" &&
                    "Inspect any builder's land & production without spending $WIF"}
                  {activeDrawer === "feed" &&
                    "Recent claims, harvests, structures, upgrades & Beacon support"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="rounded-md p-1 text-ink-muted hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5">
              {activeDrawer === "missions" && (
                <ul className="space-y-2.5 text-xs">
                  {missions.map((m) => {
                    const pct = Math.min(
                      100,
                      Math.round((m.current / m.target) * 100)
                    );
                    return (
                      <li
                        key={m.id}
                        className={cn(
                          "rounded-xl border p-3 space-y-1.5",
                          m.completed
                            ? "border-emerald-500/35 bg-emerald-500/[0.08]"
                            : "border-white/[0.07] bg-obsidian/70"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-ink-primary flex items-center gap-1.5">
                            {m.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Target className="h-3.5 w-3.5 text-crimson-accent shrink-0" />
                            )}
                            {m.title}
                          </span>
                          <span className="font-mono text-[10px] text-ink-secondary">
                            {m.current}/{m.target}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-snug">
                          {m.description}
                        </p>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              m.completed
                                ? "bg-emerald-400"
                                : "bg-crimson-accent"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-medium text-amber-300/90">
                          Unlock: {m.rewardLabel}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {activeDrawer === "rankings" && (
                <ul className="space-y-2 text-xs">
                  {regionalRankings.map((r, idx) => {
                    const isVisiting =
                      visitedBuilderAddress?.toLowerCase() ===
                      r.address.toLowerCase();
                    return (
                      <li
                        key={r.address}
                        className={cn(
                          "rounded-xl border p-2.5 flex items-center justify-between gap-2",
                          r.isCurrentPlayer
                            ? "border-[#2DD4BF]/35 bg-[#2DD4BF]/[0.07]"
                            : "border-white/[0.07] bg-obsidian/70"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-crimson-accent">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-ink-primary truncate">
                              {r.displayName}
                            </span>
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                              {r.activityScore} pts
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-ink-muted mt-0.5">
                            {r.settlementsBuilt} Settl (Lv.{r.maxSettlementLevel}
                            ) • {r.structuresBuilt} Struct • +{r.woodPerHour}W/+
                            {r.stonePerHour}S/+{r.foodPerHour}F/h
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            isVisiting
                              ? setVisitedBuilderAddress(null)
                              : handleVisitRealm(r.address)
                          }
                          className={cn(
                            "shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                            isVisiting
                              ? "border-[#2DD4BF] bg-[#2DD4BF]/20 text-[#2DD4BF]"
                              : "border-white/[0.1] bg-white/[0.04] text-ink-secondary hover:text-white"
                          )}
                        >
                          <Eye className="h-3 w-3" />
                          <span>{isVisiting ? "Visiting" : "Visit"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {activeDrawer === "feed" && (
                <ul className="space-y-2.5 text-xs">
                  {activities.slice(0, 15).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.06] bg-obsidian/70 p-2.5"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-crimson-accent">
                          {item.kind === "region_unlock"
                            ? "Realm Milestone"
                            : shortenAddress(item.player, 3)}
                        </span>{" "}
                        <span className="text-ink-secondary">
                          {item.kind === "claim" &&
                            `claimed ${formatCoords(item.tileId ?? 0)}`}
                          {item.kind === "settlement" &&
                            `founded Settlement at ${formatCoords(item.tileId ?? 0)}`}
                          {item.kind === "upgrade" &&
                            `upgraded Settlement to Lv.${item.newLevel} at ${formatCoords(
                              item.tileId ?? 0
                            )}`}
                          {item.kind === "structure" &&
                            `built ${
                              item.structureType
                                ? STRUCTURE_META[item.structureType].name
                                : "Structure"
                            } at ${formatCoords(item.tileId ?? 0)}`}
                          {item.kind === "harvest" &&
                            `harvested +${item.resourcesAdded?.wood ?? 0}W / +${
                              item.resourcesAdded?.stone ?? 0
                            }S / +${item.resourcesAdded?.food ?? 0}F`}
                          {item.kind === "event" &&
                            `contributed ${formatWif(item.wifAmount, 0)} $WIF to Beacon`}
                          {item.kind === "region_unlock" &&
                            "unlocked The Wild Frontier!"}
                        </span>
                      </div>
                      {!item.isSimulated && (
                        <a
                          href={explorerTxUrl(item.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-muted hover:text-white shrink-0"
                          title="View on Blockscout"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* RPC Read Warning Banner */}
        {isWorldReadError && (
          <div className="absolute left-1/2 -translate-x-1/2 top-24 z-30 flex items-center gap-2 rounded-xl border border-crimson/50 bg-[#1F1012]/95 px-4 py-2 text-xs text-ink-primary shadow-panel">
            <AlertTriangle className="h-4 w-4 text-crimson-accent" />
            <span>RPC read delayed — showing last verified state.</span>
            <button
              type="button"
              onClick={refreshAllWorldState}
              className="font-semibold text-crimson-accent underline ml-1"
            >
              Retry
            </button>
          </div>
        )}

        {/* Interactive Isometric 7x7 World Map */}
        <IsometricWorldMap
          tiles={tiles}
          selectedTileId={selectedTileId}
          onSelectTile={setSelectedTileId}
          onCameraFly={handleCameraFly}
          connectedAddress={visitedBuilderAddress ?? effectiveProfileAddress}
          beaconProgressRatio={eventProgressRatio}
          isRegionLocked={!isCurrentRegionUnlocked}
          regionName={activeRegion.name}
        />
      </div>

      {/* RIGHT SIDEBAR: Resource Economy + Progression + Tile Inspector + Strategic Actions */}
      <aside className="w-full landscape:w-[320px] lg:w-[392px] xl:w-[420px] shrink-0 border-t landscape:border-t-0 lg:border-t-0 landscape:border-l lg:border-l border-white/[0.08] bg-[#101413] flex flex-col overflow-y-auto">
        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Compact Region Switcher for small viewports */}
          <div className="grid grid-cols-2 gap-1.5 md:hidden rounded-xl border border-white/[0.08] bg-obsidian p-1.5">
            {REGIONS.map((reg) => {
              const unlocked = Boolean(regionUnlockedMap[reg.id]);
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => handleSelectRegion(reg.id)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-[11px] font-semibold truncate",
                    activeRegionId === reg.id
                      ? "bg-crimson text-white"
                      : "text-ink-secondary hover:text-white"
                  )}
                >
                  {!unlocked && <Lock className="h-3 w-3 text-amber-400 shrink-0" />}
                  <span className="truncate">{reg.name}</span>
                </button>
              );
            })}
          </div>

          {/* In-Game Resource Economy Card (Wood, Stone, Food + Harvest CTA) */}
          <div className="rounded-2xl border border-white/[0.09] bg-[#111514]/92 backdrop-blur-md shadow-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-secondary">
                  Settlement Materials
                </span>
                <span className="ml-2 font-mono text-[10px] text-ink-muted">
                  Cap {playerStats.storageCap}
                </span>
              </div>
              <button
                type="button"
                onClick={handleHarvestResources}
                disabled={isHarvesting || playerStats.tilesClaimed === 0}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                  playerStats.tilesClaimed > 0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/30"
                    : "bg-white/[0.05] text-ink-muted cursor-not-allowed"
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>{isHarvesting ? "Harvesting..." : "Harvest Now"}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#D99B52]/25 bg-[#D99B52]/10 p-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-[#D99B52]">
                  <span className="flex items-center gap-1">
                    <Trees className="h-3 w-3" />
                    Wood
                  </span>
                  <span className="font-mono">+{playerStats.woodPerHour}/h</span>
                </div>
                <div className="font-mono text-base font-extrabold text-ink-primary mt-0.5">
                  <AnimatedNumber value={Math.floor(playerStats.wood)} />
                </div>
                <div className="text-[9px] text-ink-muted">Lumber Camp</div>
              </div>

              <div className="rounded-xl border border-slate-400/25 bg-slate-400/10 p-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Mountain className="h-3 w-3" />
                    Stone
                  </span>
                  <span className="font-mono">+{playerStats.stonePerHour}/h</span>
                </div>
                <div className="font-mono text-base font-extrabold text-ink-primary mt-0.5">
                  <AnimatedNumber value={Math.floor(playerStats.stone)} />
                </div>
                <div className="text-[9px] text-ink-muted">Quarry</div>
              </div>

              <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-amber-300">
                  <span className="flex items-center gap-1">
                    <Wheat className="h-3 w-3" />
                    Food
                  </span>
                  <span className="font-mono">+{playerStats.foodPerHour}/h</span>
                </div>
                <div className="font-mono text-base font-extrabold text-ink-primary mt-0.5">
                  <AnimatedNumber value={Math.floor(playerStats.food)} />
                </div>
                <div className="text-[9px] text-ink-muted">Farm</div>
              </div>
            </div>
          </div>

          {/* 5-Stage Personal Civilization Progression Card */}
          <div className="rounded-2xl border border-white/[0.09] bg-[#111514]/92 backdrop-blur-md shadow-panel p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-crimson-accent">
                {currentStageInfo.title}
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                Cap: {playerStats.tilesClaimed}/{playerStats.maxClaimableTiles} tiles
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {([1, 2, 3, 4, 5] as const).map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    step <= playerStats.progressionStage
                      ? "bg-gradient-to-r from-crimson to-crimson-accent"
                      : "bg-white/[0.08]"
                  )}
                />
              ))}
            </div>

            <p className="text-[11px] leading-relaxed text-ink-secondary">
              {currentStageInfo.nextMilestoneHint}
            </p>
          </div>

          {/* Selected Tile Header */}
          <div
            key={selectedTile.id}
            className="animate-gamified-pop space-y-3 border-b border-white/[0.07] pb-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Tile Inspector
              </span>
              <span className="font-mono text-xs text-ink-muted">
                #{selectedTile.id} • {formatCoords(selectedTile.id)}
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <IsometricTilePreview
                tile={selectedTile}
                connectedAddress={activePlayerAddr}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold text-ink-primary leading-tight">
                  {terrain.name}
                </h1>
                <p className="text-xs text-ink-muted mt-0.5 truncate">
                  {getRegionLabel(selectedTile.id)}
                </p>
                <p className="text-[11px] text-amber-300/90 mt-0.5">
                  {terrain.resourceAffinity}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-obsidian/70 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Ownership</span>
                {isUnowned ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink-secondary">
                    <span className="h-2 w-2 rounded-full bg-[#68736D]" />
                    Neutral
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {!isYours && (
                      <button
                        type="button"
                        onClick={() => handleVisitRealm(selectedTile.owner)}
                        className="inline-flex items-center gap-1 rounded bg-[#2DD4BF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#2DD4BF] hover:bg-[#2DD4BF]/25"
                      >
                        <Eye className="h-3 w-3" />
                        Inspect Realm
                      </button>
                    )}
                    <a
                      href={explorerAddressUrl(selectedTile.owner)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 font-mono font-semibold hover:underline",
                        isYours ? "text-[#2DD4BF]" : "text-crimson-accent"
                      )}
                    >
                      {isYours ? "You" : shortenAddress(selectedTile.owner)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Settlement Tier</span>
                <span
                  className={cn(
                    "font-medium",
                    selectedTile.settlementLevel > 0
                      ? "text-emerald-400"
                      : "text-ink-dim"
                  )}
                >
                  {selectedTile.settlementLevel > 0
                    ? SETTLEMENT_TIER_META[
                        Math.min(
                          5,
                          selectedTile.settlementLevel
                        ) as SettlementLevel
                      ].name
                    : "None"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Structure</span>
                <span
                  className={cn(
                    "font-medium",
                    selectedTile.structureType !== StructureType.None
                      ? "text-gold"
                      : "text-ink-dim"
                  )}
                >
                  {selectedTile.structureType !== StructureType.None
                    ? `${STRUCTURE_META[selectedTile.structureType].name} (${
                        STRUCTURE_META[selectedTile.structureType]
                          .gameplayFunction
                      })`
                    : "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Available Actions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-secondary">
                Strategic Actions
              </h2>
              <button
                type="button"
                onClick={() => openActionModal("claim")}
                className="text-[11px] font-semibold text-crimson-accent hover:underline"
              >
                Full Build & Economy Panel →
              </button>
            </div>

            {selectedTile.isEventTarget ? (
              <div className="rounded-xl border border-crimson/40 bg-gradient-to-br from-[#231013] to-[#141817] p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-crimson-accent">
                  <Flame className="h-4 w-4" />
                  <span>Shared Regional Monument</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-secondary">
                  Contribute $WIF to complete{" "}
                  <strong className="text-ink-primary">
                    {worldEvent.title}
                  </strong>{" "}
                  and unlock{" "}
                  <strong className="text-ink-primary">
                    The Wild Frontier
                  </strong>{" "}
                  for the entire realm.
                </p>
                <Link
                  href="/events"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson py-2.5 text-xs font-bold text-white shadow-crimson-sm hover:brightness-110 transition-all"
                >
                  <span>Contribute to Beacon</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <ActionRowButton
                  icon={Flag}
                  title="Claim Tile"
                  costWif={costs.claim}
                  primary={!claimDisabledReason}
                  disabledReason={claimDisabledReason}
                  onClick={() => openActionModal("claim")}
                />

                <ActionRowButton
                  icon={Castle}
                  title={`Found Settlement #${Math.min(
                    3,
                    playerStats.settlementsBuilt + 1
                  )}`}
                  costWif={nextSettlementCost}
                  primary={Boolean(
                    claimDisabledReason && !settlementDisabledReason
                  )}
                  disabledReason={settlementDisabledReason}
                  onClick={() => openActionModal("settlement")}
                />

                {selectedTile.settlementLevel > 0 && (
                  <ActionRowButton
                    icon={ArrowUpCircle}
                    title={
                      selectedTile.settlementLevel >= MAX_SETTLEMENT_LEVEL
                        ? "Sovereign Capital (Lv.5 Max)"
                        : `Upgrade to ${SETTLEMENT_TIER_META[nextLevelForSelectedTile].name}`
                    }
                    costWif={
                      SETTLEMENT_TIER_META[nextLevelForSelectedTile].costWif
                    }
                    primary={!upgradeDisabledReason}
                    disabledReason={upgradeDisabledReason}
                    onClick={() => openActionModal("upgrade")}
                  />
                )}

                <ActionRowButton
                  icon={Hammer}
                  title="Build Production or Structure"
                  costWif={costs.farm ?? costs.outpost}
                  costPrefix="from"
                  primary={Boolean(
                    claimDisabledReason &&
                      settlementDisabledReason &&
                      !structureDisabledReason
                  )}
                  disabledReason={structureDisabledReason}
                  onClick={() => openActionModal("structure")}
                />
              </div>
            )}
          </div>

          {/* Terrain Rules Info Card */}
          <div className="rounded-2xl border border-white/[0.09] bg-[#111514]/92 backdrop-blur-md shadow-panel p-4 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Terrain & Resource Specialization
            </div>
            <div className="flex items-start gap-2.5">
              <span
                className="mt-1 h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: terrain.accentColor }}
              />
              <div>
                <div className="text-xs font-bold text-ink-primary">
                  {terrain.name} — {terrain.tagline}
                </div>
                <p className="text-[11px] leading-relaxed text-ink-muted mt-0.5">
                  {terrain.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Screen 3: Civilization Build & Progression Modal */}
      <BuildActionModal
        open={buildModalOpen}
        onClose={() => setBuildModalOpen(false)}
        tile={selectedTile}
        regionTiles={tiles}
        isRegionUnlocked={isCurrentRegionUnlocked}
        playerStats={playerStats}
        initialAction={buildModalInitialAction}
        costs={costs}
        isContractDeployed={isContractDeployed}
        contractAddress={contractAddress}
        treasuryAddress={treasuryAddress}
        onRefreshWorld={refreshAllWorldState}
      />

      {/* Phase 3 Guided 7-Step Pioneer Onboarding Modal */}
      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        tiles={tiles}
        selectedTileId={selectedTileId}
        onSelectTile={setSelectedTileId}
        playerStats={playerStats}
        missions={missions}
        costs={costs}
        isContractDeployed={isContractDeployed}
        onRefreshWorld={refreshAllWorldState}
      />
    </div>
  );
}

function ActionRowButton({
  icon: Icon,
  title,
  costWif,
  costPrefix,
  primary,
  disabledReason,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  costWif: bigint;
  costPrefix?: string;
  primary?: boolean;
  disabledReason: string | null;
  onClick: () => void;
}) {
  const isAvailable = !disabledReason;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-xl border px-3.5 py-2.5 text-left transition-all flex items-center justify-between gap-2.5",
          primary && isAvailable
            ? "border-crimson-accent bg-gradient-to-r from-crimson to-[#B8232F] text-white shadow-crimson-sm hover:brightness-110"
            : isAvailable
            ? "border-white/[0.1] bg-[#161B1A] text-ink-primary hover:border-crimson/50 hover:bg-[#1C2220]"
            : "border-white/[0.05] bg-[#121615] text-ink-muted hover:border-white/[0.12]"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isAvailable ? (
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                primary ? "text-white" : "text-crimson-accent"
              )}
            />
          ) : (
            <Lock className="h-3.5 w-3.5 shrink-0 text-ink-dim" />
          )}
          <span className="text-xs font-bold truncate">{title}</span>
        </div>

        <span
          className={cn(
            "font-mono text-xs font-bold shrink-0",
            primary && isAvailable
              ? "text-white"
              : isAvailable
              ? "text-crimson-accent"
              : "text-ink-dim"
          )}
        >
          {costPrefix ? `${costPrefix} ` : ""}
          {formatWif(costWif, 2)} $WIF
        </span>
      </button>

      {disabledReason && (
        <p className="px-1.5 text-[10px] text-ink-dim leading-tight">
          • {disabledReason}
        </p>
      )}
    </div>
  );
}
