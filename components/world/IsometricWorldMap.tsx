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
} from "lucide-react";
import {
  BEACON_TARGET_TILE_ID,
  formatCoords,
  TERRAIN_META,
  TileState,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { CameraOrbitState, IslandWebGLRenderer } from "@/lib/webgl/islandRenderer";
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

const DEFAULT_CAMERA: CameraOrbitState = {
  azimuth: 0.72,    // Classic 3/4 isometric perspective matching Panel 2
  elevation: 0.62,  // ~35.5° immersive overlook showing cliffs, trees, mountains & water
  distance: 26.5,   // Balanced framing filling the entire viewport
  targetX: 0,
  targetZ: 0.7,     // Centered framing allowing the southern coast to gracefully cover the lower view
};

interface PointerSample {
  x: number;
  y: number;
  t: number;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IslandWebGLRenderer | null>(null);

  const [showCoords, setShowCoords] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [showStructures, setShowStructures] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [coordLabels, setCoordLabels] = useState<
    { id: number; sx: number; sy: number; visible: boolean }[]
  >([]);

  // Mutable high-frequency refs for 60 FPS WebGL loop without React re-renders
  const hoveredTileIdRef = useRef<number>(-1);
  const selectedTileIdRef = useRef<number>(selectedTileId);
  const showBordersRef = useRef<boolean>(showBorders);
  const showCoordsRef = useRef<boolean>(showCoords);

  selectedTileIdRef.current = selectedTileId;
  showBordersRef.current = showBorders;
  showCoordsRef.current = showCoords;

  // Orbit Camera + Inertial Angular Momentum State
  const physicsRef = useRef({
    azimuth: DEFAULT_CAMERA.azimuth,
    elevation: DEFAULT_CAMERA.elevation,
    distance: DEFAULT_CAMERA.distance,
    targetDistance: DEFAULT_CAMERA.distance,
    targetX: DEFAULT_CAMERA.targetX,
    targetY: 0.85,
    targetZ: DEFAULT_CAMERA.targetZ,
    goalTargetX: DEFAULT_CAMERA.targetX,
    goalTargetY: 0.85,
    goalTargetZ: DEFAULT_CAMERA.targetZ,
    velAzimuth: 0,   // rad/sec
    velElevation: 0, // rad/sec
  });

  // Active gesture & velocity ring-buffer for natural flick inertia
  const gestureRef = useRef<{
    activePointers: Map<number, { x: number; y: number }>;
    isDragging: boolean;
    isPanning: boolean;
    movedSignificantly: boolean;
    downX: number;
    downY: number;
    lastX: number;
    lastY: number;
    lastPinchDist: number;
    samples: PointerSample[];
  }>({
    activePointers: new Map(),
    isDragging: false,
    isPanning: false,
    movedSignificantly: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    lastPinchDist: 0,
    samples: [],
  });

  // Initialize WebGL2 Renderer + 60 FPS Animation & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: IslandWebGLRenderer;
    try {
      renderer = new IslandWebGLRenderer(canvas);
      rendererRef.current = renderer;
    } catch (err) {
      setWebglError(
        err instanceof Error ? err.message : "Failed to initialize 3D view"
      );
      return;
    }

    let animId = 0;
    const startTime = performance.now();
    let lastFrameTime = startTime;
    let labelFrameCounter = 0;

    const frame = (now: number) => {
      const container = containerRef.current;
      if (!container) return;

      const dtSec = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;
      const elapsedSec = (now - startTime) / 1000;

      const phys = physicsRef.current;
      const gest = gestureRef.current;

      // Apply gyro/swipe inertial rotation when finger/mouse is released
      if (!gest.isDragging && gest.activePointers.size === 0) {
        phys.azimuth += phys.velAzimuth * dtSec;
        phys.elevation = Math.max(
          0.34,
          Math.min(1.18, phys.elevation + phys.velElevation * dtSec)
        );

        // Smooth natural rotational friction deceleration (stops proportional to swipe force)
        const friction = Math.pow(0.055, dtSec);
        phys.velAzimuth *= friction;
        phys.velElevation *= friction;

        if (Math.abs(phys.velAzimuth) < 0.002) phys.velAzimuth = 0;
        if (Math.abs(phys.velElevation) < 0.002) phys.velElevation = 0;
      }

      // Smoothly interpolate zoom distance & camera target position (for double-click zoom-to-location)
      const lerpFactor = Math.min(1, dtSec * 10.5);
      phys.distance += (phys.targetDistance - phys.distance) * lerpFactor;
      phys.targetX += (phys.goalTargetX - phys.targetX) * lerpFactor;
      phys.targetY += (phys.goalTargetY - phys.targetY) * lerpFactor;
      phys.targetZ += (phys.goalTargetZ - phys.targetZ) * lerpFactor;

      const widthCss = container.clientWidth || 1;
      const heightCss = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const selectedLocal = ((selectedTileIdRef.current % 49) + 49) % 49;
      const hoveredLocal =
        hoveredTileIdRef.current >= 0
          ? ((hoveredTileIdRef.current % 49) + 49) % 49
          : -1;

      renderer.renderFrame(
        widthCss,
        heightCss,
        dpr,
        {
          azimuth: phys.azimuth,
          elevation: phys.elevation,
          distance: phys.distance,
          targetX: phys.targetX,
          targetY: phys.targetY,
          targetZ: phys.targetZ,
        },
        elapsedSec,
        selectedLocal,
        hoveredLocal,
        showBordersRef.current,
        showCoordsRef.current
      );

      // Update projected coordinate labels if toggled on
      if (showCoordsRef.current) {
        labelFrameCounter++;
        if (labelFrameCounter % 2 === 0) {
          setCoordLabels(renderer.projectTileCenters(widthCss, heightCss));
        }
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Sync blockchain world state -> WebGL meshes & territory borders
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || tiles.length === 0) return;
    renderer.syncWorldData(
      tiles,
      connectedAddress,
      showStructures,
      beaconProgressRatio
    );
  }, [tiles, connectedAddress, showStructures, beaconProgressRatio]);

  const resetCamera = useCallback(() => {
    const p = physicsRef.current;
    p.azimuth = DEFAULT_CAMERA.azimuth;
    p.elevation = DEFAULT_CAMERA.elevation;
    p.targetDistance = DEFAULT_CAMERA.distance;
    p.goalTargetX = DEFAULT_CAMERA.targetX;
    p.goalTargetY = 0.85;
    p.goalTargetZ = DEFAULT_CAMERA.targetZ;
    p.velAzimuth = 0;
    p.velElevation = 0;
  }, []);

  const zoomBy = useCallback((delta: number) => {
    const p = physicsRef.current;
    p.targetDistance = Math.max(9.5, Math.min(44.0, p.targetDistance + delta));
  }, []);

  // Prevent browser page scroll when zooming on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.022;
      const p = physicsRef.current;
      p.targetDistance = Math.max(9.5, Math.min(44.0, p.targetDistance + delta));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const updateHoverAtClient = (clientX: number, clientY: number): number | null => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    if (!container || !renderer) return null;
    const rect = container.getBoundingClientRect();
    const hitId = renderer.pickTileAtScreen(
      clientX - rect.left,
      clientY - rect.top,
      rect.width,
      rect.height
    );
    hoveredTileIdRef.current = hitId !== null ? hitId : -1;
    container.style.cursor = gestureRef.current.isDragging
      ? "grabbing"
      : hitId !== null
      ? "pointer"
      : "grab";
    return hitId;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const gest = gestureRef.current;
    const phys = physicsRef.current;

    gest.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Catch & halt existing spin immediately on touch/press
    phys.velAzimuth = 0;
    phys.velElevation = 0;

    if (gest.activePointers.size === 1) {
      gest.isDragging = true;
      gest.isPanning = e.button === 2 || e.button === 1 || e.shiftKey;
      gest.movedSignificantly = false;
      gest.downX = e.clientX;
      gest.downY = e.clientY;
      gest.lastX = e.clientX;
      gest.lastY = e.clientY;
      gest.samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    } else if (gest.activePointers.size === 2) {
      const pts = Array.from(gest.activePointers.values());
      gest.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      gest.movedSignificantly = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gest = gestureRef.current;
    const phys = physicsRef.current;

    if (!gest.activePointers.has(e.pointerId)) {
      updateHoverAtClient(e.clientX, e.clientY);
      return;
    }

    gest.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch-to-zoom + midpoint pan
    if (gest.activePointers.size === 2) {
      const pts = Array.from(gest.activePointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (gest.lastPinchDist > 0) {
        const pinchDelta = (gest.lastPinchDist - dist) * 0.055;
        phys.targetDistance = Math.max(
          13.5,
          Math.min(44.0, phys.targetDistance + pinchDelta)
        );
      }
      gest.lastPinchDist = dist;
      return;
    }

    const dx = e.clientX - gest.lastX;
    const dy = e.clientY - gest.lastY;
    gest.lastX = e.clientX;
    gest.lastY = e.clientY;

    if (
      Math.hypot(e.clientX - gest.downX, e.clientY - gest.downY) > 5
    ) {
      gest.movedSignificantly = true;
    }

    if (gest.isPanning) {
      // Camera-aligned ground pan (Right-click or Shift+drag)
      const panScale = phys.distance * 0.0014;
      const cosA = Math.cos(phys.azimuth);
      const sinA = Math.sin(phys.azimuth);
      phys.goalTargetX = Math.max(
        -12,
        Math.min(12, phys.goalTargetX - (dx * cosA + dy * sinA) * panScale)
      );
      phys.goalTargetZ = Math.max(
        -12,
        Math.min(12, phys.goalTargetZ - (-dx * sinA + dy * cosA) * panScale)
      );
      phys.targetX = phys.goalTargetX;
      phys.targetZ = phys.goalTargetZ;
    } else {
      // Direct 1:1 Gyro Turntable Orbit + Vertical Tilt
      phys.azimuth -= dx * 0.0068;
      phys.elevation = Math.max(
        0.34,
        Math.min(1.18, phys.elevation + dy * 0.0052)
      );

      const now = performance.now();
      gest.samples.push({ x: e.clientX, y: e.clientY, t: now });
      while (gest.samples.length > 7) {
        gest.samples.shift();
      }
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLCanvasElement>, isCancel: boolean) => {
    const gest = gestureRef.current;
    const phys = physicsRef.current;

    gest.activePointers.delete(e.pointerId);

    if (gest.activePointers.size === 0 && gest.isDragging) {
      gest.isDragging = false;
      const now = performance.now();

      if (!isCancel && !gest.movedSignificantly && e.button === 0) {
        // Crisp single tap / click -> raycast select 3D tile
        const hitId = updateHoverAtClient(e.clientX, e.clientY);
        if (hitId !== null) {
          onSelectTile(hitId);
        }
      } else if (!gest.isPanning && gest.samples.length >= 2) {
        // Compute release flick velocity over the last ~90ms window
        const newest = gest.samples[gest.samples.length - 1];
        if (now - newest.t < 80) {
          let oldest = gest.samples[0];
          for (let i = gest.samples.length - 2; i >= 0; i--) {
            oldest = gest.samples[i];
            if (newest.t - oldest.t >= 65) break;
          }
          const dtSec = (newest.t - oldest.t) / 1000;
          if (dtSec > 0.004) {
            const vxPxPerSec = (newest.x - oldest.x) / dtSec;
            const vyPxPerSec = (newest.y - oldest.y) / dtSec;
            phys.velAzimuth = Math.max(
              -7.5,
              Math.min(7.5, -vxPxPerSec * 0.0052)
            );
            phys.velElevation = Math.max(
              -3.2,
              Math.min(3.2, vyPxPerSec * 0.0034)
            );
          }
        }
      }
      gest.samples = [];
    }
  };

  /**
   * Double-click anywhere on the 3D island -> smoothly fly camera target there and zoom in close
   * so the player can inspect the terrain, trees, settlements, or structures at that exact spot.
   */
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    if (!container || !renderer) return;

    const rect = container.getBoundingClientRect();
    const hit = renderer.pickSurfaceAtScreen(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height
    );
    if (!hit) return;

    if (hit.tileId !== null) {
      onSelectTile(hit.tileId);
    }

    const phys = physicsRef.current;
    phys.velAzimuth = 0;
    phys.velElevation = 0;

    const distToSpot = Math.hypot(
      phys.goalTargetX - hit.wx,
      phys.goalTargetZ - hit.wz
    );

    // If already zoomed in close on this exact spot, double-clicking again smoothly zooms back out
    if (phys.targetDistance <= 13.5 && distToSpot < 1.2) {
      phys.goalTargetX = DEFAULT_CAMERA.targetX;
      phys.goalTargetY = 0.85;
      phys.goalTargetZ = DEFAULT_CAMERA.targetZ;
      phys.targetDistance = DEFAULT_CAMERA.distance;
    } else {
      phys.goalTargetX = Math.max(-11.5, Math.min(11.5, hit.wx));
      phys.goalTargetY = Math.max(0.4, Math.min(4.2, hit.wy));
      phys.goalTargetZ = Math.max(-11.5, Math.min(11.5, hit.wz));
      phys.targetDistance = 11.2;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-[#050C0F]",
        className
      )}
    >
      {/* Real-Time WebGL2 Living 3D Island Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishPointer(e, false)}
        onPointerCancel={(e) => finishPointer(e, true)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full touch-none"
      />

      {/* Subtle Atmospheric Edge Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_58%,rgba(7,9,10,0.72)_100%)]" />

      {/* Optional Projected 3D Coordinate Labels */}
      {showCoords && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
          {coordLabels.map(
            (lbl) =>
              lbl.visible && (
                <span
                  key={lbl.id}
                  style={{
                    transform: `translate(-50%, -50%) translate(${lbl.sx}px, ${lbl.sy}px)`,
                  }}
                  className="absolute left-0 top-0 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/90 border border-white/15 backdrop-blur-sm"
                >
                  {formatCoords(lbl.id)}
                </span>
              )
          )}
        </div>
      )}

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B0D0C] p-6 text-center text-xs text-ink-secondary">
          Unable to initialize hardware 3D view ({webglError}).
        </div>
      )}

      {/* Top-Right Compact Layer Toolbar (Matches Panel 2 Reference, Zero View Obstruction) */}
      <div
        data-hud-control
        className="absolute right-4 top-4 z-20 flex flex-col gap-1.5"
      >
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera View"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-[#121615]/88 text-ink-secondary hover:border-white/25 hover:text-white backdrop-blur-md transition-colors"
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
              : "border-white/[0.1] bg-[#121615]/88 text-ink-secondary hover:text-white"
          )}
        >
          <Shield className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowStructures((v) => !v)}
          title="Toggle Settlements & Structures"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
            showStructures
              ? "border-crimson/50 bg-crimson/20 text-crimson-accent"
              : "border-white/[0.1] bg-[#121615]/88 text-ink-secondary hover:text-white"
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
              : "border-white/[0.1] bg-[#121615]/88 text-ink-secondary hover:text-white"
          )}
        >
          <Grid className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom-Right Zoom + Isometric Territory Mini-Map (Matches Panel 2 Reference) */}
      <div
        data-hud-control
        className="absolute bottom-4 right-4 z-20 flex items-end gap-2.5"
      >
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/[0.1] bg-[#121615]/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => zoomBy(-3.2)}
            className="flex h-8 w-8 items-center justify-center text-ink-secondary hover:bg-white/[0.08] hover:text-white border-b border-white/[0.08]"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(3.2)}
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

      {/* Locked Frontier Scout Banner */}
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

      {/* Bottom-Left World Legend Pill (Matches Panel 2 Reference) */}
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
            Event
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
        else if (t.id % 49 === BEACON_TARGET_TILE_ID) fill = "#FF4D5A";

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
