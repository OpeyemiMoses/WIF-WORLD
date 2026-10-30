"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Castle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Compass,
  Crown,
  ExternalLink,
  Flame,
  Grid,
  Hammer,
  HelpCircle,
  Layers,
  Lock,
  MapPin,
  Mountain,
  RefreshCw,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Trees,
  TrendingUp,
  Unlock,
  Users,
  Zap,
} from "lucide-react";
import { FeatureFooterStrip } from "@/components/layout/FeatureFooterStrip";
import { WifTokenEmblem, WifWorldsLogo } from "@/components/brand/WifWorldsLogo";
import { ScrollReveal, AnimatedNumber } from "@/components/ui/ScrollReveal";
import { useWorldData } from "@/lib/contract/useWorldState";
import {
  BEACON_TARGET_TILE_ID,
  DEFAULT_COSTS,
  formatCoords,
  getNextSettlementCost,
  PROGRESSION_STAGES,
  REGIONS,
  SETTLEMENT_TIER_META,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
} from "@/lib/game/worldData";
import {
  explorerAddressUrl,
  explorerTxUrl,
  ROBINHOOD_CHAIN_ID,
  TREASURY_ADDRESS,
  WIF_TOKEN_ADDRESS,
} from "@/lib/chain/robinhood";
import { cn, formatWif, shortenAddress } from "@/lib/utils";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "Can other players destroy, steal, or overwrite my settlements?",
    a: "No. Once your territory claim or settlement transaction is confirmed on Robinhood Chain, ownership is permanent and recorded directly in the smart contract. Other players cannot destroy your buildings or claim your land.",
  },
  {
    q: "Why can't I place settlements on immediately adjacent tiles?",
    a: "WIF WORLDS enforces a Settlement Spacing Rule (minimum Manhattan distance of 2 tiles between settlements). This prevents dense clustering by a single player, preserves natural frontier space, and encourages strategic expansion across diverse biomes.",
  },
  {
    q: "What is the Anti-Whale Territory Capacity Formula?",
    a: "To prevent wealthy players from buying up the entire island in one transaction, your maximum claimable tiles is bounded: Max Claimable = 3 + (3 × Settlements) + (2 × Settlement Upgrades) + (2 × Outposts). To expand your territory, you must invest in real civilization infrastructure.",
  },
  {
    q: "Can I explore the world without connecting a wallet?",
    a: "Yes! Anyone can survey the living 3D island with 360° gyro swipe and flick inertia, inspect all tiles and medieval architecture, view real-time player profiles, and track community milestones. $WIF is only spent when executing active onchain build actions.",
  },
  {
    q: "Where do my $WIF payments go?",
    a: "100% of all $WIF spent on territory claims, settlements, structures, upgrades, and world objectives is automatically routed directly to the verified onchain Treasury address (0x479253b82Eb63eb36F140EcABf0237cc338084e7).",
  },
  {
    q: "How does Region 1 (The Wild Frontier) unlock?",
    a: "All players start in Region 0: The Heartlands. Region 1 is locked behind a global community monument called 'Build the Beacon' at Tile (0, 3). Once community contributions reach 1,250 $WIF, the smart contract automatically unlocks 49 brand new tiles for everyone.",
  },
];

export default function LandingPage() {
  const {
    worldSummary,
    worldEvent,
    isContractDeployed,
    activities,
    isLoadingWorld,
    refreshAllWorldState,
  } = useWorldData();

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const eventProgressRatio = useMemo(() => {
    if (worldEvent.targetAmount <= 0n) return 0;
    const ratio =
      Number((worldEvent.totalContributed * 10000n) / worldEvent.targetAmount) /
      10000;
    return Math.min(1, Math.max(0, ratio));
  }, [worldEvent.targetAmount, worldEvent.totalContributed]);

  return (
    <main className="animate-page-enter flex-1 flex flex-col bg-obsidian text-ink-primary">
      {/* =====================================================================
          1. HERO SECTION — Cinematic Floating Citadels & Crimson Sunset
         ===================================================================== */}
      <section className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col justify-between overflow-hidden">
        {/* Background Key Art (Floating Citadels at Crimson Dusk) */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/art/hero-kingdom.jpg')",
          }}
        />

        {/* Smooth Multi-Stage Vignette so Left Typography Pops */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #0B0D0C 0%, rgba(11,13,12,0.94) 34%, rgba(11,13,12,0.52) 64%, rgba(11,13,12,0.22) 100%), linear-gradient(180deg, rgba(11,13,12,0.55) 0%, rgba(11,13,12,0) 28%, rgba(11,13,12,0.95) 100%)",
          }}
        />

        {/* Subtle crimson horizon glow */}
        <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-crimson/15 blur-[130px]" />

        {/* Main Hero Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-4 sm:px-6 lg:px-12 py-16 lg:py-24">
          <ScrollReveal variant="pop" className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1.5 text-xs font-semibold text-crimson-accent backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse shadow-[0_0_8px_#FF4D5A]" />
              <span>Persistent Onchain Strategy • Robinhood Chain ({ROBINHOOD_CHAIN_ID})</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-extrabold tracking-tight text-ink-primary leading-[1.08]">
              A shared world.
              <br />
              Built by{" "}
              <span className="text-crimson-accent drop-shadow-[0_0_24px_rgba(230,57,70,0.45)]">
                you.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-ink-secondary leading-relaxed max-w-md">
              Spend <span className="font-semibold text-ink-primary">$WIF</span>.
              Claim territory. Build structures.
              <br />
              Shape a persistent world where every confirmed transaction leaves
              a permanent mark on the map.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/world"
                className="gamified-btn group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-7 py-4 text-sm sm:text-base font-bold text-white shadow-crimson hover:brightness-110 transition-all"
              >
                <span>Enter the World</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/rules"
                className="gamified-btn inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#141817]/85 px-5 py-4 text-sm font-semibold text-ink-primary hover:border-white/25 hover:bg-[#1B201F] backdrop-blur-sm transition-all"
              >
                <BookOpen className="h-4 w-4 text-crimson-accent" />
                <span>How to Play</span>
              </Link>

              <Link
                href="/events"
                className="gamified-btn inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#141817]/85 px-5 py-4 text-sm font-semibold text-ink-primary hover:border-white/25 hover:bg-[#1B201F] backdrop-blur-sm transition-all"
              >
                <Flame className="h-4 w-4 text-crimson-accent" />
                <span>World Objective</span>
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* Bottom World Metrics Bar (Exact Panel 1 Design) */}
        <ScrollReveal
          variant="fade-up"
          delayMs={140}
          className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-12 pb-10"
        >
          <div className="gamified-card inline-grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.09] bg-[#111514]/88 backdrop-blur-md shadow-panel">
            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-ink-primary">
                49
              </div>
              <div className="text-xs text-ink-muted mt-0.5">Tiles per Region (7 × 7)</div>
            </div>

            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-ink-primary">
                {isContractDeployed ? (
                  <AnimatedNumber value={worldSummary.settlements} />
                ) : (
                  "5 Levels"
                )}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {isContractDeployed ? "Active Settlements" : "Settlement Tiers"}
              </div>
            </div>

            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-crimson-accent">
                {isContractDeployed ? (
                  <AnimatedNumber value={worldSummary.claimedTiles} />
                ) : (
                  "100%"
                )}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {isContractDeployed ? "Claimed Onchain" : "Onchain Routing"}
              </div>
            </div>

            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                {Math.round(eventProgressRatio * 100)}%
              </div>
              <div className="text-xs text-ink-muted mt-0.5">The Great Bridge Milestone</div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* =====================================================================
          2. CORE CIVILIZATION PROGRESSION (3-TIER SYSTEM)
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0E1211] py-20 px-4 sm:px-6 lg:px-12 overflow-hidden">
        {/* Subtle background castle texture & glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('/art/hero-kingdom.jpg')" }}
        />
        <div className="pointer-events-none absolute left-1/4 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-crimson/10 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-[1600px] space-y-12">
          <ScrollReveal variant="fade-up" className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
              <Crown className="h-3.5 w-3.5" />
              <span>Three-Tier Civilization Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight">
              From Humble Homestead to Sovereign Realm
            </h2>
            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
              Every player follows an organic 3-tier civilization loop. You cannot
              simply amass empty plots — territorial dominion requires real infrastructure,
              settlement upgrades, and community coordination.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tier: "Level 1",
                title: "Settlements & Land Claims",
                badge: "The Foundation",
                cost: "6.25 - 25 $WIF",
                icon: MapPin,
                desc: "Survey neutral plains and timber forests. Claim your first tile and erect a wooden Settlement Hall to establish your regional base of operations.",
                features: [
                  "Initial 3-tile claim allowance",
                  "Chebyshev spacing prevents land crowding",
                  "Found wooden Great Hall with hearth smoke",
                  "Permanent non-custodial onchain record",
                ],
              },
              {
                tier: "Level 2",
                title: "Territories & Outposts",
                badge: "Dominion Expansion",
                cost: "75 $WIF (Stronghold)",
                icon: Castle,
                desc: "Fortify your wooden hall into a stone Stronghold with battlements. Deploy frontier Outposts to expand your territorial claim radius.",
                features: [
                  "+2 tile cap per active Outpost",
                  "Unlocks 2nd regional settlement hall",
                  "Stone battlements and flag banners",
                  "Crafting prerequisite for advanced workshops",
                ],
              },
              {
                tier: "Level 3",
                title: "Regions & Realm Milestones",
                badge: "Sovereign Citadel",
                cost: "175 $WIF (Citadel)",
                icon: Crown,
                desc: "Construct an imposing multi-tower Citadel, operate crafting Workshops, and unite with builders to complete the Beacon and unlock new uncharted regions.",
                features: [
                  "Maximum territorial dominion and prestige",
                  "Unlocks 3rd settlement hall",
                  "Towering spires with golden eagle pennants",
                  "Automatic onchain unlock of Region 1 (49 new tiles)",
                ],
              },
            ].map((tierCard, idx) => {
              const Icon = tierCard.icon;
              return (
                <ScrollReveal
                  key={tierCard.tier}
                  variant="pop"
                  delayMs={idx * 110}
                  className="h-full"
                >
                  <div className="gamified-card group relative h-full rounded-2xl border border-white/[0.09] bg-[#111514]/88 p-7 backdrop-blur-md shadow-panel hover:border-crimson/40 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-crimson/35 bg-crimson/15 text-crimson-accent shadow-[0_0_14px_rgba(230,57,70,0.25)]">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono font-semibold text-ink-muted">
                        {tierCard.tier}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-crimson-accent">
                        {tierCard.badge}
                      </span>
                      <h3 className="text-xl font-bold text-ink-primary mt-0.5">
                        {tierCard.title}
                      </h3>
                      <p className="text-xs text-ink-dim font-mono mt-1">
                        Est. Cost: {tierCard.cost}
                      </p>
                    </div>

                    <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                      {tierCard.desc}
                    </p>

                    <ul className="space-y-2 pt-2 border-t border-white/[0.07]">
                      {tierCard.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-ink-muted"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-crimson-accent shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link
                      href="/rules#progression"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-crimson-accent hover:text-white transition-colors"
                    >
                      <span>Explore Tier Mechanics</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. ANTI-WHALE MATHEMATICS & TERRITORY CAPACITY LAW
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0A0D0C] py-20 px-4 sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <ScrollReveal variant="slide-left" className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
              <Scale className="h-3.5 w-3.5" />
              <span>Mathematical Fairness By Design</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight">
              Anti-Whale Territory Formula &amp; Settlement Spacing
            </h2>

            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
              In conventional Web3 games, early whales buy up the entire map, leaving
              nothing for organic players. WIF WORLDS eliminates this via smart contract
              laws verified on Robinhood Chain:
            </p>

            {/* Prominent Formula Callout Card */}
            <div className="rounded-2xl border border-crimson/35 bg-gradient-to-r from-[#1B0F11]/90 via-[#151112]/90 to-[#101413]/90 p-5 backdrop-blur-md shadow-panel space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-crimson-accent">
                Smart Contract Capacity Equation
              </div>
              <div className="font-mono text-lg sm:text-xl font-extrabold text-white">
                Max Claimable = 3 + 3S + 2U + 2O
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-ink-muted border-t border-white/10 pt-2.5">
                <div>
                  <strong className="text-ink-primary">3</strong> Base Allowance
                </div>
                <div>
                  <strong className="text-ink-primary">S</strong> Settlements
                </div>
                <div>
                  <strong className="text-ink-primary">U</strong> Upgrades (Lv2/3)
                </div>
                <div>
                  <strong className="text-ink-primary">O</strong> Outposts Built
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#111514]/88 p-3.5 backdrop-blur-md">
                <Shield className="h-5 w-5 text-crimson-accent shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-ink-secondary">
                  <strong className="text-ink-primary">Chebyshev Settlement Spacing Rule:</strong>{" "}
                  Settlement Halls must maintain Manhattan distance ≥ 2 from your other
                  settlements. Monopolistic single-tile clustering is mathematically impossible.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#111514]/88 p-3.5 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-ink-secondary">
                  <strong className="text-ink-primary">8× Lighter Progression Economics:</strong>{" "}
                  All costs are rebalanced to ensure everyday crypto builders can establish
                  settlements, raise towers, and compete on strategy, not deep pockets.
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: 8x Lighter Cost Breakdown Table (Matching Card Style) */}
          <ScrollReveal
            variant="slide-right"
            delayMs={120}
            className="gamified-card lg:col-span-6 rounded-2xl border border-white/[0.09] bg-[#111514]/88 p-6 backdrop-blur-md shadow-panel space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-ink-primary">
                  Official $WIF Action Cost Schedule
                </h3>
                <p className="text-xs text-ink-muted">
                  100% of tokens route directly to verified Treasury contract
                </p>
              </div>
              <span className="font-mono text-xs text-crimson-accent font-semibold">
                8× Lighter
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-ink-dim uppercase text-[10px] tracking-wider">
                    <th className="py-2.5">Action</th>
                    <th className="py-2.5">Cost</th>
                    <th className="py-2.5">Prerequisite / Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { action: "Territory Claim", cost: "6.25 $WIF", note: "Neutral land; +1 claimed tile within cap" },
                    { action: "Settlement #1 (Hamlet)", cost: "25 $WIF", note: "Requires claimed tile; +3 territory cap" },
                    { action: "Stronghold Upgrade (Lv.2)", cost: "75 $WIF", note: "Requires ≥2 tiles + 1 structure; +2 cap" },
                    { action: "Settlement #2", cost: "50 $WIF", note: "Requires Lv.2 Stronghold + 2 structures" },
                    { action: "Citadel Upgrade (Lv.3)", cost: "175 $WIF", note: "Requires active Workshop; +2 cap" },
                    { action: "Settlement #3", cost: "100 $WIF", note: "Requires Lv.3 Citadel + 4 structures" },
                    { action: "Frontier Outpost", cost: "12 $WIF", note: "+2 territory cap expansion immediately" },
                    { action: "Crafting Workshop", cost: "18 $WIF", note: "Prerequisite for Level 3 Citadel upgrade" },
                    { action: "Beacon Contribution", cost: "Open", note: "1,250 $WIF unlocks Region 1 for all" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-semibold text-ink-primary">{row.action}</td>
                      <td className="py-2.5 font-mono font-bold text-crimson-accent">{row.cost}</td>
                      <td className="py-2.5 text-ink-muted">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <Link
                href="/rules#calculator"
                className="gamified-btn w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-[#161B19] py-3 text-xs font-bold text-ink-primary hover:border-crimson/40 hover:text-white transition-colors"
              >
                <span>Launch Interactive Territory Calculator</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* =====================================================================
          4. ARCHITECTURAL TIERS & SPECIALIZED STRUCTURES
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0E1211] py-20 px-4 sm:px-6 lg:px-12 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/art/hero-kingdom.jpg')" }}
        />

        <div className="relative z-10 mx-auto max-w-[1600px] space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
                <Hammer className="h-3.5 w-3.5" />
                <span>Tactical Construction & Architecture</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight">
                Architectural Evolution &amp; Tactical Structures
              </h2>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
                Rendered with physical materials in the real-time WebGL2 3D engine:
                bark timber, slate roof tiles, rough-hewn stone masonry, and glowing
                hearth lanterns.
              </p>
            </div>

            <Link
              href="/world"
              className="inline-flex items-center gap-2 rounded-xl bg-crimson px-5 py-3 text-xs font-bold text-white shadow-crimson hover:brightness-110 transition-all shrink-0"
            >
              <span>Inspect on Living Island</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 3 In-Game Resources (Phase 1.1 Economy) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tier: "In-Game Resource • Construction",
                name: "Wood (Lumber Camp)",
                cost: "+45 Wood/hr on Forest",
                material: "Felled timber logs & sawmill planks",
                benefit:
                  "Primary construction material for Quarries, Farms, Outposts, Workshops, and Settlement upgrades.",
                icon: Trees,
              },
              {
                tier: "In-Game Resource • Advanced",
                name: "Stone (Quarry)",
                cost: "+40 Stone/hr on Crags & Hills",
                material: "Cut granite & highland obsidian masonry",
                benefit:
                  "Required for Artisan Workshops, Signal Beacons, and upgrading Settlements from Level 2 to Level 5.",
                icon: Mountain,
              },
              {
                tier: "In-Game Resource • Development",
                name: "Food (Farm)",
                cost: "+45 Food/hr on Plains",
                material: "Golden heartland wheat & granary stores",
                benefit:
                  "Sustains logging crews, supports Signal Beacons, and fuels all 5 Settlement Level upgrades.",
                icon: Sparkles,
              },
            ].map((arch, idx) => {
              const Icon = arch.icon;
              return (
                <ScrollReveal key={arch.tier} variant="pop" delayMs={idx * 100}>
                  <div className="gamified-card h-full rounded-2xl border border-white/[0.09] bg-[#111514]/88 p-6 backdrop-blur-md shadow-panel space-y-4 hover:border-crimson/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-crimson/35 bg-crimson/15 text-crimson-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-xs font-semibold text-emerald-400">
                        {arch.cost}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                        {arch.tier}
                      </span>
                      <h3 className="text-lg font-bold text-ink-primary">{arch.name}</h3>
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="text-ink-secondary">
                        <strong className="text-ink-primary">Output:</strong> {arch.material}
                      </p>
                      <p className="text-ink-muted">
                        <strong className="text-ink-primary">Gameplay Function:</strong> {arch.benefit}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {/* 5 Settlement Levels Banner */}
          <ScrollReveal
            variant="scale-glow"
            className="gamified-card rounded-2xl border border-white/[0.09] bg-[#111514]/88 p-6 backdrop-blur-md shadow-panel space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-crimson-accent">
                  5-Level Settlement Progression
                </span>
                <h3 className="text-lg font-bold text-ink-primary">
                  Every Settlement Evolves Across 5 Distinct Tiers
                </h3>
              </div>
              <span className="font-mono text-xs text-ink-muted">
                Requires $WIF + Wood, Stone &amp; Food
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              {[
                { lvl: "Level 1", title: "Settlement Hall", unlock: "Basic structures & +3 Territory Cap" },
                { lvl: "Level 2", title: "Homestead Keep", unlock: "More building slots & +150 Storage" },
                { lvl: "Level 3", title: "Stronghold Citadel", unlock: "Advanced production (+25W/+20S/+25F/hr)" },
                { lvl: "Level 4", title: "Grand Fortress", unlock: "Expansion settlement mastery (+35/hr)" },
                { lvl: "Level 5", title: "Sovereign Capital", unlock: "Regional projects leadership (+50/hr)" },
              ].map((t) => (
                <div
                  key={t.lvl}
                  className="rounded-xl border border-white/[0.07] bg-obsidian/70 p-3.5 space-y-1"
                >
                  <div className="font-mono text-[11px] font-bold text-crimson-accent">
                    {t.lvl}
                  </div>
                  <div className="font-bold text-ink-primary">{t.title}</div>
                  <div className="text-[11px] text-ink-muted leading-snug">
                    {t.unlock}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* 6 Production & Strategic Structure Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                name: "Lumber Camp",
                cost: "10 $WIF + 15 Food",
                icon: Trees,
                badge: "Produces Wood",
                desc: "Timber sawmill generating +45 Wood/hr on Forest tiles (+30/hr on Plains/Hills) plus +25 instant Wood.",
              },
              {
                name: "Quarry",
                cost: "12.5 $WIF + 20 Wood",
                icon: Mountain,
                badge: "Produces Stone",
                desc: "Excavation pit & crane generating +40 Stone/hr on Rocky Crags & Hills (+25/hr on Plains).",
              },
              {
                name: "Farm",
                cost: "10 $WIF + 15 Wood",
                icon: Sparkles,
                badge: "Produces Food",
                desc: "Irrigated golden wheat fields generating +45 Food/hr on Plains (+30/hr on Forest/Hills).",
              },
              {
                name: "Artisan Workshop",
                cost: "18.75 $WIF + 35W/25S",
                icon: Hammer,
                badge: "Uses Materials",
                desc: "Processes materials for advanced construction, adds +150 Storage Cap, and unlocks Level 3+ Strongholds.",
              },
              {
                name: "Frontier Outpost",
                cost: "12.5 $WIF + 20 Wood",
                icon: Compass,
                badge: "+2 Territory Cap",
                desc: "Border watchtower that immediately adds +2 tiles to your max claimable territory capacity.",
              },
              {
                name: "Signal Beacon",
                cost: "31.25 $WIF + 40S/20F",
                icon: Flame,
                badge: "Regional Relay",
                desc: "High-elevation relay linking your settlement network to Regional Projects and unlocking Level 5 Capitals.",
              },
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <ScrollReveal key={st.name} variant="pop" delayMs={idx * 75}>
                  <div className="gamified-card h-full rounded-2xl border border-white/[0.08] bg-[#111514]/88 p-5 backdrop-blur-md shadow-panel space-y-3 hover:border-crimson/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-crimson-accent">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-mono text-xs text-crimson-accent font-semibold">
                        {st.cost}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {st.badge}
                      </span>
                      <h4 className="text-sm font-bold text-ink-primary">{st.name}</h4>
                    </div>

                    <p className="text-xs text-ink-muted leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. ACTIVE WORLD OBJECTIVE SPOTLIGHT — "BUILD THE BEACON"
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0A0D0C] py-20 px-4 sm:px-6 lg:px-12 overflow-hidden">
        {/* Citadel Artwork + Crimson Beacon Light Pillar on Right */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-right bg-no-repeat opacity-60"
          style={{ backgroundImage: "url('/art/hero-kingdom.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A0D0C] via-[#0A0D0C]/90 to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <ScrollReveal variant="scale-glow" className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/40 bg-crimson-muted/60 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
              <Flame className="h-3.5 w-3.5 animate-pulse" />
              <span>Active Regional Objective • Central Crownlands</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight">
              {worldEvent.title || "The Great Bridge"}
            </h2>

            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed max-w-xl">
              A monumental collaborative world project located at Tile (3, 0).
              Every builder can contribute $WIF. When the community pool reaches
              100%, the smart contract fires an immutable state event that unlocks
              <strong className="text-ink-primary"> Region 2: The Wild Frontier (49 brand new tiles)</strong> for
              the entire world.
            </p>

            {/* Event Progress Bar Card */}
            <div className="gamified-card rounded-2xl border border-white/[0.09] bg-[#111514]/92 p-6 backdrop-blur-md shadow-panel space-y-4 max-w-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">Global Contribution Progress</span>
                <span className="font-mono font-bold text-crimson-accent">
                  {Math.round(eventProgressRatio * 100)}% Funded
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson-accent transition-all duration-500 shadow-[0_0_12px_#FF4D5A]"
                  style={{ width: `${Math.max(3, Math.round(eventProgressRatio * 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-ink-primary flex items-center gap-1.5">
                  <WifTokenEmblem className="h-4 w-4" />
                  {formatWif(worldEvent.totalContributed, 0)} / {formatWif(worldEvent.targetAmount, 0)} $WIF
                </span>
                <span className="text-ink-dim">
                  Unlocks 49 Frontier Tiles
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/events"
                className="gamified-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-6 py-3.5 text-sm font-bold text-white shadow-crimson hover:brightness-110 transition-all"
              >
                <span>Contribute $WIF to Monument</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/world"
                className="gamified-btn inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#141817]/85 px-5 py-3.5 text-sm font-semibold text-ink-primary hover:border-white/25 hover:bg-[#1B201F] backdrop-blur-sm transition-all"
              >
                <span>Locate Tile (3, 0)</span>
                <MapPin className="h-4 w-4 text-crimson-accent" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* =====================================================================
          6. ONCHAIN ECONOMICS & VERIFIABLE TRUST
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0E1211] py-20 px-4 sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto max-w-[1600px] space-y-12">
          <ScrollReveal variant="fade-up" className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verifiable Architecture & Transparency</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight">
              100% Onchain. No Offchain Overrides.
            </h2>
            <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
              Every tile ownership, settlement tier, structure type, and event pledge
              is an authoritative transaction on Robinhood Chain. There are no centralized
              game master backdoors or offchain databases.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "100% WIF Treasury Routing",
                desc: "Every single $WIF spent is transferred directly into the verified treasury address: 0x479253b82eb63eb36f140ecabf0237cc338084e7. Zero developer cut.",
                icon: Coins,
              },
              {
                title: "Robinhood Chain L2",
                desc: "Built on Arbitrum Orbit (Chain ID 4663). Enjoy sub-second transaction confirmations and near-zero gas fees paid in native testnet ETH.",
                icon: Zap,
              },
              {
                title: "Non-Custodial Ownership",
                desc: "Your tiles and settlements cannot be expropriated, burned, or destroyed by other players. Your tactical domain is permanent.",
                icon: Lock,
              },
              {
                title: "Blockscout Verification",
                desc: "All WIFWorlds.sol smart contracts are open-source and verified on the official Robinhood Chain Blockscout explorer.",
                icon: ExternalLink,
              },
            ].map((trust, idx) => {
              const Icon = trust.icon;
              return (
                <ScrollReveal key={trust.title} variant="pop" delayMs={idx * 90}>
                  <div className="gamified-card h-full rounded-2xl border border-white/[0.09] bg-[#111514]/88 p-6 backdrop-blur-md shadow-panel space-y-3 hover:border-crimson/40 transition-all">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-crimson/35 bg-crimson/15 text-crimson-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-base font-bold text-ink-primary">{trust.title}</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">{trust.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. LIVE WORLD ACTIVITY STREAM SHOWCASE
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0A0D0C] py-20 px-4 sm:px-6 lg:px-12">
        <ScrollReveal variant="fade-up" className="relative z-10 mx-auto max-w-[1600px] space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-crimson-accent">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                <span>Live Onchain Activity Feed</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1">
                Recent World Ledger Transactions
              </h2>
            </div>

            <button
              type="button"
              onClick={refreshAllWorldState}
              className="gamified-btn inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-[#141817] px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-white transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoadingWorld && "animate-spin")} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="gamified-card rounded-2xl border border-white/[0.09] bg-[#111514]/88 p-6 backdrop-blur-md shadow-panel">
            {activities.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Compass className="h-8 w-8 text-ink-dim mx-auto animate-spin" />
                <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
                  {isContractDeployed
                    ? "No map transactions recorded yet on this network. Enter the world to claim the first tile!"
                    : "Genesis World: Contract ready for Robinhood Chain deployment. Real-time claims, settlements, and upgrades stream here."}
                </p>
                <Link
                  href="/world"
                  className="inline-flex items-center gap-2 text-xs font-bold text-crimson-accent hover:underline pt-2"
                >
                  <span>Claim First Settlement on Island</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activities.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-obsidian/70 p-3.5 hover:border-white/15 transition-all"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-crimson-accent">
                          {shortenAddress(item.player, 4)}
                        </span>
                        <span className="text-[10px] text-ink-dim">
                          Tile {formatCoords(item.tileId ?? 0)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary truncate">
                        {item.kind === "claim" && "Claimed neutral territory"}
                        {item.kind === "settlement" && "Founded new Settlement Hall"}
                        {item.kind === "upgrade" && `Upgraded to Hall Lv.${item.newLevel}`}
                        {item.kind === "structure" && "Constructed specialized structure"}
                        {item.kind === "event" && `Contributed ${formatWif(item.wifAmount, 0)} $WIF to Beacon`}
                        {item.kind === "region_unlock" && "Unlocked The Wild Frontier!"}
                      </p>
                    </div>

                    <a
                      href={explorerTxUrl(item.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-white shrink-0"
                      title="View on Robinhood Blockscout"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </section>

      {/* =====================================================================
          8. FREQUENTLY ASKED QUESTIONS (ACCORDION)
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] bg-[#0E1211] py-20 px-4 sm:px-6 lg:px-12">
        <ScrollReveal variant="fade-up" className="relative z-10 mx-auto max-w-4xl space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1 text-xs font-semibold text-crimson-accent">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Builder Support & Codex</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-ink-secondary">
              Everything you need to know before founding your civilization.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <ScrollReveal key={idx} variant="pop" delayMs={idx * 65}>
                  <div className="gamified-card rounded-2xl border border-white/[0.09] bg-[#111514]/88 backdrop-blur-md shadow-panel overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-ink-primary hover:text-crimson-accent transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-ink-muted shrink-0 transition-transform duration-300",
                          isOpen && "rotate-180 text-crimson-accent"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="animate-gamified-pop border-t border-white/[0.06] p-5 pt-3 text-xs sm:text-sm text-ink-secondary leading-relaxed bg-[#0F1312]/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <Link
              href="/rules"
              className="inline-flex items-center gap-2 text-xs font-bold text-crimson-accent hover:underline"
            >
              <span>Read Complete Official Rules Codex</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* =====================================================================
          9. GRAND FINALE CALL TO ACTION BANNER
         ===================================================================== */}
      <section className="relative border-t border-white/[0.08] overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
        {/* Full-width Castle Art */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/art/hero-kingdom.jpg')" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,13,12,0.85) 0%, rgba(11,13,12,0.95) 100%)",
          }}
        />

        <ScrollReveal
          variant="scale-glow"
          className="relative z-10 mx-auto max-w-4xl text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/90 px-4 py-1.5 text-xs font-semibold text-crimson-accent backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse shadow-[0_0_8px_#FF4D5A]" />
            <span>The Island Awaits Your Mark</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Claim Your Territory. Build Your Legacy.
          </h2>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-ink-secondary leading-relaxed">
            Every transaction is permanent. Every settlement is visible to all players.
            Shape the living map on Robinhood Chain today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/world"
              className="gamified-btn inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-8 py-4 text-sm sm:text-base font-bold text-white shadow-crimson hover:brightness-110 transition-all"
            >
              <span>Enter The Living Map</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/rules"
              className="gamified-btn inline-flex items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#141817]/90 px-6 py-4 text-sm sm:text-base font-semibold text-ink-primary hover:border-white/25 hover:bg-[#1B201F] backdrop-blur-sm transition-all"
            >
              <BookOpen className="h-4 w-4 text-crimson-accent" />
              <span>Read Strategy Guide</span>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <FeatureFooterStrip />
    </main>
  );
}
