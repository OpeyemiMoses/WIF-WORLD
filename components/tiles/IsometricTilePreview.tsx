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
    [TerrainType.Plains]: ["#86EFAC", "#15803D"],
    [TerrainType.Forest]: ["#4ADE80", "#14532D"],
    [TerrainType.Hills]: ["#A3E635", "#365314"],
    [TerrainType.Water]: ["#38BDF8", "#0C4A6E"],
    [TerrainType.Rocky]: ["#94A3B8", "#334155"],
    [TerrainType.Landmark]: ["#991B1B", "#1E1B4B"],
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
          fill="#0B0D0C"
          stroke={strokeColor}
          strokeWidth="2.5"
        />
        <polygon
          points="60,10 103,35 103,85 60,110 17,85 17,35"
          fill="#111614"
        />

        {/* Isometric 3D Tile Block inside hex */}
        {/* Left cliff face */}
        <polygon points="22,62 60,82 60,98 22,78" fill="#57534E" />
        {/* Right cliff face */}
        <polygon points="98,62 60,82 60,98 98,78" fill="#44403C" />
        {/* Top terrain diamond */}
        <polygon
          points="60,42 98,62 60,82 22,62"
          fill={`url(#${gradId})`}
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        {/* ============ TERRAIN FEATURES ============ */}
        {/* FOREST */}
        {tile.terrain === TerrainType.Forest && (
          <g>
            {/* Pine 1 */}
            <rect x="47" y="48" width="2" height="5" fill="#451A03" />
            <polygon points="48,32 56,48 40,48" fill="#14532D" />
            <polygon points="48,27 54,41 42,41" fill="#16A34A" />
            {/* Pine 2 */}
            <rect x="67" y="52" width="2" height="5" fill="#451A03" />
            <polygon points="68,36 77,52 59,52" fill="#14532D" />
            <polygon points="68,30 75,45 61,45" fill="#22C55E" />
            {/* Foreground Oak */}
            <circle cx="58" cy="52" r="7" fill="#15803D" />
            <circle cx="56" cy="49" r="5" fill="#4ADE80" opacity="0.85" />
          </g>
        )}

        {/* ROCKY MOUNTAINS */}
        {tile.terrain === TerrainType.Rocky && (
          <g>
            {/* Primary Peak */}
            <polygon points="58,24 78,64 38,64" fill="#94A3B8" />
            <polygon points="58,24 78,64 60,65" fill="#475569" />
            {/* Snow Cap */}
            <polygon points="58,24 67,40 56,38 48,42" fill="#F8FAFC" />
            {/* Secondary Peak */}
            <polygon points="74,36 88,65 62,65" fill="#64748B" />
            <polygon points="74,36 88,65 74,66" fill="#334155" />
          </g>
        )}

        {/* HILLS */}
        {tile.terrain === TerrainType.Hills && (
          <g>
            <polygon points="38,62 55,44 72,62" fill="#84CC16" />
            <polygon points="55,44 72,62 56,64" fill="#65A30D" />
            <polygon points="54,64 70,48 86,64" fill="#A3E635" />
            <polygon points="70,48 86,64 69,66" fill="#4D7C0F" />
          </g>
        )}

        {/* PLAINS */}
        {tile.terrain === TerrainType.Plains && (
          <g>
            <path
              d="M40,62 Q60,55 80,64"
              stroke="#A16207"
              strokeWidth="2"
              strokeOpacity="0.45"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="50" cy="58" rx="3" ry="1.8" fill="#78716C" />
            <ellipse cx="70" cy="60" rx="2.5" ry="1.5" fill="#A8A29E" />
            <circle cx="62" cy="54" r="1.5" fill="#FEF08A" />
          </g>
        )}

        {/* WATER */}
        {tile.terrain === TerrainType.Water && (
          <g>
            <path
              d="M40,58 Q52,53 64,58 T84,58"
              stroke="#BAE6FD"
              strokeWidth="1.6"
              fill="none"
            />
            <path
              d="M46,67 Q58,63 70,67"
              stroke="#E0F2FE"
              strokeWidth="1.3"
              fill="none"
            />
          </g>
        )}

        {/* LANDMARK */}
        {tile.terrain === TerrainType.Landmark && (
          <g>
            <polygon points="60,20 70,58 50,58" fill="#E63946" />
            <polygon points="60,20 70,58 60,62" fill="#991B1B" />
            <circle cx="60,34" r="4.5" fill="#FFD166" />
          </g>
        )}

        {/* ============ STRUCTURES & COTTAGES ============ */}
        {tile.hasSettlement && (
          <g>
            {/* Village Cottage */}
            <polygon points="46,44 54,48 54,58 46,54" fill="#A8A29E" />
            <polygon points="54,48 62,44 62,54 54,58" fill="#78716C" />
            <polygon points="54,38 62,44 54,48 46,44" fill={isYours ? "#0D9488" : "#DC2626"} />
            {/* Main Keep */}
            <polygon points="56,36 68,42 68,54 56,48" fill="#F1F5F9" />
            <polygon points="68,42 78,37 78,49 68,54" fill="#CBD5E1" />
            <polygon points="68,26 78,37 68,42 56,36" fill={isYours ? "#14B8A6" : "#E63946"} />
            <rect x="49" y="37" width="2" height="4" fill="#44403C" />
            <circle cx="50" cy="34" r="1.8" fill="#E2E8F0" opacity="0.6" />
            <rect x="65" y="44" width="3" height="4" rx="0.5" fill="#FBBF24" />
          </g>
        )}

        {!tile.hasSettlement && tile.structureType === StructureType.Outpost && (
          <g>
            <rect x="54" y="36" width="12" height="22" fill="#78716C" />
            <polygon points="52,36 60,24 68,36" fill={isYours ? "#2DD4BF" : "#FF4D5A"} />
            <circle cx="60" cy="44" r="2.5" fill="#FBBF24" />
          </g>
        )}

        {!tile.hasSettlement && tile.structureType === StructureType.Workshop && (
          <g>
            <rect x="52" y="42" width="16" height="15" fill="#57534E" />
            <polygon points="60,34 70,42 50,42" fill="#B45309" />
            <rect x="63" y="32" width="3" height="9" fill="#292524" />
            <circle cx="64.5" cy="29" r="2" fill="#F97316" />
          </g>
        )}

        {!tile.hasSettlement && tile.structureType === StructureType.Beacon && (
          <g>
            <polygon points="60,20 66,54 54,54" fill="#FF4D5A" />
            <circle cx="60" cy="20" r="4.5" fill="#FFD166" />
          </g>
        )}
      </svg>
    </div>
  );
}
