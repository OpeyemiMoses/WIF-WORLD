"use client";

import React from "react";
import {
  StructureType,
  TerrainType,
  TileState,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { cn } from "@/lib/utils";

interface IsometricTilePreviewProps {
  tile: TileState;
  connectedAddress?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IsometricTilePreview({
  tile,
  connectedAddress,
  size = "md",
  className,
}: IsometricTilePreviewProps) {
  const isUnowned = !tile.owner || tile.owner.toLowerCase() === ZERO_ADDRESS;
  const isYours =
    !isUnowned &&
    Boolean(connectedAddress) &&
    tile.owner.toLowerCase() === connectedAddress?.toLowerCase();

  const dims =
    size === "sm" ? "w-16 h-16" : size === "lg" ? "w-28 h-28" : "w-24 h-24";

  const topColors: Record<TerrainType, [string, string]> = {
    [TerrainType.Plains]: ["#6E9956", "#4B703B"],
    [TerrainType.Forest]: ["#46784E", "#294D31"],
    [TerrainType.Hills]: ["#7C8D63", "#526140"],
    [TerrainType.Water]: ["#256E7D", "#15424D"],
    [TerrainType.Rocky]: ["#777278", "#48444A"],
    [TerrainType.Landmark]: ["#6B2A30", "#381518"],
  };

  const [c1, c2] = topColors[tile.terrain];
  const gradId = `preview-grad-${tile.id}-${size}`;

  const strokeColor = isYours
    ? "#2DD4BF"
    : !isUnowned
    ? "#FF4D5A"
    : tile.isEventTarget
    ? "#E63946"
    : "rgba(255,255,255,0.22)";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none",
        dims,
        className
      )}
    >
      {/* Hexagonal frame matching Panel 3 reference */}
      <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>

        {/* Outer hex frame */}
        <polygon
          points="60,5 108,32 108,88 60,115 12,88 12,32"
          fill="#0E1211"
          stroke={strokeColor}
          strokeWidth="2.5"
        />
        <polygon
          points="60,10 103,35 103,85 60,110 17,85 17,35"
          fill="#151A18"
        />

        {/* Isometric 3D Tile Block inside hex */}
        {/* Left cliff face */}
        <polygon points="22,62 60,82 60,97 22,77" fill="#3A352F" />
        {/* Right cliff face */}
        <polygon points="98,62 60,82 60,97 98,77" fill="#25221E" />
        {/* Top terrain diamond */}
        <polygon
          points="60,42 98,62 60,82 22,62"
          fill={`url(#${gradId})`}
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        {/* Terrain feature details */}
        {tile.terrain === TerrainType.Forest && (
          <g>
            <polygon points="48,38 56,56 40,56" fill="#2E5B37" />
            <polygon points="48,32 54,47 42,47" fill="#4E8A57" />
            <polygon points="68,42 77,60 59,60" fill="#264D2E" />
            <polygon points="68,35 75,50 61,50" fill="#467F50" />
            <polygon points="58,47 66,65 50,65" fill="#35683F" />
            <polygon points="58,40 64,55 52,55" fill="#5CA065" />
          </g>
        )}

        {tile.terrain === TerrainType.Rocky && (
          <g>
            <polygon points="55,28 74,62 38,62" fill="#635E64" />
            <polygon points="55,28 74,62 57,62" fill="#454147" />
            <polygon points="55,28 62,41 49,41" fill="#C8C3C9" />
            <polygon points="72,38 86,63 60,63" fill="#555056" />
          </g>
        )}

        {tile.terrain === TerrainType.Hills && (
          <g>
            <ellipse cx="55" cy="56" rx="18" ry="8" fill="#677A4E" />
            <ellipse cx="67" cy="61" rx="14" ry="6" fill="#55663E" />
          </g>
        )}

        {tile.terrain === TerrainType.Plains && (
          <g>
            <path
              d="M42,61 Q60,55 76,64"
              stroke="#9AB87A"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="52" cy="56" r="2" fill="#A8C686" />
            <circle cx="68" cy="58" r="1.8" fill="#8FB06D" />
          </g>
        )}

        {tile.terrain === TerrainType.Water && (
          <g opacity="0.75">
            <path
              d="M42,58 Q52,55 62,58 T80,58"
              stroke="#67C7D8"
              strokeWidth="1.8"
              fill="none"
            />
            <path
              d="M46,66 Q56,63 66,66"
              stroke="#67C7D8"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        )}

        {tile.terrain === TerrainType.Landmark && (
          <g>
            <polygon points="60,24 69,58 51,58" fill="#E63946" />
            <polygon points="60,24 69,58 60,62" fill="#9E1F29" />
            <circle cx="60" cy="36" r="4" fill="#FFD166" />
          </g>
        )}

        {/* Structure overlay if present */}
        {tile.hasSettlement && (
          <g>
            <rect x="50" y="38" width="20" height="18" fill="#D5CFC2" rx="1" />
            <polygon points="48,38 60,27 72,38" fill="#E63946" />
            <rect x="57" y="45" width="6" height="8" fill="#FFB703" />
          </g>
        )}

        {!tile.hasSettlement && tile.structureType !== StructureType.None && (
          <g>
            <rect x="54" y="36" width="12" height="20" fill="#B8B2A6" />
            <polygon points="52,36 60,26 68,36" fill="#FF4D5A" />
            <circle cx="60" cy="43" r="2.5" fill="#FFB703" />
          </g>
        )}
      </svg>
    </div>
  );
}

