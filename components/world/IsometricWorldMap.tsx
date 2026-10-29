"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Grid,
  Layers,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Shield,
  Sparkles,
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

// Map geometry & projection constants
const TILE_W = 140;
const TILE_H = 70;
const HALF_W = TILE_W / 2; // 70
const HALF_H = TILE_H / 2; // 35
const ORIGIN_X = 680;
const ORIGIN_Y = 175;

// Elevation offsets (in pixels) for 3D terrain height
function getElevationPx(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.Water:
      return 2;
    case TerrainType.Plains:
      return 18;
    case TerrainType.Forest:
      return 22;
    case TerrainType.Hills:
      return 32;
    case TerrainType.Landmark:
      return 42;
    case TerrainType.Rocky:
      return 48;
    default:
      return 18;
  }
}

// Cardinal rotation angles (0 = South/Front, 1 = West, 2 = North/Back, 3 = East)
export type RotationAngle = 0 | 1 | 2 | 3;

const ROTATION_NAMES: Record<RotationAngle, { label: string; desc: string; deg: number }> = {
  0: { label: "South", desc: "Front View", deg: 0 },
  1: { label: "West", desc: "Western Coast", deg: 90 },
  2: { label: "North", desc: "The Backside", deg: 180 },
  3: { label: "East", desc: "Eastern Ridge", deg: 270 },
};

/**
 * Transforms grid coordinates based on the island rotation angle.
 * Rotation 2 (180°) reveals the complete backside of the island.
 */
function getRotatedGridCoords(
  row: number,
  col: number,
  rotation: RotationAngle
): { r: number; c: number } {
  switch (rotation) {
    case 0: // 0° (South / Front)
      return { r: row, c: col };
    case 1: // 90° (West)
      return { r: col, c: 6 - row };
    case 2: // 180° (North / Back)
      return { r: 6 - row, c: 6 - col };
    case 3: // 270° (East)
      return { r: 6 - col, c: row };
    default:
      return { r: row, c: col };
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
  const [rotation, setRotation] = useState<RotationAngle>(0);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [hoveredTileId, setHoveredTileId] = useState<number | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [showStructures, setShowStructures] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);

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

  // Auto-orbit effect: gently rotates the island to inspect every perspective
  useEffect(() => {
    if (!isOrbiting) return;
    const timer = setInterval(() => {
      setRotation((prev) => ((prev + 1) % 4) as RotationAngle);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOrbiting]);

  // Painter's algorithm sort: back-to-front depth sorting relative to current camera rotation
  const sortedTiles = useMemo(() => {
    return [...tiles].sort((a, b) => {
      const posA = getRotatedGridCoords(a.row, a.col, rotation);
      const posB = getRotatedGridCoords(b.row, b.col, rotation);
      const depthDiff = posA.r + posA.c - (posB.r + posB.c);
      return depthDiff !== 0 ? depthDiff : posA.r - posB.r;
    });
  }, [tiles, rotation]);

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
      x: Math.max(-420, Math.min(420, dragRef.current.originPanX + dx)),
      y: Math.max(-300, Math.min(300, dragRef.current.originPanY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragRef.current.dragging = false;
  };

  const resetCamera = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const rotateClockwise = () => {
    setRotation((prev) => ((prev + 1) % 4) as RotationAngle);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => ((prev + 3) % 4) as RotationAngle);
  };

  const normalizedUser = connectedAddress?.toLowerCase();

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-[#07090A] cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {/* Dynamic Atmospheric Cosmic Abyss & Nebula Background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 50% 52%, rgba(20, 85, 102, 0.32) 0%, rgba(10, 26, 32, 0.55) 45%, rgba(7, 9, 10, 0.98) 85%), radial-gradient(circle at 80% 12%, rgba(230, 57, 70, 0.16), transparent 50%), radial-gradient(circle at 20% 80%, rgba(45, 212, 191, 0.10), transparent 55%)",
        }}
      />

      {/* Floating Stardust & Ambient Celestial Particles */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.08]" />

      {/* Main Pan, Zoom & Animated Rotation Container */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg
          viewBox="0 0 1360 880"
          className="w-full h-full max-w-[1520px] max-h-[960px] overflow-visible"
          role="img"
          aria-label="WIF WORLDS Interactive Living Floating Island"
        >
          <defs>
            {/* Shimmering Coastal Lagoon Halo */}
            <radialGradient id="island-coastal-glow" cx="50%" cy="52%" r="48%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
              <stop offset="50%" stopColor="#155E75" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#07090A" stopOpacity="0" />
            </radialGradient>

            {/* Translucent Edge Waterfall Shimmer */}
            <linearGradient id="waterfall-stream" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#0284C7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0C4A6E" stopOpacity="0" />
            </linearGradient>

            {/* Living Water Surface Top Gradient with Dynamic Depth */}
            <linearGradient id="top-water" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="35%" stopColor="#0284C7" />
              <stop offset="75%" stopColor="#075985" />
              <stop offset="100%" stopColor="#0C4A6E" />
            </linearGradient>

            {/* Lush Plains Grassland Gradient */}
            <linearGradient id="top-plains" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="25%" stopColor="#4ADE80" />
              <stop offset="70%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>

            {/* Deep Woodland Forest Gradient */}
            <linearGradient id="top-forest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="30%" stopColor="#16A34A" />
              <stop offset="75%" stopColor="#15803D" />
              <stop offset="100%" stopColor="#14532D" />
            </linearGradient>

            {/* Terraced Rolling Hills Gradient */}
            <linearGradient id="top-hills" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A3E635" />
              <stop offset="40%" stopColor="#65A30D" />
              <stop offset="80%" stopColor="#4D7C0F" />
              <stop offset="100%" stopColor="#365314" />
            </linearGradient>

            {/* Alpine Rocky Peak Gradient */}
            <linearGradient id="top-rocky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="45%" stopColor="#64748B" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Obsidian Sacred Landmark Gradient */}
            <linearGradient id="top-landmark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#991B1B" />
              <stop offset="45%" stopColor="#581C87" />
              <stop offset="80%" stopColor="#2E1065" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>

            {/* Beacon Spire Cosmic Beam */}
            <linearGradient id="beacon-beam" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF4D5A" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#E63946" stopOpacity="0.55" />
              <stop offset="75%" stopColor="#FF858F" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF4D5A" stopOpacity="0" />
            </linearGradient>

            {/* Floating Island Underside Crags */}
            <linearGradient id="island-belly-left" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#57534E" />
              <stop offset="40%" stopColor="#3C3633" />
              <stop offset="75%" stopColor="#262321" />
              <stop offset="100%" stopColor="#0F0E0E" />
            </linearGradient>

            <linearGradient id="island-belly-right" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#44403C" />
              <stop offset="40%" stopColor="#2B2724" />
              <stop offset="75%" stopColor="#1C1917" />
              <stop offset="100%" stopColor="#0B0A0A" />
            </linearGradient>

            {/* Subterranean Mana Crystals */}
            <linearGradient id="crystal-crimson" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF858F" />
              <stop offset="50%" stopColor="#E63946" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>

            <linearGradient id="crystal-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>

            {/* Volumetric Clouds Gradient */}
            <radialGradient id="cloud-puff" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#94A3B8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
            </radialGradient>

            {/* Crimson & Gold Magic Glow Filters */}
            <filter id="crimson-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cyan-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ============ BACKGROUND CELESTIAL ENVIRONMENT ============ */}
          {/* Coastal Turquoise Halo */}
          <ellipse cx="680" cy="455" rx="580" ry="290" fill="url(#island-coastal-glow)" />

          {/* Orbiting Floating Satellite Boulders (Weightless Debris) */}
          <g opacity="0.85" pointerEvents="none">
            {/* Satellite Boulder 1 (Top Left) */}
            <g transform="translate(160, 220)">
              <polygon points="0,15 25,0 45,18 20,32" fill="#44403C" />
              <polygon points="0,15 20,32 18,48 5,38" fill="#292524" />
              <polygon points="45,18 20,32 18,48 40,38" fill="#1C1917" />
              <ellipse cx="22" cy="14" rx="14" ry="7" fill="#4ADE80" opacity="0.8" />
              {/* Mini pine tree on floating rock */}
              <polygon points="22,2 26,12 18,12" fill="#14532D" />
              <polygon points="22,-4 25,4 19,4" fill="#22C55E" />
              {/* Dangling roots */}
              <path d="M15,42 Q12,58 18,70" stroke="#78716C" strokeWidth="1.2" fill="none" />
              <path d="M25,44 Q28,62 24,74" stroke="#57534E" strokeWidth="1" fill="none" />
            </g>

            {/* Satellite Boulder 2 (Top Right) */}
            <g transform="translate(1140, 240)">
              <polygon points="0,18 28,0 52,16 26,35" fill="#475569" />
              <polygon points="0,18 26,35 24,52 6,42" fill="#334155" />
              <polygon points="52,16 26,35 24,52 46,40" fill="#1E293B" />
              <polygon points="26,6 30,18 22,18" fill="url(#crystal-cyan)" filter="url(#cyan-glow)" />
              <path d="M22,46 Q26,65 20,80" stroke="#64748B" strokeWidth="1.2" fill="none" />
            </g>

            {/* Satellite Boulder 3 (Bottom Left Abyss) */}
            <g transform="translate(210, 640)">
              <polygon points="0,12 20,0 38,14 18,28" fill="#3C3633" />
              <polygon points="0,12 18,28 16,40 4,32" fill="#242120" />
              <polygon points="38,14 18,28 16,40 34,30" fill="#151413" />
              <circle cx="18" cy="14" r="3" fill="#FF4D5A" filter="url(#crimson-glow)" />
            </g>

            {/* Satellite Boulder 4 (Bottom Right Abyss) */}
            <g transform="translate(1110, 620)">
              <polygon points="0,14 24,0 42,16 20,30" fill="#44403C" />
              <polygon points="0,14 20,30 18,44 6,35" fill="#292524" />
              <polygon points="42,16 20,30 18,44 38,34" fill="#1C1917" />
              <path d="M18,38 Q22,55 16,68" stroke="#78716C" strokeWidth="1" fill="none" />
            </g>
          </g>

          {/* ============ SCULPTED FLOATING ISLAND CRAGGY UNDERSIDE ============ */}
          {/* Massive subterranean rock underbelly anchoring the 7x7 grid */}
          <g pointerEvents="none">
            {/* Left Underside Megalith Flank */}
            <polygon
              points="190,420 680,670 680,820 520,740 380,660 270,560 190,460"
              fill="url(#island-belly-left)"
            />
            {/* Right Underside Megalith Flank */}
            <polygon
              points="1170,420 680,670 680,820 830,735 970,655 1080,555 1170,460"
              fill="url(#island-belly-right)"
            />

            {/* Central Abyssal Stalactite Keel (Deepest Hanging Peak) */}
            <polygon points="610,630 680,670 675,835 640,780" fill="#1C1917" />
            <polygon points="680,670 750,630 710,775 675,835" fill="#0C0A0A" />

            {/* Jagged Faceted Stalactite Spikes */}
            <polygon points="380,530 460,570 420,700 370,620" fill="#262321" opacity="0.95" />
            <polygon points="460,570 540,610 510,740 420,700" fill="#171514" opacity="0.95" />
            <polygon points="820,610 900,570 850,695 780,735" fill="#201D1B" opacity="0.95" />
            <polygon points="900,570 980,530 940,640 850,695" fill="#131211" opacity="0.95" />

            {/* Subterranean Mana Crystal Clusters Embedded in the Underside Rock */}
            {/* Crimson Crystals */}
            <polygon points="450,610 460,590 468,612 458,624" fill="url(#crystal-crimson)" filter="url(#crimson-glow)" />
            <polygon points="465,605 478,582 485,608 472,618" fill="url(#crystal-crimson)" filter="url(#crimson-glow)" />
            <polygon points="650,710 662,685 670,715 658,728" fill="url(#crystal-crimson)" filter="url(#crimson-glow)" />

            {/* Cyan Crystals */}
            <polygon points="880,600 892,578 900,602 888,614" fill="url(#crystal-cyan)" filter="url(#cyan-glow)" />
            <polygon points="898,595 910,570 918,598 906,610" fill="url(#crystal-cyan)" filter="url(#cyan-glow)" />
            <polygon points="705,715 718,688 726,720 714,732" fill="url(#crystal-cyan)" filter="url(#cyan-glow)" />

            {/* Twisted Hanging Ancient Roots dangling into empty space */}
            <path d="M310,520 Q330,620 290,710 Q280,740 295,780" stroke="#57534E" strokeWidth="2.5" fill="none" />
            <path d="M330,530 Q350,640 335,720" stroke="#44403C" strokeWidth="1.8" fill="none" />
            <path d="M570,640 Q550,730 580,810 Q590,830 575,860" stroke="#78716C" strokeWidth="2.2" fill="none" />
            <path d="M780,640 Q810,720 790,795 Q785,820 805,850" stroke="#57534E" strokeWidth="2" fill="none" />
            <path d="M1030,520 Q1010,610 1040,690 Q1050,720 1035,760" stroke="#44403C" strokeWidth="2.2" fill="none" />
          </g>

          {/* ============ 49 INTERACTIVE ISOMETRIC TILES ============ */}
          {sortedTiles.map((tile) => {
            const rotPos = getRotatedGridCoords(tile.row, tile.col, rotation);
            const baseX = ORIGIN_X + (rotPos.c - rotPos.r) * HALF_W;
            const baseY = ORIGIN_Y + (rotPos.c + rotPos.r) * HALF_H;
            const elev = getElevationPx(tile.terrain);

            const isSelected = tile.id === selectedTileId;
            const isHovered = tile.id === hoveredTileId;
            const liftY = isSelected ? -10 : isHovered ? -5 : 0;

            const topY = baseY - elev + liftY;
            const bottomWallY = baseY + 18;

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

            // 3D Cliff Wall Lighting
            const leftCliffColor =
              tile.terrain === TerrainType.Water
                ? "#0284C7"
                : tile.terrain === TerrainType.Rocky
                ? "#64748B"
                : tile.terrain === TerrainType.Landmark
                ? "#581C87"
                : "#65A30D";

            const rightCliffColor =
              tile.terrain === TerrainType.Water
                ? "#075985"
                : tile.terrain === TerrainType.Rocky
                ? "#475569"
                : tile.terrain === TerrainType.Landmark
                ? "#3B0764"
                : "#4D7C0F";

            let borderStroke = "rgba(15, 23, 42, 0.45)";
            let borderWidth = 1.2;

            if (isSelected) {
              borderStroke = "#FFD166";
              borderWidth = 3.2;
            } else if (isHovered) {
              borderStroke = "#F8FAFC";
              borderWidth = 2.2;
            } else if (showBorders && isYours) {
              borderStroke = "#2DD4BF";
              borderWidth = 2.8;
            } else if (showBorders && isOtherPlayer) {
              borderStroke = "#FF4D5A";
              borderWidth = 2.8;
            } else if (tile.id === BEACON_TARGET_TILE_ID) {
              borderStroke = "#E63946";
              borderWidth = 2.5;
            }

            // Edge detection for waterfalls (perimeter water tiles)
            const isPerimeter =
              rotPos.r === 0 || rotPos.c === 0 || rotPos.r === 6 || rotPos.c === 6;
            const hasWaterfall =
              tile.terrain === TerrainType.Water &&
              (rotPos.r === 6 || rotPos.c === 0);

            // Deterministic hash seed per tile for natural variation
            const seed = (tile.id * 37 + tile.row * 13 + tile.col * 7) % 100;
            const variant = seed % 3;

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
                {/* 3D Isometric Cliff Left Wall */}
                <polygon
                  points={`${baseX - HALF_W},${topY + HALF_H} ${baseX},${
                    topY + TILE_H
                  } ${baseX},${bottomWallY + TILE_H} ${baseX - HALF_W},${
                    bottomWallY + HALF_H
                  }`}
                  fill={leftCliffColor}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="0.8"
                />

                {/* 3D Isometric Cliff Right Wall */}
                <polygon
                  points={`${baseX + HALF_W},${topY + HALF_H} ${baseX},${
                    topY + TILE_H
                  } ${baseX},${bottomWallY + TILE_H} ${baseX + HALF_W},${
                    bottomWallY + HALF_H
                  }`}
                  fill={rightCliffColor}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="0.8"
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

                {/* Dynamic Edge Waterfall cascading into the void */}
                {hasWaterfall && (
                  <g pointerEvents="none">
                    {/* Water pouring over the cliff crest */}
                    <path
                      d={`M${baseX - 30},${topY + TILE_H - 12} L${baseX + 10},${
                        topY + TILE_H - 12
                      } L${baseX + 6},${topY + TILE_H + 90} L${baseX - 26},${
                        topY + TILE_H + 90
                      } Z`}
                      fill="url(#waterfall-stream)"
                      opacity="0.88"
                    />
                    {/* Secondary foaming spray stream */}
                    <path
                      d={`M${baseX - 22},${topY + TILE_H - 8} L${baseX - 4},${
                        topY + TILE_H - 8
                      } L${baseX - 6},${topY + TILE_H + 110} L${baseX - 20},${
                        topY + TILE_H + 110
                      } Z`}
                      fill="#FFFFFF"
                      opacity="0.65"
                    />
                    {/* Spray Mist Cloudlets at bottom of waterfall */}
                    <ellipse
                      cx={baseX - 10}
                      cy={topY + TILE_H + 95}
                      rx="22"
                      ry="8"
                      fill="#BAE6FD"
                      opacity="0.55"
                      filter="url(#cyan-glow)"
                    />
                    <ellipse
                      cx={baseX - 6}
                      cy={topY + TILE_H + 105}
                      rx="26"
                      ry="9"
                      fill="#E0F2FE"
                      opacity="0.4"
                    />
                  </g>
                )}

                {/* Ownership Territory Inner Glow Diamond */}
                {showBorders && (isYours || isOtherPlayer) && (
                  <polygon
                    points={`${baseX},${topY + 5} ${baseX + HALF_W - 9},${
                      topY + HALF_H
                    } ${baseX},${topY + TILE_H - 5} ${baseX - HALF_W + 9},${
                      topY + HALF_H
                    }`}
                    fill={
                      isYours
                        ? "rgba(45, 212, 191, 0.15)"
                        : "rgba(230, 57, 70, 0.18)"
                    }
                    stroke={isYours ? "#2DD4BF" : "#E63946"}
                    strokeWidth="1.4"
                    strokeOpacity="0.85"
                    pointerEvents="none"
                  />
                )}

                {/* Selected Tile Beacon Highlight Ring */}
                {isSelected && (
                  <polygon
                    points={`${baseX},${topY - 4} ${baseX + HALF_W + 5},${
                      topY + HALF_H
                    } ${baseX},${topY + TILE_H + 4} ${baseX - HALF_W - 5},${
                      topY + HALF_H
                    }`}
                    fill="none"
                    stroke="#FFD166"
                    strokeWidth="2.5"
                    filter="url(#crimson-glow)"
                    pointerEvents="none"
                  />
                )}

                {/* ============ NATURAL TERRAIN SCENERY ============ */}

                {/* 1. ACTUAL WATER (Wave Caustics, Shorelines & Shimmer) */}
                {tile.terrain === TerrainType.Water && (
                  <g pointerEvents="none">
                    {/* Concentric wave caustics */}
                    <path
                      d={`M${baseX - 32},${topY + 34} Q${baseX - 10},${
                        topY + 28
                      } ${baseX + 12},${topY + 34} T${baseX + 34},${topY + 34}`}
                      stroke="#BAE6FD"
                      strokeWidth="1.6"
                      strokeOpacity="0.75"
                      fill="none"
                    />
                    <path
                      d={`M${baseX - 22},${topY + 44} Q${baseX},${
                        topY + 38
                      } ${baseX + 24},${topY + 44}`}
                      stroke="#E0F2FE"
                      strokeWidth="1.3"
                      strokeOpacity="0.6"
                      fill="none"
                    />
                    {/* Water sunbeam glint */}
                    <circle
                      cx={baseX - 4 + variant * 8}
                      cy={topY + 32}
                      r="2"
                      fill="#FFFFFF"
                      opacity="0.85"
                    />
                  </g>
                )}

                {/* 2. PLAINS (Lush Meadows, Cobblestone Footpath & Wildflowers) */}
                {tile.terrain === TerrainType.Plains && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    {/* Winding dirt/cobble footpath */}
                    <path
                      d={`M${baseX - 28},${topY + 36} Q${baseX - 4},${
                        topY + 28
                      } ${baseX + 26},${topY + 38}`}
                      stroke="#A16207"
                      strokeWidth="2.5"
                      strokeOpacity="0.45"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Grazing stone boulders */}
                    <ellipse
                      cx={baseX + 18}
                      cy={topY + 40}
                      rx="4.5"
                      ry="2.5"
                      fill="#78716C"
                    />
                    <ellipse
                      cx={baseX - 16}
                      cy={topY + 26}
                      rx="3.5"
                      ry="2"
                      fill="#A8A29E"
                    />
                    {/* Wildflower blooms */}
                    <circle cx={baseX - 8} cy={topY + 38} r="1.5" fill="#FEF08A" />
                    <circle cx={baseX + 6} cy={topY + 24} r="1.5" fill="#F43F5E" />
                    <circle cx={baseX + 12} cy={topY + 32} r="1.5" fill="#38BDF8" />
                  </g>
                )}

                {/* 3. LUSH WOODLAND FOREST (Multi-tiered 3D Pine & Oak Trees) */}
                {tile.terrain === TerrainType.Forest && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    {/* Tree 1: Background Pine (Left) */}
                    <g transform={`translate(${baseX - 22}, ${topY + 8})`}>
                      <rect x="7" y="18" width="3" height="6" fill="#451A03" />
                      <polygon points="8.5,0 17,16 0,16" fill="#14532D" />
                      <polygon points="8.5,0 8.5,16 17,16" fill="#052E16" />
                      <polygon points="8.5,-4 15,9 2,9" fill="#16A34A" />
                      <polygon points="8.5,-4 8.5,9 15,9" fill="#14532D" />
                    </g>

                    {/* Tree 2: Deep Woodland Oak (Center Back) */}
                    <g transform={`translate(${baseX - 6}, ${topY - 2})`}>
                      <rect x="7" y="20" width="4" height="8" fill="#5A2E0F" />
                      {/* Fluffy leafy canopy */}
                      <circle cx="9" cy="12" r="11" fill="#15803D" />
                      <circle cx="5" cy="8" r="8" fill="#22C55E" />
                      <circle cx="12" cy="7" r="7.5" fill="#4ADE80" opacity="0.9" />
                    </g>

                    {/* Tree 3: Foreground Hero Conifer (Right) */}
                    <g transform={`translate(${baseX + 12}, ${topY + 12})`}>
                      <rect x="8" y="20" width="3.5" height="7" fill="#451A03" />
                      <polygon points="9.5,0 19,18 0,18" fill="#166534" />
                      <polygon points="9.5,0 9.5,18 19,18" fill="#14532D" />
                      <polygon points="9.5,-5 17,10 2,10" fill="#22C55E" />
                      <polygon points="9.5,-5 9.5,10 17,10" fill="#15803D" />
                      <polygon points="9.5,-9 15,3 4,3" fill="#4ADE80" />
                    </g>

                    {/* Tree 4: Small Sapling (Front Center) */}
                    <g transform={`translate(${baseX - 6}, ${topY + 22})`}>
                      <rect x="5" y="12" width="2" height="4" fill="#451A03" />
                      <polygon points="6,2 12,12 0,12" fill="#22C55E" />
                      <polygon points="6,2 6,12 12,12" fill="#15803D" />
                    </g>

                    {/* Red fly-agaric forest mushroom */}
                    <circle cx={baseX + 4} cy={topY + 44} r="2" fill="#EF4444" />
                    <circle cx={baseX + 4} cy={topY + 43} r="0.6" fill="#FFFFFF" />
                  </g>
                )}

                {/* 4. ROLLING HILLS (Terraced Contours & Sheep/Pasture) */}
                {tile.terrain === TerrainType.Hills && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    {/* Primary Green Hill Knoll */}
                    <polygon
                      points={`${baseX - 32},${topY + 38} ${baseX - 8},${
                        topY + 14
                      } ${baseX + 18},${topY + 38}`}
                      fill="#84CC16"
                    />
                    <polygon
                      points={`${baseX - 8},${topY + 14} ${baseX + 18},${
                        topY + 38
                      } ${baseX - 6},${topY + 40}`}
                      fill="#65A30D"
                    />
                    {/* Secondary Overlapping Ridge */}
                    <polygon
                      points={`${baseX - 4},${topY + 42} ${baseX + 18},${
                        topY + 20
                      } ${baseX + 38},${topY + 42}`}
                      fill="#A3E635"
                    />
                    <polygon
                      points={`${baseX + 18},${topY + 20} ${baseX + 38},${
                        topY + 42
                      } ${baseX + 16},${topY + 45}`}
                      fill="#4D7C0F"
                    />
                    {/* Hillside terrace line */}
                    <path
                      d={`M${baseX - 22},${topY + 32} Q${baseX - 6},${
                        topY + 24
                      } ${baseX + 10},${topY + 30}`}
                      stroke="#4D7C0F"
                      strokeWidth="1.4"
                      fill="none"
                      strokeOpacity="0.6"
                    />
                  </g>
                )}

                {/* 5. JAGGED MOUNTAIN RIDGES (Alpine Granite Crags with Snow Caps) */}
                {tile.terrain === TerrainType.Rocky && !tile.hasSettlement && (
                  <g pointerEvents="none">
                    {/* Mountain Shadow Drop */}
                    <ellipse
                      cx={baseX + 4}
                      cy={topY + 42}
                      rx="32"
                      ry="12"
                      fill="rgba(0,0,0,0.3)"
                    />

                    {/* Left Secondary Crag */}
                    <polygon
                      points={`${baseX - 22},${topY + 8} ${baseX - 4},${
                        topY + 38
                      } ${baseX - 38},${topY + 36}`}
                      fill="#64748B"
                    />
                    <polygon
                      points={`${baseX - 22},${topY + 8} ${baseX - 4},${
                        topY + 38
                      } ${baseX - 20},${topY + 40}`}
                      fill="#334155"
                    />

                    {/* Majestic Primary Alpine Peak */}
                    <polygon
                      points={`${baseX - 4},${topY - 18} ${baseX + 26},${
                        topY + 38
                      } ${baseX - 34},${topY + 36}`}
                      fill="#94A3B8"
                    />
                    <polygon
                      points={`${baseX - 4},${topY - 18} ${baseX + 26},${
                        topY + 38
                      } ${baseX - 2},${topY + 41}`}
                      fill="#475569"
                    />

                    {/* Glacier Snow Cap on Summit */}
                    <polygon
                      points={`${baseX - 4},${topY - 18} ${baseX + 8},${
                        topY + 2
                      } ${baseX - 2},${topY - 1} ${baseX - 16},${topY + 4}`}
                      fill="#F8FAFC"
                    />
                    <polygon
                      points={`${baseX - 4},${topY - 18} ${baseX + 8},${
                        topY + 2
                      } ${baseX},${topY + 4}`}
                      fill="#E2E8F0"
                    />

                    {/* Right Shoulder Peak */}
                    <polygon
                      points={`${baseX + 18},${topY + 4} ${baseX + 38},${
                        topY + 40
                      } ${baseX},${topY + 41}`}
                      fill="#64748B"
                    />
                    <polygon
                      points={`${baseX + 18},${topY + 4} ${baseX + 38},${
                        topY + 40
                      } ${baseX + 18},${topY + 43}`}
                      fill="#1E293B"
                    />
                    {/* Right Peak Snow Tip */}
                    <polygon
                      points={`${baseX + 18},${topY + 4} ${baseX + 24},${
                        topY + 14
                      } ${baseX + 14},${topY + 14}`}
                      fill="#F8FAFC"
                    />

                    {/* Crumbled scree rubble at base */}
                    <polygon points={`${baseX - 14},${topY + 38} ${baseX - 10},${topY + 34} ${baseX - 6},${topY + 38}`} fill="#94A3B8" />
                    <polygon points={`${baseX + 12},${topY + 39} ${baseX + 16},${topY + 35} ${baseX + 20},${topY + 39}`} fill="#64748B" />
                  </g>
                )}

                {/* 6. SACRED OBSIDIAN SANCTUARIES & BEACON TARGET */}
                {tile.terrain === TerrainType.Landmark && (
                  <g pointerEvents="none">
                    {/* Stepped Obsidian Plinth Base */}
                    <polygon
                      points={`${baseX},${topY + 12} ${baseX + 34},${
                        topY + 29
                      } ${baseX},${topY + 46} ${baseX - 34},${topY + 29}`}
                      fill="#1E1B4B"
                      stroke="#E63946"
                      strokeWidth="1.5"
                    />
                    {/* Runic Energy Ring */}
                    <ellipse
                      cx={baseX}
                      cy={topY + 29}
                      rx="20"
                      ry="10"
                      fill="rgba(230,57,70,0.25)"
                      stroke="#FF4D5A"
                      strokeWidth="1.4"
                    />

                    {tile.id === BEACON_TARGET_TILE_ID ? (
                      <>
                        {/* Towering Crimson Light Column to the Heavens */}
                        <rect
                          x={baseX - 10}
                          y={topY - 130}
                          width="20"
                          height="160"
                          fill="url(#beacon-beam)"
                        />
                        {/* Floating Mana Ring Orb */}
                        <ellipse
                          cx={baseX}
                          cy={topY - 45}
                          rx={10 + beaconProgressRatio * 6}
                          ry={4 + beaconProgressRatio * 2.5}
                          fill="none"
                          stroke="#FFD166"
                          strokeWidth="2"
                          filter="url(#crimson-glow)"
                        />
                        {/* Ancient Beacon Obelisk */}
                        <polygon
                          points={`${baseX},${topY - 32} ${baseX + 14},${
                            topY + 29
                          } ${baseX - 14},${topY + 29}`}
                          fill="#E63946"
                        />
                        <polygon
                          points={`${baseX},${topY - 32} ${baseX + 14},${
                            topY + 29
                          } ${baseX},${topY + 34}`}
                          fill="#991B1B"
                        />
                        {/* Glowing Golden Apex Core */}
                        <circle
                          cx={baseX}
                          cy={topY - 14}
                          r={5 + beaconProgressRatio * 4}
                          fill="#FFD166"
                          filter="url(#crimson-glow)"
                        />
                      </>
                    ) : (
                      <>
                        {/* Ancient Monolith Spires */}
                        <polygon
                          points={`${baseX},${topY - 12} ${baseX + 12},${
                            topY + 29
                          } ${baseX - 12},${topY + 29}`}
                          fill="#F59E0B"
                        />
                        <circle cx={baseX} cy={topY + 8} r="4" fill="#FF4D5A" />
                      </>
                    )}
                  </g>
                )}

                {/* ============ AUTHENTIC HOUSES & SETTLEMENTS ============ */}
                {/* Lv.1 Hamlet: Village Cottages & Campfire */}
                {/* Lv.2 Stronghold: Fortified Stone Keep, Guardtowers & Cottages */}
                {/* Lv.3 Citadel: Sovereign Gothic Castle Spire & Thriving City */}
                {showStructures && tile.settlementLevel > 0 && (
                  <g pointerEvents="none">
                    {/* Settlement Cobblestone Courtyard Plaza */}
                    <polygon
                      points={`${baseX - 28},${topY + 35} ${baseX},${
                        topY + 49
                      } ${baseX + 28},${topY + 35} ${baseX},${topY + 21}`}
                      fill="#57534E"
                      stroke="#78716C"
                      strokeWidth="1"
                    />

                    {/* --- COTTAGE 1: Left Residential House --- */}
                    <g transform={`translate(${baseX - 24}, ${topY + 16})`}>
                      {/* House Base Walls */}
                      <polygon points="0,8 10,13 10,21 0,16" fill="#A8A29E" />
                      <polygon points="10,13 20,8 20,16 10,21" fill="#78716C" />
                      {/* Pitched Shingled Roof */}
                      <polygon
                        points="10,2 20,8 10,13 0,8"
                        fill={isYours ? "#0D9488" : "#DC2626"}
                      />
                      {/* Stone Chimney & Smoke Puff */}
                      <rect x="3" y="1" width="3" height="6" fill="#44403C" />
                      <circle cx="4.5" cy="-2" r="2.2" fill="#F1F5F9" opacity="0.6" />
                      <circle cx="6" cy="-6" r="3" fill="#E2E8F0" opacity="0.35" />
                      {/* Lit Candle Window */}
                      <rect x="3" y="11" width="3" height="3" fill="#FBBF24" />
                    </g>

                    {/* --- COTTAGE 2: Right Residential House (Present in Lv.2 and Lv.3) --- */}
                    {tile.settlementLevel >= 2 && (
                      <g transform={`translate(${baseX + 6}, ${topY + 18})`}>
                        <polygon points="0,7 9,12 9,19 0,14" fill="#A8A29E" />
                        <polygon points="9,12 18,7 18,14 9,19" fill="#78716C" />
                        <polygon
                          points="9,1 18,7 9,12 0,7"
                          fill={isYours ? "#0F766E" : "#B91C1C"}
                        />
                        <rect x="12" y="0" width="2.5" height="5" fill="#44403C" />
                        <circle cx="13" cy="-3" r="2" fill="#F1F5F9" opacity="0.5" />
                        <rect x="12" y="10" width="2.5" height="2.5" fill="#FBBF24" />
                      </g>
                    )}

                    {/* --- CENTRAL MAIN KEEP / CHIEFTAIN HALL --- */}
                    {/* Flanking Fortified Guard Towers (Lv.2 and Lv.3) */}
                    {tile.settlementLevel >= 2 && (
                      <>
                        {/* West Watchtower */}
                        <g transform={`translate(${baseX - 22}, ${topY + 4})`}>
                          <rect x="0" y="8" width="9" height="20" fill="#E2E8F0" />
                          <polygon
                            points="0,8 4.5,-2 9,8"
                            fill={isYours ? "#14B8A6" : "#E63946"}
                          />
                          {/* Banner pennant */}
                          <path
                            d="M4.5,-2 L4.5,-7 L11,-4.5 Z"
                            fill={isYours ? "#2DD4BF" : "#FF4D5A"}
                          />
                          <circle cx="4.5" cy="14" r="1.5" fill="#FBBF24" />
                        </g>

                        {/* East Watchtower */}
                        <g transform={`translate(${baseX + 13}, ${topY + 4})`}>
                          <rect x="0" y="8" width="9" height="20" fill="#CBD5E1" />
                          <polygon
                            points="0,8 4.5,-2 9,8"
                            fill={isYours ? "#14B8A6" : "#E63946"}
                          />
                          <path
                            d="M4.5,-2 L4.5,-7 L11,-4.5 Z"
                            fill={isYours ? "#2DD4BF" : "#FF4D5A"}
                          />
                          <circle cx="4.5" cy="14" r="1.5" fill="#FBBF24" />
                        </g>
                      </>
                    )}

                    {/* Center Keep Fortress Walls */}
                    <polygon
                      points={`${baseX - 16},${topY + 10} ${baseX},${
                        topY + 18
                      } ${baseX},${topY + 42} ${baseX - 16},${topY + 34}`}
                      fill="#F1F5F9"
                    />
                    <polygon
                      points={`${baseX + 16},${topY + 10} ${baseX},${
                        topY + 18
                      } ${baseX},${topY + 42} ${baseX + 16},${topY + 34}`}
                      fill="#CBD5E1"
                    />

                    {/* Main Castle Spire Roof */}
                    <polygon
                      points={`${baseX},${
                        tile.settlementLevel >= 3 ? topY - 18 : topY - 8
                      } ${baseX + 18},${topY + 10} ${baseX},${topY + 19} ${
                        baseX - 18
                      },${topY + 10}`}
                      fill={isYours ? "#0D9488" : "#E63946"}
                    />

                    {/* Lv.3 Citadel Sovereign Golden Spire Orb */}
                    {tile.settlementLevel >= 3 && (
                      <>
                        <line
                          x1={baseX}
                          y1={topY - 18}
                          x2={baseX}
                          y2={topY - 26}
                          stroke="#F59E0B"
                          strokeWidth="2"
                        />
                        <circle
                          cx={baseX}
                          cy={topY - 26}
                          r="3.5"
                          fill="#FFD166"
                          filter="url(#crimson-glow)"
                        />
                      </>
                    )}

                    {/* Arched Gatehouse & Warm Lantern Windows */}
                    <polygon
                      points={`${baseX - 4},${topY + 28} ${baseX + 4},${
                        topY + 28
                      } ${baseX + 4},${topY + 39} ${baseX - 4},${topY + 39}`}
                      fill="#3B1C10"
                    />
                    <rect x={baseX - 11} y={topY + 22} width="4" height="6" rx="1" fill="#FBBF24" />
                    <rect x={baseX + 7} y={topY + 22} width="4" height="6" rx="1" fill="#FBBF24" />
                  </g>
                )}

                {/* ============ SPECIALIZED BUILDINGS ============ */}
                {/* 1. OUTPOST WATCHTOWER */}
                {showStructures &&
                  tile.structureType === StructureType.Outpost && (
                    <g pointerEvents="none">
                      <g transform={`translate(${baseX + 10}, ${topY + 2})`}>
                        {/* Stone base & wooden observation deck */}
                        <rect x="2" y="8" width="12" height="24" fill="#78716C" />
                        <rect x="0" y="6" width="16" height="4" fill="#A8A29E" />
                        {/* Conical spire roof */}
                        <polygon
                          points="8,-6 17,6 -1,6"
                          fill={isYours ? "#2DD4BF" : "#FF4D5A"}
                        />
                        {/* Torchlight beacon */}
                        <circle cx="8" cy="14" r="2.8" fill="#FBBF24" />
                        {/* Palisade defensive spikes */}
                        <polygon points="-6,26 -3,20 0,26" fill="#44403C" />
                        <polygon points="16,26 19,20 22,26" fill="#44403C" />
                      </g>
                    </g>
                  )}

                {/* 2. BLACKSMITH FORGE & WORKSHOP */}
                {showStructures &&
                  tile.structureType === StructureType.Workshop && (
                    <g pointerEvents="none">
                      <g transform={`translate(${baseX - 26}, ${topY + 12})`}>
                        {/* Stone Forge Building */}
                        <rect x="0" y="8" width="18" height="15" fill="#57534E" />
                        <polygon points="9,0 19,8 0,8" fill="#B45309" />
                        {/* Smelting Kiln Chimney & Embers */}
                        <rect x="13" y="-3" width="4" height="11" fill="#292524" />
                        <circle cx="15" cy="-6" r="2.5" fill="#F97316" />
                        <circle cx="17" cy="-10" r="1.8" fill="#FB923C" opacity="0.6" />
                        {/* Glowing Anvil Hearth */}
                        <rect x="4" y="14" width="6" height="5" fill="#EF4444" />
                      </g>
                    </g>
                  )}

                {/* 3. SIGNAL BEACON TOWER */}
                {showStructures &&
                  tile.structureType === StructureType.Beacon && (
                    <g pointerEvents="none">
                      <g transform={`translate(${baseX + 12}, ${topY - 14})`}>
                        {/* High Runic Obelisk */}
                        <polygon points="6,0 12,34 0,34" fill="#FF4D5A" />
                        <polygon points="6,0 12,34 6,37" fill="#991B1B" />
                        {/* Brass Armillary Sphere & Light Orb */}
                        <circle cx="6" cy="0" r="5" fill="#FFD166" filter="url(#crimson-glow)" />
                        <ellipse cx="6" cy="0" rx="9" ry="3.5" fill="none" stroke="#FFD166" strokeWidth="1.2" />
                      </g>
                    </g>
                  )}

                {/* Tile Coordinate Overlay Tag */}
                {showCoords && (
                  <text
                    x={baseX}
                    y={topY + HALF_H + 4}
                    textAnchor="middle"
                    className="fill-white font-mono text-[10px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                    pointerEvents="none"
                  >
                    {formatCoords(tile.id)}
                  </text>
                )}
              </g>
            );
          })}

          {/* ============ VOLUMETRIC LOW MIST CLOUDS ============ */}
          {showAtmosphere && (
            <g pointerEvents="none" opacity="0.45">
              {/* Drifting cloud bank front-left */}
              <ellipse cx="320" cy="580" rx="140" ry="45" fill="url(#cloud-puff)" />
              <ellipse cx="260" cy="560" rx="90" ry="35" fill="url(#cloud-puff)" />
              {/* Drifting cloud bank front-right */}
              <ellipse cx="1060" cy="590" rx="130" ry="42" fill="url(#cloud-puff)" />
              <ellipse cx="1120" cy="570" rx="85" ry="32" fill="url(#cloud-puff)" />
            </g>
          )}
        </svg>
      </div>

      {/* ============ HUD CONTROLS ============ */}

      {/* TOP-LEFT: Island Rotation & Perspective Dial (Lets player view the back) */}
      <div
        data-hud-control
        className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-[#101413]/92 p-2 shadow-panel backdrop-blur-md"
      >
        <button
          type="button"
          onClick={rotateCounterClockwise}
          title="Rotate Island Left (↺)"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161B19] text-ink-secondary hover:border-white/20 hover:text-white transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Current Facing Badge with Degree Indicator */}
        <div className="flex flex-col px-2 text-center min-w-[110px]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-crimson-accent font-semibold">
            {ROTATION_NAMES[rotation].deg}° • {ROTATION_NAMES[rotation].label}
          </span>
          <span className="text-xs font-bold text-white">
            {ROTATION_NAMES[rotation].desc}
          </span>
        </div>

        <button
          type="button"
          onClick={rotateClockwise}
          title="Rotate Island Right (↻)"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#161B19] text-ink-secondary hover:border-white/20 hover:text-white transition-colors"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-white/[0.1] mx-0.5" />

        {/* Auto-Orbit Play/Pause */}
        <button
          type="button"
          onClick={() => setIsOrbiting((v) => !v)}
          title={isOrbiting ? "Pause Island Auto-Orbit" : "Start Island Auto-Orbit (360°)"}
          className={cn(
            "flex h-9 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold backdrop-blur-md transition-colors",
            isOrbiting
              ? "border-crimson/60 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.08] bg-[#161B19] text-ink-secondary hover:text-white"
          )}
        >
          {isOrbiting ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{isOrbiting ? "Orbiting" : "Orbit"}</span>
        </button>
      </div>

      {/* TOP-RIGHT: Viewport, Layers & Atmosphere Toolbar */}
      <div
        data-hud-control
        className="absolute right-4 top-4 z-20 flex flex-col gap-1.5"
      >
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera & Center View"
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
          title="Toggle Structures & Houses Layer"
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
          onClick={() => setShowAtmosphere((v) => !v)}
          title="Toggle Atmospheric Mist & Effects"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showAtmosphere
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#121615]/90 text-ink-secondary hover:text-white"
          )}
        >
          <Sparkles className="h-4 w-4" />
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

      {/* BOTTOM-RIGHT: Zoom Controls + Mini-Map */}
      <div
        data-hud-control
        className="absolute bottom-4 right-4 z-20 flex items-end gap-2.5"
      >
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#121615]/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.1, +(z + 0.15).toFixed(2)))}
            className="flex h-8 w-8 items-center justify-center text-ink-secondary hover:bg-white/[0.08] hover:text-white border-b border-white/[0.08]"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.55, +(z - 0.15).toFixed(2)))}
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
            size={116}
          />
        </div>
      </div>

      {/* Locked Frontier Banner */}
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

      {/* BOTTOM-LEFT: World Map Legend */}
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
            <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" />
            Neutral
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <Compass className="h-3 w-3 text-gold" />
            Structures & Villages
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 bg-crimson border border-amber-300" />
            Beacon Spire
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
