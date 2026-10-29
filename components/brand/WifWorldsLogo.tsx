import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function WifWorldsLogo({
  size = "md",
  stacked = false,
  showSubtitle = false,
  className,
}: LogoProps) {
  const iconDimensions =
    size === "sm" ? "w-7 h-7" : size === "lg" ? "w-12 h-12" : "w-8 h-8";

  return (
    <div
      className={cn(
        "inline-flex items-center select-none",
        stacked ? "flex-col gap-2.5 text-center" : "gap-2.5",
        className
      )}
    >
      {/* Geometric Isometric Stepped Fortress / W Mark (Original WIF WORLDS emblem) */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          iconDimensions,
          "shrink-0 drop-shadow-[0_0_12px_rgba(230,57,70,0.45)]"
        )}
        aria-hidden="true"
      >
        {/* Top isometric peak */}
        <polygon points="24,4 35,14 24,23 13,14" fill="#FF4D5A" />
        <polygon points="24,11 30,16 24,21 18,16" fill="#0B0D0C" />
        {/* Left isometric wing */}
        <polygon points="6,21 16,12 24,19 14,29" fill="#E63946" />
        <polygon points="6,21 14,29 22,38 13,38" fill="#B62430" />
        {/* Right isometric wing */}
        <polygon points="42,21 32,12 24,19 34,29" fill="#FF4D5A" />
        <polygon points="42,21 34,29 26,38 35,38" fill="#9E1F29" />
        {/* Center living-map offset tile */}
        <polygon points="24,24 33,33 24,43 15,33" fill="#E63946" />
        <polygon points="24,28 29,33 24,38 19,33" fill="#FF6B76" />
      </svg>

      <div className={cn("flex flex-col", stacked ? "items-center" : "items-start")}>
        <span
          className={cn(
            "font-extrabold uppercase tracking-[0.14em] text-ink-primary leading-none",
            size === "sm" && "text-sm",
            size === "md" && "text-[15px]",
            size === "lg" && "text-2xl"
          )}
        >
          WIF WORLDS
        </span>
        {showSubtitle && (
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.28em] text-crimson-accent mt-1 leading-none",
              size === "lg" ? "text-[11px]" : "text-[9px]"
            )}
          >
            THE LIVING MAP
          </span>
        )}
      </div>
    </div>
  );
}

export function WifTokenEmblem({ className = "w-5 h-5" }: { className?: string }) {
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

