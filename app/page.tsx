"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Castle,
  Compass,
  Flame,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FeatureFooterStrip } from "@/components/layout/FeatureFooterStrip";
import { useWorldData } from "@/lib/contract/useWorldState";
import { ROBINHOOD_CHAIN_ID } from "@/lib/chain/robinhood";

export default function LandingPage() {
  const { worldSummary, isContractDeployed } = useWorldData();

  return (
    <main className="flex-1 flex flex-col bg-obsidian">
      {/* HERO SECTION — Matches Panel 1 of Visual Reference */}
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
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-crimson/35 bg-[#1B0F11]/85 px-3.5 py-1.5 text-xs font-semibold text-crimson-accent backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-crimson-accent animate-pulse" />
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
                className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-7 py-4 text-sm sm:text-base font-bold text-white shadow-crimson hover:brightness-110 active:scale-[0.99] transition-all"
              >
                <span>Enter the World</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#141817]/85 px-5 py-4 text-sm font-semibold text-ink-primary hover:border-white/25 hover:bg-[#1B201F] backdrop-blur-sm transition-all"
              >
                <Flame className="h-4 w-4 text-crimson-accent" />
                <span>World Objective</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom-Left World Metrics Bar (Matches Panel 1 Reference + Real Chain Figures) */}
        <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-12 pb-10">
          <div className="inline-grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.09] bg-[#111514]/88 backdrop-blur-md shadow-panel">
            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-ink-primary">
                49
              </div>
              <div className="text-xs text-ink-muted mt-0.5">Tiles (7 × 7)</div>
            </div>

            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-ink-primary">
                1
              </div>
              <div className="text-xs text-ink-muted mt-0.5">Living World</div>
            </div>

            <div className="px-5 sm:px-7 py-4">
              <div className="text-xl sm:text-2xl font-extrabold text-crimson-accent">
                {isContractDeployed ? worldSummary.claimedTiles : "∞"}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {isContractDeployed ? "Claimed Onchain" : "Strategic Paths"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE GAMEPLAY LOOP SECTION — Clear 60-Second Onboarding */}
      <section className="border-t border-white/[0.07] bg-[#0D100F] py-16">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-crimson-accent">
                How the Living Map Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-ink-primary mt-1.5">
                Build. Compete. Shape the world.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted max-w-md">
              Explore the world freely with no wallet required. Connect on
              Robinhood Chain when you are ready to claim land or contribute
              $WIF.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                icon: Compass,
                title: "Survey the 7 × 7 Realm",
                body: "Inspect neutral plains, timber forests, rocky crags, and regional landmarks across a deterministic shared map.",
              },
              {
                step: "02",
                icon: MapPin,
                title: "Claim Territory with $WIF",
                body: "Select an eligible neutral tile, verify the exact $WIF action cost, and confirm ownership directly on Robinhood Chain.",
              },
              {
                step: "03",
                icon: Castle,
                title: "Raise Settlements & Structures",
                body: "Fortify claimed tiles with Settlements, Outposts, Workshops, and Signal Beacons visible to every player.",
              },
              {
                step: "04",
                icon: Sparkles,
                title: "Advance Regional Objectives",
                body: "Coordinate with other builders to fund community monuments like the Northern Beacon and grow your builder profile.",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.step}
                  className="group rounded-2xl border border-white/[0.07] bg-[#131716] p-6 hover:border-crimson/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-crimson/35 bg-crimson/15 text-crimson-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink-dim">
                      STEP {card.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink-primary">
                    {card.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-ink-secondary mt-2">
                    {card.body}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#121615] px-6 py-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-xs sm:text-sm text-ink-secondary">
                <span className="font-semibold text-ink-primary">
                  100% Authoritative Onchain State:
                </span>{" "}
                No simulated balances, no offchain ownership overrides, and no
                speculative yield promises.
              </p>
            </div>
            <Link
              href="/world"
              className="text-xs font-bold text-crimson-accent hover:underline shrink-0"
            >
              Inspect Live World Map →
            </Link>
          </div>
        </div>
      </section>

      <FeatureFooterStrip />
    </main>
  );
}

