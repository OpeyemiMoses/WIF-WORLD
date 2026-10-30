/**
 * Sculpted 3D Island Terrain, Underbelly, Animated Ocean Grid,
 * Organic Woodland Trees, Alpine Crags, and Medieval Fantasy Architecture
 * for the WIF WORLDS WebGL2 Engine.
 */

import {
  BEACON_TARGET_TILE_ID,
  GRID_SIZE,
  StructureType,
  TerrainType,
  TileState,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";
import { fbm2D, mulberry32, ridgedNoise2D, smoothstep } from "./math";

export const WORLD_TILE_SIZE = 4.2;
export const ISLAND_GRID_SPAN = GRID_SIZE * WORLD_TILE_SIZE; // 29.4 units (-14.7 .. +14.7)
export const WATER_LEVEL = 0.0;

// Material IDs passed to the Prop Fragment Shader for procedural surface texturing
export const MAT_BARK = 1.0;
export const MAT_PINE_LEAF = 2.0;
export const MAT_OAK_LEAF = 3.0;
export const MAT_ROCK = 4.0;
export const MAT_STONE_WALL = 5.0;
export const MAT_PLASTER_WALL = 6.0;
export const MAT_ROOF_SHINGLE = 7.0;
export const MAT_OBS_MONOLITH = 8.0;
export const MAT_EMISSIVE_WARM = 9.0;
export const MAT_EMISSIVE_CRIMSON = 10.0;
export const MAT_GOLD_BRASS = 11.0;

export interface PackedMesh {
  positions: Float32Array; // vec3
  normals: Float32Array;   // vec3
  colors: Float32Array;    // vec3
  extra: Float32Array;     // vec2: [matId / biomeInfo, ao / blend]
  indices: Uint32Array;
}

class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  extra: number[] = [];
  indices: number[] = [];

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  pushVertex(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    r: number,
    g: number,
    b: number,
    e0: number,
    e1: number
  ): number {
    const idx = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.normals.push(nx, ny, nz);
    this.colors.push(r, g, b);
    this.extra.push(e0, e1);
    return idx;
  }

  pushTri(a: number, b: number, c: number) {
    this.indices.push(a, b, c);
  }

  pushQuad(a: number, b: number, c: number, d: number) {
    this.indices.push(a, b, c, a, c, d);
  }

  addFlatTri(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    r: number, g: number, b: number,
    matId: number, ao: number
  ) {
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const i0 = this.pushVertex(ax, ay, az, nx, ny, nz, r, g, b, matId, ao);
    const i1 = this.pushVertex(bx, by, bz, nx, ny, nz, r, g, b, matId, ao);
    const i2 = this.pushVertex(cx, cy, cz, nx, ny, nz, r, g, b, matId, ao);
    this.pushTri(i0, i1, i2);
  }

  addFlatQuad(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    r: number, g: number, b: number,
    matId: number, aoBottom: number, aoTop: number
  ) {
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = dx - ax, vy = dy - ay, vz = dz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const i0 = this.pushVertex(ax, ay, az, nx, ny, nz, r, g, b, matId, aoBottom);
    const i1 = this.pushVertex(bx, by, bz, nx, ny, nz, r, g, b, matId, aoBottom);
    const i2 = this.pushVertex(cx, cy, cz, nx, ny, nz, r, g, b, matId, aoTop);
    const i3 = this.pushVertex(dx, dy, dz, nx, ny, nz, r, g, b, matId, aoTop);
    this.pushQuad(i0, i1, i2, i3);
  }

  toPacked(): PackedMesh {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      extra: new Float32Array(this.extra),
      indices: new Uint32Array(this.indices),
    };
  }
}

export function tileCenterWorld(row: number, col: number): { wx: number; wz: number } {
  return {
    wx: (col - 3) * WORLD_TILE_SIZE,
    wz: (row - 3) * WORLD_TILE_SIZE,
  };
}

export function worldToGridIndices(wx: number, wz: number): { row: number; col: number } | null {
  const fCol = wx / WORLD_TILE_SIZE + 3.5;
  const fRow = wz / WORLD_TILE_SIZE + 3.5;
  const col = Math.floor(fCol);
  const row = Math.floor(fRow);
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return null;
  }
  return { row, col };
}

function baseTerrainHeightForType(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.Water:
      return -1.45;
    case TerrainType.Plains:
      return 0.92;
    case TerrainType.Forest:
      return 1.38;
    case TerrainType.Hills:
      return 2.45;
    case TerrainType.Landmark:
      return 3.75;
    case TerrainType.Rocky:
      return 4.15;
    default:
      return 1.0;
  }
}

// Surrounding decorative rocky sea stacks (outside the 7x7 playable territory)
const SEA_STACKS = [
  { x: -24.5, z: -14.0, r: 3.2, h: 4.2 },
  { x: 24.2, z: -12.5, r: 3.0, h: 3.8 },
  { x: -23.0, z: 16.8, r: 3.2, h: 4.2 },
  { x: 23.8, z: 17.5, r: 3.0, h: 3.6 },
  { x: 3.5, z: -26.2, r: 3.1, h: 4.2 },
  { x: -5.2, z: 27.8, r: 3.3, h: 3.6 },
  { x: 14.5, z: 26.5, r: 3.0, h: 3.5 },
  { x: -15.5, z: 27.0, r: 3.1, h: 3.7 },
];

/**
 * Continuous sculpted heightfield function for the entire island & archipelago.
 * Used both for building the 192x192 terrain mesh AND for exact 3D raycast picking
 * and placing trees/houses flush on the ground.
 */
export function sampleIslandSurface(
  wx: number,
  wz: number,
  tileGrid: TileState[][]
): {
  height: number;
  waterWeight: number;
  forestWeight: number;
  hillWeight: number;
  rockyWeight: number;
  landmarkWeight: number;
  flattenMask: number;
} {
  // Smooth Gaussian-like kernel blend across nearby tiles in the 7x7 grid
  const gx = wx / WORLD_TILE_SIZE + 3.0;
  const gz = wz / WORLD_TILE_SIZE + 3.0;

  const r0 = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gz) - 1));
  const r1 = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gz) + 2));
  const c0 = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gx) - 1));
  const c1 = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gx) + 2));

  let totalW = 0;
  let baseH = 0;
  let waterW = 0;
  let forestW = 0;
  let hillW = 0;
  let rockyW = 0;
  let landmarkW = 0;
  let flattenMask = 0;
  let flattenTargetH = 1.2;

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const tile = tileGrid[r]?.[c];
      if (!tile) continue;
      const dx = gx - c;
      const dz = gz - r;
      const d2 = dx * dx + dz * dz;
      const w = Math.exp(-d2 * 2.15);
      totalW += w;

      let th = baseTerrainHeightForType(tile.terrain);
      if (tile.id % 49 === BEACON_TARGET_TILE_ID) {
        th = 4.85; // Elevated northern mountain sanctuary for Build the Beacon
      }
      baseH += th * w;

      if (tile.terrain === TerrainType.Water) waterW += w;
      if (tile.terrain === TerrainType.Forest) forestW += w;
      if (tile.terrain === TerrainType.Hills) hillW += w;
      if (tile.terrain === TerrainType.Rocky) rockyW += w;
      if (tile.terrain === TerrainType.Landmark) landmarkW += w;

      // Flatten a natural terrace plateau where buildings/landmarks stand
      const hasBuilding =
        tile.hasSettlement ||
        tile.structureType !== StructureType.None ||
        tile.terrain === TerrainType.Landmark;
      if (hasBuilding) {
        const distWorld = Math.hypot(dx * WORLD_TILE_SIZE, dz * WORLD_TILE_SIZE);
        const flat = 1.0 - smoothstep(1.05, 2.05, distWorld);
        if (flat > flattenMask) {
          flattenMask = flat;
          flattenTargetH =
            tile.terrain === TerrainType.Rocky
              ? 3.85
              : tile.id % 49 === BEACON_TARGET_TILE_ID
              ? 4.95
              : Math.max(0.95, th + 0.18);
        }
      }
    }
  }

  if (totalW > 0) {
    baseH /= totalW;
    waterW /= totalW;
    forestW /= totalW;
    hillW /= totalW;
    rockyW /= totalW;
    landmarkW /= totalW;
  }

  // Organic coastline mask: irregular rounded-continent silhouette with natural bays & capes
  const coastNoise =
    fbm2D(wx * 0.13 + 11.3, wz * 0.13 - 7.1, 4) * 2.35 +
    fbm2D(wx * 0.31 - 3.7, wz * 0.31 + 5.2, 3) * 0.75;

  // Chebyshev-radial hybrid so all 49 tiles stay safely on the main island continent
  const ax = Math.abs(wx);
  const az = Math.abs(wz);
  const boxDist = Math.max(ax, az);
  const radDist = Math.hypot(wx, wz);
  const continentMetric = boxDist * 0.62 + radDist * 0.38 - coastNoise * 0.52;

  const maxReach = 19.5 + (wz > 0 ? 5.2 : 1.8);
  const continentMask = 1.0 - smoothstep(14.0, maxReach, continentMetric);

  // Micro & macro geological detail
  const rollingNoise = fbm2D(wx * 0.22 + 3.1, wz * 0.22 + 8.4, 4);
  const detailNoise = fbm2D(wx * 0.75 - 12.0, wz * 0.75 + 4.0, 3);
  const alpineRidges = ridgedNoise2D(wx * 0.28 + 5.5, wz * 0.28 - 9.2, 4);

  let h =
    baseH +
    rollingNoise * (0.42 + hillW * 0.65) +
    detailNoise * 0.14 +
    rockyW * (alpineRidges * 3.55 - 0.35) +
    hillW * (alpineRidges * 0.75);

  // Depress water tiles smoothly into lagoons/rivers
  if (waterW > 0.05) {
    h = h * (1.0 - waterW * 0.75) + (-1.55 + rollingNoise * 0.25) * (waterW * 0.75);
  }

  // Apply building terrace flattening
  if (flattenMask > 0.001) {
    h = h * (1.0 - flattenMask * 0.88) + flattenTargetH * (flattenMask * 0.88);
  }

  // Blend outside of continent down into ocean seabed (-3.4)
  const seabedH = -3.4 + rollingNoise * 0.65;
  h = seabedH + (h - seabedH) * continentMask;

  // Add outer rocky sea stacks rising out of the surrounding ocean
  for (const st of SEA_STACKS) {
    const d = Math.hypot(wx - st.x, wz - st.z);
    if (d < st.r * 1.8) {
      const m = 1.0 - smoothstep(0.15, st.r * 1.45, d);
      const crag = ridgedNoise2D(wx * 0.55, wz * 0.55, 3);
      const stackH = -2.5 + m * (st.h + 2.5) * (0.65 + crag * 0.55);
      if (stackH > h) {
        h = stackH;
        rockyW = Math.max(rockyW, m);
      }
    }
  }

  return {
    height: h,
    waterWeight: waterW,
    forestWeight: forestW,
    hillWeight: hillW,
    rockyWeight: rockyW,
    landmarkWeight: landmarkW,
    flattenMask,
  };
}

export function buildTileGrid2D(tiles: TileState[]): TileState[][] {
  const grid: TileState[][] = Array.from({ length: GRID_SIZE }, () =>
    new Array(GRID_SIZE)
  );
  for (const t of tiles) {
    if (t.row >= 0 && t.row < GRID_SIZE && t.col >= 0 && t.col < GRID_SIZE) {
      grid[t.row][t.col] = t;
    }
  }
  return grid;
}

/**
 * Generates the high-resolution continuous 3D Island Terrain + Floating Bedrock Underbelly.
 */
export function buildSculptedTerrainMesh(tiles: TileState[]): PackedMesh {
  const tileGrid = buildTileGrid2D(tiles);
  const RES = 180; // 180x180 grid = 32,400 quads = 64,800 triangles (smooth 60 FPS)
  const EXTENT = 29.5; // Seamlessly covers island (-15..+15) + extended southern coast & sea stacks

  const heights = new Float32Array((RES + 1) * (RES + 1));
  const biomeCode = new Float32Array((RES + 1) * (RES + 1));
  const roadAndMoisture = new Float32Array((RES + 1) * (RES + 1));

  // Collect settlement/structure hubs so subtle dirt footpaths connect neighboring hubs
  const hubs: { x: number; z: number }[] = [];
  for (const t of tiles) {
    if (
      t.hasSettlement ||
      t.structureType !== StructureType.None ||
      t.terrain === TerrainType.Landmark
    ) {
      const { wx, wz } = tileCenterWorld(t.row, t.col);
      hubs.push({ x: wx, z: wz });
    }
  }

  for (let iz = 0; iz <= RES; iz++) {
    const wz = -EXTENT + (iz / RES) * (EXTENT * 2);
    for (let ix = 0; ix <= RES; ix++) {
      const wx = -EXTENT + (ix / RES) * (EXTENT * 2);
      const idx = iz * (RES + 1) + ix;
      const s = sampleIslandSurface(wx, wz, tileGrid);
      heights[idx] = s.height;

      // Dominant biome encoding (0=plains, 1=forest, 2=hills, 3=rocky, 4=landmark)
      let bVal = 0.0;
      if (s.landmarkWeight > 0.38) bVal = 4.0;
      else if (s.rockyWeight > 0.36) bVal = 3.0;
      else if (s.hillWeight > 0.38) bVal = 2.0;
      else if (s.forestWeight > 0.34) bVal = 1.0;
      biomeCode[idx] = bVal;

      // Dirt footpath factor near settlements/landmarks or gentle meadow trails
      let road = s.flattenMask * 0.85;
      if (s.height > 0.25 && s.rockyWeight < 0.45) {
        const trailWave = Math.abs(
          fbm2D(wx * 0.14 + 2.2, wz * 0.14 - 1.8, 3)
        );
        if (trailWave < 0.032 && Math.hypot(wx, wz) < 13.0) {
          road = Math.max(road, (1.0 - trailWave / 0.032) * 0.65);
        }
      }
      for (const hub of hubs) {
        const d = Math.hypot(wx - hub.x, wz - hub.z);
        if (d < 2.2) {
          road = Math.max(road, (1.0 - d / 2.2) * 0.9);
        }
      }
      roadAndMoisture[idx] = Math.min(1.0, road);
    }
  }

  const mb = new MeshBuilder();
  const step = (EXTENT * 2) / RES;

  for (let iz = 0; iz <= RES; iz++) {
    const wz = -EXTENT + iz * step;
    for (let ix = 0; ix <= RES; ix++) {
      const wx = -EXTENT + ix * step;
      const idx = iz * (RES + 1) + ix;
      const h = heights[idx];

      // Central-difference smooth normal
      const hL = heights[iz * (RES + 1) + Math.max(0, ix - 1)];
      const hR = heights[iz * (RES + 1) + Math.min(RES, ix + 1)];
      const hD = heights[Math.max(0, iz - 1) * (RES + 1) + ix];
      const hU = heights[Math.min(RES, iz + 1) * (RES + 1) + ix];

      let nx = hL - hR;
      let ny = 2.0 * step;
      let nz = hD - hU;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      mb.pushVertex(
        wx,
        h,
        wz,
        nx,
        ny,
        nz,
        0,
        0,
        0,
        biomeCode[idx],
        roadAndMoisture[idx]
      );
    }
  }

  for (let iz = 0; iz < RES; iz++) {
    for (let ix = 0; ix < RES; ix++) {
      const a = iz * (RES + 1) + ix;
      const b = a + 1;
      const c = a + (RES + 1) + 1;
      const d = a + (RES + 1);
      mb.pushTri(a, d, b);
      mb.pushTri(b, d, c);
    }
  }

  return mb.toPacked();
}

/**
 * Generates the high-resolution ocean & inland lake/river water mesh
 * storing water depth per vertex for realistic coastal absorption & breaking seafoam.
 */
export function buildOceanWaterMesh(tiles: TileState[]): PackedMesh {
  const tileGrid = buildTileGrid2D(tiles);
  const RES = 150;
  const EXTENT = 60.0; // Wide ocean horizon blending into dark abyssal mist
  const mb = new MeshBuilder();

  for (let iz = 0; iz <= RES; iz++) {
    const wz = -EXTENT + (iz / RES) * (EXTENT * 2);
    for (let ix = 0; ix <= RES; ix++) {
      const wx = -EXTENT + (ix / RES) * (EXTENT * 2);
      const terrainH =
        Math.abs(wx) < 29.5 && Math.abs(wz) < 29.5
          ? sampleIslandSurface(wx, wz, tileGrid).height
          : -4.0;
      const waterDepth = WATER_LEVEL - terrainH; // > 0 means underwater
      mb.pushVertex(wx, WATER_LEVEL, wz, 0, 1, 0, 0, 0, 0, waterDepth, terrainH);
    }
  }

  for (let iz = 0; iz < RES; iz++) {
    for (let ix = 0; ix < RES; ix++) {
      const a = iz * (RES + 1) + ix;
      const b = a + 1;
      const c = a + (RES + 1) + 1;
      const d = a + (RES + 1);
      mb.pushTri(a, d, b);
      mb.pushTri(b, d, c);
    }
  }

  return mb.toPacked();
}

// ============================================================================
// REALISTIC 3D FOLIAGE, ROCKS & MEDIEVAL ARCHITECTURE BUILDERS
// ============================================================================

function addTaperedCylinder(
  mb: MeshBuilder,
  cx: number,
  y0: number,
  cz: number,
  rBottom: number,
  rTop: number,
  height: number,
  segments: number,
  r: number,
  g: number,
  b: number,
  matId: number,
  leanX = 0,
  leanZ = 0
) {
  const baseIdx = mb.vertexCount;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    mb.pushVertex(
      cx + cos * rBottom,
      y0,
      cz + sin * rBottom,
      cos,
      0.15,
      sin,
      r * 0.78,
      g * 0.78,
      b * 0.78,
      matId,
      0.45
    );
    mb.pushVertex(
      cx + leanX + cos * rTop,
      y0 + height,
      cz + leanZ + sin * rTop,
      cos,
      0.2,
      sin,
      r,
      g,
      b,
      matId,
      0.92
    );
  }
  for (let i = 0; i < segments; i++) {
    const i0 = baseIdx + i * 2;
    mb.pushTri(i0, i0 + 2, i0 + 1);
    mb.pushTri(i0 + 1, i0 + 2, i0 + 3);
  }
}

function addOrganicSpruceTree(
  mb: MeshBuilder,
  wx: number,
  wy: number,
  wz: number,
  scale: number,
  rng: () => number,
  tintVariant: number
) {
  const leanX = (rng() - 0.5) * 0.14 * scale;
  const leanZ = (rng() - 0.5) * 0.14 * scale;
  const trunkH = 1.95 * scale;

  // Gnarled wooden bark trunk
  addTaperedCylinder(
    mb,
    wx,
    wy - 0.08,
    wz,
    0.13 * scale,
    0.04 * scale,
    trunkH * 0.85,
    6,
    0.26,
    0.17,
    0.11,
    MAT_BARK,
    leanX,
    leanZ
  );

  // Rich forest needle palette (deep pine green -> olive moss -> sunlit spruce)
  const baseR = 0.14 + tintVariant * 0.06;
  const baseG = 0.34 + tintVariant * 0.09;
  const baseB = 0.17 + tintVariant * 0.03;

  // 5 drooping scalloped conifer bough layers
  const tiers = 5;
  const sides = 9;
  for (let t = 0; t < tiers; t++) {
    const frac = t / (tiers - 1);
    const tierBaseY = wy + (0.36 + frac * 1.18) * scale;
    const tierApexY = tierBaseY + (0.72 - frac * 0.18) * scale;
    const radius = (0.74 - frac * 0.44) * scale;
    const tx = wx + leanX * frac;
    const tz = wz + leanZ * frac;
    const rotOff = rng() * Math.PI * 2;

    const apexIdx = mb.pushVertex(
      tx,
      tierApexY,
      tz,
      0,
      1,
      0,
      baseR * 1.24,
      baseG * 1.22,
      baseB * 1.12,
      MAT_PINE_LEAF,
      0.85 + frac * 0.15
    );

    const ringStart = mb.vertexCount;
    for (let s = 0; s <= sides; s++) {
      const ang = rotOff + (s / sides) * Math.PI * 2;
      // Scalloped bough tips so it looks like real pine branches, not a cone
      const scallop = 0.82 + 0.26 * Math.sin(s * 3.0 + t * 1.7);
      const rRad = radius * scallop;
      const droop = (s % 2 === 0 ? -0.07 : 0.04) * scale;
      const vx = tx + Math.cos(ang) * rRad;
      const vz = tz + Math.sin(ang) * rRad;
      const vy = tierBaseY + droop;

      const nx = Math.cos(ang) * 0.78;
      const ny = 0.62;
      const nz = Math.sin(ang) * 0.78;

      mb.pushVertex(
        vx,
        vy,
        vz,
        nx,
        ny,
        nz,
        baseR * (0.85 + frac * 0.25),
        baseG * (0.85 + frac * 0.25),
        baseB * (0.85 + frac * 0.2),
        MAT_PINE_LEAF,
        0.48 + frac * 0.42
      );
    }

    // Dark underside shadow skirt for depth
    const underCenter = mb.pushVertex(
      tx,
      tierBaseY + 0.08 * scale,
      tz,
      0,
      -1,
      0,
      baseR * 0.42,
      baseG * 0.42,
      baseB * 0.45,
      MAT_PINE_LEAF,
      0.22
    );

    for (let s = 0; s < sides; s++) {
      mb.pushTri(apexIdx, ringStart + s + 1, ringStart + s);
      mb.pushTri(underCenter, ringStart + s, ringStart + s + 1);
    }
  }
}

function addFoliagePuff(
  mb: MeshBuilder,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  r: number,
  g: number,
  b: number,
  matId: number,
  aoBase: number,
  seedOff: number
) {
  const latSteps = 5;
  const lonSteps = 8;
  const startIdx = mb.vertexCount;

  for (let lat = 0; lat <= latSteps; lat++) {
    const theta = (lat / latSteps) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let lon = 0; lon <= lonSteps; lon++) {
      const phi = (lon / lonSteps) * Math.PI * 2;
      const ux = sinT * Math.cos(phi);
      const uy = cosT;
      const uz = sinT * Math.sin(phi);

      // Organic leafy bumpiness
      const bump =
        1.0 +
        0.18 *
          Math.sin(ux * 4.3 + seedOff) *
          Math.cos(uz * 4.1 - seedOff * 0.7) +
        0.1 * Math.sin(uy * 5.5 + phi * 2.0);

      const px = cx + ux * rx * bump;
      const py = cy + uy * ry * bump;
      const pz = cz + uz * rz * bump;

      const ao = Math.max(0.25, Math.min(1.0, aoBase + uy * 0.32));
      const shade = 0.76 + 0.28 * Math.max(0, uy);
      mb.pushVertex(
        px,
        py,
        pz,
        ux,
        uy,
        uz,
        r * shade,
        g * shade,
        b * shade,
        matId,
        ao
      );
    }
  }

  for (let lat = 0; lat < latSteps; lat++) {
    for (let lon = 0; lon < lonSteps; lon++) {
      const a = startIdx + lat * (lonSteps + 1) + lon;
      const bIdx = a + 1;
      const c = a + (lonSteps + 1) + 1;
      const d = a + (lonSteps + 1);
      mb.pushTri(a, bIdx, d);
      mb.pushTri(bIdx, c, d);
    }
  }
}

function addBroadleafOakTree(
  mb: MeshBuilder,
  wx: number,
  wy: number,
  wz: number,
  scale: number,
  rng: () => number,
  isAutumnCrimson = false
) {
  const leanX = (rng() - 0.5) * 0.2 * scale;
  const leanZ = (rng() - 0.5) * 0.2 * scale;

  // Trunk + 2 forked limbs
  addTaperedCylinder(
    mb,
    wx,
    wy - 0.08,
    wz,
    0.15 * scale,
    0.08 * scale,
    0.95 * scale,
    6,
    0.29,
    0.2,
    0.13,
    MAT_BARK,
    leanX,
    leanZ
  );

  const rCol = isAutumnCrimson ? 0.62 + rng() * 0.14 : 0.22 + rng() * 0.08;
  const gCol = isAutumnCrimson ? 0.22 + rng() * 0.1 : 0.41 + rng() * 0.1;
  const bCol = isAutumnCrimson ? 0.16 : 0.19 + rng() * 0.04;

  // 5 overlapping organic leaf-crown puffs
  const puffs = [
    { ox: 0, oy: 1.22, oz: 0, rx: 0.64, ry: 0.52, rz: 0.64, ao: 0.78 },
    { ox: -0.34, oy: 1.02, oz: 0.22, rx: 0.48, ry: 0.4, rz: 0.46, ao: 0.66 },
    { ox: 0.36, oy: 1.05, oz: -0.18, rx: 0.46, ry: 0.42, rz: 0.48, ao: 0.68 },
    { ox: 0.1, oy: 1.0, oz: 0.35, rx: 0.44, ry: 0.38, rz: 0.44, ao: 0.64 },
    { ox: -0.12, oy: 1.44, oz: -0.08, rx: 0.45, ry: 0.38, rz: 0.45, ao: 0.92 },
  ];

  for (let i = 0; i < puffs.length; i++) {
    const p = puffs[i];
    addFoliagePuff(
      mb,
      wx + leanX + p.ox * scale,
      wy + p.oy * scale,
      wz + leanZ + p.oz * scale,
      p.rx * scale,
      p.ry * scale,
      p.rz * scale,
      rCol,
      gCol,
      bCol,
      MAT_OAK_LEAF,
      p.ao,
      i * 2.1 + rng() * 5.0
    );
  }
}

function addRockBoulder(
  mb: MeshBuilder,
  wx: number,
  wy: number,
  wz: number,
  rx: number,
  ry: number,
  rz: number,
  seed: number
) {
  addFoliagePuff(
    mb,
    wx,
    wy + ry * 0.35,
    wz,
    rx,
    ry,
    rz,
    0.38,
    0.37,
    0.39,
    MAT_ROCK,
    0.65,
    seed
  );
}

/**
 * Adds an oriented 3D Box rotated around Y by `rotY`.
 */
function addOrientedBox(
  mb: MeshBuilder,
  cx: number,
  baseY: number,
  cz: number,
  halfW: number,
  height: number,
  halfD: number,
  rotY: number,
  r: number,
  g: number,
  b: number,
  matId: number,
  aoBottom = 0.5,
  aoTop = 0.95
) {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const rot = (lx: number, lz: number): [number, number] => [
    cx + lx * cos - lz * sin,
    cz + lx * sin + lz * cos,
  ];

  const [p0x, p0z] = rot(-halfW, halfD);
  const [p1x, p1z] = rot(halfW, halfD);
  const [p2x, p2z] = rot(halfW, -halfD);
  const [p3x, p3z] = rot(-halfW, -halfD);
  const y0 = baseY;
  const y1 = baseY + height;

  // 4 Walls + Top Cap
  mb.addFlatQuad(p0x, y0, p0z, p1x, y0, p1z, p1x, y1, p1z, p0x, y1, p0z, r, g, b, matId, aoBottom, aoTop);
  mb.addFlatQuad(p1x, y0, p1z, p2x, y0, p2z, p2x, y1, p2z, p1x, y1, p1z, r * 0.92, g * 0.92, b * 0.92, matId, aoBottom, aoTop);
  mb.addFlatQuad(p2x, y0, p2z, p3x, y0, p3z, p3x, y1, p3z, p2x, y1, p2z, r * 0.88, g * 0.88, b * 0.88, matId, aoBottom, aoTop);
  mb.addFlatQuad(p3x, y0, p3z, p0x, y0, p0z, p0x, y1, p0z, p3x, y1, p3z, r * 0.94, g * 0.94, b * 0.94, matId, aoBottom, aoTop);
  mb.addFlatQuad(p0x, y1, p0z, p1x, y1, p1z, p2x, y1, p2z, p3x, y1, p3z, r * 1.05, g * 1.05, b * 1.05, matId, aoTop, aoTop);
}

/**
 * Adds a pitched gabled medieval roof + brick chimney + warm glowing windows!
 */
function addMedievalCottage(
  mb: MeshBuilder,
  cx: number,
  baseY: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  rotY: number,
  roofColor: [number, number, number],
  hasChimney = true
) {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const rot = (lx: number, lz: number): [number, number] => [
    cx + lx * cos - lz * sin,
    cz + lx * sin + lz * cos,
  ];

  // 1. Stone foundation plinth
  addOrientedBox(
    mb,
    cx,
    baseY - 0.12,
    cz,
    w * 0.54,
    0.24,
    d * 0.54,
    rotY,
    0.34,
    0.32,
    0.3,
    MAT_STONE_WALL,
    0.38,
    0.72
  );

  // 2. Timber-framed plaster walls
  const wallBase = baseY + 0.11;
  addOrientedBox(
    mb,
    cx,
    wallBase,
    cz,
    w * 0.5,
    h,
    d * 0.5,
    rotY,
    0.74,
    0.69,
    0.61,
    MAT_PLASTER_WALL,
    0.55,
    0.92
  );

  // Dark oak corner timber posts
  const postW = 0.045;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [px, pz] = rot(sx * w * 0.49, sz * d * 0.49);
      addOrientedBox(mb, px, wallBase, pz, postW, h + 0.01, postW, rotY, 0.22, 0.15, 0.1, MAT_BARK, 0.5, 0.85);
    }
  }

  // 3. Steeply pitched overhanging Gabled Roof
  const eaveY = wallBase + h - 0.02;
  const ridgeY = eaveY + h * 0.78;
  const rw = w * 0.6;
  const rd = d * 0.58;

  const [flX, flZ] = rot(-rw, rd);
  const [frX, frZ] = rot(rw, rd);
  const [brX, brZ] = rot(rw, -rd);
  const [blX, blZ] = rot(-rw, -rd);
  const [rfX, rfZ] = rot(0, rd);
  const [rbX, rbZ] = rot(0, -rd);

  const [rr, rg, rb] = roofColor;
  // Left & Right roof slopes
  mb.addFlatQuad(blX, eaveY, blZ, flX, eaveY, flZ, rfX, ridgeY, rfZ, rbX, ridgeY, rbZ, rr, rg, rb, MAT_ROOF_SHINGLE, 0.68, 0.98);
  mb.addFlatQuad(frX, eaveY, frZ, brX, eaveY, brZ, rbX, ridgeY, rbZ, rfX, ridgeY, rfZ, rr * 0.9, rg * 0.9, rb * 0.9, MAT_ROOF_SHINGLE, 0.68, 0.98);

  // Front & Back timber gables
  mb.addFlatTri(flX, eaveY, flZ, frX, eaveY, frZ, rfX, ridgeY, rfZ, 0.66, 0.61, 0.53, MAT_PLASTER_WALL, 0.82);
  mb.addFlatTri(brX, eaveY, brZ, blX, eaveY, blZ, rbX, ridgeY, rbZ, 0.62, 0.57, 0.5, MAT_PLASTER_WALL, 0.82);

  // 4. Stone Chimney Stack
  if (hasChimney) {
    const [chX, chZ] = rot(w * 0.28, -d * 0.18);
    addOrientedBox(
      mb,
      chX,
      eaveY,
      chZ,
      0.085,
      h * 0.92,
      0.085,
      rotY,
      0.32,
      0.29,
      0.28,
      MAT_STONE_WALL,
      0.65,
      0.95
    );
  }

  // 5. Glowing Warm Torchlit Windows on Front & Back
  for (const sz of [-1, 1]) {
    const [wx, wz] = rot(0, sz * (d * 0.51));
    addOrientedBox(
      mb,
      wx,
      wallBase + h * 0.42,
      wz,
      w * 0.14,
      h * 0.28,
      0.02,
      rotY,
      1.0,
      0.72,
      0.24,
      MAT_EMISSIVE_WARM,
      1.0,
      1.0
    );
  }
}

/**
 * Adds a Round Crenellated Castle Tower with Conical Roof.
 */
function addCastleTurret(
  mb: MeshBuilder,
  cx: number,
  baseY: number,
  cz: number,
  radius: number,
  height: number,
  roofColor: [number, number, number],
  withSpireRoof = true
) {
  addTaperedCylinder(
    mb,
    cx,
    baseY - 0.15,
    cz,
    radius * 1.08,
    radius,
    height,
    10,
    0.52,
    0.5,
    0.47,
    MAT_STONE_WALL
  );

  // Stone parapet collar
  const topY = baseY - 0.15 + height;
  addTaperedCylinder(
    mb,
    cx,
    topY - 0.08,
    cz,
    radius * 1.16,
    radius * 1.16,
    0.18,
    10,
    0.45,
    0.43,
    0.41,
    MAT_STONE_WALL
  );

  // Crenellations
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = cx + Math.cos(a) * radius * 1.06;
    const bz = cz + Math.sin(a) * radius * 1.06;
    addOrientedBox(mb, bx, topY + 0.08, bz, 0.06, 0.12, 0.06, -a, 0.48, 0.46, 0.43, MAT_STONE_WALL);
  }

  // Warm arrow-slit lantern window
  addOrientedBox(
    mb,
    cx,
    baseY + height * 0.55,
    cz + radius * 1.01,
    0.045,
    0.16,
    0.03,
    0,
    1.0,
    0.72,
    0.25,
    MAT_EMISSIVE_WARM,
    1.0,
    1.0
  );

  if (withSpireRoof) {
    addTaperedCylinder(
      mb,
      cx,
      topY + 0.08,
      cz,
      radius * 1.24,
      0.02,
      radius * 2.1,
      10,
      roofColor[0],
      roofColor[1],
      roofColor[2],
      MAT_ROOF_SHINGLE
    );
  }
}

export interface SettlementLight {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
}

/**
 * Builds all 3D trees, boulders, sanctuaries, houses, strongholds, citadels,
 * outposts, workshops, and beacons across the island, plus warm point lights!
 */
export function buildWorldPropsMesh(
  tiles: TileState[],
  connectedAddress: string | undefined,
  showStructures: boolean
): {
  mesh: PackedMesh;
  lights: SettlementLight[];
  smokeSources: { x: number; y: number; z: number; isBeacon?: boolean }[];
} {
  const tileGrid = buildTileGrid2D(tiles);
  const mb = new MeshBuilder();
  const lights: SettlementLight[] = [];
  const smokeSources: { x: number; y: number; z: number; isBeacon?: boolean }[] = [];
  const normUser = connectedAddress?.toLowerCase();

  for (const tile of tiles) {
    const rng = mulberry32(tile.id * 9781 + tile.row * 313 + tile.col * 71);
    const { wx: tcx, wz: tcz } = tileCenterWorld(tile.row, tile.col);
    const centerSurf = sampleIslandSurface(tcx, tcz, tileGrid);
    const cy = centerSurf.height;

    const isUnowned = !tile.owner || tile.owner.toLowerCase() === ZERO_ADDRESS;
    const isYours =
      !isUnowned && Boolean(normUser) && tile.owner.toLowerCase() === normUser;

    const factionRoof: [number, number, number] = isYours
      ? [0.11, 0.52, 0.49] // Sovereign Teal Slate
      : !isUnowned
      ? [0.68, 0.19, 0.21] // Crimson Terracotta
      : [0.46, 0.25, 0.19]; // Weathered Russet Shingle

    const hasPlayerBuild =
      showStructures &&
      (tile.settlementLevel > 0 || tile.structureType !== StructureType.None);

    // ========================================================================
    // 1. NATURAL BIOME TREES & BOULDERS
    // ========================================================================
    if (tile.terrain === TerrainType.Forest) {
      const treeCount = hasPlayerBuild ? 7 : 15;
      for (let i = 0; i < treeCount; i++) {
        const ox = (rng() - 0.5) * (WORLD_TILE_SIZE * 0.92);
        const oz = (rng() - 0.5) * (WORLD_TILE_SIZE * 0.92);
        if (hasPlayerBuild && Math.hypot(ox, oz) < 1.35) continue;

        const px = tcx + ox;
        const pz = tcz + oz;
        const surf = sampleIslandSurface(px, pz, tileGrid);
        if (surf.height < 0.25) continue;

        const sc = 0.68 + rng() * 0.48;
        if (rng() < 0.65) {
          addOrganicSpruceTree(mb, px, surf.height, pz, sc, rng, rng());
        } else {
          addBroadleafOakTree(mb, px, surf.height, pz, sc * 0.92, rng, rng() < 0.12);
        }
      }
      // Forest boulders
      for (let b = 0; b < 2; b++) {
        const px = tcx + (rng() - 0.5) * 3.2;
        const pz = tcz + (rng() - 0.5) * 3.2;
        if (hasPlayerBuild && Math.hypot(px - tcx, pz - tcz) < 1.4) continue;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        if (sh > 0.2) addRockBoulder(mb, px, sh, pz, 0.26, 0.18, 0.22, b + tile.id);
      }
    } else if (tile.terrain === TerrainType.Plains) {
      // Scattered meadow oaks, hedgerow shrubs & field boulders
      const count = hasPlayerBuild ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const ox = (rng() - 0.5) * (WORLD_TILE_SIZE * 0.88);
        const oz = (rng() - 0.5) * (WORLD_TILE_SIZE * 0.88);
        if (Math.hypot(ox, oz) < (hasPlayerBuild ? 1.45 : 0.4)) continue;
        const px = tcx + ox;
        const pz = tcz + oz;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        if (sh > 0.3) {
          if (rng() < 0.55) {
            addBroadleafOakTree(mb, px, sh, pz, 0.55 + rng() * 0.3, rng, false);
          } else {
            addOrganicSpruceTree(mb, px, sh, pz, 0.52 + rng() * 0.25, rng, 0.8);
          }
        }
      }
      if (!hasPlayerBuild && rng() < 0.6) {
        const px = tcx + (rng() - 0.5) * 2.5;
        const pz = tcz + (rng() - 0.5) * 2.5;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        if (sh > 0.25) addRockBoulder(mb, px, sh, pz, 0.22, 0.14, 0.19, tile.id);
      }
    } else if (tile.terrain === TerrainType.Hills) {
      const count = hasPlayerBuild ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const ox = (rng() - 0.5) * (WORLD_TILE_SIZE * 0.88);
        const oz = (rng() - 0.5) * (WORLD_TILE_SIZE * 0.88);
        if (hasPlayerBuild && Math.hypot(ox, oz) < 1.4) continue;
        const px = tcx + ox;
        const pz = tcz + oz;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        if (sh > 0.5) {
          addOrganicSpruceTree(mb, px, sh, pz, 0.6 + rng() * 0.35, rng, 0.4);
        }
      }
      for (let b = 0; b < 3; b++) {
        const px = tcx + (rng() - 0.5) * 3.1;
        const pz = tcz + (rng() - 0.5) * 3.1;
        if (hasPlayerBuild && Math.hypot(px - tcx, pz - tcz) < 1.35) continue;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        addRockBoulder(mb, px, sh, pz, 0.34, 0.24, 0.28, b * 3 + tile.id);
      }
    } else if (tile.terrain === TerrainType.Rocky) {
      // Lower timberline pines & alpine talus boulders
      for (let i = 0; i < 4; i++) {
        const ang = rng() * Math.PI * 2;
        const dist = 1.25 + rng() * 0.7;
        const px = tcx + Math.cos(ang) * dist;
        const pz = tcz + Math.sin(ang) * dist;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        if (sh > 0.8 && sh < 4.6) {
          addOrganicSpruceTree(mb, px, sh, pz, 0.5 + rng() * 0.25, rng, 0.2);
        }
      }
      for (let b = 0; b < 4; b++) {
        const px = tcx + (rng() - 0.5) * 3.0;
        const pz = tcz + (rng() - 0.5) * 3.0;
        if (hasPlayerBuild && Math.hypot(px - tcx, pz - tcz) < 1.3) continue;
        const sh = sampleIslandSurface(px, pz, tileGrid).height;
        addRockBoulder(mb, px, sh, pz, 0.42, 0.32, 0.36, b * 7 + tile.id);
      }
    }

    // ========================================================================
    // 2. WORLD LANDMARKS (Build the Beacon Northern Spire & Central Sanctuary)
    // ========================================================================
    if (tile.terrain === TerrainType.Landmark) {
      const isBeacon = tile.id % 49 === BEACON_TARGET_TILE_ID;

      // Stepped octagonal obsidian sanctuary dais
      addTaperedCylinder(mb, tcx, cy - 0.25, tcz, 1.65, 1.5, 0.32, 8, 0.16, 0.14, 0.16, MAT_OBS_MONOLITH);
      addTaperedCylinder(mb, tcx, cy + 0.05, tcz, 1.22, 1.12, 0.26, 8, 0.2, 0.16, 0.18, MAT_OBS_MONOLITH);

      // Ring of 6 ancient standing monoliths + crimson braziers
      for (let m = 0; m < 6; m++) {
        const a = (m / 6) * Math.PI * 2 + 0.25;
        const mx = tcx + Math.cos(a) * 1.32;
        const mz = tcz + Math.sin(a) * 1.32;
        addOrientedBox(mb, mx, cy + 0.05, mz, 0.11, 0.78, 0.08, -a, 0.18, 0.15, 0.17, MAT_OBS_MONOLITH, 0.4, 0.9);
        addOrientedBox(mb, mx, cy + 0.83, mz, 0.07, 0.1, 0.07, -a, 1.0, 0.26, 0.32, MAT_EMISSIVE_CRIMSON, 1.0, 1.0);
      }

      if (isBeacon) {
        // Monumental Gothic Obsidian & Brass Beacon Tower
        addTaperedCylinder(mb, tcx, cy + 0.28, tcz, 0.58, 0.34, 2.35, 8, 0.18, 0.14, 0.16, MAT_OBS_MONOLITH);
        // Brass buttress ribs
        for (let b = 0; b < 4; b++) {
          const a = (b / 4) * Math.PI * 2;
          addOrientedBox(
            mb,
            tcx + Math.cos(a) * 0.44,
            cy + 0.28,
            tcz + Math.sin(a) * 0.44,
            0.08,
            1.85,
            0.14,
            -a,
            0.78,
            0.58,
            0.26,
            MAT_GOLD_BRASS
          );
        }
        // Glowing Crimson Core Crystal
        addFoliagePuff(
          mb,
          tcx,
          cy + 2.85,
          tcz,
          0.26,
          0.42,
          0.26,
          1.0,
          0.28,
          0.34,
          MAT_EMISSIVE_CRIMSON,
          1.0,
          1.0
        );
        lights.push({
          x: tcx,
          y: cy + 2.4,
          z: tcz,
          r: 1.0,
          g: 0.25,
          b: 0.32,
          intensity: 4.5,
        });
        smokeSources.push({ x: tcx, y: cy + 2.9, z: tcz, isBeacon: true });
      } else {
        // Central Crucible Golden-Crimson Obelisk + Autumn Guardian Trees
        addTaperedCylinder(mb, tcx, cy + 0.28, tcz, 0.38, 0.06, 1.75, 6, 0.76, 0.58, 0.28, MAT_GOLD_BRASS);
        addFoliagePuff(mb, tcx, cy + 2.15, tcz, 0.18, 0.26, 0.18, 1.0, 0.45, 0.22, MAT_EMISSIVE_WARM, 1.0, 2.0);
        addBroadleafOakTree(mb, tcx - 1.55, sampleIslandSurface(tcx - 1.55, tcz + 0.9, tileGrid).height, tcz + 0.9, 0.68, rng, true);
        addBroadleafOakTree(mb, tcx + 1.55, sampleIslandSurface(tcx + 1.55, tcz - 0.9, tileGrid).height, tcz - 0.9, 0.68, rng, true);
        lights.push({
          x: tcx,
          y: cy + 1.8,
          z: tcz,
          r: 1.0,
          g: 0.58,
          b: 0.24,
          intensity: 3.2,
        });
      }
    }

    // ========================================================================
    // 3. PLAYER SETTLEMENTS (Lv.1 Hamlet -> Lv.2 Stronghold -> Lv.3 Citadel)
    // ========================================================================
    if (showStructures && tile.settlementLevel > 0) {
      const lvl = tile.settlementLevel;

      // Raised stone plaza terrace
      addTaperedCylinder(
        mb,
        tcx,
        cy - 0.28,
        tcz,
        lvl >= 2 ? 1.58 : 1.32,
        lvl >= 2 ? 1.48 : 1.24,
        0.34,
        12,
        0.36,
        0.34,
        0.32,
        MAT_STONE_WALL
      );

      if (lvl === 1) {
        // Lv.1 HAMLET: Chieftain Longhall + 3 cozy gabled medieval cottages + blazing hearth
        addMedievalCottage(mb, tcx - 0.15, cy + 0.05, tcz - 0.25, 0.88, 0.52, 0.62, 0.35, factionRoof, true);
        addMedievalCottage(mb, tcx + 0.72, cy + 0.04, tcz + 0.28, 0.58, 0.38, 0.48, -0.8, [0.44, 0.26, 0.19], true);
        addMedievalCottage(mb, tcx - 0.68, cy + 0.04, tcz + 0.58, 0.54, 0.36, 0.45, 0.95, [0.38, 0.24, 0.18], false);
        // Central blazing village hearth
        addTaperedCylinder(mb, tcx + 0.15, cy + 0.05, tcz + 0.45, 0.16, 0.14, 0.12, 8, 0.3, 0.28, 0.27, MAT_STONE_WALL);
        addFoliagePuff(mb, tcx + 0.15, cy + 0.22, tcz + 0.45, 0.09, 0.13, 0.09, 1.0, 0.62, 0.18, MAT_EMISSIVE_WARM, 1.0, 3.0);

        smokeSources.push({ x: tcx - 0.1, y: cy + 0.98, z: tcz - 0.3 });
      } else if (lvl === 2) {
        // Lv.2 STRONGHOLD: Fortified Stone Keep + 4 Corner Bastion Turrets + Curtain Walls + Village Houses
        addMedievalCottage(mb, tcx, cy + 0.08, tcz, 0.96, 0.86, 0.76, 0.2, factionRoof, true);

        const wallR = 0.92;
        for (let c = 0; c < 4; c++) {
          const a = (c / 4) * Math.PI * 2 + 0.2 + Math.PI / 4;
          const tx = tcx + Math.cos(a) * wallR;
          const tz = tcz + Math.sin(a) * wallR;
          addCastleTurret(mb, tx, cy + 0.06, tz, 0.22, 0.96, factionRoof, true);

          // Curtain wall segment to next corner
          const na = ((c + 1) / 4) * Math.PI * 2 + 0.2 + Math.PI / 4;
          const mx = tcx + ((Math.cos(a) + Math.cos(na)) * 0.5) * wallR;
          const mz = tcz + ((Math.sin(a) + Math.sin(na)) * 0.5) * wallR;
          addOrientedBox(mb, mx, cy + 0.06, mz, 0.62, 0.58, 0.11, -(a + Math.PI / 4), 0.48, 0.46, 0.43, MAT_STONE_WALL);
        }

        // Surrounding outer village cottages
        addMedievalCottage(mb, tcx - 1.18, sampleIslandSurface(tcx - 1.18, tcz + 0.85, tileGrid).height, tcz + 0.85, 0.54, 0.36, 0.44, 0.7, [0.45, 0.26, 0.19], true);
        addMedievalCottage(mb, tcx + 1.22, sampleIslandSurface(tcx + 1.22, tcz + 0.72, tileGrid).height, tcz + 0.72, 0.52, 0.35, 0.42, -0.6, [0.42, 0.25, 0.19], false);
        smokeSources.push({ x: tcx + 0.2, y: cy + 1.48, z: tcz - 0.1 });
      } else {
        // Lv.3 CITADEL: Grand Sovereign Multi-Spire Castle Keep + Cathedral Wings + Outer Town
        // High Keep
        addMedievalCottage(mb, tcx, cy + 0.1, tcz, 1.05, 1.32, 0.88, 0.15, factionRoof, true);
        // Sovereign Central Spire Tower + Golden Crown Beacon
        addCastleTurret(mb, tcx, cy + 0.95, tcz, 0.28, 1.15, factionRoof, true);
        addFoliagePuff(mb, tcx, cy + 2.82, tcz, 0.11, 0.14, 0.11, 1.0, 0.8, 0.3, MAT_EMISSIVE_WARM, 1.0, 5.0);

        const wallR = 1.08;
        for (let c = 0; c < 4; c++) {
          const a = (c / 4) * Math.PI * 2 + 0.15 + Math.PI / 4;
          const tx = tcx + Math.cos(a) * wallR;
          const tz = tcz + Math.sin(a) * wallR;
          addCastleTurret(mb, tx, cy + 0.06, tz, 0.25, 1.22, factionRoof, true);

          const na = ((c + 1) / 4) * Math.PI * 2 + 0.15 + Math.PI / 4;
          const mx = tcx + ((Math.cos(a) + Math.cos(na)) * 0.5) * wallR;
          const mz = tcz + ((Math.sin(a) + Math.sin(na)) * 0.5) * wallR;
          addOrientedBox(mb, mx, cy + 0.06, mz, 0.72, 0.72, 0.13, -(a + Math.PI / 4), 0.52, 0.5, 0.47, MAT_STONE_WALL);
        }

        // Bustling outer bailey houses
        const houseAngles = [0.4, 1.35, 2.55, 3.8, 5.1];
        for (let hIdx = 0; hIdx < houseAngles.length; hIdx++) {
          const ha = houseAngles[hIdx];
          const hx = tcx + Math.cos(ha) * 1.58;
          const hz = tcz + Math.sin(ha) * 1.58;
          const hh = sampleIslandSurface(hx, hz, tileGrid).height;
          if (hh > 0.3) {
            addMedievalCottage(mb, hx, hh, hz, 0.52, 0.36, 0.44, -ha, hIdx % 2 === 0 ? factionRoof : [0.45, 0.26, 0.19], hIdx < 2);
          }
        }
        smokeSources.push({ x: tcx + 0.25, y: cy + 2.0, z: tcz });
      }

      lights.push({
        x: tcx,
        y: cy + 1.2,
        z: tcz,
        r: 1.0,
        g: 0.68,
        b: 0.28,
        intensity: 2.6 + lvl * 0.65,
      });
    }

    // ========================================================================
    // 4. SPECIALIZED STRUCTURES (Outpost, Workshop, Signal Beacon)
    // ========================================================================
    if (showStructures && tile.structureType !== StructureType.None) {
      const offX = tile.settlementLevel > 0 ? 1.25 : 0.0;
      const offZ = tile.settlementLevel > 0 ? -0.95 : 0.0;
      const sx = tcx + offX;
      const sz = tcz + offZ;
      const sy = sampleIslandSurface(sx, sz, tileGrid).height;

      if (tile.structureType === StructureType.Outpost) {
        // Stone & Timber Watchtower + Guard Hut + Blazing Brazier
        addTaperedCylinder(mb, sx, sy - 0.2, sz, 0.85, 0.78, 0.24, 8, 0.36, 0.34, 0.32, MAT_STONE_WALL);
        addCastleTurret(mb, sx, sy + 0.02, sz, 0.32, 1.38, factionRoof, true);
        addMedievalCottage(mb, sx - 0.58, sy + 0.02, sz + 0.32, 0.5, 0.34, 0.42, 0.6, factionRoof, false);
        lights.push({ x: sx, y: sy + 1.4, z: sz, r: 1.0, g: 0.66, b: 0.25, intensity: 2.2 });
      } else if (tile.structureType === StructureType.Workshop) {
        // Blacksmith Millhouse + Glowing Smelting Furnace Chimney
        addTaperedCylinder(mb, sx, sy - 0.2, sz, 0.92, 0.85, 0.24, 8, 0.35, 0.33, 0.31, MAT_STONE_WALL);
        addMedievalCottage(mb, sx, sy + 0.02, sz, 0.86, 0.52, 0.66, -0.35, [0.48, 0.26, 0.16], false);
        // Tall Industrial Stone Smelting Furnace
        addOrientedBox(mb, sx + 0.42, sy + 0.02, sz - 0.24, 0.18, 1.28, 0.18, -0.35, 0.28, 0.25, 0.24, MAT_STONE_WALL);
        addFoliagePuff(mb, sx + 0.42, sy + 1.34, sz - 0.24, 0.11, 0.1, 0.11, 1.0, 0.38, 0.12, MAT_EMISSIVE_WARM, 1.0, 7.0);
        lights.push({ x: sx + 0.35, y: sy + 0.9, z: sz - 0.2, r: 1.0, g: 0.48, b: 0.18, intensity: 2.5 });
        smokeSources.push({ x: sx + 0.42, y: sy + 1.38, z: sz - 0.24 });
      } else if (tile.structureType === StructureType.Beacon) {
        // Player Signal Beacon Obelisk
        addTaperedCylinder(mb, sx, sy - 0.2, sz, 0.72, 0.65, 0.24, 8, 0.22, 0.19, 0.21, MAT_OBS_MONOLITH);
        addTaperedCylinder(mb, sx, sy + 0.02, sz, 0.28, 0.12, 1.68, 8, 0.24, 0.2, 0.22, MAT_OBS_MONOLITH);
        addFoliagePuff(mb, sx, sy + 1.85, sz, 0.18, 0.25, 0.18, 1.0, 0.28, 0.34, MAT_EMISSIVE_CRIMSON, 1.0, 9.0);
        lights.push({ x: sx, y: sy + 1.85, z: sz, r: 1.0, g: 0.28, b: 0.35, intensity: 3.0 });
      }
    }
  }

  return {
    mesh: mb.toPacked(),
    lights: lights.slice(0, 16),
    smokeSources,
  };
}

/**
 * Builds additive/translucent Volumetric Effects:
 * - The towering Crimson Beacon Light Pillar on Tile 3
 * - Rising Chimney Smoke & Glowing Ember Particles
 */
export function buildVolumetricEffectsMesh(
  tiles: TileState[],
  smokeSources: { x: number; y: number; z: number; isBeacon?: boolean }[],
  beaconProgressRatio: number
): PackedMesh {
  const tileGrid = buildTileGrid2D(tiles);
  const mb = new MeshBuilder();

  const beaconTile = tiles.find((t) => t.id % 49 === BEACON_TARGET_TILE_ID);
  if (beaconTile) {
    const { wx, wz } = tileCenterWorld(beaconTile.row, beaconTile.col);
    const wy = sampleIslandSurface(wx, wz, tileGrid).height + 2.6;
    const beamR = 0.28 + beaconProgressRatio * 0.35;
    const beamH = 15.0 + beaconProgressRatio * 8.0;
    const segs = 16;

    // Inner bright core cylinder + outer soft volumetric halo cylinder
    for (const [radMult, alphaMult] of [
      [1.0, 0.85],
      [2.3, 0.32],
    ]) {
      const start = mb.vertexCount;
      const r = beamR * radMult;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        mb.pushVertex(wx + cx * r, wy, wz + cz * r, cx, 0, cz, 1.0, 0.26, 0.32, 1.0, alphaMult);
        mb.pushVertex(wx + cx * r * 2.2, wy + beamH, wz + cz * r * 2.2, cx, 0, cz, 0.9, 0.18, 0.25, 1.0, 0.0);
      }
      for (let i = 0; i < segs; i++) {
        const i0 = start + i * 2;
        mb.pushTri(i0, i0 + 2, i0 + 1);
        mb.pushTri(i0 + 1, i0 + 2, i0 + 3);
      }
    }
  }

  // Rising smoke & ember ribbons encoded with seed phase in extra
  for (let sIdx = 0; sIdx < smokeSources.length; sIdx++) {
    const src = smokeSources[sIdx];
    const puffs = src.isBeacon ? 10 : 6;
    for (let p = 0; p < puffs; p++) {
      const phase = p / puffs;
      const size = src.isBeacon ? 0.12 : 0.16 + phase * 0.22;
      const col: [number, number, number] = src.isBeacon
        ? [1.0, 0.38, 0.42]
        : [0.76, 0.78, 0.82];
      const kind = src.isBeacon ? 2.0 : 3.0;
      // Billboard quad (expanded in vertex shader along camera right/up)
      const base = mb.vertexCount;
      mb.pushVertex(src.x, src.y, src.z, -size, -size, sIdx * 1.7, col[0], col[1], col[2], kind, phase);
      mb.pushVertex(src.x, src.y, src.z, size, -size, sIdx * 1.7, col[0], col[1], col[2], kind, phase);
      mb.pushVertex(src.x, src.y, src.z, size, size, sIdx * 1.7, col[0], col[1], col[2], kind, phase);
      mb.pushVertex(src.x, src.y, src.z, -size, size, sIdx * 1.7, col[0], col[1], col[2], kind, phase);
      mb.pushQuad(base, base + 1, base + 2, base + 3);
    }
  }

  return mb.toPacked();
}
