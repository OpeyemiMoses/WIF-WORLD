"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, RotateCw, Smartphone } from "lucide-react";
import { WifWorldsLogo } from "@/components/brand/WifWorldsLogo";

/**
 * Full-screen mobile portrait orientation guard for `/world`.
 * Keeps the overlay active on mobile/tablet portrait viewports until the user
 * physically flips their device into landscape mode.
 */
export function MobileLandscapeGuard() {
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Trigger on mobile/tablet screens (< 960px width) when in portrait orientation (height > width)
      setIsMobilePortrait(w < 960 && h > w);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    // Best-effort Screen Orientation API lock when supported in fullscreen/PWA
    try {
      const orientation = (
        window.screen as unknown as {
          orientation?: { lock?: (mode: string) => Promise<void> };
        }
      )?.orientation;
      if (orientation?.lock) {
        orientation.lock("landscape").catch(() => {});
      }
    } catch {
      // Ignore if browser requires gesture/fullscreen for orientation.lock
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isMobilePortrait) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060A0D]/98 px-6 py-8 text-center backdrop-blur-xl select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Rotate device to landscape mode to play WIF WORLDS"
    >
      {/* Subtle radial crimson & teal atmospheric glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(230,57,70,0.22) 0%, rgba(13,25,30,0.4) 45%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center space-y-6 rounded-3xl border border-amber-200/20 bg-[#101413]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        {/* Game Crest Badge */}
        <div className="flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-obsidian/90 px-4 py-1.5">
          <WifWorldsLogo className="h-5 w-5" />
          <span className="text-xs font-extrabold tracking-[0.14em] uppercase text-white">
            WIF WORLDS • Living Map
          </span>
        </div>

        {/* Animated Rotating Phone Illustration */}
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-crimson/35 bg-crimson/10 shadow-[0_0_40px_rgba(230,57,70,0.25)]">
          <div className="animate-[spin_3.2s_ease-in-out_infinite] flex items-center justify-center">
            <Smartphone className="h-12 w-12 text-amber-300 -rotate-90" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/40 bg-[#141918] text-crimson-accent shadow-lg">
            <RotateCw className="h-4 w-4 animate-spin" />
          </span>
        </div>

        <div className="space-y-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-crimson/40 bg-crimson/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-crimson-accent">
            <Compass className="h-3 w-3" />
            Landscape Mode Required
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Flip Your Phone to Landscape
          </h2>
          <p className="text-xs leading-relaxed text-ink-secondary">
            The 3D isometric Living Map, Regional Switcher, and Tile Command
            Inspector are engineered for widescreen tactical play. Rotate your
            device horizontally to enter the realm.
          </p>
        </div>

        {/* Visual Step Pill */}
        <div className="w-full rounded-2xl border border-white/[0.08] bg-obsidian/85 p-3.5 text-left space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-300">
              Waiting for Landscape Rotation...
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <p className="text-[11px] text-ink-muted leading-snug">
            Make sure portrait orientation lock is turned off on your phone,
            then turn your screen sideways. This screen unlocks automatically.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-ink-secondary hover:text-white hover:bg-white/[0.08] transition-colors w-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Landing Page (Portrait Supported)</span>
        </Link>
      </div>
    </div>
  );
}
