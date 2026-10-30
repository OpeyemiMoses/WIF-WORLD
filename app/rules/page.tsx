"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Castle,
  CheckCircle2,
  ChevronDown,
  Coins,
  Compass,
  Crown,
  ExternalLink,
  Flame,
  Grid,
  Hammer,
  HelpCircle,
  Info,
  Layers,
  Lock,
  MapPin,
  Scale,
  Shield,
  Sparkles,
  Unlock,
  Users,
} from "lucide-react";
import { WifTokenEmblem } from "@/components/brand/WifWorldsLogo";
import { FeatureFooterStrip } from "@/components/layout/FeatureFooterStrip";
import {
  DEFAULT_COSTS,
  getNextSettlementCost,
  PROGRESSION_STAGES,
  REGIONS,
  SETTLEMENT_TIER_META,
  STRUCTURE_META,
  StructureType,
  TERRAIN_META,
  TerrainType,
} from "@/lib/game/worldData";
import {
  explorerAddressUrl,
  ROBINHOOD_CHAIN_ID,
  TREASURY_ADDRESS,
  WIF_TOKEN_ADDRESS,
} from "@/lib/chain/robinhood";
import { cn, formatWif } from "@/lib/utils";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "Can other players destroy, steal, or overwrite my settlements?",
    a: "No. Once a territory claim or settlement transaction is confirmed on Robinhood Chain, ownership is permanent and recorded in the smart contract. Other players cannot destroy your buildings or claim your land.",
  },
  {
    q: "Why can't I place settlements on adjacent tiles?",
    a: "WIF WORLDS enforces a Settlement Spacing Rule (minimum Chebyshev distance of 2 tiles between settlements). This prevents dense clustering by a single player, preserves natural frontier space, and encourages strategic expansion across diverse biomes.",
  },
  {
    q: "What is the Anti-Whale Territory Capacity Formula?",
    a: "To prevent wealthy players from buying up the entire island in one transaction, your maximum claimable tiles is bounded: Max Claimable = 3 + (3 × Settlements) + (2 × Settlement Upgrades) + (2 × Outposts). To expand your territory, you must invest in real civilization infrastructure.",
  },
  {
    q: "Can I play or explore without $WIF in my wallet?",
    a: "Yes! You can explore the 3D living world map with 360° gyro swipe and flick inertia, inspect all tiles and medieval architecture, view real-time player profiles, and track community milestones. $WIF is only spent when executing active onchain build actions.",
  },
  {
    q: "Where do my $WIF payments go?",
    a: "100% of all $WIF spent on territory claims, settlements, structures, upgrades, and world objectives is automatically routed directly to the verified onchain Treasury address (0x479253b82eb63eb36f140ecabf0237cc338084e7).",
  },
  {
    q: "How does Region 1 (The Wild Frontier) unlock?",
    a: "All players start in Region 0: The Heartlands. Region 1 is locked behind a global community monument called 'Build the Beacon' at Tile (0, 3). Once community contributions reach 1,250 $WIF, the smart contract automatically fires RegionUnlocked(1), unlocking 49 brand new tiles for everyone.",
  },
];

export default function GameRulesPage() {
  // Interactive Territory Capacity Calculator State
  const [calcSettlements, setCalcSettlements] = useState(1);
  const [calcUpgrades, setCalcUpgrades] = useState(0);
  const [calcOutposts, setCalcOutposts] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Computed Territory Stats from formula
  const computedMaxTiles = useMemo(() => {
    return 3 + 3 * calcSettlements + 2 * calcUpgrades + 2 * calcOutposts;
  }, [calcSettlements, calcUpgrades, calcOutposts]);

  const computedEstCost = useMemo(() => {
    let cost = 0n;
    // Claims cost for max tiles
    cost += BigInt(computedMaxTiles) * DEFAULT_COSTS.claim;
    // Settlements
    for (let i = 0; i < calcSettlements; i++) {
      cost += getNextSettlementCost(i);
    }
    // Upgrades
    for (let u = 0; u < calcUpgrades; u++) {
      cost += u === 0 ? DEFAULT_COSTS.upgradeToLv2 : DEFAULT_COSTS.upgradeToLv3;
    }
    // Outposts
    cost +=
      BigInt(calcOutposts) *
      STRUCTURE_META[StructureType.Outpost].defaultCostWif;
    return cost;
  }, [computedMaxTiles, calcSettlements, calcUpgrades, calcOutposts]);

  const computedActivityScore = useMemo(() => {
    return (
      computedMaxTiles * 50 +
      calcSettlements * 200 +
      calcUpgrades * 150 +
      calcOutposts * 150
    );
  }, [computedMaxTiles, calcSettlements, calcUpgrades, calcOutposts]);

  return (
    <main className="flex-1 flex flex-col bg-obsidian text-ink-primary">
      {/* 1. HERO BANNER — Matches Landing Page Castle Theme */}
      <section className="relative overflow-hidden border-b border-white/[0.08] py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        {/* Background Key Art (Floating Citadels at Crimson Dusk) */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/art/hero-kingdom.jpg')" }}
        />

        {/* Multi-Stage Vignette so text is crystal clear */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,13,12,0.72) 0%, rgba(11,13,12,0.92) 80%, #0B0D0C 100%)",
          }}
        />

        {/* Ambient Crimson Glow */}
        <div className="pointer-events-none absolute right-1/4 top-1/4 h-80 w-80 rounded-full bg-crimson/15 blur-[120px]" />

        <div className="mx-auto max-w-5xl text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-4 py-1.5 text-xs font-semibold text-crimson-accent backdrop-blur-md shadow-panel">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Official Rules &amp; Strategy Guide • Robinhood Chain ({ROBINHOOD_CHAIN_ID})</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            How to Play &amp; Shape the{" "}
            <span className="text-crimson-accent drop-shadow-[0_0_24px_rgba(230,57,70,0.45)]">
              Living Map
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-ink-secondary leading-relaxed">
            WIF WORLDS is a persistent multiplayer onchain strategy civilization game.
            Every action permanently changes the shared 3D world on Robinhood Chain.
            Here is everything you need to master territorial expansion, architectural upgrades,
            and regional monuments.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs">
            <a
              href="#quick-start"
              className="rounded-xl border border-white/[0.1] bg-[#111514]/88 backdrop-blur-md px-3.5 py-2 font-semibold text-ink-primary hover:border-crimson/50 hover:text-white transition-all shadow-panel"
            >
              1. Quick Start
            </a>
            <a
              href="#progression"
              className="rounded-xl border border-white/[0.1] bg-[#111514]/88 backdrop-blur-md px-3.5 py-2 font-semibold text-ink-primary hover:border-crimson/50 hover:text-white transition-all shadow-panel"
            >
              2. 3-Tier Progression
            </a>
            <a
              href="#anti-whale"
              className="rounded-xl border border-white/[0.1] bg-[#111514]/88 backdrop-blur-md px-3.5 py-2 font-semibold text-ink-primary hover:border-crimson/50 hover:text-white transition-all shadow-panel"
            >
              3. Territory Formula
            </a>
            <a
              href="#structures"
              className="rounded-xl border border-white/[0.1] bg-[#111514]/88 backdrop-blur-md px-3.5 py-2 font-semibold text-ink-primary hover:border-crimson/50 hover:text-white transition-all shadow-panel"
            >
              4. Buildings &amp; Tiers
            </a>
            <a
              href="#calculator"
              className="rounded-xl border border-crimson/35 bg-crimson/15 px-3.5 py-2 font-bold text-crimson-accent hover:brightness-110 transition-all shadow-panel"
            >
              5. Territory Calculator
            </a>
            <a
              href="#faq"
              className="rounded-xl border border-white/[0.1] bg-[#111514]/88 backdrop-blur-md px-3.5 py-2 font-semibold text-ink-primary hover:border-crimson/50 hover:text-white transition-all shadow-panel"
            >
              6. FAQ
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* 2. QUICK START (0 to 1) */}
        <section id="quick-start" className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              01
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Quick Start: Your First 5 Minutes
              </h2>
              <p className="text-xs text-ink-muted">
                From connecting your wallet to founding your genesis settlement
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#121615] p-4 space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-ink-primary font-mono font-bold text-xs">
                Step 1
              </div>
              <h3 className="text-sm font-bold text-white">Connect Wallet</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Connect MetaMask, Rabby, or Coinbase Wallet. Validate network is set to{" "}
                <strong className="text-ink-primary">Robinhood Chain ({ROBINHOOD_CHAIN_ID})</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121615] p-4 space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-ink-primary font-mono font-bold text-xs">
                Step 2
              </div>
              <h3 className="text-sm font-bold text-white">Acquire $WIF</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Hold $WIF in your wallet. The official token address is{" "}
                <span className="font-mono text-[10px] text-crimson-accent break-all">
                  0x5173b8ea6923c2d40267890d45c46a3480954773
                </span>
                .
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121615] p-4 space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-ink-primary font-mono font-bold text-xs">
                Step 3
              </div>
              <h3 className="text-sm font-bold text-white">Claim Territory</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Pick any unclaimed neutral tile on the 3D map. Click{" "}
                <strong className="text-ink-primary">Claim Tile</strong> (Cost:{" "}
                <span className="font-mono text-crimson-accent">6.25 $WIF</span>).
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121615] p-4 space-y-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-ink-primary font-mono font-bold text-xs">
                Step 4
              </div>
              <h3 className="text-sm font-bold text-white">Found Hamlet</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Found your genesis settlement on your claimed tile (Cost:{" "}
                <span className="font-mono text-crimson-accent">25 $WIF</span>). This unlocks +3 tile capacity!
              </p>
            </div>
          </div>
        </section>

        {/* 3. 3-TIER CIVILIZATION PROGRESSION */}
        <section id="progression" className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              02
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                3-Tier Civilization Progression
              </h2>
              <p className="text-xs text-ink-muted">
                How every builder grows from a solitary hamlet into a regional network
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/[0.09] bg-[#121615] p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Level 1 — Settlements
                </span>
                <span className="font-mono text-xs text-ink-dim">Genesis</span>
              </div>
              <h3 className="text-base font-bold text-white">Where Every Player Starts</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Found your initial settlement on an eligible unclaimed tile. Erect timber cottages and light
                the central village hearth. This unlocks the ability to build specialized structures and
                establishes your base claim capacity.
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-obsidian/60 p-3 text-[11px] space-y-1 text-ink-muted">
                <div>• Initial Cap: <strong>3 neutral tiles</strong></div>
                <div>• Hamlet Bonus: <strong>+3 additional tiles</strong> (6 total)</div>
                <div>• Spacing Rule: <strong>≥ 2 tiles away from other towns</strong></div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#121615] p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-crimson-accent">
                  <span className="h-2 w-2 rounded-full bg-crimson-accent shadow-[0_0_6px_#FF4D5A]" />
                  Level 2 — Territories
                </span>
                <span className="font-mono text-xs text-ink-dim">Expansion</span>
              </div>
              <h3 className="text-base font-bold text-white">The Expansion Phase</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Claim nearby territory across varied terrain biomes (Forests, Hills, Rocky crags).
                Construct Frontier Outposts along your perimeter to unlock +2 tile capacity per outpost,
                or upgrade your Hamlet to a fortified Keep.
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-obsidian/60 p-3 text-[11px] space-y-1 text-ink-muted">
                <div>• Outpost Expansion: <strong>+2 tile capacity</strong></div>
                <div>• Keep Upgrade (Lv. 2): <strong>+2 tile capacity</strong></div>
                <div>• Unlock Specialized Workshops &amp; Beacons</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#121615] p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                  Level 3 — Regions
                </span>
                <span className="font-mono text-xs text-ink-dim">Global Scale</span>
              </div>
              <h3 className="text-base font-bold text-white">The Long-Term Realm Goal</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Connect multiple settlements into a regional network. Upgrade to a Grand Sovereign Citadel (Lv. 3)
                and pool resources toward global monuments like <strong>Build the Beacon</strong>, unlocking
                new realm maps for all players.
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-obsidian/60 p-3 text-[11px] space-y-1 text-ink-muted">
                <div>• Citadel Upgrade: <strong>Sovereign Spire &amp; Town</strong></div>
                <div>• Regional Objective: <strong>Build the Beacon</strong> (1,250 $WIF)</div>
                <div>• Global Event Reward: <strong>Unlocks Region 1</strong> (49 tiles)</div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. ANTI-WHALE TERRITORY CAPACITY FORMULA */}
        <section id="anti-whale" className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              03
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                The Anti-Whale Territory Formula
              </h2>
              <p className="text-xs text-ink-muted">
                Mathematical bounds enforcing fair land distribution and strategic investment
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-crimson/40 bg-gradient-to-br from-[#1C1214] via-[#141817] to-surface p-6 sm:p-8 space-y-6 shadow-panel">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-accent">
                Enforced in Smart Contract WIFWorlds.sol
              </span>
              <div className="font-mono text-lg sm:text-2xl font-bold text-white bg-black/40 p-4 rounded-xl border border-white/[0.08] overflow-x-auto">
                Max Claimable Tiles = 3 + (3 × Settlements) + (2 × Upgrades) + (2 × Outposts)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-ink-secondary">
              <div className="space-y-2 bg-obsidian/60 p-4 rounded-xl border border-white/[0.06]">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-crimson-accent" />
                  Why This Rule Exists
                </h4>
                <p className="leading-relaxed">
                  In many Web3 games, wealthy accounts buy up the entire world map immediately,
                  locking out subsequent players. In WIF WORLDS, you cannot hoard land by clicking
                  a button repeatedly. You must build, upgrade, and space settlements to expand.
                </p>
              </div>

              <div className="space-y-2 bg-obsidian/60 p-4 rounded-xl border border-white/[0.06]">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-gold" />
                  Settlement Spacing Constraint
                </h4>
                <p className="leading-relaxed">
                  Settlements cannot be founded directly adjacent to another settlement (minimum
                  distance of 2 tiles). This creates natural organic kingdoms with meadows,
                  forests, and rocky passes between towns.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. BUILDINGS, STRUCTURES & COSTS TABLE */}
        <section id="structures" className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              04
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Buildings, Upgrades &amp; In-Game Costs
              </h2>
              <p className="text-xs text-ink-muted">
                Tuned 8× lighter for active strategic play on Robinhood Chain
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.09] bg-[#121615]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-obsidian/60 text-ink-muted font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Action / Building</th>
                  <th className="py-3.5 px-4">Cost ($WIF)</th>
                  <th className="py-3.5 px-4">Prerequisites</th>
                  <th className="py-3.5 px-4">Capacity Effect</th>
                  <th className="py-3.5 px-4">Activity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-ink-secondary">
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <Grid className="h-4 w-4 text-emerald-400 shrink-0" />
                    Claim Neutral Tile
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    6.25 $WIF
                  </td>
                  <td className="py-3.5 px-4">Neutral land, within capacity</td>
                  <td className="py-3.5 px-4">Consumes 1 claim slot</td>
                  <td className="py-3.5 px-4 font-mono">+50 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Castle className="h-4 w-4 text-gold shrink-0" />
                      <div>
                        <div>Hamlet (Settlement Lv. 1)</div>
                        <div className="text-[10px] text-ink-dim">Timber Village &amp; Hearth</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    25 $WIF <span className="text-[10px] text-ink-dim font-normal">(+6.25/prev)</span>
                  </td>
                  <td className="py-3.5 px-4">Owned tile, Spacing ≥ 2 tiles</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    +3 Max Tiles
                  </td>
                  <td className="py-3.5 px-4 font-mono">+200 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Castle className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <div>Stronghold (Settlement Lv. 2)</div>
                        <div className="text-[10px] text-ink-dim">Stone Keep &amp; Turrets</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    37.5 $WIF
                  </td>
                  <td className="py-3.5 px-4">Lv. 1 Hamlet, ≥ 3 tiles claimed</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    +2 Max Tiles
                  </td>
                  <td className="py-3.5 px-4 font-mono">+150 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-crimson-accent shrink-0" />
                      <div>
                        <div>Citadel (Settlement Lv. 3)</div>
                        <div className="text-[10px] text-ink-dim">Sovereign Grand Castle</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    62.5 $WIF
                  </td>
                  <td className="py-3.5 px-4">Lv. 2 Keep, ≥ 6 tiles, 1 structure</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    +2 Max Tiles
                  </td>
                  <td className="py-3.5 px-4 font-mono">+150 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-sky-400 shrink-0" />
                      <div>
                        <div>Frontier Outpost</div>
                        <div className="text-[10px] text-ink-dim">Border Guard Watchtower</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    12.5 $WIF
                  </td>
                  <td className="py-3.5 px-4">Owned tile, No existing building</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-400">
                    +2 Max Tiles
                  </td>
                  <td className="py-3.5 px-4 font-mono">+150 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Hammer className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <div>Artisan Workshop</div>
                        <div className="text-[10px] text-ink-dim">Blacksmith Furnace Mill</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    18.75 $WIF
                  </td>
                  <td className="py-3.5 px-4">Owned tile, No existing building</td>
                  <td className="py-3.5 px-4 text-ink-dim">—</td>
                  <td className="py-3.5 px-4 font-mono">+150 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-crimson-accent shrink-0" />
                      <div>
                        <div>Signal Beacon</div>
                        <div className="text-[10px] text-ink-dim">Obsidian Monolith</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    31.25 $WIF
                  </td>
                  <td className="py-3.5 px-4">Owned Rocky or Highland tile</td>
                  <td className="py-3.5 px-4 text-ink-dim">—</td>
                  <td className="py-3.5 px-4 font-mono">+150 pts</td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <Flame className="h-4 w-4 text-crimson-accent shrink-0" />
                    Monument Contribution
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-crimson-accent">
                    Custom (min 1 $WIF)
                  </td>
                  <td className="py-3.5 px-4">Any connected builder</td>
                  <td className="py-3.5 px-4 text-emerald-400">Unlocks Region 1</td>
                  <td className="py-3.5 px-4 font-mono">+100 pts/action</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. INTERACTIVE TERRITORY CAPACITY CALCULATOR */}
        <section id="calculator" className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              05
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Interactive Strategy Calculator
              </h2>
              <p className="text-xs text-ink-muted">
                Plan your expansion path and preview your maximum tile capacity and estimated investment
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.1] bg-[#141918] p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Slider 1: Settlements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Settlements Founded</span>
                  <span className="font-mono text-crimson-accent text-sm font-bold">
                    {calcSettlements}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={calcSettlements}
                  onChange={(e) => setCalcSettlements(parseInt(e.target.value) || 0)}
                  className="w-full accent-crimson h-1.5 rounded-lg bg-white/10 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink-dim font-mono">
                  <span>0 towns</span>
                  <span>5 towns (+15 tiles)</span>
                </div>
              </div>

              {/* Slider 2: Upgrades */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Settlement Upgrades (Lv.2/3)</span>
                  <span className="font-mono text-crimson-accent text-sm font-bold">
                    {calcUpgrades}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  value={calcUpgrades}
                  onChange={(e) => setCalcUpgrades(parseInt(e.target.value) || 0)}
                  className="w-full accent-crimson h-1.5 rounded-lg bg-white/10 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink-dim font-mono">
                  <span>0 keeps</span>
                  <span>6 upgrades (+12 tiles)</span>
                </div>
              </div>

              {/* Slider 3: Outposts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white">Frontier Outposts</span>
                  <span className="font-mono text-crimson-accent text-sm font-bold">
                    {calcOutposts}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  value={calcOutposts}
                  onChange={(e) => setCalcOutposts(parseInt(e.target.value) || 0)}
                  className="w-full accent-crimson h-1.5 rounded-lg bg-white/10 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink-dim font-mono">
                  <span>0 towers</span>
                  <span>6 towers (+12 tiles)</span>
                </div>
              </div>
            </div>

            {/* Computed Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/[0.08]">
              <div className="rounded-xl border border-white/[0.08] bg-obsidian/70 p-4 space-y-1">
                <div className="text-[11px] font-semibold text-ink-muted">
                  Max Claimable Capacity
                </div>
                <div className="font-mono text-3xl font-extrabold text-white">
                  {computedMaxTiles}{" "}
                  <span className="text-sm font-normal text-ink-dim">tiles</span>
                </div>
                <div className="text-[10px] text-emerald-400">
                  {Math.round((computedMaxTiles / 49) * 100)}% of Region 0
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-obsidian/70 p-4 space-y-1">
                <div className="text-[11px] font-semibold text-ink-muted">
                  Est. Infrastructure Cost
                </div>
                <div className="font-mono text-3xl font-extrabold text-crimson-accent flex items-center gap-1.5">
                  <WifTokenEmblem className="w-5 h-5 inline-block" />
                  {formatWif(computedEstCost, 0)}{" "}
                  <span className="text-sm font-normal text-ink-dim">$WIF</span>
                </div>
                <div className="text-[10px] text-ink-muted">
                  Includes claims &amp; construction
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-obsidian/70 p-4 space-y-1">
                <div className="text-[11px] font-semibold text-ink-muted">
                  Civilization Score
                </div>
                <div className="font-mono text-3xl font-extrabold text-gold">
                  {computedActivityScore.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-ink-dim">pts</span>
                </div>
                <div className="text-[10px] text-ink-muted">
                  Ranked on global onchain leaderboard
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. VERIFIED NETWORK & TREASURY CONFIG */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              06
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Verified Network &amp; Onchain Routing
              </h2>
              <p className="text-xs text-ink-muted">
                Zero fake balances, zero simulated mints — verified directly on Robinhood Chain
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#121615] p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Network Configuration
              </span>
              <div className="space-y-1.5 text-xs text-ink-secondary">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Network Name:</span>
                  <strong className="text-ink-primary">Robinhood Chain</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Chain ID:</span>
                  <span className="font-mono text-ink-primary">{ROBINHOOD_CHAIN_ID}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">RPC Endpoint:</span>
                  <span className="font-mono text-ink-primary truncate max-w-[200px]">
                    https://rpc.mainnet.chain.robinhood.com
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Block Explorer:</span>
                  <a
                    href="https://robinhoodchain.blockscout.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-crimson-accent hover:underline inline-flex items-center gap-1"
                  >
                    <span>Blockscout</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121615] p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Official Token &amp; Treasury
              </span>
              <div className="space-y-1.5 text-xs text-ink-secondary">
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">$WIF Token:</span>
                  <a
                    href={explorerAddressUrl(WIF_TOKEN_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-crimson-accent hover:underline truncate max-w-[200px]"
                    title={WIF_TOKEN_ADDRESS}
                  >
                    {WIF_TOKEN_ADDRESS.slice(0, 8)}...{WIF_TOKEN_ADDRESS.slice(-6)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">Treasury Address:</span>
                  <a
                    href={explorerAddressUrl(TREASURY_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-emerald-400 hover:underline truncate max-w-[200px]"
                    title={TREASURY_ADDRESS}
                  >
                    {TREASURY_ADDRESS.slice(0, 8)}...{TREASURY_ADDRESS.slice(-6)}
                  </a>
                </div>
                <p className="text-[10px] text-ink-dim pt-1 leading-snug">
                  100% of all player expenditures are transferred directly onchain to the Treasury.
                  No intermediary contracts or hidden owner withdrawals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. FAQ ACCORDION */}
        <section id="faq" className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson/20 text-crimson-accent font-mono font-bold text-sm">
              07
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-ink-muted">
                Rules clarification, permanence, and gameplay mechanics
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-white/[0.08] bg-[#121615] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-ink-primary hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="h-4 w-4 text-crimson-accent shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-ink-muted transition-transform shrink-0",
                        isOpen && "rotate-180 text-white"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-ink-secondary leading-relaxed border-t border-white/[0.04]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. BOTTOM ACTION BANNER */}
        <section className="rounded-2xl border border-crimson/30 bg-gradient-to-r from-[#201013] via-[#141817] to-surface p-8 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to shape the living map?
          </h2>
          <p className="mx-auto max-w-lg text-xs sm:text-sm text-ink-secondary">
            Enter the 3D world, explore the 7×7 realm with physical flick inertia,
            claim your territory, and build your legacy on Robinhood Chain.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/world"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-6 py-3 text-sm font-bold text-white shadow-crimson hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <span>Enter World Map</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#161B1A] px-5 py-3 text-sm font-semibold text-ink-primary hover:border-white/25 transition-all"
            >
              <Flame className="h-4 w-4 text-crimson-accent" />
              <span>Contribute to Beacon</span>
            </Link>
          </div>
        </section>
      </div>

      <FeatureFooterStrip />
    </main>
  );
}
