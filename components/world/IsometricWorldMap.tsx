"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Compass,
  Grid,
  Layers,
  Maximize2,
  Minus,
  Plus,
  Shield,
} from "lucide-react";
import {
  BEACON_TARGET_TILE_ID,
  formatCoords,
  GRID_SIZE,
  StructureType,
  TERRAIN_META,
  TerrainType,
  TileState,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { cn } from "@/lib/utils";

interface IsometricWorldMapProps {
  tiles: TileState[];
  selectedTileId: number;
  onSelectTile: (tileId: number) => void;
  connectedAddress?: string;
  beaconProgressRatio?: number; // 0..1
  isRegionLocked?: boolean;
  regionName?: string;
  className?: string;
}

const TILE_W = 132;
const TILE_H = 66;
const HALF_W = TILE_W / 2; // 66
const HALF_H = TILE_H / 2; // 33
const ORIGIN_X = 600;
const ORIGIN_Y = 165;

function getElevationPx(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.Water:
      return 2;
    case TerrainType.Plains:
      return 16;
    case TerrainType.Forest:
      return 20;
    case TerrainType.Hills:
      return 30;
    case TerrainType.Landmark:
      return 38;
    case TerrainType.Rocky:
      return 42;
    default:
      return 16;
  }
}

export function IsometricWorldMap({
  tiles,
  selectedTileId,
  onSelectTile,
  connectedAddress,
  beaconProgressRatio = 0,
  isRegionLocked = false,
  regionName,
  className,
}: IsometricWorldMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredTileId, setHoveredTileId] = useState<number | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [showStructures, setShowStructures] = useState(true);

  const dragRef = useRef<{
    dragging: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  }>({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
  });

  // Painter's algorithm sort: back-to-front by (row + col), tie-break by row
  const sortedTiles = useMemo(() => {
    return [...tiles].sort((a, b) => {
      const depthDiff = a.row + a.col - (b.row + b.col);
      return depthDiff !== 0 ? depthDiff : a.row - b.row;
    });
  }, [tiles]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-hud-control]")) return;
    dragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: pan.x,
      originPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    setPan({
      x: Math.max(-360, Math.min(360, dragRef.current.originPanX + dx)),
      y: Math.max(-240, Math.min(240, dragRef.current.originPanY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragRef.current.dragging = false;
  };

  const resetCamera = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const normalizedUser = connectedAddress?.toLowerCase();

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-[#080B0C] cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {/* Atmospheric Abyssal Ocean & Volumetric Mist Backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 58% at 50% 54%, rgba(28, 92, 108, 0.28) 0%, rgba(13, 33, 40, 0.45) 45%, rgba(8, 11, 12, 0.98) 85%), radial-gradient(circle at 75% 15%, rgba(230, 57, 70, 0.12), transparent 50%)",
        }}
      />

      {/* Subtle drifting sea grid & mist vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,#07090A_96%)]" />

      {/* Main Pan & Zoom Isometric SVG Viewport */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-150 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg
          viewBox="0 0 1200 760"
          className="w-full h-full max-w-[1380px] max-h-[860px] overflow-visible"
          role="img"
          aria-label="WIF WORLDS 7x7 Interactive Isometric Map"
        >
          <defs>
            {/* Water shimmer & coastal glow */}
            <radialGradient id="island-coastal-glow" cx="50%" cy="52%" r="48%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
              <stop offset="55%" stopColor="#155E75" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#080B0C" stopOpacity="0" />
            </radialGradient>

            {/* Terrain Top Surface Gradients */}
            <linearGradient id="top-plains" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7BA65C" />
              <stop offset="55%" stopColor="#5D8746" />
              <stop offset="100%" stopColor="#466B35" />
            </linearGradient>

            <linearGradient id="top-forest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F8455" />
              <stop offset="60%" stopColor="#36633D" />
              <stop offset="100%" stopColor="#25482B" />
            </linearGradient>

            <linearGradient id="top-hills" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8D9B6B" />
              <stop offset="55%" stopColor="#69784D" />
              <stop offset="100%" stopColor="#4D5937" />
            </linearGradient>

            <linearGradient id="top-rocky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C767C" />
              <stop offset="55%" stopColor="#585359" />
              <stop offset="100%" stopColor="#3D393F" />
            </linearGradient>

            <linearGradient id="top-water" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2B8291" />
              <stop offset="65%" stopColor="#1B5968" />
              <stop offset="100%" stopColor="#123D48" />
            </linearGradient>

            <linearGradient id="top-landmark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#782E35" />
              <stop offset="55%" stopColor="#4B1D22" />
              <stop offset="100%" stopColor="#2E1215" />
            </linearGradient>

            {/* Beacon vertical crimson beam */}
            <linearGradient id="beacon-beam" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF4D5A" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#E63946" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E63946" stopOpacity="0" />
            </linearGradient>

            {/* Floating island underside rock */}
            <linearGradient id="under-cliff-left" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A423B" />
              <stop offset="60%" stopColor="#2A2623" />
              <stop offset="100%" stopColor="#121415" />
            </linearGradient>

            <linearGradient id="under-cliff-right" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#342F2A" />
              <stop offset="60%" stopColor="#1D1A18" />
              <stop offset="100%" stopColor="#0C0E0F" />
            </linearGradient>

            <filter id="crimson-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Coastal turquoise halo & distant sea rocks */}
          <ellipse cx="600" cy="415" rx="520" ry="270" fill="url(#island-coastal-glow)" />

          {/* Outer decorative sea rocks & foam ripples */}
          <g opacity="0.55" pointerEvents="none">
            <polygon points="155,395 178,382 195,398 168,406" fill="#2A3538" />
            <polygon points="1030,425 1058,408 1076,428 1044,436" fill="#263134" />
            <polygon points="565,675 592,660 618,676 588,686" fill="#232D30" />
            <path
              d="M142,404 Q175,414 205,402"
              stroke="#67E8F9"
              strokeWidth="1.4"
              strokeOpacity="0.4"
              fill="none"
            />
            <path
              d="M1018,434 Q1054,444 1085,431"
              stroke="#67E8F9"
              strokeWidth="1.4"
              strokeOpacity="0.4"
              fill="none"
            />
          </g>

          {/* Sculpted Floating Island Underside Cliffs (beneath the 7x7 landmass) */}
          <g pointerEvents="none">
            {/* Left underside spire */}
            <polygon
              points="138,396 600,627 600,725 460,672 340,618 225,532 138,436"
              fill="url(#under-cliff-left)"
            />
            {/* Right underside spire */}
            <polygon
              points="1062,396 600,627 600,725 735,668 865,612 978,528 1062,436"
              fill="url(#under-cliff-right)"
            />
            {/* Jagged hanging stalactite facets */}
            <polygon points="340,498 415,535 375,642" fill="#1E1B19" opacity="0.85" />
            <polygon points="520,586 600,627 572,732" fill="#23201E" opacity="0.9" />
            <polygon points="600,627 685,584 630,728" fill="#171514" opacity="0.95" />
            <polygon points="785,534 865,494 822,636" fill="#191716" opacity="0.85" />
          </g>

          {/* 49 Interactive Isometric Tiles */}
          {sortedTiles.map((tile) => {
            const baseX = ORIGIN_X + (tile.col - tile.row) * HALF_W;
            const baseY = ORIGIN_Y + (tile.col + tile.row) * HALF_H;
            const elev = getElevationPx(tile.terrain);

            const isSelected = tile.id === selectedTileId;
            const isHovered = tile.id === hoveredTileId;
            const liftY = isSelected ? -8 : isHovered ? -4 : 0;

            const topY = baseY - elev + liftY;
            const bottomWallY = baseY + 14;

            const isUnowned =
              !tile.owner || tile.owner.toLowerCase() === ZERO_ADDRESS;
            const isYours =
              !isUnowned &&
              Boolean(normalizedUser) &&
              tile.owner.toLowerCase() === normalizedUser;
            const isOtherPlayer = !isUnowned && !isYours;

            const topFill =
              tile.terrain === TerrainType.Plains
                ? "url(#top-plains)"
                : tile.terrain === TerrainType.Forest
                ? "url(#top-forest)"
                : tile.terrain === TerrainType.Hills
                ? "url(#top-hills)"
                : tile.terrain === TerrainType.Rocky
                ? "url(#top-rocky)"
                : tile.terrain === TerrainType.Water
                ? "url(#top-water)"
                : "url(#top-landmark)";

            const leftCliffColor =
              tile.terrain === TerrainType.Water
                ? "#144856"
                : tile.terrain === TerrainType.Rocky
                ? "#4E494F"
                : tile.terrain === TerrainType.Landmark
                ? "#4A1D22"
                : "#52483D";

            const rightCliffColor =
              tile.terrain === TerrainType.Water
                ? "#0D333E"
                : tile.terrain === TerrainType.Rocky
                ? "#353136"
                : tile.terrain === TerrainType.Landmark
                ? "#2F1215"
                : "#383129";

            let borderStroke = "rgba(18, 24, 22, 0.55)";
            let borderWidth = 1.2;

            if (isSelected) {
              borderStroke = "#FFD166";
              borderWidth = 3;
            } else if (isHovered) {
              borderStroke = "#F5F5F5";
              borderWidth = 2;
            } else if (showBorders && isYours) {
              borderStroke = "#2DD4BF";
              borderWidth = 2.6;
            } else if (showBorders && isOtherPlayer) {
              borderStroke = "#FF4D5A";
              borderWidth = 2.6;
            } else if (tile.id === BEACON_TARGET_TILE_ID) {
              borderStroke = "#E63946";
              borderWidth = 2.2;
            }

            // Deterministic variation seed per tile
            const variant = tile.id % 3;

            return (
              <g
                key={tile.id}
                onClick={() => {
                  if (!dragRef.current.moved) {
                    onSelectTile(tile.id);
                  }
                }}
                onMouseEnter={() => setHoveredTileId(tile.id)}
                onMouseLeave={() =>
                  setHoveredTileId((prev) => (prev === tile.id ? null : prev))
                }
                className="cursor-pointer transition-opacity"
              >
                {/* Left 3D Isometric Cliff Wall */}
                <polygon
                  points={`${baseX - HALF_W},${topY + HALF_H} ${baseX},${
                    topY + TILE_H
                  } ${baseX},${bottomWallY + TILE_H} ${baseX - HALF_W},${
                    bottomWallY + HALF_H
                  }`}
                  fill={leftCliffColor}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="0.7"
                />

                {/* Right 3D Isometric Cliff Wall */}
                <polygon
                  points={`${baseX + HALF_W},${topY + HALF_H} ${baseX},${
                    topY + TILE_H
                  } ${baseX},${bottomWallY + TILE_H} ${baseX + HALF_W},${
                    bottomWallY + HALF_H
                  }`}
                  fill={rightCliffColor}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="0.7"
                />

                {/* Top Diamond Surface */}
                <polygon
                  points={`${baseX},${topY} ${baseX + HALF_W},${topY + HALF_H} ${baseX},${
                    topY + TILE_H
                  } ${baseX - HALF_W},${topY + HALF_H}`}
                  fill={topFill}
                  stroke={borderStroke}
                  strokeWidth={borderWidth}
                />

                {/* Ownership inner aura diamond */}
                {showBorders && (isYours || isOtherPlayer) && (
                  <polygon
                    points={`${baseX},${topY + 4} ${baseX + HALF_W - 8},${
                      topY + HALF_H
                    } ${baseX},${topY + TILE_H - 4} ${baseX - HALF_W + 8},${
                      topY + HALF_H
                    }`}
                    fill={
                      isYours
                        ? "rgba(45, 212, 191, 0.12)"
                        : "rgba(230, 57, 70, 0.16)"
                    }
                    stroke={isYours ? "#2DD4BF" : "#E63946"}
                    strokeWidth="1.2"
                    strokeOpacity="0.85"
                    pointerEvents="none"
                  />
                )}

                {/* Selected tile double outer glow ring */}
                {isSelected && (
                  <polygon
                    points={`${baseX},${topY - 3} ${baseX + HALF_W + 4},${
                      topY + HALF_H
                    } ${baseX},${topY + TILE_H + 3} ${baseX - HALF_W - 4},${
                      topY + HALF_H
                    }`}
                    fill="none"
                    stroke="#FF4D5A"
                    strokeWidth="2"
                    filter="url(#crimson-glow)"
                    pointerEvents="none"
                  />
                )}

                {/* ============ TERRAIN SCENERY DETAILS ============ */}
                {/* PLAINS */}
                {tile.terrain === TerrainType.Plains && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    <path
                      d={`M${baseX - 24},${topY + 32} Q${baseX},${
                        topY + (variant === 0 ? 25 : 37)
                      } ${baseX + 24},${topY + 33}`}
                      stroke="#9BC077"
                      strokeWidth="2"
                      strokeOpacity="0.55"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <ellipse
                      cx={baseX - 14 + variant * 5}
                      cy={topY + 26}
                      rx="6"
                      ry="3"
                      fill="#8CB369"
                      opacity="0.7"
                    />
                    <circle
                      cx={baseX + 16}
                      cy={topY + 36}
                      r="2.5"
                      fill="#9FA39A"
                      opacity="0.7"
                    />
                  </g>
                )}

                {/* FOREST */}
                {tile.terrain === TerrainType.Forest && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    {/* Back tree cluster */}
                    <ellipse
                      cx={baseX - 14}
                      cy={topY + 30}
                      rx="11"
                      ry="5"
                      fill="rgba(0,0,0,0.28)"
                    />
                    <polygon
                      points={`${baseX - 14},${topY + 3} ${baseX - 3},${
                        topY + 29
                      } ${baseX - 25},${topY + 29}`}
                      fill="#23492B"
                    />
                    <polygon
                      points={`${baseX - 14},${topY - 3} ${baseX - 5},${
                        topY + 19
                      } ${baseX - 23},${topY + 19}`}
                      fill="#3D7547"
                    />

                    {/* Right tree */}
                    <ellipse
                      cx={baseX + 16}
                      cy={topY + 34}
                      rx="11"
                      ry="5"
                      fill="rgba(0,0,0,0.28)"
                    />
                    <polygon
                      points={`${baseX + 16},${topY + 7} ${baseX + 27},${
                        topY + 33
                      } ${baseX + 5},${topY + 33}`}
                      fill="#1E4025"
                    />
                    <polygon
                      points={`${baseX + 16},${topY + 1} ${baseX + 25},${
                        topY + 22
                      } ${baseX + 7},${topY + 22}`}
                      fill="#498753"
                    />

                    {/* Foreground hero pine */}
                    <ellipse
                      cx={baseX + 1}
                      cy={topY + 42}
                      rx="12"
                      ry="5.5"
                      fill="rgba(0,0,0,0.32)"
                    />
                    <polygon
                      points={`${baseX + 1},${topY + 12} ${baseX + 14},${
                        topY + 41
                      } ${baseX - 12},${topY + 41}`}
                      fill="#295532"
                    />
                    <polygon
                      points={`${baseX + 1},${topY + 5} ${baseX + 11},${
                        topY + 28
                      } ${baseX - 9},${topY + 28}`}
                      fill="#589B62"
                    />
                  </g>
                )}

                {/* HILLS */}
                {tile.terrain === TerrainType.Hills && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    <polygon
                      points={`${baseX - 28},${topY + 34} ${baseX - 6},${
                        topY + 14
                      } ${baseX + 16},${topY + 34}`}
                      fill="#7D8F5E"
                    />
                    <polygon
                      points={`${baseX - 6},${topY + 14} ${baseX + 16},${
                        topY + 34
                      } ${baseX - 4},${topY + 36}`}
                      fill="#5A6842"
                    />
                    <polygon
                      points={`${baseX - 4},${topY + 39} ${baseX + 15},${
                        topY + 21
                      } ${baseX + 32},${topY + 39}`}
                      fill="#8FA16D"
                    />
                    <polygon
                      points={`${baseX + 15},${topY + 21} ${baseX + 32},${
                        topY + 39
                      } ${baseX + 14},${topY + 42}`}
                      fill="#627148"
                    />
                  </g>
                )}

                {/* ROCKY MOUNTAINS */}
                {tile.terrain === TerrainType.Rocky && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    {/* Main jagged peak */}
                    <polygon
                      points={`${baseX - 6},${topY - 12} ${baseX + 22},${
                        topY + 36
                      } ${baseX - 32},${topY + 35}`}
                      fill="#6A646B"
                    />
                    <polygon
                      points={`${baseX - 6},${topY - 12} ${baseX + 22},${
                        topY + 36
                      } ${baseX - 3},${topY + 38}`}
                      fill="#433F45"
                    />
                    {/* Snow / sunlit ridge cap */}
                    <polygon
                      points={`${baseX - 6},${topY - 12} ${baseX + 4},${
                        topY + 6
                      } ${baseX - 4},${topY + 4} ${baseX - 15},${topY + 7}`}
                      fill="#D6D1D8"
                    />
                    {/* Secondary crag */}
                    <polygon
                      points={`${baseX + 16},${topY + 4} ${baseX + 36},${
                        topY + 38
                      } ${baseX - 2},${topY + 39}`}
                      fill="#59545B"
                    />
                    <polygon
                      points={`${baseX + 16},${topY + 4} ${baseX + 36},${
                        topY + 38
                      } ${baseX + 16},${topY + 40}`}
                      fill="#39353B"
                    />
                  </g>
                )}

                {/* WATER */}
                {tile.terrain === TerrainType.Water && (
                  <g pointerEvents="none" opacity="0.8">
                    <path
                      d={`M${baseX - 24},${topY + 29} Q${baseX - 10},${
                        topY + 25
                      } ${baseX + 4},${topY + 29} T${baseX + 26},${topY + 29}`}
                      stroke="#7DD3FC"
                      strokeWidth="1.5"
                      strokeOpacity="0.6"
                      fill="none"
                    />
                    <path
                      d={`M${baseX - 14},${topY + 39} Q${baseX},${
                        topY + 35
                      } ${baseX + 16},${topY + 39}`}
                      stroke="#67E8F9"
                      strokeWidth="1.3"
                      strokeOpacity="0.45"
                      fill="none"
                    />
                  </g>
                )}

                {/* LANDMARK SANCTUARIES */}
                {tile.terrain === TerrainType.Landmark && (
                  <g pointerEvents="none">
                    {/* Stepped Obsidian Plinth */}
                    <polygon
                      points={`${baseX},${topY + 12} ${baseX + 32},${
                        topY + 28
                      } ${baseX},${topY + 44} ${baseX - 32},${topY + 28}`}
                      fill="#2B181B"
                      stroke="#E63946"
                      strokeWidth="1.2"
                    />
                    {/* Glowing runic ring */}
                    <ellipse
                      cx={baseX}
                      cy={topY + 28}
                      rx="18"
                      ry="9"
                      fill="rgba(230,57,70,0.22)"
                      stroke="#FF4D5A"
                      strokeWidth="1.3"
                    />

                    {tile.id === BEACON_TARGET_TILE_ID ? (
                      <>
                        {/* Beacon Spire Light Column */}
                        <rect
                          x={baseX - 8}
                          y={topY - 110}
                          width="16"
                          height="138"
                          fill="url(#beacon-beam)"
                        />
                        {/* Spire Monolith */}
                        <polygon
                          points={`${baseX},${topY - 26} ${baseX + 12},${
                            topY + 28
                          } ${baseX - 12},${topY + 28}`}
                          fill="#E63946"
                        />
                        <polygon
                          points={`${baseX},${topY - 26} ${baseX + 12},${
                            topY + 28
                          } ${baseX},${topY + 32}`}
                          fill="#9E1F29"
                        />
                        <circle
                          cx={baseX}
                          cy={topY - 8}
                          r={4 + beaconProgressRatio * 3}
                          fill="#FFD166"
                          filter="url(#crimson-glow)"
                        />
                      </>
                    ) : (
                      <>
                        {/* Central Crucible Arena */}
                        <polygon
                          points={`${baseX},${topY - 8} ${baseX + 10},${
                            topY + 28
                          } ${baseX - 10},${topY + 28}`}
                          fill="#D6B56D"
                        />
                        <circle cx={baseX} cy={topY + 10} r="3.5" fill="#FF4D5A" />
                      </>
                    )}
                  </g>
                )}

                {/* ============ PLAYER SETTLEMENTS (Lv.1 Hall -> Lv.2 Stronghold -> Lv.3 Citadel) ============ */}
                {showStructures && tile.settlementLevel > 0 && (
                  <g pointerEvents="none">
                    {/* Foundation Courtyard */}
                    <polygon
                      points={`${baseX - 24},${topY + 34} ${baseX},${
                        topY + 46
                      } ${baseX + 24},${topY + 34} ${baseX},${topY + 22}`}
                      fill="#3B3734"
                    />
                    {/* Lv.2+ Outer Flanking Bastion Turrets */}
                    {tile.settlementLevel >= 2 && (
                      <>
                        <rect
                          x={baseX - 23}
                          y={topY + 14}
                          width="8"
                          height="18"
                          fill="#B6AFA2"
                        />
                        <polygon
                          points={`${baseX - 25},${topY + 14} ${baseX - 19},${
                            topY + 6
                          } ${baseX - 13},${topY + 14}`}
                          fill={isYours ? "#0D9488" : "#B8232F"}
                        />
                        <rect
                          x={baseX + 15}
                          y={topY + 14}
                          width="8"
                          height="18"
                          fill="#8D867A"
                        />
                        <polygon
                          points={`${baseX + 13},${topY + 14} ${baseX + 19},${
                            topY + 6
                          } ${baseX + 25},${topY + 14}`}
                          fill={isYours ? "#0D9488" : "#B8232F"}
                        />
                      </>
                    )}
                    {/* Main Keep Walls */}
                    <polygon
                      points={`${baseX - 16},${topY + 11} ${baseX},${
                        topY + 19
                      } ${baseX},${topY + 40} ${baseX - 16},${topY + 32}`}
                      fill="#CFC8BB"
                    />
                    <polygon
                      points={`${baseX + 16},${topY + 11} ${baseX},${
                        topY + 19
                      } ${baseX},${topY + 40} ${baseX + 16},${topY + 32}`}
                      fill="#9E978B"
                    />
                    {/* Spire Roof */}
                    <polygon
                      points={`${baseX},${
                        tile.settlementLevel >= 3 ? topY - 12 : topY - 5
                      } ${baseX + 19},${topY + 12} ${baseX},${topY + 21} ${
                        baseX - 19
                      },${topY + 12}`}
                      fill={isYours ? "#14B8A6" : "#E63946"}
                    />
                    {/* Lv.3 Citadel Sovereign Crown Spire */}
                    {tile.settlementLevel >= 3 && (
                      <circle
                        cx={baseX}
                        cy={topY - 14}
                        r="3.2"
                        fill="#FFD166"
                      />
                    )}
                    {/* Torchlit windows */}
                    <rect
                      x={baseX - 9}
                      y={topY + 23}
                      width="3.5"
                      height="6"
                      rx="1"
                      fill="#FFB703"
                    />
                    <rect
                      x={baseX + 5}
                      y={topY + 23}
                      width="3.5"
                      height="6"
                      rx="1"
                      fill="#FFB703"
                    />
                  </g>
                )}

                {showStructures &&
                  tile.structureType === StructureType.Outpost && (
                    <g pointerEvents="none">
                      {/* Watchtower */}
                      <rect
                        x={baseX + 12}
                        y={topY + 6}
                        width="11"
                        height="22"
                        fill="#ACA495"
                      />
                      <polygon
                        points={`${baseX + 10},${topY + 6} ${baseX + 17.5},${
                          topY - 5
                        } ${baseX + 25},${topY + 6}`}
                        fill={isYours ? "#2DD4BF" : "#FF4D5A"}
                      />
                      <circle
                        cx={baseX + 17.5}
                        cy={topY + 13}
                        r="2.2"
                        fill="#FFB703"
                      />
                    </g>
                  )}

                {showStructures &&
                  tile.structureType === StructureType.Workshop && (
                    <g pointerEvents="none">
                      {/* Artisan Forge */}
                      <rect
                        x={baseX - 24}
                        y={topY + 16}
                        width="15"
                        height="14"
                        fill="#78716C"
                      />
                      <polygon
                        points={`${baseX - 26},${topY + 16} ${baseX - 16.5},${
                          topY + 8
                        } ${baseX - 7},${topY + 16}`}
                        fill="#B45309"
                      />
                      <circle
                        cx={baseX - 16.5}
                        cy={topY + 24}
                        r="3"
                        fill="#FF6B35"
                      />
                    </g>
                  )}

                {showStructures &&
                  tile.structureType === StructureType.Beacon && (
                    <g pointerEvents="none">
                      {/* Player Signal Beacon */}
                      <polygon
                        points={`${baseX + 16},${topY - 12} ${baseX + 23},${
                          topY + 24
                        } ${baseX + 9},${topY + 24}`}
                        fill="#FF4D5A"
                      />
                      <circle
                        cx={baseX + 16}
                        cy={topY - 12}
                        r="3.5"
                        fill="#FFD166"
                      />
                    </g>
                  )}

                {/* Optional Coordinate Overlay */}
                {showCoords && (
                  <text
                    x={baseX}
                    y={topY + HALF_H + 4}
                    textAnchor="middle"
                    className="fill-white/85 font-mono text-[10px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                    pointerEvents="none"
                  >
                    {formatCoords(tile.id)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Top-Right Map Layer & Viewport Toolbar (matches Panel 2 HUD buttons) */}
      <div
        data-hud-control
        className="absolute right-4 top-4 z-20 flex flex-col gap-1.5"
      >
        <button
          type="button"
          onClick={resetCamera}
          title="Center World Map"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-[#121615]/90 text-ink-secondary hover:border-white/25 hover:text-white backdrop-blur-md transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowBorders((v) => !v)}
          title="Toggle Territory Borders"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showBorders
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#121615]/90 text-ink-secondary hover:text-white"
          )}
        >
          <Shield className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowStructures((v) => !v)}
          title="Toggle Structures Layer"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showStructures
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#121615]/90 text-ink-secondary hover:text-white"
          )}
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowCoords((v) => !v)}
          title="Toggle Tile Coordinates"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showCoords
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#121615]/90 text-ink-secondary hover:text-white"
          )}
        >
          <Grid className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom-Right Zoom Controls + Isometric Mini-Map (matches Panel 2 reference) */}
      <div
        data-hud-control
        className="absolute bottom-4 right-4 z-20 flex items-end gap-2.5"
      >
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#121615]/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.65, +(z + 0.15).toFixed(2)))}
            className="flex h-8 w-8 items-center justify-center text-ink-secondary hover:bg-white/[0.08] hover:text-white border-b border-white/[0.08]"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.15).toFixed(2)))}
            className="flex h-8 w-8 items-center justify-center text-ink-secondary hover:bg-white/[0.08] hover:text-white"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden sm:block rounded-xl border border-white/[0.1] bg-[#101413]/92 p-2 shadow-panel backdrop-blur-md">
          <TerritoryMiniMap
            tiles={tiles}
            selectedTileId={selectedTileId}
            highlightOwner={connectedAddress}
            onSelectTile={onSelectTile}
            size={112}
          />
        </div>
      </div>

      {/* Locked Frontier Atmosphere Badge when scouting an unopened region */}
      {isRegionLocked && (
        <div
          data-hud-control
          className="pointer-events-none absolute bottom-16 left-4 z-20 rounded-xl border border-amber-400/35 bg-[#1B150E]/92 px-3.5 py-2 text-xs text-amber-200 backdrop-blur-md shadow-panel"
        >
          <span className="font-bold text-amber-300">
            {regionName || "Frontier Region"} (Scout Mode):
          </span>{" "}
          Explore freely now — claiming opens automatically when{" "}
          <span className="font-semibold text-white">Build the Beacon</span>{" "}
          reaches 100%.
        </div>
      )}

      {/* Bottom-Left World Legend Pill (matches Panel 2 & Panel 6 reference) */}
      <div
        data-hud-control
        className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/[0.09] bg-[#101413]/90 px-3.5 py-2.5 backdrop-blur-md shadow-panel"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2DD4BF] shadow-[0_0_6px_#2DD4BF]" />
            You
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-crimson-accent shadow-[0_0_6px_#FF4D5A]" />
            Other Players
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#68736D]" />
            Neutral
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <Compass className="h-3 w-3 text-gold" />
            Structures
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 bg-crimson border border-amber-300" />
            Beacon Event
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Isometric Territory Mini-Map used in both the World Map HUD (Panel 2)
 * and the Player Profile Header (Panel 5).
 */
export function TerritoryMiniMap({
  tiles,
  selectedTileId,
  highlightOwner,
  onSelectTile,
  size = 136,
}: {
  tiles: TileState[];
  selectedTileId?: number;
  highlightOwner?: string;
  onSelectTile?: (tileId: number) => void;
  size?: number;
}) {
  const normalizedHighlight = highlightOwner?.toLowerCase();
  const mw = 12;
  const mh = 6;
  const cx = 95;
  const cy = 14;

  return (
    <svg
      viewBox="0 0 190 108"
      style={{ width: size, height: Math.round((size * 108) / 190) }}
      className="block"
      aria-label="World Territory Mini-map"
    >
      {tiles.map((t) => {
        const x = cx + (t.col - t.row) * mw;
        const y = cy + (t.col + t.row) * mh;
        const isUnowned = !t.owner || t.owner.toLowerCase() === ZERO_ADDRESS;
        const isHighlighted =
          !isUnowned &&
          Boolean(normalizedHighlight) &&
          t.owner.toLowerCase() === normalizedHighlight;
        const isSelected = selectedTileId === t.id;

        let fill = TERRAIN_META[t.terrain].accentColor;
        if (isHighlighted) fill = "#2DD4BF";
        else if (!isUnowned) fill = "#E63946";
        else if (t.id === BEACON_TARGET_TILE_ID) fill = "#FF4D5A";

        return (
          <polygon
            key={t.id}
            onClick={() => onSelectTile?.(t.id)}
            points={`${x},${y} ${x + mw},${y + mh} ${x},${y + mh * 2} ${
              x - mw
            },${y + mh}`}
            fill={fill}
            stroke={isSelected ? "#FFD166" : "#0B0D0C"}
            strokeWidth={isSelected ? "1.6" : "0.7"}
            className={onSelectTile ? "cursor-pointer hover:opacity-90" : undefined}
          />
        );
      })}
    </svg>
  );
}

