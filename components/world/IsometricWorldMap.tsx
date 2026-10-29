"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Compass,
  Grid,
  Layers,
  Maximize2,
  Minus,
  Plus,
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

// Elevation (Z height in world units)
function getElevation(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.Water:
      return 6;
    case TerrainType.Plains:
      return 20;
    case TerrainType.Forest:
      return 26;
    case TerrainType.Hills:
      return 40;
    case TerrainType.Landmark:
      return 48;
    case TerrainType.Rocky:
      return 62;
    default:
      return 20;
  }
}

// Tile size in 3D world space
const TILE_SIZE = 74;
const HALF_SIZE = TILE_SIZE / 2;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layer toggles
  const [showCoords, setShowCoords] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [showStructures, setShowStructures] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [hoveredTileId, setHoveredTileId] = useState<number | null>(null);

  // 3D Camera & Inertial Physics State
  const cameraRef = useRef({
    yaw: 0.785, // ~45 deg initial isometric angle
    pitch: 0.96, // ~55 deg tilt
    zoom: 1.05,
    panX: 0,
    panY: 20,
    velYaw: 0,
    velPitch: 0,
    velPanX: 0,
    velPanY: 0,
  });

  // Pointer drag state for swipe momentum
  const pointerRef = useRef({
    isDown: false,
    button: 0,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    lastTime: 0,
    moved: false,
  });

  const normalizedUser = connectedAddress?.toLowerCase();

  // Reset Camera
  const resetCamera = useCallback(() => {
    cameraRef.current = {
      yaw: 0.785,
      pitch: 0.96,
      zoom: 1.05,
      panX: 0,
      panY: 20,
      velYaw: 0,
      velPitch: 0,
      velPanX: 0,
      velPanY: 0,
    };
  }, []);

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    cameraRef.current.zoom = Math.max(
      0.55,
      Math.min(2.4, +(cameraRef.current.zoom + delta).toFixed(2))
    );
  }, []);

  // Main 60 FPS Render & Inertia Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let waterAnim = 0;

    const render = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Handle Retina displays smoothly
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.floor(width * dpr) ||
        canvas.height !== Math.floor(height * dpr)
      ) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Physics integration (gyro inertia friction deceleration)
      const cam = cameraRef.current;
      if (!pointerRef.current.isDown) {
        cam.yaw += cam.velYaw;
        cam.pitch = Math.max(0.42, Math.min(1.22, cam.pitch + cam.velPitch));
        cam.panX += cam.velPanX;
        cam.panY += cam.velPanY;

        // Exponential air resistance deceleration
        cam.velYaw *= 0.925;
        cam.velPitch *= 0.925;
        cam.velPanX *= 0.9;
        cam.velPanY *= 0.9;

        if (Math.abs(cam.velYaw) < 0.00008) cam.velYaw = 0;
        if (Math.abs(cam.velPitch) < 0.00008) cam.velPitch = 0;
        if (Math.abs(cam.velPanX) < 0.05) cam.velPanX = 0;
        if (Math.abs(cam.velPanY) < 0.05) cam.velPanY = 0;
      }

      waterAnim += 0.025;

      const centerX = width / 2 + cam.panX;
      const centerY = height / 2 + cam.panY;
      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const sinP = Math.sin(cam.pitch);
      const cosP = Math.cos(cam.pitch);
      const zoom = cam.zoom;

      // 3D Point Projection Helper
      const project = (x: number, y: number, z: number) => {
        const rx = x * cosY - y * sinY;
        const ry = x * sinY + y * cosY;
        const sx = centerX + rx * zoom;
        const sy = centerY + (ry * sinP - z * cosP) * zoom;
        const depth = ry * cosP + z * sinP;
        return { sx, sy, depth, rx, ry };
      };

      // 1. CLEAR & DRAW COSMIC ABYSS BACKDROP
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        40,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      bgGrad.addColorStop(0, "#0C1D24");
      bgGrad.addColorStop(0.45, "#081014");
      bgGrad.addColorStop(0.85, "#060809");
      bgGrad.addColorStop(1, "#030405");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient celestial dust particles
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      for (let i = 0; i < 40; i++) {
        const px = ((i * 137.5 + waterAnim * 4) % width);
        const py = ((i * 219.3 + waterAnim * 2) % height);
        const pr = (i % 3) * 0.5 + 0.6;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. SCULPTED FLOATING ISLAND CRAGGY UNDERSIDE (3D Bedrock)
      // Base perimeter bedrock contour
      const underPoints = [
        { x: -3.4 * TILE_SIZE, y: -3.4 * TILE_SIZE },
        { x: 3.4 * TILE_SIZE, y: -3.4 * TILE_SIZE },
        { x: 3.4 * TILE_SIZE, y: 3.4 * TILE_SIZE },
        { x: -3.4 * TILE_SIZE, y: 3.4 * TILE_SIZE },
      ];

      // Projected bottom edge of island platform
      const baseEdge = underPoints.map((p) => project(p.x, p.y, -10));
      // Deep abyssal hanging stalactite tip
      const deepTip = project(0, 0, -170);

      // Draw underside crag facets
      for (let i = 0; i < 4; i++) {
        const p1 = baseEdge[i];
        const p2 = baseEdge[(i + 1) % 4];

        const cragGrad = ctx.createLinearGradient(
          (p1.sx + p2.sx) / 2,
          (p1.sy + p2.sy) / 2,
          deepTip.sx,
          deepTip.sy
        );
        cragGrad.addColorStop(0, "#38332E");
        cragGrad.addColorStop(0.4, "#211E1B");
        cragGrad.addColorStop(0.8, "#12100F");
        cragGrad.addColorStop(1, "#080706");

        ctx.fillStyle = cragGrad;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.lineTo(deepTip.sx, deepTip.sy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Dangling ancient roots from underside
      ctx.strokeStyle = "#44403C";
      ctx.lineWidth = 1.6 * zoom;
      ctx.beginPath();
      const r1 = project(-100, 80, -20);
      const r1_end = project(-110, 90, -110);
      ctx.moveTo(r1.sx, r1.sy);
      ctx.quadraticCurveTo(r1.sx + 15, r1.sy + 40, r1_end.sx, r1_end.sy);
      const r2 = project(80, -60, -20);
      const r2_end = project(95, -70, -120);
      ctx.moveTo(r2.sx, r2.sy);
      ctx.quadraticCurveTo(r2.sx - 10, r2.sy + 50, r2_end.sx, r2_end.sy);
      ctx.stroke();

      // Subterranean glowing crystals (crimson & cyan)
      const c1 = project(-50, 40, -90);
      ctx.fillStyle = "#FF4D5A";
      ctx.shadowColor = "#FF4D5A";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(c1.sx, c1.sy, 3.5 * zoom, 0, Math.PI * 2);
      ctx.fill();

      const c2 = project(60, 50, -80);
      ctx.fillStyle = "#38BDF8";
      ctx.shadowColor = "#38BDF8";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(c2.sx, c2.sy, 3.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset shadow

      // 3. TRANSFORM & DEPTH SORT ALL 49 TILES
      interface ProjectedTile {
        tile: TileState;
        topCenter: { sx: number; sy: number; depth: number };
        corners: { sx: number; sy: number }[];
        bottomCorners: { sx: number; sy: number }[];
        elev: number;
        isSelected: boolean;
        isHovered: boolean;
        isYours: boolean;
        isOther: boolean;
      }

      const projectedTiles: ProjectedTile[] = tiles.map((tile) => {
        // World position
        const wx = (tile.col - 3) * TILE_SIZE;
        const wy = (tile.row - 3) * TILE_SIZE;
        const elev = getElevation(tile.terrain);

        const isSelected = tile.id === selectedTileId;
        const isHovered = tile.id === hoveredTileId;
        const lift = isSelected ? 12 : isHovered ? 6 : 0;
        const z = elev + lift;

        const topCenter = project(wx, wy, z);

        // 4 diamond corners in world space
        const corners = [
          project(wx, wy - HALF_SIZE, z), // North
          project(wx + HALF_SIZE, wy, z), // East
          project(wx, wy + HALF_SIZE, z), // South
          project(wx - HALF_SIZE, wy, z), // West
        ];

        // Bottom cliff corners (down by cliff depth 22)
        const bottomCorners = [
          project(wx, wy - HALF_SIZE, z - 22),
          project(wx + HALF_SIZE, wy, z - 22),
          project(wx, wy + HALF_SIZE, z - 22),
          project(wx - HALF_SIZE, wy, z - 22),
        ];

        const isUnowned =
          !tile.owner || tile.owner.toLowerCase() === ZERO_ADDRESS;
        const isYours =
          !isUnowned &&
          Boolean(normalizedUser) &&
          tile.owner.toLowerCase() === normalizedUser;
        const isOther = !isUnowned && !isYours;

        return {
          tile,
          topCenter,
          corners,
          bottomCorners,
          elev,
          isSelected,
          isHovered,
          isYours,
          isOther,
        };
      });

      // Sort back-to-front by depth (Painter's algorithm in continuous 3D)
      projectedTiles.sort((a, b) => a.topCenter.depth - b.topCenter.depth);

      // 4. DRAW SORTED TILES WITH PHOTOREALISTIC NATURAL ASSETS
      for (const pt of projectedTiles) {
        const {
          tile,
          topCenter,
          corners,
          bottomCorners,
          isSelected,
          isHovered,
          isYours,
          isOther,
        } = pt;

        // A. 3D Cliff Walls (drawn before top surface)
        for (let i = 0; i < 4; i++) {
          const cA = corners[i];
          const cB = corners[(i + 1) % 4];
          const bA = bottomCorners[i];
          const bB = bottomCorners[(i + 1) % 4];

          // Face normal test to only draw facing cliff sides
          const cross =
            (cB.sx - cA.sx) * (bA.sy - cA.sy) -
            (cB.sy - cA.sy) * (bA.sx - cA.sx);
          if (cross > 0) {
            ctx.fillStyle =
              tile.terrain === TerrainType.Water
                ? "#075985"
                : tile.terrain === TerrainType.Rocky
                ? "#475569"
                : tile.terrain === TerrainType.Landmark
                ? "#3B0764"
                : "#4A4036";
            ctx.beginPath();
            ctx.moveTo(cA.sx, cA.sy);
            ctx.lineTo(cB.sx, cB.sy);
            ctx.lineTo(bB.sx, bB.sy);
            ctx.lineTo(bA.sx, bA.sy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // B. Top Diamond Surface
        ctx.beginPath();
        ctx.moveTo(corners[0].sx, corners[0].sy);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(corners[i].sx, corners[i].sy);
        }
        ctx.closePath();

        // Realistic Terrain Surface Gradients
        if (tile.terrain === TerrainType.Plains) {
          const grad = ctx.createLinearGradient(
            corners[0].sx,
            corners[0].sy,
            corners[2].sx,
            corners[2].sy
          );
          grad.addColorStop(0, "#86EFAC");
          grad.addColorStop(0.5, "#4ADE80");
          grad.addColorStop(1, "#16A34A");
          ctx.fillStyle = grad;
        } else if (tile.terrain === TerrainType.Forest) {
          const grad = ctx.createLinearGradient(
            corners[0].sx,
            corners[0].sy,
            corners[2].sx,
            corners[2].sy
          );
          grad.addColorStop(0, "#22C55E");
          grad.addColorStop(0.5, "#15803D");
          grad.addColorStop(1, "#14532D");
          ctx.fillStyle = grad;
        } else if (tile.terrain === TerrainType.Hills) {
          const grad = ctx.createLinearGradient(
            corners[0].sx,
            corners[0].sy,
            corners[2].sx,
            corners[2].sy
          );
          grad.addColorStop(0, "#A3E635");
          grad.addColorStop(0.5, "#65A30D");
          grad.addColorStop(1, "#3F6212");
          ctx.fillStyle = grad;
        } else if (tile.terrain === TerrainType.Rocky) {
          const grad = ctx.createLinearGradient(
            corners[0].sx,
            corners[0].sy,
            corners[2].sx,
            corners[2].sy
          );
          grad.addColorStop(0, "#94A3B8");
          grad.addColorStop(0.5, "#64748B");
          grad.addColorStop(1, "#334155");
          ctx.fillStyle = grad;
        } else if (tile.terrain === TerrainType.Water) {
          const grad = ctx.createLinearGradient(
            corners[0].sx,
            corners[0].sy,
            corners[2].sx,
            corners[2].sy
          );
          grad.addColorStop(0, "#38BDF8");
          grad.addColorStop(0.4, "#0284C7");
          grad.addColorStop(1, "#0369A1");
          ctx.fillStyle = grad;
        } else {
          // Landmark
          const grad = ctx.createLinearGradient(
            corners[0].sx,
            corners[0].sy,
            corners[2].sx,
            corners[2].sy
          );
          grad.addColorStop(0, "#991B1B");
          grad.addColorStop(0.6, "#581C87");
          grad.addColorStop(1, "#1E1B4B");
          ctx.fillStyle = grad;
        }
        ctx.fill();

        // Territory / Hover / Selection Border
        if (isSelected) {
          ctx.strokeStyle = "#FFD166";
          ctx.lineWidth = 3 * zoom;
          ctx.stroke();
        } else if (isHovered) {
          ctx.strokeStyle = "#F8FAFC";
          ctx.lineWidth = 2 * zoom;
          ctx.stroke();
        } else if (showBorders && isYours) {
          ctx.strokeStyle = "#2DD4BF";
          ctx.lineWidth = 2.4 * zoom;
          ctx.stroke();
        } else if (showBorders && isOther) {
          ctx.strokeStyle = "#FF4D5A";
          ctx.lineWidth = 2.4 * zoom;
          ctx.stroke();
        } else {
          ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // C. REALISTIC SCENERY ASSETS
        const cx = topCenter.sx;
        const cy = topCenter.sy;

        // --- 1. WATER RIPPLES & SPECULAR HIGHLIGHTS ---
        if (tile.terrain === TerrainType.Water) {
          ctx.strokeStyle = "rgba(224, 242, 254, 0.65)";
          ctx.lineWidth = 1.5 * zoom;
          ctx.beginPath();
          const waveOff = Math.sin(waterAnim + tile.id) * 3 * zoom;
          ctx.moveTo(cx - 16 * zoom, cy - 2 * zoom + waveOff);
          ctx.quadraticCurveTo(
            cx,
            cy - 6 * zoom + waveOff,
            cx + 16 * zoom,
            cy - 2 * zoom + waveOff
          );
          ctx.stroke();
        }

        // --- 2. DENSE REALISTIC 3D WOODLAND TREES ---
        if (tile.terrain === TerrainType.Forest && !tile.hasSettlement) {
          const drawPine = (ox: number, oy: number, scale: number) => {
            const tx = cx + ox * zoom;
            const ty = cy + oy * zoom;
            const s = scale * zoom;

            // Trunk
            ctx.fillStyle = "#451A03";
            ctx.fillRect(tx - 1.5 * s, ty, 3 * s, 6 * s);

            // Tiered Pine Foliage
            // Tier 1 (bottom)
            ctx.fillStyle = "#14532D";
            ctx.beginPath();
            ctx.moveTo(tx, ty - 14 * s);
            ctx.lineTo(tx + 8 * s, ty);
            ctx.lineTo(tx - 8 * s, ty);
            ctx.closePath();
            ctx.fill();

            // Tier 2 (middle lit side)
            ctx.fillStyle = "#16A34A";
            ctx.beginPath();
            ctx.moveTo(tx, ty - 18 * s);
            ctx.lineTo(tx + 6 * s, ty - 5 * s);
            ctx.lineTo(tx - 6 * s, ty - 5 * s);
            ctx.closePath();
            ctx.fill();

            // Tier 3 (top peak)
            ctx.fillStyle = "#22C55E";
            ctx.beginPath();
            ctx.moveTo(tx, ty - 22 * s);
            ctx.lineTo(tx + 4 * s, ty - 10 * s);
            ctx.lineTo(tx - 4 * s, ty - 10 * s);
            ctx.closePath();
            ctx.fill();
          };

          drawPine(-14, 4, 1.1);
          drawPine(12, 6, 1.0);
          drawPine(0, -8, 1.25);
          drawPine(-6, 12, 0.85);
        }

        // --- 3. MAJESTIC CRAGGY MOUNTAINS WITH SNOW CAPS ---
        if (tile.terrain === TerrainType.Rocky && !tile.hasSettlement) {
          const peakH = 34 * zoom;
          const peakX = cx;
          const peakY = cy - peakH;

          // Main shadow facet
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(cx + 18 * zoom, cy + 8 * zoom);
          ctx.lineTo(cx - 2 * zoom, cy + 10 * zoom);
          ctx.closePath();
          ctx.fill();

          // Main lit facet
          ctx.fillStyle = "#94A3B8";
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(cx - 20 * zoom, cy + 6 * zoom);
          ctx.lineTo(cx - 2 * zoom, cy + 10 * zoom);
          ctx.closePath();
          ctx.fill();

          // Brilliant Glacier Snow Cap
          ctx.fillStyle = "#F8FAFC";
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          ctx.lineTo(peakX + 7 * zoom, peakY + 12 * zoom);
          ctx.lineTo(peakX - 1 * zoom, peakY + 10 * zoom);
          ctx.lineTo(peakX - 8 * zoom, peakY + 14 * zoom);
          ctx.closePath();
          ctx.fill();

          // Secondary flanking peak
          ctx.fillStyle = "#64748B";
          ctx.beginPath();
          ctx.moveTo(cx - 14 * zoom, cy - 14 * zoom);
          ctx.lineTo(cx - 24 * zoom, cy + 8 * zoom);
          ctx.lineTo(cx - 4 * zoom, cy + 8 * zoom);
          ctx.closePath();
          ctx.fill();
        }

        // --- 4. ROLLING HILLS ---
        if (tile.terrain === TerrainType.Hills && !tile.hasSettlement) {
          ctx.fillStyle = "#65A30D";
          ctx.beginPath();
          ctx.arc(cx - 6 * zoom, cy + 2 * zoom, 12 * zoom, Math.PI, 0);
          ctx.fill();

          ctx.fillStyle = "#84CC16";
          ctx.beginPath();
          ctx.arc(cx + 8 * zoom, cy + 4 * zoom, 10 * zoom, Math.PI, 0);
          ctx.fill();
        }

        // --- 5. PLAINS COBBLESTONES & MEADOW DETAILS ---
        if (tile.terrain === TerrainType.Plains && !tile.hasSettlement) {
          ctx.strokeStyle = "rgba(161, 98, 7, 0.4)";
          ctx.lineWidth = 2 * zoom;
          ctx.beginPath();
          ctx.moveTo(cx - 16 * zoom, cy + 2 * zoom);
          ctx.quadraticCurveTo(cx, cy - 4 * zoom, cx + 16 * zoom, cy + 4 * zoom);
          ctx.stroke();

          // Tiny wildflowers
          ctx.fillStyle = "#FEF08A";
          ctx.fillRect(cx - 6 * zoom, cy + 4 * zoom, 2 * zoom, 2 * zoom);
          ctx.fillStyle = "#F43F5E";
          ctx.fillRect(cx + 8 * zoom, cy - 3 * zoom, 2 * zoom, 2 * zoom);
        }

        // --- 6. SACRED OBSIDIAN LANDMARK & BEACON SPIRE ---
        if (tile.terrain === TerrainType.Landmark) {
          // Plinth
          ctx.fillStyle = "#1E1B4B";
          ctx.strokeStyle = "#E63946";
          ctx.lineWidth = 1.5 * zoom;
          ctx.beginPath();
          ctx.arc(cx, cy, 14 * zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (tile.id === BEACON_TARGET_TILE_ID) {
            // Cosmic vertical beam
            const beamGrad = ctx.createLinearGradient(
              cx,
              cy,
              cx,
              cy - 120 * zoom
            );
            beamGrad.addColorStop(0, "rgba(255, 77, 90, 0.9)");
            beamGrad.addColorStop(0.5, "rgba(230, 57, 70, 0.4)");
            beamGrad.addColorStop(1, "rgba(230, 57, 70, 0)");
            ctx.fillStyle = beamGrad;
            ctx.fillRect(cx - 6 * zoom, cy - 120 * zoom, 12 * zoom, 120 * zoom);

            // Spire Monolith
            ctx.fillStyle = "#E63946";
            ctx.beginPath();
            ctx.moveTo(cx, cy - 36 * zoom);
            ctx.lineTo(cx + 8 * zoom, cy);
            ctx.lineTo(cx - 8 * zoom, cy);
            ctx.closePath();
            ctx.fill();

            // Golden Apex Core
            ctx.fillStyle = "#FFD166";
            ctx.shadowColor = "#FFD166";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(
              cx,
              cy - 20 * zoom,
              (4 + beaconProgressRatio * 3) * zoom,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = "#F59E0B";
            ctx.beginPath();
            ctx.moveTo(cx, cy - 20 * zoom);
            ctx.lineTo(cx + 6 * zoom, cy);
            ctx.lineTo(cx - 6 * zoom, cy);
            ctx.closePath();
            ctx.fill();
          }
        }

        // --- 7. AUTHENTIC MEDIEVAL VILLAGE HOUSES & CASTLES ---
        if (showStructures && tile.settlementLevel > 0) {
          const drawHouse = (ox: number, oy: number, scale: number) => {
            const hx = cx + ox * zoom;
            const hy = cy + oy * zoom;
            const s = scale * zoom;

            // Foundation & Timber Wall
            ctx.fillStyle = "#A8A29E";
            ctx.fillRect(hx - 7 * s, hy - 4 * s, 14 * s, 8 * s);

            // Pitched Shingled Roof
            ctx.fillStyle = isYours ? "#0D9488" : "#DC2626";
            ctx.beginPath();
            ctx.moveTo(hx, hy - 14 * s);
            ctx.lineTo(hx + 9 * s, hy - 4 * s);
            ctx.lineTo(hx - 9 * s, hy - 4 * s);
            ctx.closePath();
            ctx.fill();

            // Stone Chimney & Smoke Puff
            ctx.fillStyle = "#44403C";
            ctx.fillRect(hx + 3 * s, hy - 16 * s, 3 * s, 7 * s);
            ctx.fillStyle = "rgba(241, 245, 249, 0.55)";
            ctx.beginPath();
            ctx.arc(hx + 4.5 * s, hy - 19 * s, 2 * s, 0, Math.PI * 2);
            ctx.fill();

            // Lit Amber Window
            ctx.fillStyle = "#FBBF24";
            ctx.fillRect(hx - 3 * s, hy - 1 * s, 3 * s, 3 * s);
          };

          // Residential Cottage
          drawHouse(-12, 6, 0.95);

          // Stronghold / Citadel Main Keep
          const kw = 16 * zoom;
          const kh = (tile.settlementLevel >= 3 ? 32 : 22) * zoom;
          const kx = cx + (tile.settlementLevel >= 2 ? 4 * zoom : 0);
          const ky = cy - kh / 2;

          // Keep Walls
          ctx.fillStyle = "#E2E8F0";
          ctx.fillRect(kx - kw / 2, ky, kw, kh);

          // Roof Spire
          ctx.fillStyle = isYours ? "#14B8A6" : "#E63946";
          ctx.beginPath();
          ctx.moveTo(kx, ky - 14 * zoom);
          ctx.lineTo(kx + kw / 2 + 2 * zoom, ky);
          ctx.lineTo(kx - kw / 2 - 2 * zoom, ky);
          ctx.closePath();
          ctx.fill();

          // Gatehouse Arch
          ctx.fillStyle = "#1E293B";
          ctx.beginPath();
          ctx.arc(kx, ky + kh - 4 * zoom, 3 * zoom, Math.PI, 0);
          ctx.fill();

          // Citadel Sovereign Golden Orb
          if (tile.settlementLevel >= 3) {
            ctx.fillStyle = "#FFD166";
            ctx.beginPath();
            ctx.arc(kx, ky - 16 * zoom, 3 * zoom, 0, Math.PI * 2);
            ctx.fill();
          }

          // Second House for Lv.2+
          if (tile.settlementLevel >= 2) {
            drawHouse(14, 8, 0.85);
          }
        }

        // --- 8. OUTPOSTS, WORKSHOPS & BEACONS ---
        if (showStructures) {
          if (tile.structureType === StructureType.Outpost) {
            const tx = cx + 8 * zoom;
            const ty = cy;
            ctx.fillStyle = "#78716C";
            ctx.fillRect(tx - 4 * zoom, ty - 18 * zoom, 8 * zoom, 18 * zoom);
            ctx.fillStyle = isYours ? "#2DD4BF" : "#FF4D5A";
            ctx.beginPath();
            ctx.moveTo(tx, ty - 26 * zoom);
            ctx.lineTo(tx + 6 * zoom, ty - 18 * zoom);
            ctx.lineTo(tx - 6 * zoom, ty - 18 * zoom);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#FBBF24";
            ctx.fillRect(tx - 2 * zoom, ty - 14 * zoom, 4 * zoom, 4 * zoom);
          } else if (tile.structureType === StructureType.Workshop) {
            const fx = cx - 8 * zoom;
            const fy = cy + 4 * zoom;
            ctx.fillStyle = "#57534E";
            ctx.fillRect(fx - 7 * zoom, fy - 6 * zoom, 14 * zoom, 10 * zoom);
            ctx.fillStyle = "#B45309";
            ctx.beginPath();
            ctx.moveTo(fx, fy - 12 * zoom);
            ctx.lineTo(fx + 8 * zoom, fy - 6 * zoom);
            ctx.lineTo(fx - 8 * zoom, fy - 6 * zoom);
            ctx.closePath();
            ctx.fill();
            // Forge fire
            ctx.fillStyle = "#EF4444";
            ctx.fillRect(fx - 2 * zoom, fy - 2 * zoom, 4 * zoom, 4 * zoom);
          } else if (tile.structureType === StructureType.Beacon) {
            const bx = cx + 10 * zoom;
            const by = cy - 4 * zoom;
            ctx.fillStyle = "#FF4D5A";
            ctx.beginPath();
            ctx.moveTo(bx, by - 24 * zoom);
            ctx.lineTo(bx + 5 * zoom, by);
            ctx.lineTo(bx - 5 * zoom, by);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#FFD166";
            ctx.beginPath();
            ctx.arc(bx, by - 24 * zoom, 3.5 * zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // D. Optional Coordinate Tag
        if (showCoords) {
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `bold ${Math.max(9, Math.round(10 * zoom))}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(formatCoords(tile.id), cx, cy + 2 * zoom);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    tiles,
    selectedTileId,
    hoveredTileId,
    showBorders,
    showStructures,
    showCoords,
    showAtmosphere,
    normalizedUser,
    beaconProgressRatio,
  ]);

  // Pointer Interaction Handlers (Continuous Gyro Swipe with Momentum)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    p.isDown = true;
    p.button = e.button;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    p.startX = e.clientX;
    p.startY = e.clientY;
    p.lastTime = performance.now();
    p.moved = false;

    // Halt current inertia when user grabs the island
    cameraRef.current.velYaw = 0;
    cameraRef.current.velPitch = 0;
    cameraRef.current.velPanX = 0;
    cameraRef.current.velPanY = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    if (!p.isDown) {
      // Hover hit-test
      hitTestTile(e.clientX, e.clientY);
      return;
    }

    const now = performance.now();
    const dt = Math.max(1, now - p.lastTime);
    const dx = e.clientX - p.lastX;
    const dy = e.clientY - p.lastY;

    if (Math.abs(e.clientX - p.startX) > 4 || Math.abs(e.clientY - p.startY) > 4) {
      p.moved = true;
    }

    const cam = cameraRef.current;

    if (e.buttons === 2 || e.shiftKey) {
      // Pan mode (Right-click or Shift+drag)
      cam.panX += dx;
      cam.panY += dy;
      cam.velPanX = dx / dt;
      cam.velPanY = dy / dt;
    } else {
      // Gyro 3D Swipe Rotation mode (Left-click / touch swipe)
      // Horizontal swipe rotates yaw, vertical swipe rotates pitch
      const deltaYaw = dx * 0.0065;
      const deltaPitch = -dy * 0.0045;

      cam.yaw += deltaYaw;
      cam.pitch = Math.max(0.42, Math.min(1.22, cam.pitch + deltaPitch));

      // Calculate instantaneous swipe force / velocity
      cam.velYaw = (dx / dt) * 0.22;
      cam.velPitch = (-dy / dt) * 0.15;
    }

    p.lastX = e.clientX;
    p.lastY = e.clientY;
    p.lastTime = now;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    p.isDown = false;

    // If it was a quick click without dragging, select tile
    if (!p.moved) {
      const tileId = hitTestTile(e.clientX, e.clientY);
      if (tileId !== null) {
        onSelectTile(tileId);
      }
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoom(delta);
  };

  // 3D Screen-to-Tile Hit Test
  const hitTestTile = (clientX: number, clientY: number): number | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const cam = cameraRef.current;
    const centerX = rect.width / 2 + cam.panX;
    const centerY = rect.height / 2 + cam.panY;
    const cosY = Math.cos(cam.yaw);
    const sinY = Math.sin(cam.yaw);
    const sinP = Math.sin(cam.pitch);
    const cosP = Math.cos(cam.pitch);
    const zoom = cam.zoom;

    let closestTileId: number | null = null;
    let minDistance = 34 * zoom;

    for (const tile of tiles) {
      const wx = (tile.col - 3) * TILE_SIZE;
      const wy = (tile.row - 3) * TILE_SIZE;
      const z = getElevation(tile.terrain);

      const rx = wx * cosY - wy * sinY;
      const ry = wx * sinY + wy * cosY;
      const sx = centerX + rx * zoom;
      const sy = centerY + (ry * sinP - z * cosP) * zoom;

      const dist = Math.hypot(mx - sx, my - sy);
      if (dist < minDistance) {
        minDistance = dist;
        closestTileId = tile.id;
      }
    }

    setHoveredTileId(closestTileId);
    return closestTileId;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-[#060809] cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {/* High-Performance 3D Living Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block"
      />

      {/* MINIMALIST FLOATING CONTROLS (Tucked safely in top-right corner, non-obtrusive) */}
      <div
        data-hud-control
        className="absolute right-4 top-4 z-20 flex flex-col gap-1.5"
      >
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera & Center Island"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-[#101413]/85 text-ink-secondary hover:border-white/25 hover:text-white backdrop-blur-md transition-colors"
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
              : "border-white/[0.1] bg-[#101413]/85 text-ink-secondary hover:text-white"
          )}
        >
          <Shield className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowStructures((v) => !v)}
          title="Toggle Structures & Villages"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showStructures
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#101413]/85 text-ink-secondary hover:text-white"
          )}
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowCoords((v) => !v)}
          title="Toggle Coordinates"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showCoords
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#101413]/85 text-ink-secondary hover:text-white"
          )}
        >
          <Grid className="h-4 w-4" />
        </button>
      </div>

      {/* SUBTLE INTUITIVE GYRO SWIPE GESTURE HINT (Bottom-Center, Non-blocking) */}
      <div
        data-hud-control
        className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full border border-white/[0.08] bg-[#0E1211]/80 px-4 py-1.5 text-[11px] font-medium text-ink-muted backdrop-blur-md shadow-panel transition-opacity"
      >
        <span className="text-crimson-accent font-semibold">✦ Swipe / Drag</span> to spin island with inertia &bull; <span className="text-white/80">Scroll</span> to zoom &bull; <span className="text-white/80">Click</span> to select tile
      </div>

      {/* BOTTOM-RIGHT: Zoom Controls + Mini-Map */}
      <div
        data-hud-control
        className="absolute bottom-4 right-4 z-20 flex items-end gap-2.5"
      >
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#101413]/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleZoom(0.18)}
            className="flex h-8 w-8 items-center justify-center text-ink-secondary hover:bg-white/[0.08] hover:text-white border-b border-white/[0.08]"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.18)}
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
