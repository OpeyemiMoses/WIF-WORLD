"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Hammer,
  Info,
  Loader2,
  Mountain,
  ShieldCheck,
  Sparkles,
  Trees,
  Wheat,
  X,
} from "lucide-react";
import { IsometricTilePreview } from "@/components/tiles/IsometricTilePreview";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import { AnimatedNumber } from "@/components/ui/ScrollReveal";
import {
  explorerAddressUrl,
  explorerTxUrl,
  ROBINHOOD_CHAIN_ID,
} from "@/lib/chain/robinhood";
import {
  TxLifecycleStage,
  useRobinhoodWallet,
  useWorldActionExecutor,
} from "@/lib/contract/useWorldState";
import {
  formatCoords,
  getNextSettlementCost,
  getNextSettlementResourceCost,
  getRegionLabel,
  getStructureProductionOnTerrain,
  manhattanDistance,
  MAX_SETTLEMENT_LEVEL,
  MAX_SETTLEMENTS_PER_REGION,
  MIN_SETTLEMENT_MANHATTAN_DISTANCE,
  PlayerStats,
  ResourceCost,
  SETTLEMENT_TIER_META,
  SettlementLevel,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
  TerrainType,
  TileState,
  WorldActionKind,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

interface BuildActionModalProps {
  open: boolean;
  onClose: () => void;
  tile: TileState;
  regionTiles: TileState[];
  isRegionUnlocked: boolean;
  playerStats: PlayerStats;
  initialAction?: WorldActionKind;
  costs: {
    claim: bigint;
    settlementSlot1: bigint;
    settlementSlot2: bigint;
    settlementSlot3: bigint;
    upgradeToLv2: bigint;
    upgradeToLv3: bigint;
    upgradeToLv4?: bigint;
    upgradeToLv5?: bigint;
    outpost: bigint;
    workshop: bigint;
    beacon: bigint;
    lumberCamp?: bigint;
    quarry?: bigint;
    farm?: bigint;
  };
  isContractDeployed: boolean;
  contractAddress: `0x${string}` | null;
  treasuryAddress: `0x${string}` | null;
  onRefreshWorld: () => Promise<void>;
}

export function BuildActionModal({
  open,
  onClose,
  tile,
  regionTiles,
  isRegionUnlocked,
  playerStats,
  initialAction = "claim",
  costs,
  isContractDeployed,
  contractAddress,
  treasuryAddress,
  onRefreshWorld,
}: BuildActionModalProps) {
  const [selectedAction, setSelectedAction] =
    useState<WorldActionKind>(initialAction);
  const [selectedStructure, setSelectedStructure] = useState<
    Exclude<StructureType, StructureType.None>
  >(StructureType.LumberCamp);

  const {
    address,
    effectivePlayerAddress,
    isConnected,
    isWrongNetwork,
    switchToRobinhood,
    isSwitchingChain,
    wifBalance,
    ethBalance,
    wifAllowance,
    refetchBalances,
  } = useRobinhoodWallet();

  const activePlayerAddr = isContractDeployed
    ? address
    : effectivePlayerAddress;

  const handleFullRefresh = async () => {
    await Promise.all([onRefreshWorld(), refetchBalances()]);
  };

  const {
    stage,
    txHash,
    errorMessage,
    stepLabel,
    resetTxState,
    approveExactWif,
    executeGameAction,
  } = useWorldActionExecutor(handleFullRefresh, activePlayerAddr);

  useEffect(() => {
    setSelectedAction(initialAction);
    if (tile.terrain === TerrainType.Forest) {
      setSelectedStructure(StructureType.LumberCamp);
    } else if (
      tile.terrain === TerrainType.Rocky ||
      tile.terrain === TerrainType.Hills
    ) {
      setSelectedStructure(StructureType.Quarry);
    } else {
      setSelectedStructure(StructureType.Farm);
    }
    resetTxState();
  }, [initialAction, tile.id, tile.terrain, open, resetTxState]);

  const terrain = TERRAIN_META[tile.terrain];
  const isUnowned = !tile.owner || tile.owner.toLowerCase() === ZERO_ADDRESS;
  const isYours =
    !isUnowned &&
    Boolean(activePlayerAddr) &&
    tile.owner.toLowerCase() === activePlayerAddr?.toLowerCase();

  // Player's existing settlements in this specific region
  const playerRegionSettlements = useMemo(() => {
    if (!activePlayerAddr) return [];
    const lower = activePlayerAddr.toLowerCase();
    return regionTiles.filter(
      (t) => t.owner.toLowerCase() === lower && t.settlementLevel > 0
    );
  }, [activePlayerAddr, regionTiles]);

  const nextSettlementCost = useMemo(
    () => getNextSettlementCost(playerStats.settlementsBuilt),
    [playerStats.settlementsBuilt]
  );

  const nextSettlementLevel = Math.min(
    MAX_SETTLEMENT_LEVEL,
    Math.max(2, tile.settlementLevel + 1)
  ) as SettlementLevel;

  const requiredCost = useMemo(() => {
    if (selectedAction === "claim") return costs.claim;
    if (selectedAction === "settlement") return nextSettlementCost;
    if (selectedAction === "upgrade") {
      return SETTLEMENT_TIER_META[nextSettlementLevel].costWif;
    }
    if (selectedStructure === StructureType.Workshop) return costs.workshop;
    if (selectedStructure === StructureType.Beacon) return costs.beacon;
    if (selectedStructure === StructureType.LumberCamp)
      return (
        costs.lumberCamp ?? STRUCTURE_META[StructureType.LumberCamp].defaultCostWif
      );
    if (selectedStructure === StructureType.Quarry)
      return costs.quarry ?? STRUCTURE_META[StructureType.Quarry].defaultCostWif;
    if (selectedStructure === StructureType.Farm)
      return costs.farm ?? STRUCTURE_META[StructureType.Farm].defaultCostWif;
    return costs.outpost;
  }, [
    costs,
    nextSettlementCost,
    nextSettlementLevel,
    selectedAction,
    selectedStructure,
  ]);

  const requiredResources: ResourceCost = useMemo(() => {
    if (selectedAction === "claim") return { wood: 0, stone: 0, food: 0 };
    if (selectedAction === "settlement") {
      return getNextSettlementResourceCost(playerStats.settlementsBuilt);
    }
    if (selectedAction === "upgrade") {
      return SETTLEMENT_TIER_META[nextSettlementLevel].resourceCost;
    }
    return STRUCTURE_META[selectedStructure].resourceCost;
  }, [
    nextSettlementLevel,
    playerStats.settlementsBuilt,
    selectedAction,
    selectedStructure,
  ]);

  const hasEnoughResources =
    playerStats.wood >= requiredResources.wood &&
    playerStats.stone >= requiredResources.stone &&
    playerStats.food >= requiredResources.food;

  const eligibility = useMemo(() => {
    if (!isRegionUnlocked) {
      return {
        ok: false,
        reason:
          "Region locked — unlocks automatically when Build the Beacon reaches 100%.",
      };
    }

    if (selectedAction === "claim") {
      if (!terrain.claimable) {
        return {
          ok: false,
          reason: `${terrain.name} tiles are natural/world landmarks and cannot be claimed.`,
        };
      }
      if (!isUnowned) {
        return {
          ok: false,
          reason: isYours
            ? "You already own this tile. Choose Settlement, Upgrade, or Structure."
            : `Already claimed by ${shortenAddress(tile.owner)}.`,
        };
      }
      if (playerStats.tilesClaimed >= playerStats.maxClaimableTiles) {
        return {
          ok: false,
          reason: `Territory capacity full (${playerStats.tilesClaimed}/${playerStats.maxClaimableTiles}). Build a Settlement, Upgrade a Hall, or raise an Outpost to expand your cap.`,
        };
      }
      return {
        ok: true,
        reason:
          playerStats.tilesClaimed === 0
            ? "First land claim! Grants +160 Wood, +120 Stone, +140 Food starter cache."
            : `Neutral claimable land • Capacity ${playerStats.tilesClaimed}/${playerStats.maxClaimableTiles} tiles`,
      };
    }

    if (selectedAction === "settlement") {
      if (isUnowned) {
        return {
          ok: false,
          reason: "Claim this tile first before founding a Settlement Hall.",
        };
      }
      if (!isYours) {
        return {
          ok: false,
          reason: `Only the tile owner (${shortenAddress(tile.owner)}) can found a settlement here.`,
        };
      }
      if (tile.settlementLevel > 0) {
        return {
          ok: false,
          reason:
            "A Settlement Hall already stands here. Switch to 'Upgrade Hall' to level it up.",
        };
      }
      if (playerRegionSettlements.length >= MAX_SETTLEMENTS_PER_REGION) {
        return {
          ok: false,
          reason: `Maximum of ${MAX_SETTLEMENTS_PER_REGION} Settlements reached in this region.`,
        };
      }

      const tooClose = playerRegionSettlements.some(
        (s) =>
          manhattanDistance(s.id, tile.id) < MIN_SETTLEMENT_MANHATTAN_DISTANCE
      );
      if (tooClose) {
        return {
          ok: false,
          reason: `Too close to your existing Settlement — new Settlements must be at Manhattan distance ≥ ${MIN_SETTLEMENT_MANHATTAN_DISTANCE}.`,
        };
      }

      if (playerStats.settlementsBuilt === 1) {
        if (
          playerStats.maxSettlementLevel < 2 ||
          playerStats.structuresBuilt < 2 ||
          playerStats.tilesClaimed < 3
        ) {
          return {
            ok: false,
            reason:
              "2nd Settlement requires: 1 Keep (Lv.2+), 2+ structures built, and 3+ claimed tiles.",
          };
        }
      } else if (playerStats.settlementsBuilt >= 2) {
        if (
          playerStats.maxSettlementLevel < 3 ||
          playerStats.structuresBuilt < 4 ||
          playerStats.eventsContributedCount < 1
        ) {
          return {
            ok: false,
            reason:
              "3rd Settlement requires: 1 Stronghold (Lv.3+), 4+ structures built, and ≥ 1 World Event contribution.",
          };
        }
      }

      if (!hasEnoughResources) {
        return {
          ok: false,
          reason: `Requires ${requiredResources.wood} Wood, ${requiredResources.stone} Stone, ${requiredResources.food} Food.`,
        };
      }

      return {
        ok: true,
        reason: `Eligible for Settlement #${playerStats.settlementsBuilt + 1} (+3 Territory Cap & +20W/+10S/+20F per hr)`,
      };
    }

    if (selectedAction === "upgrade") {
      if (!isYours || tile.settlementLevel === 0) {
        return {
          ok: false,
          reason:
            "Select a tile where you have already founded a Settlement Hall.",
        };
      }
      if (tile.settlementLevel >= MAX_SETTLEMENT_LEVEL) {
        return {
          ok: false,
          reason:
            "This Sovereign Capital has reached the maximum tier (Lv. 5).",
        };
      }
      if (tile.settlementLevel === 1) {
        if (playerStats.tilesClaimed < 2 || playerStats.structuresBuilt < 1) {
          return {
            ok: false,
            reason:
              "Homestead Keep (Lv. 2) requires owning ≥ 2 tiles and ≥ 1 structure (e.g. Farm, Lumber Camp, Quarry, or Outpost).",
          };
        }
      } else if (tile.settlementLevel === 2) {
        if (playerStats.workshopsBuilt < 1) {
          return {
            ok: false,
            reason:
              "Stronghold Citadel (Lv. 3) requires at least 1 active Workshop in your civilization.",
          };
        }
      } else if (tile.settlementLevel === 3) {
        if (playerStats.structuresBuilt < 3 || playerStats.tilesClaimed < 4) {
          return {
            ok: false,
            reason:
              "Grand Fortress (Lv. 4) requires owning ≥ 4 tiles and ≥ 3 structures.",
          };
        }
      } else if (tile.settlementLevel === 4) {
        if (
          playerStats.beaconsBuilt < 1 &&
          playerStats.eventsContributedCount < 1
        ) {
          return {
            ok: false,
            reason:
              "Sovereign Capital (Lv. 5) requires a Signal Beacon or a Regional Event contribution.",
          };
        }
      }

      if (!hasEnoughResources) {
        return {
          ok: false,
          reason: `Insufficient materials: need ${requiredResources.wood} Wood, ${requiredResources.stone} Stone, ${requiredResources.food} Food.`,
        };
      }

      return {
        ok: true,
        reason: `Ready to upgrade Lv. ${tile.settlementLevel} → ${SETTLEMENT_TIER_META[nextSettlementLevel].name}`,
      };
    }

    // Structure validation (Terrain + Materials + Progression)
    const structMeta = STRUCTURE_META[selectedStructure];
    if (isUnowned) {
      return {
        ok: false,
        reason: "Claim this tile before constructing structures.",
      };
    }
    if (!isYours) {
      return {
        ok: false,
        reason: `Only the tile owner (${shortenAddress(tile.owner)}) can construct here.`,
      };
    }
    if (tile.structureType !== StructureType.None) {
      return {
        ok: false,
        reason: `Tile already holds an active ${STRUCTURE_META[tile.structureType].name}.`,
      };
    }

    if (!terrain.allowedStructures.includes(selectedStructure)) {
      return {
        ok: false,
        reason: `${structMeta.name} cannot be built on ${terrain.name}. Requires: ${structMeta.terrainRuleLabel}.`,
      };
    }

    if (selectedStructure === StructureType.Workshop) {
      if (playerRegionSettlements.length < 1) {
        return {
          ok: false,
          reason:
            "Workshop requires at least 1 established Settlement Hall in this region.",
        };
      }
    }

    if (selectedStructure === StructureType.Beacon) {
      const validBeaconTerrain =
        tile.terrain === TerrainType.Hills ||
        tile.terrain === TerrainType.Rocky ||
        tile.settlementLevel >= 2;
      if (!validBeaconTerrain) {
        return {
          ok: false,
          reason:
            "Signal Beacons require Hills/Rocky elevation or a local Keep (Lv. 2+).",
        };
      }
      if (playerStats.maxSettlementLevel < 2) {
        return {
          ok: false,
          reason:
            "Signal Beacons require at least 1 Keep/Stronghold (Lv. 2+) in your civilization.",
        };
      }
    }

    if (!hasEnoughResources) {
      return {
        ok: false,
        reason: `Insufficient materials: need ${requiredResources.wood} Wood, ${requiredResources.stone} Stone, ${requiredResources.food} Food.`,
      };
    }

    return {
      ok: true,
      reason: `Eligible for ${structMeta.name} (${structMeta.shortPurpose})`,
    };
  }, [
    hasEnoughResources,
    isRegionUnlocked,
    isUnowned,
    isYours,
    nextSettlementLevel,
    playerRegionSettlements.length,
    playerStats,
    requiredResources,
    selectedAction,
    selectedStructure,
    terrain.allowedStructures,
    terrain.claimable,
    terrain.name,
    tile.id,
    tile.owner,
    tile.settlementLevel,
    tile.structureType,
    tile.terrain,
  ]);

  if (!open) return null;

  const hasEnoughWif = wifBalance >= requiredCost;
  const hasAllowance = wifAllowance >= requiredCost;
  const hasGasEth = ethBalance > 0n;
  const isBusy =
    stage === "awaiting_wallet" ||
    stage === "submitted" ||
    stage === "pending" ||
    stage === "refreshing";

  const canExecute =
    isContractDeployed &&
    isConnected &&
    !isWrongNetwork &&
    eligibility.ok &&
    hasEnoughWif &&
    hasGasEth &&
    !isBusy;

  const handlePrimaryClick = async () => {
    if (!isConnected) return;
    if (isWrongNetwork) {
      await switchToRobinhood();
      return;
    }
    if (!isContractDeployed || !canExecute) return;

    if (!hasAllowance) {
      await approveExactWif(requiredCost);
      return;
    }

    if (selectedAction === "claim") {
      await executeGameAction({ action: "claim", tileId: tile.id });
    } else if (selectedAction === "settlement") {
      await executeGameAction({ action: "settlement", tileId: tile.id });
    } else if (selectedAction === "upgrade") {
      await executeGameAction({ action: "upgrade", tileId: tile.id });
    } else {
      await executeGameAction({
        action: "structure",
        tileId: tile.id,
        structureType: selectedStructure,
      });
    }
  };

  const actionHeadline =
    selectedAction === "claim"
      ? "Claim Territory Tile"
      : selectedAction === "settlement"
      ? `Found Settlement #${playerStats.settlementsBuilt + 1}`
      : selectedAction === "upgrade"
      ? `Upgrade to ${SETTLEMENT_TIER_META[nextSettlementLevel].name}`
      : `Construct ${STRUCTURE_META[selectedStructure].name}`;

  const unlockRewardSummary =
    selectedAction === "claim"
      ? "Establishes permanent tile ownership for Settlements, Lumber Camps, Quarries, Farms, or Outposts."
      : selectedAction === "settlement"
      ? SETTLEMENT_TIER_META[1].unlockSummary
      : selectedAction === "upgrade"
      ? SETTLEMENT_TIER_META[nextSettlementLevel].unlockSummary
      : STRUCTURE_META[selectedStructure].unlockEffect;

  const previewStructureYield =
    selectedAction === "structure"
      ? getStructureProductionOnTerrain(selectedStructure, tile.terrain)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-panel-title"
    >
      <div className="animate-gamified-pop relative my-auto w-full max-w-4xl rounded-3xl border border-white/[0.12] bg-[#111514]/96 backdrop-blur-xl shadow-panel overflow-hidden">
        {/* Top Modal Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#141918]/90 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-crimson-accent shadow-[0_0_8px_#FF4D5A]" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-secondary">
              Civilization Build, Economy & Progression Panel
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-white disabled:opacity-40 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-7">
          {/* LEFT COLUMN (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4 rounded-2xl border border-white/[0.09] bg-[#161B19]/80 p-5">
            <div className="space-y-4">
              {/* Selected Tile Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-white/[0.07]">
                <IsometricTilePreview
                  tile={tile}
                  connectedAddress={activePlayerAddr}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id="build-panel-title"
                      className="text-xl font-bold text-ink-primary"
                    >
                      {terrain.name} Tile
                    </h2>
                    <span className="font-mono text-sm text-ink-muted">
                      {formatCoords(tile.id)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {getRegionLabel(tile.id)} •{" "}
                    <span className="text-amber-300/90">
                      {terrain.resourceAffinity}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-obsidian/70 px-2.5 py-0.5 text-[11px] font-medium text-ink-secondary">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isUnowned
                            ? "bg-ink-muted"
                            : isYours
                            ? "bg-[#2DD4BF]"
                            : "bg-crimson-accent"
                        )}
                      />
                      {isUnowned
                        ? "Neutral"
                        : isYours
                        ? "Owned by You"
                        : `Owned by ${shortenAddress(tile.owner)}`}
                    </span>
                    {tile.settlementLevel > 0 && (
                      <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        {
                          SETTLEMENT_TIER_META[
                            Math.min(
                              5,
                              tile.settlementLevel
                            ) as SettlementLevel
                          ].name
                        }
                      </span>
                    )}
                    {tile.structureType !== StructureType.None && (
                      <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                        {STRUCTURE_META[tile.structureType].name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4-Tab Segmented Action Selector */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  Select Strategic Action
                </p>
                <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-obsidian p-1 border border-white/[0.06]">
                  {(
                    [
                      { key: "claim", label: "Claim Land" },
                      { key: "settlement", label: "Settlement" },
                      { key: "upgrade", label: "Upgrade (Lv.1-5)" },
                      { key: "structure", label: "Structures (6)" },
                    ] as const
                  ).map((tab) => {
                    const active = selectedAction === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setSelectedAction(tab.key);
                          resetTxState();
                        }}
                        className={cn(
                          "rounded-lg py-2 px-1 text-[11px] sm:text-xs font-semibold transition-all",
                          active
                            ? "bg-gradient-to-b from-crimson-accent to-crimson text-white shadow-crimson-sm"
                            : "text-ink-secondary hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6-Structure Selector (3 Production + 3 Strategic) */}
              {selectedAction === "structure" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>Production Buildings & Strategic Infrastructure</span>
                    <span>Terrain specialization bonus auto-applied</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        StructureType.LumberCamp,
                        StructureType.Quarry,
                        StructureType.Farm,
                        StructureType.Workshop,
                        StructureType.Outpost,
                        StructureType.Beacon,
                      ] as const
                    ).map((st) => {
                      const meta = STRUCTURE_META[st];
                      const active = selectedStructure === st;
                      const isFavored =
                        meta.favoredTerrain?.includes(tile.terrain) ?? false;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedStructure(st);
                            resetTxState();
                          }}
                          className={cn(
                            "rounded-xl border p-2.5 text-left transition-all",
                            active
                              ? "border-crimson-accent bg-crimson-muted/40"
                              : "border-white/[0.07] bg-obsidian/60 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-ink-primary">
                              {meta.name}
                            </span>
                            {isFavored && (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                                +BONUS
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-crimson-accent mt-0.5">
                            {formatWif(meta.defaultCostWif, 2)} $WIF
                          </div>
                          <div className="text-[10px] text-ink-secondary mt-1 line-clamp-1">
                            {meta.gameplayFunction}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settlement 5-Level Ladder Preview when Upgrade tab active */}
              {selectedAction === "upgrade" && (
                <div className="grid grid-cols-5 gap-1.5">
                  {([1, 2, 3, 4, 5] as const).map((lvl) => {
                    const tier = SETTLEMENT_TIER_META[lvl];
                    const reached = tile.settlementLevel >= lvl;
                    const isNext = tile.settlementLevel + 1 === lvl;
                    return (
                      <div
                        key={lvl}
                        className={cn(
                          "rounded-xl border p-2 text-center",
                          reached
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : isNext
                            ? "border-crimson-accent bg-crimson-muted/35"
                            : "border-white/[0.06] bg-obsidian/50 opacity-70"
                        )}
                      >
                        <div className="font-mono text-[10px] font-bold text-ink-primary">
                          Lv. {lvl}
                        </div>
                        <div className="text-[9px] text-ink-secondary line-clamp-1 mt-0.5">
                          {tier.shortUnlock}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Headline + Strategic Unlock Box + Cost ($WIF + Wood/Stone/Food) */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-ink-primary">
                    {actionHeadline}
                  </h3>
                  {previewStructureYield &&
                    (previewStructureYield.wood > 0 ||
                      previewStructureYield.stone > 0 ||
                      previewStructureYield.food > 0) && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                        Yields{" "}
                        {[
                          previewStructureYield.wood > 0
                            ? `+${previewStructureYield.wood} Wood/hr`
                            : null,
                          previewStructureYield.stone > 0
                            ? `+${previewStructureYield.stone} Stone/hr`
                            : null,
                          previewStructureYield.food > 0
                            ? `+${previewStructureYield.food} Food/hr`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    )}
                </div>

                <div className="rounded-xl border border-crimson/25 bg-[#1B1012]/70 px-3.5 py-2.5 text-xs">
                  <span className="font-bold text-crimson-accent">
                    Gameplay Function:{" "}
                  </span>
                  <span className="text-ink-secondary">
                    {unlockRewardSummary}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-obsidian/80 px-3.5 py-2.5">
                    <span className="text-xs font-medium text-ink-secondary">
                      $WIF Cost
                    </span>
                    <div className="flex items-center gap-1.5">
                      <WifTokenEmblem className="w-4 h-4" />
                      <span className="font-mono text-sm font-bold text-crimson-accent">
                        {formatWif(requiredCost, 2)} $WIF
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-obsidian/80 px-3.5 py-2.5">
                    <span className="text-xs font-medium text-ink-secondary">
                      Materials
                    </span>
                    {requiredResources.wood === 0 &&
                    requiredResources.stone === 0 &&
                    requiredResources.food === 0 ? (
                      <span className="font-mono text-xs text-emerald-400">
                        No Materials Needed
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 font-mono text-xs font-bold">
                        {requiredResources.wood > 0 && (
                          <span
                            className={
                              playerStats.wood >= requiredResources.wood
                                ? "text-[#D99B52]"
                                : "text-crimson-accent"
                            }
                          >
                            {requiredResources.wood}W
                          </span>
                        )}
                        {requiredResources.stone > 0 && (
                          <span
                            className={
                              playerStats.stone >= requiredResources.stone
                                ? "text-slate-300"
                                : "text-crimson-accent"
                            }
                          >
                            {requiredResources.stone}S
                          </span>
                        )}
                        {requiredResources.food > 0 && (
                          <span
                            className={
                              playerStats.food >= requiredResources.food
                                ? "text-amber-400"
                                : "text-crimson-accent"
                            }
                          >
                            {requiredResources.food}F
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div>
                <p className="text-xs font-semibold text-ink-primary mb-2">
                  Progression & Material Requirements
                </p>
                <ul className="space-y-1.5 text-xs">
                  <RequirementRow
                    ok={eligibility.ok}
                    label={eligibility.reason}
                  />
                  <RequirementRow
                    ok={hasEnoughResources}
                    label={
                      requiredResources.wood === 0 &&
                      requiredResources.stone === 0 &&
                      requiredResources.food === 0
                        ? "No in-game materials required for this action"
                        : `Warehouse Check: ${Math.floor(playerStats.wood)}/${requiredResources.wood} Wood • ${Math.floor(playerStats.stone)}/${requiredResources.stone} Stone • ${Math.floor(playerStats.food)}/${requiredResources.food} Food`
                    }
                  />
                  <RequirementRow
                    ok={isConnected && !isWrongNetwork && isContractDeployed}
                    label={
                      !isConnected
                        ? "Connect an EVM wallet"
                        : isWrongNetwork
                        ? `Switch wallet to Robinhood Chain (${ROBINHOOD_CHAIN_ID})`
                        : !isContractDeployed
                        ? "Awaiting WIFWorlds contract address on Robinhood Chain"
                        : `Connected to Robinhood Chain (${ROBINHOOD_CHAIN_ID})`
                    }
                  />
                </ul>
              </div>
            </div>

            {/* CTA + Tx Feedback */}
            <div className="space-y-3 pt-2">
              <TransactionStatusCallout
                stage={stage}
                txHash={txHash}
                errorMessage={errorMessage}
                stepLabel={stepLabel}
                onRetry={resetTxState}
                isSandbox={false}
              />

              {!isConnected ? (
                <div className="rounded-xl border border-white/[0.08] bg-obsidian/80 px-4 py-3 text-center text-xs text-ink-secondary">
                  Connect your wallet in the top navigation bar to perform onchain actions.
                </div>
              ) : isWrongNetwork ? (
                <button
                  type="button"
                  onClick={switchToRobinhood}
                  disabled={isSwitchingChain}
                  className="w-full rounded-xl bg-gradient-to-b from-crimson-accent to-crimson py-3.5 text-sm font-bold text-white shadow-crimson hover:brightness-110 transition-all"
                >
                  {isSwitchingChain
                    ? "Switching Network..."
                    : "Switch to Robinhood Chain"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  disabled={!canExecute}
                  className={cn(
                    "gamified-btn flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all",
                    canExecute
                      ? "bg-gradient-to-b from-crimson-accent to-crimson text-white shadow-crimson hover:brightness-110 active:scale-[0.99]"
                      : "border border-white/[0.08] bg-[#1B201E] text-ink-muted cursor-not-allowed"
                  )}
                >
                  {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>
                    {stage === "awaiting_wallet"
                      ? "Confirm in Wallet..."
                      : stage === "pending" || stage === "submitted"
                      ? "Updating Living Map..."
                      : stage === "refreshing"
                      ? "Refreshing World Map..."
                      : !isContractDeployed
                      ? "Awaiting Contract Deployment"
                      : !eligibility.ok
                      ? "Prerequisites Not Yet Met"
                      : !hasEnoughWif
                      ? `Insufficient $WIF (${formatWif(requiredCost)} Required)`
                      : !hasGasEth
                      ? "Insufficient ETH for Gas"
                      : !hasAllowance
                      ? `Step 1: Approve ${formatWif(requiredCost)} $WIF`
                      : `Confirm ${actionHeadline}`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Warehouse Stockpile + Capacity + Tx Details */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* In-Game Resource Warehouse Card */}
            <div className="rounded-2xl border border-white/[0.09] bg-[#161B19]/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-secondary flex items-center gap-1.5">
                  <Hammer className="h-3.5 w-3.5 text-amber-400" />
                  Settlement Resource Warehouse
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  Cap: {playerStats.storageCap}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[#D99B52]/25 bg-[#D99B52]/10 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-[#D99B52]">
                    <Trees className="h-3 w-3" />
                    Wood
                  </div>
                  <div className="font-mono text-base font-extrabold text-ink-primary mt-0.5">
                    <AnimatedNumber value={Math.floor(playerStats.wood)} />
                  </div>
                  <div className="font-mono text-[10px] text-[#D99B52]">
                    +{playerStats.woodPerHour}/hr
                  </div>
                </div>

                <div className="rounded-xl border border-slate-400/25 bg-slate-400/10 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-300">
                    <Mountain className="h-3 w-3" />
                    Stone
                  </div>
                  <div className="font-mono text-base font-extrabold text-ink-primary mt-0.5">
                    <AnimatedNumber value={Math.floor(playerStats.stone)} />
                  </div>
                  <div className="font-mono text-[10px] text-slate-300">
                    +{playerStats.stonePerHour}/hr
                  </div>
                </div>

                <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                    <Wheat className="h-3 w-3" />
                    Food
                  </div>
                  <div className="font-mono text-base font-extrabold text-ink-primary mt-0.5">
                    <AnimatedNumber value={Math.floor(playerStats.food)} />
                  </div>
                  <div className="font-mono text-[10px] text-amber-300">
                    +{playerStats.foodPerHour}/hr
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-ink-dim leading-relaxed">
                Wood, Stone, and Food are in-game construction materials generated over time by Lumber Camps, Quarries, and Farms — not crypto tokens.
              </p>
            </div>

            {/* Territory & Settlement Capacity Card */}
            <div className="rounded-2xl border border-white/[0.09] bg-[#161B19]/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-secondary">
                  Civilization Capacity
                </span>
                <span className="font-mono text-[11px] text-crimson-accent">
                  Stage {playerStats.progressionStage}/5
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-white/[0.06] bg-obsidian/70 p-2.5">
                  <div className="text-[10px] text-ink-muted">Territory Cap</div>
                  <div className="font-mono text-sm font-bold text-ink-primary mt-0.5">
                    {playerStats.tilesClaimed} / {playerStats.maxClaimableTiles}{" "}
                    <span className="text-[10px] font-normal text-ink-muted">
                      tiles
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-obsidian/70 p-2.5">
                  <div className="text-[10px] text-ink-muted">
                    Region Settlements
                  </div>
                  <div className="font-mono text-sm font-bold text-ink-primary mt-0.5">
                    {playerRegionSettlements.length} / {MAX_SETTLEMENTS_PER_REGION}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-ink-dim leading-relaxed">
                Territory cap = 3 base + 3/Settlement + 2/Hall Upgrade + 2/Outpost.
              </p>
            </div>

            {/* Your Balance & Network Card */}
            <div className="flex-1 rounded-2xl border border-white/[0.09] bg-[#161B19]/80 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-secondary">
                    Wallet & Network
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <WifTokenEmblem className="w-7 h-7" />
                  <div>
                    <div className="font-mono text-base font-extrabold text-ink-primary">
                      {isConnected
                        ? `${formatWif(wifBalance, 2)} $WIF`
                        : "Connect Wallet"}
                    </div>
                    <div className="font-mono text-[11px] text-ink-muted">
                      {isConnected
                        ? `${Number(formatUnits(ethBalance, 18)).toFixed(4)} ETH gas available`
                        : "All $WIF costs route 100% to World Treasury"}
                    </div>
                  </div>
                </div>

                {isContractDeployed && (
                  <button
                    type="button"
                    disabled={
                      !isConnected ||
                      isWrongNetwork ||
                      hasAllowance ||
                      !hasEnoughWif ||
                      isBusy
                    }
                    onClick={() => approveExactWif(requiredCost)}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                      isConnected &&
                        !isWrongNetwork &&
                        !hasAllowance &&
                        hasEnoughWif &&
                        !isBusy
                        ? "border-crimson/50 bg-crimson-muted/50 text-crimson-accent hover:bg-crimson hover:text-white"
                        : "border-white/[0.08] bg-obsidian/60 text-ink-muted cursor-not-allowed"
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>
                      {hasAllowance
                        ? `Allowance Ready (${formatWif(wifAllowance)} $WIF)`
                        : `Approve ${formatWif(requiredCost)} $WIF`}
                    </span>
                  </button>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-ink-muted">Destination</span>
                  {treasuryAddress ? (
                    <a
                      href={explorerAddressUrl(treasuryAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-ink-secondary hover:text-white"
                    >
                      {shortenAddress(treasuryAddress)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : contractAddress ? (
                    <a
                      href={explorerAddressUrl(contractAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-crimson-accent hover:underline"
                    >
                      {shortenAddress(contractAddress)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-ink-secondary">
                      0x4792...84e7 (Treasury)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-obsidian/70 p-2.5 text-[11px] leading-relaxed text-ink-muted">
                <Info className="h-3.5 w-3.5 text-crimson-accent shrink-0 mt-0.5" />
                <span>
                  No punitive decay: settlements and structures persist
                  permanently. Production buildings generate Wood, Stone, and
                  Food automatically over time.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementRow({
  ok,
  neutral,
  label,
}: {
  ok: boolean;
  neutral?: boolean;
  label: string;
}) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
      ) : neutral ? (
        <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-crimson-accent shrink-0 mt-0.5" />
      )}
      <span className={cn(ok ? "text-ink-secondary" : "text-ink-primary")}>
        {label}
      </span>
    </li>
  );
}

export function TransactionStatusCallout({
  stage,
  txHash,
  errorMessage,
  stepLabel,
  onRetry,
  isSandbox,
}: {
  stage: TxLifecycleStage;
  txHash: `0x${string}` | null;
  errorMessage: string | null;
  stepLabel: string | null;
  onRetry: () => void;
  isSandbox?: boolean;
}) {
  if (stage === "idle") return null;

  if (stage === "awaiting_wallet") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>
          {stepLabel || "Waiting for confirmation in your wallet..."}
        </span>
      </div>
    );
  }

  if (stage === "submitted" || stage === "pending" || stage === "refreshing") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-200">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>
            {stage === "refreshing"
              ? "Confirmed! Refreshing world state..."
              : "Applying world action to The Living Map..."}
          </span>
        </div>
        {txHash && !isSandbox && (
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono underline shrink-0"
          >
            View Tx
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  if (stage === "confirmed") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            {isSandbox
              ? "Action applied! The Living Map & your resource economy have been updated."
              : "Confirmed on Robinhood Chain! The Living Map has been updated."}
          </span>
        </div>
        {txHash && !isSandbox && (
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-emerald-300 underline shrink-0"
          >
            Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  if (stage === "wallet_rejected") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2.5 text-xs text-ink-secondary">
        <span>{errorMessage || "Request declined in wallet."}</span>
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-crimson-accent hover:underline shrink-0"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-crimson/40 bg-crimson-muted/40 px-3.5 py-2.5 text-xs text-ink-primary">
      <div className="space-y-0.5">
        <p>{errorMessage || "Action failed."}</p>
        {txHash && !isSandbox && (
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-crimson-accent underline"
          >
            Inspect on Blockscout
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold text-crimson-accent hover:underline shrink-0"
      >
        Retry
      </button>
    </div>
  );
}
