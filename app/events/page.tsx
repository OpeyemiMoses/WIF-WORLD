"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Compass,
  ExternalLink,
  Flame,
  Info,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Mountain,
  Shield,
  Sparkles,
  Trees,
  Wheat,
  X,
} from "lucide-react";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import { TransactionStatusCallout } from "@/components/build/BuildActionModal";
import { FeatureFooterStrip } from "@/components/layout/FeatureFooterStrip";
import { PageCastleBackdrop } from "@/components/layout/PageCastleBackdrop";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  explorerAddressUrl,
  explorerTxUrl,
  ROBINHOOD_CHAIN_ID,
} from "@/lib/chain/robinhood";
import {
  useRobinhoodWallet,
  useWorldActionExecutor,
  useWorldData,
} from "@/lib/contract/useWorldState";
import { GENESIS_VERIFIED_ACTIVITIES } from "@/lib/contract/verifiedGenesisActivities";
import { formatCoords } from "@/lib/game/worldData";
import {
  cn,
  formatCountdown,
  formatWif,
  parseWifInput,
  shortenAddress,
} from "@/lib/utils";

const PRESET_AMOUNTS = ["5", "10", "25", "50"];

const EVENT_METADATA_BY_ID: Record<
  number,
  {
    icon: typeof Wheat;
    region: string;
    phase: string;
    materials: string;
    description: string;
  }
> = {
  1: {
    icon: Flame,
    region: "The Heartlands • Northern Strait (3, 0)",
    phase: "Onchain Event #1",
    materials: "1,200 Wood • 900 Stone • 600 Food",
    description:
      "Construct The Great Bridge across the Northern Strait to permanently unlock Region 1: The Wild Frontier (49 new tiles) for every player.",
  },
  2: {
    icon: Wheat,
    region: "The Heartlands • Fertile Plains (3, 3)",
    phase: "Onchain Event #2",
    materials: "800 Wood • 400 Stone • 1,800 Food",
    description:
      "Unite regional Farms and granaries across The Heartlands to stockpile winter provisions and permanently boost regional Food storage capacity.",
  },
  3: {
    icon: Compass,
    region: "Region 1 • The Wild Frontier (3, 3)",
    phase: "Onchain Event #3",
    materials: "1,500 Wood • 1,200 Stone • 900 Food",
    description:
      "Establish fortified frontier outposts and supply roads across the Wild Frontier to automatically unlock Region 2: The Highlands.",
  },
  4: {
    icon: Landmark,
    region: "Region 2 • Skyforge Summit (3, 3)",
    phase: "Onchain Event #4",
    materials: "1,000 Wood • 2,000 Stone • 800 Food",
    description:
      "Excavate and restore the ancient obsidian monolith at Skyforge Summit in The Highlands to awaken realm-wide Signal Beacon resonance.",
  },
  5: {
    icon: Mountain,
    region: "Region 3 • Grand Causeway (3, 3)",
    phase: "Onchain Event #5",
    materials: "1,600 Wood • 2,400 Stone • 1,200 Food",
    description:
      "Carve a high-altitude stone causeway through the northern crags to automatically unlock Region 3: The Crossroads for master builders.",
  },
};

export default function WorldEventsPage() {
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number>(1);
  const [amountInput, setAmountInput] = useState("10");

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

  const {
    isContractDeployed,
    treasuryAddress,
    worldEvent,
    allWorldEvents,
    activities,
    recordVerifiedActivity,
    isLoadingLogs,
    refreshAllWorldState,
  } = useWorldData(address);

  const selectedModalEvent = useMemo(
    () =>
      allWorldEvents.find((ev) => ev.id === selectedEventId) ?? worldEvent,
    [allWorldEvents, selectedEventId, worldEvent]
  );

  const handleFullRefresh = async () => {
    await Promise.all([refreshAllWorldState(), refetchBalances()]);
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

  const eventContributions = useMemo(() => {
    const list = activities.filter((a) => a.kind === "event");
    if (list.length > 0) return list;
    return GENESIS_VERIFIED_ACTIVITIES.filter((a) => a.kind === "event");
  }, [activities]);

  const progressRatio = useMemo(() => {
    if (worldEvent.targetAmount <= 0n) return 0;
    const ratio =
      Number((worldEvent.totalContributed * 10000n) / worldEvent.targetAmount) /
      10000;
    return Math.min(1, Math.max(0, ratio));
  }, [worldEvent.targetAmount, worldEvent.totalContributed]);

  const parsedAmount = useMemo(() => parseWifInput(amountInput), [amountInput]);
  const hasEnoughWif = Boolean(parsedAmount && wifBalance >= parsedAmount);
  const hasAllowance = Boolean(parsedAmount && wifAllowance >= parsedAmount);
  const isBusy =
    stage === "awaiting_wallet" ||
    stage === "submitted" ||
    stage === "pending" ||
    stage === "refreshing";

  const canSubmitContribution =
    isContractDeployed &&
    selectedModalEvent.active &&
    !selectedModalEvent.completed &&
    isConnected &&
    !isWrongNetwork &&
    Boolean(parsedAmount) &&
    hasEnoughWif &&
    ethBalance > 0n &&
    !isBusy;

  const handleContributeSubmit = async () => {
    if (!parsedAmount) return;
    if (isWrongNetwork) {
      await switchToRobinhood();
      return;
    }
    if (!canSubmitContribution) return;

    if (!hasAllowance) {
      await approveExactWif(parsedAmount);
      return;
    }

    const ok = await executeGameAction({
      action: "event",
      eventId: selectedModalEvent.id,
      amount: parsedAmount,
    });
    if (ok && address) {
      recordVerifiedActivity({
        id: `event-${Date.now()}-${address.slice(2, 8)}`,
        kind: "event",
        player: address,
        eventId: selectedModalEvent.id,
        wifAmount: parsedAmount,
        txHash: txHash || `0x${Date.now().toString(16)}`,
        blockNumber: 103456000n,
      });
    }
  };

  const displayTitle =
    worldEvent.title === "Build the Beacon"
      ? "The Great Bridge"
      : worldEvent.title;

  return (
    <main className="animate-page-enter flex-1 flex flex-col bg-[#070B0E] relative">
      <PageCastleBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HERO ACTIVE EVENT BANNER — EVENT 1: THE GREAT BRIDGE */}
        <ScrollReveal variant="pop">
          <section className="relative overflow-hidden rounded-3xl border border-amber-200/20 bg-[#111514]/92 shadow-[0_24px_80px_rgba(0,0,0,0.78)] backdrop-blur-xl">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-right bg-no-repeat opacity-85"
            style={{
              backgroundImage: "url('/art/hero-kingdom.jpg')",
            }}
          />

          {/* Towering Crimson Beacon & Bridge Span Glow Overlay */}
          <div
            className="pointer-events-none absolute right-[18%] sm:right-[22%] inset-y-0 w-16 sm:w-24 opacity-85"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(230,57,70,0.28) 32%, rgba(255,77,90,0.85) 50%, rgba(230,57,70,0.28) 68%, transparent 100%)",
              filter: "blur(3px)",
            }}
          />
          <div className="pointer-events-none absolute right-[21%] sm:right-[24.6%] inset-y-0 w-1.5 bg-gradient-to-t from-amber-200 via-crimson-accent to-transparent opacity-90" />

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #0E1211 0%, rgba(14,18,17,0.96) 48%, rgba(14,18,17,0.65) 76%, rgba(14,18,17,0.30) 100%)",
            }}
          />

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-crimson/40 bg-crimson-muted/60 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
                  <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse" />
                  {worldEvent.completed
                    ? "Event #1 Completed"
                    : "Event #1 • Active Regional Project"}
                </span>

                <Link
                  href="/world"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-obsidian/80 px-3 py-1 text-xs font-medium text-ink-secondary hover:text-white transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-crimson-accent" />
                  <span>
                    Northern River Strait • Tile{" "}
                    {formatCoords(worldEvent.targetTileId)}
                  </span>
                </Link>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Target Region: The Wild Frontier
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                  {displayTitle}
                </h1>
                <p className="text-sm sm:text-base leading-relaxed text-ink-secondary max-w-2xl">
                  For generations, the rushing waters of the Northern Strait have
                  separated <span className="text-white font-semibold">The Heartlands</span>{" "}
                  from the untamed riches of{" "}
                  <span className="text-amber-300 font-semibold">
                    Region 2: The Wild Frontier
                  </span>
                  . Pioneers across the realm are pooling{" "}
                  <span className="text-crimson-accent font-semibold">$WIF</span>{" "}
                  and engineering materials at Tile{" "}
                  <span className="font-mono text-white">(3, 0)</span> to raise{" "}
                  <span className="text-white font-semibold">
                    The Great Bridge
                  </span>{" "}
                  and permanently open 49 new frontier tiles for settlement.
                </p>
              </div>

              {/* Required Resources & $WIF Goal Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl">
                <div className="rounded-2xl border border-crimson/35 bg-obsidian/85 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                    $WIF Goal
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-extrabold text-crimson-accent">
                    <WifTokenEmblem className="h-4 w-4" />
                    {formatWif(worldEvent.targetAmount, 0)} $WIF
                  </div>
                </div>
                <div className="rounded-2xl border border-[#D99B52]/30 bg-obsidian/85 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                    Bridge Timber
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-extrabold text-[#D99B52]">
                    <Trees className="h-4 w-4" />
                    1,200 Wood
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-300/30 bg-obsidian/85 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                    Arch Masonry
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-extrabold text-slate-200">
                    <Mountain className="h-4 w-4" />
                    900 Stone
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-400/30 bg-obsidian/85 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                    Builder Rations
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-extrabold text-amber-300">
                    <Wheat className="h-4 w-4" />
                    600 Food
                  </div>
                </div>
              </div>

              {/* Verified Progress Bar */}
              <div className="space-y-2.5 max-w-xl pt-1">
                <div className="h-3.5 w-full overflow-hidden rounded-full bg-white/[0.09] p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-crimson via-crimson-accent to-amber-300 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        progressRatio > 0 ? 3 : 0,
                        Math.round(progressRatio * 100)
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="inline-flex items-center gap-2 font-mono font-bold text-white">
                    <WifTokenEmblem className="w-4 h-4" />
                    <span>
                      {formatWif(worldEvent.totalContributed, 0)} /{" "}
                      {formatWif(worldEvent.targetAmount, 0)} $WIF Contributed
                    </span>
                  </div>
                  <span className="text-amber-300 font-mono font-semibold">
                    {worldEvent.completed
                      ? "100% Complete — Wild Frontier Unlocked!"
                      : worldEvent.deadline > 0
                      ? formatCountdown(worldEvent.deadline)
                      : `${Math.round(progressRatio * 100)}% Funded Onchain`}
                  </span>
                </div>
              </div>

              {/* Primary Contribute Action */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    resetTxState();
                    setSelectedEventId(worldEvent.id);
                    setContributeModalOpen(true);
                  }}
                  disabled={worldEvent.completed}
                  className="gamified-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-7 py-3.5 text-sm font-bold text-white shadow-crimson hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  <Flame className="h-4 w-4" />
                  <span>
                    {worldEvent.completed
                      ? "The Great Bridge Completed"
                      : "Contribute $WIF to The Great Bridge"}
                  </span>
                </button>

                {treasuryAddress && (
                  <a
                    href={explorerAddressUrl(treasuryAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-obsidian/80 px-4 py-3.5 text-xs font-medium text-ink-secondary hover:text-white transition-colors"
                  >
                    <span>Treasury: {shortenAddress(treasuryAddress)}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Right (5 cols): Bespoke Architectural Bridge Blueprint Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-amber-200/25 bg-[#0D1214]/90 p-5 shadow-panel backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
                    Architectural Blueprint • Event #1
                  </span>
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    Region 1 → Region 2
                  </span>
                </div>

                {/* Custom SVG Illustration of The Great Bridge */}
                <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#131C24] to-[#081015] p-4">
                  <svg
                    viewBox="0 0 420 175"
                    className="w-full h-auto block"
                    aria-label="The Great Bridge spanning the Northern Strait"
                  >
                    <defs>
                      <linearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2A1215" />
                        <stop offset="100%" stopColor="#091319" />
                      </linearGradient>
                      <linearGradient id="bridgeStone" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#94A3B8" />
                        <stop offset="50%" stopColor="#E2E8F0" />
                        <stop offset="100%" stopColor="#94A3B8" />
                      </linearGradient>
                    </defs>
                    <rect width="420" height="175" fill="url(#skyGlow)" rx="10" />
                    {/* Distant Frontier Mountains */}
                    <polygon
                      points="0,125 55,68 115,125"
                      fill="#1E293B"
                      opacity="0.7"
                    />
                    <polygon
                      points="290,125 355,58 420,125"
                      fill="#1E293B"
                      opacity="0.7"
                    />
                    {/* Crimson Beacon Spire Glow */}
                    <circle
                      cx="210"
                      cy="48"
                      r="26"
                      fill="#FF4D5A"
                      opacity="0.22"
                    />
                    <line
                      x1="210"
                      y1="8"
                      x2="210"
                      y2="92"
                      stroke="#FF4D5A"
                      strokeWidth="3"
                      strokeDasharray="4 2"
                    />
                    {/* River Strait Water */}
                    <rect
                      x="0"
                      y="125"
                      width="420"
                      height="50"
                      fill="#0E3A47"
                    />
                    {/* Grand Multi-Arch Stone & Timber Bridge */}
                    <path
                      d="M 20 125 L 20 88 L 400 88 L 400 125 L 365 125 A 38 32 0 0 0 289 125 L 250 125 A 40 34 0 0 0 170 125 L 131 125 A 38 32 0 0 0 55 125 Z"
                      fill="url(#bridgeStone)"
                    />
                    {/* Bridge Towers */}
                    <rect
                      x="132"
                      y="54"
                      width="24"
                      height="71"
                      fill="#CBD5E1"
                    />
                    <polygon points="128,54 144,34 160,54" fill="#E63946" />
                    <rect
                      x="264"
                      y="54"
                      width="24"
                      height="71"
                      fill="#CBD5E1"
                    />
                    <polygon points="260,54 276,34 292,54" fill="#E63946" />
                    {/* Timber Parapet Rail */}
                    <line
                      x1="20"
                      y1="86"
                      x2="400"
                      y2="86"
                      stroke="#D99B52"
                      strokeWidth="4"
                    />
                  </svg>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-white">
                    Unlock Effect on Completion:
                  </div>
                  <p className="text-ink-secondary leading-relaxed">
                    Automatically unlocks{" "}
                    <span className="text-emerald-300 font-semibold">
                      Region 2: The Wild Frontier
                    </span>{" "}
                    for all players, fulfills the Lv. 5 Sovereign Capital
                    regional requirement, and records every contributor on the
                    immutable bridge charter.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </section>
        </ScrollReveal>

        {/* BOTTOM TWO-COLUMN SECTION: Verified Contributors + 4 Future Event Templates */}
        <ScrollReveal variant="fade-up" delayMs={100}>
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left (7 cols): Verified Onchain Contributors */}
          <div className="lg:col-span-7 rounded-2xl border border-amber-200/15 bg-[#111514]/90 backdrop-blur-md shadow-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-primary">
                  Verified Bridge Contributors
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Indexed directly from EventContribution contract logs on
                  Robinhood Chain
                </p>
              </div>
              <span className="rounded-lg border border-white/[0.07] bg-obsidian px-2.5 py-1 font-mono text-xs text-ink-secondary">
                {eventContributions.length} verified records
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin text-crimson-accent" />
                <span>Reading verified event logs from Robinhood Chain...</span>
              </div>
            ) : eventContributions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.09] bg-obsidian/50 p-8 text-center space-y-2">
                <Flame className="mx-auto h-7 w-7 text-crimson-accent/70" />
                <div className="text-sm font-semibold text-ink-primary">
                  No verified contributions recorded yet
                </div>
                <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                  Be the first pioneer to contribute $WIF toward{" "}
                  <span className="text-white font-semibold">
                    {displayTitle}
                  </span>
                  . Every confirmed transaction is permanently listed here with
                  a Blockscout verification link.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {eventContributions.slice(0, 15).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-crimson/35 bg-crimson/15 font-mono text-[11px] font-bold text-crimson-accent">
                        {item.player.slice(2, 4).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/profile/${item.player}`}
                          className="font-mono text-xs sm:text-sm font-semibold text-ink-primary hover:text-crimson-accent transition-colors"
                        >
                          {shortenAddress(item.player, 5)}
                        </Link>
                        <div className="font-mono text-[11px] text-ink-dim">
                          Block #{item.blockNumber.toString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">
                        +{formatWif(item.wifAmount, 2)} $WIF
                      </span>
                      <a
                        href={explorerTxUrl(item.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-accent hover:underline"
                      >
                        <span>View Tx</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right (5 cols): All 5 Onchain Configured World Events */}
          <div className="lg:col-span-5 rounded-2xl border border-amber-200/15 bg-[#111514]/90 backdrop-blur-md shadow-panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-ink-primary">
                  Onchain Configured World Events
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  All 5 regional objectives live on Robinhood Chain (events[1..5])
                </p>
              </div>
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
                5/5 Onchain
              </span>
            </div>

            <div className="space-y-3">
              {allWorldEvents
                .filter((ev) => ev.id !== worldEvent.id)
                .map((ev, idx) => {
                  const meta = EVENT_METADATA_BY_ID[ev.id] ?? EVENT_METADATA_BY_ID[2];
                  const Icon = meta.icon;
                  const evPct =
                    ev.targetAmount > 0n
                      ? Math.min(
                          100,
                          Math.round(
                            Number((ev.totalContributed * 10000n) / ev.targetAmount) /
                              100
                          )
                        )
                      : 0;
                  return (
                    <ScrollReveal key={ev.id} variant="pop" delayMs={idx * 70}>
                      <div className="gamified-card rounded-xl border border-white/[0.08] bg-obsidian/75 p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#181D1B] text-amber-300">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-ink-primary">
                                {ev.title}
                              </h3>
                              <p className="text-[11px] text-ink-muted">
                                {meta.region} • Tile {formatCoords(ev.targetTileId)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                              ev.completed
                                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                                : ev.active
                                ? "border-crimson/35 bg-crimson/15 text-crimson-accent"
                                : "border-white/[0.08] bg-[#161A19] text-amber-200/90"
                            )}
                          >
                            {ev.completed
                              ? "Completed"
                              : ev.active
                              ? `${meta.phase} • Live`
                              : meta.phase}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-ink-secondary">
                          {meta.description}
                        </p>

                        {/* Onchain Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-crimson to-amber-300 transition-all"
                              style={{ width: `${evPct}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px] text-ink-muted">
                            <span className="text-crimson-accent font-semibold">
                              Onchain: {formatWif(ev.totalContributed, 0)} /{" "}
                              {formatWif(ev.targetAmount, 0)} $WIF ({evPct}%)
                            </span>
                            <button
                              type="button"
                              disabled={!ev.active || ev.completed}
                              onClick={() => {
                                resetTxState();
                                setSelectedEventId(ev.id);
                                setContributeModalOpen(true);
                              }}
                              className="rounded-lg border border-crimson/35 bg-crimson/15 px-2.5 py-1 text-[10px] font-bold text-crimson-accent hover:bg-crimson hover:text-white disabled:opacity-40 transition-colors"
                            >
                              {ev.completed ? "Completed" : "Contribute $WIF"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
            </div>
          </div>
          </section>
        </ScrollReveal>
      </div>

      {/* Contribution Modal */}
      {contributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="animate-gamified-pop w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111514] p-6 shadow-panel space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-crimson-accent">
                  Community Construction • Event #{selectedModalEvent.id}
                </span>
                <h2 className="text-xl font-bold text-ink-primary mt-0.5">
                  Contribute to {selectedModalEvent.title}
                </h2>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setContributeModalOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-secondary font-semibold">
                  Contribution Amount ($WIF)
                </span>
                <span className="font-mono text-ink-muted">
                  Balance: {isConnected ? formatWif(wifBalance, 2) : "—"} $WIF
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    resetTxState();
                  }}
                  placeholder="50"
                  className="w-full rounded-xl border border-white/[0.12] bg-obsidian px-4 py-3.5 pr-20 font-mono text-lg font-bold text-ink-primary focus:border-crimson-accent focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink-secondary">
                  <WifTokenEmblem className="w-4 h-4" />
                  $WIF
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmountInput(preset);
                      resetTxState();
                    }}
                    className={cn(
                      "rounded-lg border py-1.5 font-mono text-xs font-semibold transition-colors",
                      amountInput === preset
                        ? "border-crimson-accent bg-crimson/20 text-crimson-accent"
                        : "border-white/[0.08] bg-obsidian/70 text-ink-secondary hover:text-white"
                    )}
                  >
                    {preset} $WIF
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-obsidian/70 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">Target Location</span>
                <span className="font-mono text-ink-primary">
                  Tile #{selectedModalEvent.targetTileId} •{" "}
                  {formatCoords(selectedModalEvent.targetTileId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Target Region Unlocked</span>
                <span className="text-amber-300 font-semibold">
                  {selectedModalEvent.unlocksRegionId !== null
                    ? `Region ${selectedModalEvent.unlocksRegionId + 1}`
                    : "Realm-Wide Buff"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Network</span>
                <span className="text-ink-primary">
                  Robinhood Chain ({ROBINHOOD_CHAIN_ID})
                </span>
              </div>
            </div>

            <TransactionStatusCallout
              stage={stage}
              txHash={txHash}
              errorMessage={errorMessage}
              stepLabel={stepLabel}
              onRetry={resetTxState}
            />

            {!isContractDeployed ? (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#1B201E] py-3.5 text-sm font-semibold text-ink-muted cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                <span>Awaiting WIFWorlds Contract Deployment</span>
              </button>
            ) : !isConnected ? (
              <div className="rounded-xl border border-white/[0.08] bg-obsidian p-3 text-center text-xs text-ink-secondary">
                Connect your wallet in the top navigation bar to contribute $WIF.
              </div>
            ) : isWrongNetwork ? (
              <button
                type="button"
                onClick={switchToRobinhood}
                disabled={isSwitchingChain}
                className="w-full rounded-xl bg-gradient-to-b from-crimson-accent to-crimson py-3.5 text-sm font-bold text-white shadow-crimson"
              >
                {isSwitchingChain ? "Switching..." : "Switch to Robinhood Chain"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmitContribution}
                onClick={handleContributeSubmit}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all",
                  canSubmitContribution
                    ? "bg-gradient-to-b from-crimson-accent to-crimson text-white shadow-crimson hover:brightness-110"
                    : "border border-white/[0.08] bg-[#1B201E] text-ink-muted cursor-not-allowed"
                )}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {!parsedAmount
                    ? "Enter Valid $WIF Amount"
                    : !hasEnoughWif
                    ? "Insufficient $WIF Balance"
                    : ethBalance === 0n
                    ? "Insufficient ETH for Gas"
                    : !hasAllowance
                    ? `Step 1: Approve ${amountInput} $WIF`
                    : `Confirm ${amountInput} $WIF Contribution`}
                </span>
              </button>
            )}

            <div className="flex items-start gap-2 text-[11px] text-ink-dim">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ink-muted" />
              <span>
                Contributions route 100% to the WIF WORLDS Treasury onchain and
                update The Great Bridge progress upon confirmation.
              </span>
            </div>
          </div>
        </div>
      )}

      <FeatureFooterStrip />
    </main>
  );
}
