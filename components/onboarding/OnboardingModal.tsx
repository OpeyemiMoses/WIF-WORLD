"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useConnect } from "wagmi";
import { formatUnits } from "viem";
import {
  ArrowLeft,
  ArrowRight,
  Castle,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flame,
  Hammer,
  Loader2,
  MapPin,
  Mountain,
  ShieldCheck,
  Sparkles,
  Target,
  Trees,
  Wallet,
  Wheat,
  X,
} from "lucide-react";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import { explorerTxUrl, ROBINHOOD_CHAIN_ID } from "@/lib/chain/robinhood";
import {
  useRobinhoodWallet,
  useWorldActionExecutor,
} from "@/lib/contract/useWorldState";
import {
  formatCoords,
  getStructureProductionOnTerrain,
  MissionStatus,
  PlayerStats,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
  TerrainType,
  TileState,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  tiles: TileState[];
  selectedTileId: number;
  onSelectTile: (tileId: number) => void;
  playerStats: PlayerStats;
  missions: MissionStatus[];
  costs: {
    claim: bigint;
    settlementSlot1: bigint;
    lumberCamp?: bigint;
    quarry?: bigint;
    farm?: bigint;
  };
  isContractDeployed: boolean;
  onRefreshWorld: () => Promise<void>;
}

const STEP_TITLES = [
  { step: 1, title: "Welcome to WIF WORLDS" },
  { step: 2, title: "Connect Your Wallet" },
  { step: 3, title: "How the Living World Works" },
  { step: 4, title: "Choose a Starting Location" },
  { step: 5, title: "Establish First Settlement" },
  { step: 6, title: "First Production Building" },
  { step: 7, title: "Starter Mission Briefing" },
] as const;

export function OnboardingModal({
  open,
  onClose,
  tiles,
  selectedTileId,
  onSelectTile,
  playerStats,
  missions,
  costs,
  isContractDeployed,
  onRefreshWorld,
}: OnboardingModalProps) {
  const [step, setStep] = useState<number>(1);
  const [chosenStructure, setChosenStructure] = useState<
    StructureType.LumberCamp | StructureType.Quarry | StructureType.Farm
  >(StructureType.LumberCamp);

  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const {
    address,
    isConnected,
    isWrongNetwork,
    switchToRobinhood,
    isSwitchingChain,
    wifBalance,
    ethBalance,
    wifAllowance,
    refetchBalances,
  } = useRobinhoodWallet();

  const connectWallet = async () => {
    const preferred = connectors[0];
    if (!preferred) return;
    try {
      await connectAsync({ connector: preferred });
    } catch {
      // handled by wallet prompt
    }
  };

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
  } = useWorldActionExecutor(handleFullRefresh, address);

  // Sync onboarding progress from server per wallet
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/onboarding?wallet=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.onboarding) return;
        const rec = data.onboarding;
        if (rec.currentStep >= 1 && rec.currentStep <= 7) {
          setStep(rec.currentStep);
        }
        if (typeof rec.selectedStartTileId === "number") {
          onSelectTile(rec.selectedStartTileId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, onSelectTile]);

  const persistProgress = (patch: {
    currentStep?: number;
    completed?: boolean;
    skipped?: boolean;
    selectedStartTileId?: number;
  }) => {
    if (typeof window !== "undefined") {
      if (patch.completed || patch.skipped) {
        window.localStorage.setItem("wif_worlds_onboarding_dismissed_v1", "1");
      }
    }
    if (!address) return;
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: address,
        ...patch,
      }),
    }).catch(() => {});
  };

  const goToStep = (nextStep: number) => {
    const clamped = Math.max(1, Math.min(7, nextStep));
    setStep(clamped);
    resetTxState();
    persistProgress({ currentStep: clamped });
  };

  const handleSkipOrClose = () => {
    persistProgress({ skipped: true, currentStep: step });
    onClose();
  };

  const handleCompleteOnboarding = () => {
    persistProgress({ completed: true, currentStep: 7 });
    onClose();
  };

  // Eligible starting tiles in Region 0 (Heartlands)
  const eligibleStartingTiles = useMemo(() => {
    return tiles
      .filter((t) => {
        const meta = TERRAIN_META[t.terrain];
        const isUnowned = !t.owner || t.owner.toLowerCase() === ZERO_ADDRESS;
        const isYours =
          Boolean(address) &&
          t.owner.toLowerCase() === address?.toLowerCase();
        return meta.claimable && (isUnowned || isYours);
      })
      .slice(0, 9);
  }, [address, tiles]);

  const selectedTile = useMemo(
    () => tiles.find((t) => t.id === selectedTileId) ?? tiles[31] ?? tiles[0],
    [selectedTileId, tiles]
  );

  const isSelectedTileOwnedByYou =
    Boolean(address) &&
    Boolean(selectedTile?.owner) &&
    selectedTile.owner.toLowerCase() === address?.toLowerCase();

  const isSelectedTileUnowned =
    !selectedTile?.owner ||
    selectedTile.owner.toLowerCase() === ZERO_ADDRESS;

  const isBusy =
    stage === "awaiting_wallet" ||
    stage === "submitted" ||
    stage === "pending" ||
    stage === "refreshing";

  if (!open || !selectedTile) return null;

  const terrainMeta = TERRAIN_META[selectedTile.terrain];
  const step5ActionIsClaim = !isSelectedTileOwnedByYou;
  const step5Cost = step5ActionIsClaim ? costs.claim : costs.settlementSlot1;
  const step5NeedsApproval = wifAllowance < step5Cost;

  const step6Cost =
    chosenStructure === StructureType.LumberCamp
      ? costs.lumberCamp ?? STRUCTURE_META[StructureType.LumberCamp].defaultCostWif
      : chosenStructure === StructureType.Quarry
      ? costs.quarry ?? STRUCTURE_META[StructureType.Quarry].defaultCostWif
      : costs.farm ?? STRUCTURE_META[StructureType.Farm].defaultCostWif;
  const step6NeedsApproval = wifAllowance < step6Cost;
  const step6Yield = getStructureProductionOnTerrain(
    chosenStructure,
    selectedTile.terrain
  );

  const starterMission =
    missions.find((m) => m.id === "first-settlement") ?? missions[0];
  const productionMission =
    missions.find((m) => m.id === "first-farm-or-camp") ?? missions[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative my-auto w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-amber-200/20 bg-[#101413]/96 shadow-[0_28px_90px_rgba(0,0,0,0.88)] backdrop-blur-xl overflow-hidden">
        {/* Top Header + Step Progress Indicator */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/[0.08] bg-[#141918]/95 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-crimson-accent shadow-[0_0_8px_#FF4D5A]" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-amber-200/90 truncate">
              Pioneer Onboarding • Step {step} of 7
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSkipOrClose}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>
            <button
              type="button"
              onClick={handleSkipOrClose}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-white transition-colors"
              aria-label="Close onboarding"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 7-Step Progress Bar */}
        <div className="shrink-0 grid grid-cols-7 gap-1 bg-[#0C0F0E] px-4 py-2 sm:px-6 sm:py-2.5 border-b border-white/[0.06]">
          {STEP_TITLES.map((s) => {
            const active = step === s.step;
            const done = step > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => goToStep(s.step)}
                className="group text-left focus:outline-none"
              >
                <div
                  className={cn(
                    "h-1.5 w-full rounded-full transition-all",
                    active
                      ? "bg-crimson-accent shadow-[0_0_8px_#FF4D5A]"
                      : done
                      ? "bg-emerald-400"
                      : "bg-white/[0.1] group-hover:bg-white/[0.2]"
                  )}
                />
                <div
                  className={cn(
                    "mt-1 hidden sm:block truncate text-[10px] font-semibold",
                    active
                      ? "text-white"
                      : done
                      ? "text-emerald-300"
                      : "text-ink-muted"
                  )}
                >
                  {s.step}. {s.title.split(" ")[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-crimson/40 bg-crimson/15 text-crimson-accent shadow-crimson">
                <Castle className="h-8 w-8" />
              </div>
              <div className="space-y-3 max-w-xl mx-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Robinhood Chain • Persistent Onchain World
                </span>
                <h2
                  id="onboarding-title"
                  className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                >
                  Welcome to WIF WORLDS
                </h2>
                <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
                  Welcome to WIF WORLDS. Build your settlement, develop your
                  territory, and shape a living world alongside other players.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/70 p-4">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#2DD4BF]" />
                    Claim & Found
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Claim fertile plains, forests, or rocky crags and raise your
                    first Settlement Hall (Lv. 1–5).
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/70 p-4">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Trees className="h-4 w-4 text-[#D99B52]" />
                    Produce Materials
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Build Lumber Camps, Quarries, and Farms to generate Wood,
                    Stone, and Food over time.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/70 p-4">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-crimson-accent" />
                    Shape the Realm
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Collaborate on World Events like The Great Bridge to unlock
                    new regions for everyone.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-7 py-3.5 text-sm font-bold text-white shadow-crimson hover:brightness-110 transition-all"
                >
                  <span>Enter the World</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: WALLET CONNECTION */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2
                  id="onboarding-title"
                  className="text-xl font-extrabold text-white"
                >
                  Step 2: Connect Your EVM Wallet
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                  Every tile, settlement, resource harvest, and world event in
                  WIF WORLDS is anchored on Robinhood Chain (Chain ID{" "}
                  {ROBINHOOD_CHAIN_ID}).
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.1] bg-obsidian/80 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04]">
                      <Wallet className="h-5 w-5 text-crimson-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-ink-muted">Wallet Status</div>
                      <div className="font-mono text-sm font-bold text-white">
                        {isConnected && address
                          ? shortenAddress(address, 6)
                          : "No wallet connected"}
                      </div>
                    </div>
                  </div>

                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-5 py-2.5 text-xs font-bold text-white shadow-crimson hover:brightness-110"
                    >
                      {isConnecting ? "Connecting..." : "Connect EVM Wallet"}
                    </button>
                  ) : isWrongNetwork ? (
                    <button
                      type="button"
                      onClick={switchToRobinhood}
                      disabled={isSwitchingChain}
                      className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:brightness-110"
                    >
                      {isSwitchingChain
                        ? "Switching..."
                        : `Switch to Robinhood Chain (${ROBINHOOD_CHAIN_ID})`}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Connected to Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                    </span>
                  )}
                </div>

                {isConnected && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/[0.07]">
                    <div className="rounded-xl border border-white/[0.06] bg-[#121716] p-3">
                      <div className="text-[11px] text-ink-muted">
                        $WIF Balance
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-white">
                        <WifTokenEmblem className="h-4 w-4" />
                        {formatWif(wifBalance, 2)} $WIF
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-[#121716] p-3">
                      <div className="text-[11px] text-ink-muted">
                        ETH Gas Balance
                      </div>
                      <div className="mt-1 font-mono text-sm font-bold text-white">
                        {Number(formatUnits(ethBalance, 18)).toFixed(4)} ETH
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: EXPLAIN THE GAME */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="text-xl font-extrabold text-white"
                >
                  Step 3: Core Systems of WIF WORLDS
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                  Understand how land, settlements, materials, and $WIF work
                  together before choosing your starting tile.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/75 p-4 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-[#2DD4BF]" />
                    1. Land & Settlements (Lv. 1–5)
                  </div>
                  <p className="text-ink-secondary leading-relaxed">
                    Claim neutral tiles (6.25 $WIF) and establish up to 3
                    Settlements per region (spaced ≥ 2 tiles apart). Upgrade
                    from Lv. 1 Hall to Lv. 5 Sovereign Capital.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/75 p-4 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Hammer className="h-4 w-4 text-[#D99B52]" />
                    2. Buildings & In-Game Resources
                  </div>
                  <p className="text-ink-secondary leading-relaxed">
                    Lumber Camps produce{" "}
                    <span className="text-[#D99B52] font-semibold">Wood</span>,
                    Quarries produce{" "}
                    <span className="text-slate-300 font-semibold">Stone</span>,
                    and Farms produce{" "}
                    <span className="text-amber-300 font-semibold">Food</span>{" "}
                    over time. These are in-game building materials, not crypto
                    tokens.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/75 p-4 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-400" />
                    3. Missions & World Events
                  </div>
                  <p className="text-ink-secondary leading-relaxed">
                    Complete personal progression missions and contribute to
                    shared World Events like{" "}
                    <span className="text-white font-semibold">
                      The Great Bridge
                    </span>{" "}
                    to unlock new frontier regions.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-obsidian/75 p-4 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <WifTokenEmblem className="h-4 w-4" />
                    4. 100% $WIF Treasury Routing
                  </div>
                  <p className="text-ink-secondary leading-relaxed">
                    Every onchain construction and event contribution spends{" "}
                    <span className="text-crimson-accent font-semibold">
                      $WIF
                    </span>{" "}
                    directly to the verified WIF WORLDS Treasury. Your first
                    tile claim also grants a starter material cache (+160W,
                    +120S, +140F).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CHOOSE A STARTING LOCATION */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="text-xl font-extrabold text-white"
                >
                  Step 4: Choose Your Starting Location
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                  Select an eligible tile in{" "}
                  <span className="text-white font-semibold">
                    The Heartlands
                  </span>
                  . Clicking any tile below highlights and focuses it on the 3D
                  island map.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {eligibleStartingTiles.map((t) => {
                  const tMeta = TERRAIN_META[t.terrain];
                  const isSelected = t.id === selectedTile.id;
                  const ownedByYou =
                    Boolean(address) &&
                    t.owner.toLowerCase() === address?.toLowerCase();
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTile(t.id);
                        persistProgress({ selectedStartTileId: t.id });
                      }}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-crimson-accent bg-crimson-muted/40 shadow-crimson-sm"
                          : "border-white/[0.08] bg-obsidian/75 hover:border-white/25"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">
                          {tMeta.name} {formatCoords(t.id)}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            ownedByYou
                              ? "bg-[#2DD4BF]/20 text-[#2DD4BF]"
                              : "bg-emerald-500/15 text-emerald-300"
                          )}
                        >
                          {ownedByYou ? "Yours" : "Unclaimed"}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-amber-300/90 line-clamp-1">
                        {tMeta.resourceAffinity}
                      </div>
                      <div className="mt-1 text-[10px] text-ink-muted">
                        Claim: 6.25 $WIF • Starter Cache Included
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: ESTABLISH THE FIRST SETTLEMENT */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="text-xl font-extrabold text-white"
                >
                  Step 5: Establish Your First Settlement
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                  First claim your chosen tile ({formatCoords(selectedTile.id)}{" "}
                  {terrainMeta.name}), then found your{" "}
                  <span className="text-white font-semibold">
                    Settlement Hall (Lv. 1)
                  </span>{" "}
                  onchain.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.1] bg-obsidian/80 p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-ink-muted">Selected Tile</div>
                    <div className="text-sm font-bold text-white">
                      {terrainMeta.name} Tile {formatCoords(selectedTile.id)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-ink-muted">Current Status</div>
                    <div className="font-mono font-bold text-emerald-300">
                      {selectedTile.settlementLevel > 0
                        ? `Settlement Lv.${selectedTile.settlementLevel} Established!`
                        : isSelectedTileOwnedByYou
                        ? "Tile Claimed • Ready for Settlement Hall"
                        : isSelectedTileUnowned
                        ? "Unclaimed Neutral Land"
                        : "Claimed by Another Player"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.07]">
                  <div>
                    <div className="text-[10px] text-ink-muted">Action Cost</div>
                    <div className="font-mono font-bold text-crimson-accent">
                      {formatWif(step5Cost, 2)} $WIF
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">Your $WIF</div>
                    <div className="font-mono font-bold text-white">
                      {formatWif(wifBalance, 2)} $WIF
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted">Allowance</div>
                    <div className="font-mono font-bold text-ink-secondary">
                      {formatWif(wifAllowance, 2)} $WIF
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-crimson/40 bg-crimson-muted/30 px-3 py-2 text-crimson-accent">
                    {errorMessage}
                  </div>
                )}

                {txHash && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                    <span>Transaction confirmed on Robinhood Chain!</span>
                    <a
                      href={explorerTxUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono underline"
                    >
                      Blockscout <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {selectedTile.settlementLevel > 0 ||
                playerStats.settlementsBuilt > 0 ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-emerald-200 font-semibold">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      First Settlement Verified Onchain!
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(6)}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-black"
                    >
                      Continue to Step 6
                    </button>
                  </div>
                ) : !isConnected ? (
                  <button
                    type="button"
                    onClick={connectWallet}
                    className="w-full rounded-xl bg-crimson py-3 text-xs font-bold text-white"
                  >
                    Connect Wallet First
                  </button>
                ) : isWrongNetwork ? (
                  <button
                    type="button"
                    onClick={switchToRobinhood}
                    className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-black"
                  >
                    Switch to Robinhood Chain
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy || !isContractDeployed}
                    onClick={async () => {
                      if (step5NeedsApproval) {
                        await approveExactWif(step5Cost);
                      } else if (step5ActionIsClaim) {
                        await executeGameAction({
                          action: "claim",
                          tileId: selectedTile.id,
                        });
                      } else {
                        await executeGameAction({
                          action: "settlement",
                          tileId: selectedTile.id,
                        });
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson py-3 text-xs font-bold text-white shadow-crimson hover:brightness-110 disabled:opacity-50"
                  >
                    {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {isBusy
                        ? stepLabel || "Confirming on Robinhood Chain..."
                        : step5NeedsApproval
                        ? `Step 1: Approve ${formatWif(step5Cost, 2)} $WIF`
                        : step5ActionIsClaim
                        ? `Claim Tile ${formatCoords(selectedTile.id)} (6.25 $WIF)`
                        : `Found Settlement Hall at ${formatCoords(
                            selectedTile.id
                          )} (25 $WIF)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: FIRST CONSTRUCTION */}
          {step === 6 && (
            <div className="space-y-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="text-xl font-extrabold text-white"
                >
                  Step 6: Construct Your First Production Building
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                  Production structures generate in-game materials every hour so
                  you can upgrade your Settlement Hall and expand across the
                  map.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      type: StructureType.LumberCamp,
                      icon: Trees,
                      color: "text-[#D99B52]",
                      output: "+30 to +45 Wood/hr",
                    },
                    {
                      type: StructureType.Quarry,
                      icon: Mountain,
                      color: "text-slate-300",
                      output: "+25 to +40 Stone/hr",
                    },
                    {
                      type: StructureType.Farm,
                      icon: Wheat,
                      color: "text-amber-400",
                      output: "+30 to +45 Food/hr",
                    },
                  ] as const
                ).map((item) => {
                  const meta = STRUCTURE_META[item.type];
                  const Icon = item.icon;
                  const active = chosenStructure === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setChosenStructure(item.type)}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition-all",
                        active
                          ? "border-crimson-accent bg-crimson-muted/40"
                          : "border-white/[0.08] bg-obsidian/75 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Icon className={cn("h-4 w-4", item.color)} />
                          {meta.name}
                        </span>
                        <span className="font-mono text-[11px] text-crimson-accent">
                          {formatWif(meta.defaultCostWif, 2)} $WIF
                        </span>
                      </div>
                      <div className="mt-1.5 font-mono text-[11px] text-emerald-300">
                        {item.output}
                      </div>
                      <p className="mt-1 text-[10px] text-ink-muted">
                        {meta.gameplayFunction}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/[0.1] bg-obsidian/80 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white">
                    {STRUCTURE_META[chosenStructure].name} on{" "}
                    {terrainMeta.name} {formatCoords(selectedTile.id)}
                  </div>
                  <div className="text-ink-secondary mt-0.5">
                    Expected Output:{" "}
                    <span className="font-mono font-semibold text-emerald-300">
                      +{step6Yield.wood}W / +{step6Yield.stone}S / +
                      {step6Yield.food}F per hour
                    </span>
                  </div>
                </div>

                {playerStats.structuresBuilt > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 font-semibold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Production Structure Active!
                  </span>
                ) : isConnected &&
                  !isWrongNetwork &&
                  isSelectedTileOwnedByYou &&
                  selectedTile.structureType === StructureType.None ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      if (step6NeedsApproval) {
                        await approveExactWif(step6Cost);
                      } else {
                        await executeGameAction({
                          action: "structure",
                          tileId: selectedTile.id,
                          structureType: chosenStructure,
                        });
                      }
                    }}
                    className="rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-4 py-2.5 font-bold text-white shadow-crimson"
                  >
                    {isBusy
                      ? "Processing..."
                      : step6NeedsApproval
                      ? `Approve ${formatWif(step6Cost, 2)} $WIF`
                      : `Build ${STRUCTURE_META[chosenStructure].name}`}
                  </button>
                ) : (
                  <span className="text-ink-muted">
                    Claim tile {formatCoords(selectedTile.id)} first to build
                    here
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: FIRST MISSION */}
          {step === 7 && (
            <div className="space-y-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="text-xl font-extrabold text-white"
                >
                  Step 7: Your First Missions
                </h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                  Your progress is tracked automatically from verified Robinhood
                  Chain state. Complete missions to unlock higher Settlement
                  levels and regional rankings.
                </p>
              </div>

              <div className="space-y-3">
                {[starterMission, productionMission]
                  .filter(Boolean)
                  .map((m) => {
                    const pct = Math.min(
                      100,
                      Math.round((m.current / m.target) * 100)
                    );
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-2xl border p-4 space-y-2",
                          m.completed
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-white/[0.1] bg-obsidian/80"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            {m.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Target className="h-4 w-4 text-crimson-accent" />
                            )}
                            {m.title}
                          </span>
                          <span className="font-mono text-xs font-bold text-ink-secondary">
                            {m.current}/{m.target}{" "}
                            {m.completed ? "Completed" : "In Progress"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-secondary">
                          {m.description}
                        </p>
                        <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
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
                        <div className="text-[11px] font-semibold text-amber-300">
                          Reward: {m.rewardLabel}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="shrink-0 flex items-center justify-between border-t border-white/[0.08] bg-[#141918]/95 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            disabled={step <= 1}
            onClick={() => goToStep(step - 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-white disabled:opacity-40 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <div className="text-[11px] text-ink-muted font-mono">
            {STEP_TITLES[step - 1]?.title}
          </div>

          {step < 7 ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-5 py-2 text-xs font-bold text-white shadow-crimson hover:brightness-110 transition-all"
            >
              <span>{step === 1 ? "Enter the World" : "Next Step"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteOnboarding}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-black hover:brightness-110 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Finish & Explore World</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
