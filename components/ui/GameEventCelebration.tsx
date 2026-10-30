"use client";

import React from "react";
import {
  ArrowUpCircle,
  Castle,
  Compass,
  Flag,
  Flame,
  Hammer,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GamifiedCelebrationEvent {
  id: string;
  kind:
    | "claim"
    | "settlement"
    | "upgrade"
    | "structure"
    | "harvest"
    | "event"
    | "camera_fly";
  title: string;
  subtitle: string;
  badgeText?: string;
  rewardChips?: string[];
}

/**
 * High-impact gamified celebration banner & radial shockwave burst
 * triggered when upgrades, constructions, claims, harvests, or camera flights occur.
 */
export function GameEventCelebration({
  event,
  onDismiss,
}: {
  event: GamifiedCelebrationEvent | null;
  onDismiss?: () => void;
}) {
  if (!event) return null;

  const isCameraFly = event.kind === "camera_fly";
  const isUpgrade = event.kind === "upgrade" || event.kind === "settlement";

  const theme = (() => {
    switch (event.kind) {
      case "upgrade":
        return {
          icon: ArrowUpCircle,
          border: "border-amber-300/60",
          bg: "from-[#261B0B]/95 via-[#18120B]/95 to-[#121615]/95",
          accent: "text-amber-300",
          glow: "shadow-[0_0_50px_rgba(251,191,36,0.45)]",
          ring: "border-amber-400/50",
        };
      case "settlement":
        return {
          icon: Castle,
          border: "border-emerald-400/55",
          bg: "from-[#0C241D]/95 via-[#0E1916]/95 to-[#121615]/95",
          accent: "text-emerald-300",
          glow: "shadow-[0_0_45px_rgba(52,211,153,0.4)]",
          ring: "border-emerald-400/50",
        };
      case "structure":
        return {
          icon: Hammer,
          border: "border-sky-400/50",
          bg: "from-[#0E1E28]/95 via-[#0E161B]/95 to-[#121615]/95",
          accent: "text-sky-300",
          glow: "shadow-[0_0_40px_rgba(56,189,248,0.35)]",
          ring: "border-sky-400/50",
        };
      case "harvest":
        return {
          icon: Sparkles,
          border: "border-amber-300/50",
          bg: "from-[#1F190D]/95 via-[#141715]/95 to-[#101413]/95",
          accent: "text-amber-300",
          glow: "shadow-[0_0_38px_rgba(245,158,11,0.35)]",
          ring: "border-amber-300/45",
        };
      case "camera_fly":
        return {
          icon: Compass,
          border: "border-[#2DD4BF]/45",
          bg: "from-[#0C1F1E]/92 via-[#0F1717]/92 to-[#101413]/92",
          accent: "text-[#2DD4BF]",
          glow: "shadow-[0_0_30px_rgba(45,212,191,0.3)]",
          ring: "border-[#2DD4BF]/40",
        };
      case "event":
        return {
          icon: Flame,
          border: "border-crimson-accent/60",
          bg: "from-[#280F13]/95 via-[#191012]/95 to-[#121615]/95",
          accent: "text-crimson-accent",
          glow: "shadow-[0_0_45px_rgba(255,77,90,0.45)]",
          ring: "border-crimson-accent/50",
        };
      default:
        return {
          icon: Flag,
          border: "border-[#2DD4BF]/55",
          bg: "from-[#0D2220]/95 via-[#101817]/95 to-[#121615]/95",
          accent: "text-[#2DD4BF]",
          glow: "shadow-[0_0_40px_rgba(45,212,191,0.38)]",
          ring: "border-[#2DD4BF]/50",
        };
    }
  })();

  const Icon = theme.icon;

  return (
    <div
      key={event.id}
      onClick={onDismiss}
      className={cn(
        "pointer-events-auto cursor-pointer select-none fixed left-1/2 -translate-x-1/2 z-40 transition-all",
        isCameraFly ? "bottom-20" : "top-24"
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* Expanding Gamified Shockwave Ring */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl border-2 animate-shockwave",
            theme.ring
          )}
        />

        {isUpgrade && (
          <span
            style={{ animationDelay: "180ms" }}
            className={cn(
              "pointer-events-none absolute -inset-2 rounded-3xl border animate-shockwave",
              theme.ring
            )}
          />
        )}

        {/* Main Gamified Banner */}
        <div
          className={cn(
            "animate-gamified-pop relative flex items-center gap-3.5 rounded-2xl border bg-gradient-to-r px-5 py-3 backdrop-blur-xl",
            theme.border,
            theme.bg,
            theme.glow
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/40",
              theme.accent
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isCameraFly ? "animate-spin" : "animate-bounce"
              )}
              style={isCameraFly ? { animationDuration: "3s" } : undefined}
            />
          </div>

          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs sm:text-sm font-extrabold tracking-wide uppercase",
                  theme.accent
                )}
              >
                {event.title}
              </span>
              {event.badgeText && (
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  {event.badgeText}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-ink-primary/90 font-medium mt-0.5">
              {event.subtitle}
            </p>
            {event.rewardChips && event.rewardChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {event.rewardChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
