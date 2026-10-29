"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpCircle,
  Castle,
  ChevronRight,
  Compass,
  ExternalLink,
  Flag,
  Flame,
  Hammer,
  Info,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { IsometricWorldMap } from "@/components/world/IsometricWorldMap";
import { IsometricTilePreview } from "@/components/tiles/IsometricTilePreview";
import { BuildActionModal } from "@/components/build/BuildActionModal";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import {
  useRobinhoodWallet,
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
  MAX_SETTLEMENTS_PER_REGION,
  MIN_SETTLEMENT_MANHATTAN_DISTANCE,
  PROGRESSION_STAGES,
  REGIONS,
  SETTLEMENT_TIER_META,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
  WorldActionKind,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import {
  cn,
  formatCountdown,
  formatWif,
  shortenAddress,
} from "@/lib/utils";

export default function WorldScreen() {
  const [activeRegionId, setActiveRegionId] = useState<number>(0);
  // Default selected tile: (3, 4) in Region 0 -> localId = 31 (Forest tile)
  const [selectedTileId, setSelectedTileId] = useState<number>(31);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [buildModalInitialAction, setBuildModalInitialAction] =
    useState<WorldActionKind>("claim");
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);

  const { address } = useRobinhoodWallet();
  const {
    isContractDeployed,
    contractAddress,
    treasuryAddress,
    tiles,
    regionUnlockedMap,
    costs,
    worldEvent,
    worldSummary,
    playerStats,
    activities,
    isLoadingWorld,
    isWorldReadError,
    refreshAllWorldState,
  } = useWorldData(address, activeRegionId);

  const activeRegion = REGIONS[activeRegionId] ?? REGIONS[0];
  const isCurrentRegionUnlocked = Boolean(regionUnlockedMap[activeRegionId]);

  const handleSelectRegion = (regionId: number) => {
    setActiveRegionId(regionId);
    // Focus center/default tile in that region
    setSelectedTileId(getWorldTileId(regionId, regionId === 0 ? 31 : 24));
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
    Boolean(address) &&
    selectedTile.owner.toLowerCase() === address?.toLowerCase();

  const playerRegionSettlements = useMemo(() => {
    if (!address) return [];
    const lower = address.toLowerCase();
    return tiles.filter(
      (t) => t.owner.toLowerCase() === lower && t.settlementLevel > 0
    );
  }, [address, tiles]);

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

  // Exact prerequisite explanations on sidebar
  const claimDisabledReason = !isCurrentRegionUnlocked
    ? "Region locked until Build the Beacon completes"
    : !terrain.claimable
    ? `${terrain.name} cannot be privately claimed`
    : !isUnowned
    ? isYours
      ? "Already owned by your wallet"
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
      return "2nd Settlement needs Lv.2 Stronghold + 2 structures + 3 tiles";
    }
    if (
      playerStats.settlementsBuilt >= 2 &&
      (playerStats.maxSettlementLevel < 3 ||
        playerStats.structuresBuilt < 4 ||
        playerStats.eventsContributedCount < 1)
    ) {
      return "3rd Settlement needs Lv.3 Citadel + 4 structures + Event contribution";
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

  const upgradeDisabledReason = !isCurrentRegionUnlocked
    ? "Region locked"
    : !isYours || selectedTile.settlementLevel === 0
    ? "Requires an owned Settlement Hall on this tile"
    : selectedTile.settlementLevel >= 3
    ? "Maximum Citadel tier (Lv. 3) reached"
    : selectedTile.settlementLevel === 1 &&
      (playerStats.tilesClaimed < 2 || playerStats.structuresBuilt < 1)
    ? "Lv. 2 Stronghold requires ≥ 2 claimed tiles & ≥ 1 structure"
    : selectedTile.settlementLevel === 2 && playerStats.workshopsBuilt < 1
    ? "Lv. 3 Citadel requires ≥ 1 active Workshop"
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

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-obsidian">
      {/* LEFT / CENTER: Interactive 7x7 Isometric World Viewport */}
      <div className="relative flex-1 min-h-[460px] lg:min-h-0 h-full">
        {/* Top-Left Floating HUD: World Briefing & Regional Objective */}
        <div className="absolute left-4 top-4 z-20 w-[290px] sm:w-[332px] rounded-2xl border border-white/[0.1] bg-[#101413]/92 p-4 shadow-panel backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-crimson-accent">
              <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse shadow-[0_0_8px_#FF4D5A]" />
              <span>
                {worldEvent.completed
                  ? "Milestone Unlocked"
                  : "World Briefing • Active Objective"}
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

          <p className="text-[11px] leading-snug text-ink-muted">
            Completing this monument unlocks{" "}
            <span className="font-semibold text-ink-primary">
              Region 1: The Wild Frontier
            </span>{" "}
            (49 new tiles) for all players.
          </p>

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
            <button
              type="button"
              onClick={() => setActivityDrawerOpen((v) => !v)}
              className="inline-flex items-center gap-1 font-semibold text-ink-secondary hover:text-crimson-accent transition-colors"
            >
              <Activity className="h-3 w-3" />
              <span>World Feed ({activities.length})</span>
            </button>
          </div>
        </div>

        {/* Top-Center Region Switcher + World Summary Pill */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-4 z-20 flex-col items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.1] bg-[#101413]/92 p-1 backdrop-blur-md shadow-panel">
            {REGIONS.filter((r) => r.mvpPlayable).map((reg) => {
              const unlocked = Boolean(regionUnlockedMap[reg.id]);
              const selected = activeRegionId === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => handleSelectRegion(reg.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    selected
                      ? "bg-crimson text-white shadow-crimson-sm"
                      : "text-ink-secondary hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {unlocked ? (
                    <Compass className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3 w-3 text-amber-400" />
                  )}
                  <span>{reg.name}</span>
                </button>
              );
            })}
            <span
              className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-ink-dim"
              title="The Highlands & The Crossroads unlock in future world phases"
            >
              +2 Charted Regions
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#101413]/88 px-3.5 py-1.5 text-[11px] backdrop-blur-md">
            <span className="text-ink-muted">
              Claimed:{" "}
              <strong className="font-mono text-ink-primary">
                {worldSummary.claimedTiles}
              </strong>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-ink-muted">
              Settlements:{" "}
              <strong className="font-mono text-ink-primary">
                {worldSummary.settlements}
              </strong>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-ink-muted">
              Structures:{" "}
              <strong className="font-mono text-ink-primary">
                {worldSummary.structures}
              </strong>
            </span>
            <button
              type="button"
              onClick={refreshAllWorldState}
              className="text-ink-muted hover:text-white transition-colors"
              title="Refresh chain state"
            >
              <RefreshCw
                className={cn("h-3 w-3", isLoadingWorld && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {/* Live World Activity Feed Popover ("What changed while you were away") */}
        {activityDrawerOpen && (
          <div className="absolute left-4 top-[198px] z-30 w-[320px] sm:w-[356px] max-h-[340px] flex flex-col rounded-2xl border border-white/[0.12] bg-[#101413]/96 shadow-panel backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div>
                <div className="text-xs font-bold text-ink-primary">
                  Live World Activity Feed
                </div>
                <div className="text-[10px] text-ink-muted">
                  Verified changes across all players on Robinhood Chain
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivityDrawerOpen(false)}
                className="rounded-md p-1 text-ink-muted hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5">
              {activities.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-muted leading-relaxed">
                  {isContractDeployed
                    ? "No verified map changes recorded yet — claim the first tile in The Heartlands!"
                    : "Genesis world preview: once WIFWorlds.sol is deployed in Phase B, live player settlements, upgrades, and Beacon milestones stream here."}
                </p>
              ) : (
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
                            `upgraded Hall Lv.${item.newLevel} at ${formatCoords(
                              item.tileId ?? 0
                            )}`}
                          {item.kind === "structure" &&
                            `built ${
                              item.structureType
                                ? STRUCTURE_META[item.structureType].name
                                : "Structure"
                            } at ${formatCoords(item.tileId ?? 0)}`}
                          {item.kind === "event" &&
                            `contributed ${formatWif(item.wifAmount, 0)} $WIF to Beacon`}
                          {item.kind === "region_unlock" &&
                            "unlocked The Wild Frontier!"}
                        </span>
                      </div>
                      <a
                        href={explorerTxUrl(item.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-muted hover:text-white shrink-0"
                        title="View on Blockscout"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
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
          connectedAddress={address}
          beaconProgressRatio={eventProgressRatio}
          isRegionLocked={!isCurrentRegionUnlocked}
          regionName={activeRegion.name}
        />
      </div>

      {/* RIGHT SIDEBAR: Civilization Progression + Tile Details + Strategic Actions */}
      <aside className="w-full lg:w-[384px] xl:w-[412px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#101413] flex flex-col overflow-y-auto">
        <div className="p-5 space-y-4 flex-1">
          {/* Mobile Region Switcher */}
          <div className="flex md:hidden items-center gap-1.5 rounded-xl border border-white/[0.08] bg-obsidian p-1">
            {REGIONS.filter((r) => r.mvpPlayable).map((reg) => {
              const unlocked = Boolean(regionUnlockedMap[reg.id]);
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => handleSelectRegion(reg.id)}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold",
                    activeRegionId === reg.id
                      ? "bg-crimson text-white"
                      : "text-ink-secondary"
                  )}
                >
                  {!unlocked && <Lock className="h-3 w-3 text-amber-400" />}
                  <span>{reg.name}</span>
                </button>
              );
            })}
          </div>

          {/* 5-Stage Personal Civilization Progression Card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#141918] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-crimson-accent">
                {currentStageInfo.title}
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                Cap: {playerStats.tilesClaimed}/{playerStats.maxClaimableTiles} tiles
              </span>
            </div>

            {/* 5 Stage Step Bars */}
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

          {!isContractDeployed && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-2.5 text-[11px] leading-relaxed text-amber-200/90">
              <Info className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-200">
                  Phase A Complete:
                </span>{" "}
                Progression rules & multi-region map locked. Ready for Phase B{" "}
                <code className="font-mono text-amber-300">WIFWorlds.sol</code>{" "}
                deployment.
              </div>
            </div>
          )}

          {/* Selected Tile Header */}
          <div className="space-y-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Tile Details
              </span>
              <span className="font-mono text-xs text-ink-muted">
                #{selectedTile.id} • {formatCoords(selectedTile.id)}
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <IsometricTilePreview
                tile={selectedTile}
                connectedAddress={address}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold text-ink-primary leading-tight">
                  {terrain.name}
                </h1>
                <p className="text-xs text-ink-muted mt-0.5 truncate">
                  {getRegionLabel(selectedTile.id)}
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
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Settlement Hall</span>
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
                        selectedTile.settlementLevel as 1 | 2 | 3
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
                    ? STRUCTURE_META[selectedTile.structureType].name
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
                Full Build Panel →
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
                  primary={Boolean(claimDisabledReason && !settlementDisabledReason)}
                  disabledReason={settlementDisabledReason}
                  onClick={() => openActionModal("settlement")}
                />

                {selectedTile.settlementLevel > 0 && (
                  <ActionRowButton
                    icon={ArrowUpCircle}
                    title={
                      selectedTile.settlementLevel === 1
                        ? "Upgrade to Stronghold (Lv.2)"
                        : "Upgrade to Citadel (Lv.3)"
                    }
                    costWif={
                      selectedTile.settlementLevel === 1
                        ? costs.upgradeToLv2
                        : costs.upgradeToLv3
                    }
                    primary={!upgradeDisabledReason}
                    disabledReason={upgradeDisabledReason}
                    onClick={() => openActionModal("upgrade")}
                  />
                )}

                <ActionRowButton
                  icon={Hammer}
                  title="Build Structure"
                  costWif={costs.outpost}
                  costPrefix="from"
                  primary={false}
                  disabledReason={structureDisabledReason}
                  onClick={() => openActionModal("structure")}
                />
              </div>
            )}
          </div>

          {/* Terrain Rules Info Card */}
          <div className="rounded-xl border border-white/[0.07] bg-[#141918] p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Terrain & Building Suitability
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
              ? "text-ink-primary"
              : "text-ink-dim"
          )}
        >
          {costPrefix ? `${costPrefix} ` : ""}
          {formatWif(costWif, 0)} $WIF
        </span>
      </button>

      {disabledReason && (
        <p className="px-1 text-[10.5px] text-ink-dim">{disabledReason}</p>
      )}
    </div>
  );
}
