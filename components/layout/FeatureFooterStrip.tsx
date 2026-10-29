import React from "react";
import { Compass, Flame, Layers, Shield } from "lucide-react";
import { WifWorldsLogo } from "@/components/brand/WifWorldsLogo";
import { explorerTokenUrl, WIF_TOKEN_ADDRESS } from "@/lib/chain/robinhood";
import { shortenAddress } from "@/lib/utils";

const PILLARS = [
  {
    icon: Shield,
    title: "Real Onchain Actions",
    subtitle: "Every move changes the world.",
  },
  {
    icon: Compass,
    title: "Shared World",
    subtitle: "Build, compete, and collaborate.",
  },
  {
    icon: Flame,
    title: "$WIF Powered",
    subtitle: "The fuel for your journey.",
  },
  {
    icon: Layers,
    title: "Persistent Progress",
    subtitle: "Your impact lives on.",
  },
];

export function FeatureFooterStrip() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#090B0A]">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Brand Lockup */}
          <div className="shrink-0">
            <WifWorldsLogo size="md" showSubtitle />
          </div>

          {/* 4 Feature Cards matching bottom bar of reference board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 xl:mx-6">
            {PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#121615]/90 px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-crimson/35 bg-crimson/15 text-crimson-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink-primary truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Closing Tagline */}
          <div className="xl:text-right shrink-0">
            <div className="text-sm font-semibold text-ink-secondary">
              More than a game.
            </div>
            <div className="text-sm font-bold text-ink-primary">
              A living world.
            </div>
          </div>
        </div>

        {/* Bottom Verification & Hackathon Brand Compliance Line */}
        <div className="mt-6 pt-5 border-t border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-ink-dim">
          <p>
            WIF WORLDS is an independent onchain strategy game built on Robinhood
            Chain (Chain ID 4663) and is not affiliated with, endorsed by, or
            officially connected with Robinhood Markets, Inc.
          </p>
          <a
            href={explorerTokenUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-ink-muted hover:text-crimson-accent transition-colors shrink-0"
          >
            Verified $WIF: {shortenAddress(WIF_TOKEN_ADDRESS, 6)} ↗
          </a>
        </div>
      </div>
    </footer>
  );
}

