import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  stacked?: boolean;
  showSubtitle?: boolean;
  animated?: boolean;
  className?: string;
}

/**
 * Standalone WIF WORLDS Game Logo Mark (Isometric Crowned W / Living Map Facet Crest).
 * Used as the primary Nav Icon, Wallet Avatar Badge, Profile Crest, and Favicon.
 */
export function WifWorldsGameIcon({
  className = "w-8 h-8",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none group/logo",
        className
      )}
      aria-hidden="true"
    >
      {animated && (
        <span className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-tr from-crimson/35 via-crimson-accent/20 to-amber-400/20 blur-md opacity-75 group-hover/logo:opacity-100 group-hover/logo:scale-110 transition-all duration-300" />
      )}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "relative w-full h-full drop-shadow-[0_0_14px_rgba(230,57,70,0.55)]",
          animated &&
            "transition-transform duration-300 ease-out group-hover/logo:scale-110 group-hover/logo:-rotate-2"
        )}
      >
        <defs>
          <linearGradient
            id="wwTopPeak"
            x1="16"
            y1="6"
            x2="48"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF6B76" />
            <stop offset="50%" stopColor="#E63946" />
            <stop offset="100%" stopColor="#A61B27" />
          </linearGradient>
          <linearGradient
            id="wwLeftWing"
            x1="8"
            y1="20"
            x2="32"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF4D5A" />
            <stop offset="100%" stopColor="#9E1B26" />
          </linearGradient>
          <linearGradient
            id="wwRightTile"
            x1="34"
            y1="24"
            x2="56"
            y2="56"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF7580" />
            <stop offset="100%" stopColor="#D62839" />
          </linearGradient>
        </defs>

        {/* Top Isometric Fortress Peak with dark inner diamond */}
        <polygon points="31,6 47,20 31,34 15,20" fill="url(#wwTopPeak)" />
        <polygon points="31,14.5 38.5,20.5 31,26.5 23.5,20.5" fill="#0B0D0C" />

        {/* Left Isometric Wing & Lower Bastion */}
        <polygon points="8,27 18,17 27,26 17,36" fill="url(#wwLeftWing)" />
        <polygon points="8,27 17,36 27,46 18,55 8,44" fill="#C92835" />

        {/* Center-Right Stepped W Bridge */}
        <polygon points="28,36 38,26 47,35 37,45" fill="#FF4D5A" />

        {/* Right Upper Facet */}
        <polygon points="47,20 56,28 48,36 39,27" fill="#B8202D" />

        {/* Detached Bottom-Right Living Map Tile */}
        <polygon points="41,49 49,41 57,49 49,57" fill="url(#wwRightTile)" />
      </svg>
    </span>
  );
}

export function WifWorldsLogo({
  size = "md",
  stacked = false,
  showSubtitle = false,
  animated = true,
  className,
}: LogoProps) {
  const iconDimensions =
    size === "sm"
      ? "w-7 h-7"
      : size === "lg"
      ? "w-12 h-12"
      : size === "xl"
      ? "w-16 h-16"
      : "w-9 h-9";

  return (
    <div
      className={cn(
        "group/logo inline-flex items-center select-none",
        stacked ? "flex-col gap-2.5 text-center" : "gap-2.5",
        className
      )}
    >
      <WifWorldsGameIcon className={iconDimensions} animated={animated} />

      <div
        className={cn(
          "flex flex-col",
          stacked ? "items-center" : "items-start"
        )}
      >
        <span
          className={cn(
            "whitespace-nowrap font-extrabold uppercase tracking-[0.14em] text-ink-primary leading-none transition-colors duration-300 group-hover/logo:text-white",
            size === "sm" && "text-sm",
            size === "md" && "text-[14px] sm:text-[15px]",
            size === "lg" && "text-2xl",
            size === "xl" && "text-3xl"
          )}
        >
          WIF WORLDS
        </span>
        {showSubtitle && (
          <span
            className={cn(
              "whitespace-nowrap font-semibold uppercase tracking-[0.28em] text-crimson-accent mt-1 leading-none",
              size === "lg" || size === "xl" ? "text-[11px]" : "text-[9px]"
            )}
          >
            THE LIVING MAP
          </span>
        )}
      </div>
    </div>
  );
}

export function WifTokenEmblem({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-crimson-accent via-crimson to-crimson-deep p-[1px] shadow-[0_0_12px_rgba(230,57,70,0.45)] shrink-0",
        className
      )}
      aria-hidden="true"
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#1C0D0F]">
        <svg viewBox="0 0 20 20" fill="none" className="w-3/5 h-3/5">
          <polygon points="10,2 17,10 10,18 3,10" fill="#FF4D5A" />
          <polygon points="10,5.5 14,10 10,14.5 6,10" fill="#1C0D0F" />
          <circle cx="10" cy="10" r="2" fill="#E63946" />
        </svg>
      </span>
    </span>
  );
}
