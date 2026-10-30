"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  Castle,
  CheckCircle2,
  Compass,
  Flame,
  Mountain,
  Sparkles,
  Target,
  Trees,
  Trophy,
  Wheat,
} from "lucide-react";
import { PageCastleBackdrop } from "@/components/layout/PageCastleBackdrop";
import { AnimatedNumber, ScrollReveal } from "@/components/ui/ScrollReveal";
import { useRobinhoodWallet, useWorldData } from "@/lib/contract/useWorldState";
import { PROGRESSION_STAGES, SETTLEMENT_TIER_META } from "@/lib/game/worldData";
import { cn, shortenAddress } from "@/lib/utils";

export default function MissionsPage() {
  const { address } = useRobinhoodWallet();
  const { missions, playerStats, regionalRankings } = useWorldData(address, 0);

  const completedCount = missions.filter((m) => m.completed).length;

  return (
    <div className="animate-page-enter relative flex-1 bg-[#070B0E]">
      <PageCastleBackdrop />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Banner */}
        <ScrollReveal variant="pop">
          <section className="rounded-3xl border border-amber-200/20 bg-gradient-to-b from-[#13181D]/90 to-[#0B0F12]/95 p-6 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-200">
                  <Target className="h-3.5 w-3.5" />
                  <span>Civilization Progression & World Challenges</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Missions & Pioneer Milestones
                </h1>
                <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
                  Advance your settlement network through verified onchain
                  objectives. Every completed mission unlocks deeper territory
                  capacity, higher Settlement Hall tiers, or regional standing.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3 text-center">
                  <div className="text-[11px] text-ink-muted">Completed</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-emerald-400">
                    <AnimatedNumber value={completedCount} />/{missions.length}
                  </div>
                </div>
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3 text-center">
                  <div className="text-[11px] text-ink-muted">Realm Stage</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-amber-300">
                    Stage {playerStats.progressionStage}/5
                  </div>
                </div>
                <div className="gamified-card rounded-2xl border border-white/[0.09] bg-obsidian/80 px-4 py-3 text-center">
                  <div className="text-[11px] text-ink-muted">Standing</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-crimson-accent">
                    <AnimatedNumber value={playerStats.activityScore} /> pts
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Missions Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-3xl border border-amber-200/15 bg-[#101413]/92 p-6 backdrop-blur-xl shadow-panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Active Pioneer & Regional Missions
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Automatically verified from your Robinhood Chain settlement
                    state
                  </p>
                </div>
                <Link
                  href="/world"
                  className="gamified-btn rounded-xl bg-gradient-to-b from-crimson-accent to-crimson px-4 py-2 text-xs font-bold text-white shadow-crimson"
                >
                  Open World Map →
                </Link>
              </div>

              <div className="space-y-3">
                {missions.map((m, idx) => {
                  const pct = Math.min(
                    100,
                    Math.round((m.current / m.target) * 100)
                  );
                  return (
                    <ScrollReveal key={m.id} variant="pop" delayMs={idx * 65}>
                      <div
                        className={cn(
                          "gamified-card rounded-2xl border p-5 space-y-2.5 transition-all",
                          m.completed
                            ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                            : "border-white/[0.09] bg-obsidian/75"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {m.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <Target className="h-5 w-5 text-crimson-accent" />
                            )}
                            <h3 className="text-base font-bold text-white">
                              {m.title}
                            </h3>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                                m.category === "regional"
                                  ? "bg-crimson/20 text-crimson-accent"
                                  : "bg-white/[0.06] text-ink-secondary"
                              )}
                            >
                              {m.category}
                            </span>
                          </div>

                          <span className="font-mono text-xs font-bold text-ink-primary">
                            {m.current} / {m.target}{" "}
                            {m.completed ? "• COMPLETED" : ""}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-ink-secondary">
                          {m.description}
                        </p>

                        <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              m.completed ? "bg-emerald-400" : "bg-crimson-accent"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-semibold text-amber-300">
                            Reward & Unlock: {m.rewardLabel}
                          </span>
                          <Link
                            href={m.category === "regional" ? "/events" : "/world"}
                            className="font-semibold text-crimson-accent hover:underline"
                          >
                            {m.completed ? "Inspect" : "Execute on Map →"}
                          </Link>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: 5-Stage Progression + Settlement Levels + Leaderboard */}
          <div className="lg:col-span-4 space-y-6">
            {/* 5-Stage Civilization Ladder */}
            <div className="rounded-3xl border border-amber-200/15 bg-[#101413]/92 p-6 backdrop-blur-xl shadow-panel space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                5-Stage Civilization Path
              </h2>
              <div className="space-y-2">
                {([1, 2, 3, 4, 5] as const).map((st) => {
                  const info = PROGRESSION_STAGES[st];
                  const active = playerStats.progressionStage === st;
                  const done = playerStats.progressionStage > st;
                  return (
                    <div
                      key={st}
                      className={cn(
                        "rounded-xl border p-3 text-xs",
                        active
                          ? "border-crimson-accent bg-crimson-muted/35"
                          : done
                          ? "border-emerald-500/35 bg-emerald-500/10"
                          : "border-white/[0.06] bg-obsidian/60"
                      )}
                    >
                      <div className="font-bold text-white">{info.title}</div>
                      <div className="text-[11px] text-ink-secondary mt-0.5">
                        {info.shortGoal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settlement Levels Reference */}
            <div className="rounded-3xl border border-amber-200/15 bg-[#101413]/92 p-6 backdrop-blur-xl shadow-panel space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Castle className="h-4 w-4 text-[#2DD4BF]" />
                Settlement Levels (Lv. 1–5)
              </h2>
              <div className="space-y-2">
                {([1, 2, 3, 4, 5] as const).map((lvl) => {
                  const tier = SETTLEMENT_TIER_META[lvl];
                  return (
                    <div
                      key={lvl}
                      className="rounded-xl border border-white/[0.07] bg-obsidian/70 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{tier.name}</span>
                        <span className="font-mono text-[11px] text-amber-300">
                          {tier.shortUnlock}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">
                        {tier.requirementSummary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Regional Leaderboard */}
            <div className="rounded-3xl border border-amber-200/15 bg-[#101413]/92 p-6 backdrop-blur-xl shadow-panel space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Regional Builder Standings
              </h2>
              {regionalRankings.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No builders ranked onchain yet. Claim the first tile to lead
                  The Heartlands!
                </p>
              ) : (
                <div className="space-y-2">
                  {regionalRankings.slice(0, 6).map((r, i) => (
                    <Link
                      key={r.address}
                      href={`/profile/${r.address}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-obsidian/70 px-3 py-2 text-xs hover:border-white/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-crimson-accent">
                          #{i + 1}
                        </span>
                        <span className="font-mono text-white">
                          {shortenAddress(r.address, 4)}
                        </span>
                      </div>
                      <span className="font-mono text-amber-300 font-bold">
                        {r.activityScore} pts
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

